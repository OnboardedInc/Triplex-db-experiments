import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { DatomicClient } from "../../../../../packages/datomic/dist/index.js";
import { SEED_VALID_FROM } from "../../../../bench/lib/world.ts";
import { fieldValue } from "../../../../bench/lib/deep-world.ts";
import { openComposition } from "../../../../bench/lib/composition.ts";
import { Snapshot } from "../../load1/snapshot.ts";
import { fileHash } from "../measurements.ts";
import {
  factsFor,
  field,
  keyFor,
  layoutOf,
  loaderDepth,
  root,
  source,
  task,
  width,
  type Density,
  type Layout,
} from "./plan.ts";
import type { Scope } from "./observer.ts";

export const read = <T = any>(name: string): T => JSON.parse(fs.readFileSync(name, "utf8"));
export const write = (name: string, x: unknown) =>
  fs.writeFileSync(name, JSON.stringify(x) + "\n", { flag: "wx", flush: true });
export const update = (name: string, x: unknown) => {
  write(name + ".new", x);
  fs.renameSync(name + ".new", name);
};
const docker = (...a: string[]) =>
  execFileSync("docker", a, { encoding: "utf8", timeout: 180000 }).trim();
const scopeKey = (scope: string) => JSON.stringify(["triplex-scope-v1", "test", "test", scope, 0]);

export type SeedProof = {
  source: string;
  slot: string;
  nonce: string;
  population: string;
  started: number;
  completed: number;
  people: Density;
  layout: Layout;
  facts: number;
  ingestMs: number;
  verifyMs: number;
  scopes: Scope[];
  bytes: number;
  sha256: string;
  membership: unknown[];
};
export type Destination = Pick<
  SeedProof,
  "source" | "slot" | "nonce" | "people" | "layout" | "population"
>;
export const names = (id: Destination) =>
  layoutOf(id.layout).map((_, i) => "dx-scale-decision-" + id.nonce + "-" + i);

export function disk(slot: string) {
  const bytes = Number(
    docker(
      "exec",
      slot + "-pg",
      "psql",
      "-U",
      "postgres",
      "-d",
      "datomic",
      "-Atc",
      "select pg_database_size('datomic')",
    ),
  );
  assert(Number.isSafeInteger(bytes) && bytes > 0);
  return bytes;
}
export function engineResources(slot: string) {
  assert(/^tx2-dxscale1-arm-d7-[a-z0-9-]+$/.test(slot));
  const names = ["tx", "pg", "gw-w", "gw-r"].map((s) => slot + "-" + s);
  const r = JSON.parse(docker("inspect", ...names));
  return Object.fromEntries(
    r.map((c: any, i: number) => {
      assert.equal(c.Name, "/" + names[i]);
      assert(Number.isSafeInteger(c.State.Pid) && c.State.Pid > 0);
      const match = /^0::(\/[^\r\n]*)$/m.exec(
        fs.readFileSync("/proc/" + c.State.Pid + "/cgroup", "utf8"),
      );
      assert(match && !match[1]!.includes(".."));
      const label = names[i]!.slice(slot.length + 1),
        dir = path.join("/sys/fs/cgroup", match[1]!);
      const stat = (key: string) => fs.readFileSync(path.join(dir, key), "utf8").trim();
      return [
        label,
        {
          image: c.Image,
          cpus: c.HostConfig.CpusetCpus,
          cap: c.HostConfig.Memory,
          bytes: Number(stat("memory.current")),
          peak: Number(stat("memory.peak")),
          cpu: stat("cpu.stat"),
          io: stat("io.stat"),
          events: stat("memory.events"),
        },
      ];
    }),
  );
}

async function pgCopy(command: string[], input: fs.ReadStream | null, out: number | "ignore") {
  const c = spawn("docker", command, { stdio: [input ? "pipe" : "ignore", out, "inherit"] });
  const done = new Promise<void>((ok, bad) => {
    c.once("error", bad);
    c.once("exit", (code, signal) =>
      code === 0 ? ok() : bad(Error("PG snapshot operation " + code + "/" + signal)),
    );
  });
  if (input) {
    input.once("error", (e) => c.stdin!.destroy(e));
    c.stdin!.on("error", (e) => input.destroy(e));
    input.pipe(c.stdin!);
  }
  await done;
}

async function verifyMembership(client: DatomicClient, scopes: Scope[], people: Density) {
  const checks = [];
  for (const s of scopes) {
    // A single pinned request covers both an early and a late account. The
    // feed-based full manifest supplies the exact population denominator.
    const expected = s.accounts.flatMap((a) =>
      [0, 1, 257, people - 1].map((local) => [root(a, local), keyFor(a)]),
    );
    const result = await client.rows(s.db, {
      entityIds: expected.map((r) => r[0]),
      pattern: { attribute: ":subject/account" },
      basis: { recordedPosition: s.seedCut, validAt: SEED_VALID_FROM },
    });
    assert.deepEqual(result.map((r) => [r.entity_id, r.value_string]).sort(), expected.sort());
    assert(result.every((r) => r.recorded_position <= s.seedCut));
    const cold = s.accounts.flatMap((a) =>
      [257, people - 1].map((local) => [task(a, local), fieldValue(local, 0, 0, 0).value]),
    );
    const touched = await client.rows(s.db, {
      entityIds: cold.map((r) => String(r[0])),
      pattern: { attribute: field(0) },
      basis: { recordedPosition: s.seedCut, validAt: SEED_VALID_FROM },
    });
    assert.deepEqual(touched.map((r) => [r.entity_id, r.value_string]).sort(), cold.sort());
    assert(touched.every((r) => r.recorded_position <= s.seedCut));
    checks.push({
      db: s.db,
      position: s.seedCut,
      checked: result.length,
      coldFields: touched.length,
    });
  }
  return checks;
}

export async function ingest(dir: string, id: Destination, readUrl: string) {
  const start = Date.now(),
    dbBefore = disk(id.slot);
  const scopes: Scope[] = [];
  const client = new DatomicClient(readUrl, 35000);
  let facts = 0,
    ingestMs = 0,
    verifyMs = 0;
  const proofs = [];
  try {
    for (const [i, accountList] of layoutOf(id.layout).entries()) {
      const name = names(id)[i]!;
      const comp = await openComposition("reach", "datomic", name);
      const fixture = source(id.people, accountList, id.population);
      const ledger = path.join(dir, "seed-" + i + ".sqlite");
      const r = await Snapshot.open(comp, fixture, fixture.groups, width, ledger);
      try {
        const began = Date.now();
        let latest = began - 60000;
        await r.drain(loaderDepth, {
          beforeCheckpoint() {
            if (Date.now() - latest < 60000) return;
            latest = Date.now();
            fs.appendFileSync(
              path.join(dir, "seed-progress.jsonl"),
              JSON.stringify({
                ...id,
                at: latest,
                scope: i,
                persons: r.cursor(),
                ...r.totals(),
                bytes: disk(id.slot),
                resources: engineResources(id.slot),
              }) + "\n",
            );
          },
        });
        const drained = Date.now();
        ingestMs += drained - began;
        update(path.join(dir, "STATUS.json"), {
          stage: "checking durable seed frames",
          scope: i,
          at: drained,
          ...r.totals(),
        });
        const proof = await r.verify(true, undefined, "feed", (step, at) => {
          update(path.join(dir, "STATUS.json"), {
            ...id,
            stage: "checking durable seed " + step,
            scope: i,
            position: at,
            at: Date.now(),
          });
        });
        verifyMs += Date.now() - drained;
        assert(
          proof.facts === accountList.length * factsFor(id.people) &&
            proof.cursor === fixture.groups &&
            proof.observed + 1 === proof.cut,
        );
        const opened = await client.create(scopeKey(name), "lean", true, 35000);
        assert(!opened.created && opened.strictRecordClocks);
        facts += proof.facts;
        proofs.push({ ...proof, scope: i, sourceSeal: r.source });
        scopes.push({
          name,
          db: opened.db,
          cut: proof.cut,
          seedCut: proof.cut,
          accounts: accountList,
        });
      } finally {
        r.close();
        await comp.close();
      }
      Object.assign(proofs.at(-1)!, { ledgerHash: await fileHash(ledger) });
    }
    const membership = await verifyMembership(client, scopes, id.people);
    assert.equal(facts, 10 * factsFor(id.people));
    const dbAfter = disk(id.slot);
    const result = {
      ...id,
      started: start,
      completed: Date.now(),
      facts,
      ingestMs,
      verifyMs,
      scopes,
      membership,
      disk: { before: dbBefore, after: dbAfter, bytesPerFact: (dbAfter - dbBefore) / facts },
      proofs,
      verification: "full-command-and-feed-with-pinned-member-probes",
    };
    write(path.join(dir, "seed.json"), result);
    return result;
  } finally {
    client.close();
  }
}

// [DX-SCALE1] Why: certify once, then run both policies from independently restored copies with the same cold-open and client preparation. Rejected: timing the current writer on a freshly seeded warm database and the new writer on a restored database.
export async function seal(dir: string, seed: Awaited<ReturnType<typeof ingest>>) {
  const partial = path.join(dir, "seed.pgdump.partial"),
    target = path.join(dir, "seed.pgdump");
  assert(!fs.existsSync(target));
  const fd = fs.openSync(partial, "wx");
  try {
    await pgCopy(
      ["exec", seed.slot + "-pg", "pg_dump", "-U", "postgres", "-Fc", "-Z1", "-d", "datomic"],
      null,
      fd,
    );
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  const header = execFileSync("head", ["-c", "5", partial], { encoding: "utf8" });
  assert.equal(header, "PGDMP");
  const bytes = fs.statSync(partial).size,
    sha256 = await fileHash(partial);
  fs.renameSync(partial, target);
  write(path.join(dir, "image.json"), { ...seed, bytes, sha256 });
}

export async function restore(dir: string, from: string, id: Destination) {
  const proof = read<SeedProof>(path.join(from, "image.json")),
    dump = path.join(from, "seed.pgdump");
  assert.equal(proof.source, id.source);
  assert.equal(proof.layout, id.layout);
  assert.equal(proof.people, id.people);
  assert.equal(proof.population, id.population);
  assert(proof.nonce !== id.nonce && proof.bytes === fs.statSync(dump).size);
  assert.equal(await fileHash(dump), proof.sha256);
  const cleanup = read(path.join(from, "cleanup.json"));
  assert.deepEqual(cleanup, { containers: [], volumes: [], networks: [] });
  const slot = id.slot;
  for (const role of ["gw-r", "gw-w", "tx"]) docker("stop", "--time", "20", slot + "-" + role);
  await pgCopy(
    [
      "exec",
      "-i",
      slot + "-pg",
      "pg_restore",
      "--exit-on-error",
      "--single-transaction",
      "--if-exists",
      "--clean",
      "-U",
      "postgres",
      "-d",
      "datomic",
    ],
    fs.createReadStream(dump),
    "ignore",
  );
  for (const role of ["tx", "gw-w", "gw-r"]) docker("start", slot + "-" + role);
  const urls = ["gw-w", "gw-r"].map((role) => {
    const c = JSON.parse(docker("inspect", slot + "-" + role))[0];
    assert.equal(c.Name, "/" + slot + "-" + role);
    return "http://" + c.NetworkSettings.Networks[slot + "-net"].IPAddress + ":8080";
  });
  for (const url of urls) {
    const until = Date.now() + 180000;
    for (;;) {
      try {
        if ((await fetch(url + "/health", { signal: AbortSignal.timeout(2000) })).ok) break;
      } catch {}
      assert(Date.now() < until, "Restored gateway did not serve health");
      await sleep(500);
    }
  }
  const c = new DatomicClient(urls[1]!, 35000);
  try {
    for (const s of proof.scopes) {
      const db = await c.create(scopeKey(s.name), "lean", true, 35000);
      assert(!db.created && db.strictRecordClocks && db.db === s.db);
      const h = await c.begin(s.db);
      assert.equal(h.position, s.seedCut);
      await c.release(s.db, h.handle);
    }
    const membership = await verifyMembership(c, proof.scopes, id.people);
    assert.deepEqual(membership, proof.membership);
    write(path.join(dir, "restored.json"), {
      identity: id,
      origin: proof,
      reopenedAt: Date.now(),
      membership,
    });
    return { scopes: proof.scopes, urls };
  } finally {
    c.close();
  }
}

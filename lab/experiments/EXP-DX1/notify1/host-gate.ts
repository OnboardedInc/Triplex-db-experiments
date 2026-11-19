import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { openComposition } from "../../../bench/lib/composition.ts";
import { DomainOracle } from "../../../bench/lib/w0-gates.ts";
import { W0, canonical, triplexValue, sha256 } from "../../../bench/lib/w0-world.ts";
import { deltaFeed, drainHost, eraseLazy, lazyFeed } from "./hosts.ts";
import { Documents, hash, parse, unpack } from "./store.ts";
import { wireDelivery } from "./verify.ts";

const mode = process.argv[2],
  root = path.resolve(process.argv[3]!),
  dir = process.env.NOTIFY_DIR!;
assert(mode === "lazy" || mode === "delta");
const revision = fs.readFileSync(path.join(root, "version"), "utf8").trim();
const load = (name: string) =>
  import(pathToFileURL(path.join(root, "lab/experiments/EXP-DX1/actv-" + mode, name + ".ts")).href);
const v = W0.POPULATION_VALID_TIME,
  s = "pl:a",
  other = "pl:b",
  ids = [s, other],
  run = randomUUID();
const facts = (who: string, tx: number): W0.Fact[] => [
  { e: who, a: "location", v: "loc:a", tx },
  { e: who, a: "payRateCents", v: who === s ? 1600 : 1675, tx },
  { e: who, a: "bgcStatus", v: "clear", tx },
  { e: "loc:a", a: "jurisdiction", v: "jur:a", tx },
  { e: "jur:a", a: "stateMinWageCents", v: 1650, tx },
  { e: "loc:a", a: "localMinWageCents", v: 1700, tx },
  ...(who === s ? [{ e: who, a: "ssn", v: "000000000", tx }] : []),
];
const sinkStore = await openComposition("reach", "datomic", "notice-sink-" + run),
  sink = new Documents(sinkStore, "recipient"),
  oracle = new DomainOracle(new URL("./oracle.py", import.meta.url).pathname);
const expected: any[] = [],
  originals: any[] = [];
async function expect(release: string, tx: number, seed: number, mask?: number) {
  const worlds = ids.map((subject) => ({
    subject,
    facts: facts(subject, seed).map((f) =>
      mask && f.a === "ssn" ? { ...f, v: { erasedAt: v }, tx: seed } : f,
    ),
  }));
  expected.push(
    ...parse<any[]>(await oracle.call("fold", { worlds, release, basis: { tx, validTime: v } })),
  );
}
async function checkEffects(src: Documents, epoch: string) {
  const origin = hash([src.prefix, epoch]),
    at = await sink.head(),
    head = await sink.get<{ batch: number; digest: string }>("received:" + origin, at);
  const observed = [];
  for (let n = 1; n <= head.value.batch; n++)
    observed.push(
      ...unpack<W0.Delivery[]>(
        (await sink.get<string>("effects:" + origin + ":" + n, at)).value,
      ).map(wireDelivery),
    );
  assert.equal(canonical(observed), canonical(expected));
  const pay = observed
    .filter((d) => d.subject === s && d.rule === "MINWAGE")
    .map((d) => Number(d.seq));
  assert.deepEqual(pay, [1, 2, 3]);
  return {
    count: observed.length,
    orderedSha256: hash(observed),
    packets: head.value.batch,
    paySequences: pay,
  };
}
let proof;
try {
  if (mode === "lazy") {
    const lib = await load("store"),
      dispatch = await load("dispatch"),
      readApi = await load("read");
    let host = await lib.openStore("lazy-notice-" + run);
    let projection = new dispatch.Dispatcher(host);
    try {
      const distinct = new Map(
        ids.flatMap((subject) => facts(subject, 1)).map((f) => [canonical([f.e, f.a]), f]),
      );
      const seed = await host.input("seed", { kind: "baseline", at: v }, [
        ...[...distinct.values()].map((f) => ({
          op: "assert",
          entityId: f.e,
          attribute: f.a,
          value: triplexValue(f.a, f.v),
          validFrom: 0,
        })),
        lib.fact(readApi.rosterRoot(0), "lazy/members", ids),
        lib.fact("members/seal", "lazy/roster-seal", readApi.rosterSeal(ids)),
      ]);
      for (const name of ["R1", "R2"] as const) {
        const ack = await lib.activation(host, "deploy-" + name, W0[name], v);
        assert.equal(ack.changes.length, 1);
        originals.push([name, ack.position, ack.txId]);
        await expect(name, ack.position, seed.position);
      }
      const loss = await eraseLazy(host, () => projection.drain(), "erase", s, v);
      await expect("R2", loss.position, seed.position, loss.position);
      const rollback = await lib.activation(host, "rollback", W0.R1, v);
      await expect("R1", rollback.position, seed.position, loss.position);
      originals.push(["rollback", rollback.position, rollback.txId]);
      await projection.drain();
      const src = new Documents(host.comp, "lazy-sender"),
        feed = await lazyFeed(host, await host.head());
      await assert.rejects(
        drainHost(src, sink, feed, async () => {
          throw Error("drop ACK");
        }),
        /drop ACK/,
      );
      projection.close();
      await host.close();
      host = await lib.openStore("lazy-notice-" + run);
      projection = new dispatch.Dispatcher(host);
      const reopened = new Documents(host.comp, "lazy-sender"),
        latest = await lazyFeed(host, await host.head());
      await drainHost(reopened, sink, latest);
      assert.equal(
        (
          await host.rows(
            ids.map((i) => "lazy/pending/" + i),
            await host.head(),
          )
        ).length,
        0,
      );
      proof = await checkEffects(reopened, feed.epoch);
    } finally {
      projection.close();
      await host.close();
    }
  } else {
    const lib = await load("account"),
      objects = await load("store"),
      dispatch = await load("dispatch"),
      save = await load("save");
    const comp = await openComposition("reach", "datomic", "delta-notice-" + run);
    try {
      const keys = path.join(dir, "test-keys"),
        binding = hash([revision, run]);
      const host = new lib.Account(new objects.Objects(comp, "target"), binding, keys);
      const initial = await host.bootstrap(
        ids,
        ids.map((subject) => ({ subject, facts: facts(subject, 1) })),
        { tx: 10, validTime: v },
      );
      await expect("R1", 10, 1);
      originals.push(["R1", initial.position]);
      const broad = await host.seal("broad", W0.R2, { from: v, valid: v });
      const head = await host.head(broad.position);
      await expect("R2", head.value.basis.tx, 1);
      originals.push(["R2", broad.position, head.value.seq]);
      const erased = await save.save(host, "erase", [], { erase: s });
      const after = await host.head(erased.position);
      await expect("R2", after.value.basis.tx, 1, after.value.basis.tx);
      const rollback = await host.seal("rollback", W0.R1, { from: v, valid: v });
      const last = await host.head(rollback.position);
      await expect("R1", last.value.basis.tx, 1, after.value.basis.tx);
      originals.push(["rollback", rollback.position, last.value.seq]);
      const source = new Documents(comp, "delta-sender");
      const feed = await deltaFeed(host, last.value.seq, (n) => dispatch.expand(host, n));
      await assert.rejects(
        drainHost(source, sink, feed, async () => {
          throw Error("drop ACK");
        }),
        /drop ACK/,
      );
      const reopened = new lib.Account(new objects.Objects(comp, "target"), binding, keys);
      await drainHost(
        source,
        sink,
        await deltaFeed(reopened, last.value.seq, (n) => dispatch.expand(reopened, n)),
      );
      proof = await checkEffects(source, feed.epoch);
    } finally {
      await comp.close();
    }
  }
  const owner = fs.readFileSync(process.env.TRIPLEX_LAB_SLOT_OWNER!);
  const files = Object.fromEntries(
    fs
      .readdirSync(path.join(root, "lab/experiments/EXP-DX1/actv-" + mode))
      .filter((n) => n.endsWith(".ts"))
      .map((n) => [
        n,
        sha256(fs.readFileSync(path.join(root, "lab/experiments/EXP-DX1/actv-" + mode, n))),
      ]),
  );
  for (const [name, checksum] of Object.entries(files)) {
    assert.equal(
      sha256(
        execFileSync("git", [
          "show",
          revision + ":lab/experiments/EXP-DX1/actv-" + mode + "/" + name,
        ]),
      ),
      checksum,
    );
  }
  fs.writeFileSync(
    path.join(dir, "host.json"),
    JSON.stringify({ run, mode, revision, files, owner: sha256(owner), originals, proof }) + "\n",
    { flag: "wx" },
  );
  console.log(proof);
} finally {
  oracle.close();
  await sinkStore.close();
}

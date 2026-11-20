import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { execFileSync, spawn } from "node:child_process";
import http from "node:http";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { W0, sha256 } from "../../../bench/lib/w0-world.ts";
import { measureW0Http } from "../../../bench/lib/w0-http.ts";
import { DomainOracle } from "../../../bench/lib/w0-gates.ts";
import { seed, valid } from "./fixture.ts";
import { activation, openStore, type Store } from "./store.ts";
import type { Format } from "./decision.ts";
const dir = process.argv[2]!,
  path = process.argv[3] ?? "legacy",
  clock = () => performance.timeOrigin + performance.now();
const save = (name: string, x: unknown) =>
  writeFileSync(join(dir, name), JSON.stringify(x, null, 2) + "\n", { flag: "wx" });
const owner = JSON.parse(readFileSync(process.env.TRIPLEX_LAB_SLOT_OWNER!, "utf8"));
const sample = () =>
  JSON.parse(
    execFileSync(
      process.execPath,
      [
        "lab/bin/engine.mjs",
        "cpu-sample",
        "--lane",
        "datomic",
        "--slot",
        owner.slot,
        "--holder",
        "DX-ACT1",
      ],
      { encoding: "utf8" },
    ),
  );
function worker(s: Store) {
  const launch = clock(),
    nonce = randomUUID();
  const child = spawn(
    process.execPath,
    ["--experimental-strip-types", new URL("./timing-worker.ts", import.meta.url).pathname],
    { stdio: ["pipe", "pipe", "inherit"] },
  );
  const lines = createInterface({ input: child.stdout, crlfDelay: Infinity })[
      Symbol.asyncIterator
    ](),
    exit = new Promise<void>((res, rej) => {
      child.once("error", rej);
      child.once("close", (c) => (c === 0 ? res() : rej(Error("reader exit " + c))));
    });
  void exit.catch(() => {});
  const take = async () => {
    const m = await lines.next();
    assert(!m.done, "reader did not reply");
    return JSON.parse(m.value);
  };
  const put = (x: unknown) => child.stdin.write(JSON.stringify(x) + "\n");
  put({ scope: s.scope, format: s.profile, valid, nonce, path });
  const ready = take().then((m) => {
    assert(m.ready && m.nonce === nonce && m.scope === s.scope);
    return { ...m.startup, launch, readyAt: clock() };
  });
  return {
    ready,
    async read(subject: string) {
      const id = randomUUID(),
        requested = clock();
      put({ subject, nonce: id });
      const r = await take(),
        received = clock();
      assert(r.nonce === id && r.scope === s.scope && r.subject === subject);
      return { ...r, requested, received };
    },
    async close() {
      put({ close: true });
      child.stdin.end();
      await exit;
      return clock();
    },
  };
}
async function whileSubmitting<T>(s: Store, label: string, go: () => Promise<T>) {
  const native = Promise.withResolvers<number>(),
    agent = http.Agent.prototype as any,
    old = agent.addRequest;
  agent.addRequest = function (req: http.ClientRequest, ...args: any[]) {
    if (req.path.endsWith("/transact")) req.once("finish", () => native.resolve(clock()));
    return old.call(this, req, ...args);
  };
  const offer = clock(),
    save = s
      .input(
        label,
        { kind: "source", at: valid },
        Array.from({ length: 32 }, (_, i) => ({
          op: "assert",
          entityId: "probe:" + label,
          attribute: "field" + i,
          value: { type: "integer", value: String(i) },
          validFrom: 0,
        })),
      )
      .then((r) => ({ p: r.position, tx: r.txId, ack: clock() }));
  try {
    const transmit = await Promise.race([
      native.promise,
      save.then(() => {
        throw Error("no native transmission");
      }),
    ]);
    agent.addRequest = old;
    const [value, w] = await Promise.all([go(), save]);
    return { value, save: { ...w, offer, transmit } };
  } finally {
    agent.addRequest = old;
  }
}
async function run(format: Format, n: number) {
  const s = await openStore("lazy-budget-" + randomUUID(), format),
    writer = await openStore(s.scope, format),
    oracle = new DomainOracle();
  const f = await seed(s, n);
  await activation(s, "origin-r1", W0.R1, valid);
  const connected = worker(s);
  const session = await connected.ready,
    rows: Record<string, unknown>[] = [];
  try {
    for (const load of ["quiet", "saves"]) {
      const resources = [sample()];
      for (let pass = 0; pass < 4; pass++)
        for (const fresh of pass % 2 ? [true, false] : [false, true]) {
          const i = rows.length,
            who = (13 + i * 97) % n,
            subject = f.roster[who]!,
            release = i % 2 ? W0.R3 : W0.R2;
          let nativeAck = 0,
            offer = 0;
          const publish = () => {
            offer = clock();
            return measureW0Http(() =>
              activation(s, "release-" + i, release, valid, valid, (t) => {
                nativeAck = performance.timeOrigin + t;
              }),
            ).then((m) => ({
              r: m.value,
              returned: clock(),
              native: m.samples.filter((q) => String(q.path).endsWith("/transact")),
              commits: m.commits,
            }));
          };
          const pub =
            load === "saves"
              ? await whileSubmitting(writer, "before-" + i, publish)
              : { value: await publish(), save: null };
          assert(
            pub.value.r.changes.length === 1 &&
              pub.value.r.changes[0].entityId === "lazy/account/releases" &&
              nativeAck >= offer,
          );
          const request = async () => {
            const client = fresh ? worker(s) : connected;
            try {
              const setup = await client.ready,
                read = await client.read(subject),
                repeat = await client.read(subject);
              return { setup, read, repeat };
            } finally {
              if (fresh) await client.close();
            }
          };
          const call =
            load === "saves"
              ? await whileSubmitting(writer, "during-" + i, request)
              : { value: await request(), save: null };
          const { setup, read, repeat } = call.value;
          for (const response of [read, repeat]) {
            assert(response.basis.tx >= pub.value.r.position && response.basis.validTime === valid);
            const expected = await oracle.call("evaluate", {
              release: release.name,
              world: f.world(who),
              basis: response.basis,
            });
            assert.equal(response.json, expected);
            response.digest = sha256(expected);
            delete response.json;
          }
          assert(read.route === "authoritative-source");
          if (read.basis.tx === repeat.basis.tx) assert.equal(repeat.route, "exact-cache");
          rows.push({
            i,
            fresh,
            load,
            offer,
            nativeAck,
            returned: pub.value.returned,
            marker: pub.value.r.txId,
            p: pub.value.r.position,
            release: release.hash,
            setup,
            read,
            repeat,
            publishSave: pub.save,
            publication: { native: pub.value.native, commits: pub.value.commits },
            readSave: call.save,
          });
        }
      resources.push(sample());
      assert(resources.every((r) => r.slot === owner.container && r.volume === owner.volume));
      save(format + "-" + load + ".json", resources);
    }
    save(format + "-stages.json", {
      scope: s.scope,
      path,
      format,
      n,
      facts: f.facts,
      roster: f.rosterHash,
      source: f.sourceHash,
      session,
      rows,
    });
  } finally {
    await connected.close();
    oracle.close();
    await writer.close();
    await s.close();
  }
}
await run("w0", 10000);
await run("act2-deep", 256);

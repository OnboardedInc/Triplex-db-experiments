// [EXP-QH1-R3] Why: O-REPLAY-style answer equality for a retained build against today's path on the real 10k W0 store. Every pull's
// full answer (every Triple field, sorted by id, keys sorted, Options expanded) is hashed; the reference run is today's HS01 build
// (row route, no H1) and its digests are compared index by index. Pulls are keyed by index only (seeded draws), so both sides see
// identical (root, validAt, recordedAt) requests: 80% at the head with eight valid-time offsets (including expired and future cuts),
// 15% at recordedAt = the only W0 transaction instant and 5% one millisecond before it (empty answer); both record-time cuts leave
// H1 and exercise its fallback. The public TemporalBasis has no position cut, so older position cuts are covered by the RQ01 route
// tests. Rejected: comparing digests only at the head, and comparing counts or id hashes only.
// usage: tsx replay.ts <arm> <out.txt> [count=100000] [concurrency=8]
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { Effect, Layer, ManagedRuntime } from "effect";
const [armName, out, countArg = "100000", concArg = "8"] = process.argv.slice(2);
if (!armName || !out) throw Error("usage: replay.ts <arm> <out.txt> [count] [concurrency]");
const E = "/Users/sam/Claude/Projects/triplex-db-2/evidence";
const root =
  armName === "baseline"
    ? path.join(E, "QH1-R2/arms/baseline")
    : armName === "h1"
      ? path.join(E, "QH1-R2/arms/candidate")
      : path.join(process.env.QH1_ARMS_ROOT ?? path.join(E, "QH1-R3/arms"), armName);
// [EXP-QH1-R4] Why: round 4 replays on its own APFS clone of the retained candidate store (QH1_STORE), so the retained store is never
// opened read-write. Rejected: opening the retained R3 store (a broker open appends an epoch frame).
const store =
  process.env.QH1_STORE ??
  path.join(E, "QH1-R3", armName === "baseline" ? "store-baseline" : "store-candidate");
const imp = (p: string) => import(path.join(root, p));
const core = await imp("packages/core/dist/index.js");
const rt = await imp("packages/core/dist/runtime/index.js");
const q = await imp("packages/qlever/dist/index.js");
const D = createRequire(path.join(root, "packages/qlever/package.json"))("better-sqlite3");
const db = new D(path.join(store, "broker.db"), { readonly: true });
const roots: string[] = db
  .prepare("SELECT name FROM ents WHERE name LIKE 'pl:%' AND instr(name,'/')=0 ORDER BY name")
  .pluck()
  .all();
db.close();
if (roots.length !== 10000) throw Error("expected 10000 W0 placements");
const broker = await q.HostBroker.open({
  dir: store,
  scopeKey: "qh1-r3",
  minFreeBytes: 5 * 1024 ** 3,
  frameRetention: { tailFrames: 1024 },
});
const head = broker.head();
const client: any = {
  query: async (sql: string) => {
    if (sql === "SELECT ?s WHERE { ?s ?p ?o } LIMIT 1") return [];
    throw new TypeError("offline", {
      cause: Object.assign(new Error("offline"), { code: "ECONNREFUSED" }),
    });
  },
  update: async () => {},
  command: async () => {},
  cancel: async () => {},
  close: async () => {},
};
const adapter = q.makeQleverBrokerStorageAdapter(
  client,
  "qh1-r3",
  broker,
  armName === "baseline" ? {} : { currentRoute: "h1" as const },
);
const runtime = ManagedRuntime.make(
  rt.Runtime.define({
    name: "qh1-r3",
    storage: Layer.succeed(rt.StorageAdapter, adapter),
    queries: Layer.succeed(
      rt.QueryExecutor,
      q.makeQleverQueryExecutor(client, "qh1-r3", {
        sourceView: adapter.sourceView,
      }),
    ),
  }).layer({
    scope: rt.DatabaseScope.test("qh1-r3"),
    capabilities: rt.Capabilities.none,
  }),
);
const T: any = await runtime.runPromise(Effect.service(core.Triples));
const VALID_AT = Date.parse("2026-11-04T12:00:00Z"),
  DAY = 86400000;
// Every W0 transaction has recorded_at 1793783600000 (verified: one distinct value in txs), so record-time cuts are the boundary and one millisecond before it.
const RECORDED_AT = 1793783600000;
const offsets = [0, 3 * DAY, -3 * DAY, 40 * DAY, -40 * DAY, 400 * DAY, -400 * DAY, 0];
const request = (i: number) => {
  let s = (Math.imul(i + 1, 2654435761) ^ 0x9e3779b9) >>> 0;
  s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
  const rootName = roots[s % roots.length]!;
  const k = i % 100;
  const basis =
    k < 80
      ? { validAt: VALID_AT + offsets[k % 8]! }
      : k < 95
        ? { validAt: VALID_AT, recordedAt: RECORDED_AT }
        : { validAt: VALID_AT, recordedAt: RECORDED_AT - 1 };
  return { rootName, basis };
};
const canon = (x: any): any =>
  Array.isArray(x)
    ? x.map(canon)
    : x && typeof x === "object"
      ? Object.fromEntries(
          Object.keys(x)
            .sort()
            .map((k) => [k, canon(x[k])]),
        )
      : x;
const digest = (triples: any[]) =>
  createHash("sha256")
    .update(
      JSON.stringify(
        canon(
          JSON.parse(
            JSON.stringify([...triples].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))),
          ),
        ),
      ),
    )
    .digest("hex")
    .slice(0, 32);
const pull = async (rootName: string, basis: any): Promise<{ triples: any[]; hops: number }> => {
  if (typeof T.reach === "function") {
    const r = await runtime.runPromise(T.reach(core.EntityId.make(rootName), basis));
    return { triples: r.triples as any[], hops: r.hops };
  }
  const body = async () => {
    let todo = [rootName];
    const seen = new Set(todo);
    const triples: any[] = [];
    let hops = 0;
    while (todo.length) {
      const bodies = await runtime.runPromise(T.entities(todo.map(core.EntityId.make), basis));
      hops++;
      const next: string[] = [];
      for (const b of bodies)
        for (const t of b) {
          triples.push(t);
          if (t.value.type === "ref" && !seen.has(t.value.value)) {
            seen.add(t.value.value);
            next.push(t.value.value);
          }
        }
      todo = next;
    }
    return { triples, hops };
  };
  return armName === "baseline" ? body() : adapter.withCurrentPull(rootName, body);
};
const COUNT = Number(countArg),
  CONC = Number(concArg);
const lines: string[] = Array.from<string>({ length: COUNT });
let next = 0,
  rows = 0,
  hopsTotal = 0;
const started = Date.now();
await Promise.all(
  Array.from({ length: CONC }, async () => {
    for (;;) {
      const i = next++;
      if (i >= COUNT) return;
      const { rootName, basis } = request(i);
      const a = await pull(rootName, basis);
      rows += a.triples.length;
      hopsTotal += a.hops;
      lines[i] = `${i} ${rootName} ${digest(a.triples)} ${a.triples.length} ${a.hops}`;
    }
  }),
);
fs.writeFileSync(out, lines.join("\n") + "\n");
console.log(
  JSON.stringify({
    arm: armName,
    count: COUNT,
    head,
    rows,
    hopsTotal,
    seconds: (Date.now() - started) / 1000,
    routes: adapter.routes,
  }),
);
await runtime.dispose();
await broker.close();

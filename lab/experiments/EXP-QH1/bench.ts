// [EXP-QH1] Why: CPU windows surround the public Triples BFS; oracle/hash work stays outside.
// Rejected: wall-time efficiency, adding worker CPU to process CPU, or timing bare SQL.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { Effect, Layer, ManagedRuntime } from "effect";
import * as core from "../../../packages/core/dist/index.js";
import * as rt from "../../../packages/core/dist/runtime/index.js";
import * as W0 from "../../../packages/w0/dist/index.js";
import * as q from "../../../packages/qlever/dist/index.js";
const [arm, store, out, n = "10000"] = process.argv.slice(2),
  count = Number(n);
if (!arm || !store || !out) throw Error("arm store out [count]");
const started = new Date().toISOString();
const artifactHashes = () =>
  Object.fromEntries(
    ["core", "qlever"].flatMap((pkg) => {
      const dir = path.resolve("packages", pkg, "dist");
      return fs
        .readdirSync(dir, { recursive: true })
        .map((f) => path.join(dir, String(f)))
        .filter((f) => fs.statSync(f).isFile())
        .sort()
        .map((f) => [f, createHash("sha256").update(fs.readFileSync(f)).digest("hex")]);
    }),
  );
const builds = artifactHashes();
const D = createRequire(new URL("../../../packages/qlever/package.json", import.meta.url))(
  "better-sqlite3",
);
const db = new D(path.join(store, "broker.db"), { readonly: true });
const roots = db
  .prepare("SELECT name FROM ents WHERE name LIKE 'pl:%' AND instr(name,'/')=0 ORDER BY name")
  .pluck()
  .all();
db.close();
const plans = new Map(
  roots.map((root: string) => [root, W0.plan(W0.rung(10000), Number(root.slice(4)))]),
);
if (roots.length !== 10000) throw Error("G0 requires all 10000 W0 placements");
const broker = await q.HostBroker.open({
  dir: store,
  scopeKey: "qh1-bench",
  minFreeBytes: 5 * 1024 ** 3,
  frameRetention: { tailFrames: 1024 },
});
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
let counters: any[] = [];
const adapter = q.makeQleverBrokerStorageAdapter(client, "qh1-bench", broker, {
  ...(arm === "candidate" ? { currentRoute: "h1" as const } : {}),
  onPull: (e) => counters.push(e),
});
const runtime = ManagedRuntime.make(
  rt.Runtime.define({
    name: "qh1-bench",
    storage: Layer.succeed(rt.StorageAdapter, adapter),
    queries: Layer.succeed(
      rt.QueryExecutor,
      q.makeQleverQueryExecutor(client, "qh1-bench", { sourceView: adapter.sourceView }),
    ),
  }).layer({ scope: rt.DatabaseScope.test("qh1-bench"), capabilities: rt.Capabilities.none }),
);
const T = await runtime.runPromise(Effect.service(core.Triples));
const pull = async (root: string) => {
  const body = async () => {
    let todo = [root],
      seen = new Set(todo),
      triples: any[] = [],
      hops = 0;
    while (todo.length) {
      const bodies = await runtime.runPromise(
        T.entities(todo.map(core.EntityId.make), { validAt: Date.parse("2026-11-04T12:00:00Z") }),
      );
      hops++;
      const next: string[] = [];
      for (const body of bodies)
        for (const t of body) {
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
  return arm === "candidate" ? adapter.withCurrentPull(root, body) : body();
};
const quantile = (a: number[], p: number) =>
  [...a].sort((a, b) => a - b)[Math.floor((a.length - 1) * p)];
let seed = 46;
const random = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0);
const hashes: any[] = [],
  rounds: any[] = [];
const calibrate = () => {
  let x = 1;
  const t = performance.now();
  for (let i = 0; i < 1000000; i++) x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
  return { ms: performance.now() - t, x };
};
try {
  for (let i = 0; i < 100; i++) await pull(roots[i]);
  for (const clients of [1, 4]) {
    for (let round = 0; round < 3; round++) {
      const beforeLoad = os.loadavg(),
        calibration = calibrate(),
        lat: number[] = [],
        buckets: Record<string, number[]> = {};
      const N = round === 0 ? count : Math.min(count, 1000);
      const threadCpuUs: Record<string, number> = {};
      let totalCpuUs = 0,
        mainCpuUs = 0,
        wallMs = 0;
      for (let offset = 0; offset < N; offset += 100) {
        const answers: any[] = [],
          selected: string[] = [],
          size = Math.min(100, N - offset);
        let issued = 0;
        const thread0 = arm === "candidate" ? await (broker as any).log.threadCpu() : undefined;
        const cpu0 = process.cpuUsage(),
          main0 = process.threadCpuUsage(),
          wall0 = performance.now();
        await Promise.all(
          Array.from({ length: clients }, async () => {
            while (issued < size) {
              const i = issued++;
              const root = roots[random() % roots.length];
              const t = performance.now();
              const answer = await pull(root);
              const ms = performance.now() - t;
              lat.push(ms);
              const bucket = ["50-200", "201-800", "801-2000"][plans.get(root)!.bucket]!;
              (buckets[bucket] ??= []).push(ms);
              answers[i] = answer;
              selected[i] = root;
            }
          }),
        );
        const cpu = process.cpuUsage(cpu0),
          main = process.threadCpuUsage(main0);
        wallMs += performance.now() - wall0;
        totalCpuUs += cpu.user + cpu.system;
        if (thread0) {
          const after = await (broker as any).log.threadCpu();
          for (const key of Object.keys(thread0))
            threadCpuUs[key] =
              (threadCpuUs[key] ?? 0) +
              after[key].user +
              after[key].system -
              thread0[key].user -
              thread0[key].system;
        }
        mainCpuUs += main.user + main.system;
        if (round === 0 && clients === 1)
          for (let i = 0; i < size; i++)
            hashes.push({
              root: selected[i],
              rows: answers[i].triples.length,
              hops: answers[i].hops,
              sha256: createHash("sha256")
                .update(
                  JSON.stringify(
                    answers[i].triples.sort((a: any, b: any) => a.id.localeCompare(b.id)),
                  ),
                )
                .digest("hex"),
            });
      }
      rounds.push({
        clients,
        round,
        pulls: N,
        totalCpuUs,
        mainCpuUs,
        threadCpuUs,
        otherCpuUs: totalCpuUs - mainCpuUs - Object.values(threadCpuUs).reduce((a, b) => a + b, 0),
        workerAndOtherCpuUs: totalCpuUs - mainCpuUs,
        pullsPerCpuSecond: (N * 1e6) / totalCpuUs,
        capacityPullsPerSecond: (N * 1000) / wallMs,
        p50: quantile(lat, 0.5),
        p99: quantile(lat, 0.99),
        buckets: Object.fromEntries(
          Object.entries(buckets).map(([b, a]) => [
            b,
            { n: a.length, p50: quantile(a, 0.5), p99: quantile(a, 0.99) },
          ]),
        ),
        wallMs,
        load: beforeLoad,
        calibration,
        rss: process.memoryUsage().rss,
      });
      console.log(JSON.stringify(rounds.at(-1)));
    }
  }
  if (JSON.stringify(builds) !== JSON.stringify(artifactHashes()))
    throw Error("Timed build bytes changed");
  fs.writeFileSync(
    out,
    JSON.stringify({
      diagnostic: true,
      builds,
      buildsStillMatch: true,
      arm,
      started,
      ended: new Date().toISOString(),
      roots: roots.length,
      replica: "detached",
      node: process.version,
      rounds,
      counters,
      hashes,
    }),
  );
} finally {
  await runtime.dispose();
  await broker.close();
}

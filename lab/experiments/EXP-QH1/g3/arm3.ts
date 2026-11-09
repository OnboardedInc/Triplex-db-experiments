// [EXP-QH1-R3] Why: round 2's measurement process (one process per arm, per-thread CPU, oracle/hash work outside timed windows),
// extended to retained step builds. Arms: baseline = today (HS01 build, HS01 store); h1 = round 1 (retained candidate build);
// s1..s5 = the round 3 steps (retained by arms3.mjs). A build that has Triples.reach is driven with one Effect run per pull,
// any other build with the public per-hop BFS inside withCurrentPull (as in round 2). Rejected: L0 to L3 micro arms (not product code).
// usage: tsx arm3.ts <arm> <out.json> [segments=3] [pullsPerSegment=500] [warmup=300] [seed=1] [clients=1]
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { Effect, Layer, ManagedRuntime } from "effect";

const [armName, out, segs = "3", per = "500", warm = "300", seedArg = "1", clientsArg = "1"] =
  process.argv.slice(2);
if (!armName || !out)
  throw Error(
    "usage: arm3.ts <arm> <out.json> [segments] [pullsPerSegment] [warmup] [seed] [clients]",
  );
const E = "/Users/sam/Claude/Projects/triplex-db-2/evidence";
const root =
  armName === "baseline"
    ? path.join(E, "QH1-R2/arms/baseline")
    : armName === "h1"
      ? path.join(E, "QH1-R2/arms/candidate")
      : path.join(E, "QH1-R3/arms", armName);
const store = path.join(E, "QH1-R3", armName === "baseline" ? "store-baseline" : "store-candidate");
const wt = path.resolve(import.meta.dirname, "../../../..");
const SEGMENTS = Number(segs),
  PER = Number(per),
  WARM = Number(warm),
  SEED = Number(seedArg),
  CLIENTS = Number(clientsArg);
const started = new Date().toISOString();
const imp = (p: string) => import(path.join(root, p));
const core = await imp("packages/core/dist/index.js");
const rt = await imp("packages/core/dist/runtime/index.js");
const q = await imp("packages/qlever/dist/index.js");
const W0 = await import(path.join(wt, "packages/w0/dist/index.js"));
const D = createRequire(path.join(root, "packages/qlever/package.json"))("better-sqlite3");

const sha = (s: string | Buffer) => createHash("sha256").update(s).digest("hex");
const dirHash = (dir: string) => {
  const h = createHash("sha256");
  for (const f of fs.readdirSync(dir, { recursive: true }).map(String).sort()) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isFile()) h.update(f).update(sha(fs.readFileSync(p)));
  }
  return h.digest("hex");
};
const builds = {
  core: dirHash(path.join(root, "packages/core/dist")),
  qlever: dirHash(path.join(root, "packages/qlever/dist")),
};

const db = new D(path.join(store, "broker.db"), { readonly: true });
const roots: string[] = db
  .prepare("SELECT name FROM ents WHERE name LIKE 'pl:%' AND instr(name,'/')=0 ORDER BY name")
  .pluck()
  .all();
db.close();
if (roots.length !== 10000) throw Error("expected 10000 W0 placements");
const bucketOf = new Map(
  roots.map((r) => [r, W0.plan(W0.rung(10000), Number(r.slice(4))).bucket as number]),
);
const VALID_AT = Date.parse("2026-11-04T12:00:00Z");

type Pulled = { triples: any[]; hops: number; fullDigestable: boolean };
interface Arm {
  pull(root: string): Promise<Pulled>;
  threadCpu(): Promise<Record<string, { user: number; system: number }> | undefined>;
  close(): Promise<void>;
  extra?: () => unknown;
}

const brokerArm = async (h1: boolean, countPulls: boolean): Promise<Arm> => {
  const broker = await q.HostBroker.open({
    dir: store,
    scopeKey: "qh1-r2",
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
  const counters: any[] = [];
  const adapter = q.makeQleverBrokerStorageAdapter(client, "qh1-r2", broker, {
    ...(h1 ? { currentRoute: "h1" as const } : {}),
    ...(h1 && countPulls ? { onPull: (e: any) => counters.push(e) } : {}),
  });
  const runtime = ManagedRuntime.make(
    rt.Runtime.define({
      name: "qh1-r2",
      storage: Layer.succeed(rt.StorageAdapter, adapter),
      queries: Layer.succeed(
        rt.QueryExecutor,
        q.makeQleverQueryExecutor(client, "qh1-r2", {
          sourceView: adapter.sourceView,
        }),
      ),
    }).layer({
      scope: rt.DatabaseScope.test("qh1-r2"),
      capabilities: rt.Capabilities.none,
    }),
  );
  const T = await runtime.runPromise(Effect.service(core.Triples));
  const whole = typeof (T as any).reach === "function";
  const wholeBody = async (root: string): Promise<Pulled> => {
    const r = await runtime.runPromise(
      (T as any).reach(core.EntityId.make(root), { validAt: VALID_AT }),
    );
    return { triples: r.triples, hops: r.hops, fullDigestable: true };
  };
  const body = (root: string) => async (): Promise<Pulled> => {
    let todo = [root];
    const seen = new Set(todo);
    const triples: any[] = [];
    let hops = 0;
    while (todo.length) {
      const bodies = await runtime.runPromise(
        T.entities(todo.map(core.EntityId.make), { validAt: VALID_AT }),
      );
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
    return { triples, hops, fullDigestable: true };
  };
  return {
    pull: (r) => (whole ? wholeBody(r) : h1 ? adapter.withCurrentPull(r, body(r)) : body(r)()),
    threadCpu: async () =>
      (broker as any).log.threadCpu ? (broker as any).log.threadCpu() : undefined,
    close: async () => {
      await runtime.dispose();
      await broker.close();
    },
    extra: () => ({
      pullCounters: counters.length ? counters.slice(-1000) : undefined,
      h1Calls: counters.length,
    }),
  };
};

const arm: Arm = await brokerArm(armName !== "baseline", armName === "h1");

// ---- measurement -----------------------------------------------------------------------------------------------------
const quantile = (a: number[], p: number) =>
  [...a].sort((x, y) => x - y)[Math.floor((a.length - 1) * p)]!;
const lcg = (s0: number) => {
  let s = s0 >>> 0;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0);
};
const calibrate = () => {
  let x = 1;
  const t = performance.now();
  for (let i = 0; i < 1_000_000; i++) x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
  return { ms: performance.now() - t, x };
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
const digests = (triples: any[]) => {
  const core = triples
    .map(
      (t) => `${t.entityId}\u0000${t.attribute}\u0000${t.value.type}\u0000${String(t.value.value)}`,
    )
    .sort()
    .join("\n");
  return { core: sha(core), n: triples.length };
};
const fullDigest = (triples: any[]) =>
  sha(
    JSON.stringify(
      canon(
        JSON.parse(
          JSON.stringify([...triples].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))),
        ),
      ),
    ),
  );
const answerDigests: any[] = [];
const segments: any[] = [];
try {
  // Fixed warmup roots and digests, identical for every arm and round (seed 4646): also the cross-arm answer comparison.
  const wr = lcg(4646);
  for (let i = 0; i < WARM; i++) {
    const r = roots[wr() % roots.length]!;
    const a = await arm.pull(r);
    if (i < 200)
      answerDigests.push({
        root: r,
        hops: a.hops,
        ...digests(a.triples),
        full: a.fullDigestable ? fullDigest(a.triples) : null,
      });
  }
  const rand = lcg(1000 + SEED);
  const windowStartUs = Number(process.hrtime.bigint() / 1000n);
  for (let s = 0; s < SEGMENTS; s++) {
    const load = os.loadavg(),
      calibration = calibrate();
    const lat: number[] = [];
    const buckets: Record<string, number[]> = {};
    const threadCpuUs: Record<string, number> = {};
    let totalUs = 0,
      userUs = 0,
      mainUs = 0,
      wallMs = 0,
      rows = 0,
      hopsTotal = 0;
    for (let off = 0; off < PER; off += 100) {
      const size = Math.min(100, PER - off);
      let issued = 0;
      const t0 = await arm.threadCpu();
      const c0 = process.cpuUsage(),
        m0 = process.threadCpuUsage(),
        w0 = performance.now();
      await Promise.all(
        Array.from({ length: CLIENTS }, async () => {
          while (issued < size) {
            issued++;
            const r = roots[rand() % roots.length]!;
            const a = performance.now();
            const ans = await arm.pull(r);
            const ms = performance.now() - a;
            lat.push(ms);
            (buckets[["50-200", "201-800", "801-2000"][bucketOf.get(r)!]!] ??= []).push(ms);
            rows += ans.triples.length;
            hopsTotal += ans.hops;
          }
        }),
      );
      const c = process.cpuUsage(c0),
        m = process.threadCpuUsage(m0);
      wallMs += performance.now() - w0;
      totalUs += c.user + c.system;
      userUs += c.user;
      mainUs += m.user + m.system;
      if (t0) {
        const t1 = (await arm.threadCpu())!;
        for (const k of Object.keys(t0))
          threadCpuUs[k] =
            (threadCpuUs[k] ?? 0) + t1[k]!.user + t1[k]!.system - t0[k]!.user - t0[k]!.system;
      }
    }
    const named = Object.values(threadCpuUs).reduce((a, b) => a + b, 0);
    const seg = {
      arm: armName,
      segment: s,
      clients: CLIENTS,
      pulls: PER,
      cpuUsPerPull: totalUs / PER,
      userUsPerPull: userUs / PER,
      systemUsPerPull: (totalUs - userUs) / PER,
      mainUsPerPull: mainUs / PER,
      workersUsPerPull: t0Present(threadCpuUs) ? named / PER : null,
      otherUsPerPull: t0Present(threadCpuUs) ? (totalUs - mainUs - named) / PER : null,
      workerDetailUsPerPull: Object.fromEntries(
        Object.entries(threadCpuUs).map(([k, v]) => [k, v / PER]),
      ),
      pullsPerCpuSecond: (PER * 1e6) / totalUs,
      capacityPullsPerSecond: (PER * 1000) / wallMs,
      p50: quantile(lat, 0.5),
      p99: quantile(lat, 0.99),
      rowsPerPull: rows / PER,
      hopsPerPull: hopsTotal / PER,
      buckets: Object.fromEntries(
        Object.entries(buckets).map(([b, a]) => [
          b,
          { n: a.length, p50: quantile(a, 0.5), p99: quantile(a, 0.99) },
        ]),
      ),
      load,
      calibration,
      rss: process.memoryUsage().rss,
    };
    segments.push(seg);
    console.log(JSON.stringify(seg));
  }
  const windowEndUs = Number(process.hrtime.bigint() / 1000n);
  // Optional per-OS-thread attribution (ps -M, 10 ms resolution): one window with no hashing, to size the threads
  // process.cpuUsage includes but no thread counter names (V8 platform/GC helpers, libuv pool).
  let osThreads: unknown;
  if (process.env.QH1_PS === "1") {
    const { spawnSync } = await import("node:child_process");
    const sample = () => {
      const o = spawnSync("ps", ["-M", "-p", String(process.pid), "-o", "utime,stime"], {
        encoding: "utf8",
      })
        .stdout.trim()
        .split("\n")
        .slice(1);
      const sec = (t: string) => {
        const [m, rest] = t.split(":");
        return Number(m) * 60 + Number(rest);
      };
      return o.map((l) => {
        const c = l.trim().split(/\s+/);
        const n = c.length;
        return sec(c[n - 2]!) + sec(c[n - 1]!);
      });
    };
    const rr = lcg(777);
    const a0 = sample(),
      c0 = process.cpuUsage(),
      m0 = process.threadCpuUsage();
    for (let i = 0; i < PER * SEGMENTS; i++) await arm.pull(roots[rr() % roots.length]!);
    const c1 = process.cpuUsage(c0),
      m1 = process.threadCpuUsage(m0),
      a1 = sample();
    osThreads = {
      pulls: PER * SEGMENTS,
      processCpuUsPerPull: (c1.user + c1.system) / (PER * SEGMENTS),
      mainUsPerPull: (m1.user + m1.system) / (PER * SEGMENTS),
      threadSecondsDelta: a1.map((v, i) => +(v - (a0[i] ?? 0)).toFixed(2)),
      threadCount: a1.length,
      newThreads: a1.length - a0.length,
    };
    console.log(JSON.stringify({ osThreads }));
  }
  fs.writeFileSync(
    out,
    JSON.stringify({
      diagnostic: true,
      arm: armName,
      started,
      ended: new Date().toISOString(),
      node: process.version,
      builds,
      store,
      root,
      clients: CLIENTS,
      seed: SEED,
      segments,
      windowUs: [windowStartUs, windowEndUs],
      answerDigests,
      osThreads,
      extra: arm.extra?.(),
    }),
  );
} finally {
  await arm.close();
}
function t0Present(o: Record<string, number>) {
  return Object.keys(o).length > 0;
}

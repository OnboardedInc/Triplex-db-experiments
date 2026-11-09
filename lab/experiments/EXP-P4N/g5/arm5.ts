// [EXP-P4N-R2] Round 2 arm process: round 1's arm4.ts plus (1) the shared probe module, (2) document modes for (c'): +docp (documents
// prefilled in-process before the window, so the window is the hit path), +docc (current.db deleted first, so the window is the read-through
// fill path), (3) +w (a commit on a hot owner every 10th pull and 50% of reads on a 200-owner hot set, the TARGETS 2.1 shape, commits counted
// in the CPU window), (4) +sweep (every root once, the P5 activation-sweep shape). Per-segment document counters and current.db bytes.
// [EXP-P4N] Why: round 3's per-arm process, rebuilt with (1) a thread-CPU reference probe in place of the wall-clock calibration loop
// (round 3's loop did not track per-pull CPU, BRIEF 4.1), (2) 100-pull batches kept raw so a bootstrap can resample them,
// (3) arm labels "<build>[+lever][@twin]" so the same build runs twice (in-run A/A), (4) host load and heavy-slot occupancy per segment.
// Rejected: a divisor normalisation by the probe (it is a window grade only), and a probe in a reader worker (its thread CPU is
// not readable from main; the probe runs the same SQL statement and JSON.parse on the main thread's own thread CPU).
// usage: tsx arm5.ts <arm> <out.json> [segments=5] [pullsPerSegment=1000] [warmup=300] [seed=1] [clients=1]
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { Effect, Layer, ManagedRuntime } from "effect";
import { makeProbe } from "./probe.ts";

const [armLabel, out, segs = "5", per = "1000", warm = "300", seedArg = "1", clientsArg = "1"] =
  process.argv.slice(2);
if (!armLabel || !out)
  throw Error(
    "usage: arm5.ts <arm> <out.json> [segments] [pullsPerSegment] [warmup] [seed] [clients]",
  );
// "final+semi64@2": build final, lever semi64 (a node flag set by abab4.mjs, recorded here), twin tag 2.
const armName = armLabel.split("@")[0]!.split("+")[0]!;
const E = "/Users/sam/Claude/Projects/triplex-db-2/evidence";
const levers = armLabel.split("@")[0]!.split("+").slice(1);
const docMode = levers.includes("docp")
  ? "prefilled"
  : levers.includes("docc")
    ? "cold"
    : undefined;
const writerOn = levers.includes("w"),
  sweepOn = levers.includes("sweep");
const retainedR3 = ["final", "s1", "s2", "s3", "s4", "s4b", "s5", "s5b"];
const root = retainedR3.includes(armName)
  ? path.join(E, "QH1-R3/arms", armName)
  : fs.existsSync(path.join(E, "P4N-R2/arms", armName))
    ? path.join(E, "P4N-R2/arms", armName)
    : path.join(E, "P4N-R1/arms", armName);
// Own APFS clone of round 3's candidate store (cp -c); the retained store is never opened read-write.
const store = process.env.P4N_STORE ?? path.join(E, "P4N-R1/store");
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
  broker: any;
  commit(owner: string, k: number): Promise<void>;
}

const brokerArm = async (h1: boolean, countPulls: boolean): Promise<Arm> => {
  if (docMode === "cold")
    for (const f of ["current.db", "current.db-wal", "current.db-shm"])
      fs.rmSync(path.join(store, f), { force: true });
  const broker = await q.HostBroker.open({
    dir: store,
    scopeKey: "qh1-r2",
    minFreeBytes: 5 * 1024 ** 3,
    frameRetention: { tailFrames: 1024 },
    ...(docMode ? { currentDocs: true } : {}),
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
  // A real commit through the broker (placeholder position, same shape as route.test.ts), one new fact on a hot owner's root entity.
  const commit = async (owner: string, k: number) => {
    const at = 1793783600000 + k;
    const r = {
      id: `p4n-${SEED}-${k}`,
      entity_id: owner,
      attribute: ":p4n/touch",
      value_type: "number",
      value_string: null,
      value_number: k,
      value_boolean: null,
      value_datetime: null,
      value_json: null,
      recorded_at: at,
      recorded_position: -1,
      valid_from: at,
      valid_to: null,
      created_by: null,
      retracted_at: null,
      retracted_position: null,
      retract_tx_id: null,
      entity_type: null,
      schema_version: 1,
      tx_id: `tx:p4n:${SEED}:${k}`,
    };
    const decision = await broker.submit({
      operationId: `p4n-op-${SEED}-${k}`,
      attemptId: `p4n-try-${SEED}-${k}`,
      sourceK: broker.head(),
      reads: { entities: new Set(), scopeWide: false },
      claims: [],
      placeholders: [-1],
      rows: [r],
      priors: new Map(),
      newIds: new Set([r.id]),
    });
    if (decision.kind !== "committed") throw Error("writer-on commit failed: " + decision.kind);
  };
  return {
    broker,
    commit,
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

const arm: Arm = await brokerArm(true, false);

// ---- reference probe (shared module) and host facts ---------------------------------------------------------------------
const { probe, fixture: probeFixture, close: closeProbe } = makeProbe(D, store, roots);
const heavySlots = () => {
  const dir = "/Users/sam/projects/triplex-db-2/lab/locks/heavy";
  try {
    return fs
      .readdirSync(dir)
      .filter((n) => /^\d+$/.test(n))
      .map((n) => {
        try {
          return JSON.parse(fs.readFileSync(path.join(dir, n, "owner.json"), "utf8"))
            .label as string;
        } catch {
          return "?";
        }
      });
  } catch {
    return [] as string[];
  }
};
const docBytes = () => {
  const size = (f: string) => {
    try {
      return fs.statSync(path.join(store, f)).size;
    } catch {
      return 0;
    }
  };
  return { db: size("current.db"), wal: size("current.db-wal") };
};

// ---- measurement -----------------------------------------------------------------------------------------------------
const quantile = (a: number[], p: number) =>
  [...a].sort((x, y) => x - y)[Math.floor((a.length - 1) * p)]!;
const lcg = (s0: number) => {
  let s = s0 >>> 0;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0);
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
let prefill: any;
try {
  if (docMode === "prefilled") {
    // The documents are filled by the ordinary read-through path, once per root at the head, before any window opens.
    const c0 = process.cpuUsage(),
      w0 = performance.now(),
      t0 = await arm.threadCpu();
    const pf = await arm.broker.prefillCurrent(roots, 8);
    const t1 = (await arm.threadCpu())!;
    const c1 = process.cpuUsage(c0);
    let workers = 0;
    for (const k of Object.keys(t0!))
      workers += t1[k]!.user + t1[k]!.system - t0![k]!.user - t0![k]!.system;
    prefill = {
      roots: roots.length,
      passes: pf.passes,
      complete: pf.complete,
      wallMs: performance.now() - w0,
      processCpuUs: c1.user + c1.system,
      namedWorkersCpuUs: workers,
      docStats: await arm.broker.docStats(),
      bytes: docBytes(),
    };
  }
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
  // [EXP-P4N-R2] Why: the first writer-on series drew hot reads and commit targets from one 32-bit LCG whose high-bit pairs correlate, so in some
  // rounds commits never landed on an owner the reads touched (stale lookups 0 of 1,250 commits in some runs, 428 in others). mulberry32 gives
  // independent-looking picks; hot reads and commit targets come from the same hot set by design. Rejected: the LCG (kept only for the round 1
  // compatible uniform draws).
  const mulberry = (a0: number) => {
    let a = a0 >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  const lwf = mulberry(555 + SEED);
  // Hot set of 200 owners (writer-on) and the fixed sweep order (every root once).
  const hk = mulberry(777);
  const hot = roots
    .map((r) => [hk(), r] as const)
    .sort((a, b) => a[0] - b[0])
    .slice(0, 200)
    .map((x) => x[1]);
  const sh2 = lcg(31337);
  const sweepOrder = [...roots]
    .map((r) => [sh2(), r] as const)
    .sort((a, b) => a[0] - b[0])
    .map((x) => x[1]);
  let sweepIdx = 0,
    pullCount = 0,
    commitCount = 0;
  const draw = (): string => {
    if (sweepOn) return sweepOrder[sweepIdx++ % sweepOrder.length]!;
    if (writerOn && lwf() < 0.5) return hot[Math.floor(lwf() * hot.length)]!;
    return roots[rand() % roots.length]!;
  };
  for (let s = 0; s < SEGMENTS; s++) {
    const loadBefore = os.loadavg(),
      slotsBefore = heavySlots(),
      probeBefore = probe(),
      docsBefore = docMode ? await arm.broker.docStats() : undefined;
    const lat: number[] = [];
    const buckets: Record<string, number[]> = {};
    const batches: any[] = [];
    let rows = 0,
      hopsTotal = 0,
      commits = 0;
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
            if (writerOn && ++pullCount % 10 === 0) {
              await arm.commit(hot[Math.floor(lwf() * hot.length)]!, ++commitCount);
              commits++;
            }
            const r = draw();
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
        m = process.threadCpuUsage(m0),
        wallMs = performance.now() - w0;
      const workerUs: Record<string, number> = {};
      if (t0) {
        const t1 = (await arm.threadCpu())!;
        for (const k of Object.keys(t0))
          workerUs[k] = t1[k]!.user + t1[k]!.system - t0[k]!.user - t0[k]!.system;
      }
      const named = Object.values(workerUs).reduce((a, b) => a + b, 0);
      batches.push({
        pulls: size,
        totalUs: c.user + c.system,
        mainUs: m.user + m.system,
        namedWorkersUs: named,
        wallMs,
      });
    }
    const sum = (k: string) => batches.reduce((a, b) => a + b[k], 0);
    const probeAfter = probe();
    const docsAfter = docMode ? await arm.broker.docStats() : undefined;
    const seg = {
      arm: armLabel,
      segment: s,
      clients: CLIENTS,
      pulls: PER,
      commits,
      cpuUsPerPull: sum("totalUs") / PER,
      mainUsPerPull: sum("mainUs") / PER,
      workersUsPerPull: sum("namedWorkersUs") / PER,
      otherUsPerPull: (sum("totalUs") - sum("mainUs") - sum("namedWorkersUs")) / PER,
      pullsPerCpuSecond: (PER * 1e6) / sum("totalUs"),
      capacityPullsPerSecond: (PER * 1000) / sum("wallMs"),
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
      batches,
      docStatsDelta:
        docsAfter && docsBefore
          ? Object.fromEntries(
              Object.keys(docsAfter).map((k) => [k, docsAfter[k]! - (docsBefore[k] ?? 0)]),
            )
          : undefined,
      currentDb: docMode ? docBytes() : undefined,
      loadBefore,
      loadAfter: os.loadavg(),
      heavySlotsBefore: slotsBefore,
      heavySlotsAfter: heavySlots(),
      probeBefore,
      probeAfter,
      rss: process.memoryUsage().rss,
    };
    segments.push(seg);
    console.log(
      JSON.stringify({
        ...seg,
        batches: undefined,
        buckets: undefined,
        probeBefore: probeBefore.totalUs,
        probeAfter: probeAfter.totalUs,
      }),
    );
  }
  fs.writeFileSync(
    out,
    JSON.stringify({
      diagnostic: true,
      arm: armLabel,
      build: armName,
      levers,
      docMode: docMode ?? null,
      writerOn,
      sweepOn,
      execArgv: process.execArgv,
      nodeOptions: process.env.NODE_OPTIONS ?? null,
      started,
      ended: new Date().toISOString(),
      node: process.version,
      builds,
      store,
      root,
      clients: CLIENTS,
      seed: SEED,
      probeFixture,
      segments,
      prefill,
      currentDbEnd: docMode ? docBytes() : undefined,
      docStatsEnd: docMode ? await arm.broker.docStats() : undefined,
      answerDigests,
      extra: arm.extra?.(),
    }),
  );
} finally {
  closeProbe();
  await arm.close();
}

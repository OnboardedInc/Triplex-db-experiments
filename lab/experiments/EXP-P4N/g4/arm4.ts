// [EXP-P4N] Why: round 3's per-arm process, rebuilt with (1) a thread-CPU reference probe in place of the wall-clock calibration loop
// (round 3's loop did not track per-pull CPU, BRIEF 4.1), (2) 100-pull batches kept raw so a bootstrap can resample them,
// (3) arm labels "<build>[+lever][@twin]" so the same build runs twice (in-run A/A), (4) host load and heavy-slot occupancy per segment.
// Rejected: a divisor normalisation by the probe (it is a window grade only), and a probe in a reader worker (its thread CPU is
// not readable from main; the probe runs the same SQL statement and JSON.parse on the main thread's own thread CPU).
// usage: tsx arm4.ts <arm> <out.json> [segments=5] [pullsPerSegment=1000] [warmup=300] [seed=1] [clients=1]
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { Effect, Layer, ManagedRuntime } from "effect";

const [armLabel, out, segs = "5", per = "1000", warm = "300", seedArg = "1", clientsArg = "1"] =
  process.argv.slice(2);
if (!armLabel || !out)
  throw Error(
    "usage: arm4.ts <arm> <out.json> [segments] [pullsPerSegment] [warmup] [seed] [clients]",
  );
// "final+semi64@2": build final, lever semi64 (a node flag set by abab4.mjs, recorded here), twin tag 2.
const armName = armLabel.split("@")[0]!.split("+")[0]!;
const E = "/Users/sam/Claude/Projects/triplex-db-2/evidence";
const retainedR3 = ["final", "s1", "s2", "s3", "s4", "s4b", "s5", "s5b"];
const root = path.join(E, retainedR3.includes(armName) ? "QH1-R3/arms" : "P4N-R1/arms", armName);
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

const arm: Arm = await brokerArm(true, false);

// ---- reference probe --------------------------------------------------------------------------------------------------
// Fixed work shaped like a pull, timed in main-thread CPU (process.threadCpuUsage): one fixed owner statement (round 3's row
// statement, a fixed copy independent of the build under test) on a private read-only connection, then JSON.parse of its text.
// It is a window grade (BRIEF 4.3 item 2), never a divisor. The SQL runs on main, not in a reader worker, because a worker's
// thread CPU cannot be read from here without a request that perturbs the probe.
const probeSql = (() => {
  const sn = (x: string) =>
    "CASE WHEN typeof(" + x + ")='integer' AND " + x + " BETWEEN -9007199254740991 AND 9007199254740991 THEN " + x + " ELSE printf('%!.17g'," + x + ") END";
  const row =
    "json_array(typeof(f.id)='blob',CASE WHEN typeof(f.id)='blob' THEN hex(f.id) ELSE f.id END,e.name,a.name,f.t,CASE WHEN f.t IN (1,3) THEN " + sn("f.v") + " WHEN f.t=5 THEN ref.name WHEN f.t=7 THEN NULL ELSE f.v END," + sn("tx.at") + ",f.pos," + sn("(tx.at+f.vf)") + ",CASE WHEN f.vto IS NULL THEN NULL ELSE " + sn("f.vto") + " END,c.s,y.s," + sn("coalesce(f.sv,1)") + ",te.name,json(CASE WHEN f.x IS NOT NULL THEN CAST(f.x AS TEXT) ELSE NULL END))";
  const cols = "o,e,id,a,pos,t,v,vf,vto,c,y,sv,x";
  const union = ["facts", "journal", "history"]
    .map((t) => "SELECT " + cols + " FROM " + t + " WHERE o=@o" + (t === "history" ? " AND rpos>@b" : "") + " AND pos<=@b")
    .join(" UNION ALL ");
  return (
    "SELECT json_group_array(" + row + ") FROM (" + union + ")" +
    " f JOIN ents e ON e.eid=f.e JOIN attrs a ON a.aid=f.a JOIN txs tx ON tx.pos=f.pos JOIN ents te ON te.eid=tx.tx LEFT JOIN strs c ON c.sid=f.c LEFT JOIN strs y ON y.sid=f.y LEFT JOIN ents ref ON f.t=5 AND ref.eid=f.v"
  );
})();
const probeDb = new D(path.join(store, "broker.db"), { readonly: true, fileMustExist: true });
probeDb.pragma("mmap_size=268435456");
const probeOwner = probeDb.prepare("SELECT eid FROM ents WHERE name=?").pluck().get(roots[137]!);
const probeBasis = probeDb.prepare("SELECT position FROM marker WHERE id=1").pluck().get();
const probeStmt = probeDb.prepare(probeSql).pluck();
const probeText: string = (() => {
  probeDb.exec("BEGIN");
  const t = probeStmt.get({ o: probeOwner, b: probeBasis }) as string;
  probeDb.exec("COMMIT");
  return t;
})();
const tcpu = () => {
  const c = process.threadCpuUsage();
  return c.user + c.system;
};
const probe = () => {
  const N = 40;
  let sqlUs = 0,
    parseUs = 0,
    sink = 0;
  for (let i = -5; i < N; i++) {
    const a = tcpu();
    probeDb.exec("BEGIN");
    const t = probeStmt.get({ o: probeOwner, b: probeBasis }) as string;
    probeDb.exec("COMMIT");
    const b = tcpu();
    sink += (JSON.parse(t) as unknown[]).length;
    const c = tcpu();
    if (i >= 0) {
      sqlUs += b - a;
      parseUs += c - b;
    }
  }
  return { sqlUs: sqlUs / N, parseUs: parseUs / N, totalUs: (sqlUs + parseUs) / N, bytes: probeText.length, sink };
};
// Heavy-slot occupancy: other holders' tokens under the main checkout (this arm's own heavy.mjs token is one of them).
const heavySlots = () => {
  const dir = "/Users/sam/projects/triplex-db-2/lab/locks/heavy";
  try {
    return fs
      .readdirSync(dir)
      .filter((n) => /^\d+$/.test(n))
      .map((n) => {
        try {
          return JSON.parse(fs.readFileSync(path.join(dir, n, "owner.json"), "utf8")).label as string;
        } catch {
          return "?";
        }
      });
  } catch {
    return [] as string[];
  }
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
try {
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
  for (let s = 0; s < SEGMENTS; s++) {
    const loadBefore = os.loadavg(),
      slotsBefore = heavySlots(),
      probeBefore = probe();
    const lat: number[] = [];
    const buckets: Record<string, number[]> = {};
    const batches: any[] = [];
    let rows = 0,
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
    const seg = {
      arm: armLabel,
      segment: s,
      clients: CLIENTS,
      pulls: PER,
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
      JSON.stringify({ ...seg, batches: undefined, buckets: undefined, probeBefore: probeBefore.totalUs, probeAfter: probeAfter.totalUs }),
    );
  }
  fs.writeFileSync(
    out,
    JSON.stringify({
      diagnostic: true,
      arm: armLabel,
      build: armName,
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
      probeFixture: { owner: roots[137], basis: probeBasis, bytes: probeText.length },
      segments,
      answerDigests,
      extra: arm.extra?.(),
    }),
  );
} finally {
  probeDb.close();
  await arm.close();
}

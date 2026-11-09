// [EXP-QH1-R2] Why: one measurement process per arm, loading that arm's own retained build, so ABAB interleaving happens at
// process granularity with per-thread CPU counters in every process. Oracle/hash work stays outside the timed windows.
// Rejected: wall time, adding worker CPU to process CPU (process.cpuUsage already includes the workers), rebuilding dist in place.
//
// usage: tsx arm.ts <arm> <out.json> [segments=3] [pullsPerSegment=500] [warmup=300] [seed=1] [clients=1]
// arms:  baseline   today: HS01 build + HS01 store, public Triples BFS, row route
//        rows       round-1 build + owner-keyed store, h1 off (row route on the new layout)
//        h1         round 1: owner prefetch, one worker operation, SQL-built text, lean decode, public Triples BFS
//        L0         R46 W7 shape on the real schema: own-subtree + external SQL text (8-field tuple), one parse, lean Triples
//        L1         round 1's real worker operation + parse + bucket + BFS + lean Triples (no validation, no Effect)
//        L2         L1 + the real h1Rows decoder (domain fast path, Options, per-entity sort), still no Effect/adapter
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { Worker, MessageChannel } from "node:worker_threads";
import { Effect, Layer, ManagedRuntime, Option } from "effect";

const [armName, out, segs = "3", per = "500", warm = "300", seedArg = "1", clientsArg = "1"] = process.argv.slice(2);
if (!armName || !out) throw Error("usage: arm.ts <arm> <out.json> [segments] [pullsPerSegment] [warmup] [seed] [clients]");
const E = "/Users/sam/Claude/Projects/triplex-db-2/evidence/QH1-R2";
const buildOf = armName === "baseline" ? "baseline" : "candidate";
const root = path.join(E, "arms", buildOf);
const store = path.join(E, armName === "baseline" ? "store-baseline" : "store-candidate");
const wt = path.resolve(import.meta.dirname, "../../../..");
const SEGMENTS = Number(segs), PER = Number(per), WARM = Number(warm), SEED = Number(seedArg), CLIENTS = Number(clientsArg);
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
const bucketOf = new Map(roots.map((r) => [r, W0.plan(W0.rung(10000), Number(r.slice(4))).bucket as number]));
const VALID_AT = Date.parse("2026-11-04T12:00:00Z");

// ---- arm constructors -------------------------------------------------------------------------------------------------
type Pulled = { triples: any[]; hops: number; fullDigestable: boolean };
interface Arm {
  pull(root: string): Promise<Pulled>;
  threadCpu(): Promise<Record<string, { user: number; system: number }> | undefined>;
  close(): Promise<void>;
  extra?: () => unknown;
}

const brokerArm = async (h1: boolean): Promise<Arm> => {
  const broker = await q.HostBroker.open({
    dir: store,
    scopeKey: "qh1-r2",
    minFreeBytes: 5 * 1024 ** 3,
    frameRetention: { tailFrames: 1024 },
  });
  const client: any = {
    query: async (sql: string) => {
      if (sql === "SELECT ?s WHERE { ?s ?p ?o } LIMIT 1") return [];
      throw new TypeError("offline", { cause: Object.assign(new Error("offline"), { code: "ECONNREFUSED" }) });
    },
    update: async () => {},
    command: async () => {},
    cancel: async () => {},
    close: async () => {},
  };
  const counters: any[] = [];
  const adapter = q.makeQleverBrokerStorageAdapter(client, "qh1-r2", broker, {
    ...(h1 ? { currentRoute: "h1" as const, onPull: (e: any) => counters.push(e) } : {}),
  });
  const runtime = ManagedRuntime.make(
    rt.Runtime.define({
      name: "qh1-r2",
      storage: Layer.succeed(rt.StorageAdapter, adapter),
      queries: Layer.succeed(rt.QueryExecutor, q.makeQleverQueryExecutor(client, "qh1-r2", { sourceView: adapter.sourceView })),
    }).layer({ scope: rt.DatabaseScope.test("qh1-r2"), capabilities: rt.Capabilities.none }),
  );
  const T = await runtime.runPromise(Effect.service(core.Triples));
  const body = (root: string) => async (): Promise<Pulled> => {
    let todo = [root];
    const seen = new Set(todo);
    const triples: any[] = [];
    let hops = 0;
    while (todo.length) {
      const bodies = await runtime.runPromise(T.entities(todo.map(core.EntityId.make), { validAt: VALID_AT }));
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
    pull: (r) => (h1 ? adapter.withCurrentPull(r, body(r)) : body(r)()),
    threadCpu: async () => ((broker as any).log.threadCpu ? (broker as any).log.threadCpu() : undefined),
    close: async () => {
      await runtime.dispose();
      await broker.close();
    },
    extra: () => ({ pullCounters: counters.length ? counters.slice(-1000) : undefined, h1Calls: counters.length }),
  };
};

// Workers: the real SQL01 reader worker source from the arm's build, plus bench-only ops appended in its own scope.
const micro = ["L0", "L1", "L2", "L3"].includes(armName);
const realWorker: string = micro ? (await imp("packages/qlever/dist/broker/sqlite-worker.js")).sqliteWorker : "";
const h1Mod: any = micro ? await imp("packages/qlever/dist/broker/h1.js") : undefined;
const extraOps = String.raw`
const __handle = handle;
let __own, __ext, __eid = new Map();
const __eidOf = s => { let x = __eid.get(s); if (x === undefined) { x = q('SELECT eid FROM ents WHERE name=?').get(textKey(s))?.eid ?? null; __eid.set(s, x); } return x; };
handle = (op, a) => {
 if (op === 'wholeL0') { // R46 W7 shape: own subtree and external refs as SQLite-built text, 8-field tuples
  const m = marker(), b = a.basis; if (b < m.h || b > m.position) throw Error('BASIS');
  const row = "json_array(n.name, hex(f.id), at.name, f.pos, f.t, CASE f.t WHEN 5 THEN rn.name WHEN 1 THEN printf('%!.17g', f.v) ELSE f.v END, f.vf, f.vto)";
  const joins = " JOIN ents n ON n.eid=f.e JOIN attrs at ON at.aid=f.a LEFT JOIN ents rn ON f.t=5 AND rn.eid=f.v";
  const o = __eidOf(a.root);
  const own = q("SELECT json_group_array(" + row + ") FROM (SELECT o,e,id,a,pos,t,v,vf,vto FROM facts WHERE o=@o AND pos<=@b UNION ALL SELECT o,e,id,a,pos,t,v,vf,vto FROM history WHERE o=@o AND rpos>@b AND pos<=@b) f" + joins).pluck().get({ o, b });
  const extFind = q("SELECT DISTINCT rn.name FROM facts f JOIN ents rn ON rn.eid=f.v WHERE f.o=@o AND f.t=5 AND f.pos<=@b AND f.v NOT IN (SELECT e FROM facts WHERE o=@o)").pluck();
  const extRows = q("SELECT json_group_array(" + row + ") FROM facts f" + joins + " WHERE f.o=@o AND f.e=@e AND f.pos<=@b").pluck();
  const extRefs = q("SELECT DISTINCT rn.name FROM facts f JOIN ents rn ON rn.eid=f.v WHERE f.o=@o AND f.e=@e AND f.t=5 AND f.pos<=@b").pluck();
  const parts = [own], seen = new Set([a.root]); let frontier = extFind.all({ o, b });
  while (frontier.length) { const next = [];
   for (const name of frontier) { if (seen.has(name)) continue; seen.add(name);
    const e = __eidOf(name), oo = __eidOf(name.split('/')[0]); if (e === null || oo === null) continue;
    parts.push(extRows.get({ o: oo, e, b })); for (const r of extRefs.all({ o: oo, e, b })) if (!seen.has(r)) next.push(r); }
   frontier = next; }
  return { snapshot: publicMarker(m), basis: b, parts };
 }
 if (op === 'wholeL3') { // R46 W7 structure (own subtree + external refs, no per-entity eid probes, no second refs statement) carrying every field the kernel needs; integers, not printf text
  const m = marker(), b = a.basis; if (b < m.h || b > m.position) throw Error('BASIS');
  const val = "CASE f.t WHEN 5 THEN rn.name WHEN 1 THEN printf('%!.17g', f.v) WHEN 3 THEN printf('%!.17g', f.v) ELSE f.v END";
  const row = "json_array(n.name, CASE WHEN typeof(f.id)='blob' THEN hex(f.id) ELSE f.id END, at.name, f.t, " + val + ", tx.at, f.pos, tx.at+f.vf, f.vto, c.s, y.s, te.name, typeof(f.id)='blob')";
  const joins = " JOIN ents n ON n.eid=f.e JOIN attrs at ON at.aid=f.a JOIN txs tx ON tx.pos=f.pos JOIN ents te ON te.eid=tx.tx LEFT JOIN strs c ON c.sid=f.c LEFT JOIN strs y ON y.sid=f.y LEFT JOIN ents rn ON f.t=5 AND rn.eid=f.v";
  const cols = "o,e,id,a,pos,t,v,vf,vto,c,y";
  const o = __eidOf(a.root);
  const own = q("SELECT json_group_array(" + row + ") FROM (SELECT " + cols + " FROM facts WHERE o=@o AND pos<=@b UNION ALL SELECT " + cols + " FROM history WHERE o=@o AND rpos>@b AND pos<=@b) f" + joins).pluck().get({ o, b });
  const extFind = q("SELECT DISTINCT rn.name FROM facts f JOIN ents rn ON rn.eid=f.v WHERE f.o=@o AND f.t=5 AND f.pos<=@b AND f.v NOT IN (SELECT e FROM facts WHERE o=@o)").pluck();
  const extRows = q("SELECT json_group_array(" + row + ") FROM facts f" + joins + " WHERE f.o=@o AND f.e=@e AND f.pos<=@b").pluck();
  const extRefs = q("SELECT DISTINCT rn.name FROM facts f JOIN ents rn ON rn.eid=f.v WHERE f.o=@o AND f.e=@e AND f.t=5 AND f.pos<=@b").pluck();
  const parts = [own], seen = new Set([a.root]); let frontier = extFind.all({ o, b });
  while (frontier.length) { const next = [];
   for (const name of frontier) { if (seen.has(name)) continue; seen.add(name);
    const e = __eidOf(name), oo = __eidOf(name.split('/')[0]); if (e === null || oo === null) continue;
    parts.push(extRows.get({ o: oo, e, b })); for (const r of extRefs.all({ o: oo, e, b })) if (!seen.has(r)) next.push(r); }
   frontier = next; }
  return { snapshot: publicMarker(m), basis: b, parts };
 }
 return __handle(op, a);
};
`;
const patchedWorker = micro ? realWorker.replace("const handle = (op,a) => {", "let handle = (op,a) => {") + extraOps : "";
if (micro && patchedWorker === realWorker + extraOps) throw Error("worker patch point missing");
const driver = createRequire(path.join(root, "packages/qlever/package.json")).resolve("better-sqlite3");
const spawnReader = () => {
  const w = new Worker(patchedWorker, {
    eval: true,
    workerData: { file: path.join(store, "broker.db"), role: "reader", seed: 0, driver, gateBuffer: new SharedArrayBuffer(8) },
  });
  w.unref();
  return w;
};
// Same protocol as log.ts Connection.request.
const request = (worker: Worker, op: string, args?: unknown): Promise<any> => {
  const { port1, port2 } = new MessageChannel();
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timer);
      port1.close();
      worker.off("error", onError);
      worker.off("exit", onExit);
    };
    const onError = (error: unknown) => (cleanup(), reject(new Error(String(error))));
    const onExit = (code: number) => onError(new Error(`worker exited ${code}`));
    const timer = setTimeout(() => (cleanup(), reject(new Error("timeout"))), 30_000);
    worker.once("error", onError);
    worker.once("exit", onExit);
    port1.once("message", (data: any) => (cleanup(), data.error ? reject(new Error(data.error)) : resolve(data.result)));
    worker.postMessage({ op, args, response: port2 }, [port2]);
  });
};

const NONE = Option.none();
const TYPES = ["string", "number", "boolean", "datetime", "json", "ref", "integer"];
const microArm = async (kind: "L0" | "L1" | "L2" | "L3"): Promise<Arm> => {
  const pool = Array.from({ length: 4 }, spawnReader);
  for (const w of pool) await request(w, "init");
  let next = 0;
  const ask = (op: string, args: unknown) => request(pool[next++ % pool.length]!, op, args);
  // The marker's position is the newest basis; pull at head as the broker's head() does.
  const marker = await request(pool[0]!, "marker");
  const head: number = marker.position;
  const resolved = { validAt: VALID_AT, recordedPosition: head } as any;
  const idOf = (t: readonly any[]) => (t[0] ? h1Mod.h1TupleId(t) : t[1]);
  return {
    pull: async (rootName) => {
      if (kind === "L0") {
        const r = await ask("wholeL0", { basis: head, root: rootName });
        const byE = new Map<string, any[]>();
        for (const part of r.parts)
          for (const x of JSON.parse(part) as any[]) {
            const l = byE.get(x[0]);
            if (l) l.push(x);
            else byE.set(x[0], [x]);
          }
        const seen = new Set([rootName]);
        let frontier = [rootName];
        const out: any[] = [];
        let hops = 0;
        while (frontier.length) {
          hops++;
          const nextF: string[] = [];
          for (const e of frontier)
            for (const x of byE.get(e) ?? []) {
              if (Number(x[6]) > VALID_AT || (x[7] !== null && Number(x[7]) <= VALID_AT)) continue;
              // R46's lean Triple: Options for the unavailable fields are the shared None; no domain re-validation.
              out.push({
                id: x[1], entityId: x[0], attribute: x[2],
                value: { type: TYPES[x[4]], value: x[4] === 1 || x[4] === 3 ? Number(x[5]) : x[4] === 2 ? Number(x[5]) !== 0 : x[5] },
                recordedAt: 0, validFrom: Number(x[6]), validTo: x[7] == null ? NONE : Option.some(Number(x[7])),
                createdBy: NONE, retractedAt: NONE, entityType: NONE, schemaVersion: NONE, txId: NONE, retractTxId: NONE,
              });
              if (x[4] === 5 && !seen.has(x[5])) (seen.add(x[5]), nextF.push(x[5]));
            }
          frontier = nextF;
        }
        return { triples: out, hops, fullDigestable: false };
      }
      if (kind === "L3") {
        const r = await ask("wholeL3", { basis: head, root: rootName });
        const byE = new Map<string, any[]>();
        for (const part of r.parts)
          for (const x of JSON.parse(part) as any[]) {
            const l = byE.get(x[0]);
            if (l) l.push(x);
            else byE.set(x[0], [x]);
          }
        const seen = new Set([rootName]);
        let frontier = [rootName];
        const out: any[] = [];
        let hops = 0;
        while (frontier.length) {
          hops++;
          const nextF: string[] = [];
          for (const e of frontier)
            for (const x of byE.get(e) ?? []) {
              if (x[7] > VALID_AT || (x[8] !== null && x[8] <= VALID_AT)) continue;
              const t = x[3];
              out.push({
                id: h1Mod.h1TupleId([x[12], x[1]]), entityId: x[0], attribute: x[2],
                value: { type: TYPES[t], value: t === 1 || t === 3 ? Number(x[4]) : t === 2 ? x[4] === 1 : t === 4 ? JSON.parse(x[4]) : x[4] },
                recordedAt: x[5], validFrom: x[7], validTo: x[8] === null ? NONE : Option.some(x[8]),
                createdBy: x[9] ? Option.some(x[9]) : NONE, retractedAt: NONE, entityType: x[10] ? Option.some(x[10]) : NONE,
                schemaVersion: Option.some(1), txId: x[11] ? Option.some(x[11]) : NONE, retractTxId: NONE,
              });
              if (t === 5 && !seen.has(x[4])) (seen.add(x[4]), nextF.push(x[4]));
            }
          frontier = nextF;
        }
        return { triples: out, hops, fullDigestable: true };
      }
      const r = await ask("wholePull", { basis: head, roots: [rootName] });
      const byE = new Map<string, any[]>();
      for (const t of JSON.parse(r.text) as any[]) {
        if (t[14]) throw Error("fallback tuple in W0 data: L arms do not decode it");
        const l = byE.get(t[2]);
        if (l) l.push(t);
        else byE.set(t[2], [t]);
      }
      const seen = new Set([rootName]);
      let frontier = [rootName];
      const selected: any[] = [];
      let hops = 0;
      while (frontier.length) {
        hops++;
        const nextF: string[] = [];
        for (const e of frontier)
          for (const t of byE.get(e) ?? []) {
            if (Number(t[8]) > VALID_AT || (t[9] !== null && Number(t[9]) <= VALID_AT)) continue;
            selected.push(t);
            if (t[4] === 5 && !seen.has(t[5])) (seen.add(t[5]), nextF.push(t[5]));
          }
        frontier = nextF;
      }
      if (kind === "L2") {
        const decoded: Map<string, any[]> = h1Mod.h1Rows(selected, resolved);
        return { triples: [...decoded.values()].flat(), hops, fullDigestable: true };
      }
      const out = selected.map((t) => {
        const payload =
          t[4] === 9 ? Number(t[6]) : t[4] === 1 || t[4] === 3 ? Number(t[5]) : t[4] === 2 ? (t[5] === 1 ? true : t[5] === 0 ? false : undefined) : t[4] === 4 ? JSON.parse(t[5]) : t[5];
        return {
          id: idOf(t), entityId: t[2], attribute: t[3], value: { type: TYPES[t[4]], value: payload },
          recordedAt: Number(t[6]), validFrom: Number(t[8]), validTo: t[9] === null ? NONE : Option.some(Number(t[9])),
          createdBy: t[10] ? Option.some(t[10]) : NONE, retractedAt: NONE, entityType: t[11] ? Option.some(t[11]) : NONE,
          schemaVersion: Number(t[12]) ? Option.some(Number(t[12])) : NONE, txId: t[13] ? Option.some(t[13]) : NONE, retractTxId: NONE,
        };
      });
      return { triples: out, hops, fullDigestable: true };
    },
    threadCpu: async () => Object.fromEntries(await Promise.all(pool.map(async (w, i) => [`reader-${i}`, await request(w, "threadCpu")]))),
    close: async () => {
      for (const w of pool) await w.terminate();
    },
  };
};

const arm: Arm =
  armName === "baseline" ? await brokerArm(false)
  : armName === "rows" ? await brokerArm(false)
  : armName === "h1" ? await brokerArm(true)
  : armName === "L0" || armName === "L1" || armName === "L2" || armName === "L3" ? await microArm(armName)
  : (() => { throw Error("unknown arm " + armName); })();

// ---- measurement -----------------------------------------------------------------------------------------------------
const quantile = (a: number[], p: number) => [...a].sort((x, y) => x - y)[Math.floor((a.length - 1) * p)]!;
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
const digests = (triples: any[]) => {
  const core = triples.map((t) => `${t.entityId}\u0000${t.attribute}\u0000${t.value.type}\u0000${String(t.value.value)}`).sort().join("\n");
  return { core: sha(core), n: triples.length };
};
const fullDigest = (triples: any[]) => sha(JSON.stringify([...triples].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))));
const answerDigests: any[] = [];
const segments: any[] = [];
try {
  // Fixed warmup roots and digests, identical for every arm and round (seed 4646): also the cross-arm answer comparison.
  const wr = lcg(4646);
  for (let i = 0; i < WARM; i++) {
    const r = roots[wr() % roots.length]!;
    const a = await arm.pull(r);
    if (i < 200) answerDigests.push({ root: r, hops: a.hops, ...digests(a.triples), full: a.fullDigestable ? fullDigest(a.triples) : null });
  }
  const rand = lcg(1000 + SEED);
  const windowStartUs = Number(process.hrtime.bigint() / 1000n);
  for (let s = 0; s < SEGMENTS; s++) {
    const load = os.loadavg(), calibration = calibrate();
    const lat: number[] = [];
    const buckets: Record<string, number[]> = {};
    const threadCpuUs: Record<string, number> = {};
    let totalUs = 0, userUs = 0, mainUs = 0, wallMs = 0, rows = 0, hopsTotal = 0;
    for (let off = 0; off < PER; off += 100) {
      const size = Math.min(100, PER - off);
      let issued = 0;
      const t0 = await arm.threadCpu();
      const c0 = process.cpuUsage(), m0 = process.threadCpuUsage(), w0 = performance.now();
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
      const c = process.cpuUsage(c0), m = process.threadCpuUsage(m0);
      wallMs += performance.now() - w0;
      totalUs += c.user + c.system;
      userUs += c.user;
      mainUs += m.user + m.system;
      if (t0) {
        const t1 = (await arm.threadCpu())!;
        for (const k of Object.keys(t0)) threadCpuUs[k] = (threadCpuUs[k] ?? 0) + t1[k]!.user + t1[k]!.system - t0[k]!.user - t0[k]!.system;
      }
    }
    const named = Object.values(threadCpuUs).reduce((a, b) => a + b, 0);
    const seg = {
      arm: armName, segment: s, clients: CLIENTS, pulls: PER,
      cpuUsPerPull: totalUs / PER, userUsPerPull: userUs / PER, systemUsPerPull: (totalUs - userUs) / PER,
      mainUsPerPull: mainUs / PER,
      workersUsPerPull: t0Present(threadCpuUs) ? named / PER : null,
      otherUsPerPull: t0Present(threadCpuUs) ? (totalUs - mainUs - named) / PER : null,
      workerDetailUsPerPull: Object.fromEntries(Object.entries(threadCpuUs).map(([k, v]) => [k, v / PER])),
      pullsPerCpuSecond: (PER * 1e6) / totalUs, capacityPullsPerSecond: (PER * 1000) / wallMs,
      p50: quantile(lat, 0.5), p99: quantile(lat, 0.99),
      rowsPerPull: rows / PER, hopsPerPull: hopsTotal / PER,
      buckets: Object.fromEntries(Object.entries(buckets).map(([b, a]) => [b, { n: a.length, p50: quantile(a, 0.5), p99: quantile(a, 0.99) }])),
      load, calibration, rss: process.memoryUsage().rss,
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
      const o = spawnSync("ps", ["-M", "-p", String(process.pid), "-o", "utime,stime"], { encoding: "utf8" }).stdout.trim().split("\n").slice(1);
      const sec = (t: string) => { const [m, rest] = t.split(":"); return Number(m) * 60 + Number(rest); };
      return o.map((l) => { const c = l.trim().split(/\s+/); const n = c.length; return sec(c[n - 2]!) + sec(c[n - 1]!); });
    };
    const rr = lcg(777);
    const a0 = sample(), c0 = process.cpuUsage(), m0 = process.threadCpuUsage();
    for (let i = 0; i < PER * SEGMENTS; i++) await arm.pull(roots[rr() % roots.length]!);
    const c1 = process.cpuUsage(c0), m1 = process.threadCpuUsage(m0), a1 = sample();
    osThreads = { pulls: PER * SEGMENTS, processCpuUsPerPull: (c1.user + c1.system) / (PER * SEGMENTS), mainUsPerPull: (m1.user + m1.system) / (PER * SEGMENTS),
      threadSecondsDelta: a1.map((v, i) => +(v - (a0[i] ?? 0)).toFixed(2)), threadCount: a1.length, newThreads: a1.length - a0.length };
    console.log(JSON.stringify({ osThreads }));
  }
  fs.writeFileSync(
    out,
    JSON.stringify({ diagnostic: true, arm: armName, started, ended: new Date().toISOString(), node: process.version, builds, store, root, clients: CLIENTS, seed: SEED, segments, windowUs: [windowStartUs, windowEndUs], answerDigests, osThreads, extra: arm.extra?.() }),
  );
} finally {
  await arm.close();
}
function t0Present(o: Record<string, number>) {
  return Object.keys(o).length > 0;
}

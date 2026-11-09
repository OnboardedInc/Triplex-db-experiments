// [EXP-QH1-R2] Why: split round 1's per-pull CPU into R46's stages with per-thread CPU counters (threadCpuUsage), on the real
// reader-worker source and the real built adapter/decoder, over the same W0 10k store. Worker stages run inside the real worker's
// own scope (patched copy of wholePull with thread-CPU probes); main stages replay captured answers through the real adapter.
// Rejected: wall-clock timers around stages, and sampling-only attribution (kept as the cross-check in profile.mjs).
// usage: tsx stages.ts <out.json> [roots=300] [reps=3]
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { Worker, MessageChannel } from "node:worker_threads";
import { Effect, Layer, ManagedRuntime, Option } from "effect";

const [out, rootsArg = "300", repsArg = "3"] = process.argv.slice(2);
if (!out) throw Error("usage: stages.ts out.json [roots] [reps]");
const E = "/Users/sam/Claude/Projects/triplex-db-2/evidence/QH1-R2";
const root = path.join(E, "arms/candidate");
const store = path.join(E, "store-candidate");
const NR = Number(rootsArg), REPS = Number(repsArg);
const imp = (p: string) => import(path.join(root, p));
const core = await imp("packages/core/dist/index.js");
const rt = await imp("packages/core/dist/runtime/index.js");
const q = await imp("packages/qlever/dist/index.js");
const h1Mod: any = await imp("packages/qlever/dist/broker/h1.js");
const realWorker: string = (await imp("packages/qlever/dist/broker/sqlite-worker.js")).sqliteWorker;
const D = createRequire(path.join(root, "packages/qlever/package.json"))("better-sqlite3");
const driver = createRequire(path.join(root, "packages/qlever/package.json")).resolve("better-sqlite3");
const VALID_AT = Date.parse("2026-11-04T12:00:00Z");

const db = new D(path.join(store, "broker.db"), { readonly: true });
const allRoots: string[] = db.prepare("SELECT name FROM ents WHERE name LIKE 'pl:%' AND instr(name,'/')=0 ORDER BY name").pluck().all();
db.close();
const lcg = (s0: number) => { let s = s0 >>> 0; return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0); };
const rnd = lcg(31337);
const roots = Array.from({ length: NR }, () => allRoots[rnd() % allRoots.length]!);
const med = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor((a.length - 1) / 2)]!;
const tcpu = (f: () => void | Promise<void>) => async () => {
  const m0 = process.threadCpuUsage();
  await f();
  const m = process.threadCpuUsage(m0);
  return m.user + m.system;
};
const repeat = async (f: () => void | Promise<void>, per: number) => med(await Promise.all([]).then(async () => {
  const r: number[] = [];
  for (let i = 0; i < REPS; i++) r.push((await tcpu(f)()) / per);
  return r;
}));

// ---- worker section ------------------------------------------------------------------------------------------------------
// stageWhole = the real wholePull source with thread-CPU probes inserted by exact string replacement (each must apply once).
const wpStart = realWorker.indexOf("const wholePull = a => {");
const wpEnd = realWorker.indexOf("const handle = (op,a) => {");
if (wpStart < 0 || wpEnd < wpStart) throw Error("wholePull not found");
let stage = realWorker.slice(wpStart, wpEnd);
const sub = (from: string, to: string) => {
  if (stage.split(from).length !== 2) throw Error("probe point not unique: " + from.slice(0, 60));
  stage = stage.replace(from, to);
};
sub("const wholePull = a => {", "const stageWhole = a => { const S={eid:0,json:0,refs:0}; const tc=()=>{const c=process.threadCpuUsage();return c.user+c.system;}; const T0=tc();");
sub("const eid=s=>q('SELECT eid FROM ents WHERE name=?').get(textKey(s))?.eid;", "const eid=s=>{const t=tc();const r=q('SELECT eid FROM ents WHERE name=?').get(textKey(s))?.eid;S.eid+=tc()-t;return r;};");
sub("const part=q(sql).get(...args);statements++;", "const t1=tc();const part=q(sql).get(...args);S.json+=tc()-t1;statements++;");
sub("const rr=q('SELECT f.t,f.v,f.x FROM '+table+' f WHERE '+where+\" AND (f.t=5 OR f.x IS NOT NULL)\").all(...args);statements++;", "const t2=tc();const rr=q('SELECT f.t,f.v,f.x FROM '+table+' f WHERE '+where+\" AND (f.t=5 OR f.x IS NOT NULL)\").all(...args);S.refs+=tc()-t2;statements++;");
sub("counters:{hops,rows:examined,bytes,statements}};", "counters:{hops,rows:examined,bytes,statements},stages:{...S,total:tc()-T0}};");
const extraOps = String.raw`
const __handle = handle;
const __cache = new Map();
${stage}
const tc = () => { const c = process.threadCpuUsage(); return c.user + c.system; };
const JOINS = ' FROM facts f JOIN ents e ON e.eid=f.e JOIN attrs a ON a.aid=f.a JOIN txs tx ON tx.pos=f.pos JOIN ents te ON te.eid=tx.tx LEFT JOIN strs c ON c.sid=f.c LEFT JOIN strs y ON y.sid=f.y LEFT JOIN ents ref ON f.t=5 AND ref.eid=f.v';
const WHERE = ' WHERE f.o IN (SELECT value FROM json_each(?)) AND f.pos<=?';
const SQL = {
 // scan: facts range by owner only
 scan: 'SELECT count(*) n FROM facts f' + WHERE,
 // dictionary joins consumed, no JSON building
 joins: 'SELECT count(*) n, sum(length(e.name)+length(a.name)+length(te.name)+coalesce(length(c.s),0)+coalesce(length(y.s),0)+coalesce(length(ref.name),0)+tx.at) s' + JOINS + WHERE,
 // R1's tuple with timestamps as exact integers instead of printf text
 jsonInt: "SELECT json_group_array(json_array(typeof(f.id)='blob',CASE WHEN typeof(f.id)='blob' THEN hex(f.id) ELSE f.id END,e.name,a.name,f.t,CASE WHEN f.t IN (1,3) THEN printf('%!.17g',f.v) WHEN f.t=5 THEN ref.name ELSE f.v END,tx.at,f.pos,tx.at+f.vf,f.vto,c.s,y.s,coalesce(f.sv,1),te.name,NULL)) text,count(*) n" + JOINS + WHERE,
 // R1's exact tuple (copied expression, facts table)
 json: "SELECT json_group_array(json_array(typeof(f.id)='blob',CASE WHEN typeof(f.id)='blob' THEN hex(f.id) ELSE f.id END,CASE WHEN typeof(e.name)='blob' THEN NULL ELSE e.name END,CASE WHEN typeof(a.name)='blob' THEN NULL ELSE a.name END,f.t,CASE WHEN f.t IN (1,3) THEN printf('%!.17g',f.v) WHEN f.t=5 THEN CASE WHEN typeof(ref.name)='blob' THEN NULL ELSE ref.name END WHEN f.t=7 THEN NULL ELSE f.v END,printf('%!.17g',tx.at),f.pos,printf('%!.17g',tx.at+f.vf),CASE WHEN f.vto IS NULL THEN NULL ELSE printf('%!.17g',f.vto) END,CASE WHEN typeof(c.s)='blob' THEN NULL ELSE c.s END,CASE WHEN typeof(y.s)='blob' THEN NULL ELSE y.s END,printf('%!.17g',coalesce(f.sv,1)),CASE WHEN typeof(te.name)='blob' THEN NULL ELSE te.name END,json(CASE WHEN f.x IS NOT NULL THEN CAST(f.x AS TEXT) WHEN f.t=7 OR (f.t IN (1,3) AND typeof(f.v) NOT IN ('real','integer')) THEN qh_fallback(f.id) ELSE NULL END))) text,count(*) n" + JOINS + WHERE,
};
handle = (op, a) => {
 if (op === 'ping') return 1;
 if (op === 'stageWhole') return stageWhole(a);
 if (op === 'cachedText') { let r = __cache.get(a.roots[0]); if (!r) __cache.set(a.roots[0], r = wholePull(a)); return r; }
 if (op === 'variants') { // per-owner CPU of the facts statement variants, thread CPU inside this thread
  const acc = {}; const m = marker(); const b = a.basis;
  for (const name of Object.keys(SQL)) acc[name] = 0;
  for (let rep = 0; rep < a.reps; rep++) for (const root of a.roots) {
   const o = q('SELECT eid FROM ents WHERE name=?').get(textKey(root)).eid; const args = [JSON.stringify([o]), b];
   for (const name of Object.keys(SQL)) { const s = q(SQL[name]); const t = tc(); s.get(...args); acc[name] += tc() - t; }
   // eid lookups exactly as wholePull issues them: owner and entity for every visited entity, one timer around the batch
   const ents = a.entities[root]; const s2 = q('SELECT eid FROM ents WHERE name=?'); const t3 = tc();
   for (const nme of ents) { s2.get(textKey(nme.split('/')[0])); s2.get(textKey(nme)); }
   acc.eidLookups = (acc.eidLookups ?? 0) + tc() - t3;
  }
  const n = a.reps * a.roots.length; for (const k of Object.keys(acc)) acc[k] /= n; return acc;
 }
 return __handle(op, a);
};
`;
const patched = realWorker.replace("const handle = (op,a) => {", "let handle = (op,a) => {") + extraOps;
const worker = new Worker(patched, { eval: true, workerData: { file: path.join(store, "broker.db"), role: "reader", seed: 0, driver, gateBuffer: new SharedArrayBuffer(8) } });
worker.unref();
const request = (op: string, args?: unknown): Promise<any> => {
  const { port1, port2 } = new MessageChannel();
  return new Promise((resolve, reject) => {
    const cleanup = () => { clearTimeout(timer); port1.close(); worker.off("error", onError); worker.off("exit", onExit); };
    const onError = (e: unknown) => (cleanup(), reject(new Error(String(e))));
    const onExit = (c: number) => onError(new Error("worker exited " + c));
    const timer = setTimeout(() => (cleanup(), reject(new Error("timeout"))), 120_000);
    worker.once("error", onError);
    worker.once("exit", onExit);
    port1.once("message", (d: any) => (cleanup(), d.error ? reject(new Error(d.error)) : resolve(d.result)));
    worker.postMessage({ op, args, response: port2 }, [port2]);
  });
};
await request("init");
const marker = await request("marker");
const head: number = marker.position;
const workerCpu = async () => { const c = await request("threadCpu"); return c.user + c.system; };
const result: any = { node: process.version, roots: NR, reps: REPS, head };

// warm statement caches and page cache, capture answers for the main section
const captured = new Map<string, any>();
for (const r of roots) captured.set(r, await request("wholePull", { basis: head, roots: [r] }));
const textBytes = [...captured.values()].map((a) => Buffer.byteLength(a.text));
result.answer = { textBytesMean: textBytes.reduce((a, b) => a + b, 0) / NR, tuplesMean: [...captured.values()].reduce((s, a) => s + a.counters.rows, 0) / NR, statementsMean: [...captured.values()].reduce((s, a) => s + a.counters.statements, 0) / NR, entitiesMean: [...captured.values()].reduce((s, a) => s + a.entities.length, 0) / NR, mmapSize: undefined };

// per-request totals: worker thread CPU and main thread CPU for N requests of each kind
const loop = async (op: string, mk: (r: string) => unknown) => {
  const w: number[] = [], m: number[] = [], inOp: number[] = [];
  let last: any;
  for (let i = 0; i < REPS; i++) {
    const w0 = await workerCpu(), m0 = process.threadCpuUsage();
    let stageSum = { eid: 0, json: 0, refs: 0, total: 0 };
    for (const r of roots) {
      last = await request(op, mk(r));
      if (last?.stages) for (const k of Object.keys(stageSum)) (stageSum as any)[k] += last.stages[k];
    }
    const m1 = process.threadCpuUsage(m0);
    const w1 = await workerCpu();
    w.push((w1 - w0) / NR); m.push((m1.user + m1.system) / NR); inOp.push(stageSum.total / NR);
    if (last?.stages) result["stages_" + op] = result["stages_" + op] ? [...result["stages_" + op], Object.fromEntries(Object.entries(stageSum).map(([k, v]) => [k, v / NR]))] : [Object.fromEntries(Object.entries(stageSum).map(([k, v]) => [k, v / NR]))];
  }
  return { workerUsPerRequest: med(w), mainUsPerRequest: med(m), opInternalUs: med(inOp) };
};
result.ping = await loop("ping", () => undefined);
result.wholePull = await loop("wholePull", (r) => ({ basis: head, roots: [r] }));
result.stageWhole = await loop("stageWhole", (r) => ({ basis: head, roots: [r] }));
for (const r of roots) await request("cachedText", { basis: head, roots: [r] });
result.cachedText = await loop("cachedText", (r) => ({ basis: head, roots: [r] }));
const vr = roots.slice(0, Math.min(100, NR));
result.variants = await request("variants", { basis: head, roots: vr, reps: REPS, entities: Object.fromEntries(vr.map((r) => [r, captured.get(r).entities])) });
result.variantEntitiesPerPull = vr.reduce((n, r) => n + captured.get(r).entities.length, 0) / vr.length;
const stg = result.stages_stageWhole as any[];
result.stageWholeUs = Object.fromEntries(["eid", "json", "refs", "total"].map((k) => [k, med(stg.map((s) => s[k]))]));
await worker.terminate();

// ---- main-thread section: replay captured answers through the real adapter and decoder -----------------------------------
const broker = await q.HostBroker.open({ dir: store, scopeKey: "qh1-r2-stages", minFreeBytes: 5 * 1024 ** 3, frameRetention: { tailFrames: 1024 } });
let wholePullCalls = 0;
const stub = new Proxy(broker as any, {
  get: (t, k) => {
    if (k === "wholePullAt") return async (_b: number, rs: readonly string[]) => (wholePullCalls++, captured.get(rs[0]!) ?? (() => { throw Error("uncaptured root " + rs[0]); })());
    const v = t[k];
    return typeof v === "function" ? v.bind(t) : v;
  },
});
const client: any = { query: async () => [], update: async () => {}, command: async () => {}, cancel: async () => {}, close: async () => {} };
const adapter = q.makeQleverBrokerStorageAdapter(client, "qh1-r2-stages", stub, { currentRoute: "h1" as const });
const runtime = ManagedRuntime.make(rt.Runtime.define({ name: "qh1-r2-stages", storage: Layer.succeed(rt.StorageAdapter, adapter), queries: Layer.succeed(rt.QueryExecutor, q.makeQleverQueryExecutor(client, "qh1-r2-stages", { sourceView: adapter.sourceView })) }).layer({ scope: rt.DatabaseScope.test("qh1-r2-stages"), capabilities: rt.Capabilities.none }));
const T = await runtime.runPromise(Effect.service(core.Triples));
const publicPull = (r: string) => adapter.withCurrentPull(r, async () => {
  let todo = [r]; const seen = new Set(todo); let n = 0, hops = 0;
  while (todo.length) {
    const bodies = await runtime.runPromise(T.entities(todo.map(core.EntityId.make), { validAt: VALID_AT }));
    hops++; const next: string[] = [];
    for (const b of bodies) for (const t of b) { n++; if (t.value.type === "ref" && !seen.has(t.value.value)) { seen.add(t.value.value); next.push(t.value.value); } }
    todo = next;
  }
  return { n, hops };
});
// warm the JIT on the replay path
for (const r of roots) await publicPull(r);
const replay = async () => { for (const r of roots) await publicPull(r); };
result.mainStubReplayUs = await repeat(replay, NR);
result.mainStubReplayWholePullCalls = wholePullCalls;

// precompute BFS structures for isolated stages
type Hop = any[];
const parsed = new Map<string, { tuples: any[]; byE: Map<string, any[]>; hops: Hop[] }>();
for (const r of roots) {
  const tuples = JSON.parse(captured.get(r).text) as any[];
  const byE = new Map<string, any[]>();
  for (const t of tuples) { const l = byE.get(t[2]); if (l) l.push(t); else byE.set(t[2], [t]); }
  const seen = new Set([r]); let frontier = [r]; const hops: Hop[] = [];
  while (frontier.length) {
    const sel: any[] = []; const next: string[] = [];
    for (const e of frontier) for (const t of byE.get(e) ?? []) { if (Number(t[8]) > VALID_AT || (t[9] !== null && Number(t[9]) <= VALID_AT)) continue; sel.push(t); if (t[4] === 5 && !seen.has(t[5])) { seen.add(t[5]); next.push(t[5]); } }
    hops.push(sel); frontier = next;
  }
  parsed.set(r, { tuples, byE, hops });
}
const totalTuples = [...parsed.values()].reduce((s, p) => s + p.hops.reduce((a, h) => a + h.length, 0), 0) / NR;
result.selectedTuplesPerPull = totalTuples;
result.hopsPerPull = [...parsed.values()].reduce((s, p) => s + p.hops.length, 0) / NR;
result.totalTuplesInTextPerPull = [...parsed.values()].reduce((s, p) => s + p.tuples.length, 0) / NR;
const texts = roots.map((r) => captured.get(r).text as string);
result.parseOnlyUs = await repeat(() => { for (const t of texts) JSON.parse(t); }, NR);
result.parseAndBucketUs = await repeat(() => { for (const t of texts) { const rows = new Map<string, any[]>(); for (const tuple of JSON.parse(t) as any[]) { const e = tuple[14]?.row.entity_id ?? tuple[2]; const b = rows.get(e) ?? []; b.push(tuple); rows.set(e, b); } } }, NR);
const basis = { validAt: VALID_AT, recordedPosition: head } as any;
result.h1RowsRealUs = await repeat(() => { for (const r of roots) for (const h of parsed.get(r)!.hops) h1Mod.h1Rows(h, basis); }, NR);
// local copy of h1Rows (non-fallback branch) with switches, to split decode cost
const { decodedPrimitiveValue, storedValueDomain, ValueDomains } = rt;
const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const idFromHex = (hex: string) => { let r = "", acc = 0, bits = 2; for (let i = 0; i < hex.length; i += 2) { acc = (acc << 8) | Number.parseInt(hex.slice(i, i + 2), 16); bits += 8; while (bits >= 5) { bits -= 5; r += alphabet[(acc >>> bits) & 31]; } } return r; };
const NONEV = Option.none<any>();
type Flags = { validate: boolean; hoistDomain: boolean; options: boolean; sort: boolean; idConv: boolean; numberParse: boolean; bucket: boolean };
const rowsCopy = (tuples: readonly any[], f: Flags) => {
  const result = new Map<string, any[]>();
  const hoisted = ValueDomains.qlever;
  for (const t of tuples) {
    const type = ["string", "number", "boolean", "datetime", "json", "ref", "integer"][t[4]] ?? (t[4] === 8 ? "number" : "datetime");
    const payload = t[4] === 1 || t[4] === 3 ? Number(t[5]) : t[4] === 2 ? (t[5] === 1 ? true : t[5] === 0 ? false : undefined) : t[4] === 4 ? JSON.parse(t[5]) : t[5];
    const value = f.validate ? decodedPrimitiveValue(type, payload, f.hoistDomain ? hoisted : storedValueDomain(ValueDomains.qlever, t[3])) : { type, value: payload };
    const num = (x: any) => (f.numberParse ? Number(x) : 0);
    const triple = {
      id: f.idConv ? (t[0] ? idFromHex(t[1]) : t[1]) : t[1], entityId: t[2], attribute: t[3], value, recordedAt: num(t[6]), validFrom: num(t[8]),
      validTo: f.options ? (t[9] === null ? Option.none() : Option.some(num(t[9]))) : t[9],
      createdBy: f.options ? (t[10] ? Option.some(t[10]) : Option.none()) : t[10], retractedAt: f.options ? Option.none() : null,
      entityType: f.options ? (t[11] ? Option.some(t[11]) : Option.none()) : t[11],
      schemaVersion: f.options ? (num(t[12]) ? Option.some(num(t[12])) : Option.none()) : t[12], txId: f.options ? (t[13] ? Option.some(t[13]) : Option.none()) : t[13], retractTxId: f.options ? Option.none() : null,
    };
    if (f.bucket) { const b = result.get(triple.entityId) ?? []; b.push(triple); result.set(triple.entityId, b); }
  }
  if (f.sort) for (const b of result.values()) b.sort((a: any, z: any) => a.recordedAt - z.recordedAt || a.id.localeCompare(z.id));
  return result;
};
const FULL: Flags = { validate: true, hoistDomain: false, options: true, sort: true, idConv: true, numberParse: true, bucket: true };
// sanity: local copy equals dist h1Rows on every pull
let mismatch = 0;
for (const r of roots.slice(0, 50)) for (const h of parsed.get(r)!.hops) { const a = JSON.stringify([...h1Mod.h1Rows(h, basis)]), b = JSON.stringify([...rowsCopy(h, FULL)]); if (a !== b) mismatch++; }
result.rowsCopyMismatchesOver50Pulls = mismatch;
const variantUs: Record<string, number> = {};
const variants: Record<string, Flags> = {
  full: FULL,
  hoistDomain: { ...FULL, hoistDomain: true },
  noValidate: { ...FULL, validate: false },
  noSort: { ...FULL, sort: false },
  noOptions: { ...FULL, options: false },
  noIdConv: { ...FULL, idConv: false },
  noNumberParse: { ...FULL, numberParse: false },
  bare: { validate: false, hoistDomain: false, options: false, sort: false, idConv: false, numberParse: false, bucket: true },
};
const vs: Record<string, number[]> = Object.fromEntries(Object.keys(variants).map((k) => [k, []]));
for (let rep = 0; rep < Math.max(REPS, 7); rep++) for (const [name, f] of Object.entries(variants)) { const c = await tcpu(() => { for (const r of roots) for (const h of parsed.get(r)!.hops) rowsCopy(h, f); })(); vs[name]!.push(c / NR); }
for (const k of Object.keys(vs)) variantUs[k] = med(vs[k]!);
result.h1RowsVariantsPerRep = vs;
result.h1RowsVariantsUs = variantUs;
// per-row unit costs of the domain check (fast path as shipped), and of storedValueDomain alone
const allT = roots.flatMap((r) => parsed.get(r)!.hops.flat());
result.rowsMeasured = allT.length;
result.domainCheckUsPerRow = (await repeat(() => { for (const t of allT) decodedPrimitiveValue(["string", "number", "boolean", "datetime", "json", "ref", "integer"][t[4]]!, t[4] === 2 ? t[5] === 1 : t[5], storedValueDomain(ValueDomains.qlever, t[3])); }, allT.length));
// BFS-only bookkeeping on parsed tuples (what the adapter's selection + public loop do besides decode), approximated by the L-arm loop
result.bfsOnTuplesUs = await repeat(() => { for (const r of roots) { const p = parsed.get(r)!; const seen = new Set([r]); let frontier = [r]; while (frontier.length) { const next: string[] = []; for (const e of frontier) for (const t of p.byE.get(e) ?? []) { if (Number(t[8]) > VALID_AT || (t[9] !== null && Number(t[9]) <= VALID_AT)) continue; if (t[4] === 5 && !seen.has(t[5])) { seen.add(t[5]); next.push(t[5]); } } frontier = next; } } }, NR);
result.fullAnswerUsedFastPathCheck = "see coverage run in report";
fs.writeFileSync(out, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
await runtime.dispose();
await broker.close();

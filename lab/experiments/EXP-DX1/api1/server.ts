// [DX-API1] Server run: API-call-shaped reads at 1 billion records (API-CALL-READS.md section 7 has the command, the
// predictions written before any run, and what would show each wrong). It drives a demo bring-up of the 1 billion
// working copy (demo/server-up.sh with DEMO_READER=tuned DX_READ_BATCH=1 DX_ID_LISTS=1) and writes to it: one commit of
// definitions per deep account, then saves of one subject each (17 rows, one commit) beside the reads.
//   node --no-warnings --experimental-transform-types lab/experiments/EXP-DX1/api1/server.ts READY_FILE OUT
// Settings (environment): API1_WINDOW_SECONDS (60), API1_LIST_CALLERS (8), API1_CALLERS ("64,256"), API1_ARMS ("today,loader,batch1"),
// API1_SETS ("reread,random"), API1_SAVES_PER_SECOND (23), API1_ALONE_CALLS (20), API1_REREAD_PER_ACCOUNT (200),
// API1_CALL_TIMEOUT_MS (30000), API1_DRY (1: one 10 s window per arm at 8 callers, for a check on a toy).
// Rejected: a mix sampled per window (every window draws from the same seeded sequence), and timing on the driver's
// clock only (the gateway's own micros and the reader's cgroup CPU are recorded beside it).
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { DatomicClient, DefinitionCache } from "../../../../packages/datomic/dist/index.js";
import { deepTasks, taskId, taskSerial, fieldValue } from "../../../bench/lib/deep-world.ts";
import { ids } from "../../../bench/lib/world.ts";
import { pathToFileURL } from "node:url";
import { Effect, Layer, ManagedRuntime } from "effect";
import { makePorts, type Port, type Result } from "./ports.ts";
import { def, definitionFacts, FORMS, shapes, type Ctx, type Shape, type Step } from "./shapes.ts";

const [readyFile, out] = process.argv.slice(2);
assert(readyFile && out, "usage: server.ts READY_FILE OUT");
assert(!fs.existsSync(out), "OUT must be new");
fs.mkdirSync(out, { recursive: true });
const env = (k: string, d: string) => process.env[k] ?? d;
const dry = env("API1_DRY", "0") === "1";
const windowSeconds = dry ? 10 : Number(env("API1_WINDOW_SECONDS", "60"));
const callersList = (dry ? "8" : env("API1_CALLERS", "64,256")).split(",").map(Number);
type Arm = Port | "floor";
const arms = env("API1_ARMS", "today,batch1,floor").split(",") as Arm[];
const sets = env("API1_SETS", "reread,random").split(",");
const savesPerSecond = Number(env("API1_SAVES_PER_SECOND", "23"));
const aloneCalls = dry ? 3 : Number(env("API1_ALONE_CALLS", "20"));
const rereadPerAccount = Number(env("API1_REREAD_PER_ACCOUNT", dry ? "20" : "200"));
const callTimeout = Number(env("API1_CALL_TIMEOUT_MS", "30000"));
const ready = JSON.parse(fs.readFileSync(readyFile, "utf8"));
assert(ready.version === "triplex-demo-ready/1" && ready.workingCopy === true, "a demo working copy (it is written)");
const db: string = ready.database;
const reader = new DatomicClient(`http://127.0.0.1:${ready.readPort}`, callTimeout);
const writer = new DatomicClient(`http://127.0.0.1:${ready.writePort}`, 60_000);
const readerContainer = process.env.API1_READER_CONTAINER ?? `${ready.prefix}-gw-r`;
const log = (kind: string, data: object = {}) => {
  const line = JSON.stringify({ kind, at: new Date().toISOString(), ...data });
  console.log(line);
  fs.appendFileSync(path.join(out, "server.jsonl"), line + "\n");
};
const options = (await reader.request<any>("GET", `/v1/db/${db}/write-options`)).options;
assert(options.readBatch === true && options.pinnedShortcut === true && options.pinnedCutLookup === true, "reader options: " + JSON.stringify(options));
const threads0 = await reader.request<any>("GET", "/v2/admin/threads");
log("reader", { options, readPermits: threads0.readPermits, ready: { head: ready.head, records: ready.recordsAtBringUp, memory: ready.memory } });

// Deep accounts and their subjects.
const deep = (ready.roster as { account: string; namespace: string; firstPerson: number; people: number }[]).filter((r) => r.people >= Number(env("API1_MIN_PEOPLE", dry ? "100" : "1000")));
assert(deep.length > 0, "no deep account in the roster");
const validAt = Date.now();
const rand = (() => { let x = 0x2545f491; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; })();
const ctxFor = (r: (typeof deep)[number], i: number, t: number): Ctx => ({
  A: r.namespace, account: /^acct\/([^/]+)\/$/.exec(r.namespace)![1]!, i, t: t % deepTasks(i), after: r.namespace + ids.placement(Math.max(r.firstPerson, i - 1)) });
const rereadSet = deep.flatMap((r) => Array.from({ length: rereadPerAccount }, (_, k) => [r, r.firstPerson + 1 + k] as const));
const pick = (set: string) => {
  if (set === "reread") return rereadSet[Math.floor(rand() * rereadSet.length)]!;
  const r = deep[Math.floor(rand() * deep.length)]!;
  return [r, r.firstPerson + 1 + Math.floor(rand() * (r.people - 60))] as const;
};

// Writes go through the product's own write path (the SDK's Triples over the write gateway), one transaction per subject's
// save, as the sweep's server run does on this database. Rejected: the lab's raw command (its writer settings are the
// lab stack's, not necessarily the demo bring-up's).
const REPO = path.resolve(import.meta.dirname, "../../../..");
const dist = (pkg: string, file: string) => pathToFileURL(path.join(REPO, "packages", pkg, "dist", file)).href;
const core: any = await import(dist("core", "index.js"));
const runtimeApi: any = await import(dist("core", "runtime/index.js"));
const datomic: any = await import(dist("datomic", "index.js"));
const [tag, scopeEnv, tenant, database, generation] = JSON.parse(Buffer.from(db.slice(3), "base64url").toString());
assert(tag === "triplex-scope-v1", "unexpected database name");
const scope = runtimeApi.DatabaseScope.make({ env: scopeEnv, tenant, database, generation });
const rt = ManagedRuntime.make(runtimeApi.Runtime.define({
  name: "datomic",
  storage: Layer.succeed(runtimeApi.StorageAdapter, datomic.makeDatomicStorageAdapter(writer, scope, { layout: "lean", serverRecordTime: true })),
  queries: Layer.succeed(runtimeApi.QueryExecutor, datomic.makeDatomicQueryExecutor(writer, scope)),
}).layer({ scope, capabilities: runtimeApi.Capabilities.none })) as any;
const save = async (_c: DatomicClient, _id: string, change: { e: string; a: string; v: { type: string; value: string } }[]) => {
  const ops = change.map((f) => ({ op: "assert", entityId: core.EntityId.make(f.e), entityType: "Subject", attribute: f.a,
    value: f.v.type === "ref" ? { type: "ref", value: core.EntityId.make(f.v.value) } : { type: "string", value: f.v.value }, validFrom: 0 }));
  const result: any = await rt.runPromise(Effect.flatMap(core.Triples, (t: any) => t.transact(ops, { actor: "api1-server" })));
  return Number(result.position);
};
const run = crypto.randomUUID();
// The definitions in force (absent on the 1 billion database): one transaction per deep account.
for (const r of deep) {
  const t0 = performance.now();
  const position = await save(writer, "", definitionFacts(r.namespace) as any);
  log("definitions", { account: r.account, position, ms: performance.now() - t0 });
}
// The 1 billion subjects carry no reference from a task to its form: the form is named literally (same entities).
const literalForms = (s: Shape): Shape => {
  const fix = (step: Step): Step =>
    step.from?.attribute !== ":task/template" ? step
      : step.key === "forms"
        ? { key: step.key, ids: (c) => [...new Set(Array.from({ length: deepTasks(c.i) }, (_, t) => def.form(c.A, taskSerial(c.i, t) % FORMS)))] }
        : { key: step.key, ids: (c) => [def.form(c.A, taskSerial(c.i, c.t) % FORMS)] };
  return { ...s, levels: s.levels.map((l) => l.map(fix)), ...(s.after ? { after: s.after.map((l) => l.map(fix)) } : {}), ...(s.batch ? { batch: s.batch.map(fix) } : {}) };
};
// The world forms reach the forms through the task's reference on the toy; at 1 billion they are named literally too.
const withForms = (s: Shape): Shape => !s.name.endsWith("-world") ? s : {
  ...s, levels: [[...s.levels[0]!, s.name === "task-page-world"
    ? { key: "form", ids: (c: Ctx) => [def.form(c.A, taskSerial(c.i, c.t) % FORMS)], def: true }
    : { key: "forms", ids: (c: Ctx) => [...new Set(Array.from({ length: deepTasks(c.i) }, (_, t) => def.form(c.A, taskSerial(c.i, t) % FORMS)))], def: true }] as Step[],
    ...s.levels.slice(1)] };
const byName = new Map(shapes.map((s) => [s.name, withForms(literalForms(s))]));
// The mixes (proposed; API-CALL-READS.md section 7): shares of calls. "calls" is every subject-centred shape; the list
// page (15% of the product's calls in the proposed mix) runs in windows of its own at few callers, because at 64 callers
// one list page of today's port takes longer than a window.
const mixes: Record<string, [string, number][]> = {
  calls: [["subject-page", 15], ["task-page", 15], ["task-fields", 15], ["placement-page", 10], ["form-submit", 10], ["policy-eval", 8],
    ["import-row", 7], ["check-webhook", 5]],
  list: [["subject-list", 1]],
};
const drawShape = (mix: [string, number][]) => {
  const total = mix.reduce((n, [, w]) => n + w, 0);
  let x = rand() * total; for (const [name, w] of mix) { if ((x -= w) < 0) return byName.get(name)!; } return byName.get(mix[0]![0])!;
};
const listCallers = dry ? 4 : Number(env("API1_LIST_CALLERS", "8"));
const { today, loader, batch1 } = makePorts(db, validAt, writer, save);
// "floor": the one-request batch with each subject-centred shape read as its world (subject-page-world and the others)
// and the definitions in force from the product-side cache (DefinitionCache), as API-CALL-READS.md section 10 builds it.
const floorDefs = new DefinitionCache();
const call = (port: Arm, shape: Shape, ctx: Ctx, stats = false): Promise<Result> =>
  port === "today" ? today(reader, shape, ctx, false) : port === "pinned" ? today(reader, shape, ctx, true)
    : port === "loader" ? loader(reader, shape, ctx, { stats })
    : port === "floor" ? batch1(reader, byName.get(shape.name + "-world") ?? shape, ctx, { stats, defs: floorDefs })
    : batch1(reader, shape, ctx, { stats });
const cpuMicros = () => {
  const text = execFileSync("docker", ["exec", readerContainer, "cat", "/sys/fs/cgroup/cpu.stat"], { encoding: "utf8" });
  return Number(/usage_usec (\d+)/.exec(text)![1]);
};
const pct = (xs: number[], q: number) => { const s = [...xs].sort((a, b) => a - b); return s.length ? Math.round(s[Math.min(s.length - 1, Math.floor(q * s.length))]! * 100) / 100 : null; };

// Warm the re-read set: every shape once per subject, one request each.
if (sets.includes("reread")) {
  const t0 = performance.now();
  let k = 0;
  await Promise.all(Array.from({ length: 16 }, async () => {
    while (k < rereadSet.length) { const [r, i] = rereadSet[k++]!; for (const s of byName.values()) if (!s.save) await batch1(reader, s, ctxFor(r, i, k), {}); }
  }));
  log("warmed", { subjects: rereadSet.length, seconds: (performance.now() - t0) / 1000 });
}
// Alone: one caller, each shape, each arm, no saves.
for (const set of sets) for (const shape of [...byName.values()].filter((x) => !x.name.endsWith("-world"))) for (const port of arms) {
  const wall: number[] = [], per: Result[] = [];
  const c0 = cpuMicros();
  for (let k = 0; k < (shape.name === "subject-list" && port === "today" ? Math.min(aloneCalls, 5) : aloneCalls); k++) {
    const [r, i] = pick(set); const t = performance.now();
    per.push(await call(port, shape, ctxFor(r, i, k), true)); wall.push(performance.now() - t);
  }
  const mean = (f: (x: Result) => number) => per.reduce((n, x) => n + f(x), 0) / per.length;
  log("alone", { set, shape: shape.name, port, calls: per.length, p50: pct(wall, 0.5), p99: pct(wall, 0.99), trips: mean((x) => x.trips),
    reads: mean((x) => x.reads), loads: port === "today" || port === "pinned" ? null : mean((x) => x.loads ?? 0), defHits: mean((x) => x.defHits),
    readerCpuMsPerCall: (cpuMicros() - c0) / 1000 / per.length, requestP99: pct(per.flatMap((x) => x.requestMs ?? []), 0.99),
    missedOwnWrite: per.reduce((n, x) => n + (x.missedOwnWrite ?? 0), 0) });
}
// Windows: the subject-centred mix at 64 and 256 callers, then the list page alone at few callers, beside saves of one
// subject each.
const windows = [...sets.flatMap((set) => callersList.flatMap((callers) => arms.map((port) => ({ set, callers, port, mix: "calls" })))),
  ...sets.flatMap((set) => arms.map((port) => ({ set, callers: listCallers, port, mix: "list" })))];
for (const { set, callers, port, mix } of windows) {
  let running = true;
  const commits: number[] = [];
  let saved = 0;
  const saver = (async () => {
    const gap = 1000 / savesPerSecond; let next = performance.now();
    while (running) {
      next += gap; const wait = next - performance.now(); if (wait > 0) await new Promise((s) => setTimeout(s, wait));
      const r = deep[Math.floor(rand() * deep.length)]!, i = r.firstPerson + Math.floor(rand() * r.people), e = r.namespace + taskId(i, 0);
      const change = Array.from({ length: 13 }, (_, f) => ({ e, a: `:task/field-${f}`, v: { type: "string", value: fieldValue(i, 0, f, 9000 + saved).value } }));
      for (const [a, v] of [[":task/review", String(saved)], [":task/status", "in-review"], [":task/reviewer", "r" + (saved % 9)], [":task/note", "n" + saved]] as const)
        change.push({ e, a, v: { type: "string", value: v } });
      const t = performance.now();
      try { await save(writer, `api1-s-${run}-${saved}`, change); commits.push(performance.now() - t); saved++; } catch (error) { log("save-error", { error: String(error) }); }
    }
  })();
  const wall: number[] = [], requests: number[] = [];
  let calls = 0, reads = 0, trips = 0, timeouts = 0, errors = 0, missed = 0;
  const c0 = cpuMicros(), t0 = performance.now();
  await Promise.all(Array.from({ length: callers }, async (_, seat) => {
    while (performance.now() - t0 < windowSeconds * 1000) {
      const shape = drawShape(mixes[mix]!), [r, i] = pick(set);
      const t = performance.now();
      try {
        const x = await call(port, shape, ctxFor(r, i, seat + calls));
        wall.push(performance.now() - t); calls++; reads += x.reads; trips += x.trips; missed += x.missedOwnWrite ?? 0;
        if (x.requestMs) for (const m of x.requestMs) requests.push(m);
      } catch (error: any) { if (/timeout|aborted/i.test(String(error?.message ?? error))) timeouts++; else { errors++; if (errors < 4) log("call-error", { error: String(error) }); } }
    }
  }));
  const seconds = (performance.now() - t0) / 1000, cpu = (cpuMicros() - c0) / 1e6;
  running = false; await saver;
  log("window", { mix, set, callers, port, seconds, calls, callsPerSecond: calls / seconds, readsPerSecond: reads / seconds, tripsPerCall: trips / Math.max(1, calls),
    readsPerCall: reads / Math.max(1, calls), callP50: pct(wall, 0.5), callP99: pct(wall, 0.99), requestP99: pct(requests, 0.99),
    under50: wall.filter((m) => m <= 50).length / Math.max(1, wall.length), under200: wall.filter((m) => m <= 200).length / Math.max(1, wall.length),
    readerCores: cpu / seconds, readerCpuMsPerCall: (cpu * 1000) / Math.max(1, calls), timeouts, errors, missedOwnWrite: missed,
    saves: saved, savesPerSecond: saved / seconds, commitP50: pct(commits, 0.5), commitP99: pct(commits, 0.99) });
}
const stats = await reader.request<any>("GET", "/v2/admin/scan-stats");
log("end", { readBatch: stats.readBatch ?? null, readPrefetch: stats.readPrefetch ?? null, busyRetries: reader.readBusyRetries });
await rt.dispose(); reader.close(); writer.close();

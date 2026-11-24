// [DX-API1] Mac driver for API-call-shaped reads (gate.sh starts the container). Seeds a deep toy (SCALE1's subject shape,
// `deepOwnFacts`, plus each task's form reference and per-account definitions), then runs the phases in API1_PHASES:
//   gate     every batched answer (the one-request batch and the SDK loader) equal to the same reads issued one by one at
//            the same position: the head, two past positions, and the head while saves run; the typed refusals; the
//            cursor; the one-permit rule (read admissions counted on the gateway);
//   counts   per shape and port: round trips, reads, rows, storage loads (Datomic io-stats), reader CPU, wall time, on the
//            warm reader (subjects read before) and the cold one (32 MB cache, random subjects), 1, 16 and 64 callers;
//   straddle unpinned calls under saves: how often one call's reads see two positions (inconsistent pages counted).
// Times here are diagnostic (a Mac shared with five builders); counts are results.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync, writeFileSync, openSync, readSync, closeSync } from "node:fs";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { DatomicClient, DefinitionCache } from "../../../../packages/datomic/dist/index.js";
import { decodeEntity } from "../../../../packages/datomic/dist/reach.js";
import { makePorts, type Port } from "./ports.ts";
import { decodeRow } from "../../../../packages/datomic/dist/protocol.js";
import { deepOwnFacts, deepTasks, fieldValue, taskId } from "../../../bench/lib/deep-world.ts";
import { ids } from "../../../bench/lib/world.ts";
import { command } from "../w1/group/workload.ts";
import { scaleAccount } from "../prep1/ceiling-seed.ts";
import { definitionFacts, refsOf, releaseChange, shapes, templateFacts, type Ctx, type Shape, type Step } from "./shapes.ts";

const [out, writerUrl, warmUrl, coldUrl] = process.argv.slice(2);
const phases = new Set((process.env.API1_PHASES ?? "gate,counts,straddle").split(","));
const container = process.env.API1_CONTAINER!;
const accounts = Number(process.env.API1_ACCOUNTS ?? 2);
const people = Number(process.env.API1_SUBJECTS ?? 500);
const agingSaves = Number(process.env.API1_AGING ?? 150);
const log = (...a: unknown[]) => console.error(new Date().toISOString(), ...a);
const waitFor = async (file: string, seconds: number) => {
  for (let i = 0; i < seconds * 4 && !existsSync(join(out!, file)); i++) await sleep(250);
  assert(existsSync(join(out!, file)), "timed out waiting for " + file);
};
await waitFor("ready", 300);
const nonce = crypto.randomUUID();
const name = "dx-api1-calls-" + nonce;
const scope = JSON.stringify(["triplex-scope-v1", "test", "test", name, 0]);
const writer = new DatomicClient(writerUrl!, 60_000);
const init = await writer.create(scope, "lean", true, 60_000);
assert(init.created && init.strictRecordClocks);
const db = init.db;
const prefix = (a: number) => "acct/" + scaleAccount(a) + "/";
type F = { e: string; a: string; v: { type: string; value: string } };
const withPrefix = (A: string, f: F): F => ({ e: A + f.e, a: f.a, v: f.v.type === "ref" ? { type: "ref", value: A + f.v.value } : f.v });

// ---- Seed: definitions first, then whole subjects in the loader's frames of up to 2,000 facts.
const transact = async (c: DatomicClient, input: unknown) => {
  for (let attempt = 0; ; attempt++) {
    try { return await c.transact(db, input as any); }
    catch (e: any) {
      if (e?.code === "OperationDuplicate" && attempt > 0) return undefined;
      if (e?.code !== "OutcomeUnknown" || attempt >= 4) throw e;
    }
  }
};
const t0 = Date.now();
const frames: F[][] = [];
for (let a = 0; a < accounts; a++) {
  const A = prefix(a);
  frames.push(definitionFacts(A) as F[]);
  let rows: F[] = [];
  for (let i = 0; i < people; i++) {
    const world = [...deepOwnFacts(i).map((f) => withPrefix(A, f as F)), ...(templateFacts(A, i) as F[])];
    if (rows.length && rows.length + world.length > 2000) { frames.push(rows); rows = []; }
    rows.push(...world);
  }
  if (rows.length) frames.push(rows);
}
let next = 0;
await Promise.all(Array.from({ length: 4 }, async () => {
  while (next < frames.length) { const k = next++; await transact(writer, command(`api1-seed-${nonce}-${k}`, frames[k] as any)); }
}));
const facts = frames.reduce((n, f) => n + f.length, 0);
const headOf = async (c: DatomicClient) => Number((await c.request<any>("GET", "/v1/db/" + db + "/write-options")).position);
const seedCut = await headOf(writer);
log("seeded", accounts * people, "subjects,", frames.length, "frames,", facts, "facts in", Date.now() - t0, "ms; head", seedCut);
const validAt = Date.now();
const rowsOf = async (c: DatomicClient, e: string, basis?: object) =>
  (await c.rows(db, { entityIds: [e], ...(basis ? { basis } : {}) })) as any[];
// One commit per subject's save: the given facts replace the entities' current values of those attributes.
const save = async (c: DatomicClient, id: string, change: F[]): Promise<number> => {
  // Two calls may save the same subject at once (the warm set is small): a conflicting save reads again and retries.
  for (let attempt = 0; ; attempt++) {
    try { return await saveOnce(c, id + (attempt ? "-r" + attempt : ""), change); }
    catch (e: any) { if (e?.code !== "CasConflict" || attempt >= 8) throw e; }
  }
};
const saveOnce = async (c: DatomicClient, id: string, change: F[]) => {
  const head = await headOf(c);
  const old: any[] = [];
  for (const e of [...new Set(change.map((f) => f.e))]) {
    const rows = await rowsOf(c, e, { recordedPosition: head, validAt });
    old.push(...rows.filter((r) => change.some((f) => f.e === e && f.a === r.attribute)));
  }
  const ack: any = await transact(c, command(id, change as any, old));
  return Number(ack?.position?.v ?? (await headOf(c)));
};
// Aging: field 0 of random subjects' first task.
for (let k = 0; k < agingSaves; k++) {
  const a = k % accounts, i = Math.floor(Math.random() * people);
  await save(writer, `api1-age-${nonce}-${k}`, [{ e: prefix(a) + taskId(i, 0), a: ":task/field-0", v: { type: "string", value: fieldValue(i, 0, 0, k + 1).value } }]);
}
const agedHead = await headOf(writer);
writeFileSync(join(out!, "seed.json"), JSON.stringify({ db, name, seedCut, agedHead, accounts, people, facts }) + "\n");
await waitFor("readers-ready", 900);
const warm = new DatomicClient(warmUrl!, 60_000), cold = new DatomicClient(coldUrl!, 60_000);
for (const c of [warm, cold]) await c.create(scope, "lean", true, 60_000);
for (const c of [warm, cold]) {
  const o = (await c.request<any>("GET", "/v1/db/" + db + "/write-options")).options;
  assert.deepEqual([o.pinnedShortcut, o.pinnedCutLookup, o.readBatch], [true, true, true]);
}
log("readers ready; seed cut", seedCut, "aged head", agedHead);

const ctxFor = (a: number, i: number, t = 0): Ctx => ({ A: prefix(a), account: scaleAccount(a), i, t: t % deepTasks(i), after: prefix(a) + ids.placement(Math.max(0, i - 1)) });
const { today, loader, batch1, keyOf } = makePorts(db, validAt, writer, save);
type Result = import("./ports.ts").Result;
type CellPort = Port | "loaderDefs" | "batchDefs";

// ---- Exactness.
const listIdsRetry = async (c: DatomicClient, request: any) => {
  for (let attempt = 0; ; attempt++) {
    try { return await c.listIds(db, request); }
    catch (e: any) { if (e?.code !== "IndexBusy" || attempt > 2000) throw e; await sleep(2); }
  }
};
const canonRows = (rows: any[]) => JSON.stringify(rows.map((x) => (x.attribute && typeof x.attribute === "object" ? decodeRow(x) : x))
  .map((x: any) => JSON.parse(JSON.stringify(x, (_k, v) => (typeof v === "bigint" ? String(v) : v))))
  .sort((p: any, q: any) => (p.id < q.id ? -1 : p.id > q.id ? 1 : 0)));
const dropVolatile = (page: any) => { const { head, scanMicros, ioReads, segmentsLoaded, ...rest } = page ?? {}; return JSON.stringify(rest); };
const gate = { comparisons: 0, differences: [] as unknown[], byShape: {} as Record<string, { comparisons: number; differences: number }>,
  positionsPerCall: { loader: 0, batch: 0, callsChecked: 0 }, refusals: [] as unknown[], cursor: null as unknown, permits: null as unknown,
  releaseChanges: 0, definitionCaches: {} as unknown };
const differ = (shape: string, what: unknown) => { gate.differences.push({ shape, what }); gate.byShape[shape]!.differences++; };
const single = (c: DatomicClient, id: string, P: number, pattern?: object) =>
  c.request<any>("POST", "/v1/db/" + db + "/read", { entityIds: [id], basis: { recordedPosition: P, validAt }, ...(pattern ? { pattern } : {}) }).then((x) => x.rows);
// A world's entities against the same entities read one by one at the same position (rows visible at validAt).
const ROW_FIELDS = ["id", "entity_id", "attribute", "value_type", "value_string", "value_number", "value_boolean", "value_datetime",
  "value_json", "recorded_at", "recorded_position", "valid_from", "valid_to", "tx_id", "entity_type", "created_by", "schema_version"];
const pickRow = (x: any) => Object.fromEntries(ROW_FIELDS.map((f) => [f, x[f] === undefined ? null : typeof x[f] === "bigint" ? String(x[f]) : x[f]]));
const canonPicked = (rows: any[]) => JSON.stringify(rows.map(pickRow).sort((p: any, q: any) => (p.id < q.id ? -1 : p.id > q.id ? 1 : 0)));
async function checkWorld(c: DatomicClient, shapeName: string, world: any, P: number, port: string) {
  if (world?.declined) { differ(shapeName, { port, declined: world.declined }); return; }
  for (const entry of world.entities as any[]) {
    const [id, rev, wire] = entry;
    if (!Array.isArray(wire)) { differ(shapeName, { port, notInline: id }); continue; }
    const decoded = decodeEntity(id, rev, wire).storedRows.filter((x: any) => x.valid_from <= validAt && (x.valid_to === null || x.valid_to > validAt));
    const want = (await single(c, id, P)).map((x: any) => decodeRow(x));
    gate.comparisons++; gate.byShape[shapeName]!.comparisons++;
    if (canonPicked(decoded) !== canonPicked(want)) differ(shapeName, { port, worldEntity: id, P });
  }
}
async function checkLoader(c: DatomicClient, shape: Shape, ctx: Ctx, at?: number, defs?: DefinitionCache) {
  const r = await loader(c, shape, ctx, { at, defs });
  gate.positionsPerCall.callsChecked++;
  const distinct = new Set(r.positions);
  if (distinct.size !== (shape.save ? 2 : 1)) differ(shape.name, { loaderPositions: r.positions });
  // Every read before the save is at the first position; after it at the last.
  const firstP = r.positions[0]!, lastP = r.positions[r.positions.length - 1]!;
  for (const [key, rows] of r.answers) {
    const [, attr, id] = key.split("|") as [string, string, string];
    const P = r.afterKeys.has(key) ? lastP : firstP;
    const want = await single(c, id, P, attr === "*" ? undefined : { attribute: attr });
    gate.comparisons++; gate.byShape[shape.name]!.comparisons++;
    if (canonRows(rows as any[]) !== canonRows(want)) differ(shape.name, { port: "loader", key, P });
  }
  for (const [, world] of r.worlds) await checkWorld(c, shape.name, world, firstP, "loader");
  for (const [key, page] of r.pages) {
    const want = await listIdsRetry(c, { ...(shape.levels.flat().find((s) => s.key === key)!.page!(ctx)), basis: { recordedPosition: firstP, validAt } } as any);
    gate.comparisons++; gate.byShape[shape.name]!.comparisons++;
    if (dropVolatile(page) !== dropVolatile(want)) differ(shape.name, { port: "loader", page: key });
  }
  return r;
}
async function checkBatch(c: DatomicClient, shape: Shape, ctx: Ctx, at?: number, limits?: object, defs?: DefinitionCache) {
  const r = await batch1(c, shape, ctx, { at, limits, defs });
  for (const { step, entry, answer, position, asked } of r.batch) {
    if (step.page) {
      const want = await listIdsRetry(c, { ...step.page(ctx), basis: { recordedPosition: position, validAt } } as any);
      gate.comparisons++; gate.byShape[shape.name]!.comparisons++;
      if (dropVolatile(answer) !== dropVolatile(want)) differ(shape.name, { port: "batch", page: step.key });
    } else if (entry.op === "reach") {
      const want = await c.request<any>("POST", "/v2/db/" + db + "/reach-many", { roots: asked, basis: { recordedPosition: position, validAt } });
      gate.comparisons++; gate.byShape[shape.name]!.comparisons++;
      // The world (entities with their revisions and rows, and the closures) equals the single route's at this position;
      // a world taken from the definitions cache was read at an earlier position of the same release.
      const same = (w: any) => JSON.stringify([w?.entities, w?.closures]);
      if (same(answer) !== same(want)) differ(shape.name, { port: "batch", reach: step.key, position });
      await checkWorld(c, shape.name, answer, position, "batch");
    } else {
      const byEntity = new Map<string, any[]>();
      for (const row of answer.rows) { const e = row.entity_id.v; byEntity.set(e, [...(byEntity.get(e) ?? []), row]); }
      for (const id of asked) {
        const want = await single(c, id, position, step.pattern);
        gate.comparisons++; gate.byShape[shape.name]!.comparisons++;
        if (canonRows(byEntity.get(id) ?? []) !== canonRows(want)) differ(shape.name, { port: "batch", step: step.key, id, position });
      }
      // Nothing outside the subjects asked for.
      for (const e of byEntity.keys()) if (!asked.includes(e)) differ(shape.name, { port: "batch", step: step.key, unexpected: e });
    }
  }
  if (new Set(r.positions).size !== (shape.save ? 2 : 1)) differ(shape.name, { batchPositions: r.positions });
  return r;
}

const results: Record<string, unknown> = { run: "dx-api1", seedCut, agedHead, accounts, people, facts };
const pool = async <T,>(items: T[], n: number, f: (x: T) => Promise<void>) => {
  let k = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (k < items.length) await f(items[k++]!); }));
};
const subjectSample = (n: number, seed: number) => Array.from({ length: n }, (_, k) => [k % accounts, (seed * 7919 + k * 104729) % (people - 52) + 1] as const);

const defCaches = { loaderWarm: new DefinitionCache(), loaderCold: new DefinitionCache(), batchWarm: new DefinitionCache(), batchCold: new DefinitionCache() };
if (phases.has("gate")) {
  for (const s of shapes) gate.byShape[s.name] = { comparisons: 0, differences: 0 };
  const mid = seedCut + Math.floor((agedHead - seedCut) / 2);
  const positions: (number | undefined)[] = [undefined, seedCut, mid];
  for (const shape of shapes) {
    const sample = subjectSample(shape.name === "subject-list" ? 4 : 12, shape.name.length);
    for (const at of positions) {
      if (shape.save && at !== undefined) continue;  // a save's read-after-write reads at the head
      await pool(sample.map(([a, i], k) => ({ a, i, k })), 4, async ({ a, i, k }) => {
        const ctx = ctxFor(a, i, k);
        await checkLoader(k % 2 ? warm : cold, shape, ctx, at);
        await checkBatch(k % 2 ? cold : warm, shape, ctx, at);
        // The same through the definitions caches (one per port and reader, kept across every call of the gate).
        await checkLoader(k % 2 ? warm : cold, shape, ctx, at, defCaches[k % 2 ? "loaderWarm" : "loaderCold"]);
        await checkBatch(k % 2 ? cold : warm, shape, ctx, at, undefined, defCaches[k % 2 ? "batchCold" : "batchWarm"]);
      });
    }
    log("gate", shape.name, gate.byShape[shape.name]);
  }
  // Under saves: the same at the head while a saver changes random subjects of the sample.
  let running = true, liveSaves = 0;
  const saver = (async () => {
    while (running) {
      const a = Math.floor(Math.random() * accounts), i = 1 + Math.floor(Math.random() * 40);
      await save(writer, `api1-live-${crypto.randomUUID()}`, [{ e: prefix(a) + taskId(i, 0), a: ":task/progress", v: { type: "integer", value: String(1000 + liveSaves) } },
        { e: prefix(a) + ids.placement(i), a: ":placement/stamp", v: { type: "integer", value: String(1000 + liveSaves) } }]);
      liveSaves++;
    }
  })();
  // Halfway, a new release of both accounts' definitions (rule values, property names, a form, the pointer) in one
  // commit each: cached definitions of the old release must not answer a call at a position after it.
  const live = shapes.filter((s) => s.name !== "subject-list");
  let releases = 0;
  for (const [n, shape] of live.entries()) {
    if (n === Math.floor(live.length / 2) || n === live.length - 1)
      for (let a = 0; a < accounts; a++) { await save(writer, `api1-release-${crypto.randomUUID()}`, releaseChange(prefix(a), 2 + releases) as any); releases++; }
    await pool(Array.from({ length: 16 }, (_, k) => k), 4, async (k) => {
      const ctx = ctxFor(k % accounts, 1 + (k % 40), k);
      await checkLoader(k % 2 ? warm : cold, shape, ctx);
      await checkBatch(k % 2 ? cold : warm, shape, ctx);
      await checkLoader(k % 2 ? warm : cold, shape, ctx, undefined, defCaches[k % 2 ? "loaderWarm" : "loaderCold"]);
      await checkBatch(k % 2 ? cold : warm, shape, ctx, undefined, undefined, defCaches[k % 2 ? "batchCold" : "batchWarm"]);
    });
  }
  gate.releaseChanges = releases;
  gate.definitionCaches = Object.fromEntries(Object.entries(defCaches).map(([k, c]) => [k, c.counts]));
  running = false; await saver;
  log("gate under saves done;", liveSaves, "saves");
  // Typed refusals.
  const refuse = async (label: string, body: object, code: string) => {
    try { await warm.request<any>("POST", "/v2/db/" + db + "/batch", body); gate.refusals.push({ label, ok: false, got: "200" }); }
    catch (e: any) { gate.refusals.push({ label, ok: e?.code === code, got: e?.code ?? String(e) }); }
  };
  const A = prefix(0), b = { validAt };
  await refuse("history", { basis: b, reads: [{ op: "rows", entityIds: [A + ids.placement(1)], history: true }] }, "BatchUnsupported");
  await refuse("row id lookup", { basis: b, reads: [{ op: "rows", id: "x" }] }, "BatchUnsupported");
  await refuse("scan (no subjects)", { basis: b, reads: [{ op: "rows", entityIds: [] }] }, "BatchUnsupported");
  await refuse("held handle", { basis: b, handle: "h", reads: [{ op: "rows", entityIds: [A + ids.placement(1)] }] }, "BatchUnsupported");
  await refuse("record-time basis", { basis: { validAt, recordedAt: Date.now() }, reads: [{ op: "rows", entityIds: [A + ids.placement(1)] }] }, "BatchUnsupported");
  await refuse("forward reference", { basis: b, reads: [{ op: "rows", entityIdsFrom: { entry: 1, attribute: ":a/b" } }, { op: "rows", entityIds: [A + ids.placement(1)] }] }, "BatchUnsupported");
  await refuse("self reference", { basis: b, reads: [{ op: "rows", entityIdsFrom: { entry: 0, attribute: ":a/b" } }] }, "BatchUnsupported");
  await refuse("257 entries", { basis: b, reads: Array.from({ length: 257 }, () => ({ op: "rows", entityIds: [A + ids.placement(1)] })) }, "BatchUnsupported");
  await refuse("4,097 subjects", { basis: b, reads: Array.from({ length: 9 }, (_, k) => ({ op: "rows", entityIds: Array.from({ length: 512 - (k === 8 ? 511 : 0) }, (_, j) => A + ids.placement(j)) })) }, "BatchTooLarge");
  await refuse("unknown op", { basis: b, reads: [{ op: "q" }] }, "BatchUnsupported");
  await refuse("no validAt", { basis: {}, reads: [{ op: "rows", entityIds: [A + ids.placement(1)] }] }, "BatchUnsupported");
  await refuse("at-least with a pin", { basis: { validAt, recordedPosition: seedCut }, atLeastPosition: seedCut, reads: [{ op: "rows", entityIds: [A + ids.placement(1)] }] }, "InvalidValue");
  // The cursor: a 64 KiB byte bound splits a subject page into several requests; the answers equal the unbounded batch.
  {
    const shape = shapes[0]!, ctx = ctxFor(0, 7);
    const P = await headOf(warm);
    const whole = await batch1(warm, shape, ctx, { at: P }), parts = await batch1(warm, shape, ctx, { at: P, limits: { maxBytes: 65536 } });
    gate.cursor = { requestsUnbounded: whole.trips, requestsBounded: parts.trips,
      equal: JSON.stringify(whole.batch.map((x) => x.answer)) === JSON.stringify(parts.batch.map((x) => x.answer)) };
    await checkBatch(warm, shape, ctx, P, { maxBytes: 65536 });
  }
  // One permit per batch: read admissions on the gateway before and after one batch of 30 entries.
  {
    const before = await warm.request<any>("GET", "/v2/admin/threads");
    const shape = shapes[0]!;
    const r = await batch1(warm, shape, ctxFor(1, 9), {});
    const after = await warm.request<any>("GET", "/v2/admin/threads");
    gate.permits = { entries: r.batch.length, readsAdmitted: after.readsAdmitted - before.readsAdmitted, readPermits: after.readPermits };
  }
  results.gate = { ...gate, differences: gate.differences.slice(0, 30), differenceCount: gate.differences.length, liveSaves };
  writeFileSync(join(out!, "gate.json"), JSON.stringify(results.gate, null, 2) + "\n");
  log("gate", JSON.stringify({ comparisons: gate.comparisons, differences: gate.differences.length, refusals: gate.refusals, cursor: gate.cursor, permits: gate.permits }));
}

// ---- Counts.
const pidOf = (port: number) => readFileSync(join(out!, `pid-${port}`), "utf8").trim();
const cpuMs = (port: number) => {
  const stat = execFileSync("docker", ["exec", container, "cat", `/proc/${pidOf(port)}/stat`], { encoding: "utf8" });
  const f = stat.slice(stat.lastIndexOf(")") + 2).split(" ");
  return (Number(f[11]) + Number(f[12])) * 10;  // utime + stime, clock ticks of 10 ms
};
const traceLoads = new Map<string, number>();
const offsets: Record<string, number> = {};
const readTrace = (proc: string) => {
  const file = join(out!, "trace", proc + ".jsonl");
  if (!existsSync(file)) return;
  const size = statSync(file).size, from = offsets[file] ?? 0;
  if (size <= from) return;
  const fd = openSync(file, "r"); const buf = Buffer.alloc(size - from); readSync(fd, buf, 0, buf.length, from); closeSync(fd);
  const text = buf.toString("utf8"); const end = text.lastIndexOf("\n");
  offsets[file] = from + Buffer.byteLength(text.slice(0, end + 1));
  for (const line of text.slice(0, end).split("\n")) {
    if (!line.includes("readProfileId")) continue;
    const r = JSON.parse(line); const reads = r.attributes?.peerIoStats?.reads ?? {};
    traceLoads.set(r.readProfileId, Object.entries(reads).reduce((n, [k, v]) => n + (k.endsWith("-load") && typeof v === "number" ? v : 0), 0));
  }
};
const pct = (xs: number[], q: number) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(q * s.length))]! : null; };
async function cell(port: CellPort, shape: Shape, reader: "warm" | "cold", callers: number, calls: number, profile: boolean) {
  const defs = port === "loaderDefs" || port === "batchDefs" ? new DefinitionCache() : undefined;
  const c = reader === "warm" ? warm : cold, portNo = reader === "warm" ? 8081 : 8082;
  const pick = (k: number) => reader === "warm" ? ctxFor(k % accounts, 1 + (k * 13) % 40, k) : ctxFor(k % accounts, 41 + ((k * 7919 + Date.now()) % (people - 93)), k);
  const ids: string[] = [];
  const per: { ms: number; trips: number; reads: number; rows: number; loads: number; missed: number; defHits: number; defMisses: number }[] = [];
  const cpu0 = cpuMs(portNo), w0 = performance.now();
  let k = 0;
  await Promise.all(Array.from({ length: callers }, async () => {
    while (k < calls) {
      const ctx = pick(k++);
      const t = performance.now();
      const run = () => port === "today" ? today(c, shape, ctx, false) : port === "pinned" ? today(c, shape, ctx, true)
        : port === "loader" || port === "loaderDefs" ? loader(c, shape, ctx, { stats: profile, defs }) : batch1(c, shape, ctx, { stats: profile, defs });
      const r: Result = profile && (port === "today" || port === "pinned") ? await c.withReadProfile((s: any) => ids.push(s.id), run) : await run();
      per.push({ ms: performance.now() - t, trips: r.trips, reads: r.reads, rows: r.rows, loads: r.loads ?? 0, missed: r.missedOwnWrite ?? 0, defHits: r.defHits, defMisses: r.defMisses });
    }
  }));
  const wall = performance.now() - w0, cpu = cpuMs(portNo) - cpu0;
  let loads: number | null = null;
  if (profile) {
    if (port === "today" || port === "pinned") {
      await sleep(1500); readTrace(reader === "warm" ? "r-warm" : "r-cold");
      // Loads per request over the requests whose trace record was written, times requests per call.
      const found = ids.filter((id) => traceLoads.has(id));
      loads = found.length ? (found.reduce((n, id) => n + traceLoads.get(id)!, 0) / found.length) * (ids.length / per.length) : null;
      if (found.length < ids.length) log("trace records missing", ids.length - found.length, "of", ids.length);
    } else loads = per.reduce((n, x) => n + x.loads, 0) / per.length;
  }
  const mean = (f: (x: (typeof per)[number]) => number) => per.reduce((n, x) => n + f(x), 0) / per.length;
  const row = { shape: shape.name, port, reader, callers, calls: per.length, reads: mean((x) => x.reads), trips: mean((x) => x.trips),
    rows: mean((x) => x.rows), loads, cpuMsPerCall: cpu / per.length, wallMsP50: pct(per.map((x) => x.ms), 0.5), wallMsP99: pct(per.map((x) => x.ms), 0.99),
    callsPerSecond: per.length / (wall / 1000), missedOwnWrite: per.reduce((n, x) => n + x.missed, 0),
    defHitsPerCall: mean((x) => x.defHits), defMissesPerCall: mean((x) => x.defMisses) };
  return row;
}
const countReaders = (process.env.API1_READERS ?? "warm,cold").split(",") as ("warm" | "cold")[];
if (phases.has("counts")) {
  const rows: unknown[] = [];
  // Warm-up: every warm subject's shapes once, so the warm reader holds them.
  if (countReaders.includes("warm")) for (const shape of shapes) for (let k = 0; k < 40; k++) await batch1(warm, shape, ctxFor(k % accounts, 1 + (k * 13) % 40, k));
  const ports: CellPort[] = (process.env.API1_PORTS ?? "today,pinned,loader,batch1,loaderDefs,batchDefs").split(",") as CellPort[];
  const shapeFilter = process.env.API1_SHAPES ? new Set(process.env.API1_SHAPES.split(",")) : null;
  const big = (s: Shape) => s.name === "subject-list";
  for (const reader of countReaders)
    for (const shape of shapes.filter((s) => !shapeFilter || shapeFilter.has(s.name)))
      for (const port of ports) {
        const r = await cell(port, shape, reader, 1, big(shape) ? 4 : 16, true);
        rows.push(r); log(JSON.stringify(r));
      }
  for (const reader of countReaders)
    for (const callers of [16, 64])
      for (const shape of shapes.filter((s) => !shapeFilter || shapeFilter.has(s.name)))
        for (const port of ports.filter((x) => x !== "pinned")) {
          // The list page reads about 2,250 entities per call one by one; it runs at 16 callers only.
          if (big(shape) && callers > 16) continue;
          const r = await cell(port, shape, reader, callers, big(shape) ? callers : callers * 3, false);
          rows.push(r); log(JSON.stringify(r));
        }
  results.counts = rows;
  writeFileSync(join(out!, "counts.json"), JSON.stringify(rows, null, 2) + "\n");
}

// ---- Calibration: the 1 billion arm's own exchange (eight subjects' field 0 in one pinned /read), so a Mac CPU figure
// can be scaled by the same request measured on the server (1.53 ms per exchange re-read at 256 seats; 1.71 ms per random
// subject). One caller with the read profile (loads per exchange), then 16 callers without it (CPU per exchange under
// load, as the server's figure was taken).
if (phases.has("calibrate")) {
  const rows: unknown[] = [];
  for (const reader of ["warm", "cold"] as const) {
    const c = reader === "warm" ? warm : cold, portNo = reader === "warm" ? 8081 : 8082;
    const P = await headOf(c);
    const subjectsFor = (k: number) => Array.from({ length: 8 }, (_, j) => reader === "warm" ? prefix(j % accounts) + taskId(1 + ((k + j * 5) % 40), 0)
      : prefix(j % accounts) + taskId(41 + Math.floor(Math.random() * (people - 93)), 0));
    const exchange = (k: number) => c.request<any>("POST", "/v1/db/" + db + "/read",
      { entityIds: subjectsFor(k), pattern: { attribute: ":task/field-0" }, basis: { recordedPosition: P, validAt } });
    for (let k = 0; k < 40; k++) await exchange(k);  // warm-up (JIT, and the warm reader's subjects)
    for (const callers of [1, 16]) {
      const n = callers === 1 ? (reader === "warm" ? 200 : 100) : (reader === "warm" ? 3000 : 800);
      const idsSeen: string[] = [];
      const wall: number[] = [];
      const cpu0 = cpuMs(portNo), w0 = performance.now();
      let k = 0;
      await Promise.all(Array.from({ length: callers }, async () => {
        while (k < n) {
          const t = performance.now(), kk = k++;
          if (callers === 1) await c.withReadProfile((x: any) => idsSeen.push(x.id), () => exchange(kk)); else await exchange(kk);
          wall.push(performance.now() - t);
        }
      }));
      const cpu = cpuMs(portNo) - cpu0, seconds = (performance.now() - w0) / 1000;
      let loads: number | null = null;
      if (callers === 1) {
        await sleep(1500); readTrace(reader === "warm" ? "r-warm" : "r-cold");
        const found = idsSeen.filter((id) => traceLoads.has(id));
        loads = found.length ? found.reduce((m, id) => m + traceLoads.get(id)!, 0) / found.length : null;
      }
      const row = { shape: "exchange-of-8", port: "single", reader, callers, calls: n, reads: 8, trips: 1, loads, cpuMsPerCall: cpu / n,
        wallMsP50: pct(wall, 0.5), wallMsP99: pct(wall, 0.99), callsPerSecond: n / seconds, readerCores: cpu / 1000 / seconds };
      rows.push(row); log(JSON.stringify(row));
    }
  }
  results.calibration = rows;
  writeFileSync(join(out!, "calibration.json"), JSON.stringify(rows, null, 2) + "\n");
}
// ---- Profile: where a batched call's reader CPU goes. For each shape and variant, N calls of the one-request batch at 4
// callers with "profile": the request thread's CPU by stage and the sampler's frames (gateway batch.clj), beside the
// reader process's CPU over the same calls (the rest: the HTTP server, request parse, response write, collection,
// the prefetch pool's threads).
if (phases.has("profile")) {
  const rows: unknown[] = [];
  const names = (process.env.API1_PROFILE_SHAPES ?? "subject-page,subject-page-world,task-page,task-page-world,policy-eval,policy-eval-world,subject-list").split(",");
  const variants: [string, object][] = [["legacy-parse", { legacyParse: true }], ["kept", {}], ["kept-no-prefetch", { prefetch: false }]];
  for (const reader of (process.env.API1_PROFILE_READERS ?? "warm").split(",") as ("warm" | "cold")[]) {
    const c = reader === "warm" ? warm : cold, portNo = reader === "warm" ? 8081 : 8082;
    for (const name of names) {
      const shape = shapes.find((x) => x.name === name)!;
      const n = name === "subject-list" ? 24 : reader === "warm" ? 240 : 120;
      for (let k = 0; k < 20; k++) await batch1(c, shape, ctxFor(k % accounts, 1 + (k * 13) % 40, k), {});  // warm-up (JIT and the subjects)
      for (const [label, extra] of variants) {
        const samples: Record<string, number> = {}, stagesUs: Record<string, number> = {};
        let handlerUs = 0, calls = 0, reads = 0, rowsN = 0, loads = 0;
        const pick = (k: number) => reader === "warm" ? ctxFor(k % accounts, 1 + (k * 13) % 40, k) : ctxFor(k % accounts, 41 + Math.floor(Math.random() * (people - 93)), k);
        const cpu0 = cpuMs(portNo), w0 = performance.now();
        let k = 0;
        await Promise.all(Array.from({ length: 4 }, async () => {
          while (k < n) {
            const r = await batch1(c, shape, pick(k++), { profile: true, ...extra });
            calls++; reads += r.reads; rowsN += r.rows; loads += r.loads ?? 0;
            for (const st of r.profile ?? []) {
              handlerUs += st.handlerCpuMicros;
              for (const [kk, vv] of Object.entries(st.samples ?? {})) samples[kk] = (samples[kk] ?? 0) + (vv as number);
              for (const [kk, vv] of Object.entries(st.stagesCpuMicros ?? {})) stagesUs[kk] = (stagesUs[kk] ?? 0) + (vv as number);
            }
          }
        }));
        const cpu = cpuMs(portNo) - cpu0, seconds = (performance.now() - w0) / 1000;
        const total = Object.values(samples).reduce((a, b) => a + b, 0);
        const row = { phase: "profile", reader, shape: name, variant: label, calls, readsPerCall: reads / calls, rowsPerCall: rowsN / calls, loadsPerCall: loads / calls,
          processCpuMsPerCall: cpu / calls, handlerCpuMsPerCall: handlerUs / 1000 / calls, callsPerSecond: calls / seconds,
          stagesMsPerCall: Object.fromEntries(Object.entries(stagesUs).map(([kk, vv]) => [kk, +(vv / 1000 / calls).toFixed(3)])),
          sampleShares: Object.fromEntries(Object.entries(samples).sort((a, b) => b[1] - a[1]).map(([kk, vv]) => [kk, +(vv / total).toFixed(3)])), samples: total };
        rows.push(row); log(JSON.stringify(row));
      }
    }
  }
  results.profile = rows;
  writeFileSync(join(out!, "profile.json"), JSON.stringify(rows, null, 2) + "\n");
}
// ---- Straddle: unpinned calls of the subject page under saves that change a subject's root and its first task in one
// commit (the same value on both); a call whose two values differ read two positions.
if (phases.has("straddle")) {
  const hot = Array.from({ length: 10 }, (_, k) => [k % accounts, 1 + k] as const);
  let k = 0;
  const stampSave = async () => {
    const [a, i] = hot[k % hot.length]!;
    const v = { type: "integer", value: String(5000 + k++) };
    await save(writer, `api1-stamp-${crypto.randomUUID()}`, [{ e: prefix(a) + ids.placement(i), a: ":placement/stamp", v }, { e: prefix(a) + taskId(i, 0), a: ":task/progress", v }]);
  };
  for (let n = 0; n < hot.length; n++) await stampSave();
  const valueOf = (rows: any[], attr: string) => rows.filter((x) => (x.attribute?.v ?? x.attribute) === attr).map((x) => String(x.value_string?.v ?? x.value_string)).join(",");
  const straddle: Record<string, unknown> = {};
  for (const port of ["today", "pinned", "loader", "batch1"] as Port[]) {
    let running = true, saves = 0;
    const savers = Array.from({ length: 2 }, async () => { while (running) { await stampSave(); saves++; } });
    let calls = 0, inconsistent = 0, headMoved = 0;
    const examples: unknown[] = [];
    const t = performance.now();
    await Promise.all(Array.from({ length: 16 }, async (_, seat) => {
      while (performance.now() - t < 8000) {
        const [a, i] = hot[(seat + calls) % hot.length]!;
        const ctx = ctxFor(a, i);
        const h0 = port === "today" ? await headOf(warm) : 0;
        const r = port === "today" ? await today(warm, shapes[0]!, ctx, false) : port === "pinned" ? await today(warm, shapes[0]!, ctx, true)
          : port === "loader" ? await loader(warm, shapes[0]!, ctx) : await batch1(warm, shapes[0]!, ctx);
        const h1 = port === "today" ? await headOf(warm) : 0;
        calls++;
        if (h1 !== h0) headMoved++;
        const rootRows = port === "batch1" ? (r as any).batch.find((b: any) => b.step.key === "root").answer.rows : r.answers.get("root|*|" + ctx.A + ids.placement(i))!;
        const taskRows = port === "batch1"
          ? (r as any).batch.find((b: any) => b.step.key === "tasks").answer.rows.filter((x: any) => x.entity_id.v === ctx.A + taskId(i, 0))
          : r.answers.get("tasks|*|" + ctx.A + taskId(i, 0))!;
        const s = valueOf(rootRows, ":placement/stamp"), p = valueOf(taskRows, ":task/progress");
        if (s !== p) { inconsistent++; if (examples.length < 3) examples.push({ subject: ctx.A + ids.placement(i), stamp: s, progress: p }); }
      }
    }));
    running = false; await Promise.all(savers);
    const seconds = (performance.now() - t) / 1000;
    straddle[port] = { calls, inconsistent, headMovedDuringCall: port === "today" ? headMoved : null, savesPerSecond: saves / seconds, callsPerSecond: calls / seconds, examples };
    log("straddle", port, JSON.stringify(straddle[port]));
  }
  results.straddle = straddle;
  writeFileSync(join(out!, "straddle.json"), JSON.stringify(straddle, null, 2) + "\n");
}
// ---- The server driver on this toy (a dry run of server.ts: one short window per arm, 8 callers).
if (phases.has("server")) {
  const readyFile = join(out!, "ready-toy.json");
  writeFileSync(readyFile, JSON.stringify({ version: "triplex-demo-ready/1", prefix: "toy", database: db, workingCopy: true,
    writePort: Number(new URL(writerUrl!).port), readPort: Number(new URL(warmUrl!).port), head: agedHead, recordsAtBringUp: facts,
    roster: Array.from({ length: accounts }, (_, a) => ({ account: scaleAccount(a), namespace: prefix(a), firstPerson: 0, people })) }) + "\n");
  execFileSync(process.execPath, ["--no-warnings", "--experimental-transform-types", join(import.meta.dirname, "server.ts"), readyFile, join(out!, "server-dry")],
    { stdio: "inherit", env: { ...process.env, API1_DRY: "1", API1_READER_CONTAINER: container, API1_REREAD_PER_ACCOUNT: "20" } });
}
results.batchStats = { warm: (await warm.request<any>("GET", "/v2/admin/scan-stats")).readBatch, cold: (await cold.request<any>("GET", "/v2/admin/scan-stats")).readBatch };
writeFileSync(join(out!, "results.json"), JSON.stringify(results, null, 2) + "\n");
for (const c of [warm, cold, writer]) c.close();
log("done");
if (phases.has("gate")) assert.equal(gate.differences.length, 0, "a batched answer differs from the single reads");

import assert from "node:assert/strict";
import { DatomicClient } from "../../../../packages/datomic/dist/index.js";
import { SEED_VALID_FROM } from "../../../bench/lib/world.ts";
import { fieldCount, fieldValue, taskSerial } from "../../../bench/lib/deep-world.ts";
import { command } from "../w1/group/workload.ts";
import { offers, sha } from "../w1/field/schedule.ts";
import { loadParams, productionOffers, slotAttribute, tapeReport, type ProductionOffer, type Shape } from "../w1/field/production.ts";
import { admission } from "./rolling-credits.ts";
import { scaleOwner } from "./ceiling-seed.ts";

// [DX-REAL2] Mac exactness gate for the production-shaped tape. It drives the server producer's own phase()
// (sender, rolling credits, journal check) on a toy scope seeded like the fresh cut's task-0 fields, then reads
// every touched owner back and compares each field with the last acknowledged write, computed from the tape.
// Timings here are diagnostic only.
assert.equal(process.env.DX_PREP1_LIBRARY, "1");
const { phase } = await import("./server-produce.ts");
const { wideChoose } = await import("./server-tape.ts");
type Row = Parameters<DatomicClient["transact"]>[1]["rows"][number];

const url = process.env.PREP1_PEERS!.split(",")[0]!;
const attempt = process.env.PREP1_ATTEMPT!;
assert.match(attempt, /^[a-f0-9-]{36}$/);
const client = new DatomicClient(url, 20_000);
const reader = new DatomicClient(url, 35_000);
const { params, sha256 } = loadParams(process.env.DX_REAL2_PARAMS!);
const window = Number(process.env.DX_REAL2_GATE_SECONDS ?? 30);
const rowsPerAccount = Number(process.env.DX_REAL2_GATE_ROWS ?? 90);
const scope = JSON.stringify(["triplex-scope-v1", "test", "real2-production", attempt, 0]);

function toyCell(shape: Shape, band: number) {
  const quiet = wideChoose(offers(1, window, [0]), band);
  const neighbours = productionOffers(params, shape, band, Array(9).fill(rowsPerAccount), window);
  const tape = [...quiet, ...neighbours].sort((a, b) => a.ms - b.ms || a.account - b.account || a.person - b.person);
  return { label: `${shape}-toy-loaded`, rate: 0, tape, duration: window, tapeSha: sha(tape), credits: 6 };
}
// Separate bands keep the two shapes' people apart, as separate arms do on the server.
// [DX-REAL2] Two saves over the ordered identity's 256 assertions, for one subject: 130 facts replacing the 13 or 14
// seeded fields and creating the rest (277 or more assertions), then the same 130 facts again, all replacing (394).
const wideSubject = (toyCell("S", 1).tape.find((o) => o.account === 3) ?? { person: 0 }).person;
const wideSlots = Array.from({ length: 130 }, (_, i) => i);
const wideTape = [0, 1].map((n) => ({ ms: 500 + n * 2000, account: 3, person: wideSubject, subtask: 0, ordinal: 0, extra: false,
  save: 100_000 + n, slots: wideSlots, gap: n ? 2 : 60 }));
const wideCell = { label: "S-wide-toy-loaded", rate: 0, tape: wideTape, duration: 5, tapeSha: sha(wideTape), credits: 6 };
const cellsToRun = [toyCell("R", 0), toyCell("S", 1), wideCell];
// [DX-S1] Wide saves on the per-subject writer (TX2_SUBJECT_WIDE=1 in the gateway and here), default off.
const wideSaves = process.env.TX2_SUBJECT_WIDE === "1";

const init = await client.create(scope, "lean", true, 35_000);
assert(init.created && init.strictRecordClocks);
const db = init.db;
// [DX-S2] With DX_S2_PRODUCT set, every save (the seed included) goes through the product's path (TriplesLive and the
// Datomic adapter), with the SDK's orderedSaves option off ("0") or on ("1"). Unset: the lab producer, as before.
const productMode = process.env.DX_S2_PRODUCT;
assert(productMode === undefined || productMode === "0" || productMode === "1", "DX_S2_PRODUCT is 0 or 1");
const { productSaver } = await import("../s2/product.ts");
// [DX-S3] With DX_S3_OWNERS set (only with DX_S2_PRODUCT=1), the SDK's severalOwners option off ("0") or on ("1").
const severalOwners = process.env.DX_S3_OWNERS;
assert(severalOwners === undefined || ((severalOwners === "0" || severalOwners === "1") && productMode === "1"), "DX_S3_OWNERS is 0 or 1, with DX_S2_PRODUCT=1");
const product = productMode === undefined ? undefined
  : await productSaver([url], scope, productMode === "1"
    ? { orderedSaves: true, saveSizeRule: true, ...(severalOwners === undefined ? {} : { severalOwners: severalOwners === "1" }) } : {});
const owners = new Map<string, [number, number]>();
for (const cell of cellsToRun) for (const o of cell.tape) owners.set(scaleOwner(o.account, o.person), [o.account, o.person]);
const fields = new Map<string, Row[]>();
const seedValue = new Map<string, Map<string, string>>();
let head = 0;
const list = [...owners];
for (let i = 0; i < list.length; i += 20) {
  const batch = list.slice(i, i + 20);
  const facts = batch.flatMap(([e, [, person]]) =>
    Array.from({ length: fieldCount(taskSerial(person, 0)) }, (_, f) => ({ e, a: slotAttribute(f), v: fieldValue(person, 0, f, 0) })));
  const sent = product ? await product.seed(facts, `${attempt}-seed-${i}`, SEED_VALID_FROM) : undefined;
  const change = sent ? sent.input : command(`${attempt}-seed-${i}`, facts, [], false);
  const ack = (sent ? sent.ack : await client.transact(db, change)) as unknown as { position: { v: string }; recordedAt: { v: number } };
  head = Number(ack.position.v);
  for (const [e, [, person]] of batch) {
    const rows = change.rows.filter((r) => r.entity_id === e)
      .map((r) => ({ ...r, recorded_position: head, recorded_at: ack.recordedAt.v }));
    assert.equal(rows.length, fieldCount(taskSerial(person, 0)));
    fields.set(e, rows);
    seedValue.set(e, new Map(rows.map((r) => [r.attribute, r.value_string!])));
  }
}
const legacyIds = new Set([...fields.values()].flatMap((rows) => rows.map((r) => r.id)));

const results = [];
let cut = head;
const scheduler = () => admission(10, { mode: "rolling", credits: 6 });
for (const cell of cellsToRun) {
  const started = Date.now();
  const result = await phase([client], reader, db, cut, fields, new Set(), cell, true, scheduler(), legacyIds,
    undefined, false, product?.save);
  assert(result.rows.every((row) => !row.reason || row.reason === "expired"), "a save failed");
  if (cell === wideCell) {
    // [DX-S1] With wide saves on, such a save takes a wide ordered block (23-character token); off, the general identity.
    // [DX-S2] On the product path a save of more than 128 facts keeps the runtime's IDs (the save-identity rule).
    assert(result.rows.length === 2 && result.rows.every((r) => r.receipt && (r as any).assertions > 256 &&
      (wideSaves && !product ? r.orderedToken?.length === 23 : !r.orderedToken)),
      "a save over 256 assertions was not committed whole with the expected identity");
  }
  results.push({ cell, result, wallMs: Date.now() - started });
  cut = result.after;
}

// Expected current value of every field, from the tape and the receipts alone.
const expected = new Map([...seedValue].map(([e, m]) => [e, new Map(m)]));
const acked = results.flatMap(({ cell, result }) => result.rows.filter((r) => r.receipt)
  .map((r) => ({ r, o: cell.tape[r.ordinal]! as ProductionOffer & { slots?: number[] } })))
  .sort((a, b) => a.r.receipt!.p - b.r.receipt!.p);
let factsWritten = 0;
for (const { r, o } of acked) {
  const e = scaleOwner(o.account, o.person);
  const m = expected.get(e)!;
  if (o.slots) for (const slot of o.slots) m.set(slotAttribute(slot), `${r.id}/${slot}`);
  else {
    m.set(":task/field-0", `${o.subtask}/${o.ordinal}`);
    if (o.extra) m.set(":task/field-1", r.id);
  }
  factsWritten += o.slots ? o.slots.length : 1 + Number(o.extra);
}
let fieldsChecked = 0;
for (let i = 0; i < list.length; i += 50) {
  const batch = list.slice(i, i + 50).map(([e]) => e);
  const rows = await reader.rows(db, { entityIds: batch, basis: { recordedPosition: cut, validAt: SEED_VALID_FROM } });
  const seen = new Map<string, Map<string, string[]>>();
  for (const row of rows) {
    if (!row.attribute.startsWith(":task/field-")) continue;
    const m = seen.get(row.entity_id) ?? new Map<string, string[]>();
    m.set(row.attribute, [...(m.get(row.attribute) ?? []), row.value_string!]);
    seen.set(row.entity_id, m);
  }
  for (const e of batch) {
    const want = expected.get(e)!, got = seen.get(e) ?? new Map();
    assert.deepEqual([...got.keys()].sort(), [...want.keys()].sort(), "field set differs for " + e);
    for (const [a, v] of want) {
      assert.deepEqual(got.get(a), [v], `current value differs for ${e} ${a}`);
      fieldsChecked++;
    }
  }
}
// [DX-S2] Counted work of a 20-row form through the product's path (this run's orderedSaves setting): 12 new subjects
// of 20 fields, each saved twice with all 20 fields replaced. Per save: the writer, storage reads inside the serial
// apply (the transaction's io-stats), datoms, PostgreSQL WAL bytes around the commit, and the apply time (diagnostic).
const formWork = product ? await (async () => {
  const { execFileSync } = await import("node:child_process");
  const socket = process.env.DX_S2_PG_SOCKET;
  const wal = () => socket ? Number(execFileSync("setpriv", ["--reuid=65534", "--regid=65534", "--clear-groups",
    "/opt/thin-pg/usr/local/bin/psql", "-XAtq", "-h", socket, "-U", "postgres", "-d", "datomic", "-c",
    "SELECT pg_wal_lsn_diff(pg_current_wal_insert_lsn(), '0/0')"]).toString().trim()) : NaN;
  const records: Record<string, unknown>[] = [];
  const business = (input: any, e: string) => (input.rows as Row[]).filter((r) => r.entity_id === e && input.newIds.includes(r.id));
  for (let i = 0; i < 12; i++) {
    const e = scaleOwner(5, 90_000 + i);
    const facts = (tag: string) => Array.from({ length: 20 }, (_, f) => ({ e, a: slotAttribute(f), v: { type: "string" as const, value: sha([tag, e, f]).slice(0, 57) } }));
    let rows = business((await product.seed(facts("seed"), `${attempt}-form-seed-${i}`, SEED_VALID_FROM)).input, e);
    for (const save of ["first after seed", "second"]) {
      const before = wal();
      const sent = await product.save(0, e, facts(save), rows, `${attempt}-form-${i}-${save}`);
      const after = wal();
      const ack: any = sent.ack;
      records.push({ save, writer: ack.subjectSave ? "per-subject" : "general", orderedIds: ack.subjectOrderedIds === true,
        readsInsideApply: ack.nativeIoStats?.reads ?? null, datoms: ack.datoms, walBytes: after - before,
        newIds: sent.input.newIds.length, applyMs: ack.nativeComputeMs ?? null });
      rows = business(sent.input, e);
    }
  }
  const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] ?? null;
  const by = (save: string) => {
    const xs = records.filter((r) => r.save === save) as any[];
    return { saves: xs.length, writers: Object.fromEntries(["per-subject", "general"].map((w) => [w, xs.filter((r) => r.writer === w).length])),
      orderedIds: xs.filter((r) => r.orderedIds).length,
      sqlReadsInsideApply: { total: xs.reduce((n, r) => n + (r.readsInsideApply?.sql ?? 0), 0), max: Math.max(...xs.map((r) => r.readsInsideApply?.sql ?? 0)) },
      datoms: median(xs.map((r) => r.datoms)), walBytesMedian: median(xs.map((r) => r.walBytes)),
      applyMsMedianDiagnostic: median(xs.map((r) => r.applyMs).filter((x) => typeof x === "number")) };
  };
  const one = { form: "20 fields replaced, one subject", first: by("first after seed"), second: by("second"), records };
  if (severalOwners === undefined) return one;
  // [DX-S3] The same form with two fields mapped to the subject's profile: 20 task fields and 2 profile fields
  // replaced in one save (two owners of one account), 12 subjects, two saves each.
  const twoRecords: Record<string, unknown>[] = [];
  for (let i = 0; i < 12; i++) {
    const e = scaleOwner(5, 90_100 + i), p = scaleOwner(5, 90_200 + i);
    const facts = (tag: string) => [
      ...Array.from({ length: 20 }, (_, f) => ({ e, a: slotAttribute(f), v: { type: "string" as const, value: sha([tag, e, f]).slice(0, 57) } })),
      ...Array.from({ length: 2 }, (_, f) => ({ e: p, a: `:employee/field-${f}`, v: { type: "string" as const, value: sha([tag, p, f]).slice(0, 57) } })),
    ];
    const seeded = (await product.seed(facts("seed"), `${attempt}-form2-seed-${i}`, SEED_VALID_FROM)).input;
    let rows = [...business(seeded, e), ...business(seeded, p)];
    for (const save of ["first after seed", "second"]) {
      const before = wal();
      const sent = await product.save(0, e, facts(save), rows, `${attempt}-form2-${i}-${save}`);
      const after = wal();
      const ack: any = sent.ack;
      twoRecords.push({ save, writer: ack.subjectSave ? "per-subject" : "general", orderedIds: ack.subjectOrderedIds === true,
        owners: ack.subjectOwners ?? null, declined: ack.subjectDeclined ?? null,
        readsInsideApply: ack.nativeIoStats?.reads ?? null, datoms: ack.datoms, walBytes: after - before,
        newIds: sent.input.newIds.length, applyMs: ack.nativeComputeMs ?? null });
      rows = [...business(sent.input, e), ...business(sent.input, p)];
    }
  }
  const by2 = (save: string) => {
    const xs = twoRecords.filter((r) => r.save === save) as any[];
    return { saves: xs.length, writers: Object.fromEntries(["per-subject", "general"].map((w) => [w, xs.filter((r) => r.writer === w).length])),
      orderedIds: xs.filter((r) => r.orderedIds).length,
      sqlReadsInsideApply: { total: xs.reduce((n, r) => n + (r.readsInsideApply?.sql ?? 0), 0), max: Math.max(...xs.map((r) => r.readsInsideApply?.sql ?? 0)) },
      datoms: median(xs.map((r) => r.datoms)), walBytesMedian: median(xs.map((r) => r.walBytes)),
      applyMsMedianDiagnostic: median(xs.map((r) => r.applyMs).filter((x) => typeof x === "number")) };
  };
  return { ...one, twoOwners: { form: "20 task fields and 2 profile fields replaced, two owners", first: by2("first after seed"), second: by2("second"), records: twoRecords } };
})() : undefined;

const summary = {
  attempt, paramsSha256: sha256, window, rowsPerAccount, owners: owners.size, factsWritten, fieldsChecked,
  timings: "diagnostic",
  cells: results.map(({ cell, result, wallMs }) => {
    const report = tapeReport(cell.tape, cell.duration, params);
    return {
      label: cell.label, offers: cell.tape.length, acked: result.rows.filter((r) => r.receipt).length,
      expired: result.rows.filter((r) => r.reason === "expired").length, wallMs,
      shape: report.shape, factsPerCommit: report.neighbours.factsPerCommit, saves: report.neighbours.saves,
      maxSlots: Math.max(...cell.tape.map((o) => (o as Partial<ProductionOffer>).slots?.length ?? 0)),
      maxAssertions: Math.max(0, ...result.rows.map((r) => (r as any).assertions ?? 0)),
      generalIdentity: result.rows.filter((r) => r.receipt && !r.orderedToken).length,
      // [DX-S1] Which writer took each acknowledged commit, and how many carried a wide block.
      wideIdentity: result.rows.filter((r) => r.receipt && r.orderedToken?.length === 23).length,
      subjectWriter: result.rows.filter((r) => r.receipt && (r as any).ack?.subjectSave).length,
      generalWriter: result.rows.filter((r) => r.receipt && !(r as any).ack?.subjectSave).length,
    };
  }),
};
for (const c of summary.cells) assert(c.acked > 0.9 * c.offers, "too few acknowledged saves to judge exactness");
assert(results[2]!.result.rows.every((r) => (r as any).assertions > 256));
// [DX-W3] Whether the general writer's hints were attached (present only when TX2_GENERAL_PREFETCH=1).
// [DX-W4] And the per-subject writer's hints (present only when TX2_SUBJECT_HINTS=1).
const gatewayStats = await reader.request<{ generalHints?: Record<string, number>; subjectHints?: Record<string, number> }>(
  "GET", "/v2/admin/scan-stats");
const writeOptions = await reader.request<{ options?: { generalPrefetch?: boolean; subjectHints?: unknown } }>(
  "GET", `/v1/db/${db}/write-options`).catch(() => undefined);
console.log("REAL2_GATE " + JSON.stringify({ ...summary, wideSaves,
  productPath: productMode ?? null, saveRoutes: product?.routes() ?? null,
  ...(severalOwners === undefined ? {} : { severalOwners, severalOwnersOption: (writeOptions as any)?.subjectSeveralOwners ?? null }), formWork: formWork ?? null, wideOption: (writeOptions as any)?.subjectWide ?? null, generalHints: gatewayStats.generalHints ?? null,
  generalPrefetchOption: writeOptions?.options?.generalPrefetch ?? null,
  subjectHints: gatewayStats.subjectHints ?? null, subjectHintsOption: writeOptions?.options?.subjectHints ?? null }));
await product?.close();
client.close();
reader.close();

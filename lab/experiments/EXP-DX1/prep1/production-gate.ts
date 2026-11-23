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
const cellsToRun = [toyCell("R", 0), toyCell("S", 1)];

const init = await client.create(scope, "lean", true, 35_000);
assert(init.created && init.strictRecordClocks);
const db = init.db;
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
  const change = command(`${attempt}-seed-${i}`, facts, [], false);
  const ack = (await client.transact(db, change)) as unknown as { position: { v: string }; recordedAt: { v: number } };
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
  const result = await phase([client], reader, db, cut, fields, new Set(), cell, true, scheduler(), legacyIds);
  assert(result.rows.every((row) => !row.reason || row.reason === "expired"), "a save failed");
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
    };
  }),
};
for (const c of summary.cells) assert(c.acked > 0.9 * c.offers, "too few acknowledged saves to judge exactness");
console.log("REAL2_GATE " + JSON.stringify(summary));
client.close();
reader.close();

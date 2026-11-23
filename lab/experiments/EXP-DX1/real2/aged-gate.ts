import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { DatomicClient } from "../../../../packages/datomic/dist/index.js";
import { fieldCount, fieldValue, taskSerial } from "../../../bench/lib/deep-world.ts";
import { ids, SEED_VALID_FROM } from "../../../bench/lib/world.ts";
import { command } from "../w1/group/workload.ts";
import { offers, sha } from "../w1/field/schedule.ts";
import { loadParams, productionOffers, slotAttribute, tapeReport, type Shape } from "../w1/field/production.ts";
import { admission } from "../prep1/rolling-credits.ts";
import { productionSeedFields, scaleAccount, scaleOwner, scalePredecessors } from "../prep1/ceiling-seed.ts";

// [DX-REAL2] Mac live gate for the production tape on an aged cut. PREP1's aged-live container seeds nothing itself:
// this driver seeds a SCALE1-shaped toy (every task-0 field of each person) through this branch's gateway, AGE1's own
// code at its load pin ages it, and a fresh stack reopens it. Then the arm's aged admission (scalePredecessors with all
// seeded fields), the producer's own phase() for a shape R and a shape S cell, and a read-back of every touched field.
// Timings are diagnostic only.
assert.equal(process.env.DX_PREP1_LIBRARY, "1");
assert.equal(process.env.DX_REAL2_SET, "aged");
const { phase } = await import("../prep1/server-produce.ts");
const { wideChoose } = await import("../prep1/server-tape.ts");
type Row = Parameters<DatomicClient["transact"]>[1]["rows"][number];

const [out, url] = process.argv.slice(2);
const waitFor = async (file: string, seconds: number) => {
  for (let i = 0; i < seconds * 4 && !existsSync(join(out!, file)); i++) await sleep(250);
  assert(existsSync(join(out!, file)), "timed out waiting for " + file);
};
await waitFor("ready", 300);
const { params, sha256 } = loadParams(new URL("production-shape.json", import.meta.url).pathname);
const nonce = crypto.randomUUID();
const name = "dx-scale-decision-" + nonce + "-0";
const scope = JSON.stringify(["triplex-scope-v1", "test", "test", name, 0]);
const loaderSeal = "toy-loader-seal";
const people = 50;
let client = new DatomicClient(url!, 35_000);
const init = await client.create(scope, "lean", true, 35_000);
assert(init.created && init.strictRecordClocks);
const db = init.db;
const str = (value: string) => ({ type: "string" as const, value });
const write = async (id: string, facts: { e: string; a: string; v: ReturnType<typeof str> }[]) => {
  const ack = await client.transact(db, command(id, facts));
  assert.equal(ack.operationId, id);
  return Number(ack.position.v);
};
for (let a = 0; a < 10; a++) {
  const key = scaleAccount(a);
  await write("seed-roots-" + a, [...Array.from({ length: people }, (_, i) => i), 257, 99_999].flatMap((i) => [
    { e: "acct/" + key + "/" + ids.placement(i), a: ":subject/account", v: str(key) },
    { e: "acct/" + key + "/" + ids.placement(i), a: ":subject/member", v: str(String(i)) }]));
  for (let start = 0; start < people; start += 10) {
    const facts = [];
    for (let i = start; i < start + 10; i++)
      for (let f = 0; f < fieldCount(taskSerial(i, 0)); f++)
        facts.push({ e: scaleOwner(a, i), a: slotAttribute(f), v: str(fieldValue(i, 0, f, 0).value) });
    await write("seed-fields-" + a + "-" + start, facts);
  }
}
const seedCut = await write("load1/" + sha([name, loaderSeal, 2000]) + "/1",
  [{ e: "acct/loader/terminal", a: ":loader/done", v: str("yes") }]);
writeFileSync(join(out!, "seed.json"), JSON.stringify({ db, name, seedCut }) + "\n");
client.close();

await waitFor("aged-done", 900);
const aged = JSON.parse(readFileSync(join(out!, "aged.json"), "utf8"));
assert.equal(aged.seedHead, seedCut);
const head = seedCut + aged.saves;
client = new DatomicClient(url!, 35_000);
const reader = new DatomicClient(url!, 35_000);
const opened = await client.create(scope, "lean", true, 35_000);
assert(!opened.created && opened.db === db);
const options = await client.request<any>("GET", "/v1/db/" + db + "/write-options");
assert.equal(options.position, head);
assert(options.subjectSave && options.subjectOrderedIds && options.subjectNumericOwner);

// The production tape's people, folded onto the toy's 50 per account: AGE1's edited people first (its active sample
// at floor(j × 48 / 5) and its probe, 48), so every shape writes over AGE1's rows.
const edited = [0, 9, 19, 28, 38, 48];
const order = [...edited, ...Array.from({ length: people }, (_, i) => i).filter((i) => !edited.includes(i))];
function toyCell(shape: Shape, band: number, window: number, rows: number) {
  const quiet = wideChoose(offers(1, window, [0]), band);
  const neighbours = productionOffers(params, shape, band, Array(9).fill(rows), window);
  const fold = new Map<string, number>();
  const tape = [...quiet, ...neighbours].map((o) => {
    const key = o.account + "/" + o.person;
    if (!fold.has(key)) fold.set(key, order[[...fold.keys()].filter((k) => k.startsWith(o.account + "/")).length % people]!);
    return { ...o, person: fold.get(key)! };
  }).sort((a, b) => a.ms - b.ms || a.account - b.account || a.person - b.person);
  return { label: `${shape}-aged-toy-loaded`, rate: 0, tape, duration: window, tapeSha: sha(tape), credits: 6 };
}
const cellsToRun = [toyCell("R", 0, 30, 90), toyCell("S", 1, 30, 90)];

// The arm's aged admission, with every seeded field of every person the tape touches.
const agedCut = { bundleSha256: "0".repeat(64), seedCut, physicalT: 1, records: 1, nativeId: "toy", active: aged.active,
  people, tapeSaves: aged.saves, lastOperation: aged.lastOperation, lastTransaction: aged.lastTransaction,
  lastRecordedAt: aged.lastRecordedAt };
const seed = { db, scope, head, loaderSeal, storage: "pg-data" as const, aged: agedCut } as any;
const targets = [...new Map(cellsToRun.flatMap((c) => c.tape).map((o) => [o.account + "/" + o.person,
  { account: o.account, person: o.person }])).values()];
const { fields, proof } = await scalePredecessors(reader, seed, targets, productionSeedFields);
const agedRows = [...fields.values()].flat().filter((r) => r.recorded_position > seedCut);
assert(agedRows.length > 0 && proof.aged!.rows === agedRows.length && proof.members === 40);
assert([...fields].every(([, rows]) => rows.length >= 13), "a person lost seeded fields");
// One tampered aged row is refused by the same read.
const tampered = new Proxy(reader, { get: (t, k) => {
  const f = (t as any)[k];
  if (k === "rows") return async (...args: any[]) => (await f.apply(t, args)).map((r: Row) =>
    r.recorded_position > seedCut ? { ...r, value_string: "0" + r.value_string!.slice(1) } : r);
  return typeof f === "function" ? f.bind(t) : f;
} });
await assert.rejects(scalePredecessors(tampered as DatomicClient, seed, targets, productionSeedFields));

const initial = new Map([...fields].map(([e, rows]) => [e, new Map(rows.map((r) => [r.attribute, r.value_string!]))]));
const legacyIds = new Set([...fields.values()].flatMap((rows) => rows.map((r) => r.id)));
const results = [];
let cut = head;
for (const cell of cellsToRun) {
  const started = Date.now();
  const result = await phase([client], reader, db, cut, fields as Map<string, Row[]>, new Set(), cell, true,
    admission(10, { mode: "rolling", credits: 6 }), legacyIds);
  assert(result.rows.every((row) => !row.reason || row.reason === "expired"), "a save failed");
  results.push({ cell, result, wallMs: Date.now() - started });
  cut = result.after;
}

// Expected current fields from the admitted predecessors and the acknowledged writes alone.
const expected = new Map([...initial].map(([e, m]) => [e, new Map(m)]));
const acked = results.flatMap(({ cell, result }) => result.rows.filter((r) => r.receipt)
  .map((r) => ({ r, o: cell.tape[r.ordinal]! as any }))).sort((a, b) => a.r.receipt!.p - b.r.receipt!.p);
let overAged = 0;
for (const { r, o } of acked) {
  const e = scaleOwner(o.account, o.person);
  const m = expected.get(e)!;
  const slots: number[] = o.slots ?? [0, ...(o.extra ? [1] : [])];
  for (const slot of slots) {
    if (agedRows.some((row) => row.entity_id === e && row.attribute === slotAttribute(slot) && m.get(row.attribute) === row.value_string)) overAged++;
    m.set(slotAttribute(slot), o.slots ? `${r.id}/${slot}` : slot === 0 ? `${o.subtask}/${o.ordinal}` : r.id);
  }
}
assert(overAged > 0, "no acknowledged write replaced an AGE1 row");
let fieldsChecked = 0;
const owners = [...expected.keys()];
for (let i = 0; i < owners.length; i += 50) {
  const batch = owners.slice(i, i + 50);
  const rows = await reader.rows(db, { entityIds: batch, basis: { recordedPosition: cut, validAt: SEED_VALID_FROM } });
  for (const e of batch) {
    const got = new Map<string, string[]>();
    for (const row of rows.filter((x) => x.entity_id === e && x.attribute.startsWith(":task/field-")))
      got.set(row.attribute, [...(got.get(row.attribute) ?? []), row.value_string!]);
    const want = expected.get(e)!;
    assert.deepEqual([...got.keys()].sort(), [...want.keys()].sort(), "field set differs for " + e);
    for (const [a, v] of want) {
      assert.deepEqual(got.get(a), [v], `current value differs for ${e} ${a}`);
      fieldsChecked++;
    }
  }
}
const result = {
  gate: "real2-aged-live", paramsSha256: sha256, seedCut, head, agingSaves: aged.saves, active: aged.active,
  owners: owners.length, agedRowsAdmitted: agedRows.length, tamperedAgedRowRefused: true, writesOverAgedRows: overAged,
  fieldsChecked, finalCut: cut, timings: "diagnostic",
  cells: results.map(({ cell, result, wallMs }) => {
    const report = tapeReport(cell.tape, cell.duration, params);
    return { label: cell.label, offers: cell.tape.length, acked: result.rows.filter((r) => r.receipt).length,
      expired: result.rows.filter((r) => r.reason === "expired").length, wallMs, shape: report.shape,
      factsPerCommit: report.neighbours.factsPerCommit,
      orderedAcks: result.rows.filter((r) => (r as any).ack?.subjectOrderedIds).length };
  }),
};
writeFileSync(join(out!, "result.json"), JSON.stringify(result, null, 2) + "\n");
console.log("REAL2_AGED_GATE " + JSON.stringify(result));
for (const c of result.cells) {
  assert(c.acked + c.expired === c.offers, `${c.label}: an offer neither acknowledged nor expired`);
  assert(c.acked >= 0.9 * c.offers, `${c.label}: ${c.acked} of ${c.offers} acknowledged`);
  assert.equal(c.orderedAcks, c.acked, `${c.label}: ${c.orderedAcks} of ${c.acked} acknowledgements on the ordered writer`);
}
client.close();
reader.close();
writeFileSync(join(out!, "finished"), "ok\n");

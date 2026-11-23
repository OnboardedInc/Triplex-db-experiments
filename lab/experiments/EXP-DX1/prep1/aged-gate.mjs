// [DX-PREP1] Mac gate: the aged predecessor check accepts rows from AGE1's replay tape and refuses tampered ones.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { agedJournal, scaleOwner, scalePredecessors } from "./ceiling-seed.ts";
import { decodeRowText, encodeRowText } from "../../../../packages/datomic/dist/rowText.js";

const oracle = JSON.parse(readFileSync(process.argv[2], "utf8"));
const cut = oracle.seedHead, head = cut + oracle.saves;
const pad25 = (n) => String(n).padStart(25, "0");
const last = "_tx/T" + pad25(oracle.saves - 1);
const base = { id: "x", entity_id: last, attribute: ":_tx/command-id", value_type: "string", value_number: null,
  value_boolean: null, value_datetime: null, value_json: null, valid_from: 0, valid_to: null, retracted_at: null,
  retracted_position: null, retract_tx_id: null, schema_version: 1, entity_type: "_Transaction", created_by: null };
const journal = oracle.lastJournal;
assert.deepEqual([journal.tx, journal.operation, journal.position], [last, "age-save-" + (oracle.saves - 1), head]);
const aged = { bundleSha256: "0".repeat(64), seedCut: cut, physicalT: 1, records: 1, nativeId: "toy",
  active: oracle.active, people: oracle.people, tapeSaves: oracle.saves, lastOperation: journal.operation,
  lastTransaction: last, lastRecordedAt: journal.clock };
// Reproduce the server refusal on the bytes AGE1's encoder writes.
// AGE1's JSON writer escapes "/" as "\\/".
const positionText = journal.texts.find((t) => JSON.parse(t.slice(t.indexOf("[")))[3] === ":_tx/position");
let reproduced = "";
try { decodeRowText(positionText); } catch (error) { reproduced = error.message; }
assert.equal(reproduced, "Journal position payload must be null");
const journalRows = agedJournal(journal.texts, aged, head);
const journalRefusals = [];
for (const [name, edit] of [
  ["position payload", (t) => t === positionText ? t.replace(/"number",null,[0-9.E]+,/, '"number",null,1.0,') : t],
  ["command", (t) => t.replace(journal.operation, "age-save-0")],
  ["record clock", (t) => t.replace(/"datetime",null,null,null,[0-9.E]+,/, '"datetime",null,null,null,1.0,')],
  ["dropped row", null],
]) {
  const texts = edit ? journal.texts.map(edit) : journal.texts.slice(1);
  assert.notDeepEqual(texts, journal.texts);
  assert.throws(() => agedJournal(texts, aged, head));
  journalRefusals.push(name);
}
const scope = JSON.stringify(["triplex-scope-v1", "test", "test", "toy", 0]);
const seed = { db: "toy", scope, head, loaderSeal: "s", storage: "pg-data", aged };
const owners = new Map(oracle.owners.map((o) => [scaleOwner(o.account, o.person), o]));
const loaderCommand = "load1/" + "x";

function peer(tamper) {
  return {
    request: async (_m, _p, { after }) => after === cut - 1
      ? { transactions: [["_tx/load", cut, [encodeRowText({ ...base, entity_id: "_tx/load", value_string: loaderCommand,
          recorded_position: cut, recorded_at: 1 })]]] }
      : { transactions: [[last, head, journal.texts]] },
    claim: async (_db, command) => command === aged.lastOperation ? last : "_tx/load",
    rows: async (_db, { entityIds, pattern: { attribute }, basis }) => entityIds.map((entity) => {
      if (attribute === ":subject/account") return { ...base, id: entity, entity_id: entity, attribute,
        value_string: entity.split("/")[1], recorded_position: cut };
      assert.equal(basis.recordedPosition, head);
      const row = owners.get(entity).rows.find((r) => r.attribute === attribute);
      const out = { ...base, ...row, value_type: "string", entity_type: null };
      return tamper ? tamper(out) : out;
    }),
  };
}
const targets = oracle.owners.map(({ account, person }) => ({ account, person }));
const edited = oracle.owners.flatMap((o) => o.rows.slice(0, 2)).filter((r) => r.recorded_position > cut).length;
// The loader-command prefix check belongs to the fresh seed and is covered by the unit test; skip it here.
const { sha } = await import("../w1/field/schedule.ts");
seed.loaderSeal = "s";
const prefix = "load1/" + sha([JSON.parse(scope)[3], "s", 2000]) + "/";
const fixed = (p) => ({ ...p, request: async (...a) => {
  const r = await p.request(...a);
  if (a[2].after === cut - 1) r.transactions[0][2] = [encodeRowText({ ...base, entity_id: "_tx/load",
    value_string: prefix + "1", recorded_position: cut, recorded_at: 1 })];
  return r;
}, claim: async (db, command, at) => command === prefix + "1" ? "_tx/load" : p.claim(db, command, at) });
const { proof } = await scalePredecessors(fixed(peer()), seed, targets);
assert.equal(proof.aged.rows, edited);
const refusals = [];
for (const [name, tamper] of [
  ["value", (r) => r.recorded_position > cut ? { ...r, value_string: r.value_string.replace(/^./, (c) => c === "a" ? "b" : "a") } : r],
  ["id", (r) => r.recorded_position > cut ? { ...r, id: r.id.slice(0, -1) + "9" } : r],
  ["position", (r) => r.recorded_position > cut ? { ...r, recorded_position: r.recorded_position - 1 } : r],
  ["seed value", (r) => r.recorded_position <= cut ? { ...r, value_string: "x" + r.value_string.slice(1) } : r],
]) {
  await assert.rejects(scalePredecessors(fixed(peer(tamper)), seed, targets));
  refusals.push(name);
}
console.log(JSON.stringify({ gate: "aged-predecessors", reproduced, journalRows, journalRefusals,
  owners: owners.size, editedRows: edited, seedRows: oracle.owners.length * 2 - edited, accepted: true, refused: refusals }));

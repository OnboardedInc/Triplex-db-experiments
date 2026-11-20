import assert from "node:assert/strict";
import type { DatomicClient } from "../../../../../packages/datomic/dist/index.js";
import { decodeRowText } from "../../../../../packages/datomic/dist/rowText.js";

type Sample = { id: string; position: number; t: string };
type NativeAnswer = { rows: { t: string; v: string }[][] };
const attrs = [":_tx/change", ":_tx/changed-entity"] as const;
const sort = <T>(items: T[]) => items.map((item) => JSON.stringify(item)).sort();

// [DX-W1] Why: bind the read surfaces to a measured command after the timed windows.
// Rejected: a flag-only health check or a prewritten journal fixture unrelated to the measured scope.
export async function verifyJournalRead(
  client: DatomicClient,
  db: string,
  sample: Sample,
  packed: boolean,
) {
  const { id, position, t } = sample;
  const tx = await client.claim(db, id, position);
  assert(tx, "Missing command claim at the witness position");
  const operation = await client.operation(db, id);
  assert.deepEqual(
    [operation.status, operation.operationId, operation.position?.v, operation.t?.v],
    ["committed", id, String(position), t],
  );
  const basis = { recordedPosition: position, validAt: 1e15 };
  const journal = await client.request<{ rows: string[] }>("POST", `/v2/db/${db}/journal`, {
    txId: tx,
    basis: { recordedPosition: position },
    recordedOnly: true,
  });
  assert(Array.isArray(journal.rows));
  const rows = journal.rows.map(decodeRowText);
  const changes = rows.filter((row) => row.attribute === attrs[0]);
  const owners = rows.filter((row) => row.attribute === attrs[1]);
  assert(changes.length && owners.length);
  assert(rows.every((row) => row.entity_id === tx && row.recorded_position === position));
  const slices = [];
  for (const attr of attrs) {
    const typedRows = rows.filter((row) => row.attribute === attr);
    const expected = sort(
      typedRows.map((row) => [row.id, attr === attrs[0] ? row.value_json : row.value_string]),
    );
    const ordinary = await client.rows(db, { pattern: { entityId: tx, attribute: attr }, basis });
    const matched = sort(
      ordinary.map((row) => [row.id, attr === attrs[0] ? row.value_json : row.value_string]),
    );
    const result: NativeAnswer = await client.request<NativeAnswer>("POST", `/v1/db/${db}/q`, {
      basis,
      relations: [],
      edn: `[:find ?id ?v :in $ $rules :where
          [?s :triplex.entity/id ${JSON.stringify(tx)}] [?f :f/subject ?s] [?f :f/id ?id]
          [?f :f/attr ?a] [?a :triplex.attr/key ${JSON.stringify(attr)}]
          [(triplex.gateway.query/scalar $ ?f) ?v]]`,
    });
    assert(result.rows.every((r) => r.length === 2 && r.every((v) => v.t === "string")));
    const native = sort(result.rows.map((r) => r.map((v) => v.v)));
    assert.deepEqual(native, matched);
    if (packed) assert.deepEqual(native, []);
    else assert.deepEqual(native, expected);
    slices.push({ attr, expected, matched, native });
  }
  const [entry, ...rest] = (await client.log(db, t, 1)).rows;
  assert(!rest.length && entry?.kind === "commit" && entry.t === t);
  assert(
    entry.transaction.positions.includes(String(position)) && entry.transaction.txIds.includes(tx),
  );
  assert(entry.transaction.commandIds.includes(id));
  const fromLog = entry.transaction.changes.filter((row) => row.position === String(position));
  const expectedChanges = changes
    .map((row) => JSON.parse(row.value_json!))
    .map((change) => [
      change.op,
      change.tripleId,
      change.entityId,
      change.attribute,
      change.validFrom,
      change.validTo ?? null,
    ]);
  assert.deepEqual(
    sort(
      fromLog.map((row) => [
        row.op,
        row.assertionId,
        row.entity,
        row.attribute,
        row.validFrom,
        row.validTo,
      ]),
    ),
    sort(expectedChanges),
  );
  return { db, sample, tx, slices, applicationChanges: fromLog };
}

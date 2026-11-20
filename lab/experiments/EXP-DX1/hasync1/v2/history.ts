import assert from "node:assert/strict";
import { deepOwnFacts } from "../../../../bench/lib/deep-world.ts";
import { SEED_VALID_FROM, type Fact } from "../../../../bench/lib/world.ts";
import { immutable, type Account, type Receipt } from "../../ha1/one-db.ts";
import {
  type DatomicClient,
  type Input,
} from "../../../../../packages/datomic/test/ha1-account.ts";
import { hash, type Evidence } from "../../ha1/common.ts";
import type { Checkpoint } from "../seed.ts";

type Row = Input["rows"][number];
type Version = { row: Row; receipt: Receipt };
export type History = {
  editedSubjects: number;
  revisions: number;
  retired: number;
  receipts: Receipt[];
  samples: { old: Version; current: Version }[];
};
const editSample = (i: number) => i % 5 === 0;
const status = ":placement/status";
const key = "deep/";
const position = (r: Receipt) => Number(r.position.v);
const point = (r: Receipt) => ({
  basisT: r.t.v,
  basis: { recordedPosition: position(r), validAt: SEED_VALID_FROM },
});

export function deepRow(fact: Fact, id: string, tx: string, stamp: number): Row {
  const v = fact.v;
  return {
    id,
    entity_id: key + fact.e,
    entity_type: "Subject",
    attribute: fact.a,
    value_type: v.type,
    value_string: typeof v.value === "string" ? (v.type === "ref" ? key + v.value : v.value) : null,
    value_number: null,
    value_datetime: v.type === "datetime" ? v.value : null,
    value_boolean: v.type === "boolean" ? Number(v.value) : null,
    value_json: v.type === "blob" ? JSON.stringify({ mimeType: v.mimeType, size: v.size }) : null,
    recorded_at: stamp,
    recorded_position: 1,
    valid_from: SEED_VALID_FROM,
    valid_to: null,
    created_by: null,
    retracted_at: null,
    retracted_position: null,
    retract_tx_id: null,
    schema_version: 1,
    tx_id: tx,
  };
}

export function shouldEdit(row: Row) {
  const subject = /^deep\/pl:(\d{8})$/.exec(row.entity_id);
  return row.attribute === status && subject !== null && editSample(Number(subject[1]));
}

export async function auditHistory(ac: Account, history: History, client = ac.r) {
  for (const sample of history.samples) {
    for (const v of [sample.old, sample.current]) {
      const rows = await client.rows(ac.db, { entityIds: [v.row.entity_id], ...point(v.receipt) });
      const matched = rows.filter((r) => r.attribute === status);
      // [DX-HASYNC1] Why: old and new status values must agree at their respective original cuts. Rejected: checking only a populator's issued IDs and counts.
      assert.deepEqual(
        matched.map((r) => [r.id, r.value_type, r.value_string, r.tx_id, r.recorded_position]),
        [[v.row.id, v.row.value_type, v.row.value_string, v.row.tx_id, v.row.recorded_position]],
      );
    }
  }
  return history.samples.length * 2;
}

export async function editHistory(e: Evidence, ac: Account, origins: Version[], deadline: number) {
  assert(origins.length && origins.every((v) => v.row.attribute === status));
  origins.sort((a, b) => a.row.entity_id.localeCompare(b.row.entity_id));
  const current = origins.slice();
  const receipts: Receipt[] = [];
  const revisions = 3;
  let block = 0;
  for (let rev = 1; rev <= revisions; rev++) {
    for (let i = 0; i < current.length; i += 96) {
      assert(performance.now() < deadline, "History preparation exceeded the lease budget");
      const old = current.slice(i, i + 96);
      const op = ac.key + "-edit-" + block;
      const tx = op + "/tx",
        stamp = 750000 + block++;
      const newRows = old.map(({ row }, j) => ({
        ...row,
        id: op + "/" + j,
        value_string: "field-revision-" + rev,
        recorded_at: stamp,
        recorded_position: 1,
        tx_id: tx,
      }));
      const committed = immutable(
        await ac.w.transact(ac.db, {
          operationId: op,
          attemptId: op + "/first",
          sourceK: null,
          scopeWide: false,
          assignRecordTime: false,
          position: 1,
          span: 1,
          rows: [
            ...old.map(({ row }) => ({
              ...row,
              retracted_at: stamp,
              retracted_position: 1,
              retract_tx_id: tx,
            })),
            ...newRows,
          ],
          newIds: newRows.map((r) => r.id),
          claims: [{ commandId: op + "/claim", txId: tx, timestamp: stamp }],
        }),
      );
      assert.equal(committed.operationId, op);
      assert.equal(committed.recordedAt.v, stamp);
      receipts.push(committed);
      for (const [j, row] of newRows.entries())
        current[i + j] = {
          row: { ...row, recorded_position: position(committed) },
          receipt: committed,
        };
    }
  }
  const samples = [...new Set([0, Math.floor(current.length / 2), current.length - 1])].map(
    (i) => ({ old: origins[i]!, current: current[i]! }),
  );
  const result: History = {
    editedSubjects: current.length,
    revisions,
    retired: current.length * revisions,
    receipts,
    samples,
  };
  e.write("edit-ledger", result);
  await auditHistory(ac, result);
  return result;
}

function deepRead(ac: Account, people: number, original: Receipt, ordinal: number) {
  assert(people >= 5);
  // [DX-HASYNC1] Why: verify first-touch subjects with authored values at a fixed cut. Rejected: repeating only the warmed witness throughout the outage.
  const i = (ordinal * 991 + 17) % people;
  const subject = editSample(i) ? (i + 1) % people || 1 : i;
  const facts = deepOwnFacts(subject);
  const normalized = (r: Row) =>
    JSON.stringify([
      r.entity_id,
      r.attribute,
      r.value_type,
      (
        {
          number: r.value_number,
          boolean: r.value_boolean,
          datetime: r.value_datetime,
          blob: [r.value_string, r.value_json],
          json: r.value_json,
        } as Record<string, unknown>
      )[r.value_type] ?? r.value_string,
      r.valid_from,
      r.valid_to,
    ]);
  const expect = facts.map((f) => normalized(deepRow(f, "", "", 0))).sort();
  const entities = [...new Set(facts.map((f) => key + f.e))];
  return {
    identity: { subject, t: original.t.v, sha256: hash(JSON.stringify(expect)) },
    async query(client: DatomicClient) {
      const rows = await client.rows(ac.db, { entityIds: entities, ...point(original) });
      assert.deepEqual(rows.map(normalized).sort(), expect);
    },
  };
}

export function historyRead(ac: Account, cp?: Checkpoint) {
  const receipt = cp?.history?.receipts.at(-1);
  if (!cp || !receipt) return;
  return (ordinal: number) =>
    ordinal % 25 === 0 ? deepRead(ac, cp.people, receipt, ordinal / 25) : undefined;
}

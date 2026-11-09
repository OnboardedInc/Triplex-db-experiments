import { Effect, Option } from "effect";
import { unsafe, type Triple } from "@triplex-build/triplex";
import {
  StorageAdapter,
  decodeValueColumns,
  storedValueDomain,
  ValueDomains,
} from "@triplex-build/triplex/runtime";
import { decodeRowTextArray } from "./rowText.js";

// [EXP-DX1] Why: use the core BFS over rows in the same ordering as queryRows.
// Rejected: gateway datom order (differs from recorded_at/id ordering and changes BFS order).
export const reachResponse = (
  root: string,
  response: { rows: unknown[]; entities: number; visited: string[] },
) => {
  const map = new Map<string, Triple[]>(response.visited.map((id) => [id, []]));
  const rows = response.rows
    .map(decodeRowTextArray)
    .sort((a, b) => a.recorded_at - b.recorded_at || a.id.localeCompare(b.id));
  for (const row of rows) {
    const t = {
      id: row.id,
      entityId: row.entity_id,
      attribute: row.attribute,
      value: decodeValueColumns(row, storedValueDomain(ValueDomains.datomic, row.attribute)),
      recordedAt: row.recorded_at,
      validFrom: row.valid_from,
      validTo: row.valid_to === null ? Option.none() : Option.some(row.valid_to),
      createdBy: row.created_by ? Option.some(row.created_by) : Option.none(),
      retractedAt: Option.none(),
      entityType: row.entity_type ? Option.some(row.entity_type) : Option.none(),
      schemaVersion: row.schema_version ? Option.some(row.schema_version) : Option.none(),
      txId: row.tx_id ? Option.some(unsafe.transactionId(row.tx_id)) : Option.none(),
      retractTxId: Option.none(),
    } as Triple;
    if (!map.has(row.entity_id)) map.set(row.entity_id, []);
    map.get(row.entity_id)!.push(t);
  }
  const visited = new Set(response.visited);
  if (
    !visited.has(root) ||
    visited.size !== response.entities ||
    rows.some(
      (r) => !visited.has(r.entity_id) || (r.value_type === "ref" && !visited.has(r.value_string!)),
    )
  )
    throw new Error("Fast reach entity coverage mismatch");
  return StorageAdapter.reachBy((ids) => Effect.succeed(ids.map((id) => map.get(id) ?? [])), root);
};

import { unsafe } from "@triplex-build/triplex";
import {
  decodeValueColumns,
  storedValueDomain,
  ValueDomains,
} from "@triplex-build/triplex/runtime";
import { decodeRowText, decodeRowTextColumns } from "../rowText.js";
import type { ReplicaRow } from "./packed.js";

// [DX-R2] Why: bootstrap retains packed rows; frozen Triples/Options and sorted physical-row copies are temporary overhead.
// Rejected: skipping the production column/value validators to improve bootstrap time.
export function decodeReplicaRows(
  id: string,
  revision: number,
  wire: unknown[],
  cut: number,
): ReplicaRow[] {
  const seen = new Set<string>();
  const decoded = wire.map((values) =>
    typeof values === "string" ? decodeRowText(values) : decodeRowTextColumns(values, "2"),
  );
  decoded.sort((a, b) => a.recorded_at - b.recorded_at || a.id.localeCompare(b.id));
  const rows = decoded.map((row) => {
    if (
      row.entity_id !== id ||
      seen.has(row.id) ||
      row.recorded_position < 1 ||
      row.recorded_position > cut
    )
      throw new TypeError("Replica row binding/position mismatch");
    seen.add(row.id);
    return {
      id: row.id,
      entityId: id,
      attribute: row.attribute,
      value: decodeValueColumns(row, storedValueDomain(ValueDomains.datomic, row.attribute)),
      position: row.recorded_position,
      // [DX-R3] Why: source public metadata is part of the fast-path answer, not an optional projection.
      // Rejected: reconstructing metadata from journal clocks (old rows retain their own assertion receipt).
      publicMetadata: {
        recordedAt: row.recorded_at,
        createdBy: row.created_by,
        entityType: row.entity_type,
        schemaVersion: row.schema_version,
        txId: row.tx_id ? unsafe.transactionId(row.tx_id) : null,
      },
      validFrom: row.valid_from,
      ...(row.valid_to === null ? {} : { validTo: row.valid_to }),
    };
  });
  if (rows.length && revision === 0) throw new TypeError("Missing nonempty revision");
  if (!rows.length && revision !== 0) throw new TypeError("Invalid empty revision");
  return rows;
}

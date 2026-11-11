import {
  decodeValueColumns,
  storedValueDomain,
  ValueDomains,
} from "@triplex-build/triplex/runtime";
import { decodeRowText, decodeRowTextColumns } from "../rowText.js";
import type { SweepRow } from "../sweepRows.js";

// [DX-R2] Why: bootstrap retains packed rows; frozen Triples/Options and sorted physical-row copies are temporary overhead.
// Rejected: skipping the production column/value validators to improve bootstrap time.
export function decodeReplicaRows(
  id: string,
  revision: number,
  wire: unknown[],
  cut: number,
): SweepRow[] {
  const seen = new Set<string>();
  const rows = wire.map((values) => {
    const row =
      typeof values === "string" ? decodeRowText(values) : decodeRowTextColumns(values, "2");
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
      validFrom: row.valid_from,
      ...(row.valid_to === null ? {} : { validTo: row.valid_to }),
    };
  });
  if (!rows.length && revision !== 0) throw new TypeError("Invalid empty revision");
  return rows;
}

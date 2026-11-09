import { Option } from "effect";
import {
  unsafe,
  type Triple,
  type ResolvedTemporalBasis,
  type ReachResult,
} from "@triplex-build/triplex";
import {
  decodeValueColumns,
  storedValueDomain,
  ValueDomains,
} from "@triplex-build/triplex/runtime";
import { decodeRowText, decodeRowTextColumns } from "./rowText.js";

export interface CachedEntity {
  readonly rev: number;
  readonly rows: readonly Triple[];
}
export interface ReachWire {
  declined?: string;
  position: number;
  t: string;
  reset: boolean;
  entities: unknown[];
  closures: [string, string[]][];
}
// [DX-B2-N2] Why: callers share cached Triples including nested JSON and Option values.
// Rejected: shallow freezing (a caller could change later pulls through value.value).
const freeze = <T>(value: T): T => {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
};
export function decodeEntity(id: string, rev: number, wire: unknown[]): CachedEntity {
  const rows = wire.map((values) => {
    const row =
      typeof values === "string" ? decodeRowText(values) : decodeRowTextColumns(values, "2");
    if (row.entity_id !== id) throw new TypeError("Reach entity binding mismatch");
    // Validate the value domain exactly once; retain the decoded value in the cached Triple.
    const value = decodeValueColumns(row, storedValueDomain(ValueDomains.datomic, row.attribute));
    return freeze({
      id: row.id,
      entityId: row.entity_id,
      attribute: row.attribute,
      value,
      recordedAt: row.recorded_at,
      validFrom: row.valid_from,
      validTo: row.valid_to === null ? Option.none() : Option.some(row.valid_to),
      createdBy: row.created_by ? Option.some(row.created_by) : Option.none(),
      retractedAt: Option.none(),
      entityType: row.entity_type ? Option.some(row.entity_type) : Option.none(),
      schemaVersion: row.schema_version ? Option.some(row.schema_version) : Option.none(),
      txId: row.tx_id ? Option.some(unsafe.transactionId(row.tx_id)) : Option.none(),
      retractTxId: Option.none(),
    } as Triple);
  });
  rows.sort((a, b) => a.recordedAt - b.recordedAt || a.id.localeCompare(b.id));
  if (new Set(rows.map((row) => row.id)).size !== rows.length || (rows.length === 0 && rev !== 0))
    throw new TypeError("Invalid reach row set");
  return { rev, rows: Object.freeze(rows) };
}
// [DX-B2-N2] Why: the core's BFS ordering depends on recordedAt/id order, not EAVT order.
// Rejected: concatenating gateway entities in datom visit order (changes ref visitation).
export function reachResponse(
  root: string,
  entities: ReadonlyMap<string, CachedEntity>,
  basis: ResolvedTemporalBasis,
): ReachResult {
  const seen = new Set<string>([root]);
  const triples: Triple[] = [];
  let todo = [root],
    hops = 0;
  while (todo.length) {
    hops++;
    const next: string[] = [];
    for (const id of todo) {
      const entity = entities.get(id);
      if (!entity) throw new TypeError("Fast reach entity coverage mismatch");
      for (const row of entity.rows) {
        if (
          row.validFrom > basis.validAt ||
          (Option.isSome(row.validTo) && row.validTo.value <= basis.validAt)
        )
          continue;
        triples.push(row);
        if (row.value.type === "ref" && !seen.has(row.value.value)) {
          seen.add(row.value.value);
          next.push(row.value.value);
        }
      }
    }
    todo = next;
  }
  return { triples, hops };
}

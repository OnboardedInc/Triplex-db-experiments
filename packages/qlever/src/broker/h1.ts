// [EXP-QH1] Why: one SQL-built tuple text becomes Triples directly, with no TripleRow churn.
// Rejected: JSON REAL numbers (Q105b) and per-row structured clones (R46 2.2).
import { Option } from "effect";
import type { Triple, ResolvedTemporalBasis } from "@triplex-build/triplex";
import {
  decodeValueColumns,
  decodedPrimitiveValue,
  storedValueDomain,
  ValueDomains,
  type TripleRow,
} from "@triplex-build/triplex/runtime";

export interface WholePull {
  readonly snapshot: { readonly position: number; readonly h: number };
  readonly basis: number;
  readonly entities: readonly string[];
  readonly text: string;
  readonly counters: {
    readonly hops: number;
    readonly rows: number;
    readonly bytes: number;
    readonly statements: number;
  };
}
export type H1Tuple = readonly any[];
const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const idFromHex = (hex: string) => {
  let result = "",
    accumulator = 0,
    bits = 2;
  for (let i = 0; i < hex.length; i += 2) {
    accumulator = (accumulator << 8) | Number.parseInt(hex.slice(i, i + 2), 16);
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      result += alphabet[(accumulator >>> bits) & 31];
    }
  }
  return result;
};
export const h1TupleId = (t: H1Tuple): string => (t[0] ? idFromHex(t[1]) : t[1]);
const optional = <A>(value: A | null) => (value === null ? Option.none<A>() : Option.some(value));
export const h1Rows = (
  tuples: readonly H1Tuple[],
  basis: ResolvedTemporalBasis,
): ReadonlyMap<string, readonly Triple[]> => {
  const result = new Map<string, Triple[]>();
  for (const t of tuples) {
    const fallback = t[14];
    let triple: Triple;
    if (fallback) {
      const row = fallback.row as TripleRow;
      for (const [key, tag] of fallback.special)
        (row as any)[key] = tag === "undefined" ? undefined : tag === "-0" ? -0 : Number(tag);
      if (
        row.valid_from > basis.validAt ||
        (row.valid_to !== null && row.valid_to <= basis.validAt)
      )
        continue;
      triple = {
        id: row.id,
        entityId: row.entity_id,
        attribute: row.attribute,
        value: decodeValueColumns(row, storedValueDomain(ValueDomains.qlever, row.attribute)),
        recordedAt: row.recorded_at,
        validFrom: row.valid_from,
        validTo: optional(row.valid_to),
        createdBy: row.created_by ? Option.some(row.created_by) : Option.none(),
        retractedAt: Option.none(),
        entityType: row.entity_type ? Option.some(row.entity_type) : Option.none(),
        schemaVersion: row.schema_version ? Option.some(row.schema_version) : Option.none(),
        txId: row.tx_id ? Option.some(row.tx_id) : Option.none(),
        retractTxId: Option.none(),
      } as Triple;
    } else {
      if (Number(t[8]) > basis.validAt || (t[9] !== null && Number(t[9]) <= basis.validAt))
        continue;
      const type =
        ["string", "number", "boolean", "datetime", "json", "ref", "integer"][t[4]] ??
        (t[4] === 8 ? "number" : "datetime");
      const payload =
        t[4] === 8
          ? t[7]
          : t[4] === 9
            ? Number(t[6])
            : t[4] === 1 || t[4] === 3
              ? Number(t[5])
              : t[4] === 2
                ? t[5] === 1
                  ? true
                  : t[5] === 0
                    ? false
                    : undefined
                : t[4] === 4
                  ? JSON.parse(t[5])
                  : t[5];
      const value = decodedPrimitiveValue(
        type!,
        payload,
        storedValueDomain(ValueDomains.qlever, t[3]),
      );
      triple = {
        id: h1TupleId(t),
        entityId: t[2],
        attribute: t[3],
        value,
        recordedAt: Number(t[6]),
        validFrom: Number(t[8]),
        validTo: optional(t[9] === null ? null : Number(t[9])),
        createdBy: t[10] ? Option.some(t[10]) : Option.none(),
        retractedAt: Option.none(),
        entityType: t[11] ? Option.some(t[11]) : Option.none(),
        schemaVersion: Number(t[12]) ? Option.some(Number(t[12])) : Option.none(),
        txId: t[13] ? Option.some(t[13]) : Option.none(),
        retractTxId: Option.none(),
      } as Triple;
    }
    const bucket = result.get(triple.entityId) ?? [];
    bucket.push(triple);
    result.set(triple.entityId, bucket);
  }
  // Same stable tie breaker as the row route. Sorting per entity avoids a second full-reach sort.
  for (const bucket of result.values())
    bucket.sort((a, b) => a.recordedAt - b.recordedAt || a.id.localeCompare(b.id));
  return result;
};

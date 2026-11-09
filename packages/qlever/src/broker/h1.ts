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
  /** Entities the worker visited (they may have no rows at the cut). */
  readonly entities: readonly string[];
  /** Owners fetched completely: every entity of these owners is answered by `parts`. */
  readonly owners: readonly string[];
  /** One fetch per owner or external entity: its row tuples and the dictionaries its ids refer to; parse each text once. */
  readonly parts: readonly WholePullFetch[];
  readonly counters: {
    readonly hops: number;
    readonly rows: number;
    readonly bytes: number;
    readonly statements: number;
  };
}
/** Texts of one fetch: `rows` is a JSON array of tuples (ids only), the other three are JSON arrays of dictionary entries. */
export interface WholePullFetch {
  readonly rows: string;
  /** `[position, instant, transaction name]` for every position the rows use. */
  readonly txs: string;
  /** `[attribute id, name]` */
  readonly attrs: string;
  /** `[string id, text]` (creators and entity types) */
  readonly strs: string;
}
/**
 * Short tuple: `[idIsBlob, id, entity, attrId, kind, value, position, validFromOffset, creatorId]`.
 * Long tuple: the short fields plus `[validTo, entityTypeId, schemaVersion, verbatim]` (index 9 to 12), used only when a row differs from
 * the defaults (no valid-to, no entity type, schema version 1, no verbatim envelope).
 */
export type H1Tuple = readonly any[];
/** Per-pull dictionaries. Transaction instants and every optional name are built once per entry, not once per row. */
export interface H1Dict {
  readonly txAt: Map<number, number>;
  readonly txId: Map<number, Option.Option<string>>;
  readonly attr: Map<number, string>;
  readonly str: Map<number, string>;
  readonly strOpt: Map<number, Option.Option<string>>;
}
const num = (x: any): number => (typeof x === "number" ? x : Number(x));
export const wholePullTuples = (
  answer: Pick<WholePull, "parts">,
): { readonly tuples: H1Tuple[]; readonly dict: H1Dict } => {
  const dict: H1Dict = {
    txAt: new Map(),
    txId: new Map(),
    attr: new Map(),
    str: new Map(),
    strOpt: new Map(),
  };
  const parts = answer.parts;
  let tuples: H1Tuple[] | undefined;
  for (const part of parts) {
    const rows = JSON.parse(part.rows) as H1Tuple[];
    if (tuples === undefined) tuples = rows;
    else for (const t of rows) tuples.push(t);
    for (const [pos, at, name] of JSON.parse(part.txs) as [number, number | string, string | null][]) {
      dict.txAt.set(pos, num(at));
      dict.txId.set(pos, name ? Option.some(name) : Option.none());
    }
    for (const [id, name] of JSON.parse(part.attrs) as [number, string][]) dict.attr.set(id, name);
    for (const [id, text] of JSON.parse(part.strs) as [number, string | null][]) {
      dict.str.set(id, text as string);
      dict.strOpt.set(id, text ? Option.some(text) : Option.none());
    }
  }
  return { tuples: tuples ?? [], dict };
};
const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const idFromHexSlow = (hex: string) => {
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
// [EXP-QH1-R3] Why: 281 id conversions per pull cost about 195 us as string concatenation (0.7 us each). The 128-bit id is read as four
// 32-bit words and each 5-bit group is a fixed shift of one or two words, written into one reused buffer: 0.14 us each, identical
// output (checked against the original over random and edge ids in the h1 id test). Rejected: a lookup table per byte pair (the
// 5-bit groups straddle byte boundaries, so it needs a second pass).
const hexValue = new Uint8Array(128);
for (let i = 0; i < 10; i++) hexValue[48 + i] = i;
for (let i = 0; i < 6; i++) hexValue[65 + i] = hexValue[97 + i] = 10 + i;
const alphabetCodes = new Uint8Array(32);
for (let i = 0; i < 32; i++) alphabetCodes[i] = alphabet.charCodeAt(i);
const idBuffer = Buffer.allocUnsafe(26);
const idFromHex = (hex: string) => {
  if (hex.length !== 32) return idFromHexSlow(hex);
  const h = (i: number) => hexValue[hex.charCodeAt(i)]!;
  const w0 =
    ((h(0) << 28) |
      (h(1) << 24) |
      (h(2) << 20) |
      (h(3) << 16) |
      (h(4) << 12) |
      (h(5) << 8) |
      (h(6) << 4) |
      h(7)) >>>
    0;
  const w1 =
    ((h(8) << 28) |
      (h(9) << 24) |
      (h(10) << 20) |
      (h(11) << 16) |
      (h(12) << 12) |
      (h(13) << 8) |
      (h(14) << 4) |
      h(15)) >>>
    0;
  const w2 =
    ((h(16) << 28) |
      (h(17) << 24) |
      (h(18) << 20) |
      (h(19) << 16) |
      (h(20) << 12) |
      (h(21) << 8) |
      (h(22) << 4) |
      h(23)) >>>
    0;
  const w3 =
    ((h(24) << 28) |
      (h(25) << 24) |
      (h(26) << 20) |
      (h(27) << 16) |
      (h(28) << 12) |
      (h(29) << 8) |
      (h(30) << 4) |
      h(31)) >>>
    0;
  const b = idBuffer,
    AC = alphabetCodes;
  b[0] = AC[w0 >>> 29]!;
  b[1] = AC[(w0 >>> 24) & 31]!;
  b[2] = AC[(w0 >>> 19) & 31]!;
  b[3] = AC[(w0 >>> 14) & 31]!;
  b[4] = AC[(w0 >>> 9) & 31]!;
  b[5] = AC[(w0 >>> 4) & 31]!;
  b[6] = AC[((w0 << 1) | (w1 >>> 31)) & 31]!;
  b[7] = AC[(w1 >>> 26) & 31]!;
  b[8] = AC[(w1 >>> 21) & 31]!;
  b[9] = AC[(w1 >>> 16) & 31]!;
  b[10] = AC[(w1 >>> 11) & 31]!;
  b[11] = AC[(w1 >>> 6) & 31]!;
  b[12] = AC[(w1 >>> 1) & 31]!;
  b[13] = AC[((w1 << 4) | (w2 >>> 28)) & 31]!;
  b[14] = AC[(w2 >>> 23) & 31]!;
  b[15] = AC[(w2 >>> 18) & 31]!;
  b[16] = AC[(w2 >>> 13) & 31]!;
  b[17] = AC[(w2 >>> 8) & 31]!;
  b[18] = AC[(w2 >>> 3) & 31]!;
  b[19] = AC[((w2 << 2) | (w3 >>> 30)) & 31]!;
  b[20] = AC[(w3 >>> 25) & 31]!;
  b[21] = AC[(w3 >>> 20) & 31]!;
  b[22] = AC[(w3 >>> 15) & 31]!;
  b[23] = AC[(w3 >>> 10) & 31]!;
  b[24] = AC[(w3 >>> 5) & 31]!;
  b[25] = AC[(w3 >>> 0) & 31]!;
  return (b as unknown as { latin1Slice(start: number, end: number): string }).latin1Slice(0, 26);
};
export const h1IdFromHex = idFromHex;
export const h1IdFromHexReference = idFromHexSlow;
export const h1TupleId = (t: H1Tuple): string => (t[0] ? idFromHex(t[1]) : t[1]);
const optional = <A>(value: A | null) => (value === null ? Option.none<A>() : Option.some(value));
const types = ["string", "number", "boolean", "datetime", "json", "ref", "integer"];
// [EXP-QH1-R3] Why: SQL emits integer timestamps and integer values as JSON numbers and only REAL as exact %!.17g text, so the
// common case needs no Number() call. Rejected: Number() on every field (about 39 us per pull for values that are already numbers).
/** One tuple to one Triple, or undefined when it is not visible at `basis.validAt`. Values pass the read-side domain check. */
export const h1Decode = (
  t: H1Tuple,
  basis: ResolvedTemporalBasis,
  dict: H1Dict,
): Triple | undefined => {
  const fallback = t[12];
  if (fallback) {
    const row = fallback.row as TripleRow;
    for (const [key, tag] of fallback.special)
      (row as any)[key] = tag === "undefined" ? undefined : tag === "-0" ? -0 : Number(tag);
    if (row.valid_from > basis.validAt || (row.valid_to !== null && row.valid_to <= basis.validAt))
      return undefined;
    return {
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
  }
  // [EXP-P4N] Why: valid-from = transaction instant + offset, both IEEE doubles here and in SQLite's `tx.at + f.vf` (integer sums stay exact
  // below 2^53, and above it SQLite's exact int64 sum converted to double equals one rounding of the same sum), so main reproduces the
  // exact double the SQL used to send. Rejected: sending valid-from per row again (about 14 bytes per row).
  const pos = t[6] as number;
  const at = dict.txAt.get(pos)!;
  const validFrom = at + num(t[7]);
  const long = t.length > 9;
  const rawTo = long ? t[9] : null;
  if (validFrom > basis.validAt || (rawTo !== null && num(rawTo) <= basis.validAt))
    return undefined;
  const kind = t[4];
  const type = types[kind] ?? (kind === 8 ? "number" : "datetime");
  const payload =
    kind === 8
      ? pos
      : kind === 9
        ? at
        : kind === 1 || kind === 3
          ? num(t[5])
          : kind === 2
            ? t[5] === 1
              ? true
              : t[5] === 0
                ? false
                : undefined
            : kind === 4
              ? JSON.parse(t[5])
              : t[5];
  const attribute = dict.attr.get(t[3])!;
  const value = decodedPrimitiveValue(type, payload, storedValueDomain(ValueDomains.qlever, attribute));
  const creator = t[8];
  return {
    id: t[0] ? idFromHex(t[1]) : t[1],
    entityId: t[2],
    attribute,
    value,
    recordedAt: at,
    validFrom,
    validTo: rawTo === null ? Option.none() : Option.some(num(rawTo)),
    createdBy: creator === null ? Option.none() : (dict.strOpt.get(creator) ?? Option.none()),
    retractedAt: Option.none(),
    entityType: long && t[10] !== null ? (dict.strOpt.get(t[10]) ?? Option.none()) : Option.none(),
    schemaVersion: long && num(t[11]) !== 1 ? (num(t[11]) ? Option.some(num(t[11])) : Option.none()) : someOne,
    txId: dict.txId.get(pos)!,
    retractTxId: Option.none(),
  } as Triple;
};
const someOne = Option.some(1);
// Same stable tie breaker as the row route.
export const sortTriples = (bucket: Triple[]) =>
  bucket.sort((a, b) => a.recordedAt - b.recordedAt || a.id.localeCompare(b.id));
// [EXP-QH1-R3] Why: SQL returns each entity's rows in primary-key (id) order, which is already the row route's order whenever
// record times tie or ascend, so the per-entity sort (localeCompare, about 59 us per pull) is skipped after an O(n) check. Ids made of
// [0-9A-Z] compare identically by code unit and by localeCompare; any other id (lowercase, punctuation) falls back to the real sort.
// Rejected: comparing every pair with localeCompare (the cost being removed), and trusting row order without checking it.
const plainId = /^[0-9A-Z]*$/;
const entityBody = (
  tuples: readonly H1Tuple[],
  basis: ResolvedTemporalBasis,
  dict: H1Dict,
): Triple[] => {
  const body: Triple[] = [];
  let exact = true;
  let prev: Triple | undefined;
  for (const t of tuples) {
    const triple = h1Decode(t, basis, dict);
    if (triple === undefined) continue;
    if (exact) {
      if (!t[0] && !plainId.test(triple.id)) exact = false;
      else if (prev !== undefined) {
        const dt = prev.recordedAt - triple.recordedAt;
        if (dt > 0 || (dt === 0 && !(prev.id < triple.id))) exact = false;
      }
      prev = triple;
    }
    body.push(triple);
  }
  if (!exact && body.length > 1) sortTriples(body);
  return body;
};
export const h1TupleEntity = (t: H1Tuple): string => t[12]?.row.entity_id ?? t[2];
const entityOf = h1TupleEntity;
export const h1Rows = (
  tuples: readonly H1Tuple[],
  basis: ResolvedTemporalBasis,
  dict: H1Dict,
): ReadonlyMap<string, readonly Triple[]> => {
  const byEntity = new Map<string, H1Tuple[]>();
  for (const t of tuples) {
    const key = entityOf(t);
    const bucket = byEntity.get(key);
    if (bucket) bucket.push(t);
    else byEntity.set(key, [t]);
  }
  const result = new Map<string, Triple[]>();
  for (const [key, bucket] of byEntity) {
    const body = entityBody(bucket, basis, dict);
    if (body.length) result.set(key, body);
  }
  return result;
};
/** The visible Triples of one entity, in the row route's order. */
export const h1Entity = entityBody;

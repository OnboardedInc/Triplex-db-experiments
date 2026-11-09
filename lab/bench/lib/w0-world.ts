import { createHash } from "node:crypto";
import * as W0 from "../../../packages/w0/dist/index.js";
export { W0 };
export const sha256 = (bytes: string | Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");
export const canonical = W0.canonicalPlain;
export const V_W0 = Date.parse(W0.POPULATION_VALID_TIME);
export interface PositionBasis {
  readonly position: number;
  readonly validAt: number;
}
export class BasisNotAvailable extends Error {
  readonly _tag = "BasisNotAvailable";
}
export function requirePosition(b: PositionBasis, head: number): void {
  if (
    Object.keys(b).some((k) => !["position", "validAt"].includes(k)) ||
    !Number.isSafeInteger(b.position) ||
    b.position < 0 ||
    b.position > head ||
    !Number.isFinite(b.validAt)
  )
    throw new BasisNotAvailable("explicit available P and validAt required");
}
export interface WorldRow {
  id: string;
  entityId: string;
  attribute: string;
  value: any;
  position: number;
  validFrom: number;
  validTo?: number;
  retractedPosition?: number;
}
const refs = new Set(["documents", "decisions", "answers", "next", "location", "jurisdiction"]);
export const isReference = (a: string) => refs.has(a);
export const many = new Set(["documents", "decisions", "answers"]);
export function triplexValue(a: string, v: any): any {
  if (typeof v === "number") {
    if (!Number.isSafeInteger(v)) throw new TypeError("W0 numbers must be safe integers");
    return { type: "integer", value: String(v) };
  }
  if (typeof v === "boolean") return { type: "boolean", value: v };
  if (typeof v === "string") return { type: isReference(a) ? "ref" : "string", value: v };
  if (v && typeof v.erasedAt === "string") return { type: "json", value: v };
  throw new TypeError("unsupported W0 value");
}
export function factValue(v: any): any {
  if (!v || !["integer", "boolean", "ref", "string", "json"].includes(v.type))
    throw new TypeError("unsupported Triplex value");
  if (v.type !== "integer") return v.value;
  const n = Number(v.value);
  if (!Number.isSafeInteger(n) || BigInt(n) !== BigInt(v.value))
    throw new TypeError("precision loss");
  return n;
}
export function visibleRows(rows: readonly WorldRow[], b: PositionBasis): WorldRow[] {
  return rows.filter(
    (r) =>
      r.position <= b.position &&
      (r.retractedPosition === undefined || r.retractedPosition > b.position) &&
      r.validFrom <= b.validAt &&
      (r.validTo === undefined || r.validTo > b.validAt),
  );
}
export function worldOf(subject: string, rows: readonly WorldRow[]): W0.World {
  // [EXP-P5] Why: whitelist snapshot fields so later retirement metadata cannot affect canonical bytes. Rejected: spreading rows (Q89i leaks).
  const facts = rows.map((r) => ({
    e: r.entityId,
    a: r.attribute,
    v: factValue(r.value),
    tx: r.position,
  }));
  // [EXP-P5N] Why: the comparator canonicalized both facts on every comparison (about 8,000 canonical calls and Buffer allocations for a 445-fact world, 4.0 ms of 9.1 ms per subject).
  // Each fact's canonical bytes are computed once and the same Buffer.compare orders them, so the order is identical by construction.
  // Rejected: comparing canonical strings (JS compares UTF-16 units, which differs from UTF-8 bytes for some code points).
  const keys = facts.map((f) => Buffer.from(canonical(f)));
  const order = facts.map((_, i) => i).sort((i, j) => Buffer.compare(keys[i]!, keys[j]!));
  return { subject, facts: order.map((i) => facts[i]!) };
}
export function reachableRows(
  subjects: readonly string[],
  rows: readonly WorldRow[],
  index?: Map<string, WorldRow[]>,
): WorldRow[] {
  const seen = new Set(subjects),
    byEntity = index ?? new Map<string, WorldRow[]>();
  if (!index)
    for (const r of rows) {
      const list = byEntity.get(r.entityId) ?? [];
      list.push(r);
      byEntity.set(r.entityId, list);
    }
  const result: WorldRow[] = [];
  for (const entity of seen)
    for (const row of byEntity.get(entity) ?? []) {
      result.push(row);
      if (isReference(row.attribute) && row.value.type === "ref") seen.add(row.value.value);
    }
  return result;
}
export const w0Basis = (b: PositionBasis): W0.Basis => ({
  tx: b.position,
  validTime: new Date(b.validAt).toISOString().replace(".000Z", ".000000Z"),
});

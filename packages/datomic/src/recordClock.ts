import type { TripleRow } from "@triplex-build/triplex/runtime";
import { validateTagged } from "./codec.js";
// [DX-T1-5] Why: only the durable operation ACK may retime staged cache/receipt metadata; valid time is independent.
// Rejected: applying a guessed scope clock, or rewriting application JSON and valid-time defaults.
export function assignedInstant(receipt: unknown): number | undefined {
  if (
    !receipt ||
    typeof receipt !== "object" ||
    !("recordedAt" in receipt) ||
    receipt.recordedAt === undefined
  )
    return undefined;
  const tag = validateTagged(receipt.recordedAt);
  if (tag.t !== "double" || !Number.isFinite(tag.v))
    throw new TypeError("Invalid assigned record clock");
  return Number(tag.v);
}
export function assignRecordTime(
  row: TripleRow,
  fresh: boolean,
  instant: number,
  newIds: ReadonlySet<string>,
): TripleRow {
  if (!Number.isFinite(instant)) throw new TypeError("Invalid assigned record clock");
  const journal = row.entity_type === "_Transaction";
  let value_json = row.value_json;
  if (fresh && journal && row.attribute === ":_tx/change" && value_json !== null) {
    const change = JSON.parse(value_json);
    if (newIds.has(change.tripleId)) change.recordedAt = instant;
    if (Object.hasOwn(change, "retractedAt")) change.retractedAt = instant;
    value_json = JSON.stringify(change);
  }
  return {
    ...row,
    recorded_at: fresh ? instant : row.recorded_at,
    retracted_at: row.retracted_at === null ? null : instant,
    ...(fresh && journal && row.attribute === ":_tx/instant" ? { value_datetime: instant } : {}),
    value_json,
  };
}

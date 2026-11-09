import { randomUUID } from "node:crypto";
import type { TransactionState } from "./TransactionContext.js";
import type { TripleRow } from "@triplex-build/triplex/runtime";
import { validateTagged, type TaggedValue } from "./codec.js";

// [EXP-DA01] Why: tag every scalar at the HTTP boundary. Rejected: JSON numeric longs (precision loss).
export type WireRow = Record<string, TaggedValue | null>;
const longs = new Set(["recorded_position", "retracted_position", "schema_version"]);
export function encodeRow(row: TripleRow): WireRow {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      key,
      value === null
        ? null
        : typeof value === "number"
          ? validateTagged(
              longs.has(key) ? { t: "long", v: String(value) } : { t: "double", v: value },
            )
          : validateTagged({ t: "string", v: value }),
    ]),
  );
}
export function decodeRow(row: WireRow): TripleRow {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => {
      if (value === null) return [key, null];
      const tag = validateTagged(value);
      if (longs.has(key)) {
        if (tag.t !== "long") throw new TypeError(`Expected long ${key}`);
        const n = Number(tag.v);
        if (!Number.isSafeInteger(n)) throw new RangeError(`Unsafe ${key}`);
        return [key, n];
      }
      return [key, tag.v];
    }),
  ) as unknown as TripleRow;
}

export const stagedInput = (state: TransactionState) => ({
  sourceK: state.sourceK,
  position: state.position,
  operationId: randomUUID(),
  attemptId: randomUUID(),
  rows: [...state.rows.values()].map(encodeRow),
  newIds: [...state.newIds],
  claims: [...state.claims.values()],
});

import type { ResolvedTemporalBasis } from "@triplex-build/triplex";
import type { TripleRow } from "@triplex-build/triplex/runtime";
import { BasisNotAvailable, type BasisSurface } from "./errors.js";

// [EXP-P2Q] Why: every broker read surface must apply the same Q89c availability check before answering.
// Rejected: per-entry-point waits (the journal and empty-result shortcuts escaped those checks).
export const awaitSnapshotBasis = async (input: {
  readonly required: number;
  readonly observed: number;
  readonly refresh: () => number | Promise<number>;
  readonly waitMs: number;
  readonly replica: string;
  readonly surface: BasisSurface;
  readonly started?: number;
  readonly pause?: (remaining: number) => Promise<void>;
  readonly refuse?: () => boolean;
}): Promise<number> => {
  const started = input.started ?? performance.now();
  let observed = input.observed;
  while (observed < input.required) {
    const remaining = input.waitMs - (performance.now() - started);
    if (remaining <= 0 || input.refuse?.())
      throw new BasisNotAvailable({
        required: input.required,
        observed,
        replica: input.replica,
        surface: input.surface,
        waitedMs: performance.now() - started,
      });
    if (input.pause) await input.pause(remaining);
    else await new Promise<void>((resolve) => setTimeout(resolve, Math.min(25, remaining)));
    observed = await input.refresh();
  }
  return observed;
};

// [EXP-P2Q] Why: Q89i hides knowledge of retirement beyond either recorded cut, after all sources merge.
// Rejected: masking only replica rows (log, overlay and staged retractions expose the same later metadata).
export const snapshotRows = (
  rows: readonly TripleRow[],
  position: number,
  basis?: ResolvedTemporalBasis,
  rawHistory = false,
): readonly TripleRow[] =>
  rawHistory
    ? rows
    : rows.map((row) => {
        const future =
          (row.retracted_position !== null &&
            (row.retracted_position < 0 || row.retracted_position > position)) ||
          (basis?.recordedAt !== undefined &&
            row.retracted_at !== null &&
            row.retracted_at > basis.recordedAt);
        return future
          ? { ...row, retracted_at: null, retracted_position: null, retract_tx_id: null }
          : row;
      });

// [EXP-P2Q] Why: construction applies the common row mask even to empty and nested read results.
// Rejected: a marker on functions alone (a new operation could return unmasked rows directly).
export const maskSnapshotResult = <A>(
  value: A,
  position: number,
  basis?: ResolvedTemporalBasis,
  rawHistory = false,
): A => {
  const visit = (item: any): any => {
    if (Array.isArray(item)) {
      if (
        item.every(
          (row) =>
            row &&
            typeof row === "object" &&
            "recorded_position" in row &&
            "retracted_position" in row &&
            "entity_id" in row &&
            "value_type" in row,
        )
      )
        return snapshotRows(item, position, basis, rawHistory);
      return item.map(visit);
    }
    if (item instanceof Map) return new Map([...item].map(([key, child]) => [key, visit(child)]));
    if (item && typeof item === "object" && Object.getPrototypeOf(item) === Object.prototype) {
      if (
        "recorded_position" in item &&
        "retracted_position" in item &&
        "entity_id" in item &&
        "value_type" in item
      )
        return snapshotRows([item], position, basis, rawHistory)[0];
      // [EXP-P2Q] Why: semantic query objects may contain arbitrary user JSON, including row-shaped values.
      // Rejected: recursively rewriting every object (would reinterpret user payload as storage metadata).
      return item;
    }
    return item;
  };
  return visit(value);
};

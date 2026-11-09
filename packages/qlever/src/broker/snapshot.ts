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

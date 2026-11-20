import { cellOrder, type Cell } from "./plan.ts";
import type { checkCell } from "./check.ts";
type Result = ReturnType<typeof checkCell>;

// [DX-SCALE1] Why: finish two matched repetitions at all four rates before
// spending the remaining time on precision. Rejected: running each rate to
// completion before the higher doses have a measurement.
export const trimRepetitions = Array.from({ length: 16 }, (_, i) => i);
export const trimRate = (pair: Cell[]) => pair.find((c) => c !== "alone")!;
export const trimWindowReserve = 2 * (300000 + 5000 + 2000) + 120000;
export const trimArchiveReserve = 12 * 60000;
const agree = (a: number, b: number) => a > 0 && b > 0 && Math.max(a, b) / Math.min(a, b) <= 1.1;

export function trimAgrees(reports: Result[], rate: Cell) {
  const load = reports.filter((r) => r.cell === rate).slice(0, 2);
  if (load.length !== 2) return false;
  const matched = load.map((l) => {
    const a = reports.find((r) => r.cell === "alone" && r.repeat === l.repeat);
    if (!a?.quietComplete || !l.quietComplete || !a.quiet.p99 || !l.quiet.p99) return null;
    return {
      quiet: l.quiet.p99 / a.quiet.p99,
      goodput: l.goodput,
      losses: l.missing + l.preDispatchExpiry + l.uncertain + l.refused + l.recovered,
      within: l.capacityBars,
    };
  });
  const [a, b] = matched;
  return (
    !!a &&
    !!b &&
    agree(a.quiet, b.quiet) &&
    agree(a.goodput, b.goodput) &&
    a.within === b.within &&
    (a.losses === b.losses || agree(a.losses, b.losses))
  );
}

export function nextTrimPair(repeat: number, reports: Result[]) {
  const order = cellOrder(repeat, "pooled", true);
  return trimAgrees(reports, trimRate(order)) ? [] : order;
}

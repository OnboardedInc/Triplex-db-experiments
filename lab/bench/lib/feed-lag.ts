// [EXP-FD01-R3] Why: test the exact inclusive NS-P3 comparison used by the driver.
// Rejected: testing interval arithmetic while leaving the admission boundary unexecuted.
export function feedLagWithinBar(p99: number | null | undefined): boolean | null {
  return p99 == null || !Number.isFinite(p99) || p99 < 0 ? null : p99 <= 250;
}

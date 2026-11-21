type Latency = { count: number; p99Ms: number | null };

export function p99Miss(toy: boolean, value: Latency | undefined, bar: number, metric: string) {
  if (toy || !value?.count || value.p99Ms === null || !Number.isFinite(value.p99Ms) || value.p99Ms <= bar) return;
  return `${metric} ${value.p99Ms} ms exceeds the ${bar} ms bar`;
}

export function quietVerdict(solo: Latency, loaded: Latency, quietExpired: number, wrongReads: number) {
  if (quietExpired || wrongReads) return { status: "MISSED", reason: `${quietExpired} quiet expiries and ${wrongReads} wrong quiet reads; both bars are zero` } as const;
  // [DX-V01] Why: use a measured matched population before applying either side of the owner's new OR bar.
  // Rejected: claiming quiet isolation from the 315-offer replay or judging an unobserved latency as zero.
  if (Math.min(solo.count, loaded.count) < 500 || !solo.p99Ms || loaded.p99Ms === null ||
      !Number.isFinite(solo.p99Ms) || !Number.isFinite(loaded.p99Ms))
    return { status: "PARTIAL", reason: "matched commit p99 needs at least 500 verified commits per side" } as const;
  const ratio = loaded.p99Ms / solo.p99Ms;
  return { status: ratio <= 1.25 || loaded.p99Ms <= 50 ? "MET" : "MISSED",
    reason: `${loaded.p99Ms} ms loaded and ${ratio.toFixed(3)}× vs ≤50 ms or ≤1.25×` } as const;
}

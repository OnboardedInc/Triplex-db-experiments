type Latency = { count: number; p99Ms: number | null };

export function p99Miss(toy: boolean, value: Latency | undefined, bar: number, metric: string) {
  if (toy || !value?.count || value.p99Ms === null || !Number.isFinite(value.p99Ms) || value.p99Ms <= bar) return;
  return `${metric} ${value.p99Ms} ms exceeds the ${bar} ms bar`;
}

export function quietMiss(solo: Latency, loaded: Latency, quietExpired: number, label: string) {
  if (quietExpired > 0) return `${label}: ${quietExpired} quiet expiries against a bar of zero`;
  // [DX-V01] Why: use the target's minimum paired commit sample for a tail-latency miss.
  // Rejected: treating a very short tail sample as evidence of a qualifying ratio.
  if (Math.min(solo.count, loaded.count) < 500 || !solo.p99Ms || loaded.p99Ms === null) return;
  const ratio = loaded.p99Ms / solo.p99Ms;
  if (ratio > 1.25) return `${label}: ${solo.p99Ms} → ${loaded.p99Ms} ms (${ratio.toFixed(3)}×) exceeds the 1.25× bar`;
}

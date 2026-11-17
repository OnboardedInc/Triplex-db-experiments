import { createHash } from "node:crypto";
import { nsPlan, V3_PLAN_ID, V3_OFFER_SECONDS } from "./phases.ts";
import { TRACE_DEFAULTS, traceDigest, type TraceEvent } from "./trace.ts";

export interface Interval { readonly from: number; readonly to: number }
// [DX-T1-12] Why: a fast diagnostic sweep may finish before settle ends; retain its empty cohort as unjudged instead of passing a reversed interval to baseline matching.
// Rejected: relax pooled-interval validation or extend the sweep to manufacture observations.
export function settledPhaseWindow(start: number, end: number, settleMs: number) {
  if (![start, end, settleMs].every(Number.isFinite) || end < start || settleMs < 0)
    throw Error("Invalid phase bounds or settle period");
  const from = start + settleMs;
  return { from, to: end, invalid: from >= end ? "phase ended before a settled observation window existed" : null };
}
export const factBand = (n: number) => n <= 10 ? "5-10" : n <= 25 ? "11-25" : "26-50";
export function checkedIntervals(intervals: readonly Interval[]): Interval[] {
  const result = [...intervals].sort((a, b) => a.from - b.from);
  for (let i = 0; i < result.length; i++) {
    const x = result[i]!;
    if (!Number.isFinite(x.from) || !Number.isFinite(x.to) || x.from < 0 || x.to <= x.from ||
        (i > 0 && x.from < result[i - 1]!.to)) throw Error("Invalid or overlapping pooled intervals");
  }
  return result;
}
// [DX-T1-12] Why: native admission must fail before spending hours on a plan whose required recovery cohorts cannot reach Sam's minimum even without failures.
// Rejected: silently raise the rate, extend the specified phases, or mistake the declared diagnostic 26-50 band for a required cohort.
export function assertRequiredPlanCounts(plan: ReturnType<typeof checkV3Trace>) {
  const c=plan.counts, enough=(n:number)=>Number.isSafeInteger(n)&&n>=500;
  const missing=[
    ...(!enough(c.L256.total)?["L256"]:[]),
    ...["5-10","11-25"].filter(b=>!enough(c.L256.bands[b]!)).map(b=>`L256 ${b}`),
    ...(!enough(c.L1024.total)?["L1024"]:[]),
    ...c.recovery.filter(r=>!enough(r.total)).map(r=>`recovery offset ${r.fromS}`),
  ];
  if(missing.length)throw Error(`Specified v3 plan underfills required 500-commit cohorts: ${missing.join(", ")}`);
}
export const inIntervals = (at: number, intervals: readonly Interval[]) => intervals.some(w => at >= w.from && at < w.to);
export const intervalMs = (intervals: readonly Interval[]) => checkedIntervals(intervals).reduce((n, w) => n + w.to - w.from, 0);
export function poolRows<T extends { seq: number; offsetMs: number; burst?: boolean }>(rows: readonly T[], intervals: readonly Interval[], steady = true): T[] {
  const windows = checkedIntervals(intervals), selected = rows.filter(r => inIntervals(r.offsetMs, windows));
  if (new Set(selected.map(r => r.seq)).size !== selected.length) throw Error("Duplicate primary in pooled intervals");
  if (steady && selected.some(r => r.burst)) throw Error("Burst commit in steady pool");
  return selected;
}
export function assertNoBurstDrain(intervals: readonly Interval[]): void {
  for (const w of checkedIntervals(intervals))
    for (let b = TRACE_DEFAULTS.firstBurstAtS * 1000; b < w.to; b += TRACE_DEFAULTS.burstPeriodS * 1000)
      if (w.from < b + (TRACE_DEFAULTS.burstDurationS + 60) * 1000 && w.to > b)
        throw Error("Steady window overlaps burst or its 60-second drain");
}
export function scheduledV3Windows() {
  const phases = nsPlan("v3");
  const intervals = (pool: string) => phases.filter(p => p.pool === pool).map(p => ({ from: (p.traceFromS! + 2) * 1000, to: (p.traceFromS! + p.seconds!) * 1000 }));
  const L256 = intervals("L256"), L1024 = intervals("L1024");
  const recovery = Array.from({ length: 7 }, (_, i) => ({ fromS: i * 5, intervals: phases.filter(p => p.pool === "recovery").map(p => ({ from: (p.traceFromS! + i * 5) * 1000, to: (p.traceFromS! + i * 5 + 30) * 1000 })) }));
  for (const ws of [L256, L1024, ...recovery.map(r => r.intervals)]) assertNoBurstDrain(ws);
  return { L256, L1024, recovery, legacyL256: [{ from: 242000, to: 285000 }] };
}
// [DX-T1-12] Why: print exact offered denominators before an engine starts; a sparse provisional band stays unjudged.
// Rejected: use the analyst's approximate rate, raise the rate, or silently pool extra burst commits to reach 500.
export function checkV3Trace(events: readonly TraceEvent[]) {
  const digest = traceDigest(events);
  if (digest !== "aa8a7636ff027ab3") throw Error("v3 requires the unchanged frozen 7200-second 10k trace");
  const rows = events.filter(e => e.stream === "background" && !e.resend).map(e => ({ ...e, offsetMs: e.atMs }));
  const windows = scheduledV3Windows();
  const counts = (ws: readonly Interval[]) => {
    const selected = poolRows(rows, ws);
    return { total: selected.length, bands: Object.fromEntries(["5-10", "11-25", "26-50"].map(b => [b, selected.filter(r => factBand(r.facts) === b).length])) };
  };
  const L256 = counts(windows.L256), L1024 = counts(windows.L1024);
  const recovery = windows.recovery.map(w => ({ fromS: w.fromS, ...counts(w.intervals) }));
  if (L256.total < 500 || L256.bands["5-10"]! < 500 || L256.bands["11-25"]! < 500 || L1024.total < 500)
    throw Error("Frozen v3 plan lacks its large steady cohorts");
  // [DX-T1-12] Why: exact trace counts contradict the analysis's recovery estimate (474-497, not 576-704).
  // Rejected: extend cycles or raise the rate silently; keep the requested plan and mark every sparse bar unjudged.
  const unjudged = [
    ...(L256.bands["26-50"]! < 500 ? ["L256 26-50"] : []),
    ...recovery.filter(r => r.total < 500).map(r => `recovery offset ${r.fromS}`),
  ];
  return { id: V3_PLAN_ID, offeredSeconds: V3_OFFER_SECONDS, traceDigest: digest, windows, counts: { L256, L1024, recovery },
    primaryPrefixSha256: createHash("sha256").update(JSON.stringify(events.filter(e => e.atMs < 900000))).digest("hex"),
    unjudged, complete500Coverage: unjudged.length === 0 };
}

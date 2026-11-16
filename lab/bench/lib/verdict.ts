import { verdictMs, VERDICT_CLOCK } from "../../trace/instrument.mjs";
import { Histogram } from "./hist.ts";
import { bootstrap90, commitBar, distribution, histogramDistribution, percentile, rateBootstrap90, ratioBar, requiredBarsMet } from "./verdict-statistics.ts";
import { checkedIntervals, factBand, inIntervals, poolRows, scheduledV3Windows, type Interval } from "./verdict-plan.ts";
import { V3_PLAN_ID } from "./phases.ts";
import type { TraceEvent } from "./trace.ts";

export type VerdictClock = "ack" | "finish";
export const clockId = (clock: VerdictClock) => clock === "ack" ? VERDICT_CLOCK : "finish/2";
export const clockMs = (row: any, clock: VerdictClock) => clock === "ack" ? verdictMs(row) : row.latencyMs;
export const primaryRows = (rows: readonly any[]) => rows.filter(w => w.stream === "background" && !w.resend);
export const committedRows = (rows: readonly any[]) => primaryRows(rows).filter(w => w.outcome === "committed" && !w.expired);
export function refreshVerdictEligibility(report: any) {
  if(!report.verdict) return;
  const reasons:string[]=[];
  if(report.verdictClock!==VERDICT_CLOCK || report.verdict.clock!==VERDICT_CLOCK || report.verdictPlanId!==V3_PLAN_ID) reasons.push("wrong verdict clock or plan identity");
  if(report.status!=="DONE") reasons.push("run not finalized DONE");
  if(report.config.profile!=="v3" || report.config.zeroReaders) reasons.push("not a full v3 reader arm");
  if(report.config.devOverrides?.length) reasons.push("development override");
  if(report.invalidReasons?.length || report.client?.invalid) reasons.push("invalid or saturated run");
  if(report.oracle?.status!=="PASS" || report.oracle?.exitCode!==0 || report.oracle?.mismatchCount!==0 ||
    !report.oracle.reads || report.oracle.modelCorrectOnSameReads!==report.oracle.reads ||
    report.oracle.oracleVerdict!=="PASS" || report.oracle.receiptConsistency?.status!=="PASS") reasons.push("independent oracle not exact");
  if(!report.correctness?.reads || report.correctness.errors!==0 || report.correctness.violations!==0 || report.correctness.correct!==report.correctness.reads) reasons.push("model observations incomplete or incorrect");
  report.verdict.runQualification={eligible:reasons.length===0,reasons,note:"Observed run qualification only; source/slot/oracle gate remains independent"};
  report.verdict.allMet=report.verdict.barsOnlyAllMet && reasons.length===0;
}
export function reportWindows(report: any) {
  if (report.verdictPlanId === V3_PLAN_ID || report.config.profile === "v3") return scheduledV3Windows();
  const interval = (name: string) => {
    const p = report.phases.find((p: any) => p.name === name);
    return p?.end ? [{ from: p.start + report.config.settleS * 1000 - report.traceStartAbsMs, to: p.end - report.traceStartAbsMs }] : [];
  };
  return { L256: interval("L256"), L1024: interval("L1024"), legacyL256: interval("L256"), recovery: [] };
}
// [DX-T1-12] Why: failed/absent baseline commands invalidate only the intervals that contain them, not unrelated read/feed results.
// Rejected: rejecting the entire run, or scoring a survivor-only zero denominator as a valid match.
export function matchBaseline(rows: readonly any[], intervals: readonly Interval[], expected: readonly { seq: number; atMs: number }[],
  offeredUntilMs: number, clock: VerdictClock) {
  const windows = checkedIntervals(intervals), selected = poolRows(primaryRows(rows), windows, false);
  const wanted = expected.filter(e => inIntervals(e.atMs, windows));
  const ids = new Map(selected.map(r => [r.seq, r]));
  let invalid: string | null = null;
  if (windows.some(w => offeredUntilMs < w.to)) invalid = "baseline does not cover the entire trace window";
  else if (selected.length !== wanted.length || wanted.some(e => !ids.has(e.seq) || Math.abs(ids.get(e.seq).offsetMs - e.atMs) > 0.001))
    invalid = "baseline missing or substituted commands in this trace window";
  else if (selected.some(r => r.expired || r.outcome !== "committed")) invalid = "baseline has expired, pending or rejected commands in this trace window";
  const committed = committedRows(selected), values = committed.map(r => clockMs(r, clock));
  const h = new Histogram(); values.forEach(v => h.recordMs(v));
  return { rows: committed, values, commits: values.length, expected: wanted.length, invalid, p50Ms: h.percentileMs(50), p99Ms: h.percentileMs(99) };
}
export function applyCommitVerdicts(report: any, writes: readonly any[], baseline: readonly any[] | null, events: readonly TraceEvent[],
  options: { clock?: VerdictClock; legacy?: boolean } = {}) {
  const clock = options.clock ?? "ack", id = clockId(clock), minimum = options.legacy ? 0 : 500;
  const good = committedRows(writes), expected = events.filter(e => e.stream === "background" && !e.resend);
  const windows = reportWindows(report), priorities = report.priorities;
  const replace = (priority: string, next: any) => {
    const bars = priorities[priority].bars, i = bars.findIndex((b: any) => b.id === next.id);
    if (i < 0) bars.push(next); else bars[i] = next;
  };
  const values = (rows: readonly any[]) => rows.map(w => clockMs(w, clock));
  for (const [name, limit] of [["L256", 1.25], ["L1024", 2]] as const) {
    const selected = poolRows(good, windows[name], report.config.profile === "v3");
    const reference = baseline ? matchBaseline(baseline, windows[name], expected, (report.matchedBaseline?.offeredUntilTraceS ?? 0) * 1000, clock) : null;
    const label = `NS-P1-WRITER-P99-RATIO-${name.slice(1)}`;
    replace("P1", ratioBar(label, distribution(values(selected), id), distribution(reference?.values ?? [], id), limit,
      { minimum, invalid: reference?.invalid ?? (!reference ? "UNMATCHED: no zero-reader run" : null) }));
    if (name === "L256") replace("P1", commitBar("NS-P1-WRITER-WAIT-MAX-MS (L256)", values(selected), 1, 2000, id, { minimum, max: true, estimator: "exact" }));
  }
  const selected = poolRows(good, windows.L256, report.config.profile === "v3");
  for (const band of ["5-10", "11-25", "26-50"]) {
    const xs = values(selected.filter(w => factBand(w.facts) === band));
    if (band !== "26-50") replace("P2", commitBar(`NS-P2 ${band} band p50 ms (L256)`, xs, 0.5, 10, id, { minimum }));
    replace("P2", commitBar(`NS-P2 ${band} band p99 ms (L256${band === "26-50" ? ", provisional" : ""})`, xs, 0.99, band === "26-50" ? 100 : 50, id, { minimum }));
  }
  // [DX-T1-12] Why: preserve render.py's exact all-primary nearest rank and existing bucketed band estimators separately.
  // Rejected: round the historical all-primary value into a new histogram bucket (it would fail the required 0.001-ms rescore identity).
  replace("P2", commitBar("NS-P2 all-primary p99 ms", values(good), 0.99, 50, id, { minimum, estimator: "exact" }));
  for (const band of ["5-10", "11-25"])
    replace("P2", commitBar(`NS-P2 burst ${band} band p50 ms`, values(good.filter(w => w.burst && factBand(w.facts) === band)), 0.5, 10, id, { minimum }));
  const h = (rows: readonly any[]) => { const hist = new Histogram(); values(rows).forEach(v => hist.recordMs(v)); return hist.summary(); };
  priorities.P2.bandsAtL256 = Object.fromEntries(["5-10", "11-25", "26-50"].map(b => [b, h(selected.filter(w => factBand(w.facts) === b))]));
  priorities.P2.allPrimary = { count: good.length, p50Ms: percentile(distribution(values(good), id, "exact"), 0.5), p99Ms: percentile(distribution(values(good), id, "exact"), 0.99) };
  priorities.P2.bandsBurst = Object.fromEntries(["5-10", "11-25", "26-50"].map(b => [b, h(good.filter(w => w.burst && factBand(w.facts) === b))]));
  const recovery = priorities.P1.recovery;
  if (recovery?.windows) {
    for (const w of recovery.windows) {
      const intervals = w.intervals ?? (() => {
        const phase = report.phases.find((p: any) => p.name === "recovery"), from = phase.start - report.traceStartAbsMs + w.fromS * 1000;
        return [{ from, to: from + Math.min(30000, phase.end - phase.start) }];
      })();
      const pop = poolRows(good, intervals, report.config.profile === "v3");
      const ref = baseline ? matchBaseline(baseline, intervals, expected, (report.matchedBaseline?.offeredUntilTraceS ?? 0) * 1000, clock) : null;
      const ratio = ratioBar(`recovery-${w.fromS}`, distribution(values(pop), id), distribution(ref?.values ?? [], id), 1.25,
        { minimum, invalid: ref?.invalid ?? (!ref ? "no baseline" : null) });
      const readRate = report.priorities.P1.ladder.find((s: any) => s.phase === "L256")?.goodputPerS;
      const seconds = intervals.reduce((n: number, x: Interval) => n + (x.to - x.from) / 1000, 0);
      Object.assign(w, { n: pop.length, denominatorN: ref?.commits ?? 0, interval90: ratio.interval90,
        commitP99Ms: ratio.numeratorP99Ms, matchedZeroReaderP99Ms: ratio.denominatorP99Ms,
        invalid: ratio.status.startsWith("UNJUDGED") || ref?.invalid ? ratio.status : null,
        meets: ratio.pass === true && w.violations === 0 && w.readP99Ms !== null && w.readP99Ms <= 100 &&
          (readRate === undefined || w.reads / seconds >= 0.9 * readRate) });
    }
    const first = recovery.windows.find((w: any) => w.meets);
    const width = first?.windowMs ?? Math.min(30000, report.phases.find((p: any) => p.name === "recovery")?.end - report.phases.find((p: any) => p.name === "recovery")?.start || 30000);
    recovery.recoveredAfterMs = first ? first.fromS * 1000 + width : null;
    const judged = recovery.windows.every((w: any) => w.n >= minimum && w.denominatorN >= minimum && !w.invalid);
    replace("P1", { id: "NS-P1-RECOVERY-MS", value: recovery.recoveredAfterMs, bar: "<= 60000",
      pass: judged ? recovery.recoveredAfterMs !== null && recovery.recoveredAfterMs <= 60000 : null,
      n: Math.min(...recovery.windows.map((w: any) => w.n)), denominatorN: Math.min(...recovery.windows.map((w: any) => w.denominatorN)),
      status: judged ? (first ? "MET" : "MISS") : "UNJUDGED (recovery window incomplete or n<500)", verdictClock: id,
      interval90: first?.interval90 ?? null, note: "offset windows pooled across stress cycles; interval is the qualifying writer ratio's" });
  }
  const pre = report.phases.find((p: any) => p.name === "presweep"), sweep = report.phases.find((p: any) => p.name === "sweep");
  if (priorities.P5?.bars && pre?.end && sweep?.end) {
    const at = (p: any) => good.filter(w => w.scheduledAt >= p.start + report.config.settleS * 1000 && w.scheduledAt < p.end);
    replace("P5", ratioBar("NS-P5 writer commit p99 during sweep / presweep", distribution(values(at(sweep)), id), distribution(values(at(pre)), id), 1.5, { minimum }));
  }
  const p4 = priorities.P4, mix = p4?.weightedMix;
  if (p4?.bars && !options.legacy) {
    const phase = report.phases.find((p: any) => p.name === "p4mix"), stats = phase?.stats ?? mix;
    const value = stats?.goodputPerS ?? null;
    replace("P4", { id: "NS-P4 correct weighted pulls/s whole machine", value, bar: ">= 4400",
      pass: value === null ? null : value >= 4400 && stats?.violations === 0 && stats?.errors === 0,
      n: stats?.correct ?? 0, sampleUnit: "correct weighted-mix pulls", interval90: null, note: "whole 8-CPU machine; per-core figure reported separately" });
    p4.bars = p4.bars.filter((b: any) => !b.id.includes("pulls/s per engine core"));
  }
  if (!options.legacy) {
    const phase = (name: string) => report.pooledPhases?.[name] ?? report.phases.find((p: any) => p.name === name)?.stats;
    const hist = (name: string) => report.histograms?.[name] ? Histogram.fromJSON(report.histograms[name]) : null;
    const find = (p: string, text: string) => priorities[p]?.bars?.find((b: any) => b.id === text);
    const quantile = (p: string, text: string, key: string, q = 0.99) => {
      const bar = find(p, text), h = hist(key);
      if (!bar) return;
      Object.assign(bar, { n: h?.count ?? null, sampleUnit: "correct observations", interval90: h ? bootstrap90(histogramDistribution(h), q, text) : null,
        intervalUnavailable: h ? undefined : "original record has no complete histogram" });
    };
    quantile("P1", "NS-P1-READ-P99-256-MS", "L256.read");
    quantile("P4", "NS-P4 weighted-mix pull p50 ms", "p4mix.read", 0.5);
    quantile("P4", "NS-P4 weighted-mix pull p99 ms", "p4mix.read");
    quantile("P4", "NS-P4 largest bucket p99 ms (provisional)", "p4mix.bucket:large");
    const readRatio = (p: string, text: string, numerator: string, denominator: string) => {
      const bar = find(p, text), a = hist(numerator), b = hist(denominator);
      if (bar) Object.assign(bar, { n: a?.count ?? null, denominatorN: b?.count ?? null, sampleUnit: "correct reads per side",
        interval90: a && b ? bootstrap90(histogramDistribution(a), 0.99, text, histogramDistribution(b)) : null,
        intervalUnavailable: a && b ? undefined : "original record has no complete histogram" });
    };
    readRatio("P4", "NS-P4 history flatness p99 depth10 / depth1", "p4h10.read", "p4h1.read");
    readRatio("P5", "NS-P5 live read p99 during sweep / presweep", "sweep.read", "presweep.read");
    for (const [text, numerator, denominator] of [
      ["NS-P1-GOODPUT-256-VS-64", phase("L256-legacy") ? "L256-legacy" : "L256", "L64"],
      ["NS-P1-GOODPUT-1024-VS-256", "L1024", "L256"]]) {
      const bar = find("P1", text!), a = phase(numerator!), b = phase(denominator!);
      if (bar) Object.assign(bar, { n: a?.correct ?? null, denominatorN: b?.correct ?? null, sampleUnit: "correct reads per side",
        interval90: rateBootstrap90(a?.goodputBySecond ?? [], text!, b?.goodputBySecond ?? []),
        intervalUnavailable: a?.goodputBySecond && b?.goodputBySecond ? undefined : "original record lacks one-second goodput bins" });
    }
    const rate = find("P4", "NS-P4 correct weighted pulls/s whole machine");
    if (rate) rate.interval90 = rateBootstrap90(phase("p4mix")?.goodputBySecond ?? [], rate.id);
    const lag = find("P3", "NS-P3 lag p99 ms at L256"), lagHist = hist("L256.feedLag");
    if (lag) Object.assign(lag, { n: selected.length, observations: lagHist?.count ?? phase("L256")?.feedLag?.count ?? null,
      sampleUnit: "committed primary cohort; feed observations also include probe commits", minimum,
      pass: selected.length < minimum ? null : lag.pass, status: selected.length < minimum ? `UNJUDGED (n<${minimum})` : lag.pass ? "MET" : "MISS",
      interval90: lagHist ? bootstrap90(histogramDistribution(lagHist, "feed-lag/1"), 0.99, lag.id) : null });
    const first900 = good.filter(w => w.offsetMs < 900000);
    report.verdictDiagnostics = { prefix900: { count: first900.length,
      p99Ms: percentile(distribution(values(first900), id, "exact"), 0.99) },
      blocks: report.phases.filter((p: any) => p.pool === "L256" || p.pool === "L1024").map((p: any) => {
        const xs = good.filter(w => w.offsetMs >= p.start - report.traceStartAbsMs + report.config.settleS * 1000 && w.offsetMs < p.end - report.traceStartAbsMs);
        const d = distribution(values(xs), id), point = percentile(d, 0.99), pooled = find("P1", `NS-P1-WRITER-P99-RATIO-${p.pool.slice(1)}`);
        const pooledCommit = priorities.P1.ladder.find((x: any) => x.phase === p.pool)?.writer?.commit;
        const pool = poolRows(good, windows[p.pool as "L256"|"L1024"],true);
        const poolInterval=bootstrap90(distribution(values(pool),id),.99,`${p.pool}-pooled-p99`);
        return { phase: p.name, cycle: p.cycle, n: xs.length, p50Ms: percentile(d, 0.5), p99Ms: point,
          interval90: bootstrap90(d, 0.99, p.name), pooledP99Ms: pooledCommit?.p99Ms,
          pooledInterval90:poolInterval,outsidePooledInterval:point!==null&&poolInterval!==null&&(point<poolInterval.low||point>poolInterval.high),
          pooledRatioInterval90: pooled?.interval90, diagnosticOnly: true };
      }) };
  }
  report.verdictClock = id;
  for (const p of Object.values(priorities) as any[]) for (const b of p.bars ?? []) {
    b.n ??= good.length;
    b.sampleUnit ??= "primary cohort (non-latency obligation)";
  }
  report.verdict = { schema: "ns-verdict/3", minimumCommits: minimum, clock: id,
    prioritiesMet: Object.fromEntries(Object.entries(priorities).map(([k, p]: [string, any]) => [k, requiredBarsMet(p.bars ?? [])])),
    barsOnlyAllMet: requiredBarsMet(Object.values(priorities).flatMap((p: any) => p.bars ?? [])),
    note: "UNJUDGED/null counts as not met; DONE is not semantic acceptance; ratio interval qualification never replaces the point estimate" };
  refreshVerdictEligibility(report);
}

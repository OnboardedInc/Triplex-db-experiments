import { Histogram } from "./hist.ts";
import { intervalMs, type Interval } from "./verdict-plan.ts";

// [DX-T1-12] Why: pool disjoint repeats by merging their complete histograms and counts, never by averaging p99s.
// Rejected: include the wall time between blocks or dilute an invalid/maintenance-poor block into a healthy mean.
export function pooledPhase(name: string, sources: readonly any[], intervals: readonly Interval[], matched: any) {
  if (!sources.length || sources.length !== intervals.length) throw Error("Incomplete phase pool");
  const sum = (f: (s: any) => number) => sources.reduce((n, s) => n + f(s), 0);
  const merge = (key: string) => { const h = new Histogram(); sources.forEach(s => h.merge(s[key])); return h; };
  const read = merge("_read"), commit = merge("_commit"), lag = merge("_feedLag");
  const seconds = intervalMs(intervals) / 1000, reads = sum(s => s.reads), correct = sum(s => s.correct);
  const counts = (get: (s: any) => Record<string, number>) => {
    const out: Record<string, number> = {};
    for (const s of sources) for (const [k, n] of Object.entries(get(s))) out[k] = (out[k] ?? 0) + n;
    return out;
  };
  const weighted = (get: (s: any) => number | null) => {
    const good = sources.filter(s => get(s) !== null);
    return good.length ? good.reduce((n, s) => n + get(s)! * s.windowS, 0) / good.reduce((n, s) => n + s.windowS, 0) : null;
  };
  const buckets: Record<string, Histogram> = {};
  for (const s of sources) for (const [k, h] of Object.entries(s._buckets) as [string, Histogram][]) (buckets[k] ??= new Histogram()).merge(h);
  return {
    ...sources[0], phase: name, members: sources.map(s => s.phase), intervals, windowS: seconds,
    overlapsBurst: sources.some(s => s.overlapsBurst), reads, correct,
    violations: sum(s => s.violations), errors: sum(s => s.errors), goodputPerS: correct / seconds,
    goodputBySecond: sources.flatMap(s => s.goodputBySecond),
    read: read.summary(), hotShare: reads ? sum(s => (s.hotShare ?? 0) * s.reads) / reads : null,
    basisMix: counts(s => s.basisMix), split: counts(s => s.split),
    routing: { ...sources[0].routing, routes: counts(s => s.routing.routes), languages: counts(s => s.routing.languages),
      localShare: reads ? sum(s => (s.routing.routes.replica ?? 0)) / reads : null,
      fallbackShare: reads ? sum(s => (s.routing.routes.fallback ?? 0)) / reads : null },
    buckets: Object.fromEntries(Object.entries(buckets).map(([k, h]) => [k, h.summary()])),
    writer: { commits: commit.count, commit: commit.summary(), matchedZeroReader: matched,
      maxLatencyMs: commit.count ? Math.max(...sources.map(s => s.writer.maxLatencyMs ?? 0)) : null },
    feedLag: lag.summary(), maintenanceEvents: sum(s => s.maintenanceEvents),
    maintenanceDensityMet: sources.every(s => s.maintenanceDensityMet),
    maintenanceWindows: sources.flatMap(s => s.maintenanceWindows),
    client: { ...sources[0].client, mainElu: weighted(s => s.client.mainElu), saturated: sources.some(s => s.client.saturated) },
    engine: { ...sources[0].engine, samples: sum(s => s.engine.samples), cpuPercentMean: weighted(s => s.engine.cpuPercentMean),
      peakMemBytes: Math.max(...sources.map(s => s.engine.peakMemBytes ?? 0)) },
    _read: read, _commit: commit, _feedLag: lag, _buckets: buckets,
  };
}

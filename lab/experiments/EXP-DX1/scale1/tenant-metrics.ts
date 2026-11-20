import { liveWindows, type PeakAlignment } from "./deep-live.ts";
import assert from "node:assert/strict";
import { Histogram } from "../../../bench/lib/hist.ts";
import {
  histogramDistribution,
  bootstrap90,
  percentile,
  ratioBar,
} from "../../../bench/lib/verdict-statistics.ts";
import { R, type ReadRecord } from "../../../bench/lib/observe.ts";
import { VERDICT_CLOCK, verdictMs } from "../../../trace/instrument.mjs";
import { accountOfSubject, type Account } from "./tenants.ts";
import type { tenantFeedAt } from "./tenant-feed.ts";
type Phase = { idx: number; name: string; start: number; end: number };
const blank = () => ({
  commit: new Histogram(),
  read: new Histogram(),
  feed: new Histogram(),
  offered: 0,
  fullOffered: 0,
  fullExpired: 0,
  acked: 0,
  expired: 0,
  failed: 0,
  incorrectReads: 0,
  missingFeed: 0,
});
const keys = ["commit", "read", "feed"] as const;
const clock = {
  read: "reader/service-ms",
  feed: "publication-to-durable-effect/1",
  commit: VERDICT_CLOCK,
};
export function tenantObservations(
  accounts: Account[],
  phases: Phase[],
  settleMs: number,
  visit: (f: (r: ReadRecord, k: number) => void) => void,
  verdicts: Uint8Array,
  writes: readonly any[],
  lags: readonly { position: number; lagMs: number }[],
  view: ReturnType<typeof tenantFeedAt>,
) {
  const result = phases.map((p) => ({
    name: p.name,
    start: p.start,
    from: Math.min(p.end, p.start + settleMs),
    to: p.end,
    by: new Map(accounts.map((a) => [a.key, blank()])),
  }));
  visit((r, k) => {
    const phase = result[r[R.phase]];
    if (!phase || r[R.start] < phase.from || r[R.start] >= phase.to) return;
    const b = phase.by.get(accountOfSubject(accounts, r[R.subject]).key)!;
    if (verdicts[k] === 0) b.read.recordMs(r[R.latency]);
    else b.incorrectReads++;
  });
  const lagsByPosition = new Map(lags.map((l) => [l.position, l.lagMs]));
  assert.equal(lags.length, lagsByPosition.size);
  let compared = 0,
    missing = 0;
  for (const w of writes) {
    if (w.stream !== "background" || w.resend) continue;
    const account = accountOfSubject(accounts, w.subject);
    assert(w.tenant === account.index);
    const full = result
      .find((p) => w.scheduledAt >= p.start && w.scheduledAt < p.to)
      ?.by.get(account.key);
    if (full) {
      full.fullOffered++;
      if (w.expired) full.fullExpired++;
    }
    const population = result
      .find((p) => w.scheduledAt >= p.from && w.scheduledAt < p.to)
      ?.by.get(account.key);
    if (population) population.offered++;
    if (w.expired || w.outcome !== "committed") {
      if (population) {
        population.failed++;
        population.expired += Number(w.expired);
      }
      continue;
    }
    const acknowledge = result
      .find((p) => w.ackPublishedAt >= p.from && w.ackPublishedAt < p.to)
      ?.by.get(account.key);
    if (acknowledge) acknowledge.acked++;
    const effect = view.matched.get(w.position),
      lag = lagsByPosition.get(w.position);
    if (
      effect?.size !== 1 ||
      effect.get(w.subject) !== account.key ||
      lag === undefined ||
      !Number.isFinite(lag) ||
      lag < 0
    ) {
      missing++;
      if (population) population.missingFeed++;
    } else {
      compared++;
      population?.feed.recordMs(lag);
    }
    population?.commit.recordMs(verdictMs(w));
  }
  return {
    feed: {
      matched: compared,
      missing,
      sha256: view.sha256,
      after: view.after,
      high: view.high,
      checkpoint: view.checkpoint,
      cursors: view.cursors,
    },
    windows: result.map((p) => ({
      name: p.name,
      start: p.start,
      from: p.from,
      to: p.to,
      accounts: Object.fromEntries(
        [...p.by].map(([a, b]) => [
          a,
          { ...b, commit: b.commit.toJSON(), read: b.read.toJSON(), feed: b.feed.toJSON() },
        ]),
      ),
    })),
  };
}
type Observations = ReturnType<typeof tenantObservations>;
type Series = Observations["windows"][number]["accounts"][string];
function quantile(b: Series, key: (typeof keys)[number], id: string) {
  const d = histogramDistribution(Histogram.fromJSON(b[key]), clock[key]);
  return { n: d.n, p99Ms: percentile(d, 0.99), interval90: bootstrap90(d, 0.99, id) };
}
// [DX-SCALE1] Why: sustained throughput counts actual unique acknowledgements during the settled wall interval. Rejected: reporting offered writes per second or averaging independently computed per-tenant percentiles.
export function compareTenants(
  data: Observations[],
  all: readonly Account[],
  invalid: string | null,
  alignment?: PeakAlignment,
  bounded = false,
) {
  assert(data.length);
  const names = data[0]!.windows.map((p) => p.name);
  assert(data.every((x) => JSON.stringify(x.windows.map((p) => p.name)) === JSON.stringify(names)));
  const sentinel = "account-001";
  const geometry = alignment ? liveWindows(alignment) : undefined;
  if (geometry)
    assert.deepEqual(
      names,
      geometry.map((w) => w.name),
    );
  let alone: Series | undefined;
  let baselineFault = false;
  const windows = names.map((name, i) => {
    const first = data[0]!.windows[i]!,
      by: Record<string, Series> = {};
    for (const d of data) {
      const phase = d.windows[i]!;
      assert(phase.from === first.from && phase.to === first.to);
      for (const [a, b] of Object.entries(phase.accounts)) {
        assert(!by[a]);
        by[a] = b;
      }
    }
    assert.deepEqual(Object.keys(by).sort(), all.map((a) => a.key).sort());
    const summed = blank();
    const metrics = Object.fromEntries(
      Object.entries(by).map(([a, b]) => {
        for (const k of keys) summed[k].merge(Histogram.fromJSON(b[k]));
        for (const k of [
          "fullOffered",
          "fullExpired",
          "offered",
          "acked",
          "failed",
          "expired",
          "incorrectReads",
          "missingFeed",
        ] as const)
          summed[k] +=
            b[k] ?? (k === "offered" ? Histogram.fromJSON(b.commit).count + b.failed : 0);
        const percentiles = Object.fromEntries(
          keys.map((k) => [k, quantile(b, k, name + "/" + a + "/" + k)]),
        );
        const observed = (key: (typeof keys)[number], limit: number, minimum: number) => {
          const m = percentiles[key]!;
          return {
            ...m,
            limitMs: limit,
            pass:
              invalid ||
              b.failed ||
              b.incorrectReads ||
              b.missingFeed ||
              m.n < minimum ||
              m.p99Ms === null
                ? null
                : m.p99Ms <= limit,
          };
        };
        const is256 = /^L256(?:-|$)/.test(name);
        return [
          a,
          {
            fullOffered: b.fullOffered,
            fullExpired: b.fullExpired,
            offered: b.offered,
            acked: b.acked,
            failed: b.failed,
            expired: b.expired,
            incorrectReads: b.incorrectReads,
            missingFeed: b.missingFeed,
            ...percentiles,
            bars: {
              commitP99: observed("commit", 50, 500),
              ...(is256
                ? { readP99: observed("read", 100, 1), feedP99: observed("feed", 250, 500) }
                : {}),
              zeroExpired: b.expired === 0,
              correctReads: b.read.count ? b.incorrectReads === 0 : null,
            },
          },
        ];
      }),
    );
    if (i === 0) {
      alone = by[sentinel];
      baselineFault = !!(
        baselineFault ||
        summed.failed ||
        summed.incorrectReads ||
        summed.missingFeed
      );
    }
    const quiet = by[sentinel]!,
      faults =
        invalid ||
        (baselineFault || summed.failed || summed.incorrectReads || summed.missingFeed
          ? "incomplete operations, feed or reads"
          : null);
    const ratios = keys.map((k) => ({
      ...ratioBar(
        "P6-" + name + "-" + k,
        histogramDistribution(Histogram.fromJSON(quiet[k]), clock[k]),
        histogramDistribution(Histogram.fromJSON(alone![k]), clock[k]),
        1.25,
        { minimum: k === "commit" ? 500 : 1, invalid: faults },
      ),
      sampleUnit:
        k === "commit"
          ? "unique acknowledged primary"
          : k === "read"
            ? "correct scoped read"
            : "matched durable delivery",
    }));
    const seconds = (first.to - first.from) / 1000;
    return {
      name,
      from: first.from,
      to: first.to,
      seconds,
      fullOffered: summed.fullOffered,
      fullExpired: summed.fullExpired,
      fullOfferedPerS: summed.fullOffered / ((first.to - (first.start ?? first.from)) / 1000),
      offered: summed.offered,
      expired: summed.expired,
      failed: summed.failed,
      offeredPerS: seconds > 0 ? summed.offered / seconds : null,
      ...(geometry
        ? {
            sentinelRate: geometry[i]!.rates![0],
            nominalOfferedPerS: geometry[i]!.rates!.reduce((a, b) => a + b, 0),
          }
        : {}),
      acked: summed.acked,
      sustainedCommitsPerS: seconds > 0 ? summed.acked / seconds : null,
      ratios,
      quietHistograms: Object.fromEntries(keys.map((k) => [k, quiet[k]])),
      accounts: metrics,
      pooled: Object.fromEntries(
        keys.map((k) => [
          k,
          quantile({ ...by[sentinel]!, [k]: summed[k].toJSON() }, k, name + "/all/" + k),
        ]),
      ),
    };
  });
  const quietMiss = windows.find(
    (w, i) =>
      i > 0 && !["all-burst", "all-low"].includes(w.name) && w.ratios.some((r) => r.pass === false),
  );
  const firstMiss = windows.find(
    (w) => ["two", "five", "ten"].includes(w.name) && w.ratios.some((b) => b.pass === false),
  );
  return {
    windows,
    ...(alignment
      ? {
          loadBoundary: invalid
            ? {
                lowestObservedFailure: null,
                highestLowerObservedWithinBar: null,
                unjudged: invalid,
              }
            : liveBoundary(windows, bounded),
          ninePeakQuiet: pooledQuietPeaks(windows, invalid),
        }
      : {}),
    firstQuietMiss: quietMiss
      ? {
          name: quietMiss.name,
          acknowledged: quietMiss.acked,
          seconds: quietMiss.seconds,
          commitsPerS: quietMiss.sustainedCommitsPerS,
        }
      : null,
    firstSteadyMiss: firstMiss
      ? {
          name: firstMiss.name,
          acknowledged: firstMiss.acked,
          seconds: firstMiss.seconds,
          commitsPerS: firstMiss.sustainedCommitsPerS,
          metrics: firstMiss.ratios.filter((b) => b.pass === false).map((b) => b.id),
        }
      : null,
  };
}

// [DX-SCALE1] Why: the lowest observed failing offered rate and the highest lower observed keeping pace bracket the limit. Rejected: extrapolating capacity from a clipped p99 or calling the busiest tenant quiet.
export function liveBoundary(
  windows: {
    name: string;
    offered: number;
    expired: number;
    failed: number;
    offeredPerS: number | null;
    fullOfferedPerS?: number;
    fullExpired?: number;
    sustainedCommitsPerS: number | null;
    sentinelRate?: number;
    nominalOfferedPerS?: number;
    ratios: { pass: boolean | null; id: string }[];
  }[],
  commitOnly = false,
) {
  const relevant = (rs: (typeof windows)[number]["ratios"]) =>
    commitOnly ? rs.filter((r) => r.id.endsWith("-commit")) : rs;
  const points = windows
    .filter((w) => w.name !== "alone" && w.offered > 0 && w.offeredPerS !== null)
    .map((w) => ({
      window: w.name,
      offeredPerS: w.fullOfferedPerS ?? w.offeredPerS!,
      nominal: w.nominalOfferedPerS,
      ackPerS: w.sustainedCommitsPerS,
      expired: w.fullExpired ?? w.expired,
      failed: w.failed,
      quiet: w.sentinelRate === 3.5,
      quietMiss: w.sentinelRate === 3.5 && relevant(w.ratios).some((r) => r.pass === false),
      quietMet:
        w.sentinelRate === 3.5 &&
        relevant(w.ratios).some((r) => r.pass === true) &&
        relevant(w.ratios).every((r) => r.pass === true),
    }))
    .sort((a, b) => a.offeredPerS - b.offeredPerS);
  const first = points.find((p) => p.expired > 0 || p.quietMiss) ?? null;
  const lower =
    points
      .filter((p) => p.failed === 0 && p.quietMet && (!first || p.offeredPerS < first.offeredPerS))
      .at(-1) ?? null;
  return {
    lowestObservedFailure: first,
    firstExpiry: points.find((p) => p.expired > 0) ?? null,
    highestLowerObservedWithinBar: lower,
  };
}

function pooledQuietPeaks(
  windows: {
    name: string;
    accounts: Record<string, any>;
    quietHistograms: Record<string, any>;
    expired: number;
    failed: number;
    ratios: { status: string }[];
  }[],
  invalid: string | null,
) {
  const baseline = windows[0]!,
    repeats = windows.filter((w) => /^nine-peak-[123]$/.test(w.name));
  assert(baseline.name === "alone" && repeats.length === 3);
  return keys.map((key) => {
    const merged = new Histogram();
    for (const w of repeats) merged.merge(Histogram.fromJSON(w.quietHistograms[key]));
    const dirty = [baseline, ...repeats].some(
      (w) => w.failed || Object.values(w.accounts).some((a) => a.incorrectReads || a.missingFeed),
    );
    return ratioBar(
      "deep-live/nine-peak/" + key,
      histogramDistribution(merged, clock[key]),
      histogramDistribution(Histogram.fromJSON(baseline.quietHistograms[key]), clock[key]),
      1.25,
      {
        minimum: key === "commit" ? 500 : 1,
        invalid: invalid ?? (dirty ? "incomplete quiet or neighbor observations" : null),
      },
    );
  });
}

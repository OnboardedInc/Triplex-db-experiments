import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import type { Measure, Offer } from "./live-evidence.ts";

export const pacedArms = ["pace-0-a", "pace-32-feedback", "pace-32-fixed", "pace-0-b"];
export const pacedHz = 110;
export const reviewMs = 8000;
export type Baseline = Record<
  string,
  Record<Offer["kind"], Pick<Measure, "offered" | "ok" | "p99Ms">>
>;

// [DX-HA1] Why: charge each account against its own control and name unserved work explicitly.
// Rejected: a pooled percentile that hides a quiet account or a late request.
export function reviewPace(
  baseline: Baseline,
  samples: Offer[],
  offeredRate: number,
  at: number,
  previous: number,
) {
  const from = Math.max(0, at - 16000),
    through = at - 250;
  const interval = samples.filter((row) => row.due >= from && row.due < through);
  assert.deepEqual(Object.keys(baseline).sort(), [
    ...Array.from({ length: 10 }, (_, i) => "live" + i),
    "quiet",
  ]);
  let ratio = 0,
    incomplete = 0;
  for (const [account, operations] of Object.entries(baseline)) {
    for (const kind of ["read", "save"] as const) {
      const base = operations[kind];
      assert(base.p99Ms !== null && base.p99Ms > 0 && base.ok > 0);
      const rows = interval.filter((row) => row.actor === account && row.kind === kind);
      const step = account === "quiet" || kind === "read" ? 200 : 10000 / offeredRate;
      const phase = account === "quiet" ? 0 : (Number(account.slice(4)) * step) / 10;
      let expected = 0;
      for (let n = Math.max(0, Math.floor((from - phase) / step)); phase + n * step < through; n++)
        if (phase + n * step >= from) expected++;
      const good = rows.filter((row) => row.outcome === "verified" && row.end <= at);
      incomplete += Math.max(expected, rows.length) - good.length + base.offered - base.ok;
      const delays = good.map((row) => row.end - row.due).sort((a, b) => a - b);
      ratio = Math.max(ratio, (delays[Math.ceil(delays.length * 0.99) - 1] ?? 0) / base.p99Ms);
    }
  }
  const next =
    incomplete || ratio > 1.35
      ? Math.max(32, Math.floor(previous * 0.8))
      : ratio < 1.2
        ? Math.min(pacedHz, previous + 8)
        : previous;
  return { at, through, previous, next, ratio, incomplete };
}

export type PaceDecision = ReturnType<typeof reviewPace>;

// [DX-HA1] Why: each credit waits from the last actual offer, including after pauses.
// Rejected: draining accumulated tokens into a burst.
export class TailPacer {
  private previous = -Infinity;
  readonly decisions: PaceDecision[] = [];
  constructor(
    private start: number,
    private duration: number,
    private offeredRate: number,
    readonly baseline?: Baseline,
  ) {}
  async grant(samples: Offer[]) {
    while (true) {
      const now = performance.now() - this.start;
      if (now >= this.duration) return;
      if (this.baseline) {
        for (let at = (this.decisions.length + 1) * reviewMs; at <= now; at += reviewMs)
          this.decisions.push(
            reviewPace(this.baseline, samples, this.offeredRate, at, this.rate()),
          );
      }
      const due = this.previous + 1000 / this.rate();
      if (now >= due) {
        this.previous = now;
        return this.start + now;
      }
      const review = this.baseline ? (this.decisions.length + 1) * reviewMs : Infinity;
      await delay(Math.max(1, Math.min(due, review, this.duration) - now));
    }
  }
  rate() {
    return this.decisions.at(-1)?.next ?? pacedHz;
  }
}

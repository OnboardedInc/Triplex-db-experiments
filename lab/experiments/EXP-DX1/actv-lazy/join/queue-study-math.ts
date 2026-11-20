import assert from "node:assert/strict";

export type SaveClock = { scheduled: number; ack: number; observed: number };
type Interval = { start: number; end: number };

export function distribution(values: readonly number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  assert(sorted.every(Number.isFinite));
  const point = (q: number) => sorted[Math.ceil(sorted.length * q) - 1] ?? null;
  return { n: sorted.length, p50: point(0.5), p99: point(0.99), max: sorted.at(-1) ?? null };
}

export function saveTimes(saves: readonly SaveClock[], interval: Interval) {
  return saves
    .filter((s) => s.scheduled >= interval.start && s.scheduled < interval.end)
    .map((s) => s.ack - s.scheduled);
}

export function screenSaves(
  schedule: readonly number[],
  saves: readonly SaveClock[],
  interval: Interval,
  observedAt: number,
) {
  const { start, end } = interval;
  assert(start < end && observedAt >= end + 1000);
  const observed = saves.filter((r) => r.observed <= observedAt);
  const due = new Set(schedule);
  assert.equal(due.size, schedule.length);
  assert.equal(new Set(observed.map((r) => r.scheduled)).size, observed.length);
  for (const r of observed)
    assert(due.has(r.scheduled) && r.scheduled <= r.ack && r.ack <= r.observed);
  const issued = schedule.filter((t) => t >= start && t < end);
  assert(issued.length > 0);
  const backlog = (at: number) =>
    schedule.filter((t) => t < at).length - observed.filter((r) => r.ack < at).length;
  const acknowledgedInWindow = observed.filter((r) => r.ack >= start && r.ack < end).length;
  const through = new Set(observed.filter((r) => r.ack <= end + 1000).map((r) => r.scheduled));
  const pendingAfterOneSecond = schedule.filter((t) => t < end && !through.has(t)).length;
  const backlogAt = Array.from({ length: 4 }, (_, i) => backlog(start + ((end - start) * i) / 3));
  // [DX-ACT2] Why: count ACKs on the save-only clock and allow the one-save boundary effect in short cells. Rejected: counting later drain as offered-rate goodput.
  const tolerance = Math.max(1, Math.floor(issued.length * 0.01));
  const reason =
    pendingAfterOneSecond > 0
      ? "still pending one second after the save-only window"
      : acknowledgedInWindow < issued.length - tolerance ||
          backlogAt.at(-1)! > backlogAt[0]! + tolerance
        ? "the save queue grew during the rated interval"
        : null;
  return {
    offered: issued.length,
    acknowledgedInWindow,
    pendingAfterOneSecond,
    backlogAt,
    reason,
    latency: distribution(
      saveTimes(
        observed.filter((r) => r.ack <= end + 1000),
        interval,
      ),
    ),
  };
}

// [DX-ACT2] Why: a late scheduled operator action is a measured miss, without creating a queue of release offers. Rejected: changing the next offer time after the previous Publish finishes.
export class PublishSlot {
  private busy = false;
  start<T>(work: () => Promise<T>) {
    if (this.busy) return undefined;
    this.busy = true;
    return Promise.resolve()
      .then(work)
      .finally(() => {
        this.busy = false;
      });
  }
}

export function releaseStages(
  offered: number,
  turn: number,
  ack: number,
  available: number,
  response: number,
) {
  assert(offered <= turn && turn <= ack && available <= response);
  // [DX-ACT2] Why: a current reader can see the native commit before the writer receives its reply. Rejected: counting the overlapping part of those clocks twice.
  const learnsAt = Math.max(ack, available);
  return {
    toFront: turn - offered,
    transaction: ack - turn,
    learn: learnsAt - ack,
    firstRead: Math.max(ack, response) - learnsAt,
  };
}

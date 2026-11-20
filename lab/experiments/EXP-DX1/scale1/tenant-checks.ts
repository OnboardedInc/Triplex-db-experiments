import assert from "node:assert/strict";
import { setTimeout as sleep } from "node:timers/promises";
import { OpenLoopScheduler, type SchedulerOptions } from "../../../bench/lib/scheduler.ts";
import type { TraceEvent } from "../../../bench/lib/trace.ts";
import type { Account } from "./tenants.ts";
export const checkStream = (key: string) => "tenant-check-" + key;
type CheckJob = {
  key: number;
  scheduledAt: number;
  ev: TraceEvent;
  onDone?: (position: number) => void;
};
// [DX-SCALE1] Why: twelve low-rate primary offers often contain no lost ACK, retry or correction. Each account therefore executes a separate correctness-only command after the measured window, including replay and independent retrieval of its original receipt. Rejected: marking a zero denominator as a pass or changing the frozen low-rate offers.
export async function challengeTenants(
  accounts: readonly Account[],
  start: number,
  opts: SchedulerOptions<CheckJob>,
) {
  const jobs: CheckJob[] = [];
  for (const a of accounts) {
    const ev: TraceEvent = {
      seq: 7000000000 + a.index,
      subject: a.first,
      kind: "system",
      atMs: 0,
      facts: 5,
      active: false,
      correction: true,
      ackLoss: true,
      burst: false,
      resend: false,
      stream: checkStream(a.key),
    };
    jobs.push({ key: a.first, scheduledAt: start, ev });
    jobs.push({
      key: a.first,
      scheduledAt: start + 1,
      ev: { ...ev, ackLoss: false, resend: true },
    });
  }
  jobs.sort((a, b) => a.scheduledAt - b.scheduledAt);
  const scheduler = new OpenLoopScheduler(jobs, { ...opts, until: undefined, maxInFlight: 4 });
  scheduler.start();
  try {
    const deadline = Date.now() + 180000;
    while (scheduler.completed < jobs.length && Date.now() < deadline) await sleep(50);
    assert.equal(scheduler.completed, jobs.length);
    assert.equal(scheduler.expired, 0);
  } finally {
    scheduler.stop();
  }
  return accounts.map((a) => ({
    account: a.key,
    subject: a.first,
    seq: 7000000000 + a.index,
    stream: checkStream(a.key),
  }));
}

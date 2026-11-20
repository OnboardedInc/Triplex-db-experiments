import assert from "node:assert/strict";
import { test } from "node:test";
import { BasisWindow, HotSubjects, ReceiptBasisRing, suffixDelta } from "../lib/basis-window.ts";
import { completedMaintenanceInWindow, scheduleMaintenanceBins } from "../lib/maintenance.ts";

test("maintenance wakes early twice, then requests each job inside its original bin", async () => {
  let clock = 1.4;
  const from = 2_001.25, to = from + 3 * 45_000;
  const jobs: { phase: string; completed: boolean; driverRequestedAtMs: number; driverCompletedAtMs: number }[] = [];
  await scheduleMaintenanceBins(from, to, true, () => clock, async delay => {
    clock += delay > 2 ? delay - 1.8 : delay;
  }, async wait => {
    assert(wait > 500);
    const driverRequestedAtMs = clock;
    clock += 501;
    jobs.push({ phase: "L256-A", completed: true, driverRequestedAtMs, driverCompletedAtMs: clock });
  });
  assert.equal(jobs.length, 3);
  for (const [i, job] of jobs.entries()) {
    const start = from + i * 45_000;
    assert(job.driverRequestedAtMs >= start + 10);
    assert.equal(completedMaintenanceInWindow(job, "L256-A", start, start + 45_000), true);
  }
});

test("receipt cursor and hot ordinals match legacy across expiry, wrap and readmission", () => {
  const ring = new ReceiptBasisRing<{ at: number; seq: number }>();
  const onReader = new BasisWindow<{ at: number; seq: number }>();
  const hot = new HotSubjects();
  const full: { at: number; seq: number }[] = [];
  const touched = new Map<number, number>();
  let cursor: number | null = null;
  let t = 100;
  const verify = (time: number) => {
    const current = full.filter(x => time - x.at <= 3_600_000).slice(-2000);
    const snapshot = current.length ? current : full.slice(-1);
    assert.deepEqual(ring.snapshot(time), snapshot);
    const delta = ring.delta(time, cursor);
    assert.deepEqual(delta, suffixDelta(snapshot, full.length, cursor));
    assert.deepEqual(onReader.apply(delta), snapshot);
    cursor = ring.length;
    assert.deepEqual(hot.snapshot(time), [...touched].filter(([, at]) => time - at <= 60_000).map(([s]) => s));
  };
  verify(t);
  for (let i = 0; i < 47_000; i++) {
    const subject = (i * 19) % 991;
    t += 317;
    const ack = { at: t, seq: i };
    full.push(ack); ring.push(ack);
    hot.update(subject, t); touched.set(subject, t);
    if (i % 123 === 0) { verify(t); verify(t + 1); }
  }
  verify(t + 3_600_000);
  verify(t + 3_600_001);
  hot.update(0, t + 3_600_002); touched.set(0, t + 3_600_002);
  verify(t + 3_600_002);
});

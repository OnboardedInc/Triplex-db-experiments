import { describe, expect, it } from "vitest";
import {
  commitClocks,
  instrumentMetrics,
  idleAndPhaseMetrics,
  instrumentMarkdown,
} from "../../../lab/trace/instrument.mjs";
import { Histogram } from "../../../lab/bench/lib/hist.ts";
import { OpenLoopScheduler } from "../../../lab/bench/lib/scheduler.ts";

// [DX-T1-10] Why: fractional wake tests control the clock independently of callbacks and preserve admission/ACK boundaries.
// Rejected: wall-clock sleeps as proof of a 50-microsecond timer or tests that accept early offers.
function fakeWakes() {
  let at = 0;
  const queue: { kind: string; delay: number; run: () => void; cancelled: boolean }[] = [];
  const add = (kind: string, delay: number, run: () => void) => {
    const w = { kind, delay, run, cancelled: false };
    queue.push(w);
    return () => {
      w.cancelled = true;
    };
  };
  return {
    now: () => at,
    set: (v: number) => {
      at = v;
    },
    queue,
    wakes: {
      after: (d: number, f: () => void) => add("timer", d, f),
      soon: (f: () => void) => add("immediate", 0, f),
    },
  };
}
it("offers at a fractional deadline, yielding between checks, with no early dispatch", async () => {
  const f = fakeWakes(),
    starts: number[] = [],
    done: any[] = [];
  const s = new OpenLoopScheduler([{ key: 1, scheduledAt: 10.625 }], {
    maxInFlight: 1,
    deadlineMs: 100,
    now: f.now,
    wakes: f.wakes,
    exec: async () => {
      starts.push(f.now());
    },
    onDone: (r) => done.push(r),
  });
  s.start();
  expect(f.queue[0]!.delay).toBe(8.625);
  f.set(8.625);
  f.queue.shift()!.run();
  expect(starts).toEqual([]);
  let yields = 0;
  for (const at of [8.7, 9.3, 10.5, 10.624, 10.625]) {
    expect(f.queue[0]!.kind).toBe("immediate");
    f.set(at);
    f.queue.shift()!.run();
    yields++;
    if (at < 10.625) expect(starts).toEqual([]);
  }
  await Promise.resolve();
  await Promise.resolve();
  expect(yields).toBe(5);
  expect(starts).toEqual([10.625]);
  expect(done[0].offeredAt).toBe(10.625);
});
it("cancels the imminent wake and keeps a literal legacy-timer control", () => {
  for (const offerTiming of ["legacy", "precise"] as const) {
    const f = fakeWakes();
    let calls = 0;
    const s = new OpenLoopScheduler([{ key: 1, scheduledAt: 10.625 }], {
      maxInFlight: 1,
      deadlineMs: 100,
      now: f.now,
      wakes: f.wakes,
      offerTiming,
      exec: async () => {
        calls++;
      },
      onDone: () => {},
    });
    s.start();
    expect(f.queue[0]!.delay).toBe(offerTiming === "legacy" ? 10.625 : 8.625);
    s.stop();
    expect(f.queue[0]!.cancelled).toBe(true);
    f.set(20);
    f.queue.shift()!.run();
    expect(calls).toBe(0);
  }
});
const row = (seq = 1) => ({
  stream: "background",
  resend: false,
  seq,
  facts: 10,
  burst: true,
  outcome: "committed",
  expired: false,
  scheduledAt: 10,
  offeredAt: 10.7,
  startedAt: 14,
  ackPublishedAt: 25,
  finishedAt: 25.4,
  latencyMs: 15.4,
  waitMs: 4,
  offsetMs: 10,
  queue: [
    { cause: "scheduler-late", start: 10, end: 10.7 },
    { cause: "subject", start: 10.7, end: 14 },
  ],
});
describe("commit clocks", () => {
  it("retains subject/slot waits and keeps original offer-to-finish latency authoritative", () => {
    const w = row(),
      c = commitClocks(w);
    expect(c.latencyToAckMs).toBe(15);
    expect(c.latencyCorrectedMs).toBeCloseTo(14.3);
    expect(c.timerLatenessMs).toBeCloseTo(0.7);
    expect(c.postAckMs).toBeCloseTo(0.4);
    expect(w.latencyMs).toBe(15.4);
    const off = { ...w, queue: undefined };
    expect(commitClocks(off)).toEqual(c);
  });
  for (const [name, change] of Object.entries({
    early: { ackPublishedAt: 13 },
    future: { ackPublishedAt: 26 },
    wrongOffer: { offeredAt: 11 },
    wrongLatency: { latencyMs: 14 },
    forgedAck: { latencyToAckMs: 12 },
    missingOffer: { offeredAt: undefined, queue: undefined },
  }))
    it("rejects " + name + " clocks", () =>
      expect(() => commitClocks({ ...row(), ...change })).toThrow(),
    );
});
it("reports all three clocks with a corrected matched denominator, without modifying verdicts", () => {
  const b: any = {
    config: { settleS: 0 },
    traceStartAbsMs: 0,
    matchedBaseline: { offeredUntilTraceS: 1 },
    phases: [{ name: "L256", start: 0, end: 100 }],
    priorities: { P2: { bars: [{ value: 15.4, pass: false }] } },
  };
  const before = JSON.stringify(b),
    w = row();
  const m = instrumentMetrics(b, [w], [w], Histogram);
  expect(m.authoritative).toBe("observed");
  expect(m.definitions.observed.phases.L256.writerRatio).toBeCloseTo(1, 4);
  expect(m.definitions.corrected.phases.L256.writerRatio).toBeCloseTo(1, 4);
  expect(m.definitions.corrected.bandsAtL256["5-10"].p50Ms).toBeCloseTo(14.3);
  expect(JSON.stringify(b)).toBe(before);
  expect(instrumentMarkdown(m)).toContain("cannot qualify a PASS");
});
it("uses every earlier active request and attributes growth versus sparse by scheduled offer", () => {
  const long = { ...row(), scheduledAt: 0, startedAt: 0, finishedAt: 1000, latencyMs: 1000 };
  const many = Array.from({ length: 50 }, (_, k) => ({
    ...row(k + 2),
    scheduledAt: k + 1,
    startedAt: k + 1,
    finishedAt: k + 1.1,
    latencyMs: 0.1,
  }));
  const behind = { ...row(90), scheduledAt: 100, startedAt: 100, finishedAt: 160, latencyMs: 60 };
  const m = idleAndPhaseMetrics(
    [long, ...many, behind],
    [
      { name: "grow3", start: 0, end: 1 },
      { name: "p4mix", start: 1, end: 200 },
    ],
  );
  expect(m.groups.find((g: any) => g.gap === "overlap").service.count).toBe(51);
  expect(m.phaseTypes.growth.over50).toBe(1);
  expect(m.phaseTypes.sparse.over50).toBe(1);
});

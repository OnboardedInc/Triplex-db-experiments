import { expect, it } from "vitest";
import { writerStats } from "../../../lab/trace/writer-stats.mjs";
const make = () => ({
  m: { tag: "run", source: "head", slot: "slot", level: "summary", startedAt: 0 },
  b: { status: "DONE", endedAt: new Date(1000).toISOString() },
  w: [
    {
      traceId: "trace",
      stream: "background",
      resend: false,
      scheduledAt: 100,
      finishedAt: 200,
      latencyMs: 100,
    },
  ],
  e: [
    {
      type: "request",
      run: "run",
      source: "head",
      slot: "slot",
      thread: 0,
      traceId: "trace",
      start: 100,
      end: 200,
      spans: [{ name: "driver.queue.scheduler-late", start: 100, end: 170 }],
    },
    {
      type: "event",
      name: "node.gc",
      kind: 4,
      run: "run",
      source: "head",
      slot: "slot",
      thread: 0,
      start: 120,
      end: 130,
    },
    {
      type: "resource",
      run: "run",
      source: "head",
      slot: "slot",
      thread: 0,
      at: 150,
      memory: { heapUsed: 1024 },
    },
  ],
});
it("keeps the complete primary denominator, timed GC and writer-isolate heap", () => {
  const v = make(),
    s = writerStats(v.m, v.b, v.w, v.e);
  expect(s.commands).toBe(1);
  expect(s.over50).toEqual({ count: 1, totalMs: 100 });
  expect(s.schedulerLate50.unionMs).toBe(70);
  expect(s.gc.totalMs).toBe(10);
  expect(s.gc.kinds).toEqual({ "4": 1 });
  expect(s.heapUsed.p50).toBe(1024);
});
it.each(["foreign", "stale", "missing", "boundary"])("refuses %s telemetry", (mode) => {
  const v = make();
  if (mode === "foreign") v.e[1].source = "other";
  if (mode === "stale") v.e[1].start = -100;
  if (mode === "missing") v.e.shift();
  if (mode === "boundary") v.w[0].finishedAt = 201;
  expect(() => writerStats(v.m, v.b, v.w, v.e)).toThrow();
});

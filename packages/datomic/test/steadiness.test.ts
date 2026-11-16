import { expect, it } from "vitest";
import {
  counterDelta,
  diskCounters,
  ioCounters,
  mergeLateEpisodes,
} from "../../../lab/trace/steadiness.mjs";
it("uses exact disk-device counters and preserves missing/reset observations", () => {
  const d = diskCounters("253 16 vdb 1 0 2 3 4 0 8 9 0 10 11 0 0 0 0 12 13");
  expect(d["253:16"]).toMatchObject({
    name: "vdb",
    writeBytes: 4096,
    weightedMs: 11,
    flushes: 12,
    flushMs: 13,
  });
  expect(ioCounters("253:16 rbytes=12 wbytes=34 wios=1\n")["253:16"].wbytes).toBe(34);
  expect(counterDelta(10, 20)).toBe(10);
  expect(counterDelta(20, 10)).toBeNull();
  expect(counterDelta(null, 10)).toBeNull();
  expect(diskCounters(null)).toBeNull();
  expect(ioCounters(undefined)).toBeNull();
  const episodes = mergeLateEpisodes([
    { start: 0, end: 80, traceId: "a" },
    { start: 50, end: 130, traceId: "b" },
    { start: 200, end: 220, traceId: "c" },
  ]);
  expect(episodes).toHaveLength(1);
  expect(episodes[0]).toMatchObject({
    start: 0,
    end: 130,
    ms: 130,
    maximumSingleWaitMs: 80,
    traceIds: ["a", "b"],
  });
});

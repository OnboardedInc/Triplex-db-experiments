import assert from "node:assert/strict";
import test from "node:test";
import { liveWindows, liveArrivals } from "./deep-live.ts";
import { liveBoundary } from "./tenant-metrics.ts";

test("matched minutes preserve demand across layouts and alignments and hold the quiet baseline fixed", () => {
  const schedules = (["staggered", "coincident"] as const).map(liveWindows);
  const totals = schedules.map((ws) =>
    Array.from({ length: 10 }, (_, i) => ws.reduce((n, w) => n + w.rates![i]! * w.seconds, 0)),
  );
  assert.deepEqual(totals[0], totals[1]);
  for (const ws of schedules) {
    const rates = (name: string) => ws.find((w) => w.name === name)!.rates!;
    assert.equal(
      rates("plateau-10").reduce((a, b) => a + b, 0),
      235,
    );
    assert.equal(rates("nine-peak-1")[0], 3.5);
    assert(ws.filter((w) => w.name.startsWith("plateau-")).every((w) => w.seconds >= 300));
  }
  for (const [i, ws] of schedules.entries()) {
    const peaks = ws.slice(-30);
    assert.equal(peaks.length, 30);
    for (let a = 0; a < 10; a++) assert.equal(peaks.filter((w) => w.rates![a] === 39.4).length, 3);
    assert.deepEqual(
      [...new Set(peaks.map((w) => w.rates!.filter((x) => x === 39.4).length))].sort(
        (a, b) => a - b,
      ),
      i === 0 ? [1] : [0, 10],
    );
  }
  for (const rate of [3.5, 23.5, 39.4]) {
    const times: number[] = [];
    liveArrivals(3, rate, 300, (t) => times.push(t));
    for (let m = 0; m < 5; m++)
      assert.equal(times.filter((t) => t >= m * 60 && t < (m + 1) * 60).length, 60 * rate);
  }
});
test("only an observed expiry or a judged miss for the still-quiet account bounds saturation", () => {
  const row = (
    name: string,
    offeredPerS: number,
    sentinelRate: number,
    pass: boolean | null,
    expired = 0,
  ) => ({
    name,
    offered: 1000,
    expired,
    failed: expired,
    offeredPerS,
    sustainedCommitsPerS: offeredPerS - 1,
    sentinelRate,
    ratios: [{ pass, id: "commit" }],
  });
  const b = liveBoundary([
    row("alone", 3.5, 3.5, true),
    row("ten-steady", 35, 3.5, true),
    row("hot-sentinel", 70.9, 39.4, false),
    row("unjudged", 135, 3.5, null),
    row("crossing", 155, 3.5, false),
    row("overload", 235, 23.5, null, 3),
  ]);
  assert.equal(b.highestLowerObservedWithinBar?.window, "ten-steady");
  assert.equal(b.lowestObservedFailure?.window, "crossing");
  assert.equal(
    liveBoundary([row("overload", 235, 23.5, null, 3)]).lowestObservedFailure?.expired,
    3,
  );
});

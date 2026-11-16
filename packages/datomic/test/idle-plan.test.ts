import { expect, it } from "vitest";
import { idlePlan } from "../../../lab/bench/lib/idle-plan.ts";
import { traceDigest } from "../../../lab/bench/lib/trace.ts";

it("holds the ten-fact stream and exact gaps constant without replacing the frozen generator", () => {
  const a = idlePlan([10, 25, 50, 100, 250, 500, 1000], 150, 10000);
  expect(a.events).toHaveLength(1250);
  expect(new Set(a.events.map((e) => e.seq)).size).toBe(1250);
  for (const gap of [10, 25, 50, 100, 250, 500, 1000]) {
    const rows = a.events.filter((e) => !e.idleWarmup && e.idleGapMs === gap);
    expect(rows).toHaveLength(150);
    expect(rows.every((e) => e.facts === 10 && !e.resend && !e.ackLoss && !e.correction)).toBe(
      true,
    );
    expect(rows.slice(1).every((e, i) => e.atMs - rows[i].atMs === gap)).toBe(true);
  }
  expect(a.events.every((e, i) => i === 0 || e.atMs > a.events[i - 1].atMs)).toBe(true);
  expect(a.durationS).toBe(a.phases.reduce((n, p) => n + p.seconds!, 0));
  expect(traceDigest(a.events)).toBe(
    traceDigest(idlePlan([10, 25, 50, 100, 250, 500, 1000], 150, 10000).events),
  );
});
it("refuses ambiguous or unbounded gap plans", () => {
  for (const gaps of [[], [0], [10, 10], [1001], [25.5]])
    expect(() => idlePlan(gaps, 150, 10000)).toThrow();
  expect(() => idlePlan([25], 0, 10000)).toThrow();
  expect(() => idlePlan([25], 150, 0)).toThrow();
});

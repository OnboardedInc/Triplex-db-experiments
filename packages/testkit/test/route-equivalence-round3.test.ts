import { expect, it } from "vitest";
import {
  generateRouteHistory,
  generateRouteBases,
  makeOfflineRouteFixture,
  makeRouteEquivalenceCases,
  makeRouteExecutionPlan,
  measureRouteCoverage,
  requireRouteCoverage,
  validateRouteHistory,
  foldRouteHistory,
  routeHead,
  routeRow,
  runRouteEquivalence,
  type RouteHistory,
  type RouteFixture,
} from "../src/index.js";

// [EXP-RQ01] Why: adapt CX-VRQ01 14722ac probe.mjs/boundary.mjs into failing-closed regressions.
// Rejected: retaining only structural booleans (the reviewer demonstrated a real missed wrong answer).
const boundaryFixture = (broken = false): RouteFixture => {
  const source = makeOfflineRouteFixture("xtdb");
  const retired = new Set<number>();
  return {
    ...source,
    reset: (history) => {
      retired.clear();
      return source.reset(history);
    },
    event: async (event, context) => {
      const result = await source.event(event, context);
      if (
        event === "purge" &&
        context?.cutId === "custom" &&
        context.routes?.includes("X1-all-valid-time")
      ) {
        retired.add(context.horizon);
        retired.add(context.horizon - 1);
      }
      return result;
    },
    routes: source.routes.map((route, i) => ({
      ...route,
      retention:
        i < 2
          ? {
              kind: "position-retired" as const,
              plan: (_history, extension) => [
                {
                  id: "custom",
                  event: "purge" as const,
                  horizon: extension.position - i * 512,
                  pinned: false,
                },
              ],
            }
          : route.retention,
      read: async (request) => {
        const answer = await route.read(request);
        return broken && i === 0 && retired.has(request.basis.recordedPosition ?? -1)
          ? { ...answer, rows: answer.rows.slice(1) }
          : answer;
      },
    })),
  };
};
const customOptions = () => {
  const history = generateRouteHistory(42);
  const horizon = routeHead(history) + 4096;
  return {
    history,
    extension: {
      position: horizon,
      instant: 1100,
      writes: [{ op: "assert" as const, row: routeRow("boundary-extension", "extension", "new") }],
    },
  };
};

for (const seed of [1, 42, 890, 89, 891]) {
  it(`round3: seed ${seed} has complete consecutive physical groups and interior cuts`, () => {
    const history = generateRouteHistory(seed);
    validateRouteHistory(history, true);
    const plan = makeRouteExecutionPlan({ history, fixture: makeOfflineRouteFixture("xtdb") });
    expect(requireRouteCoverage(plan.history, plan.requests, plan).complete).toBe(true);
    const callbacks = new Set(
      history.commits.flatMap((c) => (c.nested ? [c.nested.callback] : [])),
    );
    for (const callback of callbacks) {
      const members = history.commits.filter((c) => c.nested?.callback === callback);
      expect(members).toHaveLength(2);
      expect(members[1]!.position).toBe(members[0]!.position + 1);
      expect(members.map((c) => c.nested!.ordinal)).toEqual([1, 2]);
      for (const member of members)
        expect(plan.requests.some((r) => r.basis.recordedPosition === member.position)).toBe(true);
    }
  });
}
const oldGap = (): RouteHistory => {
  const history = structuredClone(generateRouteHistory(42));
  const target = history.commits[9]!;
  const position = target.position + 1024;
  return {
    ...history,
    commits: history.commits.map((c) =>
      c === target ? { ...c, position, receipt: { ...c.receipt!, position } } : c,
    ),
    attempts: history.attempts!.map((a) =>
      a.id === target.receipt!.attemptId ? { ...a, position } : a,
    ),
  };
};
it("round3: the old nonconsecutive group rejects before use, even with matching receipts", async () => {
  const history = oldGap();
  expect(() => validateRouteHistory(history)).toThrow(/nonconsecutive nested group/);
  expect(() => foldRouteHistory(history)).toThrow(/nonconsecutive nested group/);
  expect(() => measureRouteCoverage(history)).toThrow(/nonconsecutive nested group/);
  let resets = 0;
  const fixture = makeOfflineRouteFixture("xtdb");
  await expect(
    runRouteEquivalence({
      history,
      fixture: {
        ...fixture,
        reset: () => {
          resets++;
        },
      },
    }),
  ).rejects.toThrow(/nonconsecutive nested group/);
  expect(resets).toBe(0);
});
it("round3: partial groups fail generation loudly", () => {
  expect(() => generateRouteHistory(42, 25)).toThrow(/incomplete nested group/);
});
it("round3: grammar rejects invalid ordinal, receipt, attempt and write content", () => {
  const mutate = (fn: (h: RouteHistory) => RouteHistory) =>
    expect(() => validateRouteHistory(fn(structuredClone(generateRouteHistory(42))), true)).toThrow(
      /Invalid route history/,
    );
  mutate((h) => ({
    ...h,
    commits: h.commits.map((c, i) =>
      i === 9 ? { ...c, nested: { ...c.nested!, ordinal: 1 } } : c,
    ),
  }));
  mutate((h) => ({
    ...h,
    commits: h.commits.map((c, i) =>
      i === 9 ? { ...c, receipt: { ...c.receipt!, instant: -1 } } : c,
    ),
  }));
  mutate((h) => ({ ...h, attempts: [] }));
  mutate((h) => ({
    ...h,
    commits: h.commits.map((c, i) => {
      if (i !== 0) return c;
      const { receipt: _receipt, ...missing } = c;
      return missing;
    }),
  }));
  mutate((h) => ({
    ...h,
    commits: h.commits.map((c, i) =>
      i === 1 ? { ...c, writes: [{ op: "retract", id: "missing" }] } : c,
    ),
  }));
  mutate((h) => ({
    ...h,
    commits: h.commits.map((c, i) => (i === 9 ? { ...c, nested: { ...c.nested!, size: 3 } } : c)),
  }));
});
it("round3: old default requests cannot qualify a custom extension/purge plan", async () => {
  const options = customOptions();
  await expect(
    makeRouteEquivalenceCases({
      ...options,
      requests: generateRouteBases(options.history),
      fixture: boundaryFixture(),
    })[0]!.run(),
  ).rejects.toThrow(/Missing retention boundary/);
});
it("round3: custom purge-cut dropped-row fault is caught with a clean control", async () => {
  const options = customOptions();
  const clean = await makeRouteEquivalenceCases({
    ...options,
    fixture: boundaryFixture(),
  })[0]!.run();
  expect(clean.violations).toEqual([]);
  for (const h of [options.extension.position, options.extension.position - 512]) {
    for (const p of [h, h - 1])
      expect(clean.observations.some((o) => o.request.basis.recordedPosition === p)).toBe(true);
    expect(
      clean.events.some((e) => e.context.horizon === h && e.outcome.retirement?.horizon === h),
    ).toBe(true);
  }
  const broken = await runRouteEquivalence({ ...options, fixture: boundaryFixture(true) });
  expect(broken.violations.some((v) => v.rule === "HE-1" && v.route === "X1-all-valid-time")).toBe(
    true,
  );
  expect(broken.violations.some((v) => v.rule === "HE-2")).toBe(true);
  expect(
    broken.violations.every((v) =>
      [options.extension.position, options.extension.position - 1].includes(
        v.request.basis.recordedPosition ?? -1,
      ),
    ),
  ).toBe(true);
  expect(broken.violations.some((v) => v.route === "X6-cold" || v.route === "X6-warm")).toBe(false);
  await expect(
    makeRouteEquivalenceCases({ ...options, fixture: boundaryFixture(true) })[0]!.run(),
  ).rejects.toThrow();
}, 60_000);
it("round3: coverage binds the frozen executed plan rather than regenerating defaults", () => {
  const options = customOptions();
  const plan = makeRouteExecutionPlan({ ...options, fixture: boundaryFixture() });
  expect(Object.isFrozen(plan.history.commits[0]!.writes)).toBe(true);
  expect(Object.isFrozen(plan.requests[0]!.basis)).toBe(true);
  expect(() =>
    requireRouteCoverage(plan.history, generateRouteBases(options.history), plan),
  ).toThrow(/binding mismatch/);
  expect(() => requireRouteCoverage(options.history)).toThrow(/exact execution plan/);
  expect(measureRouteCoverage(options.history).complete).toBe(false);
});
it("round3: retired stores cannot omit policies/cuts or silently decline purge execution", async () => {
  const options = customOptions();
  const source = boundaryFixture();
  const noCuts = {
    ...source,
    routes: source.routes.map((r) => ({
      ...r,
      retention: { kind: "position-retired" as const, plan: () => [] },
    })),
  };
  expect(() => makeRouteExecutionPlan({ ...options, fixture: noCuts })).toThrow(
    /declare retirement cuts/,
  );
  await expect(
    runRouteEquivalence({
      ...options,
      fixture: { ...source, event: () => ({ status: "pending", reason: "not implemented" }) },
    }),
  ).rejects.toThrow(/did not confirm/);
  await expect(
    runRouteEquivalence({
      ...options,
      fixture: {
        ...source,
        event: () => ({
          status: "model-applied",
          reason: "wrong boundary",
          retirement: { horizon: 1, pinned: false },
        }),
      },
    }),
  ).rejects.toThrow(/did not confirm/);
});

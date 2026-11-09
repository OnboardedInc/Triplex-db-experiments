// [EXP-RQ01] Why: preserve CX-VRQ01's custom-cut wrong-answer witness in the measured receipt.
// Rejected: a boundary flag without actual read outcomes (missed the custom-horizon defect).
export const retentionProbe = async (api) => {
  const {
    generateRouteHistory,
    routeHead,
    routeRow,
    generateRouteBases,
    makeOfflineRouteFixture,
    makeRouteEquivalenceCases,
    runRouteEquivalence,
    requireRouteCoverage,
  } = api;
  const history = generateRouteHistory(42),
    h = routeHead(history) + 4096;
  const extension = {
    position: h,
    instant: 1100,
    writes: [{ op: "assert", row: routeRow("probe-extension", "extension", "new") }],
  };
  const fixture = (broken) => {
    const f = makeOfflineRouteFixture("xtdb"),
      retired = new Set();
    return {
      ...f,
      event: async (event, context) => {
        const outcome = await f.event(event, context);
        if (
          event === "purge" &&
          context.cutId === "custom" &&
          context.routes?.includes("X1-all-valid-time")
        ) {
          retired.add(context.horizon);
          retired.add(context.horizon - 1);
        }
        return outcome;
      },
      routes: f.routes.map((route, i) => ({
        ...route,
        retention:
          i < 2
            ? {
                kind: "position-retired",
                plan: () => [{ id: "custom", event: "purge", horizon: h - i * 512, pinned: false }],
              }
            : route.retention,
        read: async (request) => {
          const answer = await route.read(request);
          return broken && i === 0 && retired.has(request.basis.recordedPosition)
            ? { ...answer, rows: answer.rows.slice(1) }
            : answer;
        },
      })),
    };
  };
  let missingCutsRejected = false;
  try {
    await makeRouteEquivalenceCases({
      history,
      extension,
      fixture: fixture(false),
      requests: generateRouteBases(history),
    })[0].run();
  } catch (error) {
    missingCutsRejected = /Missing retention boundary/.test(String(error));
  }
  if (!missingCutsRejected) throw new Error("Custom request omission was not rejected");
  const clean = await makeRouteEquivalenceCases({
    history,
    extension,
    fixture: fixture(false),
  })[0].run();
  const broken = await runRouteEquivalence({ history, extension, fixture: fixture(true) });
  const coverage = requireRouteCoverage(clean.plan.history, clean.plan.requests, clean.plan);
  const caughtHE1 = broken.violations.filter(
    (v) => v.rule === "HE-1" && v.route === "X1-all-valid-time",
  ).length;
  const caughtHE2 = broken.violations.filter((v) => v.rule === "HE-2").length;
  const correctRouteViolations = broken.violations.filter(
    (v) => v.route !== "X1-all-valid-time" && v.route !== "*",
  ).length;
  if (
    correctRouteViolations ||
    clean.violations.length ||
    !caughtHE1 ||
    !caughtHE2 ||
    broken.violations.some((v) => ![h, h - 1].includes(v.request.basis.recordedPosition))
  )
    throw new Error("Boundary mutant/control content mismatch");
  return {
    missingCutsRejected,
    cleanViolations: clean.violations.length,
    correctRouteViolations,
    caughtHE1,
    caughtHE2,
    planDigest: clean.plan.digest,
    retentionBoundaries: coverage.retentionBoundaries,
    events: clean.events,
    violations: broken.violations,
    observedRequests: clean.coverage,
  };
};

// @ts-nocheck -- [EXP-CHECKJS-R2] generated/optional runtime modules unavailable in standalone source checking. Binding errors remain checked by lab/bin/checkjs.mjs.
// [EXP-RQ01] Why: bind measured R31 denominators and actual nonzero reads to the gate receipt.
// Rejected: storing only seed labels (the original labels missed semantic operation families).
import fs from "node:fs";
import * as api from "../../../packages/testkit/dist/route.js";
import { retentionProbe } from "./retention-probe.mjs";
import {
  generateRouteHistory,
  makeOfflineRouteFixture,
  requireRouteCoverage,
  runRouteEquivalence,
  routeShape,
} from "../../../packages/testkit/dist/route.js";
const output = process.argv[2];
if (!output || fs.existsSync(output)) throw new Error("Provide a new coverage output path");
const records = [];
for (const seed of [1, 42, 890, 89, 891]) {
  const history = generateRouteHistory(seed);

  const fixture = makeOfflineRouteFixture("xtdb");
  const result = await runRouteEquivalence({
    fixture: { ...fixture, routes: fixture.routes.slice(0, 1) },
    history,
  });
  const structural = requireRouteCoverage(result.plan.history, result.plan.requests, result.plan);
  if (result.violations.length || !result.observations.length)
    throw new Error(`Coverage reads failed for ${seed}`);
  const observations = Object.fromEntries(
    ["L", "V", "P", "T", "TP", "H"].map((shape) => [
      shape,
      {
        answers: result.observations.filter(
          (o) => routeShape(o.request) === shape && o.outcome.startsWith("answer:"),
        ).length,
        refusals: result.observations.filter(
          (o) => routeShape(o.request) === shape && o.outcome.startsWith("refuse:"),
        ).length,
      },
    ]),
  );
  if (Object.values(observations).some((v) => v.answers < 1))
    throw new Error(`No answering reads for a shape: ${seed}`);
  records.push({
    ...structural,
    actualObservations: observations,
    events: result.events,
    scope: result.coverage,
    contracts: [...new Set(result.observations.map((o) => o.contract))],
    reference: result.reference,
    violations: result.violations.length,
  });
}
fs.writeFileSync(
  output,
  JSON.stringify(
    {
      experiment: "EXP-RQ01-round3",
      attemptToken: process.env.EXP_RQ01_ATTEMPT_TOKEN,
      records,
      retentionProbe: await retentionProbe(api),
      passed: true,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `coverage: ${records.length} seeds, all required offline R31 families/cuts and answering shapes witnessed`,
);

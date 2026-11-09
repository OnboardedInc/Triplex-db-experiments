import { qleverLatencyReceipt } from "../../../lab/receipts/latency.mjs";
import { qleverConnectionModeOf } from "../src/QleverClient.js";
/** Unchanged public testkit cases over compiled public QLever/core exports. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Effect } from "effect";
import { Capabilities, DatabaseScope } from "@triplex-build/triplex/runtime";
import { triplesConformanceCases } from "@triplex-build/triplex-testkit";
import { makeQleverRuntime } from "@triplex-build/triplex-qlever";
import { labQleverAccessToken, labQleverUrl } from "./lab-endpoint.ts";

const root = path.resolve(import.meta.dirname, "../../..");
const artifacts = process.env["TRIPLEX_RUN_ARTIFACTS"];
assert.ok(artifacts?.startsWith(root + path.sep), "Requires an owned devloop execution");
assert.equal(triplesConformanceCases.length, 44);
const accessToken = labQleverAccessToken();
const runId = randomUUID();
const answerPlan = process.env["QLEVER_AGGREGATE_ANSWER_PLAN"] ?? "native";
assert.ok(answerPlan === "native" || answerPlan === "bounded");
const runtime = makeQleverRuntime({
  url: labQleverUrl(),
  accessToken,
  queryLimits: { aggregateAnswerPlan: answerPlan },
});
const report: Record<string, any> = qleverLatencyReceipt({
  qleverConnectionMode: qleverConnectionModeOf(),
  format: "triplex-public-upstream44/1",
  backend: "qlever",
  runId,
  aggregateAnswerPlan: answerPlan,
  status: "RUNNING",
  querySurfaceQualification:
    "Foundation Triplex runtime only; arbitrary native SPARQL acceptance is separate",
  cases: [],
  limitations: [
    "Small upstream conformance corpus, not256clients, scale, native crash durability or all ten goals.",
    "Unchanged case programs execute through compiled public exports; this runner only records outcomes.",
  ],
});
const save = () =>
  writeFileSync(
    path.join(artifacts, "upstream44-report.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
save();
for (const entry of triplesConformanceCases) {
  const scope = DatabaseScope.test(`qlever-upstream44-${runId}-${report.cases.length}`);
  const started = performance.now();
  try {
    await Effect.runPromise(
      entry.run.pipe(
        Effect.provide(runtime.layer({ scope, capabilities: Capabilities.none })),
        Effect.timeout("60 seconds"),
        Effect.scoped,
      ),
    );
    report.cases.push({
      name: entry.name,
      scope,
      status: "PASS",
      elapsedMs: performance.now() - started,
    });
  } catch (cause) {
    report.cases.push({
      name: entry.name,
      scope,
      status: "FAIL",
      error: String(cause),
      elapsedMs: performance.now() - started,
    });
  }
  save();
  console.log(JSON.stringify(report.cases.at(-1)));
}
const passed = report.cases.filter((entry: any) => entry.status === "PASS").length;
report.status = passed === 44 ? "PASS_UPSTREAM44_ONLY" : "FAIL_RETAINED";
save();
writeFileSync(
  path.join(artifacts, "upstream44-status.json"),
  JSON.stringify({ executed: report.cases.length, passed }) + "\n",
  { flag: "wx" },
);
if (passed !== 44) process.exitCode = 1;

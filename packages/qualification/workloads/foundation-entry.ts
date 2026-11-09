import { latencyReceipt, connectionModeForBackend } from "../../../lab/receipts/latency.mjs";
/** Fresh unchanged44-case foundation acceptance, independent of native task APIs. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { Effect } from "effect";
import { Capabilities, DatabaseScope } from "@triplex-build/triplex/runtime";
import { runtimeConformance, triplesConformanceCases } from "@triplex-build/triplex-testkit";
import { loadQualificationBackend } from "@triplex-build/triplex-qualification";

const root = path.resolve(import.meta.dirname, "../../..");
const args = process.argv.slice(2);
const option = (name: string) => args[args.indexOf(name) + 1];
const output = path.resolve(option("--output")!);
const resultsOutput = path.resolve(option("--results-output")!);
const artifactRoot = process.env["TRIPLEX_RUN_ARTIFACTS"];
assert.ok(artifactRoot && path.resolve(artifactRoot).startsWith(root + path.sep));
assert.ok(output.startsWith(path.resolve(artifactRoot) + path.sep));
assert.ok(resultsOutput.startsWith(path.resolve(artifactRoot) + path.sep));
assert.equal(triplesConformanceCases.length, 44);
const backend = await loadQualificationBackend();
assert.ok(
  backend.queryPath.endsWith("-datalog"),
  "Foundation acceptance uses the complete Triplex query contract",
);
const report: Record<string, any> = latencyReceipt({
  qleverConnectionMode: connectionModeForBackend(backend.name),
  format: "triplex-public-foundation/1",
  backend: backend.name,
  queryPath: backend.queryPath,
  status: "RUNNING",
  timestampUtc: new Date().toISOString(),
  caseNames: triplesConformanceCases.map((entry) => entry.name),
  scope: DatabaseScope.test(`foundation-${backend.name}-${randomUUID()}`),
  limitations: [
    "Fresh complete unchanged upstream44 acceptance only; no native language, scale, latency, or ten-goal completion claim",
  ],
});
writeFileSync(output, JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
const started = performance.now();
try {
  // This calls the unchanged public testkit suite, rather than a copied or
  // weakened test list. A failure stays a failure even if diagnostics pass.
  await Effect.runPromise(
    runtimeConformance(backend.makeRuntime(), {
      scope: report["scope"],
      capabilities: Capabilities.none,
    }).pipe(Effect.scoped) as Effect.Effect<void, unknown, never>,
  );
  report["status"] = "PASS_COMPLETE_UNCHANGED_SUITE";
} catch (cause) {
  report["status"] = "FAIL_COMPLETE_UNCHANGED_SUITE";
  report["error"] = String(cause);
  report["diagnostics"] = [];
  for (const entry of triplesConformanceCases) {
    try {
      await Effect.runPromise(
        entry.run.pipe(
          Effect.provide(
            backend.makeRuntime().layer({
              scope: DatabaseScope.test(`foundation-diagnostic-${randomUUID()}`),
              capabilities: Capabilities.none,
            }),
          ),
          Effect.scoped,
        ) as Effect.Effect<void, unknown, never>,
      );
      report["diagnostics"].push({ name: entry.name, status: "PASS" });
    } catch (error) {
      report["diagnostics"].push({ name: entry.name, status: "FAIL", error: String(error) });
    }
  }
}
report["elapsedMsDiagnostic"] = performance.now() - started;
writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
writeFileSync(
  resultsOutput,
  JSON.stringify(
    {
      format: "triplex-public-foundation-results/1",
      backend: backend.name,
      status: report["status"],
      caseNames: report["caseNames"],
    },
    null,
    2,
  ) + "\n",
  { flag: "wx" },
);
console.log(
  JSON.stringify(
    latencyReceipt({
      status: report["status"],
      backend: backend.name,
      cases: triplesConformanceCases.length,
      output,
      qleverConnectionMode: connectionModeForBackend(backend.name),
    }),
  ),
);
if (report["status"] !== "PASS_COMPLETE_UNCHANGED_SUITE") process.exitCode = 1;

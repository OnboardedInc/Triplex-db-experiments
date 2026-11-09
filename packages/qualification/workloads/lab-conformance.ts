/** Lab G1 entry: the unchanged upstream 44 Triplex conformance cases against one lab slot.
 *
 * [EXP-000] Why: one route for both lanes, over built public `dist` exports only (the gate hashes
 * exactly those bytes), with a named result per case instead of one opaque vitest pass.
 * Phases:
 *   suite   - the complete unchanged `runtimeConformance` program on one fresh scope (acceptance;
 *             skipped only when a case subset is selected, and then the gate cannot PASS fully).
 *   current - each selected case on its own fresh scope in runtime opening A.
 *   reopen  - each selected case again on a new fresh scope in runtime opening B, started after
 *             every opening-A layer was released. The 44 cases write and read inside one program,
 *             so a read-after-reopen of the same scope is not expressible without editing them;
 *             this phase proves a second independent runtime initialization against an engine
 *             that already holds Triplex tables (R4 risk 9.4.1) and repeatability per case.
 * Rejected: `packages/xtdb/test/conformance.test.ts` via vitest (src aliases, XTDB only, no
 * per-case names unless XTDB_CONFORMANCE_CASES=1); `foundation-entry.ts` (homebase artifact root,
 * diagnostics only on failure). Both remain in place unchanged.
 * There is no native-query-path variant of the 44: `xtdb-native`/`qlever-native` share the same
 * foundation runtime factory, so the 44 always run the Triplex Datalog runtime.
 */
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { readFileSync, realpathSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Effect, Exit } from "effect";
import { Capabilities, DatabaseScope } from "@triplex-build/triplex/runtime";
import { runtimeConformance, triplesConformanceCases } from "@triplex-build/triplex-testkit";
import { loadQualificationBackend } from "@triplex-build/triplex-qualification";

const root = path.resolve(import.meta.dirname, "../../..");
const args = process.argv.slice(2);
const option = (name: string) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const output = path.resolve(option("--output") ?? "");
assert.ok(output.startsWith(path.join(root, "runs") + path.sep), "--output must be under runs/");
assert.equal(triplesConformanceCases.length, 44, "The unchanged upstream suite has 44 cases");

const ownerFile = process.env["TRIPLEX_LAB_SLOT_OWNER"];
assert.ok(ownerFile, "TRIPLEX_LAB_SLOT_OWNER is required (lab/bin/gate.mjs sets it)");
const ownerPath = realpathSync(ownerFile);
assert.ok(/\/lab\/locks\/(xtdb|qlever|datomic)-(dev|s[1-9])\/owner\.json$/.test(ownerPath));
const ownerBytes = readFileSync(ownerPath);
const owner = JSON.parse(ownerBytes.toString("utf8"));
assert.equal(owner.format, "tx2-slot-owner/1");

const backend = await loadQualificationBackend();
assert.ok(backend.queryPath.endsWith("-datalog"), "The 44 run the complete Triplex query contract");
assert.equal(owner.lane, backend.name, "Slot lane differs from the selected backend");
assert.equal(owner.endpoint, backend.url, "Backend URL differs from the held slot's endpoint");

const limit = option("--cases");
const selected = limit
  ? triplesConformanceCases.slice(0, Number(limit))
  : [...triplesConformanceCases];
assert.ok(selected.length > 0, "--cases must select at least one case");
const runId = randomUUID();
const report: Record<string, any> = {
  format: "tx2-lab-conformance/1",
  runId,
  backend: backend.name,
  queryPath: backend.queryPath,
  endpoint: backend.url,
  artifact: backend.artifact,
  admission: { path: ownerPath, sha256: createHash("sha256").update(ownerBytes).digest("hex") },
  caseCount: triplesConformanceCases.length,
  caseNames: triplesConformanceCases.map((entry) => entry.name),
  selectedCount: selected.length,
  subset: selected.length !== triplesConformanceCases.length,
  status: "RUNNING",
  startedAt: new Date().toISOString(),
  suite: null as unknown,
  executions: [] as Record<string, unknown>[],
};
writeFileSync(output, JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
const save = () => writeFileSync(output, JSON.stringify(report, null, 2) + "\n");

const runOne = async (phase: string, entry: (typeof triplesConformanceCases)[number]) => {
  const scope = DatabaseScope.test(`lab-g1-${backend.name}-${phase}-${randomUUID()}`);
  const started = performance.now();
  const exit = await Effect.runPromiseExit(
    entry.run.pipe(
      Effect.provide(backend.makeRuntime().layer({ scope, capabilities: Capabilities.none })),
      Effect.timeout("110 seconds"),
      Effect.scoped,
    ) as Effect.Effect<void, unknown, never>,
  );
  report.executions.push({
    name: entry.name,
    phase,
    scope,
    status: Exit.isSuccess(exit) ? "PASS" : "FAIL",
    ...(Exit.isSuccess(exit) ? {} : { error: String(exit.cause).slice(0, 4000) }),
    elapsedMs: performance.now() - started,
  });
  save();
};

if (!report.subset) {
  const scope = DatabaseScope.test(`lab-g1-${backend.name}-suite-${randomUUID()}`);
  const started = performance.now();
  const exit = await Effect.runPromiseExit(
    runtimeConformance(backend.makeRuntime(), { scope, capabilities: Capabilities.none }).pipe(
      Effect.scoped,
    ) as Effect.Effect<void, unknown, never>,
  );
  report.suite = {
    scope,
    status: Exit.isSuccess(exit) ? "PASS" : "FAIL",
    ...(Exit.isSuccess(exit) ? {} : { error: String(exit.cause).slice(0, 4000) }),
    elapsedMs: performance.now() - started,
  };
  save();
}
for (const entry of selected) await runOne("current", entry);
for (const entry of selected) await runOne("reopen", entry);

const passed = report.executions.filter((entry: any) => entry.status === "PASS").length;
report.counts = {
  expectedExecutions: selected.length * 2,
  executed: report.executions.length,
  passed,
  failed: report.executions.length - passed,
};
report.status =
  report.counts.executed === report.counts.expectedExecutions &&
  report.counts.failed === 0 &&
  (report.subset || report.suite?.status === "PASS")
    ? report.subset
      ? "PASS_SUBSET"
      : "PASS"
    : "FAIL";
report.endedAt = new Date().toISOString();
save();
console.log(JSON.stringify({ status: report.status, ...report.counts, output }));
if (!report.status.startsWith("PASS")) process.exitCode = 1;

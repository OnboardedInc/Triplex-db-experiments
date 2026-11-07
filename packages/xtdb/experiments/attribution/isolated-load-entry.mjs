/** A finite experiment guard around the unchanged public load runner. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, realpathSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { cohortBounds, checkCohort } from "./cohort-contract.mjs";
import { safeErrorInfo } from "./observe-postgres.mjs";

const root = path.resolve(import.meta.dirname, "../../../..");
const admissionPath = realpathSync(process.env.TRIPLEX_RESOURCE_ADMISSION ?? "");
assert(admissionPath.startsWith(realpathSync(root) + path.sep));
const bytes = readFileSync(admissionPath);
assert.equal(
  createHash("sha256").update(bytes).digest("hex"),
  process.env.TRIPLEX_RESOURCE_ADMISSION_SHA256,
);
const admission = JSON.parse(bytes.toString());
assert.equal(admission.state, "ADMITTED");
assert.equal(admission.backend, "xtdb");
assert.equal(admission.queryPath, "xtdb-datalog");
assert.equal(admission.resources.timeoutMilliseconds, cohortBounds.workerMilliseconds);
const expectedHead = process.env.TRIPLEX_LOCAL_SOURCE_GIT_HEAD;
assert(/^[a-f0-9]{40,64}$/.test(expectedHead ?? ""));
const gitHead = () =>
  execFileSync("git", ["rev-parse", "--verify", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
assert.equal(gitHead(), expectedHead, "The captured local source checkpoint changed");
const artifacts = path.resolve(root, admission.directory, "artifacts");
assert(artifacts.startsWith(root + path.sep));
const output = path.join(artifacts, "xtdb-cohort-observation.json");
const checksOutput = path.join(artifacts, "xtdb-cohort-checks.json");
const report = {
  format: "triplex-isolated-client-cohort/1",
  status: "RUNNING",
  jobId: admission.jobId,
  attemptId: admission.attemptId,
  gitHead: expectedHead,
  bounds: cohortBounds,
  startedAt: new Date().toISOString(),
  polls: 0,
  violations: [],
  meaning:
    "No other heavy client groups; commissioned engines remain resident and may do background work. Sampled checks are supplemented by complete controller attempt-overlap verification after terminal publication.",
};
const state = () => JSON.parse(readFileSync(path.join(root, ".devloop/state.json"), "utf8"));
const save = () => writeFileSync(output, JSON.stringify(report, null, 2) + "\n", { mode: 0o600 });
writeFileSync(output, JSON.stringify(report, null, 2) + "\n", { flag: "wx", mode: 0o600 });
try {
  report.initial = checkCohort(admission, state(), { startup: true });
} catch (error) {
  report.status = "STARTUP_REJECTED";
  report.violations.push(safeErrorInfo(error));
  save();
  writeFileSync(
    checksOutput,
    JSON.stringify(
      { format: "triplex-isolated-cohort-checks/1", status: "INVALID", violations: 1 },
      null,
      2,
    ) + "\n",
    { flag: "wx", mode: 0o600 },
  );
  throw error;
}
save();
const timer = setInterval(() => {
  report.polls++;
  try {
    checkCohort(admission, state());
  } catch (error) {
    if (report.violations.length < 100) report.violations.push(safeErrorInfo(error));
    report.status = "COHORT_INVALID";
    process.exitCode = 1;
    save();
  }
}, cohortBounds.sampleMilliseconds);
timer.unref();
try {
  // This import preserves argv and the existing public write/read/oracle path.
  // An overlap does not kill a potentially committed writer: it invalidates the
  // measurement while the existing bounded reconciliation/drain still completes.
  await import("../../../qualification/load/runner.ts");
} finally {
  clearInterval(timer);
  try {
    report.final = checkCohort(admission, state());
    assert.equal(gitHead(), expectedHead);
  } catch (error) {
    report.violations.push(safeErrorInfo(error));
    process.exitCode = 1;
  }
  report.finishedAt = new Date().toISOString();
  report.status = report.violations.length
    ? "COHORT_INVALID"
    : "COMPLETE_PENDING_ATTEMPT_OVERLAP_VERIFICATION";
  save();
  writeFileSync(
    checksOutput,
    JSON.stringify(
      {
        format: "triplex-isolated-cohort-checks/1",
        status: report.violations.length ? "INVALID" : "COMPLETE",
        violations: report.violations.length,
      },
      null,
      2,
    ) + "\n",
    { flag: "wx", mode: 0o600 },
  );
}

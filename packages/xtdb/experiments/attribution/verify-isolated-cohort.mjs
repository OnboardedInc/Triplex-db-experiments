// @ts-nocheck -- [EXP-CHECKJS-R2] dynamic collections, runtime Buffer-to-JSON coercion, or validated values without static narrowing. Binding errors remain checked by lab/bin/checkjs.mjs.
/** Bind all canonical heavy-attempt intervals, including activity between samples. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  openContext,
  readState,
  readSidecar,
  loadJobManifest,
} from "../../../../qualification/devloop/state.mjs";
import { verifyAttempt } from "../../../../qualification/devloop/evidence.mjs";
import { overlappingAttempts, validateGrantContract } from "./cohort-contract.mjs";

const root = path.resolve(import.meta.dirname, "../../../..");
const args = process.argv.slice(2),
  option = (key) => args[args.indexOf(key) + 1];
assert(args.includes("--run") && args.includes("--output"));
const [jobId, attemptId] = option("--run").split("/");
const context = await openContext(root),
  state = await readState(context);
const checked = await verifyAttempt(context, jobId, attemptId);
const own = state.jobs[jobId].attempts.find((attempt) => attempt.id === attemptId);
assert(own?.finishedAt && checked.terminal.cleanup.groupGone);
const ownStart = Date.parse(own.grantedAt),
  ownEnd = Date.parse(own.finishedAt);
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
const records = [];
for (const job of Object.values(state.jobs)) {
  if (!job.attempts.length) continue;
  const manifest = await loadJobManifest(context, job);
  for (const attempt of job.attempts) {
    if (job.manifest.id === jobId && attempt.id === attemptId) continue;
    const grantBytes = await readFile(path.resolve(root, attempt.directory, "grant.json"));
    const grant = JSON.parse(grantBytes);
    validateGrantContract(grant, manifest, job, attempt);
    const start = Date.parse(grant.grantedAt);
    assert(Number.isFinite(start));
    let end = null,
      endAuthority = "UNKNOWN_OR_ACTIVE",
      terminalSha256,
      reconciliationRef;
    if (attempt.terminalSha256) {
      const terminalBytes = await readFile(path.resolve(root, attempt.directory, "terminal.json"));
      terminalSha256 = digest(terminalBytes);
      assert.equal(terminalSha256, attempt.terminalSha256);
      const terminal = JSON.parse(terminalBytes);
      assert.equal(
        terminal.outputs.find((output) => output.path === "grant.json")?.sha256,
        digest(grantBytes),
      );
      end = Date.parse(terminal.at);
      assert.equal(end, Date.parse(attempt.finishedAt));
      endAuthority = "ANCHORED_TERMINAL_STAMP";
      assert(Number.isFinite(end));
    } else if (attempt.status === "controller_publication_failed" && attempt.reconciliationRef) {
      const disposition = await readSidecar(context, attempt.reconciliationRef);
      assert.equal(disposition.format, "triplex-controller-publication-cleanup/1");
      assert.equal(disposition.status, "CONTROLLER_PUBLICATION_FAILED");
      assert(
        disposition.observations.some(
          (observation) =>
            observation.jobId === job.manifest.id && observation.attemptId === attempt.id,
        ),
        "Cleanup disposition does not name this attempt",
      );
      end = Date.parse(disposition.at);
      endAuthority = "VERIFIED_PROVEN_GONE_CLIENT_DISPOSITION";
      assert(Number.isFinite(end));
      reconciliationRef = attempt.reconciliationRef;
    }
    // Classify only after immutable manifest/header, grant and available
    // terminal/disposition identity have been validated, including light jobs.
    if (manifest.resources.heavy !== true) continue;
    assert(end === null || end >= start, "Controller interval has an unsafe backwards clock");
    records.push({
      jobId: job.manifest.id,
      attemptId: attempt.id,
      queryPath: grant.queryPath,
      status: attempt.status,
      grantSha256: digest(grantBytes),
      startMilliseconds: start,
      endMilliseconds: end,
      endAuthority,
      ...(terminalSha256 ? { terminalSha256 } : {}),
      ...(reconciliationRef ? { reconciliationRef } : {}),
    });
  }
}
const overlaps = overlappingAttempts(records, ownStart, ownEnd);
const output = path.resolve(root, option("--output"));
assert(output.startsWith(path.join(root, "qualification/evidence") + path.sep));
const receipt = {
  format: "triplex-complete-client-overlap-verification/1",
  at: new Date().toISOString(),
  reference: option("--run"),
  controllerStateRevision: state.revision,
  logicalControllerStateSha256: digest(Buffer.from(JSON.stringify(state))),
  terminalSha256: checked.terminalSha256,
  ownResourceWindow: { grantedAt: own.grantedAt, finishedAt: own.finishedAt },
  completeHeavyAttemptIntervals: records,
  overlaps,
  decision: overlaps.length ? "INVALID_COHORT" : "NO_OTHER_HEAVY_CLIENT_ATTEMPT_OVERLAP",
  interpretation:
    "All canonical attempt grants were inspected, not only admission/sampled snapshots. Bounds are admission to anchored terminal stamp or proven-gone client disposition. No separate controller process/publication-tail endpoint exists. Startup admission proof rejects prior still-active reservations. Missing semantic PASS is never adopted; idle native engines, VM, host or controller tails are not proved.",
};
await writeFile(output, JSON.stringify(receipt, null, 2) + "\n", { flag: "wx" });
console.log(
  JSON.stringify({
    output: path.relative(root, output),
    decision: receipt.decision,
    attemptsInspected: records.length,
    overlaps: overlaps.map(({ jobId, attemptId }) => ({ jobId, attemptId })),
  }),
);
if (overlaps.length) process.exitCode = 1;

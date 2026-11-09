import { parseLatencyReceipt } from "../../../lab/receipts/parse.ts";
import { latencyReceipt, requireQleverConnectionMode } from "../../../lab/receipts/latency.mjs";
/** Inspect failed diagnostic trials without converting them into acceptance. */
import assert from "node:assert/strict";
import { createReadStream } from "node:fs";
import { writeFile } from "node:fs/promises";
import { createInterface } from "node:readline";
import path from "node:path";
import { openContext, readState, loadJobManifest } from "../../../qualification/devloop/state.mjs";
import { verifyAttempt } from "../../../qualification/devloop/evidence.mjs";
import { readOracle, checkReadOracle } from "../../../qualification/devloop/compare.mjs";
import { sha256 } from "./model.ts";
const root = path.resolve(import.meta.dirname, "../../..");
const args = process.argv.slice(2),
  option = (name) => args[args.indexOf(name) + 1];
assert(args.includes("--run") && args.includes("--output"));
const [jobId, attemptId] = option("--run").split("/");
const context = await openContext(root),
  checked = await verifyAttempt(context, jobId, attemptId);
const state = await readState(context);
const manifest = await loadJobManifest(context, state.jobs[jobId]),
  attempt = state.jobs[jobId].attempts.find((value) => value.id === attemptId);
const directory = path.resolve(root, attempt.directory),
  catalog = await readOracle(context, manifest);
const duration = manifest.profile.endMilliseconds,
  writes = [],
  errors = {},
  service = [],
  queue = [];
let qleverConnectionMode = null;
let reads = 0,
  failedReads = 0,
  declaredRejects = 0;
for await (const line of createInterface({
  input: createReadStream(path.join(directory, manifest.evidence.events)),
  crlfDelay: Infinity,
})) {
  if (!line.trim()) continue;
  const event = parseLatencyReceipt(line, { lane: manifest.queryPath, source: manifest.evidence.events });
  if (manifest.queryPath.startsWith("qlever")) {
    const mode = requireQleverConnectionMode(event.qleverConnectionMode);
    if (qleverConnectionMode !== null && qleverConnectionMode !== mode) throw new TypeError("mixed timing event modes");
    qleverConnectionMode = mode;
  }
  if (event.type === "read") {
    assert(
      Number.isFinite(event.startedMs) &&
        Number.isFinite(event.finishedMs) &&
        event.finishedMs >= event.startedMs,
      "Invalid actual complete-call timestamps",
    );
    if (event.dispatchedMs !== undefined) assert(event.dispatchedMs >= event.startedMs);
    if (event.ok) {
      checkReadOracle(catalog, event);
      assert.equal(sha256(event.resultJson), event.resultSha256);
      reads++;
      queue.push(event.dispatchedMs - event.startedMs);
      service.push(event.finishedMs - event.dispatchedMs);
    } else {
      failedReads++;
      const message = String(event.error);
      errors[message] = (errors[message] ?? 0) + 1;
      // Continue rolling diagnostic arms only after budget/admission failures,
      // not an ignored schema, result-oracle, source-cut or engine-availability failure.
      assert(
        /OFFER_DEADLINE_EXCEEDED|TimeoutError|timeout|timed out|BOUNDED_DISPATCH_REJECTION/i.test(
          message,
        ),
        "Non-budget read failure needs investigation before another trial",
      );
      if (event.expectedOverload === true) declaredRejects++;
    }
  } else if (event.type === "write") {
    assert.equal(event.reconciled, true, "Unresolved writer prevents the next diagnostic arm");
    assert(
      Number.isFinite(event.ackMs) &&
        Number.isFinite(event.visibleMs) &&
        event.ackMs >= event.offeredMs &&
        event.visibleMs >= event.ackMs,
    );
    writes.push(event);
  } else throw new TypeError("Unknown observation type");
}
assert(reads > 0);
assert.equal(new Set(writes.map((event) => event.commandId)).size, writes.length);
const percentile = (values, fraction) => {
  values.sort((a, b) => a - b);
  return values[Math.min(values.length - 1, Math.ceil(values.length * fraction) - 1)];
};
const visibleInside = writes.filter((event) => event.visibleMs <= duration).length;
const result = latencyReceipt({
  qleverConnectionMode: qleverConnectionMode,
  format: "triplex-diagnostic-load-inspection/1",
  at: new Date().toISOString(),
  reference: option("--run"),
  terminalSha256: checked.terminalSha256,
  terminalStatus: checked.terminal.status,
  queryPath: manifest.queryPath,
  execution: manifest.profile.execution,
  verdict: failedReads
    ? "REJECTED_READ_AVAILABILITY_VALID_RETURNED_ROWS_AND_RECONCILED_WRITES"
    : "DIAGNOSTIC_RETURNED_ROWS_AND_TIMESTAMPS_VERIFIED",
  correctReads: reads,
  readErrors: failedReads,
  declaredStressRejections: declaredRejects,
  errorKinds: errors,
  writer: {
    offeredRecorded: writes.length,
    visiblyCommittedInsideWindow: visibleInside,
    fractionVisibleInsideWindow: writes.length ? visibleInside / writes.length : 0,
    allRecordedCommandsReconciled: true,
    schedule: writes.map(
      ({ offeredMs, writeStartedMs, ackMs, visibilityProbeStartedMs, visibleMs }) => ({
        offeredMs,
        writeStartedMs,
        ackMs,
        visibilityProbeStartedMs,
        visibleMs,
      }),
    ),
  },
  completedReadTimings: {
    p50QueueMs: percentile(queue, 0.5),
    p99QueueMs: percentile(queue, 0.99),
    p50ServiceMs: percentile(service, 0.5),
    p99ServiceMs: percentile(service, 0.99),
  },
  qualification:
    "NOT_ACCEPTED_OR_PROMOTED; failed deadline/availability/liveness outcomes remain failures. Single-run small-fixture diagnostic only.",
});
const output = path.resolve(root, option("--output"));
assert(output.startsWith(path.join(root, "qualification/evidence") + path.sep));
await writeFile(output, JSON.stringify(result, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify(result));

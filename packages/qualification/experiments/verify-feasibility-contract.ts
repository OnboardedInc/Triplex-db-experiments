/** Enforce the parent-reviewed fixed diagnostic, not a calibrated acceptance.
 * The shared load runner records late writer reconciliation separately from
 * in-window liveness. This wrapper must not turn that distinction into a PASS.
 * Source/rationale: qlever-qualified-profile-point-rate16-v2/plan.json.
 */
import { createHash } from "node:crypto";
import { createReadStream, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline";

export async function verifyRate16Feasibility(directory: string): Promise<boolean> {
  const report = JSON.parse(readFileSync(path.join(directory, "report.json"), "utf8"));
  const reads: any[] = [], writes: any[] = [];
  for await (const line of createInterface({
    input: createReadStream(path.join(directory, "events.jsonl")), crlfDelay: Infinity,
  })) {
    if (!line.trim()) continue;
    const event = JSON.parse(line);
    if (event.type === "read") reads.push(event);
    else if (event.type === "write") writes.push(event);
  }
  const digest = (value: string) => createHash("sha256").update(value).digest("hex");
  const observations = report.observations ?? {}, gates = report.diagnosticGates ?? {};
  const sortedOffers = reads.map(event => event.startedMs).sort((a, b) => a - b);
  const writeOffers = writes.map(event => event.offeredMs).sort((a, b) => a - b);
  const checks = {
    runnerAndReturnedCutOraclePassed: report.status === "PASS" && report.failures?.length === 0,
    all480ScheduledOffersAccounted: observations.offeredReads === 480 && reads.length === 480 &&
      sortedOffers.every((value, index) => value === index * 62.5),
    all480SuccessfulRetainedResultDigests: observations.correctReads === 480 &&
      reads.length === 480 && reads.every(event => event.ok === true &&
        typeof event.resultJson === "string" && digest(event.resultJson) === event.resultSha256 &&
        event.finishedMs <= event.startedMs + 30000),
    bothClassesHave240CompleteReads: ["point-current", "point-history"].every(task =>
      reads.filter(event => event.taskClass === task && event.ok === true).length === 240),
    all256LogicalClientsProgress: observations.clientsWithProgress === 256 &&
      new Set(reads.filter(event => event.ok === true).map(event => event.clientId)).size === 256,
    zeroReadErrorsOrRejections: gates.readErrors === 0 && gates.explicitStressRejections === 0 &&
      observations.expectedStressRejections === 0,
    sixUniqueScheduledAtomicWriters: writes.length === 6 &&
      new Set(writes.map(event => event.commandId)).size === 6 &&
      writeOffers.every((value, index) => value === index * 5000) &&
      writes.every(event => event.correctedEntities === 10 && event.assertions === 10 &&
        event.retractions === 10 && event.reconciled === true),
    allSixAckedAndVisibleInside30s: gates.writer?.offeredCommands === 6 &&
      gates.writer?.visiblyCommittedInsideWindow === 6 && gates.writer?.reconciledAfterDrain === 6 &&
      gates.writer?.allOfferedReconciled === true && writes.length === 6 &&
      writes.every(event => Number.isFinite(event.ackMs) && Number.isFinite(event.visibleMs) &&
        event.offeredMs <= event.writeStartedMs && event.writeStartedMs <= event.ackMs &&
        event.ackMs <= event.visibleMs && event.visibleMs <= 30000),
    boundedWindowAndDispatch: observations.measuredWindowEndMs === 30000 &&
      observations.maximumActiveDispatch <= 16 && observations.maximumQueuedDispatch <= 4096 &&
      Number.isFinite(observations.drainEndMs),
  };
  const passed = Object.values(checks).every(Boolean);
  writeFileSync(path.join(directory, "strict-contract.json"), JSON.stringify({
    format: "triplex-fixed-rate16-feasibility-checks/1", status: passed ? "PASS" : "FAIL", checks,
  }, null, 2) + "\n", { flag: "wx" });
  return passed;
}

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { rawLocalCoverage } from "../../../bench/lib/raw-local-coverage.ts";
import { checkWithOracleWorker } from "../../../bench/lib/oracle-thread.ts";
// [DX-R3-P8] Why: a timed-out driver's saved oracle inputs can be checked independently without any engine.
// Rejected: upgrading saved phase arrivals into an all-read verdict or relabelling the interrupted pair DONE.
const directory = process.argv[2],
  oracleRoot = process.argv[3];
if (!directory || !oracleRoot)
  throw Error("Usage: recover-oracle.ts <saved-driver-directory> <oracle-root>");
const caseDoc = JSON.parse(fs.readFileSync(path.join(directory, "oracle-case.json"), "utf8"));
const report = JSON.parse(fs.readFileSync(path.join(directory, "ns-report.json"), "utf8"));
const reads = fs
  .readFileSync(path.join(directory, "ns-full-read-samples.jsonl"), "utf8")
  .trim()
  .split("\n")
  .map((line) => JSON.parse(line));
assert.equal(caseDoc.caseId, `NS/${report.runTag}`);
for (const read of reads)
  if (read.route === "replica") {
    assert.equal(typeof read.fullCanonical, "string");
    assert.equal(
      read.fullCanonical,
      read.gatewayCanonical,
      "saved complete public local/gateway bytes differ",
    );
  }
for (const q of caseDoc.queries) {
  const k = Number(q.id.slice(1).split("|")[0]);
  assert.equal(q.cut.recordedAt, reads[k].basis.recordedAt);
  assert.equal(q.cut.validAt, reads[k].basis.validAt);
}
const coverage = rawLocalCoverage(report.phases, reads);
for (const phase of coverage)
  assert(phase.ok, `${phase.phase}: missing or inconsistent local raw sample`);
console.log(JSON.stringify({ kind: "saved-local-raw-coverage", coverage }));
const output = fs.mkdtempSync(path.join(os.tmpdir(), "dxr3-oracle-recovery-"));
console.log(
  JSON.stringify({
    kind: "saved-oracle-recovery",
    caseId: caseDoc.caseId,
    reads: reads.length,
    local: reads.filter((r) => r.route === "replica").length,
    output,
    note: "saved complete raw sample bytes and an independent oracle case; no recovered all-read verdict or full pair PASS",
  }),
);
let callbacks = 0;
const heartbeat = setInterval(() => callbacks++, 250);
const result = await checkWithOracleWorker({ oracleRoot, dir: output, caseDoc, reads });
clearInterval(heartbeat);
console.log(JSON.stringify({ kind: "oracle-main-thread-availability", callbacks, peakProcessBytes: process.resourceUsage().maxRSS * 1024 }));
console.log(JSON.stringify(result));
if (result.status === "PASS") fs.rmSync(output, { recursive: true });
else process.exitCode = 1;

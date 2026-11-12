import fs from "node:fs";
import assert from "node:assert/strict";
import { Histogram } from "../../../bench/lib/hist.ts";
import { commitBreakdown } from "../../../bench/lib/commit-breakdown.ts";
// [DX-R3-P8] Why: completed write events survive a late oracle timeout; recover those distributions without inventing read verdicts.
// Rejected: treating arrival counts as verified goodput, or declaring an interrupted pair PASS.
const root = process.argv[2],
  prefix = process.argv[3];
if (!root || !prefix) throw Error("Usage: recover-pair-writes.ts <saved-directory> <pair-prefix>");
const load = (arm: string) => {
  const dir = `${root}/${prefix}-${arm}/driver`;
  return {
    report: JSON.parse(fs.readFileSync(`${dir}/ns-report.json`, "utf8")),
    writes: fs
      .readFileSync(`${dir}/ns-writes.jsonl`, "utf8")
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line)),
  };
};
const zero = load("zero"),
  ladder = load("ladder");
assert.equal(zero.report.status, "DONE");
assert.equal(zero.report.config.zeroReaders, true);
assert.equal(zero.report.trace.digest, ladder.report.trace.digest);
assert.deepEqual(zero.report.benchSources, ladder.report.benchSources);
const histogram = (rows: any[]) => {
  const h = new Histogram();
  for (const row of rows) h.recordMs(row.latencyMs);
  return h.summary();
};
const bandOf = (n: number) => (n <= 10 ? "5-10" : n <= 25 ? "11-25" : "26-50");
const bands = (rows: any[]) =>
  Object.fromEntries(
    ["5-10", "11-25", "26-50"].map((b) => [
      b,
      histogram(rows.filter((w) => bandOf(w.facts) === b)),
    ]),
  );
const committed = ladder.writes.filter(
  (w) => w.stream === "background" && !w.resend && w.outcome === "committed",
);
const phases = ladder.report.phases.map((phase: any) => {
  const from = phase.start + ladder.report.config.settleS * 1000,
    to = phase.end;
  const rows = committed.filter((w) => w.scheduledAt >= from && w.scheduledAt < to);
  const z = zero.writes.filter(
    (w) =>
      w.stream === "background" &&
      !w.resend &&
      w.outcome === "committed" &&
      w.offsetMs >= from - ladder.report.traceStartAbsMs &&
      w.offsetMs < to - ladder.report.traceStartAbsMs,
  );
  const native = histogram(rows),
    baseline = histogram(z);
  const observed = ladder.report.phaseProgress[String(phase.idx)];
  return {
    phase: phase.name,
    commit: native,
    bands: bands(rows),
    matchedZeroReader: baseline,
    commitP99Ratio: baseline.p99Ms && native.p99Ms !== null ? native.p99Ms / baseline.p99Ms : null,
    breakdown: commitBreakdown(rows),
    writerThread: phase.writerThread,
    memory: phase.memory,
    capturedUnjudged: observed
      ? {
          reads: observed.reads,
          errors: observed.errors,
          routes: observed.routes,
          readP50Ms: observed.read.p50Ms,
          readP99Ms: observed.read.p99Ms,
          processCpuMsPerCapturedLocalReadUpperBound: phase.clientCpuMs / observed.routes.replica,
        }
      : null,
  };
});
const phase = (name: string) => phases.find((p: any) => p.phase === name);
console.log(
  JSON.stringify(
    {
      kind: "interrupted-pair-write-recovery",
      pair: prefix,
      savedStatus: ladder.report.status,
      note: "Write-only distributions use the shipped histogram and settle windows. Read correctness, goodput, recovery and queue bars remain unqualified.",
      bandsAll: bands(committed),
      bandsBurst: bands(committed.filter((w) => w.burst)),
      sweepVsPresweepCommitP99:
        phase("presweep").commit.p99Ms && phase("sweep").commit.p99Ms !== null
          ? phase("sweep").commit.p99Ms / phase("presweep").commit.p99Ms
          : null,
      phases,
    },
    null,
    2,
  ),
);

#!/usr/bin/env node
// EXP-C8: summarize round-timing.mjs outputs: per call total, per-round step times, engine writes
// per call (scratch phases), Datalog wall time. Usage: summarize-timing.mjs <file.json>...
import fs from "node:fs";
import { latencyReceipt, recordedConnectionMode } from "../../receipts/latency.mjs";
const WRITE_PHASES = new Set([
  "working-initialize",
  "working-seed",
  "working-round",
  "working-cleanup",
]);
const range = (values) => (values.length ? `${Math.min(...values)}-${Math.max(...values)}` : "-");
for (const file of process.argv.slice(2)) {
  const run = JSON.parse(fs.readFileSync(file, "utf8"));
  for (const [graph, entry] of Object.entries(run.graphs)) {
    const ok = entry.native.filter((call) => call.steps);
    // A multi-statement transaction records its elapsed time on its first statement only.
    const steps = ok.flatMap((call) =>
      call.steps.filter(
        ([, ms], index, all) => !(ms === 0 && index > 0 && all[index - 1][0] === all[index][0]),
      ),
    );
    const byPhase = {};
    for (const [phase, ms] of steps) (byPhase[phase] ??= []).push(ms);
    const writes = ok.length
      ? steps.filter(([phase]) => WRITE_PHASES.has(phase)).length / ok.length
      : 0;
    const datalog = entry.datalog.map((value) =>
      typeof value === "number" ? value : `timeout@${value.ms}`,
    );
    console.log(
      JSON.stringify(
        latencyReceipt({
          qleverConnectionMode: recordedConnectionMode(run),
          lane: run.lane,
          label: run.label,
          graph,
          edges: entry.edges,
          reach: entry.reach,
          nativeTotalMs: range(ok.map((call) => call.totalMs)),
          nativeFailures: entry.native.length - ok.length,
          engineWriteTransactionsPerCall: writes,
          phasesMs: Object.fromEntries(
            Object.entries(byPhase).map(([phase, ms]) => [phase, `${range(ms)} (n=${ms.length})`]),
          ),
          datalogMs: datalog,
        }),
      ),
    );
  }
}

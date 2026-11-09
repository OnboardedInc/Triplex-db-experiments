import { latencyReceipt, qleverLatencyReceipt, type QleverLatencyReceipt } from "./latency.mjs";

qleverLatencyReceipt({ qleverConnectionMode: "keep-alive", ms: 1 });
qleverLatencyReceipt({ qleverConnectionMode: "per-request", ms: 1 });
latencyReceipt({ qleverConnectionMode: null, lane: "xtdb" });
// @ts-expect-error QLever timing receipts must declare the mode.
qleverLatencyReceipt({ ms: 1 });
// @ts-expect-error Multi-engine receipts must still declare mode or explicit null.
latencyReceipt({ lane: "qlever", ms: 1 });
// @ts-expect-error Unknown selections cannot enter a typed receipt.
qleverLatencyReceipt({ qleverConnectionMode: "unknown", ms: 1 });
// @ts-expect-error A QLever receipt cannot claim no QLever transport.
const omitted: QleverLatencyReceipt = { qleverConnectionMode: null };
void omitted;

import { readLatencyRun, type LatencyRun, type ModeTreatment } from "./parse.ts";
const checked = readLatencyRun("compile-only-receipt.json");
if (checked.ok) {
  const run: LatencyRun = checked.run;
  const unit: "ms" = run.units;
  // @ts-expect-error A whole run cannot claim an arbitrary mode.
  const invalidMode: "no-delay" = run.transportMode;
  void [unit, invalidMode];
}
const separated = readLatencyRun("compile-only-receipt.ndjson", {
  variedTreatment: "connection-mode",
});
if (separated.ok) {
  const treatment: ModeTreatment = separated.run;
  // @ts-expect-error Treatment reads deliberately expose no pooled records.
  void treatment.records;
}

import type { Milliseconds, LatencyWriter } from "./parse.ts";
// @ts-expect-error Raw numbers have not passed finite, nonnegative millisecond validation.
const uncheckedDuration: Milliseconds = -1;
// @ts-expect-error Writers must have a registered payload schema.
const unknownWriter: LatencyWriter = "unregistered/v999";
void [uncheckedDuration, unknownWriter];

import type { ReadOptions } from "./parse.ts";
const dynamicOptions: ReadOptions = { variedTreatment: "connection-mode" };
const dynamicRead = readLatencyRun("compile-only-receipt.ndjson", dynamicOptions);
if (dynamicRead.ok) {
  // @ts-expect-error Dynamic treatment options cannot promise a pooled run.
  void dynamicRead.run.records;
}

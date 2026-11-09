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

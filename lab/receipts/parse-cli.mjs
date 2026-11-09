// [EXP-QNODELAY] Why: Python delegates receipt validation to the exact TS schema.
// Rejected: a second Python validator that could drift from the comparison gate.
import fs from "node:fs";
import { parseLatencyReceipt } from "./parse.ts";
const lane = process.argv[2] ?? "qlever";
const receipt = parseLatencyReceipt(fs.readFileSync(0), { lane, source: "stdin" });
process.stdout.write(JSON.stringify(receipt));

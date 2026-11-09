// @ts-nocheck -- [CX-A01-040] Why: integration adds this runtime protocol or command fixture to checkJs; dynamic JSON/message fields lack static record types. Binding errors remain checked by lab/bin/checkjs.mjs. Rejected: excluding current executable code.
// [EXP-QNODELAY] Why: Python and JS share path IO and schema/mode binding.
// Rejected: a Python pre-read or independent receipt validator.
import { readLatencyRun } from "./parse.ts";
const result = readLatencyRun(process.argv[2], { lane: process.argv[3] ?? "qlever" });
if (!result.ok) {
  process.stderr.write(JSON.stringify(result.refusal));
  process.exitCode = 1;
} else process.stdout.write(JSON.stringify(result.run));

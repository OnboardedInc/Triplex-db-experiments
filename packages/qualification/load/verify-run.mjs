// @ts-nocheck -- [EXP-CHECKJS-R2] unannotated dynamic parameters. Binding errors remain checked by lab/bin/checkjs.mjs.
/** Independent post-run use of the controller's retained-byte/cut oracle verifier. */
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import path from "node:path";
import { openContext } from "../../../qualification/devloop/state.mjs";
import { loadRun } from "../../../qualification/devloop/compare.mjs";
import { sha256 } from "./model.ts";
const root = path.resolve(import.meta.dirname, "../../..");
const args = process.argv.slice(2),
  option = (key) => args[args.indexOf(key) + 1];
assert(args.includes("--run") && args.includes("--output"));
const output = path.resolve(root, option("--output"));
assert(
  output.startsWith(path.join(root, "qualification/evidence") + path.sep),
  "New verifier receipts must not mutate a terminal attempt",
);
const run = await loadRun(await openContext(root), option("--run"));
let resultByteChecks = 0;
for await (const line of createInterface({
  input: createReadStream(
    path.join(
      root,
      ".devloop/jobs",
      run.jobId,
      "attempts",
      run.attemptId,
      run.manifest.evidence.events,
    ),
  ),
  crlfDelay: Infinity,
})) {
  if (!line.trim()) continue;
  const event = JSON.parse(line);
  if (event.type !== "read" || event.ok !== true) continue;
  assert.equal(typeof event.resultJson, "string");
  assert.equal(
    sha256(event.resultJson),
    event.resultSha256,
    "Actual retained result bytes differ from their advertised digest",
  );
  resultByteChecks++;
}
const result = {
  format: "triplex-public-load-observation/1",
  at: new Date().toISOString(),
  status: "RETAINED_BYTES_AND_RETURNED_CUT_ORACLE_VERIFIED",
  reference: run.reference,
  terminalSha256: run.terminalSha256,
  eventsSha256: run.eventsSha256,
  queryPath: run.manifest.queryPath,
  profile: run.profile,
  classes: run.classes,
  readCount: run.readCount,
  resultByteChecks,
  rejectedReads: run.rejectedReads,
  clientsWithProgress: run.clientsWithProgress,
  writer: run.writer,
  limitation:
    "Diagnostic result only. No calibration, three-repeat adequacy, comparative performance promotion or target-scale claim.",
};
await writeFile(output, JSON.stringify(result, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify({ output: path.relative(root, output), ...result }));

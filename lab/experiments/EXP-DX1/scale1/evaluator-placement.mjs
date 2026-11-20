import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { threadId, workerData } from "node:worker_threads";

if (workerData === "deep-evaluation") {
  // [DX-ACT2] Why: newly spawned evaluators inherit the sender's exclusive CPU. Use the same placement initializer as reader workers and read the resulting kernel mask before evaluation. Rejected: counting five threads all confined to the sender's core.
  await import("../../../../packages/datomic/dist/index.js");
  const { parseCpuset } = await import("../../../bin/lib.mjs");
  const mask = /^Cpus_allowed_list:\s*(.+)$/m.exec(
    readFileSync("/proc/thread-self/status", "utf8"),
  )?.[1];
  const cpus = parseCpuset(mask, 65536);
  assert.deepEqual(cpus, parseCpuset(process.env.TRIPLEX_NODE_WORKER_CPUS, 65536));
  assert(
    cpus.every((cpu) => !parseCpuset(process.env.TRIPLEX_NODE_MAIN_CPUS, 65536).includes(cpu)),
  );
  console.log(
    JSON.stringify({
      event: "deep-evaluator-placement",
      threadId,
      cpus,
      source: process.env.TRIPLEX_TRACE_SOURCE,
      slot: process.env.TRIPLEX_TRACE_SLOT,
    }),
  );
}

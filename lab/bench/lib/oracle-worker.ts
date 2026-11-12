import { traceWork, flushTracing } from "./tracing.ts";
import { parentPort, workerData } from "node:worker_threads";
import { checkWithOracle } from "./oracle.ts";
// [DX-R3-P8] Why: independent oracle execution can overlap post-run analysis after all measured activity has stopped.
// Rejected: extending the engine lease by running the two independent CPU/disk checks serially.
try {
  const result = traceWork("oracle.independent-check", () => checkWithOracle(workerData));
  await flushTracing();
  parentPort!.postMessage({ type: "result", result });
} catch (error) {
  parentPort!.postMessage({
    type: "result",
    result: { status: "ORACLE-ERROR", stderr: String(error), reads: 0, mismatches: [] },
  });
}
parentPort!.close();

import { Worker } from "node:worker_threads";
import type { checkWithOracle } from "./oracle.ts";
// [DX-R3-P8] Why: own and join the oracle worker, reporting failures as failures while main verifies every retained read.
// Rejected: a fire-and-forget child, or performing synchronous oracle work before/inside the measured trace.
export function checkWithOracleWorker(input: Parameters<typeof checkWithOracle>[0]): Promise<any> {
  return new Promise((resolve) => {
    let worker: Worker;
    const error = (message: string) => ({
      status: "ORACLE-ERROR",
      stderr: message,
      reads: 0,
      mismatches: [],
    });
    try {
      worker = new Worker(new URL("./oracle-worker.ts", import.meta.url), { workerData: input });
    } catch (e) {
      resolve(error(String(e)));
      return;
    }
    let settled = false;
    const finish = (result: any) => {
      if (settled) return;
      settled = true;
      void worker.terminate().then(
        () => resolve(result),
        (e) => resolve(error(String(e))),
      );
    };
    worker.once("message", (m) =>
      finish(m?.type === "result" ? m.result : error("Unexpected oracle worker reply")),
    );
    worker.once("error", (e) => finish(error(String(e))));
    worker.once("exit", (code) => {
      if (!settled) finish(error(`Oracle worker exited without a result: ${code}`));
    });
  });
}

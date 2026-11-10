import { Worker } from "node:worker_threads";
import type { CompositionHandle } from "./composition.ts";
import type { PositionBasis } from "./w0-world.ts";
// [DX-H8] Why: measured memo selection consumed 404 ms on the live writer's event loop at 1k.
// Rejected: blocking that event loop for a projected four CPU seconds at 10k.
export async function prepareMemoSelection(o: {
  comp: CompositionHandle;
  composition: string;
  lane: string;
  scope: string;
  file: string;
  releaseHash: string;
  previewBasis: PositionBasis;
  basis: PositionBasis;
  subjects: readonly string[];
}) {
  const start = performance.now();
  const { comp, ...data } = o;
  const worker = new Worker(new URL("./w0-memo-worker.ts", import.meta.url), { workerData: data });
  let readyResolve!: () => void, readyReject!: (e: any) => void;
  const ready = new Promise<void>((resolve, reject) => {
    readyResolve = resolve;
    readyReject = reject;
  });
  let resultResolve: ((result: any) => void) | undefined,
    resultReject: ((e: any) => void) | undefined;
  let failure: Error | undefined,
    closing = false,
    received = false;
  const fail = (e: Error) => {
    failure = e;
    readyReject(e);
    resultReject?.(e);
  };
  worker.on("error", fail);
  worker.on("exit", (code) => {
    if (!closing && !received) fail(new Error("memo selector exited " + code));
  });
  worker.on("message", async (m) => {
    if (m.type === "ready") readyResolve();
    else if (m.type === "error") fail(new Error(m.error));
    else if (m.type === "result") {
      received = true;
      resultResolve?.(m.result);
    } else if (m.type === "feed") {
      try {
        worker.postMessage({
          type: "feed-result",
          id: m.id,
          value: await comp.feedPage(m.after, m.limit),
        });
      } catch (error) {
        worker.postMessage({ type: "feed-result", id: m.id, error: String(error) });
      }
    }
  });
  try {
    await ready;
  } catch (error) {
    closing = true;
    await worker.terminate();
    throw error;
  }
  let used = false;
  return {
    startupMs: performance.now() - start,
    select: () => {
      if (used) throw Error("memo selector is single-use");
      used = true;
      if (failure) return Promise.reject(failure);
      return new Promise<any>((resolve, reject) => {
        resultResolve = resolve;
        resultReject = reject;
        worker.postMessage({ type: "select" });
      });
    },
    close: async () => {
      closing = true;
      await worker.terminate();
    },
  };
}

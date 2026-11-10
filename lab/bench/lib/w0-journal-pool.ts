import { Worker } from "node:worker_threads";
import type { CompositionHandle } from "./composition.ts";
// [DX-H8] Why: measured journal enumeration took 48 s/1k on the write peer before any history rows were counted.
// Rejected: caching gate observations or inferring stored-history counts from journal counts.
export async function prepareJournalReader(o: {
  comp: CompositionHandle;
  composition: string;
  lane: string;
  scope: string;
}) {
  const { comp, ...data } = o;
  const worker = new Worker(new URL("./w0-journal-worker.ts", import.meta.url), {
    workerData: data,
    env: { ...process.env, TX2_W0_RESTORE_INDEXED_JOURNAL: "1" },
  });
  let readyResolve!: () => void, readyReject!: (e: any) => void;
  const ready = new Promise<void>((resolve, reject) => {
    readyResolve = resolve;
    readyReject = reject;
  });
  const pending = new Map<number, { resolve: (v: any) => void; reject: (e: any) => void }>();
  let id = 0,
    closing = false,
    failure: Error | undefined;
  const fail = (e: Error) => {
    failure = e;
    readyReject(e);
    for (const p of pending.values()) p.reject(e);
    pending.clear();
  };
  worker.on("error", fail);
  worker.on("exit", (code) => {
    if (!closing) fail(Error("journal reader exited " + code));
  });
  worker.on("message", async (m) => {
    if (m.type === "ready") readyResolve();
    else if (m.type === "result" || m.type === "error") {
      const p = pending.get(m.id);
      pending.delete(m.id);
      if (m.type === "error") p?.reject(Error(m.error));
      else p?.resolve(m.result);
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
    } else if (m.type === "head") {
      try {
        worker.postMessage({ type: "head-result", id: m.id, value: await comp.currentPosition() });
      } catch (error) {
        worker.postMessage({ type: "head-result", id: m.id, error: String(error) });
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
  return {
    scan: (options: {
      position: number;
      entities?: boolean;
      file?: string;
      retainAfter?: number;
    }) => {
      if (failure) return Promise.reject(failure);
      const request = id++;
      return new Promise<any>((resolve, reject) => {
        pending.set(request, { resolve, reject });
        worker.postMessage({ type: "scan", id: request, ...options });
      });
    },
    close: async () => {
      closing = true;
      await worker.terminate();
    },
  };
}

import { parentPort, workerData } from "node:worker_threads";
import { openComposition } from "./composition.ts";
import { loadMemo, selectMemo } from "./w0-memo.ts";
const port = parentPort!;
const pending = new Map<number, (v: any) => void>();
let next = 0;
const comp =
  workerData.composition === "memory"
    ? null
    : await openComposition(workerData.composition, workerData.lane, workerData.scope);
port.on("message", async (m) => {
  if (m.type === "feed-result") {
    pending.get(m.id)?.(m);
    pending.delete(m.id);
    return;
  }
  if (m.type !== "select") return;
  const start = performance.now(),
    cpuStart = process.threadCpuUsage();
  try {
    const source: any = comp ?? {
      feedPage: async (after: number, limit: number) => {
        const id = next++;
        const response: any = await new Promise((resolve) => {
          pending.set(id, resolve);
          port.postMessage({ type: "feed", id, after, limit });
        });
        if (response.error) throw Error(response.error);
        return response.value;
      },
    };
    // [DX-H8] Why: file I/O, parsing, closure scans and rebasing remain inside the activation timer, off the live event loop.
    // Rejected: hiding memo loading before the timed window or sending whole worlds back to the controller.
    const result = await selectMemo({
      ...workerData,
      comp: source,
      memo: loadMemo(workerData.file),
    });
    const cpu = process.threadCpuUsage(cpuStart);
    await comp?.close();
    port.postMessage({
      type: "result",
      result: {
        ...result,
        workerWallMs: performance.now() - start,
        workerCpuMs: (cpu.user + cpu.system) / 1000,
      },
    });
  } catch (error: any) {
    await comp?.close();
    port.postMessage({ type: "error", error: String(error.stack ?? error) });
  } finally {
    port.close();
  }
});
port.postMessage({ type: "ready" });

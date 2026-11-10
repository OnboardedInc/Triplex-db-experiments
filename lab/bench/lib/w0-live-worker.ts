import { parentPort, workerData } from "node:worker_threads";
import { inspect } from "node:util";
import { openComposition } from "./composition.ts";
import { W0, V_W0 } from "./w0-world.ts";
import { Rng, seedOf } from "./rng.ts";
const port = parentPort!;
const comp = await openComposition(workerData.composition, workerData.lane, workerData.scope);
let stopped = false;
port.on("message", () => {
  stopped = true;
});
const rng = new Rng(seedOf(workerData.seed + ":" + workerData.worker));
port.postMessage({ type: "ready" });
const clockStart = performance.now();
try {
  await Promise.all(
    Array.from({ length: 8 }, async () => {
      while (!stopped) {
        const position = await comp.currentPosition();
        const subject = W0.placementId(rng.int(workerData.N));
        const started = performance.timeOrigin + performance.now();
        const basis = {
          position,
          validAt: V_W0 + workerData.offsetS * 1000 + performance.now() - clockStart,
        };
        // [DX-H5] Why: retain the failing request together with its nested adapter/transport cause.
        // Rejected: a page-read failure with no subject/cut/endpoint to reproduce it.
        const page = await comp.sweepPage([subject], basis).catch((cause) => {
          throw new Error(
            "live sweepPage request " +
              JSON.stringify({ subjects: [subject], basis, endpoint: comp.backend.url }),
            { cause },
          );
        });
        if (page.position < position) throw Error("live reader returned an unavailable basis");
        port.postMessage({
          type: "read",
          started,
          ms: performance.timeOrigin + performance.now() - started,
        });
      }
    }),
  );
} catch (error) {
  // [DX-H2] Why: preserve the adapter's nested transport cause after the first live-reader failure.
  // Rejected: String(error) (erases ReadError.cause and prevents diagnosis from retained evidence).
  port.postMessage({ type: "failure", error: inspect(error, { depth: 8 }) });
} finally {
  await comp.close();
  port.close();
}

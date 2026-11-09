import { parentPort, workerData } from "node:worker_threads";
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
        const page = await comp.sweepPage([subject], {
          position,
          validAt: V_W0 + workerData.offsetS * 1000 + performance.now() - clockStart,
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
  port.postMessage({ type: "failure", error: String(error) });
} finally {
  await comp.close();
  port.close();
}

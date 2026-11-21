import assert from "node:assert/strict";
import { parentPort, workerData } from "node:worker_threads";
import { openStore, type HeldSource } from "../store.ts";
import { LazyReader, type Pin } from "../read.ts";

const port = parentPort;
assert(port);
const { scope, held } = workerData as {
  scope: string;
  held: Omit<HeldSource, "verifyThrough" | "committed">;
};
const unavailable = () => {
  throw Error("The held reader cannot publish");
};
const s = await openStore(scope, "act2-deep", "read", {
  ...held,
  verifyThrough: unavailable,
  committed: unavailable,
});
const reader = new LazyReader(s, s.profile, 0, undefined, "shared-cut");
port.on("message", async (data: { n: number; subject: string; pin: Pin } | "close") => {
  if (data === "close") {
    await s.close();
    port.close();
    return;
  }
  const started = performance.timeOrigin + performance.now();
  try {
    const result = await reader.readAt(data.subject, data.pin);
    port.postMessage({
      n: data.n,
      started,
      ended: performance.timeOrigin + performance.now(),
      result,
    });
  } catch (e) {
    port.postMessage({ n: data.n, error: String(e) });
  }
});
port.postMessage("ready");

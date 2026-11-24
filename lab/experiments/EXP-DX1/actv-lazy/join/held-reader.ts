import assert from "node:assert/strict";
import { parentPort, workerData } from "node:worker_threads";
import { openStore, type HeldSource } from "../store.ts";
import { LazyReader, type Pin } from "../read.ts";
import { ReadAtLeast } from "../../../../../packages/datomic/dist/index.js";

const port = parentPort;
assert(port);
const { scope, held, atLeast } = workerData as {
  scope: string;
  held: Omit<HeldSource, "verifyThrough" | "committed">;
  atLeast?: boolean;
};
// [DX-RD4] With atLeast, this reader is built from the Publish receipts it is sent: every unpinned read (its head) is at
// or after the latest one, as a product reader holding the receipt would read. Off, the reader is as before.
const floor = atLeast ? new ReadAtLeast(0, { waitMs: 2000 }) : undefined;
const unavailable = () => {
  throw Error("The held reader cannot publish");
};
const s = await openStore(scope, "act2-deep", "read", {
  ...held,
  verifyThrough: unavailable,
  committed: unavailable,
}, floor ? { readAtLeast: floor } : {});
const reader = new LazyReader(s, s.profile, 0, undefined, "shared-cut");
port.on("message", async (data: { n: number; subject: string; pin: Pin } | { n: number; receipt: number } | "close") => {
  if (data === "close") {
    await s.close();
    port.close();
    return;
  }
  if ("receipt" in data) {
    try {
      if (!floor) throw Error("This reader was not built from receipts");
      floor.raise(data.receipt);
      port.postMessage({ n: data.n, floor: floor.position });
    } catch (e) {
      port.postMessage({ n: data.n, error: String(e) });
    }
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
    // [DX-RD4] Name the read gateway's at-least refusal (its peer did not reach the receipt in time) for the runner.
    const chain: any[] = [];
    for (let c: any = e; c && chain.length < 8; c = c.cause) chain.push(c);
    const refusal = chain.find((c) => c?.code === "AtLeastTimeout");
    port.postMessage({ n: data.n, error: String(e), ...(refusal ? { code: "AtLeastTimeout",
      head: refusal.head ?? refusal.maximum ?? null, ended: performance.timeOrigin + performance.now(), started } : {}) });
  }
});
port.postMessage("ready");

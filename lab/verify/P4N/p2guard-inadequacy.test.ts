// [CX-VP4N] Why: demonstrate a guard that returns success despite a one-millisecond p50 regression, with unchanged p99.
// Rejected: drawing this conclusion from a noisy real-host run. This file is a synthetic harness test, not performance evidence.
import fs from "node:fs";
import path from "node:path";
import { vi, it, expect, afterAll } from "vitest";
const state = vi.hoisted(() => ({ clock: 0, workers: 0 }));
vi.mock("../QH1/p2guard-arms.js", () => ({
  candidateWorkerSource: async () => "synthetic-baseline",
}));
vi.mock("../QH1/worker-client.js", () => ({
  openWorker: async () => {
    const on = state.workers++ % 3 === 1;
    let n = 0;
    return {
      append: async () => {
        state.clock += ++n % 50 === 0 ? 100 : on ? 2 : 1;
      },
      close: async () => {},
    };
  },
}));
const spy = vi.spyOn(performance, "now").mockImplementation(() => state.clock);
afterAll(() => spy.mockRestore());
await import("../QH1/p2guard.test.js");
it("the unmodified P2 guard above passed even though the p50 delta exceeds its 0.5ms guard", () => {
  const r = JSON.parse(
    fs.readFileSync(path.join(path.dirname(process.env.QH1_RESULT!), "p2guard.json"), "utf8"),
  );
  expect(r.p50DeltaOnOffMs.point).toBe(1);
  expect(r.p99RatioOnOff.point).toBe(1);
  expect(r.regression).toBe(false);
});

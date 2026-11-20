import assert from "node:assert/strict";
import test from "node:test";
import { setImmediate } from "node:timers/promises";
import { ImportLane, ImportRun, pace } from "./lane.ts";
import type { Target } from "./native.ts";
import { snapshot } from "./source.ts";

test("two import manifests share the data transaction permit", async () => {
  const lane = new ImportLane(1);
  let inFlight = 0,
    peak = 0;
  const sessions = await Promise.all(
    ["left", "right"].map(async (scopeName) => {
      let record: Record<string, unknown> | undefined;
      const target = {
        scopeName,
        mode: "snapshot",
        transactionByCommand: async () => ({ ok: true, value: record }),
        write: async (_: unknown, meta: Record<string, unknown>) => {
          peak = Math.max(peak, ++inFlight);
          await setImmediate();
          inFlight--;
          record = { ...meta, position: 1, instant: 1, txId: scopeName + "/tx", changes: [] };
          return record;
        },
      } as unknown as Target;
      return ImportRun.open(
        target,
        snapshot("thin", 0, "incoming/", scopeName),
        pace(32, 1),
        ":memory:",
        lane,
      );
    }),
  );
  try {
    assert.equal(peak, 1);
  } finally {
    for (const s of sessions) s.close();
  }
});

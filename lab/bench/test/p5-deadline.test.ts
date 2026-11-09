import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { performance } from "node:perf_hooks";
import { memoryComposition } from "../lib/memory.ts";
import { W0, V_W0, triplexValue } from "../lib/w0-world.ts";
import { freezeMemoryG0, readW0Fingerprint, fingerprintSweep } from "../lib/w0-fingerprint.ts";
test("CPU-bound fingerprint work cannot grant after its elapsed deadline", async () => {
  const scope = randomUUID(),
    comp = memoryComposition("xtdb", scope);
  for (let i = 0; i < 50; i++)
    await comp.transact(
      [
        {
          op: "assert",
          entityId: W0.placementId(i),
          attribute: "weeklyMinutes",
          value: triplexValue("weeklyMinutes", 2400),
          validFrom: 0,
        },
      ],
      { commandId: "deadline-" + i },
    );
  const basis = { position: 50, validAt: V_W0 },
    expected = {
      ...(await readW0Fingerprint(comp, 50, basis, new AbortController().signal)),
      N: 50,
    },
    counts = await comp.storeCounts();
  const pin = await freezeMemoryG0(comp, {
    endpoint: `memory://${scope}`,
    scope,
    basis,
    expected,
    counts,
  });
  await assert.rejects(
    fingerprintSweep(
      { endpoint: `memory://${scope}`, scope, basis, expected, counts, pin, deadlineMs: 1 },
      async () => ({
        endpoint: `memory://${scope}`,
        scope,
        close: async () => {},
        comp: {
          ...comp,
          sweepPage: async (...args) => {
            const until = performance.now() + 5;
            while (performance.now() < until) {}
            return comp.sweepPage(...args);
          },
        },
      }),
    ),
    /deadline|aborted/,
  );
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { publishRecords } from "../../../bench/lib/w0-outbox.ts";
import { W0 } from "../../../bench/lib/w0-world.ts";
// [DX-H6] Why: bound real public-frame submissions, not just callback count, while keeping submission order.
// Rejected: validating queue configuration without observing overlapping ACKs.
test("publisher limits native frames and preserves ordered submissions", async () => {
  let active = 0,
    peak = 0;
  const submitted: string[] = [];
  const comp: any = {
    transactionByCommand: async () => ({ ok: true, value: null }),
    currentPosition: async () => 1,
    sweepPage: async () => ({ rows: [] }),
    transact: async (ops: any[]) => {
      active++;
      peak = Math.max(peak, active);
      submitted.push(ops[0].entityId);
      await new Promise((r) => setTimeout(r, 20));
      active--;
      return { ok: true, value: { triples: [] } };
    },
  };
  await Promise.all(
    Array.from({ length: 8 }, (_, i) =>
      publishRecords(comp, [
        {
          basis: { tx: 1n, validTime: W0.POPULATION_VALID_TIME },
          release: W0.R2.hash,
          subject: "subject-" + i,
          workItems: [],
        },
      ]),
    ),
  );
  assert.equal(peak, 2);
  assert.deepEqual(
    submitted,
    Array.from({ length: 8 }, (_, i) => "p5:outbox:subject-" + i),
  );
  assert.equal(active, 0);
});

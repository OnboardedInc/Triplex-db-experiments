import assert from "node:assert/strict";
import { test } from "node:test";
import { readW0Pages } from "../../../bench/lib/w0-pages.ts";
// [DX-H8] Why: a shared row occurring in every bounded read must occur once in the grouped world.
// Rejected: a mock that returns disjoint rows only (would miss the actual overlap failure).
test("large groups keep reach <=64, <=4 concurrent requests, and one copy per shared row", async () => {
  let active = 0,
    peak = 0,
    requests = 0;
  const row = {
    id: "shared",
    entityId: "location",
    attribute: "localMinWageCents",
    value: { type: "integer", value: "1650" },
    position: 1,
    validFrom: 0,
  };
  const comp = {
    sweepPage: async (subjects: readonly string[]) => {
      assert.ok(subjects.length <= 64);
      requests++;
      active++;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 1));
      active--;
      return { rows: [row], position: 1, epoch: "same", roundTrips: 1 };
    },
  };
  const result = await readW0Pages(
    comp,
    Array.from({ length: 1024 }, (_, i) => String(i)),
    { position: 1, validAt: 0 },
  );
  assert.equal(requests, 16);
  assert.equal(peak, 4);
  assert.deepEqual(result.rows, [row]);
  let call = 0;
  await assert.rejects(
    readW0Pages(
      {
        sweepPage: async () => ({
          rows: [{ ...row, attribute: String(call++) }],
          position: 1,
          epoch: "same",
          roundTrips: 1,
        }),
      },
      Array.from({ length: 65 }, (_, i) => String(i)),
      { position: 1, validAt: 0 },
    ),
    /row mismatch/,
  );
});

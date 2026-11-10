import assert from "node:assert/strict";
import { test } from "node:test";
import { commitBreakdown } from "../lib/commit-breakdown.ts";
test("segments preserve publication cost inside transact and exclude unavailable observations", () => {
  const r = commitBreakdown([
    {
      scheduledAt: 0,
      transactCalledAt: 3,
      transactReturnedAt: 15,
      ackPublishedAt: 17,
      finishedAt: 20,
      publicationStartedAt: 10,
      publicationDurableAt: 12,
    },
    {},
  ]);
  assert.equal(r.beforeTransact.meanMs, 3);
  assert.equal(r.transact.meanMs, 12);
  assert.equal(r.afterTransact.meanMs, 2);
  assert.equal(r.publicationWitness.meanMs, 2);
  assert.equal(r.afterAck.meanMs, 3);
  assert.equal(r.driverOwn.meanMs, 10);
  assert.equal(r.driverOwn.count, 1);
});

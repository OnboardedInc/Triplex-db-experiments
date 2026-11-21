import assert from "node:assert/strict";
import test from "node:test";
import { DeadlineOrder, freshQueueMs, overdueGrantInterval } from "./deadline-order.ts";
import { admission } from "./rolling-credits.ts";

test("fresh-first bypasses an overdue person and retains that person's queued chain", () => {
  const queue = [
    { person: 1, due: 5 }, { person: 2, due: 12 }, { person: 1, due: 31 }, { person: 3, due: 32 },
  ];
  const tracker = new DeadlineOrder((r) => r.person);
  for (const offer of queue) tracker.add(offer);
  const select = (unavailable = []) => tracker.ready(queue, 50, (r) => r.due, (r) => !unavailable.includes(r.person));
  assert.equal(freshQueueMs, 20);
  assert.deepEqual(select(), [{ index: 3, overdue: false }, { index: 0, overdue: true }]);
  assert.deepEqual(select([1]), [{ index: 3, overdue: false }, { index: 1, overdue: true }]);
  assert.throws(() => tracker.remove(queue[2]), /predecessor/);
  tracker.remove(queue.shift());
  assert.deepEqual(select(), [{ index: 1, overdue: false }, { index: 0, overdue: true }]);
});

for (const credits of [6, 16]) {
  test(`rolling ${credits} gives overdue work a seat every eight busy grants while quiet goes first`, () => {
    const scheduler = admission(10, { mode: "rolling", credits, freshFirst: true });
    const overdue = { account: 1, due: 1, overdue: true };
    const fresh = { account: 2, due: 40, overdue: false };
    const quiet = { account: 0, due: 48, overdue: false };
    const granted = [];
    let quietReady = true;
    const ready = () => granted.length === 1 + 2 * overdueGrantInterval ? []
      : quietReady ? [overdue, fresh, quiet] : [overdue, fresh];
    scheduler.dispatch(ready, (row, ticket) => {
      granted.push(row);
      quietReady = false;
      scheduler.resolved(true, ticket);
    });
    assert.deepEqual(granted, [quiet, ...Array(7).fill(fresh), overdue, ...Array(7).fill(fresh), overdue]);
    scheduler.dispatch(() => [overdue], (_, ticket) => scheduler.resolved(false, ticket));
    scheduler.dispatch(() => [quiet, fresh], () => assert.fail("An uncertain credit reopened admission"));
  });
}

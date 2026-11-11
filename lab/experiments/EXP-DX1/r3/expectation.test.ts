import assert from "node:assert/strict";
import { test } from "node:test";
import { Model } from "../../../bench/lib/model.ts";
import { ExpectationCache } from "../../../bench/lib/expectation-cache.ts";
import { splitTarget } from "../../../bench/lib/split-target.ts";

test("expected-world memoization equals the original at all boundaries, including late out-of-order ACKs", () => {
  const model = new Model(2000), cached = new ExpectationCache(model);
  let compared = 0;
  for (let stage = 0; stage < 4; stage++) {
    if (stage) for (let subject = 0; subject < 4; subject++) model.addCommit(subject, {
      instant: stage === 3 ? 15 : stage * 20, position: stage, txId: `c${stage}`, stamp: stage,
      stampValidFrom: stage * 30, ackAtMs: stage * 100, stream: "test",
      parts: [{ validFrom: stage * 10, a: stage, b: stage * 2, n: stage }],
    });
    for (let subject = 0; subject < 4; subject++) for (let r = -1; r < 80; r++) for (let v = -1; v < 120; v++) {
      assert.deepEqual(cached.expected(subject, r, v), model.expected(subject, r, v)); compared++;
    }
  }
  for (const r of [NaN, Infinity, -Infinity]) for (const v of [NaN, Infinity, -Infinity])
    assert.deepEqual(cached.expected(0, r, v), model.expected(0, r, v));
  assert(compared > 150000);
  assert(cached.diagnostics.hits > cached.diagnostics.misses);
});

test("split selection prefers a real offered command without inventing writes or losing legacy control", () => {
  const pending = [{ subject: 3, seq: 1 }, { subject: 7, seq: 2 }];
  const soon = [{ subject: 9, seq: 3 }];
  let range = 0;
  assert.deepEqual(splitTarget(pending, soon, n => (range = n) - 1, "pending"), pending[1]);
  assert.equal(range, 2);
  assert.deepEqual(splitTarget(pending, soon, n => n - 1, "mixed"), soon[0]);
  assert.deepEqual(splitTarget([], soon, () => 0, "pending"), soon[0]);
  assert.deepEqual(splitTarget([], [], () => { throw Error("no draw"); }, "pending"), { subject: -1, seq: -1 });
});

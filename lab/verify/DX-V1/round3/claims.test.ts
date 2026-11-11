import assert from "node:assert/strict";
import { test } from "node:test";
import { Option } from "effect";
import { RecentReads } from "../../../../packages/datomic/dist/index.js";
import { ReplicaReader } from "../../../bench/lib/replica-reads.ts";
import { ExpectationCache } from "../../../bench/lib/expectation-cache.ts";
import { CanonicalValueError, canonicalWorld } from "../../../bench/lib/canonical.ts";
import { wire, packed, gatewayRows, result, seeded, judgeFor, record } from "./fixtures.ts";

// [DX-V1-R3] Why: current gates assert only the repaired claims; prior defect assertions are historical.
// Rejected: requiring an obsolete false positive before testing its repair.
test("R2-A: count, stamp and digest respect expiry with a warmed cache", () => {
  const { model, rows } = seeded((r, i) => (i === 3 ? { ...r, validTo: Option.some(20) } : r));
  const cache = new ExpectationCache(model),
    judge = judgeFor(model, cache);
  assert.equal(judge(record(rows, 100, 10)).ok, true);
  assert.equal(judge(record(rows, 100, 20)).ok, false);
  assert.equal(
    judge(
      record(
        rows.filter((_, i) => i !== 3),
        100,
        20,
      ),
    ).ok,
    true,
  );
  assert.deepEqual(cache.expected(0, 100, 20), model.expected(0, 100, 20));
});

test("R2-B: unproven/non-strict scopes cannot close time cuts; strict scopes need a later clock", async () => {
  const a = packed([wire()]),
    reader = new ReplicaReader();
  reader.apply({
    position: 1,
    reset: true,
    valid: true,
    recordTime: 100,
    changes: [["root", undefined, a]],
  });
  reader.apply({ position: 2, reset: false, valid: true, recordTime: 101, changes: [] });
  const expected = gatewayRows([wire(), wire("late", 3, 100)], 3);
  const answer = await reader.pullAt("root", { recordedAt: 100, validAt: 10 }, async () =>
    result(expected),
  );
  assert.equal(answer.route, "fallback");
  assert.equal(canonicalWorld(answer.triples), canonicalWorld(expected));
  const strict = new RecentReads(2, 100000, true);
  strict.apply({ position: 10, reset: true, valid: true, recordTime: 100, changes: [] });
  assert.equal(strict.resolve({ recordedAt: 100, validAt: 0 }), undefined);
  strict.apply({ position: 11, reset: false, valid: true, recordTime: 101, changes: [] });
  assert.equal(strict.resolve({ recordedAt: 100, validAt: 0 }), 10);
  assert.equal(strict.resolve({ recordedAt: 101, validAt: 0 }), undefined);
});

test("R2-C: Date cannot certify an empty JSON object", () => {
  const { model, rows } = seeded((r, i) =>
    i === 3 ? { ...r, value: { type: "json", value: {} } } : r,
  );
  assert.equal(judgeFor(model)(record(rows)).ok, true);
  const bad = rows.map((r, i) =>
    i === 3 ? { ...r, value: { type: "json", value: new Date(0) } } : r,
  );
  assert.throws(() => record(bad), CanonicalValueError);
});

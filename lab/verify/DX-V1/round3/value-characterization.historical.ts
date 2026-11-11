import assert from "node:assert/strict";
import { test } from "node:test";
import { Option } from "effect";
import {
  canonicalRow,
  canonicalWorld,
  typed,
  CanonicalValueError,
} from "../../../bench/lib/canonical.ts";
import { observe } from "../../../bench/lib/observe.ts";
import { result, seeded, judgeFor, record } from "./fixtures.ts";

// [DX-V1-R3] Why: show exact accepted corruptions before optionally asserting the intended rejection.
// Rejected: treating any thrown exception or invalid fixture as a wrong-read acceptance.
test("R3-C1: hidden array index is accepted as the ordinary enumerable index", () => {
  const { model, rows } = seeded((r, i) =>
    i === 3 ? { ...r, value: { type: "json", value: [7] } } : r,
  );
  const value = [7];
  Object.defineProperty(value, "0", { enumerable: false });
  const bad = rows.map((r, i) => (i === 3 ? { ...r, value: { type: "json", value } } : r));
  assert.equal(Object.keys(value).length, 0);
  assert.equal(canonicalWorld(bad), canonicalWorld(rows));
  assert.equal(judgeFor(model)(record(bad)).ok, true);
  console.log(
    JSON.stringify({
      finding: "R3-C1",
      expectedKeys: Object.keys(rows[3].value.value),
      actualKeys: Object.keys(value),
      verdict: judgeFor(model)(record(bad)),
    }),
  );
  if (process.env.DX_V1_R3_ASSERT_CLAIM === "1")
    assert.throws(() => record(bad), CanonicalValueError);
});

test("R3-C2: accessor Option can cache an old digest while its public value changes", () => {
  const { model, rows } = seeded();
  let actor = "writer",
    getterCalls = 0;
  const option = Object.create(Object.getPrototypeOf(Option.some("writer")));
  Object.defineProperty(option, "value", {
    enumerable: true,
    get() {
      getterCalls++;
      return actor;
    },
  });
  Object.freeze(option);
  const freeze = (v: any): any => {
    if (v && typeof v === "object" && !Object.isFrozen(v)) {
      for (const x of Object.values(v)) freeze(x);
      Object.freeze(v);
    }
    return v;
  };
  const row = freeze({ ...rows[3], createdBy: option }),
    bad = rows.map((r, i) => (i === 3 ? row : r));
  assert.equal(Option.isOption(option), true);
  assert.equal(canonicalRow(row), canonicalRow(rows[3]));
  assert.equal(judgeFor(model)(record(bad)).ok, true);
  const before = observe(result(bad));
  actor = "WRONG-ACTOR";
  assert.equal(row.createdBy.value, "WRONG-ACTOR");
  assert.notEqual(canonicalRow(row), canonicalRow(rows[3]));
  const after = observe(result(bad)),
    verdict = judgeFor(model)(record(bad));
  assert.deepEqual(after, before);
  assert.equal(verdict.ok, true);
  console.log(
    JSON.stringify({
      finding: "R3-C2",
      actor: row.createdBy.value,
      getterCalls,
      digest: after.digest,
      verdict,
    }),
  );
  if (process.env.DX_V1_R3_ASSERT_CLAIM === "1")
    assert.equal(verdict.ok, false, "changed public metadata must not certify old bytes");
});

test("R3-C3: a hole plus non-index numeric property passes the declared sparse-array rejection", () => {
  const a: any[] = Array(1);
  Object.defineProperty(a, "4294967295", { value: 7, enumerable: true });
  assert.deepEqual(typed(a), ["array", Array(1)]);
  assert.notEqual(JSON.stringify(a), JSON.stringify([7]));
  if (process.env.DX_V1_R3_ASSERT_CLAIM === "1") assert.throws(() => typed(a), CanonicalValueError);
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { Option } from "effect";
import { typed, CanonicalValueError } from "../../../bench/lib/canonical.ts";
import { seeded, record } from "./fixtures.ts";

// [DX-V1-R3] Why: assert only the intended validator contract; separate historical characterizations retain the wrong-acceptance evidence.
// Rejected: requiring the old defect to occur before a claim can pass.
test("R3-C1: hidden array index must be an invalid value", () => {
  const value = [7];
  Object.defineProperty(value, "0", { enumerable: false });
  assert.throws(() => typed(value), CanonicalValueError);
});
test("R3-C2: Option accessors must be rejected without reading them", () => {
  const { rows } = seeded();
  let calls = 0;
  const option = Object.create(Object.getPrototypeOf(Option.some("writer")));
  Object.defineProperty(option, "value", {
    enumerable: true,
    get() {
      calls++;
      return "writer";
    },
  });
  const bad = rows.map((r, i) => (i === 3 ? { ...r, createdBy: option } : r));
  assert.throws(() => record(bad), CanonicalValueError);
  assert.equal(calls, 0);
});
test("R3-C3: a sparse array with a numeric non-index key must be invalid", () => {
  const value: any[] = Array(1);
  Object.defineProperty(value, "4294967295", { value: 7, enumerable: true });
  assert.throws(() => typed(value), CanonicalValueError);
});

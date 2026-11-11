import assert from "node:assert/strict";
import { test } from "node:test";
import { Option } from "effect";
import { canonicalRow, typed, CanonicalValueError } from "../../../bench/lib/canonical.ts";
import { observe } from "../../../bench/lib/observe.ts";
import { result } from "../../../verify/DX-V1/round3/fixtures.ts";

// [DX-R3-P6] Why: injected Option fields must be rejected before a getter runs or any digest becomes cached.
// Rejected: relying on frozen instance shape alone (an accessor can still return changing metadata).
test("Option own accessors, hidden/symbol extras and unsupported prototypes never enter observation caching", () => {
  let calls = 0;
  for (const base of [Option.some("writer"), Option.none()])
    for (const key of ["value", "_tag", "extra"]) {
      const option = Object.create(Object.getPrototypeOf(base));
      if (Option.isSome(base) && key !== "value")
        Object.defineProperty(option, "value", { value: "writer", enumerable: true });
      Object.defineProperty(option, key, {
        enumerable: true,
        get() {
          calls++;
          return "WRONG";
        },
      });
      Object.freeze(option);
      const row = Object.freeze({ createdBy: option });
      assert.throws(() => observe(result([row])), CanonicalValueError);
      assert.throws(() => observe(result([row])), CanonicalValueError);
    }
  assert.equal(calls, 0);
  for (const key of ["hidden", Symbol("extra")]) {
    const option = Object.create(Object.getPrototypeOf(Option.some("writer")));
    Object.defineProperty(option, "value", { value: "writer", enumerable: true });
    Object.defineProperty(option, key, { value: "bad", enumerable: typeof key === "symbol" });
    Object.freeze(option);
    assert.throws(() => canonicalRow({ createdBy: option }), CanonicalValueError);
  }
  const custom = Object.create(Object.create(Object.getPrototypeOf(Option.some("writer"))));
  custom.value = "writer";
  assert.throws(() => canonicalRow({ createdBy: custom }), CanonicalValueError);
});

test("valid frozen Options cache safely and mutable nested Option values do not", () => {
  for (const option of [Option.none(), Option.some(undefined), Option.some("writer")]) {
    const row = Object.freeze({ createdBy: Object.freeze(option) });
    assert.deepEqual(observe(result([row])), observe(result([row])));
  }
  const nested = { actor: "before" },
    option = Object.freeze(Option.some(nested));
  const row = Object.freeze({ createdBy: option }),
    before = observe(result([row]));
  nested.actor = "after";
  assert.notEqual(observe(result([row])).digest, before.digest);
  const ownTag = Object.assign(Option.some("writer"), { _tag: "Some" });
  assert.notEqual(canonicalRow({ createdBy: ownTag }), canonicalRow({ createdBy: Option.some("writer") }));
  const extra = Object.assign(Option.some("writer"), { extra: "changed" });
  assert.notEqual(
    canonicalRow({ createdBy: extra }),
    canonicalRow({ createdBy: Option.some("writer") }),
  );
});

test("arrays accept exactly dense enumerable data indices plus length", () => {
  for (const value of [[], [7], [undefined, -0, [1, 2]]]) assert.doesNotThrow(() => typed(value));
  for (const key of ["4294967295", "01", "-0", "1e0", "extra"]) {
    const value: any[] = Array(1);
    Object.defineProperty(value, key, { value: 7, enumerable: true });
    assert.throws(() => typed(value), CanonicalValueError);
  }
  for (const enumerable of [false, true]) {
    let calls = 0;
    const value = [7];
    Object.defineProperty(value, "0", {
      enumerable,
      get() {
        calls++;
        return 7;
      },
    });
    assert.throws(() => typed(value), CanonicalValueError);
    assert.equal(calls, 0);
  }
  const hidden = [7];
  Object.defineProperty(hidden, "0", { enumerable: false });
  assert.throws(() => typed(hidden), CanonicalValueError);
});

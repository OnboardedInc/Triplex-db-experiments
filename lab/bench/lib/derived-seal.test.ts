// [DX-ERA4] The derived-seal client's decisions without a database: node --test --experimental-transform-types <this file>
import assert from "node:assert/strict";
import test from "node:test";
import {
  derivedSealOn,
  inputUnion,
  isRemoved,
  isSealed,
  namedInputs,
  noteOutput,
  noteWorld,
  outputInputs,
  sealedHeader,
  worldInputs,
} from "./derived-seal.ts";

const env = (v: string | undefined, f: () => void) => {
  const before = process.env.TX2_DERIVED_SEAL;
  if (v === undefined) delete process.env.TX2_DERIVED_SEAL;
  else process.env.TX2_DERIVED_SEAL = v;
  try {
    f();
  } finally {
    if (before === undefined) delete process.env.TX2_DERIVED_SEAL;
    else process.env.TX2_DERIVED_SEAL = before;
  }
};
const wire = (h: unknown) => "tdx1." + Buffer.from(JSON.stringify(h)).toString("base64url") + ".bm9uY2U.Ym9keQ";

test("the option is off unless set to 1", () => {
  env(undefined, () => assert.equal(derivedSealOn(), false));
  env("0", () => assert.equal(derivedSealOn(), false));
  env("1", () => assert.equal(derivedSealOn(), true));
});

test("with the option off a world's rows are not recorded (nothing changes)", () => {
  env(undefined, () => {
    const w = noteWorld({ subject: "s" }, [{ id: "a", value: { type: "string" } }]);
    assert.throws(() => worldInputs(w), /without its rows/);
  });
});

test("a record names every string row its world was built from, and only those", () => {
  env("1", () => {
    const rows = [
      { id: "b", value: { type: "string" } },
      { id: "a", value: { type: "string" } },
      { id: "c", value: { type: "integer" } },
      { id: "d", value: { type: "erased" } },
      { id: "a", value: { type: "string" } },
    ];
    const w = noteWorld({ subject: "s" }, rows);
    assert.deepEqual(worldInputs(w), ["a", "b"], "sorted, distinct; integers and removed rows hold no protected value");
    const out = noteOutput([{ id: "wi:1" }], w);
    assert.deepEqual(outputInputs(out), ["a", "b"]);
    assert.throws(() => outputInputs([]), /without its world/);
  });
});

test("a sealed record's header names its database and assertions; lineage is a union", () => {
  const s = wire({ d: "s2-x", k: ["a1", "a2"] });
  assert.equal(isSealed(s), true);
  assert.equal(isSealed('{"payload":1}'), false);
  assert.deepEqual(sealedHeader(s), { d: "s2-x", k: ["a1", "a2"] });
  assert.deepEqual(namedInputs(s), ["a1", "a2"]);
  assert.deepEqual(namedInputs({ removed: ["a2"] }), ["a2"]);
  assert.deepEqual(namedInputs({ id: "clear item" }), []);
  assert.deepEqual(inputUnion(["b", "a"], ["a", "c"]), ["a", "b", "c"]);
  assert.equal(isRemoved({ removed: ["a"] }), true);
  assert.equal(isRemoved({ value: "x" }), false);
  assert.throws(() => sealedHeader("tdx1." + Buffer.from('{"d":1}').toString("base64url") + ".x.y"));
});

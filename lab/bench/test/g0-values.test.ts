// [EXP-K01-R9] Why: test representation separation for every supported kind, including nested values. Rejected: testing only -0 while other JSON coercions remain.
import assert from "node:assert/strict";
import { test } from "node:test";
import { hash, canonical } from "../lib/g0.ts";
import { wireValue } from "../lib/g0-values.ts";
const nan = (hex: string) => Buffer.from(hex, "hex").readDoubleBE();
for (const [name, a, b] of [
  ["signed-zero", -0, 0],
  ["NaN-payload", nan("7ff8000000000001"), nan("7ff8000000000002")],
  ["infinity", Infinity, -Infinity],
  ["integer-float", 1n, 1],
  ["integer-width-wire", wireValue(20, Buffer.from("1")), wireValue(23, Buffer.from("1"))],
  ["integer-float-wire", wireValue(20, Buffer.from("1")), wireValue(701, Buffer.from("1"))],
  ["decimal-scale", wireValue(1700, Buffer.from("1.0")), wireValue(1700, Buffer.from("1.00"))],
  ["string-number", "1", 1],
  ["boolean", true, 1],
  ["null", "null", null],
  ["date", new Date(0), 0],
  ["bytes", Uint8Array.from([1]), Uint8Array.from([2])],
  ["bytes-kind", Uint8Array.from([1]), Int8Array.from([1])],
  ["unicode", "\ud800", "\ufffd"],
  ["array-object", [1], { "0": 1 }],
  ["nested-negative-zero", { a: [-0] }, { a: [0] }],
  ["sentinel-string", "f6416:8000000000000000", -0],
  ["bigint-precision", 9007199254740992n, 9007199254740993n],
] as const)
  test("typed digest distinguishes " + name, () => {
    assert.notEqual(hash(a), hash(b));
  });
test("canonical never invokes toJSON and rejects unsupported state", () => {
  let calls = 0;
  const x = {
    toJSON() {
      calls++;
      return 0;
    },
  };
  assert.throws(() => canonical(x));
  assert.equal(calls, 0);
  for (const v of [
    undefined,
    () => 1,
    Symbol("x"),
    new Map(),
    [, 1],
    Object.defineProperty({}, "x", {
      get() {
        throw Error("invoked");
      },
    }),
  ])
    assert.throws(() => canonical(v));
  const cyclic: any = {};
  cyclic.self = cyclic;
  assert.throws(() => hash(cyclic));
  assert.equal(hash({ b: 1, a: 2 }), hash({ a: 2, b: 1 }));
});
test("wire transport refuses representations whose exact bits are unavailable", () => {
  assert.throws(() => wireValue(701, Buffer.from("NaN")));
  assert.throws(() => wireValue(114, Buffer.from('{"x":0}')));
});

test("real raw-row decoder preserves OID/bytes and refuses partial protocol frames", async () => {
  const { wireRows } = await import("../lib/g0-wire.ts");
  const frame = (oid: number, text: string) =>
    Object.assign([[Buffer.from(text)]], {
      columns: [
        {
          name: "v",
          type: oid,
          nativeType: ({ 20: ":i64", 700: ":f32", 701: ":f64" } as Record<number, string>)[oid],
        },
      ],
    });
  assert.notEqual(hash(wireRows(frame(20, "1"))), hash(wireRows(frame(701, "1"))));
  assert.notEqual(hash(wireRows(frame(701, "-0"))), hash(wireRows(frame(701, "0"))));
  assert.notEqual(hash(wireRows(frame(700, "1"))), hash(wireRows(frame(701, "1"))));
  for (const rows of [
    [],
    Object.assign([[undefined]], { columns: [{ name: "v", type: 20 }] }),
    Object.assign([[]], { columns: [{ name: "v", type: 20 }] }),
    Object.assign([[Buffer.from("1")]], { columns: [{ type: 20 }] }),
  ])
    assert.throws(() => wireRows(rows));
});

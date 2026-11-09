// [EXP-K01-R10] Why: test the native catalog/OID boundary before hashing. Rejected: a frame test that assumes the engine never widens storage union legs.
import assert from "node:assert/strict";
import { test } from "node:test";
import { nativeType, nativeCatalog } from "../lib/g0-native.ts";
import { wireRows } from "../lib/g0-wire.ts";
import { hash } from "../lib/g0.ts";
const frame = (oid: number, text: string) =>
  Object.assign([[Buffer.from(text)]], { columns: [{ name: "v", type: oid }] });
test("same widened OID/bytes do not conceal a native width change", () => {
  const a = wireRows(frame(21, "1"), { v: ":i8" }),
    b = wireRows(frame(21, "1"), { v: ":i16" });
  assert.notEqual(hash(a), hash(b));
  assert.throws(() => wireRows(frame(20, "1"), { v: "[:union :i32 :i64]" }), /ambiguous/);
  assert.throws(() => wireRows(frame(701, "1.5"), { v: "[:union :f32 :f64]" }), /ambiguous/);
  assert.throws(() => wireRows(frame(20, "1")), /missing native/);
  assert.throws(() => wireRows(frame(20, "1"), { v: ":i32" }), /inconsistent/);
});
test("native monotypes and nullable monotypes have the same non-null representation", () => {
  assert.equal(nativeType(20, ":i64"), nativeType(20, "[:? :i64]"));
  assert.equal(nativeType(1700, "[:? :decimal 38 6 128]"), ":decimal/38/6/128");
  for (const spec of [undefined, ":unknown", "[:union :i64 :i32]", '[:struct {"x" :i64}]'])
    assert.throws(() => nativeType(20, spec));
});
test("missing, duplicated or partial native catalog is not proof", () => {
  for (const rows of [
    undefined,
    [{ column_name: "v" }],
    [
      { column_name: "v", xt_type: ":i64" },
      { column_name: "v", xt_type: ":i64" },
    ],
  ])
    assert.throws(() => nativeCatalog(rows));
  assert.deepEqual(nativeCatalog([{ column_name: "v", xt_type: ":i64" }]), { v: ":i64" });
});

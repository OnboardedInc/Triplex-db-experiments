// [EXP-K01-R11] Why: replay captured canonical witnesses and source-defined type boundaries offline. Rejected: substituting hand-written widened numbers for actual wire bytes.
import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { nativeType, nativeCatalog, nativeUnionLegs } from "../lib/g0-native.ts";
import { wireRows } from "../lib/g0-wire.ts";
import { canonical, wireValue } from "../lib/g0-values.ts";
const fixture = JSON.parse(
  fs.readFileSync(new URL("./fixtures/g0-live-round10.json", import.meta.url), "utf8"),
);
const source = fs.readFileSync(
  new URL("../../experiments/EXP-K01-seed-clone/evidence/live-round10/wire.log", import.meta.url),
);
const frame = (oid: number, bytes: Uint8Array | null) =>
  Object.assign([[bytes]], { columns: [{ name: "v", type: oid }] });
test("live fixture binds the exact unchanged first-failure log", () => {
  assert.equal(createHash("sha256").update(source).digest("hex"), fixture.sourceSha256);
  assert.match(source.toString(), /actual: '#\{:i32 :i64\}'/);
  assert.equal(fixture.scalars.length, 4);
});
for (const cell of fixture.scalars) {
  test("captured frame replays exactly: " + cell.table, () => {
    const catalog = nativeCatalog(cell.catalog);
    assert.equal(catalog.v, cell.native);
    const rows = wireRows(frame(cell.oid, Buffer.from(cell.bytesHex, "hex")), catalog);
    assert.equal(canonical(rows), cell.canonical);
    assert(source.includes(Buffer.from(cell.canonical)));
    assert.equal(
      canonical(
        wireRows(frame(cell.oid, Buffer.from(cell.bytesHex, "hex")), { v: `[:? ${cell.native}]` }),
      ),
      cell.canonical,
    );
  });
}
// [EXP-K01-R11] Why: PgType.kt:951-975 and OID definitions :186-352,582-585,737-740; serde/types.clj:97-115,279-284. Rejected: assuming PostgreSQL's Int8 name means I8 storage.
for (const [kind, oid] of [
  ["bool", 16],
  ["i16", 21],
  ["i32", 23],
  ["i64", 20],
  ["f32", 700],
  ["f64", 701],
  ["utf8", 25],
  ["varbinary", 17],
  ["uuid", 2950],
] as const) {
  test("source-defined scalar and nullable OID: " + kind, () => {
    assert.equal(nativeType(oid, ":" + kind), ":" + kind);
    assert.equal(nativeType(oid, `[:? :${kind}]`), ":" + kind);
    assert.throws(() => nativeType(oid + 1, ":" + kind), /inconsistent/);
  });
}
test("unsupported I8, bpchar, temporal/structured and pure Null do not gain a type witness", () => {
  assert.throws(() => nativeType(21, ":i8"), /inconsistent/);
  assert.throws(() => wireValue(1042, Buffer.from("x")), /not lossless/);
  assert.throws(() => nativeType(1043, ":utf8"), /inconsistent/);
  for (const [oid, spec] of [
    [25, ":null"],
    [25, ":nothing"],
    [1184, ":instant"],
    [1184, "[:? :instant]"],
    [1114, "[:timestamp-local :micro]"],
    [114, '[:struct {"x" :i64}]'],
    [1007, "[:list :i32]"],
  ] as const)
    assert.throws(() => nativeType(oid, spec), /inconsistent/);
  assert.equal(wireRows(frame(25, null), { v: ":null" })[0]!.v, null);
});
test("decimal and nullable decimal retain precision, scale and storage width", () => {
  assert.equal(nativeType(1700, "[:decimal 38 6 128]"), ":decimal/38/6/128");
  assert.equal(nativeType(1700, "[:? :decimal 38 6 128]"), ":decimal/38/6/128");
  assert.notEqual(nativeType(1700, "[:decimal 38 6 128]"), nativeType(1700, "[:decimal 38 6 256]"));
});
test("captured integer Poly and source-defined float/nullable Poly refuse widened rows", () => {
  assert.deepEqual(nativeUnionLegs(fixture.mixedIntegerType), [":i32", ":i64"]);
  assert.deepEqual(nativeUnionLegs("#{:i64 :i32}"), [":i32", ":i64"]);
  assert.deepEqual(nativeUnionLegs("#{:null :f64 :f32}"), [":f32", ":f64", ":null"]);
  for (const [oid, spec] of [
    [20, fixture.mixedIntegerType],
    [701, "#{:f32 :f64}"],
    [20, "#{:null :i32 :i64}"],
    [114, "#{:bool :utf8}"],
    [114, '#{:i64 [:struct {"x" :i32}]}'],
  ] as const)
    assert.throws(() => wireRows(frame(oid, Buffer.from("1")), { v: spec }));
  for (const spec of [
    "[:union :i32 :i64]",
    "#{:i32}",
    "#{:i32 :i32}",
    "#{:i32 :i64",
    "#{:i32 :i64} trailing",
    "#{:i32 bad}",
  ])
    assert.throws(() => nativeUnionLegs(spec));
});

// [EXP-K01-R8] Why: schema changes must automatically be covered or fail before a gate can run. Rejected: a snapshot assertion that developers can refresh while leaving G0's whitelist unchanged.
import assert from "node:assert/strict";
import { test } from "node:test";
import { adapterSchema, schemaSources } from "../lib/g0-schema.ts";
import { fields } from "../lib/g0.ts";
test("every adapter-declared table and column is hashed; there are no exclusions", () => {
  const schema = adapterSchema(schemaSources());
  assert.deepEqual(fields, schema);
  for (const cols of Object.values(schema)) {
    assert.ok(cols.includes("_id"));
    assert.ok(cols.includes("scope_key"));
  }
  assert.ok(fields.tx_assertions.includes("value_identity"));
});
test("adding an assertion column, side-table column or new side table cannot leave an uncovered field", () => {
  for (const variant of ["assertion", "side-column", "side-table"]) {
    const sources = schemaSources();
    if (variant === "assertion")
      sources["codecs.ts"] = sources["codecs.ts"]!.replace('"id",', '"future_column", "id",');
    if (variant === "side-column")
      sources["XtdbStorageAdapter.ts"] = sources["XtdbStorageAdapter.ts"]!.replace(
        "tx_attempts (_id,",
        "tx_attempts (future_column, _id,",
      );
    if (variant === "side-table")
      sources["future.ts"] = 'const sql="CREATE TABLE tx_future (_id, scope_key, future_column)";';
    const derived = adapterSchema(sources);
    const table =
      variant === "assertion"
        ? "tx_assertions"
        : variant === "side-column"
          ? "tx_attempts"
          : "tx_future";
    assert.ok(derived[table]!.includes("future_column"));
    // A consumer keeping today's projection would fail the same completeness assertion.
    assert.notDeepEqual(fields, derived);
  }
});
test("unsupported dynamic DDL and incomplete schema refuse instead of omitting a declaration", () => {
  assert.throws(() => adapterSchema({}));
  const sources = schemaSources();
  sources["future.ts"] = "const sql=`CREATE TABLE tx_future (${dynamic})`;";
  assert.throws(() => adapterSchema(sources), /unsupported dynamic/);
});

test("independent declaration audit fails if any stored column lacks coverage", () => {
  const sources = schemaSources();
  const array = /export const assertionColumns = \[([\s\S]*?)\] as const/.exec(
    sources["codecs.ts"]!,
  )!;
  const assertion = [...array[1]!.matchAll(/"([a-z_]+)"/g)].map((m) => m[1]!);
  assert.ok(assertion.length > 0);
  const declared: Record<string, string[]> = {};
  for (const text of Object.values(sources)) {
    const expanded = text.replace(/\$\{assertionColumns\.join\(", "\)\}/g, assertion.join(", "));
    for (const m of expanded.matchAll(/CREATE TABLE (tx_[a-z_]+) \(([^)]+)\)/g))
      declared[m[1]!] = m[2]!.split(",").map((c) => c.trim());
  }
  assert.deepEqual(Object.keys(fields).sort(), Object.keys(declared).sort());
  for (const [table, cols] of Object.entries(declared))
    assert.deepEqual([...fields[table]!].sort(), cols.sort(), table);
});

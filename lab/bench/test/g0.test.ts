// [EXP-P5-R3] Why: import coordinator mutation tests without K01 engine/seed orchestration tests (outside this offline P5 branch). Rejected: copying unrelated bulk/engine changes to satisfy wiring assertions.
// [EXP-K01-R7] Why: test the sole granting function against changed, missing, foreign and late content. Rejected: restoring the retired process-evidence matrix.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  admitG0,
  readG0,
  fields,
  requireW0Fingerprint,
  type Reader,
  type Expected,
  type Table,
} from "../lib/g0.ts";
const expected: Expected = {
  scope: "seed",
  position: 2,
  world: "N01",
  counts: { tx_assertions: 2, tx_claims: 2, tx_attempts: 2, tx_meta: 1 },
};
function fixture() {
  const tables = Object.fromEntries(
    Object.entries(fields).map(([table, cols]) => [
      table,
      Array.from({ length: expected.counts[table as Table] }, (_, i) =>
        Object.fromEntries(
          cols.map((c) => [
            c,
            c === "position" || c === "recorded_position"
              ? i + 1
              : c === "scope_key"
                ? "seed"
                : c === "entity_id"
                  ? "subject" + i
                  : null,
          ]),
        ),
      ),
    ]),
  );
  const reader: Reader = {
    endpoint: "measured-endpoint",
    async *scan(t) {
      yield* tables[t]!;
    },
    async count(t) {
      return tables[t]!.length;
    },
    async scopes() {
      return [{ scope_key: "seed", position: 2 }];
    },
  };
  return { reader, tables };
}
test("same content in another physical order grants only on fresh read", async () => {
  const f = fixture(),
    pin = await readG0(f.reader, expected);
  f.tables.tx_assertions!.reverse();

  const pass = await admitG0(f.reader, pin, expected);
  assert.equal(pass.status, "PASS");
  assert.equal(pass.endpoint, "measured-endpoint");
});
for (const variant of [
  "changed",
  "dropped",
  "missing-subject",
  "empty",
  "missing-field",
  "historical-position",
  "retracted-position",
  "value",
  "extra",
])
  test(`G0 refuses ${variant}`, async () => {
    const f = fixture(),
      pin = await readG0(f.reader, expected),
      rows = f.tables.tx_assertions!;
    if (variant === "changed") rows[0]!.attribute = "different";
    if (variant === "dropped" || variant === "missing-subject") rows.pop();
    if (variant === "empty") rows.length = 0;
    if (variant === "missing-field") delete rows[0]!.value_type;
    if (variant === "historical-position") rows[0]!.recorded_position = 123;
    if (variant === "retracted-position") rows[0]!.retracted_position = 123;
    if (variant === "value") rows[0]!.value_string = "other";
    if (variant === "extra") rows.push({ ...rows[0] });
    await assert.rejects(admitG0(f.reader, pin, expected));
  });
for (const variant of [
  "foreign",
  "wrong-position",
  "wrong-count",
  "partial-count",
  "wrong-scope",
  "wrong-pin",
  "missing-pin",
  "late",
  "failed",
])
  test(`G0 binding/acquisition refuses ${variant}`, async () => {
    const f = fixture(),
      pin = await readG0(f.reader, expected);
    let want = structuredClone(expected);
    if (variant === "foreign")
      f.reader.scopes = async () => [
        { scope_key: "seed", position: 2 },
        { scope_key: "other", position: 1 },
      ];
    if (variant === "wrong-position")
      f.reader.scopes = async () => [{ scope_key: "seed", position: 3 }];
    if (variant === "wrong-count") f.reader.count = async () => 0;
    if (variant === "partial-count") f.reader.count = async () => 1;
    if (variant === "wrong-scope") want.scope = "other";
    if (variant === "wrong-pin") pin.D = "a".repeat(64);
    if (variant === "missing-pin") pin.D = "";
    if (variant === "late") f.reader.count = async () => new Promise(() => {});
    if (variant === "failed")
      f.reader.count = async () => {
        throw Error("read failed");
      };
    await assert.rejects(admitG0(f.reader, pin, want, undefined, 25));
  });
test("G0 never grants from diagnostics or a cached external PASS", async () => {
  const f = fixture(),
    pin = await readG0(f.reader, expected);
  (pin as any).diagnostics = { status: "PASS", readiness: true };
  f.tables.tx_claims![0]!.command_id = "changed";
  await assert.rejects(admitG0(f.reader, pin, expected));
});
test("W0 requires the independent oracle and checks every digest", async () => {
  const fp = { basisTx: 2, facts: 2, worlds: "worlds", R2: "R2" },
    oracle = {
      rung: { N: 2 },
      seed: "W0-pop-1",
      sources: { oracle: "hash" },
      invalidWorlds: [],
      fingerprint: fp,
    };
  assert.doesNotThrow(() => requireW0Fingerprint(fp, oracle, 2));
  for (const k of ["basisTx", "facts", "worlds", "R2"])
    assert.throws(() => requireW0Fingerprint({ ...fp, [k]: "changed" }, oracle, 2));
  const f = fixture();
  await assert.rejects(readG0(f.reader, { ...expected, world: "W0" }), /O-DOMAIN/);
});
test("W0 admission reads the measured fingerprint anew and refuses oracle drift", async () => {
  const f = fixture(),
    want = { ...expected, world: "W0" as const };
  const fp = { basisTx: 2, facts: 2, worlds: "worlds", R2: "R2" },
    oracle = {
      rung: { N: 2 },
      seed: "W0-pop-1",
      sources: { oracle: "hash" },
      invalidWorlds: [],
      fingerprint: { ...fp },
    };
  let reads = 0;
  const hook = {
    N: 2,
    oracle,
    read: async () => {
      reads++;
      return { ...fp };
    },
  };
  const pin = await readG0(f.reader, want, hook);
  await admitG0(f.reader, pin, want, hook);
  assert.equal(reads, 2);
  fp.worlds = "changed";
  await assert.rejects(admitG0(f.reader, pin, want, hook), /O-DOMAIN/);
});
// [EXP-K01-R8] Why: mutation controls must range over the schema, not repeat the old shortlist. Rejected: a single value_identity regression that leaves the next schema column uncovered.
for (const [table, columns] of Object.entries(fields))
  for (const column of columns)
    test(`full schema refuses changed ${table}.${column}`, async () => {
      const f = fixture();
      if (!f.tables[table]!.length)
        f.tables[table]!.push(Object.fromEntries(columns.map((c) => [c, null])));
      const pin = await readG0(f.reader, expected);
      f.tables[table]![0]![column] = "changed";
      await assert.rejects(admitG0(f.reader, pin, expected));
    });
test("G0 covers dynamic stored columns not present in CREATE TABLE", async () => {
  const f = fixture();
  f.tables.tx_query_members!.push({
    ...Object.fromEntries(fields.tx_query_members.map((c) => [c, null])),
    binding_0: "original",
  });
  const pin = await readG0(f.reader, expected);
  f.tables.tx_query_members![0]!.binding_0 = "changed";
  await assert.rejects(admitG0(f.reader, pin, expected));
});

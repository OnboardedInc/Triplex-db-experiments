// [EXP-K01-R12] Why: replay captured seed inputs through the public writer with an offline storage spy, so real journal rows validate the count oracle. Rejected: inventing an observed count absent from the live log or merely mocking count() to the new formula.
import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { Effect, Layer, ManagedRuntime } from "effect";
import { n01SeedCounts } from "../lib/n01-counts.ts";
import { seedRung } from "../lib/seed.ts";
import { expectedN01 } from "../lib/g0-xtdb.ts";
import { fields, readG0, type Reader } from "../lib/g0.ts";
const core: any = await import("../../../packages/core/dist/index.js");
const api: any = await import("../../../packages/core/dist/runtime/index.js");
const captured = JSON.parse(
  fs.readFileSync(new URL("./fixtures/g0-count-live11.json", import.meta.url), "utf8"),
);
function spy() {
  const rows = new Map<string, any>();
  let position = 0;
  const claims: any[] = [];
  const insert = (input: any, txId: string, at: number, id: string, k: number) =>
    Effect.sync(() => {
      const v = input.value;
      const row = {
        id,
        entity_id: input.entityId,
        attribute: input.attribute,
        value_type: v.type,
        value_string: ["string", "ref", "integer", "blob"].includes(v.type) ? v.value : null,
        value_number: v.type === "number" ? v.value : null,
        value_boolean: v.type === "boolean" ? Number(v.value) : null,
        value_datetime: v.type === "datetime" ? v.value : null,
        value_json:
          v.type === "json"
            ? JSON.stringify(v.value)
            : v.type === "blob"
              ? JSON.stringify(v)
              : null,
        recorded_at: at,
        recorded_position: k,
        valid_from: input.validFrom ?? at,
        valid_to: input.validTo ?? null,
        entity_type: input.entityType ?? null,
        created_by: input.createdBy ?? null,
        schema_version: 1,
        tx_id: txId,
        retracted_at: null,
        retracted_position: null,
        retract_tx_id: null,
      };
      assert(!rows.has(id));
      rows.set(id, row);
      return row;
    });
  const storage: any = {
    supportedValueTypes: [
      "string",
      "ref",
      "integer",
      "number",
      "boolean",
      "datetime",
      "json",
      "blob",
    ],
    initialize: () => Effect.void,
    withTransaction: (effect: any) => effect,
    claimCommand: (commandId: string, txId: string, at: number) =>
      Effect.sync(() => {
        claims.push({ commandId, txId, at });
        return null;
      }),
    currentCommitPosition: () => Effect.sync(() => position),
    nextCommitPosition: () => Effect.sync(() => ++position),
    insert,
    batchInsert: (inputs: any[], txId: string, at: number, ids: string[], k: number) =>
      Effect.forEach(inputs, (input, i) => insert(input, txId, at, ids[i]!, k)),
    getById: (id: string) => Effect.sync(() => rows.get(id) ?? null),
    retract: (id: string, at: number, txId: string, k: number) =>
      Effect.sync(() => {
        const row = rows.get(id);
        if (!row || row.retracted_at !== null) return false;
        Object.assign(row, { retracted_at: at, retracted_position: k, retract_tx_id: txId });
        return true;
      }),
  };
  const definition = api.Runtime.define({
    name: "offline-count-spy",
    storage: Layer.succeed(api.StorageAdapter, storage),
    queries: Layer.succeed(api.QueryExecutor, {}),
  });
  const managed: any = ManagedRuntime.make(
    definition.layer({
      scope: api.DatabaseScope.test("count-spy"),
      capabilities: api.Capabilities.none,
      deterministic: { startTime: 1000, seed: "count-spy" },
    }),
  );
  return {
    rows,
    claims,
    managed,
    async open() {
      return managed.runPromise(Effect.service(core.Triples));
    },
  };
}
test("captured command inputs reproduce the old count refusal, corrected count pins real public journal rows", async () => {
  for (const [file, sha] of Object.entries(captured.sources))
    assert.equal(
      createHash("sha256")
        .update(fs.readFileSync(new URL("../../../" + file, import.meta.url)))
        .digest("hex"),
      sha,
    );
  const s = spy();
  try {
    const triples = await s.open();
    assert.equal(s.rows.size, 0, "bootstrap adds no assertion rows");
    const seed = await seedRung({
      comp: {
        transact: async (ops: any[], meta: any) => ({
          ok: true,
          value: await s.managed.runPromise(triples.transact(ops, meta)),
        }),
      } as any,
      subjects: captured.subjects,
      batchFacts: captured.batchFacts,
      runTag: "seed-" + captured.seed,
      budgetMs: Infinity,
      recordSubjects: new Set<number>(),
      recordAccounts: new Set<number>(),
      historySubjects: new Set<number>(),
      log: () => {},
    });
    const plan = n01SeedCounts(captured.subjects, captured.batchFacts);
    assert.equal(seed.commands, plan.commands);
    assert.equal(seed.assertions, plan.business);
    assert.equal(seed.retractions, 0);
    assert.equal(s.rows.size, plan.storedAssertions);
    assert.equal(
      [...s.rows.values()].filter((r) => r.entity_type === "_Transaction").length,
      plan.journal,
    );
    const m = {
      scope: captured.scope,
      subjects: captured.subjects,
      accounts: plan.accounts,
      seedInputs: { options: { seedBatchFacts: captured.batchFacts } },
      result: { ...seed, expectedAssertions: plan.business },
    };
    const expected = expectedN01(m);
    // [EXP-K01-R13] Why: this storage spy tests row cardinality, not XTDB catalog/identity serialization; dedicated catalog controls cover the production policy. Rejected: fabricating native catalog evidence for this model.
    delete expected.tables;
    const tables: any = Object.fromEntries(Object.keys(fields).map((t) => [t, []]));
    tables.tx_assertions = [...s.rows.values()];
    tables.tx_claims = Array.from({ length: plan.commands }, (_, i) => ({ position: i + 1 }));
    tables.tx_attempts = Array.from({ length: plan.commands }, (_, i) => ({ position: i + 1 }));
    tables.tx_meta = [{ position: plan.commands }];
    const reader: Reader = {
      endpoint: "offline-public-writer-spy",
      count: async (t) => tables[t].length,
      scopes: async () => [{ scope_key: m.scope, position: plan.commands }],
      async *scan(t) {
        for (const r of tables[t])
          yield { ...Object.fromEntries(fields[t].map((c) => [c, null])), ...r };
      },
    };
    await assert.rejects(
      () =>
        readG0(reader, {
          ...expected,
          counts: { ...expected.counts, tx_assertions: plan.business },
        }),
      /G0 count mismatch: tx_assertions/,
    );
    assert.match((await readG0(reader, expected)).D, /^[a-f0-9]{64}$/);
    for (const delta of [-1, 1]) {
      tables.tx_assertions.length = plan.storedAssertions;
      if (delta < 0) tables.tx_assertions.pop();
      else tables.tx_assertions.push(tables.tx_assertions[0]);
      await assert.rejects(() => readG0(reader, expected), /count mismatch/);
    }
    for (const key of ["commands", "assertions", "expectedAssertions", "lastPosition"] as const) {
      const bad = structuredClone(m);
      bad.result[key]++;
      assert.throws(() => expectedN01(bad), /closed form/);
    }
    const bad = structuredClone(m);
    bad.accounts++;
    assert.throws(() => expectedN01(bad), /closed form/);
  } finally {
    await s.managed.dispose();
  }
});
test("retract/assert in one transaction retains the old physical row and journals both changes", async () => {
  const s = spy();
  try {
    const triples = await s.open();
    const first = await s.managed.runPromise(
      triples.transact(
        [
          {
            op: "assert",
            entityId: "e",
            attribute: ":e/value",
            value: { type: "string", value: "before" },
          },
        ],
        { commandId: "a", actor: "bulk-seed" },
      ),
    );
    assert.equal(s.rows.size, 7);
    await s.managed.runPromise(
      triples.transact(
        [
          { op: "retract", id: first.triples[0].id },
          {
            op: "assert",
            entityId: "e",
            attribute: ":e/value",
            value: { type: "string", value: "after" },
          },
        ],
        { commandId: "b", actor: "bulk-seed" },
      ),
    );
    assert.equal(s.rows.size, 15);
    assert.notEqual(s.rows.get(first.triples[0].id).retracted_at, null);
    const metadata = [...s.rows.values()].filter(
      (r) => r.entity_type === "_Transaction" && r.recorded_position === 2,
    );
    assert.equal(metadata.length, 7);
  } finally {
    await s.managed.dispose();
  }
});
for (const [subjects, batch] of [
  [1, 400],
  [23, 400],
  [21, 7],
] as const)
  test(`input partition count agrees with actual seed writer (${subjects}, ${batch})`, async () => {
    const s = spy();
    try {
      const triples = await s.open();
      const result = await seedRung({
        comp: {
          transact: async (ops: any[], meta: any) => ({
            ok: true,
            value: await s.managed.runPromise(triples.transact(ops, meta)),
          }),
        } as any,
        subjects,
        batchFacts: batch,
        runTag: "seed",
        budgetMs: Infinity,
        recordSubjects: new Set<number>(),
        recordAccounts: new Set<number>(),
        historySubjects: new Set<number>(),
        log: () => {},
      });
      const p = n01SeedCounts(subjects, batch);
      assert.equal(result.commands, p.commands);
      assert.equal(s.rows.size, p.storedAssertions);
    } finally {
      await s.managed.dispose();
    }
  });
test("count oracle rejects missing or invalid partition inputs", () => {
  for (const [n, b] of [
    [0, 400],
    [500, 0],
    [500, NaN],
    [1.5, 400],
  ])
    assert.throws(() => n01SeedCounts(n, b));
});

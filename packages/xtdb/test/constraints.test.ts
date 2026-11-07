import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Effect, Layer, Option } from "effect";
import {
  Constraint,
  ConstraintViolationError,
  EntityId,
  Triples,
  integer,
  json,
  ref,
  string,
  type Triple,
  type TripleInput,
  type TransactOp,
} from "@triplex-build/triplex";
import {
  Capabilities,
  DatabaseScope,
  QueryExecutor,
  Runtime,
  StorageAdapter,
  type TripleRow,
} from "@triplex-build/triplex/runtime";
import { makeXtdbClient, type XtdbClient } from "../src/XtdbClient.js";
import { makeXtdbStorageAdapter } from "../src/XtdbStorageAdapter.js";
import { assertionValue } from "../src/codecs.js";
import { makeXtdbQueryExecutor } from "../src/XtdbQueryExecutor.js";

const enabled = process.env["XTDB_INTEGRATION"] === "1";
const eid = EntityId.make;
const fact = (
  entityId: string,
  attribute: string,
  value: TripleInput["value"],
  validFrom = 0,
  validTo?: number,
  entityType = "Person",
): TripleInput => ({
  entityId: eid(entityId),
  attribute,
  value,
  entityType,
  validFrom,
  ...(validTo === undefined ? {} : { validTo }),
});
const oracleTriple = (row: TripleRow): Triple => ({
  id: row.id as never,
  entityId: eid(row.entity_id),
  attribute: row.attribute as never,
  value: assertionValue(row),
  recordedAt: row.recorded_at,
  validFrom: row.valid_from,
  validTo: Option.fromNullishOr(row.valid_to),
  createdBy: Option.fromNullishOr(row.created_by),
  retractedAt: Option.fromNullishOr(row.retracted_at),
  entityType: Option.fromNullishOr(row.entity_type),
  schemaVersion: Option.fromNullishOr(row.schema_version),
  txId: Option.fromNullishOr(row.tx_id as never),
  retractTxId: Option.fromNullishOr(row.retract_tx_id as never),
});
const required: Constraint.Rule = {
  _tag: "Required",
  v: 1,
  entityType: "Person",
  attribute: ":name",
};
const cardinality: Constraint.Rule = {
  _tag: "Cardinality",
  v: 1,
  entityType: "Person",
  attribute: ":status",
  max: 1,
};
const unique: Constraint.Rule = { _tag: "Unique", v: 1, entityType: "Person", attribute: ":key" };
const reference: Constraint.Rule = {
  _tag: "ReferenceTarget",
  v: 1,
  entityType: "Person",
  attribute: ":company",
  targetEntityType: "Company",
};

describe.skipIf(!enabled)("XTDB constraint pushdown versus independent portable oracle", () => {
  let client: XtdbClient;
  beforeAll(async () => {
    client = makeXtdbClient(process.env["XTDB_URL"] ?? "postgres://xtdb:xtdb@localhost:5442/xtdb");
  });
  afterAll(async () => {
    await client?.close();
  });
  const check = async (
    initial: readonly TripleInput[],
    rules: readonly Constraint.Rule[],
    operations: readonly TransactOp[],
  ) => {
    const adapter = makeXtdbStorageAdapter(client, `constraints:${randomUUID()}`, {
      constraintStrategy: "projection",
    });
    await Effect.runPromise(adapter.initialize());
    const rows = initial.length
      ? await Effect.runPromise(
          adapter.withTransaction(
            Effect.gen(function* () {
              const position = yield* adapter.nextCommitPosition();
              return yield* adapter.batchInsert(
                initial,
                "fixture",
                100,
                initial.map((_, index) => `initial-${index}`),
                position,
              );
            }),
          ),
        )
      : [];
    const all = rows.map(oracleTriple);
    const current = await Effect.runPromise(
      Constraint.loadRelevantFacts(rules, operations, {
        byEntityType: (entityType) =>
          Effect.succeed(
            all.filter((triple) => Option.getOrUndefined(triple.entityType) === entityType),
          ),
        byEntities: (entityIds) =>
          Effect.succeed(all.filter((triple) => entityIds.includes(triple.entityId))),
      }),
    );
    const expected = await Effect.runPromise(
      Constraint.newlyViolated(current, operations, rules, 200),
    );
    const actual = await Effect.runPromise(
      adapter.withTransaction(
        adapter.validateConstraints!({ operations, constraints: rules, instant: 200 }),
      ),
    );
    expect(actual).toEqual(expected);
    return actual!;
  };

  it("handles half-open adjacency, future overlap and required fields at every boundary", async () => {
    const initial = [
      fact("a", ":status", string("first"), 0, 10),
      fact("a", ":status", string("second"), 10, 20),
    ];
    expect(await check(initial, [required, cardinality], [])).toEqual([]);
    expect(
      await check(
        initial,
        [required, cardinality],
        [{ op: "assert", ...fact("a", ":status", string("overlap"), 9, 11) }],
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "cardinality", validAt: 9, actual: 2 }),
        expect.objectContaining({ code: "cardinality", validAt: 10, actual: 2 }),
      ]),
    );
  });

  it("checks the complete atomic post-state of an owner swap", async () => {
    expect(
      await check(
        [fact("a", ":key", string("left")), fact("b", ":key", string("right"))],
        [unique],
        [
          { op: "retract", id: "initial-0" as never },
          { op: "retract", id: "initial-1" as never },
          { op: "assert", ...fact("a", ":key", string("right")) },
          { op: "assert", ...fact("b", ":key", string("left")) },
        ],
      ),
    ).toEqual([]);
  });

  it("permits repairing legacy violations and rejects newly worsened claims", async () => {
    const initial = [fact("a", ":key", string("same")), fact("b", ":key", string("same"))];
    expect(await check(initial, [unique], [{ op: "retract", id: "initial-0" as never }])).toEqual(
      [],
    );
    expect(
      await check(initial, [unique], [{ op: "assert", ...fact("c", ":key", string("same")) }]),
    ).toHaveLength(3);
  });

  it("rechecks references after a historical target correction", async () => {
    const initial = [
      fact("person", ":company", ref(eid("company")), 0, 20),
      fact("company", ":name", string("Target"), 0, 10, "Company"),
    ];
    expect(
      await check(
        initial,
        [reference],
        [
          { op: "retract", id: "initial-1" as never },
          { op: "assert", ...fact("company", ":name", string("Corrected"), 0, 5, "Company") },
        ],
      ),
    ).toEqual([expect.objectContaining({ code: "reference-target", validAt: 5 })]);
  });

  it("uses canonical typed JSON identity and keeps exact integers distinct from text", async () => {
    expect(
      await check(
        [fact("a", ":key", json({ a: 1, b: 2 }))],
        [unique],
        [{ op: "assert", ...fact("b", ":key", json({ b: 2, a: 1 })) }],
      ),
    ).toHaveLength(2);
    expect(
      await check(
        [fact("a", ":key", integer("9007199254740993"))],
        [unique],
        [{ op: "assert", ...fact("b", ":key", string("9007199254740993")) }],
      ),
    ).toEqual([]);
  });

  it("does not treat a differently spelled JSON retraction as removing a unique claimant", async () => {
    const operations: readonly TransactOp[] = [
      {
        op: "retract-pattern",
        pattern: { entityId: eid("a"), attribute: ":key", value: json({ b: 2, a: 1 }) },
      },
      { op: "assert", ...fact("b", ":key", json({ a: 1, b: 2 })) },
    ];
    expect(
      await check([fact("a", ":key", json({ a: 1, b: 2 }))], [unique], operations),
    ).toHaveLength(2);
    const scope = DatabaseScope.test(`json-retract-unique:${randomUUID()}`);
    const adapter = makeXtdbStorageAdapter(client, scope, { constraintStrategy: "projection" });
    const runtime = Runtime.define({
      name: "json-retract-unique",
      storage: Layer.succeed(StorageAdapter, adapter),
      queries: Layer.succeed(QueryExecutor, makeXtdbQueryExecutor(client, scope)),
    });
    await Effect.runPromise(
      Effect.gen(function* () {
        const triples = yield* Triples;
        const before = yield* triples.assert(fact("a", ":key", json({ a: 1, b: 2 })));
        const position = yield* triples.currentPosition();
        const rejected = yield* triples
          .transact(operations, {
            commandId: "json-unique-reject",
            enforce: { constraints: [unique] },
          })
          .pipe(Effect.flip);
        expect(rejected).toBeInstanceOf(ConstraintViolationError);
        expect(yield* triples.currentPosition()).toBe(position);
        expect(yield* triples.transactionByCommand("json-unique-reject")).toBeNull();
        expect((yield* triples.entity(eid("a"))).map(({ id }) => id)).toContain(before.id);
        expect(yield* triples.entity(eid("b"))).toEqual([]);
      }).pipe(
        Effect.provide(runtime.layer({ scope, capabilities: Capabilities.none })),
        Effect.scoped,
      ),
    );
  });

  it("applies sequential assert and pattern retraction before validation", async () => {
    expect(
      await check(
        [],
        [required, cardinality],
        [
          { op: "assert", ...fact("a", ":status", string("temporary")) },
          { op: "retract-pattern", pattern: { entityId: eid("a"), attribute: ":status" } },
        ],
      ),
    ).toEqual([]);
  });

  it("enforces SQL results through public atomic Triplex commands and durable receipts", async () => {
    const scope = DatabaseScope.test(`public-constraint-pushdown:${randomUUID()}`);
    const adapter = makeXtdbStorageAdapter(client, scope, { constraintStrategy: "projection" });
    const runtime = Runtime.define({
      name: "constraint-pushdown-public",
      storage: Layer.succeed(StorageAdapter, adapter),
      queries: Layer.succeed(QueryExecutor, makeXtdbQueryExecutor(client, scope)),
    });
    await Effect.runPromise(
      Effect.gen(function* () {
        const triples = yield* Triples;
        const before = yield* triples.transact([
          { op: "assert", ...fact("a", ":key", string("left")) },
          { op: "assert", ...fact("b", ":key", string("right")) },
        ]);
        const failed = yield* triples
          .transact([{ op: "assert", ...fact("c", ":key", string("left")) }], {
            commandId: "rejected-unique-command",
            enforce: { constraints: [unique] },
          })
          .pipe(Effect.flip);
        expect(failed).toBeInstanceOf(ConstraintViolationError);
        expect(yield* triples.currentPosition()).toBe(before.position);
        expect(yield* triples.transactionByCommand("rejected-unique-command")).toBeNull();
        const swapped = yield* triples.transact(
          [
            ...before.triples.map(({ id }) => ({ op: "retract" as const, id })),
            { op: "assert", ...fact("a", ":key", string("right")) },
            { op: "assert", ...fact("b", ":key", string("left")) },
          ],
          { commandId: "accepted-owner-swap", enforce: { constraints: [unique] } },
        );
        expect(swapped.position).toBe(before.position + 1);
        expect((yield* triples.transactionByCommand("accepted-owner-swap"))?.changes).toHaveLength(
          4,
        );
      }).pipe(
        Effect.provide(runtime.layer({ scope, capabilities: Capabilities.none })),
        Effect.scoped,
      ),
    );
  });
});

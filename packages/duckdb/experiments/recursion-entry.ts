import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Effect } from "effect";
import { EntityId, Triples, ref, integer } from "@triplex-build/triplex";
import { Capabilities, DatabaseScope } from "@triplex-build/triplex/runtime";
import { makeDuckDBRuntime } from "@triplex-build/triplex-duckdb";
const artifacts = process.env["TRIPLEX_RUN_ARTIFACTS"],
  directory = process.env["TRIPLEX_RUN_DIRECTORY"];
assert.ok(artifacts && directory, "Use an owned CLI job");
mkdirSync(path.join(directory, "scratch"), { recursive: true });
const database = path.join(directory, "scratch", "recursion.duckdb"),
  scope = DatabaseScope.test("duckdb-recursion-focused");
const edges = [
  ["a", "a"],
  ["a", "a"],
  ["a", "b"],
  ["b", "b"],
  ["b", "c"],
  ["c", "c"],
  ["c", "d"],
  ["d", "b"],
  ["a", "c"],
];
const expectedPairs = [
  ["a", "a"],
  ["a", "b"],
  ["a", "c"],
  ["a", "d"],
  ["b", "b"],
  ["b", "c"],
  ["b", "d"],
  ["c", "b"],
  ["c", "c"],
  ["c", "d"],
  ["d", "b"],
  ["d", "c"],
  ["d", "d"],
].map(([from, to]) => ({ "?from": from, "?to": to }));
const rules = (attribute: string, maxDepth = 100) =>
  [
    { name: "reach", maxDepth, body: [["?x", attribute, "?y"]] },
    {
      name: "reach",
      maxDepth,
      body: [
        ["?x", attribute, "?z"],
        ["reach", "?z", "?y"],
      ],
    },
  ] as const;
const relation = {
  find: ["?from", "?to"],
  rules: rules(":edge"),
  where: [["reach", "?from", "?to"]],
  orderBy: [{ variable: "?from" }, { variable: "?to" }],
} as const;
const seed = await makeDuckDBRuntime({ database });
await Effect.runPromise(
  Effect.gen(function* () {
    const triples = yield* Triples;
    yield* triples.assertBatch([
      ...edges.map(([from, to]) => ({
        entityId: EntityId.make(from!),
        attribute: ":edge",
        value: ref(EntityId.make(to!)),
        validFrom: 0,
      })),
      ...[
        ["x", "y"],
        ["y", "z"],
        ["z", "w"],
      ].map(([from, to]) => ({
        entityId: EntityId.make(from!),
        attribute: ":chain",
        value: ref(EntityId.make(to!)),
        validFrom: 0,
      })),
      {
        entityId: EntityId.make("amount:a"),
        attribute: ":amount",
        value: integer("9007199254740993"),
        validFrom: 0,
      },
      {
        entityId: EntityId.make("amount:b"),
        attribute: ":amount",
        value: integer("2"),
        validFrom: 0,
      },
    ]);
  }).pipe(Effect.provide(seed.layer({ scope, capabilities: Capabilities.none })), Effect.scoped),
);
const result: Record<string, unknown> = {},
  report: Record<string, unknown> = {
    format: "triplex-duckdb-focused-recursion/1",
    claims:
      "Focused correctness/boundedness and diagnostic timings only; not256-client promotion or path-witness semantics",
    arms: [],
  };
for (const mode of ["depth-set", "keyed-set"] as const) {
  const runtime = await makeDuckDBRuntime({ database, recursionMode: mode, queryTimeoutMs: 5000 }),
    start = performance.now();
  const observed = await Effect.runPromise(
    Effect.gen(function* () {
      const triples = yield* Triples;
      const pairs = yield* triples.queryAll(relation, { basis: { validAt: 1 }, debug: true });
      assert.deepEqual(pairs.results, expectedPairs);
      const count = yield* triples.queryAll(
        {
          find: ["?count"],
          rules: rules(":edge"),
          where: [["reach", "?from", "?to"]],
          aggregate: [["count", "?to", "?count"]],
        },
        { basis: { validAt: 1 } },
      );
      assert.deepEqual(count.results, [{ "?count": 4 }]);
      const repeated = yield* triples.queryAll(
        {
          find: ["?same"],
          rules: rules(":edge"),
          where: [["reach", "?same", "?same"]],
          orderBy: [{ variable: "?same" }],
        },
        { basis: { validAt: 1 } },
      );
      assert.deepEqual(repeated.results, [
        { "?same": "a" },
        { "?same": "b" },
        { "?same": "c" },
        { "?same": "d" },
      ]);
      const depth1 = yield* triples.queryAll(
        {
          find: ["?to"],
          rules: rules(":chain", 1),
          where: [["reach", "x", "?to"]],
          orderBy: [{ variable: "?to" }],
        },
        { basis: { validAt: 1 } },
      );
      assert.deepEqual(depth1.results, [{ "?to": "y" }, { "?to": "z" }]);
      const depth2 = yield* triples.queryAll(
        {
          find: ["?to"],
          rules: rules(":chain", 2),
          where: [["reach", "x", "?to"]],
          orderBy: [{ variable: "?to" }],
        },
        { basis: { validAt: 1 } },
      );
      assert.deepEqual(depth2.results, [{ "?to": "w" }, { "?to": "y" }, { "?to": "z" }]);
      const sum = yield* triples.queryAll(
        { find: ["?sum"], where: [["?e", ":amount", "?i"]], aggregate: [["sum", "?i", "?sum"]] },
        { basis: { validAt: 1 }, debug: true },
      );
      assert.deepEqual(sum.results, [{ "?sum": integer("9007199254740995") }]);
      (report.arms as unknown[]).push({ mode, queryTrace: pairs.debug, sumTrace: sum.debug });
      return {
        pairs: pairs.results,
        count: count.results,
        repeated: repeated.results,
        depth1: depth1.results,
        depth2: depth2.results,
        sum: sum.results,
        pairCount: pairs.results.length,
      };
    }).pipe(
      Effect.provide(runtime.layer({ scope, capabilities: Capabilities.none })),
      Effect.scoped,
    ),
  );
  result[mode] = observed;
  (report.arms as Array<Record<string, unknown>>).at(-1)!["elapsedMsDiagnostic"] =
    performance.now() - start;
}
const legacy = await makeDuckDBRuntime({ database, recursionMode: "legacy", queryTimeoutMs: 50 }),
  deadlineStart = performance.now();
await Effect.runPromise(
  Effect.gen(function* () {
    const triples = yield* Triples;
    const failure = yield* triples.queryAll(relation, { basis: { validAt: 1 } }).pipe(Effect.flip);
    assert.equal(failure._tag, "ReadError");
    assert.match(failure.message, /deadline/);
    assert.ok((yield* triples.entity(EntityId.make("a"), { validAt: 1 })).length >= 3);
  }).pipe(Effect.provide(legacy.layer({ scope, capabilities: Capabilities.none })), Effect.scoped),
);
assert.ok(
  performance.now() - deadlineStart < 5000,
  "Native interruption and owned rollback must drain promptly in this focused guard fixture",
);
result["legacyDeadline"] = "READ_ERROR_NATIVE_READ_DRAINED_AND_SAME_SCOPE_REUSED";
writeFileSync(path.join(artifacts, "report.json"), JSON.stringify(report, null, 2) + "\n");
writeFileSync(path.join(artifacts, "result.json"), JSON.stringify(result) + "\n");

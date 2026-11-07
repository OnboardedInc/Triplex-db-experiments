/** Fresh public SDK gate over the existing C++ owner. Starts no service. */
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Cause, Effect, Exit, Option } from "effect";
import { EntityId, Triples, integer, number } from "@triplex-build/triplex";
import { Capabilities, DatabaseScope } from "@triplex-build/triplex/runtime";
import { triplesConformanceCases } from "@triplex-build/triplex-testkit";
import { makeDuckDBRuntime } from "@triplex-build/triplex-duckdb";

// Inspiration: the archived adapter/conformance.ts proves which public suite
// was intended, not today's result. Current public exports and fresh C++ builds
// are used here; independent assertions determine each observed outcome.
const artifacts = process.env["TRIPLEX_RUN_ARTIFACTS"];
const directory = process.env["TRIPLEX_RUN_DIRECTORY"];
assert.ok(artifacts && directory, "Execute through the owned development loop");
const scratch = path.join(directory, "scratch");
mkdirSync(scratch, { recursive: true });
const report: {
  format: string;
  checks: Array<{ name: string; status: string; error?: string }>;
  observations: Record<string, unknown>;
} = {
  format: "triplex-duckdb-public-sdk-entry/1",
  checks: [],
  observations: {},
};
const save = () =>
  writeFileSync(path.join(artifacts, "report.json"), JSON.stringify(report, null, 2) + "\n");
const check = async (name: string, work: () => Promise<unknown>) => {
  try {
    const value = await work();
    report.checks.push({ name, status: "PASS" });
    if (value !== undefined) report.observations[name] = value;
  } catch (cause) {
    report.checks.push({
      name,
      status: "FAIL",
      error: cause instanceof Error ? cause.stack : String(cause),
    });
  }
  save();
};

const conformanceRuntime = await makeDuckDBRuntime({ memoryLimit: "128MB", threads: 1 });
await check("conformance-runtime-acquisition-and-close", () =>
  Effect.runPromise(
    Effect.forEach(
      triplesConformanceCases,
      (entry) =>
        Effect.gen(function* () {
          const result = yield* Effect.exit(entry.run);
          yield* Effect.sync(() => {
            report.checks.push(
              Exit.isSuccess(result)
                ? { name: `conformance:${entry.name}`, status: "PASS" }
                : {
                    name: `conformance:${entry.name}`,
                    status: "FAIL",
                    error: Cause.pretty(result.cause),
                  },
            );
            save();
          });
        }),
      { discard: true },
    ).pipe(
      Effect.provide(
        conformanceRuntime.layer({
          scope: DatabaseScope.test("duckdb-current-conformance"),
          capabilities: Capabilities.none,
        }),
      ),
      Effect.scoped,
    ),
  ),
);

const database = path.join(scratch, "sdk.duckdb");
const scope = DatabaseScope.test("duckdb-current-int64-fractional-reopen");
const values = [
  "-9223372036854775808",
  "9007199254740992",
  "9007199254740993",
  "9223372036854775807",
];
let originalPosition = 0;
let originalRecordedAt = 0;
let originalId: string | undefined;
const runtime = await makeDuckDBRuntime({ database, memoryLimit: "128MB", threads: 1 });
const run = async <A>(work: Effect.Effect<A, unknown, Triples>) =>
  Effect.runPromise(
    work.pipe(
      Effect.provide(runtime.layer({ scope, capabilities: Capabilities.none })),
      Effect.scoped,
    ),
  );
await check("int64-fractional-write-query-page", () =>
  run(
    Effect.gen(function* () {
      const triples = yield* Triples;
      const written = yield* triples.assertBatch(
        values.map((value, index) => ({
          entityId: EntityId.make(`integer:${index}`),
          attribute: ":exact",
          value: integer(value),
          validFrom: 1.25,
          validTo: 2.75,
        })),
      );
      yield* triples.assert({
        entityId: EntityId.make("fractional-number"),
        attribute: ":binary64",
        value: number(1.125),
        validFrom: 1.25,
        validTo: 2.75,
      });
      originalId = written[2]!.id;
      originalRecordedAt = written[2]!.recordedAt;
      originalPosition = yield* triples.currentPosition();
      const query = {
        find: ["?i"],
        where: [["?e", ":exact", "?i"]],
        orderBy: [{ variable: "?i" }],
      } as const;
      const rows = yield* triples.queryAll(query, { basis: { validAt: 1.5 } });
      assert.deepEqual(
        rows.results,
        values.map((value) => ({ "?i": integer(value) })),
      );
      const pages: unknown[] = [];
      let cursor: string | undefined;
      do {
        const page = yield* triples.query(query, {
          basis: { validAt: 1.5 },
          pageSize: 2,
          ...(cursor === undefined ? {} : { cursor }),
        });
        pages.push(...page.results);
        cursor = page.nextCursor;
      } while (cursor);
      assert.deepEqual(pages, rows.results);
      const exact = yield* triples.queryAll(
        { find: ["?e"], where: [["?e", ":exact", integer("9007199254740993")]] },
        { basis: { validAt: 1.5 } },
      );
      assert.deepEqual(exact.results, [{ "?e": "integer:2" }]);
      const optional = yield* triples.queryAll(
        {
          find: ["?e", "?optional"],
          where: [["?e", ":exact", "?bound"]],
          optionalProjection: {
            rowBinding: "?e",
            fields: [{ attribute: ":exact", variable: "?optional" }],
          },
          orderBy: [{ variable: "?e" }],
        },
        { basis: { validAt: 1.5 } },
      );
      assert.deepEqual(
        optional.results,
        values.map((value, index) => ({ "?e": `integer:${index}`, "?optional": integer(value) })),
      );
      const counts: number[] = [];
      for (const validAt of [1.249999, 1.25, 2.749999, 2.75])
        counts.push((yield* triples.queryAll(query, { basis: { validAt } })).results.length);
      assert.deepEqual(counts, [0, 4, 4, 0]);
      const binary64 = yield* triples.queryAll(
        { find: ["?n"], where: [["fractional-number", ":binary64", "?n"]] },
        { basis: { validAt: 1.5 } },
      );
      assert.deepEqual(binary64.results, [{ "?n": 1.125 }]);
      return {
        rows: rows.results,
        pages,
        exact: exact.results,
        optional: optional.results,
        fractionalCounts: counts,
        binary64: binary64.results,
      };
    }),
  ),
);

await check("reopen-history-and-correction", () =>
  run(
    Effect.gen(function* () {
      const triples = yield* Triples;
      assert.ok((yield* triples.currentPosition()) >= originalPosition);
      const before = yield* triples.entity(EntityId.make("integer:2"), {
        recordedAt: originalRecordedAt,
        validAt: 1.5,
      });
      assert.deepEqual(
        before.map((row) => row.value),
        [integer("9007199254740993")],
      );
      assert.equal(before[0]!.validFrom, 1.25);
      assert.equal(Option.getOrNull(before[0]!.validTo), 2.75);
      assert.ok(originalId);
      assert.equal(before[0]!.id, originalId);
      yield* triples.retract(before[0]!.id);
      yield* triples.assert({
        entityId: EntityId.make("integer:2"),
        attribute: ":exact",
        value: integer("9007199254740994"),
        validFrom: 1.25,
        validTo: 2.75,
      });
      const old = yield* triples.entity(EntityId.make("integer:2"), {
        recordedAt: originalRecordedAt,
        validAt: 1.5,
      });
      const current = yield* triples.entity(EntityId.make("integer:2"), { validAt: 1.5 });
      const history = yield* triples.history(EntityId.make("integer:2"));
      assert.deepEqual(
        old.map((row) => row.value),
        [integer("9007199254740993")],
      );
      assert.deepEqual(
        current.map((row) => row.value),
        [integer("9007199254740994")],
      );
      assert.equal(history.length, 2);
      return {
        old: old.map((row) => row.value),
        current: current.map((row) => row.value),
        historyCount: history.length,
      };
    }),
  ),
);

await check("second-reopen-exact-value", () =>
  run(
    Effect.gen(function* () {
      const triples = yield* Triples;
      const current = yield* triples.entity(EntityId.make("integer:2"), { validAt: 1.5 });
      assert.deepEqual(
        current.map((row) => row.value),
        [integer("9007199254740994")],
      );
      return current.map((row) => row.value);
    }),
  ),
);

const results = {
  conformance: {
    expected: triplesConformanceCases.length,
    passed: report.checks.filter(
      (check) => check.name.startsWith("conformance:") && check.status === "PASS",
    ).length,
  },
  checks: report.checks
    .filter((check) => !check.name.startsWith("conformance:"))
    .map(({ name, status }) => ({ name, status })),
  observations: report.observations,
};
writeFileSync(path.join(artifacts, "result.json"), JSON.stringify(results) + "\n", { flag: "wx" });
console.log(
  JSON.stringify({
    checks: report.checks.length,
    passed: report.checks.filter((check) => check.status === "PASS").length,
    failed: report.checks.filter((check) => check.status === "FAIL").length,
  }),
);
if (report.checks.some((check) => check.status !== "PASS")) process.exitCode = 1;

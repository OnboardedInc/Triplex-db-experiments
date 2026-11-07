import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Effect } from "effect";
import { EntityId, Triples, string } from "@triplex-build/triplex";
import { Capabilities, DatabaseScope } from "@triplex-build/triplex/runtime";
import {
  makeDuckDBRuntime,
  makeDuckDBClient,
  makeDuckDBTemporalQueries,
} from "@triplex-build/triplex-duckdb";

// Fresh overlapping intervals exercise the engine-boundary/point bridge and
// shared C++ lease while the public runtime is live, then after all handles close.
// Inspiration/rationale: packages/qlever/src/TemporalQueries.ts; wiki/research.md.
const artifacts = process.env["TRIPLEX_RUN_ARTIFACTS"],
  directory = process.env["TRIPLEX_RUN_DIRECTORY"];
assert.ok(artifacts && directory, "Use an owned CLI execution");
const databaseDirectory = path.join(directory, "scratch", "scope-databases");
mkdirSync(databaseDirectory, { recursive: true });
const scope = DatabaseScope.test("duckdb-interval-owned-entry"),
  runtime = await makeDuckDBRuntime({ databaseDirectory });
const query = { find: ["?machine"], where: [["?e", ":machine", "?machine"]] } as const;
const expected = [
  { bindings: { "?machine": "m1" }, validFrom: 0.25, validTo: 4.75 },
  { bindings: { "?machine": "m1" }, validFrom: 6.5, validTo: 8.5 },
];
const client = makeDuckDBClient(databaseDirectory),
  temporal = makeDuckDBTemporalQueries(client, scope);
let cut = 0;
let observations: Record<string, unknown> = {};
try {
  observations = await Effect.runPromise(
    Effect.gen(function* () {
      const triples = yield* Triples;
      const facts = yield* triples.assertBatch(
        [
          [0.25, 2.25],
          [1.25, 4.75],
          [6.5, 8.5],
        ].map(([from, to], index) => ({
          entityId: EntityId.make(`span:${index}`),
          attribute: ":machine",
          value: string("m1"),
          validFrom: from!,
          validTo: to!,
        })),
      );
      cut = yield* triples.currentPosition();
      const initial = yield* temporal.queryIntervals(query, { from: 0, to: 10 });
      assert.deepEqual(initial, expected);
      for (const budget of [{ maxSpans: 1 }, { maxRows: 1 }, { maxSpanAnswerRows: 1 }]) {
        const rejected = yield* temporal
          .queryIntervals(query, { from: 0, to: 10, ...budget })
          .pipe(Effect.flip);
        assert.equal(rejected._tag, "ReadError");
      }
      yield* triples.retract(facts[2]!.id);
      const old = yield* temporal.queryIntervals(query, { from: 0, to: 10, recordedPosition: cut });
      assert.deepEqual(old, expected);
      const current = yield* temporal.queryIntervals(query, { from: 0, to: 10 });
      assert.deepEqual(current, expected.slice(0, 1));
      return { initial, old, current, budgetRejections: 3 };
    }).pipe(
      Effect.provide(runtime.layer({ scope, capabilities: Capabilities.none })),
      Effect.scoped,
    ),
  );
} finally {
  await client.close();
}
const reopened = makeDuckDBClient(databaseDirectory);
try {
  const answer = await Effect.runPromise(
    makeDuckDBTemporalQueries(reopened, scope).queryIntervals(query, {
      from: 0,
      to: 10,
      recordedPosition: cut,
    }),
  );
  assert.deepEqual(answer, expected);
  observations["reopenedOldCut"] = answer;
} finally {
  await reopened.close();
}
writeFileSync(path.join(artifacts, "result.json"), JSON.stringify(observations) + "\n", {
  flag: "wx",
});
console.log(
  JSON.stringify({
    gate: "native-boundaries-and-point-execution",
    status: "PASS",
    scope: "Small interval/cut/lifecycle correctness only",
  }),
);

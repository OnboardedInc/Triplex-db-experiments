import { qleverLatencyReceipt } from "../../../lab/receipts/latency.mjs";
import { qleverConnectionModeOf } from "../src/QleverClient.js";
/** Public compiled-export regression for the explicit bounded answer profile. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Effect } from "effect";
import { EntityId, Triples, number, ref } from "@triplex-build/triplex";
import { Capabilities, DatabaseScope } from "@triplex-build/triplex/runtime";
import { makeQleverRuntime } from "@triplex-build/triplex-qlever";
import { labQleverAccessToken, labQleverUrl } from "./lab-endpoint.ts";

const root = path.resolve(import.meta.dirname, "../../..");
const runId = randomUUID();
const scope = DatabaseScope.test(`aggregate-entry-${runId}`);
const output = path.join(root, "qualification/evidence", `qlever-aggregate-entry-${runId}.json`);
const accessToken = labQleverAccessToken();
const report: Record<string, any> = qleverLatencyReceipt({
  qleverConnectionMode: qleverConnectionModeOf(),
  format: "triplex-bounded-aggregate-entry/1",
  runId,
  scope,
  profile: "bounded-complete-final-groups",
  status: "RUNNING",
  checks: [],
  limitations: [
    "Small correctness gate; no performance improvement or high-cardinality group claim.",
    "All native groups are consumed before inner LIMIT; source joins/aggregation/HAVING remain in QLever.",
  ],
});
writeFileSync(output, JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
const save = () => writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
const run = <A>(
  program: Effect.Effect<A, unknown, Triples>,
  plan: "native" | "bounded" = "bounded",
  cap = 1000,
) =>
  Effect.runPromise(
    program.pipe(
      Effect.provide(
        makeQleverRuntime({
          url: labQleverUrl(),
          accessToken,
          queryLimits: { aggregateAnswerPlan: plan, maxAggregateAnswerRows: cap },
        }).layer({ scope, capabilities: Capabilities.none }),
      ),
      Effect.scoped,
    ),
  );
const query = {
  find: ["?team", "?average"],
  where: [
    ["?entity", ":aggregate/team", "?team"],
    ["?entity", ":aggregate/amount", "?amount"],
  ],
  aggregate: [["avg", "?amount", "?average"]],
  orderBy: [{ variable: "?average", direction: "asc" }],
} as const;
const check = async (name: string, program: () => Promise<unknown>) => {
  try {
    const observation = await program();
    report.checks.push({ name, status: "PASS", observation });
  } catch (cause) {
    report.checks.push({ name, status: "FAIL", error: String(cause) });
    save();
    throw cause;
  }
  save();
};
try {
  await check("native-grouping-and-full-precision-decoded-averages", () =>
    run(
      Effect.gen(function* () {
        const triples = yield* Triples;
        yield* triples.assertBatch(
          [0, 1, 2].flatMap((group) =>
            [0, 0, group].flatMap((amount, index) => [
              {
                entityId: EntityId.make(`team:${group}:${index}`),
                attribute: ":aggregate/team",
                value: ref(EntityId.make(`team:${group}`)),
                validFrom: 0,
              },
              {
                entityId: EntityId.make(`team:${group}:${index}`),
                attribute: ":aggregate/amount",
                value: number(amount),
                validFrom: 0,
              },
            ]),
          ),
        );
        const answer = yield* triples.queryAll(query, { basis: { validAt: 1 } });
        assert.deepEqual(
          answer.results.map((row) => row["?average"]),
          [0, 1 / 3, 2 / 3],
        );
        return answer.results;
      }),
    ),
  );
  await check("new-connection-keyset-pages-retain-source-cut-after-writer", async () => {
    const first = await run(
      Effect.gen(function* () {
        const triples = yield* Triples;
        return yield* triples.query(query, { pageSize: 1, basis: { validAt: 1 } });
      }),
    );
    assert.ok(first.nextCursor);
    await run(
      Effect.gen(function* () {
        const triples = yield* Triples;
        yield* triples.assertBatch([
          {
            entityId: EntityId.make("later"),
            attribute: ":aggregate/team",
            value: ref(EntityId.make("team:later")),
            validFrom: 0,
          },
          {
            entityId: EntityId.make("later"),
            attribute: ":aggregate/amount",
            value: number(99),
            validFrom: 0,
          },
        ]);
      }),
    );
    const answers = [...first.results];
    let cursor: string | undefined = first.nextCursor;
    while (cursor) {
      const current = cursor;
      const page = await run(
        Effect.gen(function* () {
          const triples = yield* Triples;
          return yield* triples.query(query, { pageSize: 1, cursor: current });
        }),
      );
      answers.push(...page.results);
      cursor = page.nextCursor;
    }
    assert.deepEqual(
      answers.map((row) => row["?average"]),
      [0, 1 / 3, 2 / 3],
    );
    return answers;
  });
  await check("inner-order-limit-precedes-wrapper-filter-and-count", () =>
    run(
      Effect.gen(function* () {
        const triples = yield* Triples;
        const answer = yield* triples.queryPage({
          inner: { ...query, orderBy: [{ variable: "?average", direction: "desc" }], limit: 2 },
          filters: [{ column: "?team", op: "!=", value: "team:later" }],
          includeCount: true,
          limit: 1,
        });
        assert.equal(answer.totalCount, 1);
        assert.equal(answer.results[0]?.["?average"], 2 / 3);
        return { results: answer.results, totalCount: answer.totalCount };
      }),
    ),
  );
  await check("whole-group-population-cap-rejects-before-small-inner-limit", () =>
    run(
      Effect.gen(function* () {
        const triples = yield* Triples;
        const failure = yield* triples.queryAll({ ...query, limit: 1 }).pipe(Effect.flip);
        assert.match(String(failure), /complete groups required before LIMIT/);
        return { errorTag: failure._tag, message: String(failure) };
      }),
      "bounded",
      2,
    ),
  );
  await check("typed-invalid-aggregate-comparison-remains-rejected", () =>
    run(
      Effect.gen(function* () {
        const triples = yield* Triples;
        const failure = yield* triples
          .queryAll({ ...query, having: [[">", "?average", "text"]] })
          .pipe(Effect.flip);
        assert.equal(failure._tag, "DatalogValidationError");
        return { errorTag: failure._tag };
      }),
    ),
  );
  await check("bounded-group-LIKE-ILIKE-preserve-newline-wildcards", () =>
    run(
      Effect.gen(function* () {
        const triples = yield* Triples;
        yield* triples.assertBatch([
          {
            entityId: EntityId.make("newline"),
            attribute: ":aggregate/team",
            value: ref(EntityId.make("I\nteam")),
            validFrom: 0,
          },
          {
            entityId: EntityId.make("newline"),
            attribute: ":aggregate/amount",
            value: number(3),
            validFrom: 0,
          },
        ]);
        for (const [op, value] of [
          ["like", "I%team"],
          ["like", "I_team"],
          ["ilike", "i%TEAM"],
        ] as const) {
          const answer = yield* triples.queryPage({
            inner: query,
            filters: [{ column: "?team", op, value }],
            limit: 1,
          });
          assert.equal(answer.results[0]?.["?average"], 3);
          assert.equal(answer.results.length, 1);
        }
      }),
    ),
  );
  await check("native-plan-keeps-explicit-unqualified-order-error", () =>
    run(
      Effect.gen(function* () {
        const triples = yield* Triples;
        const failure = yield* triples.query(query).pipe(Effect.flip);
        assert.equal(failure._tag, "DatalogValidationError");
        return { errorTag: failure._tag };
      }),
      "native",
    ),
  );
  report.status = "PASS_FOCUSED_ONLY";
} catch (cause) {
  report.status = "FAIL_RETAINED";
  report.error = String(cause);
  process.exitCode = 1;
} finally {
  save();
  console.log(JSON.stringify({ output, status: report.status, checks: report.checks.length }));
}

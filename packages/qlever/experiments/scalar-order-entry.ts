/** Actual typed/public liveness gate. Only complete final query answers reach
 * the coordinator; all joins/anti-joins and equality remain inside QLever.
 * D is a small tractable control, not a repeat of the known family12 OOM.
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Effect } from "effect";
import { EntityId, Triples, integer, number, ref, string } from "@triplex-build/triplex";
import { Capabilities, DatabaseScope, type QueryContext } from "@triplex-build/triplex/runtime";
import type { DatalogQuery } from "@triplex-build/triplex/datalog";
import { makeQleverRuntime } from "@triplex-build/triplex-qlever";
import { labQleverAccessToken, labQleverUrl } from "./lab-endpoint.ts";

const root = path.resolve(import.meta.dirname, "../../..");
const output = process.argv[process.argv.indexOf("--output") + 1];
assert(output && path.resolve(output).startsWith(root + path.sep));
const runId = randomUUID(),
  scope = DatabaseScope.test(`scalar-order-liveness-${runId}`),
  url = labQleverUrl(),
  accessToken = labQleverAccessToken();
const report: Record<string, any> = {
  format: "triplex-scalar-order-liveness-entry/1",
  scope,
  status: "RUNNING",
  checks: [],
  transportQueries: [],
  limits: [
    "Only final bounded results are compared in host; all ordinary fact joins and anti-joins stay native.",
    "Small D controls are independently checked against declared answers, not treated as a normative replacement for those answers.",
    "Canonical-channel and retirement-pair admissions, including retained history, are charged for both profiles.",
    "No scale, throughput, write-crash or general SPARQL claim.",
  ],
};
const save = () => writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
save();
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const target = new URL(input instanceof Request ? input.url : String(input));
  const observed =
    target.origin === url && typeof init?.body === "string"
      ? { sparql: init.body, at: new Date().toISOString(), status: 0, elapsedMs: 0 }
      : undefined;
  const started = Date.now();
  if (observed) {
    report.transportQueries.push(observed);
    save();
  }
  try {
    const response = await originalFetch(input, init);
    if (observed) {
      observed.status = response.status;
      observed.elapsedMs = Date.now() - started;
      save();
    }
    return response;
  } catch (error) {
    if (observed) {
      observed.elapsedMs = Date.now() - started;
      save();
    }
    throw error;
  }
};
const run = <A>(program: Effect.Effect<A, unknown, Triples>, live = false, time = 1001) =>
  Effect.runPromise(
    program.pipe(
      Effect.provide(
        makeQleverRuntime({
          url,
          accessToken,
          queryLimits: {
            sourcePlan: "persisted",
            negationPlan: "minus",
            retirementPlan: "paired",
            aggregateAnswerPlan: "bounded",
            ...(live ? { scalarOrderPlan: "live" as const } : {}),
          },
        }).layer({
          scope,
          capabilities: Capabilities.none,
          deterministic: { startTime: time, seed: `${runId}/${time}` },
        }),
      ),
      Effect.scoped,
    ),
  );
const id = (value: string) => EntityId.make(value);
const candidateIds = [
  "int-zero",
  "num-negative-zero",
  "num-zero",
  "ref-safe",
  "spare",
  "text-integer-zero",
  "text-safe",
];
const rowsOf = (results: readonly QueryContext[]) => results.map((row) => Object.values(row));
const canonical = (rows: readonly unknown[][]) => rows.map((row) => JSON.stringify(row)).sort();
const compare = async (
  name: string,
  query: DatalogQuery,
  expected: unknown[][],
  recordedAt = 1500,
  ordered = false,
) => {
  const answers = [];
  for (const live of [false, true]) {
    const answer = await run(
      Effect.gen(function* () {
        const triples = yield* Triples;
        return yield* triples.queryAll(query, {
          basis: { validAt: 1, recordedAt },
          includeBasis: true,
          debug: true,
        });
      }),
      live,
    );
    const rows = rowsOf(answer.results);
    assert.deepEqual(
      ordered ? rows : canonical(rows),
      ordered ? expected : canonical(expected),
      `${name}/${live ? "E" : "D"}`,
    );
    answers.push({
      profile: live ? "E-live-order" : "D-paired",
      rows,
      basis: answer.basis,
      debug: answer.debug,
    });
  }
  report.checks.push({ name, status: "PASS", expected, ordered, answers });
  save();
};
try {
  report.seedReceipt = await run(
    Effect.gen(function* () {
      const triples = yield* Triples;
      const keyRows = [
        ["text-safe", string("safe")],
        ["ref-safe", ref(id("safe"))],
        ["int-zero", integer(0n)],
        ["num-zero", number(0)],
        ["num-negative-zero", number(-0)],
        ["text-integer-zero", string("0")],
        ["spare", string("spare")],
      ] as const;
      return yield* triples.assertBatch([
        ...keyRows.map(([entity, value]) => ({
          entityId: id(entity),
          attribute: ":live/key",
          value,
          validFrom: 0,
        })),
        { entityId: id("ban-string"), attribute: ":live/ban", value: string("safe"), validFrom: 0 },
        { entityId: id("ban-number"), attribute: ":live/ban", value: number(0), validFrom: 0 },
        {
          entityId: id("self-one"),
          attribute: ":live/self",
          value: string("self-one"),
          validFrom: 0,
        },
        {
          entityId: id("self-bad"),
          attribute: ":live/self",
          value: string("different"),
          validFrom: 0,
        },
        { entityId: id("ratio-low"), attribute: ":live/ratio", value: number(0), validFrom: 0 },
        {
          entityId: id("ratio-high"),
          attribute: ":live/ratio",
          value: number(1.0000000000000002),
          validFrom: 0,
        },
      ]);
    }),
  );
  save();
  const key = ["?entity", ":live/key", "?value"] as const;
  await compare(
    "shared-negative-preserves-ref-string-and-number-integer-identity",
    {
      find: ["?entity"],
      where: [key, ["not", ["?ban", ":live/ban", "?value"]]],
    },
    [["int-zero"], ["spare"], ["text-integer-zero"]],
  );
  await compare(
    "canonical-number-zero-equality-includes-both-signs",
    {
      find: ["?entity"],
      where: [key, ["=", "?value", -0]],
    },
    [["num-negative-zero"], ["num-zero"]],
  );
  await compare(
    "integer-zero-equality-excludes-number-and-text",
    {
      find: ["?entity"],
      where: [key, ["=", "?value", integer(0n)]],
    },
    [["int-zero"]],
  );
  await compare(
    "string-zero-equality-excludes-numeric-families",
    {
      find: ["?entity"],
      where: [key, ["=", "?value", "0"]],
    },
    [["text-integer-zero"]],
  );
  await compare(
    "repeated-unprojected-variable-still-unifies",
    {
      find: [true],
      where: [["?same", ":live/self", "?same"]],
    },
    [[true]],
  );
  await compare(
    "range-retains-required-order",
    {
      find: ["?entity"],
      where: [
        ["?entity", ":live/ratio", "?ratio"],
        [">", "?ratio", 0],
      ],
    },
    [["ratio-high"]],
  );
  await compare(
    "projected-multicolumn-sort-retains-order",
    {
      find: ["?entity", "?ratio"],
      where: [["?entity", ":live/ratio", "?ratio"]],
      orderBy: [{ variable: "?ratio", direction: "desc" }],
    },
    [
      ["ratio-high", 1.0000000000000002],
      ["ratio-low", 0],
    ],
    1500,
    true,
  );
  const rejectedSort = [];
  for (const live of [false, true]) {
    const failure = await run(
      Effect.gen(function* () {
        const triples = yield* Triples;
        return yield* triples
          .queryAll(
            {
              find: ["?entity"],
              where: [["?entity", ":live/ratio", "?ratio"]],
              orderBy: [{ variable: "?ratio", direction: "desc" }],
            },
            { basis: { validAt: 1, recordedAt: 1500 } },
          )
          .pipe(Effect.flip);
      }),
      live,
    );
    assert.equal(failure._tag, "UnboundVariableError");
    rejectedSort.push({ profile: live ? "E-live-order" : "D-paired", errorTag: failure._tag });
  }
  report.checks.push({
    name: "unprojected-sort-remains-rejected-by-owning-grammar",
    status: "PASS",
    expectedErrorTag: "UnboundVariableError",
    answers: rejectedSort,
  });
  save();
  await compare(
    "projected-exact-binary64-values-retain-order",
    {
      find: ["?ratio"],
      where: [["?entity", ":live/ratio", "?ratio"]],
      orderBy: [{ variable: "?ratio", direction: "desc" }],
    },
    [[1.0000000000000002], [0]],
    1500,
    true,
  );
  const global = {
    find: ["?entity"],
    where: [key, ["not", ["global", ":live/block", true]]],
  } as const;
  await compare(
    "keyless-empty-negative-keeps-all-rows",
    global,
    candidateIds.map((value) => [value]),
  );
  report.globalReceipt = await run(
    Effect.gen(function* () {
      const triples = yield* Triples;
      return yield* triples.assertBatch([
        {
          entityId: id("global"),
          attribute: ":live/block",
          value: { type: "boolean", value: true },
          validFrom: 0,
        },
      ]);
    }),
    false,
    2001,
  );
  save();
  await compare("keyless-nonempty-negative-rejects-all-rows", global, [], 3000);
  await compare(
    "historical-keyless-negative-excludes-later-block",
    global,
    candidateIds.map((value) => [value]),
    1500,
  );
  report.status = "PASS_TYPED_LIVENESS_AND_CONSERVATIVE_ORDER_CONTROLS";
  save();
  writeFileSync(
    path.join(path.dirname(output), "status.json"),
    JSON.stringify(
      {
        cases: 12,
        controlAndCandidateExecutions: 24,
        allExpectedAnswers: true,
        globalHistoricalCutPreserved: true,
        unprojectedSortGrammarPreserved: true,
      },
      null,
      2,
    ) + "\n",
    { flag: "wx" },
  );
  console.log(JSON.stringify({ output, status: report.status, checks: report.checks.length }));
} catch (error) {
  report.status = "FAIL_RETAINED";
  report.error = String(error);
  save();
  throw error;
} finally {
  globalThis.fetch = originalFetch;
}

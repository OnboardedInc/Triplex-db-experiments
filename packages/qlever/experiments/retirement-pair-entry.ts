/** Actual writer-pair invariant and row-level partial-pair admission.
 * Two owned retired rows are damaged in opposite directions, keeping aggregate
 * predicate counts equal. A local per-row guard must still reject both.
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Effect } from "effect";
import { EntityId, Triples, string, type TripleId } from "@triplex-build/triplex";
import { TypeExpr } from "@triplex-build/triplex/config";
import { Capabilities, DatabaseScope } from "@triplex-build/triplex/runtime";
import {
  makeQleverClient,
  makeQleverNativeQueries,
  makeQleverRuntime,
} from "@triplex-build/triplex-qlever";
const root = path.resolve(import.meta.dirname, "../../..");
const output = process.argv[process.argv.indexOf("--output") + 1];
assert(output && path.resolve(output).startsWith(root + path.sep));
const runId = randomUUID(),
  scope = DatabaseScope.test(`retirement-pair-${runId}`),
  url = "http://127.0.0.1:17019";
const accessToken = readFileSync(
  path.join(root, ".runtime/engines/qlever-main/access-token"),
  "utf8",
).trim();
const client = makeQleverClient(url, { accessToken }),
  native = makeQleverNativeQueries(client, scope);
const report: Record<string, any> = {
  format: "triplex-paired-retirement-admission/1",
  scope,
  status: "RUNNING",
  checks: [],
  nativeQueries: [],
  transportQueries: [],
  limits: [
    "Only the fresh owned fixture is deliberately damaged; retained malformed rows are isolated and never reused as normal application fixtures.",
    "Admission scans all assertion-id rows and retained history in the exact scope. Its native work is charged on every paired-profile call.",
    "Two opposite partial rows retain equal global field counts; equality of totals is not accepted as a row-pair proof.",
    "No scale, throughput, write-crash or power-loss claim.",
  ],
};
const save = () => writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
save();
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const target = new URL(input instanceof Request ? input.url : String(input));
  const observed =
    target.origin === url && typeof init?.body === "string"
      ? { sparql: init.body, startedAt: new Date().toISOString(), elapsedMs: 0, status: 0 }
      : undefined;
  const started = Date.now();
  if (observed) {
    report.transportQueries.push(observed);
    save();
  }
  try {
    const response = await originalFetch(input, init);
    if (observed) {
      observed.elapsedMs = Date.now() - started;
      observed.status = response.status;
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
const run = <A>(effect: Effect.Effect<A, unknown, Triples>, time = 2000) =>
  Effect.runPromise(
    effect.pipe(
      Effect.provide(
        makeQleverRuntime({
          url,
          accessToken,
          queryLimits: {
            sourcePlan: "persisted",
            negationPlan: "minus",
            retirementPlan: "paired",
            aggregateAnswerPlan: "bounded",
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
const query = { find: ["?entity", "?value"], where: [["?entity", ":pair/key", "?value"]] } as const;
let graph = "";
const inspect = async () => {
  const result = await Effect.runPromise(
    native.select(
      {
        name: "paired-retirement/native-row-audit",
        parameters: TypeExpr.struct({}),
        row: TypeExpr.any,
      },
      {},
      (ctx) => {
        graph = ctx.graph;
        return `SELECT ?row ?at ?position ?atOrder ?positionOrder WHERE { GRAPH ${ctx.graph} { ?row <urn:triplex:field:attribute> ":pair/key" ; <urn:triplex:field:retracted_at> ?at ; <urn:triplex:field:retracted_position> ?position . OPTIONAL { ?row <urn:triplex:field:retracted_at_order> ?atOrder } OPTIONAL { ?row <urn:triplex:field:retracted_position_order> ?positionOrder } } } ORDER BY ?row`;
      },
      { maxRows: 10, timeoutMs: 10000 },
    ),
  );
  report.nativeQueries.push(result.trace);
  return result.rows as Record<string, { value: string }>[];
};
try {
  const seeded = await run(
    Effect.gen(function* () {
      const triples = yield* Triples;
      return yield* triples.assertBatch(
        ["a", "b"].map((entity) => ({
          entityId: EntityId.make(entity),
          attribute: ":pair/key",
          value: string(entity),
          validFrom: 0,
        })),
      );
    }),
    1001,
  );
  await run(
    Effect.gen(function* () {
      const triples = yield* Triples;
      for (const row of seeded) yield* triples.retract(row.id as TripleId);
    }),
    1002,
  );
  const rows = await inspect();
  assert.equal(rows.length, 2);
  assert(rows.every((row) => row.atOrder && row.positionOrder));
  report.writerRows = rows;
  const before = Math.min(...rows.map((row) => Number(row.at.value))) - 0.5,
    after = Math.max(...rows.map((row) => Number(row.at.value))) + 0.5;
  const readAt = (recordedAt: number) =>
    run(
      Effect.gen(function* () {
        const triples = yield* Triples;
        return yield* triples.queryAll(query, { basis: { validAt: 1, recordedAt } });
      }),
    );
  assert.equal((await readAt(before)).results.length, 2);
  assert.equal((await readAt(after)).results.length, 0);
  report.checks.push({
    id: "actual-writer-emits-both-order-fields-and-historical-mask-preserves-two-rows",
    status: "PASS",
    before,
    after,
  });
  save();
  for (const [index, field, key] of [
    [0, "retracted_at_order", "atOrder"],
    [1, "retracted_position_order", "positionOrder"],
  ] as const) {
    const row = rows[index]!;
    assert.match(row.row.value, /^urn:triplex:/);
    await client.update(
      `DELETE DATA { GRAPH ${graph} { <${row.row.value}> <urn:triplex:field:${field}> ${JSON.stringify(row[key]!.value)} } }`,
    );
  }
  const damaged = await inspect();
  assert.equal(damaged.filter((row) => row.atOrder).length, 1);
  assert.equal(damaged.filter((row) => row.positionOrder).length, 1);
  const check = `SELECT ?row WHERE { GRAPH ${graph} { ?row <urn:triplex:field:id> ?id . OPTIONAL { ?row <urn:triplex:field:retracted_position_order> ?position } OPTIONAL { ?row <urn:triplex:field:retracted_at_order> ?at } FILTER(BOUND(?position) != BOUND(?at)) } }`;
  const partial = await client.query(check);
  assert.equal(partial.length, 2);
  report.partialAudit = { query: check, rows: partial, equalGlobalCounts: true };
  report.checks.push({
    id: "opposite-one-sided-pairs-detected-despite-balanced-global-counts",
    status: "PASS",
  });
  save();
  const failure = await run(
    Effect.gen(function* () {
      const triples = yield* Triples;
      return yield* triples
        .queryAll(query, { basis: { validAt: 1, recordedAt: before } })
        .pipe(Effect.flip);
    }),
  );
  assert.equal(failure._tag, "DatalogValidationError");
  assert.match(String(failure), /retirement order channels form a partial pair/);
  report.checks.push({
    id: "public-paired-profile-rejects-before-main",
    status: "PASS",
    errorTag: failure._tag,
  });
  report.status = "PASS_WRITER_INVARIANT_HISTORY_AND_ROW_ADMISSION";
  save();
  writeFileSync(
    path.join(path.dirname(output), "status.json"),
    JSON.stringify(
      {
        writerPairRows: 2,
        balancedPartialRows: 2,
        publicPartialPairsRefused: true,
        historicalAndCurrentCutsPassed: true,
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
  await client.close();
}

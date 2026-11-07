/** Fresh public-schema edge cases for the predeclared native query repair wave.
 * The independent fixture has tied int64 maxima beyond QLever's native integer
 * range, no matching object, and empty grouped contributions. This is a small
 * correctness diagnostic, not a throughput or general durability qualification.
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Effect } from "effect";
import { EntityId, Triples, integer, string } from "@triplex-build/triplex";
import { Attribute, TypeExpr } from "@triplex-build/triplex/config";
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
  scope = DatabaseScope.test(`native-query-shapes-${runId}`);
const url = "http://127.0.0.1:17019";
const accessToken = readFileSync(
  path.join(root, ".runtime/engines/qlever-main/access-token"),
  "utf8",
).trim();
const native = makeQleverNativeQueries(makeQleverClient(url, { accessToken }), scope);
const ObjectField = Attribute.text(":native-shape/object"),
  Revision = Attribute.int64(":native-shape/revision"),
  Status = Attribute.text(":native-shape/status");
const struct = (fields: Record<string, TypeExpr.TypeExpr>) =>
  TypeExpr.struct(
    Object.fromEntries(Object.entries(fields).map(([key, type]) => [key, TypeExpr.required(type)])),
  );
const report: Record<string, any> = {
  format: "triplex-native-query-shape-edges/1",
  runId,
  scope,
  status: "RUNNING",
  checks: [],
  controls: [],
  traces: [],
  limits: [
    "All fixture facts and queries use compiled public packages and schema attribute handles.",
    "Control correlation mismatches are retained separately and never called semantic PASS.",
    "No ordinary relation is evaluated on the host; tied maximum rows are native results.",
  ],
};
const save = () => writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
save();
try {
  const receipt = await Effect.runPromise(
    Effect.gen(function* () {
      const triples = yield* Triples;
      return yield* triples.assertBatch(
        [
          ["low", "-9223372036854775808", "low"],
          ["max-a", "9223372036854775807", "max-a"],
          ["max-b", "9223372036854775807", "max-b"],
        ].flatMap(([entity, revision, status]) => [
          {
            entityId: EntityId.make(entity!),
            attribute: ObjectField.key,
            value: string("object"),
            validFrom: 0,
          },
          {
            entityId: EntityId.make(entity!),
            attribute: Revision.key,
            value: integer(revision!),
            validFrom: 0,
          },
          {
            entityId: EntityId.make(entity!),
            attribute: Status.key,
            value: string(status!),
            validFrom: 0,
          },
        ]),
      );
    }).pipe(
      Effect.provide(
        makeQleverRuntime({ url, accessToken }).layer({ scope, capabilities: Capabilities.none }),
      ),
      Effect.scoped,
    ),
  );
  report.receipt = receipt;
  const select = async (
    name: string,
    row: TypeExpr.TypeExpr,
    build: Parameters<typeof native.select>[2],
  ) => {
    const result = await Effect.runPromise(
      native.select({ name, parameters: struct({}), row }, {}, build, {
        basis: { validAt: 1 },
        maxRows: 20,
        timeoutMs: 10000,
      }),
    );
    report.traces.push(result.trace);
    save();
    return result.rows as Record<string, any>[];
  };
  // Inspiration: native-latest-wave1.json grouped exact-order MAX arm. The
  // fixture and assertions are independent of the temporal packet's answers.
  const latest = (object: string) =>
    select("native-shape/max-order-ties", struct({ status: TypeExpr.text }), (ctx) => {
      const f = (
        entity: string,
        attribute: typeof Revision | typeof Status | typeof ObjectField,
        value: string,
        order?: string,
      ) =>
        `{ SELECT ${entity} ${value} ${order ?? ""} WHERE { ${ctx.fact(entity, attribute, value, order ? { order } : {})} } }`;
      return `SELECT DISTINCT ?status WHERE { { SELECT ?object (MAX(?candidateOrder) AS ?order) WHERE { ${f("?candidate", ObjectField, "?object")} FILTER(?object=${ctx.literal(object)}) ${f("?candidate", Revision, "?candidateRevision", "?candidateOrder")} } GROUP BY ?object } ${f("?event", ObjectField, "?object")} ${f("?event", Revision, "?revision", "?order")} ${f("?event", Status, "?status")} } ORDER BY ?status`;
    });
  assert.deepEqual(
    (await latest("object")).map((row) => row.status),
    ["max-a", "max-b"],
  );
  report.checks.push({ id: "exact-int64-order-keeps-every-tied-maximum", status: "PASS" });
  save();
  assert.deepEqual(await latest("missing"), []);
  report.checks.push({ id: "empty-object-has-no-max-group", status: "PASS" });
  save();
  const empty = await select(
    "native-shape/empty-grouped-sum",
    struct({ object: TypeExpr.text, total: TypeExpr.int64 }),
    (ctx) =>
      `SELECT ?object (SUM(?hi) AS ?total) WHERE { ${ctx.fact("?event", ObjectField, "?object")} FILTER(?object="missing") ${ctx.fact("?event", Revision, "?revision", { assertion: "?assertion" })} GRAPH ${ctx.graph} { ?assertion <urn:triplex:field:value_integer_sum_hi> ?hi } } GROUP BY ?object`,
  );
  assert.deepEqual(empty, []);
  report.checks.push({ id: "empty-grouped-sum-keeps-no-row-semantics", status: "PASS" });
  save();
  for (const nested of [false, true]) {
    const rows = await select(
      `native-shape/correlation-control-${nested}`,
      struct({ revision: TypeExpr.text }),
      () =>
        `SELECT ?revision WHERE { ${nested ? "{ SELECT ?revision ?order WHERE {" : ""} VALUES (?revision ?order) { ("one" "01") ("two" "02") } ${nested ? "} }" : ""} FILTER NOT EXISTS { ${nested ? "{ SELECT ?laterOrder WHERE {" : ""} VALUES ?laterOrder { "01" "02" } ${nested ? "} }" : ""} FILTER(?laterOrder > ?order) } }`,
    );
    const actual = rows.map((row) => row.revision).sort();
    report.controls.push({
      nestedSubquery: nested,
      standardExpected: ["two"],
      actual,
      standardOraclePassed: JSON.stringify(actual) === '["two"]',
    });
    save();
  }
  report.status = "PASS_CANDIDATE_EDGES_CONTROLS_RECORDED";
  save();
  writeFileSync(
    path.join(path.dirname(output), "status.json"),
    JSON.stringify({ candidateEdgesPassed: 3, controlsRecorded: 2 }, null, 2) + "\n",
    { flag: "wx" },
  );
  console.log(JSON.stringify({ output, status: report.status, controls: report.controls }));
} catch (error) {
  report.status = "FAIL_RETAINED";
  report.error = String(error);
  save();
  throw error;
}

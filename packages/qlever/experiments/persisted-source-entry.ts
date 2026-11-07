/** Actual complete/missing canonical-channel admission at one owned scope.
 * Only this UUID fixture's scalar_lexical quad is deliberately removed. The
 * malformed fixture is retained, never used as normal application state.
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Effect } from "effect";
import { EntityId, Triples, string } from "@triplex-build/triplex";
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
const scope = DatabaseScope.test(`persisted-source-admission-${randomUUID()}`),
  url = "http://127.0.0.1:17019";
const accessToken = readFileSync(
  path.join(root, ".runtime/engines/qlever-main/access-token"),
  "utf8",
).trim();
const client = makeQleverClient(url, { accessToken }),
  native = makeQleverNativeQueries(client, scope);
const report: Record<string, any> = {
  format: "triplex-persisted-scalar-admission/1",
  scope,
  status: "RUNNING",
  queries: [],
  checks: [],
  limitations: [
    "Owned deliberate malformed data retained; other scopes and all original ZIP bytes untouched.",
    "Admission checks every assertion-id row in this exact scope, including retained history; all-complete absence proof is not a free operation.",
    "LIMIT1 can stop at the first missing row; no scale, performance or durability claim.",
  ],
};
const save = () => writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
save();
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const target = new URL(input instanceof Request ? input.url : String(input));
  const recorded =
    target.origin === url && typeof init?.body === "string"
      ? { sparql: init.body, at: new Date().toISOString() }
      : undefined;
  if (recorded) {
    report.queries.push(recorded);
    save();
  }
  return originalFetch(input, init);
};
const run = <A>(program: Effect.Effect<A, unknown, Triples>) =>
  Effect.runPromise(
    program.pipe(
      Effect.provide(
        makeQleverRuntime({
          url,
          accessToken,
          queryLimits: {
            sourcePlan: "persisted",
            negationPlan: "minus",
            aggregateAnswerPlan: "bounded",
          },
        }).layer({ scope, capabilities: Capabilities.none }),
      ),
      Effect.scoped,
    ),
  );
const query = {
  find: ["?entity", "?value"],
  where: [["?entity", ":persisted/key", "?value"]],
} as const;
let graph = "";
const inspectMissing = () =>
  Effect.runPromise(
    native.select(
      { name: "persisted-source/missing-rows", parameters: TypeExpr.struct({}), row: TypeExpr.any },
      {},
      (ctx) => {
        graph = ctx.graph;
        return `SELECT ?row WHERE { GRAPH ${ctx.graph} { ?row <urn:triplex:field:id> ?id . FILTER NOT EXISTS { ?row <urn:triplex:field:scalar_family> ?family ; <urn:triplex:field:scalar_lexical> ?lexical ; <urn:triplex:field:scalar_order> ?order } } } LIMIT 1`;
      },
      { basis: { validAt: 1 }, maxRows: 2, timeoutMs: 10000 },
    ),
  );
try {
  await run(
    Effect.gen(function* () {
      const triples = yield* Triples;
      return yield* triples.assertBatch([
        {
          entityId: EntityId.make("owned-row"),
          attribute: ":persisted/key",
          value: string("hello"),
          validFrom: 0,
        },
      ]);
    }),
  );
  const complete = await run(
    Effect.gen(function* () {
      const triples = yield* Triples;
      return yield* triples.queryAll(query, { basis: { validAt: 1 } });
    }),
  );
  assert.equal(complete.results[0]?.["?value"], "hello");
  assert.equal((await inspectMissing()).rows.length, 0);
  report.checks.push({ id: "all-complete-source-admits-and-returns-row", status: "PASS" });
  save();
  const rows = await client.query(
    `SELECT ?row WHERE { GRAPH ${graph} { ?row <urn:triplex:field:entity_id> "owned-row" ; <urn:triplex:field:attribute> ":persisted/key" } }`,
  );
  assert.equal(rows.length, 1);
  const subject = rows[0]!["row"]!;
  assert.equal(subject.type, "uri");
  assert.match(subject.value, /^urn:triplex:/);
  await client.update(
    `DELETE DATA { GRAPH ${graph} { <${subject.value}> <urn:triplex:field:scalar_lexical> "hello" } }`,
  );
  const missing = await inspectMissing();
  assert.equal(missing.rows.length, 1);
  report.missingNativeRows = missing.rows;
  report.checks.push({
    id: "native-shared-pattern-correlation-detects-one-missing-row",
    status: "PASS",
  });
  save();
  const failure = await run(
    Effect.gen(function* () {
      const triples = yield* Triples;
      return yield* triples.queryAll(query, { basis: { validAt: 1 } }).pipe(Effect.flip);
    }),
  );
  assert.equal(failure._tag, "DatalogValidationError");
  assert.match(String(failure), /persisted scalar channels are missing/);
  report.checks.push({
    id: "public-query-refuses-incomplete-source-before-main",
    status: "PASS",
    errorTag: failure._tag,
  });
  report.graph = graph;
  report.status = "PASS_ADMISSION_AND_REFUSAL";
  save();
  writeFileSync(
    path.join(path.dirname(output), "status.json"),
    JSON.stringify(
      { completeSourceAccepted: true, missingNativeRows: 1, publicMissingSourceRefused: true },
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

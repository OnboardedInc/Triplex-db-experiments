import { qleverConnectionModeOf } from "../src/QleverClient.js";
import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { Effect } from "effect";
import { EntityId, Triples, ref, string } from "@triplex-build/triplex";
import { Capabilities, DatabaseScope } from "@triplex-build/triplex/runtime";
import { makeQleverRuntime } from "../src/index.js";
import { makeQleverClient } from "../src/QleverClient.js";
import { compileQlever } from "../src/compiler.js";
import { fieldIri as f, graphIri, numericOrderKey, literal } from "../src/rdf.js";

const scope = DatabaseScope.test(`join-shapes:${randomUUID()}`);
const url = process.env["QLEVER_URL"] ?? "http://127.0.0.1:7019";
await Effect.runPromise(
  Effect.gen(function* () {
    const t = yield* Triples;
    yield* t.assertBatch([
      { entityId: EntityId.make("grand"), attribute: ":child", value: ref("parent"), validFrom: 1 },
      { entityId: EntityId.make("parent"), attribute: ":child", value: ref("leaf"), validFrom: 1 },
      { entityId: EntityId.make("sibling"), attribute: ":child", value: ref("leaf"), validFrom: 1 },
      { entityId: EntityId.make("text"), attribute: ":child", value: string("leaf"), validFrom: 1 },
      {
        entityId: EntityId.make("sibling"),
        attribute: ":blocked",
        value: { type: "boolean", value: true },
        validFrom: 1,
      },
    ]);
  }).pipe(
    Effect.provide(makeQleverRuntime({ url }).layer({ scope, capabilities: Capabilities.none })),
    Effect.scoped,
  ),
);
const query = {
  find: ["?grand", "?leafParent"],
  where: [
    ["?grand", ":child", "?parent"],
    ["?parent", ":child", "?leaf"],
    ["?leafParent", ":child", "?leaf"],
    ["not", ["?leafParent", ":blocked", true]],
  ],
} as const;
const compiled = compileQlever(query, scope, { basis: { validAt: 100, recordedPosition: 1 } });
const graph = graphIri(scope);
const edge = (index: number, from: string, to: string) =>
  `?s${index} ${f("entity_id")} ${from} ; ${f("attribute")} ":child" ; ${f("value_type")} ?type${index} ; ${f("value_string")} ${to} ; ${f("recorded_position_order")} ?rp${index} ; ${f("valid_from_order")} ?vf${index} . FILTER(?type${index} IN ("string","ref") && ?rp${index} <= ${literal(numericOrderKey(1))} && ?vf${index} <= ${literal(numericOrderKey(100))})`;
const shared = `SELECT DISTINCT ?grand ?leafParent WHERE { GRAPH ${graph} { ${edge(0, "?grand", "?parent")} ${edge(1, "?parent", "?leaf")} ${edge(2, "?leafParent", "?leaf")} FILTER NOT EXISTS { ?blocked ${f("entity_id")} ?leafParent ; ${f("attribute")} ":blocked" ; ${f("value_boolean")} "1" } } }`;
const client = makeQleverClient(url);
const expected = ["grand->parent", "grand->text"];
try {
  const observations = await Promise.all(
    [
      {
        name: "common-enclosing-filter",
        sparql: compiled.sparql,
        decode: (row: Parameters<typeof compiled.decode>[0]) => {
          const result = compiled.decode(row);
          return `${result["?grand"]}->${result["?leafParent"]}`;
        },
      },
      {
        name: "shared-channel-native-bindings",
        sparql: shared,
        decode: (row: Parameters<typeof compiled.decode>[0]) =>
          `${row["grand"]?.value}->${row["leafParent"]?.value}`,
      },
    ].map(async ({ name, sparql, decode }) => {
      try {
        const actual = (await client.query(sparql)).map(decode).sort();
        return {
          name,
          sparql,
          actual,
          correct: JSON.stringify(actual) === JSON.stringify(expected),
        };
      } catch (error) {
        return { name, sparql, correct: false, error: String(error) };
      }
    }),
  );
  const output = new URL(`./join-shapes-${Date.now()}.json`, import.meta.url);
  await writeFile(
    output,
    JSON.stringify(
      { qleverConnectionMode: qleverConnectionModeOf(), kind: "parallel-query-shape-correctness", scope, expected, observations },
      null,
      2,
    ) + "\n",
  );
  console.log(
    JSON.stringify({
      evidence: output.pathname,
      observations: observations.map(({ sparql: _sparql, ...observation }) => observation),
    }),
  );
} finally {
  await client.close();
}

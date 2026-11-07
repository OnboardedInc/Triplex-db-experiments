import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { Effect } from "effect";
import { EntityId, Triples, string, number, ref, boolean } from "@triplex-build/triplex";
import { Capabilities, DatabaseScope } from "@triplex-build/triplex/runtime";
import { makeXtdbClient, makeXtdbRuntime } from "../dist/index.js";

const main = async () => {
  const scope = DatabaseScope.test(`optional-shapes:${randomUUID()}`);
  const url = process.env["XTDB_URL"] ?? "postgres://xtdb:xtdb@127.0.0.1:5442/xtdb";
  const values = [
    string("Alice"),
    string("Bob"),
    number(2),
    number(10),
    ref(EntityId.make("scope:one")),
    boolean(true),
  ];
  await Effect.runPromise(
    Effect.gen(function* () {
      const t = yield* Triples;
      yield* t.assertBatch(
        Array.from({ length: 7 }, (_, i) => [
          {
            entityId: EntityId.make(`e:${i}`),
            attribute: ":type",
            value: string("Fixture"),
            validFrom: 0,
          },
          ...(values[i]
            ? [
                {
                  entityId: EntityId.make(`e:${i}`),
                  attribute: ":value",
                  value: values[i]!,
                  validFrom: 0,
                },
              ]
            : []),
        ]).flat(),
      );
    }).pipe(
      Effect.provide(makeXtdbRuntime({ url }).layer({ scope, capabilities: Capabilities.none })),
      Effect.scoped,
    ),
  );
  const client = makeXtdbClient(url);
  const scan = `(SELECT * FROM tx_assertions FOR ALL VALID_TIME WHERE scope_key = $1 AND recorded_position <= 1 AND retracted_at IS NULL AND valid_from <= 1 AND (valid_to IS NULL OR valid_to > 1))`;
  const expressions = {
    type: "CASE WHEN opt.value_type IN ('number','datetime') THEN 'number' WHEN opt.value_type = 'boolean' THEN 'boolean' WHEN opt.value_type IN ('string','ref','blob','json') THEN 'string' ELSE NULL END",
    text: "COALESCE(opt.value_string, opt.value_json)",
    numeric: "CAST(COALESCE(opt.value_number, opt.value_datetime) AS DOUBLE)",
    flag: "opt.value_boolean",
    category:
      "CASE WHEN opt.value_type IN ('number','datetime') THEN 0 WHEN opt.value_type = 'boolean' THEN 1 ELSE 2 END",
    order_text: "COALESCE(opt.value_string,opt.value_json)",
    order_number: "CAST(COALESCE(opt.value_number,opt.value_datetime) AS DOUBLE)",
  };
  const projected = Object.entries(expressions)
    .map(([key, expression]) => `${expression} AS "${key}"`)
    .join(", ");
  const shapes = [
    {
      name: "scalar-channels",
      sql: `SELECT t.entity_id, ${Object.entries(expressions)
        .map(
          ([key, expression]) =>
            `(SELECT ${expression} FROM ${scan} opt WHERE opt.entity_id=t.entity_id AND opt.attribute=':value' LIMIT 1) AS "${key}"`,
        )
        .join(", ")} FROM ${scan} t WHERE t.attribute=':type' ORDER BY t.entity_id`,
    },
    {
      name: "one-lateral-row",
      sql: `SELECT t.entity_id, q.* FROM ${scan} t LEFT JOIN LATERAL (SELECT ${projected} FROM ${scan} opt WHERE opt.entity_id=t.entity_id AND opt.attribute=':value' LIMIT 1) q ON TRUE WHERE t.attribute=':type' ORDER BY t.entity_id`,
    },
    {
      name: "ranked-projection",
      sql: `WITH optional_rows AS (SELECT *, ROW_NUMBER() OVER (PARTITION BY entity_id, attribute ORDER BY id) AS choice FROM ${scan} s WHERE attribute=':value') SELECT t.entity_id, ${projected} FROM ${scan} t LEFT JOIN optional_rows opt ON opt.entity_id=t.entity_id AND opt.choice=1 WHERE t.attribute=':type' ORDER BY t.entity_id`,
    },
  ];
  try {
    const results = await Promise.all(
      shapes.map(async (shape) => {
        const started = performance.now();
        try {
          const rows = await client.query(shape.sql, [scope], undefined, { timeoutMs: 30_000 });
          const answer = rows.map((row) => ({
            entity: row["entity_id"],
            type: row["type"],
            value:
              row["type"] === "string"
                ? row["text"]
                : row["type"] === "number"
                  ? Number(row["numeric"])
                  : row["type"] === "boolean"
                    ? Number(row["flag"]) === 1
                    : null,
          }));
          return { ...shape, milliseconds: performance.now() - started, answer };
        } catch (error) {
          return { ...shape, milliseconds: performance.now() - started, error: String(error) };
        }
      }),
    );
    const expected = values
      .map((value, i) => ({
        entity: `e:${i}`,
        type: value.type === "ref" ? "string" : value.type,
        value: value.value,
      }))
      .concat({ entity: "e:6", type: null, value: null } as never);
    const packet = {
      scope,
      concurrentCorrectnessOnly: true,
      noPerformanceQualification: true,
      fixture: { entities: 7, facts: 13, optionalValuesUnique: true },
      expected,
      results: results.map((result) => ({
        ...result,
        correct: "answer" in result && JSON.stringify(result.answer) === JSON.stringify(expected),
      })),
    };
    const file = `qualification/evidence/optional-shapes-${Date.now()}.json`;
    writeFileSync(file, JSON.stringify(packet, null, 2));
    console.log(
      JSON.stringify({
        file,
        results: packet.results.map(({ name, milliseconds, correct }) => ({
          name,
          milliseconds,
          correct,
        })),
      }),
    );
  } finally {
    await client.close();
  }
};
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

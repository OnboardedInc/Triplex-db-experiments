import { randomUUID, createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { Effect } from "effect";
import { Triples, EntityId, string } from "../../../packages/core/dist/index.js";
import { makeA0RecordTimeSuite } from "../../../packages/testkit/dist/index.js";
import { makeXtdbClient } from "../../../packages/xtdb/src/XtdbClient.js";
import { makeXtdbStorageAdapter } from "../../../packages/xtdb/src/XtdbStorageAdapter.js";
import { makeXtdbQueryExecutor } from "../../../packages/xtdb/src/XtdbQueryExecutor.js";
import { xtqlStatement } from "../../../packages/xtdb/src/native/Sources.js";
import { makeQleverClient } from "../../../packages/qlever/src/QleverClient.js";
import { makeQleverStorageAdapter } from "../../../packages/qlever/src/QleverStorageAdapter.js";
import { graphIri, metaIri, fieldIri, literal } from "../../../packages/qlever/src/rdf.js";

const head = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const sources = [
  "packages/core/src/errors/index.ts",
  "packages/core/src/storage/RecordStamp.ts",
  "packages/xtdb/src/XtdbStorageAdapter.ts",
  "packages/xtdb/src/RecordCut.ts",
  "packages/qlever/src/QleverStorageAdapter.ts",
  "packages/qlever/src/RecordCut.ts",
  "packages/testkit/dist/record-time-schedules.js",
  "packages/core/dist/errors/index.js",
  "lab/experiments/EXP-RT01/live-probes.ts",
];
const hashes = async () =>
  Object.fromEntries(
    await Promise.all(
      sources.map(async (path) => [
        path,
        createHash("sha256")
          .update(await readFile(path))
          .digest("hex"),
      ]),
    ),
  );
const before = await hashes();
const observations: unknown[] = [];
const xtdbUrl = "postgres://xtdb:xtdb@127.0.0.1:5470/xtdb",
  qleverUrl = "http://127.0.0.1:7070";
const client = makeXtdbClient(xtdbUrl, { transactionTimeoutMs: 30000 });
let failed = false;
try {
  const scope = `rt01:probe:${randomUUID()}`;
  const adapter = makeXtdbStorageAdapter(client, scope);
  const suite = makeA0RecordTimeSuite(adapter, makeXtdbQueryExecutor(client, scope), scope, {
    loseNextAck: () => {},
  });
  const receipts = await Effect.runPromise(
    Effect.gen(function* () {
      const t = yield* Triples;
      suite.clock.set(100000);
      return [
        yield* t.transact([
          {
            op: "assert",
            entityId: EntityId.make("mixed"),
            attribute: ":probe",
            value: string("a"),
          },
        ]),
        yield* t.transact([
          {
            op: "assert",
            entityId: EntityId.make("mixed"),
            attribute: ":probe",
            value: string("b"),
          },
        ]),
      ];
    }).pipe(Effect.provide(suite.layer)),
  );
  if (receipts[0]!.instant !== 100000 || receipts[1]!.instant !== 100000.001)
    throw new Error("Unexpected mixed-column receipt stamps");
  for (const [cut, expected] of [
    [100000.0005, [100000]],
    [100000.001, [100000, 100000.001]],
  ] as const) {
    const sql =
      "SELECT recorded_at FROM tx_assertions FOR ALL VALID_TIME WHERE scope_key = ? AND entity_id = 'mixed' AND recorded_at <= ?";
    const xtql = xtqlStatement(
      '(-> (from :tx_assertions {:for-valid-time :all-time :bind [scope_key entity_id recorded_at]}) (where (= scope_key triplex_param_1) (= entity_id "mixed") (<= recorded_at triplex_param_2)) (return recorded_at))',
      2,
    );
    const a = await client.query(sql, [scope, cut], undefined, { timeoutMs: 30000 });
    const b = await client.query(xtql, [scope, cut], undefined, {
      parameterSyntax: "postgresql",
      timeoutMs: 30000,
    });
    for (const rows of [a, b])
      if (
        JSON.stringify(rows.map((row) => Number(row["recorded_at"])).sort()) !==
        JSON.stringify(expected)
      )
        throw new Error("Mixed integer/fractional comparison disagrees");
    observations.push({
      kind: "mixed-comparison",
      scope,
      endpoint: xtdbUrl,
      cut,
      expected,
      sql,
      xtql,
      sqlRows: a,
      xtqlRows: b,
    });
  }
  const legacy = `rt01:legacy:${randomUUID()}`;
  await client.submit([
    {
      sql: "INSERT INTO tx_meta (_id, scope_key, position, _valid_from) VALUES (?, ?, 1, TIMESTAMP WITH TIME ZONE '1970-01-01T00:00:00Z')",
      params: [legacy, legacy],
    },
  ]);
  let writes = 0,
    refusal: unknown;
  const guarded = makeXtdbStorageAdapter(
    {
      ...client,
      submit: async (...args) => {
        writes++;
        return client.submit(...args);
      },
    },
    legacy,
  );
  try {
    await Effect.runPromise(guarded.initialize());
  } catch (error) {
    refusal = error;
  }
  if (
    !(refusal instanceof Error) ||
    !("_tag" in refusal) ||
    refusal._tag !== "MigrationError" ||
    writes !== 0
  )
    throw new Error("XTDB legacy scope was not refused before writes");
  observations.push({
    kind: "legacy-refusal",
    lane: "xtdb",
    scope: legacy,
    endpoint: xtdbUrl,
    refusal,
    writesAfterSeed: writes,
  });
} catch (error) {
  failed = true;
  observations.push({
    lane: "xtdb",
    error: String(error),
    cause: error instanceof Error ? String(error.cause) : null,
  });
} finally {
  await client.close();
}
const q = makeQleverClient(qleverUrl);
try {
  const scope = `rt01:legacy:${randomUUID()}`;
  await q.update(
    `INSERT DATA { GRAPH ${graphIri(scope)} { ${metaIri} ${fieldIri("position")} ${literal("1")} }`,
    { timeoutMs: 30000 },
  );
  let writes = 0,
    refusal: unknown;
  const adapter = makeQleverStorageAdapter(
    {
      ...q,
      update: async (...args) => {
        writes++;
        return q.update(...args);
      },
    },
    scope,
  );
  try {
    await Effect.runPromise(adapter.initialize());
  } catch (error) {
    refusal = error;
  }
  if (
    !(refusal instanceof Error) ||
    !("_tag" in refusal) ||
    refusal._tag !== "MigrationError" ||
    writes !== 0
  )
    throw new Error("QLever legacy scope was not refused before writes");
  observations.push({
    kind: "legacy-refusal",
    lane: "qlever",
    scope,
    endpoint: qleverUrl,
    refusal,
    writesAfterSeed: writes,
  });
} catch (error) {
  failed = true;
  observations.push({ lane: "qlever", error: String(error) });
} finally {
  await q.close();
}
const after = await hashes();
console.log(
  JSON.stringify(
    {
      head,
      startedSource: before,
      endedSource: after,
      sourceUnchanged: JSON.stringify(before) === JSON.stringify(after),
      observations,
    },
    (_key, value) => (typeof value === "bigint" ? value.toString() : value),
    2,
  ),
);
process.exitCode = failed || JSON.stringify(before) !== JSON.stringify(after) ? 1 : 0;

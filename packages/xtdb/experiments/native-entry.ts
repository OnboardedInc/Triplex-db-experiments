/** Real public native-entry gate. Requires an admitted owned server; starts none. */
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Effect } from "effect";
import { EntityId, Triples, integer, string } from "@triplex-build/triplex";
import { Attribute, EntityType, TypeExpr } from "@triplex-build/triplex/config";
import {
  Capabilities,
  DatabaseScope,
  type NativeQueryTrace,
  type NativeReadOptions,
} from "@triplex-build/triplex/runtime";
import {
  makeXtdbClient,
  makeXtdbNativeQueries,
  makeXtdbRuntime,
} from "@triplex-build/triplex-xtdb";

const root = path.resolve(import.meta.dirname, "../../..");
const args = process.argv.slice(2);
const outputIndex = args.indexOf("--output");
const runId = randomUUID();
const sourceHashes = () => {
  const files = [
    "pnpm-lock.yaml",
    "packages/xtdb/experiments/native-entry.ts",
    "packages/core/package.json",
    "packages/xtdb/package.json",
  ];
  const collect = (directory: string) => {
    for (const entry of readdirSync(path.join(root, directory), { withFileTypes: true })) {
      const relative = `${directory}/${entry.name}`;
      if (entry.isDirectory()) collect(relative);
      else if (entry.isFile()) files.push(relative);
    }
  };
  for (const directory of [
    "packages/core/src",
    "packages/core/dist",
    "packages/xtdb/src",
    "packages/xtdb/dist",
  ])
    collect(directory);
  return Object.fromEntries(
    files.sort().map((file) => [
      file,
      createHash("sha256")
        .update(readFileSync(path.join(root, file)))
        .digest("hex"),
    ]),
  );
};
const output = path.resolve(
  outputIndex < 0
    ? path.join(root, "qualification/evidence", `xtdb-native-entry-${runId}.json`)
    : args[outputIndex + 1]!,
);
assert.ok(
  output.startsWith(root + path.sep),
  "Native evidence must remain in the bounded workspace",
);
const url = process.env["XTDB_URL"];
assert.ok(url, "Set XTDB_URL to the commissioned owned server; this gate starts nothing");
const scope = DatabaseScope.test(`native-entry-${runId}`);
const otherScope = DatabaseScope.test(`native-entry-other-${runId}`);
const Counter = Attribute.int64(":native/counter");
const Subject = EntityType.make("NativeSubject", {
  attributes: { counter: Attribute.use(Counter) },
});
const entity = EntityId.make("native:subject");
const contract = {
  name: "native-entry/schema-counter",
  parameters: TypeExpr.struct({ entity: TypeExpr.required(TypeExpr.text) }),
  row: TypeExpr.struct({ counter: TypeExpr.required(TypeExpr.int64) }),
};
const recordType = (fields: Record<string, TypeExpr.TypeExpr>) =>
  TypeExpr.struct(
    Object.fromEntries(Object.entries(fields).map(([key, type]) => [key, TypeExpr.required(type)])),
  );
const report: Record<string, any> = {
  format: "triplex-public-native-entry/1",
  runId,
  backend: "xtdb",
  queryPath: "xtdb-native",
  status: "RUNNING",
  scope,
  timestampUtc: new Date().toISOString(),
  checks: [],
  traces: [],
  sourceHashesBefore: sourceHashes(),
  limitations: [
    "Small public typed entry-point gate; no performance, final scale or complete ten-goal claim.",
    "Trusted native query text; automatic Triplex cuts apply to supplied basis relations.",
    "Cancellation plus healthy reuse does not establish physical resource reclamation.",
    "Paging uses explicitly authored ORDER/LIMIT/OFFSET at the returned source cut, not universal native cursor inference.",
  ],
};
mkdirSync(path.dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
const save = () => writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
const check = async (id: string, run: () => Promise<unknown>) => {
  try {
    const observation = await run();
    report.checks.push({
      id,
      status: "PASS",
      ...(observation === undefined ? {} : { observation }),
    });
  } catch (cause) {
    report.checks.push({
      id,
      status: "FAIL",
      error: String(cause),
      stack: cause instanceof Error ? cause.stack : undefined,
    });
    save();
    throw cause;
  }
  save();
};
const remember = (trace: NativeQueryTrace) => report.traces.push(trace);
const runtime = makeXtdbRuntime({ url });
let runtimeInvocation = 0;
const runTriples = <A>(program: Effect.Effect<A, unknown, Triples>, selected = scope) =>
  Effect.runPromise(
    program.pipe(
      Effect.provide(
        runtime.layer({
          scope: selected,
          capabilities: Capabilities.none,
          deterministic: {
            startTime: 1000.25,
            seed: `${runId}:${selected}:${++runtimeInvocation}`,
          },
        }),
      ),
      Effect.scoped,
    ),
  );
let originalId: any,
  initialPosition = 0;
try {
  await check("triplex-shared-schema-write", async () => {
    const receipt = await runTriples(
      Effect.gen(function* () {
        const triples = yield* Triples;
        return yield* triples.transact(
          [
            {
              op: "assert",
              entityId: entity,
              entityType: Subject.entityType,
              ...Subject.counter.assertion(integer("9223372036854775807")),
              validFrom: 10.25,
              validTo: 10.75,
            },
            ...["a", "b", "c"].map((id) => ({
              op: "assert" as const,
              entityId: EntityId.make(`native:item:${id}`),
              attribute: ":native/item",
              value: string(id),
              validFrom: 0,
            })),
          ],
          { commandId: `${runId}:initial` },
        );
      }),
    );
    originalId = receipt.triples[0]!.id;
    initialPosition = receipt.position;
    await runTriples(
      Effect.gen(function* () {
        const triples = yield* Triples;
        yield* triples.transact(
          [
            {
              op: "assert",
              entityId: entity,
              attribute: Counter.key,
              value: integer("666"),
              validFrom: 0,
            },
          ],
          { commandId: `${runId}:other-scope` },
        );
      }),
      otherScope,
    );
    return {
      position: initialPosition,
      assertionId: originalId,
      schemaIdentity: Subject.entityType,
    };
  });
  const executePhase = async (reopened: boolean) => {
    const client = makeXtdbClient(url, { maxConnections: 1 });
    const native = makeXtdbNativeQueries(client, scope);
    try {
      await check(`${reopened ? "reopened" : "current"}/typed-xtql-fractional-cut`, async () => {
        const answer = await Effect.runPromise(
          native.select(
            contract,
            { entity },
            (ctx, input) =>
              `(-> ${ctx.facts()} (where (= entity_id ${ctx.bind((input as { entity: string }).entity)}) (= attribute ${ctx.attribute(Subject.counter)})) (return {:counter value_string}))`,
            { basis: { recordedPosition: initialPosition, validAt: 10.5 }, includeRaw: true },
          ),
        );
        assert.deepEqual(answer.rows, [{ counter: integer("9223372036854775807") }]);
        remember(answer.trace);
        return { rows: answer.rows, sourcePosition: answer.basis.recordedPosition };
      });
      await check(`${reopened ? "reopened" : "current"}/half-open-boundary`, async () => {
        for (const validAt of [10.1, 10.75]) {
          const answer = await Effect.runPromise(
            native.select(
              contract,
              { entity },
              (ctx, input) =>
                `(-> ${ctx.facts()} (where (= entity_id ${ctx.bind((input as { entity: string }).entity)}) (= attribute ${ctx.attribute(Counter)})) (return {:counter value_string}))`,
              { basis: { recordedPosition: initialPosition, validAt } },
            ),
          );
          assert.deepEqual(answer.rows, []);
          remember(answer.trace);
        }
      });
      await check(`${reopened ? "reopened" : "current"}/safe-native-parameters`, async () => {
        const message = "O'Reilly? $$; UPDATE tx_assertions";
        const answer = await Effect.runPromise(
          native.select(
            {
              name: "native-entry/parameter",
              parameters: recordType({ message: TypeExpr.text }),
              row: recordType({ message: TypeExpr.text }),
            },
            { message },
            (ctx, input) =>
              `(rel [{:message ${ctx.bind((input as { message: string }).message)}}] [message])`,
          ),
        );
        assert.deepEqual(answer.rows, [{ message }]);
        remember(answer.trace);
      });
      await check(
        `${reopened ? "reopened" : "current"}/future-retraction-metadata-mask`,
        async () => {
          const answer = await Effect.runPromise(
            native.selectSql(
              {
                name: "native-entry/history-at-cut",
                parameters: contract.parameters,
                row: recordType({
                  counter: TypeExpr.int64,
                  retired: TypeExpr.any,
                  retire_tx: TypeExpr.any,
                }),
              },
              { entity },
              (ctx, input) =>
                `SELECT value_string AS counter, retracted_at AS retired, retract_tx_id AS retire_tx FROM ${ctx.history()} h WHERE entity_id = ${ctx.bind((input as { entity: string }).entity)} AND attribute = ${ctx.attribute(Counter)}`,
              { basis: { recordedPosition: initialPosition, validAt: 10.5 } },
            ),
          );
          assert.deepEqual(answer.rows, [
            { counter: integer("9223372036854775807"), retired: null, retire_tx: null },
          ]);
          remember(answer.trace);
        },
      );
    } finally {
      await client.close();
    }
  };
  await executePhase(false);
  await check("triplex-correction-preserves-original-history", async () => {
    await runTriples(
      Effect.gen(function* () {
        const triples = yield* Triples;
        const receipt = yield* triples.transact(
          [
            { op: "retract", id: originalId },
            {
              op: "assert",
              entityId: entity,
              attribute: Counter.key,
              value: integer("7"),
              validFrom: 10.25,
              validTo: 10.75,
            },
          ],
          { commandId: `${runId}:correction` },
        );
        const durable = yield* triples.transactionByCommand(`${runId}:correction`);
        assert.equal(durable?.position, receipt.position);
        assert.equal((yield* triples.history(entity)).length, 2);
      }),
    );
  });
  await executePhase(true);
  await check("native-read-only-refusal", async () => {
    const client = makeXtdbClient(url);
    try {
      const native = makeXtdbNativeQueries(client, scope);
      // Live refusals use only harmless second SELECTs. Mutating tokens are
      // tested locally against the guard/fake client, never sent to the engine.
      for (const query of [
        "SELECT 1; SELECT 2",
        "SELECT 1--comment\r; SELECT 2",
        "SELECT 1--comment\n; SELECT 2",
        "SELECT 1--comment\r\n; SELECT 2",
      ]) {
        const result = await Effect.runPromiseExit(
          native.selectSql(
            { name: "native-entry/refuse-write", parameters: recordType({}), row: TypeExpr.any },
            {},
            () => query,
          ),
        );
        assert.equal(result._tag, "Failure");
      }
    } finally {
      await client.close();
    }
  });
  await check("native-fixed-cut-page-continuation", async () => {
    const client = makeXtdbClient(url);
    try {
      const native = makeXtdbNativeQueries(client, scope);
      const paging = {
        name: "native-entry/paging",
        parameters: recordType({ offset: TypeExpr.number }),
        row: recordType({ entity: TypeExpr.text }),
      };
      const page = (offset: number, basis?: NativeReadOptions["basis"]) =>
        native.selectSql(
          paging,
          { offset },
          (ctx, input) =>
            `SELECT entity_id AS entity FROM ${ctx.facts()} f WHERE attribute = ${ctx.attribute(":native/item")} ORDER BY entity_id LIMIT 2 OFFSET ${ctx.bind((input as { offset: number }).offset)}`,
          { basis: basis ?? { validAt: 1 } },
        );
      const first = await Effect.runPromise(page(0));
      await runTriples(
        Effect.gen(function* () {
          const triples = yield* Triples;
          yield* triples.transact(
            [
              {
                op: "assert",
                entityId: EntityId.make("native:item:d"),
                attribute: ":native/item",
                value: string("d"),
                validFrom: 0,
              },
            ],
            { commandId: `${runId}:fourth-item` },
          );
        }),
      );
      const second = await Effect.runPromise(page(2, first.basis));
      assert.deepEqual(
        [...first.rows, ...second.rows],
        ["a", "b", "c"].map((id) => ({ entity: `native:item:${id}` })),
      );
      remember(first.trace);
      remember(second.trace);
    } finally {
      await client.close();
    }
  });
  await check("native-cancellation-and-connection-reuse", async () => {
    const client = makeXtdbClient(url, { maxConnections: 1 });
    try {
      const native = makeXtdbNativeQueries(client, scope);
      const cancellation = new AbortController();
      const timer = setTimeout(
        () => cancellation.abort(new Error("native fixture cancellation")),
        100,
      );
      try {
        const interrupted = await Effect.runPromiseExit(
          native.selectSql(
            { name: "native-entry/cancel", parameters: recordType({}), row: TypeExpr.any },
            {},
            () => "SELECT pg_sleep(2.0) AS sleeping",
            { signal: cancellation.signal },
          ),
        );
        assert.equal(interrupted._tag, "Failure");
      } finally {
        clearTimeout(timer);
      }
      const healthy = await Effect.runPromise(
        native.selectSql(
          {
            name: "native-entry/reuse",
            parameters: recordType({}),
            row: recordType({ ready: TypeExpr.int64 }),
          },
          {},
          () => "SELECT 1 AS ready",
        ),
      );
      assert.deepEqual(healthy.rows, [{ ready: integer("1") }]);
      remember(healthy.trace);
      return {
        cancellationRequested: true,
        healthyReuse: true,
        physicalReclamationQualified: false,
      };
    } finally {
      await client.close();
    }
  });
  report.status = "PASS_PUBLIC_NATIVE_SMALL";
} catch (cause) {
  report.status = "FAIL";
  report.error = String(cause);
  process.exitCode = 1;
} finally {
  report.passedChecks = report.checks.filter(
    (entry: RecordValue) => entry.status === "PASS",
  ).length;
  report.sourceHashesAfter = sourceHashes();
  report.changedFiles = Object.keys(report.sourceHashesBefore).filter(
    (file) => report.sourceHashesBefore[file] !== report.sourceHashesAfter[file],
  );
  if (report.changedFiles.length) {
    report.status = "UNQUALIFIED_SOURCE_CHANGED";
    process.exitCode = 1;
  }
  save();
  const checksIndex = args.indexOf("--checks-output");
  if (checksIndex >= 0 && report.status === "PASS_PUBLIC_NATIVE_SMALL") {
    const checksOutput = path.resolve(args[checksIndex + 1]!);
    assert(checksOutput.startsWith(path.dirname(output) + path.sep));
    writeFileSync(
      checksOutput,
      JSON.stringify(
        {
          format: "triplex-native-entry-checks/1",
          backend: "xtdb",
          queryPath: "xtdb-native",
          checks: report.checks.map((entry: RecordValue) => ({
            id: entry.id,
            status: entry.status,
          })),
        },
        null,
        2,
      ) + "\n",
      { flag: "wx" },
    );
  }
  console.log(
    JSON.stringify({
      status: report.status,
      checks: report.checks.length,
      passed: report.passedChecks,
      output,
    }),
  );
}

type RecordValue = Record<string, any>;

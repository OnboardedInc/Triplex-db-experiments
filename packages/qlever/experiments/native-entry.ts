import { qleverLatencyReceipt } from "../../../lab/receipts/latency.mjs";
import { qleverConnectionModeOf } from "../src/QleverClient.js";
/** Fresh public native-SPARQL gate. Requires an admitted server; starts none. */
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Effect } from "effect";
import { EntityId, Triples, integer, number, string } from "@triplex-build/triplex";
import { Attribute, EntityType, TypeExpr } from "@triplex-build/triplex/config";
import {
  Capabilities,
  DatabaseScope,
  type NativeReadOptions,
} from "@triplex-build/triplex/runtime";
import {
  makeQleverClient,
  makeQleverNativeQueries,
  makeQleverRuntime,
} from "@triplex-build/triplex-qlever";
import { labQleverAccessToken, labQleverUrl } from "./lab-endpoint.ts";

const root = path.resolve(import.meta.dirname, "../../..");
const runId = randomUUID();
// [EXP-000] Why: the endpoint comes from the lab slot (lab/config/slots.json), not the
// homebase tunnel 17019. Rejected: asserting a fixed port (it pinned the other checkout).
const url = labQleverUrl();
const accessToken = labQleverAccessToken();
// [EXP-000] Why: two admission paths. The lab path (TRIPLEX_LAB_SLOT_OWNER) points at a held
// lab slot lock written by lab/bin/engine.mjs; its endpoint must equal QLEVER_URL. The homebase
// devloop path is kept unchanged for provenance of the archived receipts.
// Rejected: dropping admission entirely (an entry could then run against an unowned server).
const labOwnerFile = process.env["TRIPLEX_LAB_SLOT_OWNER"];
const admissionFile = labOwnerFile ?? process.env["TRIPLEX_RESOURCE_ADMISSION"];
assert(admissionFile, "Fresh entry checks require a lab slot owner or canonical resource admission");
const admission = JSON.parse(readFileSync(admissionFile, "utf8"));
if (labOwnerFile) {
  assert.equal(admission.format, "tx2-slot-owner/1");
  assert.equal(admission.lane, "qlever");
  assert.equal(admission.endpoint, url, "QLEVER_URL differs from the held slot's endpoint");
} else {
  const owner = admission.requiredOwnerChecks?.find(
    (entry: { ownerId: string }) => entry.ownerId === "foundation-qlever",
  )?.observation;
  assert(owner?.running && owner.memoryBytes === 2 * 1024 ** 3);
}
const args = process.argv.slice(2);
const output = path.resolve(args[args.indexOf("--output") + 1]!);
const artifactRoot = process.env["TRIPLEX_RUN_ARTIFACTS"];
assert(artifactRoot && output.startsWith(path.resolve(artifactRoot) + path.sep));
const hashes = () => {
  const files = [
    "pnpm-lock.yaml",
    "packages/qlever/experiments/native-entry.ts",
    "packages/qlever/package.json",
    "packages/core/package.json",
  ];
  const collect = (directory: string) => {
    for (const entry of readdirSync(path.join(root, directory), { withFileTypes: true })) {
      const file = `${directory}/${entry.name}`;
      if (entry.isDirectory()) collect(file);
      else if (entry.isFile()) files.push(file);
    }
  };
  for (const directory of [
    "packages/core/src",
    "packages/core/dist",
    "packages/qlever/src",
    "packages/qlever/dist",
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
const scope = DatabaseScope.test(`qlever-native-entry-${runId}`);
const otherScope = DatabaseScope.test(`qlever-native-entry-other-${runId}`);
const Counter = Attribute.int64(":native/counter");
const Ratio = Attribute.number(":native/ratio");
const Zero = Attribute.number(":native/zero");
const Label = Attribute.text(":native/label");
const Subject = EntityType.make("NativeQleverSubject", {
  attributes: { counter: Attribute.use(Counter) },
});
const entity = EntityId.make("native:qlever:subject");
const fields = (values: Record<string, TypeExpr.TypeExpr>) =>
  TypeExpr.struct(
    Object.fromEntries(Object.entries(values).map(([key, type]) => [key, TypeExpr.required(type)])),
  );
const counterContract = {
  name: "native-qlever/schema-counter",
  parameters: fields({ entity: TypeExpr.text }),
  row: fields({ counter: TypeExpr.int64 }),
};
const report: Record<string, any> = qleverLatencyReceipt({
  qleverConnectionMode: qleverConnectionModeOf(),
  format: "triplex-public-native-entry/1",
  runId,
  backend: "qlever",
  queryPath: "qlever-native",
  status: "RUNNING",
  timestampUtc: new Date().toISOString(),
  scope,
  ownerContainerId: owner.containerId,
  resourceGrant: process.env["TRIPLEX_DEVLOOP_JOB_ID"],
  resourceAdmission: admissionFile,
  cohort: admission.cohort,
  sourceHashesBefore: hashes(),
  checks: [],
  traces: [],
  limitations: [
    "Small public compiled-export gate; no scale, performance, recovery or ten-goal claim.",
    "Trusted authored SPARQL. Temporal/source guards apply to supplied fact fragments, not arbitrary raw SPARQL.",
    "Mac adapter is monitored separately from Linux engine memory cap.",
    "Pre-aborted query and healthy reuse do not establish cancellation of a running native query.",
  ],
});
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
let invocation = 0;
const runTriples = <A>(program: Effect.Effect<A, unknown, Triples>, selected = scope) =>
  Effect.runPromise(
    program.pipe(
      Effect.provide(
        makeQleverRuntime({ url, accessToken }).layer({
          scope: selected,
          capabilities: Capabilities.none,
          deterministic: { startTime: 1000.25, seed: `${runId}:${selected}:${++invocation}` },
        }),
      ),
      Effect.scoped,
    ),
  );
let initialPosition = 0;
let originalId: any;
let correctionPosition = 0;
const client = makeQleverClient(url, { accessToken });
const native = makeQleverNativeQueries(client, scope);
const selectCounter = (options: NativeReadOptions = {}, provider = native) =>
  Effect.runPromise(
    provider.select(
      counterContract,
      { entity },
      (ctx, input) =>
        `SELECT ?counter WHERE { ${ctx.fact((input as { entity: string }).entity, Subject.counter, "?counter", { order: "?counterOrder" })} FILTER(?counterOrder >= ${ctx.integerOrder("0")}) }`,
      { basis: { validAt: 10.5 }, includeRaw: true, ...options },
    ),
  );
const remember = (answer: any) => {
  report.traces.push(answer.trace);
  return answer;
};
try {
  await check("triplex-shared-schema-and-exact-value-write", async () => {
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
            {
              op: "assert",
              entityId: entity,
              attribute: Ratio.key,
              value: number(1.0000000000000002),
              validFrom: 0,
            },
            {
              op: "assert",
              entityId: entity,
              attribute: Zero.key,
              value: number(-0),
              validFrom: 0,
            },
            {
              op: "assert",
              entityId: entity,
              attribute: Label.key,
              value: string("007"),
              validFrom: 0,
            },
          ],
          { commandId: `${runId}:initial` },
        );
      }),
    );
    originalId = receipt.triples[0]!.id;
    initialPosition = receipt.position;
    return {
      position: initialPosition,
      assertionId: originalId,
      schemaIdentity: Subject.entityType,
    };
  });
  await check("typed-native-int64-and-source-cut", async () => {
    const answer = remember(await selectCounter());
    assert.deepEqual(answer.rows, [{ counter: integer("9223372036854775807") }]);
    assert.equal(answer.basis.recordedPosition, initialPosition);
    assert.equal(answer.trace.language, "sparql-1.1");
    assert.equal(answer.rawRows?.[0]?.counter.value, "9223372036854775807");
    return { rows: answer.rows, sourcePosition: answer.basis.recordedPosition };
  });
  await check("half-open-fractional-valid-time", async () => {
    for (const validAt of [10.1, 10.75])
      assert.deepEqual(remember(await selectCounter({ basis: { validAt } })).rows, []);
  });
  await check("full-binary64-negative-zero-and-text-channels", async () => {
    for (const [attribute, expected] of [
      [Ratio, 1.0000000000000002],
      [Zero, -0],
      [Label, "007"],
    ] as const) {
      const answer = remember(
        await Effect.runPromise(
          native.select(
            {
              name: `native-qlever/${attribute.key}`,
              parameters: TypeExpr.any,
              row: fields({ value: attribute.type }),
            },
            {},
            (ctx) => `SELECT ?value WHERE { ${ctx.fact(entity, attribute, "?value")} }`,
            { basis: { validAt: 10.5 } },
          ),
        ),
      );
      assert.equal(answer.rows.length, 1);
      assert.ok(Object.is((answer.rows[0] as { value: unknown }).value, expected));
    }
  });
  await check("authored-native-join-and-string-expression", async () => {
    const answer = remember(
      await Effect.runPromise(
        native.select(
          {
            name: "native-qlever/join",
            parameters: fields({ suffix: TypeExpr.text }),
            row: fields({ counter: TypeExpr.int64, display: TypeExpr.text }),
          },
          { suffix: " native" },
          (ctx, input) =>
            `SELECT ?counter (CONCAT(?label, ${ctx.literal((input as { suffix: string }).suffix)}) AS ?display) WHERE { ${ctx.fact(entity, Counter, "?counter")} ${ctx.fact(entity, Label, "?label")} FILTER(CONTAINS(?label, "00")) }`,
          { basis: { validAt: 10.5 } },
        ),
      ),
    );
    assert.deepEqual(answer.rows, [
      { counter: integer("9223372036854775807"), display: "007 native" },
    ]);
  });
  await check("scope-isolation", async () => {
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
          { commandId: `${runId}:other` },
        );
      }),
      otherScope,
    );
    assert.deepEqual(remember(await selectCounter()).rows, [
      { counter: integer("9223372036854775807") },
    ]);
  });
  await check("triplex-correction-and-command-receipt", async () => {
    correctionPosition = await runTriples(
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
        assert.equal(
          (yield* triples.transactionByCommand(`${runId}:correction`))?.position,
          receipt.position,
        );
        assert.equal(
          (yield* triples.history(entity)).filter((row) => row.attribute === Counter.key).length,
          2,
        );
        return receipt.position;
      }),
    );
    assert.deepEqual(remember(await selectCounter()).rows, [{ counter: integer("7") }]);
    return { correctionPosition };
  });
  await check("historical-source-cut-after-correction", async () => {
    assert.deepEqual(
      remember(await selectCounter({ basis: { recordedPosition: initialPosition, validAt: 10.5 } }))
        .rows,
      [{ counter: integer("9223372036854775807") }],
    );
  });
  await check("new-client-same-source-cut", async () => {
    const reopened = makeQleverClient(url, { accessToken });
    try {
      assert.deepEqual(
        remember(
          await selectCounter(
            { basis: { recordedPosition: initialPosition, validAt: 10.5 } },
            makeQleverNativeQueries(reopened, scope),
          ),
        ).rows,
        [{ counter: integer("9223372036854775807") }],
      );
    } finally {
      await reopened.close();
    }
  });
  await check("raw-rdf-language-and-safe-parameters", async () => {
    const message = "O'Reilly \\u0041 \" } ?s ?p ?o";
    const answer = remember(
      await Effect.runPromise(
        native.select(
          {
            name: "native-qlever/raw",
            parameters: fields({ message: TypeExpr.text }),
            row: TypeExpr.any,
          },
          { message },
          (ctx, input) =>
            `SELECT ?message ?label WHERE { BIND(${ctx.literal((input as { message: string }).message)} AS ?message) BIND("bonjour"@fr AS ?label) }`,
          { includeRaw: true },
        ),
      ),
    );
    assert.equal((answer.rows[0] as any).message.value, message);
    assert.equal((answer.rows[0] as any).label["xml:lang"], "fr");
  });
  await check("unavailable-cut-and-preaborted-query-reject", async () => {
    await assert.rejects(
      selectCounter({ basis: { recordedPosition: correctionPosition + 1, validAt: 10.5 } }),
    );
    await assert.rejects(
      selectCounter({
        signal: AbortSignal.abort(new Error("fixture cancelled before submission")),
      }),
    );
    assert.deepEqual(remember(await selectCounter()).rows, [{ counter: integer("7") }]);
  });
  report.sourceHashesAfter = hashes();
  assert.deepEqual(
    report.sourceHashesAfter,
    report.sourceHashesBefore,
    "Source/build changed during this fixture",
  );
  report.status = "PASS_FOCUSED_ONLY";
} catch (cause) {
  report.status = "FAIL_RETAINED";
  report.error = String(cause);
  process.exitCode = 1;
} finally {
  await client.close();
  report.finishedUtc = new Date().toISOString();
  save();
  writeFileSync(
    path.join(path.dirname(output), "checks.json"),
    JSON.stringify(
      qleverLatencyReceipt({
        qleverConnectionMode: qleverConnectionModeOf(),
        format: "triplex-public-native-entry-checks/1",
        backend: "qlever",
        status: report.status,
        checks: report.checks.map(({ id, status }: { id: string; status: string }) => ({
          id,
          status,
        })),
      }),
      null,
      2,
    ) + "\n",
    { flag: "wx" },
  );
  console.log(
    JSON.stringify({
      output,
      status: report.status,
      checks: report.checks.length,
      passed: report.checks.filter((check: any) => check.status === "PASS").length,
    }),
  );
}

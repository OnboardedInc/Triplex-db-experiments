import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Effect, Layer } from "effect";
import { EntityId, Triples, string } from "@triplex-build/triplex";
import {
  Capabilities,
  DatabaseScope,
  QueryExecutor,
  Runtime,
  StorageAdapter,
} from "@triplex-build/triplex/runtime";
import { makeXtdbClient, type XtdbClient } from "../src/XtdbClient.js";
import { makeXtdbStorageAdapter } from "../src/XtdbStorageAdapter.js";
import { makeXtdbQueryExecutor } from "../src/XtdbQueryExecutor.js";

const url = process.env["XTDB_URL"] ?? "postgres://xtdb:xtdb@localhost:5442/xtdb";
const runId = randomUUID();
const commands = 16;
const run = async (admissionQueue: boolean) => {
  const client = makeXtdbClient(url);
  let submissions = 0;
  const counted: XtdbClient = {
    ...client,
    submit: (statements) => {
      submissions++;
      return client.submit(statements);
    },
  };
  const scope = DatabaseScope.test(`admission:${runId}:${admissionQueue}`);
  const adapter = makeXtdbStorageAdapter(counted, scope, { admissionQueue, maxRetries: 64 });
  const runtime = Runtime.define({
    name: "xtdb-admission-experiment",
    storage: Layer.succeed(StorageAdapter, adapter),
    queries: Layer.succeed(QueryExecutor, makeXtdbQueryExecutor(counted, scope)),
  });
  try {
    return await Effect.runPromise(
      Effect.gen(function* () {
        const triples = yield* Triples;
        submissions = 0;
        const started = performance.now();
        const receipts = yield* Effect.all(
          Array.from({ length: commands }, (_, index) =>
            Effect.gen(function* () {
              const commandStarted = performance.now();
              const result = yield* triples.transact(
                [
                  {
                    op: "assert",
                    entityId: EntityId.make(`admission:${index}`),
                    attribute: ":experiment/value",
                    value: string(`value:${index}`),
                  },
                ],
                { commandId: `${runId}:${index}` },
              );
              return { ...result, acknowledgedMs: performance.now() - commandStarted };
            }),
          ),
          { concurrency: "unbounded" },
        );
        const elapsedMs = performance.now() - started;
        const positions = receipts.map(({ position }) => position).sort((a, b) => a - b);
        assert.deepEqual(
          positions,
          Array.from({ length: commands }, (_, index) => index + 1),
        );
        const recovered = yield* Effect.forEach(
          Array.from({ length: commands }, (_, index) => `${runId}:${index}`),
          (id) => triples.transactionByCommand(id),
        );
        assert.equal(recovered.filter(Boolean).length, commands);
        for (const receipt of recovered) assert.equal(receipt!.changes.length, 1);
        return {
          variant: admissionQueue ? "local-admission-plus-CAS" : "parallel-CAS-retry",
          admissionQueue,
          scope,
          commands,
          assertionsPerCommand: 1,
          distinctEntities: commands,
          activeDomainFacts: commands,
          positions,
          elapsedMs,
          acknowledgedCommandsPerSecond: (commands * 1000) / elapsedMs,
          submissions,
          rejectedAttempts: submissions - commands,
          observationsMs: receipts.map(({ acknowledgedMs }) => acknowledgedMs),
          correctness: {
            durableCommandReceipts: recovered.length,
            assertionChangesPerReceipt: 1,
            positionsContiguous: true,
          },
        };
      }).pipe(
        Effect.provide(runtime.layer({ scope, capabilities: Capabilities.none })),
        Effect.scoped,
      ),
    );
  } finally {
    await client.close();
  }
};
// Independent scopes and connections: both experiments run together.
const variants = await Promise.all([run(false), run(true)]);
const report = {
  format: "triplex-xtdb-transaction-admission/1",
  runId,
  timestamp: new Date().toISOString(),
  concurrentlyExecutedVariants: 2,
  variants,
  limitations: [
    "Sixteen observations per variant; no percentile or scale qualification.",
    "Queue applies to writers using this adapter instance. CAS still guards other instances/processes.",
    "Both variants maintain equivalent source history, command claims, operation markers and complete Triplex journals.",
  ],
};
const directory = path.resolve(import.meta.dirname, "../../../qualification/evidence");
mkdirSync(directory, { recursive: true });
const output = path.join(directory, `transaction-admission-${runId}.json`);
writeFileSync(output, JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
console.log(
  JSON.stringify(
    { output, variants: variants.map(({ observationsMs: _observations, ...variant }) => variant) },
    null,
    2,
  ),
);

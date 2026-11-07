import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { Effect, Layer } from "effect";
import { Triples, EntityId, string, CommandAlreadyCommittedError } from "@triplex-build/triplex";
import {
  Runtime,
  StorageAdapter,
  QueryExecutor,
  DatabaseScope,
  Capabilities,
} from "@triplex-build/triplex/runtime";
import { makeQleverClient } from "../src/QleverClient.js";
import { makeQleverStorageAdapter } from "../src/QleverStorageAdapter.js";
import { makeQleverQueryExecutor } from "../src/QleverQueryExecutor.js";

const run = randomUUID();
const trial = async (admissionQueue: boolean) => {
  const real = makeQleverClient("http://127.0.0.1:7019");
  let submissions = 0,
    rejectedGuards = 0,
    reads = 0;
  const client = {
    ...real,
    query: async (...args: Parameters<typeof real.query>) => {
      reads++;
      return real.query(...args);
    },
    update: async (...args: Parameters<typeof real.update>) => {
      submissions++;
      const response = (await real.update(...args)) as {
        operations?: Array<{ "delta-triples"?: { operation?: { total?: number } } }>;
      };
      if (response.operations?.[0]?.["delta-triples"]?.operation?.total === 0) rejectedGuards++;
      return response;
    },
  };
  const scope = DatabaseScope.test(`qlever-admission:${run}:${admissionQueue}`),
    adapter = makeQleverStorageAdapter(client, scope, { admissionQueue, maxRetries: 32 });
  const runtime = Runtime.define({
    name: "qlever-admission-trial",
    storage: Layer.succeed(StorageAdapter, adapter),
    queries: Layer.succeed(
      QueryExecutor,
      makeQleverQueryExecutor(client, scope, { sourceView: adapter.sourceView }),
    ),
  });
  return Effect.runPromise(
    Effect.gen(function* () {
      const t = yield* Triples,
        start = performance.now();
      const receipts = yield* Effect.all(
        Array.from({ length: 16 }, (_, index) =>
          t.transact(
            [
              {
                op: "assert",
                entityId: EntityId.make(`trial:${index}`),
                attribute: ":trial/value",
                value: string(String(index)),
                entityType: "Trial",
                validFrom: 1,
              },
            ],
            { commandId: `trial:${index}` },
          ),
        ),
        { concurrency: "unbounded" },
      );
      const distinctElapsedMs = performance.now() - start;
      const duplicateStart = performance.now();
      const duplicate = yield* Effect.all(
        Array.from({ length: 16 }, () =>
          t
            .transact(
              [
                {
                  op: "assert",
                  entityId: EntityId.make("duplicate:one"),
                  attribute: ":trial/value",
                  value: string("one"),
                  entityType: "Trial",
                  validFrom: 1,
                },
              ],
              { commandId: "duplicate:one" },
            )
            .pipe(Effect.result),
        ),
        { concurrency: "unbounded" },
      );
      const duplicateElapsedMs = performance.now() - duplicateStart;
      const committed = duplicate.filter((result) => result._tag === "Success").length,
        duplicates = duplicate.filter(
          (result) =>
            result._tag === "Failure" && result.failure instanceof CommandAlreadyCommittedError,
        ).length;
      const durable = yield* Effect.forEach(
        [...Array.from({ length: 16 }, (_, index) => `trial:${index}`), "duplicate:one"],
        (id) => t.transactionByCommand(id),
      );
      const appFacts = yield* t.match({ entityType: "Trial" }, { validAt: 100 });
      const positions = receipts.map((receipt) => receipt.position).sort((a, b) => a - b);
      const pass =
        committed === 1 &&
        duplicates === 15 &&
        durable.every((receipt) => receipt?.changes.length === 1) &&
        appFacts.length === 17 &&
        positions.every((position, index) => position === index + 1);
      return {
        admissionQueue,
        profile: "shared-dev4GiB4CPU",
        clients: 16,
        distinctEntities: 17,
        activeApplicationFacts: 17,
        commands: 17,
        assertionsPerCommand: 1,
        submissions,
        rejectedGuards,
        reads,
        distinctElapsedMs,
        duplicateElapsedMs,
        distinctCommandsPerSecond: (16 * 1000) / distinctElapsedMs,
        duplicateCommitted: committed,
        duplicateRecognized: duplicates,
        durableReceipts: durable.filter(Boolean).length,
        positions,
        pass,
      };
    }).pipe(
      Effect.provide(runtime.layer({ scope, capabilities: Capabilities.none })),
      Effect.scoped,
    ),
  );
};
const results = await Promise.allSettled([trial(false), trial(true)]);
const artifact = {
  run,
  at: new Date().toISOString(),
  timing:
    "end-to-end command completion includes queueing, HTTP, outcome marker visibility and decoding; receipt verification outside timed section",
  results,
};
const path = `qualification/evidence/qlever-transaction-admission-${run}.json`;
await writeFile(path, JSON.stringify(artifact, null, 2) + "\n");
console.log(JSON.stringify({ path, ...artifact }, null, 2));

import { appendFileSync } from "node:fs";
import { triplesConformanceCases } from "@triplex-build/triplex-testkit";
import { randomUUID } from "node:crypto";
import { describe, it, expect } from "vitest";
import { Effect } from "effect";
import {
  makeA0RecordTimeSuite,
  recordTimeDeterministicFixture,
} from "@triplex-build/triplex-testkit";
import { makeQleverClient, type QleverClient } from "../src/QleverClient.js";
import { makeQleverStorageAdapter } from "../src/QleverStorageAdapter.js";
import { makeQleverQueryExecutor } from "../src/QleverQueryExecutor.js";
import { readQleverCut } from "../src/RecordCut.js";

it("refuses a QLever legacy scope before decided writes", async () => {
  const client = { query: async () => [{ position: { value: "1" } }] } as unknown as QleverClient;
  await expect(readQleverCut(client, "legacy")).rejects.toMatchObject({ _tag: "MigrationError" });
});
describe.skipIf(process.env["QLEVER_INTEGRATION"] !== "1")("EXP-RT01 QLever A0", () => {
  for (const commitEncoding of ["a0", "compact"] as const)
    it(`T1-T12 serialized schedules (${commitEncoding}; T8 deferred-only N/A)`, async () => {
      const real = makeQleverClient(process.env["QLEVER_URL"] ?? "http://127.0.0.1:7070");
      let lose = false;
      const client: QleverClient = {
        ...real,
        update: async (...args) => {
          const result = await real.update(...args).catch((error) => {
            console.error("RT01 update rejected", error);
            throw error;
          });
          if (lose) {
            lose = false;
            throw new Error("RT01 lost acknowledgement after update");
          }
          return result;
        },
      };
      const scope = `rt01:${randomUUID()}`;
      const adapter = makeQleverStorageAdapter(client, scope, { maxRetries: 256, commitEncoding });
      const suite = makeA0RecordTimeSuite(
        adapter,
        makeQleverQueryExecutor(client, scope, { sourceView: adapter.sourceView }),
        scope,
        {
          loseNextAck: () => {
            lose = true;
          },
          progress: (message) =>
            appendFileSync(
              "../../lab/experiments/EXP-RT01/evidence/qlever-progress.jsonl",
              JSON.stringify({ time: new Date().toISOString(), commitEncoding, scope, message }) +
                "\n",
            ),
        },
      );
      await Effect.runPromise(suite.run.pipe(Effect.provide(suite.layer)));
    }, 600000);
});

it.skipIf(process.env["QLEVER_INTEGRATION"] !== "1")(
  "T10 fresh deterministic receipts reproduce across both A0 encodings",
  async () => {
    const real = makeQleverClient(process.env["QLEVER_URL"] ?? "http://127.0.0.1:7070");
    try {
      const runs = [];
      for (const commitEncoding of ["a0", "compact", "a0"] as const) {
        const scope = `rt01:deterministic:${randomUUID()}`;
        const adapter = makeQleverStorageAdapter(real, scope, { commitEncoding });
        const suite = makeA0RecordTimeSuite(
          adapter,
          makeQleverQueryExecutor(real, scope, { sourceView: adapter.sourceView }),
          scope,
          { loseNextAck: () => {} },
        );
        runs.push(await Effect.runPromise(recordTimeDeterministicFixture(suite)));
      }
      expect(runs[1]).toEqual(runs[0]);
      expect(runs[2]).toEqual(runs[0]);
    } finally {
      await real.close();
    }
  },
  120000,
);

it.skipIf(process.env["QLEVER_INTEGRATION"] !== "1" || process.env["RT01_CONFORMANCE"] !== "1")(
  "G2 all 44 shared conformance cases on both A0 encodings (88)",
  async () => {
    const real = makeQleverClient(process.env["QLEVER_URL"] ?? "http://127.0.0.1:7070");
    try {
      expect(triplesConformanceCases).toHaveLength(44);
      for (const commitEncoding of ["a0", "compact"] as const) {
        const scope = `rt01:conformance:${randomUUID()}`;
        const adapter = makeQleverStorageAdapter(real, scope, { commitEncoding });
        const suite = makeA0RecordTimeSuite(
          adapter,
          makeQleverQueryExecutor(real, scope, { sourceView: adapter.sourceView }),
          scope,
          { loseNextAck: () => {} },
        );
        await Effect.runPromise(
          Effect.forEach(
            triplesConformanceCases,
            (entry) =>
              Effect.gen(function* () {
                console.log(`RT01 G2 ${commitEncoding} ${entry.name}`);
                yield* entry.run;
              }),
            { discard: true },
          ).pipe(Effect.provide(suite.layer)),
        );
      }
    } finally {
      await real.close();
    }
  },
  600000,
);

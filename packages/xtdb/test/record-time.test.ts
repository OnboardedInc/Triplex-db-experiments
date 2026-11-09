import { xtqlStatement } from "../src/native/Sources.js";
import { appendFileSync } from "node:fs";
import { triplesConformanceCases } from "@triplex-build/triplex-testkit";
import { randomUUID } from "node:crypto";
import { describe, it, expect } from "vitest";
import { Effect } from "effect";
import {
  makeA0RecordTimeSuite,
  recordTimeDeterministicFixture,
} from "@triplex-build/triplex-testkit";
import { makeXtdbClient, type XtdbClient } from "../src/XtdbClient.js";
import { makeXtdbStorageAdapter } from "../src/XtdbStorageAdapter.js";
import { makeXtdbQueryExecutor } from "../src/XtdbQueryExecutor.js";
import { readXtdbCut } from "../src/RecordCut.js";

it("refuses an XTDB legacy scope before decided writes", async () => {
  const client = { query: async () => [{ position: 1 }] } as unknown as XtdbClient;
  await expect(readXtdbCut(client, "legacy")).rejects.toMatchObject({ _tag: "MigrationError" });
});
describe.skipIf(process.env["XTDB_INTEGRATION"] !== "1")("EXP-RT01 XTDB A0", () => {
  for (const commitEncoding of ["a0", "compact"] as const)
    it(`T1-T12 serialized schedules (${commitEncoding}; T8 deferred-only N/A)`, async () => {
      const real = makeXtdbClient(
        process.env["XTDB_URL"] ?? "postgres://xtdb:xtdb@localhost:5470/xtdb",
        { transactionTimeoutMs: 30000, maxConnections: 8 },
      );
      let lose = false;
      const client: XtdbClient = {
        ...real,
        submit: async (...args) => {
          const result = await real.submit(...args);
          if (lose) {
            lose = false;
            throw new Error("RT01 lost acknowledgement after submission");
          }
          return result;
        },
      };
      const scope = `rt01:${randomUUID()}`;
      try {
        const suite = makeA0RecordTimeSuite(
          makeXtdbStorageAdapter(client, scope, { maxRetries: 256, commitEncoding }),
          makeXtdbQueryExecutor(client, scope),
          scope,
          {
            loseNextAck: () => {
              lose = true;
            },
            progress: (message) =>
              appendFileSync(
                "../../lab/experiments/EXP-RT01/evidence/xtdb-progress.jsonl",
                JSON.stringify({ time: new Date().toISOString(), commitEncoding, scope, message }) +
                  "\n",
              ),
          },
        );
        await Effect.runPromise(suite.run.pipe(Effect.provide(suite.layer)));
        // [EXP-RT01] Why: integer and fractional row coordinates share one numeric column. Rejected: codec-only equality (does not exercise SQL/XTQL comparisons).
        const sql = await real.query(
          "SELECT recorded_at FROM tx_assertions FOR ALL VALID_TIME WHERE scope_key = ? AND recorded_at <= ?",
          [scope, 100000.001],
        );
        const xtql = await real.query(
          xtqlStatement(
            "(-> (from :tx_assertions {:for-valid-time :all-time :bind [scope_key recorded_at]}) (where (= scope_key triplex_param_1) (<= recorded_at triplex_param_2)) (return recorded_at))",
            2,
          ),
          [scope, 100000.001],
          undefined,
          { parameterSyntax: "postgresql" },
        );
        expect(sql.map((row) => Number(row["recorded_at"])).sort()).toEqual(
          xtql.map((row) => Number(row["recorded_at"])).sort(),
        );
        expect(sql.some((row) => Number.isInteger(Number(row["recorded_at"])))).toBe(true);
        expect(sql.some((row) => !Number.isInteger(Number(row["recorded_at"])))).toBe(true);
      } finally {
        await real.close();
      }
    }, 600000);
});

it.skipIf(process.env["XTDB_INTEGRATION"] !== "1")(
  "T10 fresh deterministic receipts reproduce across both A0 encodings",
  async () => {
    const real = makeXtdbClient(
      process.env["XTDB_URL"] ?? "postgres://xtdb:xtdb@localhost:5470/xtdb",
    );
    try {
      const runs = [];
      for (const commitEncoding of ["a0", "compact", "a0"] as const) {
        const scope = `rt01:deterministic:${randomUUID()}`;
        const adapter = makeXtdbStorageAdapter(real, scope, { commitEncoding });
        const suite = makeA0RecordTimeSuite(adapter, makeXtdbQueryExecutor(real, scope), scope, {
          loseNextAck: () => {},
        });
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

it.skipIf(process.env["XTDB_INTEGRATION"] !== "1" || process.env["RT01_CONFORMANCE"] !== "1")(
  "G2 all 44 shared conformance cases on both A0 encodings (88)",
  async () => {
    const real = makeXtdbClient(
      process.env["XTDB_URL"] ?? "postgres://xtdb:xtdb@localhost:5470/xtdb",
    );
    try {
      expect(triplesConformanceCases).toHaveLength(44);
      for (const commitEncoding of ["a0", "compact"] as const) {
        const scope = `rt01:conformance:${randomUUID()}`;
        const adapter = makeXtdbStorageAdapter(real, scope, { commitEncoding });
        const suite = makeA0RecordTimeSuite(adapter, makeXtdbQueryExecutor(real, scope), scope, {
          loseNextAck: () => {},
        });
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

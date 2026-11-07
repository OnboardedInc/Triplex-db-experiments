import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Effect } from "effect";
import { EntityId, string, type Constraint, type TransactOp } from "@triplex-build/triplex";
import { makeXtdbClient, type XtdbClient } from "../src/XtdbClient.js";
import { makeXtdbStorageAdapter } from "../src/XtdbStorageAdapter.js";
import { validateXtdbConstraints } from "../src/ConstraintValidation.js";

const runId = randomUUID();
const url = process.env["XTDB_URL"] ?? "postgres://xtdb:xtdb@localhost:5442/xtdb";
const rule: Constraint.Rule = { _tag: "Unique", v: 1, entityType: "Person", attribute: ":key" };
const run = async (strategy: "inline" | "projection") => {
  const client = makeXtdbClient(url);
  const scope = `constraint-shape:${runId}:${strategy}`;
  const adapter = makeXtdbStorageAdapter(client, scope);
  try {
    await Effect.runPromise(adapter.initialize());
    await Effect.runPromise(
      adapter.withTransaction(
        Effect.gen(function* () {
          const position = yield* adapter.nextCommitPosition();
          yield* adapter.batchInsert(
            [
              {
                entityId: EntityId.make("a"),
                entityType: "Person",
                attribute: ":key",
                value: string("left"),
                validFrom: 0,
              },
              {
                entityId: EntityId.make("b"),
                entityType: "Person",
                attribute: ":key",
                value: string("right"),
                validFrom: 0,
              },
            ],
            "fixture",
            100,
            ["a-key", "b-key"],
            position,
          );
        }),
      ),
    );
    const operations: TransactOp[] = [
      { op: "retract", id: "a-key" as never },
      { op: "retract", id: "b-key" as never },
      {
        op: "assert",
        entityId: EntityId.make("a"),
        entityType: "Person",
        attribute: ":key",
        value: string("right"),
        validFrom: 0,
      },
      {
        op: "assert",
        entityId: EntityId.make("b"),
        entityType: "Person",
        attribute: ":key",
        value: string("left"),
        validFrom: 0,
      },
    ];
    let submissions = 0,
      statements = 0,
      queries = 0,
      returnedRows = 0;
    const counted: XtdbClient = {
      ...client,
      submit: (batch) => {
        submissions++;
        statements += batch.length;
        return client.submit(batch);
      },
      query: async (sql, params, basis, options) => {
        queries++;
        const rows = await client.query(sql, params, basis, options);
        returnedRows += rows.length;
        return rows as never;
      },
    };
    const observations: unknown[] = [];
    for (let iteration = 0; iteration < (strategy === "projection" ? 2 : 1); iteration++) {
      const started = performance.now();
      try {
        const result = await validateXtdbConstraints(
          counted,
          scope,
          { sourceK: 1, rows: new Map() },
          { operations, constraints: [rule], instant: 200 },
          { strategy, timeoutMs: 5000 },
        );
        assert.deepEqual(result, []);
        observations.push({
          iteration,
          status: "PASS",
          elapsedMs: performance.now() - started,
          violations: 0,
          submissions,
          statements,
          queries,
          returnedRows,
        });
      } catch (error) {
        observations.push({
          iteration,
          status: "FAILED_OR_CLIENT_DEADLINE",
          elapsedMs: performance.now() - started,
          error: error instanceof Error ? error.message : String(error),
          submissions,
          statements,
          queries,
          returnedRows,
        });
      }
    }
    const retained = await client.query(
      "SELECT COUNT(*) AS total FROM tx_constraint_graphs FOR ALL VALID_TIME WHERE scope_key = ?",
      [scope],
      undefined,
      { timeoutMs: 5000 },
    );
    return {
      strategy,
      scope,
      observations,
      retainedGraphRows: Number(retained[0]?.["total"] ?? 0),
      sourceEntities: 2,
      sourceFacts: 2,
      commandOperations: 4,
    };
  } finally {
    await client.close();
  }
};
// Both independent candidate shapes execute concurrently against equal fixtures.
const variants = await Promise.all([run("inline"), run("projection")]);
const report = {
  format: "triplex-xtdb-constraint-shapes/1",
  runId,
  timestamp: new Date().toISOString(),
  concurrentlyExecutedVariants: 2,
  variants,
  limitations: [
    "Small correctness fixture, no scale or percentile qualification.",
    "Client deadline is not evidence that backend work stopped.",
    "Projection generations rebuild after source/command/basis changes and retain native rows; second identical evaluation may reuse them.",
    "Default runtime remains portable until this strategy passes the unchanged integrated suite and scale costs are qualified.",
  ],
};
const directory = path.resolve(import.meta.dirname, "../../../qualification/evidence");
mkdirSync(directory, { recursive: true });
const output = path.join(directory, `constraint-shapes-${runId}.json`);
writeFileSync(output, JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify({ output, variants }, null, 2));

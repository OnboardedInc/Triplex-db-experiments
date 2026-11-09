import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import { Effect, Exit } from "effect";
import {
  triplesConformanceCases,
  makeA0RecordTimeSuite,
  recordTimeDeterministicFixture,
} from "../../../../packages/testkit/dist/index.js";
import { makeXtdbClient, type XtdbClient } from "../../../../packages/xtdb/src/XtdbClient.js";
import { makeXtdbStorageAdapter } from "../../../../packages/xtdb/src/XtdbStorageAdapter.js";
import { makeXtdbQueryExecutor } from "../../../../packages/xtdb/src/XtdbQueryExecutor.js";

import { Triples, EntityId, string } from "../../../../packages/core/dist/index.js";
import { DatabaseScope } from "../../../../packages/core/dist/runtime/index.js";
import { TypeExpr } from "../../../../packages/core/dist/config/index.js";
import { makeXtdbNativeQueries } from "../../../../packages/xtdb/src/native/NativeQueries.js";
import { makeXtdbTemporalQueries } from "../../../../packages/xtdb/src/TemporalQueries.js";
import { makeXtdbMaintainedQueries } from "../../../../packages/xtdb/src/MaintainedQueries.js";

const out = process.env.RT01_LIVE_OUT!;
assert.ok(out);
fs.mkdirSync(out, { recursive: true });
const owner = JSON.parse(fs.readFileSync(process.env.TRIPLEX_LAB_SLOT_OWNER!, "utf8"));
assert.equal(owner.holder, "CX-RT01");
assert.equal(owner.slot, "s1");
assert.equal(owner.lane, "xtdb");
assert.equal(owner.endpoint, process.env.XTDB_URL);
let phase = "start",
  seq = 0;
const events: any[] = [];
const event = (e: any) => {
  const value = { at: new Date().toISOString(), phase, ...e };
  events.push(value);
  fs.appendFileSync(path.join(out, "progress.jsonl"), JSON.stringify(value) + "\n");
  if (
    e.kind !== "query-start" &&
    e.kind !== "query-end" &&
    e.kind !== "submit-start" &&
    e.kind !== "submit-end"
  )
    console.log(JSON.stringify(value));
};
const real = makeXtdbClient(owner.endpoint, { maxConnections: 20, transactionTimeoutMs: 30000 });
// [EXP-RT01] Why: retain the exact statement at a deadline and distinguish it from a case/fiber hang. Rejected: increasing a suite budget without locating the client wait.
const client: XtdbClient = {
  ...real,
  query: async (sql, params, basis, options) => {
    const id = ++seq,
      start = performance.now();
    event({
      kind: "query-start",
      id,
      sql,
      params,
      basis,
      options: { timeoutMs: options?.timeoutMs, parameterSyntax: options?.parameterSyntax },
    });
    try {
      const rows = await real.query(sql, params, basis, options);
      event({ kind: "query-end", id, ms: performance.now() - start, rows: rows.length });
      return rows as any;
    } catch (error) {
      event({
        kind: "query-error",
        id,
        ms: performance.now() - start,
        error: String(error),
        stack: (error as Error).stack,
      });
      throw error;
    }
  },
  submit: async (statements) => {
    const id = ++seq,
      start = performance.now();
    event({ kind: "submit-start", id, statements });
    try {
      const result = await real.submit(statements);
      event({ kind: "submit-end", id, ms: performance.now() - start });
      return result;
    } catch (error) {
      event({ kind: "submit-error", id, ms: performance.now() - start, error: String(error) });
      throw error;
    }
  },
};
const outcomes: any[] = [];
const diagnostic = process.env.RT01_DIAGNOSTIC === "1";
const failures: any[] = [];
// [EXP-RT01] Why: the diagnostic records every case in order without granting acceptance. Rejected: stopping at the first fresh-engine assumption and concealing later failures.
const observe = (name: string, run: any): any =>
  Effect.gen(function* () {
    const start = performance.now();
    event({ kind: "case-start", name });
    const exit = yield* Effect.exit(run.pipe(Effect.timeout("10 minutes")));
    if (Exit.isFailure(exit)) {
      const detail = { phase, name, ms: performance.now() - start, cause: String(exit.cause) };
      failures.push(detail);
      event({ kind: "diagnostic-failure", ...detail });
      if (!diagnostic) yield* Effect.failCause(exit.cause);
    } else {
      event({ kind: "case-pass", name, ms: performance.now() - start });
    }
  });
async function suiteFor(encoding: "a0" | "compact", name: string) {
  const scope = DatabaseScope.test(`rt01-r7-live-${name}-${encoding}-${randomUUID()}`);
  let lose = false;
  const faultClient: XtdbClient = {
    ...client,
    submit: async (stmts) => {
      const result = await client.submit(stmts);
      if (lose) {
        lose = false;
        throw new Error("RT01 live lost acknowledgement after committed submission");
      }
      return result;
    },
  };
  const adapter = makeXtdbStorageAdapter(faultClient, scope, {
    commitEncoding: encoding,
    maxRetries: 256,
  });
  const executor = makeXtdbQueryExecutor(faultClient, scope);
  const suite = makeA0RecordTimeSuite(adapter, executor, scope, {
    loseNextAck: () => {
      lose = true;
    },
    progress: (message) => event({ kind: "schedule-progress", encoding, scope, message }),
  });
  return { suite, scope, adapter, executor };
}
async function section(name: string, work: () => Promise<void>) {
  phase = name;
  try {
    await work();
  } catch (error) {
    if (!diagnostic) throw error;
    const detail = { phase, name, error: String(error), stack: (error as Error).stack };
    failures.push(detail);
    event({ kind: "diagnostic-section-failure", ...detail });
  }
}
let failure: any = null;
try {
  assert.equal(triplesConformanceCases.length, 44);
  // Locate the previously timed-out case in isolation with the unchanged 30-second executor deadline.
  await section("timeout-diagnosis", async () => {
    const { suite, scope } = await suiteFor("a0", "diagnosis");
    const entry = triplesConformanceCases.find(
      (e) => e.name === "wrapped filters preserve scalar types and SQL null semantics",
    )!;
    const start = performance.now();
    event({ kind: "case-start", scope, name: entry.name });
    await Effect.runPromise(observe(entry.name, entry.run).pipe(Effect.provide(suite.layer)));
    outcomes.push({ phase, scope, name: entry.name, ms: performance.now() - start });
    event({ kind: "case-complete", ...outcomes.at(-1) });
  });
  for (const encoding of ["a0", "compact"] as const) {
    await section(`conformance-${encoding}`, async () => {
      const { suite, scope } = await suiteFor(encoding, "conformance");
      await Effect.runPromise(
        Effect.forEach(
          triplesConformanceCases,
          (entry) =>
            Effect.gen(function* () {
              const start = performance.now();
              event({ kind: "case-start", scope, name: entry.name });
              yield* observe(entry.name, entry.run);
              const result = { phase, scope, name: entry.name, ms: performance.now() - start };
              outcomes.push(result);
              event({ kind: "case-complete", ...result });
            }),
          { discard: true },
        ).pipe(Effect.provide(suite.layer)),
      );
    });
    await section(`named-routes-${encoding}`, async () => {
      const routesSuite = await suiteFor(encoding, "routes");
      const routeResults = await Effect.runPromise(
        Effect.gen(function* () {
          const t = yield* Triples;
          const { scope, adapter, executor, suite } = routesSuite;
          suite.clock.set(1000);
          const subject = EntityId.make("live-route-subject");
          const first = yield* t.transact([
            {
              op: "assert",
              entityId: subject,
              entityType: "Subject",
              attribute: ":live/value",
              value: string("before"),
              validFrom: 1000,
              validTo: 2000,
            },
          ]);
          const basis = { validAt: 1000, recordedAt: first.instant },
            resolved = { ...basis, recordedPosition: first.position };
          const q = { find: ["?value"], where: [[subject, ":live/value", "?value"]] } as const;
          const wrapped = { inner: q, limit: 10 };
          const native = makeXtdbNativeQueries(client, scope),
            temporal = makeXtdbTemporalQueries(client, scope),
            maintained = makeXtdbMaintainedQueries(client, scope);
          const contract = {
            name: "rt01/live-value",
            parameters: TypeExpr.struct({}),
            row: TypeExpr.struct({ value: TypeExpr.required(TypeExpr.text) }),
          };
          const routes: any[] = [
            ["entity", () => t.entity(subject, basis)],
            ["entities", () => t.entities([subject], basis)],
            ["entityPage", () => t.entityPage({ entityType: "Subject", basis })],
            ["match", () => t.match({ entityId: subject }, basis)],
            ["queryAll", () => t.queryAll(q, { basis }).pipe(Effect.map((r) => r.results))],
            [
              "queryAll-echo",
              () =>
                t
                  .queryAll(q, { basis, includeBasis: true })
                  .pipe(Effect.map((r) => ({ results: r.results, basis: r.basis }))),
            ],
            ["query", () => t.query(q, { basis }).pipe(Effect.map((r) => r.results))],
            ["queryPage", () => t.queryPage(wrapped, { basis }).pipe(Effect.map((r) => r.results))],
            [
              "journal",
              () => t.transactionsForEntity(subject, { snapshotPosition: first.position }),
            ],
            ["storage-entity", () => adapter.getByEntity(subject, resolved)],
            [
              "storage-batch",
              () =>
                adapter
                  .getByEntities([subject], resolved)
                  .pipe(Effect.map((rows) => [...rows.entries()])),
            ],
            ["storage-query", () => adapter.query({ entityId: subject }, resolved)],
            [
              "executor",
              () => executor.execute(q, false, resolved).pipe(Effect.map((r) => r.results)),
            ],
            [
              "executor-page",
              () =>
                executor.executePage(wrapped, false, resolved).pipe(Effect.map((r) => r.results)),
            ],
            [
              "intervals",
              () =>
                temporal.queryIntervals(q, {
                  from: 1000,
                  to: 2000,
                  recordedAt: first.instant,
                  recordedPosition: first.position,
                }),
            ],
            ["maintained", () => maintained.query(q, resolved).pipe(Effect.map((r) => r.results))],
            ["dependency", () => t.dependencyState([":live/value"], basis)],
            ...(["facts", "recordedFacts"] as const).flatMap((source) => [
              [
                "native-sql-" + source,
                () =>
                  native
                    .selectSql(
                      contract,
                      {},
                      (ctx) =>
                        `SELECT value_string AS value FROM ${ctx[source]()} f WHERE entity_id = ${ctx.bind(subject)} AND attribute = ${ctx.bind(":live/value")}`,
                      { basis: resolved },
                    )
                    .pipe(Effect.map((r) => r.rows)),
              ],
              [
                "native-xtql-" + source,
                () =>
                  native
                    .select(
                      contract,
                      {},
                      (ctx) =>
                        `(-> ${ctx[source]()} (where (= entity_id ${ctx.bind(subject)}) (= attribute ${ctx.bind(":live/value")})) (return {:value value_string}))`,
                      { basis: resolved },
                    )
                    .pipe(Effect.map((r) => r.rows)),
              ],
            ]),
          ];
          const before: any = {};
          for (const [name, run] of routes) {
            event({ kind: "route-start", name, scope });
            const result = yield* Effect.exit(run());
            if (Exit.isFailure(result)) {
              if (!diagnostic) yield* Effect.failCause(result.cause);
              const detail = { phase, name, cause: String(result.cause) };
              failures.push(detail);
              event({ kind: "diagnostic-failure", ...detail });
              continue;
            }
            before[name] = result.value;
            yield* observe(
              `route initial ${name}`,
              Effect.sync(() => {
                if (name === "dependency")
                  assert.equal(before[name].sourcePosition, first.position);
                else
                  assert.ok(
                    JSON.stringify(before[name]).includes("before"),
                    name + " must return the seeded value",
                  );
              }),
            );
          }
          suite.clock.set(5000);
          const second = yield* t.transact([
            { op: "retract", id: first.triples[0]!.id },
            {
              op: "assert",
              entityId: subject,
              entityType: "Subject",
              attribute: ":live/value",
              value: string("after"),
              validFrom: 1000,
              validTo: 2000,
            },
          ]);
          const after: any = {};
          for (const [name, run] of routes) {
            if (!(name in before)) continue;
            const result = yield* Effect.exit(run());
            if (Exit.isFailure(result)) {
              if (!diagnostic) yield* Effect.failCause(result.cause);
              const detail = { phase, name, cause: String(result.cause) };
              failures.push(detail);
              event({ kind: "diagnostic-failure", ...detail });
              continue;
            }
            after[name] = result.value;
            yield* observe(
              `route repeat ${name}`,
              Effect.sync(() => {
                // [EXP-RT01] Why: R33 4.3 Q4 and HE-7 echo this request's pinned head even for an older T. Rejected: requiring two new T-only requests to echo the same head P (contradicts the designed basis contract).
                if (name === "entityPage") {
                  assert.deepEqual(after[name].entities, before[name].entities);
                  assert.equal(before[name].snapshot.recordedAt, first.instant);
                  assert.equal(after[name].snapshot.recordedAt, first.instant);
                  assert.equal(before[name].snapshot.recordedPosition, first.position);
                  assert.equal(after[name].snapshot.recordedPosition, second.position);
                } else if (name === "queryAll-echo") {
                  assert.deepEqual(after[name].results, before[name].results);
                  assert.deepEqual(before[name].basis, {
                    ...basis,
                    scope,
                    recordedPosition: first.position,
                  });
                  assert.deepEqual(after[name].basis, {
                    ...basis,
                    scope,
                    recordedPosition: second.position,
                  });
                } else
                  assert.deepEqual(after[name], before[name], name + " changed at the served cut");
              }),
            );
            event({
              kind: diagnostic ? "diagnostic-route-complete" : "route-pass",
              name,
              scope,
              recordedAt: first.instant,
              recordedPosition: first.position,
            });
          }
          assert.equal((yield* t.entity(subject, { validAt: 1000 }))[0]?.value.value, "after");
          return { scope, first, second, before, after };
        }).pipe(Effect.provide(routesSuite.suite.layer)),
      );
      fs.writeFileSync(
        path.join(out, `routes-${encoding}.json`),
        JSON.stringify(routeResults, null, 2) + "\n",
      );
      outcomes.push({ phase, scope: routesSuite.scope, name: "21 available named routes" });
    });
    await section(`T1-T12-${encoding}`, async () => {
      const schedules = await suiteFor(encoding, "schedules");
      event({ kind: "schedule-start", scope: schedules.scope });
      await Effect.runPromise(
        Effect.forEach(schedules.suite.cases, (entry) => observe(entry.name, entry.run), {
          discard: true,
        }).pipe(Effect.provide(schedules.suite.layer)),
      );
      outcomes.push({
        phase,
        scope: schedules.scope,
        name: "T1-T12 including 200 independent/50 contended commits",
      });
      event({
        kind: diagnostic ? "diagnostic-schedule-complete" : "schedule-pass",
        ...outcomes.at(-1),
      });
    });
  }
  await section("determinism", async () => {
    const fixtures = [];
    for (const encoding of ["a0", "compact", "a0"] as const) {
      const s = await suiteFor(encoding, "determinism");
      fixtures.push(await Effect.runPromise(recordTimeDeterministicFixture(s.suite)));
    }
    assert.deepEqual(fixtures[1], fixtures[0]);
    assert.deepEqual(fixtures[2], fixtures[0]);
    fs.writeFileSync(path.join(out, "determinism.json"), JSON.stringify(fixtures, null, 2) + "\n");
    event({ kind: "determinism-pass" });
  });
} catch (error) {
  failure = { phase, error: String(error), stack: (error as Error).stack };
  event({ kind: "first-failure", ...failure });
} finally {
  await real.close();
  fs.writeFileSync(
    path.join(out, "outcomes.json"),
    JSON.stringify(
      {
        diagnostic,
        grantsAcceptance: !diagnostic && !failure && failures.length === 0,
        owner,
        outcomes,
        failures,
        failure,
      },
      null,
      2,
    ) + "\n",
  );
}
if (failure || (!diagnostic && failures.length)) process.exitCode = 1;

import { randomUUID } from "node:crypto";
import {
  nativeEvidenceValue,
  type NativeQueryStep,
  type NativeReadBasis,
} from "@triplex-build/triplex/runtime";
import { XtdbTransactionRejected, type XtdbClient, type XtdbStatement } from "../XtdbClient.js";
import { makeNativeContext, type XtdbNativeContext } from "./Sources.js";
import { readOnlyNativeSql } from "./ReadOnlySql.js";

export interface XtdbNativeReachability {
  readonly name: string;
  /** Authored native SELECT yielding string columns source and target. */
  readonly edges: (context: XtdbNativeContext, parameters: unknown) => string;
}

export class NativeWorkingOutcomeUnknown extends Error {
  constructor(
    readonly runId: string,
    readonly attemptId: string,
    readonly phase: string,
  ) {
    super(
      `Native working write outcome is unresolved; run=${runId}, attempt=${attemptId}, phase=${phase}; scratch retained, no blind cleanup or replay`,
    );
  }
}

/**
 * Server-resident relational rounds, not host graph evaluation or Datalog
 * lowering. XTDB v2.2.0 rejects recursive CTEs in sql.clj/visitWithClause:
 * https://github.com/xtdb/xtdb/blob/v2.2.0/core/src/main/clojure/xtdb/sql.clj
 * Owned scratch is erased after consumption; canonical Triplex history is untouched.
 */
export const materializeNativeReachability = async (
  client: XtdbClient,
  basis: NativeReadBasis,
  definitions: readonly XtdbNativeReachability[],
  input: unknown,
  signal: AbortSignal,
  steps: NativeQueryStep[],
  maxRows = 100_000,
  maxRounds = 100,
) => {
  if (
    !definitions.length ||
    new Set(definitions.map((item) => item.name)).size !== definitions.length
  )
    throw new TypeError("Native reachability requires distinct named relations");
  for (const definition of definitions)
    if (!/^[A-Za-z_][A-Za-z0-9_-]{0,127}$/.test(definition.name))
      throw new TypeError("Invalid native reachability relation name");
  if (![maxRows, maxRounds].every((value) => Number.isSafeInteger(value) && value > 0))
    throw new RangeError("Native reachability budgets must be positive safe integers");
  const runId = randomUUID();
  let initialized = false;
  let uncertain = false;
  const submit = async (phase: string, statements: readonly XtdbStatement[]) => {
    const attemptId = randomUUID();
    const markerId = JSON.stringify([basis.scope, runId, attemptId]);
    const tracked: readonly XtdbStatement[] = initialized
      ? [
          {
            sql: "ASSERT NOT EXISTS (SELECT 1 FROM tx_native_relation_attempts FOR ALL VALID_TIME WHERE _id = $1), 'triplex-native-attempt-duplicate'",
            params: [markerId],
            parameterSyntax: "postgresql",
          },
          ...statements,
          {
            sql: "INSERT INTO tx_native_relation_attempts (_id, _valid_from, scope_key, run_id, attempt_id, phase) VALUES ($1, TIMESTAMP WITH TIME ZONE '1970-01-01T00:00:00Z', $2, $3, $4, $5)",
            params: [markerId, basis.scope, runId, attemptId, phase],
            parameterSyntax: "postgresql",
          },
        ]
      : statements;
    const started = performance.now();
    try {
      await client.submit(tracked);
    } catch (cause) {
      if (cause instanceof XtdbTransactionRejected || !initialized) throw cause;
      // A transport timeout is not rollback. Resolve the atomically written
      // marker before any ERASE could race a later successful round commit.
      const until = Date.now() + 30_000;
      let resolved = false;
      do {
        try {
          const receipts = await client.query(
            "SELECT attempt_id FROM tx_native_relation_attempts FOR ALL VALID_TIME WHERE _id = $1",
            [markerId],
            undefined,
            { parameterSyntax: "postgresql", timeoutMs: Math.max(1, until - Date.now()) },
          );
          if (receipts.length) {
            resolved = true;
            break;
          }
        } catch {
          /* retry receipt observation, never the possibly committed write */
        }
        if (Date.now() < until) await new Promise((resolve) => setTimeout(resolve, 25));
      } while (Date.now() < until);
      if (!resolved) {
        uncertain = true;
        throw new NativeWorkingOutcomeUnknown(runId, attemptId, phase);
      }
    }
    const elapsedMs = performance.now() - started;
    for (const [index, statement] of tracked.entries())
      steps.push({
        phase,
        language: "xtdb-sql",
        query: statement.sql,
        parameters: (statement.params ?? []).map(nativeEvidenceValue),
        elapsedMs: index === 0 ? elapsedMs : 0,
      });
  };
  const count = async (name: string) => {
    signal.throwIfAborted();
    const query =
      "SELECT COUNT(*) AS count FROM tx_native_relations FOR ALL VALID_TIME WHERE scope_key = $1 AND run_id = $2 AND relation_name = $3";
    const params = [basis.scope, runId, name];
    const started = performance.now();
    const rows = await client.query<{ count: unknown }>(query, params, undefined, {
      signal,
      parameterSyntax: "postgresql",
    });
    steps.push({
      phase: "working-count",
      language: "xtdb-sql",
      query,
      parameters: params,
      elapsedMs: performance.now() - started,
    });
    const result = Number(rows[0]?.count ?? 0);
    if (!Number.isSafeInteger(result) || result > maxRows)
      throw new RangeError("Native reachability exceeds its complete relation row budget");
    return result;
  };
  const cleanup = async () => {
    if (uncertain) throw new Error(`Working cleanup is blocked by an unresolved write in ${runId}`);
    if (initialized)
      await submit("working-cleanup", [
        {
          sql: "ERASE FROM tx_native_relations WHERE scope_key = $1 AND run_id = $2",
          params: [basis.scope, runId],
          parameterSyntax: "postgresql",
        },
        {
          // Retain this cleanup's new receipt after removing prior round markers.
          // The remaining small receipt is accounted owned state, not free history.
          sql: "ERASE FROM tx_native_relation_attempts WHERE scope_key = $1 AND run_id = $2",
          params: [basis.scope, runId],
          parameterSyntax: "postgresql",
        },
      ]);
  };
  try {
    signal.throwIfAborted();
    await submit("working-initialize", [
      {
        sql: "CREATE TABLE tx_native_relations (_id, scope_key, run_id, relation_name, source, target, depth)",
      },
      {
        sql: "CREATE TABLE tx_native_relation_attempts (_id, scope_key, run_id, attempt_id, phase)",
      },
    ]);
    initialized = true;
    for (const definition of definitions) {
      signal.throwIfAborted();
      const native = makeNativeContext("xtdb-sql", basis);
      const edges = readOnlyNativeSql(definition.edges(native.context, input));
      const scope = native.context.bind(basis.scope),
        run = native.context.bind(runId),
        name = native.context.bind(definition.name),
        prefix = native.context.bind(`${runId}/${definition.name}/`);
      const guard: XtdbStatement = {
        sql: "ASSERT (SELECT COUNT(*) FROM tx_native_relations FOR ALL VALID_TIME WHERE scope_key = $1 AND run_id = $2 AND relation_name = $3) <= $4, 'triplex-native-reachability-limit'",
        params: [basis.scope, runId, definition.name, maxRows],
        parameterSyntax: "postgresql",
      };
      await submit("working-seed", [
        {
          sql: `INSERT INTO tx_native_relations (_id, _valid_from, scope_key, run_id, relation_name, source, target, depth) SELECT ${prefix} || CAST(CHARACTER_LENGTH(e.source) AS TEXT) || ':' || e.source || e.target, TIMESTAMP WITH TIME ZONE '1970-01-01T00:00:00Z', ${scope}, ${run}, ${name}, e.source, e.target, 0 FROM (SELECT DISTINCT source, target FROM (${edges}\n) native_edges) e LIMIT ${maxRows + 1}`,
          params: native.parameters,
          parameterSyntax: "postgresql",
        },
        guard,
      ]);
      let previous = await count(definition.name),
        complete = false;
      for (let round = 1; round <= maxRounds; round++) {
        signal.throwIfAborted();
        const params = [basis.scope, runId, definition.name, `${runId}/${definition.name}/`, round];
        // [EXP-X02] Why: the correlated predicate is written `(p) IS TRUE`. XTDB 2.2.0 moves a
        // subquery WHERE into a three-valued mark, so one NULL endpoint drops the candidate and the
        // closure silently under-reaches (upstream #6313; R14 H02). // [EXP-X02] interim, replaced by EXP-X03
        await submit("working-round", [
          {
            sql: `INSERT INTO tx_native_relations (_id, _valid_from, scope_key, run_id, relation_name, source, target, depth) SELECT $4 || CAST(CHARACTER_LENGTH(c.source) AS TEXT) || ':' || c.source || c.target, TIMESTAMP WITH TIME ZONE '1970-01-01T00:00:00Z', $1, $2, $3, c.source, c.target, $5 FROM (SELECT DISTINCT prior.source AS source, edge.target AS target FROM tx_native_relations FOR ALL VALID_TIME prior JOIN tx_native_relations FOR ALL VALID_TIME edge ON prior.target = edge.source WHERE prior.scope_key = $1 AND prior.run_id = $2 AND prior.relation_name = $3 AND prior.depth < $5 AND edge.scope_key = $1 AND edge.run_id = $2 AND edge.relation_name = $3 AND edge.depth = 0) c WHERE NOT EXISTS (SELECT 1 FROM tx_native_relations FOR ALL VALID_TIME seen WHERE seen.scope_key = $1 AND seen.run_id = $2 AND seen.relation_name = $3 AND (seen.source = c.source) IS TRUE AND (seen.target = c.target) IS TRUE) LIMIT ${maxRows + 1}`,
            params,
            parameterSyntax: "postgresql",
          },
          {
            sql: "ASSERT (SELECT COUNT(*) FROM tx_native_relations FOR ALL VALID_TIME WHERE scope_key = $1 AND run_id = $2 AND relation_name = $3) <= $4, 'triplex-native-reachability-limit'",
            params: [basis.scope, runId, definition.name, maxRows],
            parameterSyntax: "postgresql",
          },
        ]);
        const current = await count(definition.name);
        if (current === previous) {
          complete = true;
          break;
        }
        previous = current;
      }
      if (!complete)
        throw new RangeError(
          "Native reachability did not complete within maxRounds; no partial result returned",
        );
    }
    return {
      relation: (name: string, context: XtdbNativeContext) => {
        if (!definitions.some((definition) => definition.name === name))
          throw new TypeError("Undeclared native reachability relation");
        return `(SELECT source, target FROM tx_native_relations FOR ALL VALID_TIME WHERE scope_key = ${context.bind(basis.scope)} AND run_id = ${context.bind(runId)} AND relation_name = ${context.bind(name)})`;
      },
      cleanup,
    };
  } catch (cause) {
    try {
      await cleanup();
    } catch (cleanupFailure) {
      throw new AggregateError(
        [cause, cleanupFailure],
        "Native working relation failed and cleanup is unresolved",
      );
    }
    throw cause;
  }
};

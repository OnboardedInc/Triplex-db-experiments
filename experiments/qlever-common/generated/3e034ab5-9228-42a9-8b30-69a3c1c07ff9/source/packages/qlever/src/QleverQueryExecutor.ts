import { Effect } from "effect";
import {
  assertDatalogQuery,
  assertWrappedQuery,
  DatalogValidationError,
  ReadError,
  UnboundVariableError,
  type QueryExecutorService,
  type QueryMetrics,
  type QueryPlan,
} from "@triplex-build/triplex/runtime";
import type { DatalogQuery, WrappedQuery } from "@triplex-build/triplex/datalog";
import type { PaginationValue } from "@triplex-build/triplex/internal";
import {
  compileQlever,
  type NumericDomain,
  type QleverBasis,
  type QleverCompiled,
  type QleverSourceView,
} from "./compiler.js";
import { fieldIri, graphIri, metaIri } from "./rdf.js";
import type { QleverClient } from "./QleverClient.js";
import type { QleverSourcePlan } from "./ScalarSource.js";
import { materializeQleverRules } from "./recursion.js";

export interface QleverQueryOptions {
  readonly sourceView?: Effect.Effect<QleverSourceView | undefined>;
  readonly sourcePlan?: QleverSourcePlan;
  readonly timeoutMs?: number;
  readonly nativeTimeoutMs?: number;
  readonly maxResponseBytes?: number;
  readonly maxResultRows?: number;
  readonly maxAggregateInputRows?: number;
  readonly maxRecursiveRows?: number;
  /** Provisional compact-plan width admission; larger bodies require explicit qualification. */
  readonly maxPatternClauses?: number;
}
const fail = (cause: unknown) =>
  cause instanceof DatalogValidationError || cause instanceof UnboundVariableError
    ? cause
    : new ReadError({ message: `QLever Datalog execution failed: ${String(cause)}`, cause });
const safeCount = (value: string | undefined): number => {
  const result = Number(value ?? 0);
  if (!Number.isSafeInteger(result) || result < 0)
    throw new TypeError("QLever count is not a safe Triplex number");
  return result;
};
const plan = (compiled: QleverCompiled): QueryPlan => ({
  backend: "qlever-0.6-sparql",
  steps: [
    ...compiled.domains.map((domain) => ({
      label: `numeric domain ${domain.variable}`,
      query: domain.sparql,
    })),
    { label: "main", query: compiled.sparql },
    ...(compiled.countSparql ? [{ label: "count", query: compiled.countSparql }] : []),
  ],
});
const metrics = (query: DatalogQuery, elapsed: number): QueryMetrics => ({
  patternCount: query.where.filter(
    (clause) => String(clause[0]).startsWith("?") || String(clause[1]).startsWith(":"),
  ).length,
  predicateCount: query.where.filter((clause) =>
    ["=", "!=", ">", ">=", "<", "<="].includes(String(clause[0])),
  ).length,
  notClauseCount: query.where.filter((clause) => clause[0] === "not").length,
  orClauseCount: query.where.filter((clause) => clause[0] === "or").length,
  hasAggregation: Boolean(query.aggregate?.length),
  isRecursive: Boolean(query.rules?.length),
  aggregateOps: query.aggregate?.map(([op]) => op) ?? [],
  compilationTimeMs: elapsed,
});

/** Public Triplex QueryExecutor backed exclusively by QLever SPARQL operators. */
export const makeQleverQueryExecutor = (
  client: QleverClient,
  scopeKey: string,
  options: QleverQueryOptions = {},
): QueryExecutorService => {
  const timeoutMs = options.timeoutMs ?? 30_000;
  const nativeTimeoutMs = options.nativeTimeoutMs ?? Math.min(timeoutMs, 30_000);
  const maxResponseBytes = options.maxResponseBytes ?? 64 * 1024 ** 2;
  const maxResultRows = options.maxResultRows ?? 100_000;
  const maxAggregateInputRows = options.maxAggregateInputRows ?? 100_000;
  const maxRecursiveRows = options.maxRecursiveRows ?? 100_000;
  const maxPatternClauses = options.maxPatternClauses ?? 4;
  if (
    options.sourcePlan !== undefined &&
    options.sourcePlan !== "compact" &&
    options.sourcePlan !== "persisted"
  )
    throw new RangeError("Unsupported QLever source plan");
  if (
    ![
      timeoutMs,
      nativeTimeoutMs,
      maxResponseBytes,
      maxResultRows,
      maxAggregateInputRows,
      maxRecursiveRows,
      maxPatternClauses,
    ].every((n) => Number.isSafeInteger(n) && n > 0) ||
    maxAggregateInputRows > 100_000
  )
    throw new RangeError(
      "QLever budgets must be positive safe integers; aggregate input cap <=100000",
    );
  const run = (
    input: DatalogQuery | WrappedQuery,
    debug: boolean,
    basis?: { validAt: number; recordedAt?: number; recordedPosition?: number },
    cursorValues?: readonly PaginationValue[],
  ) =>
    Effect.gen(function* () {
      const sourceView = options.sourceView ? yield* options.sourceView : undefined;
      return yield* Effect.tryPromise({
        try: async (effectSignal) => {
          const signal = AbortSignal.any([effectSignal, AbortSignal.timeout(timeoutMs)]);
          const logical =
            "inner" in input ? assertWrappedQuery(input).inner : assertDatalogQuery(input);
          const patternCount = (body: readonly (readonly unknown[])[]): number =>
            body.reduce(
              (count, clause) =>
                count +
                (clause[0] === "not"
                  ? patternCount(clause.slice(1).filter(Boolean) as readonly (readonly unknown[])[])
                  : clause[0] === "or"
                    ? patternCount(clause[1] as readonly (readonly unknown[])[])
                    : ["=", "!=", ">", ">=", "<", "<="].includes(String(clause[0]))
                      ? 0
                      : 1),
              0,
            );
          const patterns =
            patternCount(logical.where) +
            (logical.optionalProjection?.fields.length ?? 0) +
            (logical.rules?.reduce((n, rule) => n + patternCount(rule.body), 0) ?? 0);
          if (patterns > maxPatternClauses)
            throw new RangeError(
              `QLever query exceeds maxPatternClauses=${maxPatternClauses}; compact-plan width admission; no query submitted`,
            );
          if (
            sourceView &&
            (basis?.recordedAt !== undefined ||
              (basis?.recordedPosition !== undefined &&
                basis.recordedPosition !== sourceView.sourcePosition))
          )
            throw new DatalogValidationError({
              query: input,
              message:
                "QLever historical Datalog inside a pending transaction is not yet qualified",
            });
          const position =
            sourceView?.sourcePosition ??
            basis?.recordedPosition ??
            safeCount(
              (
                await client.query(
                  `SELECT ?position WHERE { GRAPH ${graphIri(scopeKey)} { ${metaIri} ${fieldIri("position")} ?position } }`,
                  { signal, timeoutMs: nativeTimeoutMs, maxResponseBytes },
                )
              )[0]?.["position"]?.value,
            );
          const resolved: QleverBasis = {
            validAt: basis?.validAt ?? Date.now(),
            recordedPosition: position,
            ...(basis?.recordedAt === undefined ? {} : { recordedAt: basis.recordedAt }),
          };
          const compileStarted = performance.now();
          const runId = logical.rules?.length
            ? await materializeQleverRules(client, logical, scopeKey, {
                basis: resolved,
                signal,
                maxRows: maxRecursiveRows,
                ...(options.sourcePlan ? { sourcePlan: options.sourcePlan } : {}),
                nativeTimeoutMs,
                maxResponseBytes,
                ...(sourceView ? { sourceView } : {}),
              })
            : undefined;
          const compileOptions = {
            basis: resolved,
            ...(options.sourcePlan ? { sourcePlan: options.sourcePlan } : {}),
            maxResultRows,
            ...(sourceView ? { sourceView } : {}),
            ...(cursorValues ? { cursorValues } : {}),
            ...(runId ? { runId } : {}),
          };
          let compiled = compileQlever(input, scopeKey, compileOptions);
          for (const check of compiled.checks)
            if (
              (
                await client.query(check.sparql, {
                  signal,
                  timeoutMs: nativeTimeoutMs,
                  maxResponseBytes,
                })
              ).length
            )
              throw new DatalogValidationError({
                query: input,
                message: `QLever ${check.label}; query rejected before main execution`,
              });
          const numericDomains = new Map<string, NumericDomain>();
          for (const probe of compiled.domains) {
            const rows = await client.query(probe.sparql, {
              signal,
              timeoutMs: nativeTimeoutMs,
              maxResponseBytes,
            });
            const numeric = rows.filter(
              (row) => row["family"]?.value === "number" || row["family"]?.value === "integer",
            );
            const families = new Set(numeric.map((row) => row["family"]!.value));
            if (families.size > 1)
              throw new DatalogValidationError({
                query: input,
                message: `Mixed exact integer and number domain for ${probe.variable} requires an explicit cast`,
              });
            if (numeric.length)
              numericDomains.set(probe.variable, numeric[0]!["family"]!.value as NumericDomain);
            if (probe.sum) {
              if (!numeric.length && rows.length)
                throw new DatalogValidationError({
                  query: input,
                  message: "QLever SUM over nonnumeric-only inputs is not yet qualified",
                });
              const row = numeric[0];
              const total = safeCount(row?.["total"]?.value);
              if (total > maxAggregateInputRows)
                throw new RangeError(
                  `QLever aggregate input exceeds maxAggregateInputRows=${maxAggregateInputRows}; no partial result`,
                );
              if (
                row?.["family"]?.value === "number" &&
                (safeCount(row["invalid"]?.value) > 0 ||
                  total * Number(row["max_abs"]?.value ?? 0) > 2 ** 49)
              )
                throw new DatalogValidationError({
                  query: input,
                  message:
                    "QLever native SUM cannot preserve arbitrary binary64; only proved bounded integral contributions are supported",
                });
            }
          }
          compiled = compileQlever(input, scopeKey, { ...compileOptions, numericDomains });
          const compilationTimeMs = performance.now() - compileStarted;
          const started = performance.now();
          const raw = await client.query(compiled.sparql, {
            signal,
            timeoutMs: nativeTimeoutMs,
            maxResponseBytes,
          });
          const executionTimeMs = performance.now() - started;
          if (raw.length > maxResultRows)
            throw new RangeError(
              `QLever result exceeds maxResultRows=${maxResultRows}; no partial answer`,
            );
          const results = raw.map(compiled.decode);
          let totalCount: number | undefined;
          if (compiled.countSparql)
            totalCount = safeCount(
              (
                await client.query(compiled.countSparql, {
                  signal,
                  timeoutMs: nativeTimeoutMs,
                  maxResponseBytes,
                })
              )[0]?.["total"]?.value,
            );
          return {
            results,
            ...(totalCount === undefined ? {} : { totalCount }),
            ...(debug
              ? {
                  debug: {
                    metrics: metrics(logical, compilationTimeMs),
                    executionTimeMs,
                    resultCount: results.length,
                    queryPlan: plan(compiled),
                  },
                }
              : {}),
          };
        },
        catch: fail,
      });
    });
  const explain = (input: DatalogQuery | WrappedQuery) =>
    Effect.try({
      try: () => {
        const started = performance.now();
        const logical = "inner" in input ? input.inner : input;
        const compiled = compileQlever(input, scopeKey, {
          basis: { validAt: Date.now(), recordedPosition: 0 },
          ...(logical.rules?.length ? { runId: "<query-run>" } : {}),
        });
        return {
          queryPlan: plan(compiled),
          metrics: metrics(logical, performance.now() - started),
        };
      },
      catch: fail,
    });
  return {
    execute: (query, debug = false, basis) => run(query, debug, basis),
    executePage: (query, debug = false, basis, cursor) => run(query, debug, basis, cursor),
    explain,
    explainPage: explain,
  };
};

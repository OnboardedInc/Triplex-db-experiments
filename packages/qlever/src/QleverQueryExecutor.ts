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
  type QleverNegationPlan,
} from "./compiler.js";
import { fieldIri, graphIri, metaIri } from "./rdf.js";
import type { QleverClient } from "./QleverClient.js";
import type { QleverDomainPlan } from "./FamilyDomains.js";
import type { QleverSourcePlan } from "./ScalarSource.js";
import { materializeQleverRules } from "./recursion.js";
import { prepareAggregateAnswers } from "./AggregateAnswers.js";
import { BasisNotAvailable, ReplicaUnavailable, isUnreachable } from "./broker/errors.js";
import type { ReplicaSnapshot } from "./broker/broker.js";

export interface QleverQueryOptions {
  readonly sourceView?: Effect.Effect<QleverSourceView | undefined>;
  /**
   * EXP-P2Q broker mode (default absent): the basis gate (`BasisGate` in broker/BrokerStorageAdapter.ts). The
   * compiled query reads only the replica, in several requests, so the broker adapter waits (deadline-aware,
   * RULINGS Q31d) until the replica has reached the requested basis (or sourceK inside a transaction, or the
   * broker head when none is named) and returns a snapshot; once the last request has returned, `after` refuses
   * the answer if the replica was reset in between (RULINGS Q67c, Q72b).
   */
  readonly resolveBasis?: ((requested: number | undefined) => Promise<ReplicaSnapshot>) & {
    readonly inTransaction: (sourceK: number) => Promise<ReplicaSnapshot>;
    readonly after: (snapshot: ReplicaSnapshot) => Promise<void>;
  };
  readonly sourcePlan?: QleverSourcePlan;
  readonly domainPlan?: QleverDomainPlan;
  readonly timeoutMs?: number;
  readonly nativeTimeoutMs?: number;
  readonly maxResponseBytes?: number;
  readonly maxResultRows?: number;
  readonly maxAggregateInputRows?: number;
  readonly maxRecursiveRows?: number;
  /** Provisional compact-plan width admission; larger bodies require explicit qualification. */
  readonly maxPatternClauses?: number;
  /** Explicit bounded final GROUP-output normalization; never a source-fact fallback. */
  readonly aggregateAnswerPlan?: "native" | "bounded";
  readonly maxAggregateAnswerRows?: number;
  readonly negationPlan?: QleverNegationPlan;
  readonly retirementPlan?: "paired";
  /** Explicit persisted-leaf order liveness experiment; defaults stay unchanged. */
  readonly scalarOrderPlan?: "live";
}
// The broker gate's typed BasisNotAvailable and ReplicaUnavailable pass through (EXP-P2Q, V-P2Q M3); only the
// gate raises them, so every A0 failure is wrapped exactly as before.
const fail = (cause: unknown) =>
  cause instanceof DatalogValidationError ||
  cause instanceof UnboundVariableError ||
  cause instanceof BasisNotAvailable ||
  cause instanceof ReplicaUnavailable
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
    ...compiled.checks.map((check) => ({ label: check.label, query: check.sparql })),
    ...(compiled.familyDomain
      ? [{ label: "batched numeric families", query: compiled.familyDomain.sparql }]
      : []),
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
  const maxPatternClauses = options.maxPatternClauses ?? 32;
  const maxAggregateAnswerRows = options.maxAggregateAnswerRows ?? 1000;
  if (options.retirementPlan !== undefined && options.retirementPlan !== "paired")
    throw new RangeError("Unsupported QLever retirement source plan");
  if (options.scalarOrderPlan !== undefined && options.scalarOrderPlan !== "live")
    throw new RangeError("Unsupported QLever scalar order source plan");
  if (
    options.negationPlan !== undefined &&
    !["exists", "projected", "minus"].includes(options.negationPlan)
  )
    throw new RangeError("Unsupported QLever negation plan");
  if (
    options.aggregateAnswerPlan !== undefined &&
    !["native", "bounded"].includes(options.aggregateAnswerPlan)
  )
    throw new RangeError("Unsupported aggregate answer plan");
  if (
    options.sourcePlan !== undefined &&
    options.sourcePlan !== "compact" &&
    options.sourcePlan !== "persisted"
  )
    throw new RangeError("Unsupported QLever source plan");
  if (
    options.domainPlan !== undefined &&
    options.domainPlan !== "distinct" &&
    options.domainPlan !== "mask"
  )
    throw new RangeError("Unsupported QLever domain plan");
  if (
    ![
      timeoutMs,
      nativeTimeoutMs,
      maxResponseBytes,
      maxResultRows,
      maxAggregateInputRows,
      maxRecursiveRows,
      maxPatternClauses,
      maxAggregateAnswerRows,
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
          const executionStarted = performance.now();
          let compilationTimeMs = 0;
          const checked = "inner" in input ? assertWrappedQuery(input) : assertDatalogQuery(input);
          const checkedLogical = "inner" in checked ? checked.inner : checked;
          const aggregateAnswers =
            options.aggregateAnswerPlan === "bounded" &&
            checkedLogical.aggregate?.some(([op]) => op === "sum" || op === "avg")
              ? prepareAggregateAnswers(checked, cursorValues)
              : undefined;
          const compile = (compileOptions: Parameters<typeof compileQlever>[2]) => {
            const started = performance.now();
            try {
              return compileQlever(aggregateAnswers?.source ?? input, scopeKey, {
                ...compileOptions,
                ...(aggregateAnswers
                  ? { maxResultRows: Math.min(maxResultRows, maxAggregateAnswerRows) }
                  : {}),
              });
            } finally {
              compilationTimeMs += performance.now() - started;
            }
          };
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
          // EXP-P2Q broker mode (V-P2Q C1, C2, N2): the compiled SPARQL reads only the replica, so inside a
          // transaction the replica's real marker must reach sourceK, and outside it the requested basis, before
          // the query runs; `after` checks the snapshot once the last request has returned. A0 has no gate.
          const gate = options.resolveBasis;
          const snapshot = gate
            ? sourceView
              ? await gate.inTransaction(sourceView.sourcePosition)
              : await gate(basis?.recordedPosition)
            : undefined;
          // [EXP-P2Q] Why: every answer/materialization SELECT needs the broker outage reason.
          // Rejected: classifying the whole run (compiler/validation errors are not transport failures).
          const replicaClient: QleverClient = snapshot
            ? {
                update: (...args) => client.update(...args),
                command: (...args) => client.command(...args),
                cancel: (...args) => client.cancel(...args),
                close: () => client.close(),
                query: async (sparql, requestOptions) => {
                  try {
                    return await client.query(sparql, requestOptions);
                  } catch (cause) {
                    if (!(cause instanceof ReadError) && isUnreachable(cause))
                      throw new ReplicaUnavailable({
                        required: snapshot.basis,
                        observed: snapshot.marker.position,
                        replica: "the QLever replica",
                        surface: "datalog",
                        cause,
                      });
                    throw cause;
                  }
                },
              }
            : client;
          const position =
            snapshot?.basis ??
            sourceView?.sourcePosition ??
            basis?.recordedPosition ??
            safeCount(
              (
                await replicaClient.query(
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
          const runId = logical.rules?.length
            ? await materializeQleverRules(replicaClient, logical, scopeKey, {
                basis: resolved,
                signal,
                maxRows: maxRecursiveRows,
                ...(options.sourcePlan ? { sourcePlan: options.sourcePlan } : {}),
                ...(options.domainPlan ? { domainPlan: options.domainPlan } : {}),
                ...(options.negationPlan ? { negationPlan: options.negationPlan } : {}),
                ...(options.retirementPlan ? { retirementPlan: options.retirementPlan } : {}),
                ...(options.scalarOrderPlan ? { scalarOrderPlan: options.scalarOrderPlan } : {}),
                nativeTimeoutMs,
                maxResponseBytes,
                onCompilation: (duration: number) => {
                  compilationTimeMs += duration;
                },
                ...(sourceView ? { sourceView } : {}),
              })
            : undefined;
          const compileOptions = {
            basis: resolved,
            ...(options.sourcePlan ? { sourcePlan: options.sourcePlan } : {}),
            ...(options.domainPlan ? { domainPlan: options.domainPlan } : {}),
            ...(options.negationPlan ? { negationPlan: options.negationPlan } : {}),
            ...(options.retirementPlan ? { retirementPlan: options.retirementPlan } : {}),
            ...(options.scalarOrderPlan ? { scalarOrderPlan: options.scalarOrderPlan } : {}),
            maxResultRows,
            ...(sourceView ? { sourceView } : {}),
            ...(cursorValues ? { cursorValues } : {}),
            ...(runId ? { runId } : {}),
          };
          let compiled = compile(compileOptions);
          for (const check of compiled.checks)
            if (
              (
                await replicaClient.query(check.sparql, {
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
          if (compiled.familyDomain) {
            const rows = await replicaClient.query(compiled.familyDomain.sparql, {
              signal,
              timeoutMs: nativeTimeoutMs,
              maxResponseBytes,
            });
            for (const [variable, families] of compiled.familyDomain.decode(rows)) {
              const numeric = [...families].filter(
                (family) => family === "number" || family === "integer",
              );
              if (numeric.length > 1)
                throw new DatalogValidationError({
                  query: input,
                  message: `Mixed exact integer and number domain for ${variable} requires an explicit cast`,
                });
              if (numeric.length) numericDomains.set(variable, numeric[0] as NumericDomain);
            }
          }

          for (const probe of compiled.domains) {
            const rows = await replicaClient.query(probe.sparql, {
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
          compiled = compile({ ...compileOptions, numericDomains });
          const raw = await replicaClient.query(compiled.sparql, {
            signal,
            timeoutMs: nativeTimeoutMs,
            maxResponseBytes,
          });
          if (raw.length > maxResultRows)
            throw new RangeError(
              `QLever result exceeds maxResultRows=${maxResultRows}; no partial answer`,
            );
          if (aggregateAnswers && raw.length > maxAggregateAnswerRows)
            throw new RangeError(
              `QLever final aggregate population exceeds maxAggregateAnswerRows=${maxAggregateAnswerRows}; complete groups required before LIMIT; no partial answer`,
            );
          const decoded = raw.map(compiled.decode);
          const normalized = aggregateAnswers?.normalize(decoded);
          const results = normalized?.results ?? decoded;
          let totalCount: number | undefined;
          if (normalized && "totalCount" in normalized) totalCount = normalized.totalCount;
          if (compiled.countSparql)
            totalCount = safeCount(
              (
                await replicaClient.query(compiled.countSparql, {
                  signal,
                  timeoutMs: nativeTimeoutMs,
                  maxResponseBytes,
                })
              )[0]?.["total"]?.value,
            );
          if (gate && snapshot) await gate.after(snapshot);
          const executionTimeMs = Math.max(
            0,
            performance.now() - executionStarted - compilationTimeMs,
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
                    queryPlan: {
                      ...plan(compiled),
                      steps: [
                        ...plan(compiled).steps,
                        ...(aggregateAnswers
                          ? [
                              {
                                label: "charged bounded final aggregate answers",
                                query: `Complete decoded native GROUP outputs=${decoded.length}; row cap=${maxAggregateAnswerRows}; response byte cap=${maxResponseBytes}; host applies inner order/offset/limit then wrapper filters/count/order/cursor/limit. No source rows evaluated in host.`,
                              },
                            ]
                          : []),
                      ],
                    },
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
        const aggregateAnswers =
          options.aggregateAnswerPlan === "bounded" &&
          logical.aggregate?.some(([op]) => op === "sum" || op === "avg")
            ? prepareAggregateAnswers(input)
            : undefined;
        const compiled = compileQlever(aggregateAnswers?.source ?? input, scopeKey, {
          basis: { validAt: Date.now(), recordedPosition: 0 },
          ...(options.sourcePlan ? { sourcePlan: options.sourcePlan } : {}),
          ...(options.domainPlan ? { domainPlan: options.domainPlan } : {}),
          ...(options.negationPlan ? { negationPlan: options.negationPlan } : {}),
          ...(options.retirementPlan ? { retirementPlan: options.retirementPlan } : {}),
          ...(options.scalarOrderPlan ? { scalarOrderPlan: options.scalarOrderPlan } : {}),
          ...(logical.rules?.length ? { runId: "<query-run>" } : {}),
          ...(aggregateAnswers
            ? { maxResultRows: Math.min(maxResultRows, maxAggregateAnswerRows) }
            : {}),
        });
        return {
          queryPlan: {
            ...plan(compiled),
            steps: [
              ...plan(compiled).steps,
              ...(aggregateAnswers
                ? [
                    {
                      label: "charged bounded final aggregate answers",
                      query: `Complete decoded GROUP outputs required before LIMIT; maxAggregateAnswerRows=${maxAggregateAnswerRows}; response byte cap=${maxResponseBytes}; final answer order/filter/count/cursor/page executes in adapter. No ordinary facts loaded into host.`,
                    },
                  ]
                : []),
            ],
          },
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

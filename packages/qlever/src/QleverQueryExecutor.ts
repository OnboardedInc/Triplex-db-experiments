import { resolveQleverBasis } from "./RecordCut.js";
import { Effect } from "effect";
import { readOnlyQleverClient } from "./ReadOnlyClient.js";
import {
  assertDatalogQuery,
  assertWrappedQuery,
  DatalogValidationError,
  toReadError,
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
import type { QleverClient } from "./QleverClient.js";
import type { QleverDomainPlan } from "./FamilyDomains.js";
import type { QleverSourcePlan } from "./ScalarSource.js";
import { evaluateQleverRules, placeholderQleverRuleRelations } from "./recursion.js";
import { prepareAggregateAnswers } from "./AggregateAnswers.js";

export interface QleverQueryOptions {
  readonly sourceView?: Effect.Effect<QleverSourceView | undefined>;
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
const fail = (cause: unknown) =>
  cause instanceof DatalogValidationError || cause instanceof UnboundVariableError
    ? cause
    : toReadError(cause, `QLever Datalog execution failed: ${String(cause)}`);
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
const queryExecutor = (
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
          const resolved: QleverBasis = sourceView
            ? { validAt: basis?.validAt ?? Date.now(), recordedPosition: sourceView.sourcePosition }
            : await resolveQleverBasis(client, scopeKey, basis ?? { validAt: Date.now() }, signal);
          // [EXP-C8] Rules are evaluated with SPARQL reads only (recursion.ts); no update.
          const ruleRelations = logical.rules?.length
            ? await evaluateQleverRules(client, logical, scopeKey, {
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
            ...(ruleRelations ? { ruleRelations } : {}),
          };
          let compiled = compile(compileOptions);
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
          if (compiled.familyDomain) {
            const rows = await client.query(compiled.familyDomain.sparql, {
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
          compiled = compile({ ...compileOptions, numericDomains });
          const raw = await client.query(compiled.sparql, {
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
                await client.query(compiled.countSparql, {
                  signal,
                  timeoutMs: nativeTimeoutMs,
                  maxResponseBytes,
                })
              )[0]?.["total"]?.value,
            );
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
          ...(logical.rules?.length
            ? { ruleRelations: placeholderQleverRuleRelations(logical) }
            : {}),
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

// [EXP-C8] Read entry point: the shared client is handed over as a write-refusing view
// (ReadOnlyClient.ts), so no read path can reach the engine with a write.
export const makeQleverQueryExecutor = (
  client: QleverClient,
  scopeKey: string,
  options: QleverQueryOptions = {},
): QueryExecutorService => queryExecutor(readOnlyQleverClient(client), scopeKey, options);

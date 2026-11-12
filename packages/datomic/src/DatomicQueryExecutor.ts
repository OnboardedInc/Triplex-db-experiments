import { traceSync } from "./tracing.js";
import { readFailure } from "./readErrors.js";
import { databaseName } from "./scopeName.js";
import { Effect } from "effect";
import { integer, type ResolvedTemporalBasis } from "@triplex-build/triplex";
import {
  assertDatalogQuery,
  assertWrappedQuery,
  ReadError,
  DatalogValidationError,
  UnboundVariableError,
  type QueryExecutorService,
  type QueryContext,
  type QueryPlan,
} from "@triplex-build/triplex/runtime";
import type { DatalogQuery } from "@triplex-build/triplex/datalog";
import { isVariable } from "@triplex-build/triplex/datalog";
import { DatomicClient } from "./DatomicClient.js";
import { validateTagged, type TaggedValue } from "./codec.js";
import { CurrentTransactions, DatomicOptimisticRestart } from "./TransactionContext.js";
import { compileDatomic } from "./compiler.js";
import { stagedInput } from "./protocol.js";
import { finish, page } from "./kernel.js";
import { assertionValue } from "./rows.js";

const decode = (wire: TaggedValue): QueryContext[string] => {
  const value = validateTagged(wire);
  return value.t === "long" ? integer(String(value.v)) : (value.v as QueryContext[string]);
};
// [EXP-DA01] Why: native joins return fact witnesses; bounded TS postprocessing retains bag/exact semantics. Rejected: native floating aggregates.
export function makeDatomicQueryExecutor(
  client: DatomicClient,
  scopeKey: string,
): QueryExecutorService {
  const db = databaseName(scopeKey);
  const source = Effect.map(CurrentTransactions, (transactions) =>
    [...transactions.values()].find((s) => s.client === client && s.scopeKey === scopeKey),
  );
  const run = (query: DatalogQuery, basis?: ResolvedTemporalBasis) =>
    Effect.gen(function* () {
      const checked = yield* Effect.try({
        try: () => assertDatalogQuery(query),
        catch: (cause) =>
          cause instanceof DatalogValidationError || cause instanceof UnboundVariableError
            ? cause
            : new ReadError({ message: "Invalid Datomic query", cause }),
      });
      const state = yield* source;
      if (state?.optimistic) {
        state.restart.needed = true;
        return yield* Effect.fail(
          new DatomicOptimisticRestart({ message: "Datalog requires a pinned snapshot" }),
        );
      }
      if (state) state.scopeWide = true;
      const requested = basis ?? { validAt: Date.now() };
      const started = Date.now();
      return yield* Effect.tryPromise({
        try: async () => {
          const snapshot = state ? undefined : await client.begin(db, requested);
          try {
            // [EXP-DA01] Why: all rule rounds, the final query and optional pulls share one immutable source and frozen overlay (Q89d). Rejected: syncing to latest for each subrequest.
            const handle = state?.handle ?? snapshot!.handle;
            const cut = {
              ...requested,
              recordedPosition: requested.recordedPosition ?? state?.position ?? snapshot!.position,
            };
            const staged =
              state && (state.rows.size || state.position !== state.sourceK)
                ? stagedInput(state)
                : undefined;
            const pin = { handle, ...(staged ? { staged } : {}) };
            const relations: string[][] = [];
            const evaluate = async (q: DatalogQuery): Promise<QueryContext[]> => {
              if (Date.now() - started > 30000)
                throw new RangeError("Datomic query deadline exceeded");
              const compiled = traceSync("client.query-planning", () => compileDatomic(q, cut));
              const wire = await client.request<{ rows: TaggedValue[][] }>(
                "POST",
                `/v1/db/${db}/q`,
                {
                  edn: compiled.edn,
                  basis: cut,
                  relations,
                  timeoutMs: Math.max(1, 30000 - (Date.now() - started)),
                  ...pin,
                },
              );
              return wire.rows.map((row) =>
                Object.fromEntries(compiled.variables.map((v, i) => [v, decode(row[i]!)])),
              );
            };
            // Adapt the existing XTDB/QLever bounded binary frontier contract, without recursive Datomic rules.
            const rules = checked.rules ?? [];
            if (rules.length) {
              const seen = new Set<string>();
              const names = new Set(rules.map((r) => r.name));
              const maxDepth = Math.max(...rules.map((r) => r.maxDepth ?? 100));
              for (let depth = 0; depth < maxDepth; depth++) {
                const additions: string[][] = [];
                for (const rule of rules) {
                  if (depth >= (rule.maxDepth ?? 100)) continue;
                  let first: string | undefined, last: string | undefined;
                  for (const c of rule.body) {
                    if (names.has(String(c[0])) && !String(c[1]).startsWith(":")) {
                      if (!first && isVariable(c[1])) first = c[1];
                      if (isVariable(c[2])) last = c[2];
                    } else {
                      if (!first && isVariable(c[0])) first = c[0];
                      if (isVariable(c[2])) last = c[2];
                    }
                  }
                  if (!first || !last) throw new TypeError("Rule has no binary identity endpoints");
                  const rows = await evaluate({
                    find: [...new Set([first, last])],
                    where: rule.body,
                    rules,
                  });
                  for (const row of rows) {
                    const a = row[first],
                      b = row[last];
                    if (typeof a !== "string" || typeof b !== "string") continue;
                    const tuple = [rule.name, a, b],
                      key = JSON.stringify(tuple);
                    if (!seen.has(key)) {
                      seen.add(key);
                      additions.push(tuple);
                    }
                    if (seen.size > 100000)
                      throw new RangeError("Recursive relation budget exceeded");
                  }
                }
                if (!additions.length) break;
                relations.push(...additions);
              }
            }
            let results = await evaluate(checked);
            if (checked.optionalProjection) {
              const optional = checked.optionalProjection;
              const entities = new Map<string, Record<string, QueryContext[string]>>();
              for (const row of results) {
                const entity = row[optional.rowBinding];
                if (typeof entity !== "string") continue;
                if (!entities.has(entity)) {
                  const response = await client.rows(db, {
                    pattern: { entityId: entity },
                    basis: cut,
                    ...pin,
                  });
                  const fields: Record<string, QueryContext[string]> = {};
                  for (const field of optional.fields) {
                    const fact = response.find((r) => r.attribute === field.attribute);
                    const value = fact ? assertionValue(fact) : undefined;
                    fields[field.variable] =
                      value === undefined
                        ? null
                        : value.type === "integer"
                          ? value
                          : value.type === "json"
                            ? JSON.stringify(value.value)
                            : value.value;
                  }
                  entities.set(entity, fields);
                }
              }
              results = results.map((row) => ({
                ...row,
                ...entities.get(String(row[optional.rowBinding])),
              }));
            }
            if (Date.now() - started > 30000)
              throw new RangeError("Datomic postprocessing deadline exceeded");
            return { results: finish(checked, results) };
          } finally {
            if (snapshot) await client.release(db, snapshot.handle);
          }
        },
        catch: (cause) =>
          cause instanceof DatalogValidationError
            ? cause
            : readFailure(cause, "Datomic Datalog failed"),
      });
    });
  const explain = (query: DatalogQuery): QueryPlan => ({
    backend: "datomic-datalog",
    steps: [
      {
        label: "native fact-entity join with support witnesses",
        query: traceSync("client.query-explain", () => compileDatomic(query, { validAt: 0 })).edn,
      },
    ],
  });
  return {
    execute: (query, _debug, basis) => run(query, basis),
    executePage: (input, _debug, basis, cursor) =>
      Effect.gen(function* () {
        const query = yield* Effect.try({
          try: () => assertWrappedQuery(input),
          catch: (cause) =>
            cause instanceof DatalogValidationError || cause instanceof UnboundVariableError
              ? cause
              : new ReadError({ message: "Invalid wrapped query", cause }),
        });
        const result = yield* run(query.inner, basis);
        return page(query, result.results, cursor);
      }),
    explain: (query) =>
      Effect.try({
        try: () => ({ queryPlan: explain(assertDatalogQuery(query)) }),
        catch: (cause) =>
          cause instanceof DatalogValidationError || cause instanceof UnboundVariableError
            ? cause
            : new ReadError({ message: "Cannot explain Datomic query", cause }),
      }),
    explainPage: (query) =>
      Effect.try({
        try: () => ({ queryPlan: explain(assertWrappedQuery(query).inner) }),
        catch: (cause) =>
          cause instanceof DatalogValidationError || cause instanceof UnboundVariableError
            ? cause
            : new ReadError({ message: "Cannot explain Datomic page", cause }),
      }),
  };
}

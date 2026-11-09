import { resolveQleverBasis } from "./RecordCut.js";
import { Effect } from "effect";
import { readOnlyQleverClient } from "./ReadOnlyClient.js";
import { isPatternClause, type Clause, type DatalogQuery } from "@triplex-build/triplex/datalog";
import {
  assertDatalogQuery,
  DatalogValidationError,
  ReadError,
  toReadError,
  type QueryContext,
} from "@triplex-build/triplex/runtime";
import type { QleverClient } from "./QleverClient.js";
import { makeQleverQueryExecutor, type QleverQueryOptions } from "./QleverQueryExecutor.js";
import {
  canonicalJson,
  fieldIri as f,
  graphIri,
  literal as lit,
  metaIri,
  numericOrderKey as order,
  numericFromOrderKey,
} from "./rdf.js";

export interface QleverIntervalQueryOptions {
  readonly from: number;
  readonly to: number;
  readonly recordedPosition?: number;
  readonly recordedAt?: number;
  readonly maxRows?: number;
  readonly maxSpans?: number;
  /** Total decoded point-answer rows across all elementary spans. */
  readonly maxSpanAnswerRows?: number;
  readonly timeoutMs?: number;
}
export interface QleverIntervalBinding {
  readonly bindings: QueryContext;
  readonly validFrom: number;
  readonly validTo: number;
}
const checkedTime = (value: number, name: string) => {
  if (!Number.isFinite(value) || value < 0)
    throw new RangeError(`${name} must be a finite nonnegative Triplex instant`);
};
const dependencies = (where: unknown) => {
  const fixed = new Set<string>();
  let dynamic = false;
  const walk = (input: unknown) => {
    if (!Array.isArray(input)) return;
    if (isPatternClause(input as unknown as Clause) && typeof input[1] === "string") {
      if (input[1].startsWith(":")) fixed.add(input[1]);
      else if (input[1].startsWith("?")) dynamic = true;
    }
    input.forEach(walk);
  };
  walk(where);
  return { fixed: [...fixed], dynamic };
};

/**
 * Bounded baseline: QLever discovers only temporal boundaries, then executes
 * the unchanged Datalog AST at each span under one logical source cut.
 * Host coalescing sees only bounded final bindings, never source fact sets.
 */
const temporalQueries = (
  client: QleverClient,
  scopeKey: string,
  queryLimits: Omit<QleverQueryOptions, "sourceView"> = {},
) => ({
  queryIntervals: (
    query: DatalogQuery,
    options: QleverIntervalQueryOptions,
  ): Effect.Effect<readonly QleverIntervalBinding[], ReadError | DatalogValidationError> =>
    Effect.tryPromise({
      try: async (effectSignal) => {
        assertDatalogQuery(query);
        checkedTime(options.from, "from");
        checkedTime(options.to, "to");
        if (options.recordedAt !== undefined) checkedTime(options.recordedAt, "recordedAt");
        if (options.from >= options.to) throw new RangeError("Interval window must have from < to");
        if (query.rules?.length)
          throw new DatalogValidationError({
            query,
            message: "QLever recursive interval answers are not yet qualified",
          });
        if (query.limit !== undefined || query.offset !== undefined)
          throw new DatalogValidationError({
            query,
            message:
              "Interval queries require a complete logical relation; use maxRows for the complete interval answer budget",
          });
        if (!query.find.length)
          throw new DatalogValidationError({
            query,
            message: "An interval query must project at least one binding",
          });
        const maxRows = options.maxRows ?? 1000,
          maxSpans = options.maxSpans ?? 1000,
          maxSpanRows = options.maxSpanAnswerRows ?? 100000,
          timeoutMs = options.timeoutMs ?? 30000;
        if (
          ![maxRows, maxSpans, maxSpanRows].every(
            (value) => Number.isSafeInteger(value) && value > 0 && value <= 100000,
          )
        )
          throw new RangeError("Interval row/span budgets must be integers from1 through100000");
        if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1)
          throw new RangeError("Invalid interval deadline");
        const signal = AbortSignal.any([effectSignal, AbortSignal.timeout(timeoutMs)]),
          graph = graphIri(scopeKey);
        await resolveQleverBasis(
          client,
          scopeKey,
          {
            validAt: options.from,
            ...(options.recordedAt === undefined ? {} : { recordedAt: options.recordedAt }),
            ...(options.recordedPosition === undefined
              ? {}
              : { recordedPosition: options.recordedPosition }),
          },
          signal,
        );
        const cuts = await client.query(
          `SELECT ?position WHERE { GRAPH ${graph} { ${metaIri} ${f("position")} ?position } }`,
          { signal },
        );
        const latest = Number(cuts[0]?.["position"]?.value ?? 0),
          recordedPosition = options.recordedPosition ?? latest;
        if (
          !Number.isSafeInteger(recordedPosition) ||
          recordedPosition < 0 ||
          recordedPosition > latest
        )
          throw new RangeError("recordedPosition must identify an existing committed source cut");
        const attrs = dependencies(query.where);
        for (const field of query.optionalProjection?.fields ?? [])
          if (!attrs.fixed.includes(field.attribute)) attrs.fixed.push(field.attribute);
        const base = `?s ${f("attribute")} ?attribute ; ${f("recorded_position_order")} ?recorded ; ${f("recorded_at_order")} ?recordedTime ; ${f("valid_from_order")} ?from . OPTIONAL { ?s ${f("valid_to_order")} ?to } OPTIONAL { ?s ${f("retracted_position_order")} ?retracted ; ${f("retracted_at_order")} ?retractedTime } ${!attrs.dynamic && attrs.fixed.length ? `VALUES ?attribute { ${attrs.fixed.map(lit).join(" ")} }` : ""} FILTER(?recorded <= ${lit(order(recordedPosition))}${options.recordedAt === undefined ? "" : ` && ?recordedTime <= ${lit(order(options.recordedAt))}`}) FILTER(!BOUND(?retracted) || ?retracted > ${lit(order(recordedPosition))}${options.recordedAt === undefined ? "" : ` || ?retractedTime > ${lit(order(options.recordedAt))}`}) FILTER(?from < ${lit(order(options.to))} && (!BOUND(?to) || ?to > ${lit(order(options.from))}))`;
        const boundaries = await client.query(
          `SELECT DISTINCT ?cut WHERE { GRAPH ${graph} { ${base} { ?s ${f("valid_from_order")} ?cut } UNION { ?s ${f("valid_to_order")} ?cut } FILTER(?cut > ${lit(order(options.from))} && ?cut < ${lit(order(options.to))}) } } ORDER BY ?cut LIMIT ${maxSpans}`,
          { signal },
        );
        if (boundaries.length >= maxSpans)
          throw new ReadError({
            message: `QLever interval query exceeds maxSpans=${maxSpans}; no partial answer returned`,
          });
        const instants = [
          options.from,
          ...boundaries.map((row) => numericFromOrderKey(row["cut"]!.value)),
          options.to,
        ].sort((a, b) => a - b);
        const executor = makeQleverQueryExecutor(client, scopeKey, {
          ...queryLimits,
          timeoutMs,
          maxResultRows: maxSpanRows,
        });
        const intervals: QleverIntervalBinding[] = [],
          last = new Map<string, QleverIntervalBinding>();
        let decodedRows = 0;
        for (let index = 0; index < instants.length - 1; index++) {
          signal.throwIfAborted();
          const from = instants[index]!,
            to = instants[index + 1]!;
          const result = await Effect.runPromise(
            executor.execute(query, false, {
              validAt: from,
              recordedPosition,
              ...(options.recordedAt === undefined ? {} : { recordedAt: options.recordedAt }),
            }),
            { signal },
          );
          decodedRows += result.results.length;
          if (decodedRows > maxSpanRows)
            throw new ReadError({
              message: `QLever interval intermediate answers exceed maxSpanAnswerRows=${maxSpanRows}; no partial answer returned`,
            });
          for (const bindings of result.results) {
            const key = canonicalJson(bindings),
              previous = last.get(key);
            if (previous && previous.validTo === from) {
              const merged = {
                bindings: previous.bindings,
                validFrom: previous.validFrom,
                validTo: to,
              };
              intervals[intervals.indexOf(previous)] = merged;
              last.set(key, merged);
            } else {
              const interval = { bindings, validFrom: from, validTo: to };
              intervals.push(interval);
              last.set(key, interval);
              if (intervals.length > maxRows)
                throw new ReadError({
                  message: `QLever interval query exceeds maxRows=${maxRows}; no partial answer returned`,
                });
            }
          }
        }
        return intervals.sort(
          (a, b) =>
            a.validFrom - b.validFrom ||
            a.validTo - b.validTo ||
            canonicalJson(a.bindings).localeCompare(canonicalJson(b.bindings)),
        );
      },
      catch: (cause) =>
        cause instanceof DatalogValidationError
          ? cause
          : toReadError(cause, "QLever interval query failed"),
    }),
});

// [EXP-C8] Read entry point: the shared client is handed over as a write-refusing view
// (ReadOnlyClient.ts), so no read path can reach the engine with a write.
export const makeQleverTemporalQueries = (
  client: QleverClient,
  scopeKey: string,
  queryLimits: Omit<QleverQueryOptions, "sourceView"> = {},
) => temporalQueries(readOnlyQleverClient(client), scopeKey, queryLimits);

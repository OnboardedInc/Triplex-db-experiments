import { createHash } from "node:crypto";
import { Effect } from "effect";
import type { DatalogQuery } from "@triplex-build/triplex/datalog";
import { ReadError, type QueryContext } from "@triplex-build/triplex/runtime";
import type { XtdbClient } from "./XtdbClient.js";
import { canonicalJson } from "./codecs.js";
import { compileXtdb, type QueryBasis } from "./query/compiler.js";
import { materializeRules } from "./query/recursion.js";
import { decodeQueryRow } from "./XtdbQueryExecutor.js";
import { resolveIntegerVariables } from "./query/domains.js";

export interface MaintainedQueryOptions {
  readonly validAt: number;
  readonly recordedPosition?: number;
  readonly recordedAt?: number;
  readonly maxRows?: number;
  readonly timeoutMs?: number;
}

export interface MaintainedQueryResult {
  readonly results: readonly QueryContext[];
  readonly generation: string;
  readonly sourcePosition: number;
  readonly reused: boolean;
  readonly strategy: "complete-generation-rebuild";
}

const identifier = (value: string) => `"${value.replaceAll('"', '""')}"`;
const epoch = "TIMESTAMP WITH TIME ZONE '1970-01-01T00:00:00Z'";
const resultColumns = (compiled: ReturnType<typeof compileXtdb>) => [
  ...new Set(
    [...compiled.columnMap.keys()].flatMap((column) => {
      const typed = compiled.valueColumnMap.get(column);
      return typed ? [column, typed.type, typed.string, typed.number, typed.boolean] : [column];
    }),
  ),
];

/**
 * Persistent, complete generations over the Triplex AST. A generation is reusable
 * only at its exact source/schema/program/time identity. This initial strategy
 * rebuilds after source changes, preserving alternate support without pretending
 * that incremental recursive maintenance has been qualified.
 */
export const makeXtdbMaintainedQueries = (client: XtdbClient, scopeKey: string) => {
  let initialized: Promise<unknown> | undefined;
  const initialize = () =>
    (initialized ??= client
      .submit([
        {
          sql: "CREATE TABLE tx_query_generations (_id, scope_key, generation, source_position, row_count, valid_at, recorded_at, strategy)",
        },
        { sql: "CREATE TABLE tx_query_members (_id, scope_key, generation, ordinal)" },
      ])
      .catch((error: unknown) => {
        initialized = undefined;
        throw error;
      }));

  return {
    query: (
      query: DatalogQuery,
      options: MaintainedQueryOptions,
    ): Effect.Effect<MaintainedQueryResult, ReadError> =>
      Effect.tryPromise({
        try: async (signal) => {
          if (!Number.isFinite(options.validAt) || options.validAt < 0)
            throw new RangeError("validAt must be a finite nonnegative Triplex instant");
          if (
            options.recordedAt !== undefined &&
            (!Number.isFinite(options.recordedAt) || options.recordedAt < 0)
          )
            throw new RangeError("Invalid recordedAt");
          const maxRows = options.maxRows ?? 10_000;
          if (!Number.isSafeInteger(maxRows) || maxRows < 1 || maxRows > 100_000)
            throw new RangeError("maxRows must be between 1 and 100000");
          const deadline = { signal, timeoutMs: options.timeoutMs ?? 30_000 };
          // Validate before initialization or source reads.
          compileXtdb(query, scopeKey, { basis: { validAt: options.validAt }, runId: "preflight" });
          await initialize();
          const positions = await client.query<{ position: unknown }>(
            "SELECT MAX(position) AS position FROM tx_meta FOR ALL VALID_TIME WHERE scope_key = ?",
            [scopeKey],
            undefined,
            deadline,
          );
          const sourcePosition = options.recordedPosition ?? Number(positions[0]?.position ?? 0);
          if (
            !Number.isSafeInteger(sourcePosition) ||
            sourcePosition < 0 ||
            sourcePosition > Number(positions[0]?.position ?? 0)
          )
            throw new RangeError("Source position must identify an existing committed cut");
          const basis: QueryBasis = {
            validAt: options.validAt,
            recordedPosition: sourcePosition,
            ...(options.recordedAt === undefined ? {} : { recordedAt: options.recordedAt }),
          };
          const generation = createHash("sha256")
            .update(
              canonicalJson({
                v: 4,
                compiler: "xtdb-triplex-generation-v4",
                scope: scopeKey,
                query,
                basis,
              }),
            )
            .digest("hex");
          const header = await client.query<{ row_count: unknown }>(
            "SELECT row_count FROM tx_query_generations FOR ALL VALID_TIME WHERE scope_key = ? AND generation = ?",
            [scopeKey, generation],
            undefined,
            deadline,
          );
          const reused = header.length > 0;
          const nonIntegerProjectionVariables: string[] = [];
          const integerVariables = await resolveIntegerVariables(client, scopeKey, query, basis, {
            signal,
            onNonIntegerProjection: variable => nonIntegerProjectionVariables.push(variable),
          });
          let compiled = compileXtdb(query, scopeKey, {
            nonIntegerProjectionVariables,
            basis,
            runId: "metadata",
            integerVariables,
          });
          let columns = resultColumns(compiled);
          if (!reused) {
            const runId = query.rules?.length
              ? await materializeRules(client, query, scopeKey, basis, signal)
              : undefined;
            compiled = compileXtdb(query, scopeKey, {
              nonIntegerProjectionVariables,
              basis,
              ...(runId ? { runId } : {}),
              integerVariables,
            });
            const count = await client.query<{ total: unknown }>(
              `SELECT COUNT(*) AS total FROM (${compiled.sql}) source`,
              compiled.params,
              undefined,
              deadline,
            );
            const rowCount = Number(count[0]?.total ?? 0);
            if (!Number.isSafeInteger(rowCount) || rowCount > maxRows)
              throw new ReadError({
                message: `Maintained generation exceeds maxRows=${maxRows}; publication refused`,
              });
            columns = resultColumns(compiled);
            const projected = columns.map(identifier);
            if (!projected.length)
              throw new Error("Maintained query requires at least one projection");
            const values = [...compiled.params];
            const p = (value: unknown) => {
              values.push(value);
              return `$${values.length}`;
            };
            const key = p(`${scopeKey}/${generation}/`),
              scope = p(scopeKey),
              gen = p(generation);
            const orderedVariables = [
              ...(query.orderBy ?? []),
              ...query.find
                .filter(
                  (variable): variable is string =>
                    typeof variable === "string" &&
                    variable.startsWith("?") &&
                    !query.orderBy?.some((item) => item.variable === variable),
                )
                .map((variable) => ({ variable, direction: "asc" as const })),
            ];
            const orderParts = orderedVariables.flatMap(({ variable, direction = "asc" }) => {
              const typed = compiled.valueColumnMap.get(variable);
              return typed
                ? [
                    `r.${identifier(typed.category)} ASC`,
                    ...[typed.orderInteger, typed.orderNumber, typed.boolean, typed.orderText]
                      .filter((column): column is string => column !== undefined)
                      .map((column) => `r.${identifier(column)} ${direction}`),
                  ]
                : [
                    `${compiled.integerColumns?.has(variable) ? `CAST(r.${identifier(variable)} AS DECIMAL)` : `r.${identifier(variable)}`} ${direction} NULLS LAST`,
                  ];
            });
            const order = orderParts.length
              ? orderParts.join(", ")
              : projected.map((column) => `r.${column}`).join(", ");
            const ordinal = `ROW_NUMBER() OVER (ORDER BY ${order})`;
            const statements =
              rowCount === 0
                ? []
                : [
                    {
                      sql: `INSERT INTO tx_query_members (_id, scope_key, generation, ordinal, ${columns.map((_column, index) => `binding_${index}`).join(", ")}, _valid_from)
              SELECT ${key} || CAST(q.cache_ordinal AS TEXT), ${scope}, ${gen}, q.cache_ordinal, ${projected.map((column, index) => (compiled.integerColumns?.has(columns[index]!) ? `CAST(q.${column} AS TEXT)` : `q.${column}`)).join(", ")}, ${epoch}
              FROM (SELECT r.*, ${ordinal} AS cache_ordinal FROM (${compiled.sql}) r) q`,
                      params: values,
                    },
                  ];
            statements.push({
              sql: `INSERT INTO tx_query_generations (_id, scope_key, generation, source_position, row_count, valid_at, recorded_at, strategy, _valid_from)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ${epoch})`,
              params: [
                `${scopeKey}/${generation}`,
                scopeKey,
                generation,
                sourcePosition,
                rowCount,
                options.validAt,
                options.recordedAt ?? null,
                "complete-generation-rebuild",
              ],
            });
            signal.throwIfAborted();
            await client.submit(statements);
          } else if (Number(header[0]?.row_count) > maxRows)
            throw new ReadError({
              message: `Retained generation exceeds requested maxRows=${maxRows}`,
            });
          const projection = columns
            .map(
              (column, index) =>
                `${compiled.integerColumns?.has(column) ? `CAST(binding_${index} AS TEXT)` : `binding_${index}`} AS ${identifier(column)}`,
            )
            .join(", ");
          const rows = await client.query(
            `SELECT ${projection} FROM tx_query_members FOR ALL VALID_TIME WHERE scope_key = ? AND generation = ? ORDER BY ordinal LIMIT ${maxRows + 1}`,
            [scopeKey, generation],
            undefined,
            deadline,
          );
          if (rows.length > maxRows)
            throw new ReadError({
              message: "Maintained result limit exceeded; no partial results returned",
            });
          return {
            results: rows.map((row) => decodeQueryRow(row, compiled)),
            generation,
            sourcePosition,
            reused,
            strategy: "complete-generation-rebuild" as const,
          };
        },
        catch: (cause) =>
          cause instanceof ReadError
            ? cause
            : new ReadError({ message: "XTDB maintained query failed", cause }),
      }),
  };
};

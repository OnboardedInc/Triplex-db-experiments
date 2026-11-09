import { resolveXtdbBasis } from "./RecordCut.js";
import { createHash } from "node:crypto";
import { readOnlyXtdbClient } from "./ReadOnlyClient.js";
import { Effect } from "effect";
import type { DatalogQuery } from "@triplex-build/triplex/datalog";
import { ReadError, BasisNotAvailable, type QueryContext } from "@triplex-build/triplex/runtime";
import type { XtdbClient } from "./XtdbClient.js";
import { canonicalJson } from "./codecs.js";
import { compileXtdb, type QueryBasis } from "./query/compiler.js";
import { evaluateRules, placeholderRuleRelations, type RuleRelations } from "./query/recursion.js";
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
  /** True when the answer was read from a retained, published generation. */
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
 *
 * [EXP-C8] Why the split: `query()` used to create the cache tables and publish a missing
 * generation from inside the read call (R10 finding 10, 6.9: "a write-path cache wearing a read
 * API"), so a read could commit. Contract C8 says reads never mutate, so `query()` is now
 * read-only: it returns a retained generation when one is published (`reused: true`) and
 * otherwise evaluates the same query directly at the same basis, in the same order, without
 * publishing (`reused: false`). Publishing is the explicit write-path call `publish()`, which an
 * owner runs outside read traffic (for example from the change feed). The answers of the two
 * paths are the same rows in the same order (packages/xtdb/test/maintained.test.ts).
 */
const maintainedQueries = (client: XtdbClient, scopeKey: string) => {
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

  /** Everything both paths share: validation, the basis, the generation identity, the plan. */
  const prepare = async (
    query: DatalogQuery,
    options: MaintainedQueryOptions,
    signal: AbortSignal,
  ) => {
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
    // Validate before any source read.
    compileXtdb(query, scopeKey, {
      basis: { validAt: options.validAt },
      ruleRelations: placeholderRuleRelations(query),
    });
    await resolveXtdbBasis(
      client,
      scopeKey,
      {
        validAt: options.validAt,
        ...(options.recordedAt === undefined ? {} : { recordedAt: options.recordedAt }),
        ...(options.recordedPosition === undefined
          ? {}
          : { recordedPosition: options.recordedPosition }),
      },
      signal,
    );
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
    const nonIntegerProjectionVariables: string[] = [];
    const integerVariables = await resolveIntegerVariables(client, scopeKey, query, basis, {
      signal,
      onNonIntegerProjection: (variable) => nonIntegerProjectionVariables.push(variable),
    });
    const compileWith = (ruleRelations: RuleRelations | undefined) =>
      compileXtdb(query, scopeKey, {
        nonIntegerProjectionVariables,
        basis,
        ...(ruleRelations ? { ruleRelations } : {}),
        integerVariables,
      });
    /** The complete answer, evaluated with reads only (rules via recursion.ts evaluateRules). */
    const evaluate = async () =>
      compileWith(
        query.rules?.length
          ? await evaluateRules(client, query, scopeKey, basis, signal)
          : undefined,
      );
    const order = (compiled: ReturnType<typeof compileXtdb>, columns: readonly string[]) => {
      const projected = columns.map(identifier);
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
      return orderParts.length
        ? orderParts.join(", ")
        : projected.map((column) => `r.${column}`).join(", ");
    };
    // Column metadata for a retained generation; placeholder relations are never executed.
    const placeholder = query.rules?.length ? placeholderRuleRelations(query) : undefined;
    return {
      maxRows,
      deadline,
      sourcePosition,
      generation,
      compileWith,
      evaluate,
      order,
      placeholder,
    };
  };

  /** Read-only lookup of a published generation's header. */
  const header = async (
    generation: string,
    deadline: { signal: AbortSignal; timeoutMs: number },
  ) => {
    // XTDB 2.2.0 errors on an unknown table, and creating it would be a write: ask the catalog.
    const tables = await client.query<{ table_name: unknown }>(
      "SELECT table_name FROM information_schema.tables WHERE table_name IN ('tx_query_generations', 'tx_query_members')",
      [],
      undefined,
      deadline,
    );
    if (tables.length < 2) return undefined;
    const rows = await client.query<{ row_count: unknown }>(
      "SELECT row_count FROM tx_query_generations FOR ALL VALID_TIME WHERE scope_key = ? AND generation = ?",
      [scopeKey, generation],
      undefined,
      deadline,
    );
    return rows[0];
  };

  const readMembers = async (
    prepared: Awaited<ReturnType<typeof prepare>>,
    rowCount: number,
  ): Promise<MaintainedQueryResult> => {
    if (rowCount > prepared.maxRows)
      throw new ReadError({
        message: `Retained generation exceeds requested maxRows=${prepared.maxRows}`,
      });
    const compiled = prepared.compileWith(prepared.placeholder);
    const columns = resultColumns(compiled);
    const projection = columns
      .map(
        (column, index) =>
          `${compiled.integerColumns?.has(column) ? `CAST(binding_${index} AS TEXT)` : `binding_${index}`} AS ${identifier(column)}`,
      )
      .join(", ");
    const rows = await client.query(
      `SELECT ${projection} FROM tx_query_members FOR ALL VALID_TIME WHERE scope_key = ? AND generation = ? ORDER BY ordinal LIMIT ${prepared.maxRows + 1}`,
      [scopeKey, prepared.generation],
      undefined,
      prepared.deadline,
    );
    if (rows.length > prepared.maxRows)
      throw new ReadError({
        message: "Maintained result limit exceeded; no partial results returned",
      });
    return {
      results: rows.map((row) => decodeQueryRow(row, compiled)),
      generation: prepared.generation,
      sourcePosition: prepared.sourcePosition,
      reused: true,
      strategy: "complete-generation-rebuild" as const,
    };
  };
  const failure = (cause: unknown) =>
    cause instanceof BasisNotAvailable || cause instanceof ReadError
      ? cause
      : new ReadError({ message: "XTDB maintained query failed", cause });

  return {
    /** Read-only (contract C8): a published generation, or the same answer evaluated directly. */
    query: (
      query: DatalogQuery,
      options: MaintainedQueryOptions,
    ): Effect.Effect<MaintainedQueryResult, ReadError> =>
      Effect.tryPromise({
        try: async (signal) => {
          const prepared = await prepare(query, options, signal);
          const retained = await header(prepared.generation, prepared.deadline);
          if (retained) return readMembers(prepared, Number(retained.row_count));
          const compiled = await prepared.evaluate();
          const columns = resultColumns(compiled);
          if (!columns.length) throw new Error("Maintained query requires at least one projection");
          const rows = await client.query(
            `SELECT r.* FROM (${compiled.sql}) r ORDER BY ${prepared.order(compiled, columns)} LIMIT ${prepared.maxRows + 1}`,
            compiled.params,
            undefined,
            prepared.deadline,
          );
          if (rows.length > prepared.maxRows)
            throw new ReadError({
              message: `Maintained query exceeds maxRows=${prepared.maxRows}; no partial results returned`,
            });
          return {
            results: rows.map((row) => decodeQueryRow(row, compiled)),
            generation: prepared.generation,
            sourcePosition: prepared.sourcePosition,
            reused: false,
            strategy: "complete-generation-rebuild" as const,
          };
        },
        catch: failure,
      }),
    /**
     * Write path: publish the generation for this query and basis if it is missing, then return
     * it. The only maintained-query call that writes; never call it from a read path.
     */
    publish: (
      query: DatalogQuery,
      options: MaintainedQueryOptions,
    ): Effect.Effect<MaintainedQueryResult, ReadError> =>
      Effect.tryPromise({
        try: async (signal) => {
          const prepared = await prepare(query, options, signal);
          await initialize();
          const retained = await header(prepared.generation, prepared.deadline);
          if (retained) return readMembers(prepared, Number(retained.row_count));
          const compiled = await prepared.evaluate();
          const count = await client.query<{ total: unknown }>(
            `SELECT COUNT(*) AS total FROM (${compiled.sql}) source`,
            compiled.params,
            undefined,
            prepared.deadline,
          );
          const rowCount = Number(count[0]?.total ?? 0);
          if (!Number.isSafeInteger(rowCount) || rowCount > prepared.maxRows)
            throw new ReadError({
              message: `Maintained generation exceeds maxRows=${prepared.maxRows}; publication refused`,
            });
          const columns = resultColumns(compiled);
          const projected = columns.map(identifier);
          if (!projected.length)
            throw new Error("Maintained query requires at least one projection");
          const values = [...compiled.params];
          const p = (value: unknown) => {
            values.push(value);
            return `$${values.length}`;
          };
          const key = p(`${scopeKey}/${prepared.generation}/`),
            scope = p(scopeKey),
            gen = p(prepared.generation);
          const ordinal = `ROW_NUMBER() OVER (ORDER BY ${prepared.order(compiled, columns)})`;
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
              `${scopeKey}/${prepared.generation}`,
              scopeKey,
              prepared.generation,
              prepared.sourcePosition,
              rowCount,
              options.validAt,
              options.recordedAt ?? null,
              "complete-generation-rebuild",
            ],
          });
          signal.throwIfAborted();
          await client.submit(statements);
          const published = await readMembers(prepared, rowCount);
          return { ...published, reused: false };
        },
        catch: failure,
      }),
  };
};

// [EXP-C8] Read entry point: the shared client is handed over as a write-refusing view
// (ReadOnlyClient.ts), so no read path can reach the engine with a write.
export const makeXtdbMaintainedQueries = (client: XtdbClient, scopeKey: string) => {
  // query() reads through the write-refusing view; publish() is the one write-path call.
  const reads = maintainedQueries(readOnlyXtdbClient(client), scopeKey);
  const writes = maintainedQueries(client, scopeKey);
  return { query: reads.query, publish: writes.publish };
};

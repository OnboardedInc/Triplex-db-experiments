import { Effect } from "effect";
import {
  ReadError,
  decodeNativeParameters,
  decodeNativeRows,
  nativeEvidenceValue,
  nativeQueryContractId,
  resolveNativeReadBasis,
  type DatabaseScope,
  type NativeQueryContract,
  type NativeReadOptions,
  type NativeReadResult,
  type NativeQueryStep,
} from "@triplex-build/triplex/runtime";
import type { XtdbClient } from "../XtdbClient.js";
import { makeNativeContext, xtqlStatement, type XtdbNativeContext } from "./Sources.js";
import { readOnlyNativeSql } from "./ReadOnlySql.js";
import { materializeNativeReachability, type XtdbNativeReachability } from "./Reachability.js";

export type XtdbNativeBuilder = (context: XtdbNativeContext, parameters: unknown) => string;
export interface XtdbNativeReachabilityContext extends XtdbNativeContext {
  readonly relation: (name: string) => string;
}
export interface XtdbNativeReachabilityOptions extends NativeReadOptions {
  readonly maxRecursiveRows?: number;
  readonly maxRounds?: number;
}
export const XTDB_NATIVE_MAPPING_ID = "triplex-xtdb/assertion-native-basis/1";

/**
 * Native reads share canonical Triplex assertions, writes and journal authority.
 * A trusted authored query receives closed basis relations; arbitrary table reads
 * do not acquire an automatic Triplex temporal or authorization guarantee.
 */
export const makeXtdbNativeQueries = (client: XtdbClient, scope: DatabaseScope) => {
  const run = (
    language: "xtql" | "xtdb-sql",
    contract: NativeQueryContract,
    input: unknown,
    build: XtdbNativeBuilder,
    options: NativeReadOptions = {},
    relations?: readonly XtdbNativeReachability[],
  ): Effect.Effect<NativeReadResult, ReadError> =>
    Effect.gen(function* () {
      const started = performance.now();
      const checked = yield* Effect.try(() => {
        const contractId = nativeQueryContractId(contract);
        const maxRows = options.maxRows ?? 1000;
        const timeoutMs = options.timeoutMs ?? 30_000;
        if (!Number.isSafeInteger(maxRows) || maxRows < 1 || maxRows > 100_000)
          throw new RangeError("Native maxRows must be between 1 and 100000");
        if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 2_147_483_647)
          throw new RangeError("Native timeoutMs must be a positive bounded integer");
        return { contractId, maxRows, timeoutMs };
      });
      const { contractId, maxRows, timeoutMs } = checked;
      const parameters = yield* decodeNativeParameters(contract, input);
      const executed = yield* Effect.tryPromise({
        try: async (effectSignal) => {
          const signal = AbortSignal.any([
            effectSignal,
            AbortSignal.timeout(timeoutMs),
            ...(options.signal ? [options.signal] : []),
          ]);
          signal.throwIfAborted();
          const steps: NativeQueryStep[] = [];
          const sourceStarted = performance.now();
          const current = await client.query<{ position: unknown }>(
            "SELECT position FROM tx_meta FOR ALL VALID_TIME WHERE scope_key = $1",
            [scope],
            undefined,
            { signal, parameterSyntax: "postgresql" },
          );
          steps.push({
            phase: "source-cut",
            language: "xtdb-sql",
            query: "SELECT position FROM tx_meta FOR ALL VALID_TIME WHERE scope_key = $1",
            parameters: [scope],
            elapsedMs: performance.now() - sourceStarted,
          });
          const basis = resolveNativeReadBasis({
            scope,
            options,
            currentPosition: Number(current[0]?.position ?? 0),
            now: Date.now(),
          });
          const working = relations
            ? await materializeNativeReachability(
                client,
                basis,
                relations,
                parameters,
                signal,
                steps,
                (options as XtdbNativeReachabilityOptions).maxRecursiveRows,
                (options as XtdbNativeReachabilityOptions).maxRounds,
              )
            : undefined;
          try {
            const native = makeNativeContext(language, basis);
            const context = working
              ? {
                  ...native.context,
                  relation: (name: string) => working.relation(name, native.context),
                }
              : native.context;
            const body = build(context, parameters);
            if (typeof body !== "string" || body.trim().length === 0)
              throw new TypeError("A native builder must return native query text");
            const statement =
              language === "xtql"
                ? xtqlStatement(body, native.parameters.length)
                : readOnlyNativeSql(body);
            const query = `SELECT * FROM (${statement}\n) triplex_native_answer LIMIT ${maxRows + 1}`;
            signal.throwIfAborted();
            const queryStarted = performance.now();
            const rawRows = await client.query(query, native.parameters, undefined, {
              signal,
              parameterSyntax: "postgresql",
            });
            steps.push({
              phase: "answer",
              language,
              query,
              parameters: native.parameters.map(nativeEvidenceValue),
              elapsedMs: performance.now() - queryStarted,
            });
            if (rawRows.length > maxRows)
              throw new RangeError(
                `Native query exceeds maxRows=${maxRows}; no partial answer returned`,
              );
            return { rawRows, basis, query, bindings: native.parameters, steps };
          } finally {
            if (working) await working.cleanup();
          }
        },
        catch: (cause) =>
          new ReadError({ message: `XTDB native query failed: ${String(cause)}`, cause }),
      });
      const rows = yield* decodeNativeRows(contract, executed.rawRows);
      return {
        rows,
        basis: executed.basis,
        trace: {
          language,
          query: executed.query,
          parameters: executed.bindings.map(nativeEvidenceValue),
          basis: executed.basis,
          mappingId: XTDB_NATIVE_MAPPING_ID,
          contractId,
          elapsedMs: performance.now() - started,
          steps: executed.steps,
        },
        ...(options.includeRaw ? { rawRows: executed.rawRows } : {}),
      };
    }).pipe(
      Effect.mapError((cause) =>
        cause instanceof ReadError
          ? cause
          : new ReadError({ message: "Invalid XTDB native query contract or result", cause }),
      ),
    );
  return {
    select: (
      contract: NativeQueryContract,
      input: unknown,
      build: XtdbNativeBuilder,
      options?: NativeReadOptions,
    ) => run("xtql", contract, input, build, options),
    selectSql: (
      contract: NativeQueryContract,
      input: unknown,
      build: XtdbNativeBuilder,
      options?: NativeReadOptions,
    ) => run("xtdb-sql", contract, input, build, options),
    selectSqlWithReachability: (
      contract: NativeQueryContract,
      input: unknown,
      relations: readonly XtdbNativeReachability[],
      build: (context: XtdbNativeReachabilityContext, parameters: unknown) => string,
      options?: XtdbNativeReachabilityOptions,
    ) =>
      run(
        "xtdb-sql",
        contract,
        input,
        (context, parameters) => build(context as XtdbNativeReachabilityContext, parameters),
        options,
        relations,
      ),
  };
};

export type XtdbNativeQueries = ReturnType<typeof makeXtdbNativeQueries>;

import {
  BasisNotAvailable,
  ReplicaUnavailable,
  type ReplicaMarker,
} from "@triplex-build/triplex-broker";
import {
  makeXtdbBrokerReplica,
  isXtdbReplicaUnavailable,
  XTDB_BROKER_MARKER_SQL,
} from "../BrokerReplica.js";
import { Effect } from "effect";
import { readOnlyXtdbClient } from "../ReadOnlyClient.js";
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
import {
  boundedXtqlStatement,
  makeNativeContext,
  sourceCutQuery,
  type XtdbNativeContext,
} from "./Sources.js";
import { readOnlyNativeSql } from "./ReadOnlySql.js";
import { resolveNativeReachability, type XtdbNativeReachability } from "./Reachability.js";

export type XtdbNativeBuilder = (context: XtdbNativeContext, parameters: unknown) => string;
export interface XtdbNativeReachabilityContext extends XtdbNativeContext {
  readonly relation: (name: string) => string;
}
export interface XtdbNativeReachabilityOptions extends NativeReadOptions {
  readonly maxRecursiveRows?: number;
  readonly maxRounds?: number;
  /** [EXP-C8] See XtdbNativeReachabilityBudgets.strategy (Reachability.ts). */
  readonly strategy?: "single-read" | "rounds";
}
export const XTDB_NATIVE_MAPPING_ID = "triplex-xtdb/assertion-native-basis/1";

/**
 * Native reads share canonical Triplex assertions, writes and journal authority.
 * A trusted authored query receives closed basis relations; arbitrary table reads
 * do not acquire an automatic Triplex temporal or authorization guarantee.
 */
export interface XtdbBrokerNativeOptions {
  readonly broker?: boolean;
  readonly basisWaitMs?: number;
}
const nativeQueries = (
  client: XtdbClient,
  scope: DatabaseScope,
  defaults: XtdbBrokerNativeOptions,
) => {
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
          // [EXP-X02] Why: the cut is read in the answer's language (Sources.ts sourceCutQuery).
          // [EXP-C8] Reachability reads are read-only frontier rounds in the call's own language
          // (Reachability.ts), so they no longer force an SQL working-relation shell.
          const cut = sourceCutQuery(language);
          let brokerMarker: ReplicaMarker | undefined;
          if (defaults.broker) {
            // [EXP-P2B] Why: authored native queries cannot merge broker rows into engine aggregates (Q58d).
            // Rejected: answering at the requested position while the replica marker is behind it.
            const deadline = Math.min(defaults.basisWaitMs ?? 2000, timeoutMs);
            const replica = makeXtdbBrokerReplica(client, scope);
            for (;;) {
              signal.throwIfAborted();
              brokerMarker = await replica.marker();
              const required = options.basis?.recordedPosition ?? brokerMarker.position;
              if (options.basis?.recordedAt === undefined && brokerMarker.position >= required)
                break;
              if (performance.now() - sourceStarted >= deadline)
                throw new BasisNotAvailable({
                  required,
                  observed: brokerMarker.position,
                  replica: "XTDB native broker replica",
                  surface: "native",
                  waitedMs: performance.now() - sourceStarted,
                });
              await new Promise((resolve) => setTimeout(resolve, Math.min(25, deadline)));
            }
          }
          const current = brokerMarker
            ? [{ position: brokerMarker.position }]
            : await client.query<{ position: unknown }>(cut.query, [scope], undefined, {
                signal,
                parameterSyntax: "postgresql",
              });
          steps.push({
            phase: "source-cut",
            language: brokerMarker ? "xtdb-sql" : cut.language,
            query: brokerMarker ? XTDB_BROKER_MARKER_SQL : cut.query,
            parameters: [scope],
            elapsedMs: performance.now() - sourceStarted,
          });
          const basis = resolveNativeReadBasis({
            scope,
            options,
            currentPosition: Number(current[0]?.position ?? 0),
            now: Date.now(),
          });
          // [EXP-C8] Why: the basis above is resolved once and every frontier round reads it,
          // so commits between rounds cannot change the closure (R10 3.8). No write is issued.
          const working = relations
            ? await resolveNativeReachability(
                client,
                language,
                basis,
                relations,
                parameters,
                signal,
                steps,
                options as XtdbNativeReachabilityOptions,
              )
            : undefined;
          {
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
            // [EXP-X02] Why: XTQL answers are whole XTQL statements bounded by XTQL `limit`
            // (Sources.ts boundedXtqlStatement); only SQL answers keep the SQL LIMIT envelope.
            const query =
              language === "xtql"
                ? boundedXtqlStatement(body, native.parameters.length, maxRows + 1)
                : `SELECT * FROM (${readOnlyNativeSql(body)}\n) triplex_native_answer LIMIT ${maxRows + 1}`;
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
            if (brokerMarker) {
              const after = await makeXtdbBrokerReplica(client, scope).marker();
              if (
                after.position !== brokerMarker.position ||
                after.epoch !== brokerMarker.epoch ||
                after.incarnation !== brokerMarker.incarnation
              )
                throw new BasisNotAvailable({
                  required: basis.recordedPosition,
                  observed: after.position,
                  replica: "XTDB native replica changed during read",
                  surface: "native",
                  waitedMs: performance.now() - sourceStarted,
                });
            }
            return { rawRows, basis, query, bindings: native.parameters, steps };
          }
        },
        catch: (cause) =>
          cause instanceof ReadError
            ? cause
            : defaults.broker && isXtdbReplicaUnavailable(cause)
              ? new ReplicaUnavailable({ replica: "XTDB", surface: "native", cause })
              : new ReadError({ message: `XTDB native query failed: ${String(cause)}`, cause }),
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
    /**
     * [EXP-C8] The XTQL twin of selectSqlWithReachability: edges, seeds, every frontier round,
     * the source cut and the answer are XTQL, so a closure task stays in one language (PLAN 7.5).
     * `relation(name)` is an XTQL relation with `source` and `target`; use it in `unify` as
     * `(join ${relation(name)} [{:source s} {:target t}])`.
     */
    selectWithReachability: (
      contract: NativeQueryContract,
      input: unknown,
      relations: readonly XtdbNativeReachability[],
      build: (context: XtdbNativeReachabilityContext, parameters: unknown) => string,
      options?: XtdbNativeReachabilityOptions,
    ) =>
      run(
        "xtql",
        contract,
        input,
        (context, parameters) => build(context as XtdbNativeReachabilityContext, parameters),
        options,
        relations,
      ),
  };
};

export type XtdbNativeQueries = ReturnType<typeof makeXtdbNativeQueries>;

// [EXP-C8] Read entry point: the shared client is handed over as a write-refusing view
// (ReadOnlyClient.ts), so no read path can reach the engine with a write.
export const makeXtdbNativeQueries = (
  client: XtdbClient,
  scope: DatabaseScope,
  options: XtdbBrokerNativeOptions = {},
) =>
  nativeQueries(readOnlyXtdbClient(client), scope, {
    ...options,
    broker: options.broker ?? process.env["XTDB_COMMIT_PATH"] === "broker",
  });

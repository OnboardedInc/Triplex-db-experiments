import { resolveQleverBasis } from "../RecordCut.js";
import { Effect } from "effect";
import { readOnlyQleverClient } from "../ReadOnlyClient.js";
import type { TypeExpr } from "@triplex-build/triplex/config";
import {
  ReadError,
  toReadError,
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
import type { QleverClient, SparqlBinding, SparqlTerm } from "../QleverClient.js";
import { fieldIri, graphIri, metaIri } from "../rdf.js";
import {
  makeQleverNativeContext,
  QLEVER_NATIVE_MAPPING_ID,
  type QleverNativeBuilder,
  type QleverNativeContext,
  type QleverNativeEntity,
} from "./NativeContext.js";
import { resolveQleverNativeRelations, type QleverNativeRelation } from "./BasisRelations.js";

const scalar = (type: TypeExpr.TypeExpr, term: SparqlTerm): unknown => {
  if (type._tag === "Constrained") return scalar(type.base, term);
  if (type._tag === "Any") return term;
  if (type._tag === "Union") {
    // Preserve the lexical carrier; the common declared-union decoder selects
    // an admitted domain rather than guessing a family from its spelling.
    return term.value;
  }
  if (type._tag === "Ref") return term.value;
  if (term.type !== "literal" && term.type !== "typed-literal")
    throw new TypeError("A declared scalar result requires an RDF literal");
  if (type._tag === "Prim") {
    if (type.prim === "boolean") {
      if (term.value === "true" || term.value === "1") return true;
      if (term.value === "false" || term.value === "0") return false;
      throw new TypeError("Invalid native boolean lexical value");
    }
    if (type.prim === "number") {
      const value = Number(term.value);
      if (!Number.isFinite(value) || term.value.trim() === "")
        throw new TypeError("Invalid finite native number");
      return value;
    }
    return term.value;
  }
  if (type._tag === "Enum") return term.value;
  return JSON.parse(term.value);
};

const declaredRow = (type: TypeExpr.TypeExpr, row: SparqlBinding): unknown => {
  if (type._tag === "Constrained") return declaredRow(type.base, row);
  if (type._tag === "Any") return row;
  if (type._tag !== "Struct")
    throw new TypeError("A native SELECT row contract must be Struct or Any");
  return Object.fromEntries(
    Object.entries(row).map(([key, term]) => [
      key,
      type.fields[key] ? scalar(type.fields[key].type, term) : term,
    ]),
  );
};

export interface QleverNativeQueryOptions {
  readonly maxResponseBytes?: number;
  readonly defaultTimeoutMs?: number;
  readonly defaultMaxRows?: number;
}
export interface QleverNativeRelationContext extends QleverNativeContext {
  readonly relation: (
    name: string,
    source: string | QleverNativeEntity,
    target: string | QleverNativeEntity,
  ) => string;
}
export interface QleverNativeRelationOptions extends NativeReadOptions {
  readonly maxRelationRows?: number;
  /** [EXP-C8] `single-read` (default) or `rounds`; see BasisRelations.ts. */
  readonly relationStrategy?: "single-read" | "rounds";
}

/** Public schema-aware native SPARQL. No Datalog AST or compiler is invoked. */
const nativeQueries = (
  client: QleverClient,
  scope: DatabaseScope,
  defaults: QleverNativeQueryOptions = {},
) => {
  // The shared resolver validates the structured scope before any native I/O.
  resolveNativeReadBasis({ scope, currentPosition: 0, now: 0 });
  const run = (
    contract: NativeQueryContract,
    input: unknown,
    build: QleverNativeBuilder,
    options: NativeReadOptions = {},
    relations?: readonly QleverNativeRelation[],
  ): Effect.Effect<NativeReadResult, ReadError> =>
    Effect.gen(function* () {
      const started = performance.now();
      const contractId = yield* Effect.try(() => nativeQueryContractId(contract));
      const parameters = yield* decodeNativeParameters(contract, input);
      const executed = yield* Effect.tryPromise({
        try: async (effectSignal) => {
          const timeoutMs = options.timeoutMs ?? defaults.defaultTimeoutMs ?? 30_000;
          const maxRows = options.maxRows ?? defaults.defaultMaxRows ?? 1000;
          const maxResponseBytes = defaults.maxResponseBytes ?? 16 * 1024 ** 2;
          if (
            ![timeoutMs, maxRows, maxResponseBytes].every(
              (value) => Number.isSafeInteger(value) && value > 0,
            )
          )
            throw new RangeError("Native query budgets must be positive safe integers");
          const signal = AbortSignal.any([
            effectSignal,
            AbortSignal.timeout(timeoutMs),
            ...(options.signal ? [options.signal] : []),
          ]);
          signal.throwIfAborted();
          const request = { signal, timeoutMs, maxResponseBytes };
          const steps: NativeQueryStep[] = [];
          const sourceQuery = `SELECT ?position ?stamp WHERE { GRAPH ${graphIri(scope)} { ${metaIri} ${fieldIri("position")} ?position . OPTIONAL { ${metaIri} ${fieldIri("stamp")} ?stamp } } }`;
          const sourceStarted = performance.now();
          const resolved = await resolveQleverBasis(
            client,
            scope,
            {
              validAt: options.basis?.validAt ?? Date.now(),
              ...(options.basis?.recordedAt === undefined
                ? {}
                : { recordedAt: options.basis.recordedAt }),
              ...(options.basis?.recordedPosition === undefined
                ? {}
                : { recordedPosition: options.basis.recordedPosition }),
            },
            signal,
          );
          steps.push({
            phase: "source-cut",
            language: "sparql-1.1",
            query: sourceQuery,
            parameters: [],
            elapsedMs: performance.now() - sourceStarted,
          });
          const basis = resolveNativeReadBasis({
            scope,
            options,
            currentPosition: resolved.recordedPosition,
            now: Date.now(),
          });
          // [EXP-C8] Read-only: frontier rounds at this one basis, closure inlined as VALUES.
          const working = relations
            ? await resolveQleverNativeRelations(
                client,
                basis,
                relations,
                parameters,
                signal,
                steps,
                { timeoutMs, maxResponseBytes },
                (options as QleverNativeRelationOptions).maxRelationRows,
                (options as QleverNativeRelationOptions).relationStrategy,
              )
            : undefined;
          {
            const baseContext = makeQleverNativeContext(basis);
            const context = working ? { ...baseContext, relation: working.relation } : baseContext;
            const query = build(context, parameters);
            if (typeof query !== "string" || !query.trim())
              throw new TypeError("The native builder must return SPARQL query text");
            const queryStarted = performance.now();
            const rawRows = await client.query(query, request);
            steps.push({
              phase: "answer",
              language: "sparql-1.1",
              query,
              parameters: [],
              elapsedMs: performance.now() - queryStarted,
            });
            if (rawRows.length > maxRows)
              throw new RangeError(`Native SELECT exceeds maxRows=${maxRows}; no partial result`);
            return { basis, query, rawRows, steps };
          }
        },
        catch: (cause) => toReadError(cause, `QLever native SELECT failed: ${String(cause)}`),
      });
      const preparedRows = yield* Effect.try(() =>
        executed.rawRows.map((row) => declaredRow(contract.row, row)),
      );
      const rows = yield* decodeNativeRows(contract, preparedRows);
      return {
        rows,
        basis: executed.basis,
        trace: {
          language: "sparql-1.1",
          query: executed.query,
          parameters: [nativeEvidenceValue(parameters)],
          basis: executed.basis,
          mappingId: QLEVER_NATIVE_MAPPING_ID,
          contractId,
          elapsedMs: performance.now() - started,
          steps: executed.steps,
        },
        ...(options.includeRaw ? { rawRows: executed.rawRows } : {}),
      };
    }).pipe(
      Effect.mapError((cause) =>
        toReadError(cause, "Invalid QLever native query contract or result"),
      ),
    );
  return {
    select: (
      contract: NativeQueryContract,
      input: unknown,
      build: QleverNativeBuilder,
      options?: NativeReadOptions,
    ) => run(contract, input, build, options),
    selectWithRelations: (
      contract: NativeQueryContract,
      input: unknown,
      relations: readonly QleverNativeRelation[],
      build: (context: QleverNativeRelationContext, parameters: unknown) => string,
      options?: QleverNativeRelationOptions,
    ) =>
      run(
        contract,
        input,
        (context, parameters) => build(context as QleverNativeRelationContext, parameters),
        options,
        relations,
      ),
  };
};

export type QleverNativeQueries = ReturnType<typeof makeQleverNativeQueries>;

// [EXP-C8] Read entry point: the shared client is handed over as a write-refusing view
// (ReadOnlyClient.ts), so no read path can reach the engine with a write.
export const makeQleverNativeQueries = (
  client: QleverClient,
  scope: DatabaseScope,
  defaults: QleverNativeQueryOptions = {},
) => nativeQueries(readOnlyQleverClient(client), scope, defaults);

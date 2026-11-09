import { constructReadDispatch } from "@triplex-build/triplex/runtime";
import { awaitSnapshotBasis } from "../broker/snapshot.js";
import { Effect } from "effect";
import type { TypeExpr } from "@triplex-build/triplex/config";
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
import type { QleverClient, SparqlBinding, SparqlTerm } from "../QleverClient.js";
import { fieldIri, graphIri, metaIri } from "../rdf.js";
import {
  makeQleverNativeContext,
  QLEVER_NATIVE_MAPPING_ID,
  type QleverNativeBuilder,
  type QleverNativeContext,
  type QleverNativeEntity,
} from "./NativeContext.js";
import { materializeQleverNativeRelations, type QleverNativeRelation } from "./BasisRelations.js";
import { BasisNotAvailable, ReplicaUnavailable, isUnreachable } from "../broker/errors.js";

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
  /**
   * EXP-P2Q broker mode (default absent: A0 behaviour unchanged). A basis token above the replica's published
   * position is waited for up to this many milliseconds (RULINGS Q58a `after`), then fails with a typed
   * BasisNotAvailable instead of an immediate RangeError; an unreachable replica fails with ReplicaUnavailable.
   * A native read takes several requests, so the source read records the replica's (position, incarnation) and
   * is repeated after the answer: another incarnation (the broker fenced and replayed in between) or a position
   * below the basis refuses the answer (V-P2Q M3, C2, N2; RULINGS Q67c, Q72b). Every broker-mode wiring passes
   * `BROKER_NATIVE_AWAIT_BASIS_MS` (RULINGS Q72g) until the core native facade exists.
   */
  readonly awaitBasisMs?: number;
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
}

/** RULINGS Q72g: the native deadline every broker-mode wiring passes (the Q58a default). */
export const BROKER_NATIVE_AWAIT_BASIS_MS = 2_000;

/** Public schema-aware native SPARQL. No Datalog AST or compiler is invoked. */
export const makeQleverNativeQueries = (
  client: QleverClient,
  scope: DatabaseScope,
  defaults: QleverNativeQueryOptions = {},
) => {
  // [EXP-P2Q] Why: environment-selected broker runtimes also construct native facades separately.
  // Rejected: fixing individual experiment callers (new callers could silently omit the 2s gate).
  defaults = {
    ...(process.env["QLEVER_COMMIT_PATH"] === "broker"
      ? { awaitBasisMs: BROKER_NATIVE_AWAIT_BASIS_MS }
      : {}),
    ...defaults,
  };
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
          const gated = defaults.awaitBasisMs !== undefined;
          const sourceQuery = gated
            ? `SELECT ?position ?incarnation WHERE { GRAPH ${graphIri(scope)} { ${metaIri} ${fieldIri("position")} ?position OPTIONAL { ${metaIri} ${fieldIri("broker_incarnation")} ?incarnation } } }`
            : `SELECT ?position WHERE { GRAPH ${graphIri(scope)} { ${metaIri} ${fieldIri("position")} ?position } }`;
          let incarnation = "";
          let observed = 0;
          let required = options.basis?.recordedPosition ?? 0;
          // [EXP-P2Q] Why: answer/relation requests can fail after a successful basis probe.
          // Rejected: classifying the whole run (builder/validation errors are not replica outages).
          const replicaQuery: QleverClient["query"] = async (sparql, requestOptions) => {
            try {
              return await client.query(sparql, requestOptions);
            } catch (cause) {
              if (gated && !(cause instanceof ReadError) && isUnreachable(cause))
                throw new ReplicaUnavailable({
                  required,
                  observed,
                  replica: "the QLever replica",
                  surface: "native",
                  cause,
                });
              throw cause;
            }
          };
          const readSource = async () => {
            const positions = await replicaQuery(sourceQuery, request);
            const text = positions[0]?.["position"]?.value ?? "0";
            if (positions.length > 1 || !/^(0|[1-9][0-9]*)$/.test(text))
              throw new TypeError("Invalid native source-position metadata");
            incarnation = positions[0]?.["incarnation"]?.value ?? "";
            observed = Number(text);
            return observed;
          };
          const sourceStarted = performance.now();
          let current = await readSource();
          let before = incarnation;
          const requested = options.basis?.recordedPosition;
          if (gated && (requested === undefined || Number.isSafeInteger(requested))) {
            current = await awaitSnapshotBasis({
              required: requested ?? current,
              observed: current,
              refresh: readSource,
              waitMs: defaults.awaitBasisMs!,
              started: sourceStarted,
              replica: "the QLever replica",
              surface: "native",
            });
            before = incarnation;
          }
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
            currentPosition: current,
            now: Date.now(),
          });
          required = basis.recordedPosition;
          const working = relations
            ? await materializeQleverNativeRelations(
                {
                  query: replicaQuery,
                  update: (...args) => client.update(...args),
                  command: (...args) => client.command(...args),
                  cancel: (...args) => client.cancel(...args),
                  close: () => client.close(),
                },
                basis,
                relations,
                parameters,
                signal,
                steps,
                { timeoutMs, maxResponseBytes },
                (options as QleverNativeRelationOptions).maxRelationRows,
              )
            : undefined;
          try {
            const baseContext = makeQleverNativeContext(basis);
            const context = working ? { ...baseContext, relation: working.relation } : baseContext;
            const query = build(context, parameters);
            if (typeof query !== "string" || !query.trim())
              throw new TypeError("The native builder must return SPARQL query text");
            const queryStarted = performance.now();
            const rawRows = await replicaQuery(query, request);
            steps.push({
              phase: "answer",
              language: "sparql-1.1",
              query,
              parameters: [],
              elapsedMs: performance.now() - queryStarted,
            });
            if (rawRows.length > maxRows)
              throw new RangeError(`Native SELECT exceeds maxRows=${maxRows}; no partial result`);
            if (gated) {
              const after = await readSource();
              if (incarnation !== before || after !== current || after < basis.recordedPosition)
                throw new BasisNotAvailable({
                  required: basis.recordedPosition,
                  observed: after,
                  replica:
                    incarnation !== before
                      ? `the QLever replica (reset during the read: incarnation ${before || "none"} became ${incarnation || "none"})`
                      : "the QLever replica (went backwards during the read)",
                  surface: "native",
                  waitedMs: performance.now() - sourceStarted,
                });
            }
            return { basis, query, rawRows, steps };
          } finally {
            if (working) await working.cleanup();
          }
        },
        catch: (cause) =>
          // Only the broker-mode typed errors pass through; every A0 failure is wrapped exactly as before.
          cause instanceof BasisNotAvailable || cause instanceof ReplicaUnavailable
            ? cause
            : new ReadError({ message: `QLever native SELECT failed: ${String(cause)}`, cause }),
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
        cause instanceof ReadError
          ? cause
          : new ReadError({ message: "Invalid QLever native query contract or result", cause }),
      ),
    );
  return constructReadDispatch(
    {
      select: (
        contract: NativeQueryContract,
        input: unknown,
        build: QleverNativeBuilder,
        options?: NativeReadOptions,
      ) => [contract, input, build, options] as const,
      selectWithRelations: (
        contract: NativeQueryContract,
        input: unknown,
        relations: readonly QleverNativeRelation[],
        build: (context: QleverNativeRelationContext, parameters: unknown) => string,
        options?: QleverNativeRelationOptions,
      ) =>
        [
          contract,
          input,
          (context: QleverNativeContext, parameters: unknown) =>
            build(context as QleverNativeRelationContext, parameters),
          options,
          relations,
        ] as const,
    },
    (...args: Parameters<typeof run>) => run(...args),
  );
};

export type QleverNativeQueries = ReturnType<typeof makeQleverNativeQueries>;

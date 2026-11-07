import {
  FRONTIER_DEFAULTS,
  closurePairs,
  frontierClosure,
  nativeEvidenceValue,
  type FrontierEdge,
  type NativeQueryStep,
  type NativeReadBasis,
} from "@triplex-build/triplex/runtime";
import type { XtdbClient } from "../XtdbClient.js";
import {
  boundedXtqlStatement,
  makeNativeContext,
  type XtdbNativeContext,
} from "./Sources.js";
import { readOnlyNativeSql } from "./ReadOnlySql.js";

export type XtdbNativeLanguage = "xtql" | "xtdb-sql";

export interface XtdbNativeReachability {
  readonly name: string;
  /**
   * Authored native query, in the call's language, yielding text columns `source` and `target`
   * (XTQL: a relation with `source` and `target` bindings). It reads the basis relations of the
   * context it is given, so every round of the task reads the same basis.
   */
  readonly edges: (context: XtdbNativeContext, parameters: unknown) => string;
  /**
   * The bound starts: entity ids, or a native query in the call's language yielding a text
   * column `seed`. The relation then holds only pairs whose source is a seed. Omit for the
   * closure of every source of the edge relation (all pairs, bounded by `maxRecursiveRows`).
   */
  readonly seeds?: (
    context: XtdbNativeContext,
    parameters: unknown,
  ) => readonly string[] | { readonly query: string };
}

export interface XtdbNativeReachabilityBudgets {
  /** Closure pairs per relation (and reached nodes); the old helper's `maxRecursiveRows`. */
  readonly maxRecursiveRows?: number;
  readonly maxRounds?: number;
}

/**
 * Read-only reachability for native XTDB reads (contract C8).
 *
 * [EXP-C8] Why: the previous helper created `tx_native_relations`, then ran one
 * `INSERT ... SELECT` + `COMMIT SYNC` per round and an `ERASE` at the end: every round was a
 * durable transaction (205 to 410 ms each on any graph size, R10 1.5 and 3.6) competing with
 * the writer commits P1/P2 measure. Now each round is one read, `edges` restricted to the
 * frontier, and the closure is computed by the shared frontierClosure (R10 6.2, 6.4). The answer
 * query receives the closure inline as ONE structured parameter, so nothing is written.
 *
 * Round shapes (both measured or probed on XTDB 2.2.0):
 * - SQL: `e.source IN (SELECT x FROM UNNEST($n) AS u(x))` with the frontier as one array
 *   parameter. Never `e.source = ANY($n) AND ...`: 2.2.0 parses the trailing predicate into the
 *   ANY operand and returns zero or wrong rows silently (R10 finding 7, R14 H05); the IN form was
 *   correct in every probe and is a semi-join that prunes pages for small frontiers (R10 3.4).
 *   It is uncorrelated and sits in WHERE, so neither #6313 (R14 H02) nor the projected/OR mark
 *   join of #6345 (R14 H03) applies.
 * - XTQL: the frontier is one `rel` parameter joined in `unify` (R10 3.5: a scalar `_id`
 *   OR-chain fails to compile at about 20 parameters, so the frontier must be one structured
 *   parameter). The rel join scans the edge relation, 17 to 120 ms per round on 20k to 111k
 *   entities (R10 3.5); exact, and still far below one commit per round.
 * The answer relation is `UNNEST` of a JSON array of pairs (SQL, `p[1]`/`p[2]`) or a `rel` of
 * `{source, target}` maps (XTQL); both were probed on the dev engine, including the empty case
 * (an empty XTQL `rel` cannot be typed, so an empty relation is a filtered literal row).
 * Rejected: `WITH RECURSIVE` (rejected by 2.2.0, sql.clj:264-265, R10 3.6); the interim XTQL
 * depth unrolling of EXP-X02 (D <= 8, D^2 statement growth, R12 5.3); any scratch fallback
 * (R10 6.10).
 */
export const resolveNativeReachability = async (
  client: XtdbClient,
  language: XtdbNativeLanguage,
  basis: NativeReadBasis,
  definitions: readonly XtdbNativeReachability[],
  input: unknown,
  signal: AbortSignal,
  steps: NativeQueryStep[],
  budgets: XtdbNativeReachabilityBudgets = {},
) => {
  if (
    !definitions.length ||
    new Set(definitions.map((item) => item.name)).size !== definitions.length
  )
    throw new TypeError("Native reachability requires distinct named relations");
  for (const definition of definitions)
    if (!/^[A-Za-z_][A-Za-z0-9_-]{0,127}$/.test(definition.name))
      throw new TypeError("Invalid native reachability relation name");
  const maxPairs = budgets.maxRecursiveRows ?? 100_000;
  const maxRounds = budgets.maxRounds ?? FRONTIER_DEFAULTS.maxRounds;
  if (![maxPairs, maxRounds].every((value) => Number.isSafeInteger(value) && value > 0))
    throw new RangeError("Native reachability budgets must be positive safe integers");
  // [EXP-C8] Why: 10,000 ids per XTDB round. A single 111,000-id array parameter ran in 409 ms
  // while 1,000-id batches cost 47 ms each, so large batches are cheaper (R10 3.4 "Batch size").
  const maxBatch = 10_000;

  /** One read-only native statement at the task's basis, recorded as a step. */
  const read = async <T extends Record<string, unknown>>(
    phase: string,
    build: (context: XtdbNativeContext) => string,
    limit: number,
  ): Promise<T[]> => {
    signal.throwIfAborted();
    const native = makeNativeContext(language, basis);
    const body = build(native.context);
    const query =
      language === "xtql"
        ? boundedXtqlStatement(body, native.parameters.length, limit)
        : `${readOnlyNativeSql(body)}\nLIMIT ${limit}`;
    const started = performance.now();
    try {
      return await client.query<T>(query, native.parameters, undefined, {
        signal,
        parameterSyntax: "postgresql",
      });
    } finally {
      steps.push({
        phase,
        language,
        query,
        parameters: native.parameters.map(nativeEvidenceValue),
        elapsedMs: performance.now() - started,
      });
    }
  };
  const text = (value: unknown, role: string): string => {
    if (typeof value !== "string")
      throw new TypeError(`Native reachability ${role} must be text, got ${typeof value}`);
    return value;
  };
  const edgesOf = (definition: XtdbNativeReachability, context: XtdbNativeContext) => {
    const edges = definition.edges(context, input);
    if (typeof edges !== "string" || !edges.trim())
      throw new TypeError("A native reachability edge builder must return native query text");
    return language === "xtql" ? edges : readOnlyNativeSql(edges);
  };

  const relations = new Map<string, readonly FrontierEdge[]>();
  for (const definition of definitions) {
    signal.throwIfAborted();
    let seeds: readonly string[] | undefined;
    let fetch: (batch: readonly string[], limit: number) => Promise<FrontierEdge[]>;
    const declared = definition.seeds
      ? definition.seeds(makeNativeContext(language, basis).context, input)
      : undefined;
    if (declared && "query" in declared) {
      const rows = await read<{ seed: unknown }>(
        "frontier-seeds",
        (context) => {
          const seedQuery = definition.seeds!(context, input) as { readonly query: string };
          return language === "xtql"
            ? `(-> ${seedQuery.query} (aggregate seed))`
            : `SELECT DISTINCT s.seed AS seed FROM (${readOnlyNativeSql(seedQuery.query)}\n) s`;
        },
        maxPairs + 1,
      );
      if (rows.length > maxPairs)
        throw new RangeError("Native reachability seeds exceed maxRecursiveRows");
      seeds = rows.map((row) => text(row.seed, "seed"));
    } else if (declared) seeds = declared.map((seed) => text(seed, "seed"));

    if (seeds) {
      fetch = async (batch, limit) =>
        (
          await read<{ source: unknown; target: unknown }>(
            "frontier-round",
            (context) =>
              language === "xtql"
                ? `(-> (unify (rel ${context.bind(batch.map((source) => ({ source })))} [source]) (join ${edgesOf(definition, context)} [source target])) (aggregate source target))`
                : `SELECT DISTINCT e.source AS source, e.target AS target FROM (${edgesOf(definition, context)}\n) e WHERE e.source IN (SELECT x FROM UNNEST(${context.bind([...batch])}) AS u(x))`,
            limit,
          )
        ).map((row) => [text(row.source, "source"), text(row.target, "target")] as const);
    } else {
      // All-pairs mode keeps the old public contract (closure of every source) without its
      // writes: one bounded read of the whole edge relation, then the same loop in memory.
      const rows = await read<{ source: unknown; target: unknown }>(
        "frontier-edges",
        (context) =>
          language === "xtql"
            ? `(-> ${edgesOf(definition, context)} (aggregate source target))`
            : `SELECT DISTINCT e.source AS source, e.target AS target FROM (${edgesOf(definition, context)}\n) e`,
        FRONTIER_DEFAULTS.maxRoundRows + 1,
      );
      if (rows.length > FRONTIER_DEFAULTS.maxRoundRows)
        throw new RangeError("Native reachability edge relation exceeds its row budget");
      const out = new Map<string, FrontierEdge[]>();
      for (const row of rows) {
        const edge = [text(row.source, "source"), text(row.target, "target")] as const;
        out.set(edge[0], [...(out.get(edge[0]) ?? []), edge]);
      }
      seeds = [...out.keys()];
      fetch = async (batch, limit) => batch.flatMap((source) => out.get(source) ?? []).slice(0, limit);
    }
    const closure = await frontierClosure({
      seeds,
      edges: fetch,
      budgets: { maxRounds, maxVisited: maxPairs, maxBatch },
      signal,
    });
    relations.set(definition.name, closurePairs(closure, maxPairs));
  }

  return {
    /** The closure as an inline relation of text pairs `(source, target)`; no table is read. */
    relation: (name: string, context: XtdbNativeContext) => {
      const pairs = relations.get(name);
      if (!pairs) throw new TypeError("Undeclared native reachability relation");
      if (language === "xtdb-sql")
        return `(SELECT p[1] AS source, p[2] AS target FROM UNNEST(${context.bind(pairs.map(([s, t]) => [s, t]))}) AS u(p))`;
      return pairs.length
        ? `(rel ${context.bind(pairs.map(([source, target]) => ({ source, target })))} [source target])`
        : `(-> (rel [{:source "" :target ""}] [source target]) (where false))`;
    },
  };
};

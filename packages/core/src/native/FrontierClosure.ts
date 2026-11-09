/**
 * Read-only, bounded reachability shared by every recursive read in both lanes (contract C8).
 *
 * [EXP-C8] Why: before this module, a recursive read wrote scratch state: XTDB rounds were
 * `INSERT ... SELECT` plus `COMMIT SYNC` into `tx_native_relations`/`tx_query_relations`
 * (205 to 410 ms per round regardless of graph size, R10 1.5 and 3.6), and QLever rounds were
 * SPARQL updates into scratch graphs (about 62 updates per G2 run, EXP-002), each of which empties
 * QLever's whole result cache (R17 finding 2). A read that writes competes with the commits P1 and
 * P2 measure. The replacement is semi-naive evaluation on the host (R10 3.1): one read per round
 * with the whole frontier as one parameter, a visited set so cycles terminate, and explicit
 * budgets that fail with a typed error and never return a partial answer (R10 6.2). Each lane
 * supplies only `edges(batch)`, the native read of the direct edges whose source is in the batch,
 * so the closure semantics live in exactly one place.
 *
 * Exactness (R10 6.5): after round r, `reached` holds every node at hop distance 1..r from the
 * seeds and `expanded` every node at distance 0..r-1; the loop ends when the frontier
 * (`reached - expanded`) is empty, so `reached` is the positive-length reachability R+(S).
 * Every round reads the same fixed basis, so a concurrent commit cannot change the edge set
 * (R10 3.8). Edges are a set: equal duplicate assertions are one edge (C5.1, R10 6.5 point 5).
 *
 * Because every out-edge of every expanded node is fetched, the reachable subgraph is in memory
 * after the loop. Per-seed reach, closure pairs, depth-bounded Datalog rule closure and exact
 * simple-path counts are computed from it without more engine calls (R10 finding 9, 3.7).
 *
 * Rejected: engine-side recursion (`WITH RECURSIVE` is rejected by XTDB 2.2.0 at
 * sql.clj:264-265, R10 3.6; a QLever property path needs plain IRI triples in a current graph that
 * the assertion mapping does not have, R10 2.5), and any scratch fallback "just in case" (it brings
 * back the mutator class C8 removes, R10 6.10).
 */

/** A direct edge `[source, target]`. */
export type FrontierEdge = readonly [source: string, target: string];

/** Explicit resource budgets (R10 6.2). Each one fails with a typed error; none truncates. */
export interface FrontierBudgets {
  /**
   * Hop rounds: a closure of depth up to `maxRounds` completes; one further read (which finds
   * nothing new) confirms the fixpoint and is not charged. This matches the old XTDB helper, which
   * completed a chain of `maxRounds` edges. Hierarchies are 3 to 8 deep (R10 3.2).
   */
  readonly maxRounds?: number;
  /** Distinct reached nodes. Same constant as the old `maxRecursiveRows`, now counting nodes. */
  readonly maxVisited?: number;
  /** Distinct fetched edges (the in-memory subgraph); bounds host memory. */
  readonly maxEdges?: number;
  /** Frontier ids per engine read. Measured knees: QLever 1,000 IRIs, XTDB 10,000 ids (R10 3.3, 3.4). */
  readonly maxBatch?: number;
  /** Rows one round may return; the lane reads `LIMIT maxRoundRows + 1` to detect overflow. */
  readonly maxRoundRows?: number;
}

export const FRONTIER_DEFAULTS = {
  maxRounds: 64,
  maxVisited: 100_000,
  maxEdges: 1_000_000,
  maxBatch: 1_000,
  maxRoundRows: 1_000_000,
} as const satisfies Required<FrontierBudgets>;

export type RecursionBudgetKind =
  | "rounds"
  | "visited"
  | "edges"
  | "roundRows"
  | "pairs"
  | "pathSteps";

/** A recursive read hit one of its budgets. No partial answer accompanies it (R10 6.2). */
export class RecursionBudgetExceeded extends RangeError {
  readonly _tag = "RecursionBudgetExceeded";
  constructor(
    readonly kind: RecursionBudgetKind,
    readonly limit: number,
    readonly observed: number,
  ) {
    super(
      `Recursive read exceeds its ${kind} budget (${observed} > ${limit}); no partial answer returned`,
    );
    this.name = "RecursionBudgetExceeded";
  }
}

export interface FrontierRoundStats {
  readonly round: number;
  readonly frontier: number;
  readonly calls: number;
  readonly rows: number;
  readonly newNodes: number;
  readonly elapsedMs: number;
}

export interface FrontierClosure {
  /** Distinct seeds in code-unit order. */
  readonly seeds: readonly string[];
  /** Positive-length reach of the seed set: a seed is included only if a cycle returns to it. */
  readonly reached: ReadonlySet<string>;
  /** Every expanded node and its distinct direct successors (empty when it has none). */
  readonly successors: ReadonlyMap<string, ReadonlySet<string>>;
  /** False only when `maxDepth` stopped the loop with a non-empty frontier. */
  readonly complete: boolean;
  /** The semantic hop bound used, if any. */
  readonly maxDepth?: number;
  readonly edgeCount: number;
  readonly rounds: readonly FrontierRoundStats[];
}

export interface FrontierClosureInput {
  readonly seeds: Iterable<string>;
  /**
   * One native read: the distinct direct edges whose source is in `batch`, at the task's single
   * basis. `limit` is the row bound the read must apply (`LIMIT limit`); returning more rows than
   * the round budget fails the read. Every returned source must be in `batch`.
   */
  readonly edges: (
    batch: readonly string[],
    limit: number,
    signal?: AbortSignal,
  ) => Promise<Iterable<FrontierEdge>>;
  readonly budgets?: FrontierBudgets;
  /**
   * A semantic hop bound (Datalog `maxDepth`), not a budget: nodes up to this many hops are
   * reached, none beyond is expanded, and no error is raised. Omit for the full closure.
   */
  readonly maxDepth?: number;
  readonly signal?: AbortSignal;
}

const positive = (name: string, value: number): number => {
  if (!Number.isSafeInteger(value) || value < 1)
    throw new RangeError(`${name} must be a positive safe integer`);
  return value;
};

/** Plain code-unit order: deterministic batches, so identical rounds are identical engine reads. */
const sorted = (values: Iterable<string>): string[] =>
  [...values].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

const identity = (value: unknown, role: string): string => {
  // A NULL or non-text endpoint is a broken edge definition. Fail closed instead of filtering:
  // a dropped edge would silently under-reach (the R14 H02 failure mode, here at the host).
  if (typeof value !== "string")
    throw new TypeError(`Recursive edge ${role} must be a text identity, got ${typeof value}`);
  return value;
};

export const resolveFrontierBudgets = (
  budgets: FrontierBudgets = {},
): Required<FrontierBudgets> => ({
  maxRounds: positive("maxRounds", budgets.maxRounds ?? FRONTIER_DEFAULTS.maxRounds),
  maxVisited: positive("maxVisited", budgets.maxVisited ?? FRONTIER_DEFAULTS.maxVisited),
  maxEdges: positive("maxEdges", budgets.maxEdges ?? FRONTIER_DEFAULTS.maxEdges),
  maxBatch: positive("maxBatch", budgets.maxBatch ?? FRONTIER_DEFAULTS.maxBatch),
  maxRoundRows: positive("maxRoundRows", budgets.maxRoundRows ?? FRONTIER_DEFAULTS.maxRoundRows),
});

/** Semi-naive frontier expansion (R10 3.1) with a visited set and typed budgets. */
export const frontierClosure = async (input: FrontierClosureInput): Promise<FrontierClosure> => {
  const budgets = resolveFrontierBudgets(input.budgets);
  const maxDepth = input.maxDepth === undefined ? undefined : positive("maxDepth", input.maxDepth);
  const seeds = sorted(new Set([...input.seeds].map((seed) => identity(seed, "seed"))));
  const reached = new Set<string>();
  const successors = new Map<string, Set<string>>();
  const rounds: FrontierRoundStats[] = [];
  let frontier = seeds;
  let edgeCount = 0;
  while (frontier.length > 0) {
    if (maxDepth !== undefined && rounds.length >= maxDepth) break;
    if (rounds.length > budgets.maxRounds)
      throw new RecursionBudgetExceeded("rounds", budgets.maxRounds, rounds.length);
    input.signal?.throwIfAborted();
    const started = performance.now();
    // Expanded nodes get an entry even without out-edges, so local traversal can tell "no
    // successors" (exact) from "never fetched" (a coverage error, see reachFrom).
    for (const node of frontier) successors.set(node, new Set());
    const targets = new Set<string>();
    let rows = 0,
      calls = 0,
      newNodes = 0;
    for (let offset = 0; offset < frontier.length; offset += budgets.maxBatch) {
      input.signal?.throwIfAborted();
      const batch = frontier.slice(offset, offset + budgets.maxBatch);
      const members = new Set(batch);
      const result = await input.edges(batch, budgets.maxRoundRows - rows + 1, input.signal);
      calls++;
      for (const edge of result) {
        if (++rows > budgets.maxRoundRows)
          throw new RecursionBudgetExceeded("roundRows", budgets.maxRoundRows, rows);
        if (!Array.isArray(edge) || edge.length !== 2)
          throw new TypeError("A recursive edge read must return [source, target] pairs");
        const source = identity(edge[0], "source"),
          target = identity(edge[1], "target");
        if (!members.has(source))
          throw new TypeError("A recursive edge read returned a source outside its frontier batch");
        const out = successors.get(source)!;
        if (!out.has(target)) {
          out.add(target);
          if (++edgeCount > budgets.maxEdges)
            throw new RecursionBudgetExceeded("edges", budgets.maxEdges, edgeCount);
        }
        targets.add(target);
        if (!reached.has(target)) {
          reached.add(target);
          newNodes++;
          if (reached.size > budgets.maxVisited)
            throw new RecursionBudgetExceeded("visited", budgets.maxVisited, reached.size);
        }
      }
    }
    // [EXP-C8-R2] Why: a terminal cycle can add a seed on the confirmation read. Rejected: next-loop guard (cycle may terminate here).
    if (newNodes > 0 && rounds.length >= budgets.maxRounds)
      throw new RecursionBudgetExceeded("rounds", budgets.maxRounds, rounds.length + 1);
    rounds.push({
      round: rounds.length + 1,
      frontier: frontier.length,
      calls,
      rows,
      newNodes,
      elapsedMs: performance.now() - started,
    });
    // Every node reached earlier but not yet expanded was in this round's frontier, so the next
    // frontier is this round's targets minus everything expanded. Cycles end here (R10 3.2).
    frontier = sorted([...targets].filter((node) => !successors.has(node)));
  }
  return {
    seeds,
    reached,
    successors,
    complete: frontier.length === 0,
    ...(maxDepth === undefined ? {} : { maxDepth }),
    edgeCount,
    rounds,
  };
};

/**
 * Positive-length reach of one origin over the fetched subgraph, within `maxDepth` hops
 * (default: the closure's own bound). Exact for every seed; for any other node only when the
 * closure is complete. A node that would need expanding but was never fetched raises an error,
 * so a coverage mistake can never become a silently short answer.
 */
export const reachFrom = (
  closure: FrontierClosure,
  origin: string,
  maxDepth: number | undefined = closure.maxDepth,
): string[] => {
  if (!closure.seeds.includes(origin) && !(closure.complete && closure.successors.has(origin)))
    throw new RangeError("reachFrom needs a seed, or an expanded node of a complete closure");
  const seen = new Set<string>();
  let level = [origin],
    depth = 0;
  while (level.length > 0 && (maxDepth === undefined || depth < maxDepth)) {
    const next: string[] = [];
    for (const node of level) {
      const out = closure.successors.get(node);
      if (!out) throw new Error(`Frontier subgraph does not cover node ${JSON.stringify(node)}`);
      for (const target of out)
        if (!seen.has(target)) {
          seen.add(target);
          next.push(target);
        }
    }
    level = next;
    depth++;
  }
  return sorted(seen);
};

/** `(source, reached)` pairs for each source (default: every seed), bounded by `maxPairs`. */
export const closurePairs = (
  closure: FrontierClosure,
  maxPairs: number,
  sources: readonly string[] = closure.seeds,
): FrontierEdge[] => {
  positive("maxPairs", maxPairs);
  const pairs: FrontierEdge[] = [];
  for (const source of sources)
    for (const target of reachFrom(closure, source)) {
      pairs.push([source, target]);
      if (pairs.length > maxPairs)
        throw new RecursionBudgetExceeded("pairs", maxPairs, pairs.length);
    }
  return pairs;
};

/**
 * How a recursive definition's call tail relates to its body (validation.ts admits only
 * `R(h, t) :- [h attr n], R(n, t)`, with `t` any variable): `free` when `t` is a fresh variable,
 * `head` when `t` is `h` (so only pairs `(n, h)` extend), `next` when `t` is `n` (only `(n, n)`).
 */
export type RuleTail = "free" | "head" | "next";

export interface RuleStep {
  /** The A edges INTO the batch, reversed as `[next, head]` (every `next` in the batch). */
  readonly predecessors: FrontierClosureInput["edges"];
  readonly tail: RuleTail;
}

/**
 * The closure of bounded right-linear binary Datalog rules:
 * R = B, then repeatedly R += { (h, t) : [h attr n] is an edge of a recursive definition and
 * (n, t) in R, with that definition's tail constraint }, for at most `maxDepth` rounds. This is
 * exactly the relation the old depth-tagged scratch rounds produced: a row first inserted at
 * round k had k recursive steps, each round joined only rows of depth < k, and the old SQL bound
 * the call's tail variable, so `t = h` or `t = n` were equality conditions (EXP-C8 review).
 *
 * Semi-naive (R10 3.1): each round extends only the pairs that are new since the previous round;
 * a derivation through an older pair was already made one round after that pair appeared, so the
 * relation is the same. Predecessor edges are read once per node (`steps[i].predecessors`, a
 * frontier of the new pairs' sources) and cached, so the engine sees one read per round and
 * definition, never a write.
 */
export const ruleClosure = async (input: {
  readonly base: Iterable<FrontierEdge>;
  readonly steps?: readonly RuleStep[];
  readonly maxDepth: number;
  readonly maxPairs: number;
  readonly budgets?: FrontierBudgets;
  readonly signal?: AbortSignal;
}): Promise<{ readonly pairs: FrontierEdge[]; readonly rounds: readonly FrontierRoundStats[] }> => {
  const budgets = resolveFrontierBudgets(input.budgets);
  const maxPairs = positive("maxPairs", input.maxPairs);
  const maxDepth = positive("maxDepth", input.maxDepth);
  const relation = new Map<string, Set<string>>();
  let size = 0;
  const visited = new Set<string>();
  const add = (head: string, tail: string): boolean => {
    const tails = relation.get(head) ?? new Set<string>();
    if (tails.has(tail)) return false;
    // [EXP-C8-R2] Why: rule budgets bound distinct relation endpoints, including base rows. Rejected: maxPairs alone (does not enforce maxVisited).
    visited.add(head);
    visited.add(tail);
    if (visited.size > budgets.maxVisited)
      throw new RecursionBudgetExceeded("visited", budgets.maxVisited, visited.size);
    tails.add(tail);
    relation.set(head, tails);
    if (++size > maxPairs) throw new RecursionBudgetExceeded("pairs", maxPairs, size);
    return true;
  };
  let delta: FrontierEdge[] = [];
  for (const edge of input.base) {
    const source = identity(edge[0], "source"),
      target = identity(edge[1], "target");
    if (add(source, target)) delta.push([source, target]);
  }
  const steps = input.steps ?? [];
  const caches = steps.map(() => new Map<string, Set<string>>());
  const rounds: FrontierRoundStats[] = [];
  let edgeCount = 0;
  for (let depth = 1; depth <= maxDepth && delta.length > 0 && steps.length > 0; depth++) {
    input.signal?.throwIfAborted();
    const started = performance.now();
    let calls = 0,
      rows = 0;
    const fresh: FrontierEdge[] = [];
    let frontierSize = 0;
    for (const [index, step] of steps.entries()) {
      const cache = caches[index]!;
      const frontier = sorted(
        new Set(delta.map(([next]) => next).filter((node) => !cache.has(node))),
      );
      frontierSize += frontier.length;
      for (const node of frontier) cache.set(node, new Set());
      for (let offset = 0; offset < frontier.length; offset += budgets.maxBatch) {
        input.signal?.throwIfAborted();
        const batch = frontier.slice(offset, offset + budgets.maxBatch);
        const members = new Set(batch);
        const result = await step.predecessors(
          batch,
          budgets.maxRoundRows - rows + 1,
          input.signal,
        );
        calls++;
        for (const edge of result) {
          if (++rows > budgets.maxRoundRows)
            throw new RecursionBudgetExceeded("roundRows", budgets.maxRoundRows, rows);
          if (!Array.isArray(edge) || edge.length !== 2)
            throw new TypeError("A recursive edge read must return [next, head] pairs");
          const next = identity(edge[0], "source"),
            head = identity(edge[1], "target");
          if (!members.has(next))
            throw new TypeError("A recursive edge read returned a node outside its frontier batch");
          const heads = cache.get(next)!;
          if (!heads.has(head)) {
            heads.add(head);
            if (++edgeCount > budgets.maxEdges)
              throw new RecursionBudgetExceeded("edges", budgets.maxEdges, edgeCount);
          }
        }
      }
      for (const [next, tail] of delta)
        for (const head of cache.get(next)!) {
          if (step.tail === "head" && tail !== head) continue;
          if (step.tail === "next" && tail !== next) continue;
          if (add(head, tail)) fresh.push([head, tail]);
        }
    }
    // [EXP-C8-R2] Why: maxDepth is semantic; resource rounds independently refuse new derivations. Rejected: silently ignoring maxRounds.
    if (fresh.length > 0 && depth > budgets.maxRounds)
      throw new RecursionBudgetExceeded("rounds", budgets.maxRounds, depth);
    rounds.push({
      round: depth,
      frontier: frontierSize,
      calls,
      rows,
      newNodes: fresh.length,
      elapsedMs: performance.now() - started,
    });
    delta = fresh;
  }
  const pairs: FrontierEdge[] = [];
  for (const head of sorted(relation.keys()))
    for (const tail of sorted(relation.get(head)!)) pairs.push([head, tail]);
  return { pairs, rounds };
};

/**
 * One bounded read of a whole edge relation, served from memory as a frontier reader.
 *
 * [EXP-C8] Why: on the current ledger mappings a frontier round is not cheaper than reading the
 * whole edge relation. XTDB scans `tx_assertions` for every round whatever the frontier
 * (measured on the dev engine: 2.0 to 3.7 s for a 4-id frontier, a full edge read and every
 * predicate placement alike, on 536k rows under load), because the ledger has no entity-keyed
 * index (R10 3.4, 6.4: per-round point lookups need the entity-keyed projection tables). QLever
 * re-evaluates the authored edge fragment per round (150 to 1,900 ms). So the default is one read
 * of the edge relation (`LIMIT maxRoundRows + 1`, typed error above it) and the same frontier
 * loop in memory: exact, read-only, and one scan where the old helpers paid one scan plus a
 * commit per round. Per-round frontier reads stay available for indexed relations.
 */
export const memoryEdges = (
  edges: Iterable<FrontierEdge>,
  maxRows: number = FRONTIER_DEFAULTS.maxRoundRows,
): FrontierClosureInput["edges"] & { readonly sources: readonly string[] } => {
  const out = new Map<string, FrontierEdge[]>();
  let count = 0;
  for (const edge of edges) {
    if (++count > maxRows) throw new RecursionBudgetExceeded("roundRows", maxRows, count);
    const source = identity(edge[0], "source"),
      target = identity(edge[1], "target");
    const list = out.get(source) ?? [];
    list.push([source, target]);
    out.set(source, list);
  }
  const read = async (batch: readonly string[], limit: number) =>
    batch.flatMap((source) => out.get(source) ?? []).slice(0, limit);
  return Object.assign(read, { sources: sorted(out.keys()) });
};

/**
 * Exact number of simple paths `from -> to` over a complete fetched subgraph, with the oracle's
 * definition (qualification/workloads/event_oracles.py support_rows.count_paths): node sequences
 * without a repeated node, ending the first time `to` is reached. Acyclic subgraphs use a
 * postorder count in O(V+E) with BigInt; cyclic ones use an explicit DFS stack.
 * Both counting passes enforce `maxPathSteps` (R10 3.7).
 */
export const countSimplePaths = (
  closure: FrontierClosure,
  from: string,
  to: string,
  maxPathSteps = 10_000_000,
): bigint => {
  positive("maxPathSteps", maxPathSteps);
  if (closure.maxDepth !== undefined)
    throw new RangeError("Path counts need a closure without a hop bound");
  const reach = reachFrom(closure, from, undefined);
  const nodes = new Set([from, ...reach]);
  const out = (node: string): ReadonlySet<string> => {
    const next = closure.successors.get(node);
    if (!next) throw new Error(`Frontier subgraph does not cover node ${JSON.stringify(node)}`);
    return next;
  };
  // Cycle check on the reachable subgraph (iterative three-colour DFS).
  const colour = new Map<string, 1 | 2>();
  let cyclic = false;
  const postorder: string[] = [];
  for (const start of nodes) {
    if (colour.has(start) || cyclic) continue;
    const stack: [string, Iterator<string>][] = [[start, out(start).values()]];
    colour.set(start, 1);
    while (stack.length && !cyclic) {
      const [node, iterator] = stack.at(-1)!;
      const step = iterator.next();
      if (step.done) {
        colour.set(node, 2);
        postorder.push(node);
        stack.pop();
      } else if (colour.get(step.value) === 1) cyclic = true;
      else if (!colour.has(step.value)) {
        colour.set(step.value, 1);
        stack.push([step.value, out(step.value).values()]);
      }
    }
  }
  // [EXP-C8-R2] Why: admitted graphs can exceed the JS call stack. Rejected: recursive memoization/DFS (12k-node reproducer).
  let steps = 0;
  const charge = () => {
    if (++steps > maxPathSteps) throw new RecursionBudgetExceeded("pathSteps", maxPathSteps, steps);
  };
  if (!cyclic) {
    const memo = new Map<string, bigint>();
    for (const node of postorder) {
      let total = 0n;
      for (const next of out(node)) {
        charge();
        total += next === to ? 1n : memo.get(next)!;
      }
      memo.set(node, total);
    }
    return from === to ? 0n : memo.get(from)!;
  }
  let total = 0n;
  const visited = new Set([from]);
  const stack: [string, Iterator<string>][] = [[from, out(from).values()]];
  while (stack.length > 0) {
    const [node, iterator] = stack.at(-1)!;
    const step = iterator.next();
    if (step.done) {
      stack.pop();
      visited.delete(node);
      continue;
    }
    charge();
    const next = step.value;
    if (visited.has(next)) continue;
    if (next === to) total++;
    else {
      visited.add(next);
      stack.push([next, out(next).values()]);
    }
  }
  return total;
};

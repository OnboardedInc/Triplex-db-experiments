import {
  closurePairs,
  frontierClosure,
  memoryEdges,
  type FrontierEdge,
  type NativeQueryStep,
  type NativeReadBasis,
} from "@triplex-build/triplex/runtime";
import type { QleverClient, QleverRequestOptions, SparqlTerm } from "../QleverClient.js";
import { literal } from "../rdf.js";
import {
  makeQleverNativeContext,
  type QleverNativeContext,
  type QleverNativeEntity,
} from "./NativeContext.js";

export interface QleverNativeRelation {
  readonly name: string;
  /** Trusted native SELECT projecting plain string variables ?source/?target. */
  readonly edges: (context: QleverNativeContext, parameters: unknown) => string;
  /**
   * The bound starts: plain string identities, or a query-only SELECT projecting a plain string
   * `?seed`. The relation then holds only pairs whose source is a seed. Omit for the closure of
   * every source of the edge relation (all pairs, bounded by `maxRelationRows`).
   */
  readonly seeds?: (
    context: QleverNativeContext,
    parameters: unknown,
  ) => readonly string[] | { readonly query: string };
}

/** A restricted SELECT fragment guard, not a general SPARQL AST or sandbox. */
const selectFragment = (text: string): string => {
  const words: string[] = [];
  for (let index = 0; index < text.length; ) {
    const ch = text[index]!;
    if (ch === "#") {
      while (index < text.length && text[index] !== "\n") index++;
    } else if (ch === "'" || ch === '"') {
      const delimiter = text.startsWith(ch.repeat(3), index) ? ch.repeat(3) : ch;
      index += delimiter.length;
      let closed = false;
      while (index < text.length) {
        if (text[index] === "\\") index += 2;
        else if (text.startsWith(delimiter, index)) {
          index += delimiter.length;
          closed = true;
          break;
        } else index++;
      }
      if (!closed) throw new TypeError("Unclosed native SELECT string");
    } else if (ch === "<" && /^[A-Za-z][A-Za-z0-9+.-]*:/.test(text.slice(index + 1))) {
      const end = text.indexOf(">", index + 1);
      if (end < 0) throw new TypeError("Unclosed native SELECT IRI");
      index = end + 1;
    } else if (ch === "?" || ch === "$") {
      index++;
      while (/[A-Za-z0-9_]/.test(text[index] ?? "")) index++;
    } else if (/[A-Za-z_]/.test(ch)) {
      const start = index++;
      while (/[A-Za-z0-9_-]/.test(text[index] ?? "")) index++;
      words.push(text.slice(start, index).toUpperCase());
    } else index++;
  }
  if (
    words[0] !== "SELECT" ||
    words.some((word) =>
      [
        "INSERT",
        "DELETE",
        "LOAD",
        "CLEAR",
        "CREATE",
        "DROP",
        "COPY",
        "MOVE",
        "ADD",
        "WITH",
        "USING",
      ].includes(word),
    )
  )
    throw new TypeError(
      "Native edge definitions require one query-only SELECT fragment without PREFIX/BASE or update operations",
    );
  return text;
};

const XSD_STRING = "http://www.w3.org/2001/XMLSchema#string";
/** The old working-domain check, per fetched row: endpoints are complete plain string identities. */
const identity = (term: SparqlTerm | undefined, role: string): string => {
  if (
    !term ||
    (term.type !== "literal" && term.type !== "typed-literal") ||
    term["xml:lang"] !== undefined ||
    (term.datatype !== undefined && term.datatype !== XSD_STRING)
  )
    throw new TypeError(`Native edge ${role} must be a complete plain string identity`);
  return term.value;
};

/**
 * Read-only basis relations for native QLever reads (contract C8).
 *
 * [EXP-C8] Why: the previous helper copied the basis-filtered edges into a fresh scratch graph
 * with a SPARQL update, counted `p+` over it, and deleted it afterwards: three or more updates
 * per call (about 62 per G2 run, EXP-002), each of which empties QLever's whole result cache
 * (R17 finding 2) and grows the delta that slows every later update (EXP-002: 7 ms to 1.3 s). Now
 * each round is one SELECT: the authored edge fragment joined with the frontier as ONE `VALUES`
 * block, and the shared frontierClosure computes the closure (R10 3.3, 6.3 Tier 2). The answer
 * query receives the closure inline as a `VALUES` block in place of the old graph pattern.
 *
 * Tier 1 of R10 6.3 (one property path over a current graph) does not apply yet: the assertion
 * mapping in rdf.ts has no plain-IRI current graph, and a path over the ledger graph is
 * forbidden (R10 2.5, 6.3). So no `?s p+ ?o` with both ends unbound and no `p*` with a constant
 * start are ever issued; the only recursion is the host loop.
 * Known cost (R10 finding 5): entity ids are plain string literals in this mapping, and QLever
 * plans a `VALUES` literal in about 0.23 ms against under 0.01 ms for an IRI. Batches stay at
 * 1,000 (the measured knee, R10 3.3); IRI ids belong to the compact ledger work (EXP-Q01).
 */
export const resolveQleverNativeRelations = async (
  client: QleverClient,
  basis: NativeReadBasis,
  definitions: readonly QleverNativeRelation[],
  input: unknown,
  signal: AbortSignal,
  steps: NativeQueryStep[],
  request: Omit<QleverRequestOptions, "signal">,
  maxRows = 100_000,
  // [EXP-C8] single-read (default): one bounded read of the edge relation, the loop in memory;
  // rounds: one VALUES read per frontier round (memoryEdges in FrontierClosure.ts says why the
  // default is cheaper on today's ledger mapping: each round re-evaluates the edge fragment).
  strategy: "single-read" | "rounds" = "single-read",
) => {
  if (strategy !== "single-read" && strategy !== "rounds")
    throw new TypeError("Native relation strategy must be single-read or rounds");
  if (
    !definitions.length ||
    new Set(definitions.map((definition) => definition.name)).size !== definitions.length
  )
    throw new TypeError("Native relations require distinct names");
  if (!Number.isSafeInteger(maxRows) || maxRows < 1 || maxRows > 100_000)
    throw new RangeError("Native relation row budget must be1..100000");
  for (const definition of definitions)
    if (!/^[A-Za-z_][A-Za-z0-9_-]{0,127}$/.test(definition.name))
      throw new TypeError("Invalid native relation name");
  const read = async (phase: string, query: string) => {
    signal.throwIfAborted();
    const started = performance.now();
    try {
      return await client.query(query, { ...request, signal });
    } finally {
      steps.push({
        phase,
        language: "sparql-1.1",
        query,
        parameters: [],
        elapsedMs: performance.now() - started,
      });
    }
  };
  const relations = new Map<string, readonly FrontierEdge[]>();
  for (const definition of definitions) {
    signal.throwIfAborted();
    const context = makeQleverNativeContext(basis);
    const source = selectFragment(definition.edges(context, input));
    const declared = definition.seeds?.(context, input);
    let seeds: readonly string[] | undefined;
    let fetch: (batch: readonly string[], limit: number) => Promise<Iterable<FrontierEdge>>;
    const edgeRows = (rows: Awaited<ReturnType<QleverClient["query"]>>) =>
      rows.map(
        (row) => [identity(row["source"], "source"), identity(row["target"], "target")] as const,
      );
    if (declared) {
      if ("query" in declared) {
        const rows = await read(
          "frontier-seeds",
          `SELECT DISTINCT ?seed WHERE { { ${selectFragment(declared.query)} } } LIMIT ${maxRows + 1}`,
        );
        if (rows.length > maxRows)
          throw new RangeError("Native relation seeds exceed the row budget; no partial answer");
        seeds = rows.map((row) => identity(row["seed"], "seed"));
      } else
        seeds = declared.map((seed) => {
          if (typeof seed !== "string") throw new TypeError("Native relation seeds must be text");
          return seed;
        });
    }
    if (seeds && strategy === "rounds") {
      // One read per round: the frontier is one VALUES block joined to the authored edges.
      fetch = async (batch, limit) =>
        edgeRows(
          await read(
            "frontier-round",
            `SELECT DISTINCT ?source ?target WHERE { VALUES ?source { ${batch.map(literal).join(" ")} } { ${source} } } LIMIT ${limit}`,
          ),
        );
    } else {
      // One bounded read of the edge relation, then the same loop in memory. Without declared
      // seeds this keeps the old public contract (the closure of every source).
      const rows = edgeRows(
        await read(
          "frontier-edges",
          `SELECT DISTINCT ?source ?target WHERE { { ${source} } } LIMIT ${maxRows + 1}`,
        ),
      );
      if (rows.length > maxRows)
        throw new RangeError("Native relation exceeds complete row budget; no partial answer");
      const memory = memoryEdges(rows);
      seeds ??= memory.sources;
      fetch = memory;
    }
    const closure = await frontierClosure({
      seeds,
      edges: fetch,
      // The old native `p+` had no depth limit; the visited budget bounds the rounds the same way
      // (every round reaches a new node), so no tighter round limit is introduced.
      budgets: { maxVisited: maxRows, maxRounds: maxRows, maxBatch: 1_000 },
      signal,
    });
    relations.set(definition.name, closurePairs(closure, maxRows));
  }
  return {
    /**
     * The closure as an inline `VALUES` pattern over `source` and `target`, each a variable or a
     * plain string (or QleverNativeEntity) constant. No graph is read or written.
     */
    relation: (
      name: string,
      source: string | QleverNativeEntity,
      target: string | QleverNativeEntity,
    ) => {
      const pairs = relations.get(name);
      if (!pairs) throw new TypeError("Undeclared native relation");
      const term = (value: string | QleverNativeEntity) => {
        if (typeof value !== "string") {
          if (value._tag !== "QleverNativeEntity")
            throw new TypeError("Invalid native entity literal");
          return { constant: value.value };
        }
        if (!value.startsWith("?")) return { constant: value };
        if (!/^\?[A-Za-z_][A-Za-z0-9_]*$/.test(value))
          throw new TypeError("Invalid native relation variable");
        return { variable: value };
      };
      const s = term(source),
        t = term(target);
      const rows = pairs.filter(
        ([a, b]) =>
          (s.constant === undefined || a === s.constant) &&
          (t.constant === undefined || b === t.constant) &&
          (s.variable === undefined || s.variable !== t.variable || a === b),
      );
      const columns: ((pair: FrontierEdge) => string)[] = [];
      const heads: string[] = [];
      if (s.variable) {
        heads.push(s.variable);
        columns.push(([a]) => literal(a));
      }
      if (t.variable && t.variable !== s.variable) {
        heads.push(t.variable);
        columns.push(([, b]) => literal(b));
      }
      if (!heads.length) return rows.length ? "{ }" : "{ FILTER(false) }";
      const distinct = [...new Set(rows.map((row) => columns.map((column) => column(row)).join(" ")))];
      return `VALUES (${heads.join(" ")}) { ${distinct.map((row) => `(${row})`).join(" ")} }`;
    },
  };
};

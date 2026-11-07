import { randomUUID } from "node:crypto";
import type { NativeQueryStep, NativeReadBasis } from "@triplex-build/triplex/runtime";
import type { QleverClient, QleverRequestOptions } from "../QleverClient.js";
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
}

export class QleverNativeWorkingOutcomeUnknown extends Error {
  constructor(
    readonly runId: string,
    readonly attemptId: string,
    readonly phase: string,
  ) {
    super(
      `Native working update is unresolved; run=${runId}, attempt=${attemptId}, phase=${phase}; graph retained, no blind cleanup or replay`,
    );
  }
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

/**
 * Materialize only basis-filtered direct edges in a fresh owned native graph.
 * QLever's native TransitivePath computes closure over that graph, including
 * cycles, rather than translating Datalog or evaluating a host-loaded graph.
 * Mechanism: https://github.com/ad-freiburg/qlever/blob/v0.6.0/src/engine/TransitivePathBase.h
 * The commissioned v0.6.0/6c5861a binary still needs its own live qualification.
 */
export const materializeQleverNativeRelations = async (
  client: QleverClient,
  basis: NativeReadBasis,
  definitions: readonly QleverNativeRelation[],
  input: unknown,
  signal: AbortSignal,
  steps: NativeQueryStep[],
  request: Omit<QleverRequestOptions, "signal">,
  maxRows = 100_000,
) => {
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
  const runId = randomUUID();
  const graph = `<urn:triplex:native:${Buffer.from(basis.scope).toString("base64url")}:${runId}>`;
  const receipts = `<urn:triplex:native-receipts:${Buffer.from(basis.scope).toString("base64url")}>`;
  const completed = "<urn:triplex:native:completed>";
  const lexical = "<urn:triplex:native:entity>";
  const predicate = (name: string) => `<urn:triplex:native:edge:${name}>`;
  let touched = false,
    uncertain = false,
    sequence = 0;
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
  const submit = async (
    phase: string,
    update: (marker: string, completion: string) => string,
    completionGraph = graph,
  ) => {
    signal.throwIfAborted();
    const attemptId = randomUUID(),
      marker = `<urn:triplex:native-attempt:${runId}:${attemptId}>`;
    const query = update(marker, completed);
    const started = performance.now();
    touched = true;
    try {
      await client.update(query, request);
    } catch {
      // Updates are never blindly replayed. The same atomic MODIFY carries a
      // receipt even for an empty edge relation; observe it before any erase.
      const until = Date.now() + 30_000;
      let resolved = false;
      do {
        const observation = `SELECT ?phase WHERE { GRAPH ${completionGraph} { ${marker} ${completed} ?phase } }`;
        const observedAt = performance.now();
        try {
          if (
            (
              await client.query(observation, {
                ...request,
                timeoutMs: Math.max(1, until - Date.now()),
              })
            ).length
          ) {
            resolved = true;
            break;
          }
        } catch {
          /* receipt observation may retry; the write never does */
        } finally {
          steps.push({
            phase: "working-reconcile",
            language: "sparql-1.1",
            query: observation,
            parameters: [],
            elapsedMs: performance.now() - observedAt,
          });
        }
        if (Date.now() < until) await new Promise((resolve) => setTimeout(resolve, 25));
      } while (Date.now() < until);
      if (!resolved) {
        uncertain = true;
        throw new QleverNativeWorkingOutcomeUnknown(runId, attemptId, phase);
      }
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
  const cleanup = async () => {
    if (uncertain)
      throw new Error(`Native working cleanup blocked by unresolved update in ${runId}`);
    if (!touched) return;
    // Cleanup ignores caller cancellation so acknowledged writes can settle.
    // One small cleanup receipt remains charged owned state, not free history.
    const attemptId = randomUUID(),
      marker = `<urn:triplex:native-attempt:${runId}:${attemptId}>`;
    const query = `DELETE { GRAPH ${graph} { ?s ?p ?o } } INSERT { GRAPH ${receipts} { ${marker} ${completed} ${literal("working-cleanup")} } } WHERE { OPTIONAL { GRAPH ${graph} { ?s ?p ?o } } }`;
    const started = performance.now();
    try {
      await client.update(query, request);
    } catch {
      const until = Date.now() + 30_000;
      let resolved = false;
      do {
        const observation = `SELECT ?phase WHERE { GRAPH ${receipts} { ${marker} ${completed} ?phase } }`;
        const observedAt = performance.now();
        try {
          if (
            (
              await client.query(observation, {
                ...request,
                timeoutMs: Math.max(1, until - Date.now()),
              })
            ).length
          ) {
            resolved = true;
            break;
          }
        } catch {
          /* no replay */
        } finally {
          steps.push({
            phase: "working-reconcile",
            language: "sparql-1.1",
            query: observation,
            parameters: [],
            elapsedMs: performance.now() - observedAt,
          });
        }
        if (Date.now() < until) await new Promise((resolve) => setTimeout(resolve, 25));
      } while (Date.now() < until);
      if (!resolved) {
        uncertain = true;
        throw new QleverNativeWorkingOutcomeUnknown(runId, attemptId, "working-cleanup");
      }
    } finally {
      steps.push({
        phase: "working-cleanup",
        language: "sparql-1.1",
        query,
        parameters: [],
        elapsedMs: performance.now() - started,
      });
    }
    touched = false;
  };
  try {
    for (const definition of definitions) {
      signal.throwIfAborted();
      const source = selectFragment(definition.edges(makeQleverNativeContext(basis), input));
      const invalid = await read(
        "working-domain-check",
        `SELECT (COUNT(*) AS ?total) WHERE { { ${source} } FILTER(!isLiteral(?source) || !isLiteral(?target) || DATATYPE(?source) != <http://www.w3.org/2001/XMLSchema#string> || DATATYPE(?target) != <http://www.w3.org/2001/XMLSchema#string>) }`,
      );
      if (Number(invalid[0]?.["total"]?.value ?? 0) !== 0)
        throw new TypeError("Native edge endpoints must be complete plain string identities");
      const prefix = literal(`urn:triplex:native-node:${runId}:${definition.name}:`);
      await submit(
        "working-seed",
        (marker, completion) =>
          `INSERT { GRAPH ${graph} { ${marker} ${completion} ${literal(definition.name)} . ?sourceNode ${predicate(definition.name)} ?targetNode . ?sourceNode ${lexical} ?source . ?targetNode ${lexical} ?target } } WHERE { OPTIONAL { { SELECT DISTINCT ?source ?target WHERE { { ${source} } } LIMIT ${maxRows + 1} } BIND(IRI(CONCAT(${prefix}, ENCODE_FOR_URI(?source))) AS ?sourceNode) BIND(IRI(CONCAT(${prefix}, ENCODE_FOR_URI(?target))) AS ?targetNode) } }`,
      );
      for (const [phase, path] of [
        ["working-edge-count", predicate(definition.name)],
        ["working-closure-count", `${predicate(definition.name)}+`],
      ] as const) {
        const rows = await read(
          phase,
          `SELECT (COUNT(*) AS ?total) WHERE { { SELECT DISTINCT ?source ?target WHERE { GRAPH ${graph} { ?source ${path} ?target } } LIMIT ${maxRows + 1} } }`,
        );
        const total = Number(rows[0]?.["total"]?.value ?? 0);
        if (!Number.isSafeInteger(total) || total > maxRows)
          throw new RangeError("Native relation exceeds complete row budget; no partial answer");
      }
    }
    return {
      relation: (
        name: string,
        source: string | QleverNativeEntity,
        target: string | QleverNativeEntity,
      ) => {
        if (!definitions.some((definition) => definition.name === name))
          throw new TypeError("Undeclared native relation");
        const atom = (term: string | QleverNativeEntity) => {
          if (typeof term !== "string") {
            if (term._tag !== "QleverNativeEntity")
              throw new TypeError("Invalid native entity literal");
            return literal(term.value);
          }
          if (!term.startsWith("?")) return literal(term);
          if (!/^\?[A-Za-z_][A-Za-z0-9_]*$/.test(term))
            throw new TypeError("Invalid native relation variable");
          return term;
        };
        const prefix = `__triplex_relation_${sequence++}`;
        return `GRAPH ${graph} { ?${prefix}_source ${predicate(name)}+ ?${prefix}_target . ?${prefix}_source ${lexical} ${atom(source)} . ?${prefix}_target ${lexical} ${atom(target)} }`;
      },
      cleanup,
    };
  } catch (cause) {
    try {
      await cleanup();
    } catch (cleanupFailure) {
      throw new AggregateError(
        [cause, cleanupFailure],
        "Native relation failed and cleanup is unresolved",
      );
    }
    throw cause;
  }
};

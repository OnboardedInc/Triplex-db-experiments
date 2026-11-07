/**
 * [EXP-C8] Read-only native reachability: frontier rounds are reads, never writes.
 * The fake client fails any submit, so a write anywhere in the path fails the test.
 */
import { describe, expect, it } from "vitest";
import {
  DatabaseScope,
  RecursionBudgetExceeded,
  type NativeQueryStep,
} from "@triplex-build/triplex/runtime";
import type { XtdbClient } from "../src/XtdbClient.js";
import { resolveNativeReachability } from "../src/native/Reachability.js";
import { makeNativeContext } from "../src/native/Sources.js";

const basis = {
  scope: DatabaseScope.test("native-rounds"),
  recordedPosition: 7,
  recordedAt: 10.5,
  validAt: 2.25,
};
// WL15 dependency-set: cycle Y<->Z plus a diamond (R10 3.2).
const graph: Record<string, string[]> = { X: ["Y", "W"], W: ["Z"], Y: ["Z"], Z: ["Y"] };

/** A fake engine: answers frontier rounds from `graph`, refuses every write. */
const engine = () => {
  const queries: { sql: string; params: readonly unknown[] }[] = [];
  const client: XtdbClient = {
    submit: async () => {
      throw new Error("C8: a read path attempted a write");
    },
    query: async <T extends Record<string, unknown>>(sql: string, params: readonly unknown[] = []) => {
      queries.push({ sql, params });
      const batch = params.find((value) => Array.isArray(value)) as unknown[] | undefined;
      if (sql.includes("AS seed") || sql.includes("(aggregate seed)")) return [{ seed: "X" }] as unknown as T[];
      const sources = batch
        ? batch.map((value) => (typeof value === "string" ? value : (value as { source: string }).source))
        : Object.keys(graph);
      return sources.flatMap((source) =>
        (graph[source] ?? []).map((target) => ({ source, target })),
      ) as unknown as T[];
    },
    close: async () => {},
  };
  return { client, queries };
};
const sqlEdges = [{ name: "deps", edges: () => "SELECT source, target FROM edges_at_basis", seeds: () => ["X"] }];

describe("read-only native reachability (EXP-C8)", () => {
  it("SQL: one read per round, frontier as one UNNEST array parameter, never = ANY", async () => {
    const { client, queries } = engine();
    const steps: NativeQueryStep[] = [];
    const working = await resolveNativeReachability(
      client,
      "xtdb-sql",
      basis,
      sqlEdges,
      {},
      new AbortController().signal,
      steps,
    );
    expect(queries.map((query) => query.params.at(-1))).toEqual([["X"], ["W", "Y"], ["Z"]]);
    for (const { sql } of queries) {
      expect(sql).toContain("e.source IN (SELECT x FROM UNNEST($1) AS u(x))");
      expect(sql).not.toMatch(/\bANY\s*\(/i);
      expect(sql).toMatch(/LIMIT \d+$/);
    }
    expect(steps.map((step) => [step.phase, step.language])).toEqual([
      ["frontier-round", "xtdb-sql"],
      ["frontier-round", "xtdb-sql"],
      ["frontier-round", "xtdb-sql"],
    ]);
    const native = makeNativeContext("xtdb-sql", basis);
    const relation = working.relation("deps", native.context);
    expect(relation).toBe("(SELECT p[1] AS source, p[2] AS target FROM UNNEST($1) AS u(p))");
    expect(native.parameters).toEqual([
      [
        ["X", "W"],
        ["X", "Y"],
        ["X", "Z"],
      ],
    ]);
    expect(() => working.relation("undeclared", native.context)).toThrow();
  });

  it("XTQL: rounds and the answer relation are XTQL with one rel parameter", async () => {
    const { client, queries } = engine();
    const working = await resolveNativeReachability(
      client,
      "xtql",
      basis,
      [
        {
          name: "deps",
          edges: () => "(-> (rel [] [source target]))",
          seeds: () => ({ query: "(-> (rel [{:seed \"X\"}] [seed]))" }),
        },
      ],
      {},
      new AbortController().signal,
      [],
    );
    expect(queries[0]!.sql).toContain("(aggregate seed)");
    for (const { sql } of queries) {
      expect(sql.startsWith("XTQL ('(fn [")).toBe(true);
      expect(sql).toContain("(limit ");
    }
    expect(queries[1]!.sql).toContain("(unify (rel triplex_param_1 [source])");
    expect(queries[1]!.params[0]).toEqual([{ source: "X" }]);
    const native = makeNativeContext("xtql", basis);
    expect(working.relation("deps", native.context)).toBe("(rel triplex_param_1 [source target])");
    expect(native.parameters[0]).toEqual([
      { source: "X", target: "W" },
      { source: "X", target: "Y" },
      { source: "X", target: "Z" },
    ]);
  });

  it("an empty XTQL closure is a typed empty relation, not an untyped empty rel", async () => {
    const { client } = engine();
    const working = await resolveNativeReachability(
      client,
      "xtql",
      basis,
      [{ name: "deps", edges: () => "(rel [] [source target])", seeds: () => ["nobody"] }],
      {},
      new AbortController().signal,
      [],
    );
    const native = makeNativeContext("xtql", basis);
    expect(working.relation("deps", native.context)).toBe(
      '(-> (rel [{:source "" :target ""}] [source target]) (where false))',
    );
  });

  it("without seeds, reads the edge relation once and closes every source in memory", async () => {
    const { client, queries } = engine();
    const working = await resolveNativeReachability(
      client,
      "xtdb-sql",
      basis,
      [{ name: "deps", edges: () => "SELECT source, target FROM edges_at_basis" }],
      {},
      new AbortController().signal,
      [],
    );
    expect(queries).toHaveLength(1);
    const native = makeNativeContext("xtdb-sql", basis);
    working.relation("deps", native.context);
    expect((native.parameters[0] as unknown[]).length).toBe(9); // X:W,Y,Z; W:Y,Z; Y:Y,Z; Z:Y,Z
  });

  it("fails typed on a budget and returns no partial relation", async () => {
    const { client } = engine();
    await expect(
      resolveNativeReachability(
        client,
        "xtdb-sql",
        basis,
        sqlEdges,
        {},
        new AbortController().signal,
        [],
        { maxRecursiveRows: 2 },
      ),
    ).rejects.toBeInstanceOf(RecursionBudgetExceeded);
    await expect(
      resolveNativeReachability(
        client,
        "xtdb-sql",
        basis,
        sqlEdges,
        {},
        new AbortController().signal,
        [],
        { maxRounds: 2 },
      ),
    ).rejects.toMatchObject({ kind: "rounds" });
  });

  it("rejects mutating or ANY-shaped edge definitions before any read", async () => {
    const { client, queries } = engine();
    for (const edges of [
      "SELECT 1; INSERT INTO t VALUES (1)",
      "SELECT source, target FROM e WHERE source = ANY($1) AND x = 1",
    ])
      await expect(
        resolveNativeReachability(
          client,
          "xtdb-sql",
          basis,
          [{ name: "bad", edges: () => edges, seeds: () => ["X"] }],
          {},
          new AbortController().signal,
          [],
        ),
      ).rejects.toThrow();
    expect(queries).toHaveLength(0);
  });
});

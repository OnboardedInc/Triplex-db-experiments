import { describe, expect, it } from "vitest";
import { compileXtdb, lowerSource } from "../src/query/compiler.js";
import { compileRuleRound } from "../src/query/recursion.js";

describe("XTDB compiler", () => {
  it("lowers shared scalar-family, negation and keyset semantics into scoped native SQL", () => {
    const result = compileXtdb(
      {
        inner: {
          find: ["?e", "?v"],
          where: [
            ["?e", ":value", "?v"],
            ["not", ["?e", ":blocked", true]],
          ],
        },
        orderBy: [
          { variable: "?v", direction: "desc" },
          { variable: "?e", direction: "asc" },
        ],
        limit: 3,
        includeCount: true,
      },
      "scope",
      { basis: { validAt: 25, recordedAt: 50, recordedPosition: 7 }, cursorValues: [1, "e1"] },
    );
    expect(result.sql).toContain("tx_assertions FOR ALL VALID_TIME");
    expect(result.sql).toContain("recorded_position <= 7");
    expect(result.sql).toContain("NOT EXISTS");
    expect(result.sql).not.toMatch(/\b(?:FROM|JOIN) triples\b/);
    expect(result.countSql).toContain("COUNT(*)");
    expect(result.params).toContain("scope");
  });

  it("replaces recursive CTEs with server-side completed relations", () => {
    const result = compileXtdb(
      {
        find: ["?y"],
        where: [["ancestor", "a", "?y"]],
        rules: [
          { name: "ancestor", body: [["?x", ":parent", "?y"]] },
          {
            name: "ancestor",
            body: [
              ["?x", ":parent", "?z"],
              ["ancestor", "?z", "?y"],
            ],
          },
        ],
      },
      "s",
      { runId: "run", basis: { validAt: 1, recordedPosition: 2 } },
    );
    expect(result.sql).not.toContain("RECURSIVE");
    expect(result.sql).toContain("tx_query_relations");
    expect(result.params).toContain("run");
    expect(result.params).not.toContain(100);
  });

  it("keeps all fixed-point joins and duplicate elimination in XTDB", () => {
    const result = compileRuleRound(
      {
        name: "ancestor",
        body: [
          ["?x", ":parent", "?z"],
          ["ancestor", "?z", "?y"],
        ],
      },
      new Set(["ancestor"]),
      "s",
      "run",
      { validAt: 1, recordedPosition: 2 },
      1,
    );
    expect(result.sql).toContain("INSERT INTO tx_query_relations");
    expect(result.sql).toContain("NOT EXISTS");
    expect(result.sql).toContain("CROSS JOIN");
    expect(result.sql).toContain("retracted_position");
    expect(result.sql).not.toMatch(/\b(?:FROM|JOIN) triples\b/);
  });

  it("lowers comma-separated negation sources without changing quoted SQL", () => {
    const sql =
      "SELECT 'FROM triples, triples', \"triples\" FROM triples t0 WHERE NOT EXISTS (SELECT 1 FROM triples t1, triples t2 WHERE t1.id = t2.id) -- FROM triples\n";
    const lowered = lowerSource(sql, "$1");
    expect(lowered.match(/tx_assertions/g)).toHaveLength(3);
    expect(lowered).toContain("'FROM triples, triples'");
    expect(lowered).toContain('"triples"');
    expect(lowered).toContain("-- FROM triples");
  });
});

import { describe, expect, it } from "vitest";
import { compileXtdb, lowerSource } from "../src/query/compiler.js";
import { compileRuleSelection } from "../src/query/recursion.js";

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

  it("[EXP-C8] replaces recursive CTEs with the evaluated relation as one inline parameter", () => {
    const pairs = [
      ["a", "b"],
      ["a", "c"],
    ] as const;
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
      { ruleRelations: new Map([["ancestor", pairs]]), basis: { validAt: 1, recordedPosition: 2 } },
    );
    expect(result.sql).not.toContain("RECURSIVE");
    expect(result.sql).not.toContain("tx_query_relations");
    expect(result.sql).toMatch(/"ancestor" AS \(SELECT p\[1\] AS arg1, p\[2\] AS arg2, 0 AS depth FROM UNNEST\(\$\d+\) AS u\(p\)\)/);
    expect(result.params).toContainEqual([
      ["a", "b"],
      ["a", "c"],
    ]);
    expect(result.params).not.toContain(100);
    expect(() =>
      compileXtdb({ find: ["?y"], where: [["ancestor", "a", "?y"]], rules: [{ name: "ancestor", body: [["?x", ":parent", "?y"]] }] }, "s", {}),
    ).toThrow(/evaluated rule relations/);
  });

  it("[EXP-C8] rule selections are reads: no INSERT, frontier as one UNNEST parameter", () => {
    const result = compileRuleSelection(
      [["?x", ":parent", "?z"]],
      "s",
      { validAt: 1, recordedPosition: 2 },
      ["b", "c"],
    );
    expect(result.sql.startsWith("SELECT DISTINCT")).toBe(true);
    expect(result.sql).not.toMatch(/\b(INSERT|ERASE|DELETE|UPDATE)\b/);
    expect(result.sql).toMatch(/IN \(SELECT x FROM UNNEST\(\$\d+\) AS u\(x\)\)/);
    expect(result.sql).not.toMatch(/\bANY\s*\(/);
    expect(result.sql).toContain("retracted_position");
    expect(result.sql).not.toMatch(/\b(?:FROM|JOIN) triples\b/);
    expect(result.params).toContainEqual(["b", "c"]);
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

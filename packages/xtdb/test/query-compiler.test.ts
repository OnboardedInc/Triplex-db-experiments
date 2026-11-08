import { describe, expect, it } from "vitest";
import { Cause, Effect, Exit } from "effect";
import { makeXtdbQueryExecutor } from "../src/XtdbQueryExecutor.js";
import type { XtdbClient } from "../src/XtdbClient.js";
import { integer } from "@triplex-build/triplex";
import { DatalogValidationError } from "@triplex-build/triplex/runtime";
import { compileXtdb, lowerSource } from "../src/query/compiler.js";
import { compileRuleSelection } from "../src/query/recursion.js";

describe("XTDB compiler", () => {
  it("refuses every exact compute operator before lowering, including downstream uses", () => {
    for (const value of ["1000000000000000004", "9223372036854775807", "-9223372036854775808"])
      for (const op of ["+", "-", "*", "/", "%"] as const) {
        const query = {
          find: ["?result"],
          where: [["e", ":i", "?i"]],
          compute: [[op, "?i", integer(op === "+" || op === "-" ? "0" : "1"), "?result"]],
        } as const;
        // Constants and inferred stored integers both go through the same refusal.
        const constant = {
          ...query,
          compute: [[op, integer(value), integer("1"), "?result"]],
        } as const;
        expect(() => compileXtdb(query, "scope", { integerVariables: ["?i"] })).toThrow(
          DatalogValidationError,
        );
        expect(() => compileXtdb(constant, "scope")).toThrow(
          /Exact integer computation is not qualified/,
        );
        expect(() =>
          compileXtdb(
            { ...query, find: ["?sum"], aggregate: [["sum", "?result", "?sum"]] },
            "scope",
          ),
        ).toThrow(DatalogValidationError);
        expect(() =>
          compileXtdb(
            {
              inner: { ...query, where: [...query.where, [">", "?result", integer("0")]] },
              limit: 1,
            },
            "scope",
          ),
        ).toThrow(DatalogValidationError);
      }
    // Overflow is a result too: reject MAX+1 and MIN-1, rather than returning a rounded boundary.
    for (const [op, value] of [
      ["+", "9223372036854775807"],
      ["-", "-9223372036854775808"],
    ] as const)
      expect(() =>
        compileXtdb(
          {
            find: ["?r"],
            where: [["e", ":i", "?i"]],
            compute: [[op, integer(value), integer("1"), "?r"]],
          },
          "scope",
        ),
      ).toThrow(DatalogValidationError);
  });
  it("returns a recoverable typed refusal from the public executor", async () => {
    const client = {
      query: async () => [{ value_type: "integer" }],
      submit: async () => {
        throw new Error("unexpected submit");
      },
      close: async () => {},
    } as unknown as XtdbClient;
    const executor = makeXtdbQueryExecutor(client, "scope");
    for (const op of ["+", "-", "*", "/", "%"] as const) {
      const query = {
        find: ["?r"],
        where: [["e", ":i", "?i"]],
        compute: [[op, "?i", integer("1"), "?r"]],
      } as const;
      const run = () => executor.execute(query, false, { recordedPosition: 1, validAt: 1 });
      const exit = await Effect.runPromiseExit(run());
      expect(Exit.isFailure(exit)).toBe(true);
      if (Exit.isFailure(exit)) expect(Cause.hasDies(exit.cause)).toBe(false);
      expect(
        await Effect.runPromise(
          run().pipe(Effect.catchTag("DatalogValidationError", () => Effect.succeed("handled"))),
        ),
      ).toBe("handled");
    }
  });
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

  it("[EXP-C8] rule selections are plain reads of the pattern body", () => {
    const result = compileRuleSelection([["?x", ":parent", "?z"]], "s", {
      validAt: 1,
      recordedPosition: 2,
    });
    expect(result.sql.startsWith("SELECT DISTINCT")).toBe(true);
    expect(result.sql).not.toMatch(/\b(INSERT|ERASE|DELETE|UPDATE)\b/);
    expect(result.sql).not.toMatch(/\bANY\s*\(/);
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

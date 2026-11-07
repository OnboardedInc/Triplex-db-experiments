import { describe, expect, it } from "vitest";
import { integer } from "@triplex-build/triplex";
import { prepareAggregateAnswers } from "../src/AggregateAnswers.js";

describe("bounded complete native aggregate answers", () => {
  it("matches the owning wrapper LIKE and ILIKE semantics across newlines", () => {
    const inner = {
      find: ["?group", "?sum"],
      where: [["?e", ":amount", "?amount"]],
      aggregate: [["sum", "?amount", "?sum"]],
    } as const;
    const answers = [{ "?group": "I\nteam", "?sum": 1 }];
    for (const [op, value] of [
      ["like", "I%team"],
      ["like", "I_team"],
      ["ilike", "i%TEAM"],
    ] as const) {
      expect(
        prepareAggregateAnswers({ inner, filters: [{ column: "?group", op, value }] }).normalize(
          answers,
        ).results,
      ).toEqual(answers);
    }
  });
  it("orders full decoded binary64 averages before inner LIMIT and wrapper filtering", () => {
    const plan = prepareAggregateAnswers({
      inner: {
        find: ["?group", "?average"],
        where: [["?e", ":amount", "?amount"]],
        aggregate: [["avg", "?amount", "?average"]],
        orderBy: [{ variable: "?average", direction: "desc" }],
        limit: 2,
      },
      filters: [{ column: "?group", op: "!=", value: "highest" }],
      orderBy: [
        { variable: "?average", direction: "asc" },
        { variable: "?group", direction: "asc" },
      ],
      includeCount: true,
    });
    expect(plan.source).not.toHaveProperty("limit");
    expect(plan.source).not.toHaveProperty("orderBy");
    expect(
      plan.normalize([
        { "?group": "low", "?average": 1 },
        { "?group": "middle", "?average": 1.0000000000000002 },
        { "?group": "highest", "?average": 1.0000000000000004 },
      ]),
    ).toEqual({ results: [{ "?group": "middle", "?average": 1.0000000000000002 }], totalCount: 1 });
  });
  it("uses exact int64, complete tie breakers and a returned decoded cursor boundary", () => {
    const query = {
      inner: {
        find: ["?sum", "?group"],
        where: [["?e", ":amount", "?amount"]],
        aggregate: [["sum", "?amount", "?sum"]],
      },
      orderBy: [
        { variable: "?sum", direction: "desc" },
        { variable: "?group", direction: "asc" },
      ],
      limit: 1,
      includeCount: true,
    } as const;
    const values = [
      { "?sum": integer("9223372036854775807"), "?group": "a" },
      { "?sum": integer("9223372036854775806"), "?group": "z" },
      { "?sum": integer("9223372036854775807"), "?group": "b" },
    ];
    expect(prepareAggregateAnswers(query).normalize(values)).toEqual({
      results: [values[0]],
      totalCount: 3,
    });
    expect(
      prepareAggregateAnswers(query, [integer("9223372036854775807"), "a"]).normalize(values),
    ).toEqual({ results: [values[2]], totalCount: 3 });
  });
  it("keeps nulls last, scalar families distinct and Unicode text ordered by native lexical bytes", () => {
    const plan = prepareAggregateAnswers({
      find: ["?value"],
      where: [["?e", ":amount", "?amount"]],
      aggregate: [["sum", "?amount", "?value"]],
      orderBy: [{ variable: "?value", direction: "desc" }],
    });
    expect(
      plan
        .normalize([
          { "?value": null },
          { "?value": "𐀀" },
          { "?value": "\ue000" },
          { "?value": 1 },
          { "?value": integer("1") },
          { "?value": false },
        ])
        .results.map((row) => row["?value"]),
    ).toEqual([1, integer("1"), false, "𐀀", "\ue000", null]);
  });
});

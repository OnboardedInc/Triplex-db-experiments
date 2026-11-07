import { Effect } from "effect";
import { expect, it } from "vitest";
import type { QleverClient } from "../src/QleverClient.js";
import { makeQleverTemporalQueries } from "../src/TemporalQueries.js";

it("preserves the declared source, negation and retirement profile in interval point queries", async () => {
  const queries: string[] = [];
  const literal = (value: string) => ({ type: "literal", value });
  const client: QleverClient = {
    query: async (query) => {
      queries.push(query);
      if (query.startsWith("SELECT ?position")) return [{ position: literal("1") }];
      if (query.includes("AS ?v0_type"))
        return [{ v0_type: literal("boolean"), v0_value: literal("1"), v0_order: literal("1") }];
      return [];
    },
    update: async () => {
      throw new Error("No interval mutation expected");
    },
    command: async () => {
      throw new Error("No administrative command expected");
    },
    cancel: async () => {},
    close: async () => {},
  };
  const provider = makeQleverTemporalQueries(client, "temporal-profile-unit", {
    sourcePlan: "persisted",
    negationPlan: "minus",
    retirementPlan: "paired",
    aggregateAnswerPlan: "bounded",
  });
  const result = await Effect.runPromise(
    provider.queryIntervals(
      {
        find: [true],
        where: [
          ["?entity", ":key", "?value"],
          ["not", ["?ban", ":ban", "?value"]],
        ],
      },
      { from: 1, to: 2, recordedPosition: 1, recordedAt: 1000 },
    ),
  );
  expect(result).toEqual([{ bindings: { true: true }, validFrom: 1, validTo: 2 }]);
  expect(
    queries.some((query) => query.includes("BOUND(?retiredPosition) != BOUND(?retiredAt)")),
  ).toBe(true);
  expect(
    queries.some((query) => query.includes("scalar_family") && query.includes("FILTER NOT EXISTS")),
  ).toBe(true);
  const main = queries.find((query) => query.includes("AS ?v0_type"))!;
  expect(main).toContain("MINUS");
  expect(main).toContain("scalar_family");
  expect(main).not.toContain("payload_property");
  expect(main).toMatch(/OPTIONAL \{[^}]*retracted_position_order[^}]*;[^}]*retracted_at_order/);
});

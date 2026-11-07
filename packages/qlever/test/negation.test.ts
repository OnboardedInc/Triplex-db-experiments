import { describe, expect, it } from "vitest";
import { ref, EntityId } from "@triplex-build/triplex";
import { DatalogValidationError } from "@triplex-build/triplex/runtime";
import { compileQlever } from "../src/compiler.js";

const basis = { validAt: 100, recordedPosition: 3 };
describe("native anti-join eligibility guards (shape only; live oracle still required)", () => {
  it("projects shared scalar family and lexical keys for the two candidate plans", () => {
    const query = {
      find: ["?entity"],
      where: [
        ["?entity", ":key", "?value"],
        ["not", ["?ban", ":ban", "?value"]],
      ],
    };
    const projected = compileQlever(query, "negative-unit", { basis, negationPlan: "projected" });
    expect(projected.sparql).toContain("negative_");
    expect(projected.sparql).toContain("_family");
    expect(projected.sparql).toContain("_value");
    expect(projected.sparql).not.toContain("MINUS");
    expect(
      compileQlever(query, "negative-unit", { basis, negationPlan: "minus" }).sparql,
    ).toContain("MINUS");
    expect(compileQlever(query, "negative-unit", { basis }).sparql).not.toContain("negative_");
  });
  it("keeps disjoint/keyless negation globally existential instead of a no-op MINUS", () => {
    const query = {
      find: ["?entity"],
      where: [
        ["?entity", ":candidate", true],
        ["not", ["global", ":block", true]],
      ],
    };
    const compiled = compileQlever(query, "negative-unit", { basis, negationPlan: "minus" });
    expect(compiled.sparql).toContain("NOT EXISTS");
    expect(compiled.sparql).toContain("_present");
    expect(compiled.sparql).not.toContain("MINUS");
  });
  it("preserves correlated outer-only predicates through the established EXISTS form", () => {
    const query = {
      find: ["?entity"],
      where: [
        ["?entity", ":value", "?value"],
        ["not", [">", "?value", 1]],
      ],
    };
    const compiled = compileQlever(query, "negative-unit", { basis, negationPlan: "minus" });
    expect(compiled.sparql).toContain("NOT EXISTS");
    expect(compiled.sparql).not.toContain("MINUS");
  });
  it("does not reinterpret a typed ref's question-prefixed literal as a shared AST variable", () => {
    const query = {
      find: ["?constant"],
      where: [
        ["?constant", ":candidate", true],
        ["not", ["local", ":key", ref(EntityId.make("?constant"))]],
      ],
    };
    const compiled = compileQlever(query, "negative-unit", { basis, negationPlan: "minus" });
    expect(compiled.sparql).not.toContain("MINUS");
    expect(compiled.sparql).toContain('"?constant"');
  });
  it("rejects unsupported double-NOT before inherited aliases can reach lowering", () => {
    expect(() =>
      compileQlever(
        {
          find: ["?entity"],
          where: [
            ["?entity", ":key", "?value"],
            ["not", ["not", ["?ban", ":ban", "?value"]]],
          ],
        },
        "negative-unit",
        { basis, negationPlan: "minus" },
      ),
    ).toThrow(DatalogValidationError);
  });
  it("retains NOT expressions within OR instead of inserting a MINUS graph operator", () => {
    const compiled = compileQlever(
      {
        find: ["?entity"],
        where: [
          ["?entity", ":key", "?value"],
          [
            "or",
            [
              ["not", ["?ban", ":ban", "?value"]],
              ["=", "?value", "safe"],
            ],
          ],
        ],
      },
      "negative-unit",
      { basis, negationPlan: "minus" },
    );
    expect(compiled.sparql).toContain("NOT EXISTS");
    expect(compiled.sparql).not.toContain("MINUS");
  });
  it("pairs retirement OPTIONAL only under the explicit profile and admits complete pairs", () => {
    const input = { find: ["?entity"], where: [["?entity", ":key", "?value"]] };
    const options = { basis: { ...basis, recordedAt: 101 }, sourcePlan: "persisted" as const };
    const control = compileQlever(input, "negative-unit", options);
    const paired = compileQlever(input, "negative-unit", { ...options, retirementPlan: "paired" });
    expect(control.sparql.match(/OPTIONAL/g)).toHaveLength(3);
    expect(paired.sparql.match(/OPTIONAL/g)).toHaveLength(2);
    expect(paired.sparql).toMatch(
      /OPTIONAL \{[^}]*retracted_position_order[^}]*;[^}]*retracted_at_order/,
    );
    expect(paired.checks.some((check) => check.label.includes("partial pair"))).toBe(true);
    expect(control.checks.some((check) => check.label.includes("partial pair"))).toBe(false);
  });
  it("prunes an unobserved leaf order while preserving a projected neighbor", () => {
    const query = {
      find: ["?shown"],
      where: [
        ["?entity", ":shown", "?shown"],
        ["?entity", ":hidden", "?hidden"],
      ],
    };
    const compiled = compileQlever(query, "liveness-unit", {
      basis,
      sourcePlan: "persisted",
      scalarOrderPlan: "live",
    });
    expect(compiled.sparql.match(/<urn:triplex:field:scalar_order>/g)).toHaveLength(1);
    expect(compiled.sparql).toContain("AS ?a0_value_order");
    expect(compiled.sparql).not.toContain("AS ?a1_value_order");
    expect(compiled.sparql).toContain("a1_value_family");
    expect(compiled.sparql).toContain("a1_value_lexical");
    expect(compiled.checks.some((check) => check.label.includes("scalar channels"))).toBe(true);
  });
  it("keeps range orders but lets canonical equality use family and lexical identity", () => {
    const common = { find: ["?entity"], where: [["?entity", ":value", "?value"]] };
    const options = { basis, sourcePlan: "persisted" as const, scalarOrderPlan: "live" as const };
    const ranged = compileQlever(
      { ...common, where: [...common.where, [">", "?value", 0]] },
      "liveness-unit",
      options,
    );
    expect(ranged.sparql).toContain("AS ?a0_value_order");
    const equal = compileQlever(
      { ...common, where: [...common.where, ["=", "?value", -0]] },
      "liveness-unit",
      options,
    );
    expect(equal.sparql).not.toContain("AS ?a0_value_order");
    expect(equal.sparql).toContain('a0_value_family = "number"');
    expect(equal.sparql).toContain('a0_value_lexical = "0"');
  });
  it("keeps wrapped, aggregate and OR shapes on the existing source path", () => {
    const base = { find: [true], where: [["?entity", ":value", "?value"]] };
    const options = { basis, sourcePlan: "persisted" as const, scalarOrderPlan: "live" as const };
    for (const query of [
      { inner: base },
      { ...base, where: [...base.where, ["or", [["=", "?value", 0]]]] },
      { ...base, find: ["?count"], aggregate: [["count", "?value", "?count"]] },
      { ...base, limit: 1 },
    ])
      expect(compileQlever(query, "liveness-unit", options).sparql).toContain("AS ?a0_value_order");
    expect(
      compileQlever(base, "liveness-unit", {
        ...options,
        sourceView: { sourcePosition: basis.recordedPosition, rows: [] },
      }).sparql,
    ).toContain("AS ?a0_value_order");
  });
  it("changes the actual failing family12 shape without dropping constant matches", () => {
    // Retained public AST: retirement-paired-family12-v1, deny-two-allows.
    const query = {
      find: [true],
      where: [
        ["?support", ":kind", "support"],
        ["?support", ":subject", "user"],
        ["?support", ":target", "document"],
        ["?support", ":principal", "?principal"],
        [
          "not",
          ["?block", ":kind", "block"],
          ["?block", ":subject", "user"],
          ["?block", ":target", "document"],
        ],
        [
          "not",
          ["?revoke", ":kind", "revoke"],
          ["?revoke", ":subject", "?principal"],
          ["?revoke", ":target", "document"],
        ],
      ],
    };
    const options = {
      basis: { ...basis, recordedAt: 101 },
      sourcePlan: "persisted" as const,
      negationPlan: "minus" as const,
      retirementPlan: "paired" as const,
    };
    const control = compileQlever(query, "liveness-unit", options);
    const candidate = compileQlever(query, "liveness-unit", {
      ...options,
      scalarOrderPlan: "live",
    });
    expect(control.sparql.match(/<urn:triplex:field:scalar_order>/g)).toHaveLength(10);
    expect(candidate.sparql.match(/<urn:triplex:field:scalar_order>/g)).toHaveLength(8);
    expect(control.sparql.match(/AS \?a\d+_value_order/g)).toHaveLength(2);
    expect(candidate.sparql).not.toMatch(/AS \?a\d+_value_order/);
    expect(candidate.sparql).toContain("MINUS");
    expect(candidate.sparql).toContain("NOT EXISTS");
    expect(candidate.checks).toEqual(control.checks);
  });
});

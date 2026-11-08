import { describe, expect, it } from "vitest";
import { integer } from "../../src/Value.js";
import { compile } from "../../src/datalog/compiler.js";
import { SqliteDialect } from "../../src/dialects/sqlite.js";

const dialect = { ...SqliteDialect, exactIntegers: true };
const query = { find: ["?value"], where: [["?e", ":value", "?value"]] } as const;
describe("explicit exact integer projection capability", () => {
  it("projects unknown value variables with a lossless integer family and order key", () => {
    const compiled = compile(query, dialect);
    expect(compiled.sql).toContain("WHEN t0.value_type = 'integer' THEN 'integer'");
    expect(compiled.valueColumnMap.get("?value")?.orderInteger).toBeDefined();
    expect(compiled.sql).toContain("AS DECIMAL(32, 0)");
  });
  it("keeps legacy dialect projections unchanged without the capability", () => {
    const compiled = compile(query, SqliteDialect);
    expect(compiled.sql).not.toContain("value_type = 'integer'");
    expect(compiled.valueColumnMap.get("?value")?.orderInteger).toBeUndefined();
  });
  it("narrows only a proved non-integer variable while preserving an unknown integer projection", () => {
    const compiled = compile(
      {
        find: ["?number", "?unknown"],
        where: [
          ["?e", ":number", "?number"],
          ["?e", ":other", "?unknown"],
        ],
      },
      dialect,
      false,
      { nonIntegerProjectionVariables: ["?number"] },
    );
    expect(compiled.valueColumnMap.get("?number")?.orderInteger).toBeUndefined();
    expect(compiled.valueColumnMap.get("?unknown")?.orderInteger).toBeDefined();
    expect(compiled.sql).not.toContain("WHEN t0.value_type = 'integer'");
    expect(compiled.sql).toContain("WHEN t1.value_type = 'integer'");
  });
  it("preserves unknown optional integer fields only with the capability", () => {
    const optional = {
      find: ["?e", "?value"],
      where: [["?e", ":name", "?name"]],
      optionalProjection: {
        rowBinding: "?e",
        fields: [{ attribute: ":value", variable: "?value" }],
      },
    } as const;
    const compiled = compile(optional, dialect);
    expect(compiled.sql).toContain("opt.value_type = 'integer'");
    expect(compiled.valueColumnMap.get("?value")?.orderInteger).toBeDefined();
    expect(compile(optional, SqliteDialect).sql).not.toContain("opt.value_type = 'integer'");
  });
  it("keeps exact compute results out of BIGINT casts for every operator", () => {
    for (const op of ["+", "-", "*", "/", "%"] as const) {
      const compiled = compile(
        { find: ["?r"], where: [["?e", ":i", "?i"]], compute: [[op, "?i", integer("1"), "?r"]] },
        dialect,
      );
      expect(compiled.sql).not.toContain("AS BIGINT");
      expect(compiled.sql).toContain("integer-overflow");
    }
  });
  it("keeps arithmetic/comparison evidence separate from projection admission", () => {
    const mixed = { ...query, find: ["?sum"], compute: [["+", "?value", 1, "?sum"]] } as const;
    expect(() => compile(mixed, dialect, false, { integerVariables: ["?value"] })).toThrow(
      /Mixed exact integer/,
    );
    const exact = {
      ...query,
      find: ["?sum"],
      compute: [["+", "?value", integer("1"), "?sum"]],
    } as const;
    expect(compile(exact, dialect).integerColumns?.has("?sum")).toBe(true);
  });
});

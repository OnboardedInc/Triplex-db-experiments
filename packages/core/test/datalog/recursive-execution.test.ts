import { describe, expect, it } from "vitest";
import { compileWithRules } from "../../src/datalog/compiler.js";
import { SqliteDialect } from "../../src/dialects/sqlite.js";
const query = {
  find: ["?x", "?y"],
  rules: [
    { name: "reach", maxDepth: 3, body: [["?x", ":edge", "?y"]] },
    {
      name: "reach",
      maxDepth: 3,
      body: [
        ["?x", ":edge", "?z"],
        ["reach", "?z", "?y"],
      ],
    },
  ],
  where: [["reach", "?x", "?y"]],
} as const;
describe("explicit recursive execution policies", () => {
  it("leaves existing dialect defaults unchanged", () => {
    const compiled = compileWithRules(query);
    expect(compiled.sql).toContain("UNION ALL");
    expect(compiled.sql).not.toContain("USING KEY");
  });
  it("separates depth tuple novelty from visible binary relation identity", () => {
    const compiled = compileWithRules(query, SqliteDialect, false, {
      recursiveExecution: "depth-set",
    });
    expect(compiled.sql).not.toContain("UNION ALL");
    expect(compiled.sql).toContain('SELECT DISTINCT arg1, arg2 FROM "reach"');
    expect(compiled.params).toContain(3);
  });
  it("requires a native capability for keyed engine recursion", () => {
    expect(() =>
      compileWithRules(query, SqliteDialect, false, { recursiveExecution: "keyed-set" }),
    ).toThrow(/explicit native dialect capability/);
    const dialect = { ...SqliteDialect, keyedRecursion: true };
    const compiled = compileWithRules(query, dialect, false, { recursiveExecution: "keyed-set" });
    expect(compiled.sql).toContain("USING KEY (arg1, arg2)");
    expect(compiled.sql).toContain('recurring."reach"');
    expect(compiled.sql).toContain("r.depth + 1");
    expect(compiled.params).toContain(3);
  });
});

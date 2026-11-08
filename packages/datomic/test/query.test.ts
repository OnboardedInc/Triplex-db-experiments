import { describe, expect, it } from "vitest";
import { compileDatomic } from "../src/compiler.js";
import { finish, page } from "../src/kernel.js";
// [EXP-DA01] Why: freeze translation and bag-sensitive kernel boundaries before engine qualification. Rejected: asserting mere emitted success flags.
describe("Datomic compiler and kernel", () => {
  it("keeps fact witnesses and escapes constants", () => {
    const q = compileDatomic(
      { find: ["?e"], where: [["?e", ":name", 'x\" ) (evil']] },
      { validAt: 0 },
    );
    expect(q.edn).toContain(":find ?v0 ?id0");
    expect(q.edn).toContain('"x\\\" ) (evil"');
    expect(q.edn).toContain("triplex.gateway.query/visible");
  });
  it("uses anti/semi joins with outer bindings", () => {
    const q = compileDatomic(
      {
        find: ["?e"],
        where: [
          ["?e", ":name", "?n"],
          ["not", ["?e", ":blocked", true]],
          [
            "or",
            [
              ["=", "?n", "A"],
              ["=", "?n", "B"],
            ],
          ],
        ],
      },
      { validAt: 0 },
    );
    expect(q.edn).toContain("(not-join [?v0]");
    expect(q.edn).toContain("(or-join [?v1]");
  });
  it("sums duplicate supports before final distinct and counts distinct values", () => {
    expect(
      finish(
        {
          find: ["?sum", "?count"],
          where: [["?e", ":n", "?n"]],
          aggregate: [
            ["sum", "?n", "?sum"],
            ["count", "?n", "?count"],
          ],
        },
        [{ "?n": 5 }, { "?n": 5 }],
      ),
    ).toEqual([{ "?sum": 10, "?count": 1 }]);
  });
  it("never rounds exact integer arithmetic", () => {
    expect(
      finish(
        {
          find: ["?result"],
          where: [["?e", ":n", "?n"]],
          compute: [["+", "?n", { type: "integer", value: "1" }, "?result"]],
        },
        [{ "?n": { type: "integer", value: "9007199254740993" } }],
      ),
    ).toEqual([{ "?result": { type: "integer", value: "9007199254740994" } }]);
  });
  it("preserves null semantics and stable family order in pages", () => {
    const inner = { find: ["?e", "?v"], where: [["?e", ":v", "?v"]] } as const;
    const input = [
      { "?e": "text", "?v": "1" },
      { "?e": "num", "?v": 1 },
      { "?e": "none", "?v": null },
    ];
    expect(
      page(
        { inner, filters: [{ column: "?v", op: "!=", value: "2" }], orderBy: [{ variable: "?e" }] },
        input,
      ).results,
    ).toEqual([input[0]]);
    expect(
      page({ inner, orderBy: [{ variable: "?v", direction: "desc" }] }, input).results.map(
        (r) => r["?e"],
      ),
    ).toEqual(["num", "text", "none"]);
  });
  it("orders computed dependencies and applies computed predicates in the exact kernel", () => {
    const query = {
      find: ["?final"],
      where: [
        ["?e", ":n", "?n"],
        [">", "?final", 10],
      ],
      compute: [
        ["*", "?incremented", 2, "?final"],
        ["+", "?n", 1, "?incremented"],
      ],
    } as const;
    expect(compileDatomic(query, { validAt: 0 }).edn).not.toContain('"?final"');
    expect(finish(query, [{ "?n": 5 }])).toEqual([{ "?final": 12 }]);
    expect(finish(query, [{ "?n": 2 }])).toEqual([]);
  });
});

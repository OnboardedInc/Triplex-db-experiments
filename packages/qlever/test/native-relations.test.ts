import { describe, expect, it } from "vitest";
import { DatabaseScope, type NativeQueryStep } from "@triplex-build/triplex/runtime";
import { TypeExpr } from "@triplex-build/triplex/config";
import type { QleverClient } from "../src/QleverClient.js";
import { numericOrderKey } from "../src/rdf.js";
import { makeQleverNativeContext } from "../src/native/NativeContext.js";
import { resolveQleverNativeRelations } from "../src/native/BasisRelations.js";

const basis = {
  scope: DatabaseScope.test("native-basis-relations"),
  recordedPosition: 7,
  recordedAt: 100.5,
  validAt: 2.25,
};
describe("native QLever basis relations", () => {
  it("distinguishes a literal question-prefixed entity from an authored variable and closes recorded intervals", () => {
    const ctx = makeQleverNativeContext(basis),
      attribute = { key: ":test/name", type: TypeExpr.text };
    expect(ctx.fact(ctx.entity("?alice"), attribute, "?value")).toContain('"?alice"');
    expect(ctx.fact("?alice", attribute, "?value")).not.toContain('"?alice"');
    const recorded = ctx.recordedFact(ctx.entity("?alice"), attribute, "?value", {
      validFrom: "?from",
      validTo: "?to",
    });
    expect(recorded).toContain(numericOrderKey(basis.recordedPosition));
    expect(recorded).toContain(numericOrderKey(basis.recordedAt));
    expect(recorded).not.toContain(numericOrderKey(basis.validAt));
    expect(recorded).toContain("<urn:triplex:field:valid_from> ?from");
    expect(recorded).toContain("OPTIONAL {");
  });

  it("[EXP-C8] answers with read-only frontier rounds and an inline VALUES relation", async () => {
    const queries: string[] = [];
    // WL15 dependency-set: cycle Y<->Z plus a diamond (R10 3.2).
    const graph: Record<string, string[]> = { X: ["Y", "W"], W: ["Z"], Y: ["Z"], Z: ["Y"] };
    const client: QleverClient = {
      query: async (query) => {
        queries.push(query);
        const frontier = [...(/VALUES \?source \{ ([^}]*) \}/.exec(query)?.[1] ?? "").matchAll(/"([^"]*)"/g)].map(
          (match) => match[1]!,
        );
        return frontier.flatMap((source) =>
          (graph[source] ?? []).map((target) => ({
            source: { type: "literal", value: source },
            target: { type: "literal", value: target },
          })),
        );
      },
      update: async () => {
        throw new Error("C8: a read path attempted an update");
      },
      command: async () => {},
      cancel: async () => {},
      close: async () => {},
    };
    const steps: NativeQueryStep[] = [];
    const working = await resolveQleverNativeRelations(
      client,
      basis,
      [{ name: "edge", edges: () => "SELECT ?source ?target WHERE { ?source <urn:e> ?target }", seeds: () => ["X"] }],
      {},
      new AbortController().signal,
      steps,
      { timeoutMs: 1000 },
    );
    expect(queries).toHaveLength(3);
    for (const query of queries) {
      expect(query).toMatch(/^SELECT DISTINCT \?source \?target WHERE \{ VALUES \?source \{/);
      expect(query).not.toMatch(/\+|\*|GRAPH <urn:triplex:native/);
    }
    expect(steps.map((step) => step.phase)).toEqual(["frontier-round", "frontier-round", "frontier-round"]);
    expect(working.relation("edge", "?s", "?t")).toBe(
      'VALUES (?s ?t) { ("X" "W") ("X" "Y") ("X" "Z") }',
    );
    expect(working.relation("edge", "X", "?t")).toBe('VALUES (?t) { ("W") ("Y") ("Z") }');
    expect(
      working.relation("edge", "?source", makeQleverNativeContext(basis).entity("?target")),
    ).toBe("VALUES (?source) {  }");
    expect(working.relation("edge", "X", "Z")).toBe("{ }");
    expect(working.relation("edge", "Y", "Z")).toBe("{ FILTER(false) }");
    expect(() => working.relation("other", "?source", "?target")).toThrow();
  });

  it("[EXP-C8] rejects non-string endpoints and budget overruns with no partial answer", async () => {
    const client = (rows: unknown[]): QleverClient => ({
      query: async () => rows as never,
      update: async () => {
        throw new Error("C8: a read path attempted an update");
      },
      command: async () => {},
      cancel: async () => {},
      close: async () => {},
    });
    const definitions = [{ name: "edge", edges: () => "SELECT ?source ?target WHERE { }", seeds: () => ["a"] }];
    await expect(
      resolveQleverNativeRelations(
        client([{ source: { type: "literal", value: "a" }, target: { type: "uri", value: "urn:b" } }]),
        basis, definitions, {}, new AbortController().signal, [], {},
      ),
    ).rejects.toThrow(/plain string identity/);
    await expect(
      resolveQleverNativeRelations(
        client([
          { source: { type: "literal", value: "a" }, target: { type: "literal", value: "b" } },
          { source: { type: "literal", value: "a" }, target: { type: "literal", value: "c" } },
        ]),
        basis, definitions, {}, new AbortController().signal, [], {}, 1,
      ),
    ).rejects.toThrow(/budget/);
  });
});

import { describe, expect, it } from "vitest";
import { DatabaseScope, type NativeQueryStep } from "@triplex-build/triplex/runtime";
import { TypeExpr } from "@triplex-build/triplex/config";
import type { QleverClient } from "../src/QleverClient.js";
import { numericOrderKey } from "../src/rdf.js";
import { makeQleverNativeContext } from "../src/native/NativeContext.js";
import { materializeQleverNativeRelations } from "../src/native/BasisRelations.js";

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

  it("reconciles a lost working update without replay, computes paths in the backend and records cleanup", async () => {
    const updates: string[] = [],
      queries: string[] = [];
    let lost = false;
    const client: QleverClient = {
      query: async (query) => {
        queries.push(query);
        if (query.startsWith("SELECT ?phase"))
          return [{ phase: { type: "literal", value: "acknowledged" } }];
        return [{ total: { type: "literal", value: query.includes("isLiteral") ? "0" : "2" } }];
      },
      update: async (query) => {
        updates.push(query);
        if (!lost) {
          lost = true;
          throw new Error("lost commit acknowledgement");
        }
      },
      command: async () => {},
      cancel: async () => {},
      close: async () => {},
    };
    const steps: NativeQueryStep[] = [];
    const working = await materializeQleverNativeRelations(
      client,
      basis,
      [{ name: "edge", edges: () => 'SELECT ("a" AS ?source) ("b" AS ?target) WHERE {}' }],
      {},
      new AbortController().signal,
      steps,
      { timeoutMs: 1000 },
      3,
    );
    expect(updates).toHaveLength(1);
    expect(queries.some((query) => query.includes("<urn:triplex:native:edge:edge>+"))).toBe(true);
    expect(
      working.relation("edge", "?source", makeQleverNativeContext(basis).entity("?target")),
    ).toContain('"?target"');
    expect(() => working.relation("other", "?source", "?target")).toThrow();
    await working.cleanup();
    expect(updates).toHaveLength(2);
    expect(updates[1]).toContain("DELETE { GRAPH <urn:triplex:native:");
    expect(updates[1]).not.toContain("urn:triplex:scope:");
    expect(steps.some((step) => step.phase === "working-reconcile")).toBe(true);
    expect(steps.some((step) => step.phase === "working-cleanup")).toBe(true);
  });
});

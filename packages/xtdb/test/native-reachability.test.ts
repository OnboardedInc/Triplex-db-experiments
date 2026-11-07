import { describe, expect, it } from "vitest";
import { DatabaseScope, type NativeQueryStep } from "@triplex-build/triplex/runtime";
import { XtdbTransactionRejected, type XtdbClient, type XtdbStatement } from "../src/XtdbClient.js";
import { materializeNativeReachability } from "../src/native/Reachability.js";

const basis = {
  scope: DatabaseScope.test("native-rounds"),
  recordedPosition: 7,
  recordedAt: 10.5,
  validAt: 2.25,
};
const definitions = [{ name: "links", edges: () => "SELECT 'a' AS source, 'b' AS target" }];

describe("native server working relations", () => {
  it("reconciles a lost round acknowledgement before continuing and erases only its owned run", async () => {
    const writes: readonly XtdbStatement[][] = [];
    const retained = writes as XtdbStatement[][];
    const counts = [1, 2, 2];
    let acknowledgementLost = false;
    const client: XtdbClient = {
      submit: async (statements) => {
        retained.push([...statements]);
        const phase = statements.at(-1)?.params?.at(-1);
        if (phase === "working-round" && !acknowledgementLost) {
          acknowledgementLost = true;
          throw new Error("transport lost after an atomic commit");
        }
      },
      query: async <T extends Record<string, unknown>>(sql: string) =>
        (sql.startsWith("SELECT COUNT")
          ? [{ count: counts.shift() }]
          : [{ attempt_id: "committed" }]) as unknown as T[],
      close: async () => {},
    };
    const steps: NativeQueryStep[] = [];
    const working = await materializeNativeReachability(
      client,
      basis,
      definitions,
      {},
      new AbortController().signal,
      steps,
      2,
      3,
    );
    expect(writes.filter((batch) => batch.at(-1)?.params?.at(-1) === "working-round")).toHaveLength(
      2,
    );
    expect(acknowledgementLost).toBe(true);
    const bindings: unknown[] = [];
    const relation = working.relation("links", {
      basis,
      bind: (value) => {
        bindings.push(value);
        return `$${bindings.length}`;
      },
      attribute: () => "",
      identifier: () => "",
      facts: () => "",
      recordedFacts: () => "",
      history: () => "",
    });
    expect(relation).toContain("scope_key = $1 AND run_id = $2 AND relation_name = $3");
    expect(bindings[0]).toBe(basis.scope);
    expect(bindings[2]).toBe("links");
    expect(() => working.relation("undeclared", {} as never)).toThrow();
    await working.cleanup();
    const cleanup = writes.at(-1)!;
    expect(cleanup.filter((statement) => statement.sql.startsWith("ERASE"))).toHaveLength(2);
    expect(cleanup.every((statement) => !statement.sql.includes("tx_assertions"))).toBe(true);
    expect(steps.some((step) => step.phase === "working-cleanup")).toBe(true);
  });

  it("returns no partial answer after a definitive row guard failure and still cleans its working run", async () => {
    const writes: XtdbStatement[][] = [];
    const client: XtdbClient = {
      submit: async (statements) => {
        writes.push([...statements]);
        if (statements.at(-1)?.params?.at(-1) === "working-seed")
          throw new XtdbTransactionRejected(new Error("triplex-native-reachability-limit"));
      },
      query: async () => [],
      close: async () => {},
    };
    await expect(
      materializeNativeReachability(
        client,
        basis,
        definitions,
        {},
        new AbortController().signal,
        [],
        1,
        3,
      ),
    ).rejects.toThrow();
    expect(
      writes
        .at(-1)
        ?.some((statement) => statement.sql.startsWith("ERASE FROM tx_native_relations")),
    ).toBe(true);
  });
});

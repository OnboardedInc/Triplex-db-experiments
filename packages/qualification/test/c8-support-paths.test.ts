import { describe, expect, it } from "vitest";
import { Effect } from "effect";
import { evaluateXtdbNativeWorkload } from "../src/native/xtdb-workloads.js";
import { evaluateQleverNativeWorkload } from "../src/native/qlever-workloads.js";

// [EXP-C8-R2] Why: exercise the public workload wiring, not just the shared helper.
// Rejected: a four-node DAG alone (the old length-1..3 implementation passes it).
describe("WL20 general support paths", () => {
  for (const lane of ["xtql", "xtdb-sql", "qlever"] as const) {
    it(`${lane}: counts long paths, duplicate edges and cycles without writes`, async () => {
      const calls: { text: string; options: any }[] = [];
      const edges = [
        ["a", "b"],
        ["b", "c"],
        ["c", "d"],
        ["d", "e"],
        ["a", "e"],
        ["c", "b"],
        ["a", "b"],
      ];
      const select = (_contract: any, input: any, build: any, options: any) => {
        const ctx = {
          facts: () => (lane === "xtdb-sql" ? "(SELECT * FROM facts)" : "(-> facts)"),
          attribute: () => "'support'",
          fact: () => "?assertion <urn:edge> ?target .",
        };
        calls.push({ text: build(ctx, input), options });
        return Effect.succeed({
          rows: edges.map(([source, target]) => ({ source, target })),
          basis: { recordedPosition: 7 },
          trace: {},
        });
      };
      const session = { select, selectSql: select } as any;
      const workload = { id: "20" };
      const entry = {
        id: "long-cycle",
        operation: "reachability_supports",
        cut: { known_at: "1", valid_at: "0" },
        parameters: { from: { value: "a" }, to: { value: "e" } },
      };
      const trace: unknown[] = [];
      const result = await Effect.runPromise(
        lane === "qlever"
          ? evaluateQleverNativeWorkload(session, workload, entry, new Map(), trace)
          : evaluateXtdbNativeWorkload(session, workload, entry, new Map(), trace, lane),
      );
      expect(result).toEqual([[true, { type: "integer", value: "2" }]]);
      expect(calls).toHaveLength(1);
      expect(calls[0]!.text).toContain(lane === "xtql" ? "(limit 100000)" : "LIMIT 100000");
      expect(calls[0]!.options.maxRows).toBe(100000);
      expect(trace).toHaveLength(2);
    });
  }
});

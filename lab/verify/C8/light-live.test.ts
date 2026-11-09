import { qleverLatencyReceipt } from "../../receipts/latency.mjs";
import { describe, it, expect } from "vitest";
import { Effect } from "effect";
import { DatabaseScope } from "@triplex-build/triplex/runtime";
import { TypeExpr } from "@triplex-build/triplex/config";
import {
  qleverConnectionModeOf,
  makeQleverClient,
  makeQleverNativeQueries,
} from "@triplex-build/triplex-qlever";
import { startQleverWriteCounter } from "../../../packages/qualification/src/engine-write-counter.ts";

// [CX-VC8] Why: tiny VALUES graph exercises real native closures without data writes, lifecycle calls or shared XTDB traffic. Rejected: C8 integration load test (outside light-check scope).
describe.skipIf(process.env.C8_LIGHT_LIVE !== "1")("CX-VC8 light QLever only", () => {
  it("native seeded closure on cycle and diamond, single-read and rounds, zero writes", async () => {
    const counter = await startQleverWriteCounter("http://127.0.0.1:7070");
    const client = makeQleverClient(counter.url);
    const native = makeQleverNativeQueries(client, DatabaseScope.test("cx-vc8-light"));
    try {
      const snapshots = [];
      for (const relationStrategy of ["single-read", "rounds"] as const) {
        counter.reset();
        const result = await Effect.runPromise(
          native.selectWithRelations(
            {
              name: "cx-vc8/closure",
              parameters: TypeExpr.struct({}),
              row: TypeExpr.struct({ target: TypeExpr.required(TypeExpr.text) }),
            },
            {},
            [
              {
                name: "e",
                seeds: () => ["a", "absent"],
                edges: () =>
                  'SELECT ?source ?target WHERE { VALUES (?source ?target) { ("a" "b") ("a" "c") ("b" "d") ("c" "d") ("d" "b") } }',
              },
            ],
            (ctx) => `SELECT ?target WHERE { ${ctx.relation("e", "a", "?target")} }`,
            { relationStrategy, timeoutMs: 15_000 },
          ),
        );
        expect(result.rows.map((r: any) => r.target).sort()).toEqual(["b", "c", "d"]);
        const counts = counter.counts();
        expect(counts).toMatchObject({ writes: 0, commits: 0, unparsed: 0 });
        expect(counts.statements).toBeGreaterThan(0);
        snapshots.push({ relationStrategy, rows: result.rows, counts, steps: result.trace.steps });
      }
      console.log(
        JSON.stringify(
          qleverLatencyReceipt({
            qleverConnectionMode: qleverConnectionModeOf(),
            proxyUpstreamConnectionMode: "keep-alive",
            liveEndpoint: "http://127.0.0.1:7070",
            snapshots,
          }),
        ),
      );
    } finally {
      await client.close();
      await counter.close();
    }
  }, 90_000);
});

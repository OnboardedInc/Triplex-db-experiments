import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { Effect } from "effect";
import { EntityId, KvTriples, Triples, json } from "@triplex-build/triplex";
import { Capabilities, DatabaseScope } from "@triplex-build/triplex/runtime";
import { makeXtdbRuntime } from "../src/index.js";

const program = Effect.gen(function* () {
  const triples = yield* Triples;
  const left = { a: 1, b: 2 };
  const right = { b: 2, a: 1 };
  yield* triples.assertBatch([
    {
      entityId: EntityId.make("json:left"),
      attribute: ":json/value",
      value: json(left),
      validFrom: 1,
    },
    {
      entityId: EntityId.make("json:right"),
      attribute: ":json/value",
      value: json(right),
      validFrom: 1,
    },
  ]);
  const projection = yield* triples.queryAll(
    { find: ["?value"], where: [["?entity", ":json/value", "?value"]] },
    { basis: { validAt: 100 } },
  );
  expect(projection.results.map((row) => row["?value"]).sort()).toEqual(
    [JSON.stringify(left), JSON.stringify(right)].sort(),
  );
  const equality = yield* triples.queryAll(
    { find: ["?entity"], where: [["?entity", ":json/value", JSON.stringify(left)]] },
    { basis: { validAt: 100 } },
  );
  expect(equality.results).toEqual([{ "?entity": "json:left" }]);
});

describe("Pinned Triplex JSON scalar compatibility", () => {
  it("KV keeps object insertion order in Datalog scalar projection and equality", async () => {
    await Effect.runPromise(program.pipe(Effect.provide(KvTriples.layer)));
  });
  it.skipIf(process.env["XTDB_INTEGRATION"] !== "1")(
    "XTDB preserves the same spelling while constraint identities are canonical",
    async () => {
      await Effect.runPromise(
        program.pipe(
          Effect.provide(
            makeXtdbRuntime({
              url: process.env["XTDB_URL"] ?? "postgres://xtdb:xtdb@localhost:5442/xtdb",
            }).layer({
              scope: DatabaseScope.test(`json-compatibility:${randomUUID()}`),
              capabilities: Capabilities.none,
            }),
          ),
          Effect.scoped,
        ),
      );
    },
  );
});

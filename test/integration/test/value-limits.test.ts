import { describe, it } from "vitest";
import { Effect } from "effect";
import { KvTriples } from "@triplex-build/triplex";
import { SqliteTriples } from "@triplex-build/triplex-sqlite";
import { valueLimitCases } from "@triplex-build/triplex-testkit";

for (const [name, layer] of [
  ["KV", KvTriples.layer],
  ["SQLite", SqliteTriples.layerMemory],
] as const) {
  describe(`GS12F ${name}`, () => {
    for (const test of valueLimitCases) {
      it(test.name, () => Effect.runPromise(test.run.pipe(Effect.provide(layer), Effect.scoped)));
    }
  });
}

import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { Effect } from "effect";
import { Capabilities, DatabaseScope } from "@triplex-build/triplex/runtime";
import { runtimeConformance, triplesConformanceCases } from "@triplex-build/triplex-testkit";
import { makeXtdbRuntime } from "@triplex-build/triplex-xtdb";

const enabled = process.env["XTDB_INTEGRATION"] === "1";

describe.skipIf(!enabled)("XTDB public runtime conformance", () => {
  it.skipIf(process.env["XTDB_CONFORMANCE_CASES"] === "1")(
    "runs the complete unchanged upstream 44-case runtime contract",
    async () => {
      expect(triplesConformanceCases).toHaveLength(44);
      const scope = DatabaseScope.test(`xtdb-conformance-${randomUUID()}`);
      const runtime = makeXtdbRuntime({
        url: process.env["XTDB_URL"] ?? "postgres://xtdb:xtdb@localhost:5442/xtdb",
      });
      await expect(
        Effect.runPromise(
          runtimeConformance(runtime, {
            scope,
            capabilities: Capabilities.none,
          }).pipe(Effect.scoped) as Effect.Effect<void, unknown, never>,
        ),
      ).resolves.toBeUndefined();
    },
    240_000,
  );
});

// Failure isolation only: the unchanged runtimeConformance run above remains the
// acceptance gate. Each diagnostic case gets a fresh storage/cursor scope.
describe.skipIf(!enabled || process.env["XTDB_CONFORMANCE_CASES"] !== "1")(
  "XTDB upstream case diagnostics",
  () => {
    it.each(triplesConformanceCases)(
      "$name",
      async ({ run }) => {
        const scope = DatabaseScope.test(`xtdb-case-${randomUUID()}`);
        const runtime = makeXtdbRuntime({
          url: process.env["XTDB_URL"] ?? "postgres://xtdb:xtdb@localhost:5442/xtdb",
        });
        await Effect.runPromise(
          run.pipe(
            Effect.provide(runtime.layer({ scope, capabilities: Capabilities.none })),
            Effect.scoped,
          ) as Effect.Effect<void, unknown, never>,
        );
      },
      120_000,
    );
  },
);

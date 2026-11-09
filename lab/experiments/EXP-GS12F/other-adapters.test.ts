import { randomUUID } from "node:crypto";
import { Effect } from "effect";
import { describe, it } from "vitest";
import { valueLimitCases, exactIntegerLimitCase } from "@triplex-build/triplex-testkit";
import { Capabilities, DatabaseScope } from "@triplex-build/triplex/runtime";

// [EXP-GS12F] Why: keep non-lab adapters executable without provisioning unrelated services.
// Rejected: auto-starting Testcontainers (bypasses this lab's engine ownership).
describe.skipIf(!process.env["GS12F_DUCKDB_ARTIFACTS"])("GS12F DuckDB", () => {
  for (const test of [...valueLimitCases, exactIntegerLimitCase]) {
    it(test.name, async () => {
      const { makeDuckDBRuntime } = await import("@triplex-build/triplex-duckdb");
      const runtime = await makeDuckDBRuntime({
        nativeArtifactsDirectory: process.env["GS12F_DUCKDB_ARTIFACTS"]!,
        memoryLimit: "256MB",
      });
      await Effect.runPromise(
        test.run.pipe(
          Effect.provide(
            runtime.layer({
              scope: DatabaseScope.test(`gs12f:${randomUUID()}`),
              capabilities: Capabilities.none,
            }),
          ),
          Effect.scoped,
        ),
      );
    });
  }
});

describe.skipIf(!process.env["GS12F_FDB_CLUSTER"])("GS12F FoundationDB", () => {
  for (const test of valueLimitCases) {
    it(test.name, async () => {
      const { FdbTriples } = await import("@triplex-build/triplex-foundationdb");
      await Effect.runPromise(
        test.run.pipe(
          Effect.provide(
            FdbTriples.layer({
              clusterFile: process.env["GS12F_FDB_CLUSTER"]!,
              subspace: Buffer.from(`gs12f:${randomUUID()}:`),
            }),
          ),
          Effect.scoped,
        ),
      );
    });
  }
});

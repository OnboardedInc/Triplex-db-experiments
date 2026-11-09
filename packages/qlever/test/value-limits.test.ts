import { randomUUID } from "node:crypto";
import { Effect } from "effect";
import { describe, it } from "vitest";
import { exactIntegerLimitCase, valueLimitCases } from "@triplex-build/triplex-testkit";
import { Capabilities, DatabaseScope } from "@triplex-build/triplex/runtime";
import { makeQleverRuntime } from "../src/index.js";

describe.skipIf(process.env["QLEVER_INTEGRATION"] !== "1")("GS12F qlever value limits", () => {
  for (const test of [...valueLimitCases, exactIntegerLimitCase]) {
    it(
      test.name,
      () =>
        Effect.runPromise(
          test.run.pipe(
            Effect.provide(
              makeQleverRuntime({ url: process.env["QLEVER_URL"]! }).layer({
                scope: DatabaseScope.test(`gs12f:${randomUUID()}`),
                capabilities: Capabilities.none,
              }),
            ),
            Effect.scoped,
          ),
        ),
      120_000,
    );
  }
});

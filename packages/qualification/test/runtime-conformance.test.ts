import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { Effect } from "effect";
import { Capabilities, DatabaseScope } from "@triplex-build/triplex/runtime";
import { runtimeConformance, triplesConformanceCases } from "@triplex-build/triplex-testkit";
import {
  loadQualificationBackend,
  qualificationBackendName,
} from "@triplex-build/triplex-qualification";

const enabled = process.env["TRIPLEX_INTEGRATION"] === "1";
describe.skipIf(!enabled)(`${qualificationBackendName()} shared runtime conformance`, () => {
  it.skipIf(process.env["TRIPLEX_CONFORMANCE_CASES"] === "1")(
    "runs exactly the unchanged upstream44cases",
    async () => {
      expect(triplesConformanceCases).toHaveLength(44);
      const backend = await loadQualificationBackend();
      const scope = DatabaseScope.test(`${backend.name}-conformance-${randomUUID()}`);
      await Effect.runPromise(
        runtimeConformance(backend.makeRuntime(), { scope, capabilities: Capabilities.none }).pipe(
          Effect.scoped,
        ),
      );
    },
    240_000,
  );
});

describe.skipIf(!enabled || process.env["TRIPLEX_CONFORMANCE_CASES"] !== "1")(
  `${qualificationBackendName()} unchanged case diagnostics`,
  () => {
    it.each(triplesConformanceCases)(
      "$name",
      async ({ name, run }) => {
        const backend = await loadQualificationBackend();
        const scope = DatabaseScope.test(`${backend.name}-case-${randomUUID()}`);
        console.log(JSON.stringify({ backend: backend.name, case: name, phase: "START", scope }));
        await Effect.runPromise(
          run.pipe(
            Effect.provide(backend.makeRuntime().layer({ scope, capabilities: Capabilities.none })),
            // Give the scoped Effect a chance to interrupt and release its own
            // resources before Vitest's independent watchdog ends the test.
            // This does not establish server-side work reclamation.
            Effect.timeout("110 seconds"),
            Effect.scoped,
          ),
        );
      },
      120_000,
    );
  },
);

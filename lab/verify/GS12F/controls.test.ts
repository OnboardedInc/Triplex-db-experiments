import { Effect } from "effect";
import { it } from "vitest";
import { KvTriples } from "@triplex-build/triplex";
import { valueLimitCases } from "@triplex-build/triplex-testkit";

// [CX-VGS12F] Why: independently execute both existing memory controls at the reviewed source.
// Rejected: copying historical builder success totals into this review.
for (const test of valueLimitCases) {
  it(`memory control: ${test.name}`, () =>
    Effect.runPromise(test.run.pipe(Effect.provide(KvTriples.layer), Effect.scoped)));
}

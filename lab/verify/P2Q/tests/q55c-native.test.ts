// Q55c probe of the native SPARQL surface's basis rule. makeQleverNativeQueries (native/NativeQueries.ts) reads the
// replica's `position` triple as its source cut (in broker mode buildPublication keeps it equal to the marker,
// lastPositionOf(lsn)) and passes it to the shared resolver below; it has no broker hook.
import { describe, expect, it } from "vitest";
import { DatabaseScope, resolveNativeReadBasis } from "@triplex-build/triplex/runtime";
import { writeJson } from "./harness.js";

describe("native SPARQL basis token above the replica watermark", () => {
  it("fails at once with an untyped RangeError (no wait within the deadline, no BasisNotAvailable)", () => {
    const scope = DatabaseScope.test("v-p2q-native");
    let thrown: unknown;
    const t0 = performance.now();
    try {
      resolveNativeReadBasis({ scope, options: { basis: { recordedPosition: 5_000 } } as any, currentPosition: 3_071, now: Date.now() });
    } catch (error) {
      thrown = error;
    }
    const ms = performance.now() - t0;
    const without = resolveNativeReadBasis({ scope, currentPosition: 3_071, now: Date.now() });
    writeJson("q55c-native-basis.json", {
      withTokenAboveWatermark: { error: (thrown as Error)?.constructor?.name, message: (thrown as Error)?.message, ms },
      withoutToken: { recordedPosition: without.recordedPosition },
    });
    expect(thrown).toBeInstanceOf(RangeError);
    expect(without.recordedPosition).toBe(3_071);
  });
});

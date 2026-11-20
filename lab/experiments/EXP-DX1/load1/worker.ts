import assert from "node:assert/strict";
import { openComposition } from "../../../bench/lib/composition.ts";
import { profile } from "./profile.ts";
const [mode, scope, arm, dir, people, capacity] = process.argv.slice(2);
assert(scope && dir && arm && mode && people);
const comp = await openComposition("reach", "datomic", scope);
try {
  assert.equal(await comp.currentPosition(), 0, "Arm requires a fresh physical database");
  const result =
    mode === "load-profile"
      ? await profile(comp, scope, Number(people), dir, arm)
      : mode === "load-proof"
        ? await (await import("./file-proof.ts")).proveFile(comp, scope, Number(people), dir, arm)
        : mode === "load-quiet"
          ? await (await import("./quiet.ts")).quiet(comp, scope, Number(people), dir, arm)
          : mode === "load-live"
            ? await (
                await import("./live.ts")
              ).live(comp, scope, Number(people), dir, arm, capacity === "server")
            : undefined;
  assert(result);
  console.log(
    JSON.stringify({
      nonce: process.env.TRIPLEX_TRACE_RUN,
      source: process.env.TRIPLEX_TRACE_SOURCE,
      slot: process.env.TRIPLEX_TRACE_SLOT,
      arm,
      ...result,
    }),
  );
} finally {
  await comp.close();
}

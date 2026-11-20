import assert from "node:assert/strict";
import { openComposition } from "../../../bench/lib/composition.ts";
import { profile } from "./profile.ts";
const [mode, scope, arm, dir, people] = process.argv.slice(2);
assert(scope && dir && arm && mode && people);
const comp = await openComposition("reach", "datomic", scope);
try {
  assert.equal(await comp.currentPosition(), 0, "Arm requires a fresh physical database");
  assert.equal(mode, "load-profile");
  const result = await profile(comp, scope, Number(people), dir, arm);
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

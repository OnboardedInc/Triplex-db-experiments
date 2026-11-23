import assert from "node:assert/strict";
import { test } from "node:test";
import { realisticTape, sweepSize, thinLimit } from "./realistic-plan.ts";
import { timeBudget } from "./profile.ts";
import type { Account } from "../real1/population.ts";

for (const profile of ["first", "full"] as const) test(`${profile} replay preserves quiet offers and isolates the thin sweep`, () => {
  const accounts: Account[] = Array.from({ length: 111 }, (_, id) => ({
    id, kind: id < 10 ? "deep" : id === 10 ? "thin" : "small",
    people: id < 10 ? 100_000 : id === 10 ? (profile === "first" ? 1_000_000 : 4_500_000) : 100,
  }));
  const roster = { accounts, profile };
  const solo = realisticTape(roster, "alone", 300, 0);
  const loaded = realisticTape(roster, "loaded", 300, 46.5);
  assert.equal(loaded.length, 15_000);
  assert.deepEqual(loaded.filter(x => x.account === 0).map(({version: _, ...rest}) => rest),
    solo.map(({version: _, ...rest}) => rest));
  const busy = loaded.filter(x => x.account !== 0);
  const thin = busy.filter(x => x.account === 10), small = busy.filter(x => x.account > 10);
  assert.equal(new Set(small.map(x => x.account)).size, 100);
  assert(Math.abs(thin.length / busy.length - 0.15) < 0.001);
  assert(Math.abs(small.length / busy.length - 0.05) < 0.001);
  assert(thin.every(x => x.width === 1 && x.subject < thinLimit(accounts[10]!, profile)));
  assert.equal(thinLimit(accounts[10]!, profile) + sweepSize(profile), 999_998);
});
test("realistic hashing and the thin sweep leave the 280-minute reference allocation intact", () => {
  assert.equal(timeBudget(300).ceiling, 280);
  assert.equal(timeBudget(300, true).ceiling, 330);
});

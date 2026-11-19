import assert from "node:assert/strict";
import test from "node:test";
import { interferenceTrace, interferencePhases, windowSeconds } from "./interference.ts";
import { smallPhases, smallPeople, smallTrace } from "./small-plan.ts";
import { requireIdentity } from "../../../bench/lib/deep-profile.ts";
import { randomUUID } from "node:crypto";
// [DX-SCALE1] Why: a one-versus-ten comparison must preserve every sentinel arrival as neighbors join, with different databases and independent streams. Rejected: checking only average configured rates or a pooled percentile.
test("four steady interference cohorts have identical sentinel offers, and both burst windows match", () => {
  const p = interferenceTrace(0),
    per = Array.from({ length: 6 }, (_, i) =>
      p.events
        .filter(
          (e) =>
            !e.resend &&
            e.atMs >= i * windowSeconds * 1000 &&
            e.atMs < (i + 1) * windowSeconds * 1000,
        )
        .map((e) => Math.round((e.atMs - i * windowSeconds * 1000) * 1000)),
    );
  for (const i of [1, 2, 3]) assert.deepEqual(per[i], per[0]);
  assert.deepEqual(per[4], per[5]);
  assert(per[0]!.length >= 500 && per[4]!.length > 4500);
  assert.equal(interferencePhases(0).filter((p) => p.readers === 64).length, 10);
  const last = interferenceTrace(9);
  assert.deepEqual(last.cohortCounts.slice(0, 3), [0, 0, 0]);
  assert(!last.events.some((e) => e.burst && e.atMs < 5 * windowSeconds * 1000));
});
test("one hundred distinct low-rate scopes retain their own sizes, sentinel and business commands", () => {
  const roster = Array.from({ length: 100 }, (_, i) => smallPeople(i));
  assert.equal(roster.filter((n) => n === 100).length, 90);
  assert.equal(
    roster.reduce<number>((a, b) => a + b, 0),
    29000,
  );
  const id = {
    nonce: randomUUID(),
    source: "a".repeat(40),
    slot: "tx2-dxscale1-test",
    arm: "small" as const,
    account: 99,
    people: 2000,
  };
  requireIdentity(id);
  assert.throws(() => requireIdentity({ ...id, people: 100 }));
  assert.throws(() => requireIdentity({ ...id, account: 100 }));
  const slots = (s: number) => smallTrace(s).events.filter((e) => !e.resend);
  const busy = slots(0),
    low = slots(1);
  assert.deepEqual(
    busy.filter((e) => e.atMs < 360000).map((e) => Math.round(e.atMs * 1000)),
    busy
      .filter((e) => e.atMs >= 360000 && e.atMs < 720000)
      .map((e) => Math.round((e.atMs - 360000) * 1000)),
  );
  assert.equal(low.length, 12);
  assert.equal(busy.filter((e) => e.atMs >= 720000).length, 6);
  assert.equal(smallPhases(1)[0]!.readers, 0);
});

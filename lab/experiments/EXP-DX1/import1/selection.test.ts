import assert from "node:assert/strict";
import test from "node:test";
import { choose } from "./selection.ts";
import { compare } from "./campaign.ts";
test("the bench requires complete, trace-matched measurements for every account", () => {
  const scope = (id: string) => ({
    scope: id,
    people: 10000,
    readers: 128,
    seedFacts: 900,
    digest: "trace",
    offers: "offers",
    read: { n: 550, p99: 8 },
    commit: { n: 510, p99: 12 },
  });
  const b = { id: "b", ms: 1000, scopes: [scope("b1"), scope("b2")] };
  const r = {
    ...b,
    id: "r",
    complete: true,
    sourceSeal: "s",
    rate: 3200,
    facts: 3200,
    exactFacts: 3200,
    scopes: [scope("r1"), scope("r2")],
  };
  assert.equal(compare(b as any, r as any, true).withinProvisional, true);
  assert.equal(compare(b as any, r as any, false).withinProvisional, null);
  r.scopes[1]!.read.p99 = 16;
  assert.equal(compare(b as any, r as any, true).withinProvisional, false);
  r.scopes[1]!.read.n = 12;
  assert.equal(compare(b as any, r as any, true).withinProvisional, null);
  r.scopes[1]!.offers = "different";
  assert.throws(() => compare(b as any, r as any, true));
});
test("protect the importing account when selecting an operating point", () => {
  const point = (i: number, safe: boolean | null, ratio: number) => ({
    arm: "p" + i,
    rate: 3000 + i,
    maxService: 20 + i,
    withinProvisional: safe,
    scopes: [
      { read: ratio, commit: 1 },
      { read: 1, commit: 1 },
    ],
  });
  const points = [point(0, false, 1), point(1, true, 1.1), point(2, true, 2), point(3, null, 1.1)];
  assert.deepEqual(choose(points), { index: 1, selection: "screened", observedMaxHoldMs: 21 });
  assert.equal(
    choose(points.map((r) => ({ ...r, withinProvisional: null }))).selection,
    "exploratory",
  );
});

import assert from "node:assert/strict";
import test from "node:test";
import { measurements, score, type Identity, type Metrics } from "./score.ts";

const identity = {
  tag: "p9-fixture",
  sha: "a".repeat(40),
  seedSha256: "b".repeat(64),
  age: "fresh",
  layout: "two-host",
  policy: "B",
} satisfies Identity;
const metrics = {
  lost: 0,
  acknowledged: 42,
  resumeMs: 60000,
  unavailableReadOffers: 0,
  readOffers: 2750,
  longestReadGapMs: 42,
  readCoverage: true,
  moveMs: 30000,
} satisfies Metrics;

test("outputs all four bars at their inclusive limits", () => {
  for (const id of measurements) assert.equal(score(id, metrics, identity).verdict, "PASS");
});

test("missed bars and censored or empty evidence fail", () => {
  assert.equal(score("write-recovery", { ...metrics, resumeMs: 60001 }, identity).verdict, "FAIL");
  assert.equal(score("planned-move", { ...metrics, moveMs: null }, identity).verdict, "FAIL");
  assert.equal(score("lost-writes", { ...metrics, acknowledged: 0 }, identity).verdict, "FAIL");
  assert.equal(score("lost-writes", { ...metrics, lost: 1 }, identity).verdict, "FAIL");
  assert.equal(
    score("read-continuity", { ...metrics, readCoverage: false }, identity).verdict,
    "FAIL",
  );
  assert.equal(
    score("read-continuity", { ...metrics, unavailableReadOffers: 1 }, identity).verdict,
    "FAIL",
  );
});

test("one-host rehearsal does not qualify as machine-loss evidence", () => {
  const row = score("lost-writes", metrics, { ...identity, layout: "one-host" });
  assert.equal(row.verdict, "PASS");
  assert.equal(row.qualifiesMachineLoss, false);
});

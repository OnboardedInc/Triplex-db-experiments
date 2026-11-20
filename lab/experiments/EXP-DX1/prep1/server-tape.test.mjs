import assert from "node:assert/strict";
import test from "node:test";
import { arms, cells, fairArms, fairPrediction, fairSeconds } from "./server-tape.ts";

test("the four fair-policy arms share their sealed field inputs and matched quiet arrivals", () => {
  const original = new Map(cells(arms[0]).map(({ label, tape }) => [label, tape]));
  const first = new Map(cells(fairArms[0]).map(({ label, tapeSha }) => [label, tapeSha]));
  const payload = ({ ms, ...offer }) => offer;
  for (const arm of fairArms) {
    const schedule = cells(arm);
    assert.equal(schedule.length, 4);
    for (const { label, tape, rate, tapeSha, duration } of schedule) {
      assert.equal(tapeSha, first.get(label));
      assert.equal(duration, fairSeconds);
      assert.equal(tape.length, label.endsWith("-alone") ? 210 : rate * fairSeconds);
      assert(tape.every(({ ms }, i) => ms >= (tape[i - 1]?.ms ?? 0) && ms < fairSeconds * 1000));
      for (let account = 0; account < 10; account++) {
        const taken = tape.filter((offer) => offer.account === account);
        const fromSeed = original.get(label).filter((offer) => offer.account === account);
        assert.deepEqual(taken.map(payload), fromSeed.slice(0, taken.length).map(payload));
      }
    }
    for (const rate of [235, 394]) {
      const quiet = schedule.find(({ label }) => label === `r${rate}-alone`).tape;
      const loaded = schedule.find(({ label }) => label === `r${rate}-loaded`).tape;
      assert.deepEqual(
        loaded.filter(({ account }) => account === 0),
        quiet,
      );
    }
  }
  for (const [a, b] of [
    [0, 1],
    [2, 3],
  ])
    assert.deepEqual(
      cells(fairArms[a]).map((c) => c.label),
      cells(fairArms[b]).map((c) => c.label),
    );
});

test("predictions express the one-credit round trip and distinguish a missing full-cohort tail", () => {
  assert.deepEqual(
    fairArms.map((arm) => fairPrediction(arm, 394, false).serving),
    [383, 125, 125, 394],
  );
  assert.deepEqual(
    fairArms.map((arm) => fairPrediction(arm, 394, false).p99Ms),
    [null, null, null, 28],
  );
  for (const arm of fairArms) assert.equal(fairPrediction(arm, 235, true).serving, 3.5);
});

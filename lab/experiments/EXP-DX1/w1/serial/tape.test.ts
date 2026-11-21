import assert from "node:assert/strict";
import test from "node:test";
import { serialApplyTape, writeTape } from "../../scale1/decision/plan.ts";

test("serial comparison retains the field tape's quiet dose and open-loop schedule", () => {
  const reference = writeTape(10000, 394, 0, true);
  const low = serialApplyTape(10000, 394);
  const high = serialApplyTape(10000, 620);
  const payload = ({ version: _version, ...fields }: (typeof low)[number]) => fields;
  assert.equal(low.length, 394 * 300);
  assert.equal(high.length, 620 * 300);
  assert.deepEqual(low.map(payload), reference.map(payload));
  assert.deepEqual(low.filter(x => x.account === 0).map(payload), high.filter(x => x.account === 0).map(payload));
  for (const tape of [low, high]) {
    assert.equal(new Set(tape.map(x => x.version)).size, tape.length);
    assert.equal(tape.filter(x => x.account === 0).length, 1050);
    assert(tape.every((x, i) => x.ms >= 0 && x.ms < 300_000 && (i === 0 || x.ms >= tape[i - 1]!.ms)));
  }
});

test("the aged comparison offers both two-minute loads with the same quiet tape", () => {
  const low = serialApplyTape(100000, 50, 120);
  const high = serialApplyTape(100000, 235, 120);
  const quiet = (tape: typeof low) => tape.filter((entry) => entry.account === 0)
    .map(({ version: _version, ...fields }) => fields);
  assert.equal(quiet(low).length, 420);
  assert.deepEqual(quiet(low), quiet(high));
  assert.equal(low.length, 6000);
  assert.equal(high.length, 28200);
  assert.equal(new Set([...low, ...high].map((entry) => entry.version)).size, 34200);
  assert([...low, ...high].every((entry) => 0 <= entry.ms && entry.ms < 120000));
});

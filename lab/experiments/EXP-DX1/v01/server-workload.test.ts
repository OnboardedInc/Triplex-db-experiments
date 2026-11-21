import assert from "node:assert/strict";
import { test } from "node:test";
import { launchProfile } from "../jvm1/launch.mjs";
import { timeBudget, serverStages } from "./profile.ts";
import { parseCredits, ratedTape, writerCredits, serverRates, widePeople } from "./server-workload.ts";

test("server schedule keeps the default JVM on both comparison arms", () => {
  const stages = serverStages("per-person-ordered", launchProfile("server", { txJvm: "j25-zgc" }), true);
  assert.equal(timeBudget(90).ceiling, 300);
  assert.equal(timeBudget(300).ceiling, 384);
  assert.deepEqual(stages.map(s => [s.name, s.loaded, s.policy.tx.collector, s.policy["gw-w"].collector, s.separateWal]),
    [["headline", false, "ZGC", "G1", true], ["headline", true, "ZGC", "G1", true],
     ["server-default", true, "G1", "G1", false], ["grouped", true, "G1", "G1", false]]);
  assert(stages.every(s => s.policy.tx.cores === 3 && s.policy.tx.cacheMiB === 16_384 &&
    s.policy.pg.settings.synchronous_commit === "on"));
});

test("each offered-rate pair uses the same quiet offsets and the wide neighbour bands", () => {
  for (const seconds of [90, 300] as const) for (const rate of serverRates) {
    const alone = ratedTape(100_000, { rate, loaded: false }, seconds), loaded = ratedTape(100_000, { rate, loaded: true }, seconds);
    assert.equal(alone.length, 3.5 * seconds);
    assert.equal(loaded.length, rate * seconds);
    const quiet = (tape: typeof alone) => tape.filter(o => o.account === 0).map(o => [o.subject, o.ms, o.width]);
    assert.deepEqual(quiet(alone), quiet(loaded));
    assert.equal(new Set(loaded.map(o => o.version)).size, loaded.length);
    for (let account = 1; account <= 9; account++) {
      const offers = loaded.filter(o => o.account === account);
      assert.equal(new Set(offers.map(o => o.subject)).size, Math.min(offers.length, widePeople));
    }
  }
});

test("the credit selection never relabels barrier observations as rolling", () => {
  assert.equal(writerCredits(parseCredits()), 6);
  assert.equal(writerCredits(parseCredits("barrier")), 6);
  assert.throws(() => writerCredits(parseCredits("rolling:6")), /published writer option/);
  assert.throws(() => parseCredits("rolling:0"), /Choose --credit-mode/);
});

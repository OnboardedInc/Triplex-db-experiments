import assert from "node:assert/strict";
import { test } from "node:test";
import { launchProfile } from "../jvm1/launch.mjs";
import { timeBudget, serverStages } from "./profile.ts";
import { parseCredits, ratedTape, writerAdmission, serverRates, widePeople } from "./server-workload.ts";

test("the lean barrier control changes only credit mode", () => {
  const picked = launchProfile("server", { txJvm: "j25-zgc", writeJvm: "j21-g1", creditMode: "rolling12" });
  const stages = serverStages(picked, true);
  assert.equal(timeBudget(90).ceiling, 224);
  assert.equal(timeBudget(300).ceiling, 280);
  assert.deepEqual(stages.map(s => [s.name, s.loaded, s.policy.creditMode, s.separateWal]),
    [["headline", false, "rolling12", true], ["headline", true, "rolling12", true], ["barrier6", true, "barrier6", true]]);
  assert.deepEqual(stages[2].policy, { ...picked, creditMode: "barrier6" });
  assert.equal(picked["gw-w"].collector, "G1");
  assert.equal(picked.tx.collector, "ZGC");
  assert.equal(picked.pg.settings.synchronous_commit, "on");
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

test("credit mode selects the published writer admission", () => {
  assert.deepEqual(writerAdmission(parseCredits()), { mode: "barrier", credits: 6 });
  assert.deepEqual(writerAdmission(parseCredits("barrier6")), { mode: "barrier", credits: 6 });
  for (const credits of [6, 8, 12, 16]) {
    assert.deepEqual(writerAdmission(parseCredits(`rolling${credits}`)), { mode: "rolling", credits });
  }
  assert.throws(() => parseCredits("rolling7"), /Choose --credit-mode/);
});

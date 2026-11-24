import assert from "node:assert/strict";
import { test } from "node:test";
import { hostHeadroomMiB, launchProfile, roleMemoryMiB, server32HostMiB } from "../jvm1/launch.mjs";
import { p1Reader, parseReader, randomLineLoads, randomLineMinutes, readerEnvironment, readerFromEnvironment, readerLaunch,
  readerStackOptions, readerTitle } from "./card-reader.ts";
import { timeBudget } from "./profile.ts";
import { fullCellTape } from "./production-card.ts";
import { parseWindow, quietGateCommits, ratedTape, serverRates, shortestGateSeconds } from "./server-workload.ts";

// [DX-CARD2] The tuned reader as a card setting, the random-subject line's loads, and the cell length setting.
test("the default reader records nothing and the tuned reader carries exactly its settings", () => {
  for (const [reader, permits] of [[undefined, undefined], ["default", undefined]] as const) {
    const parsed = parseReader(reader, permits);
    assert.equal(parsed, undefined);
    assert.deepEqual([readerEnvironment(parsed), readerLaunch(parsed), readerStackOptions(parsed), readerTitle(parsed), randomLineMinutes(parsed), p1Reader(parsed, false)],
      [[], {}, {}, "", 0, undefined]);
  }
  const tuned = parseReader("tuned", "12")!;
  assert.deepEqual(tuned, { reader: "tuned", readPermits: 12 });
  assert.deepEqual(readerFromEnvironment(Object.fromEntries(readerEnvironment(tuned))), tuned);
  assert.deepEqual(readerFromEnvironment(Object.fromEntries(readerEnvironment({ reader: "tuned" }))), { reader: "tuned" });
  assert.deepEqual(readerStackOptions(tuned), { DX_PINNED_SHORTCUT: "1", DX_PINNED_CUT_LOOKUP: "1", DX_RD1_READ_FILTER: "1",
    DX_RD1_READ_PROFILE: "1", DX_READ_PERMITS: "12" });
  assert.equal(readerStackOptions({ reader: "tuned" }).DX_READ_PERMITS, undefined);
  assert.deepEqual(p1Reader(tuned, false, "/t/gw-r.jsonl"), { batch: 8, random: { seats: 256, profileEvery: 16, trace: "/t/gw-r.jsonl" } });
  assert.deepEqual(p1Reader(tuned, true), { batch: 8, random: { seats: 4, profileEvery: 16 } });
  assert.equal(randomLineMinutes(tuned), 2);
  assert.match(readerTitle(tuned), /12 read permits/);
  assert.match(readerTitle({ reader: "tuned" }), /3 read permits \(one per core\)/);
  assert.throws(() => parseReader("fast", undefined), /Choose --reader/);
  assert.throws(() => parseReader(undefined, "12"), /only with --reader tuned/);
  assert.throws(() => parseReader("default", "12"), /only with --reader tuned/);
  for (const bad of ["0", "100", "3.5", "x"]) assert.throws(() => parseReader("tuned", bad), /1 to 99/);
});

test("the tuned reader launches on server and on server-32 within the guard", () => {
  const options = { txJvm: "j25-zgc", writeJvm: "j21-g1", creditMode: "rolling6" } as const;
  for (const profile of ["server", "server-32"] as const) {
    const policy = launchProfile(profile, { ...options, ...readerLaunch({ reader: "tuned", readPermits: 12 }) });
    assert.deepEqual([policy["gw-r"].cpus, policy["gw-r"].cacheMiB, policy["gw-w"].cpus], ["5,6,11", 3072, "2,3,4"]);
    assert(roleMemoryMiB(policy) + hostHeadroomMiB <= server32HostMiB);
  }
});

test("the random line's loads per subject and cache share reproduce the 1 billion arm's own figures", () => {
  // ref-random-seed-cut, 3 permits (evidence/DX-SCALE1/pinned-saves-1b-e02): 1.85 sampled, 2.00 by the reader's
  // StorageGet count (STATUS 2026-11-23 21:19); cache share 77.7% there was the two minutes unweighted, 77.79% weighted
  // by each minute's seconds inside the window.
  const records = { sampled: 765, found: 765, handlerCpuMs: { mean: 8.651577992156875 },
    ioStatsSums: { "reads.sql": 11340, "reads.ocache": 29215 },
    metricsMinutes: [
      { overlapSeconds: 27.7, storageGets: 117317, cacheRequests: 575389, cacheHits: 446169 },
      { overlapSeconds: 60, storageGets: 136269, cacheRequests: 689999, cacheHits: 537446 }] };
  const loads = randomLineLoads(records, 1085.5111111111112, 8)!;
  assert.equal(loads.storageReadsPerExchange, 14.824);
  assert.equal(loads.loadsPerSubjectSampled, 1.853);
  assert.equal(loads.loadsPerSubjectMetrics, 2);
  assert.equal(loads.cacheShare, 0.7779);
  assert.equal(loads.handlerCpuMsPerExchange, 8.652);
  assert.equal(randomLineLoads({ ...records, found: 0 }, 1000, 8), undefined);
  assert.equal(randomLineLoads(undefined, 1000, 8), undefined);
});

test("cell lengths: 90 and 300 as before, multiples of 30 up to 600, and 150 s is the shortest that meets the P6 gate", () => {
  assert.deepEqual([parseWindow(undefined), parseWindow("90"), parseWindow("300"), parseWindow("150"), parseWindow("600")], [300, 90, 300, 150, 600]);
  for (const bad of ["60", "100", "630", "150.0", "0150", "-90"]) assert.throws(() => parseWindow(bad), /Choose --window-seconds/);
  assert.equal(shortestGateSeconds, 150);
  // Every load offers the same quiet stream, so the per-side count does not depend on the load.
  for (const seconds of [90, 120, 150, 300]) for (const rate of serverRates) {
    const quiet = ratedTape(100_000, { rate, loaded: false }, seconds).length;
    assert.equal(quiet, 3.5 * seconds);
    assert.equal(ratedTape(100_000, { rate, loaded: true }, seconds).filter((e) => e.account === 0).length, quiet);
    assert.equal(quiet >= quietGateCommits, seconds >= shortestGateSeconds, `${seconds} s at ${rate}/s`);
  }
  // The production-shaped tape, shape S, builds at 150 s with every offer inside the cell.
  for (const rate of serverRates) {
    const tape = fullCellTape("S", { rate, loaded: true }, 150);
    assert(tape.every((e) => e.ms >= 0 && e.ms < 150_000), `${rate}/s: an offer outside the 150 s cell`);
    assert.equal(tape.filter((e) => e.account === 0).length, 525);
  }
  // The time budget: 8 cells × 60 s more than 90 s cells in P6 and in the barrier6 control, and 2 minutes for the line.
  assert.equal(timeBudget(150).ceiling - timeBudget(90).ceiling, 16);
  assert.equal(timeBudget(90, false, 2).ceiling - timeBudget(90).ceiling, 2);
  assert.equal(timeBudget(90, false, 2).budget.adoptionAndP1to4, 91);
});

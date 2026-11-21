// @ts-nocheck -- [EXP-CHECKJS] Linux profile, exact cuts and storage observations are validated before use.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { minimumRate } from "./bulk-metrics.mjs";

const GiB = 2 ** 30;
const minute = 60_000;
export const continuationArm = { size: 1, depth: 256 };
export const continuationPrior = 22_000;
export const directoryMargin = 16 * GiB;

export function allocatedBytes(dir) {
  const bytes = Number(execFileSync("du", ["-s", "-B1", dir], { encoding: "utf8", timeout: 10_000 }).split(/\s/)[0]);
  assert(Number.isSafeInteger(bytes) && bytes > 0, "Missing allocated PGDATA bytes");
  return bytes;
}

export function collectedSegments(log) {
  const rows = log.split(/\r?\n/).map((line) => /^\{:finished true, :segments (\d+)\}$/.exec(line)).filter(Boolean);
  assert.equal(rows.length, 1, "Datomic collection did not report one successful completion");
  return Number(rows[0][1]);
}

export function sameStorage(dir, directory, pid) {
  assert(Number.isSafeInteger(pid) && pid > 1 && path.isAbsolute(directory));
  assert.equal(fs.readFileSync("/proc/" + pid + "/comm", "utf8").trim(), "postgres");
  const live = fs.statSync("/proc/" + pid + "/root" + directory);
  const held = fs.statSync(dir);
  assert.deepEqual([live.dev, live.ino], [held.dev, held.ino], "SQL data directory is not this cluster");
}

export function forecastSlope(samples, target, cap) {
  if (samples.length < 3) return { over: false };
  const last = samples.at(-1);
  const project = (earlier) => last.pgdata + Math.max(0, (last.pgdata - earlier.pgdata) /
    Math.max(1, last.records - earlier.records)) * (target - last.records);
  const sinceStart = project(samples[0]);
  const lastCycle = project(samples.at(-2));
  return { sinceStart, lastCycle, over: sinceStart > cap && lastCycle > cap };
}

export async function continueLoad({
  config, read, write, hashes, logDir, rung, state, origin, deadline, calibration, inspected,
  bulkPhase, collect, sample, directory, stableFloor,
}) {
  const startFile = path.join(rung, "load-start.json");
  const cycleFile = path.join(rung, "load-cycles.json");
  const start = {
    calibrationSha: calibration.certificateSha, checkpointSha: calibration.checkpointSha,
    catalogSha: calibration.best.identitySha, records: calibration.records, t: calibration.t,
  };
  if (!fs.existsSync(startFile)) {
    assert(!inspected.pending);
    assert.deepEqual([inspected.t, inspected.records, hashes(state)], [start.t, start.records, start.checkpointSha]);
    write(startFile, start);
  }
  assert.deepEqual(read(startFile), start);

  const cycles = fs.existsSync(cycleFile) ? read(cycleFile) : [];
  const checkpoint = async (tag, t, records, gc) => {
    const before = await sample(tag + "-before", "sample");
    assert.deepEqual([before.t, before.records], [t, records]);
    sameStorage(config.pgData, before.sql.directory, config.postgresPid);
    const previousDirectory = directory();
    // [DX-AGE1] Why: close the writer JVM, fully index its cut and use a cutoff before this fresh maintenance peer.
    // Rejected: collecting against a live older basis or treating the background request as evidence of completed deletion.
    const cutoff = new Date(Date.now() - 2 * minute).toISOString();
    const segments = await gc(tag + "-gc", cutoff);
    const after = await sample(tag + "-after", "vacuum");
    assert.deepEqual([after.t, after.records], [t, records]);
    assert(after.sql.deleted >= before.sql.deleted && after.sql.toastDeleted >= before.sql.toastDeleted,
      "PostgreSQL relation counters went backwards during collection");
    if (segments > 0) assert(after.sql.deleted > before.sql.deleted, "Native GC reported segments but PostgreSQL counted no deletes");
    const result = { t, records, cutoff, segments, pgdataBefore: previousDirectory, pgdata: directory(),
      before: before.sql, after: after.sql };
    write(path.join(logDir, tag + ".json"), result);
    console.log(JSON.stringify({ event: "storage-maintenance", t, records, segments, pgdata: result.pgdata,
      deletedRows: after.sql.deleted - before.sql.deleted, toastDeleted: after.sql.toastDeleted - before.sql.toastDeleted,
      walBytes: after.sql.walBytes }));
    return result;
  };

  const until = () => deadline - 5 * minute;
  const initial = cycles[0] ?? { finishedAt: origin.started, t: inspected.t, records: inspected.records, pgdata: directory() };
  if (!cycles.length && !inspected.pending && inspected.records === calibration.records) {
    cycles.push(await checkpoint("initial", inspected.t, inspected.records, collect));
    cycles[0].finishedAt = Date.now();
    write(cycleFile, cycles);
  }
  if (!cycles.length) {
    // [DX-AGE1] Why: the pinned base is valid even if an interrupted first epoch still needs native reconciliation.
    // Rejected: performing collection while the pending range has no exact indexed cut.
    cycles.push(initial);
    write(cycleFile, cycles);
  }
  let result;
  for (let i = cycles.length; !result?.bulkLoaded; i++) {
    stableFloor();
    const already = cycles.at(-1).records;
    const prior = cycles.at(-1).combinedRate ?? continuationPrior;
    assert(prior >= minimumRate || already >= config.target, "Last maintained cycle did not qualify");
    assert(!forecastSlope(cycles, config.target, config.directoryLimitBytes - 8 * GiB).over,
      "Last maintained disk projection exceeds the approved ceiling");
    const remainingSeconds = Math.max(0, config.target - Math.max(already, inspected.records)) / prior;
    const totalLoadingHours = (Date.now() - origin.started + calibration.chargedMs + remainingSeconds * 1000) / 3_600_000;
    console.log(JSON.stringify({ event: "bulk-continuation-forecast", records: Math.max(already, inspected.records),
      rate: prior, seconds: remainingSeconds, totalLoadingHours, totalLoadingUsd: totalLoadingHours * 1.09 }));
    assert(Date.now() + (remainingSeconds + 180) * 1000 < until(), "Rate cannot reach 1B in the loading budget");
    const wallStart = Date.now();
    const tag = "load-" + i;
    const headroom = config.directoryLimitBytes - directory();
    const epochMinutes = i === 1 ? 20 : headroom < 20e9 ? 5 : headroom < 40e9 ? 10 : 30;
    // [DX-AGE1] Why: leave enough time for collection before the last tens of GB of free space disappear.
    // Rejected: waiting for the physical ceiling to interrupt a full half-hour write window.
    const { phase, metrics, averageCores } = await bulkPhase(tag, continuationArm,
      Math.min(until(), wallStart + epochMinutes * minute), deadline, config.target);
    const maint = await checkpoint(tag + "-maintenance", phase.t, phase.indexedRecords, collect);
    const finishedAt = Date.now();
    const creditedSeconds = (finishedAt - (i === 1 ? origin.started : cycles.at(-1).finishedAt)) / 1000;
    const combinedRate = (maint.records - already) / creditedSeconds;
    // [DX-AGE1] Why: charge indexing, garbage collection and vacuum to the load budget.
    // Rejected: forecasting the full import solely from the write burst before maintenance.
    const row = { ...maint, finishedAt, ...(!phase.bulkLoaded || phase.records > 0 ? { combinedRate } : {}), writeRate: metrics.wallRate, averageCores };
    cycles.push(row);
    write(cycleFile, cycles);
    const growth = forecastSlope(cycles, config.target, config.directoryLimitBytes - 8 * GiB);
    console.log(JSON.stringify({ event: "bulk-cycle", t: row.t, records: row.records, combinedRate, eligibleJobs: metrics.jobs.length,
      pgdata: row.pgdata, ...growth }));
    if (!phase.bulkLoaded) {
      assert(metrics.jobs.length >= 2 && metrics.sustainedRate !== null, "Continuation window did not span two complete automatic jobs");
      assert(phase.records < 1e6 || maint.segments > 0, "A growing write window found no collectible native segments");
      assert(combinedRate >= minimumRate, "Continuation rate including maintenance is below 9,900 records/s");
      assert(!growth.over, "Both maintained disk projections exceed the approved directory ceiling");
    } else result = phase;
  }
  return { phase: result, cyclesSha: hashes(cycleFile), pgdataBytes: directory() };
}

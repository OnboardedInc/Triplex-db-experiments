// @ts-nocheck -- [EXP-CHECKJS] Private stopped-volume and runtime inputs are validated here.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { minimumRate } from "./bulk-metrics.mjs";

export const loadingUsdPerHour = 1.09;
const defaults = { floor: minimumRate, lowCycles: 1, maxHours: 16, maxUsd: 17.44 };
export const stoppedLoad = {
  source: "6d3d44641efacdcd9b3d6fefa299a3b0ace6f885", records: 514741853, head: 4034400, t: 38613452,
  archiveSha: "f402912526dbf0b7773d71518cf7df84dfbbc65681922850d212c300a453ba9f",
  custodySha: "5fb6feb95e2b888b04123fdc93f38ab5bf38750fd6d800eb304407ecc0b0c7ea",
  holdSha: "646eee96678dcd06e924005a3dccbe37213accac2850769454ecee33d94a4e4a",
};

export function loadingLimits(overrides) {
  assert(overrides === undefined || (overrides && !Array.isArray(overrides) && typeof overrides === "object" &&
    Object.keys(overrides).every((key) => key in defaults)), "Unknown loading limit");
  const limits = { ...defaults, ...overrides };
  for (const key of ["floor", "lowCycles", "maxHours", "maxUsd"])
    assert(Number.isFinite(limits[key]) && limits[key] > 0, "Invalid loading limit: " + key);
  assert(Number.isSafeInteger(limits.lowCycles));
  assert(limits.maxHours * loadingUsdPerHour <= limits.maxUsd + 1e-9, "Loading time exceeds its paid budget");
  return limits;
}

export function belowFloor(cycles, limits) {
  const tail = cycles.slice(-limits.lowCycles);
  return tail.length === limits.lowCycles &&
    tail.every((row) => Number.isFinite(row.combinedRate) && row.combinedRate < limits.floor);
}

const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
export function readStoppedLoad(dir, binding, calibration) {
  const bytes = (file) => fs.readFileSync(path.join(dir, file));
  const checked = (file, digest) => {
    const raw = bytes(file);
    assert.equal(sha(raw), digest, "Stopped-load artifact differs: " + path.basename(file));
    return JSON.parse(raw);
  };
  const custody = checked("custody.json", stoppedLoad.custodySha);
  const hold = checked("stopped-hold.json", stoppedLoad.holdSha);
  const loadFile = (name) => "rung/1000000000/" + name;
  const member = (file) => checked(file, custody.files[file].sha256);
  const exit = member("exit.json");
  const cleanup = member("cleanup.json");
  const admission = member(loadFile("load-admission.json"));
  const start = member(loadFile("load-start.json"));
  const cyclesFile = loadFile("load-cycles.json");
  const cycles = checked(cyclesFile, hold.cyclesSha);
  assert.equal(hold.cyclesSha, custody.files[cyclesFile].sha256);
  const base = "age1-" + sha(binding.db) + ".edn";
  assert.equal(hold.checkpointSha, custody.files[base].sha256);
  assert.equal(sha(bytes(base)), hold.checkpointSha);
  assert.equal(hold.populationSha, custody.files[base + ".population.edn"].sha256);
  assert.equal(sha(bytes(base + ".population.edn")), hold.populationSha);

  // [DX-AGE1] Why: carry forward the exact stopped cut and the time billed to its original attempt.
  // Rejected: treating an exit code or a mutable rate ledger as proof that the held cluster is this one.
  assert.deepEqual([hold.source, custody.source, exit.source, cleanup.source, admission.binding.source],
    Array(5).fill(stoppedLoad.source));
  for (const witness of [hold, custody, exit, cleanup, admission.binding])
    assert.deepEqual([witness.imageSha, witness.transferSha], [binding.imageSha, binding.transferSha]);
  assert.deepEqual([admission.binding.machineHash, admission.binding.db], [binding.machineHash, binding.db]);
  assert.deepEqual([hold.nonce, hold.slot, hold.volume], [exit.nonce, exit.slot, exit.resumedPrivateVolume]);
  assert.deepEqual([cleanup.nonce, cleanup.slot, cleanup.resumedPrivateVolume, cleanup.containers],
    [hold.nonce, hold.slot, hold.volume, []]);
  assert.equal(custody.exit, 1);
  assert.equal(exit.result, 1);
  assert.deepEqual(custody.omitted, []);
  assert.equal(hold.endedAt, custody.ended);
  assert(cleanup.at >= exit.at && hold.verifiedAt >= cleanup.at);
  assert.deepEqual([hold.t, hold.records, cycles.at(-1).t, cycles.at(-1).records],
    [stoppedLoad.t, stoppedLoad.records, stoppedLoad.t, stoppedLoad.records]);
  assert.deepEqual([start.calibrationSha, start.checkpointSha, start.catalogSha, cycles[0].t, cycles[0].records],
    [calibration.certificateSha, calibration.checkpointSha, calibration.best.identitySha, calibration.t, calibration.records]);
  assert(Number.isSafeInteger(custody.ended - custody.started) && custody.ended > custody.started);
  return { ...stoppedLoad, checkpointSha: hold.checkpointSha, cycles, chargedMs: custody.ended - custody.started };
}

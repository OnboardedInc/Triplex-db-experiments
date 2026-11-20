// @ts-nocheck -- [EXP-CHECKJS] validated measurement JSON and optional matched series.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const hourlyRate = 1.09;
const budget = 130;
const calibrationReserveHours = 15;
const serverRungs = [1e9, 2e9, 4e9, 8e9];

export function schedule(recordsPerSecond, seed = 820e6) {
  assert(recordsPerSecond > 0 && seed >= 0 && seed < serverRungs[0]);
  let previous = seed;
  return serverRungs.map((target) => {
    const delta = target - previous;
    previous = target;
    const hours = delta / recordsPerSecond / 3600;
    const cumulativeHours = (target - seed) / recordsPerSecond / 3600;
    return { target, delta, hours, dollars: hours * hourlyRate, cumulativeHours, cumulativeDollars: cumulativeHours * hourlyRate,
      withinBudgetWithReserve: (cumulativeHours + calibrationReserveHours) * hourlyRate <= budget };
  });
}

// [DX-AGE1] Why: size-law comparisons need the same observations and failed measures stay absent.
// Rejected: fitting synthetic zeros or choosing a growth law by the smallest in-sample error from three points.
export function fit(points) {
  if (points.length < 3) return { n: points.length, diagnosis: "fewer than three distinct measured ages" };
  const x0 = points[0][0];
  const models = Object.fromEntries([
    ["flat", () => 0],
    ["logarithmic", (n) => Math.log2(n / x0)],
    ["linear", (n) => n / x0 - 1],
  ].map(([name, transform]) => {
    function regress(sample) {
      const xs = sample.map(([x]) => transform(x));
      const ys = sample.map(([, y]) => y);
      const avg = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
      const mx = avg(xs), my = avg(ys);
      const variance = xs.reduce((s, x) => s + (x - mx) ** 2, 0);
      const slope = variance === 0 ? 0 : xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0) / variance;
      const intercept = my - slope * mx;
      return { intercept, slope };
    }
    const coeff = regress(points);
    const cvSquared = points.reduce((sum, [n, y], i) => {
      const m = regress(points.filter((_, j) => j !== i));
      return sum + (y - (m.intercept + m.slope * transform(n))) ** 2;
    }, 0);
    return [name, { ...coeff, leaveOneOutRmse: Math.sqrt(cvSquared / points.length) }];
  }));
  return { n: points.length, baselineRecords: x0, measuredRange: [points[0][0], points.at(-1)[0]], models,
    diagnosis: "diagnostic fits only; repeated matched windows are needed to distinguish noise and extrapolation" };
}

export function summarize(dir) {
  const binding = JSON.parse(fs.readFileSync(path.join(dir, "binding.json"), "utf8"));
  const cleanup = JSON.parse(fs.readFileSync(path.join(dir, "cleanup.json"), "utf8"));
  assert.equal(binding.attempt, cleanup.attempt);
  assert.equal(binding.slot, cleanup.slotReleased);
  const rungs = fs.readdirSync(dir).filter((f) => /^rung-\d+-measurement\.json$/.test(f)).sort()
    .map((f) => {
      const result = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
      assert.equal(result.attempt, binding.attempt);
      const copyFile = path.join(dir, f.replace("-measurement", "-backup"));
      const copy = fs.existsSync(copyFile) ? JSON.parse(fs.readFileSync(copyFile, "utf8")) : null;
      if (copy) {
        assert.equal(copy.attempt, binding.attempt);
        assert(Number(copy.t) >= result.backupT);
      }
      return { ...result, copy };
    }).sort((a, b) => a.records - b.records);
  const selectors = {
    loadRate: (r) => r.growth.recordsPerSecond, sqlBytes: (r) => r.bytes,
    lowP50: (r) => r.low.receiptMs.p50, lowP99: (r) => r.low.receiptMs.p99,
    busyP50: (r) => r.busy.receiptMs.p50, busyP99: (r) => r.busy.receiptMs.p99,
    overlapP50: (r) => r.indexMix.overlapMs?.p50, overlapP99: (r) => r.indexMix.overlapMs?.p99,
    indexSettleMs: (r) => r.settled.ms, indexUnderTrafficMs: (r) => r.indexMix.index?.ms,
    feedP50: (r) => r.feedMs.p50, feedP99: (r) => r.feedMs.p99,
    transactorPssKiB: (r) => r.transactorPssKiB, peerPssKiB: (r) => r.peerMemory.pssKiB,
    backupBytes: (r) => r.copy?.backupBytes, backupMs: (r) => r.copy?.backupMs,
    restoreMs: (r) => r.copy?.restoreMs, restoreReadbackMs: (r) => r.copy?.readbackMs,
    verifyMs: (r) => r.copy?.verifyMs,
  };
  for (const key of Object.keys(rungs[0]?.warmMs ?? {})) {
    selectors[key + "-warm-p50"] = (r) => r.warmMs[key]?.p50;
    selectors[key + "-warm-p99"] = (r) => r.warmMs[key]?.p99;
    selectors[key + "-first-peer"] = (r) => r.cold[key]?.ms;
  }
  const fits = Object.fromEntries(Object.entries(selectors).map(([key, selector]) => [key,
    fit(rungs.flatMap((r) => {
      const value = selector(r);
      return Number.isFinite(value) ? [[r.records, value]] : [];
    }))]));
  const records = rungs.reduce((sum, r) => sum + r.growth.records, 0);
  const seconds = rungs.reduce((sum, r) => sum + r.growth.seconds, 0);
  const measuredRate = seconds > 0 ? records / seconds : null;
  return { attempt: binding.attempt, source: binding.source, rungs, fits, measuredRate,
    agedSeedBudgetBasis: measuredRate ? schedule(measuredRate) : null };
}

export function tapeRecords(saves, active) {
  assert(Number.isSafeInteger(saves) && saves >= 0 && Number.isSafeInteger(active) && active > 0);
  const triplet = 3 * active;
  let total = Math.floor(saves / triplet) * triplet * 20;
  let left = saves % triplet;
  for (let round = 0; left > 0; round++) {
    const n = Math.min(active, left);
    total += Math.floor(n / 3) * 60;
    for (let slot = 0; slot < n % 3; slot++) total += 16 + 4 * ((round + slot) % 3);
    left -= n;
  }
  return total;
}

export function targetSaves(seed, active, targets = serverRungs) {
  assert(Number.isSafeInteger(seed) && seed > 0 && seed < targets[0]);
  return targets.map((records) => {
    let low = 0, high = Math.ceil((records - seed) / 16);
    while (high > low) {
      const mid = Math.floor((low + high) / 2);
      if (seed + tapeRecords(mid, active) < records) low = mid + 1;
      else high = mid;
    }
    return { targetRecords: records, targetSaves: low, expectedRecords: seed + tapeRecords(low, active) };
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [mode, data, active] = process.argv.slice(2);
  assert(["rates", "measurements", "targets"].includes(mode));
  const result = mode === "rates"
    ? (data ?? "10000,20000,50000,100000").split(",").map((rate) => ({ rate: Number(rate), rungs: schedule(Number(rate), active === undefined ? 820e6 : Number(active)) }))
    : mode === "targets" ? targetSaves(Number(data), Number(active)) : summarize(path.resolve(data));
  console.log(JSON.stringify(result, null, 2));
}

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const hour = 3_600_000;
const minimumDelta = 10_000_000;
const bindingTarget = 1_000_000_000;
const slots = [
  { rate: 16_000, target: 800_000_000 },
  { rate: 14_000, target: 770_000_000 },
  { rate: 12_000, target: 720_000_000 },
  { rate: 10_000, target: 670_000_000 },
  { rate: 8_000, target: 620_000_000 },
];
const upstreamRunnerSha = "a7c14de8c4f6ab8235e65d79dae368b8a3fb26406ce77523957353aa096844e2";
const digest = (bytes: string) => createHash("sha256").update(bytes).digest("hex");
const readText = (file: string) => fs.readFileSync(file, "utf8");
const json = (file: string) => JSON.parse(readText(file));

export function fallbackTarget(records: number, recordsPerSecond: number, secondsLeft: number) {
  assert(Number.isSafeInteger(records) && records > 0);
  assert(Number.isFinite(recordsPerSecond) && Number.isFinite(secondsLeft));
  if (recordsPerSecond < 8_000 || recordsPerSecond > 16_000 || secondsLeft <= 3 * 3600 + 300)
    return;
  const published = slots.find((slot) => recordsPerSecond >= slot.rate)!;
  // [DX-SCALE1] Why: keep the original cold probes, copy reserve and deadline.
  // Rejected: spending the reserve on loading or restarting the clock at the fallback.
  const attainable = records + (secondsLeft - 3 * 3600 - 300) * recordsPerSecond;
  const target = Math.min(published.target, Math.floor(attainable / minimumDelta) * minimumDelta);
  if (target >= records + minimumDelta) return target;
}

function replaceOnce(text: string, find: string, replacement: string) {
  assert.equal(text.split(find).length, 2, "AGE1 fallback's pinned adapter input differs");
  return text.replace(find, replacement);
}

function deriveRunner(original: string, ageDir: string) {
  assert.equal(digest(original), upstreamRunnerSha);
  // [DX-SCALE1] Why: retain AGE1's native reconciliation, windows, backup and seal for a diagnostic cut.
  // Rejected: changing the pinned 1B launcher or presenting a shorter cut as a 1B input.
  let source = replaceOnce(
    original,
    "const here = import.meta.dirname;",
    "const here = " + JSON.stringify(ageDir) + ";",
  );
  source = replaceOnce(
    source,
    'assert.equal(target, targetRecords, "The campaign targets one billion records");',
    "assert(safeInteger(target, 1, 800_000_000));",
  );
  source = replaceOnce(
    source,
    'assert.equal(config.target, targetRecords, "The campaign targets one billion records");',
    "assert(safeInteger(config.target, 1, 800_000_000));",
  );
  return replaceOnce(
    source,
    "const deadline = origin.started + config.maxHours * 3_600_000;",
    "const deadline = config.diagnosticDeadline;\n" +
      "  assert(Number.isSafeInteger(deadline) && deadline > Date.now() && deadline <= origin.started + config.maxHours * 3_600_000);",
  );
}

export function prepareFallback(
  out: string,
  ageRunner: string,
  input: {
    source: string;
    imageSha: string;
    transferSha: string;
    maxHours: number;
    output: string;
  },
  restoredAt: number,
  now = Date.now(),
) {
  const rung = path.join(input.output, String(bindingTarget));
  const admissionFile = path.join(rung, "admission.json");
  if (!fs.existsSync(admissionFile)) return;
  const admission = json(admissionFile);
  assert(admission.started >= restoredAt && admission.started <= now);
  assert.deepEqual(
    [
      admission.binding.source,
      admission.binding.imageSha,
      admission.binding.transferSha,
      admission.binding.target,
    ],
    [input.source, input.imageSha, input.transferSha, bindingTarget],
  );
  const attempts = fs.readdirSync(rung).filter((name) => /^[a-f0-9-]{36}$/.test(name));
  if (attempts.length !== 1) return;
  const attempt = attempts[0]!;
  const stage = path.join(rung, attempt);
  const log = path.join(stage, "rung.log");
  if (!fs.existsSync(log) || fs.statSync(log).mtimeMs < admission.started) return;
  const bytes = readText(log);
  if (!bytes.includes("Observed rate cannot reach target plus measurement reserve before deadline"))
    return;
  const binding = json(path.join(stage, "binding.json"));
  assert.equal(binding.attempt, attempt);
  assert.equal(binding.runSpecSha, admission.binding.runSpecSha);
  const segments = bytes
    .split("\n")
    .filter((line) => line.startsWith("DX_AGE1 "))
    .map((line) => JSON.parse(line.slice(8)))
    .filter((event) => event.event === "load-segment");
  if (segments.length !== 1) return;
  const sample = segments[0];
  assert.deepEqual(
    [sample.attempt, sample.rung, sample.from, sample.to],
    [attempt, bindingTarget, 0, 100_000],
  );
  assert(Number.isSafeInteger(sample.records) && sample.records > 0);
  assert(Number.isSafeInteger(sample.t) && sample.t > 0);
  assert(Math.abs(sample.records / sample.seconds - sample.recordsPerSecond) < 0.001);
  const { records: seedRecords } = json(path.join(stage, "observed-forecast.json"));
  assert(Number.isSafeInteger(seedRecords) && seedRecords > 0);
  const records = seedRecords + sample.records;
  const deadline = admission.started + input.maxHours * hour;
  const target = fallbackTarget(records, sample.recordsPerSecond, (deadline - now) / 1000);
  if (!target) return;
  const nativeSource = deriveRunner(readText(ageRunner), path.dirname(ageRunner));
  const runner = path.join(out, "fallback-runner.mjs");
  fs.writeFileSync(runner, nativeSource, { flag: "wx", mode: 0o400, flush: true });
  return {
    runner,
    target,
    seedRecords,
    deadline,
    records,
    prefixT: sample.t as number,
    source: input.source,
    calibration: attempt,
    calibrationLog: digest(bytes),
    recordsPerSecond: sample.recordsPerSecond as number,
    runnerSha: digest(nativeSource),
  };
}

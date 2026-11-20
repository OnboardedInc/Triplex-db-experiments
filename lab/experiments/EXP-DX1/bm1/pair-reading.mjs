// [DX-BM1] Why: rederive the native pair's ACK bars from the same-session writes and frozen generator.
// Rejected: applying the Mac host gate to Linux, or interpreting a completed schedule as a qualified reader result.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { createInterface } from "node:readline";
import { records } from "../../../trace/report.mjs";
import { compareOracleOutput } from "../../../bench/lib/oracle.ts";
import { readOracleOutput } from "../../../bench/lib/oracle-output.ts";
import { V3_OFFER_SECONDS, V3_PLAN_ID } from "../../../bench/lib/phases.ts";
import { generateTrace, traceDigest } from "../../../bench/lib/trace.ts";
import { applyCommitVerdicts, committedRows } from "../../../bench/lib/verdict.ts";

const [base, prefix, source, inputCapture] = process.argv.slice(2);
assert.match(prefix, /^tx2-dxt1-bm1-[a-z0-9]+-pair$/);
assert.match(source, /^[a-f0-9]{40}$/);
const json = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const str = (file) => fs.readFileSync(file, "utf8").trim();
const hash = async (file) => {
  const digest = createHash("sha256");
  for await (const chunk of fs.createReadStream(file)) digest.update(chunk);
  return digest.digest("hex");
};
async function verifyOracle(dir, tag, report) {
  const earlier = json(inputCapture);
  assert.deepEqual([earlier.source, earlier.slot], [source, tag]);
  assert.match(earlier.request, /^[a-f0-9-]{36}$/);
  const bridge = path.join(dir, "oracle-bridge", earlier.request);
  const request = json(bridge + ".request"), response = json(bridge + ".response");
  assert.deepEqual([request.id, response.id, response.code, response.sha256],
    [earlier.request, earlier.request, 0, earlier.caseSha256]);
  const input = fs.readFileSync(bridge + ".case", "utf8");
  assert.equal(createHash("sha256").update(input).digest("hex"), request.sha256);
  assert.equal(request.sha256, earlier.caseSha256);
  const caseDoc = JSON.parse(input);
  assert.equal(caseDoc.caseId, "NS/" + report.runTag);
  assert.equal(caseDoc.caseId, earlier.caseId);
  const sampleFile = path.join(dir, "driver/ns-full-read-samples.jsonl");
  assert.equal(await hash(sampleFile), earlier.sampleSha256);
  const samples = [];
  for await (const sample of records(sampleFile)) samples.push(sample);
  assert.equal(samples.length, earlier.reads);
  assert.equal(await hash(bridge + ".output"), response.outputSha256);
  const observed = readOracleOutput(bridge + ".output");
  const oracleSource = "03d86f3346cccd6794487b77293fb56077dd020e";
  const oracleFiles = execFileSync("git", ["ls-tree", "--name-only", oracleSource + ":lab/oracles/replay"], {encoding:"utf8"})
    .trim().split("\n").filter((f) => f.endsWith(".py")).sort();
  assert.deepEqual(Object.keys(observed.oracle.sourceSha256).sort(), oracleFiles);
  for (const name of oracleFiles) {
    const bytes = execFileSync("git", ["show", oracleSource + ":lab/oracles/replay/" + name]);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), observed.oracle.sourceSha256[name]);
  }
  const replay = compareOracleOutput({out: observed, caseText: input, caseDoc, reads: samples, exitCode: response.code});
  for (const field of ["status", "oracleVerdict", "receiptConsistency", "reads", "entityQueries", "mismatchCount"])
    assert.equal(replay[field], report.oracle[field], "Independent replay field differs: " + field);
  assert.equal(replay.entityQueries, earlier.entityQueries);
  return { ...replay, oracleSource, caseSha256: request.sha256, outputSha256: response.outputSha256, samplesSha256: earlier.sampleSha256 };
}
const session = path.join(base, prefix + "-session");
const checked = json(path.join(session, "MEASUREMENTS.json"));
assert.deepEqual([checked.source, checked.session, checked.sessionComplete], [source, prefix, true]);
assert.deepEqual(checked.rows.map((r) => r.arm), ["off-before", "zero", "ladder", "off-after"]);
for (const control of ["off-before", "off-after"]) assert.equal(str(path.join(session, control + "-exit.txt")), "0");
assert.equal(str(path.join(session, "remaining.txt")), "");
const events = generateTrace({ seed: "ns-v2", subjects: 10000, durationS: 7200 });
const digest = traceDigest(events);
const expected = events.filter((e) => !e.resend && e.atMs < V3_OFFER_SECONDS * 1000);
const bars = (r) => Object.values(r.priorities).flatMap((p) => p.bars ?? []);
const nativePairExit = Number(str(path.join(session, "pair-exit.txt")));
assert.ok(Number.isInteger(nativePairExit) && nativePairExit >= 0 && nativePairExit <= 255);
const outcome = { source, session: prefix, trace: digest, nativePairExit, controls: [], arms: [] };
let zeroWrites, zeroSeal, builds, previousEnd = 0;
for (const row of checked.rows) {
  const tag = prefix + "-" + row.arm;
  const dir = path.join(base, tag);
  const control = row.arm.startsWith("off");
  const loaded = row.arm === "ladder";
  const seal = new Map(str(path.join(dir, "SHA256SUMS")).split("\n").map((line) => [line.slice(66), line.slice(0, 64)]));
  const files = ["driver/ns-report.json", "driver/ns-writes.jsonl", "trace-summary.json", "trace-run.json",
    "source-build-hashes.json", "driver-container.json", "containers.json", "trace/raw/system-linux.jsonl.gz"];
  if (loaded) files.push("input/ns-report.json", "input/ns-writes.jsonl");
  for (const name of files) assert.equal(await hash(path.join(dir, name)), seal.get(name), tag + " " + name);
  assert.equal(str(path.join(dir, "head.txt")), source);
  const report = json(path.join(dir, "driver/ns-report.json")), run = json(path.join(dir, "trace-run.json"));
  const summary = json(path.join(dir, "trace-summary.json"));
  assert.deepEqual([row.tag, row.source, row.digest, row.hostPlatform], [tag, source, digest, "linux-bare-metal"]);
  assert.deepEqual([run.tag, run.slot, run.session, run.source, run.hostPlatform], [tag, tag, prefix, source, row.hostPlatform]);
  assert.deepEqual([summary.source, report.status, report.seed.seededSubjects, report.trace.digest],
    [source, "DONE", 10000, digest]);
  assert.ok(Date.parse(report.startedAt) >= run.startedAt && run.startedAt >= previousEnd);
  previousEnd = Date.parse(report.endedAt);
  assert.ok(previousEnd >= Date.parse(report.startedAt));
  builds ??= seal.get("source-build-hashes.json");
  assert.equal(seal.get("source-build-hashes.json"), builds);
  const scoringFiles = ["trace", "rng", "phases", "verdict", "verdict-plan", "verdict-statistics", "hist",
    "oracle", "oracle-output", "oracle-public-value", "world"].map((n) => "lab/bench/lib/" + n + ".ts");
  for (const file of [...scoringFiles, "lab/trace/instrument.mjs"]) {
    assert.equal(await hash(file), report.benchSources[file], "Measured code differs: " + file);
  }
  const config = report.config;
  assert.deepEqual([config.zeroReaders, config.readPath, config.receiptCapture, config.expectedStateRetention, config.idleKeep],
    [!loaded, "replica", "replica-worker", "worker-journal", "none"]);
  if (control) {
    assert.equal(run.level, "off");
    assert.equal(summary.disabled, true);
    outcome.controls.push({ tag, n: row.commands, ackP50: row.p50Ms, ackP99: row.p99Ms });
    continue;
  }
  assert.deepEqual([run.level, summary.complete, config.profile, config.matchDurationS, config.readerThreads,
                    report.verdictClock, report.verdictPlanId],
    ["summary", true, "v3", V3_OFFER_SECONDS, 6, "ack/1", V3_PLAN_ID]);
  const [driver] = json(path.join(dir, "driver-container.json"));
  const readGateway = json(path.join(dir, "containers.json")).find((c) => c.Name === "/" + tag + "-gw-r");
  assert.equal(driver.HostConfig.CpusetCpus, "3,5,6,7,9,10,11");
  assert.equal(readGateway?.HostConfig.CpusetCpus, "4,8");
  const allowed = (cpus) => cpus.split(",").flatMap((range) => {
    const [first, last = first] = range.split("-").map(Number);
    return Array.from({length: last - first + 1}, (_, i) => first + i);
  });
  const placements = [];
  for await (const line of createInterface({ input: fs.createReadStream(path.join(dir, "driver.log")), crlfDelay: Infinity }))
    if (line.startsWith('{"type":"node-thread-placement"')) placements.push(JSON.parse(line));
  assert.ok(placements.some((p) => p.thread === 0));
  if (loaded) assert.ok(new Set(placements.filter((p) => p.thread > 0).map((p) => p.tid)).size >= 6);
  for (const p of placements) {
    assert.deepEqual([p.source, p.run, p.slot, p.main, p.workers], [source, tag, tag, "3", "5,6,7,9,10,11"]);
    assert.deepEqual(allowed(p.allowed), p.thread === 0 ? [3] : [5, 6, 7, 9, 10, 11]);
  }
  const inputs = Object.fromEntries(files.map((name) => [name, seal.get(name)]));
  const writes = [];
  for await (const write of records(path.join(dir, "driver/ns-writes.jsonl"))) writes.push(write);
  const primary = committedRows(writes);
  assert.deepEqual(primary.map((w) => w.seq).sort((a, b) => a - b), expected.map((e) => e.seq).sort((a, b) => a - b));
  const capture = report.receiptCapture;
  assert.deepEqual([capture.submitted, capture.retained, capture.matched, capture.missing, capture.mismatches],
    [primary.length, primary.length, primary.length, 0, 0]);
  if (loaded) {
    assert.equal(inputs["input/ns-report.json"], zeroSeal.get("driver/ns-report.json"));
    assert.equal(inputs["input/ns-writes.jsonl"], zeroSeal.get("driver/ns-writes.jsonl"));
  }
  const recordedBars = structuredClone(bars(report));
  const recordedAll = structuredClone(report.priorities.P2.allPrimary);
  const replayed = report;
  applyCommitVerdicts(replayed, writes, loaded ? zeroWrites : null, events);
  assert.deepEqual(JSON.parse(JSON.stringify(bars(replayed))), recordedBars, "Bars differ from measured primary rows");
  assert.deepEqual(replayed.priorities.P2.allPrimary, recordedAll);
  if (!loaded) { zeroWrites = writes; zeroSeal = seal; }
  let interruption = null;
  if (loaded && nativePairExit !== 0) {
    // [DX-BM1] Why: a later viewer can recover measured bytes while the native controller retains its original nonzero exit.
    // Rejected: approving a failed controller or scoring an unrelated partial arm.
    interruption = json(path.join(dir, "BM1-RENDER-INTERRUPTION.json"));
    assert.deepEqual([interruption.source, interruption.slot, interruption.driverStatus, interruption.oracle],
      [source, tag, "DONE", "PASS"]);
    assert.equal(interruption.reportSha256, inputs["driver/ns-report.json"]);
    assert.equal(interruption.rawManifestSha256, await hash(path.join(dir, "trace/SHA256SUMS")));
    assert.ok(Date.parse(interruption.at) > Date.parse(report.endedAt));
    assert.ok(Date.parse(interruption.at) < Date.parse(interruption.originalPairCeiling));
  }
  const independent = loaded ? await verifyOracle(dir, tag, report) : null;
  outcome.arms.push({ tag, inputs, all: replayed.priorities.P2.allPrimary, receiptCapture: capture,
    correctness: report.correctness, oracle: report.oracle, independent, interruption, clientInvalid: report.client?.invalid,
    saturatedPhases: report.client?.saturatedPhases, qualification: replayed.verdict.runQualification,
    bars: Object.entries(replayed.priorities).flatMap(([priority, p]) => (p.bars ?? []).map((b) => ({priority, ...b}))) });
}
const qualification = outcome.arms[1].qualification;
outcome.pairQualification = {eligible: nativePairExit === 0 && qualification.eligible,
  reasons: [...qualification.reasons, ...(nativePairExit ? ["native controller exit " + nativePairExit] : [])]};
console.log(JSON.stringify(outcome, null, 2));

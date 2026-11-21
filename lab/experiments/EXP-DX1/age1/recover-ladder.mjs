// @ts-nocheck -- [EXP-CHECKJS] Archived certificate and native event records are validated on read.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { createGunzip } from "node:zlib";
import { ladderArms, observeBulk, walDelta } from "./bulk-metrics.mjs";

export const archived = {
  source: "acd350e927515b7c4d99f134f8600ea8de4d63f8",
  archiveSha: "15566860bfc6f748edade2041b254a1f2d8fd79562613e1a638ba4504704bac1",
  certificateSha: "a65a27d21b0ce86869b3f5319b61bacb985885337e9974e44e8e86472570c5ea",
  custodySha: "942160e6128547eb4da7638f28779f6f331209e52ae9fcdae42c08cd383e562e",
  records: 477456017, t: 36749137, chargedMs: 2687000,
};
export const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const shaFile = (f) => sha(fs.readFileSync(f));
const json = (f) => JSON.parse(fs.readFileSync(f, "utf8"));
const uuid = /^[a-f0-9-]{36}$/;

export async function recoverLadder(dir) {
  const rungPath = "rung/1000000000/";
  const rung = path.join(dir, rungPath);
  const cert = path.join(rung, "bulk-calibration.json");
  const custodyFile = path.join(dir, "custody.json");
  assert.equal(shaFile(cert), archived.certificateSha);
  assert.equal(shaFile(custodyFile), archived.custodySha);
  const original = json(cert);
  const custody = json(custodyFile);
  assert.equal(custody.ended - custody.started, archived.chargedMs);
  assert.equal(custody.files[rungPath + "bulk-calibration.json"].sha256, archived.certificateSha);
  assert.deepEqual([original.source, original.lastT, original.lastRecords, original.best],
    [archived.source, archived.t, archived.records, undefined]);
  assert(uuid.test(original.attempt));
  const attempt = path.join(rung, original.attempt);
  for (const { file, sum } of original.artifacts) {
    assert.equal(path.join(original.attempt, path.basename(file)), file);
    assert.equal(custody.files[rungPath + file].sha256, sum);
    assert.equal(shaFile(path.join(rung, file)), sum);
  }
  const binding = json(path.join(attempt, "binding.json"));
  assert.deepEqual([binding.source, binding.attempt, binding.imageSha, binding.db, binding.machineHash],
    [original.source, original.attempt, original.imageSha, original.db, original.machineHash]);
  assert(binding.java.some(({ pid }) => pid === binding.options.txPid));
  const members = [];
  for (const [i, arm] of ladderArms.entries()) {
    const file = path.join(attempt, "arm-" + i);
    const retained = json(file + ".json");
    const archivedPhase = retained.phase;
    assert.deepEqual(retained, original.arms[i]);
    assert.deepEqual(retained.arm, arm);
    const phase = { ...archivedPhase, pid: binding.options.txPid };
    const reply = fs.readFileSync(file + ".log", "utf8").split("\n").filter((s) => s.startsWith("DX_AGE1 "))
      .map((s) => JSON.parse(s.slice(8))).filter((s) => s.event === "bulk-phase");
    assert.deepEqual(reply, [archivedPhase], "Certificate differs from the original peer report");
    assert.deepEqual([phase.attempt, phase.database, phase.manifestSha, phase.indexedRecords],
      [original.attempt, original.db, original.imageSha, phase.historyEstimate]);
    if (i) assert.equal(phase.fromT, members.at(-1).t);
    const raw = fs.createReadStream(file + "-native.log.gz");
    const gunzip = createGunzip();
    raw.on("error", (e) => gunzip.destroy(e)).pipe(gunzip);
    const result = await observeBulk(createInterface({ input: gunzip, crlfDelay: Infinity }), phase);
    assert.deepEqual([result.wallRate, result.tailRate, result.process, result.minuteMetrics, walDelta(phase)],
      [retained.metrics.wallRate, retained.metrics.tailRate, retained.metrics.process, retained.metrics.minuteMetrics, retained.metrics.wal]);
    assert(result.nativeId && result.sustainedRate !== null, "Arm lacks two fresh, adopted jobs");
    members.push({ ...arm, t: phase.t, rates: { wall: result.wallRate, tail: result.tailRate, sustained: result.sustainedRate },
      indexJobs: result.jobs, identitySha: sha(result.nativeId) });
  }
  assert.equal(members.at(-1).t, archived.t);
  assert(members.every((arm) => arm.identitySha === members[0].identitySha));
  // [DX-AGE1] Why: keep the original rejection and recompute from its exact source-bound bytes.
  // Rejected: copying a hand-edited rate over the earlier certificate or crediting a new source with the original run.
  return { ...archived, attempt: original.attempt, db: original.db, imageSha: original.imageSha,
    machineHash: original.machineHash, checkpointSha: original.checkpointSha, arms: members,
    best: [...members].sort((a, b) => b.rates.sustained - a.rates.sustained)[0] };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const recovered = await recoverLadder(process.argv[2]);
  console.log(JSON.stringify({ source: recovered.source, t: recovered.t, records: recovered.records,
    arms: recovered.arms.map(({ size, indexJobs, rates }) => ({ size, jobs: indexJobs.length, rates })) }));
}

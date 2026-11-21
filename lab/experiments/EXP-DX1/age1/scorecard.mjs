// @ts-nocheck -- [EXP-CHECKJS] live peer and seal JSON have runtime-checked versions, cuts and content digests.
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync, gzipSync } from "node:zlib";

const here = import.meta.dirname;
const repo = path.resolve(here, "../../../..");
const target = 1_000_000_000;
const version = "triplex-age1-scorecard/1";
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");

function journalPolicy(result) {
  const policy = result.journal ?? "classic-k";
  assert(["classic-k", "recorded-predecessor-k"].includes(policy));
  return policy;
}

function checked(file, pin) {
  const bytes = fs.readFileSync(file);
  assert(/^[0-9a-f]{64}$/.test(pin));
  assert.equal(sha(bytes), pin, "AGE1 artifact digest differs");
  return bytes;
}

function cut(result) {
  assert.equal(result.target, target);
  assert(Number.isSafeInteger(result.records) && result.records >= target);
  assert([result.t, result.head].every((n) => Number.isSafeInteger(n) && n > 0));
  return [result.t, result.head, result.records];
}

function stable(observation, attempt) {
  const { event, attempt: actual, ...observed } = observation;
  assert.deepEqual([event, actual], ["scorecard-cut", attempt]);
  return observed;
}

function singleEvent(output, event, attempt) {
  const entries = output.split("\n").filter((line) => line.startsWith("DX_AGE1 ")).map((line) => JSON.parse(line.slice(8)))
    .filter((entry) => entry.event === event && entry.attempt === attempt);
  assert.equal(entries.length, 1, "Expected exactly one source-bound AGE1 " + event + " event");
  return entries[0];
}

function live(file, database, result, datomicSha) {
  // [DX-AGE1] Why: every preflight opens a new peer and tags its result with a fresh challenge.
  // Rejected: comparing the handoff to a saved reading from the aged database.
  const attempt = randomUUID();
  const home = process.env.AGE_DATOMIC_HOME;
  const java = process.env.AGE_JAVA;
  assert(home && java && process.env.DATOMIC_URI_TEMPLATE?.includes("{db}"));
  const jar = path.join(home, "datomic-transactor-pro-1.0.7745.jar");
  checked(jar, datomicSha);
  const cp = [jar, path.join(home, "lib/*"), path.join(home, "resources"),
    path.join(repo, "packages/datomic/gateway/src"), path.join(here, "src")].join(path.delimiter);
  const args = ["-Xmx1g", "-Dlogback.configurationFile=" + path.join(here, "server-logback.xml"),
    "-Dtriplex.codec.spec=" + path.join(repo, "packages/datomic/src/codec-spec.json"),
    "-cp", cp, "clojure.main", "-m", "triplex.age.scorecard", file, database, ...cut(result).map(String),
    journalPolicy(result)];
  const out = execFileSync(java, args, { env: { ...process.env, AGE_ATTEMPT: attempt }, encoding: "utf8", timeout: 180000 });
  return stable(singleEvent(out, "scorecard-cut", attempt), attempt);
}

export function writeScorecard(sealedFile, sealSha, state, output, observation) {
  const sealed = JSON.parse(checked(sealedFile, sealSha));
  const expected = cut(sealed);
  assert(/^[0-9a-f-]{36}$/.test(sealed.attempt));
  const directory = path.join(path.dirname(sealedFile), sealed.attempt);
  const binding = JSON.parse(checked(path.join(directory, "binding.json"), sealed.hashes["binding.json"]));
  assert.deepEqual([binding.attempt, binding.source, binding.runSpecSha, binding.target],
    [sealed.attempt, sealed.source, sealed.bindingSha, target]);
  const completed = (tag, event) => singleEvent(
    checked(path.join(directory, tag + ".log"), sealed.hashes[tag + ".log"]).toString("utf8"), event, sealed.attempt);
  const sealEvent = completed("seal", "seal-cut");
  const restored = completed("restore-readback", "restore-readback");
  assert.deepEqual(cut(sealEvent), expected);
  assert.deepEqual([restored.t, restored.head], expected.slice(0, 2));
  const prior = checked(state, sealed.checkpointSha);
  const population = checked(state + ".population.edn", sealed.seedLedgerSha);
  const observed = observation ? stable(observation, sealed.attempt) : live(state, binding.db, sealed, binding.datomicSha);
  assert.deepEqual([observed.physicalT, observed.logicalHead, observed.records], expected);
  assert.equal(observed.database, binding.db);
  assert.equal(observed.journal, journalPolicy(sealed));
  assert.equal(observed.sourceSeed["manifest-sha"], binding.imageSha);
  const ledger = gzipSync(JSON.stringify([prior.toString("base64"), population.toString("base64")]));
  const bundle = { version, ...observed, producer: sealed.source, agingAttempt: sealed.attempt,
    sealSha, datomicSha: binding.datomicSha, checkpointSha: sealed.checkpointSha,
    populationSha: sealed.seedLedgerSha, replayLedgerGzip: ledger.toString("base64") };
  const bytes = Buffer.from(JSON.stringify(bundle, null, 2) + "\n");
  if (fs.existsSync(output)) {
    assert.deepEqual(fs.readFileSync(output), bytes, "Existing scorecard handoff differs");
  } else {
    const partial = output + "." + randomUUID() + ".tmp";
    try {
      fs.writeFileSync(partial, bytes, { flag: "wx", flush: true, mode: 0o600 });
      fs.linkSync(partial, output);
      const dir = fs.openSync(path.dirname(output), "r");
      try { fs.fsyncSync(dir); } finally { fs.closeSync(dir); }
    } finally {
      fs.rmSync(partial, { force: true });
    }
  }
  return { sha256: sha(bytes), database: bundle.database, physicalT: bundle.physicalT, records: bundle.records };
}

export function checkScorecard(file, pin) {
  const bundle = JSON.parse(checked(file, pin));
  assert.equal(bundle.version, version);
  const { producer, agingAttempt, sealSha, datomicSha, checkpointSha, populationSha, replayLedgerGzip,
    version: _, ...expected } = bundle;
  assert(/^[0-9a-f]{40}$/.test(producer) && /^[0-9a-f-]{36}$/.test(agingAttempt));
  assert(/^[0-9a-f]{64}$/.test(sealSha));
  const [checkpoint, population] = JSON.parse(gunzipSync(Buffer.from(replayLedgerGzip, "base64"),
    { maxOutputLength: 256 * 1024 * 1024 })).map((b) => Buffer.from(b, "base64"));
  assert.deepEqual([sha(checkpoint), sha(population)], [checkpointSha, populationSha]);
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "age1-scorecard-"));
  try {
    const state = path.join(temp, "state.edn");
    fs.writeFileSync(state, checkpoint, { mode: 0o600 });
    fs.writeFileSync(state + ".population.edn", population, { mode: 0o600 });
    const physical = process.env.AGE_SCORECARD_PHYSICAL_DB || expected.database;
    const journal = journalPolicy(expected);
    const observed = live(state, physical, { target, t: expected.physicalT, head: expected.logicalHead,
      records: expected.records, journal }, datomicSha);
    assert.deepEqual(observed, { ...expected, journal }, "Fresh peer observation differs from the aged scorecard handoff");
    return { observedAt: new Date().toISOString(), database: physical, nativeId: observed.nativeId,
      logicalHead: observed.logicalHead, physicalT: observed.physicalT, records: observed.records, bundleSha: pin };
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command, ...args] = process.argv.slice(2);
  if (command === "export" && args.length === 4) console.log(JSON.stringify(writeScorecard(...args)));
  else if (command === "check" && args.length === 2) console.log(JSON.stringify(checkScorecard(...args)));
  else throw Error("Use scorecard.mjs export SEALED_JSON SEAL_SHA STATE_EDN OUTPUT_JSON or check HANDOFF_JSON HANDOFF_SHA");
}

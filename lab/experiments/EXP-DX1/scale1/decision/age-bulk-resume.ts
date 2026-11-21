import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileHash } from "../measurements.ts";
import { read } from "./seed.ts";

export type BulkContinuation = "load" | "measure-loaded";
type Identity = {
  source: string;
  imageSha: string;
  transferSha: string;
  volume: string;
  db: string;
  seedCut: number;
  machine: string;
};
export type RecoveredLadder = {
  source: string;
  imageSha: string;
  machineHash: string;
  db: string;
  checkpointSha: string;
  certificateSha: string;
  records: number;
  head: number;
  t: number;
  best: { rates: { sustained: number }; indexJobs: unknown[] };
};
const target = 1_000_000_000;
const hex = /^[a-f0-9]{64}$/;
const uuid = /^[a-f0-9-]{36}$/;
const stoppedLoad = {
  source: "6d3d44641efacdcd9b3d6fefa299a3b0ace6f885",
  holdSha: "646eee96678dcd06e924005a3dccbe37213accac2850769454ecee33d94a4e4a",
  records: 514741853,
  t: 38613452,
  cut: 4034400,
  rate: 9022.51,
};

async function copyState(source: string, out: string, sum: string) {
  assert.match(sum, hex);
  assert.equal(await fileHash(source), sum);
  const to = path.join(out, path.basename(source));
  fs.copyFileSync(source, to, fs.constants.COPYFILE_EXCL);
  assert.equal(await fileHash(to), sum);
}

async function stoppedNetwork(
  previous: string,
  source: string,
  terminal: { nonce: string; slot: string; invocationStarted: number; at: number },
) {
  const priorProps = path.join(previous, "sql.properties");
  const propertiesSha = await fileHash(priorProps);
  const network = read(path.join(previous, "runtime-network.json"));
  assert.deepEqual(
    [network.source, network.nonce, network.slot, network.propertiesSha],
    [source, terminal.nonce, terminal.slot, propertiesSha],
  );
  assert(network.at >= terminal.invocationStarted && network.at <= terminal.at);
  const ip = /^\d+\.\d+\.\d+\.\d+$/;
  assert.match(network.subnet, /^\d+\.\d+\.\d+\.\d+\/\d{1,2}$/);
  assert([network.gateway, network.primary, network.copy].every((x) => ip.test(x)));
  assert(new Set([network.gateway, network.primary, network.copy]).size === 3);
  const properties = fs.readFileSync(priorProps, "utf8");
  assert(properties.includes("sql-url=jdbc:postgresql://" + network.primary + ":5432/datomic\n"));
  const password = /^sql-password=([a-f0-9]{40})$/m.exec(properties)?.[1];
  assert(password);
  return { network, propertiesSha, password };
}

// [DX-SCALE1] Why: carry the archived state and the matching stopped cluster into a separate continuation.
// Rejected: changing the retained attempt's output or opening the volume as the original fresh seed.
export async function stageExtendedLoad(
  previous: string,
  out: string,
  identity: Identity,
  evidence: string,
  calibration: RecoveredLadder,
) {
  const holdFile = path.join(evidence, "stopped-hold.json");
  assert.equal(await fileHash(holdFile), stoppedLoad.holdSha);
  const hold = read(holdFile);
  const terminal = read(path.join(previous, "exit.json"));
  const cleanup = read(path.join(previous, "cleanup.json"));
  assert.deepEqual(
    [calibration.imageSha, calibration.machineHash, calibration.db],
    [identity.imageSha, identity.machine, identity.db],
  );
  assert.deepEqual(
    [hold.source, hold.volume, hold.imageSha, hold.transferSha, hold.records, hold.t],
    [
      stoppedLoad.source,
      identity.volume,
      identity.imageSha,
      identity.transferSha,
      stoppedLoad.records,
      stoppedLoad.t,
    ],
  );
  assert.deepEqual([terminal.nonce, terminal.slot, terminal.result], [hold.nonce, hold.slot, 1]);
  assert.deepEqual(cleanup.containers, []);
  assert(terminal.at <= cleanup.at && cleanup.at <= hold.verifiedAt);
  for (const file of ["exit.json", "cleanup.json"]) {
    assert.equal(
      await fileHash(path.join(previous, file)),
      await fileHash(path.join(evidence, file)),
    );
  }
  const base = "age1-" + createHash("sha256").update(identity.db).digest("hex") + ".edn";
  await copyState(path.join(evidence, base), out, hold.checkpointSha);
  await copyState(path.join(evidence, base + ".population.edn"), out, hold.populationSha);
  return {
    ...(await stoppedNetwork(previous, stoppedLoad.source, terminal)),
    cut: stoppedLoad.cut,
    nativeT: stoppedLoad.t,
    records: stoppedLoad.records,
    rate: stoppedLoad.rate,
    calibrationSha: calibration.certificateSha,
    output: path.join(out, "rung"),
    inventory: hold.inventory,
  };
}

// [DX-SCALE1] Why: one corrected replay authorizes continuation of the archived, stopped cut.
// Rejected: editing the original rejection, accepting the fastest raw rate alone, or opening a different volume.
export async function stageMaintainedContinuation(
  previous: string,
  out: string,
  mode: BulkContinuation,
  identity: Identity,
  evidence: string,
  recovered: RecoveredLadder,
) {
  const { source, imageSha, transferSha, volume, db, seedCut, machine } = identity;
  assert.deepEqual(
    [recovered.imageSha, recovered.machineHash, recovered.db],
    [imageSha, machine, db],
  );
  assert(recovered.best.rates.sustained >= 9900 && recovered.best.indexJobs.length >= 2);
  const fromLadder = mode === "load";
  const priorSource = fromLadder ? recovered.source : source;
  const cleanup = read(path.join(previous, "cleanup.json"));
  const terminal = read(path.join(previous, "exit.json"));
  assert.deepEqual(cleanup.containers, []);
  assert.deepEqual(
    [
      cleanup.nonce,
      cleanup.source,
      cleanup.imageSha,
      cleanup.transferSha,
      cleanup.resumedPrivateVolume,
    ],
    [terminal.nonce, priorSource, imageSha, transferSha, volume],
  );
  assert(cleanup.at >= terminal.at);
  assert.equal(terminal.result, fromLadder ? 1 : 0);
  const base = "age1-" + createHash("sha256").update(db).digest("hex") + ".edn";
  const checkpoint = path.join(previous, base);
  const population = checkpoint + ".population.edn";
  const proofFiles = read(path.join(evidence, "custody.json")).files;
  await copyState(population, out, proofFiles[base + ".population.edn"].sha256);
  const network = await stoppedNetwork(previous, priorSource, terminal);
  if (fromLadder) {
    assert.equal(
      await fileHash(path.join(evidence, "exit.json")),
      await fileHash(path.join(previous, "exit.json")),
    );
    assert.equal(
      await fileHash(path.join(evidence, "cleanup.json")),
      await fileHash(path.join(previous, "cleanup.json")),
    );
    await copyState(checkpoint, out, recovered.checkpointSha);
    return {
      ...network,
      cut: recovered.head,
      nativeT: recovered.t,
      records: recovered.records,
      rate: 22000,
      calibrationSha: recovered.certificateSha,
      output: path.join(out, "rung"),
    };
  }
  const output = path.join(previous, "rung");
  const rung = path.join(output, String(target));
  const loaded = read(path.join(rung, "bulk-loaded.json"));
  const admitted = read(path.join(rung, "load-admission.json"));
  assert(admitted.started >= terminal.runnerStarted && admitted.started <= terminal.at);
  assert.deepEqual(
    [loaded.source, loaded.machineHash, loaded.db, loaded.imageSha, loaded.calibrationSha],
    [source, machine, db, imageSha, recovered.certificateSha],
  );
  assert.equal(admitted.binding.configSha, await fileHash(path.join(previous, "config.json")));
  assert.equal(await fileHash(path.join(rung, "load-cycles.json")), loaded.cyclesSha);
  assert(loaded.phase.bulkLoaded && loaded.phase.indexedRecords >= target);
  assert.match(loaded.attempt, uuid);
  for (const { file, sum } of loaded.artifacts) {
    assert.match(sum, hex);
    assert.equal(file, path.join(loaded.attempt, path.basename(file)));
    assert.equal(await fileHash(path.join(rung, file)), sum);
  }
  await copyState(checkpoint, out, loaded.checkpointSha);
  return {
    ...network,
    cut: seedCut + loaded.phase.to,
    nativeT: loaded.phase.t,
    records: loaded.phase.indexedRecords,
    rate: 22000,
    calibrationSha: recovered.certificateSha,
    output,
  };
}

// [DX-SCALE1] Why: resume the verified logical cut while preserving the first attempt's state and evidence.
// Rejected: re-adopting the original seed or taking a checkpoint and network identity from different attempts.
export async function stageBulkContinuation(
  previous: string,
  out: string,
  mode: BulkContinuation,
  identity: Identity,
) {
  const { source, imageSha, transferSha, volume, db, seedCut, machine } = identity;
  const raw = path.join(previous, "rung", String(target));
  const cleanup = read(path.join(previous, "cleanup.json"));
  const terminal = read(path.join(previous, "exit.json"));
  assert.deepEqual(cleanup.containers, []);
  assert.deepEqual(
    [
      cleanup.nonce,
      cleanup.source,
      cleanup.imageSha,
      cleanup.transferSha,
      cleanup.resumedPrivateVolume,
    ],
    [terminal.nonce, source, imageSha, transferSha, volume],
  );
  assert(terminal.result === 0 && cleanup.at >= terminal.at);
  const label = mode === "load" ? "ladder" : "load";
  const admitted = read(path.join(raw, label + "-admission.json"));
  const priorConfig = path.join(previous, "config.json");
  const network = await stoppedNetwork(previous, source, terminal);
  assert.match(machine, hex);
  assert(admitted.started >= terminal.runnerStarted && admitted.started <= terminal.at);
  assert.deepEqual(
    [
      admitted.binding.source,
      admitted.binding.imageSha,
      admitted.binding.transferSha,
      admitted.binding.machineHash,
      admitted.binding.db,
      admitted.binding.configSha,
    ],
    [source, imageSha, transferSha, machine, db, await fileHash(priorConfig)],
  );
  const calibrationPath = path.join(raw, "bulk-calibration.json");
  const calibration = read(calibrationPath);
  assert.deepEqual(
    [
      calibration.source,
      calibration.imageSha,
      calibration.machineHash,
      calibration.db,
      calibration.propertiesSha,
    ],
    [source, imageSha, machine, db, network.propertiesSha],
  );
  assert.deepEqual(
    calibration.arms.map((row: { arm: { size: number } }) => row.arm.size),
    [1, 8, 24],
  );
  assert(calibration.best.metrics.jobs.length >= 2);
  const winning = calibration.arms.find(
    (row: { arm: { size: number } }) => row.arm.size === calibration.best.arm.size,
  );
  assert.deepEqual(calibration.best, winning);
  const rate = calibration.best.metrics.sustainedRate;
  assert(Number.isFinite(rate) && rate >= 9900);
  const loaded = mode === "load" ? undefined : read(path.join(raw, "bulk-loaded.json"));
  if (loaded) {
    assert.deepEqual(
      [loaded.source, loaded.imageSha, loaded.machineHash, loaded.db, loaded.calibrationSha],
      [source, imageSha, machine, db, await fileHash(calibrationPath)],
    );
    assert(loaded.phase.bulkLoaded && loaded.phase.indexedRecords >= target);
  }
  const certificate = loaded ?? calibration;
  const lastPhase = loaded?.phase ?? calibration.arms.at(-1).phase;
  const [records, nativeT, cut] = [lastPhase.indexedRecords, lastPhase.t, seedCut + lastPhase.to];
  assert([records, nativeT, cut].every(Number.isSafeInteger));
  assert(records >= 431_778_659 && nativeT >= 34_766_053 && cut >= 187_002);
  const base = "age1-" + createHash("sha256").update(db).digest("hex") + ".edn";
  const checkpoint = path.join(previous, base);
  const population = checkpoint + ".population.edn";
  const prefix = read(path.join(raw, "held-prefix.json"));
  assert.deepEqual([prefix.db, prefix.imageSha, prefix.machineHash], [db, imageSha, machine]);
  const stateFiles = [
    [checkpoint, certificate.checkpointSha],
    [population, prefix.population],
  ] as const;
  for (const [file, sum] of stateFiles) {
    await copyState(file, out, sum);
  }
  const copied = path.join(out, "rung", String(target));
  fs.mkdirSync(copied, { recursive: true, mode: 0o700 });
  const manifests = [
    "held-prefix.json",
    "bulk-calibration.json",
    "ladder-admission.json",
    ...(loaded ? ["bulk-loaded.json", "load-admission.json", "load-start.json"] : []),
  ];
  for (const manifest of manifests)
    fs.copyFileSync(path.join(raw, manifest), path.join(copied, manifest));
  for (const item of loaded ? [calibration, loaded] : [calibration]) {
    assert.match(item.attempt, uuid);
    const dest = path.join(copied, item.attempt);
    fs.mkdirSync(dest, { mode: 0o700 });
    for (const { file, sum } of item.artifacts) {
      assert.match(sum, hex);
      assert.equal(file, path.join(item.attempt, path.basename(file)));
      const from = path.join(raw, file);
      const to = path.join(copied, file);
      assert.equal(await fileHash(from), sum);
      fs.copyFileSync(from, to, fs.constants.COPYFILE_EXCL);
      assert.equal(await fileHash(to), sum);
    }
  }
  return {
    cut,
    nativeT,
    records,
    rate,
    ...network,
    output: path.join(out, "rung"),
    calibrationSha: undefined,
  };
}

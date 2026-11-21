import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileHash } from "../measurements.ts";
import { read } from "./seed.ts";

export type BulkContinuation = "load" | "measure-loaded";
const target = 1_000_000_000;
const hex = /^[a-f0-9]{64}$/;
const uuid = /^[a-f0-9-]{36}$/;

// [DX-SCALE1] Why: resume the verified logical cut while preserving the first attempt's state and evidence.
// Rejected: re-adopting the original seed or taking a checkpoint and network identity from different attempts.
export async function stageBulkContinuation(
  previous: string,
  out: string,
  mode: BulkContinuation,
  identity: {
    source: string;
    imageSha: string;
    transferSha: string;
    volume: string;
    db: string;
    seedCut: number;
    machine: string;
  },
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
  const priorProps = path.join(previous, "sql.properties");
  const propertiesSha = await fileHash(priorProps);
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
    [source, imageSha, machine, db, propertiesSha],
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
    assert.match(sum, hex);
    assert.equal(await fileHash(file), sum);
    const to = path.join(out, path.basename(file));
    fs.copyFileSync(file, to, fs.constants.COPYFILE_EXCL);
    assert.equal(await fileHash(to), sum);
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
  return { cut, nativeT, records, rate, network, propertiesSha, password };
}

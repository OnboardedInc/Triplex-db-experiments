// @ts-nocheck -- [CX-A01-040] Why: integration adds this runtime protocol or command fixture to checkJs; dynamic JSON/message fields lack static record types. Binding errors remain checked by lab/bin/checkjs.mjs. Rejected: excluding current executable code.
// [EXP-P3M] Why: a standalone NS P3 window can bind native lane hooks without silently using the A0 journal.
// Rejected: enabling a candidate in the legacy NS driver whose publication hook is not wired.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { randomUUID } from "node:crypto";
import { Worker } from "node:worker_threads";
import { auditP3, fileHash, host } from "./lib/p3.mjs";
function launch(role, config, ids) {
  const worker = new Worker(new URL("./p3-worker.mjs", import.meta.url), {
    workerData: { role, config, ids },
  });
  let readyResolve, readyReject, resultResolve, resultReject;
  const ready = new Promise((yes, no) => {
    readyResolve = yes;
    readyReject = no;
  });
  const result = new Promise((yes, no) => {
    resultResolve = yes;
    resultReject = no;
  });
  // Both promises stay observed even when a different worker fails during startup.
  ready.catch(() => {});
  result.catch(() => {});
  let finished = false,
    value;
  const fail = (error) => {
    readyReject(error);
    resultReject(error);
  };
  worker.on("message", (msg) => {
    if (msg.type === "ready") readyResolve();
    if (msg.type === "result") {
      finished = true;
      value = msg.value;
    }
    if (msg.type === "error") fail(Error(msg.error));
  });
  worker.on("error", fail);
  worker.on("exit", (code) => {
    // [EXP-P3M] Why: result messages precede finally/close; exit confirms cleanup and stable SQLite files.
    // Rejected: publishing a receipt before a late native.close failure can be observed.
    if (!finished || code !== 0) fail(Error(`P3 ${role} exited without clean result (${code})`));
    else resultResolve(value);
  });
  return { worker, ready, result };
}
export async function runP3(options) {
  const runId = randomUUID();
  const dir = path.resolve(options.dir);
  fs.mkdirSync(dir, { recursive: true });
  const attemptDir = path.join(dir, runId);
  fs.mkdirSync(attemptDir);
  const providerFile = path.resolve(options.provider);
  const config = {
    ...options,
    runId,
    attemptDir,
    provider: pathToFileURL(providerFile).href,
    // Attempt identity is part of source scope; a stale producer DB cannot satisfy a new run.
    source: `${options.source}/${runId}`,
    storeFile: path.join(attemptDir, "consumer.db"),
    publicationFile: path.join(attemptDir, "publications.db"),
    readers: options.readers ?? 256,
  };
  config.startCursor = { source: config.source, token: options.startToken };
  if (typeof options.startToken !== "string") throw Error("Missing source start token");
  if (!Number.isSafeInteger(config.readers) || config.readers < 0 || config.readers > 1024)
    throw Error("Invalid reader count");
  if (!config.readerComposition || !config.stream || !options.source)
    throw Error("Missing composition/source identity");
  if (
    !config.offline &&
    (!config.slot || !config.slot.owner || !config.slot.configSha256 || !config.slot.imageDigest)
  )
    throw Error("Live P3 requires bound slot identity");
  const tree = (dir) =>
    fs
      .readdirSync(dir, { withFileTypes: true })
      .flatMap((e) =>
        e.isDirectory() ? tree(path.join(dir, e.name)) : e.isFile() ? [path.join(dir, e.name)] : [],
      );
  const paths = [
    providerFile,
    ...(options.inputs ?? []),
    path.resolve("pnpm-lock.yaml"),
    ...["p3-driver.mjs", "p3-worker.mjs", "lib/p3.mjs"].map((f) => path.resolve("lab/bench", f)),
    ...["host", "core", "testkit"].flatMap((p) => tree(path.resolve(`packages/${p}/dist`))),
  ];
  const hashes = Object.fromEntries(paths.map((file) => [file, fileHash(file)]));
  const receipt = {
    format: "P3M/1",
    runId,
    config,
    hashes,
    slot: config.slot ?? null,
    status: "FAIL",
    offline: !!config.offline,
  };
  const write = () =>
    fs.writeFileSync(
      path.join(attemptDir, "receipt.json"),
      JSON.stringify(receipt, null, 2) + "\n",
    );
  write();
  const workers = [];
  let producer;
  const timer = setTimeout(() => {
    for (const w of workers) w.worker.terminate();
  }, options.timeoutMs ?? 60000);
  try {
    const provider = await import(config.provider);
    producer = await provider.prepare(config);
    const consumer = launch("consumer", config);
    workers.push(consumer);
    const threads = Math.min(4, config.readers);
    const readers = Array.from({ length: threads }, (_, i) =>
      launch(
        "reader",
        config,
        Array.from({ length: config.readers }, (_, id) => id).filter((id) => id % threads === i),
      ),
    );
    workers.push(...readers);
    await Promise.all(workers.map((w) => w.ready));
    config.windowStartNs = String(process.hrtime.bigint());
    const acks = await producer.runWriter();
    config.windowEndNs = String(process.hrtime.bigint());
    const prefix = await producer.finalPrefix();
    fs.writeFileSync(path.join(attemptDir, "prefix.json"), JSON.stringify(prefix));
    consumer.worker.postMessage({ type: "target", prefix });
    const consumed = await consumer.result;
    for (const r of readers) r.worker.postMessage({ type: "stop" });
    const observations = (await Promise.all(readers.map((r) => r.result))).flat();
    fs.writeFileSync(
      path.join(attemptDir, "observations.json"),
      JSON.stringify({ consumed, readers: observations, acks }),
    );
    const records = host.openPublicationReader(config.publicationFile);
    try {
      receipt.measurement = auditP3({
        config,
        prefix,
        consumed,
        readers: observations,
        acks,
        records,
      });
    } finally {
      records.close();
    }
    if (Object.entries(hashes).some(([file, hash]) => fileHash(file) !== hash))
      throw Error("Source/build/input changed during attempt");
    await producer.close();
    producer = undefined;
    receipt.bindings = {
      feedRoute: `${config.lane}:FD01-native-adapter`,
      consumerStore: {
        file: config.storeFile,
        sha256: fileHash(config.storeFile),
        pragmas: consumed.pragmas,
      },
      readerComposition: config.readerComposition,
      slot: config.slot ?? null,
      publicationFileSha256: fileHash(config.publicationFile),
      prefixSha256: fileHash(path.join(attemptDir, "prefix.json")),
      observationsSha256: fileHash(path.join(attemptDir, "observations.json")),
    };
    receipt.status = "OFFLINE-PASS";
    if (!config.offline) receipt.status = "MEASURED";
    write();
    return receipt;
  } catch (error) {
    receipt.error = error.stack;
    write();
    throw error;
  } finally {
    clearTimeout(timer);
    await Promise.all(workers.map((w) => w.worker.terminate()));
    await producer?.close();
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === import.meta.filename) {
  const config = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
  runP3(config)
    .then((r) => console.log(JSON.stringify(r)))
    .catch((e) => {
      console.error(e);
      process.exitCode = 1;
    });
}

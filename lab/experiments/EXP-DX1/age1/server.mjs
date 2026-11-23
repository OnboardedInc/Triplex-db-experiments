// @ts-nocheck -- [EXP-CHECKJS] Linux config, proc and receipt records are validated at their runtime boundaries.
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { writeScorecard } from "./scorecard.mjs";
import { bulkProperties, continuationProperties, hold, ladderArms, minimumRate, readBulkMetrics } from "./bulk-metrics.mjs";
import { archived, recoverLadder } from "./recover-ladder.mjs";
import { loadingLimits, readStoppedLoad, stoppedLoad } from "./extended-limits.mjs";
import { allocatedBytes, collectedSegments, continueLoad, directoryMargin, sameStorage } from "./continuation.mjs";
import { failedAttempt, sameRun, startRestoreTransactor } from "./readback.mjs";

const here = import.meta.dirname;
const repo = path.resolve(here, "../../../..");
const rateUsd = 1.09;
const targetRecords = 1e9;
const coldCells = ["current-recent", "current-year-idle", "pinned-recent", "pinned-year-idle", "old-cut"];
const GiB = 2 ** 30;
const read = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const fileSha = (file) => sha(fs.readFileSync(file));
const safeInteger = (x, min, max) => Number.isSafeInteger(x) && min <= x && x <= max;
const digest = /^[0-9a-f]{64}$/;

export function forecast(records, target, recordsPerSecond, reserveHours) {
  assert.equal(target, targetRecords, "The campaign targets one billion records");
  assert(safeInteger(records, 1, target));
  assert(Number.isFinite(recordsPerSecond) && recordsPerSecond > 0);
  assert(Number.isFinite(reserveHours) && reserveHours > 0);
  const agingHours = (target - records) / recordsPerSecond / 3600;
  const hours = agingHours + reserveHours;
  return { records, target, recordsPerSecond, agingHours, reserveHours, hours, usd: hours * rateUsd };
}

function write(file, result) {
  const partial = file + "." + randomUUID() + ".tmp";
  fs.writeFileSync(partial, JSON.stringify(result, null, 2) + "\n", { flag: "wx", flush: true });
  fs.renameSync(partial, file);
  const parent = fs.openSync(path.dirname(file), "r");
  try { fs.fsyncSync(parent); } finally { fs.closeSync(parent); }
}

function space(dir) {
  const s = fs.statfsSync(dir);
  return s.bavail * s.bsize;
}

function getProcess(pid) {
  const file = (k) => fs.readFileSync("/proc/" + pid + "/" + k, "utf8");
  const stat = file("stat").split(") ").at(-1).split(" ");
  const pss = Number(/^Pss:\s+(\d+) kB$/m.exec(file("smaps_rollup"))?.[1]);
  assert(Number.isFinite(pss) && pss > 0);
  return { pid, startTicks: stat[19], cpuTicks: Number(stat[11]) + Number(stat[12]),
    pssKiB: pss, cmdSha: sha(file("cmdline")) };
}

function admit(config, configFile, mode) {
  assert.equal(process.platform, "linux");
  const git = (args) => execFileSync("git", args, { cwd: repo, encoding: "utf8" }).trim();
  assert.equal(git(["rev-parse", "HEAD"]), config.source);
  assert.equal(git(["status", "--porcelain", "--untracked-files=no"]), "");
  assert.equal(config.target, targetRecords, "The campaign targets one billion records");
  assert(safeInteger(config.fromRecords, 1, config.target));
  assert(safeInteger(config.seconds, 60, 900) && config.seconds % 2 === 0);
  assert(safeInteger(config.activePerAccount, 26, 2000));
  assert(safeInteger(config.maxSqlBytes, 10 * GiB, 64 * 1024 * GiB));
  assert(safeInteger(config.copyHeadroomBytes, 25 * GiB, 64 * 1024 * GiB));
  assert(safeInteger(config.bytesPerAddedRecord, 50, 2048));
  if (["measure-loaded", "resume-readback"].includes(mode) && config.restoreMount) {
    assert(path.isAbsolute(config.restoreMount) && path.isAbsolute(config.restorePgData));
    assert(safeInteger(config.restoreHeadroomBytes, 25 * GiB, 64 * 1024 * GiB));
    assert.equal(fs.statSync(config.restoreMount).dev, fs.statSync(config.restorePgData).dev);
  }
  assert([config.peerHeap, config.peerCache, config.copyHeap].every((s) => /^[1-9]\d*[mg]$/.test(s)));
  assert(config.maxHours > 0 && config.maxHours <= 9.9);
  assert(config.maxUsd > 0 && config.maxUsd <= 74 && config.maxHours * rateUsd <= config.maxUsd);
  assert(digest.test(config.imageSha) && digest.test(config.transferSha));
  const seal = read(config.image);
  const transfer = read(config.transfer);
  assert.equal(fileSha(config.image), config.imageSha);
  assert.equal(fileSha(config.transfer), config.transferSha);
  assert.equal(transfer.summaryFiles["image.json"], config.imageSha);
  assert.deepEqual([transfer.tag, transfer.nonce, transfer.source, transfer.result],
    ["arm-d7-wfix-pool-seed", seal.nonce, seal.source, "success"]);
  assert.equal(seal.scopes.length, 1);
  assert.equal(seal.layout, "pooled");
  const env = process.env;
  assert(env.DATOMIC_URI_TEMPLATE?.includes("{db}") && env.AGE_RESTORE_URI_TEMPLATE?.includes("{db}"));
  assert.notEqual(env.DATOMIC_URI_TEMPLATE, env.AGE_RESTORE_URI_TEMPLATE);
  // [DX-AGE1] Why: a restore must use a distinct SQL database with no attached transactor.
  // Rejected: comparing full URIs where a different password could conceal the same backing storage.
  const db = (uri) => /^datomic:sql:\/\/\{db\}\?(jdbc:[^?]+)\?/.exec(uri)?.[1];
  assert.equal(db(env.DATOMIC_URI_TEMPLATE), env.AGE_SQL_JDBC);
  assert(db(env.AGE_RESTORE_URI_TEMPLATE) && db(env.AGE_RESTORE_URI_TEMPLATE) !== env.AGE_SQL_JDBC);
  assert(env.AGE_SQL_PASSWORD && env.AGE_DATOMIC_HOME && env.AGE_JAVA);
  const home = env.AGE_DATOMIC_HOME;
  const jar = path.join(home, "datomic-transactor-pro-1.0.7745.jar");
  assert.equal(fileSha(jar), config.datomicSha);
  const options = JSON.parse(fs.readFileSync(config.measureSettings, "utf8"));
  assert.deepEqual(options, config.expectedMeasureSettings);
  assert.equal(options.group, false);
  assert.equal(options.saveLedger, true);
  assert.equal(options.smallRows, true);
  assert(options.txPid > 1 && options.txPid === config.transactorPid);
  // Bind the actual transactor properties, as mounted into the current process.
  const propsArg = path.posix.normalize(config.transactorProperties);
  assert(path.isAbsolute(propsArg));
  const liveArgs = fs.readFileSync("/proc/" + options.txPid + "/cmdline", "utf8").split("\0");
  assert(liveArgs.includes(propsArg));
  const liveProperties = fs.readFileSync("/proc/" + options.txPid + "/root" + propsArg);
  assert.equal(sha(liveProperties), config.transactorPropertiesSha);
  const readerSettings = Object.fromEntries(liveProperties.toString("utf8").split(/\r?\n/)
    .map((line) => /^\s*(memory-index-threshold|memory-index-max|object-cache-max|index-parallelism)\s*=\s*(\S+)\s*$/.exec(line))
    .filter(Boolean).map(([, key, value]) => [key, value]));
  assert.equal(Object.keys(readerSettings).length, 4);
  assert.deepEqual(readerSettings, options.properties);
  if (mode === "ladder" || mode === "load") {
    const writeConcurrency = /^\s*write-concurrency\s*=\s*(\S+)\s*$/m.exec(liveProperties.toString("utf8"))?.[1];
    const physicalCores = mode === "load" ? 6 : 3;
    assert.deepEqual({ ...readerSettings, "write-concurrency": writeConcurrency },
      mode === "load" ? continuationProperties : bulkProperties);
    assert(liveArgs.includes("-Xmx24g") || liveArgs.includes("-Xmx24576m"), "Bulk heap differs");
    assert(liveArgs.includes("-XX:ActiveProcessorCount=" + physicalCores), "Bulk transactor processor setting differs");
    const cpus = /^Cpus_allowed_list:\s*([\d,-]+)$/m.exec(fs.readFileSync("/proc/" + config.transactorPid + "/status", "utf8"))?.[1];
    const cpuIds = cpus?.split(",").flatMap((span) => {
      const [first, last = first] = span.split("-").map(Number);
      return Array.from({ length: last - first + 1 }, (_, i) => first + i);
    }) ?? [];
    assert.equal(cpuIds.length, physicalCores, "Transactor CPU placement differs");
    if (mode === "load") {
      const physical = new Set(cpuIds.map((cpu) => ["physical_package_id", "core_id"]
        .map((name) => fs.readFileSync("/sys/devices/system/cpu/cpu" + cpu + "/topology/" + name, "utf8").trim()).join(":")));
      assert.equal(physical.size, physicalCores, "Use six physical cores instead of sharing SMT siblings");
    }
    const sqlUrl = /^\s*sql-url\s*=\s*(\S+)\s*$/m.exec(liveProperties.toString("utf8"))?.[1];
    assert(sqlUrl === env.AGE_SQL_JDBC, "Bulk transactor SQL target differs");
    const heapMiB = Number(config.peerHeap.slice(0, -1)) * (config.peerHeap.endsWith("g") ? 1024 : 1);
    assert(heapMiB >= 4096, "Load peer needs space for the 2 GiB in-memory index and report verification");
    assert(/^metrics-callback\s*=\s*triplex.age.telemetry\/capture!\s*$/m.test(liveProperties.toString("utf8")),
      "Bulk needs the Datomic metrics callback");
    const cp = liveArgs[liveArgs.indexOf("-cp") + 1]?.split(":") ?? [];
    assert(cp.includes(path.join(here, "src")), "Bulk metrics callback must be from this source checkout");
    const logOpt = liveArgs.find((a) => a.startsWith("-Dlogback.configurationFile=/"));
    assert(logOpt, "Bulk transactor requires its own event appender");
    const logConfig = "/proc/" + config.transactorPid + "/root" + logOpt.slice("-Dlogback.configurationFile=".length);
    assert.equal(fileSha(logConfig), fileSha(path.join(here, mode === "load" ? "continuation-logback.xml" : "bulk-logback.xml")));
    eventLogStat(config);
  }
  const allowJava = [...new Set(config.javaPids)].sort((a, b) => a - b);
  const running = execFileSync("ps", ["-eo", "pid=,comm="], { encoding: "utf8" })
    .split("\n").map((s) => /^\s*(\d+)\s+java\s*$/.exec(s)).filter(Boolean)
    .map((x) => Number(x[1])).sort((a, b) => a - b);
  assert(allowJava.includes(options.txPid));
  if (mode === "load") {
    assert.equal(allowJava.length, 1, "Storage collection requires an exclusive transactor with no other Java readers");
    assert([400e9, 450e9].includes(config.directoryLimitBytes), "Choose an explicitly capacity-checked directory ceiling");
    assert(path.isAbsolute(config.pgData) && path.isAbsolute(config.scorecardMount));
    assert.equal(fs.readFileSync(path.join(config.pgData, "PG_VERSION"), "utf8").trim(), "17");
    assert(fs.lstatSync(path.join(config.pgData, "pg_wal")).isDirectory(), "Source WAL must be included in PGDATA");
    assert.equal(fs.statSync(config.dataMount).dev, fs.statSync(config.pgData).dev);
    assert.notEqual(fs.statSync(config.scorecardMount).dev, fs.statSync(config.dataMount).dev);
    loadingLimits(config.loadingLimits);
    if (config.resumeEvidence !== undefined) {
      assert.equal(config.directoryLimitBytes, 400e9);
      assert(path.isAbsolute(config.resumeEvidence));
      assert.notEqual(fs.realpathSync(config.resumeEvidence), fs.realpathSync(path.dirname(config.output)),
        "Keep the mutable checkpoint outside the stopped-volume evidence");
    }
    assert(path.isAbsolute(config.ladderEvidence ?? ""));
    assert.notEqual(fs.realpathSync(config.ladderEvidence), fs.realpathSync(path.dirname(config.output)),
      "Stage the mutable checkpoint beside a new output, outside the archived evidence");
  }
  assert.deepEqual(running, allowJava, "Dedicated server Java process inventory differs");
  const machine = fs.readFileSync("/etc/machine-id", "utf8");
  // [DX-AGE1] Why: a revised budget applies from the original start and is recorded in each attempt's config hash.
  // Rejected: creating a new admission clock to change the floor or total paid time.
  const { javaPids, transactorPid, postgresPid, restorePostgresPid, expectedMeasureSettings,
    loadingLimits: _limits, ...spec } = config;
  const { txPid, ...measurePolicy } = expectedMeasureSettings;
  return {
    source: config.source, configSha: fileSha(configFile), datomicSha: config.datomicSha,
    runSpecSha: sha(JSON.stringify({ spec, measurePolicy })),
    imageSha: config.imageSha, transferSha: config.transferSha, target: config.target,
    machineHash: sha(machine), db: seal.scopes[0].db, options, java: allowJava.map(getProcess),
    output: config.output,
  };
}

function eventLogStat(config) {
  assert(path.isAbsolute(config.bulkEventLog ?? ""), "Supply the transactor event log path");
  const open = "/proc/" + config.transactorPid + "/fd";
  const stat = (file) => { try { return fs.statSync(file); } catch { return null; } };
  const log = fs.statSync(config.bulkEventLog);
  assert(log.isFile());
  assert(fs.readdirSync(open).some((fd) => {
    const s = stat(path.join(open, fd));
    return s && s.dev === log.dev && s.ino === log.ino;
  }), "Native event file is not open by the admitted transactor");
  return log;
}

async function run(configFile, config, mode, failedId) {
  const bulk = mode === "ladder" || mode === "load";
  // [DX-AGE1] Why: resume-readback finishes a measure-loaded attempt that passed backup, verify and restore.
  // Rejected: repeating the 2 h backup, full verify and restore to rerun one readback.
  const resuming = mode === "resume-readback";
  const measuring = mode === "measure-loaded" || resuming;
  assert.equal(Boolean(failedId), resuming, "resume-readback takes the failed attempt; other modes take none");
  const limits = loadingLimits(mode === "load" ? config.loadingLimits : undefined);
  const binding = admit(config, configFile, mode);
  const initial = forecast(config.fromRecords, config.target, config.ratePrior, config.reserveHours);
  const parent = path.dirname(config.output);
  const scopeLock = path.join(parent, "age1-writer-" + sha(binding.db) + ".lock");
  fs.mkdirSync(config.output, { recursive: true });
  if (!process.argv.includes("--locked")) {
    console.log(JSON.stringify(mode === "load" ?
      { phase: "continuation-forecast", prior: forecast(config.resumeEvidence ? stoppedLoad.records : archived.records,
        config.target, config.ratePrior, config.reserveHours),
        maxLoadingHours: limits.maxHours, maxLoadingUsd: limits.maxUsd,
        minimumRate: limits.floor, consecutiveBelowFloor: limits.lowCycles, directoryLimitBytes: config.directoryLimitBytes } : bulk ?
      { phase: mode + "-forecast", start: hold.records, target: config.target, ladderMaxSeconds: 3600,
        predictions: ladderArms } : { phase: "forecast", ...initial }));
    const result = await new Promise((resolve, reject) => {
      const child = spawn("flock", ["-F", "-n", scopeLock, process.execPath, fileURLToPath(import.meta.url),
        ...(mode === "legacy" ? [] : [mode]), configFile, ...(resuming ? [failedId] : []), "--locked"], { stdio: "inherit" });
      for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
      child.once("error", reject);
      child.once("exit", (code) => resolve(code ?? 1));
    });
    process.exitCode = result;
    return;
  }
  if (!bulk && !measuring && (initial.hours >= config.maxHours || initial.usd > config.maxUsd)) {
    console.log(JSON.stringify({ phase: "forecast-over-budget", calibrationMaxSaves: 100000 }));
  }
  const dir = config.output;
  const rung = path.join(dir, String(config.target));
  fs.mkdirSync(rung, { recursive: true });
  const final = path.join(rung, "sealed.json");
  const state = path.join(parent, "age1-" + sha(binding.db) + ".edn");
  const scorecard = path.join(rung, "aged-scorecard.json");
  if (fs.existsSync(final)) {
    const saved = read(final);
    assert.equal(saved.bindingSha, binding.runSpecSha);
    for (const [file, want] of Object.entries(saved.hashes)) {
      assert.equal(path.basename(file), file);
      assert.equal(fileSha(path.join(rung, saved.attempt, file)), want);
    }
    // [DX-AGE1] Why: the physical seal survives a stop before the handoff rename.
    // Rejected: restarting the rung and repeating windows after a valid seal.
    const handoff = writeScorecard(final, fileSha(final), state, scorecard);
    console.log(JSON.stringify({ ...saved, scorecard: handoff }));
    return;
  }
  const admitted = path.join(rung, bulk ? mode + "-admission.json" : "admission.json");
  if (!fs.existsSync(admitted)) {
    assert(!resuming, "resume-readback requires the failed attempt's admission");
    write(admitted, { started: Date.now(), binding });
  }
  const origin = read(admitted);
  const resumeStarted = Date.now();
  let failed;
  if (resuming) {
    // [DX-AGE1] Why: the resume may change only the checkout and the renewed process IDs of the same run.
    // Rejected: accepting a backup, restore or held cluster that the failed attempt did not record.
    const pins = read(path.join(here, "readback-pins.json"));
    failed = failedAttempt({ rung, attempt: failedId, pins, coldCells, target: config.target });
    const failedConfig = path.join(path.dirname(config.output), "config.json");
    assert.equal(fileSha(failedConfig), failed.binding.configSha, "The failed run's configuration differs");
    sameRun(config, read(failedConfig));
    assert.deepEqual([failed.binding.source, failed.binding.runSpecSha, failed.binding.configSha, failed.r.t, failed.r.head,
      failed.r.records, failed.restoreDb, config.transactorPropertiesSha],
      [pins.source, pins.runSpecSha, pins.configSha, pins.t, pins.head, pins.records, pins.restoreDb, pins.transactorPropertiesSha]);
    assert.equal(origin.binding.runSpecSha, failed.binding.runSpecSha);
    assert.deepEqual([failed.binding.db, failed.binding.imageSha, failed.binding.transferSha, failed.binding.datomicSha],
      [binding.db, binding.imageSha, binding.transferSha, binding.datomicSha]);
    assert.notEqual(binding.source, failed.binding.source, "Resume from the repaired checkout");
  } else {
    assert.equal(origin.binding.runSpecSha, binding.runSpecSha);
  }
  assert.equal(origin.binding.machineHash, binding.machineHash);
  const calibrationFile = path.join(rung, "bulk-calibration.json");
  const calibration = mode === "load" ? await recoverLadder(config.ladderEvidence) : null;
  if (calibration) {
    assert.deepEqual([calibration.machineHash, calibration.db, calibration.imageSha],
      [binding.machineHash, binding.db, binding.imageSha], "Recovered ladder belongs to a different held database");
    const original = path.join(rung, "bulk-calibration-original.json");
    const corrected = path.join(rung, "bulk-calibration-corrected.json");
    if (!fs.existsSync(original)) fs.copyFileSync(path.join(config.ladderEvidence, "rung/1000000000/bulk-calibration.json"),
      original, fs.constants.COPYFILE_EXCL);
    assert.equal(fileSha(original), calibration.certificateSha);
    if (!fs.existsSync(corrected)) write(corrected, calibration);
    assert.deepEqual(read(corrected), calibration);
  }
  const resume = calibration && config.resumeEvidence ? readStoppedLoad(config.resumeEvidence, binding, calibration) : null;
  const paidMs = (calibration?.chargedMs ?? 0) + (resume?.chargedMs ?? 0);
  const deadline = resuming ? resumeStarted + 2 * 3600_000 : origin.started + (bulk ? (mode === "ladder" ? 3600_000 : limits.maxHours * 3600_000 - paidMs)
    : config.maxHours * 3600_000);
  const reserve = config.copyHeadroomBytes;
  const separateCopyPolicy = measuring && config.restoreMount;
  let pgdataSample = 0;
  let pgdataBytes;
  const directory = () => {
    pgdataSample = Date.now();
    pgdataBytes = allocatedBytes(config.pgData);
    assert(pgdataBytes < config.directoryLimitBytes - 4 * GiB, "PGDATA reached the loading ceiling margin");
    return pgdataBytes;
  };
  const stableFloor = () => {
    assert(Date.now() < deadline, "Rung time limit reached");
    assert(space(config.dataMount) > (mode === "load" ? directoryMargin : 12 * GiB)
      && space(config.copyMount) > 12 * GiB && space(dir) > 5 * GiB, "Disk floor reached");
    if (separateCopyPolicy) assert(space(config.restoreMount) > directoryMargin, "Restore NVMe floor reached");
    if (mode === "load" && Date.now() - pgdataSample > 15_000) directory();
  };
  stableFloor();
  const attempt = randomUUID();
  const logDir = path.join(rung, attempt);
  fs.mkdirSync(logDir);
  write(path.join(logDir, "binding.json"), { ...binding, attempt, prior: initial });
  const env = {
    ...process.env, AGE_ATTEMPT: attempt, AGE_MAX_SQL_BYTES: String(config.maxSqlBytes),
    TX2_SAVE_LEDGER: "1", TX2_SMALL_ROWS: "1", TX2_PACKED_JOURNAL: "0", TX2_GROUP_COMMIT: "0",
    TX2_GROUP_QUEUE_CLOCK: "0", TX2_SLIM_ROWS: "0", TX2_COMMIT_HINTS: "false",
  };
  const home = env.AGE_DATOMIC_HOME;
  const java = env.AGE_JAVA;
  const gcFlags = (tag) => "-Xlog:gc*,safepoint:file=" + path.join(logDir, tag + "-gc.log") +
    ":time,uptime,pid,level,tags";
  let stopped, active;
  const signalGroup = (child, signal) => {
    if (!child?.pid) return;
    try { process.kill(-child.pid, signal); }
    catch (e) { if (e.code !== "ESRCH") throw e; }
  };
  const interrupt = (error) => {
    stopped ??= error;
    const child = active;
    signalGroup(child, "SIGTERM");
    if (child) setTimeout(() => { if (active === child) signalGroup(child, "SIGKILL"); }, 10000).unref();
  };
  for (const signal of ["SIGTERM", "SIGINT"]) process.on(signal, () => interrupt(Error("Interrupted")));
  const watcher = setInterval(() => {
    try { stableFloor(); } catch (e) { interrupt(e); }
  }, 1000);
  watcher.unref();
  const jcmd = path.join(path.dirname(java), "jcmd");
  const external = [];
  const finishJvmLogs = () => {
    for (const { pid, out } of external) {
      execFileSync(jcmd, [String(pid), "VM.log", "output=" + out, "what=all=off"], { timeout: 5000 });
    }
    external.length = 0;
  };
  try {
    // [DX-AGE1] Why: capture pauses at the current JVMs rather than accepting recycled log files.
    // Rejected: inferring JVM GC or safepoints from elapsed transaction timing.
    for (const p of binding.java) {
      const out = path.join(logDir, "java-" + p.pid + "-gc.log");
      const args = [String(p.pid), "VM.log", "output=" + out, "what=gc*=info,safepoint=info",
        "decorators=time,uptime,pid,level,tags"];
      execFileSync(jcmd, args, { timeout: 15000 });
      assert(fs.existsSync(out));
      external.push({ pid: p.pid, out });
    }
    const cp = [path.join(home, "datomic-transactor-pro-1.0.7745.jar"), path.join(home, "lib/*"),
      path.join(home, "resources"), path.join(repo, "packages/datomic/gateway/src"), path.join(here, "src")].join(":");
    const commands = async (tag, cmd, args, customEnv = {}) => {
      if (stopped) throw stopped;
      stableFloor();
      const file = path.join(logDir, tag + ".log");
      const fd = fs.openSync(file, "wx");
      try {
        const code = await new Promise((resolve, reject) => {
          // [DX-AGE1] Why: the Datomic CLI wraps its JVM in scripts.
          // Rejected: killing the wrapper and leaving an orphaned copy running after the deadline.
          active = spawn(cmd, args, { detached: true, env: { ...env, ...customEnv }, stdio: ["ignore", fd, fd] });
          active.once("error", reject);
          active.once("exit", resolve);
        });
        if (stopped) throw stopped;
        assert.equal(code, 0, tag + " process failed. Inspect its fresh log");
      } finally {
        active = undefined;
        fs.closeSync(fd);
      }
      return file;
    };
    const peer = async (tag, event, ...args) => {
      const log = await commands(tag, java, ["-Xmx" + config.peerHeap, gcFlags(tag),
        "-Dlogback.configurationFile=" + path.join(here, "server-logback.xml"),
        "-Ddatomic.objectCacheMax=" + config.peerCache,
        "-Dtriplex.codec.spec=" + path.join(repo, "packages/datomic/src/codec-spec.json"),
        "-cp", cp, "clojure.main", "-m", "triplex.age.rung", ...args]);
      const selected = [];
      const lines = createInterface({ input: fs.createReadStream(log), crlfDelay: Infinity });
      for await (const line of lines) {
        if (!line.startsWith("DX_AGE1 ")) continue;
        const observation = JSON.parse(line.slice(8));
        if (observation.event === event && observation.attempt === attempt) selected.push(observation);
      }
      assert.equal(selected.length, 1, tag + " observation missing");
      assert(fs.statSync(path.join(logDir, tag + "-gc.log")).size > 0);
      return selected[0];
    };
    if (bulk) {
      const proofRoot = mode === "load" ? path.join(config.ladderEvidence, "rung/1000000000") : rung;
      const proof = path.join(proofRoot, "held-prefix.json");
      assert.equal(fileSha(state + ".population.edn"), hold.population);
      if (!fs.existsSync(proof)) {
        assert.equal(mode, "ladder");
        assert.equal(fileSha(state), hold.checkpoint);
        write(proof, { ...hold, attempt, db: binding.db, imageSha: binding.imageSha, machineHash: binding.machineHash });
      }
      const prefix = read(proof);
      for (const [key, value] of Object.entries({ ...hold, db: binding.db, imageSha: binding.imageSha, machineHash: binding.machineHash }))
        assert.equal(prefix[key], value, "Held calibration prefix differs");
    }
    if (!fs.existsSync(state)) {
      assert.equal(mode, "legacy", "Existing adopted checkpoint required");
      const a = await peer("adopt", "adopt", "adopt", config.image, config.imageSha, state, String(config.activePerAccount));
      assert.equal(a.manifestSha, config.imageSha);
      assert.equal(a.name, binding.db);
      assert(safeInteger(a.records, 1, config.target));
    }
    const inspected = await peer("inspect", "inspect", "inspect", state, config.imageSha);
    assert.equal(inspected.db, binding.db);
    assert.equal(inspected.sqlDurability, "on|on|on");
    const corrected = forecast(Math.min(inspected.records, config.target), config.target, config.ratePrior, config.reserveHours);
    console.log(JSON.stringify({ phase: "observed-head-forecast", ...corrected }));
    write(path.join(logDir, "observed-forecast.json"), corrected);
    if (!bulk && !measuring && !inspected.finished && Date.now() + corrected.hours * 3_600_000 >= deadline) {
      const requiredRate = Math.max(0, config.target - inspected.records) /
        Math.max(1, (deadline - Date.now()) / 1000 - config.reserveHours * 3600);
      console.log(JSON.stringify({ phase: "rate-calibration-required", requiredRate, calibrationMaxSaves: 100000 }));
      assert(deadline - Date.now() > (config.reserveHours * 3600 + 600) * 1000,
        "Insufficient time for calibration plus measurement reserve");
    }
    if (calibration) {
      assert.equal(sha(inspected.nativeId), calibration.best.identitySha, "Live SQL catalog identity differs from the ladder");
      assert(inspected.t >= calibration.t && inspected.records >= calibration.records);
      sameStorage(config.pgData, inspected.sqlDataDirectory, config.postgresPid);
      const sourceBytes = directory();
      assert(space(config.dataMount) > config.directoryLimitBytes - sourceBytes + directoryMargin,
        "Source NVMe lacks the approved directory growth plus reserve");
      assert(space(config.scorecardMount) > config.directoryLimitBytes + directoryMargin,
        "Scorecard NVMe lacks one drained scratch copy plus reserve");
    } else if (separateCopyPolicy) {
      const location = await peer("restore-location", "restore-location", "restore-location");
      sameStorage(config.restorePgData, location.directory, config.restorePostgresPid);
      if (resuming) assert.equal(location.directory, failed.location.directory, "The restored copy moved");
      else if (fs.statSync(config.copyMount).dev === fs.statSync(config.restoreMount).dev) {
        assert(space(config.copyMount) > reserve + config.restoreHeadroomBytes + directoryMargin,
          "Backup and restore share a device without room for both");
      } else {
        assert(space(config.copyMount) > reserve + directoryMargin &&
          space(config.restoreMount) > config.restoreHeadroomBytes + directoryMargin,
          "Backup or restore cannot fit its separately reserved device");
      }
    } else {
      const projected = Math.max(0, config.target - inspected.records) * config.bytesPerAddedRecord;
      assert(inspected.sqlBytes + projected < config.maxSqlBytes, "Forecast exceeds source SQL cap");
      if (fs.statSync(config.dataMount).dev === fs.statSync(config.copyMount).dev) {
        assert(space(config.dataMount) > projected + reserve + 12 * GiB, "Combined growth and copy disk forecast does not fit");
      } else {
        assert(space(config.dataMount) > projected + 12 * GiB && space(config.copyMount) > reserve + 12 * GiB,
          "Projected age or copy footprint exceeds reserved free space");
      }
    }
    const bulkPhase = async (tag, arm, stop, limit, target) => {
      const offset = eventLogStat(config);
      const cpuTime = Date.now();
      const beforeCpu = getProcess(binding.options.txPid);
      const phase = await peer(tag, "bulk-phase", "bulk", state, config.imageSha, String(hold.t), String(hold.head),
        mode, String(arm.size), String(arm.depth), String(target), String(stop), String(limit));
      assert.deepEqual([phase.mode, phase.database, phase.manifestSha, phase.size, phase.depth],
        [mode, binding.db, config.imageSha, arm.size, arm.depth]);
      assert(phase.seconds > 0 && phase.records >= 0 && phase.indexedRecords === phase.historyEstimate);
      const afterCpu = getProcess(binding.options.txPid);
      assert.deepEqual([afterCpu.startTicks, afterCpu.cmdSha], [beforeCpu.startTicks, beforeCpu.cmdSha]);
      const hz = Number(execFileSync("getconf", ["CLK_TCK"], { encoding: "utf8" }));
      assert(hz > 0);
      const averageCores = (afterCpu.cpuTicks - beforeCpu.cpuTicks) / hz / ((Date.now() - cpuTime) / 1000);
      const archive = mode === "ladder" ? path.join(logDir, tag + "-native.log.gz") : undefined;
      const metrics = await readBulkMetrics(config.bulkEventLog, offset, { ...phase, pid: binding.options.txPid }, archive);
      const observed = { arm, phase, metrics, averageCores };
      write(path.join(logDir, tag + ".json"), observed);
      console.log(JSON.stringify({ event: "bulk-arm", tag, size: arm.size, depth: arm.depth,
        seconds: phase.seconds, records: phase.records, averageCores, ...metrics, minuteMetrics: metrics.minuteMetrics.length }));
      return observed;
    };
    if (mode === "ladder") {
      assert(!fs.existsSync(calibrationFile), "Ladder already recorded");
      const arms = [];
      for (const [i, arm] of ladderArms.entries()) {
        // [DX-AGE1] Why: finalise evidence and drain the bounded queue within the one-hour admission.
        // Rejected: granting each arm a fresh hour or making a forced index count as sustained.
        const stop = Math.min(Date.now() + 14 * 60_000, deadline - 5 * 60_000);
        assert(stop - Date.now() > 3 * 60_000, "Ladder cap leaves too little time for another arm");
        const tag = "arm-" + i;
        arms.push(await bulkPhase(tag, arm, stop, deadline, config.target));
      }
      const best = [...arms].filter((a) => a.metrics.sustainedRate !== null)
        .sort((a, b) => b.metrics.sustainedRate - a.metrics.sustainedRate)[0];
      finishJvmLogs();
      const artifacts = fs.readdirSync(logDir).map((f) => ({ file: path.join(attempt, f), sum: fileSha(path.join(logDir, f)) }));
      const last = arms.at(-1).phase;
      const result = { attempt, source: binding.source, db: binding.db, machineHash: binding.machineHash,
        imageSha: binding.imageSha, propertiesSha: config.transactorPropertiesSha,
        elapsedMs: Date.now() - origin.started, checkpointSha: fileSha(state), lastT: last.t,
        lastRecords: last.indexedRecords, arms, best, artifacts };
      assert(result.elapsedMs <= 3_600_000, "Ladder exceeded its one-hour cap");
      write(calibrationFile, result);
      assert(best?.metrics.sustainedRate >= minimumRate, "No two-job calibration sustained 9,900 records/s. Preserve the prefix and stop.");
      return;
    }
    if (mode === "load") {
      const oracle = async (tag, step) => peer(tag, "maintenance", "maintenance", state, config.imageSha, step);
      const sourceUri = env.DATOMIC_URI_TEMPLATE.replace("{db}", binding.db);
      const collect = async (tag, cutoff) => {
        const log = await commands(tag, java, ["-Xmx" + config.copyHeap, gcFlags(tag),
          "-Dlogback.configurationFile=" + path.join(here, "server-logback.xml"),
          "-Ddatomic.deleteConcurrency=8", "-Ddatomic.readConcurrency=16",
          "-cp", cp, "clojure.main", "-m", "datomic.tools.gc-db", sourceUri, cutoff]);
        return collectedSegments(fs.readFileSync(log, "utf8"));
      };
      const observed = await continueLoad({
        config, read, write, hashes: fileSha, logDir, rung, state, origin, deadline, calibration, resume, paidMs, limits, inspected,
        bulkPhase, collect, sample: oracle, directory, stableFloor,
      });
      assert(observed.phase.bulkLoaded && observed.phase.indexedRecords >= config.target);
      finishJvmLogs();
      stableFloor();
      write(path.join(rung, "bulk-loaded.json"), { ...observed, attempt, source: binding.source, machineHash: binding.machineHash,
        imageSha: binding.imageSha, db: binding.db, checkpointSha: fileSha(state), calibrationSha: calibration.certificateSha,
        transactor: binding.java.find((p) => p.pid === binding.options.txPid),
        artifacts: fs.readdirSync(logDir).map((f) => ({ file: path.join(attempt, f), sum: fileSha(path.join(logDir, f)) })) });
      return;
    }
    if (measuring) {
      const loaded = read(path.join(rung, "bulk-loaded.json"));
      assert.deepEqual([loaded.source, loaded.machineHash, loaded.db, loaded.imageSha],
        [binding.source, binding.machineHash, binding.db, binding.imageSha]);
      for (const { file, sum } of loaded.artifacts) assert.equal(fileSha(path.join(rung, file)), sum);
      if (loaded.cyclesSha) {
        const cyclesFile = path.join(rung, "load-cycles.json");
        assert.equal(fileSha(cyclesFile), loaded.cyclesSha);
        const last = read(cyclesFile).at(-1);
        assert.deepEqual([last.t, last.records], [loaded.phase.t, loaded.phase.indexedRecords]);
        assert.equal(loaded.pgdataBytes < 450e9, true, "The loaded census exceeds the approved maximum footprint");
      }
      assert(loaded.phase.bulkLoaded && loaded.phase.indexedRecords >= config.target && inspected.records >= config.target);
      const hereTx = binding.java.find((p) => p.pid === binding.options.txPid);
      assert.notDeepEqual([loaded.transactor.pid, loaded.transactor.startTicks], [hereTx.pid, hereTx.startTicks],
        "Start a fresh transactor under the measurement profile first");
      const measurementInput = path.join(rung, "measurement-input.json");
      const want = { loadedSha: fileSha(path.join(rung, "bulk-loaded.json")), checkpointSha: loaded.checkpointSha };
      if (!fs.existsSync(measurementInput)) {
        assert.equal(fileSha(state), loaded.checkpointSha, "Live measurement must start on the exact loaded cut");
        write(measurementInput, want);
      }
      assert.deepEqual(read(measurementInput), want);
    }
    if (resuming) {
      assert.deepEqual([inspected.t, inspected.head, inspected.nativeId, inspected.finished],
        [failed.r.t, failed.r.head, failed.inspected.nativeId, true], "The held cluster differs from the failed attempt's cut");
    }
    const r = await peer("rung", "rung", "rung", state, String(config.target), String(config.seconds),
      String(Math.floor(deadline)), String(Math.ceil(config.reserveHours * 3600)));
    assert.equal(r.target, config.target);
    assert(r.agedRecords >= config.target && r.records >= r.agedRecords);
    assert.equal(r.windows.low.quiet.n, config.seconds * 3.5);
    assert.equal(r.windows.busy.quiet.n, r.windows.low.quiet.n);
    assert.equal(r.windows.busy.all.n, config.seconds * 50);
    assert(r.windows["index-overlap"].overlap.n > 0, "No save overlapped index adoption");
    if (resuming) {
      const frozen = (x) => [x.target, x.t, x.head, x.records, x.agedRecords, x.observedBy,
        ...Object.values(x.windows).flatMap((w) => [w.wallStart, w.wallEnd, w.observedBy, w.quiet?.n, w.all?.n])];
      assert.deepEqual(frozen(r), frozen(failed.r), "The frozen rung differs from the failed attempt's rung");
    }
    const cold = resuming ? failed.cold : {};
    for (const label of resuming ? [] : coldCells) {
      cold[label] = await peer(label, "cold", "cold", state, label);
      assert.deepEqual([cold[label].cell, cold[label].t], [label, r.t]);
    }
    const structure = resuming ? failed.structure : await peer("structure", "structure", "structure", state);
    assert(structure.indexBasisT >= r.t);
    const uri = env.DATOMIC_URI_TEMPLATE.replace("{db}", binding.db);
    const restoreDb = resuming ? failed.restoreDb : "age-restore-" + attempt;
    env.AGE_RESTORE_DB = restoreDb;
    const restoreUri = env.AGE_RESTORE_URI_TEMPLATE.replace("{db}", restoreDb);
    const backupPath = path.join(config.copyMount, "age1-copy-" + sha(binding.db).slice(0, 12) + "-" + config.target);
    const backup = "file:" + backupPath;
    const vendor = async (tag, ...args) => {
      const started = performance.now();
      const log = await commands(tag, path.join(home, "bin/datomic"), ["-Xms256m", "-Xmx" + config.copyHeap, gcFlags(tag), ...args],
        { PATH: path.dirname(java) + ":" + process.env.PATH, DATOMIC_JAVA_OPTS: "" });
      assert(fs.statSync(path.join(logDir, tag + "-gc.log")).size > 0);
      return { ms: performance.now() - started, output: fs.readFileSync(log, "utf8") };
    };
    let copied;
    if (resuming) {
      // The retained backup must still list the rung basis; its full verify already passed in the failed attempt.
      const listed = await vendor("backup-list", "list-backups", backup);
      assert(listed.output.split(/[^0-9]+/).includes(String(r.t)), "The retained backup does not hold the rung basis");
      copied = { ...failed.ms, objectCount: failed.objectCount };
    } else {
      const backupRun = await vendor("backup", "backup-db", uri, backup);
      assert(backupRun.output.split("\n").includes(":succeeded"));
      const verify = await vendor("verify", "verify-backup", backup, "true", String(r.t));
      const ok = verify.output.split("\n").find((line) => line.includes(":event :verify-backup/complete"));
      assert(ok && ok.includes(":missing-segments #{}") && ok.includes(":unreadable-segments ()"));
      assert.equal(Number(/:t (\d+)[,}]/.exec(ok)?.[1]), r.t);
      if (separateCopyPolicy) assert(space(config.restoreMount) > config.restoreHeadroomBytes + directoryMargin,
        "Verified backup leaves insufficient allocation for the native restore");
      const restore = await vendor("restore", "restore-db", backup, restoreUri, String(r.t));
      assert(restore.output.split("\n").includes(":succeeded"));
      copied = { backupMs: backupRun.ms, verifyMs: verify.ms, restoreMs: restore.ms,
        objectCount: Number(/:total-segments (\d+)/.exec(ok)?.[1]) };
    }
    // [DX-AGE1] Why: a peer finds its transactor through storage, and a restore carries no transactor location.
    // Rejected: a peer read without a transactor, or a readback against the primary instead of the restored copy.
    if (stopped) throw stopped;
    const restoreTx = await startRestoreTransactor({ home, java, extClasspath: path.join(repo, "packages/datomic/gateway/src"),
      primaryProperties: config.transactorProperties, jdbc: env.AGE_RESTORE_JDBC, uriTemplate: env.AGE_RESTORE_URI_TEMPLATE,
      logFile: path.join(logDir, "restore-transactor.log") });
    let restored;
    try {
      restored = await peer("restore-readback", "restore-readback", "restore-check", state, String(r.t));
    } finally {
      await restoreTx.stop();
    }
    assert.deepEqual([restored.t, restored.head], [r.t, r.head]);
    const endJava = binding.java.map(({ pid }) => getProcess(pid));
    for (const [i, p] of endJava.entries()) {
      assert.deepEqual([p.startTicks, p.cmdSha], [binding.java[i].startTicks, binding.java[i].cmdSha]);
    }
    const cut = await peer("seal", "seal-cut", "seal", state, String(config.target));
    assert.deepEqual([cut.t, cut.head, cut.records], [r.t, r.head, r.records]);
    const journal = "recorded-predecessor-k";
    const scorecardCut = await peer("scorecard-cut", "scorecard-cut", "scorecard-cut", state, binding.db,
      String(r.t), String(r.head), String(r.records), journal);
    const result = { attempt, bindingSha: binding.runSpecSha, source: binding.source, target: config.target,
      agingEvidence: measuring ? fileSha(path.join(rung, "bulk-loaded.json")) : undefined,
      head: r.head, t: r.t, records: r.records, journal, cold, structure, endJava,
      checkpointSha: fileSha(state), seedLedgerSha: fileSha(state + ".population.edn"),
      measuredBy: r.observedBy, windowsBy: Object.fromEntries(Object.entries(r.windows)
        .map(([label, window]) => [label, { attempt: window.observedBy, from: window.wallStart, to: window.wallEnd }])),
      copy: { backupMs: copied.backupMs, verifyMs: copied.verifyMs, restoreMs: copied.restoreMs, restoreDb,
        objectCount: copied.objectCount,
        backupBytes: Number(execFileSync("du", ["-sb", backupPath], { encoding: "utf8" }).split(/\s/)[0]) },
      restoreTransactor: { port: restoreTx.port, primaryPort: restoreTx.primaryPort, startMs: restoreTx.startMs },
      ...(resuming ? { resume: { failedAttempt: failedId, failedSource: failed.binding.source, failedHashes: failed.hashes,
        failedEndedAt: failed.endedAt, resumedAt: resumeStarted, copyMsFrom: "vendor JVM uptime in the failed attempt's GC logs",
        coldAndStructureFrom: failedId } } : {}),
      hours: resuming ? (failed.endedAt - origin.started + Date.now() - resumeStarted) / 3_600_000
        : (Date.now() - origin.started) / 3_600_000 };
    assert(result.copy.objectCount > 0);
    finishJvmLogs();
    const hashes = Object.fromEntries(fs.readdirSync(logDir).map((f) => [f, fileSha(path.join(logDir, f))]));
    write(final, { ...result, usd: result.hours * rateUsd, hashes });
    const handoff = writeScorecard(final, fileSha(final), state, scorecard, scorecardCut);
    console.log(JSON.stringify({ event: "sealed", ...result, usd: result.hours * rateUsd, scorecard: handoff }));
  } finally {
    clearInterval(watcher);
    if (external.length) try { finishJvmLogs(); } catch {}
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const [input, ...args] = process.argv.slice(2);
  if (input === "forecast") console.log(JSON.stringify(forecast(...args.map(Number))));
  else if (["ladder", "load", "measure-loaded"].includes(input)) await run(path.resolve(args[0]), read(args[0]), input);
  else if (input === "resume-readback") await run(path.resolve(args[0]), read(args[0]), input, args[1]);
  else await run(path.resolve(input), read(input), "legacy");
}

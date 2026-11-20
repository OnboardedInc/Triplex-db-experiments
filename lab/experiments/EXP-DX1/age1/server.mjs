import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";

const here = import.meta.dirname;
const repo = path.resolve(here, "../../../..");
const rateUsd = 1.09;
const targetSet = [1e9, 2e9, 4e9, 8e9];
const coldCells = ["current-recent", "current-year-idle", "pinned-recent", "pinned-year-idle", "old-cut"];
const GiB = 2 ** 30;
const read = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const fileSha = (file) => sha(fs.readFileSync(file));
const safeInteger = (x, min, max) => Number.isSafeInteger(x) && min <= x && x <= max;
const digest = /^[0-9a-f]{64}$/;

export function forecast(records, target, recordsPerSecond, reserveHours) {
  assert(targetSet.includes(target));
  assert(safeInteger(records, 1, 8e9) && records <= target);
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
  return { pid, startTicks: stat[19], pssKiB: pss, cmdSha: sha(file("cmdline")) };
}

function admit(config, configFile) {
  assert.equal(process.platform, "linux");
  const git = (args) => execFileSync("git", args, { cwd: repo, encoding: "utf8" }).trim();
  assert.equal(git(["rev-parse", "HEAD"]), config.source);
  assert.equal(git(["status", "--porcelain", "--untracked-files=no"]), "");
  assert(targetSet.includes(config.target));
  assert(safeInteger(config.fromRecords, 1, config.target));
  assert(safeInteger(config.seconds, 60, 900) && config.seconds % 2 === 0);
  assert(safeInteger(config.activePerAccount, 26, 2000));
  assert(safeInteger(config.maxSqlBytes, 10 * GiB, 64 * 1024 * GiB));
  assert(safeInteger(config.copyHeadroomBytes, 25 * GiB, 64 * 1024 * GiB));
  assert(safeInteger(config.bytesPerAddedRecord, 50, 2048));
  assert(config.maxHours > 0 && config.maxHours <= (config.target === 1e9 ? 9.9 : 60));
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
  assert.equal(fileSha("/proc/" + options.txPid + "/root" + propsArg), config.transactorPropertiesSha);
  const allowJava = [...new Set(config.javaPids)].sort((a, b) => a - b);
  const running = execFileSync("ps", ["-eo", "pid=,comm="], { encoding: "utf8" })
    .split("\n").map((s) => /^\s*(\d+)\s+java\s*$/.exec(s)).filter(Boolean)
    .map((x) => Number(x[1])).sort((a, b) => a - b);
  assert(allowJava.includes(options.txPid));
  assert.deepEqual(running, allowJava, "Dedicated server Java process inventory differs");
  const machine = fs.readFileSync("/etc/machine-id", "utf8");
  return {
    source: config.source, configSha: fileSha(configFile), datomicSha: config.datomicSha,
    imageSha: config.imageSha, transferSha: config.transferSha, target: config.target,
    machineHash: sha(machine), db: seal.scopes[0].db, options, java: allowJava.map(getProcess),
    output: config.output,
  };
}

async function run(configFile, config) {
  const binding = admit(config, configFile);
  const initial = forecast(config.fromRecords, config.target, config.ratePrior, config.reserveHours);
  const parent = path.dirname(config.output);
  const scopeLock = path.join(parent, "age1-writer-" + sha(binding.db) + ".lock");
  fs.mkdirSync(config.output, { recursive: true });
  if (!process.argv.includes("--locked")) {
    console.log(JSON.stringify({ phase: "forecast", ...initial }));
    const result = await new Promise((resolve, reject) => {
      const child = spawn("flock", ["-F", "-n", scopeLock, process.execPath, fileURLToPath(import.meta.url),
        configFile, "--locked"], { stdio: "inherit" });
      for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
      child.once("error", reject);
      child.once("exit", (code) => resolve(code ?? 1));
    });
    process.exitCode = result;
    return;
  }
  assert(initial.hours < config.maxHours && initial.usd <= config.maxUsd, "Forecast exceeds rung budget");
  const dir = config.output;
  const rung = path.join(dir, String(config.target));
  fs.mkdirSync(rung, { recursive: true });
  const final = path.join(rung, "sealed.json");
  if (fs.existsSync(final)) {
    const saved = read(final);
    assert.equal(saved.bindingSha, binding.configSha);
    for (const [file, want] of Object.entries(saved.hashes)) {
      assert.equal(path.basename(file), file);
      assert.equal(fileSha(path.join(rung, saved.attempt, file)), want);
    }
    console.log(JSON.stringify(saved));
    return;
  }
  const admitted = path.join(rung, "admission.json");
  if (!fs.existsSync(admitted)) write(admitted, { started: Date.now(), binding });
  const origin = read(admitted);
  assert.equal(origin.binding.configSha, binding.configSha);
  assert.equal(origin.binding.machineHash, binding.machineHash);
  const deadline = origin.started + config.maxHours * 3_600_000;
  const reserve = config.copyHeadroomBytes;
  const stableFloor = () => {
    assert(Date.now() < deadline, "Rung time limit reached");
    assert(space(config.dataMount) > 12 * GiB && space(config.copyMount) > 12 * GiB, "Disk floor reached");
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
  const state = path.join(parent, "age1-" + sha(binding.db) + ".edn");
  const gcFlags = (tag) => "-Xlog:gc*,safepoint:file=" + path.join(logDir, tag + "-gc.log") +
    ":time,uptime,pid,level,tags";
  let stopped, active;
  const interrupt = (error) => {
    stopped ??= error;
    const child = active;
    child?.kill("SIGTERM");
    if (child) setTimeout(() => child.kill("SIGKILL"), 10000).unref();
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
          active = spawn(cmd, args, { env: { ...env, ...customEnv }, stdio: ["ignore", fd, fd] });
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
    if (!fs.existsSync(state)) {
      const a = await peer("adopt", "adopt", "adopt", config.image, config.imageSha, state, String(config.activePerAccount));
      assert.equal(a.manifestSha, config.imageSha);
      assert.equal(a.name, binding.db);
      assert(safeInteger(a.records, 1, config.target));
    }
    const inspected = await peer("inspect", "inspect", "inspect", state, config.imageSha);
    assert.equal(inspected.db, binding.db);
    const corrected = forecast(Math.min(inspected.records, config.target), config.target, config.ratePrior, config.reserveHours);
    console.log(JSON.stringify({ phase: "observed-head-forecast", ...corrected }));
    write(path.join(logDir, "observed-forecast.json"), corrected);
    assert(inspected.finished || Date.now() + corrected.hours * 3_600_000 < deadline,
      "Observed head is below budgeted size for this deadline");
    const projected = Math.max(0, config.target - inspected.records) * config.bytesPerAddedRecord;
    assert(inspected.sqlBytes + projected < config.maxSqlBytes, "Forecast exceeds source SQL cap");
    if (fs.statSync(config.dataMount).dev === fs.statSync(config.copyMount).dev) {
      assert(space(config.dataMount) > projected + reserve + 12 * GiB, "Combined growth and copy disk forecast does not fit");
    } else {
      assert(space(config.dataMount) > projected + 12 * GiB && space(config.copyMount) > reserve + 12 * GiB,
        "Projected age or copy footprint exceeds reserved free space");
    }
    const r = await peer("rung", "rung", "rung", state, String(config.target), String(config.seconds),
      String(Math.floor(deadline)), String(Math.ceil(config.reserveHours * 3600)));
    assert.equal(r.target, config.target);
    assert(r.agedRecords >= config.target && r.records >= r.agedRecords);
    assert.equal(r.windows.low.quiet.n, config.seconds * 3.5);
    assert.equal(r.windows.busy.quiet.n, r.windows.low.quiet.n);
    assert.equal(r.windows.busy.all.n, config.seconds * 50);
    assert(r.windows["index-overlap"].overlap.n > 0, "No save overlapped index adoption");
    const cold = {};
    for (const label of coldCells) {
      cold[label] = await peer(label, "cold", "cold", state, label);
      assert.deepEqual([cold[label].cell, cold[label].t], [label, r.t]);
    }
    const structure = await peer("structure", "structure", "structure", state);
    assert(structure.indexBasisT >= r.t);
    const uri = env.DATOMIC_URI_TEMPLATE.replace("{db}", binding.db);
    const restoreDb = "age-restore-" + attempt;
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
    const backupRun = await vendor("backup", "backup-db", uri, backup);
    assert(backupRun.output.split("\n").includes(":succeeded"));
    const verify = await vendor("verify", "verify-backup", backup, "true", String(r.t));
    const ok = verify.output.split("\n").find((line) => line.includes(":event :verify-backup/complete"));
    assert(ok && ok.includes(":missing-segments #{}") && ok.includes(":unreadable-segments ()"));
    assert.equal(Number(/:t (\d+)[,}]/.exec(ok)?.[1]), r.t);
    const restore = await vendor("restore", "restore-db", backup, restoreUri, String(r.t));
    assert(restore.output.split("\n").includes(":succeeded"));
    const restored = await peer("restore-readback", "restore-readback", "restore-check", state, String(r.t));
    assert.deepEqual([restored.t, restored.head], [r.t, r.head]);
    const endJava = binding.java.map(({ pid }) => getProcess(pid));
    for (const [i, p] of endJava.entries()) {
      assert.deepEqual([p.startTicks, p.cmdSha], [binding.java[i].startTicks, binding.java[i].cmdSha]);
    }
    const cut = await peer("seal", "seal-cut", "seal", state, String(config.target));
    assert.deepEqual([cut.t, cut.head, cut.records], [r.t, r.head, r.records]);
    const result = { attempt, bindingSha: binding.configSha, source: binding.source, target: config.target,
      head: r.head, t: r.t, records: r.records, cold, structure, endJava,
      copy: { backupMs: backupRun.ms, verifyMs: verify.ms, restoreMs: restore.ms, restoreDb,
        objectCount: Number(/:total-segments (\d+)/.exec(ok)?.[1]),
        backupBytes: Number(execFileSync("du", ["-sb", backupPath], { encoding: "utf8" }).split(/\s/)[0]) },
      hours: (Date.now() - origin.started) / 3_600_000 };
    assert(result.copy.objectCount > 0);
    finishJvmLogs();
    const hashes = Object.fromEntries(fs.readdirSync(logDir).map((f) => [f, fileSha(path.join(logDir, f))]));
    write(final, { ...result, usd: result.hours * rateUsd, hashes });
    console.log(JSON.stringify({ event: "sealed", ...result, usd: result.hours * rateUsd }));
  } finally {
    clearInterval(watcher);
    if (external.length) try { finishJvmLogs(); } catch {}
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const [input, ...args] = process.argv.slice(2);
  if (input === "forecast") console.log(JSON.stringify(forecast(...args.map(Number))));
  else await run(path.resolve(input), read(input));
}

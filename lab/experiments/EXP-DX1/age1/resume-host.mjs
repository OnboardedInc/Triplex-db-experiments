// @ts-nocheck -- [EXP-CHECKJS] server records, Docker inspection and retained evidence are validated at runtime.
// Server only: finish the failed 1B measure-loaded attempt from its retained held cluster, backup and restored copy.
// node resume-host.mjs OUT AGE_CHECKOUT CONTROLLER_REPOSITORY NETWORK_RECORD_DIR
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";
import { listening } from "./readback.mjs";

const [out, ageCheckout, controller, networkFrom] = process.argv.slice(2);
const here = import.meta.dirname;
const lab = "lab/experiments/EXP-DX1/age1";
const jdk = "/usr/lib/jvm/java-21-openjdk-amd64/bin";
const read = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const fileSha = (file) => createHash("sha256").update(fs.readFileSync(file)).digest("hex");
// [DX-THIN1] Why: with stdio "ignore" execFileSync returns null; the 1 billion resume crashed here after its seal
// (line 162, 2026-11-23). Rejected: dropping stdio "ignore" (the export's output is not wanted in the log).
const call = (cmd, args, extra = {}) => String(execFileSync(cmd, args, { timeout: 30000, encoding: "utf8", ...extra }) ?? "").trim();
const docker = (...args) => call("docker", args);
const write = (file, body) => fs.writeFileSync(file, JSON.stringify(body, null, 2) + "\n", { flag: "wx", mode: 0o600 });
const tag = "resume-" + new Date().toISOString().replace(/[:.]/g, "-");
const status = (stage) => { fs.appendFileSync(path.join(out, tag + "-status.log"), new Date().toISOString() + " " + stage + "\n"); };
const javas = () => call("ps", ["-eo", "pid=,comm="]).split("\n").map((l) => /^\s*(\d+)\s+java$/.exec(l)?.[1])
  .filter(Boolean).map(Number);

assert(process.platform === "linux" && process.getuid() === 0);
assert.equal(process.env.DOCKER_HOST, "unix:///var/run/docker.sock");
assert([out, ageCheckout, controller, networkFrom].every((p) => p && path.isAbsolute(p)));
assert.equal(fs.realpathSync(here), fs.realpathSync(path.join(ageCheckout, lab)), "Run the copy inside AGE_CHECKOUT");
const pins = read(path.join(here, "readback-pins.json"));
const source = call("git", ["rev-parse", "HEAD"], { cwd: ageCheckout });
assert.equal(call("git", ["status", "--porcelain"], { cwd: ageCheckout }), "");
// [DX-AGE1] Why: the readback must be the same peer code that the failed attempt ran.
// Rejected: resuming from a checkout whose Clojure peer or gateway source moved since the failed attempt.
call("git", ["diff", "--quiet", pins.source, source, "--", lab + "/src", "packages/datomic", lab + "/scorecard.mjs"],
  { cwd: ageCheckout });

// The failed attempt's records, before anything starts.
const identity = read(path.join(out, "identity.json"));
const exit = read(path.join(out, "exit.json"));
const cleanup = read(path.join(out, "cleanup.json"));
assert.deepEqual([exit.result, exit.nonce, cleanup.nonce, cleanup.containers], [1, identity.nonce, identity.nonce, []]);
assert.equal(identity.source, pins.source);
const failedConfig = path.join(out, "config.json");
assert.equal(fileSha(failedConfig), pins.configSha);
const config = read(failedConfig);
const txProps = config.transactorProperties;
assert.equal(txProps, path.join(out, "sql.properties"));
assert.equal(fileSha(txProps), pins.transactorPropertiesSha);
const properties = fs.readFileSync(txProps, "utf8");
const password = /^sql-password=([a-f0-9]{40})$/m.exec(properties)?.[1];
assert(password);
const rung = path.join(config.output, "1000000000");
assert(!fs.existsSync(path.join(rung, "sealed.json")), "A seal exists already; finish its handoff by hand");
assert(fs.existsSync(path.join(rung, pins.attempt, "restore-readback.log")));
assert(!fs.existsSync(path.join(out, "handoff.json")) && !fs.existsSync(path.join(out, "aged-pgdata.json")));
const network = read(path.join(networkFrom, "runtime-network.json"));
assert(properties.includes("sql-url=jdbc:postgresql://" + network.primary + ":5432/datomic\n"),
  "The recorded network does not carry the primary SQL address in the failed properties");
const vendorHome = path.join(out, "datomic-runtime");
assert.equal(fileSha(path.join(vendorHome, "datomic-transactor-pro-1.0.7745.jar")), config.datomicSha);
const dataMount = config.dataMount, copyData = config.restorePgData;
for (const dir of [dataMount, copyData]) {
  assert(fs.existsSync(path.join(dir, "PG_VERSION")), "Retained cluster missing: " + dir);
  assert(!fs.existsSync(path.join(dir, "postmaster.pid")), "Retained cluster was not stopped cleanly: " + dir);
}
const volume = identity.resumedPrivateVolume;
assert.equal(JSON.parse(docker("volume", "inspect", volume))[0].Options?.device, dataMount);
assert.equal(docker("ps", "-q"), "", "Containers are running");
assert.deepEqual(javas(), [], "Java processes are running");
const prefix = "scale1-" + path.basename(out) + "-resume";
const pgName = prefix + "-pg", copyName = prefix + "-copy", netName = prefix + "-net";
const db = read(path.join(rung, pins.attempt, "binding.json")).db;
const backupDir = path.join(config.copyMount, "age1-copy-" + createHash("sha256").update(db).digest("hex").slice(0, 12) + "-1000000000");
assert(fs.statSync(backupDir).isDirectory(), "Retained backup missing");

const { normalizeScorecardRoles, stoppedInventory } = await import(pathToFileURL(path.join(controller,
  "lab/experiments/EXP-DX1/scale1/decision/pgdata.ts")));
const roles = [];
let netMade = false, tx, runner, txDone;
const started = Date.now();
const stopAll = async () => {
  if (runner?.exitCode === null) runner.kill("SIGTERM");
  if (tx?.exitCode === null) {
    tx.kill("SIGTERM");
    await Promise.race([txDone, sleep(30000)]);
    if (tx.exitCode === null) tx.kill("SIGKILL");
  }
};
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => { void stopAll(); });
try {
  status("starting the held and restored PostgreSQL clusters");
  docker("network", "create", "--subnet", network.subnet, "--gateway", network.gateway, netName);
  netMade = true;
  for (const [name, ip, mount, cpus] of [[pgName, network.primary, volume, "1,8"], [copyName, network.copy, copyData, "8"]]) {
    call("docker", ["run", "-d", "--pull", "never", "--name", name, "--network", netName, "--ip", ip, "--cpuset-cpus", cpus,
      "--memory", "8g", "--memory-swap", "8g", "-e", "POSTGRES_PASSWORD", "-v", mount + ":/var/lib/postgresql/data",
      identity.pgImage, "postgres", "-c", "shared_buffers=2GB", "-c", "synchronous_commit=on", "-c", "fsync=on",
      "-c", "full_page_writes=on", "-c", "track_io_timing=on"], { env: { ...process.env, POSTGRES_PASSWORD: password } });
    roles.push(name);
    const deadline = Date.now() + 300000;
    for (;;) {
      try { docker("exec", name, "pg_isready", "-h", "127.0.0.1", "-U", "postgres"); break; }
      catch { assert(Date.now() < deadline, "PostgreSQL did not start"); await sleep(1000); }
    }
  }
  const sql = (name, db, input) => call("docker", ["exec", "-i", name, "psql", "-qXAt", "-v", "ON_ERROR_STOP=1", "-U",
    "postgres", "-d", db], { input });
  // The original start sets the same two passwords on the held cluster before its transactor starts.
  sql(pgName, "postgres", "ALTER ROLE datomic PASSWORD '" + password + "';\nALTER ROLE postgres PASSWORD '" + password + "';");
  docker("update", "--cpuset-cpus", "1", pgName);
  assert.equal(sql(pgName, "datomic", "SELECT current_setting('fsync'),current_setting('synchronous_commit'),current_setting('full_page_writes');"), "on|on|on");
  for (const [name, db] of [[pgName, "datomic"], [copyName, "verify_rung"]])
    assert.equal(sql(name, db, "SELECT bool_and(has_table_privilege('datomic','public.datomic_kvs', p)) FROM unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE']) AS p;"), "t");
  status("starting the measurement transactor on the held cluster");
  const txLog = path.join(out, tag + "-tx.log");
  const fd = fs.openSync(txLog, "wx", 0o600);
  tx = spawn("taskset", ["-c", "0", path.join(vendorHome, "bin/transactor"), txProps], { stdio: ["ignore", fd, fd],
    env: { ...process.env, PATH: jdk + ":" + process.env.PATH, JAVA_OPTS: "-Xms1g -Xmx5g -XX:+UseG1GC",
      DATOMIC_EXT_CLASSPATH: path.join(ageCheckout, "packages/datomic/gateway/src") } });
  fs.closeSync(fd);
  txDone = new Promise((resolve) => tx.once("exit", resolve));
  const txStart = Date.now();
  // [DX-AGE1] Why: the transactor writes its storage location about ten seconds after "System started", then listens.
  // Rejected: starting peers on the startup line, which fails with read-transactor-location-failed.
  const txHost = /^host=(\S+)$/m.exec(properties)?.[1], txPort = Number(/^port=(\d+)$/m.exec(properties)?.[1] ?? 4334);
  assert(txHost);
  while (!fs.readFileSync(txLog, "utf8").split("\n").includes("System started") || !(await listening(txHost, txPort))) {
    assert(Date.now() - txStart < 180000 && tx.exitCode === null, "Measurement transactor did not start");
    await sleep(1000);
  }
  const running = javas();
  assert.equal(running.length, 1);
  const txPid = running[0];
  const measureSettings = path.join(out, tag + "-measure-settings.json");
  write(measureSettings, { ...config.expectedMeasureSettings, txPid });
  const resumeConfig = path.join(out, tag + "-config.json");
  write(resumeConfig, { ...config, source, transactorPid: txPid, javaPids: [txPid],
    measureSettings, expectedMeasureSettings: { ...config.expectedMeasureSettings, txPid },
    restorePostgresPid: Number(docker("inspect", "--format", "{{.State.Pid}}", copyName)) });
  const jdbc = (ip, db) => "jdbc:postgresql://" + ip + ":5432/" + db;
  const uri = (j) => "datomic:sql://{db}?" + j + "?user=datomic&password=" + password;
  const ageEnv = { ...process.env, AGE_JAVA: path.join(jdk, "java"), AGE_DATOMIC_HOME: vendorHome, AGE_SQL_PASSWORD: password,
    AGE_SQL_JDBC: jdbc(network.primary, "datomic"), AGE_RESTORE_JDBC: jdbc(network.copy, "verify_rung"),
    DATOMIC_URI_TEMPLATE: uri(jdbc(network.primary, "datomic")), AGE_RESTORE_URI_TEMPLATE: uri(jdbc(network.copy, "verify_rung")) };
  status("running AGE1 resume-readback");
  const log = fs.openSync(path.join(out, tag + "-runner.log"), "wx", 0o600);
  runner = spawn("taskset", ["-c", "7,9,10", process.execPath, path.join(ageCheckout, lab, "server.mjs"), "resume-readback",
    resumeConfig, pins.attempt], { cwd: ageCheckout, stdio: ["ignore", log, log], env: ageEnv });
  fs.closeSync(log);
  const result = await Promise.race([new Promise((resolve) => runner.once("exit", resolve)),
    txDone.then(() => { throw Error("Measurement transactor exited during the resume"); })]);
  assert.equal(result, 0, "resume-readback refused or failed. Read " + tag + "-runner.log");
  const seal = path.join(rung, "sealed.json"), sealSha = fileSha(seal), sealed = read(seal);
  assert.deepEqual([sealed.source, sealed.resume?.failedAttempt, sealed.t, sealed.head, sealed.records],
    [source, pins.attempt, pins.t, pins.head, pins.records]);
  status("verifying the aged scorecard handoff with a fresh peer");
  const state = path.join(path.dirname(config.output), "age1-" + createHash("sha256").update(db).digest("hex") + ".edn");
  const handoff = path.join(rung, "aged-scorecard.json");
  call(process.execPath, [path.join(ageCheckout, lab, "scorecard.mjs"), "export", seal, sealSha, state, handoff],
    { cwd: ageCheckout, env: ageEnv, timeout: 300000, stdio: "ignore" });
  write(path.join(out, "handoff.json"), { ...identity, at: Date.now(), sealSha, records: sealed.records, cut: sealed.head,
    t: sealed.t, bytes: fs.statSync(handoff).size, digest: fileSha(handoff), resumedFrom: pins.attempt, resumeSource: source });
  status("stopping the transactor and sealing the stopped held cluster");
  tx.kill("SIGTERM");
  assert(await Promise.race([txDone.then(() => true), sleep(30000).then(() => false)]), "Transactor did not stop");
  assert(!javas().includes(txPid));
  normalizeScorecardRoles(pgName);
  call("docker", ["stop", "--time", "120", pgName], { timeout: 130000 });
  assert.equal(docker("inspect", "--format", "{{.State.ExitCode}}", pgName), "0");
  const inventory = await stoppedInventory(dataMount);
  write(path.join(out, "aged-pgdata.json"), { ...identity, sealSha, sourceVolume: volume, cut: sealed.head, t: sealed.t,
    records: sealed.records, bundleSha: fileSha(handoff), data: dataMount, inventory, at: Date.now(),
    resumedFrom: pins.attempt, resumeSource: source });
  status("sealed aged rung with a stopped PostgreSQL handoff");
  console.log(JSON.stringify({ event: "resume-sealed", handoff, handoffSha256: fileSha(handoff), sealSha,
    pgdata: dataMount, inventory, minutes: (Date.now() - started) / 60000 }));
} finally {
  await stopAll();
  for (const name of [...roles].reverse()) {
    try { docker("stop", "--time", "120", name); } catch {}
    docker("rm", name);
  }
  if (netMade) docker("network", "rm", netName);
  const left = docker("ps", "-a", "--format", "{{.Names}}").split("\n").filter((n) => roles.includes(n));
  write(path.join(out, tag + "-cleanup.json"), { containers: left, javas: javas(), retained: [volume, copyData, backupDir],
    at: Date.now() });
  assert.deepEqual(left, []);
}

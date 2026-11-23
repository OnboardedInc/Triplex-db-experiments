// @ts-nocheck -- [EXP-CHECKJS] Docker and vendor output are validated at runtime.
// Mac correctness gate (toy size, diagnostic timings): backup, restore into separate storage, the failed readback
// reproduced, then the repaired restore transactor and a real peer read of the restored copy at its basis.
// Mac:   node lab/bin/heavy.mjs --label DX-AGE1 -- node lab/experiments/EXP-DX1/age1/readback-gate.mjs OUT_DIR
// Inner: runs inside the Datomic image with the source at /age.
import assert from "node:assert/strict";
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

const lab = "lab/experiments/EXP-DX1/age1";

async function inner() {
  const { startRestoreTransactor, redact, listening } = await import("/age/" + lab + "/readback.mjs");
  const { PGPASS: password, PGHOST: pg } = process.env;
  const outDir = "/tmp/out";
  const result = {};
  const jdbc = (db) => "jdbc:postgresql://" + pg + ":5432/" + db;
  const uri = (name, db) => "datomic:sql://" + name + "?" + jdbc(db) + "?user=postgres&password=" + password;
  const primary = "/tmp/primary.properties";
  const template = fs.readFileSync("/opt/datomic/config/samples/sql-transactor-template.properties", "utf8");
  const applied = { protocol: "sql", host: "127.0.0.1", "alt-host": "127.0.0.1", "sql-url": jdbc("postgres"),
    "sql-user": "postgres", "sql-password": password, "memory-index-threshold": "32m", "memory-index-max": "128m",
    "object-cache-max": "64m" };
  fs.writeFileSync(primary, template.split("\n").filter((l) => !(l.split("=")[0].trim() in applied)).join("\n") + "\n" +
    Object.entries(applied).map(([k, v]) => k + "=" + v).join("\n") + "\n", { mode: 0o600 });
  const txLog = "/tmp/primary-transactor.raw";
  const fd = fs.openSync(txLog, "w");
  const tx = spawn("/opt/datomic/bin/transactor", ["-Xms256m", "-Xmx512m", primary], { stdio: ["ignore", fd, fd], detached: true });
  const t0 = Date.now();
  while (!fs.readFileSync(txLog, "utf8").split("\n").some((l) => l.startsWith("System started")) ||
    !(await listening("127.0.0.1", 4334))) {
    assert(Date.now() - t0 < 180000 && tx.exitCode === null, "primary transactor did not start");
    await sleep(500);
  }
  const clj = (label, code, env = {}) => {
    const script = "/tmp/" + label + ".clj";
    fs.writeFileSync(script, code);
    const r = spawnSync("/opt/datomic/bin/run", [script], { encoding: "utf8", env: { ...process.env, DATOMIC_JAVA_OPTS: "-Xms256m -Xmx512m", ...env },
      timeout: 240000 });
    fs.writeFileSync(path.join(outDir, label + ".log"), redact((r.stdout ?? "") + (r.stderr ?? "")));
    return r;
  };
  const vendor = (label, ...args) => {
    const r = spawnSync("/opt/datomic/bin/datomic", ["-Xms128m", "-Xmx384m", ...args], { encoding: "utf8", timeout: 240000 });
    const text = (r.stdout ?? "") + (r.stderr ?? "");
    fs.writeFileSync(path.join(outDir, label + ".log"), redact(text));
    assert.equal(r.status, 0, label + " failed");
    return text;
  };
  // A toy aged database: schema, then four transactions of 100 people, then one retraction batch.
  const made = clj("toy-create", `(require '[datomic.api :as d])
    (let [u (System/getenv "TOY_URI") _ (d/create-database u) c (d/connect u)]
      @(d/transact c [{:db/ident :toy/id :db/valueType :db.type/long :db/cardinality :db.cardinality/one :db/unique :db.unique/identity}
                      {:db/ident :toy/name :db/valueType :db.type/string :db/cardinality :db.cardinality/one}])
      (doseq [b (range 4)] @(d/transact c (vec (for [i (range 100)] {:toy/id (+ (* b 100) i) :toy/name (str "p" b "-" i)}))))
      @(d/transact c (vec (for [i (range 0 400 7)] [:db/add [:toy/id i] :toy/name (str "renamed-" i)])))
      @(d/request-index c) (deref (d/sync-index c (d/basis-t (d/db c))) 60000 nil)
      (let [db (d/db c)]
        (println "TOY" (pr-str {:t (d/basis-t db) :datoms (:datoms (d/db-stats db)) :names (count (d/datoms db :aevt :toy/name))
                                :p7 (:toy/name (d/pull db [:toy/name] [:toy/id 7]))})))
      (shutdown-agents) (System/exit 0))`, { TOY_URI: uri("toy", "postgres") });
  assert.equal(made.status, 0, "toy database not created");
  const toy = Function("return " + /TOY (\{.*\})/.exec(made.stdout)[1].replace(/:(\w+) /g, '"$1": ').replace(/" "/g, '","'))();
  result.toy = toy;
  const backup = "file:/tmp/toy-backup";
  vendor("backup", "backup-db", uri("toy", "postgres"), backup);
  const verify = vendor("verify", "verify-backup", backup, "true", String(toy.t));
  assert(verify.includes(":missing-segments #{}") && verify.includes(":t " + toy.t));
  const listed = vendor("backup-list", "list-backups", backup);
  // The same check server.mjs makes on the retained backup.
  assert(listed.split(/[^0-9]+/).includes(String(toy.t)), "list-backups does not show the basis");
  result.listBackups = listed.trim().split("\n").at(-1);
  const restoreName = "age-restore-" + randomUUID();
  const restore = vendor("restore", "restore-db", backup, uri(restoreName, "age_restore"), String(toy.t));
  assert(restore.split("\n").includes(":succeeded"));
  const readCode = `(require '[datomic.api :as d])
    (let [c (d/connect (System/getenv "RESTORE_URI")) db (d/db c)]
      (println "READ" (pr-str {:t (d/basis-t db) :datoms (:datoms (d/db-stats db)) :names (count (d/datoms db :aevt :toy/name))
                               :p7 (:toy/name (d/pull db [:toy/name] [:toy/id 7]))}))
      (shutdown-agents) (System/exit 0))`;
  // The failed state: no transactor has registered in the restored storage.
  const failed = clj("readback-before-repair", readCode, { RESTORE_URI: uri(restoreName, "age_restore") });
  assert.notEqual(failed.status, 0);
  assert((failed.stdout + failed.stderr).includes(":db.error/read-transactor-location-failed"), "different failure");
  result.failedBeforeRepair = ":db.error/read-transactor-location-failed";
  // The repair: the same function server.mjs calls, while the primary transactor keeps its own port.
  const restoreTx = await startRestoreTransactor({ home: "/opt/datomic", java: "/opt/java/openjdk/bin/java",
    extClasspath: "/age/packages/datomic/gateway/src", primaryProperties: primary, jdbc: jdbc("age_restore"),
    uriTemplate: "datomic:sql://{db}?" + jdbc("age_restore") + "?user=postgres&password=" + password,
    logFile: path.join(outDir, "restore-transactor.log") });
  let read;
  try {
    assert(tx.exitCode === null, "primary transactor stopped");
    read = clj("readback-after-repair", readCode, { RESTORE_URI: uri(restoreName, "age_restore") });
  } finally {
    await restoreTx.stop();
  }
  assert.equal(read.status, 0, "repaired readback failed");
  const seen = Function("return " + /READ (\{.*\})/.exec(read.stdout)[1].replace(/:(\w+) /g, '"$1": ').replace(/" "/g, '","'))();
  assert.deepEqual(seen, toy, "restored read differs from the source at the basis");
  result.restoredRead = seen;
  result.restoreTransactor = { port: restoreTx.port, primaryPort: restoreTx.primaryPort, startMs: restoreTx.startMs };
  const kept = fs.readFileSync(path.join(outDir, "restore-transactor.log"), "utf8");
  assert(!kept.includes(password), "restore transactor log kept the password");
  assert(kept.includes("System started"));
  assert.deepEqual(fs.readdirSync("/tmp").filter((d) => d.startsWith("age1-restore-tx-")), [], "private directory left");
  const after = clj("readback-after-stop", readCode, { RESTORE_URI: uri(restoreName, "age_restore") });
  result.afterStopExit = after.status;
  assert(tx.exitCode === null, "primary transactor stopped");
  process.kill(-tx.pid, "SIGTERM");
  fs.writeFileSync(path.join(outDir, "result.json"), JSON.stringify(result, null, 2) + "\n");
  console.log(JSON.stringify(result));
}

async function outer(outDir) {
  assert.equal(process.platform, "darwin");
  const host = "unix://" + path.join(process.env.HOME, ".colima/triplex2/docker.sock");
  const env = { ...process.env, DOCKER_HOST: host };
  const docker = (...args) => execFileSync("docker", args, { env, encoding: "utf8", timeout: 120000 }).trim();
  const repo = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
  const source = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repo, encoding: "utf8" }).trim();
  assert.equal(execFileSync("git", ["status", "--porcelain", "--", lab], { cwd: repo, encoding: "utf8" }), "");
  fs.mkdirSync(outDir);
  const staged = fs.mkdtempSync(path.join(outDir, "source-"));
  execFileSync("tar", ["-xf", "-", "-C", staged], { input: execFileSync("git", ["archive", source, lab,
    "packages/datomic/gateway"], { cwd: repo, maxBuffer: 64 << 20 }) });
  const image = process.env.AGE_GATE_IMAGE ?? "tx2-datomic:dx-jvm1-startup-read";
  const imageId = docker("image", "inspect", "--format", "{{.Id}}", image);
  const id = randomUUID().slice(0, 12), prefix = "tx2-dxage-rb-" + id, password = randomBytes(16).toString("hex");
  const made = [];
  let net;
  try {
    net = docker("network", "create", "--internal", "--label", "tx2.holder=DX-AGE1", prefix);
    made.push(docker("run", "-d", "--name", prefix + "-pg", "--network", prefix, "--memory", "384m", "--cpus", "2",
      "--label", "tx2.holder=DX-AGE1", "-e", "POSTGRES_PASSWORD=" + password, "postgres:17-alpine",
      "postgres", "-c", "shared_buffers=48MB"));
    for (let i = 0; ; i++) {
      try { if (docker("exec", prefix + "-pg", "pg_isready", "-U", "postgres").includes("accepting")) break; } catch {}
      assert(i < 60); await sleep(1000);
    }
    const ddl = docker("run", "--rm", "--entrypoint", "cat", imageId, "/opt/datomic/bin/sql/postgres-table.sql");
    const psql = (db, input) => execFileSync("docker", ["exec", "-i", prefix + "-pg", "psql", "-qXAt", "-v", "ON_ERROR_STOP=1",
      "-U", "postgres", "-d", db], { env, input, encoding: "utf8" });
    psql("postgres", ddl);
    psql("postgres", "CREATE DATABASE age_restore;");
    psql("age_restore", ddl);
    made.push(docker("create", "--name", prefix + "-dx", "--network", prefix, "--memory", "3g", "--cpus", "2",
      "--label", "tx2.holder=DX-AGE1", "-v", staged + ":/age:ro", "-e", "PGPASS=" + password, "-e", "PGHOST=" + prefix + "-pg",
      "--entrypoint", "node", imageId, "/age/" + lab + "/readback-gate.mjs", "--inner"));
    const started = Date.now();
    const code = spawnSync("docker", ["start", "-a", prefix + "-dx"], { env, stdio: "inherit", timeout: 600000 }).status;
    fs.mkdirSync(path.join(outDir, "inner"));
    try { docker("cp", prefix + "-dx:/tmp/out/.", path.join(outDir, "inner")); } catch {}
    fs.writeFileSync(path.join(outDir, "gate.json"), JSON.stringify({ source, image, imageId, exit: code,
      timings: "diagnostic", seconds: (Date.now() - started) / 1000 }, null, 2) + "\n");
    assert.equal(code, 0, "inner gate failed");
  } finally {
    for (const c of made.reverse()) docker("rm", "-fv", c);
    if (net) docker("network", "rm", prefix);
    fs.rmSync(staged, { recursive: true, force: true });
  }
}

if (process.argv[2] === "--inner") {
  fs.mkdirSync("/tmp/out", { recursive: true });
  try { await inner(); }
  finally {
    const { redact } = await import("/age/" + lab + "/readback.mjs");
    if (fs.existsSync("/tmp/primary-transactor.raw")) fs.writeFileSync("/tmp/out/primary-transactor.log",
      redact(fs.readFileSync("/tmp/primary-transactor.raw", "utf8")));
  }
}
else await outer(path.resolve(process.argv[2]));

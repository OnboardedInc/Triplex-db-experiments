// @ts-nocheck -- [EXP-CHECKJS] vendor logs, properties and retained evidence are validated at runtime.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const fileSha = (file) => sha(fs.readFileSync(file));

// [DX-AGE1] Why: the restored copy has no transactor location until a transactor registers in that storage.
// Rejected: copying the primary's location row, which would point the peer at the primary transactor.
export const restoreProfile = {
  heap: ["-Xms256m", "-Xmx768m"],
  properties: { "memory-index-threshold": "32m", "memory-index-max": "128m", "object-cache-max": "128m",
    "index-parallelism": "1" },
};

const parseProperties = (text) => Object.fromEntries(text.split(/\r?\n/)
  .map((line) => /^\s*([A-Za-z0-9.-]+)\s*=\s*(.*?)\s*$/.exec(line)).filter(Boolean).map(([, k, v]) => [k, v]));

export function restoreCredentials(uriTemplate, jdbc) {
  const parts = /^datomic:sql:\/\/\{db\}\?(jdbc:[^?]+)\?(.+)$/.exec(uriTemplate ?? "");
  assert(parts, "Restore URI template is not a Datomic SQL template");
  assert.equal(parts[1], jdbc, "Restore JDBC URL differs from the restore URI template");
  const query = new URLSearchParams(parts[2]);
  const user = query.get("user"), password = query.get("password");
  assert(user && password, "Restore URI template lacks the SQL user or password");
  return { user, password };
}

// The restore transactor's properties: the vendor template, the primary's host, the next port, the restore SQL store.
export function restoreTransactorProperties({ template, primary, jdbc, uriTemplate, dir }) {
  const live = parseProperties(primary);
  assert.equal(live.protocol, "sql");
  const port = Number(live.port ?? parseProperties(template).port);
  assert(Number.isSafeInteger(port) && port > 1024 && port < 65535);
  assert(live.host, "Primary transactor host missing");
  assert.notEqual(live["sql-url"], jdbc, "The restore transactor must not use the primary storage");
  const { user, password } = restoreCredentials(uriTemplate, jdbc);
  const applied = { ...restoreProfile.properties, protocol: "sql", host: live.host, "alt-host": live["alt-host"] ?? live.host,
    port: String(port + 1), "sql-url": jdbc, "sql-user": user, "sql-password": password,
    "data-dir": path.join(dir, "data"), "log-dir": path.join(dir, "log") };
  const text = template.split(/\r?\n/).filter((line) => !(line.split("=")[0].trim() in applied)).join("\n") + "\n" +
    Object.entries(applied).map(([k, v]) => k + "=" + v).join("\n") + "\n";
  return { text, host: live.host, port: port + 1, primaryPort: port };
}

export const listening = (host, port) => new Promise((resolve) => {
  const socket = net.connect({ host, port });
  socket.setTimeout(2000);
  socket.once("connect", () => { socket.destroy(); resolve(true); });
  socket.once("timeout", () => { socket.destroy(); resolve(false); });
  socket.once("error", () => resolve(false));
});

export const redact = (text) => text.replace(/(password=)[^&\s,"']+/g, "$1REDACTED");

// Start a transactor on the restored SQL store, on its own port and small heap. Its properties and raw log stay in a
// private directory that stop() removes; a redacted copy of the log goes into the attempt evidence.
export async function startRestoreTransactor({ home, java, extClasspath, primaryProperties, jdbc, uriTemplate, logFile }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "age1-restore-tx-"));
  fs.chmodSync(dir, 0o700);
  const template = fs.readFileSync(path.join(home, "config/samples/sql-transactor-template.properties"), "utf8");
  const props = restoreTransactorProperties({ template, primary: fs.readFileSync(primaryProperties, "utf8"),
    jdbc, uriTemplate, dir });
  assert(!(await listening(props.host, props.port)), "The restore transactor port is already in use");
  const file = path.join(dir, "restore.properties");
  fs.writeFileSync(file, props.text, { mode: 0o600, flag: "wx" });
  const raw = path.join(dir, "transactor.log");
  const fd = fs.openSync(raw, "wx", 0o600);
  const started = Date.now();
  const child = spawn(path.join(home, "bin/transactor"), [...restoreProfile.heap, file], {
    detached: true, stdio: ["ignore", fd, fd],
    env: { ...process.env, PATH: path.dirname(java) + ":" + process.env.PATH, JAVA_OPTS: "-XX:+UseG1GC",
      DATOMIC_EXT_CLASSPATH: extClasspath },
  });
  fs.closeSync(fd);
  const exited = new Promise((resolve) => child.once("exit", (code, signal) => resolve({ code, signal })));
  let done = false;
  const stop = async () => {
    if (done) return;
    done = true;
    try {
      if (child.exitCode === null && child.signalCode === null) {
        try { process.kill(-child.pid, "SIGTERM"); } catch (e) { if (e.code !== "ESRCH") throw e; }
        const ended = await Promise.race([exited, sleep(60000).then(() => null)]);
        if (!ended) {
          try { process.kill(-child.pid, "SIGKILL"); } catch (e) { if (e.code !== "ESRCH") throw e; }
          await exited;
        }
      }
      assert(!(await listening(props.host, props.port)), "The restore transactor still listens after stop");
    } finally {
      if (logFile) fs.writeFileSync(logFile, redact(fs.readFileSync(raw, "utf8")), { flag: "wx" });
      fs.rmSync(dir, { recursive: true, force: true });
    }
  };
  try {
    while (!fs.readFileSync(raw, "utf8").split("\n").some((line) => line.startsWith("System started"))) {
      assert(child.exitCode === null && child.signalCode === null, "The restore transactor exited during startup");
      assert(Date.now() - started < 180000, "The restore transactor did not start within 180 s");
      await sleep(500);
    }
    // The transactor writes its location to storage before it listens, and only then can a peer connect.
    while (!(await listening(props.host, props.port))) {
      assert(child.exitCode === null && child.signalCode === null, "The restore transactor exited during startup");
      assert(Date.now() - started < 180000, "The restore transactor did not listen within 180 s");
      await sleep(500);
    }
  } catch (error) {
    await stop().catch(() => {});
    throw error;
  }
  return { pid: child.pid, port: props.port, primaryPort: props.primaryPort, startMs: Date.now() - started, stop };
}

const events = (file, attempt) => fs.readFileSync(file, "utf8").split("\n").filter((l) => l.startsWith("DX_AGE1 "))
  .map((l) => JSON.parse(l.slice(8))).filter((o) => o.attempt === attempt);

export function single(file, event, attempt) {
  const found = events(file, attempt).filter((o) => o.event === event);
  assert.equal(found.length, 1, path.basename(file) + " lacks exactly one " + event + " event of the failed attempt");
  return found[0];
}

// Seconds the vendor JVM lived, from the last unified-logging uptime decorator of its GC log.
export function jvmMs(gcLog) {
  const last = fs.readFileSync(gcLog, "utf8").trim().split("\n").at(-1);
  const seconds = Number(/^\[[^\]]+\]\[(\d+\.\d+)s\]/.exec(last)?.[1]);
  assert(Number.isFinite(seconds) && seconds > 0, "GC log lacks an uptime decorator");
  return seconds * 1000;
}

// The failed measure-loaded attempt: everything up to and including the native restore passed. Re-check each step's
// evidence with the same assertions the normal path makes, and pin the files to their recorded digests.
export function failedAttempt({ rung, attempt, pins, coldCells, target }) {
  assert.match(attempt, /^[a-f0-9-]{36}$/);
  const dir = path.join(rung, attempt);
  if (pins) {
    assert.equal(pins.attempt, attempt, "The failed attempt differs from the pinned attempt");
    for (const [file, want] of Object.entries(pins.files))
      assert.equal(fileSha(path.join(file.startsWith("../") ? rung : dir, file.replace(/^\.\.\//, ""))), want,
        "Retained evidence differs from its recorded digest: " + file);
  }
  const binding = JSON.parse(fs.readFileSync(path.join(dir, "binding.json"), "utf8"));
  assert.equal(binding.attempt, attempt);
  for (const tag of ["seal", "scorecard-cut"]) assert(!fs.existsSync(path.join(dir, tag + ".log")), "Failed attempt reached " + tag);
  const r = single(path.join(dir, "rung.log"), "rung", attempt);
  assert.equal(r.target, target);
  assert(r.agedRecords >= target && r.records >= r.agedRecords);
  const cold = {};
  for (const label of coldCells) {
    cold[label] = single(path.join(dir, label + ".log"), "cold", attempt);
    assert.deepEqual([cold[label].cell, cold[label].t], [label, r.t]);
  }
  const structure = single(path.join(dir, "structure.log"), "structure", attempt);
  assert(structure.indexBasisT >= r.t);
  const output = (tag) => fs.readFileSync(path.join(dir, tag + ".log"), "utf8");
  assert(output("backup").split("\n").includes(":succeeded"));
  const verify = output("verify");
  const ok = verify.split("\n").find((line) => line.includes(":event :verify-backup/complete"));
  assert(ok && ok.includes(":missing-segments #{}") && ok.includes(":unreadable-segments ()"));
  assert.equal(Number(/:t (\d+)[,}]/.exec(ok)?.[1]), r.t);
  const restore = output("restore");
  assert(restore.split("\n").includes(":succeeded"));
  const restoreDb = "age-restore-" + attempt;
  const restored = restore.split("\n").find((line) => line.includes(":event :restore"));
  assert(restored && restored.includes(":db " + restoreDb + ",") && restored.includes(":basis-t " + r.t + ","),
    "The native restore did not record this database at the rung basis");
  const readback = output("restore-readback");
  assert(readback.includes(":db.error/read-transactor-location-failed"), "The failed readback has a different cause");
  assert.equal(events(path.join(dir, "restore-readback.log"), attempt).length, 0);
  const location = single(path.join(dir, "restore-location.log"), "restore-location", attempt);
  const inspected = single(path.join(dir, "inspect.log"), "inspect", attempt);
  return {
    dir, binding, r, cold, structure, location, inspected, restoreDb,
    objectCount: Number(/:total-segments (\d+)/.exec(ok)?.[1]),
    ms: { backupMs: jvmMs(path.join(dir, "backup-gc.log")), verifyMs: jvmMs(path.join(dir, "verify-gc.log")),
      restoreMs: jvmMs(path.join(dir, "restore-gc.log")) },
    endedAt: fs.statSync(path.join(dir, "restore-readback.log")).mtimeMs,
    hashes: Object.fromEntries(fs.readdirSync(dir).sort().map((f) => [f, fileSha(path.join(dir, f))])),
  };
}

// The resume may change only the checkout and what a restart necessarily renews.
export const renewed = ["source", "transactorPid", "javaPids", "postgresPid", "restorePostgresPid", "measureSettings"];

export function sameRun(resumed, failed) {
  const keep = (c) => {
    const copy = Object.fromEntries(Object.entries(c).filter(([k]) => !renewed.includes(k)));
    if (copy.expectedMeasureSettings) copy.expectedMeasureSettings = { ...copy.expectedMeasureSettings, txPid: undefined };
    return JSON.stringify(copy);
  };
  assert.equal(keep(resumed), keep(failed), "The resume configuration differs from the failed run beyond renewed processes");
}

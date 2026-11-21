import assert from "node:assert/strict";
import { execFileSync, spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { inspectPgdata } from "./pgdata.ts";

export async function pgdataFixture(out: string, source: string, slot: string, attempt: string) {
  const directory = fs.mkdtempSync("/var/tmp/dx-v01-pgdata-");
  const original = path.join(directory, "sealed"), scratch = path.join(directory, "copy");
  const socket = path.join(directory, "socket"), log = path.join(directory, "postgres.log");
  fs.chownSync(directory, 65534, 65534);
  fs.mkdirSync(socket);
  fs.chownSync(socket, 65534, 65534);
  const env = { ...process.env, PATH: "/opt/thin-pg/usr/local/bin:" + process.env.PATH };
  const options = { env, uid: 65534, gid: 65534, cwd: directory, encoding: "utf8" as const, timeout: 15000 };
  const sql = (query: string) => execFileSync("psql", ["-XAtq", "-v", "ON_ERROR_STOP=1", "-h", socket,
    "-U", "postgres", "-d", "postgres", "-c", query], options).trim();
  execFileSync("initdb", ["-D", original, "-U", "postgres", "-A", "trust", "--locale=C", "-E", "UTF8"], options);
  execFileSync("pg_ctl", ["start", "-w", "-D", original, "-l", log, "-o", "-k " + socket + " -c listen_addresses=''"], options);
  try {
    sql("CREATE TABLE witness (value text); INSERT INTO witness VALUES ('sealed')");
  } finally {
    execFileSync("pg_ctl", ["stop", "-w", "-D", original, "-m", "fast"], options);
  }
  execFileSync("cp", ["-a", original, scratch]);
  const [copy] = inspectPgdata(original, [scratch], fs.realpathSync(out));
  const wrapper = path.join(import.meta.dirname, "pgdata-entrypoint.sh");
  const fileId = copy!.device + ":" + copy!.inode;
  const pgEnv = { ...env, PGDATA: scratch, DX_V01_PGDATA_FILE_ID: fileId, DX_V01_PGDATA_CONTROL_SHA: copy!.controlSha256 };
  const cmd = [wrapper, "postgres", "-k", socket, "-c", "listen_addresses="];
  // [DX-V01] Why: run the same entrypoint on actual PG17 bytes inside the owned slot.
  // Rejected: mocking the clean-shutdown check or relying on an initdb-only startup.
  const refused = spawnSync("/bin/sh", cmd, { ...options, env: { ...pgEnv, DX_V01_PGDATA_CONTROL_SHA: "0".repeat(64) } });
  assert.equal(refused.status, 1);
  const fd = fs.openSync(log, "a");
  const server = spawn("/bin/sh", cmd, { ...options, env: pgEnv, stdio: ["ignore", fd, fd] });
  fs.closeSync(fd);
  const stopped = new Promise<number | null>((resolve, reject) => {
    server.once("error", reject);
    server.once("exit", resolve);
  });
  try {
    for (let retry = 0; ; retry++) {
      const ready = spawnSync("pg_isready", ["-h", socket, "-U", "postgres"], options);
      if (ready.status === 0) break;
      assert(server.exitCode === null && retry < 100, fs.readFileSync(log, "utf8"));
      await sleep(50);
    }
    const opened = sql("SELECT value FROM witness");
    assert.equal(opened, "sealed");
    assert.equal(sql("UPDATE witness SET value = 'private' RETURNING value"), "private");
    const sourceControl = execFileSync("sha256sum", [path.join(original, "global", "pg_control")], { encoding: "utf8" }).split(" ")[0];
    assert.equal(sourceControl, copy!.controlSha256);
    fs.writeFileSync(path.join(out, "PGDATA-FIXTURE.json"), JSON.stringify({ source, slot, attempt, fileId,
      controlSha256: sourceControl, originalValue: opened, copyValue: "private", wrongDigestExit: refused.status }) + "\n",
      { flag: "wx", mode: 0o600 });
  } finally {
    server.kill("SIGINT");
    assert.equal(await stopped, 0);
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

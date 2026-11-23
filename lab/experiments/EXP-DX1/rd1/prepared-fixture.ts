import assert from "node:assert/strict";
import { execFileSync, spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { claimPgdata, inspectPgdata, sealedPgdata } from "../v01/pgdata.ts";

// [DX-RD1] Why: run the server's own copy admission and PostgreSQL entrypoint on real PG17 bytes inside the owned slot,
// once per reader ladder, so a wrong control digest, a reused copy and a different cluster are refused before any read.
// Rejected: mocking the clean-shutdown check or trusting a path name as the copy's identity.
export async function preparedFixture(out: string, source: string, slot: string, attempt: string) {
  const directory = fs.mkdtempSync("/var/tmp/dx-rd1-pgdata-");
  const original = path.join(directory, "sealed"), socket = path.join(directory, "socket"), log = path.join(directory, "postgres.log");
  fs.chownSync(directory, 65534, 65534);
  fs.mkdirSync(socket);
  fs.chownSync(socket, 65534, 65534);
  const env = { ...process.env, PATH: "/opt/thin-pg/usr/local/bin:" + process.env.PATH };
  const options = { env, uid: 65534, gid: 65534, cwd: directory, encoding: "utf8" as const, timeout: 15000 };
  const sql = (query: string) => execFileSync("psql", ["-XAtq", "-v", "ON_ERROR_STOP=1", "-h", socket,
    "-U", "postgres", "-d", "postgres", "-c", query], options).trim();
  execFileSync("initdb", ["-D", original, "-U", "postgres", "-A", "trust", "--locale=C", "-E", "UTF8"], options);
  execFileSync("pg_ctl", ["start", "-w", "-D", original, "-l", log, "-o", "-k " + socket + " -c listen_addresses=''"], options);
  let sealedSystem: string;
  try {
    sql("CREATE TABLE witness (value text); INSERT INTO witness VALUES ('sealed')");
    sealedSystem = sql("SELECT system_identifier FROM pg_control_system()");
  } finally {
    execFileSync("pg_ctl", ["stop", "-w", "-D", original, "-m", "fast"], options);
  }
  const sealed = sealedPgdata(original);
  const wrapper = path.join(import.meta.dirname, "..", "v01", "pgdata-entrypoint.sh");
  const ladders: Record<string, unknown>[] = [];
  try {
    for (const ladder of ["control", "tuned"]) {
      const scratch = path.join(directory, "copy");
      execFileSync("cp", ["-a", original, scratch]);
      const [copy] = inspectPgdata(original, [scratch], fs.realpathSync(out));
      assert.equal(copy!.controlSha256, sealed.controlSha256);
      claimPgdata(copy!, source, slot + "-" + ladder, attempt);
      assert.throws(() => inspectPgdata(original, [scratch], fs.realpathSync(out)), /already used/);
      const fileId = copy!.device + ":" + copy!.inode;
      const pgEnv = { ...env, PGDATA: scratch, DX_V01_PGDATA_FILE_ID: fileId, DX_V01_PGDATA_CONTROL_SHA: copy!.controlSha256 };
      const cmd = [wrapper, "postgres", "-k", socket, "-c", "listen_addresses="];
      const wrongDigest = spawnSync("/bin/sh", cmd, { ...options, env: { ...pgEnv, DX_V01_PGDATA_CONTROL_SHA: "0".repeat(64) } });
      assert.equal(wrongDigest.status, 1);
      const wrongFile = spawnSync("/bin/sh", cmd, { ...options, env: { ...pgEnv, DX_V01_PGDATA_FILE_ID: "1:1" } });
      assert.equal(wrongFile.status, 1);
      const sameDevice = path.join(directory, "same-device");
      fs.mkdirSync(sameDevice);
      const sameDeviceRefusal = spawnSync("/bin/sh", cmd, { ...options, env: { ...pgEnv, POSTGRES_INITDB_WALDIR: sameDevice } });
      assert.equal(sameDeviceRefusal.status, 1);
      fs.rmdirSync(sameDevice);
      const wal = fs.mkdtempSync("/dev/shm/dx-rd1-wal-");
      fs.chownSync(wal, 65534, 65534);
      assert.notEqual(fs.statSync(wal).dev, fs.statSync(scratch).dev);
      const fd = fs.openSync(log, "a");
      const server = spawn("/bin/sh", cmd, { ...options, env: { ...pgEnv, POSTGRES_INITDB_WALDIR: wal }, stdio: ["ignore", fd, fd] });
      fs.closeSync(fd);
      const stopped = new Promise<number | null>((resolve, reject) => { server.once("error", reject); server.once("exit", resolve); });
      try {
        for (let retry = 0; ; retry++) {
          if (spawnSync("pg_isready", ["-h", socket, "-U", "postgres"], options).status === 0) break;
          assert(server.exitCode === null && retry < 100, fs.readFileSync(log, "utf8"));
          await sleep(50);
        }
        const [dataDirectory, systemIdentifier] = sql("SELECT current_setting('data_directory'), system_identifier FROM pg_control_system()").split("|");
        assert.equal(fs.realpathSync(dataDirectory!), fs.realpathSync(scratch));
        assert.equal(systemIdentifier, sealedSystem, "Copy must keep the sealed PostgreSQL system identifier");
        assert.equal(sql("SELECT value FROM witness"), "sealed");
        assert.equal(sql("UPDATE witness SET value = 'private' RETURNING value"), "private");
        assert.equal(fs.readlinkSync(path.join(scratch, "pg_wal")), wal);
        assert.equal(sql("SHOW synchronous_commit"), "on");
        ladders.push({ ladder, fileId, controlSha256: copy!.controlSha256, systemIdentifier, originalValue: "sealed",
          copyValue: "private", wrongDigestExit: wrongDigest.status, wrongFileExit: wrongFile.status,
          sameDeviceWalExit: sameDeviceRefusal.status, reuseRefused: true, separateWal: true, synchronousCommit: "on" });
      } finally {
        server.kill("SIGINT");
        assert.equal(await stopped, 0);
        fs.rmSync(wal, { recursive: true, force: true });
      }
      // The held source is never written: its control data still matches after the copy ran.
      assert.deepEqual(sealedPgdata(original), sealed);
      fs.rmSync(scratch, { recursive: true, force: true });
    }
    fs.writeFileSync(path.join(out, "PREPARED-FIXTURE.json"), JSON.stringify({ source, slot, attempt, sealed: sealed.controlSha256,
      sealedSystem, ladders }, null, 2) + "\n", { flag: "wx", mode: 0o600 });
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

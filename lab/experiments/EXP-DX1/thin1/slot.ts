// [DX-THIN1] Why: two ordinary, admitted Datomic slots can serve the SQL topology within their original caps.
// Rejected: starting a side container outside the engine ledger or retagging the shared Datomic image.
import assert from "node:assert/strict";
import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import { randomUUID, createHash } from "node:crypto";
import { cacheCharge } from "./cache-charge.ts";
import path from "node:path";
import process from "node:process";
import { setTimeout as wait } from "node:timers/promises";
const words = (process.env.GATEWAY_JAVA_OPTS ?? "").split(/\s+/);
const property = (key: string) =>
  words.find((s) => s.startsWith("-Ddxthin." + key + "="))?.split("=")[1];
const nonce = property("run"),
  secret = property("secret"),
  role = property("role");
assert(nonce && /^[a-f0-9]{20}$/.test(nonce) && secret && /^[a-f0-9]{40}$/.test(secret));
assert(role === "write" || role === "read");
const address = Object.values(os.networkInterfaces())
  .flat()
  .find((x) => x?.family === "IPv4" && !x.internal)!.address;
const primary = role === "write" ? address : property("primary");
assert(primary && /^\d+\.\d+\.\d+\.\d+$/.test(primary));
const dir = "/data/dxthin-" + nonce,
  pgdata = path.join(dir, "pg"),
  socket = path.join(dir, "socket");
const pg = "/opt/thin-pg/usr/local/bin/",
  datomic = "/opt/datomic",
  db = "datomic";
const pids = new Map<string, ChildProcess>();
let closing = false;
fs.mkdirSync(dir, { recursive: true });
const observerId = process.env.GATEWAY_SOURCE_SHA256;
const mountInfo = fs.readFileSync("/proc/self/mountinfo", "utf8"),
  containerId = mountInfo.match(/\/containers\/([a-f0-9]{64})\//)?.[1] ?? os.hostname();
assert(/^[a-f0-9]{12,64}$/.test(containerId));
const icuDir = "/opt/thin-pg/usr/share/icu";
if (fs.existsSync(icuDir)) {
  const files = fs.readdirSync(icuDir, { recursive: true, encoding: "utf8" });
  const data = files.find((f) => /icudt.*\.dat$/.test(f));
  if (data) process.env.ICU_DATA = path.dirname(path.join(icuDir, data));
}
const start = (
  name: string,
  cmd: string,
  args: string[],
  env: NodeJS.ProcessEnv = {},
  pgUser = false,
) => {
  const child = spawn(cmd, args, {
    cwd: datomic,
    stdio: "inherit",
    env: { ...process.env, ...env },
    ...(pgUser ? { uid: 65534, gid: 65534 } : {}),
  });
  pids.set(name, child);
  child.on("error", (error) => {
    console.error(name, error);
    process.exit(1);
  });
  child.on("exit", (code, signal) => {
    if (!closing) {
      console.error("Unexpected role exit", name, code, signal);
      process.exit(1);
    }
  });
};
const sql = (query: string, database = db) =>
  execFileSync(
    pg + "psql",
    ["-XAtq", "-v", "ON_ERROR_STOP=1", "-h", socket, "-U", "postgres", "-d", database, "-c", query],
    { encoding: "utf8", timeout: 20_000 },
  ).trim();
const rss = (pid: number): number => {
  try {
    const file = "/proc/" + pid,
      children = fs.readFileSync(file + "/task/" + pid + "/children", "utf8").trim();
    const kb = Number(
      fs.readFileSync(file + "/status", "utf8").match(/^VmRSS:\s+(\d+)/m)?.[1] ?? 0,
    );
    return (
      kb * 1024 + (children ? children.split(/\s+/).reduce((sum, c) => sum + rss(Number(c)), 0) : 0)
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return 0;
    throw error;
  }
};
process.once("SIGTERM", () => {
  closing = true;
  for (const child of [...pids.values()].reverse()) child.kill();
});
if (role === "write") {
  assert(!fs.existsSync(pgdata), "Fresh SQL storage required");
  for (const folder of [pgdata, socket]) {
    fs.mkdirSync(folder);
    fs.chownSync(folder, 65534, 65534);
  }
  execFileSync(
    pg + "initdb",
    [
      "-D",
      pgdata,
      "-U",
      "postgres",
      "--locale=C",
      "-E",
      "UTF8",
      "--auth-local=trust",
      "--auth-host=scram-sha-256",
    ],
    { uid: 65534, gid: 65534, stdio: "inherit", cwd: dir },
  );
  fs.appendFileSync(
    path.join(pgdata, "pg_hba.conf"),
    "\nhost datomic datomic samenet scram-sha-256\n",
  );
  start(
    "postgres",
    pg + "postgres",
    ["-D", pgdata, "-h", address, "-k", socket, "-c", "shared_buffers=96MB"],
    {},
    true,
  );
  for (let n = 0; ; n++) {
    try {
      sql("SELECT 1", "postgres");
      break;
    } catch (e) {
      if (n >= 60) throw e;
      await wait(500);
    }
  }
  sql("CREATE ROLE datomic LOGIN PASSWORD '" + secret + "'", "postgres");
  sql("CREATE DATABASE datomic TEMPLATE template0", "postgres");
  execFileSync(
    pg + "psql",
    [
      "-Xq",
      "-v",
      "ON_ERROR_STOP=1",
      "-h",
      socket,
      "-U",
      "postgres",
      "-d",
      db,
      "-f",
      datomic + "/bin/sql/postgres-table.sql",
    ],
    { stdio: "inherit" },
  );
  const properties = fs.readFileSync(
    datomic + "/config/samples/sql-transactor-template.properties",
    "utf8",
  );
  const cfg: Record<string, string> = {
    protocol: "sql",
    host: address,
    "alt-host": address,
    "sql-url": "jdbc:postgresql://" + primary + ":5432/datomic",
    "sql-user": "datomic",
    "sql-password": secret,
    "memory-index-threshold": "32m",
    "memory-index-max": "192m",
    "object-cache-max": "192m",
    "log-dir": dir,
    "pid-file": path.join(dir, "tx.pid"),
  };
  const file = path.join(dir, "sql.properties");
  fs.writeFileSync(
    file,
    properties
      .split("\n")
      .filter((line) => !(line.split("=")[0]!.trim() in cfg))
      .concat(Object.entries(cfg).map(([k, v]) => k + "=" + v))
      .join("\n") + "\n",
    { mode: 0o600 },
  );
  start("transactor", "taskset", [
    "-c",
    process.env.TX_CPUS!,
    datomic + "/bin/transactor",
    ...process.env.TRANSACTOR_JAVA_OPTS!.split(/\s+/),
    file,
  ]);
}
const template =
  "datomic:sql://{db}?jdbc:postgresql://" +
  primary +
  ":5432/datomic?user=datomic&password=" +
  secret;
if (role === "write") {
  const net = await import("node:net");
  for (let n = 0; ; n++) {
    const ready = await new Promise<boolean>((resolve) => {
      const s = net.createConnection(4334, address);
      s.setTimeout(750);
      const done = (ok: boolean) => {
        s.destroy();
        resolve(ok);
      };
      s.once("connect", () => done(true));
      s.once("error", () => done(false));
      s.once("timeout", () => done(false));
    });
    if (ready) break;
    if (n >= 180) throw Error("Transactor startup deadline");
    await wait(500);
  }
}
start(
  role + "Gateway",
  "taskset",
  ["-c", process.env.GW_CPUS!, datomic + "/bin/run", "-m", "triplex.gateway.main"],
  {
    DATOMIC_JAVA_OPTS:
      words.filter((x) => !x.startsWith("-Ddxthin.")).join(" ") +
      " -Dtriplex.codec.spec=/opt/gateway/codec-spec.json",
    DATOMIC_EXT_CLASSPATH: "/opt/gateway/src",
    DATOMIC_URI_TEMPLATE: template,
  },
);
let sampling = false;
const server = http.createServer(async (req, res) => {
  if (
    role === "write" &&
    req.method === "POST" &&
    req.url === "/sample-object-cache" &&
    req.headers.authorization === "Bearer " + secret &&
    fs.existsSync("/opt/thin-jdk/bin/jcmd")
  ) {
    const witness = req.headers["x-thin-observation"];
    if (typeof witness !== "string" || !/^[a-f0-9-]{36}$/.test(witness) || sampling) {
      res.writeHead(409).end();
      return;
    }
    sampling = true;
    const file = path.join(dir, "cache-" + randomUUID() + ".hprof");
    try {
      const tx = pids.get("transactor")!,
        pid = tx.pid!;
      assert(
        tx.exitCode === null &&
          fs
            .readFileSync("/proc/" + pid + "/cmdline", "utf8")
            .split("\0")
            .includes("datomic.launcher") &&
          fs
            .readFileSync("/proc/" + pid + "/cmdline", "utf8")
            .split("\0")
            .includes(path.join(dir, "sql.properties")),
      );
      const disk = fs.statfsSync(dir, { bigint: true });
      assert(disk.bavail * disk.bsize > 5n * 1024n ** 3n);
      execFileSync("/opt/thin-jdk/bin/jcmd", [String(pid), "GC.heap_dump", file], {
        timeout: 90000,
        stdio: ["ignore", "pipe", "pipe"],
      });
      const values = cacheCharge(file, 192 * 1024 ** 2);
      const h = createHash("sha256");
      for await (const block of fs.createReadStream(file)) h.update(block);
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          nonce,
          role,
          containerId,
          source: observerId,
          witness,
          hprofSha256: h.digest("hex"),
          ...values,
        }),
      );
    } catch (e) {
      console.error("Object cache measurement unavailable", String(e));
      res.writeHead(503).end(String(e));
    } finally {
      // [DX-THIN1] Why: a full JVM heap can contain connection credentials; retain only the cache fields and sample digest.
      // Rejected: exporting the heap to the shared evidence archive.
      if (fs.existsSync(file)) fs.unlinkSync(file);
      sampling = false;
    }
    return;
  }
  if (
    req.method !== "GET" ||
    req.url !== "/metrics" ||
    req.headers.authorization !== "Bearer " + secret
  ) {
    res.writeHead(403).end();
    return;
  }
  try {
    const rssBytes = Object.fromEntries([...pids].map(([name, c]) => [name, rss(c.pid!)]));
    const disk =
      role === "write"
        ? JSON.parse(
            sql(
              "SELECT json_build_object('database',pg_database_size(current_database()),'kvsIncludingIndexes',pg_total_relation_size('datomic_kvs'),'walDirectory',(SELECT sum(size) FROM pg_ls_waldir()),'fsync',current_setting('fsync'),'synchronousCommit',current_setting('synchronous_commit'),'fullPageWrites',current_setting('full_page_writes'))",
            ),
          )
        : null;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        nonce,
        role,
        containerId,
        source: observerId,
        rssBytes,
        disk,
        objectCacheLimitBytes: role === "write" ? 192 * 1024 ** 2 : null,
        cgroupBytes: Number(fs.readFileSync("/sys/fs/cgroup/memory.current", "utf8")),
      }),
    );
  } catch (error) {
    console.error("Measurement unavailable", error);
    res.writeHead(503).end();
  }
});
server.listen(8989, address, () =>
  console.log(
    "DXTHIN-SLOT " + JSON.stringify({ nonce, role, address, containerId, source: observerId }),
  ),
);

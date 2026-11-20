// [DX-THIN1] Why: two ordinary, admitted Datomic slots can serve the SQL topology within their original caps.
// Rejected: starting a side container outside the engine ledger or retagging the shared Datomic image.
import assert from "node:assert/strict";
import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import { randomUUID, createHash } from "node:crypto";
import { cacheCharge } from "./cache-charge.ts";
import { heapResidency, readResidentMappings } from "./heap-residency.ts";
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
const compact = property("compact") === "yes";
const demand = property("cache") === "demand";
const memory = property("memory") === "yes";
const nativePools = property("nativePools") === "yes";
const campaign = property("campaign") === "yes";
const adopted = property("adopted");
assert(!compact || role === "write");
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
const processTotal = (pid: number, metric: "rss" | "threads"): number => {
  try {
    const file = "/proc/" + pid,
      children = fs.readFileSync(file + "/task/" + pid + "/children", "utf8").trim();
    const status = fs.readFileSync(file + "/status", "utf8");
    const value =
      metric === "threads"
        ? Number(status.match(/^Threads:\s+(\d+)/m)?.[1] ?? 0)
        : Number(status.match(/^VmRSS:\s+(\d+)/m)?.[1] ?? 0) * 1024;
    return (
      value +
      (children
        ? children.split(/\s+/).reduce((sum, c) => sum + processTotal(Number(c), metric), 0)
        : 0)
    );
  } catch (error) {
    if (["ENOENT", "ESRCH"].includes((error as NodeJS.ErrnoException).code ?? "")) return 0;
    throw error;
  }
};
// [DX-THIN1] Why: Postgres backends can map the same shared pages. Rejected: treating a sum of their RSS as unique memory.
function proportionalBytes(pid: number): number {
  const proc = "/proc/" + pid;
  const map = fs.readFileSync(proc + "/smaps_rollup", "utf8");
  const observed = map.match(/^Pss:\s+(\d+) kB$/m);
  assert(observed);
  const children = fs.readFileSync(proc + "/task/" + pid + "/children", "utf8").trim();
  return Number(observed[1]) * 1024 + (children ? children.split(/\s+/).reduce((sum, child) => sum + proportionalBytes(Number(child)), 0) : 0);
}
const budgets = { "memory-index-threshold": demand ? "8m" : "32m", "memory-index-max": demand ? "32m" : "192m", "object-cache-max": "192m" };
let sharedBufferCensus = false;
function indexIntervals() {
  const files = [dir, path.join(dir, "log"), path.join(dir, "logs")].filter(p => fs.existsSync(p))
    .flatMap(p => fs.readdirSync(p).filter(name => name.endsWith(".log")).map(name => path.join(p, name)))
    .filter(p => fs.statSync(p).isFile()).sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  const samples = [];
  for (const file of files.slice(0, 3)) {
    const fd = fs.openSync(file, "r");
    try {
      const size = fs.fstatSync(fd).size, tail = Buffer.alloc(Math.min(262_144, size));
      fs.readSync(fd, tail, 0, tail.length, size - tail.length);
      for (const line of tail.toString().split("\n")) {
        const fields = line.includes(":event :metrics") && line.match(/:MemoryIndexMB \{([^}]+)\}/)?.[1];
        if (!fields) continue;
        const values = Object.fromEntries([...fields.matchAll(/:(lo|hi|sum|count) ([0-9.]+)/g)].map(m => [m[1], Number(m[2])]));
        if (Object.keys(values).length === 4) samples.push({ time: line.slice(0, 23), ...values });
      }
    } finally { fs.closeSync(fd); }
  }
  return samples.sort((a, b) => a.time.localeCompare(b.time)).slice(-8);
}
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
  if (memory && sql("SELECT count(*) FROM pg_available_extensions WHERE name='pg_buffercache'") === "1") {
    sql("CREATE EXTENSION pg_buffercache");
    sharedBufferCensus = true;
  }
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
    ...budgets,
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
const gateway = (label: "write" | "read", secondary = false) => {
  // [DX-INT1] Why: run two independent gateway JVMs inside one normally reserved cgroup when using the compact Mac stack. The existing gateway startup and handler run for both.
  // Rejected: combining the two RSS measurements, lowering the manager's disk forecast, or starting a process outside the slot.
  let entry = ["-m", "triplex.gateway.main"];
  if (secondary) {
    const launcher = path.join(dir, "read-port.clj");
    // [DX-INT1] Why: Datomic's bin/run splits inline expressions into shell words. Pass one launcher filename and preserve the complete normal gateway startup.
    // Rejected: a replacement HTTP handler that could change read semantics for this census.
    fs.writeFileSync(
      launcher,
      `(require 'triplex.gateway.main 'ring.adapter.jetty)
(let [start ring.adapter.jetty/run-jetty]
  (with-redefs [ring.adapter.jetty/run-jetty (fn [handler options] (start handler (assoc options :port 8081)))]
    (triplex.gateway.main/-main)))
`,
      { flag: "wx", mode: 0o600 },
    );
    entry = [launcher];
  }
  start(
    label + "Gateway",
    "taskset",
    ["-c", process.env.GW_CPUS!, datomic + "/bin/run", ...entry],
    {
      DATOMIC_JAVA_OPTS:
        words.filter((x) => !x.startsWith("-Ddxthin.")).join(" ") +
        " -Dtriplex.codec.spec=/opt/gateway/codec-spec.json",
      DATOMIC_EXT_CLASSPATH: "/opt/gateway/src",
      DATOMIC_URI_TEMPLATE: template,
      ...(demand ? { TX2_ID_CACHE_BYTES: "1048576", TX2_ID_CACHE_ENTRIES: "4096",
        TX2_REACH_SESSION_ENTRIES: "4096", TX2_ENTITY_CACHE_BYTES: "8388608" } : {}),
      ...(adopted && label === "write" ? {
        TX2_WRITE_OPTIONS_ATTEMPT: adopted, TX2_LOAD1_PRIORITY: "1", TX2_LOAD2_TIMING: "1", TRIPLEX_TRACE_RUN: adopted, TX2_PREDECESSOR_LOOKUP: "1", TX2_SMALL_ROWS: "1",
        TX2_SAVE_LEDGER: "1", TX2_PACKED_JOURNAL: "0", TX2_GROUP_FAST_REPLY: "1",
        TX2_GROUP_COMMIT: "1", TX2_GROUP_REUSE_PREPARED: "1", TX2_GROUP_MAX_MEMBERS: "32",
        TX2_GROUP_STAGE_CLOCK: "1", TX2_GROUP_QUEUE_CLOCK: "0", TX2_LIVE_PRIORITY: "1",
        TX2_FIELD_COALESCE: "0", TX2_LEAN_NATIVE_QUERY: "1", TX2_LEAN_NATIVE_LOG: "1",
      } : {}),
      ...(campaign && label === "write" ? {
        TX2_INT1_WRITE_READBACK: "1", TX2_PREDECESSOR_LOOKUP: "0", TX2_SMALL_ROWS: "0", TX2_GROUP_STAGE_CLOCK: "1",
        TX2_GROUP_COMMIT: "0", TX2_LIVE_PRIORITY: "0", TX2_FIELD_COALESCE: "0", TX2_GROUP_REUSE_PREPARED: "0",
      } : {}),
    },
  );
};
gateway(role);
let sampling = false;
function gatewayJvm(which: "write" | "read") {
  const root = pids.get(which + "Gateway");
  assert(root?.pid && root.exitCode === null);
  const matches: number[] = [];
  const visit = (pid: number) => {
    const proc = "/proc/" + pid;
    if (path.basename(fs.readlinkSync(proc + "/exe")) === "java") {
      const args = fs.readFileSync(proc + "/cmdline", "utf8").split("\0");
      assert(args.includes("clojure.main"));
      assert(args.includes(compact && which === "read" ? path.join(dir, "read-port.clj") : "triplex.gateway.main"));
      matches.push(pid);
      return;
    }
    for (const child of fs.readFileSync(proc + "/task/" + pid + "/children", "utf8").trim().split(/\s+/).filter(Boolean))
      visit(Number(child));
  };
  visit(root.pid);
  assert.equal(matches.length, 1);
  return matches[0]!;
}
const server = http.createServer(async (req, res) => {
  if (
    role === "write" &&
    req.method === "POST" &&
    (req.url === "/sample-object-cache" || req.url === "/gateway-profile") &&
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
      const profile = req.url === "/gateway-profile";
      const requested = profile ? req.headers["x-thin-role"] : role;
      assert(requested === "write" || (requested === "read" && compact) ||
        (requested === "transactor" && nativePools));
      const profileTransactor = requested === "transactor";
      const tx = pids.get("transactor")!;
      const pid = profile && !profileTransactor ? gatewayJvm(requested) : tx.pid!;
      if (!profile || profileTransactor) {
        const args = fs.readFileSync("/proc/" + pid + "/cmdline", "utf8").split("\0");
        assert(tx.exitCode === null && args.includes("datomic.launcher") && args.includes(path.join(dir, "sql.properties")));
      }
      const jcmd = (...command: string[]) => execFileSync("/opt/thin-jdk/bin/jcmd", [String(pid), ...command],
        { encoding: "utf8", timeout: 120000, maxBuffer: 8 << 20 });
      const processStat = () => fs.readFileSync("/proc/" + pid + "/stat", "utf8").split(") ")[1]!.split(" ")[19]!;
      const startTicks = processStat();
      const memoryState = () => {
        const rssBytes = processTotal(pid, "rss"), heap = jcmd("GC.heap_info");
        const smaps = fs.readFileSync("/proc/" + pid + "/smaps_rollup", "utf8").split("\n").slice(1).join("\n");
        if (!nativePools) return { rssBytes, heap, smaps };
        const mappings = readResidentMappings(fs.readFileSync("/proc/" + pid + "/smaps", "utf8"));
        return { rssBytes, heap, smaps, mappings, residency: heapResidency(heap, mappings),
          nmt: jcmd("VM.native_memory", "summary", "scale=KB") };
      };
      const before = profile ? memoryState() : undefined;
      const disk = fs.statfsSync(dir, { bigint: true });
      assert(disk.bavail * disk.bsize > 5n * 1024n ** 3n);
      execFileSync("/opt/thin-jdk/bin/jcmd", [String(pid), "GC.heap_dump", file], {
        timeout: 90000,
        stdio: ["ignore", "pipe", "pipe"],
      });
      const limit = profile && !profileTransactor
        ? Number.parseInt(words.find((w) => w.startsWith("-Ddatomic.objectCacheMax="))!.split("=")[1]!, 10)
        : Number.parseInt(budgets["object-cache-max"], 10);
      const values = cacheCharge(file, limit * 1024 ** 2, profile && !profileTransactor);
      const histogram = profile ? jcmd("GC.class_histogram") : undefined;
      // [DX-THIN1] Why: distinguish live heap, JVM commitments and process residency at one phase boundary.
      // Rejected: calling NMT committed bytes resident or forcing a collection before the baseline RSS.
      const after = profile && nativePools ? memoryState() : undefined;
      assert.equal(processStat(), startTicks);
      const h = createHash("sha256");
      for await (const block of fs.createReadStream(file)) h.update(block);
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          nonce,
          role: requested,
          ...(profile ? { pid, startTicks, before, histogram, afterHeap: after?.heap ?? jcmd("GC.heap_info"), after, limitMiB: limit } : {}),
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
    const requested = req.headers["x-thin-role"] ?? role;
    assert(requested === role || (compact && requested === "read"));
    const processes = [...pids].filter(([name]) =>
      requested === "read" ? name === "readGateway" : name !== "readGateway",
    );
    const rssBytes = Object.fromEntries(
      processes.map(([name, c]) => [name, processTotal(c.pid!, "rss")]),
    );
    const disk =
      requested === "write"
        ? JSON.parse(
            sql(
              "SELECT json_build_object('database',pg_database_size(current_database()),'kvsIncludingIndexes',pg_total_relation_size('datomic_kvs'),'walDirectory',(SELECT sum(size) FROM pg_ls_waldir()),'fsync',current_setting('fsync'),'synchronousCommit',current_setting('synchronous_commit'),'fullPageWrites',current_setting('full_page_writes'))",
            ),
          )
        : null;
    const observation = memory ? {
      roles: Object.fromEntries(processes.map(([name, child]) => {
        let pssBytes = null;
        try { pssBytes = proportionalBytes(child.pid!); }
        catch (error) {
          if (!["EACCES", "EPERM", "ESRCH", "ENOENT"].includes((error as NodeJS.ErrnoException).code ?? "")) throw error;
        }
        const ticks = fs.readFileSync(`/proc/${child.pid}/stat`, "utf8").split(") ")[1]!.split(" ")[19];
        return [name, { pid: child.pid, ticks, pssBytes }];
      })),
      ...(requested === "write" ? {
        budgets,
        sharedBuffers: JSON.parse(sql(`SELECT json_build_object('limitBytes',pg_size_bytes(current_setting('shared_buffers')),'usedBytes',${sharedBufferCensus ? "(SELECT count(*) * current_setting('block_size')::bigint FROM pg_buffercache WHERE relfilenode IS NOT NULL)" : "NULL"})`)),
        indexIntervals: indexIntervals(),
        cgroup: Object.fromEntries([...fs.readFileSync("/sys/fs/cgroup/memory.stat", "utf8").matchAll(/^(anon|file|shmem|kernel) (\d+)$/gm)].map(m => [m[1], Number(m[2])])),
      } : {}),
    } : undefined;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        nonce,
        role: requested,
        gatewayPid: pids.get(requested + "Gateway")!.pid,
        containerId,
        source: observerId,
        rssBytes,
        threads: Object.fromEntries(
          processes.map(([name, c]) => [name, processTotal(c.pid!, "threads")]),
        ),
        disk,
        observation,
        objectCacheLimitBytes: requested === "write" ? 192 * 1024 ** 2 : null,
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
    "DXTHIN-SLOT " +
      JSON.stringify({
        nonce,
        role,
        address,
        containerId,
        source: observerId,
        ...(compact ? { readPort: 8081 } : {}),
      }),
  ),
);

if (compact) {
  for (let n = 0; ; n++) {
    let ready = false;
    try {
      const r = await fetch("http://" + address + ":8080/health", {
        signal: AbortSignal.timeout(2000),
      });
      if (r.ok) {
        const info = (await r.json()) as { gatewaySourceHash: string };
        assert.equal(info.gatewaySourceHash, observerId);
        ready = true;
      }
    } catch (e) {
      if (!(e instanceof TypeError) && !(e instanceof DOMException)) throw e;
    }
    if (ready) break;
    if (n >= 120) throw Error("Primary gateway startup deadline");
    await wait(500);
  }
  gateway("read", true);
}

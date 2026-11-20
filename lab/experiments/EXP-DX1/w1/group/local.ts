import assert from "node:assert/strict";
import { spawn, execFileSync, type ChildProcess } from "node:child_process";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import { setTimeout as wait } from "node:timers/promises";
import { queueTrial, fieldTrial } from "../field/traffic.ts";
import { capacityTrial } from "../small/capacity.ts";
import { exact, recovery, runArm } from "./workload.ts";

// [DX-W1] Why: the manager's ephemeral isolated reservation includes PostgreSQL, transactor, gateway and client under one cap.
// Rejected: borrowing a resident, reusing an earlier SQL directory or benchmarking the dev storage engine.
const addr = Object.values(os.networkInterfaces())
  .flat()
  .find((i) => i?.internal && i.family === "IPv4")!.address;
const cwd = fs.mkdtempSync("/tmp/w1-"),
  pg = "/opt/thin-pg/usr/local/bin/",
  home = "/opt/datomic",
  sock = cwd + "/sock",
  data = cwd + "/data";
const pgUser = { uid: 65534, gid: 65534 },
  children = new Set<ChildProcess>(),
  nonce = fs.readFileSync("/config/attempt", "utf8").trim();
function start(program: string, args: string[], env: NodeJS.ProcessEnv = {}, asPg = false) {
  const p = spawn(program, args, {
    cwd: home,
    detached: true,
    env: { ...process.env, ...env },
    stdio: ["ignore", "inherit", "inherit"],
    ...(asPg ? pgUser : {}),
  });
  children.add(p);
  p.once("exit", () => children.delete(p));
  return p;
}
async function stop(p: ChildProcess) {
  if (p.exitCode !== null || p.signalCode !== null) return;
  const exited = new Promise((resolve) => p.once("exit", resolve));
  process.kill(-p.pid!, p.spawnfile.endsWith("/postgres") ? "SIGINT" : "SIGTERM");
  const timer = setTimeout(() => {
    try {
      process.kill(-p.pid!, "SIGKILL");
    } catch {}
  }, 10000);
  try {
    await exited;
  } finally {
    clearTimeout(timer);
  }
}
async function ready(p: ChildProcess, check: () => Promise<boolean>) {
  for (let i = 0; i < 240; i++) {
    assert(p.exitCode === null && p.signalCode === null, "role exited before ready");
    if (await check()) return;
    await wait(500);
  }
  throw Error("Startup deadline exceeded");
}
function tcp(port: number) {
  return new Promise<boolean>((resolve) => {
    const s = net.createConnection(port, addr);
    const finish = (ok: boolean) => {
      s.destroy();
      resolve(ok);
    };
    s.setTimeout(500);
    s.on("error", () => finish(false));
    s.on("timeout", () => finish(false));
    s.once("connect", () => finish(true));
  });
}
const secret = randomBytes(20).toString("hex"),
  uriFor = (database: string) =>
    "datomic:sql://{db}?jdbc:postgresql://" +
    addr +
    ":5432/" +
    database +
    "?user=datomic&password=" +
    secret;
const uri = uriFor("datomic");
const call = (s: string, args: string[], asPg = false) =>
  execFileSync(s, args, { cwd, encoding: "utf8", ...(asPg ? pgUser : {}) });
const sql = (database: string, ...args: string[]) =>
  call(pg + "psql", [
    "-XAtq",
    "-v",
    "ON_ERROR_STOP=1",
    "-h",
    sock,
    "-U",
    "postgres",
    "-d",
    database,
    ...args,
  ]).trim();
const jvm =
  "-Xms96m -Xmx368m -XX:ActiveProcessorCount=1 -XX:+UseSerialGC -XX:MaxDirectMemorySize=64m -XX:+ExitOnOutOfMemoryError";
const fieldStudy = fs.existsSync("/config/field-study")
  ? fs.readFileSync("/config/field-study", "utf8")
  : undefined;
const clockPath = cwd + "/native-clock.xml";
if (fieldStudy === "write-clock")
  fs.writeFileSync(
    clockPath,
    `<configuration>
    <appender name="clock" class="ch.qos.logback.core.ConsoleAppender">
      <encoder><pattern>W1_NATIVE %property{w1.role} %d{yyyy-MM-dd'T'HH:mm:ss.SSS,UTC} %logger %msg%n</pattern></encoder>
    </appender>
    <logger name="datomic.log" level="DEBUG"/>
    <logger name="datomic.peer" level="DEBUG"/>
    <root level="WARN"><appender-ref ref="clock"/></root>
  </configuration>`,
  );
function clockJvm(role: string) {
  return fieldStudy === "write-clock"
    ? " -Dlogback.configurationFile=" +
        clockPath +
        " -Dw1.role=" +
        role +
        " -Xlog:gc:file=" +
        cwd +
        "/" +
        role +
        "-gc.log:time,tags"
    : "";
}
const url = "http://" + addr + ":8080",
  cfg = cwd + "/sql.properties";
async function tx() {
  const p = start(home + "/bin/transactor", [...(jvm + clockJvm("transactor")).split(" "), cfg]);
  await ready(p, () => tcp(4334));
  return p;
}
async function gateway(grouped: boolean, extra: NodeJS.ProcessEnv = {}) {
  const p = start(home + "/bin/run", ["-m", "triplex.gateway.main"], {
    DATOMIC_EXT_CLASSPATH: "/opt/gateway/src",
    DATOMIC_URI_TEMPLATE: uri,
    TX2_GROUP_QUEUE_CLOCK: "1",
    TX2_GROUP_COMMIT: grouped ? "1" : "0",
    ...extra,
    DATOMIC_JAVA_OPTS:
      jvm +
      clockJvm(extra.W1_CLOCK_ROLE ?? "gateway") +
      " -Ddatomic.objectCacheMax=32m -Dtriplex.codec.spec=/opt/gateway/codec-spec.json",
  });
  await ready(p, async () => {
    try {
      return (await fetch(url + "/health")).ok;
    } catch {
      return false;
    }
  });
  return p;
}
const emit = (k: string, v: unknown) => console.log("W1_DATA " + JSON.stringify({ nonce, k, v }));
const measureSql = (database: string): { keys: number; kvBytes: number; relationBytes: number } =>
  JSON.parse(
    sql(
      database,
      "-c",
      `SELECT json_build_object(
    'databaseBytes', pg_database_size(current_database()),
    'cluster', (SELECT system_identifier::text FROM pg_control_system()),
    'relationBytes', pg_total_relation_size('datomic_kvs'),
    'indexBytes', pg_indexes_size('datomic_kvs'),
    'toastBytes', (SELECT pg_total_relation_size(reltoastrelid) FROM pg_class WHERE oid='datomic_kvs'::regclass),
    'insertLsn', pg_wal_lsn_diff(pg_current_wal_insert_lsn(),'0/0')::bigint,
    'walBytes', (SELECT wal_bytes FROM pg_stat_wal),
    'walFpi', (SELECT wal_fpi FROM pg_stat_wal),
    'keys', count(*), 'kvBytes', sum(octet_length(val)),
    'packedKvBytes', sum(pg_column_size(val))) FROM datomic_kvs`,
    ),
  );
try {
  fs.chmodSync(cwd, 0o755);
  for (const d of [sock, data]) {
    fs.mkdirSync(d);
    fs.chownSync(d, 65534, 65534);
  }
  call(
    pg + "initdb",
    [
      "-D",
      data,
      "-U",
      "postgres",
      "--locale=C",
      "-E",
      "UTF8",
      "--auth-local=trust",
      "--auth-host=scram-sha-256",
    ],
    true,
  );
  const postgres = start(
    pg + "postgres",
    ["-D", data, "-h", addr, "-k", sock, "-c", "shared_buffers=24MB"],
    {},
    true,
  );
  await ready(postgres, () => tcp(5432));
  sql("postgres", "-c", "CREATE ROLE datomic LOGIN PASSWORD '" + secret + "'");
  sql("postgres", "-c", "CREATE DATABASE datomic TEMPLATE template0");
  sql("datomic", "-f", home + "/bin/sql/postgres-table.sql");
  const settings = ["fsync", "synchronous_commit", "full_page_writes"].map((k) => [
    k,
    sql("datomic", "-c", "SHOW " + k),
  ]);
  assert(settings.every((r) => r[1] === "on"));
  emit("sql", settings);
  const params: Record<string, string> = {
    protocol: "sql",
    host: addr,
    "alt-host": addr,
    "sql-url": "jdbc:postgresql://" + addr + ":5432/datomic",
    "sql-user": "datomic",
    "sql-password": secret,
    "memory-index-threshold": "32m",
    "memory-index-max": "80m",
    "object-cache-max": "32m",
    "log-dir": cwd,
    "pid-file": cwd + "/tx.pid",
  };
  const config = (database: string) =>
    fs.writeFileSync(
      cfg,
      fs
        .readFileSync(home + "/config/samples/sql-transactor-template.properties", "utf8")
        .split("\n")
        .filter((l) => !(l.split("=")[0]!.trim() in params))
        .concat(
          Object.entries({
            ...params,
            "sql-url": "jdbc:postgresql://" + addr + ":5432/" + database,
          }).map(([k, v]) => k + "=" + v),
        )
        .join("\n") + "\n",
      { mode: 0o600 },
    );
  config("datomic");
  let transactor = await tx();
  if (fieldStudy === "retention") {
    await stop(transactor);
    const offers = Number(fs.readFileSync("/config/offers", "utf8"));
    for (const arm of ["classic", "rows", "ledger", "packed"]) {
      const database = "retention_" + arm;
      sql("postgres", "-c", "CREATE DATABASE " + database + " TEMPLATE template0");
      sql(database, "-f", home + "/bin/sql/postgres-table.sql");
      config(database);
      transactor = await tx();
      const p = start(
        home + "/bin/run",
        ["-m", "triplex.gateway.retention", arm, cwd, String(offers)],
        {
          DATOMIC_EXT_CLASSPATH: "/opt/gateway/src",
          DATOMIC_URI_TEMPLATE: uriFor(database),
          W1_ATTEMPT: nonce,
          DATOMIC_JAVA_OPTS:
            jvm + " -Ddatomic.objectCacheMax=32m -Dtriplex.codec.spec=/opt/gateway/codec-spec.json",
        },
      );
      const exit = new Promise<number | null>((resolve) => p.once("exit", resolve));
      for (const phase of ["seed-gc", "seed", "acked", "written", "indexed", "gc"]) {
        const path = cwd + "/" + arm + "-" + phase;
        const deadline = performance.now() + (phase === "acked" ? 330_000 : 200_000);
        while (!fs.existsSync(path + ".ready")) {
          assert(p.exitCode === null && p.signalCode === null, arm + " exited before " + phase);
          assert(performance.now() < deadline, arm + " timed out at " + phase);
          await wait(40);
        }
        const native = JSON.parse(fs.readFileSync(path + ".ready", "utf8"));
        if (phase === "seed") {
          sql(database, "-c", "VACUUM FULL datomic_kvs", "-c", "CHECKPOINT");
        }
        emit("storage", { arm, phase, native, sql: measureSql(database) });
        if (phase === "gc" || phase === "seed-gc") {
          let stable = 0,
            last = "";
          for (let i = 0; stable < 6 && i < 40; i++) {
            await wait(2_000);
            const point = measureSql(database);
            const key = JSON.stringify([point.keys, point.kvBytes]);
            stable = key === last ? stable + 1 : 0;
            last = key;
            emit("gc-observation", { arm, phase, point, stable });
          }
          assert(stable >= 6, "Storage GC observation never settled");
          emit("storage", { arm, phase: "observed-" + phase, native, sql: measureSql(database) });
        }
        fs.writeFileSync(path + ".release", nonce, { flag: "wx" });
      }
      assert.equal(await exit, 0);
      await stop(transactor);
      sql(database, "-c", "VACUUM FULL datomic_kvs", "-c", "CHECKPOINT");
      emit("storage", { arm, phase: "rewritten", sql: measureSql(database) });
      sql("postgres", "-c", "DROP DATABASE " + database);
    }
  } else if (fieldStudy === "growth") {
    const grant = Number(process.env.TX2_DIAGNOSTIC_SCRATCH_GIB);
    const subjects = grant >= 3 ? 100000 : 32000,
      facts = grant >= 3 ? 3848930 : subjects * 8;
    const initial = fs.statfsSync(cwd),
      free = initial.bavail * initial.bsize;
    const peer = async (mode: string) => {
      const p = start(
        home + "/bin/run",
        ["-m", "triplex.gateway.field-probe", mode, String(subjects), String(facts)],
        {
          W1_ATTEMPT: nonce,
          DATOMIC_EXT_CLASSPATH: "/opt/gateway/src",
          DATOMIC_URI_TEMPLATE: uri,
          TX2_READ_ATTRIBUTION: "1",
          DATOMIC_JAVA_OPTS:
            jvm + " -Ddatomic.objectCacheMax=32m -Dtriplex.codec.spec=/opt/gateway/codec-spec.json",
        },
      );
      const watch = setInterval(() => {
        const st = fs.statfsSync(cwd);
        if (free - st.bavail * st.bsize > grant * 1024 ** 3 && p.pid)
          process.kill(-p.pid, "SIGTERM");
      }, 2000);
      try {
        const rc = await new Promise<number | null>((resolve) => p.once("exit", resolve));
        assert.equal(rc, 0);
      } finally {
        clearInterval(watch);
      }
    };
    emit("grant", { grant, subjects, facts });
    await peer("seed");
    emit("seedStorage", {
      databaseBytes: Number(sql("datomic", "-c", "SELECT pg_database_size(current_database())")),
      fileSystemDelta: free - fs.statfsSync(cwd).bavail * initial.bsize,
    });
    await stop(transactor);
    transactor = await tx();
    await peer("measure");
  } else if (fieldStudy === "small-cost" || fieldStudy === "small-layout") {
    const p = start(
      home + "/bin/run",
      ["-m", "triplex.gateway.native-cost", fieldStudy.split("-")[1]!],
      {
        W1_ATTEMPT: nonce,
        TX2_READ_ATTRIBUTION: "1",
        DATOMIC_EXT_CLASSPATH: "/opt/gateway/src",
        DATOMIC_URI_TEMPLATE: uri,
        DATOMIC_JAVA_OPTS:
          jvm + " -Ddatomic.objectCacheMax=32m -Dtriplex.codec.spec=/opt/gateway/codec-spec.json",
      },
    );
    assert.equal(await new Promise<number | null>((resolve) => p.once("exit", resolve)), 0);
  } else if (fieldStudy === "small-capacity" || fieldStudy === "write-clock") {
    const split = fieldStudy === "write-clock";
    for (const [i, treatment] of [false, true, true, false].entries()) {
      const prepared = split || treatment;
      const role = "gateway-" + i;
      const gw = await gateway(true, {
        TX2_SMALL_ROWS: "1",
        TX2_LIVE_PRIORITY: "1",
        TX2_GROUP_STAGE_CLOCK: "1",
        TX2_GROUP_MAX_MEMBERS: "128",
        TX2_GROUP_REUSE_PREPARED: prepared ? "1" : "0",
        TX2_GROUP_REPLY_CLOCK: split ? "1" : "0",
        TX2_GROUP_FAST_REPLY: split && treatment ? "1" : "0",
        TX2_SAVE_LEDGER: split ? "1" : "0",
        W1_CLOCK_ROLE: role,
      });
      const measure = await capacityTrial(
        url,
        nonce + "-capacity-" + i,
        prepared,
        () =>
          Number(
            sql(
              "datomic",
              "-c",
              "SELECT pg_wal_lsn_diff(pg_current_wal_insert_lsn(),'0/0')::bigint",
            ),
          ),
        split ? { fastReplyAndWire: treatment } : undefined,
      );
      emit("capacity", split ? { ...measure, arm: i, treatment } : measure);
      await stop(gw);
      if (split)
        emit("gc-log", { role, data: fs.readFileSync(cwd + "/" + role + "-gc.log", "utf8") });
    }
    if (split)
      emit("gc-log", {
        role: "transactor",
        data: fs.readFileSync(cwd + "/transactor-gc.log", "utf8"),
      });
  } else if (fieldStudy === "queue") {
    for (const [i, priority] of [false, true, true, false].entries()) {
      const gw = await gateway(true, { TX2_LIVE_PRIORITY: priority ? "1" : "0" });
      emit("queue", await queueTrial(url, nonce + "-" + i, priority));
      await stop(gw);
    }
    for (const [i, only] of [false, true, true, false].entries()) {
      const gw = await gateway(false, { TX2_FIELD_COALESCE: only ? "1" : "0" });
      emit("fields", await fieldTrial(url, nonce + "-f" + i, only));
      await stop(gw);
    }
  } else
    for (const grouped of [false, true]) {
      const gw = await gateway(
        grouped,
        fieldStudy === "ledger-proof" && grouped ? { TX2_SAVE_LEDGER: "1" } : {},
      );
      const proof = await exact(url, nonce + "-" + grouped, grouped);
      emit("proof", proof);
      const arm = await runArm(url, nonce + "-" + grouped, grouped, false);
      emit("arm", arm);
      await stop(gw);
      if (grouped) {
        await stop(transactor);
        transactor = await tx();
        const reopened = await gateway(false);
        emit("recovered", await recovery(url, proof.witness));
        await stop(reopened);
      }
    }
  emit("finished", { nonce });
} finally {
  for (const p of [...children].reverse()) await stop(p);
}

import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

const attempt = fs.readFileSync("/config/attempt", "utf8").trim();
const directory = fs.mkdtempSync(path.join(os.tmpdir(), "write-audit-"));
const sock = path.join(directory, "sock");
const data = path.join(directory, "data");
const home = "/opt/datomic";
const pg = "/opt/thin-pg/usr/local/bin";
const pgUser = { uid: 65534, gid: 65534 };
const host = "localhost";
const web = `http://${host}:8080`;
const secret = randomBytes(24).toString("hex");
const jdbc = `jdbc:postgresql://${host}:5432/datomic`;
const uri = `datomic:sql://{db}?${jdbc}?user=datomic&password=${secret}`;
const gatewaySource = createHash("sha256")
  .update(fs.readFileSync("/config/gateway-source.json"))
  .digest("hex");
const jvm =
  "-Xms64m -Xmx416m -XX:ActiveProcessorCount=1 -XX:+UseSerialGC -XX:MaxDirectMemorySize=64m";
const children = new Set();

function emit(event, value) {
  console.log("WFIX1_SQL " + JSON.stringify({ attempt, event, value }));
}
function start(program, args, env = {}, identity = {}) {
  const child = spawn(program, args, {
    cwd: home,
    env: { ...process.env, ...env },
    stdio: ["ignore", "inherit", "inherit"],
    detached: true,
    ...identity,
  });
  children.add(child);
  child.finished = new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      children.delete(child);
      resolve({ code, signal });
    });
  });
  return child;
}
async function stop(child, signal = "SIGTERM") {
  if (child.exitCode !== null || child.signalCode !== null) return child.finished;
  process.kill(-child.pid, signal);
  const timeout = setTimeout(() => {
    if (child.exitCode === null && child.signalCode === null) process.kill(-child.pid, "SIGKILL");
  }, 10000);
  try {
    return await child.finished;
  } finally {
    clearTimeout(timeout);
  }
}
async function until(child, read, timeout = 90000) {
  const end = Date.now() + timeout;
  while (child.exitCode === null && child.signalCode === null && Date.now() < end) {
    const result = await read();
    if (result) return result;
    await sleep(100);
  }
  throw Error("Managed role exited or a startup witness did not appear");
}
function tcp(port) {
  return new Promise((resolve) => {
    const connection = net.connect({ host, port, timeout: 500 });
    const done = (ready) => {
      connection.destroy();
      resolve(ready);
    };
    connection.once("connect", () => done(true));
    connection.once("error", () => done(false));
    connection.once("timeout", () => done(false));
  });
}
function sql(database, ...args) {
  return execFileSync(
    path.join(pg, "psql"),
    ["-XAtq", "-v", "ON_ERROR_STOP=1", "-h", sock, "-U", "postgres", "-d", database, ...args],
    { encoding: "utf8", ...pgUser },
  ).trim();
}
function durability() {
  const values = Object.fromEntries(
    ["fsync", "synchronous_commit", "full_page_writes"].map((key) => [
      key,
      sql("datomic", "-c", "SHOW " + key),
    ]),
  );
  assert(Object.values(values).every((value) => value === "on"));
  return values;
}
function witness(name) {
  const file = path.join(directory, name + ".json");
  if (fs.existsSync(file)) {
    const value = JSON.parse(fs.readFileSync(file, "utf8"));
    assert.equal(value.attempt, attempt);
    return value;
  }
}
async function request(route, body, onHeaders) {
  const response = await fetch(web + route, {
    method: body === undefined ? "GET" : "POST",
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(12000),
  });
  onHeaders?.();
  return { status: response.status, body: await response.json() };
}
const launch = (phase) =>
  start(path.join(home, "bin/run"), ["/config/sql_gate.clj", phase, directory], {
    DATOMIC_URI_TEMPLATE: uri,
    WFIX1_URI: uri,
    WFIX1_ATTEMPT: attempt,
    TX2_GROUP_COMMIT: "1",
    TX2_LIVE_PRIORITY: "1",
    TX2_FIELD_COALESCE: "1",
    TX2_PREDECESSOR_LOOKUP: "1",
    TX2_WRITE_OPTIONS_ATTEMPT: attempt,
    GATEWAY_SOURCE_SHA256: gatewaySource,
    DATOMIC_JAVA_OPTS:
      jvm + " -Ddatomic.objectCacheMax=32m -Dtriplex.codec.spec=/opt/gateway/codec-spec.json",
  });
const healthy = async () => {
  try {
    return (await request("/health")).body.gatewaySourceHash === gatewaySource;
  } catch {
    return false;
  }
};

try {
  fs.chmodSync(directory, 0o755);
  for (const dir of [sock, data]) {
    fs.mkdirSync(dir);
    fs.chownSync(dir, pgUser.uid, pgUser.gid);
  }
  execFileSync(
    path.join(pg, "initdb"),
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
    pgUser,
  );
  const postgres = start(
    path.join(pg, "postgres"),
    ["-D", data, "-h", host, "-k", sock, "-c", "shared_buffers=24MB"],
    {},
    pgUser,
  );
  await until(postgres, () => tcp(5432));
  sql("postgres", "-c", "CREATE ROLE datomic LOGIN PASSWORD '" + secret + "'");
  sql("postgres", "-c", "CREATE DATABASE datomic TEMPLATE template0");
  sql("datomic", "-f", path.join(home, "bin/sql/postgres-table.sql"));
  const beforeDurability = durability();
  emit("durability", beforeDurability);
  const properties = {
    protocol: "sql",
    host,
    "alt-host": host,
    "sql-url": jdbc,
    "sql-user": "datomic",
    "sql-password": secret,
    "memory-index-threshold": "24m",
    "memory-index-max": "64m",
    "object-cache-max": "32m",
    "log-dir": directory,
    "pid-file": path.join(directory, "tx.pid"),
  };
  const cfg = path.join(directory, "sql.properties");
  const template = fs.readFileSync(
    path.join(home, "config/samples/sql-transactor-template.properties"),
    "utf8",
  );
  fs.writeFileSync(
    cfg,
    template
      .split("\n")
      .filter((line) => !(line.split("=")[0].trim() in properties))
      .concat(Object.entries(properties).map(([key, value]) => key + "=" + value))
      .join("\n") + "\n",
    { mode: 0o600 },
  );
  const startTx = async () => {
    const child = start(path.join(home, "bin/transactor"), [...jvm.split(" "), cfg]);
    await until(child, () => tcp(4334));
    return child;
  };
  const transactor = await startTx();
  const originalGateway = launch("before");
  await until(originalGateway, healthy);
  const offered = witness("offers");
  assert(offered);
  const route = `/v1/db/${offered.database}`;
  const seed = request(route + "/transact", offered.offers[0]);
  await until(originalGateway, () => witness("leader"), 10000);
  const acknowledgements = [];
  const earlyReplies = [];
  const pending = Promise.allSettled(
    offered.offers
      .slice(1)
      .map(async (frame) => {
        const response = await request(route + "/transact", frame, () =>
          acknowledgements.push(frame.operationId),
        );
        earlyReplies.push({ id: frame.operationId, response });
        return response;
      }),
  );
  // [DX-WFIX1] Why: distinguish a slow native commit from a rejection before the stop boundary.
  // Rejected: restarting over a missing witness (that cannot establish which requests committed).
  const native = await until(originalGateway, () => {
    if (earlyReplies.length) {
      emit("premature-edit-reply", earlyReplies);
      throw Error("An edit replied before the native stop witness");
    }
    return witness("native");
  }, 15000);
  assert.equal(native.database, offered.database);
  assert.deepEqual(acknowledgements, []);
  const ended = await stop(originalGateway, "SIGKILL");
  assert.equal(ended.signal, "SIGKILL");
  assert.deepEqual(
    (await pending).map((result) => result.status),
    ["rejected", "rejected"],
  );
  assert.deepEqual(acknowledgements, []);
  const seedReply = await seed;
  assert.equal(seedReply.status, 200);
  assert.equal(seedReply.body.position.v, "1");
  emit("process-stop", {
    offered,
    native,
    acknowledgements,
    signal: ended.signal,
    seed: seedReply,
  });
  await stop(transactor);
  const restarted = await startTx();
  assert.notEqual(transactor.pid, restarted.pid);
  assert.deepEqual(durability(), beforeDurability);

  const fresh = launch("serve");
  await until(fresh, healthy);
  const reopen = await request("/v1/db/create", {
    scope: offered.scope,
    layout: "lean",
    strictRecordClocks: true,
  });
  assert.equal(reopen.status, 200);
  assert.equal(reopen.body.created, false);
  assert.equal(reopen.body.db, offered.database);
  const options = await request(route + "/write-options");
  assert.equal(options.status, 200);
  assert.equal(options.body.attempt, attempt);
  assert.equal(options.body.database, offered.database);
  assert.equal(options.body.gatewaySourceHash, gatewaySource);
  assert.equal(options.body.commitFunctionInstalled, true);
  assert.equal(options.body.options.predecessorLookup, true);
  assert.match(options.body.commitFunction, /^:triplex\.write\/v-[a-f0-9]{24}$/);
  const reads = [];
  for (const [index, input] of offered.offers.slice(1).entries()) {
    const { clientId, sendSequence, ...frame } = input;
    const id = frame.operationId;
    const claim = await request(route + "/claim", { commandId: id, receipt: true });
    assert.deepEqual(claim.body, native.commands[id]);
    assert.equal(claim.status, 200);
    assert.equal(claim.body.receipt.operationId, id);
    assert.equal(claim.body.receipt.position.v, String(index + 2));
    assert.equal(claim.body.receipt.recordedAt.v, index + 1001);
    assert.equal(claim.body.receipt.t.v, native.t);
    const operation = await request(route + "/operation/" + id);
    assert.deepEqual(operation, { status: 200, body: claim.body.receipt });
    const exact = await request(route + "/transact", frame);
    assert.deepEqual([exact.status, exact.body.code], [409, "OperationDuplicate"]);
    const retry = await request(route + "/transact", { ...frame, operationId: id + "-new" });
    assert.deepEqual([retry.status, retry.body.code], [409, "CommandConflict"]);
    const unused = await request(route + "/operation/" + id + "-new");
    assert.deepEqual(unused, { status: 200, body: { status: "absent" } });
    reads.push({ claim, operation, exact, retry, unused });
  }
  const head = await request(route + "/basis");
  assert.equal(head.body.position.v, "3");
  emit("http-reopened", { reopen, head, options, reads, sql: durability() });
  await stop(fresh);
  const remaining = launch("after");
  assert.deepEqual(await remaining.finished, { code: 0, signal: null });
  emit("finished", { gatewaySource });
} finally {
  for (const child of [...children].reverse())
    await stop(child, child.spawnfile.endsWith("/postgres") ? "SIGINT" : "SIGTERM");
}

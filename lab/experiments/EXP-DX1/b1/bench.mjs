// [EXP-DX1] Why: diagnostic public-path latency plus container CPU, against the original fallback.
// Rejected: a native-query floor presented as an application-path measurement.
import fs from "node:fs";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID, createHash } from "node:crypto";
import { Effect, Layer, ManagedRuntime } from "effect";
import { Triples } from "../../../../packages/core/dist/index.js";
import {
  Runtime,
  StorageAdapter,
  QueryExecutor,
  DatabaseScope,
  Capabilities,
} from "../../../../packages/core/dist/runtime/index.js";
import {
  DatomicClient,
  makeDatomicStorageAdapter,
  makeDatomicQueryExecutor,
} from "../../../../packages/datomic/dist/index.js";
import { ownFacts, sharedFacts, reqsOf, ids, SEED_VALID_FROM } from "../../../bench/lib/world.ts";
import { buildTraceCommand } from "../../../bench/lib/commands.ts";
const evidence = "/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B1";
const lock = "/Users/sam/Claude/Projects/triplex-db-2/locks/measure";
const attemptDir = `${evidence}/bench-attempts/${Date.now()}-${randomUUID()}`;
fs.mkdirSync(attemptDir, {recursive:true});
fs.copyFileSync(import.meta.filename, `${attemptDir}/runner.mjs`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const until = Date.now() + 15 * 60_000;
for (; process.env["DX1_MEASUREMENT_LOCK_HELD"] !== "1";) {
  try {
    fs.mkdirSync(lock);
    break;
  } catch (e) {
    if (e.code !== "EEXIST") throw e;
    if (Date.now() > until) throw Error("Measurement lock timeout");
    await sleep(5000);
  }
}
const docker = (args) =>
  execFileSync("docker", ["--host", "unix:///Users/sam/.colima/triplex2/docker.sock", ...args], {
    encoding: "utf8",
  });
const cpu = () =>
  Number(
    /usage_usec (\d+)/.exec(docker(["exec", "tx2-dxb1-dev", "cat", "/sys/fs/cgroup/cpu.stat"]))[1],
  );
let ownsLock = process.env["DX1_MEASUREMENT_LOCK_HELD"] !== "1";
const releaseLock = () => {
  if (ownsLock) {
    fs.rmdirSync(lock);
    ownsLock = false;
  }
};
const abort = () => {
  releaseLock();
  process.exit(130);
};
process.once("SIGINT", abort);
process.once("SIGTERM", abort);
const watchdog = setTimeout(abort, 14 * 60_000);
watchdog.unref();
const client = new DatomicClient("http://127.0.0.1:8490", 35000);
const scope = DatabaseScope.test(`dx1-bench-${randomUUID()}`);
const adapter = makeDatomicStorageAdapter(client, scope, { admissionQueue: true });
const mutable = { ...adapter };
const runtime = ManagedRuntime.make(
  Runtime.define({
    name: "dx1-bench",
    storage: Layer.succeed(StorageAdapter, mutable),
    queries: Layer.succeed(QueryExecutor, makeDatomicQueryExecutor(client, scope)),
  }).layer({ scope, capabilities: Capabilities.none }),
);
const percentile = (xs, p) =>
  [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor(xs.length * p))];
let requests = 0,
  datoms = [];
const original = client.request.bind(client);
client.request = async (...args) => {
  requests++;
  const result = await original(...args);
  if (args[1].endsWith("/transact") && result.datoms !== undefined) datoms.push(result.datoms);
  return result;
};
try {
  const triples = await runtime.runPromise(Triples);
  const accounts = [15, 90].map((n) => {
    let a = 0;
    while (reqsOf(a) !== n) a++;
    return a;
  });
  const facts = accounts.flatMap(sharedFacts);
  for (let i = 0; i < 200; i++)
    for (const f of ownFacts(i, 2))
      facts.push(
        f.a === ":placement/account"
          ? { ...f, v: { type: "ref", value: ids.account(accounts[Math.floor(i / 20) % 2]) } }
          : f,
      );
  const stampIds = new Map();
  for (let offset = 0; offset < facts.length; offset += 200) {
    const result = await runtime.runPromise(
      triples.assertBatch(
        facts
          .slice(offset, offset + 200)
          .map((f) => ({ entityId: f.e, attribute: f.a, value: f.v, validFrom: SEED_VALID_FROM })),
      ),
    );
    for (const t of result) if (t.attribute === ":placement/stamp") stampIds.set(t.entityId, t.id);
  }
  assert.equal(stampIds.size, 200);
  let seed = 0x19870219;
  const random = () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return seed >>> 0;
  };
  const sampleRoots = Array.from({length:3500}, () => ids.placement(random()%200));
  const basis = { validAt: Date.now() };
  const runPull = (root) => runtime.runPromise(triples.reach(root, basis));
  const pulls = [];
  for (const mode of ["fast", "fallback"]) {
    mutable.atomicReach = mode === "fast";
    mutable.getReachTriples = mode === "fast" ? adapter.getReachTriples : undefined;
    for (let i = 0; i < 500; i++) await runPull(sampleRoots[i]);
    const idleStart = cpu(),
      idleWall = performance.now();
    await sleep(1000);
    const idlePerMs = (cpu() - idleStart) / (performance.now() - idleWall);
    const beforeRequests = requests,
      before = cpu(),
      start = performance.now();
    const times = [],
      rows = [],
      entities = [];
    for (let i = 0; i < 3000; i++) {
      const root = sampleRoots[i+500],
        started = performance.now();
      const answer = await runPull(root);
      times.push(performance.now() - started);
      assert.ok(answer.triples.length > 80);
      rows.push(answer.triples.length);
      entities.push(
        new Set([
          root,
          ...answer.triples.map((t) => t.entityId),
          ...answer.triples.filter((t) => t.value.type === "ref").map((t) => t.value.value),
        ]).size,
      );
    }
    const elapsed = performance.now() - start,
      total = cpu() - before,
      adjusted = total - idlePerMs * elapsed;
    fs.writeFileSync(`${attemptDir}/${mode}-raw.json`, JSON.stringify({scope,mode,elapsed,total,adjusted,idlePerMs,times,rows,entities}));
    assert.ok(adjusted > 0, "positive CPU after idle subtraction");
    pulls.push({
      mode,
      n: 3000,
      warmup: 500,
      p50: percentile(times, 0.5),
      p99: percentile(times, 0.99),
      rowsPerPull: rows.reduce((a, b) => a + b, 0) / 3000,
      entitiesPerPull: entities.reduce((a, b) => a + b, 0) / 3000,
      httpPerPull: (requests - beforeRequests) / 3000,
      idleUsecPerMs: idlePerMs,
      cpuUsecPerPull: adjusted / 3000,
      pullsPerCpuSecond: 3000 / (adjusted / 1e6),
      elapsedMs: elapsed,
      rawCpuUsec: total,
      times,
      rows,
      entities,
    });
  }
  const before = requests;
  datoms = [];
  const commitTimes = [],
    requestCounts = [];
  const state = {
    stamp: 0,
    stampId: stampIds.get(ids.placement(0)),
    stampValidFrom: SEED_VALID_FROM,
    address: "unused",
    addressId: "unused",
    addressValidFrom: SEED_VALID_FROM,
  };
  for (let i = 0; i < 500; i++) {
    const cmd = buildTraceCommand({
      runTag: "DX-B1",
      event: {
        seq: i,
        subject: 0,
        kind: "system",
        facts: 9,
        correction: false,
        atMs: i,
        ackLoss: false,
        resend: false,
        burst: false,
        active: true,
        stream: "diagnostic",
      },
      state,
      scheduledAbsMs: Date.now(),
    });
    const count = requests,
      start = performance.now();
    const result = await runtime.runPromise(
      triples.transact(cmd.operations, {
        commandId: cmd.commandId,
        preconditions: cmd.preconditions,
      }),
    );
    commitTimes.push(performance.now() - start);
    requestCounts.push(requests - count);
    const stamp = result.triples.find((t) => t.attribute === ":placement/stamp");
    assert.ok(stamp);
    state.stamp = cmd.newStamp;
    state.stampId = stamp.id;
    state.stampValidFrom = stamp.validFrom;
    if (i % 100 === 99) fs.writeFileSync(`${attemptDir}/commits-progress.json`,JSON.stringify({n:i+1,commitTimes,requestCounts,datoms}));
  }
  assert.ok(
    requestCounts.every((n) => n === 2),
    "all measured commits take two HTTP calls",
  );
  const commits = {
    n: 500,
    p50: percentile(commitTimes, 0.5),
    p99: percentile(commitTimes, 0.99),
    httpPerCommit: (requests - before) / 500,
    datomsPerCommit: datoms.reduce((a, b) => a + b, 0) / 500,
    datoms,
    requestCounts,
    times: commitTimes,
  };
  const container = JSON.parse(docker(["inspect", "tx2-dxb1-dev"]))[0];
  const hash = (path) => createHash("sha256").update(fs.readFileSync(path)).digest("hex");
  const result = {
    diagnostic: true,
    storage: "dev",
    gatewayCpuMethod:
      "container cgroup usage_usec minus measured idle rate; includes transactor background CPU",
    head: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
    containerId: container.Id,
    cpus: container.HostConfig.CpusetCpus,
    scope,
    accounts,
    requirementCounts: accounts.map(reqsOf),
    sourceHashes: Object.fromEntries(
      [
        "lab/bench/lib/world.ts",
        "lab/bench/lib/commands.ts",
        "packages/datomic/gateway/src/triplex/gateway/reach.clj",
        "packages/datomic/gateway/src/triplex/gateway/storage.clj",
        "packages/datomic/src/DatomicStorageAdapter.ts",
        "packages/datomic/dist/DatomicStorageAdapter.js",
        "packages/core/dist/store/TriplesLive.js",
        "lab/experiments/EXP-DX1/b1/bench.mjs",
      ].map((p) => [p, hash(p)]),
    ),
    pulls,
    commits,
    reachDiagnostics: client.reachDiagnostics,
  };
  fs.writeFileSync(`${attemptDir}/result.json`, JSON.stringify(result, null, 2));
  fs.writeFileSync(`${evidence}/bench.json`, JSON.stringify({...result,attemptDir}, null, 2));
  console.log(
    JSON.stringify(
      {
        ...result,
        pulls: pulls.map(({ times, rows, entities, ...r }) => r),
        commits: (({ times, datoms, requestCounts, ...r }) => r)(commits),
      },
      null,
      2,
    ),
  );
} finally {
  await runtime.dispose();
  await client.delete(scope).catch(console.error);
  client.close();
  clearTimeout(watchdog);
  releaseLock();
}

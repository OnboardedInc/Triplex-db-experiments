// [DX-B9-A] Why: retain the B8 driver across alternating arms. Rejected: separate driver builds.
// [DX-B6-2] Why: measure VM-local logical readers over the representative subject graph.
// Rejected: Mac tunnel goodput or a synthetic one-row pull.
import fs from "node:fs";
import { mixed, remember } from "./mixed.mjs";
import { performance } from "node:perf_hooks";
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { Worker, isMainThread, parentPort, workerData } from "node:worker_threads";
import { Layer, ManagedRuntime } from "effect";
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
import {
  ownFacts,
  sharedFacts,
  accountsFor,
  ids,
  SEED_VALID_FROM,
} from "../../../bench/lib/world.ts";
const subjects = 2000,
  accounts = accountsFor(subjects);
const summary = (a) => {
  const s = [...a].sort((x, y) => x - y);
  return { n: s.length, p50: s[Math.floor(s.length * 0.5)], p99: s[Math.floor(s.length * 0.99)] };
};
async function handle(url, scope) {
  const client = new DatomicClient(url, 35000),
    adapter = makeDatomicStorageAdapter(client, scope, { layout: "lean" });
  const runtime = ManagedRuntime.make(
    Runtime.define({
      name: "b6",
      storage: Layer.succeed(StorageAdapter, adapter),
      queries: Layer.succeed(QueryExecutor, makeDatomicQueryExecutor(client, scope)),
    }).layer({ scope, capabilities: Capabilities.none }),
  );
  const triples = await runtime.runPromise(Triples);
  return { client, adapter, runtime, triples };
}
if (!isMainThread) {
  const h = await handle(workerData.url, workerData.scope);
  let seq = workerData.worker * 171,
    random = workerData.worker * 171 + 12345,
    mode = "sequential", moving = false;
  const newest = new BigInt64Array(workerData.newest);
  let basisCounts = new Map();
  const request = h.client.request.bind(h.client);
  h.client.request = async (method, path, input) => {
    if (moving && path.endsWith("/reach")) assert.ok(Number.isSafeInteger(input?.basis?.recordedPosition), "every moving RPC retains its exact cut");
    return request(method, path, input);
  };
  const randomSubject = () => {
    random ^= random << 13;
    random ^= random >>> 17;
    random ^= random << 5;
    return (random >>> 0) % subjects;
  };
  const pull = async () => {
    const root = ids.placement(mode === "random" ? randomSubject() : seq++ % subjects);
    if (moving) {
      // [DX-B8] Why: the SDK adapter accepts exact receipt cuts; public TemporalBasis intentionally omits position.
      // Rejected: passing recordedPosition to Triples.reach (resolveTemporalBasis would discard it).
      const position = Number(Atomics.load(newest, 0));
      basisCounts.set(position, (basisCounts.get(position) || 0) + 1);
      const result = await h.runtime.runPromise(h.adapter.getReachTriples(root, {
        validAt: Date.now(), recordedPosition: position,
      }));
      assert.ok(result, "exact-cut SDK reach must not decline");
      return result;
    }
    return h.runtime.runPromise(h.triples.reach(root, {validAt: Date.now(), recordedAt: workerData.instant}));
  };
  for (let i = 0; i < 2000; i++) await pull();
  parentPort.postMessage({ ready: true });
  parentPort.on("message", async ({ readers, durationMs, mode: nextMode, warmup, movingBasis }) => {
    moving = !!movingBasis;
    basisCounts = new Map();
    mode = nextMode;
    if (warmup) {
      h.client.onRequest = undefined;
      for (let i = 0; i < 2000; i++) await pull();
      parentPort.postMessage({ warm: true });
      return;
    }
    const eluStart = performance.eventLoopUtilization();
    let calls = 0,
      bytes = 0;
    const times = [];
    h.client.onRequest = (s) => {
      calls++;
      bytes += s.responseBytes;
    };
    const end = performance.now() + durationMs,
      start = performance.now();
    await Promise.all(
      Array.from({ length: readers }, async () => {
        while (performance.now() < end) {
          const t = performance.now();
          await pull();
          times.push(performance.now() - t);
        }
      }),
    );
    assert.deepEqual(h.client.reachDiagnostics.declines, {});
    assert.equal(h.client.reachDiagnostics.faults, 0);
    assert.equal(h.client.reachDiagnostics.fullRetries, 0);
    parentPort.postMessage({
      workerUtilisation: performance.eventLoopUtilization(eluStart).utilization,
      times,
      basisCounts: Object.fromEntries(basisCounts),
      calls,
      bytes,
      wallMs: performance.now() - start,
      diagnostics: h.client.reachDiagnostics,
      cache: { entities: h.client.reachCache.bytes, rows: h.client.rowCache.bytes },
    });
  });
} else {
  const scope = DatabaseScope.test(`b6-pulls-${randomUUID()}`),
    w = await handle(process.env.DATOMIC_URL, scope),
    workers = [], newest = new SharedArrayBuffer(8);
  const states = new Map();
  const report = { diagnostic: true, keepAwake: false, arm: process.env.B9_ARM, scope, subjects, phases: {} };
  const originalRequest = w.client.request.bind(w.client);
  let seedRequests = 0;
  // [DX-B7] Why: retain exact serialized seed inputs and parsed ACK coordinates before timing starts.
  // Rejected: trying to reconstruct a deleted frozen basis from a later source hash.
  fs.writeFileSync("/driver/seed-requests.ndjson", "", { flag: "wx" });
  fs.writeFileSync("/driver/seed-acks.ndjson", "", { flag: "wx" });
  w.client.request = async (...args) => {
    const [method, path, input] = args;
    if (method !== "POST" || !path.endsWith("/transact")) return originalRequest(...args);
    const index = seedRequests++;
    fs.appendFileSync(
      "/driver/seed-requests.ndjson",
      JSON.stringify({ index, method, path, body: JSON.stringify(input) }) + "\n",
    );
    try {
      const result = await originalRequest(...args);
      fs.appendFileSync("/driver/seed-acks.ndjson", JSON.stringify({ index, result }) + "\n");
      return result;
    } catch (error) {
      fs.appendFileSync(
        "/driver/seed-acks.ndjson",
        JSON.stringify({ index, error: String(error) }) + "\n",
      );
      throw error;
    }
  };
  const save = () => fs.writeFileSync("/driver/pull-load.json", JSON.stringify(report));
  try {
    const shared = Array.from({ length: accounts }, (_, a) => sharedFacts(a)).flat();
    for (let i = 0; i < shared.length; i += 200)
      await w.runtime.runPromise(
        w.triples.assertBatch(
          shared.slice(i, i + 200).map((f) => ({
            entityId: f.e,
            attribute: f.a,
            value: f.v,
            validFrom: SEED_VALID_FROM,
          })),
        ),
      );
    let instant;
    for (let i = 0; i < subjects; i++) {
      const rows = await w.runtime.runPromise(
        w.triples.assertBatch(
          ownFacts(i, accounts).map((f) => ({
            entityId: f.e,
            attribute: f.a,
            value: f.v,
            validFrom: SEED_VALID_FROM,
          })),
        ),
      );
      instant = rows[0].recordedAt;
      remember(states, rows);
    }
    w.client.request = originalRequest;
    const { db } = await w.client.create(scope, "lean");
    const basis = await w.client.request("GET", `/v1/db/${db}/basis`);
    const finalSeedAck = JSON.parse(
      fs.readFileSync("/driver/seed-acks.ndjson", "utf8").trim().split("\n").at(-1),
    ).result;
    assert.equal(basis.t.v, finalSeedAck.t.v, "frozen native t must equal the final seed ACK");
    assert.equal(
      basis.position.v,
      finalSeedAck.position.v,
      "frozen position must equal the final seed ACK",
    );
    report.basis = {
      recordedAt: instant,
      position: Number(basis.position.v),
      t: basis.t.v,
      validAtPolicy: "Date.now() per pull; seeded intervals are open-ended",
    };
    report.seed = {
      subjects,
      accounts,
      requests: seedRequests,
      files: Object.fromEntries(
        ["seed-requests.ndjson", "seed-acks.ndjson"].map((name) => {
          const data = fs.readFileSync("/driver/" + name);
          return [
            name,
            { bytes: data.length, sha256: createHash("sha256").update(data).digest("hex") },
          ];
        }),
      ),
    };
    // [DX-B8] Why: grow the physical commit count independently of the representative frozen read cut.
    // Rejected: one large span (does not reproduce scope replacement churn).
    const fillClients = Array.from({length:8},()=>new DatomicClient(process.env.DATOMIC_URL,35000));
    const fillStart=performance.now(), fillTarget=Number(process.env.B8_FILL_COMMITS || 50000);
    let allocated=0, completed=0, last=fillStart, lastN=0;
    report.fill=[];const stamp=Date.now();
    try {
      await Promise.all(fillClients.map(async c=>{
        while(allocated<fillTarget){const i=allocated++;
          await c.transact(db,{sourceK:null,scopeWide:false,entities:[],live:[],span:1,position:1,operationId:`b8-fill-${i}`,attemptId:`b8-fill-${i}`,rows:[{id:`b8-fill-${i}`,entity_id:`b8-fill-${i}`,attribute:':b8/fill',value_type:'string',value_string:'x',value_number:null,value_boolean:null,value_datetime:null,value_json:null,valid_from:0,valid_to:null,created_by:null,retracted_at:null,retracted_position:null,retract_tx_id:null,entity_type:null,schema_version:0,recorded_at:stamp,recorded_position:1,tx_id:`b8-fill-${i}`}],newIds:[`b8-fill-${i}`],claims:[]});
          completed++;if(performance.now()-last>=10000){const now=performance.now();const point={completed,seconds:(now-fillStart)/1000,rate:(completed-lastN)*1000/(now-last)};report.fill.push(point);console.log('fill',JSON.stringify(point));last=now;lastN=completed;save();}
        }
      }));
    } finally {for(const c of fillClients)c.close();}
    report.fill.push({completed,seconds:(performance.now()-fillStart)/1000,rate:completed*1000/(performance.now()-fillStart)});
    report.headAfterFill=await w.client.request("GET", `/v1/db/${db}/basis`);
    Atomics.store(new BigInt64Array(newest),0,BigInt(report.headAfterFill.position.v));save();
    const once = (worker) =>
      new Promise((resolve, reject) => {
        worker.once("message", resolve);
        worker.once("error", reject);
      });
    for (let i = 0; i < Number(process.env.B7_WORKERS || 3); i++) {
      const worker = new Worker(new URL(import.meta.url), {
        workerData: { url: process.env.DATOMIC_READ_URLS.split(",")[0], scope, instant, newest, worker: i },
      });
      workers.push(worker);
    }
    await Promise.all(workers.map(once));
    save();
    const cg = process.env.TX2_ENGINE_CGROUPS.split(",")
      .find((v) => v.startsWith(process.env.DATOMIC_READ_URLS.split("//")[1].split(":")[0] + "="))
      ?.split("=")[1];
    assert.ok(cg, "read gateway cgroup");
    const cpu = () => Number(/usage_usec (\d+)/.exec(fs.readFileSync(cg + "/cpu.stat", "utf8"))[1]);
    for (const [mode, readers] of JSON.parse(
      (process.env.B9_GROUP === 'frozen' ? '[["random",4],["random",64],["random",256]]' : '[]'),
    )) {
      // [DX-B7] Why: sequential measurements start after a full cycle, so earlier random arms cannot leave a warm client subset.
      // Rejected: counting the initial mixed-cache transition as steady sequential miss throughput.
      if (mode === "sequential") {
        const warm = workers.map(once);
        workers.forEach((worker) => worker.postMessage({ mode, warmup: true }));
        await Promise.all(warm);
      }
      const gatewayCacheBefore = (
        await (
          await fetch(process.env.DATOMIC_READ_URLS.split(",")[0] + "/v2/admin/scan-stats")
        ).json()
      ).entityCache;
      const driverCpuBefore = process.cpuUsage(),
        before = cpu(),
        start = performance.now(),
        startedAt = new Date().toISOString();
      const done = workers.map(once);
      workers.forEach((worker, i) =>
        worker.postMessage({
          mode,
          readers: Math.floor(readers / workers.length) + (i < readers % workers.length ? 1 : 0),
          durationMs: Number(process.env.B7_DURATION_MS || 30000),
        }),
      );
      const samples = await Promise.all(done);
      const wallMs = performance.now() - start,
        times = samples.flatMap((s) => s.times),
        calls = samples.reduce((n, s) => n + s.calls, 0),
        bytes = samples.reduce((n, s) => n + s.bytes, 0),
        cpuSeconds = (cpu() - before) / 1e6;
      const gatewayCacheAfter = (
        await (
          await fetch(process.env.DATOMIC_READ_URLS.split(",")[0] + "/v2/admin/scan-stats")
        ).json()
      ).entityCache;
      report.phases[`${mode}-${readers}`] = {
        gatewayCacheBefore,
        gatewayCacheAfter,
        driverCpu: process.cpuUsage(driverCpuBefore),
        startedAt,
        finishedAt: new Date().toISOString(),
        readers,
        latency: summary(times),
        wallMs,
        pullsPerSecond: times.length / (wallMs / 1000),
        requestsPerPull: calls / times.length,
        bytesPerPull: bytes / times.length,
        readGatewayCpuSeconds: cpuSeconds,
        readGatewayCores: cpuSeconds / (wallMs / 1000),
        samples,
      };
      save();
      console.log(
        readers,
        JSON.stringify({ ...report.phases[`${mode}-${readers}`], samples: undefined }),
      );
    }
    if (process.env.B9_GROUP === "mixed") {
      const feed = await handle(process.env.DATOMIC_READ_URLS.split(",")[0], scope);
      const { db } = await w.client.create(scope, "lean");
      const basis = await w.client.request("GET", `/v1/db/${db}/basis`);
      await mixed({
        w,
        feed,
        scope,
        states,
        workers,
        once,
        initialPosition: Number(basis.position.v),
        newest,
        readCpu: cpu,
      });
    }
  } finally {
    for (const worker of workers) await worker.terminate();
    await w.runtime.dispose();
    await w.client.delete(scope);
    w.client.close();
  }
}

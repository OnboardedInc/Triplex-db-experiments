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
    mode = "sequential";
  const randomSubject = () => {
    random ^= random << 13;
    random ^= random >>> 17;
    random ^= random << 5;
    return (random >>> 0) % subjects;
  };
  const pull = () =>
    h.runtime.runPromise(
      h.triples.reach(ids.placement(mode === "random" ? randomSubject() : seq++ % subjects), {
        validAt: Date.now(),
        recordedAt: workerData.instant,
      }),
    );
  for (let i = 0; i < 2000; i++) await pull();
  parentPort.postMessage({ ready: true });
  parentPort.on("message", async ({ readers, durationMs, mode: nextMode, warmup }) => {
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
    workers = [];
  const states = new Map();
  const report = { diagnostic: true, scope, subjects, phases: {} };
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
    const once = (worker) =>
      new Promise((resolve, reject) => {
        worker.once("message", resolve);
        worker.once("error", reject);
      });
    for (let i = 0; i < Number(process.env.B7_WORKERS || 3); i++) {
      const worker = new Worker(new URL(import.meta.url), {
        workerData: { url: process.env.DATOMIC_READ_URLS.split(",")[0], scope, instant, worker: i },
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
      process.env.B7_PHASES || '[["random",4],["random",256]]',
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
    if (process.env.B7_MIXED === "1") {
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
      });
    }
  } finally {
    for (const worker of workers) await worker.terminate();
    await w.runtime.dispose();
    await w.client.delete(scope);
    w.client.close();
  }
}

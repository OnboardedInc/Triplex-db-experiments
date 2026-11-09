// [DX-B2-N4] Why: measure the built public application path on split Postgres-backed peers.
// Rejected: engine-only floors, a cold JVM, or shared-container CPU as gateway CPU.
import fs from "node:fs";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID, createHash } from "node:crypto";
import { Worker, isMainThread, parentPort, workerData } from "node:worker_threads";
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
import {
  ownFacts,
  sharedFacts,
  accountsFor,
  ids,
  SEED_VALID_FROM,
} from "../../../bench/lib/world.ts";
import { buildTraceCommand } from "../../../bench/lib/commands.ts";
import { generateTrace, TRACE_DEFAULTS, meanCommandFacts } from "../../../bench/lib/trace.ts";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pct = (xs, p) => {
  const a = [...xs].sort((a, b) => a - b);
  return a[Math.min(a.length - 1, Math.floor(a.length * p))] ?? null;
};
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const summary = (xs) => ({
  n: xs.length,
  p50: pct(xs, 0.5),
  p90: pct(xs, 0.9),
  p99: pct(xs, 0.99),
});
const rng =
  (seed = 0x19870219) =>
  () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return (seed >>> 0) / 4294967296;
  };
async function handle(url, scope) {
  const client = new DatomicClient(url, 35000),
    base = makeDatomicStorageAdapter(client, scope, { admissionQueue: true });
  const pin = { position: undefined };
  // Public TemporalBasis has no position member. Inject the existing internal exact cut at the SPI,
  // while all measured traversals still go through public Triples.reach and its normal decoding path.
  const adapter = {
    ...base,
    getReachTriples: (root, basis) =>
      base.getReachTriples(root, {
        ...basis,
        ...(pin.position === undefined ? {} : { recordedPosition: pin.position }),
      }),
  };
  const runtime = ManagedRuntime.make(
    Runtime.define({
      name: "DX-B2",
      storage: Layer.succeed(StorageAdapter, adapter),
      queries: Layer.succeed(QueryExecutor, makeDatomicQueryExecutor(client, scope)),
    }).layer({ scope, capabilities: Capabilities.none }),
  );
  const triples = await runtime.runPromise(Triples);
  return {
    client,
    adapter: base,
    runtime,
    triples,
    pin,
    pull: (root, basis) => runtime.runPromise(triples.reach(root, basis)),
    close: async () => {
      await runtime.dispose();
      client.close();
    },
  };
}
async function readerWorker() {
  const h = await handle(workerData.url, workerData.scope),
    random = rng(workerData.seed);
  for (let i = 0; i < 5000; i++)
    await h.pull(ids.placement(Math.floor(random() * workerData.subjects)), {
      validAt: workerData.validAt,
    });
  parentPort.postMessage({ ready: true });
  parentPort.once("message", async ({ durationMs }) => {
    try {
      const end = performance.now() + durationMs,
        times = [];
      await Promise.all(
        Array.from({ length: 8 }, async () => {
          while (performance.now() < end) {
            const start = performance.now();
            await h.pull(ids.placement(Math.floor(random() * workerData.subjects)), {
              validAt: workerData.validAt,
            });
            times.push(performance.now() - start);
          }
        }),
      );
      assert.equal(h.client.reachDiagnostics.faults, 0);
      assert.equal(Object.keys(h.client.reachDiagnostics.declines).length, 0);
      parentPort.postMessage({ times, diagnostics: h.client.reachDiagnostics });
      await h.close();
    } catch (error) {
      parentPort.postMessage({ error: String(error.stack) });
    }
  });
}
if (!isMainThread) await readerWorker();
else await main();
async function main() {
  const prefix = process.env.DX2_PREFIX ?? "tx2-dxb2-n4",
    subjects = 2000;
  assert.match(prefix, /^tx2-dxb2-[a-z0-9-]+$/);
  const root = "/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B2";
  const dir = `${root}/bench-${Date.now()}-${randomUUID()}`;
  fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(import.meta.filename, `${dir}/runner.mjs`);
  const lock = "/Users/sam/Claude/Projects/triplex-db-2/locks/measure";
  const docker = (args) =>
    execFileSync("docker", ["--host", "unix:///Users/sam/.colima/triplex2/docker.sock", ...args], {
      encoding: "utf8",
      maxBuffer: 16 * 1024 ** 2,
    });
  const names = ["pg", "tx", "gw-w", "gw-r"].map((r) => `${prefix}-${r}`);
  const cpu = () =>
    Number(
      /usage_usec (\d+)/.exec(
        docker(["exec", `${prefix}-gw-r`, "cat", "/sys/fs/cgroup/cpu.stat"]),
      )[1],
    );
  const stats = (label) =>
    fs.writeFileSync(
      `${dir}/${label}-stats.jsonl`,
      docker(["stats", "--no-stream", "--format", "{{json .}}", ...names]),
    );
  let owns = false,
    timer;
  const release = () => {
    if (owns) {
      fs.rmdirSync(lock);
      owns = false;
    }
    clearTimeout(timer);
  };
  process.once("SIGTERM", () => {
    release();
    process.exit(143);
  });
  process.once("SIGINT", () => {
    release();
    process.exit(130);
  });
  async function measured(label, fn, warm) {
    while (true) {
      try {
        fs.mkdirSync(lock);
        owns = true;
        break;
      } catch (e) {
        if (e.code !== "EEXIST") throw e;
        await sleep(5000);
      }
    }
    timer = setTimeout(
      () => {
        release();
        process.exit(124);
      },
      14 * 60000 + 30000,
    );
    try {
      if (warm) await warm();
      stats(label);
      console.log(`${label}: timed start ${new Date().toISOString()}`);
      return await fn();
    } finally {
      release();
    }
  }
  const scope = DatabaseScope.test(`DX-B2-${randomUUID()}`),
    accounts = accountsFor(subjects);
  let w, r, full;
  const workers = new Set();
  const report = {
    diagnostic: true,
    scope,
    subjects,
    accounts,
    prefix,
    dir,
    positionReadMethod:
      "public Triples.reach with existing internal SPI position injection; public TemporalBasis only exposes recordedAt",
    steps: {},
  };
  const save = () => {
    fs.writeFileSync(`${dir}/result.json`, JSON.stringify(report, null, 2));
    fs.writeFileSync(`${root}/bench-latest.json`, JSON.stringify({ dir }));
  };
  const raw = (label, data) => fs.writeFileSync(`${dir}/${label}-raw.json`, JSON.stringify(data));
  try {
    report.head = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    const paths = [
      "lab/bench/lib/world.ts",
      "lab/bench/lib/commands.ts",
      "lab/bench/lib/trace.ts",
      "lab/experiments/EXP-DX1/b2/bench.mjs",
      ...fs
        .readdirSync("packages/datomic/gateway/src/triplex/gateway")
        .map((n) => "packages/datomic/gateway/src/triplex/gateway/" + n),
      ...fs
        .readdirSync("packages/datomic/dist")
        .filter((n) => n.endsWith(".js"))
        .map((n) => "packages/datomic/dist/" + n),
      "packages/core/dist/store/TriplesLive.js",
      "packages/core/dist/storage/StorageAdapter.js",
    ];
    report.sourceHashes = Object.fromEntries(
      paths.map((p) => [p, createHash("sha256").update(fs.readFileSync(p)).digest("hex")]),
    );
    report.containers = JSON.parse(docker(["inspect", ...names])).map((c) => ({
      id: c.Id,
      name: c.Name,
      image: c.Image,
      cpuset: c.HostConfig.CpusetCpus,
      memory: c.HostConfig.Memory,
      env: c.Config.Env.filter((v) => v.startsWith("JAVA_OPTS=")),
    }));
    report.postgres = docker([
      "exec",
      `${prefix}-pg`,
      "psql",
      "-U",
      "postgres",
      "-d",
      "datomic",
      "-Atc",
      "SHOW fsync; SHOW synchronous_commit; SHOW full_page_writes; SHOW wal_sync_method;",
    ]);
    w = await handle("http://127.0.0.1:8493", scope);
    r = await handle("http://127.0.0.1:8494", scope);
    const db = (await w.client.create(scope)).db;
    let writeSamples = [],
      readSamples = [];
    w.client.onRequest = (s) => writeSamples.push(s);
    r.client.onRequest = (s) => readSamples.push(s);
    const states = new Map(),
      seedCuts = [];
    const remember = (ts) => {
      for (const t of ts) {
        if (t.attribute === ":placement/stamp") {
          const i = Number(t.entityId.slice(3));
          states.set(i, { stamp: 0, stampId: t.id, stampValidFrom: t.validFrom });
        }
        if (t.attribute === ":worker/address") {
          const i = Number(t.entityId.slice(3));
          Object.assign(states.get(i), {
            address: t.value.value,
            addressId: t.id,
            addressValidFrom: t.validFrom,
          });
        }
      }
    };
    await measured("step1-seed", async () => {
      const start = performance.now();
      let facts = 0;
      const shared = Array.from({ length: accounts }, (_, a) => sharedFacts(a)).flat();
      for (let off = 0; off < shared.length; off += 200) {
        const batch = shared.slice(off, off + 200);
        await w.runtime.runPromise(
          w.triples.assertBatch(
            batch.map((f) => ({
              entityId: f.e,
              attribute: f.a,
              value: f.v,
              validFrom: SEED_VALID_FROM,
            })),
          ),
        );
        facts += batch.length;
      }
      for (let i = 0; i < subjects; i++) {
        const batch = ownFacts(i, accounts);
        const result = await w.runtime.runPromise(
          w.triples.assertBatch(
            batch.map((f) => ({
              entityId: f.e,
              attribute: f.a,
              value: f.v,
              validFrom: SEED_VALID_FROM,
            })),
          ),
        );
        remember(result);
        facts += batch.length;
        const last = writeSamples.findLast((s) => s.path.endsWith("/transact"));
        seedCuts.push({ position: last.position, instant: result[0].recordedAt });
        if (i % 500 === 499) console.log(`seed ${i + 1}/${subjects}`);
      }
      assert.equal(states.size, subjects);
      report.steps.seed = {
        facts,
        elapsedMs: performance.now() - start,
        factsPerSecond: facts / ((performance.now() - start) / 1000),
        commits: seedCuts.length,
      };
    });
    raw("seed-cuts", seedCuts);
    save();
    const validAt = Date.now(),
      random = rng();
    const roots = Array.from({ length: 40000 }, () =>
      ids.placement(Math.floor(random() * subjects)),
    );
    for (const mode of ["references", "full"]) {
      const h = mode === "references" ? r : (full = await handle("http://127.0.0.1:8494", scope));
      if (mode === "full") h.client.forceFullReach = true;
      let samples = [];
      h.client.onRequest = (s) => samples.push(s);
      console.log(`step2 ${mode}: 20,000 warm-up pulls`);
      report.steps[mode] = await measured(
        `step2-${mode}`,
        async () => {
          const idleCpu = cpu(),
            idleStart = performance.now();
          await sleep(30000);
          const idleRate = (cpu() - idleCpu) / (performance.now() - idleStart);
          samples = [];
          const beforeCpu = cpu(),
            host = process.cpuUsage(),
            start = performance.now(),
            times = [],
            rows = [],
            entities = [];
          for (let i = 0; i < 20000; i++) {
            const t = performance.now(),
              answer = await h.pull(roots[i], { validAt });
            times.push(performance.now() - t);
            rows.push(answer.triples.length);
            entities.push(
              new Set([
                roots[i],
                ...answer.triples.map((t) => t.entityId),
                ...answer.triples.flatMap((t) => (t.value.type === "ref" ? [t.value.value] : [])),
              ]).size,
            );
          }
          const elapsedMs = performance.now() - start,
            hostCpu = process.cpuUsage(host),
            rawCpu = cpu() - beforeCpu,
            adjusted = rawCpu - idleRate * elapsedMs;
          assert.ok(adjusted > 0);
          assert.equal(h.client.reachDiagnostics.faults, 0);
          assert.equal(Object.keys(h.client.reachDiagnostics.declines).length, 0);
          raw(`step2-${mode}`, { times, rows, entities, samples });
          return {
            ...summary(times),
            warmup: 20000,
            elapsedMs,
            clientCpuUsecPerPull: (hostCpu.user + hostCpu.system) / times.length,
            gatewayCpuUsecPerPull: adjusted / times.length,
            pullsPerGatewayCpuSecond: times.length / (adjusted / 1e6),
            rawCpuUsec: rawCpu,
            idleUsecPerMs: idleRate,
            responseBytesPerPull: mean(samples.map((s) => s.responseBytes)),
            rowsPerPull: mean(rows),
            entitiesPerPull: mean(entities),
            gatewayMicros: summary(samples.map((s) => s.gatewayMicros)),
            diagnostics: { ...h.client.reachDiagnostics },
          };
        },
        async () => {
          for (let i = 0; i < 20000; i++) await h.pull(ids.placement(i % subjects), { validAt });
        },
      );
      save();
    }
    r.client.onRequest = (sample) => readSamples.push(sample);
    const makeReaders = async () => {
      const jobs = Array.from({ length: 4 }, (_, i) => {
        const worker = new Worker(new URL(import.meta.url), {
          workerData: {
            url: "http://127.0.0.1:8494",
            scope,
            subjects,
            validAt: Date.now(),
            seed: 0x19870219 + i,
          },
        });
        workers.add(worker);
        return new Promise((resolve, reject) => {
          worker.once("error", reject);
          worker.once("message", (msg) =>
            msg.ready ? resolve(worker) : reject(Error(JSON.stringify(msg))),
          );
        });
      });
      return Promise.all(jobs);
    };
    const runReaders = async (ws, durationMs) => {
      const done = ws.map(
        (worker) =>
          new Promise((resolve, reject) => {
            worker.once("error", reject);
            worker.once("message", (msg) => (msg.error ? reject(Error(msg.error)) : resolve(msg)));
            worker.postMessage({ durationMs });
          }),
      );
      const result = await Promise.all(done);
      for (const worker of ws) {
        await worker.terminate();
        workers.delete(worker);
      }
      return result;
    };
    console.log("step3: warming four worker clients");
    let ws;
    report.steps.concurrent = await measured(
      "step3-concurrent",
      async () => {
        const before = cpu(),
          host = process.cpuUsage(),
          start = performance.now(),
          result = await runReaders(ws, 60000),
          elapsedMs = performance.now() - start;
        const usec = cpu() - before,
          hostCpu = process.cpuUsage(host),
          times = result.flatMap((r) => r.times);
        raw("step3-concurrent", result);
        return {
          ...summary(times),
          readers: 32,
          threads: 4,
          elapsedMs,
          pullsPerSecond: times.length / (elapsedMs / 1000),
          gatewayCpuSeconds: usec / 1e6,
          pullsPerGatewayCpuSecond: times.length / (usec / 1e6),
          hostCpuSeconds: (hostCpu.user + hostCpu.system) / 1e6,
        };
      },
      async () => {
        ws = await makeReaders();
      },
    );
    save();
    for (const mode of ["recordedAt", "position"]) {
      const cut =
        mode === "recordedAt"
          ? seedCuts[Math.floor(seedCuts.length / 2)]
          : seedCuts[seedCuts.length - 501];
      const basis = { validAt, ...(mode === "recordedAt" ? { recordedAt: cut.instant } : {}) };
      r.pin.position = mode === "position" ? cut.position : undefined;
      report.steps[`past-${mode}`] = await measured(
        `step4-${mode}`,
        async () => {
          readSamples = [];
          const before = cpu(),
            host = process.cpuUsage(),
            times = [];
          for (let i = 0; i < 5000; i++) {
            const start = performance.now();
            await r.pull(roots[i], basis);
            times.push(performance.now() - start);
          }
          const usec = cpu() - before,
            hcpu = process.cpuUsage(host);
          raw(`step4-${mode}`, { times, samples: readSamples });
          return {
            ...summary(times),
            cut,
            gatewayCpuUsecPerPull: usec / times.length,
            clientCpuUsecPerPull: (hcpu.user + hcpu.system) / times.length,
            declines: { ...r.client.reachDiagnostics.declines },
          };
        },
        async () => {
          for (let i = 0; i < 1000; i++) await r.pull(roots[i], basis);
        },
      );
      save();
      r.pin.position = undefined;
    }
    let sequence = 100000;
    const trace = generateTrace({
      seed: "DX-B2-shapes",
      subjects: 200,
      durationS: 1000,
      params: {
        ...TRACE_DEFAULTS,
        steadyFactsPerS: 55 * meanCommandFacts(),
        firstBurstAtS: 1e9,
        systemDuplicateRate: 0,
        ackLossRate: 0,
        activePickShare: 0,
        correctionRate: 0.01,
      },
    });
    const commitOne = async (subject, scheduled = performance.now()) => {
      const event = {
        ...trace[sequence % trace.length],
        subject,
        seq: sequence++,
        stream: "DX-B2",
      };
      const state = states.get(subject),
        cmd = buildTraceCommand({
          runTag: String(scope),
          event,
          state,
          scheduledAbsMs: Date.now(),
        });
      const firstSample = writeSamples.length,
        start = performance.now();
      const receipt = await w.runtime.runPromise(
        w.triples.transact(cmd.operations, {
          commandId: cmd.commandId,
          preconditions: cmd.preconditions,
        }),
      );
      const end = performance.now(),
        stamp = receipt.triples.find((t) => t.attribute === ":placement/stamp");
      assert.ok(stamp);
      Object.assign(state, {
        stamp: cmd.newStamp,
        stampId: stamp.id,
        stampValidFrom: stamp.validFrom,
      });
      if (cmd.newAddress !== null) {
        const address = receipt.triples.find((t) => t.attribute === ":worker/address");
        Object.assign(state, {
          address: cmd.newAddress,
          addressId: address.id,
          addressValidFrom: address.validFrom,
        });
      }
      const samples = writeSamples.slice(firstSample),
        begin = samples.find((s) => s.path.endsWith("/begin")),
        transact = samples.find((s) => s.path.endsWith("/transact"));
      return {
        receipt,
        subject,
        stamp: state.stamp,
        latencyMs: end - scheduled,
        serviceMs: end - start,
        calls: samples.length,
        datoms: samples.length === 2 ? transact?.datoms : undefined,
        breakdown:
          samples.length === 2 && begin && transact
            ? {
                beforeMs: begin.started - start,
                beginWallMs: begin.finished - begin.started,
                beginGatewayMs: begin.gatewayMicros / 1000,
                stagingMs: transact.started - begin.finished,
                transactWallMs: transact.finished - transact.started,
                transactGatewayMs: transact.gatewayMicros / 1000,
                datomicTransactMs: transact.transactMicros / 1000,
                afterMs: end - transact.finished,
              }
            : null,
      };
    };
    console.log("step5: 3,000 warm-up commits");
    report.steps.commits = await measured(
      "step5-serial",
      async () => {
        const observations = [];
        for (let i = 0; i < 3000; i++) observations.push(await commitOne(i % 200));
        assert.ok(observations.every((o) => o.calls === 2));
        raw("step5-serial", observations);
        const breakdown = Object.fromEntries(
          Object.keys(observations[0].breakdown).map((k) => [
            k,
            summary(observations.map((o) => o.breakdown[k])),
          ]),
        );
        return {
          ...summary(observations.map((o) => o.serviceMs)),
          warmup: 3000,
          datoms: summary(observations.map((o) => o.datoms)),
          httpCallsPerCommit: mean(observations.map((o) => o.calls)),
          breakdown,
        };
      },
      async () => {
        for (let i = 0; i < 3000; i++) await commitOne(i % 200);
      },
    );
    save();
    const arrivalRandom = rng(0x9123),
      arrivals = [];
    for (
      let at = (-Math.log(1 - arrivalRandom()) * 1000) / 55;
      at < 60000;
      at += (-Math.log(1 - arrivalRandom()) * 1000) / 55
    )
      arrivals.push({ at, subject: Math.floor(arrivalRandom() * 200) });
    const openLoop = async (label, withReaders) => {
      let readers;
      return measured(
        label,
        async () => {
          const start = performance.now(),
            chains = new Map();
          let pending = 0,
            maxQueue = 0;
          const readerRun = readers ? runReaders(readers, 60000) : null;
          const jobs = arrivals.map(
            ({ at, subject }) =>
              new Promise((resolve, reject) =>
                setTimeout(
                  () => {
                    pending++;
                    maxQueue = Math.max(maxQueue, pending - 1);
                    const work = (chains.get(subject) ?? Promise.resolve()).then(() =>
                      commitOne(subject, start + at),
                    );
                    chains.set(
                      subject,
                      work.catch(() => {}),
                    );
                    work.then(resolve, reject).finally(() => pending--);
                  },
                  Math.max(0, start + at - performance.now()),
                ),
              ),
          );
          const observations = await Promise.all(jobs);
          await sleep(Math.max(0, start + 60000 - performance.now()));
          if (readerRun) raw(`${label}-readers`, await readerRun);
          raw(label, observations);
          return {
            ...summary(observations.map((o) => o.latencyMs)),
            offered: arrivals.length,
            offeredRate: 55,
            windowMs: 60000,
            maxQueueLength: maxQueue,
            elapsedMs: performance.now() - start,
          };
        },
        async () => {
          readers = withReaders ? await makeReaders() : null;
        },
      );
    };
    report.steps.openLoop = await openLoop("step5-open-loop", false);
    save();
    report.steps.openLoopWithReaders = await openLoop("step5-with-readers", true);
    report.steps.openLoopWithReaders.p99Ratio =
      report.steps.openLoopWithReaders.p99 / report.steps.openLoop.p99;
    save();
    report.steps.ryow = await measured("step6-ryow", async () => {
      const times = [];
      let waited = 0;
      const witnesses = [];
      for (let i = 0; i < 2000; i++) {
        const result = await commitOne(i % 200);
        r.pin.position = result.receipt.position;
        const start = performance.now(),
          answer = await r.pull(ids.placement(result.subject), { validAt: Date.now() }),
          elapsed = performance.now() - start;
        const stamp = answer.triples.find(
          (t) => t.entityId === ids.placement(result.subject) && t.attribute === ":placement/stamp",
        );
        assert.equal(stamp?.value.value, String(result.stamp));
        times.push(elapsed);
        const sample = readSamples.at(-1);
        if (sample.waited) waited++;
        witnesses.push({
          position: result.receipt.position,
          expectedStamp: result.stamp,
          observedStamp: stamp.value.value,
          waited: sample.waited,
          elapsedMs: elapsed,
        });
      }
      r.pin.position = undefined;
      raw("step6-ryow", witnesses);
      return { ...summary(times), visible: 2000, waited };
    });
    report.diagnostics = { write: w.client.reachDiagnostics, read: r.client.reachDiagnostics };
    save();
    console.log(JSON.stringify({ dir, steps: report.steps }, null, 2));
  } catch (error) {
    report.error = String(error.stack);
    save();
    throw error;
  } finally {
    release();
    for (const worker of workers) await worker.terminate();
    await full?.close();
    await r?.close();
    if (w) {
      await w.client.delete(scope).catch(() => {});
      await w.close();
    }
  }
}

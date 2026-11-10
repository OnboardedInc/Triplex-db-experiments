// [DX-B3-N4] Why: measure the built public application path on split Postgres-backed peers.
// Rejected: engine-only floors, a cold JVM, or shared-container CPU as gateway CPU.
import fs from "node:fs";
import assert from "node:assert/strict";
import { execFileSync, execFile } from "node:child_process";
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
  max: xs.length ? Math.max(...xs) : null,
  over50: xs.filter((x) => x > 50).length,
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
    base = makeDatomicStorageAdapter(client, scope, { admissionQueue: false });
  const pin = { position: undefined };
  // Public TemporalBasis has no position member. Inject the existing internal exact cut at the SPI,
  // while all measured traversals still go through public Triples.reach and its normal decoding path.
  const adapter = {
    ...base,
    getByEntities: (entities, basis) =>
      base.getByEntities(entities, {
        ...basis,
        ...(pin.position === undefined ? {} : { recordedPosition: pin.position }),
      }),
    getReachTriples: (root, basis) =>
      base.getReachTriples(root, {
        ...basis,
        ...(pin.position === undefined ? {} : { recordedPosition: pin.position }),
      }),
  };
  const runtime = ManagedRuntime.make(
    Runtime.define({
      name: "DX-B3",
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
  const prefix = process.env.DXS3_PREFIX ?? "tx2-dxs3-v0",
    subjects = 2000;
  assert.match(prefix, /^tx2-dxs3-[a-z0-9-]+$/);
  const root = "/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-S3";
  const dir = `${root}/bench-${Date.now()}-${randomUUID()}`;
  fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(import.meta.filename, `${dir}/runner.mjs`);
  const lock = "/Users/sam/Claude/Projects/triplex-db-2/locks/measure";
  const docker = (args) =>
    execFileSync("docker", ["--host", "unix:///Users/sam/.colima/triplex2/docker.sock", ...args], {
      encoding: "utf8",
      maxBuffer: 16 * 1024 ** 2,
      timeout: 30000,
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
    timer,
    leaseStarted = 0;
  const leases = [];
  const release = () => {
    if (owns) {
      fs.rmdirSync(lock);
      leases.at(-1).endWallMs = Date.now();
      leases.at(-1).heldMs = Date.now() - leaseStarted;
      owns = false;
    }
    clearTimeout(timer);
    timer = undefined;
  };
  process.once("SIGTERM", () => {
    release();
    process.exit(143);
  });
  process.once("SIGINT", () => {
    release();
    process.exit(130);
  });
  async function acquireLease() {
    while (!owns) {
      if (!leases.length && Date.now() > Number(process.env.DXS3_ADMIT_BEFORE_MS ?? Infinity))
        throw Error("DX-S3 timebox: not admitted before the first-lease deadline");
      try {
        fs.mkdirSync(lock);
        owns = true;
        leaseStarted = Date.now();
        leases.push({ startWallMs: leaseStarted, pid: process.pid });
        break;
      } catch (e) {
        if (e.code !== "EEXIST") throw e;
        await sleep(5000);
      }
    }
    if (!timer)
      timer = setTimeout(
        () => {
          release();
          process.exit(124);
        },
        14 * 60000 + 30000,
      );
  }
  async function measured(label, fn, warm) {
    // [DX-S3] Why: bound a variant lease while avoiding repeated starvation behind long trials.
    // Rejected: holding past 15 minutes or changing another agent's lock.
    // [DX-S3] Why: reader cache/JIT warm-up can outlast a nearly spent writer lease.
    // Rejected: aborting a valid reader arm because earlier cycles used its lease budget.
    if (owns && (label === "with-readers" || Date.now() - leaseStarted > 12 * 60000)) release();
    await acquireLease();
    try {
      (report.windows ??= []).push({
        label,
        sourceHashes: report.sourceHashes,
        containers: JSON.parse(docker(["inspect", ...names])).map((c) => ({
          id: c.Id,
          name: c.Name,
          cpuset: c.HostConfig.CpusetCpus,
        })),
      });
      if (warm) await warm();
      // [DX-S3] Why: distinguish own tail from competing VM load. Rejected: assuming a quiet VM.
      let disturbed = false;
      for (let retry = 0; retry <= 10; retry++) {
        if (Date.now() - leaseStarted > 12 * 60000) {
          release();
          await acquireLease();
          report.windows.at(-1).renewedBeforeTiming = true;
        }
        const vm = docker(["stats", "--no-stream", "--format", "{{json .}}"]);
        fs.writeFileSync(`${dir}/${label}-vm-${retry}.jsonl`, vm);
        const busy = vm
          .trim()
          .split("\n")
          .filter(Boolean)
          .map(JSON.parse)
          .filter((c) => !names.includes(c.Name) && parseFloat(c.CPUPerc) > 50);
        if (!busy.length) break;
        if (retry === 10) {
          disturbed = true;
          break;
        }
        await sleep(30000);
      }
      report.windows.at(-1).disturbed = disturbed;
      stats(label);
      report.windows.at(-1).startWallMs = Date.now();
      console.log(`${label}: timed start ${new Date().toISOString()}`);
      return await fn();
    } finally {
      if (report.windows?.length) report.windows.at(-1).endWallMs = Date.now();
      if (Date.now() - leaseStarted > 12 * 60000) release();
    }
  }
  const scope = DatabaseScope.test(`DX-B3-${randomUUID()}`),
    accounts = accountsFor(subjects);
  let w, r, full;
  const workers = new Set();
  const report = {
    diagnostic: true,
    leases,
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
  const fatal = (error) => {
    report.fatalError = String(error?.stack ?? error);
    save();
    release();
    save();
    process.exit(1);
  };
  process.once("unhandledRejection", fatal);
  process.once("uncaughtException", fatal);
  save();
  try {
    report.head = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    const paths = [
      "lab/bench/lib/world.ts",
      "lab/bench/lib/commands.ts",
      "lab/bench/lib/trace.ts",
      "lab/experiments/EXP-DX1/s3/bench.mjs",
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
    w = await handle("http://127.0.0.1:8503", scope);
    r = await handle("http://127.0.0.1:8504", scope);
    const db = (await w.client.create(scope)).db;
    if (true) {
      // [DX-B3-M5] Why: verify the measured database's actual schema, not just the schema source text.
      // Rejected: labelling an index change from a file hash without reading the database.
      const observed = await w.client.request("POST", `/v1/db/${db}/q`, {
        edn: "[:find ?e :in $ $rules :where [?e :db/ident :f.v/json] (not-join [?e] [?e :db/index true])]",
        relations: [],
      });
      assert.equal(observed.rows.length, 1);
      report.jsonIndexDisabled = { database: db, witness: observed.rows };
    }
    let writeRequestCount = 0;
    const nativeByPosition = new Map();
    const writeRequest = w.client.request.bind(w.client);
    w.client.request = async (...args) => {
      writeRequestCount++;
      const data = await writeRequest(...args);
      if (args[1].endsWith("/transact") && data.position && data.t)
        nativeByPosition.set(Number(data.position.v), Number(data.t.v));
      return data;
    };
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
    const makeReaders = async () => {
      const jobs = Array.from({ length: 4 }, (_, i) => {
        const worker = new Worker(new URL(import.meta.url), {
          workerData: {
            url: "http://127.0.0.1:8504",
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
    let concurrent = false;
    let sequence = 100000;
    let commandStream = "DX-S3";
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
      const selected = trace[sequence % trace.length];
      const event = {
        ...selected,
        ...(process.env.DXS3_LEAN === "1" ? { facts: 5 + (selected.seq % 6) } : {}),
        subject,
        seq: sequence++,
        stream: commandStream,
      };
      const state = states.get(subject),
        cmd = buildTraceCommand({
          runTag: String(scope),
          event,
          state,
          scheduledAbsMs: Date.now(),
        });
      const firstSample = writeSamples.length,
        start = performance.now(),
        startWallMs = Date.now();
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
        transact = samples.find(
          (s) => s.path.endsWith("/transact") && s.position === receipt.position,
        );
      return {
        receipt,
        nativeT: nativeByPosition.get(receipt.position),
        sequence: event.seq,
        facts: event.facts,
        scheduledMs: scheduled,
        startMs: start,
        endMs: end,
        scheduledWallMs: startWallMs + scheduled - start,
        startWallMs,
        endWallMs: startWallMs + end - start,
        gatewayMicros: transact?.gatewayMicros,
        transactMicros: transact?.transactMicros,
        request: transact,
        subject,
        stamp: state.stamp,
        latencyMs: end - scheduled,
        serviceMs: end - start,
        calls: concurrent
          ? undefined
          : samples.filter((s) => s.path.endsWith("/transact") && s.position === receipt.position)
              .length + samples.filter((s) => s.path.endsWith("/begin")).length,
        datoms: transact?.datoms,
        breakdown:
          !concurrent && transact
            ? {
                beforeMs: begin ? begin.started - start : 0,
                beginWallMs: begin ? begin.finished - begin.started : 0,
                beginGatewayMs: begin ? begin.gatewayMicros / 1000 : 0,
                stagingMs: transact.started - (begin?.finished ?? start),
                transactWallMs: transact.finished - transact.started,
                transactGatewayMs: transact.gatewayMicros / 1000,
                datomicTransactMs: transact.transactMicros / 1000,
                afterMs: end - transact.finished,
              }
            : null,
      };
    };
    const serial = async (label) =>
      measured(
        label,
        async () => {
          const observations = [];
          for (let i = 0; i < 1000; i++) observations.push(await commitOne(i % 200));
          assert.ok(observations.every((o) => o.calls === 1 || o.calls === 2));
          raw(label, observations);
          return {
            ...summary(observations.map((o) => o.serviceMs)),
            warmup: 3000,
            datoms: summary(observations.map((o) => o.datoms)),
            breakdown: Object.fromEntries(
              Object.keys(observations[0].breakdown).map((k) => [
                k,
                summary(observations.map((o) => o.breakdown[k])),
              ]),
            ),
          };
        },
        async () => {
          const warm = [];
          for (let i = 0; i < 3000; i++) warm.push(await commitOne(i % 200));
          raw(`${label}-warm`, warm);
        },
      );
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
            initialDiagnostics = { ...w.client.commitDiagnostics },
            firstRequest = writeRequestCount,
            chains = new Map();
          let pending = 0,
            inFlight = 0,
            maxInFlight = 0,
            maxQueue = 0;
          const waiters = [];
          // [DX-B3-M4] Why: bound application concurrency without serializing independent subjects.
          // Rejected: scope admission queue (the DX-B2 measured bottleneck).
          const acquire = async () => {
            if (inFlight >= 32) await new Promise((r) => waiters.push(r));
            else inFlight++;
            maxInFlight = Math.max(maxInFlight, inFlight);
          };
          const free = () => {
            const next = waiters.shift();
            if (next) next();
            else inFlight--;
          };
          const cpuSamples = [];
          let cpuBusy = false;
          const sampleCpu = () => {
            if (cpuBusy) return;
            cpuBusy = true;
            const requestedAtMs = Date.now();
            execFile(
              "docker",
              [
                "--host",
                "unix:///Users/sam/.colima/triplex2/docker.sock",
                "exec",
                `${prefix}-tx`,
                "sh",
                "-c",
                "date -u +%s.%N; cat /sys/fs/cgroup/cpu.stat; cat /sys/fs/cgroup/memory.current",
              ],
              { timeout: 10000 },
              (error, stdout) => {
                cpuSamples.push({
                  requestedAtMs,
                  observedAtMs: Date.now(),
                  stdout,
                  error: error?.message,
                });
                cpuBusy = false;
              },
            );
          };
          sampleCpu();
          const cpuTimer = setInterval(sampleCpu, 1000);
          const readerRun = readers
            ? runReaders(readers, 60000).then(
                (value) => ({ value }),
                (error) => ({ error: String(error.stack ?? error) }),
              )
            : null;
          // [DX-B3-N4] Why: timers may round down; never offer before the intended Poisson instant.
          // Rejected: measuring a request that was released up to one millisecond early.
          const jobs = arrivals.map(
            ({ at, subject }) =>
              new Promise((resolve, reject) => {
                const offer = () => {
                  const remaining = start + at - performance.now();
                  if (remaining > 0) {
                    setTimeout(offer, Math.max(1, Math.ceil(remaining)));
                    return;
                  }
                  pending++;
                  maxQueue = Math.max(maxQueue, pending - 1);
                  const work = (chains.get(subject) ?? Promise.resolve()).then(() =>
                    (async () => {
                      await acquire();
                      try {
                        return await commitOne(subject, start + at);
                      } finally {
                        free();
                      }
                    })(),
                  );
                  chains.set(
                    subject,
                    work.catch(() => {}),
                  );
                  work.then(resolve, reject).finally(() => pending--);
                };
                setTimeout(offer, Math.max(0, Math.ceil(start + at - performance.now())));
              }),
          );
          let observations;
          try {
            observations = await Promise.all(jobs);
          } finally {
            clearInterval(cpuTimer);
            while (cpuBusy) await sleep(20);
            raw(`${label}-cpu`, cpuSamples);
          }
          await sleep(Math.max(0, start + 60000 - performance.now()));
          raw(label, observations);
          if (readerRun) {
            const readResult = await readerRun;
            if (readResult.error) throw Error(readResult.error);
            raw(`${label}-readers`, readResult.value);
          }
          return {
            ...summary(observations.map((o) => o.latencyMs)),
            offered: arrivals.length,
            offeredRate: 55,
            windowMs: 60000,
            maxQueueLength: maxQueue,
            maxInFlight,
            httpCallsPerCommit: (writeRequestCount - firstRequest) / observations.length,
            conflicts: w.client.commitDiagnostics.conflicts - initialDiagnostics.conflicts,
            replays: w.client.commitDiagnostics.replays - initialDiagnostics.replays,
            elapsedMs: performance.now() - start,
          };
        },
        async () => {
          readers = withReaders ? await makeReaders() : null;
        },
      );
    };
    const requestIndex = async (label) =>
      measured(label, async () => {
        // [DX-S3] Why: keep configuration-only probes from shifting the matched command-shape draws.
        // Rejected: spending the main stream's sequence IDs during between-burst index probes.
        const priorSequence = sequence;
        commandStream = `DX-S3-${label}`;
        sequence = 1000000000 + priorSequence;
        const begun = Date.now();
        // [DX-S3] Why: admin waits can exceed the writer deadline and idle pooled sockets can reset.
        // Rejected: an unobserved rejection while the overlapping commits are still running.
        const admin = new DatomicClient("http://127.0.0.1:8503", 70000);
        const request = admin.request("POST", `/v2/db/${db}/request-index`, { waitMs: 60000 }).then(
          (response) => ({ response }),
          (error) => ({ error: String(error.stack ?? error) }),
        );
        const commits = [];
        try {
          for (let i = 0; i < 100; i++) commits.push(await commitOne(i % 200));
          const outcome = await request;
          if (outcome.error) {
            raw(`${label}-admin-error`, { begun, error: outcome.error });
            throw Error(outcome.error);
          }
          const response = outcome.response;
          return { begun, response, commits: summary(commits.map((c) => c.latencyMs)) };
        } finally {
          raw(label, commits);
          admin.close();
          sequence = priorSequence;
          commandStream = "DX-S3";
        }
      });
    for (let burst = 1; burst <= 3; burst++) {
      concurrent = false;
      report.steps[`serial-${burst}`] = await serial(`serial-${burst}`);
      save();
      if (process.env.DXS3_INDEX === "1") {
        report.steps[`index-${burst}`] = await requestIndex(`index-${burst}`);
        save();
      }
      concurrent = true;
      const label = `burst-${burst}`;
      report.steps[label] = await openLoop(label, false);
      save();
      if (burst < 3) {
        console.log(`pause 120s between bursts (${prefix})`);
        await sleep(120000);
      }
    }
    if (process.env.DXS3_INDEX === "1") {
      report.steps["index-readers"] = await requestIndex("index-readers");
      save();
    }
    report.steps.withReaders = await openLoop("with-readers", true);
    save();
    report.diagnostics = { write: w.client.reachDiagnostics, read: r.client.reachDiagnostics };
    save();
    console.log(JSON.stringify({ dir, steps: report.steps }, null, 2));
  } catch (error) {
    report.error = String(error.stack);
    save();
    throw error;
  } finally {
    release();
    save();
    for (const worker of workers) await worker.terminate();
    await full?.close();
    await r?.close();
    if (w) {
      await w.client.delete(scope).catch(() => {});
      await w.close();
    }
  }
}

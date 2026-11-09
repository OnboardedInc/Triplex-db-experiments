// [EXP-P2B-R3] Why: vary only reader placement and count on a balanced, open-loop source workload.
// Rejected: increasing the old ten-second sample without separating reader CPU from broker CPU.
import fs from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { Worker, isMainThread, parentPort, workerData } from "node:worker_threads";
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { Effect, Layer, ManagedRuntime } from "effect";
const pub = async (pkg, sub = ".") => {
  const target = JSON.parse(fs.readFileSync(`packages/${pkg}/package.json`)).exports[sub];
  return import(
    pathToFileURL(
      path.resolve("packages", pkg, typeof target === "string" ? target : target.import),
    )
  );
};
const { Triples, EntityId, string } = await pub("core");
const { Runtime, StorageAdapter, QueryExecutor, DatabaseScope, Capabilities } = await pub(
  "core",
  "./runtime",
);
const {
  HostBroker,
  makeBrokerStorageAdapter,
  LogFeed,
  FeedConsumerStore,
  BrokerReadService,
  readConsumerEffects,
} = await pub("broker");
const { MemoryBrokerReplica } = await pub("broker", "./memory");
const now = () => process.hrtime.bigint().toString();
const ms = (a, b) => Number(BigInt(b) - BigInt(a)) / 1e6;
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));
const cpu = () => process.threadCpuUsage();
const cpuUs = (value) => value.user + value.system;
const hash = (value) => createHash("sha256").update(value).digest("hex");
const stats = (values) => {
  const sorted = values.toSorted((a, b) => a - b),
    n = sorted.length;
  return {
    n,
    p50: sorted[Math.max(0, Math.ceil(n * 0.5) - 1)] ?? null,
    p99: sorted[Math.max(0, Math.ceil(n * 0.99) - 1)] ?? null,
    max: sorted.at(-1) ?? null,
    mean: n ? sorted.reduce((a, b) => a + b, 0) / n : null,
  };
};
const monitor = (replica) => {
  const costs = {
    apply: { calls: 0, cpuUs: 0, wallMs: 0 },
    scan: { calls: 0, cpuUs: 0, wallMs: 0 },
    check: { calls: 0, cpuUs: 0, wallMs: 0 },
  };
  for (const [method, stage] of [
    ["publish", "apply"],
    ["read", "scan"],
  ]) {
    const original = replica[method].bind(replica);
    replica[method] = (...args) => {
      const start = now(),
        c = cpu();
      const promise = original(...args);
      // [EXP-P2B-R3] Why: memory methods finish synchronous work before returning the promise.
      // Rejected: charging async wait or other commands as attributable apply/scan CPU.
      costs[stage].calls++;
      costs[stage].cpuUs += cpuUs(process.threadCpuUsage(c));
      costs[stage].wallMs += ms(start, now());
      return promise;
    };
  }
  return costs;
};
const readerService = (replica, broker, scope, count, raw) => {
  const costs = monitor(replica),
    catalog = [],
    subjectValues = new Map(),
    routes = { replica: 0, overlay: 0, log: 0 };
  const adapter = makeBrokerStorageAdapter(replica, scope, broker, {
    onRead: (event) => routes[event.route]++,
  });
  let stopped = false,
    reads = 0,
    checks = 0;
  const failures = [],
    latencies = [],
    loops = [];
  const initialCpu = cpu(),
    start = now();
  const accept = (entry) => {
    const values = [...(subjectValues.get(entry.subject) ?? []), ...entry.values].sort((a, b) =>
      a[0].localeCompare(b[0]),
    );
    subjectValues.set(entry.subject, values);
    catalog.push({ ...entry, expected: JSON.stringify(values) });
  };
  const read = async (entry) => {
    const started = now();
    const rows = await Effect.runPromise(
      adapter.getByEntity(entry.subject, { validAt: 1, recordedPosition: entry.receipt.position }),
    );
    latencies.push(ms(started, now()));
    const checking = now(),
      c = cpu();
    const actual = JSON.stringify(
      rows.map((r) => [r.attribute, r.value_string]).sort((a, b) => a[0].localeCompare(b[0])),
    );
    const equal = actual === entry.expected;
    checks++;
    reads++;
    if (!equal)
      failures.push({
        kind: "pinned-content",
        position: entry.receipt.position,
        subject: entry.subject,
      });
    if (reads <= 5 || !equal)
      raw({
        type: "read",
        requested: { subject: entry.subject, position: entry.receipt.position },
        rows,
        expected: JSON.parse(entry.expected),
        equal,
      });
    costs.check.calls++;
    costs.check.cpuUs += cpuUs(process.threadCpuUsage(c));
    costs.check.wallMs += ms(checking, now());
  };
  for (let id = 0; id < count; id++)
    loops.push(
      (async () => {
        let cycle = 0;
        while (!stopped) {
          if (catalog.length) {
            const entry =
              catalog[
                Math.max(0, catalog.length - 1 - (cycle++ % 5 === 0 ? id % catalog.length : 0))
              ];
            try {
              await read(entry);
            } catch (error) {
              failures.push({ kind: "reader", message: String(error) });
            }
          }
          await pause(1);
        }
      })(),
    );
  return {
    replica,
    adapter,
    accept,
    read,
    stop: async () => {
      stopped = true;
      await Promise.all(loops);
      return {
        reads,
        checks,
        failures,
        routes,
        latencyMs: stats(latencies),
        latencyBins: Object.fromEntries(
          latencies.reduce((bins, value) => {
            const k = Math.ceil(value * 10);
            bins.set(k, (bins.get(k) ?? 0) + 1);
            return bins;
          }, new Map()),
        ),
        costs: structuredClone(costs),
        threadCpu: process.threadCpuUsage(initialCpu),
        wallMs: ms(start, now()),
      };
    },
  };
};
const peer = (port, handlers) => {
  let serial = 0;
  const pending = new Map();
  port.on("message", async (message) => {
    if ("reply" in message) {
      const p = pending.get(message.reply);
      if (!p) return;
      pending.delete(message.reply);
      if (message.error) p.reject(Object.assign(new Error(message.error.message), message.error));
      else p.resolve(message.value);
      return;
    }
    try {
      const value = await handlers[message.method](...message.args);
      port.postMessage({ reply: message.id, value });
    } catch (error) {
      port.postMessage({
        reply: message.id,
        error: { message: String(error), reason: error?.reason },
      });
    }
  });
  return (method, ...args) =>
    new Promise((resolve, reject) => {
      const id = ++serial;
      pending.set(id, { resolve, reject });
      port.postMessage({ id, method, args });
    });
};
if (!isMainThread) {
  let head = 0,
    instant = 0,
    service,
    localSource;
  const replica = new MemoryBrokerReplica();
  const readerReplica = workerData.sourceOnly
    ? {
        publish: async () => ({}),
        read: async () => {
          throw Object.assign(new Error("Use indexed source"), { code: "ECONNREFUSED" });
        },
        initialize: async () => {},
        isUnreachable: (error) => error?.code === "ECONNREFUSED",
      }
    : replica;
  const request = peer(parentPort, {
    marker: () => replica.marker(),
    fence: (...args) => replica.fence(...args),
    publish: (...args) => replica.publish(...args),
    read: (input) => replica.read(input),
    accept: (entry) => {
      head = Math.max(head, entry.receipt.position);
      instant = Math.max(instant, entry.receipt.instant);
      service.accept(entry);
    },
    start: (input) => {
      localSource = new BrokerReadService(input.file, input.watermark);
      Object.assign(broker, {
        head: localSource.head,
        recordInstant: localSource.recordInstant,
        awaitResolved: localSource.awaitResolved,
        overlayAsync: localSource.overlayAsync,
        fromLogAsync: localSource.fromLogAsync,
        pullAt: localSource.pullAt,
      });
      return true;
    },
    stop: async () => ({ ...(await service.stop()), sourceCosts: localSource?.costs }),
  });
  const broker = {
    head: () => head,
    recordInstant: () => instant,
    awaitResolved: async (b, ...rest) => {
      if (b > head) await request("awaitResolved", b, ...rest);
    },
    overlayAsync: async (position, selection, select) => {
      const rows = await request("overlay", position, selection);
      return rows?.filter(select);
    },
    fromLogAsync: async (position, selection, select) =>
      (await request("source", position, selection)).filter(select),
    pullAt: (...args) => request("pullAt", ...args),
  };
  const rawFd = fs.openSync(workerData.raw, "wx");
  service = readerService(readerReplica, broker, workerData.scope, workerData.readers, (value) =>
    fs.writeSync(rawFd, JSON.stringify(value) + "\n"),
  );
} else {
  const args = process.argv.slice(2),
    opt = (key, fallback) => {
      const i = args.indexOf(`--${key}`);
      return i < 0 ? fallback : args[i + 1];
    };
  // [EXP-P2B-R3] Why: reader CPU must not block broker timers or SQLite completion callbacks.
  // Rejected: colocated default (matched 256-reader run added over 200 ms at the median).
  const readers = Number(opt("readers", "256")),
    placement = opt("placement", "worker"),
    perBand = Number(opt("per-band", "1000")),
    rate = Number(opt("rate", "40")),
    phase = opt("phase", "before"),
    workerCount = Number(opt("workers", "8"));
  if (
    ![1, 2, 4, 8].includes(workerCount) ||
    !["local", "worker"].includes(placement) ||
    !Number.isSafeInteger(readers) ||
    readers < 0 ||
    !Number.isSafeInteger(perBand) ||
    perBand < 1000 ||
    rate <= 0 ||
    !Number.isFinite(rate)
  )
    throw Error("Invalid case parameters");
  const disk = fs.statfsSync(".", { bigint: true });
  if (disk.bavail * disk.bsize < 5n * 1024n ** 3n) throw Error("Below 5 GiB disk floor");
  const attempt = `r3-${phase}-${placement}-${readers}-${randomUUID()}`,
    scope = `p2b:${attempt}`;
  const out = path.join("/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-P2B/round3", attempt);
  fs.mkdirSync(out, { recursive: true });
  const sourceFiles = [
    ...execFileSync("rg", ["--files", "packages/broker/src", "lab/experiments/EXP-P2B/round3"], {
      encoding: "utf8",
    })
      .trim()
      .split("\n"),
    "pnpm-lock.yaml",
    "packages/broker/package.json",
  ];
  const buildFiles = execFileSync(
    "rg",
    ["--files", "--no-ignore", "packages/broker/dist", "packages/core/dist"],
    { encoding: "utf8" },
  )
    .trim()
    .split("\n")
    .filter((p) => p.endsWith(".js"));
  const source = Object.fromEntries(
    [...sourceFiles, ...buildFiles].map((file) => [file, hash(fs.readFileSync(file))]),
  );
  for (const file of Object.keys(source)) {
    const dest = path.join(out, "preimages", file);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(file, dest);
  }
  const fd = fs.openSync(path.join(out, "raw.jsonl"), "wx"),
    raw = (value) => fs.writeSync(fd, JSON.stringify(value) + "\n");
  const hostWorker = new Worker(new URL("./host-worker.mjs", import.meta.url), {
    workerData: { file: path.join(out, "host.jsonl") },
  });
  let mainReadRpcs = 0;
  const mainReadRpcCounts = { awaitResolved: 0, overlay: 0, source: 0, pullAt: 0 };
  const readerWorkers = [],
    readerPeers = [];
  let broker, remote, worker;
  const samples = [],
    frameEvents = [],
    stages = new Map(),
    publications = new Map(),
    applyEvents = [];
  const failures = [],
    feedTimes = [],
    feedPositions = [],
    entries = [],
    subjectValues = new Map();
  if (placement === "worker") {
    worker = new Worker(new URL(import.meta.url), {
      workerData: { raw: path.join(out, "reader-raw.jsonl"), scope, readers: 0 },
    });
    remote = peer(worker, {
      awaitResolved: (...args) => {
        mainReadRpcs++;
        mainReadRpcCounts.awaitResolved++;
        return broker.awaitResolved(...args);
      },
      overlay: (p, selection) => {
        mainReadRpcs++;
        mainReadRpcCounts.overlay++;
        return broker.overlayAsync(p, selection, () => true);
      },
      source: (p, selection) => {
        mainReadRpcs++;
        mainReadRpcCounts.source++;
        return broker.fromLogAsync(p, selection, () => true);
      },
      pullAt: (...args) => {
        mainReadRpcs++;
        mainReadRpcCounts.pullAt++;
        return broker.pullAt(...args);
      },
    });
  }
  for (let i = 0; i < workerCount; i++) {
    const w = new Worker(new URL(import.meta.url), {
      workerData: {
        raw: path.join(out, `reader-${i}.jsonl`),
        scope,
        readers: Math.floor(readers / workerCount) + (i < readers % workerCount ? 1 : 0),
        sourceOnly: true,
      },
    });
    readerWorkers.push(w);
    readerPeers.push(peer(w, {}));
  }
  const replica = remote
    ? {
        maxFramesPerApply: 1,
        marker: () => remote("marker"),
        fence: (...args) => remote("fence", ...args),
        publish: (...args) => remote("publish", ...args),
        initialize: async () => {},
        isUnreachable: () => false,
        read: (input) => remote("read", { ...input, signal: undefined }),
      }
    : new MemoryBrokerReplica();
  broker = await HostBroker.open({
    dir: path.join(out, "broker"),
    scopeKey: scope,
    replica,
    decisionStamp: true,
    traceStages: true,
    requireFullFsync: true,
    minFreeBytes: 5 * 1024 ** 3,
    onEvent: (event) => {
      if (event.type === "frame") {
        frameEvents.push(event);
        publications.set(event.lsn, event.sourceDurableAtNs);
        for (const command of event.stageTiming.commands)
          for (const position of command.positions)
            stages.set(position, { ...event.stageTiming, command, lsn: event.lsn });
      }
      if (event.type === "published") applyEvents.push(event);
    },
  });
  if (remote)
    await remote("start", { file: broker.segmentPath, watermark: broker.readerWatermark.buffer });
  for (const call of readerPeers)
    await call("start", { file: broker.segmentPath, watermark: broker.readerWatermark.buffer });
  if (!remote) throw Error("Pool diagnostic requires worker placement");
  const driver = replica;
  const adapter = makeBrokerStorageAdapter(driver, scope, broker);
  const nope = () => Effect.die(Error("No Datalog in this offline diagnostic"));
  const managed = ManagedRuntime.make(
    Runtime.define({
      name: "p2b-r2",
      storage: Layer.succeed(StorageAdapter, adapter),
      queries: Layer.succeed(QueryExecutor, {
        execute: nope,
        executePage: nope,
        explain: nope,
        explainPage: nope,
      }),
    }).layer({ scope: DatabaseScope.test(scope), capabilities: Capabilities.none }),
  );
  const triples = await managed.runPromise(Triples);
  const feed = new LogFeed(path.join(out, "broker")),
    consumerDir = path.join(out, "consumer"),
    consumer = { close() {} };
  const feedWorker = new Worker(new URL("./feed-worker.mjs", import.meta.url), {
    workerData: { dir: path.join(out, "broker"), consumerDir, asyncFeed: true },
  });
  await new Promise((resolve, reject) => {
    feedWorker.once("message", resolve);
    feedWorker.once("error", reject);
  });
  const feedRemote = peer(feedWorker, {});
  let cursor = feed.start();
  const feedCpu = { calls: 0, cpuUs: 0, wallMs: 0 };
  const timer = undefined,
    start = now(),
    processCpu = process.cpuUsage(),
    brokerCpu = cpu();
  const trace = Array.from({ length: perBand * 3 }, (_, seq) => ({
    seq,
    band: seq % 3,
    facts: [10, 20, 40][seq % 3],
    atMs: (seq * 1000) / rate,
    subject: `subject:${seq % 128}`,
  }));
  fs.writeFileSync(path.join(out, "trace.json"), JSON.stringify(trace));
  let stopMaintenance = false;
  const maintenance = { calls: 0, errors: [], latencyMs: [] };
  const maintenanceTask =
    opt("maintenance", "off") === "off"
      ? Promise.resolve()
      : (async () => {
          while (!stopMaintenance) {
            const t = now();
            try {
              const lease = await broker.pinBasis(broker.head(), "round3-sweep");
              try {
                await broker.purgeCurrent(lease.basis);
              } finally {
                await lease.release();
              }
              maintenance.calls++;
              maintenance.latencyMs.push(ms(t, now()));
            } catch (error) {
              maintenance.errors.push(String(error));
            }
            await pause(113);
          }
        })();
  try {
    await Promise.all(
      trace.map(async (event) => {
        const scheduledNs = (BigInt(start) + BigInt(Math.round(event.atMs * 1e6))).toString();
        while (BigInt(now()) < BigInt(scheduledNs)) await pause(ms(now(), scheduledNs));
        const offeredNs = now(),
          offeredCpu = cpu();
        try {
          const receipt = await managed.runPromise(
            triples.transact(
              Array.from({ length: event.facts }, (_, i) => ({
                op: "assert",
                entityId: EntityId.make(event.subject),
                attribute: `:r2/${event.seq}/${i}`,
                value: string(`${event.seq}:${i}`),
                validFrom: 0,
              })),
              { commandId: `command:${event.seq}` },
            ),
          );
          const ackNs = now(),
            ackCpu = cpu();
          const values = Array.from({ length: event.facts }, (_, i) => [
            `:r2/${event.seq}/${i}`,
            `${event.seq}:${i}`,
          ]);
          const entry = { subject: event.subject, values, receipt };
          entries.push(entry);
          subjectValues.set(event.seq, entry);
          const sample = { event, scheduledNs, offeredNs, ackNs, offeredCpu, ackCpu, receipt };
          samples.push(sample);
          raw({ type: "commit", ...sample });
          await readerPeers[Number(event.subject.split(":")[1]) % workerCount]("accept", entry);
        } catch (error) {
          failures.push({ kind: "writer", seq: event.seq, message: String(error) });
        }
      }),
    );
  } finally {
    clearInterval(timer);
  }
  stopMaintenance = true;
  await maintenanceTask;
  const feedResult = await feedRemote("stop");
  for (const page of feedResult.events) {
    raw(page);
    cursor = page.cursor;
    for (const r of page.resolutions)
      if (r.kind === "commit") {
        feedTimes.push({ lsn: r.lsn, durableNs: page.durableNs });
        for (const tx of r.transacts) feedPositions.push(...tx.positions);
      }
  }
  for (const error of feedResult.errors) failures.push({ kind: "feed-worker", message: error });
  Object.assign(feedCpu, feedResult.costs);
  await feedWorker.terminate();
  const masterResult = await remote("stop");
  const parts = await Promise.all(readerPeers.map((call) => call("stop")));
  const bins = new Map();
  for (const r of parts)
    for (const [k, n] of Object.entries(r.latencyBins))
      bins.set(Number(k), (bins.get(Number(k)) ?? 0) + n);
  const quantile = (p) => {
    const target = Math.ceil(parts.reduce((n, r) => n + r.reads, 0) * p);
    let cumulative = 0;
    for (const [bin, n] of [...bins].sort((a, b) => a[0] - b[0])) {
      cumulative += n;
      if (cumulative >= target) return bin / 10;
    }
    return null;
  };
  const readerResult = {
    reads: parts.reduce((sum, r) => sum + r.reads, 0),
    checks: parts.reduce((sum, r) => sum + r.checks, 0),
    failures: parts.flatMap((r) => r.failures),
    routes: { replica: 0, overlay: 0, log: 0 },
    costs: structuredClone(masterResult.costs),
    threadCpu: { user: masterResult.threadCpu.user, system: masterResult.threadCpu.system },
    latencyMs: {
      n: parts.reduce((sum, r) => sum + r.latencyMs.n, 0),
      p50: quantile(0.5),
      p99: quantile(0.99),
      aggregation: "pooled 0.1 ms histogram upper bound",
    },
    workers: parts,
    wallMs: Math.max(...parts.map((r) => r.wallMs)),
  };
  for (const r of parts) {
    for (const k of ["replica", "overlay", "log"]) readerResult.routes[k] += r.routes[k];
    for (const k of ["apply", "scan", "check"])
      for (const field of ["calls", "cpuUs", "wallMs"])
        readerResult.costs[k][field] += r.costs[k][field];
    for (const k of ["user", "system"]) readerResult.threadCpu[k] += r.threadCpu[k];
  }
  await broker.awaitReplica(broker.head(), 180000, "repository");
  const end = now(),
    cpuResult = {
      process: process.cpuUsage(processCpu),
      brokerThread: process.threadCpuUsage(brokerCpu),
      feed: feedCpu,
    };
  // [EXP-P2B-R3] Why: every original pin must mask later writes after the load settles.
  // Rejected: checking only latest reads (would miss historical-cut contamination).
  const auditSource = new BrokerReadService(broker.segmentPath, broker.readerWatermark.buffer);
  const auditAdapter = makeBrokerStorageAdapter(
    {
      initialize: async () => {},
      read: async () => {
        throw Object.assign(new Error("Audit source route"), { code: "ECONNREFUSED" });
      },
      isUnreachable: () => true,
    },
    scope,
    auditSource,
  );
  for (const sample of samples) {
    const rows = await managed.runPromise(
      (sample.event.seq % 100 === 0 ? adapter : auditAdapter).getByEntity(sample.event.subject, {
        validAt: 1,
        recordedPosition: sample.receipt.position,
      }),
    );
    const expected = samples
      .filter(
        (other) =>
          other.event.subject === sample.event.subject &&
          other.receipt.position <= sample.receipt.position,
      )
      .flatMap((other) =>
        Array.from({ length: other.event.facts }, (_, i) => [
          `:r2/${other.event.seq}/${i}`,
          `${other.event.seq}:${i}`,
        ]),
      )
      .sort((a, b) => a[0].localeCompare(b[0]));
    const actual = rows
      .map((r) => [r.attribute, r.value_string])
      .sort((a, b) => a[0].localeCompare(b[0]));
    if (JSON.stringify(actual) !== JSON.stringify(expected))
      failures.push({ kind: "post-load-pin", seq: sample.event.seq });
  }
  auditSource.close();
  consumer.close();
  const reopened = new FeedConsumerStore(consumerDir, "r2", "atomic", true);
  if (JSON.stringify(reopened.checkpoint()) !== JSON.stringify(cursor))
    failures.push({ kind: "checkpoint-reopen" });
  reopened.close();
  const durableEffects = readConsumerEffects(consumerDir, "r2");
  const expectedEffects = new Set(samples.map((s) => `${s.receipt.position}|${s.event.subject}`));
  if (
    durableEffects.size !== expectedEffects.size ||
    [...expectedEffects].some((key) => durableEffects.get(key) !== 1)
  )
    failures.push({ kind: "consumer-effects-content" });
  const collect = () => {
    let c = feed.start();
    const out = [];
    for (;;) {
      const page = feed.pollSync(c);
      if (!page.resolutions.length) return out;
      out.push(...page.resolutions);
      c = page.cursor;
    }
  };
  const all = collect();
  if (JSON.stringify(all) !== JSON.stringify(collect()))
    failures.push({ kind: "feed-resume-bytes" });
  const expectedPositions = samples.map((s) => s.receipt.position).sort((a, b) => a - b);
  if (
    JSON.stringify(expectedPositions) !== JSON.stringify(feedPositions) ||
    feedPositions.some((p, i) => i && p <= feedPositions[i - 1])
  )
    failures.push({ kind: "feed-order-coverage" });
  const byPosition = new Map(samples.map((s) => [s.receipt.position, s]));
  for (const resolution of all)
    if (resolution.kind === "commit")
      for (const tx of resolution.transacts) {
        const sample = byPosition.get(tx.position);
        const expected =
          sample &&
          Array.from({ length: sample.event.facts }, (_, i) => [
            "assert",
            sample.event.subject,
            `:r2/${sample.event.seq}/${i}`,
            0,
            null,
            tx.position,
          ]);
        const actual = tx.changes.map((c) => [
          c.op,
          c.entity,
          c.attribute,
          c.validFrom,
          c.validTo,
          c.position,
        ]);
        if (JSON.stringify(actual) !== JSON.stringify(expected))
          failures.push({ kind: "feed-content", position: tx.position });
      }
  const brokerStats = broker.stats();
  await managed.dispose();
  await broker.close();
  if (worker) await worker.terminate();
  await Promise.all(readerWorkers.map((w) => w.terminate()));
  hostWorker.postMessage("stop");
  await new Promise((resolve) => hostWorker.once("message", resolve));
  await hostWorker.terminate();
  const sourceUnchanged = Object.entries(source).every(
    ([file, expected]) => hash(fs.readFileSync(file)) === expected,
  );
  const durations = samples.map((sample) => {
    const stage = stages.get(sample.receipt.position);
    if (!stage) {
      failures.push({ kind: "missing-stage" });
      return {};
    }
    const log = stage.log;
    return {
      seq: sample.event.seq,
      band: sample.event.band,
      offerToAck: ms(sample.scheduledNs, sample.ackNs),
      scheduling: ms(sample.scheduledNs, sample.offeredNs),
      staging: ms(sample.offeredNs, stage.command.submittedNs),
      queue: ms(stage.command.submittedNs, stage.command.dequeuedNs),
      decision: ms(stage.command.dequeuedNs, stage.appendNs),
      appendRoundtrip: ms(stage.appendNs, stage.appendReturnedNs),
      logDispatch: ms(stage.appendNs, log.startedNs),
      logBody: ms(log.startedNs, log.bodyEndNs),
      commitFullFsyncEnvelope: ms(log.bodyEndNs, log.durableNs),
      durableToHost: ms(log.durableNs, stage.appendReturnedNs),
      publication: ms(stage.appendReturnedNs, stage.resolvedNs),
      ackReturn: ms(stage.resolvedNs, sample.ackNs),
      replicaApplyMs: (() => {
        const event = applyEvents.find((e) => e.fromLsn <= stage.lsn && e.toLsn >= stage.lsn);
        return event ? ms(event.startedNs, event.completedNs) : NaN;
      })(),
      stagingCpuEnvelopeUs: cpuUs(stage.command.submittedCpu) - cpuUs(sample.offeredCpu),
      queueCpuEnvelopeUs: cpuUs(stage.command.dequeuedCpu) - cpuUs(stage.command.submittedCpu),
      decisionCpuEnvelopeUs: cpuUs(stage.appendCpu) - cpuUs(stage.command.dequeuedCpu),
      appendCpuEnvelopeUs: cpuUs(stage.appendReturnedCpu) - cpuUs(stage.appendCpu),
      publicationCpuEnvelopeUs: cpuUs(stage.resolvedCpu) - cpuUs(stage.appendReturnedCpu),
      ackReturnCpuEnvelopeUs: cpuUs(sample.ackCpu) - cpuUs(stage.resolvedCpu),
      threadCpuEnvelopeUs: cpuUs(sample.ackCpu) - cpuUs(sample.offeredCpu),
    };
  });
  for (const duration of durations) {
    const keys = [
      "scheduling",
      "staging",
      "queue",
      "decision",
      "appendRoundtrip",
      "publication",
      "ackReturn",
    ];
    if (
      keys.some((key) => !Number.isFinite(duration[key]) || duration[key] < 0) ||
      Math.abs(keys.reduce((sum, key) => sum + duration[key], 0) - duration.offerToAck) > 1e-5 ||
      !Number.isFinite(duration.replicaApplyMs)
    )
      failures.push({ kind: "stage-timeline", seq: duration.seq });
  }
  const feedLag = feedTimes.map((f) =>
    publications.has(f.lsn) ? ms(publications.get(f.lsn), f.durableNs) : NaN,
  );
  if (feedLag.some((n) => !Number.isFinite(n) || n < 0)) failures.push({ kind: "feed-clock" });
  const perBandSummary = [0, 1, 2].map((band) => ({
    band,
    facts: [10, 20, 40][band],
    stages: Object.fromEntries(
      Object.keys(durations[0] ?? {})
        .filter((k) => !["seq", "band"].includes(k))
        .map((k) => [k, stats(durations.filter((d) => d.band === band).map((d) => d[k]))]),
    ),
  }));
  raw({ type: "frames", frameEvents, applyEvents });
  fs.closeSync(fd);
  const summary = {
    format: "P2B-round3/1",
    attempt,
    out,
    phase,
    placement,
    workerCount,
    readers,
    perBand,
    rate,
    traceHash: hash(JSON.stringify(trace)),
    source,
    sourceUnchanged,
    clock: "process.hrtime.bigint throughout this process and its threads",
    cpuMeaning:
      "thread CPU for synchronous stage bodies is attributable; offer-to-ACK thread envelope includes overlapping readers/other commands and is not additive. commitFullFsyncEnvelope includes SQLite COMMIT and sync, not isolated fsync syscalls.",
    qualification: "OFFLINE DIAGNOSTIC only",
    brokerStats,
    mainReadRpcs,
    mainReadRpcCounts,
    maintenance,
    runtime: {
      node: process.version,
      pid: process.pid,
      sqliteNativeSha256: hash(
        fs.readFileSync(
          "node_modules/.pnpm/better-sqlite3@12.10.0/node_modules/better-sqlite3/build/Release/better_sqlite3.node",
        ),
      ),
    },
    offered: trace.length,
    committed: samples.length,
    wallMs: ms(start, end),
    failures: [...failures, ...readerResult.failures],
    readerResult,
    cpu: cpuResult,
    perBandSummary,
    feedLagMs: stats(feedLag),
    durations,
    stageCpu: {
      preparationUs: frameEvents.reduce((sum, f) => sum + cpuUs(f.stageTiming.preparationCpu), 0),
      publicationUs: frameEvents.reduce((sum, f) => sum + cpuUs(f.stageTiming.publishCpu), 0),
      logBodyUs: frameEvents.reduce((sum, f) => sum + cpuUs(f.stageTiming.log.bodyCpu), 0),
      logCommitUs: frameEvents.reduce(
        (sum, f) => sum + cpuUs(f.stageTiming.log.totalCpu) - cpuUs(f.stageTiming.log.bodyCpu),
        0,
      ),
    },
  };
  fs.writeFileSync(path.join(out, "report.json"), JSON.stringify(summary, null, 2) + "\n");
  const evidenceFiles = [
    "report.json",
    "raw.jsonl",
    "trace.json",
    "host.jsonl",
    ...(worker ? ["reader-raw.jsonl"] : []),
    ...readerWorkers.map((_, i) => `reader-${i}.jsonl`),
  ];
  fs.writeFileSync(
    path.join(out, "SHA256SUMS"),
    evidenceFiles
      .map((file) => `${hash(fs.readFileSync(path.join(out, file)))}  ${file}`)
      .join("\n") + "\n",
  );
  console.log(
    JSON.stringify({
      attempt,
      out,
      committed: samples.length,
      reads: readerResult.reads,
      failures: summary.failures.length,
      sourceUnchanged,
      bands: perBandSummary.map((b) => ({ band: b.band, ...b.stages.offerToAck })),
    }),
  );
  if (
    !sourceUnchanged ||
    summary.failures.length ||
    maintenance.errors.length ||
    samples.length !== trace.length ||
    perBandSummary.some((b) => b.stages.offerToAck.n < 1000)
  )
    process.exitCode = 1;
}

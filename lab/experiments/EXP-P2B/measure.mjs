#!/usr/bin/env node
// [EXP-P2B] Why: bind the unchanged frozen trace to a broker composition and retain raw observed rows.
// Rejected: a closed-loop ten-fact probe as P2 acceptance (TARGETS 1.1 includes offered-time queueing).
import fs from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { Effect, Layer, ManagedRuntime } from "effect";
import { pathToFileURL } from "node:url";
// Resolve only declared public ESM exports; root tools are not consumers in pnpm's dependency graph.
const publicModule = async (pkg, subpath = ".") => {
  const manifest = JSON.parse(fs.readFileSync(`packages/${pkg}/package.json`, "utf8"));
  const target = manifest.exports[subpath];
  return import(
    pathToFileURL(
      path.resolve("packages", pkg, typeof target === "string" ? target : target.import),
    ).href
  );
};
const { EntityId, Triples, string } = await publicModule("core");
const { Runtime, StorageAdapter, QueryExecutor, DatabaseScope, Capabilities } = await publicModule(
  "core",
  "./runtime",
);
const { HostBroker, makeBrokerStorageAdapter, LogFeed, FeedConsumerStore } =
  await publicModule("broker");
const { MemoryBrokerReplica } = await publicModule("broker", "./memory");
const { makeXtdbClient, makeXtdbBrokerReplica, makeXtdbQueryExecutor } = await publicModule("xtdb");
import {
  generateTrace,
  traceDigest,
  GENERATOR_SHA256,
  PARAMS,
} from "../EXP-P2Q-qlever-log-broker/bench/trace.mjs";
import {
  loadSlots,
  slotInfo,
  readOwner,
  inspect,
  DOCKER_HOST,
  SLOTS_FILE,
} from "../../bin/lib.mjs";
const observeSlot = (holder) => {
  if (
    !holder ||
    process.env.DOCKER_HOST !== DOCKER_HOST ||
    (process.env.TX2_DOCKER_HOST && process.env.TX2_DOCKER_HOST !== DOCKER_HOST)
  )
    throw Error("Private Docker endpoint and explicit --holder required");
  const info = slotInfo(loadSlots(), "xtdb", "s1"),
    owner = readOwner(info),
    container = inspect(info.container);
  if (
    !owner ||
    owner.holder !== holder ||
    owner.mode !== "exclusive" ||
    owner.experiment !== "EXP-P2B" ||
    owner.endpoint !== process.env.XTDB_URL ||
    !container?.State.Running ||
    container.Config.Labels["tx2.holder"] !== holder ||
    container.Config.Labels["tx2.managed-by"] !== "lab/bin/engine.mjs" ||
    container.HostConfig.Memory !== info.memBytes
  )
    throw Error("Exclusive XTDB s1 ownership/caps/endpoint not proven");
  return {
    observedAt: new Date().toISOString(),
    owner,
    containerId: container.Id,
    image: container.Image,
    memory: container.HostConfig.Memory,
    nanoCpus: container.HostConfig.NanoCpus,
    mounts: container.Mounts,
    config: { slotsSha256: createHash("sha256").update(fs.readFileSync(SLOTS_FILE)).digest("hex") },
  };
};
const args = process.argv.slice(2),
  opt = (key, fallback) => {
    const i = args.indexOf(`--${key}`);
    return i < 0 ? fallback : args[i + 1];
  };
const mode = opt("mode", "memory"),
  durationS = Number(opt("seconds", "5")),
  readers = Number(opt("readers", "16")),
  seed = opt("seed", "p2x-a"),
  subjects = Number(opt("subjects", "10000"));
if (
  !["memory", "xtdb"].includes(mode) ||
  !Number.isFinite(durationS) ||
  durationS <= 0 ||
  !Number.isSafeInteger(readers) ||
  readers < 0 ||
  !Number.isSafeInteger(subjects) ||
  subjects < 1
)
  throw Error("Invalid measurement options");
// [EXP-P2B-R2] Why: the legacy memory driver shares its event loop with every reader.
// Rejected: silently interpreting reader-starved ACK callbacks as broker or engine latency.
if (mode === "memory" && readers > 0 && !args.includes("--allow-colocated"))
  throw Error(
    "Use round2/case.mjs for isolated offline readers; --allow-colocated explicitly enables the legacy contention diagnostic",
  );
const attempt = `CX-P2B-${mode}-${randomUUID()}`,
  scope = `p2b:${attempt}`;
const outRoot = opt("out", "/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-P2B");
if (!path.isAbsolute(outRoot)) throw Error("--out must be absolute");
const out = path.join(outRoot, attempt);
fs.mkdirSync(out, { recursive: true });
const available = fs.statfsSync(out, { bigint: true });
if (available.bavail * available.bsize < 5n * 1024n ** 3n) throw Error("Below 5 GiB disk floor");
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const sourcePaths = [
  "lab/experiments/EXP-P2B/measure.mjs",
  ...["core", "broker", "xtdb"].flatMap((pkg) =>
    execFileSync("rg", ["--files", `packages/${pkg}/src`], { encoding: "utf8" })
      .trim()
      .split("\n"),
  ),
  "pnpm-lock.yaml",
  "package.json",
  "tsconfig.base.json",
  "tsconfig.node.json",
  "lab/experiments/EXP-P2B/gates.mjs",
  "lab/experiments/EXP-P2Q-qlever-log-broker/bench/trace.mjs",
  ...["core", "broker", "xtdb"].flatMap((pkg) =>
    ["package.json", "tsconfig.json", "tsdown.config.ts"].map((file) => `packages/${pkg}/${file}`),
  ),
];
const source = Object.fromEntries(sourcePaths.map((file) => [file, hash(fs.readFileSync(file))]));
const buildPaths = ["core", "broker", "xtdb"].flatMap((pkg) =>
  execFileSync("rg", ["--files", "--no-ignore", `packages/${pkg}/dist`], { encoding: "utf8" })
    .trim()
    .split("\n")
    .filter((file) => file.endsWith(".js")),
);
const builds = Object.fromEntries(buildPaths.map((file) => [file, hash(fs.readFileSync(file))]));
for (const file of [...sourcePaths, ...buildPaths]) {
  const destination = path.join(out, "preimages", file);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(file, destination);
}
const dependencyObservation = {
  node: process.version,
  versions: process.versions,
  sqliteNativeSha256: hash(
    fs.readFileSync(
      "node_modules/.pnpm/better-sqlite3@12.10.0/node_modules/better-sqlite3/build/Release/better_sqlite3.node",
    ),
  ),
  lockfileSha256: source["pnpm-lock.yaml"],
};

if (mode === "xtdb" && opt("slot", "") !== "xtdb-s1")
  throw Error("Live measurement requires --slot xtdb-s1");
const slotProof =
  mode === "xtdb" ? observeSlot(opt("holder", "")) : { slot: "none", engine: "memory-diagnostic" };
const trace = generateTrace({ seed, subjects, durationS });
fs.writeFileSync(path.join(out, "trace.json"), JSON.stringify(trace));
const rawFd = fs.openSync(path.join(out, "observations.jsonl"), "wx");
const raw = (value) => fs.writeSync(rawFd, JSON.stringify(value) + "\n");
const events = [],
  publication = new Map();
const client = mode === "xtdb" ? makeXtdbClient(process.env.XTDB_URL) : undefined;
const replica = client ? makeXtdbBrokerReplica(client, scope) : new MemoryBrokerReplica();
const dir = path.join(out, "broker");
const broker = await HostBroker.open({
  dir,
  scopeKey: scope,
  replica,
  decisionStamp: true,
  requireFullFsync: true,
  minFreeBytes: 5 * 1024 ** 3,
  onEvent: (event) => {
    events.push(event);
    if (event.type === "frame") publication.set(event.lsn, event.sourceDurableAtNs);
  },
});
const routes = { replica: 0, overlay: 0, log: 0 };
const adapter = makeBrokerStorageAdapter(replica, scope, broker, {
  onRead: (event) => routes[event.route]++,
});
const refused = () => Effect.die(Error("Memory measurement does not execute Datalog"));
const queries = client
  ? makeXtdbQueryExecutor(client, scope, {
      sourceView: adapter.sourceView,
      resolveBasis: adapter.resolveQueryBasis,
    })
  : { execute: refused, executePage: refused, explain: refused, explainPage: refused };
const managed = ManagedRuntime.make(
  Runtime.define({
    name: `p2b-${mode}`,
    storage: Layer.succeed(StorageAdapter, adapter),
    queries: Layer.succeed(QueryExecutor, queries),
  }).layer({ scope: DatabaseScope.test(scope), capabilities: Capabilities.none }),
);
const triples = await managed.runPromise(Triples),
  run = (effect) => managed.runPromise(effect);
const commits = [],
  expected = new Map(),
  attempts = [],
  readLatencies = [],
  feedLag = [],
  feedObservations = [],
  errors = [];
const feed = new LogFeed(dir),
  consumer = new FeedConsumerStore(path.join(out, "consumer"), "p2b", "atomic", true);
let cursor = feed.start(),
  stopped = false,
  reads = 0;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));
const checkRead = async (selected) => {
  const b = selected.receipt.position,
    entity = `subject:${selected.event.subject}`;
  const wanted = commits
    .filter((c) => c.event.subject === selected.event.subject && c.receipt.position <= b)
    .flatMap((c) =>
      Array.from({ length: c.event.facts }, (_, i) => [
        `:p2b/${c.event.seq}/${i}`,
        `${c.event.seq}:${i}`,
      ]),
    );
  const started = performance.now();
  const rows = await run(
    adapter.getByEntity(entity, { validAt: Number.MAX_SAFE_INTEGER, recordedPosition: b }),
  );
  const actual = rows
    .map((row) => [row.attribute, row.value_string])
    .sort((a, b) => a[0].localeCompare(b[0]));
  wanted.sort((a, b) => a[0].localeCompare(b[0]));
  readLatencies.push(performance.now() - started);
  reads++;
  const matches = JSON.stringify(actual) === JSON.stringify(wanted);
  // Raw answer bytes and expected bytes are retained for every sampled read, every mismatch is retained.
  if (reads % 100 === 0 || !matches)
    raw({ type: "read", requested: { entity, position: b }, rows, expected: wanted, matches });
  if (!matches) errors.push({ kind: "read-content", entity, position: b });
};
const readerLoops = Array.from({ length: readers }, (_, id) =>
  (async () => {
    let n = 0;
    while (!stopped) {
      if (commits.length) {
        const selected =
          commits[Math.max(0, commits.length - 1 - (n++ % 5 === 0 ? id % commits.length : 0))];
        try {
          await checkRead(selected);
        } catch (error) {
          errors.push({ kind: "reader", error: String(error) });
        }
      }
      await sleep(1);
    }
  })(),
);
const drainFeed = () => {
  const page = feed.pollSync(cursor);
  if (!page.resolutions.length) return;
  const effects = page.resolutions
    .filter((r) => r.kind === "commit")
    .flatMap((r) =>
      r.transacts.flatMap((tx) =>
        tx.subjects.map((subject) => ({ position: tx.position, subject })),
      ),
    );
  consumer.recordEffects(effects, page.cursor);
  const durableAt = performance.now();
  const durableAtNs = process.hrtime.bigint().toString();
  for (const resolution of page.resolutions)
    if (resolution.kind === "commit") feedObservations.push({ lsn: resolution.lsn, durableAtNs });
  raw({ type: "feed", resolutions: page.resolutions, checkpoint: page.cursor, durableAt });
  cursor = page.cursor;
};
const feedTimer = setInterval(() => {
  try {
    drainFeed();
  } catch (error) {
    errors.push({ kind: "feed", error: String(error) });
  }
}, 10);
const started = performance.now();
try {
  await Promise.all(
    trace.map(async (event) => {
      const scheduled = started + event.atMs;
      await sleep(scheduled - performance.now());
      const offered = performance.now(),
        commandId = `command:${event.seq}`;
      const operations = Array.from({ length: event.facts }, (_, i) => ({
        op: "assert",
        entityId: EntityId.make(`subject:${event.subject}`),
        attribute: `:p2b/${event.seq}/${i}`,
        value: string(`${event.seq}:${i}`),
        validFrom: event.correction ? 1 : 30 * 86400000 + 1,
      }));
      try {
        const receipt = await run(triples.transact(operations, { commandId }));
        const ackAt = performance.now();
        commits.push({ event, receipt });
        expected.set(event.seq, receipt);
        raw({ type: "commit", event, scheduled, offered, ackAt, receipt });
        attempts.push({
          seq: event.seq,
          facts: event.facts,
          band: event.band,
          scheduled,
          offered,
          ackAt,
          latency: ackAt - scheduled,
          status: "committed",
        });
        await checkRead({ event, receipt });
        if (event.ackLoss) {
          try {
            await run(triples.transact(operations, { commandId }));
            errors.push({ kind: "lost-ack-created-position", seq: event.seq });
          } catch (error) {
            if (error?._tag !== "CommandAlreadyCommittedError") throw error;
          }
          const replay = await run(triples.transactionByCommand(commandId));
          if (
            !replay ||
            replay.position !== receipt.position ||
            replay.txId !== receipt.txId ||
            replay.instant !== receipt.instant
          )
            errors.push({ kind: "lost-ack-receipt", seq: event.seq });
        }
      } catch (error) {
        if (error?._tag === "CommandAlreadyCommittedError") {
          const replay = await run(triples.transactionByCommand(commandId));
          const original = expected.get(event.seq);
          if (
            !original ||
            !replay ||
            original.position !== replay.position ||
            original.txId !== replay.txId ||
            original.instant !== replay.instant
          )
            errors.push({ kind: "duplicate-receipt", seq: event.seq });
          attempts.push({ seq: event.seq, status: "duplicate", replay });
        } else {
          errors.push({ kind: "writer", seq: event.seq, error: String(error) });
          attempts.push({ seq: event.seq, status: "error", error: String(error) });
        }
      }
    }),
  );
  drainFeed();
} finally {
  stopped = true;
  clearInterval(feedTimer);
  await Promise.all(readerLoops);
  consumer.close();
  await managed.dispose();
  await broker.close();
  if (client) await client.close();
  fs.closeSync(rawFd);
}
const resumed = new FeedConsumerStore(path.join(out, "consumer"), "p2b", "atomic", true);
const resumeCheckpoint = resumed.checkpoint();
resumed.close();
const freshFeed = new LogFeed(dir);
const readAll = () => {
  let checkpoint = freshFeed.start();
  const resolutions = [];
  for (;;) {
    const page = freshFeed.pollSync(checkpoint);
    if (!page.resolutions.length) return resolutions;
    resolutions.push(...page.resolutions);
    checkpoint = page.cursor;
  }
};
const all = readAll(),
  replay = readAll();
if (JSON.stringify(all) !== JSON.stringify(replay)) errors.push({ kind: "feed-byte-resume" });
const feedPositions = all
  .filter((r) => r.kind === "commit")
  .flatMap((r) => r.transacts.flatMap((tx) => tx.positions));
// The consumer can finish before the host receives the writer callback; join actual clock samples after the run.
for (const observation of feedObservations) {
  const publishedAtNs = publication.get(observation.lsn);
  feedLag.push(
    publishedAtNs === undefined
      ? NaN
      : Number(BigInt(observation.durableAtNs) - BigInt(publishedAtNs)) / 1e6,
  );
}
const byPosition = new Map(commits.map((commit) => [commit.receipt.position, commit]));
for (const resolution of all)
  if (resolution.kind === "commit")
    for (const tx of resolution.transacts) {
      const expectedCommit = byPosition.get(tx.position);
      if (!expectedCommit) {
        errors.push({ kind: "unexpected-feed-position", position: tx.position });
        continue;
      }
      const { event } = expectedCommit;
      const expectedChanges = Array.from({ length: event.facts }, (_, i) => ({
        op: "assert",
        entity: `subject:${event.subject}`,
        attribute: `:p2b/${event.seq}/${i}`,
        validFrom: event.correction ? 1 : 30 * 86400000 + 1,
        validTo: null,
        position: tx.position,
      }));
      const ordered = (changes) =>
        changes
          .map((change) => [
            change.op,
            change.entity,
            change.attribute,
            change.validFrom,
            change.validTo,
            change.position,
          ])
          .toSorted((a, b) => a[2].localeCompare(b[2]));
      if (
        JSON.stringify(ordered(tx.changes)) !== JSON.stringify(ordered(expectedChanges)) ||
        JSON.stringify(tx.subjects) !== JSON.stringify([`subject:${event.subject}`])
      )
        errors.push({ kind: "feed-content", position: tx.position });
    }
if (feedPositions.some((position, i) => i > 0 && position <= feedPositions[i - 1]))
  errors.push({ kind: "feed-order" });
if (feedLag.some((value) => !Number.isFinite(value) || value < 0))
  errors.push({ kind: "feed-publication-clock" });
const commitPositions = commits.map((c) => c.receipt.position).sort((a, b) => a - b);
if (JSON.stringify(feedPositions) !== JSON.stringify(commitPositions))
  errors.push({ kind: "feed-coverage" });
if (JSON.stringify(resumeCheckpoint) !== JSON.stringify(cursor))
  errors.push({ kind: "durable-checkpoint" });
const slotAfter = mode === "xtdb" ? observeSlot(opt("holder", "")) : slotProof;
const slotUnchanged =
  mode !== "xtdb" ||
  (slotAfter.containerId === slotProof.containerId &&
    slotAfter.owner.createdAt === slotProof.owner.createdAt &&
    slotAfter.image === slotProof.image &&
    slotAfter.config.slotsSha256 === slotProof.config.slotsSha256);
const sourceUnchanged = sourcePaths.every((file) => hash(fs.readFileSync(file)) === source[file]);
const buildUnchanged = buildPaths.every((file) => hash(fs.readFileSync(file)) === builds[file]);
const summary = (values) => {
  const sorted = values.toSorted((a, b) => a - b);
  return {
    n: sorted.length,
    p50: sorted[Math.floor(sorted.length * 0.5)] ?? null,
    p99: sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.99))] ?? null,
  };
};
const report = {
  format: "EXP-P2B/diagnostic-1",
  attempt,
  mode,
  scope,
  sourceOfTruth: "host-broker-sqlite",
  currentAndHistoryReplica: mode,
  p3Arms: {
    B: "broker feed measured here; counting as lane X awaits Sam (Q98j)",
    A1: "not run; native XTDB feed with off-engine consumer remains separate",
  },
  qualification: "DIAGNOSTIC; no NS acceptance verdict",
  limitations: [
    "No year-one population",
    "No maintenance event",
    "Repository reads only",
    "This driver reopens the consumer but does not stop a process; crash testing remains a separate gate",
    "No W0 dependency expansion: feed effects here are directly written subjects",
  ],
  seed,
  durationS,
  readers,
  subjects,
  traceHash: traceDigest(trace),
  generatorHash: GENERATOR_SHA256,
  params: PARAMS,
  source,
  builds,
  dependencyObservation,
  sourceUnchanged,
  buildUnchanged,
  slotProof,
  slotAfter,
  slotUnchanged,
  accounting: {
    offered: trace.length,
    terminal: attempts.length,
    committed: commits.length,
    duplicates: attempts.filter((a) => a.status === "duplicate").length,
    reads,
  },
  commitMsByBand: [0, 1, 2].map((band) => ({
    band,
    ...summary(
      attempts.filter((a) => a.band === band && a.status === "committed").map((a) => a.latency),
    ),
  })),
  readMs: summary(readLatencies),
  feedLagMs: summary(feedLag),
  feedObservations,
  routes,
  errors,
  brokerEvents: events,
  attempts,
};
fs.writeFileSync(path.join(out, "report.json"), JSON.stringify(report, null, 2) + "\n");
const files = ["report.json", "observations.jsonl", "trace.json"];
fs.writeFileSync(
  path.join(out, "SHA256SUMS"),
  files.map((file) => `${hash(fs.readFileSync(path.join(out, file)))}  ${file}`).join("\n") + "\n",
);
process.stdout.write(
  JSON.stringify({
    attempt,
    out,
    accounting: report.accounting,
    errors: errors.length,
    sourceUnchanged,
    buildUnchanged,
  }) + "\n",
);
if (
  errors.length ||
  !sourceUnchanged ||
  !buildUnchanged ||
  !slotUnchanged ||
  attempts.length !== trace.length ||
  !commits.length
)
  process.exitCode = 1;

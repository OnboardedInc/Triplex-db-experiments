#!/usr/bin/env node
import { httpCounts } from "./lib/http-counts.ts";
import { readLatencyRun } from "../receipts/parse.ts";
import { latencyReceipt, requireQleverConnectionMode } from "../receipts/latency.mjs";
/**
 * NS north-star benchmark driver (EXP-N01, measurement semantics v2 = TARGETS 1.1, 2.1, 4.1).
 * Measures P1 to P5 on the frozen writer trace against one composition and writes one report JSON.
 * Normally run by `node lab/bin/gate.mjs NS --lane L --rung R`, which binds the report into a receipt.
 *
 *   node lab/bench/driver.ts --lane xtdb|qlever|datomic --rung 10k|100k|1m|10m --output runs/NS/<id>/ns-report.json
 *     [--profile smoke|screening|acceptance] [--zero-readers [--match-duration-s S]] [--baseline-writes FILE]
 *     [--composition public] [--seed ns-v2] [--reader-threads 4] [--seed-budget-s 3600] [--seed-batch-facts 400]
 *     [--writer-max-inflight 32] [--sweep-concurrency 16] [--oracle-root DIR]
 *     development only: [--subjects N] [--max-readers N] [--burst-multiplier X] [--level-s S]
 *   paired rounds (EXP-M01, PAIR-0; normally started by lab/bench/duet.ts, two drivers at once):
 *     --arm A|B --round-plan FILE (--barrier-dir DIR | --start-at-abs-ms T)
 *     The plan (lib/noise.ts makeRoundPlan) replaces the NS phases: one continuous trace from the agreed absolute start,
 *     per-round histograms (commit, commitAll with censored values, open-loop read probe), per-second goodput and max
 *     latency, ELU and a hiccup meter per round. R22 sections 2.4, 6.2, 7.
 *
 * Engine endpoint: XTDB_URL / QLEVER_URL / DATOMIC_URL; reader peers: DATOMIC_READ_URLS. TX2_ENGINE_CONTAINER names the container whose CPU and logs
 * are sampled (docker over the lab socket only); TX2_ENGINE_CPUS is the slot's CPU quota.
 * lab/bench/README.md documents the trace, the composition interface, metric names and report fields.
 */
import { createHash, randomBytes } from "node:crypto";
import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { Worker } from "node:worker_threads";
import { openComposition, type CompositionHandle, type Receipt } from "./lib/composition.ts";
import { buildHistoryGrowth, buildTraceCommand, type SubjectState } from "./lib/commands.ts";
import { EVALUATE_SEAM, PUBLISH_SEAM, coverageHash, stubRelease } from "./lib/evaluate.ts";
import { feedLagWithinBar } from "./lib/feed-lag.ts";
import { observeDatomicPublication } from "./lib/datomic-publication.ts";
import { FeedConsumer, openHostFeedClock, openPublicationWriter, openPublicationReader, type CrashPoint } from "./lib/feed.ts";
import { Histogram } from "./lib/hist.ts";
import { Model, partsOf } from "./lib/model.ts";
import { R, observe, type ReadRecord } from "./lib/observe.ts";
import { buildCase, checkWithOracle, type OracleSampleRead } from "./lib/oracle.ts";
import { PROFILES, nsPlan, type Profile } from "./lib/phases.ts";
import { Rng, seedOf } from "./lib/rng.ts";
import { OpenLoopScheduler, type JobResult } from "./lib/scheduler.ts";
import { receiptOfRecord, seedRung, type RecordedCommand } from "./lib/seed.ts";
import { TRACE_DEFAULTS, generateTrace, traceDigest, traceStats, type TraceEvent, type TraceParams } from "./lib/trace.ts";
import { BUCKETS, HOP_SHARE, RUNGS, SEED_VALID_FROM, accountsFor, accountOfSubject, hopOf, ids, populationCounts, subjectInCell, worldFactsOf, type Bucket } from "./lib/world.ts";
import { REPO, runtimeApi } from "./lib/triplex.ts";
import { pathToFileURL } from "node:url";
const datomicMaintenanceJobs: any[] = [];
import { chooseHistorySample, chooseSamples } from "./lib/samples.ts";
import { seedFromManifest } from "./lib/bulk.ts";
import { startHiccupMeter, type RoundPlan } from "./lib/noise.ts";
import { RoundBook, type ClientStats, type RoundRecord } from "./lib/rounds.ts";

// ---------------------------------------------------------------- arguments

const argv = process.argv.slice(2);
const opt = (name: string, fallback?: string) => {
  // [DX-H1] Why: explicit flags override wrapper defaults. Rejected: first occurrence (silently ignores development limits).
  const i = argv.lastIndexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : fallback;
};
const flag = (name: string) => argv.includes(`--${name}`);
if (opt("world") === "w0") {
  await (await import("./w0-driver.ts")).runW0Driver(argv);
  process.exit(process.exitCode ?? 0);
}
const lane = opt("lane") as "xtdb" | "qlever" | "datomic";
const rung = opt("rung", "10k")!;
const devSubjects = opt("subjects");
if (!["xtdb", "qlever", "datomic"].includes(lane)) throw new Error("--lane xtdb|qlever|datomic is required");
if (!devSubjects && !(rung in RUNGS)) throw new Error(`--rung must be one of ${Object.keys(RUNGS).join("|")}`);
const profile = opt("profile", "smoke") as Profile;
if (!(profile in PROFILES)) throw new Error(`--profile must be one of ${Object.keys(PROFILES).join("|")}`);
const rungSubjects = devSubjects ? Number(devSubjects) : RUNGS[rung]!;
const output = path.resolve(opt("output") ?? "");
if (!output.startsWith(path.join(REPO, "runs") + path.sep)) throw new Error("--output must be under runs/");
const rawDir = path.dirname(output);
fs.mkdirSync(rawDir, { recursive: true });
const devFlags = ["subjects", "max-readers", "burst-multiplier", "level-s", "rate-scale", "probe10-per-s"].filter((f) => opt(f) !== undefined);
const config = {
  lane,
  rung: devSubjects ? `dev:${rungSubjects}` : rung,
  rungSubjects,
  profile,
  zeroReaders: flag("zero-readers"),
  matchDurationS: opt("match-duration-s") ? Number(opt("match-duration-s")) : null,
  baselineWrites: opt("baseline-writes") ?? null,
  devOverrides: devFlags,
  composition: opt("composition", "public")!,
  seed: opt("seed", "ns-v2")!,
  readerThreads: Number(opt("reader-threads", "4")),
  seedBudgetS: Number(opt("seed-budget-s", "3600")),
  seedBatchFacts: Number(opt("seed-batch-facts", "400")),
  writerMaxInFlight: Number(opt("writer-max-inflight", "32")),
  writerDeadlineMs: Number(opt("writer-deadline-ms", "30000")),
  sweepConcurrency: Number(opt("sweep-concurrency", "16")),
  sweepMax: Number(opt("sweep-max", "100000")),
  maxReaders: opt("max-readers") ? Number(opt("max-readers")) : null,
  burstMultiplier: Number(opt("burst-multiplier", String(TRACE_DEFAULTS.burstMultiplier))),
  rateScale: Number(opt("rate-scale", "1")),
  levelS: opt("level-s") ? Number(opt("level-s")) : null,
  oracleSampleSubjects: Number(opt("oracle-subjects", "12")),
  oracleRate: Number(opt("oracle-rate", "0.01")),
  oracleMaxReads: Number(opt("oracle-max-reads", "24")),
  splitShare: 0.1,
  probe10PerS: Number(opt("probe10-per-s", "1")),
  historySample: Number(opt("history-sample", "1000")),
  p5Mutations: 10,
  oracleRoot: opt("oracle-root") ?? null,
  /** A bulk-seeded scope (lab/bench/qlever-bulk-seed.ts): skip seeding and continue from its manifest. */
  seedManifest: opt("seed-manifest") ?? null,
  settleS: 2,
  /** [EXP-M01] paired rounds: arm label, round plan, and how both arms agree on one absolute trace start. */
  arm: (opt("arm") ?? null) as "A" | "B" | null,
  roundPlan: opt("round-plan") ?? null,
  barrierDir: opt("barrier-dir") ?? null,
  startAtAbsMs: opt("start-at-abs-ms") ? Number(opt("start-at-abs-ms")) : null,
};
const pairPlan: RoundPlan | null = config.roundPlan ? JSON.parse(fs.readFileSync(path.resolve(config.roundPlan), "utf8")) : null;
if (pairPlan) {
  if (pairPlan.format !== "tx2-round-plan/1") throw new Error(`--round-plan: format ${pairPlan.format}`);
  if (config.arm !== "A" && config.arm !== "B") throw new Error("--round-plan needs --arm A|B");
  if ((config.barrierDir === null) === (config.startAtAbsMs === null)) throw new Error("--round-plan needs exactly one of --barrier-dir or --start-at-abs-ms");
  if (pairPlan.seed !== config.seed) throw new Error(`--round-plan is for seed ${pairPlan.seed}, not ${config.seed}`);
}
const planSha256 = config.roundPlan ? createHash("sha256").update(fs.readFileSync(path.resolve(config.roundPlan))).digest("hex") : null;
const runTag = `ns${Date.now().toString(36)}${randomBytes(2).toString("hex")}`;
const bulkManifest = config.seedManifest ? JSON.parse(fs.readFileSync(path.resolve(config.seedManifest), "utf8")) : null;
if (bulkManifest && (bulkManifest.subjects !== rungSubjects || bulkManifest.lane !== lane || bulkManifest.seed !== config.seed))
  throw new Error(`--seed-manifest is for ${bulkManifest.lane}/${bulkManifest.subjects} subjects/seed ${bulkManifest.seed}, not ${lane}/${rungSubjects}/${config.seed}`);
const scopeName = bulkManifest ? bulkManifest.scope : `ns-${lane}-${config.rung.replace(/[^a-z0-9]/gi, "")}-${runTag}`;
const now = () => performance.timeOrigin + performance.now();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const logLines: string[] = [];
const log = (line: string) => {
  const text = `[ns ${new Date().toISOString().slice(11, 19)}] ${line}`;
  logLines.push(text);
  process.stderr.write(text + "\n");
};
const sha256File = (rel: string) => createHash("sha256").update(fs.readFileSync(path.join(REPO, rel))).digest("hex");
const BENCH_FILES = ["lab/bench/driver.ts", "lab/bench/reader-worker.ts", ...fs.readdirSync(path.join(REPO, "lab/bench/lib")).filter((f) => f.endsWith(".ts")).sort().map((f) => `lab/bench/lib/${f}`)];

const report: Record<string, any> = latencyReceipt({
  format: "tx2-ns-report/2",
  qleverConnectionMode: lane === "qlever" ? requireQleverConnectionMode(process.env.TRIPLEX_QLEVER_CONNECTION_MODE ?? "keep-alive") : null,
  semantics: "TARGETS v2 sections 1.1, 2.1, 4.1",
  status: "RUNNING",
  startedAt: new Date().toISOString(),
  config,
  runTag,
  scope: scopeName,
  generator: { traceSha256: sha256File("lab/bench/lib/trace.ts"), worldSha256: sha256File("lab/bench/lib/world.ts"), seed: config.seed },
  benchSources: Object.fromEntries(BENCH_FILES.map((f) => [f, sha256File(f)])),
  host: { cpus: os.cpus().length, platform: `${process.platform}-${process.arch}`, node: process.version, totalMemBytes: os.totalmem() },
});
const save = () => fs.writeFileSync(output, JSON.stringify(report, null, 2) + "\n");

// ---------------------------------------------------------------- engine sampling (async; never blocks the writer)

const slots = JSON.parse(fs.readFileSync(path.join(REPO, "lab/config/slots.json"), "utf8"));
const cgroupPaths = Object.fromEntries((process.env["TX2_ENGINE_CGROUPS"] ?? "").split(",").filter(Boolean).map(s => { const i = s.indexOf("="); if (i < 1) throw Error("invalid TX2_ENGINE_CGROUPS"); return [s.slice(0, i), s.slice(i + 1)]; }));
const container = process.env["TX2_ENGINE_CONTAINER"] ?? (Object.keys(cgroupPaths).join(",") || null);
const containers = lane === "datomic" ? container?.split(",").map(s => s.trim()).filter(Boolean) ?? [] : container ? [container] : [];
const workerHttpCounts: any[] = [];

const cgroupPrevious = new Map<string, { wall: number; usage: number }>();
const engineCpus = Number(process.env["TX2_ENGINE_CPUS"] ?? "0") || null;
const engineSamples: { t: number; cpuPercent: number; memBytes: number; containers: Record<string, { cpuPercent: number; memBytes: number }> }[] = [];
const watermarkSamples: { t: number; marks: Record<string, number> }[] = [];
let samplersOn = true;
const docker = (args: string[], timeout = 20_000) =>
  new Promise<string | null>((resolve) => execFile("docker", ["-H", slots.dockerHost, ...args], { timeout, maxBuffer: 256 << 20 }, (e, out, err) => resolve(e ? null : `${out}${err}`)));
const parseBytes = (text: string) => {
  const m = /([\d.]+)\s*([KMGT]?i?B)/.exec(text);
  const mult: Record<string, number> = { B: 1, KiB: 1024, MiB: 1024 ** 2, GiB: 1024 ** 3, kB: 1e3, MB: 1e6, GB: 1e9 };
  return m ? Number(m[1]) * (mult[m[2]!] ?? 1) : 0;
};
async function engineSampler() {
  while (samplersOn && container) {
    const t = now();
    if (Object.keys(cgroupPaths).length) {
      // [DX-H3] Why: cpu.stat measures each engine without a Docker CLI or socket in the client. Rejected: host polling (SSH apparatus).
      const byContainer: Record<string, { cpuPercent: number; memBytes: number }> = {};
      for (const name of containers) {
        const dir = cgroupPaths[name];
        if (!dir) throw Error(`missing engine cgroup ${name}`);
        const stat = await fs.promises.readFile(path.join(dir, "cpu.stat"), "utf8");
        const usage = Number(/^usage_usec (\d+)$/m.exec(stat)?.[1]);
        const memBytes = Number(await fs.promises.readFile(path.join(dir, "memory.current"), "utf8"));
        const wall = performance.now(), prev = cgroupPrevious.get(name);
        if (!Number.isFinite(usage) || !Number.isFinite(memBytes)) throw Error(`invalid cgroup sample ${name}`);
        cgroupPrevious.set(name, { wall, usage });
        if (prev) byContainer[name] = { cpuPercent: (usage - prev.usage) / ((wall - prev.wall) * 10), memBytes };
      }
      if (Object.keys(byContainer).length === containers.length) engineSamples.push({ t, cpuPercent: Object.values(byContainer).reduce((s, r) => s + r.cpuPercent, 0), memBytes: Object.values(byContainer).reduce((s, r) => s + r.memBytes, 0), containers: byContainer });
      await sleep(1000);
      continue;
    }
    const out = await docker(["stats", "--no-stream", "--format", "{{json .}}", ...containers], 15_000);
    try {
      const rows = out!.trim().split("\n").map(line => JSON.parse(line));
      const byContainer: Record<string, { cpuPercent: number; memBytes: number }> = Object.fromEntries(rows.map(row => [row.Name, { cpuPercent: Number(String(row.CPUPerc).replace("%", "")), memBytes: parseBytes(String(row.MemUsage).split("/")[0]!) }]));
      if (rows.length !== containers.length) throw new Error("partial engine sample");
      engineSamples.push({ t, cpuPercent: Object.values(byContainer).reduce((sum, r) => sum + r.cpuPercent, 0), memBytes: Object.values(byContainer).reduce((sum, r) => sum + r.memBytes, 0), containers: byContainer });
    } catch {}
    await sleep(1000);
  }
}
async function watermarkSampler(comp: CompositionHandle) {
  while (samplersOn) {
    try { watermarkSamples.push({ t: now(), marks: await comp.watermarks() }); } catch {}
    await sleep(1000);
  }
}
const mainElu: { t: number; elu: number }[] = [];
let lastElu = performance.eventLoopUtilization();
const eluTimer = setInterval(() => {
  const n = performance.eventLoopUtilization();
  mainElu.push({ t: now(), elu: performance.eventLoopUtilization(n, lastElu).utilization });
  lastElu = n;
}, 500);
const cpuMarks: { t: number; cpu: NodeJS.CpuUsage }[] = [];

// ---------------------------------------------------------------- shared state

const model = new Model(rungSubjects);
const accounts = accountsFor(rungSubjects);
const records: ReadRecord[] = [];
const oracleSamples: any[] = [];
const workerElu: { worker: number; t: number; elu: number }[] = [];
const acked: { instant: number; position: number; txId: string; at: number }[] = [];
const ackOf = new Map<number, { at: number; instant: number; subject: number; subjects?: number[]; seq: number; stream: string; correction: boolean; correctionValidFrom: number | null; stamp: number }>();
const lastWriteAt = new Map<number, number>();
const recordedCommands: RecordedCommand[] = [];
const writes: any[] = [];
const outcomes = new Map<string, any>();
const original = new Map<number, { operations: any[]; meta: any; receipt: Receipt }>();
const lostAck: any[] = [];
const resends: any[] = [];
const ryowPending = new Set<Promise<void>>();
let latestInstant = 0;
const PHASE_RYOW = -2;
/** [EXP-M01] Open-loop read probe records (paired rounds). */
const PHASE_PROBE = -3;
const SWEEP_PHASE_OFFSET = 1000;
const OVERLAY_SEQ: Record<string, number> = { probe10: 3_000_000_000, "p5-mutation": 5_000_000_000 };
/** Background trace commands offered and not yet finished, per subject (split reads straddle these). */
const pendingBySubject = new Map<number, number[]>();
const ackWaiters = new Map<number, ((r: { position: number; ackAt: number }) => void)[]>();
const ackedBySeq = new Map<number, { position: number; ackAt: number }>();
const queueSamples: { t: number; background: number; all: number }[] = [];
const straddleRng = new Rng(seedOf(`straddle:${config.seed}`));
let upcomingJobs: (horizonMs: number) => { key: number; ev: TraceEvent }[] = () => [];
/** STRADDLE_HORIZON_MS: a split read only waits for a frozen-trace command already queued or due this soon. */
const STRADDLE_HORIZON_MS = 250;
/**
 * A subject with a frozen-trace command that is queued, in flight, or due within STRADDLE_HORIZON_MS, and that
 * command's seq; -1 when there is none (the reader then does an ordinary single pull). RULINGS Q31b.
 */
function straddleCandidate(): { subject: number; seq: number } {
  const keys = [...pendingBySubject.keys()];
  const soon = upcomingJobs(STRADDLE_HORIZON_MS).filter((j) => j.ev.stream === "background" && !j.ev.resend);
  const total = keys.length + soon.length;
  if (!total) return { subject: -1, seq: -1 };
  const k = straddleRng.int(total);
  if (k < keys.length) { const list = pendingBySubject.get(keys[k]!)!; return { subject: keys[k]!, seq: list[list.length - 1]! }; }
  const job = soon[k - keys.length]!;
  return { subject: job.key, seq: job.ev.seq };
}
const overlayCount: Record<string, number> = {};
let feed: FeedConsumer | null = null;
let feedWind: { target: number; checkpointAtStop: number; inFlightAtFeedTarget: number } | null = null;
const lateGrowth: { cmd: any; v: number; pending: Promise<any> }[] = [];
let coordinate: (position: number) => any = (position) => ({ stream: "unknown", epoch: 0, offset: position, ordinal: 0 });

function main() {
  return run().catch((error) => {
    report.httpRequests = { main: httpCounts(), workers: workerHttpCounts };
    report.status = "ERROR";
    report.error = String(error?.stack ?? error);
    log(`fatal: ${report.error}`);
    save();
    process.exitCode = 1;
    setTimeout(() => process.exit(1), 500).unref();
  });
}

async function run() {
  save();
  const writer = await openComposition(config.composition, lane, scopeName);
  const aux = await openComposition(config.composition, lane, scopeName);
  // History growth (bulk, P4 item 2) writes through its own opening, so a writer admission queue full of
  // trace commands cannot starve it; a command that outlives the phase is resolved at wind-down.
  const growthComp = await openComposition(config.composition, lane, scopeName);
  report.composition = { name: writer.name, assignments: writer.assignments, backend: writer.backend, scopeKey: `composition:${writer.name}/source:${lane}/scope:${scopeName}` };
  coordinate = writer.coordinate;
  // [EXP-M01] In paired rounds the coordinator's VM agent reads every container's cgroup counters (lib/noise.ts);
  // the per-second docker stats and watermark polls would only add apparatus load to the engine and the daemon.
  if (!pairPlan) void engineSampler();

  // ---------------------------------------------------------------- seed (bulk lane)
  const pop = populationCounts(rungSubjects);
  const oracleSubjects = chooseSamples(rungSubjects, config.oracleSampleSubjects);
  const historySample = chooseHistorySample(rungSubjects, Math.min(config.historySample, Math.floor(rungSubjects / 10)), config.seed, accounts);
  log(`seed: rung ${config.rung}, ${pop.liveFactsAtSeedEnd} live facts planned (${pop.accounts} accounts, mean world ${pop.worldFacts.mean.toFixed(0)} facts)`);
  const seed = bulkManifest
    ? await seedFromManifest(bulkManifest, writer, log)
    : await seedRung({
        comp: writer, subjects: rungSubjects, runTag, batchFacts: config.seedBatchFacts, budgetMs: config.seedBudgetS * 1000,
        recordSubjects: new Set(oracleSubjects), recordAccounts: new Set(oracleSubjects.map((i) => accountOfSubject(i, accounts))), historySubjects: new Set(historySample), log,
      });
  report.seedPath = bulkManifest ? { kind: "bulk-index", manifest: config.seedManifest, nqSha256: bulkManifest.nq.sha256, quads: bulkManifest.nq.quads } : { kind: "transact" };
  const N = seed.seededSubjects;
  const popN = populationCounts(N, accounts);
  recordedCommands.push(...seed.recorded);
  report.seed = {
    plannedSubjects: rungSubjects, seededSubjects: N, complete: seed.complete, commands: seed.commands, assertions: seed.assertions,
    expectedAssertions: popN.seedAssertions, assertionsMatchClosedForm: popN.seedAssertions === seed.assertions,
    wallS: seed.wallMs / 1000, factsPerS: seed.factsPerS, commitMs: seed.commitMs, failureCount: seed.failures.length, failures: seed.failures.slice(0, 10),
    firstPosition: coordinate(seed.firstPosition), lastPosition: coordinate(seed.lastPosition), lastInstant: seed.lastInstant, population: { planned: pop, seeded: popN },
  };
  save();
  const state: Map<number, SubjectState> = seed.state;
  const versionIds = seed.versionIds;
  const oracleSet = new Set(oracleSubjects.filter((i) => i < N));
  const historyList = historySample.filter((i) => i < N);
  const historyVersion = new Map<number, number>(historyList.map((i) => [i, 0]));
  latestInstant = seed.lastInstant;
  acked.push({ instant: seed.lastInstant, position: seed.lastPosition, txId: "seed-end", at: now() });
  if (!pairPlan) void watermarkSampler(aux);

  // ---------------------------------------------------------------- trace (frozen generator, TARGETS 2.1)
  // [EXP-M01] A round plan names its series' trace parameters (Q60g screening: a burst every 180 s), a new comparison
  // series under TARGETS 2.1 item 5; the plan hash and the parameters are bound in the report.
  const seriesParams: Partial<TraceParams> = pairPlan?.traceParams ?? {};
  const params: TraceParams = { ...TRACE_DEFAULTS, ...seriesParams, burstMultiplier: opt("burst-multiplier") ? config.burstMultiplier : (seriesParams.burstMultiplier ?? TRACE_DEFAULTS.burstMultiplier), steadyFactsPerS: (seriesParams.steadyFactsPerS ?? TRACE_DEFAULTS.steadyFactsPerS) * config.rateScale };
  const traceDurationS = pairPlan ? pairPlan.durationS : 7200;
  const events = generateTrace({ seed: config.seed, subjects: N, durationS: traceDurationS, params });
  report.trace = { params, durationS: traceDurationS, digest: traceDigest(events), generated: traceStats(events), generatorSha256: report.generator.traceSha256, seed: config.seed };
  log(`trace: ${events.length} events over ${traceDurationS}s, digest ${report.trace.digest}, active-set share ${report.trace.generated.activeShare.toFixed(3)}`);

  // ---------------------------------------------------------------- reader workers
  const workerCfg = (w: number) => ({ lane, scope: scopeName, composition: config.composition, seed: config.seed, worker: w, subjects: N, accounts, historySample: historyList, sampleSubjects: [...oracleSet], oracleRate: config.oracleRate, splitShare: config.zeroReaders ? 0 : config.splitShare });
  const workers: Worker[] = [];
  const stopped: Promise<void>[] = [];
  const sweepDone = new Map<number, (v: any) => void>();
  const onWorkerMessage = (w: number, worker: Worker) => (msg: any) => {
    if (msg.type === "reads") { for (const r of msg.records) records.push(r); for (const s of msg.samples) oracleSamples.push(s); }
    else if (msg.type === "elu") workerElu.push({ worker: w, t: msg.t, elu: msg.elu });
    else if (msg.type === "sweep-done") sweepDone.get(msg.phase)?.(msg);
    else if (msg.type === "split-request") worker.postMessage({ type: "split", token: msg.token, ...straddleCandidate() });
    else if (msg.type === "straddle") {
      const done = ackedBySeq.get(msg.seq);
      if (done) worker.postMessage({ type: "acked", token: msg.token, ...done });
      else (ackWaiters.get(msg.seq) ?? ackWaiters.set(msg.seq, []).get(msg.seq)!).push((r) => worker.postMessage({ type: "acked", token: msg.token, ...r }));
    }
  };
  const startWorker = async (w: number, cfg: any) => {
    const worker: any = config.composition === "memory" ? await inThreadReader(cfg) : new Worker(new URL("./reader-worker.ts", import.meta.url), { workerData: cfg, env: process.env });
    const stoppedP = new Promise<void>((resolve) => worker.on("message", (m: any) => m.type === "stopped" && (workerHttpCounts.push({ worker: w, counts: m.httpCounts }), resolve())));
    await new Promise<void>((resolve, reject) => {
      worker.on("message", (m: any) => { if (m.type === "ready") resolve(); else if (m.type === "error") reject(new Error(`reader worker ${w}: ${m.message}`)); });
      worker.on("error", reject);
    });
    worker.on("message", onWorkerMessage(w, worker));
    return { worker, stopped: stoppedP };
  };
  if (!config.zeroReaders && !(pairPlan && pairPlan.readers === 0)) {
    const started = await Promise.all(Array.from({ length: config.readerThreads }, (_, w) => startWorker(w, workerCfg(w))));
    for (const s of started) { workers.push(s.worker); stopped.push(s.stopped); }
    log(`readers: ${workers.length} worker threads ready`);
  }
  const broadcast = () => {
    const t = now();
    const hot: number[] = [];
    for (const [subject, at] of lastWriteAt) if (t - at <= 60_000) hot.push(subject);
    const recent = acked.filter((a) => t - a.at <= 3_600_000).slice(-2000);
    for (const w of workers) w.postMessage({ type: "basis", acked: recent.length ? recent : acked.slice(-1), hot });
  };
  broadcast();
  const basisTimer = setInterval(broadcast, 100);
  const setReaders = (phase: number, wantedReaders: number, mode: string) => {
    const readers = config.maxReaders === null ? wantedReaders : Math.min(wantedReaders, config.maxReaders);
    workers.forEach((w, k) => w.postMessage({ type: "level", phase, readers: Math.floor(readers / workers.length) + (k < readers % workers.length ? 1 : 0), mode }));
  };

  // ---------------------------------------------------------------- writer (open loop)
  type Job = { key: number; scheduledAt: number; ev: TraceEvent; onDone?: (position: number) => void };
  // [EXP-M01] Paired rounds: both arms seed, then meet at one absolute trace start, so the same command has the same
  // scheduled instant in both arms (R22 section 1: only simultaneous pairing shares this host's noise).
  const traceStart = pairPlan ? await pairBarrier(N, report.trace.digest) : now() + 1000;
  report.traceStartAbsMs = traceStart;
  const jobs: Job[] = events.map((ev) => ({ key: ev.subject, scheduledAt: traceStart + ev.atMs, ev }));
  const probeEvents = pairPlan ? probeSchedule(pairPlan.probe.perS, pairPlan.durationS, N) : [];
  const book = pairPlan ? new RoundBook(pairPlan.rounds, traceStart, events.filter((e) => e.stream === "background" && !e.resend), probeEvents) : null;
  const okey = (ev: TraceEvent) => `${ev.stream}:${ev.seq}:${+ev.resend}`;
  const resolveByCommand = async (commandId: string) => {
    const found = await writer.transactionByCommand(commandId);
    return found.ok && found.value ? receiptOfRecord(found.value) : null;
  };
  const noteAck = (receipt: Receipt, subject: number, info: { seq: number; stream: string; correction: boolean; correctionValidFrom: number | null; stamp: number; subjects?: number[] }) => {
    const at = now();
    ackOf.set(receipt.position, { at, instant: receipt.instant, subject, ...info });
    acked.push({ instant: receipt.instant, position: receipt.position, txId: receipt.txId, at });
    latestInstant = Math.max(latestInstant, receipt.instant);
    if (subject >= 0) lastWriteAt.set(subject, at);
    feed?.ackArrived(receipt.position);
    return at;
  };
  const execute = async (job: Job) => {
    const ev = job.ev;
    const out: any = { attempts: 0, tags: [] as string[], path: "direct" };
    outcomes.set(okey(ev), out);
    if (ev.resend) return resend(job, out);
    const st = state.get(ev.subject)!;
    const cmd = buildTraceCommand({ runTag, event: ev, state: st, scheduledAbsMs: job.scheduledAt });
    const meta = { commandId: cmd.commandId, actor: ev.kind, preconditions: cmd.preconditions };
    let receipt: Receipt | null = null;
    while (!receipt && out.attempts < 6) {
      out.attempts++;
      const res = await writer.transact(cmd.operations, meta);
      if (res.ok) { receipt = res.value; break; }
      out.tags.push(res.tag);
      out.lastError = String(res.error?.message ?? "").slice(0, 300);
      receipt = await resolveByCommand(cmd.commandId);
      if (receipt) { out.path = "resolved-by-command"; break; }
      if (res.tag === "TransactionConflictError" && out.attempts >= 2) break; // a typed conflict, accounted as such
      await sleep(20 * out.attempts);
    }
    if (!receipt) {
      out.outcome = out.tags.includes("TransactionConflictError") ? "typed-conflict" : out.tags.length && !out.tags.includes("Unknown") ? "typed-rejection" : "unaccounted";
      job.onDone?.(-1);
      return;
    }
    out.outcome = "committed";
    if (ev.ackLoss) {
      const retry = await writer.transact(cmd.operations, meta);
      const resolved = await resolveByCommand(cmd.commandId);
      lostAck.push({ seq: ev.seq, retryTag: retry.ok ? "COMMITTED-AGAIN" : retry.tag, retryNamesOriginal: !retry.ok && retry.error?.transactionId === receipt.txId, resolvedOriginal: resolved?.txId === receipt.txId && resolved?.position === receipt.position });
      out.path = "lost-ack-resolved";
    }
    const pl = ids.placement(ev.subject);
    st.stamp = cmd.newStamp;
    st.stampId = receipt.triples.find((t) => t.entityId === pl && t.attribute === ":placement/stamp")!.id;
    st.stampValidFrom = Math.floor(job.scheduledAt);
    if (cmd.newAddress) {
      st.address = cmd.newAddress;
      st.addressId = receipt.triples.find((t) => t.entityId === ids.worker(ev.subject) && t.attribute === ":worker/address")!.id;
      st.addressValidFrom = cmd.validRange.from;
    }
    const at = noteAck(receipt, ev.subject, { seq: ev.seq, stream: ev.stream, correction: ev.correction, correctionValidFrom: ev.correction ? cmd.validRange.from : null, stamp: cmd.newStamp });
    if (ev.stream === "background") {
      const result = { position: receipt.position, ackAt: at };
      ackedBySeq.set(ev.seq, result);
      for (const w of ackWaiters.get(ev.seq) ?? []) w(result);
      ackWaiters.delete(ev.seq);
    }
    model.addCommit(ev.subject, { instant: receipt.instant, position: receipt.position, txId: receipt.txId, stamp: cmd.newStamp, stampValidFrom: Math.floor(job.scheduledAt), parts: partsOf(cmd.added, cmd.addedValidFrom, cmd.removed, cmd.removedValidFrom), ackAtMs: at, stream: ev.stream });
    if (ev.stream === "background") original.set(ev.seq, { operations: cmd.operations, meta, receipt });
    out.position = receipt.position;
    if (oracleSet.has(ev.subject))
      recordedCommands.push({ commandId: cmd.commandId, operations: cmd.operations, preconditions: cmd.preconditions, actor: ev.kind, receipt: { txId: receipt.txId, position: receipt.position, instant: receipt.instant, assertionIds: alignAssertIds(cmd.operations, receipt) } });
    if (ev.stream === "background") {
      const p = ryow(aux, ev.subject, receipt);
      ryowPending.add(p);
      void p.finally(() => ryowPending.delete(p));
    }
    job.onDone?.(receipt.position);
  };
  const resend = async (job: Job, out: any) => {
    const orig = original.get(job.ev.seq);
    if (!orig) { resends.push({ seq: job.ev.seq, result: "original-not-committed" }); out.outcome = "resend-of-uncommitted"; return; }
    out.attempts = 1;
    const res = await writer.transact(orig.operations, orig.meta);
    let how = "mismatch";
    if (res.ok) how = "COMMITTED-AGAIN";
    else if (res.tag === "CommandAlreadyCommittedError" && res.error?.transactionId === orig.receipt.txId) how = "already-committed-original";
    else if ((await resolveByCommand(orig.meta.commandId))?.txId === orig.receipt.txId) how = "resolved-by-command";
    out.outcome = how === "mismatch" || how === "COMMITTED-AGAIN" ? "unaccounted" : "duplicate-returned-original";
    resends.push({ seq: job.ev.seq, result: how, tag: res.ok ? null : res.tag });
  };
  const scheduler = new OpenLoopScheduler<Job>(jobs, {
    maxInFlight: config.writerMaxInFlight, deadlineMs: config.writerDeadlineMs, now, exec: execute,
    onOffer: (job: Job) => {
      if (job.ev.stream !== "background" || job.ev.resend) return;
      (pendingBySubject.get(job.key) ?? pendingBySubject.set(job.key, []).get(job.key)!).push(job.ev.seq);
    },
    onDone: (r: JobResult<Job>) => {
      const ev = r.job.ev;
      if (ev.stream === "background" && !ev.resend) {
        const list = pendingBySubject.get(ev.subject);
        if (list) { const k = list.indexOf(ev.seq); if (k >= 0) list.splice(k, 1); if (!list.length) pendingBySubject.delete(ev.subject); }
        const result = ackedBySeq.get(ev.seq) ?? { position: -1, ackAt: now() };
        if (!ackedBySeq.has(ev.seq)) ackedBySeq.set(ev.seq, result);
        for (const w of ackWaiters.get(ev.seq) ?? []) w(result);
        ackWaiters.delete(ev.seq);
      }
      const out = outcomes.get(okey(ev)) ?? {};
      if (r.expired) { out.outcome = "unaccounted"; out.reason = "not sent: writer deadline passed"; r.job.onDone?.(-1); }
      writes.push({ stream: ev.stream, seq: ev.seq, resend: ev.resend, kind: ev.kind, subject: ev.subject, facts: ev.facts, burst: ev.burst, active: ev.active, correction: ev.correction, ackLoss: ev.ackLoss,
        offsetMs: r.job.scheduledAt - traceStart, scheduledAt: r.job.scheduledAt, startedAt: r.startedAt, finishedAt: r.finishedAt, latencyMs: r.latencyMs, waitMs: r.waitMs, expired: r.expired, ...out });
      if (book && ev.stream === "background" && !ev.resend)
        book.recordCommand({ seq: ev.seq, scheduledAt: r.job.scheduledAt, finishedAt: r.finishedAt, latencyMs: r.latencyMs, outcome: r.expired ? "expired" : out.outcome ?? "unaccounted" });
    },
  });
  upcomingJobs = (horizonMs) => scheduler.upcoming(horizonMs);
  /** Overlay command (not background): offered now, joins the subject's serial queue, accounted by stream. */
  const overlay = (stream: string, subject: number, facts: number) =>
    new Promise<number>((resolve) => {
      const seq = OVERLAY_SEQ[stream]! + (overlayCount[stream] = (overlayCount[stream] ?? 0) + 1);
      const ev: TraceEvent = { seq, atMs: now() - traceStart, kind: "runtime", subject, facts, correction: false, ackLoss: false, resend: false, burst: false, active: false, stream };
      scheduler.inject({ key: subject, scheduledAt: now(), ev, onDone: resolve });
    });
  const queueTimer = setInterval(() => {
    let background = 0;
    for (const list of pendingBySubject.values()) background += list.length;
    queueSamples.push({ t: now(), background, all: scheduler.pending });
  }, 1000);

  // ---------------------------------------------------------------- feed consumer (P3)
  // [EXP-M01] Paired rounds measure the writer and the read probe; the P3 consumer and its crash injection stay in NS.
  const lvl = (config.levelS ?? PROFILES[profile].levelS) * 1000;
  const crashPlan: { at: number; point: CrashPoint }[] = (["before-effect", "after-effect", "after-checkpoint"] as CrashPoint[]).map((point, k) => ({ point, at: traceStart + (k + 1.5) * lvl }));
  // [DX-H1] Why: Datomic observes the native transact-result boundary before the driver ACK; other lanes still lack observers.
  // Rejected: manufacturing a publication time from ackOf.instant or ACK arrival (Q98c/d; QA F2).
  const publicationClock = lane === "datomic" && !pairPlan ? openHostFeedClock() : null;
  const publicationSource = JSON.stringify({ route: "A0-control", dir: rawDir, epoch: `${scopeName}#0` });
  const publicationWriter = publicationClock ? openPublicationWriter(path.join(rawDir, "publication.db"), publicationSource, publicationSource, publicationClock) : null;
  const publicationReader = publicationWriter ? openPublicationReader(path.join(rawDir, "publication.db")) : null;
  feed = pairPlan ? null : new FeedConsumer({
    publicationWaitMs: lane === "datomic" ? 5000 : 0,
    dir: rawDir, epoch: `${scopeName}#0`, startAfter: seed.lastPosition, now,
    ...(publicationClock && publicationReader ? { measurement: { clock: publicationClock, records: publicationReader } } : {}),
    commitOf: (p) => { const a = ackOf.get(p); return a ? { instant: a.instant, ackAt: a.at, subject: a.subject, subjects: a.subjects ?? [a.subject], stamp: a.stamp, correction: a.correction, correctionValidFrom: a.correctionValidFrom } : undefined; },
    open: () => openComposition(config.composition, lane, scopeName), log, crashes: crashPlan,
  });
  if (publicationWriter) observeDatomicPublication((position, operationId) => publicationWriter.publish(feed!.publicationKey(position), operationId));
  report.publicationObserver = publicationWriter ? "DatomicClient.transact result, before Triples receipt and driver ACK; durable bound host-clock sidecar" : "not integrated";
  const feedTarget = setInterval(() => { if (feed) feed.lifeMaxTarget = acked.length ? acked[acked.length - 1]!.position : 0; }, 100);
  const feedDone = feed ? feed.run() : Promise.resolve();
  // [DX-H1] Why: retain a failing feed as a caught driver failure during wind-down. Rejected: an unhandled rejection that leaves status RUNNING.
  // [DX-B4-T4] Why: a failed consumer must retain the complete diagnostic report and a failing exit.
  // Rejected: throwing at wind-down before writer/read/oracle observations are saved.
  let feedFailure: unknown;
  void feedDone.catch((cause) => { feedFailure = cause; log(`feed failed: ${String(cause)}`); });

  // ---------------------------------------------------------------- probe10 (P2 diagnostic only)
  let probeTimer: ReturnType<typeof setInterval> | null = null;
  const probeRng = new Rng(seedOf(`probe10:${config.seed}`));

  // ---------------------------------------------------------------- open-loop read probe (paired rounds; Q60d)
  // [EXP-M01] Why (R22 section 2 "Coordinated omission", gap 2): closed-loop readers yield one slow sample per stall.
  // The probe offers pulls at a fixed Poisson rate from intended time, whatever the store does; subjects are uniform
  // over the seeded population from a seeded stream, so both arms issue the same pulls at the same instants. Basis:
  // the latest receipt the driver has seen (named exactly). Latency from the scheduled time; expired and failed pulls
  // are censored. Rejected: probing the hot set (it depends on each arm's own ACK timing, so the arms would diverge).
  type ProbeJob = { key: number; scheduledAt: number; ev: { seq: number; atMs: number; subject: number }; ok?: boolean };
  const probeComp = pairPlan ? await openComposition(config.composition, lane, scopeName) : null;
  const probeScheduler = pairPlan
    ? new OpenLoopScheduler<ProbeJob>(probeEvents.map((ev) => ({ key: ev.seq, scheduledAt: traceStart + ev.atMs, ev })), {
        maxInFlight: pairPlan.probe.maxInFlight, deadlineMs: pairPlan.probe.deadlineMs, now,
        exec: async (job) => {
          const latest = acked[acked.length - 1]!;
          const basis = { recordedAt: latest.instant, validAt: Math.floor(now()) };
          const start = now();
          const t0 = performance.now();
          try {
            const pr = await probeComp!.pull(ids.placement(job.ev.subject), basis);
            const o = observe(pr);
            records.push([PHASE_PROBE, job.ev.subject, basis.recordedAt, basis.validAt, start, performance.now() - t0, o.stamp, o.facts, o.digest, o.bytes, pr.depth, pr.roundTrips, null, 0, latest.position, 0, -1, 0, pr.route, pr.language, pr.waitedMs]);
            job.ok = true;
          } catch (error: any) {
            records.push([PHASE_PROBE, job.ev.subject, basis.recordedAt, basis.validAt, start, performance.now() - t0, -1, 0, "", 0, 0, 0, String(error?._tag ?? "Error"), 0, latest.position, 0, -1, 0, "error", "", 0]);
            job.ok = false;
          }
        },
        onDone: (r) => book!.recordProbe({ seq: r.job.ev.seq, scheduledAt: r.job.scheduledAt, finishedAt: r.finishedAt, latencyMs: r.latencyMs, ok: !r.expired && r.job.ok === true, expired: r.expired }),
      })
    : null;
  const hiccup = pairPlan ? startHiccupMeter(1) : null;
  /** Client signals for a round: mean and max main-loop ELU and the driver's 1 ms sleep overshoot (R22 section 4). */
  const clientStats = (_id: string, fromMs: number, toMs: number): ClientStats => {
    const elus = mainElu.filter((e) => e.t >= fromMs && e.t < toMs).map((e) => e.elu);
    const hic = (hiccup?.seconds ?? []).filter((x) => x.t >= fromMs && x.t < toMs + 1000).map((x) => x.maxMs);
    return { eluMean: elus.length ? mean(elus) : null, eluMax: elus.length ? Math.max(...elus) : null, hiccupMaxMs: hic.length ? Math.max(...hic) : null };
  };
  const emitRounds = (rows: RoundRecord[]) => {
    if (!config.barrierDir) return;
    for (const row of rows) atomicWrite(path.join(path.resolve(config.barrierDir), `${config.arm}.${row.id}.json`), JSON.stringify(row) + "\n");
  };

  // ---------------------------------------------------------------- phases
  const plan = nsPlan(profile, config.zeroReaders).map((p) => (config.levelS && p.seconds ? { ...p, seconds: Math.min(p.seconds, config.levelS) } : p));
  const phases: any[] = [];
  // [DX-B2-N3] Why: identify a completed indexing job inside each P1 level, not unbound log words.
  // Rejected: issuing maintenance after readers stop.
  const indexClient = lane === "datomic" ? new (await import(pathToFileURL(path.join(REPO,"packages/datomic/dist/index.js")).href)).DatomicClient(process.env["DATOMIC_URL"] ?? "http://127.0.0.1:8493", 601000) : null;
  const indexDb = indexClient ? (await indexClient.create(runtimeApi.DatabaseScope.test(scopeName))).db : null;
  await sleep(Math.max(0, traceStart - now()));
  scheduler.start();
  probeScheduler?.start();
  if (config.probe10PerS > 0) probeTimer = setInterval(() => void overlay("probe10", probeRng.int(N), 10), 1000 / config.probe10PerS);
  cpuMarks.push({ t: now(), cpu: process.cpuUsage() });
  if (pairPlan) {
    // One continuous trace; rounds are windows over it (lib/noise.ts makeRoundPlan). A stop file from the
    // coordinator (sequential looks at 8, 12, 18, 24 rounds) ends the trace early at a round boundary.
    const entry: any = { idx: 0, name: "paired", readers: pairPlan.readers, mode: "mixed", measured: false, start: now(), traceStartS: (now() - traceStart) / 1000 };
    phases.push(entry);
    if (pairPlan.readers > 0) setReaders(0, pairPlan.readers, "mixed");
    log(`paired: arm ${config.arm}, ${pairPlan.rounds.length} rounds (${pairPlan.mode}, series ${pairPlan.series}), trace ${pairPlan.durationS}s, ${pairPlan.readers} readers, probe ${pairPlan.probe.perS}/s`);
    let until = traceStart + pairPlan.durationS * 1000;
    const stopFile = config.barrierDir ? path.join(path.resolve(config.barrierDir), "stop.json") : null;
    while (now() < until) {
      emitRounds(book!.ready(now(), clientStats));
      if (stopFile && fs.existsSync(stopFile)) {
        const stop = JSON.parse(fs.readFileSync(stopFile, "utf8"));
        if (Number.isFinite(stop.endAbsMs) && stop.endAbsMs < until) {
          until = Math.max(now(), stop.endAbsMs);
          scheduler.setUntil(until);
          probeScheduler!.setUntil(until);
          log(`paired: stop requested after ${stop.afterRound ?? "?"}; trace ends at +${((until - traceStart) / 1000).toFixed(0)}s`);
        }
      }
      await sleep(Math.max(0, Math.min(500, until - now())));
    }
    entry.end = now();
    entry.traceEndS = (entry.end - traceStart) / 1000;
    report.phases = phases;
    save();
  } else for (const [idx, spec] of plan.entries()) {
    const start = now();
    const entry: any = { idx, name: spec.name, readers: config.maxReaders === null ? spec.readers : Math.min(spec.readers, config.maxReaders), mode: spec.mode ?? "mixed", measured: spec.measured, start, traceStartS: (start - traceStart) / 1000 };
    phases.push(entry);
    setReaders(idx, spec.readers, spec.mode ?? "mixed");
    const indexJob = indexClient && /^L[0-9]+$/.test(spec.name) && spec.seconds ? (async () => {
      const delay = Math.min(config.settleS * 1000, Math.max(0, spec.seconds! * 1000 - 1000));
      await sleep(delay);
      const waitMs = Math.max(1, Math.min(600000, Math.floor(spec.seconds! * 1000 - delay - 100)));
      try {
        const event = await indexClient.request("POST", `/v2/db/${indexDb}/request-index`, {waitMs});
        if (event.database !== indexDb || typeof event.job !== "string" || !/^[0-9a-f-]{36}$/.test(event.job) ||
            !/^[0-9]+$/.test(event.requestedT) || typeof event.completed !== "boolean" ||
            !Number.isSafeInteger(event.requestedAtMs) || (event.completed && (!Number.isSafeInteger(event.completedAtMs) || event.completedAtMs < event.requestedAtMs)))
          throw Error("Invalid Datomic maintenance event binding");
        datomicMaintenanceJobs.push({...event, phase:spec.name, t:event.completedAtMs});
      } catch (error) { datomicMaintenanceJobs.push({phase:spec.name, completed:false, error:String(error)}); }
    })() : null;
    log(`phase ${spec.name}: ${entry.readers} readers at trace ${entry.traceStartS.toFixed(0)}s; writer pending ${scheduler.pending}`);
    if (spec.growHistoryTo) entry.history = await growHistory(spec.growHistoryTo, config.levelS ? Math.min(spec.maxS ?? 1800, 10 * config.levelS) : spec.maxS ?? 1800);
    else if (spec.sweep) entry.sweep = await runSweep(idx, config.levelS ? Math.min(spec.maxS ?? 1800, 10 * config.levelS) : spec.maxS ?? 1800);
    else if (spec.seconds) await sleep(spec.seconds * 1000);
    entry.end = now();
    await indexJob;
    entry.traceEndS = (entry.end - traceStart) / 1000;
    entry.overlapsBurst = overlapsBurst(entry.traceStartS, entry.traceEndS, params);
    report.phases = phases;
    save();
  }
  if (config.zeroReaders && config.matchDurationS) {
    const until = traceStart + config.matchDurationS * 1000;
    if (now() < until) {
      const entry: any = { idx: phases.length, name: "tail", readers: 0, measured: false, start: now(), traceStartS: (now() - traceStart) / 1000 };
      phases.push(entry);
      log(`phase tail: matching the ladder run's trace length (${config.matchDurationS}s)`);
      await sleep(until - now());
      entry.end = now();
      entry.traceEndS = (entry.end - traceStart) / 1000;
    }
  }
  cpuMarks.push({ t: now(), cpu: process.cpuUsage() });

  // ---------------------------------------------------------------- wind down
  const endAt = now();
  if (probeTimer) clearInterval(probeTimer);
  clearInterval(queueTimer);
  scheduler.setUntil(endAt);
  scheduler.stop();
  probeScheduler?.setUntil(endAt);
  probeScheduler?.stop();
  setReaders(-1, 0, "mixed");
  const drainDeadline = now() + 90_000;
  while ((scheduler.pending > 0 || (probeScheduler?.pending ?? 0) > 0) && now() < drainDeadline) {
    if (book) emitRounds(book.ready(now(), clientStats));
    await sleep(250);
  }
  // Anything still pending is censored at this instant (it never finished): Q60d.
  const pairRounds = book ? book.finalize(now(), clientStats, endAt) : null;
  await hiccup?.stop();
  // [EXP-N01 A0 finding] Commands already handed to the store keep committing after the queue empties (they can
  // wait minutes in an adapter admission queue). Wait for them before fixing the feed target, so a late commit is
  // never mistaken for a feed gap.
  const inFlightDeadline = now() + 300_000;
  while (scheduler.inFlightCount > 0 && now() < inFlightDeadline) await sleep(250);
  const inFlightAtFeedTarget = scheduler.inFlightCount;
  await Promise.race([Promise.all([...ryowPending]), sleep(30_000)]);
  for (const w of workers) w.postMessage({ type: "stop" });
  await Promise.race([Promise.all(stopped), sleep(40_000)]);
  for (const w of workers) await w.terminate();
  clearInterval(basisTimer);
  // Growth commands that outlived their phase: wait for them, then fold any that committed into the model.
  for (const late of lateGrowth) {
    await Promise.race([late.pending, sleep(60_000)]);
    const receipt = await resolveByCommand(late.cmd.commandId);
    if (!receipt) { log(`history growth: ${late.cmd.commandId} never committed`); continue; }
    const at = noteAck(receipt, -1, { seq: -1, stream: "p4-history", correction: false, correctionValidFrom: null, stamp: -1, subjects: late.cmd.perSubject.map((x: any) => x.subject) });
    for (const s of late.cmd.perSubject) model.addCommit(s.subject, { instant: receipt.instant, position: receipt.position, txId: receipt.txId, stamp: -1, stampValidFrom: 0, parts: partsOf(s.added, s.added.map(() => SEED_VALID_FROM), s.removed, s.removed.map(() => SEED_VALID_FROM)), ackAtMs: at, stream: "p4-history" });
  }
  lateGrowth.length = 0;
  const lastAcked = Math.max(acked.length ? Math.max(...acked.map((a) => a.position)) : seed.lastPosition, await writer.currentPosition().catch(() => 0));
  const feedDeadline = now() + 120_000;
  while (feed && !feedFailure && feed.checkpoint < lastAcked && now() < feedDeadline) await sleep(100);
  feedWind = feed ? { target: lastAcked, checkpointAtStop: feed.checkpoint, inFlightAtFeedTarget } : null;
  feed?.stop();
  await feedDone.catch(() => {});
  clearInterval(feedTarget);
  let replay: any = feedFailure ? { exact: false, status: "NOT-RUN", reason: "feed consumer failed" } : null;
  // [EXP-M01R] Why: paired rounds have no P3 consumer; NS keeps main's post-drain target and replay. Rejected: restoring the old early feed target (misses late commits).
  if (feed && !feedFailure) {
    const replayHandle = await openComposition(config.composition, lane, scopeName);
    const firstCrash = feed.crashReport().find((c) => c.checkpoint !== null);
    replay = await feed.replayCheck(replayHandle, firstCrash?.checkpoint ?? seed.lastPosition);
    await replayHandle.close().catch(() => {});
  }
  const finalPosition = await writer.currentPosition();
  samplersOn = false;
  clearInterval(eluTimer);
  const maintenance = await maintenanceEvents(traceStart);
  indexClient?.close();
  await writer.close().catch(() => {});
  await aux.close().catch(() => {});
  await growthComp.close().catch(() => {});
  await probeComp?.close().catch(() => {});
  observeDatomicPublication(undefined);
  publicationReader?.close();
  publicationWriter?.close();
  log(`wind down: writer pending ${scheduler.pending}, probe pending ${probeScheduler?.pending ?? 0}, feed checkpoint ${feed?.checkpoint ?? "-"}/${lastAcked}, final position ${finalPosition}`);
  fs.writeFileSync(path.join(rawDir, "ns-writes.jsonl"), writes.map((w) => JSON.stringify(latencyReceipt({ writer: "ns-write-event/1", qleverConnectionMode: report.qleverConnectionMode, stream: w.stream, seq: w.seq, resend: w.resend, offsetMs: w.offsetMs, latencyMs: w.latencyMs, facts: w.facts, burst: w.burst, outcome: w.outcome }))).join("\n") + "\n");

  // ---------------------------------------------------------------- analysis
  report.writer = { offered: scheduler.offered, completed: scheduler.completed, expired: scheduler.expired, notOffered: scheduler.notOffered, maxInFlightSeen: scheduler.maxInFlightSeen, pendingAtEnd: scheduler.pending, offeredUntilTraceS: (endAt - traceStart) / 1000, overlays: overlayCount };
  report.finalPosition = coordinate(finalPosition);
  report.positionCoordinates = "TARGETS 4.1 item 3: (stream, epoch, offset, ordinal); Triplex gives one dense position per scope and one engine transaction per transact, so offset = position and ordinal = 0";
  report.maintenance = maintenance;
  if (pairPlan) pairedAnalysis({ rounds: pairRounds!, probeScheduler: probeScheduler!, probeEvents: probeEvents.length });
  else analyse({ phases, traceStart, replay, maintenance, historyList, pendingAtEnd: scheduler.pending });
  report.oracle = config.zeroReaders ? { status: "NOT-RUN", reason: "zero-reader baseline run" } : pairPlan && pairPlan.readers === 0 ? { status: "NOT-RUN", reason: "paired rounds without readers: O-REPLAY samples come from reader threads" } : runOracle(finalPosition, lastAcked);
  // [DX-H1] Why: API round trips and observed HTTP requests differ when reach falls back inside the adapter.
  // Rejected: discarding the reader's roundTrips field during analysis (cannot compare compositions).
  const pullCalls = records.filter(r => r[R.error] === null).map(r => r[R.roundTrips]);
  report.pullRoundTrips = { pulls: pullCalls.length, mean: mean(pullCalls),
    distribution: countBy(pullCalls.map(String)), unit: "public Triples service calls; see httpRequests for actual HTTP" };
  report.httpRequests = { main: httpCounts(), workers: workerHttpCounts };
  report.engineSamples = engineSamples;
  if (feedFailure) {
    report.feedFailure = String(feedFailure);
    report.invalidReasons = [...(report.invalidReasons ?? []), `Feed consumer failed: ${String(feedFailure)}`];
    process.exitCode = 1;
  }
  report.status = feedFailure ? "ERROR" : "DONE";
  report.endedAt = new Date().toISOString();
  fs.writeFileSync(path.join(rawDir, "ns-log.txt"), logLines.join("\n") + "\n");
  save();
  log(`report: ${path.relative(REPO, output)}`);
  setTimeout(() => process.exit(process.exitCode ?? 0), 500).unref();

  // ---------------------------------------------------------------- phase bodies

  /** TARGETS 1.1 P4 item 2: grow the matched sample's history in place, through the writer, as stream p4-history. */
  async function growHistory(depth: number, maxS: number) {
    const started = now();
    const deadline = started + maxS * 1000;
    let commands = 0, assertions = 0, failures = 0;
    const perCommand = Math.max(1, Math.floor(config.seedBatchFacts / 4));
    if (!historyList.length) return { targetDepth: depth, reachedDepth: 1, subjects: 0, commands, assertions, failures, wallS: 0 };
    if (lateGrowth.length) return { targetDepth: depth, reachedDepth: Math.min(...historyList.map((i) => historyVersion.get(i) ?? 0)) + 1, subjects: historyList.length, commands, assertions, failures, wallS: 0, incomplete: true, skipped: `an earlier growth command (${lateGrowth[0]!.cmd.commandId}) is still pending; it is never re-sent` };
    for (let v = (historyVersion.get(historyList[0]!) ?? 0) + 1; v < depth && now() < deadline; v++) {
      for (let k = 0; k < historyList.length && now() < deadline; k += perCommand) {
        const group = historyList.slice(k, k + perCommand);
        const cmd = buildHistoryGrowth({ runTag, label: `v${v}.${k}`, subjects: group, version: v, ids: versionIds });
        let receipt: Receipt | null = null;
        let timedOut = false;
        for (let attempt = 1; attempt <= 6 && !receipt; attempt++) {
          if (now() > deadline) break;
          const pending = growthComp.transact(cmd.operations, { commandId: cmd.commandId, actor: "p4-history", preconditions: cmd.preconditions });
          const res = await Promise.race([pending, sleep(Math.max(1000, deadline - now())).then(() => null)]);
          if (res === null) { timedOut = true; lateGrowth.push({ cmd, v, pending }); break; }
          receipt = res.ok ? res.value : await resolveByCommand(cmd.commandId);
          if (!receipt) { failures++; await sleep(50 * attempt); }
        }
        if (!receipt) {
          log(`history growth: ${cmd.commandId} ${timedOut ? "still pending at the phase deadline" : "failed 6 times"}; growth stops at version ${v - 1}`);
          return { targetDepth: depth, reachedDepth: Math.min(...historyList.map((i) => historyVersion.get(i) ?? 0)) + 1, subjects: historyList.length, commands, assertions, failures, wallS: (now() - started) / 1000, incomplete: true, pendingAtDeadline: timedOut ? cmd.commandId : null };
        }
        commands++;
        assertions += cmd.operations.filter((o) => o.op === "assert").length;
        const at = noteAck(receipt, -1, { seq: -1, stream: "p4-history", correction: false, correctionValidFrom: null, stamp: -1, subjects: group });
        for (const s of cmd.perSubject) {
          versionIds.set(s.subject, s.added.map((f) => receipt!.triples.find((t) => t.entityId === f.e && t.attribute === f.a)!.id));
          historyVersion.set(s.subject, v);
          model.addCommit(s.subject, { instant: receipt.instant, position: receipt.position, txId: receipt.txId, stamp: -1, stampValidFrom: 0, parts: partsOf(s.added, s.added.map(() => SEED_VALID_FROM), s.removed, s.removed.map(() => SEED_VALID_FROM)), ackAtMs: at, stream: "p4-history" });
        }
        if (group.some((i) => oracleSet.has(i)))
          recordedCommands.push({ commandId: cmd.commandId, operations: cmd.operations, preconditions: cmd.preconditions, actor: "p4-history", receipt: { txId: receipt.txId, position: receipt.position, instant: receipt.instant, assertionIds: alignAssertIds(cmd.operations, receipt) } });
      }
    }
    const reached = Math.min(...historyList.map((i) => historyVersion.get(i) ?? 0)) + 1;
    return { targetDepth: depth, reachedDepth: reached, subjects: historyList.length, commands, assertions, failures, wallS: (now() - started) / 1000 };
  }

  /** P5: one shared basis, exact coverage, post-capture mutations; evaluate and publish are fail-closed seams. */
  async function runSweep(idx: number, maxS: number) {
    const list = sweepList(N, config.sweepMax);
    const last = acked[acked.length - 1]!;
    const basis = { recordedAt: last.instant, validAt: Math.floor(now()) };
    const release = stubRelease();
    const mutRng = new Rng(seedOf(`p5mut:${config.seed}`));
    const mutated = [...new Set(Array.from({ length: Math.min(config.p5Mutations, list.length) }, () => list[mutRng.int(list.length)]!))];
    const out: any = { subjects: list.length, coverageSha256: coverageHash(list), basis: { ...basis, position: coordinate(last.position), txId: last.txId }, release: { id: release.id, sha256: release.sha256 }, concurrency: config.sweepConcurrency, mutatedAfterCapture: mutated, evaluate: EVALUATE_SEAM, publish: PUBLISH_SEAM, throttledVariant: { status: "not-run", reason: "needs evaluate and an observable compaction or rebuild to overlap (seam)" } };
    // Offered after the capture and not awaited: the sweep starts at once; positions are filled in as ACKs arrive.
    const mutationsDone = Promise.all(mutated.map((s) => overlay("p5-mutation", s, 6))).then((positions) => { out.mutationPositions = positions; });
    void mutationsDone;
    const { worker: sweeper, stopped: sweeperStopped } = await startWorker(99, { ...workerCfg(99), sampleSubjects: [], oracleRate: 0, splitShare: 0 });
    const done = new Promise<any>((resolve) => sweepDone.set(idx + SWEEP_PHASE_OFFSET, resolve));
    out.startedAt = now();
    sweeper.postMessage({ type: "sweep", phase: idx + SWEEP_PHASE_OFFSET, subjects: list, basis, position: last.position, concurrency: config.sweepConcurrency });
    const result = await Promise.race([done, sleep(maxS * 1000).then(() => null)]);
    out.endedAt = now();
    out.completed = result !== null;
    out.wallMs = result?.wallMs ?? out.endedAt - out.startedAt;
    sweeper.postMessage({ type: "stop" });
    await Promise.race([sweeperStopped, sleep(35_000)]);
    await sweeper.terminate();
    return out;
  }
}

// ---------------------------------------------------------------- helpers

// ---------------------------------------------------------------- paired rounds (EXP-M01)

const atomicWrite = (file: string, text: string) => {
  const tmp = `${file}.${process.pid}.${randomBytes(3).toString("hex")}.tmp`;
  fs.writeFileSync(tmp, text);
  fs.renameSync(tmp, file);
};
/**
 * Barrier: after seeding, write `<arm>.ready.json` (seeded subjects, trace digest, plan hash) and wait for the
 * coordinator's `go.json` with one absolute start for both arms (or `abort`). The coordinator only says go when both
 * arms report the same subjects and trace digest, so both replay byte-identical command lists.
 */
async function pairBarrier(N: number, traceDigestHex: string): Promise<number> {
  if (config.startAtAbsMs !== null) {
    if (config.startAtAbsMs < now() + 100) throw new Error(`--start-at-abs-ms ${config.startAtAbsMs} is not in the future (seeding ended at ${Math.round(now())})`);
    return config.startAtAbsMs;
  }
  const dir = path.resolve(config.barrierDir!);
  fs.mkdirSync(dir, { recursive: true });
  atomicWrite(path.join(dir, `${config.arm}.ready.json`), JSON.stringify({ arm: config.arm, pid: process.pid, seededSubjects: N, traceDigest: traceDigestHex, planSha256, scope: scopeName, at: now() }) + "\n");
  log(`paired: arm ${config.arm} ready (${N} subjects, trace ${traceDigestHex}); waiting for go`);
  const deadline = now() + (config.seedBudgetS + 3600) * 1000;
  const goFile = path.join(dir, "go.json");
  for (;;) {
    if (fs.existsSync(goFile)) {
      const go = JSON.parse(fs.readFileSync(goFile, "utf8"));
      if (go.abort) throw new Error(`coordinator aborted: ${go.abort}`);
      if (!(go.startAtAbsMs > now())) throw new Error(`go time ${go.startAtAbsMs} already passed`);
      log(`paired: go at ${new Date(go.startAtAbsMs).toISOString()}`);
      return go.startAtAbsMs;
    }
    if (now() > deadline) throw new Error("no go from the coordinator before the barrier deadline");
    await sleep(100);
  }
}
/** Seeded Poisson probe schedule, uniform subjects: identical in both arms for the same seed and population. */
function probeSchedule(perS: number, durationS: number, n: number): { seq: number; atMs: number; subject: number }[] {
  if (!(perS > 0)) return [];
  const rng = new Rng(seedOf(`read-probe:${config.seed}`));
  const out: { seq: number; atMs: number; subject: number }[] = [];
  for (let t = rng.exp(perS), seq = 0; t < durationS; t += rng.exp(perS)) out.push({ seq: seq++, atMs: Math.round(t * 1e6) / 1000, subject: rng.int(n) });
  return out;
}
/**
 * Paired-round report (R22 section 6.2): per-round records and histograms named `<round>.<arm>.<metric>`
 * (`R03.A.commitAll`), the client saturation check per round, and the correctness of every read the arm made
 * (probe, read-your-own-write, readers) against the expected-state model at the driver-recorded basis.
 */
function pairedAnalysis(ctx: { rounds: RoundRecord[]; probeScheduler: OpenLoopScheduler<any>; probeEvents: number }) {
  const verdicts = records.map((r) => judgeRead(r));
  const violationKinds: Record<string, number> = {};
  const violationSample: any[] = [];
  const byKind: Record<string, { reads: number; correct: number; violations: number; errors: number }> = {};
  records.forEach((r, k) => {
    const v = verdicts[k]!;
    const kind = r[R.phase] === PHASE_PROBE ? "probe" : r[R.phase] === PHASE_RYOW ? "readYourOwnWrite" : "readers";
    const b = (byKind[kind] ??= { reads: 0, correct: 0, violations: 0, errors: 0 });
    b.reads++;
    if (v.ok) b.correct++; else if (v.kind === "error") b.errors++; else b.violations++;
    if (v.ok || v.kind === "error") return;
    violationKinds[v.kind] = (violationKinds[v.kind] ?? 0) + 1;
    if (violationSample.length < 10) violationSample.push({ kind: v.kind, phase: r[R.phase], subject: r[R.subject], basis: { recordedAt: r[R.recordedAt], validAt: r[R.validAt], position: r[R.basisPosition] }, observed: { stamp: r[R.stamp], digest: r[R.digest] }, expected: model.expected(r[R.subject], r[R.recordedAt], r[R.validAt]) });
  });
  const total = records.length, ok = verdicts.filter((v) => v.ok).length, errs = verdicts.filter((v) => v.kind === "error").length;
  report.correctness = { reads: total, correct: ok, violations: total - ok - errs, errors: errs, violationKinds, violationSample, byKind, rule: "a read is correct when its :placement/stamp and whole-world multiset digest equal the expected-state model at the basis the driver requested; errors are censored in the latency histograms and never goodput" };
  const histograms: Record<string, any> = {};
  const rounds = ctx.rounds.map((row) => {
    const { hist, ...rest } = row;
    for (const [name, h] of Object.entries(hist)) histograms[`${row.id}.${config.arm}.${name}`] = h;
    if (pairPlan!.readers > 0) {
      const reads = new Histogram();
      records.forEach((r, k) => { if (r[R.phase] === 0 && r[R.start] >= row.fromMs && r[R.start] < row.toMs && verdicts[k]!.ok) reads.recordMs(r[R.latency]); });
      histograms[`${row.id}.${config.arm}.reads`] = reads.toJSON();
    }
    return rest;
  });
  const saturated = ctx.rounds.filter((r) => (r.client.eluMean ?? 0) > 0.9).map((r) => r.id);
  report.client = { saturatedRounds: saturated, invalid: saturated.length > 0, processCpu: cpuUse(), readerThreads: pairPlan!.readers ? config.readerThreads : 0, rule: "a round is excluded (rule client-elu) when the driver's main event loop has mean utilization > 0.9 in it" };
  report.pair = {
    format: "tx2-pair-arm/1", arm: config.arm, planSha256, mode: pairPlan!.mode, series: pairPlan!.series, traceParams: report.trace.params, traceStartAbsMs: report.traceStartAbsMs,
    rounds, probe: { perS: pairPlan!.probe.perS, events: ctx.probeEvents, offered: ctx.probeScheduler.offered, expired: ctx.probeScheduler.expired, notOffered: ctx.probeScheduler.notOffered },
    histogramNames: "histograms[<round>.<arm>.<commitAll|commitCensored|commit|probeAll|probeCensored|probe|reads>] (tx2-loglinear-hist/1; censored = expired, failed, rejected or pending at end, at censor time)",
  };
  report.histograms = histograms;
}

/** A reader on a MessageChannel in this thread, shaped like a Worker (postMessage, on, terminate). */
async function inThreadReader(cfg: any) {
  const { MessageChannel } = await import("node:worker_threads");
  const { startReader } = await import("./reader-worker.ts");
  const channel = new MessageChannel();
  const side: any = channel.port1;
  side.terminate = async () => { channel.port1.close(); channel.port2.close(); };
  void startReader(channel.port2, cfg);
  return side;
}
function sweepList(n: number, max: number): number[] {
  const count = Math.min(n, max);
  return Array.from({ length: count }, (_, k) => (count === n ? k : Math.floor((k * n) / count)));
}
function overlapsBurst(fromS: number, toS: number, p: TraceParams) {
  for (let t = p.firstBurstAtS; t < toS; t += p.burstPeriodS) if (t + p.burstDurationS > fromS) return true;
  return false;
}
function alignAssertIds(operations: readonly any[], receipt: Receipt) {
  const pool = new Map<string, string[]>();
  for (const t of receipt.triples) {
    const key = `${t.entityId}\u0001${t.attribute}\u0001${JSON.stringify(t.value)}`;
    (pool.get(key) ?? pool.set(key, []).get(key)!).push(t.id);
  }
  return operations.map((op) => (op.op === "assert" ? (pool.get(`${op.entityId}\u0001${op.attribute}\u0001${JSON.stringify(op.value)}`)?.shift() ?? null) : null));
}
async function ryow(comp: CompositionHandle, subject: number, receipt: Receipt) {
  const basis = { recordedAt: receipt.instant, validAt: Math.floor(now()) };
  const start = now();
  const t = performance.now();
  try {
    const pr = await comp.pull(ids.placement(subject), basis);
    const o = observe(pr);
    records.push([PHASE_RYOW, subject, basis.recordedAt, basis.validAt, start, performance.now() - t, o.stamp, o.facts, o.digest, o.bytes, pr.depth, pr.roundTrips, null, 0, receipt.position, 0, -1, 0, pr.route, pr.language, pr.waitedMs]);
  } catch (error: any) {
    records.push([PHASE_RYOW, subject, basis.recordedAt, basis.validAt, start, performance.now() - t, -1, 0, "", 0, 0, 0, String(error?._tag ?? "Error"), 0, receipt.position, 0, -1, 0, "error", "", 0]);
  }
}
/** Maintenance evidence (TARGETS 1.1 P1 item 3): engine log lines naming compaction, merge or rebuild. */
async function maintenanceEvents(traceStart: number) {
  // [DX-H1] Why: indexing needs an explicit source-bound job hook; log words alone do not prove completion.
  // Rejected: treating arbitrary "index" log lines as a P1 maintenance witness.
  if (lane === "datomic") return { source: "write gateway /v2/db/{db}/request-index", events: datomicMaintenanceJobs, trigger: "one request-index/sync-index job per P1 level; incomplete jobs never count", logs: Object.keys(cgroupPaths).length ? "not collected in VM mode" : "not collected" };
  if (!container) return { source: null, events: [] as { t: number; line: string }[], note: "no TX2_ENGINE_CONTAINER: maintenance evidence not collected" };
  const since = new Date(traceStart - 1000).toISOString();
  const text = (await docker(["logs", "--timestamps", "--since", since, container], 60_000)) ?? "";
  const pattern = lane === "xtdb" ? /compact|compaction|\bgc\b|garbage/i : /rebuild|merge|delta|update.*index|writing.*index/i;
  const events: { t: number; line: string }[] = [];
  for (const line of text.split("\n")) {
    if (!pattern.test(line)) continue;
    const m = /^(\d{4}-\d\d-\d\dT[\d:.]+Z)\s(.*)$/.exec(line);
    if (m) events.push({ t: Date.parse(m[1]!), line: m[2]!.slice(0, 200) });
  }
  return { source: `docker logs ${container}`, pattern: String(pattern), events: events.slice(0, 500), count: events.length, trigger: "none: the driver cannot force compaction or a rebuild on this engine yet (seam); only naturally occurring events count" };
}

// ---------------------------------------------------------------- analysis

function windowOf(phase: any) {
  return { from: phase.start + config.settleS * 1000, to: phase.end };
}
function judgeRead(r: ReadRecord) {
  if (r[R.error] !== null) return { ok: false, kind: "error" };
  const exp = model.expected(r[R.subject], r[R.recordedAt], r[R.validAt]);
  if (r[R.stamp] === exp.stamp && r[R.digest] === exp.digest) return { ok: true, kind: "correct" };
  const late = model.lateArrivals(r[R.subject], r[R.recordedAt], r[R.start]);
  if (exp.stamp >= 0 && r[R.stamp] < exp.stamp) return { ok: false, kind: late > 0 ? "stale-late-arrival" : "stale" };
  if (r[R.stamp] > exp.stamp) return { ok: false, kind: "future-or-latest-state" };
  return { ok: false, kind: "wrong-world" };
}
const bandOf = (f: number) => (f <= 10 ? "5-10" : f <= 25 ? "11-25" : "26-50");
const mean = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);
const ratio = (a: number | null | undefined, b: number | null | undefined) => (a == null || b == null || b === 0 ? null : a / b);
const bar = (id: string, value: any, limit: string, pass: boolean | null, note?: string) => ({ id, value, bar: limit, pass, ...(note ? { note } : {}) });
const countBy = (values: string[]) => { const o: Record<string, number> = {}; for (const v of values) o[v] = (o[v] ?? 0) + 1; return o; };

function analyse(ctx: { phases: any[]; traceStart: number; replay: any; maintenance: any; historyList: number[]; pendingAtEnd: number }) {
  const verdicts = records.map((r) => judgeRead(r));
  const violationKinds: Record<string, number> = {};
  const violationSample: any[] = [];
  records.forEach((r, k) => {
    const v = verdicts[k]!;
    if (v.ok || v.kind === "error") return;
    violationKinds[v.kind] = (violationKinds[v.kind] ?? 0) + 1;
    if (violationSample.length < 10) violationSample.push({ kind: v.kind, phase: r[R.phase], subject: r[R.subject], basis: { recordedAt: r[R.recordedAt], validAt: r[R.validAt], position: r[R.basisPosition], kind: r[R.basisKind] }, split: r[R.split], observed: { stamp: r[R.stamp], digest: r[R.digest] }, expected: model.expected(r[R.subject], r[R.recordedAt], r[R.validAt]) });
  });
  const background = writes.filter((w) => w.stream === "background" && !w.resend);
  const baseline = loadBaselineWrites();
  const lagRows = feed!.lags;
  const lastAckBefore = (subject: number, t: number): number | null => {
    let best: number | null = null;
    for (const c of model.commits.get(subject) ?? []) if (c.ackAtMs < t && (best === null || c.ackAtMs > best)) best = c.ackAtMs;
    return best;
  };

  const levelStats = (phase: any) => {
    const w = windowOf(phase);
    const secs = Math.max(0.001, (w.to - w.from) / 1000);
    const read = new Histogram();
    let reads = 0, correct = 0, violations = 0, errors = 0, hotReads = 0, splitReads = 0, splitForced = 0, splitCorrect = 0;
    const byBasis = [0, 0, 0];
    const routes: Record<string, number> = {};
    const languages: Record<string, number> = {};
    let waited = 0;
    const buckets: Record<string, Histogram> = {};
    const bytesBy: Record<string, number[]> = {};
    records.forEach((r, k) => {
      if (r[R.phase] !== phase.idx || r[R.start] < w.from || r[R.start] + r[R.latency] > w.to) return;
      reads++;
      const v = verdicts[k]!;
      if (v.ok) { correct++; read.recordMs(r[R.latency]); } else if (v.kind === "error") errors++; else violations++;
      const lw = lastAckBefore(r[R.subject], r[R.start]);
      if (lw !== null && r[R.start] - lw <= 60_000) hotReads++;
      byBasis[r[R.basisKind]]!++;
      routes[r[R.route]] = (routes[r[R.route]] ?? 0) + 1;
      languages[r[R.language]] = (languages[r[R.language]] ?? 0) + 1;
      if (r[R.waitedMs] > 0) waited++;
      if (r[R.split] > 0) { splitReads++; if (r[R.split] === 2) { splitForced++; if (v.ok) splitCorrect++; } }
      if (v.ok) {
        const facts = worldFactsOf(r[R.subject], accounts);
        const b = facts <= 200 ? "small" : facts <= 800 ? "medium" : "large";
        for (const key of [`bucket:${b}`, `hops:${hopOf(r[R.subject])}`]) {
          (buckets[key] ??= new Histogram()).recordMs(r[R.latency]);
          (bytesBy[key] ??= []).push(r[R.bytes]);
        }
      }
    });
    const commits = background.filter((x) => x.scheduledAt >= w.from && x.scheduledAt < w.to && x.outcome === "committed");
    const commit = new Histogram();
    for (const c of commits) commit.recordMs(c.latencyMs);
    const matched = baseline ? matchedBaseline(baseline, w.from - ctx.traceStart, w.to - ctx.traceStart) : null;
    const lag = new Histogram();
    for (const l of lagRows) if (l.at >= w.from && l.at < w.to) lag.recordMs(l.lagMs);
    const elus = new Map<number, number[]>();
    for (const e of workerElu) if (e.t >= w.from && e.t < w.to) (elus.get(e.worker) ?? elus.set(e.worker, []).get(e.worker)!).push(e.elu);
    const workerEluMean = [...elus.values()].map((v) => mean(v)!);
    const mainEluMean = mean(mainElu.filter((e) => e.t >= w.from && e.t < w.to).map((e) => e.elu));
    const eng = engineSamples.filter((e) => e.t >= w.from && e.t < w.to);
    const maxWorkerElu = workerEluMean.length ? Math.max(...workerEluMean) : null;
    const maint = (ctx.maintenance.events ?? []).filter((e: any) => e.t >= w.from && e.t < w.to && (lane !== "datomic" || (e.completed === true && e.requestedAtMs >= w.from && e.completedAtMs < w.to))).length;
    const marks = watermarkSamples.filter((s) => s.t >= w.from && s.t < w.to).map((s) => s.marks["source"] ?? 0);
    return {
      phase: phase.name, readers: phase.readers, mode: phase.mode, windowS: Math.round(secs * 10) / 10, overlapsBurst: phase.overlapsBurst,
      reads, correct, violations, errors, goodputPerS: correct / secs, read: read.summary(),
      hotShare: reads ? hotReads / reads : null, basisMix: { latest: byBasis[0], lastHour: byBasis[1], pastValidTime: byBasis[2] },
      split: { reads: splitReads, straddledATraceCommand: splitForced, straddledCorrect: splitCorrect },
      routing: { routes, languages, fallbackShare: reads ? (routes["fallback"] ?? 0) / reads : null, waitedReads: waited, watermarkWaitMs: 10 },
      buckets: Object.fromEntries(Object.entries(buckets).map(([k, h]) => [k, { ...h.summary(), meanBytes: mean(bytesBy[k]!) }])),
      writer: { commits: commits.length, commit: commit.summary(), maxLatencyMs: commits.length ? Math.max(...commits.map((c) => c.latencyMs)) : null, matchedZeroReader: matched },
      feedLag: lag.summary(),
      maintenanceEvents: maint,
      watermarks: marks.length ? { source: { min: coordinate(Math.min(...marks)), max: coordinate(Math.max(...marks)) } } : null,
      client: { workerEluMean, maxWorkerElu, mainElu: mainEluMean, saturated: (maxWorkerElu ?? 0) > 0.9 || (mainEluMean ?? 0) > 0.9 },
      engine: { containers: Object.fromEntries(containers.map(name => [name, { cpuPercentMean: mean(eng.map(e => e.containers[name]?.cpuPercent).filter((n): n is number => n !== undefined)) }])), cpuPercentMean: mean(eng.map((e) => e.cpuPercent)), samples: eng.length, peakMemBytes: eng.length ? Math.max(...eng.map((e) => e.memBytes)) : null },
      _read: read,
      _commit: commit,
    };
  };
  const stats: Record<string, any> = {};
  for (const phase of ctx.phases) if (phase.end && phase.measured) stats[phase.name] = levelStats(phase);
  const strip = (s: any) => { if (!s) return s; const { _read, _commit, ...rest } = s; return rest; };
  const L = (n: string) => stats[n];

  // ---------------- P1
  const writerRatio = (s: any) => {
    if (!s) return null;
    const m = s.writer.matchedZeroReader;
    if (m?.p99Ms) return { value: ratio(s.writer.commit.p99Ms, m.p99Ms), basis: "matched zero-reader run, same trace-time window" };
    return { value: ratio(s.writer.commit.p99Ms, L("baseline")?.writer.commit.p99Ms), basis: "UNMATCHED: in-run baseline phase (different trace segment); cannot close NS.P1" };
  };
  const recovery = recoveryWindows(ctx.phases.find((p) => p.name === "recovery"), L("L256"), baseline, ctx.traceStart);
  const ladder = ["L1", "L4", "L16", "L64", "L256", "L1024"].map(L).filter(Boolean);
  const r256 = writerRatio(L("L256")), r1024 = writerRatio(L("L1024"));
  const unmatched = (r: any) => (r?.basis?.startsWith("UNMATCHED") ? false : null);
  const p1 = {
    ladder: ladder.map(strip),
    recovery,
    writerWaitAttribution: { method: "matched-phase comparison against the zero-reader run of the same trace", baselineRun: config.baselineWrites, engineWaitEvidence: lane === "xtdb" ? "none exposed: XTDB has no read-path locks (TARGETS 1.1 P1 item 5)" : lane === "datomic" ? "not exposed: Datomic transactor/write-queue wait metrics unavailable" : "not exposed: no QLever broker queue in this composition" },
    bars: [
      bar("NS-P1-VIOLATIONS-MAX (L256)", L("L256")?.violations ?? null, "= 0", L("L256") ? L("L256").violations === 0 : null),
      bar("NS-P1-GOODPUT-256-VS-64", ratio(L("L256")?.goodputPerS, L("L64")?.goodputPerS), ">= 1.0", L("L256") && L("L64") ? L("L256").goodputPerS >= L("L64").goodputPerS : null),
      bar("NS-P1-READ-P99-256-MS", L("L256")?.read.p99Ms ?? null, "<= 100", L("L256")?.read.p99Ms != null ? L("L256").read.p99Ms <= 100 : null),
      bar("NS-P1-WRITER-P99-RATIO-256", r256?.value ?? null, "<= 1.25", unmatched(r256) ?? (r256?.value != null ? r256.value <= 1.25 : null), r256?.basis),
      bar("NS-P1-WRITER-WAIT-MAX-MS (L256)", L("L256")?.writer.maxLatencyMs ?? null, "<= 2000", L("L256")?.writer.maxLatencyMs != null ? L("L256").writer.maxLatencyMs <= 2000 : null),
      bar("NS-P1-VIOLATIONS-MAX (L1024)", L("L1024")?.violations ?? null, "= 0", L("L1024") ? L("L1024").violations === 0 : null),
      bar("NS-P1-GOODPUT-1024-VS-256", ratio(L("L1024")?.goodputPerS, L("L256")?.goodputPerS), ">= 0.9", ratio(L("L1024")?.goodputPerS, L("L256")?.goodputPerS) !== null ? ratio(L("L1024")?.goodputPerS, L("L256")?.goodputPerS)! >= 0.9 : null),
      bar("NS-P1-WRITER-P99-RATIO-1024", r1024?.value ?? null, "<= 2.0", unmatched(r1024) ?? (r1024?.value != null ? r1024.value <= 2 : null), r1024?.basis),
      bar("NS-P1-RECOVERY-MS", recovery?.recoveredAfterMs ?? null, "<= 60000", recovery ? recovery.recoveredAfterMs !== null && recovery.recoveredAfterMs <= 60_000 : null, recovery?.note ?? undefined),
      bar("1.1 P1.1 hot-set share of reads (min over ladder levels)", ladder.length ? Math.min(...ladder.map((s) => s.hotShare ?? 0)) : null, ">= 0.5", ladder.length ? ladder.every((s) => (s.hotShare ?? 0) >= 0.5) : null),
      bar("1.1 P1.2 split reads straddling a frozen-trace command, all correct", ladder.reduce((s, x) => s + x.split.straddledATraceCommand, 0), "> 0 and all correct", ladder.length ? ladder.some((s) => s.split.straddledATraceCommand > 0) && ladder.every((s) => s.split.straddledATraceCommand === s.split.straddledCorrect) : null, "step 1 before the trace command's ACK, step 2 after; the driver adds no writes (RULINGS Q31b)"),
      bar("4.1.5 fallback share per window (reported)", ladder.map((s) => s.routing.fallbackShare), "reported", null, "one-engine composition: every read is served by the source of truth's own surface"),
      bar("1.1 P1.3 a maintenance event in every P1 window", ladder.map((s) => s.maintenanceEvents), "every window >= 1", ladder.length ? ladder.every((s) => s.maintenanceEvents >= 1) : null, lane === "datomic" ? "completed request-index job with request/completion timestamps inside the measured window" : "observed in engine logs only; the driver cannot force compaction or a rebuild yet (seam)"),
    ],
  };

  // ---------------- P2
  const bands = (rows: any[]) => Object.fromEntries(["5-10", "11-25", "26-50"].map((b) => { const h = new Histogram(); for (const w of rows) if (bandOf(w.facts) === b) h.recordMs(w.latencyMs); return [b, h.summary()]; })) as Record<string, any>;
  const committed = background.filter((w) => w.outcome === "committed");
  const l256 = ctx.phases.find((p) => p.name === "L256");
  const in256 = l256?.end ? committed.filter((w) => w.scheduledAt >= windowOf(l256).from && w.scheduledAt < windowOf(l256).to) : [];
  const b256 = bands(in256);
  const byOutcome = countBy(writes.filter((w) => !w.resend).map((w) => `${w.stream}:${w.outcome ?? "unaccounted"}`));
  const unaccounted = writes.filter((w) => (w.outcome ?? "unaccounted") === "unaccounted").length + ctx.pendingAtEnd;
  const ryowRows = records.map((r, k) => ({ r, v: verdicts[k]! })).filter((x) => x.r[R.phase] === PHASE_RYOW);
  const ryowHist = new Histogram();
  for (const x of ryowRows) ryowHist.recordMs(x.r[R.latency]);
  const ryowOk = ryowRows.filter((x) => x.v.ok).length;
  const dupConsidered = resends.filter((r) => r.result !== "original-not-committed");
  const dupOk = dupConsidered.filter((r) => r.result === "already-committed-original" || r.result === "resolved-by-command").length;
  const lostOk = lostAck.filter((r) => r.resolvedOriginal && r.retryTag !== "COMMITTED-AGAIN").length;
  const progress = p2Progress(background, ctx.traceStart);
  const probeHist = new Histogram();
  for (const w of writes) if (w.stream === "probe10" && w.outcome === "committed") probeHist.recordMs(w.latencyMs);
  const p2 = {
    bandsAtL256: b256, bandsAll: bands(committed), bandsSteady: bands(committed.filter((w) => !w.burst)), bandsBurst: bands(committed.filter((w) => w.burst)),
    accounting: { byStreamAndOutcome: byOutcome, resendsByResult: countBy(resends.map((r) => r.result)), unaccounted, pendingAtEnd: ctx.pendingAtEnd, errorTags: countBy(writes.flatMap((w) => w.tags ?? [])) },
    readYourOwnWrite: { pulls: ryowRows.length, correct: ryowOk, pull: ryowHist.summary(), failures: ryowRows.filter((x) => !x.v.ok).slice(0, 5).map((x) => ({ kind: x.v.kind, subject: x.r[R.subject], position: x.r[R.basisPosition] })) },
    duplicates: { resends: resends.length, considered: dupConsidered.length, returnedOriginal: dupOk },
    lostAck: { simulated: lostAck.length, returnedOriginal: lostOk, retryTags: countBy(lostAck.map((r) => r.retryTag)) },
    probe10Diagnostic: { note: "diagnostic only (TARGETS 1.1 P2 item 2); overlay stream, not part of any bar", commit: probeHist.summary() },
    progress,
    bars: [
      bar("NS-P2 5-10 band p50 ms (L256)", b256["5-10"].p50Ms, "<= 10", b256["5-10"].p50Ms != null ? b256["5-10"].p50Ms <= 10 : null),
      bar("NS-P2 5-10 band p99 ms (L256)", b256["5-10"].p99Ms, "<= 50", b256["5-10"].p99Ms != null ? b256["5-10"].p99Ms <= 50 : null),
      bar("NS-P2 11-25 band p50 ms (L256)", b256["11-25"].p50Ms, "<= 10", b256["11-25"].p50Ms != null ? b256["11-25"].p50Ms <= 10 : null),
      bar("NS-P2 11-25 band p99 ms (L256)", b256["11-25"].p99Ms, "<= 50", b256["11-25"].p99Ms != null ? b256["11-25"].p99Ms <= 50 : null),
      bar("NS-P2 26-50 band p99 ms (L256, provisional)", b256["26-50"].p99Ms, "<= 100", b256["26-50"].p99Ms != null ? b256["26-50"].p99Ms <= 100 : null),
      bar("NS-P2 every offered command accounted", unaccounted, "= 0", unaccounted === 0),
      bar("NS-P2 every oracle-valid trace command published", `${progress.validPublished}/${progress.validOffered}`, "all", progress.validOffered > 0 && progress.validPublished === progress.validOffered),
      bar("NS-P2 typed rejections only for deliberately invalid commands", progress.typedRejections, "= 0 (the trace holds no invalid commands yet)", progress.typedRejections === 0),
      bar("NS-P2 typed conflicts only where the oracle finds a CAS race", progress.typedConflicts, "= 0 (serial per subject: the trace has no CAS race)", progress.typedConflicts === 0),
      bar("NS-P2 steady-state queue <= 2 s of offered rate", progress.queue.steadyMax, `<= ${progress.queue.steadyBound.toFixed(2)} commands`, progress.queue.steadyMax !== null ? progress.queue.steadyMax <= progress.queue.steadyBound : null),
      bar("NS-P2 queue drains within 60 s after each burst", progress.queue.drains.map((d: any) => d.drainS), "every burst <= 60 s", progress.queue.drains.length ? progress.queue.drains.every((d: any) => d.drainS !== null && d.drainS <= 60) : null),
      bar("NS-P2 read-your-own-write at the returned tx", ryowRows.length ? ryowOk / ryowRows.length : null, "= 1.0", ryowRows.length ? ryowOk === ryowRows.length : null),
      bar("NS-P2 duplicates return the original receipt", dupConsidered.length ? dupOk / dupConsidered.length : null, "= 1.0", dupConsidered.length ? dupOk === dupConsidered.length : null),
      bar("NS-P2 lost ACKs return the original receipt", lostAck.length ? lostOk / lostAck.length : null, "= 1.0", lostAck.length ? lostOk === lostAck.length : null),
    ],
  };

  // ---------------- P3
  const f = feed!;
  const lagAll = new Histogram(), lagAck = new Histogram();
  for (const l of lagRows) { lagAll.recordMs(l.lagMs); if (l.lagFromAckMs !== null) lagAck.recordMs(l.lagFromAckMs); }
  // A gap is a position the consumer passed (at or below its final checkpoint) without delivering it. Positions
  // acknowledged after the consumer stopped are reported separately, never as gaps.
  let gaps = 0;
  const gapSample: number[] = [];
  const notReached: number[] = [];
  for (const [position] of ackOf) {
    if (f.firstSeen.has(position)) continue;
    if (position > f.checkpoint) { notReached.push(position); continue; }
    gaps++;
    if (gapSample.length < 10) gapSample.push(position);
  }
  const visibleDup = f.visibleDuplicateEffects();
  const lag256 = L("L256")?.feedLag ?? null;
  const crashes = f.crashReport();
  const replayOk = ctx.replay.exact && f.counts.redeliveryMismatches === 0;
  const p3 = {
    consumer: f.name, cursor: { epoch: f.epoch, position: coordinate(f.checkpoint) }, counts: f.counts, gaps, gapSample, notReachedAtStop: { count: notReached.length, sample: notReached.sort((a, b) => a - b).slice(0, 10), wind: feedWind }, visibleDuplicateEffects: visibleDup, crashes, replay: ctx.replay,
    lag: { fromCommitInstant: lagAll.summary(), fromDriverAck: lagAck.summary(), atL256: lag256, commitTime: "producer publication record (bound host/boot hrtime; observer required); 'known' = durable affected-set + checkpoint write" },
    expectedAffected: "direct subjects from command intent; dependency-rule subjects (O-DOMAIN) are a seam: the trace writes only own entities, so expected = {subject}",
    bars: [
      bar("NS-P3 gaps", gaps, "= 0", gaps === 0),
      bar("NS-P3 per-subject order violations", f.counts.orderViolations, "= 0", f.counts.orderViolations === 0),
      bar("NS-P3 visible duplicate effects", visibleDup, "= 0", visibleDup === 0, `replay attempts (allowed): ${f.counts.replayAttempts}`),
      bar("NS-P3 resume from checkpoint replays exactly", replayOk, "= true", replayOk),
      bar("NS-P3 crash injection at three points", crashes.filter((c) => c.fired).length, "= 3", crashes.filter((c) => c.fired).length === 3),
      bar("NS-P3 lag p99 ms at L256", lag256?.p99Ms ?? null, "<= 250", feedLagWithinBar(lag256?.p99Ms)),
      bar("NS-P3 affected-subject set matches", f.counts.affectedMismatches, "= 0", f.counts.affectedMismatches === 0),
      bar("NS-P3 corrections report their valid-time range", f.counts.corrections ? f.counts.correctionRangeReported / f.counts.corrections : null, "= 1.0", f.counts.corrections ? f.counts.correctionRangeReported === f.counts.corrections : null),
    ],
  };

  // ---------------- P4
  const mix = L("p4mix"), h1 = L("p4h1"), h3 = L("p4h3"), h10 = L("p4h10");
  const best = ladder.slice().sort((a, b) => b.goodputPerS - a.goodputPerS)[0];
  const cpu = cpuUse();
  const largest = mix?.buckets["bucket:large"];
  const phaseBytes = (s: any) => { const idx = ctx.phases.find((p) => p.name === s?.phase)?.idx; return mean(records.filter((r, k) => r[R.phase] === idx && verdicts[k]!.ok).map((r) => r[R.bytes])); };
  const quotaRate = best && engineCpus ? best.goodputPerS / engineCpus : null;
  const p4 = {
    weightedMix: mix ? { read: mix.read, buckets: mix.buckets } : null,
    history: { sampleSubjects: ctx.historyList.length, growth: ctx.phases.filter((p) => p.history).map((p) => p.history), depth1: h1?.read ?? null, depth3: h3?.read ?? null, depth10: h10?.read ?? null, clientBytes: { depth1: phaseBytes(h1), depth3: phaseBytes(h3), depth10: phaseBytes(h10) }, engineBytesRead: "not measured: neither engine exposes bytes read per query here (seam)" },
    throughput: { bestLevel: best?.phase ?? null, goodputPerS: best?.goodputPerS ?? null, engineCpuQuotaCores: engineCpus, pullsPerSPerQuotaCore: quotaRate, engineCpuPercentMean: best?.engine.cpuPercentMean ?? null, pullsPerSPerUsedCore: best?.engine.cpuPercentMean ? best.goodputPerS / (best.engine.cpuPercentMean / 100) : null, hostClientCpu: cpu, hostBrokerCpu: "none in this composition (no broker process)" },
    bars: [
      bar("NS-P4 weighted-mix pull p50 ms", mix?.read.p50Ms ?? null, "<= 5", mix?.read.p50Ms != null ? mix.read.p50Ms <= 5 : null),
      bar("NS-P4 weighted-mix pull p99 ms", mix?.read.p99Ms ?? null, "<= 25", mix?.read.p99Ms != null ? mix.read.p99Ms <= 25 : null),
      bar("NS-P4 largest bucket p99 ms (provisional)", largest?.p99Ms ?? null, "<= 50", largest?.p99Ms != null ? largest.p99Ms <= 50 : null),
      bar("NS-P4 pulls/s per engine core (CPU quota)", quotaRate, ">= 1100", quotaRate !== null ? quotaRate >= 1100 : null),
      bar("NS-P4 history flatness p99 depth10 / depth1", ratio(h10?.read.p99Ms, h1?.read.p99Ms), "<= 1.1", ratio(h10?.read.p99Ms, h1?.read.p99Ms) !== null ? ratio(h10?.read.p99Ms, h1?.read.p99Ms)! <= 1.1 : null),
      bar("NS-P4 history flatness bytes read depth10 / depth1", null, "<= 1.1", null, "engine bytes read are not measured (seam); client-observed bytes are reported"),
    ],
  };

  // ---------------- P5
  const sweepPhase = ctx.phases.find((p) => p.name === "sweep" && p.sweep);
  let p5: any = { status: "not-run" };
  if (sweepPhase) {
    const s = sweepPhase.sweep;
    const rows = records.map((r, k) => ({ r, v: verdicts[k]! })).filter((x) => x.r[R.phase] === sweepPhase.idx + SWEEP_PHASE_OFFSET);
    const h = new Histogram();
    for (const x of rows) h.recordMs(x.r[R.latency]);
    const pulled = new Set(rows.map((x) => x.r[R.subject]));
    const rate = rows.length / (s.wallMs / 1000);
    const mutatedOk = s.mutatedAfterCapture.filter((subject: number) => rows.some((x) => x.r[R.subject] === subject && x.v.ok)).length;
    const pre = L("presweep"), during = L("sweep");
    const exact = pulled.size === s.subjects && rows.length === s.subjects;
    p5 = {
      status: "FAIL-CLOSED (evaluate and publish seams)",
      sweep: { ...s, pulled: rows.length, distinctSubjects: pulled.size, exactCoverage: exact, correctAtBasis: rows.filter((x) => x.v.ok).length, violations: rows.filter((x) => !x.v.ok && x.v.kind !== "error").length, errors: rows.filter((x) => x.v.kind === "error").length, pull: h.summary(), pullsPerS: rate, fetchOnlyWallFor100kS: 100_000 / Math.max(rate, 1e-9), mutatedSubjectsAtBasis: mutatedOk },
      live: { presweep: pre ? { read: pre.read, commit: pre.writer.commit } : null, duringSweep: during ? { read: during.read, commit: during.writer.commit } : null },
      bars: [
        bar("NS-P5 sweep evaluates the release (W0) and publishes through the outbox", false, "= true", false, `${EVALUATE_SEAM.reason}; ${PUBLISH_SEAM.reason}`),
        bar("NS-P5 wall s for 100k subjects incl. evaluation and publication", null, "<= 100", false, `fetch-only diagnostic: ${(100_000 / Math.max(rate, 1e-9)).toFixed(0)} s extrapolated`),
        bar("NS-P5 exact coverage", exact, "= true", exact),
        bar("NS-P5 post-capture mutations do not leak into the sweep", `${mutatedOk}/${s.mutatedAfterCapture.length}`, "all at basis", mutatedOk === s.mutatedAfterCapture.length),
        bar("NS-P5 live read p99 during sweep / presweep", ratio(during?.read.p99Ms, pre?.read.p99Ms), "<= 1.5", ratio(during?.read.p99Ms, pre?.read.p99Ms) !== null ? ratio(during?.read.p99Ms, pre?.read.p99Ms)! <= 1.5 : null),
        bar("NS-P5 writer commit p99 during sweep / presweep", ratio(during?.writer.commit.p99Ms, pre?.writer.commit.p99Ms), "<= 1.5", ratio(during?.writer.commit.p99Ms, pre?.writer.commit.p99Ms) !== null ? ratio(during?.writer.commit.p99Ms, pre?.writer.commit.p99Ms)! <= 1.5 : null),
        bar("NS-P5 throttled variant overlapping compaction", null, "run", false, s.throttledVariant.reason),
      ],
    };
  }

  const saturated = Object.values(stats).filter((s: any) => s.client.saturated).map((s: any) => s.phase);
  const total = records.length, ok = verdicts.filter((v) => v.ok).length, errs = verdicts.filter((v) => v.kind === "error").length;
  report.correctness = { reads: total, correct: ok, violations: total - ok - errs, errors: errs, violationKinds, violationSample, rule: "a read is correct when its :placement/stamp and whole-world multiset digest equal the expected-state model at the basis the driver requested (receipt instant R, valid time V); errors and wrong answers are never goodput" };
  report.client = { saturatedPhases: saturated, invalid: saturated.length > 0, processCpu: cpu, readerThreads: config.zeroReaders ? 0 : config.readerThreads, rule: "INVALID when a reader worker or the main thread has mean event-loop utilization > 0.9 in a measured window" };
  report.phases = ctx.phases.map((p) => ({ ...p, stats: strip(stats[p.name]) }));
  report.priorities = { P1: p1, P2: p2, P3: p3, P4: p4, P5: p5 };
  report.compositionIdentity = { ...report.composition, watermarkSamples: watermarkSamples.length, note: "image digest, config hash and slot per assignment are bound by the gate (lab/bin/gate.mjs NS)" };
  report.secondary = { bulkLane: "not measured (seed uses the bulk lane without live reads)", retroactiveCorrections: p3.bars[7], explainAtOldBasis: "past-valid-time reads are 5% of the P1 mix; bit-for-bit audit repeats are not measured" };
  report.histograms = Object.fromEntries(Object.entries(stats).flatMap(([name, s]: any) => [[`${name}.read`, s._read.toJSON()], [`${name}.commit`, s._commit.toJSON()]]));
}
/** TARGETS 1.1 P2 item 4 (RULINGS Q31a): progress and bounded outstanding work. */
function p2Progress(background: any[], traceStart: number) {
  const p = { ...TRACE_DEFAULTS, burstMultiplier: config.burstMultiplier, steadyFactsPerS: TRACE_DEFAULTS.steadyFactsPerS * config.rateScale };
  const steadyRate = p.steadyFactsPerS / (p.sizeClasses.reduce((s, c) => s + c.share * ((c.min + c.max) / 2), 0));
  const steadyBound = 2 * steadyRate;
  const traceS = (t: number) => (t - traceStart) / 1000;
  const afterBurst = (s: number) => { for (let b = p.firstBurstAtS; b <= s; b += p.burstPeriodS) if (s < b + p.burstDurationS + 60) return true; return false; };
  const steady = queueSamples.filter((q) => !afterBurst(traceS(q.t)));
  const drains: any[] = [];
  const lastS = queueSamples.length ? traceS(queueSamples.at(-1)!.t) : 0;
  for (let b = p.firstBurstAtS; b + p.burstDurationS < lastS; b += p.burstPeriodS) {
    const end = b + p.burstDurationS;
    const back = queueSamples.find((q) => traceS(q.t) >= end && q.background <= steadyBound);
    const peak = Math.max(0, ...queueSamples.filter((q) => traceS(q.t) >= b && traceS(q.t) < end + 60).map((q) => q.background));
    drains.push({ burstAtS: b, peakQueued: peak, drainS: back ? traceS(back.t) - end : null });
  }
  const valid = background; // every frozen-trace command is oracle-valid by construction (no deliberately invalid commands yet)
  return {
    validOffered: valid.length,
    validPublished: valid.filter((w) => w.outcome === "committed").length,
    typedRejections: valid.filter((w) => w.outcome === "typed-rejection").length,
    typedConflicts: valid.filter((w) => w.outcome === "typed-conflict").length,
    invalidCommandsInTrace: 0,
    queue: {
      steadyRateCommandsPerS: steadyRate, steadyBound, steadySamples: steady.length, steadyMax: steady.length ? Math.max(...steady.map((q) => q.background)) : null,
      drains,
      series: queueSamples.map((q) => [Math.round(traceS(q.t) * 10) / 10, q.background, q.all]),
      seriesFields: ["traceS", "backgroundQueuedOrInFlight", "allStreamsQueuedOrInFlight"],
    },
  };
}
function loadBaselineWrites(): any[] | null {
  if (!config.baselineWrites) return null;
  return readLatencyRun(config.baselineWrites, { lane, encoding: "ndjson", expectedMode: report.qleverConnectionMode }).unwrap().records.filter((w) => w.stream === "background" && !w.resend);
}
function matchedBaseline(rows: any[], fromOffset: number, toOffset: number) {
  const h = new Histogram();
  for (const w of rows) if (w.offsetMs >= fromOffset && w.offsetMs < toOffset && w.outcome === "committed") h.recordMs(w.latencyMs);
  return { commits: h.count, p50Ms: h.percentileMs(50), p99Ms: h.percentileMs(99) };
}
/** Load contract: 30 s windows sliding by 5 s after stress; recovery = end of the first window meeting every 256-level bar. */
function recoveryWindows(phase: any, l256: any, baseline: any[] | null, traceStart: number) {
  if (!phase?.end) return null;
  const width = Math.min(30_000, phase.end - phase.start), step = 5_000;
  const windows: any[] = [];
  let recoveredAfterMs: number | null = null;
  for (let from = phase.start; from + width <= phase.end + 1; from += step) {
    const to = from + width;
    const h = new Histogram();
    let violations = 0;
    for (const r of records) {
      if (r[R.phase] !== phase.idx || r[R.start] < from || r[R.start] + r[R.latency] > to) continue;
      const v = judgeRead(r);
      if (v.ok) h.recordMs(r[R.latency]); else if (v.kind !== "error") violations++;
    }
    const ch = new Histogram();
    for (const x of writes) if (x.stream === "background" && !x.resend && x.scheduledAt >= from && x.scheduledAt < to && x.outcome === "committed") ch.recordMs(x.latencyMs);
    const matched = baseline ? matchedBaseline(baseline, from - traceStart, to - traceStart) : null;
    const readP99 = h.percentileMs(99), commitP99 = ch.percentileMs(99);
    const goodput = h.count / (width / 1000);
    const meets = violations === 0 && readP99 !== null && readP99 <= 100 && (l256 ? goodput >= 0.9 * l256.goodputPerS : true) && (matched?.p99Ms ? commitP99 !== null && commitP99 <= 1.25 * matched.p99Ms : false);
    windows.push({ fromS: (from - phase.start) / 1000, reads: h.count, violations, readP99Ms: readP99, commitP99Ms: commitP99, matchedZeroReaderP99Ms: matched?.p99Ms ?? null, meets });
    if (meets && recoveredAfterMs === null) recoveredAfterMs = to - phase.start;
  }
  return { windows, recoveredAfterMs, note: baseline ? null : "no matched zero-reader run: the writer part of the 256-level bar cannot be judged, so recovery cannot be shown" };
}
function cpuUse() {
  if (cpuMarks.length < 2) return null;
  const a = cpuMarks[0]!, b = cpuMarks.at(-1)!;
  const wallUs = (b.t - a.t) * 1000;
  return { userCores: (b.cpu.user - a.cpu.user) / wallUs, kernelCores: (b.cpu.system - a.cpu.system) / wallUs, hostCores: os.cpus().length };
}

// ---------------------------------------------------------------- oracle (independent sample check at the driver-recorded basis)

function runOracle(finalPosition: number, lastAcked: number) {
  if (!config.oracleRoot) return { status: "NOT-RUN", reason: "no --oracle-root (the gate extracts O-REPLAY from exp/O01-replay-oracle)" };
  const reads: OracleSampleRead[] = oracleSamples.filter((s) => s.phase >= 0).slice(0, config.oracleMaxReads).map((s) => ({ subject: s.subject, basis: s.basis, rows: s.rows }));
  if (!reads.length) return { status: "NOT-RUN", reason: "no sampled reads" };
  const caseDoc = buildCase({ caseId: `NS/${runTag}`, commands: recordedCommands, lastPosition: Math.max(finalPosition, lastAcked), reads });
  const result = checkWithOracle({ oracleRoot: config.oracleRoot, dir: rawDir, caseDoc, reads });
  const modelAgrees = reads.filter((r) => {
    const rec = records.find((x) => x[R.subject] === r.subject && x[R.recordedAt] === r.basis.recordedAt && x[R.validAt] === r.basis.validAt);
    return rec ? judgeRead(rec).ok : false;
  }).length;
  return { ...result, modelCorrectOnSameReads: modelAgrees, recordedCommands: recordedCommands.length };
}

main();

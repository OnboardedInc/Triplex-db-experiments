#!/usr/bin/env node
/**
 * NS north-star benchmark driver (EXP-N01). Measures TARGETS section 1 (P1 to P5) on the fixed
 * writer trace of TARGETS section 2 against one Triplex runtime, and writes one report JSON.
 * Normally run by `node lab/bin/gate.mjs NS --lane L --rung R`, which binds the report into a receipt.
 *
 *   node lab/bench/driver.ts --lane xtdb|qlever --rung 10k|100k|1m|10m --output runs/NS/<id>/ns-report.json
 *     [--composition public] [--seed ns-v1] [--phase-scale 1] [--reader-threads 4]
 *     [--seed-budget-s 3600] [--seed-batch-facts 400] [--writer-max-inflight 32]
 *     [--sweep-concurrency 16] [--oracle-root DIR] [--subjects N (development only)]
 *
 * Engine endpoint comes from XTDB_URL / QLEVER_URL. TX2_ENGINE_CONTAINER names the container whose
 * CPU is sampled (docker stats over the lab docker socket only).
 * See lab/bench/README.md for the trace, the composition interface, metric names and report fields.
 */
import { execFile } from "node:child_process";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { Worker } from "node:worker_threads";
import { openComposition, type CompositionHandle, type Receipt } from "./lib/composition.ts";
import { buildTraceCommand, type SubjectState } from "./lib/commands.ts";
import { Histogram } from "./lib/hist.ts";
import { Model, deltaOf } from "./lib/model.ts";
import { R, observe, type ReadRecord } from "./lib/observe.ts";
import { buildCase, checkWithOracle, type OracleSampleRead } from "./lib/oracle.ts";
import { nsPlan, type PhaseSpec } from "./lib/phases.ts";
import { hash2 } from "./lib/rng.ts";
import { OpenLoopScheduler, type JobResult } from "./lib/scheduler.ts";
import { receiptOfRecord, seedRung, type RecordedCommand } from "./lib/seed.ts";
import { TRACE_DEFAULTS, generateTrace, inBurst, traceDigest, traceStats, type TraceEvent } from "./lib/trace.ts";
import { RUNGS, accountsFor, ids, panelOf, populationCounts, subjectOf } from "./lib/world.ts";
import { REPO } from "./lib/triplex.ts";

// ---------------------------------------------------------------- arguments

const argv = process.argv.slice(2);
const opt = (name: string, fallback?: string) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : fallback;
};
const lane = opt("lane") as "xtdb" | "qlever";
const rung = opt("rung", "10k")!;
const devSubjects = opt("subjects");
if (!["xtdb", "qlever"].includes(lane)) throw new Error("--lane xtdb|qlever is required");
if (!devSubjects && !(rung in RUNGS)) throw new Error(`--rung must be one of ${Object.keys(RUNGS).join("|")}`);
const rungSubjects = devSubjects ? Number(devSubjects) : RUNGS[rung]!;
const output = path.resolve(opt("output") ?? "");
if (!output.startsWith(path.join(REPO, "runs") + path.sep)) throw new Error("--output must be under runs/");
const rawDir = path.dirname(output);
fs.mkdirSync(rawDir, { recursive: true });
const config = {
  lane,
  rung: devSubjects ? `dev:${rungSubjects}` : rung,
  rungSubjects,
  devOverride: Boolean(devSubjects || opt("max-readers") || opt("burst-multiplier")),
  maxReaders: opt("max-readers") ? Number(opt("max-readers")) : null,
  burstMultiplier: Number(opt("burst-multiplier", String(TRACE_DEFAULTS.burstMultiplier))),
  composition: opt("composition", "public")!,
  seed: opt("seed", "ns-v1")!,
  phaseScale: Number(opt("phase-scale", "1")),
  readerThreads: Number(opt("reader-threads", "4")),
  seedBudgetS: Number(opt("seed-budget-s", "3600")),
  seedBatchFacts: Number(opt("seed-batch-facts", "400")),
  writerMaxInFlight: Number(opt("writer-max-inflight", "32")),
  writerDeadlineMs: Number(opt("writer-deadline-ms", "30000")),
  sweepConcurrency: Number(opt("sweep-concurrency", "16")),
  sweepMax: Number(opt("sweep-max", "100000")),
  oracleSampleSubjects: Number(opt("oracle-subjects", "12")),
  oracleRate: Number(opt("oracle-rate", "0.01")),
  oracleMaxReads: Number(opt("oracle-max-reads", "24")),
  asOfShare: Number(opt("as-of-share", "0.2")),
  firstBurstAtS: Number(opt("first-burst-s", String(TRACE_DEFAULTS.firstBurstAtS))),
  feedCrashAtS: Number(opt("feed-crash-s", String(Math.round(200 * Number(opt("phase-scale", "1")))))),
  oracleRoot: opt("oracle-root") ?? null,
  settleS: 2,
};
const runTag = `ns${Date.now().toString(36)}${randomBytes(2).toString("hex")}`;
const scopeName = `ns-${lane}-${config.rung.replace(/[^a-z0-9]/gi, "")}-${runTag}`;
const t0 = performance.timeOrigin;
const now = () => t0 + performance.now();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const logLines: string[] = [];
const log = (line: string) => {
  const text = `[ns ${new Date().toISOString().slice(11, 19)}] ${line}`;
  logLines.push(text);
  process.stderr.write(text + "\n");
};

const report: Record<string, any> = {
  format: "tx2-ns-report/1",
  status: "RUNNING",
  startedAt: new Date().toISOString(),
  config,
  runTag,
  scope: scopeName,
  host: { cpus: os.cpus().length, platform: `${process.platform}-${process.arch}`, node: process.version, totalMemBytes: os.totalmem() },
};
const save = () => fs.writeFileSync(output, JSON.stringify(report, null, 2) + "\n");

// ---------------------------------------------------------------- engine CPU sampler (async, never blocks the writer)

const slots = JSON.parse(fs.readFileSync(path.join(REPO, "lab/config/slots.json"), "utf8"));
const container = process.env["TX2_ENGINE_CONTAINER"] ?? null;
const engineSamples: { t: number; cpuPercent: number; memBytes: number }[] = [];
let samplerOn = Boolean(container);
const parseBytes = (text: string) => {
  const m = /([\d.]+)\s*([KMGT]?i?B)/.exec(text);
  if (!m) return 0;
  const mult: Record<string, number> = { B: 1, KiB: 1024, MiB: 1024 ** 2, GiB: 1024 ** 3, TiB: 1024 ** 4, kB: 1e3, KB: 1e3, MB: 1e6, GB: 1e9 };
  return Number(m[1]) * (mult[m[2]!] ?? 1);
};
async function engineSampler() {
  while (samplerOn) {
    const t = now();
    await new Promise<void>((resolve) => {
      execFile("docker", ["-H", slots.dockerHost, "stats", "--no-stream", "--format", "{{json .}}", container!], { timeout: 15_000 }, (error, stdout) => {
        if (!error) {
          try {
            const row = JSON.parse(stdout.trim().split("\n")[0]!);
            engineSamples.push({ t, cpuPercent: Number(String(row.CPUPerc).replace("%", "")), memBytes: parseBytes(String(row.MemUsage).split("/")[0]!) });
          } catch {}
        }
        resolve();
      });
    });
    await sleep(1000);
  }
}

// ---------------------------------------------------------------- main-thread utilization

const mainElu: { t: number; elu: number }[] = [];
let lastElu = performance.eventLoopUtilization();
const eluTimer = setInterval(() => {
  const n = performance.eventLoopUtilization();
  mainElu.push({ t: now(), elu: performance.eventLoopUtilization(n, lastElu).utilization });
  lastElu = n;
}, 500);
const cpuMarks: { t: number; cpu: NodeJS.CpuUsage }[] = [];
const markCpu = () => cpuMarks.push({ t: now(), cpu: process.cpuUsage() });

// ---------------------------------------------------------------- state shared by writer, feed and analysis

const model = new Model(rungSubjects);
const accounts = accountsFor(rungSubjects);
const records: ReadRecord[] = [];
const oracleSamples: any[] = [];
const workerElu: { worker: number; t: number; elu: number }[] = [];
const acked: { instant: number; position: number; at: number }[] = [];
const ackByPosition = new Map<number, { at: number; subject: number; seq: number; correction: boolean; validFrom: number; stamp: number }>();
const recordedCommands: RecordedCommand[] = [];
const writes: any[] = [];
const outcomes = new Map<number, any>();
const original = new Map<number, { operations: any[]; meta: any; receipt: Receipt }>();
const lostAck: any[] = [];
const resends: any[] = [];
const ryowPending = new Set<Promise<void>>();
let latestInstant = 0;
const PHASE_RYOW = -2;
/** Sweep pulls carry phase idx + SWEEP_PHASE_OFFSET so live reads of the sweep phase stay separate. */
const SWEEP_PHASE_OFFSET = 1000;

function main() {
  return run().catch((error) => {
    report.status = "ERROR";
    report.error = String(error?.stack ?? error);
    log(`fatal: ${report.error}`);
    save();
    process.exitCode = 1;
  });
}

async function run() {
  save();
  const writer = await openComposition(config.composition, lane, scopeName);
  const ryowComp = await openComposition(config.composition, lane, scopeName);
  report.backend = writer.backend;
  report.compositionName = writer.name;
  if (container) void engineSampler();

  // ---------------------------------------------------------------- seed
  const pop = populationCounts(rungSubjects);
  const samples = chooseSamples(rungSubjects, config.oracleSampleSubjects);
  log(`seed: rung ${config.rung}, ${pop.liveFactsAtSeedEnd} live facts planned, ${pop.seedAssertions} assertions`);
  const seed = await seedRung({
    comp: writer, subjects: rungSubjects, runTag, batchFacts: config.seedBatchFacts, budgetMs: config.seedBudgetS * 1000,
    recordSubjects: new Set(samples), recordAccounts: new Set(samples.map((i) => i % accounts)), log,
  });
  const N = seed.seededSubjects;
  const popN = populationCounts(N, accounts);
  recordedCommands.push(...seed.recorded);
  report.seed = {
    plannedSubjects: rungSubjects, seededSubjects: N, complete: seed.complete, rungAchieved: seed.complete,
    commands: seed.commands, assertions: seed.assertions, retractions: seed.retractions, wallS: seed.wallMs / 1000, factsPerS: seed.factsPerS,
    commitMs: seed.commitMs, failures: seed.failures.slice(0, 20), failureCount: seed.failures.length,
    firstPosition: seed.firstPosition, lastPosition: seed.lastPosition, lastInstant: seed.lastInstant,
    population: { planned: pop, seeded: popN },
    expectedAssertionsSeeded: popN.seedAssertions,
  };
  if (report.seed.expectedAssertionsSeeded !== seed.assertions) log(`seed: WARNING assertions ${seed.assertions} differ from closed form ${report.seed.expectedAssertionsSeeded}`);
  save();
  const state: Map<number, SubjectState> = seed.state;
  const sampleSubjects = samples.filter((i) => i < N);
  latestInstant = seed.lastInstant;
  acked.push({ instant: seed.lastInstant, position: seed.lastPosition, at: now() });

  // ---------------------------------------------------------------- trace
  const params = { ...TRACE_DEFAULTS, firstBurstAtS: config.firstBurstAtS, burstMultiplier: config.burstMultiplier };
  const traceDurationS = 5400;
  const events = generateTrace({ seed: config.seed, subjects: N, durationS: traceDurationS, params });
  report.trace = { params, durationS: traceDurationS, digest: traceDigest(events), generated: traceStats(events) };

  // ---------------------------------------------------------------- reader workers
  const workers: Worker[] = [];
  const ready: Promise<void>[] = [];
  const sweepDone = new Map<number, (v: any) => void>();
  const stopped: Promise<void>[] = [];
  for (let w = 0; w < config.readerThreads; w++) {
    const worker = new Worker(new URL("./reader-worker.ts", import.meta.url), {
      workerData: { lane, scope: scopeName, composition: config.composition, seed: config.seed, worker: w, subjects: N, panels: popN.panels, sampleSubjects, oracleRate: config.oracleRate, asOfShare: config.asOfShare },
      env: process.env,
    });
    workers.push(worker);
    ready.push(new Promise((resolve, reject) => {
      worker.on("message", (msg: any) => {
        if (msg.type === "ready") resolve();
        else if (msg.type === "error") reject(new Error(`reader worker ${w}: ${msg.message}`));
        else if (msg.type === "reads") {
          for (const r of msg.records) records.push(r);
          for (const s of msg.samples) oracleSamples.push(s);
        } else if (msg.type === "elu") workerElu.push({ worker: w, t: msg.t, elu: msg.elu });
        else if (msg.type === "sweep-done") sweepDone.get(msg.phase)?.(msg);
      });
      worker.on("error", reject);
    }));
    stopped.push(new Promise((resolve) => worker.on("message", (m: any) => m.type === "stopped" && resolve())));
  }
  await Promise.all(ready);
  log(`readers: ${config.readerThreads} worker threads ready`);
  const broadcast = () => {
    const recent = acked.slice(-64).map((a) => a.instant);
    for (const w of workers) w.postMessage({ type: "basis", latest: latestInstant, recent });
  };
  broadcast();
  const basisTimer = setInterval(broadcast, 50);
  const setReaders = (phase: number, wantedReaders: number, mode: string) => {
    const readers = config.maxReaders === null ? wantedReaders : Math.min(wantedReaders, config.maxReaders);
    workers.forEach((w, k) => {
      const share = Math.floor(readers / workers.length) + (k < readers % workers.length ? 1 : 0);
      w.postMessage({ type: "level", phase, readers: share, mode });
    });
  };

  // ---------------------------------------------------------------- writer
  const traceStart = now() + 1000;
  report.traceStartAbsMs = traceStart;
  type Job = { key: number; scheduledAt: number; ev: TraceEvent };
  const jobs: Job[] = events.map((ev) => ({ key: ev.subject, scheduledAt: traceStart + ev.atMs, ev }));
  const sampleSet = new Set(sampleSubjects);

  const resolveByCommand = async (commandId: string) => {
    const found = await writer.transactionByCommand(commandId);
    return found.ok && found.value ? receiptOfRecord(found.value) : null;
  };
  const execute = async (job: Job) => {
    const ev = job.ev;
    const out: any = { attempts: 0, tags: [] as string[], path: "direct" };
    outcomes.set(job.ev.seq * 2 + Number(ev.resend), out);
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
      receipt = await resolveByCommand(cmd.commandId);
      if (receipt) { out.path = "resolved-by-command"; break; }
      await sleep(20 * out.attempts);
    }
    if (!receipt) { out.failed = true; return; }
    if (ev.ackLoss) {
      // The client lost this ACK: retry the same command, then resolve it by commandId.
      const retry = await writer.transact(cmd.operations, meta);
      const resolved = await resolveByCommand(cmd.commandId);
      lostAck.push({
        seq: ev.seq,
        retryTag: retry.ok ? "COMMITTED-AGAIN" : retry.tag,
        retryNamesOriginal: !retry.ok && retry.error?.transactionId === receipt.txId,
        resolvedOriginal: resolved?.txId === receipt.txId && resolved?.position === receipt.position,
      });
      out.path = "lost-ack-resolved";
    }
    const pl = ids.placement(ev.subject);
    st.stamp = cmd.newStamp;
    st.stampId = receipt.triples.find((t) => t.entityId === pl && t.attribute === ":placement/stamp")!.id;
    if (cmd.newAddress) {
      st.address = cmd.newAddress;
      st.addressId = receipt.triples.find((t) => t.entityId === ids.worker(ev.subject) && t.attribute === ":worker/address")!.id;
    }
    const at = now();
    model.addCommit(ev.subject, { instant: receipt.instant, position: receipt.position, txId: receipt.txId, stamp: cmd.newStamp, delta: deltaOf(cmd.added, cmd.removed), ackAtMs: at });
    ackByPosition.set(receipt.position, { at, subject: ev.subject, seq: ev.seq, correction: ev.correction, validFrom: cmd.validRange.from, stamp: cmd.newStamp });
    feedAckArrived(receipt.position, at);
    acked.push({ instant: receipt.instant, position: receipt.position, at });
    latestInstant = Math.max(latestInstant, receipt.instant);
    original.set(ev.seq, { operations: cmd.operations, meta, receipt });
    out.position = receipt.position;
    if (sampleSet.has(ev.subject))
      recordedCommands.push({ commandId: cmd.commandId, operations: cmd.operations, preconditions: cmd.preconditions, actor: ev.kind, receipt: { txId: receipt.txId, position: receipt.position, instant: receipt.instant, assertionIds: alignAssertIds(cmd.operations, receipt) } });
    const p = ryow(ryowComp, ev.subject, receipt);
    ryowPending.add(p);
    void p.finally(() => ryowPending.delete(p));
  };
  const resend = async (job: Job, out: any) => {
    const orig = original.get(job.ev.seq);
    if (!orig) { resends.push({ seq: job.ev.seq, result: "original-not-committed" }); out.skipped = true; return; }
    out.attempts = 1;
    const res = await writer.transact(orig.operations, orig.meta);
    let how = "mismatch";
    if (res.ok) how = "COMMITTED-AGAIN";
    else if (res.tag === "CommandAlreadyCommittedError" && res.error?.transactionId === orig.receipt.txId) how = "already-committed-original";
    else {
      const found = await resolveByCommand(orig.meta.commandId);
      if (found?.txId === orig.receipt.txId) how = "resolved-by-command";
    }
    resends.push({ seq: job.ev.seq, result: how, tag: res.ok ? null : res.tag });
  };
  const scheduler = new OpenLoopScheduler<Job>(jobs, {
    maxInFlight: config.writerMaxInFlight,
    deadlineMs: config.writerDeadlineMs,
    now,
    exec: execute,
    onDone: (r: JobResult<Job>) => {
      const ev = r.job.ev;
      const out = outcomes.get(ev.seq * 2 + Number(ev.resend)) ?? {};
      writes.push({ seq: ev.seq, resend: ev.resend, kind: ev.kind, subject: ev.subject, facts: ev.facts, burst: ev.burst, correction: ev.correction, ackLoss: ev.ackLoss,
        scheduledAt: r.job.scheduledAt, startedAt: r.startedAt, finishedAt: r.finishedAt, latencyMs: r.latencyMs, waitMs: r.waitMs, expired: r.expired, ...out });
    },
  });

  // ---------------------------------------------------------------- feed consumer (P3)
  const feed = makeFeed(lane, scopeName, seed.lastPosition);
  let feedHandle = await openComposition(config.composition, lane, scopeName);
  let feedLoopDone = feed.loop(feedHandle);
  const crashTimer = setTimeout(async () => {
    log(`feed: consumer crash at trace ${config.feedCrashAtS}s (checkpoint ${feed.cursor})`);
    await feed.stop();
    await feedLoopDone;
    await feedHandle.close().catch(() => {});
    const checkpoint = feed.cursor;
    fs.writeFileSync(path.join(rawDir, "feed-checkpoint.json"), JSON.stringify({ position: checkpoint, at: now() }) + "\n");
    await sleep(3000);
    const restartAt = now();
    const target = Math.max(...acked.map((a) => a.position));
    feedHandle = await openComposition(config.composition, lane, scopeName);
    feed.resume(checkpoint, restartAt, target);
    feedLoopDone = feed.loop(feedHandle);
  }, Math.max(0, traceStart + config.feedCrashAtS * 1000 - now()));

  // ---------------------------------------------------------------- phases
  const plan = nsPlan(config.phaseScale, config.firstBurstAtS, params.burstDurationS);
  const phases: any[] = [];
  await sleep(Math.max(0, traceStart - now()));
  scheduler.start();
  log(`trace: started (${events.length} events generated for ${traceDurationS}s; offered as phases run)`);
  for (const [idx, spec] of plan.entries()) {
    const start = now();
    markCpu();
    const entry: any = { idx, name: spec.name, readers: spec.readers, start, traceStartS: (start - traceStart) / 1000 };
    phases.push(entry);
    setReaders(idx, spec.readers, spec.mode ?? "mixed");
    log(`phase ${spec.name}: ${spec.readers} readers at trace ${entry.traceStartS.toFixed(0)}s; writer pending ${scheduler.pending}`);
    if (spec.seconds) await sleep(spec.seconds * 1000);
    else if (spec.untilTraceS !== undefined) {
      const until = traceStart + spec.untilTraceS * 1000;
      if (until - now() < 5000) entry.note = `burst window already passed or nearly passed (phase starts at trace ${entry.traceStartS.toFixed(0)}s)`;
      await sleep(Math.max(5000, until - now()));
    } else if (spec.untilIdle) {
      const deadline = now() + (spec.maxS ?? 300) * 1000;
      await sleep(Math.min(5000, (spec.maxS ?? 300) * 1000));
      while (now() < deadline && scheduler.pending > 2) await sleep(500);
      entry.writerPendingAtEnd = scheduler.pending;
    } else if (spec.sweep) {
      const list = sweepList(N, config.sweepMax);
      const basis = { recordedAt: latestInstant, validAt: Math.floor(now()) };
      entry.sweep = { subjects: list.length, basis, concurrency: config.sweepConcurrency };
      const done = new Promise<any>((resolve) => sweepDone.set(idx + SWEEP_PHASE_OFFSET, resolve));
      // The sweep runs on its own worker thread (own connection pool), separate from the live readers.
      const sweeper = new Worker(new URL("./reader-worker.ts", import.meta.url), {
        workerData: { lane, scope: scopeName, composition: config.composition, seed: config.seed, worker: 99, subjects: N, panels: popN.panels, sampleSubjects: [], oracleRate: 0, asOfShare: 0 },
        env: process.env,
      });
      const sweeperStopped = new Promise<void>((resolve) => sweeper.on("message", (m: any) => m.type === "stopped" && resolve()));
      await new Promise<void>((resolve, reject) => {
        sweeper.on("message", (msg: any) => {
          if (msg.type === "ready") resolve();
          else if (msg.type === "error") reject(new Error(msg.message));
          else if (msg.type === "reads") for (const r of msg.records) records.push(r);
          else if (msg.type === "elu") workerElu.push({ worker: 99, t: msg.t, elu: msg.elu });
          else if (msg.type === "sweep-done") sweepDone.get(msg.phase)?.(msg);
        });
      });
      entry.sweep.startedAt = now();
      sweeper.postMessage({ type: "sweep", phase: idx + SWEEP_PHASE_OFFSET, subjects: list, basis, concurrency: config.sweepConcurrency });
      const result = await Promise.race([done, sleep((spec.maxS ?? 1500) * 1000).then(() => null)]);
      entry.sweep.endedAt = now();
      entry.sweep.completed = result !== null;
      entry.sweep.wallMs = result?.wallMs ?? entry.sweep.endedAt - entry.sweep.startedAt;
      sweeper.postMessage({ type: "stop" });
      await Promise.race([sweeperStopped, sleep(35_000)]);
      await sweeper.terminate();
    }
    entry.end = now();
    entry.traceEndS = (entry.end - traceStart) / 1000;
    entry.overlapsBurst = overlapsBurst(entry.traceStartS, entry.traceEndS, params);
    report.phases = phases;
    save();
  }
  markCpu();
  clearTimeout(crashTimer);

  // ---------------------------------------------------------------- wind down
  const endAt = now();
  scheduler.setUntil(endAt);
  scheduler.stop();
  setReaders(-1, 0, "mixed");
  const drainDeadline = now() + 90_000;
  while (scheduler.pending > 0 && now() < drainDeadline) await sleep(250);
  await Promise.race([Promise.all([...ryowPending]), sleep(30_000)]);
  for (const w of workers) w.postMessage({ type: "stop" });
  await Promise.race([Promise.all(stopped), sleep(40_000)]);
  for (const w of workers) await w.terminate();
  clearInterval(basisTimer);
  const lastAcked = Math.max(...acked.map((a) => a.position));
  const feedDeadline = now() + 60_000;
  while (feed.cursor < lastAcked && now() < feedDeadline) await sleep(100);
  await feed.stop();
  await feedLoopDone;
  await feedHandle.close().catch(() => {});
  const replay = await feed.replayCheck(await openComposition(config.composition, lane, scopeName));
  const finalPosition = await writer.currentPosition();
  samplerOn = false;
  clearInterval(eluTimer);
  await writer.close().catch(() => {});
  await ryowComp.close().catch(() => {});
  log(`wind down: writer pending ${scheduler.pending}, feed cursor ${feed.cursor}/${lastAcked}, final position ${finalPosition}`);

  // ---------------------------------------------------------------- analysis
  report.writer = {
    offered: scheduler.offered, completed: scheduler.completed, expired: scheduler.expired, notOffered: scheduler.notOffered,
    maxInFlightSeen: scheduler.maxInFlightSeen, pendingAtEnd: scheduler.pending, offeredUntilTraceS: (endAt - traceStart) / 1000,
  };
  report.finalPosition = finalPosition;
  analyse({ phases, traceStart, N, popN, feed, replay, params });
  // ---------------------------------------------------------------- oracle sample
  report.oracle = runOracle(finalPosition, lastAcked);
  report.status = "DONE";
  report.endedAt = new Date().toISOString();
  fs.writeFileSync(path.join(rawDir, "ns-log.txt"), logLines.join("\n") + "\n");
  save();
  log(`report: ${path.relative(REPO, output)}`);
  setTimeout(() => process.exit(process.exitCode ?? 0), 500).unref();
}

// ---------------------------------------------------------------- helpers

function chooseSamples(n: number, k: number): number[] {
  const out = new Set<number>();
  for (const i of [0, 1, 2]) if (i < n) out.add(i); // one subject per history-panel depth
  for (let j = 0; out.size < Math.min(k, n) && j < 10 * k; j++) out.add(Math.floor(((j + 0.5) * n) / k) % n);
  return [...out].sort((a, b) => a - b);
}
function sweepList(n: number, max: number): number[] {
  const count = Math.min(n, max);
  return Array.from({ length: count }, (_, k) => (count === n ? k : Math.floor((k * n) / count)));
}
function overlapsBurst(fromS: number, toS: number, p: typeof TRACE_DEFAULTS) {
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
    records.push([PHASE_RYOW, subject, basis.recordedAt, basis.validAt, start, performance.now() - t, o.stamp, o.facts, o.digest, o.bytes, pr.depth, pr.roundTrips, null]);
  } catch (error: any) {
    records.push([PHASE_RYOW, subject, basis.recordedAt, basis.validAt, start, performance.now() - t, -1, 0, "", 0, 0, 0, String(error?._tag ?? "Error")]);
  }
}

// ---------------------------------------------------------------- feed consumer

let feedAckArrived: (position: number, at: number) => void = () => {};
function makeFeed(_lane: string, _scope: string, startAfter: number) {
  const seen: [number, string, string, number][] = []; // position, txId, changes digest, seenAt
  const seenBeforeAck = new Map<number, number>();
  const lags: { at: number; lagMs: number }[] = [];
  const lastStamp = new Map<number, number>();
  let orderViolations = 0, duplicates = 0, incompleteChanges = 0, correctionRangesReported = 0, correctionsSeen = 0, seenEarly = 0;
  let stopping = false;
  let resumeInfo: any = null;
  const feed = {
    cursor: startAfter,
    startAfter,
    pages: 0,
    async loop(handle: CompositionHandle) {
      stopping = false;
      while (!stopping) {
        let page;
        try {
          page = await handle.feedPage(feed.cursor, 1000);
        } catch (error: any) {
          await sleep(100);
          continue;
        }
        feed.pages++;
        const at = now();
        for (const tx of page.transactions) process(tx, at);
        if (page.transactions.length) feed.cursor = Math.max(feed.cursor, page.next ?? page.transactions.at(-1).position);
        if (resumeInfo && resumeInfo.caughtUpAt === null && feed.cursor >= resumeInfo.target) resumeInfo.caughtUpAt = at;
        if (!page.transactions.length) await sleep(20);
      }
    },
    async stop() { stopping = true; },
    resume(checkpoint: number, restartAt: number, target: number) {
      feed.cursor = checkpoint;
      resumeInfo = { checkpoint, restartAt, target, caughtUpAt: null };
    },
    async replayCheck(handle: CompositionHandle) {
      const from = resumeInfo?.checkpoint ?? startAfter;
      const replayed: [number, string, string][] = [];
      let cursor = from;
      for (;;) {
        const page = await handle.feedPage(cursor, 1000);
        for (const tx of page.transactions) replayed.push([tx.position, tx.txId, changesDigest(tx)]);
        if (!page.transactions.length || cursor >= feed.cursor) break;
        cursor = page.next ?? page.transactions.at(-1).position;
        if (cursor >= feed.cursor) break;
      }
      await handle.close().catch(() => {});
      const live = seen.filter((s) => s[0] > from && s[0] <= feed.cursor).map((s) => `${s[0]}|${s[1]}|${s[2]}`);
      const again = replayed.filter((s) => s[0] <= feed.cursor).map((s) => `${s[0]}|${s[1]}|${s[2]}`);
      const exact = live.length === again.length && live.every((x, k) => x === again[k]);
      return { from, to: feed.cursor, liveEntries: live.length, replayedEntries: again.length, exact };
    },
    summary(lastAckedPosition: number) {
      let gaps = 0;
      const gapSample: number[] = [];
      for (const [position] of ackByPosition) if (!seenSet.has(position)) { gaps++; if (gapSample.length < 10) gapSample.push(position); }
      return {
        entries: seen.length, pages: feed.pages, startAfter, cursor: feed.cursor, lastAckedPosition,
        gaps, gapSample, duplicates, redelivered, orderViolations, incompleteChanges, seenBeforeAck: seenEarly,
        corrections: { seen: correctionsSeen, validRangeReported: correctionRangesReported },
        resume: resumeInfo ? { ...resumeInfo, catchUpMs: resumeInfo.caughtUpAt === null ? null : resumeInfo.caughtUpAt - resumeInfo.restartAt } : null,
        lags,
      };
    },
  };
  const seenSet = new Set<number>();
  let maxSeen = startAfter, redelivered = 0;
  const process = (tx: any, at: number) => {
    if (seenSet.has(tx.position)) {
      // At-least-once after a resume is allowed; a repeat inside one consumer's life is a violation.
      if (resumeInfo && tx.position > resumeInfo.checkpoint) redelivered++;
      else duplicates++;
      return;
    }
    if (tx.position <= maxSeen) orderViolations++;
    maxSeen = Math.max(maxSeen, tx.position);
    seenSet.add(tx.position);
    seen.push([tx.position, tx.txId, changesDigest(tx), at]);
    const ack = ackByPosition.get(tx.position);
    if (ack) lags.push({ at: ack.at, lagMs: Math.max(0, at - ack.at) });
    else seenBeforeAck.set(tx.position, at);
    for (const c of tx.changes ?? []) {
      if (!c.entityId || !c.attribute || (c.op === "assert" && c.validFrom === undefined)) incompleteChanges++;
      if (c.op === "assert" && c.attribute === ":placement/stamp") {
        const subject = subjectOf(c.entityId)!;
        const stamp = Number(c.value?.value);
        if ((lastStamp.get(subject) ?? 0) >= stamp) orderViolations++;
        lastStamp.set(subject, stamp);
      }
    }
    if (ack?.correction) {
      correctionsSeen++;
      if ((tx.changes ?? []).some((c: any) => c.op === "assert" && c.attribute === ":worker/address" && c.validFrom === ack.validFrom - TRACE_DEFAULTS.correctionBackMs))
        correctionRangesReported++;
    }
  };
  feedAckArrived = (position, at) => {
    const s = seenBeforeAck.get(position);
    if (s !== undefined) {
      seenBeforeAck.delete(position);
      seenEarly++;
      lags.push({ at, lagMs: 0 });
    }
  };
  return feed;
}
function changesDigest(tx: any) {
  const [a, b] = hash2(JSON.stringify(tx.changes ?? []));
  return `${a.toString(16)}${b.toString(16)}`;
}

// ---------------------------------------------------------------- analysis

function windowOf(phase: any) {
  return { from: phase.start + config.settleS * 1000, to: phase.end };
}
function judgeRead(r: ReadRecord) {
  if (r[R.error] !== null) return { ok: false, kind: "error" };
  const exp = model.expected(r[R.subject], r[R.recordedAt]);
  if (r[R.stamp] === exp.stamp && r[R.digest] === exp.digest) return { ok: true, kind: "correct" };
  const late = model.lateArrivals(r[R.subject], r[R.recordedAt], r[R.start]);
  if (r[R.stamp] < exp.stamp) return { ok: false, kind: late > 0 ? "stale-late-arrival" : "stale" };
  if (r[R.stamp] > exp.stamp) return { ok: false, kind: "future" };
  return { ok: false, kind: "wrong-world" };
}
const meanIn = (rows: { t: number; v: number }[]) => (rows.length ? rows.reduce((s, r) => s + r.v, 0) / rows.length : null);

function analyse(ctx: { phases: any[]; traceStart: number; N: number; popN: any; feed: any; replay: any; params: typeof TRACE_DEFAULTS }) {
  const verdicts = records.map((r) => judgeRead(r));
  const violationKinds: Record<string, number> = {};
  const violationSample: any[] = [];
  records.forEach((r, k) => {
    const v = verdicts[k]!;
    if (!v.ok && v.kind !== "error") {
      violationKinds[v.kind] = (violationKinds[v.kind] ?? 0) + 1;
      if (violationSample.length < 10) {
        const exp = model.expected(r[R.subject], r[R.recordedAt]);
        violationSample.push({ kind: v.kind, phase: r[R.phase], subject: r[R.subject], recordedAt: r[R.recordedAt], observed: { stamp: r[R.stamp], digest: r[R.digest] }, expected: exp });
      }
    }
  });
  const writesDone = writes.filter((w) => !w.resend);
  const levelStats = (phase: any) => {
    const w = windowOf(phase);
    const secs = Math.max(0.001, (w.to - w.from) / 1000);
    const hist = new Histogram();
    let reads = 0, correct = 0, violations = 0, errors = 0;
    const byDepth: Record<string, Histogram> = { depth1: new Histogram(), depth3: new Histogram(), depth10: new Histogram() };
    const bytesByDepth: Record<string, number[]> = { depth1: [], depth3: [], depth10: [] };
    records.forEach((r, k) => {
      if (r[R.phase] !== phase.idx || r[R.start] < w.from || r[R.start] + r[R.latency] > w.to) return;
      reads++;
      const v = verdicts[k]!;
      if (v.ok) { correct++; hist.recordMs(r[R.latency]); } else if (v.kind === "error") errors++; else violations++;
      const panel = panelOf(r[R.subject]);
      if (panel && v.ok) { byDepth[`depth${panel}`]!.recordMs(r[R.latency]); bytesByDepth[`depth${panel}`]!.push(r[R.bytes]); }
    });
    const commits = writesDone.filter((x) => x.scheduledAt >= w.from && x.scheduledAt < w.to && !x.expired && !x.failed && !x.skipped);
    const commitHist = new Histogram();
    for (const c of commits) commitHist.recordMs(c.latencyMs);
    const expired = writesDone.filter((x) => x.scheduledAt >= w.from && x.scheduledAt < w.to && x.expired).length;
    const failed = writesDone.filter((x) => x.scheduledAt >= w.from && x.scheduledAt < w.to && x.failed).length;
    const lagHist = new Histogram();
    for (const l of ctx.feed.lagsRaw) if (l.at >= w.from && l.at < w.to) lagHist.recordMs(l.lagMs);
    const elus = new Map<number, number[]>();
    for (const e of workerElu) if (e.t >= w.from && e.t < w.to) (elus.get(e.worker) ?? elus.set(e.worker, []).get(e.worker)!).push(e.elu);
    const workerEluMean = [...elus.values()].map((v) => v.reduce((s, x) => s + x, 0) / v.length);
    const main = meanIn(mainElu.filter((e) => e.t >= w.from && e.t < w.to).map((e) => ({ t: e.t, v: e.elu })));
    const eng = engineSamples.filter((e) => e.t >= w.from && e.t < w.to);
    const engineCpu = eng.length ? eng.reduce((s, e) => s + e.cpuPercent, 0) / eng.length : null;
    const maxWorkerElu = workerEluMean.length ? Math.max(...workerEluMean) : null;
    const clientSaturated = (maxWorkerElu ?? 0) > 0.9 || (main ?? 0) > 0.9;
    return {
      phase: phase.name, readers: phase.readers, windowS: Math.round(secs * 10) / 10,
      reads, correct, violations, errors, goodputPerS: correct / secs, read: hist.summary(),
      writer: { commits: commits.length, expired, failed, commit: commitHist.summary(), maxWaitMs: commits.length ? Math.max(...commits.map((c) => c.latencyMs)) : null },
      feedLag: lagHist.summary(),
      depth: Object.fromEntries(Object.entries(byDepth).map(([k, h]) => [k, { ...h.summary(), meanBytes: bytesByDepth[k]!.length ? bytesByDepth[k]!.reduce((s, x) => s + x, 0) / bytesByDepth[k]!.length : null }])),
      client: { workerEluMean, maxWorkerElu, mainElu: main, saturated: clientSaturated },
      engine: { cpuPercentMean: engineCpu, samples: eng.length, peakMemBytes: eng.length ? Math.max(...eng.map((e) => e.memBytes)) : null },
      overlapsBurst: phase.overlapsBurst,
      _commitHist: commitHist,
      _readHist: hist,
    };
  };
  const feedSummary = ctx.feed.summary(Math.max(...acked.map((a) => a.position)));
  ctx.feed.lagsRaw = feedSummary.lags;
  const stats: Record<string, any> = {};
  for (const phase of ctx.phases) if (phase.end) stats[phase.name] = levelStats(phase);
  const strip = (s: any) => { if (!s) return s; const { _commitHist, _readHist, ...rest } = s; return rest; };

  // P1
  const L = (n: string) => stats[n];
  const base = L("baseline");
  const baseP99 = base?.writer.commit.p99Ms ?? null;
  const ratio = (a: number | null | undefined, b: number | null | undefined) => (a == null || b == null || b === 0 ? null : a / b);
  const bar = (name: string, value: any, limit: string, pass: boolean | null) => ({ name, value, bar: limit, pass });
  const recovery = recoveryWindows(ctx.phases.find((p) => p.name === "recovery"), baseP99);
  const p1 = {
    ladder: ["L1", "L4", "L16", "L64", "L256", "L1024"].map((n) => strip(L(n))).filter(Boolean),
    baselineWriter: base ? { commit: base.writer.commit, commits: base.writer.commits } : null,
    recovery,
    bars: [
      bar("L256 correctness violations", L("L256")?.violations, "= 0", L("L256") ? L("L256").violations === 0 : null),
      bar("L256 goodput vs L64", ratio(L("L256")?.goodputPerS, L("L64")?.goodputPerS), ">= 1.0", L("L256") && L("L64") ? L("L256").goodputPerS >= L("L64").goodputPerS : null),
      bar("L256 read p99 ms", L("L256")?.read.p99Ms, "<= 100", L("L256")?.read.p99Ms != null ? L("L256").read.p99Ms <= 100 : null),
      bar("L256 writer commit p99 / baseline", ratio(L("L256")?.writer.commit.p99Ms, baseP99), "<= 1.25", ratio(L("L256")?.writer.commit.p99Ms, baseP99) !== null ? ratio(L("L256")?.writer.commit.p99Ms, baseP99)! <= 1.25 : null),
      bar("L256 max command wait ms", L("L256")?.writer.maxWaitMs, "<= 2000", L("L256")?.writer.maxWaitMs != null ? L("L256").writer.maxWaitMs <= 2000 : null),
      bar("L1024 correctness violations", L("L1024")?.violations, "= 0", L("L1024") ? L("L1024").violations === 0 : null),
      bar("L1024 goodput / L256", ratio(L("L1024")?.goodputPerS, L("L256")?.goodputPerS), ">= 0.9", ratio(L("L1024")?.goodputPerS, L("L256")?.goodputPerS) !== null ? ratio(L("L1024")?.goodputPerS, L("L256")?.goodputPerS)! >= 0.9 : null),
      bar("L1024 writer commit p99 / baseline", ratio(L("L1024")?.writer.commit.p99Ms, baseP99), "<= 2.0", ratio(L("L1024")?.writer.commit.p99Ms, baseP99) !== null ? ratio(L("L1024")?.writer.commit.p99Ms, baseP99)! <= 2 : null),
      bar("recovery to the 256-level bar (s after stress)", recovery?.recoveredAfterS ?? null, "<= 60", recovery ? recovery.recoveredAfterS !== null && recovery.recoveredAfterS <= 60 : null),
    ],
  };
  // P2
  const classOf = (f: number) => (f <= 10 ? "5-10" : f <= 25 ? "11-25" : "26-50");
  const p2hist = (rows: any[]) => {
    const out: Record<string, any> = {};
    for (const cls of ["5-10", "11-25", "26-50"]) {
      const h = new Histogram();
      for (const w of rows) if (classOf(w.facts) === cls) h.recordMs(w.latencyMs);
      out[cls] = h.summary();
    }
    for (const exact of [5, 10, 50]) {
      const h = new Histogram();
      for (const w of rows) if (w.facts === exact) h.recordMs(w.latencyMs);
      out[`exactly${exact}`] = h.summary();
    }
    return out;
  };
  const okWrites = writesDone.filter((w) => !w.expired && !w.failed);
  const l256 = ctx.phases.find((p) => p.name === "L256");
  const in256 = l256 ? okWrites.filter((w) => w.scheduledAt >= windowOf(l256).from && w.scheduledAt < windowOf(l256).to) : [];
  const ryowRecords = records.map((r, k) => ({ r, v: verdicts[k]! })).filter((x) => x.r[R.phase] === PHASE_RYOW);
  const ryowHist = new Histogram();
  for (const x of ryowRecords) ryowHist.recordMs(x.r[R.latency]);
  const ryowOk = ryowRecords.filter((x) => x.v.ok).length;
  const dupOk = resends.filter((r) => r.result === "already-committed-original" || r.result === "resolved-by-command").length;
  const dupConsidered = resends.filter((r) => r.result !== "original-not-committed").length;
  const lostOk = lostAck.filter((r) => r.resolvedOriginal && r.retryTag !== "COMMITTED-AGAIN").length;
  const tagCounts: Record<string, number> = {};
  for (const w of writesDone) for (const t of w.tags ?? []) tagCounts[t] = (tagCounts[t] ?? 0) + 1;
  const c510 = in256.length ? p2hist(in256)["5-10"] : null;
  const p2 = {
    commitAll: p2hist(okWrites),
    commitSteady: p2hist(okWrites.filter((w) => !w.burst)),
    commitBurst: p2hist(okWrites.filter((w) => w.burst)),
    commitAtL256: in256.length ? p2hist(in256) : null,
    writes: { commands: writesDone.length, committed: okWrites.length, expired: writesDone.filter((w) => w.expired).length, failed: writesDone.filter((w) => w.failed).length, retriedCommands: writesDone.filter((w) => (w.attempts ?? 0) > 1).length, errorTags: tagCounts },
    readYourOwnWrite: { pulls: ryowRecords.length, correct: ryowOk, rate: ryowRecords.length ? ryowOk / ryowRecords.length : null, pull: ryowHist.summary(), failures: ryowRecords.filter((x) => !x.v.ok).slice(0, 5).map((x) => ({ kind: x.v.kind, subject: x.r[R.subject], stamp: x.r[R.stamp] })) },
    duplicates: { resends: resends.length, considered: dupConsidered, returnedOriginal: dupOk, rate: dupConsidered ? dupOk / dupConsidered : null, results: countBy(resends.map((r) => r.result)) },
    lostAck: { simulated: lostAck.length, returnedOriginal: lostOk, rate: lostAck.length ? lostOk / lostAck.length : null, retryTags: countBy(lostAck.map((r) => r.retryTag)) },
    bars: [
      bar("commit p50 ms (5-10 facts, L256)", c510?.p50Ms ?? null, "<= 10", c510?.p50Ms != null ? c510.p50Ms <= 10 : null),
      bar("commit p99 ms (5-10 facts, L256)", c510?.p99Ms ?? null, "<= 50", c510?.p99Ms != null ? c510.p99Ms <= 50 : null),
      bar("read-your-own-write at the returned tx", ryowRecords.length ? ryowOk / ryowRecords.length : null, "= 1.0", ryowRecords.length ? ryowOk === ryowRecords.length : null),
      bar("duplicates return the original receipt", dupConsidered ? dupOk / dupConsidered : null, "= 1.0", dupConsidered ? dupOk === dupConsidered : null),
      bar("lost ACKs return the original receipt", lostAck.length ? lostOk / lostAck.length : null, "= 1.0", lostAck.length ? lostOk === lostAck.length : null),
    ],
    notes: [
      "Latency is from the scheduled offer time (open loop): queueing behind the same subject, the in-flight cap and retries are included.",
      "The 10-fact bar is judged on the declared 5-10 class at the L256 window; exactly-5/10/50 histograms are reported where the trace produced such commands.",
    ],
  };
  // P3
  const { lags, ...feedRest } = feedSummary;
  const lagAll = new Histogram();
  for (const l of lags) lagAll.recordMs(l.lagMs);
  const lag256 = L("L256")?.feedLag ?? null;
  const p3 = {
    ...feedRest,
    lagAll: lagAll.summary(),
    lagAtL256: lag256,
    replay: ctx.replay,
    bars: [
      bar("feed gaps", feedRest.gaps, "= 0", feedRest.gaps === 0),
      bar("per-subject order violations", feedRest.orderViolations + feedRest.duplicates, "= 0", feedRest.orderViolations + feedRest.duplicates === 0),
      bar("resume from checkpoint replays exactly", ctx.replay.exact, "= true", ctx.replay.exact),
      bar("lag p99 ms at L256", lag256?.p99Ms ?? null, "<= 250", lag256?.p99Ms != null ? lag256.p99Ms <= 250 : null),
      bar("corrections report their valid-time range", feedRest.corrections.seen ? feedRest.corrections.validRangeReported / feedRest.corrections.seen : null, "= 1.0", feedRest.corrections.seen ? feedRest.corrections.validRangeReported === feedRest.corrections.seen : null),
    ],
  };
  // P4
  const l1 = L("L1");
  const depth = L("p4depth");
  const best = ["L1", "L4", "L16", "L64", "L256", "L1024"].map((n) => L(n)).filter(Boolean).sort((a, b) => b.goodputPerS - a.goodputPerS)[0];
  const perCore = best && best.engine.cpuPercentMean ? best.goodputPerS / (best.engine.cpuPercentMean / 100) : null;
  const slotCpus = Number(process.env["TX2_ENGINE_CPUS"] ?? "0") || null;
  const d1 = depth?.depth.depth1, d10 = depth?.depth.depth10;
  const p4 = {
    singleClient: l1 ? l1.read : null,
    depth: depth ? depth.depth : null,
    bestLevel: best ? { phase: best.phase, goodputPerS: best.goodputPerS, engineCpuPercentMean: best.engine.cpuPercentMean } : null,
    pullsPerSPerEngineCoreUsed: perCore,
    pullsPerSPerAllottedCore: best && slotCpus ? best.goodputPerS / slotCpus : null,
    bytesNote: "meanBytes is client-observed canonical result size; engine bytes read are not measured (synthetic gap).",
    bars: [
      bar("single-client pull p50 ms", l1?.read.p50Ms ?? null, "<= 5", l1?.read.p50Ms != null ? l1.read.p50Ms <= 5 : null),
      bar("single-client pull p99 ms", l1?.read.p99Ms ?? null, "<= 25", l1?.read.p99Ms != null ? l1.read.p99Ms <= 25 : null),
      bar("pulls/s per engine core used", perCore, ">= 1100", perCore !== null ? perCore >= 1100 : null),
      bar("current pull p50 depth10 / depth1 (flat)", ratio(d10?.p50Ms, d1?.p50Ms), "<= 1.25 (N01 provisional reading of 'flat')", ratio(d10?.p50Ms, d1?.p50Ms) !== null ? ratio(d10?.p50Ms, d1?.p50Ms)! <= 1.25 : null),
    ],
  };
  // P5
  const sweepPhase = ctx.phases.find((p) => p.name === "sweep");
  const pre = L("presweep"), sw = L("sweep");
  let p5: any = null;
  if (sweepPhase?.sweep) {
    const s = sweepPhase.sweep;
    const sweepOnly = records.map((r, k) => ({ r, v: verdicts[k]! })).filter((x) => x.r[R.phase] === sweepPhase.idx + SWEEP_PHASE_OFFSET);
    const sweepHist = new Histogram();
    for (const x of sweepOnly) sweepHist.recordMs(x.r[R.latency]);
    const done = sweepOnly.length;
    const correct = sweepOnly.filter((x) => x.v.ok).length;
    const rate = done / (s.wallMs / 1000);
    const wall100k = s.completed && s.subjects >= 100_000 ? s.wallMs / 1000 : 100_000 / Math.max(rate, 1e-9);
    const liveRatio = ratio(sw?.read.p99Ms, pre?.read.p99Ms);
    const writerRatio = ratio(sw?.writer.commit.p99Ms, pre?.writer.commit.p99Ms);
    p5 = {
      sweepSubjects: s.subjects, completed: s.completed, pulled: done, correct, violations: sweepOnly.filter((x) => !x.v.ok && x.v.kind !== "error").length, errors: sweepOnly.filter((x) => x.v.kind === "error").length,
      wallS: s.wallMs / 1000, pullsPerS: rate, concurrency: s.concurrency, pull: sweepHist.summary(),
      wallFor100kS: wall100k, wallFor100kIsExtrapolated: !(s.completed && s.subjects >= 100_000),
      live: { presweep: pre ? { read: pre.read, commit: pre.writer.commit } : null, duringSweep: sw ? { read: sw.read, commit: sw.writer.commit } : null },
      bars: [
        bar("sweep wall s for 100k subjects", wall100k, "<= 100", wall100k <= 100),
        bar("live read p99 during sweep / presweep", liveRatio, "<= 1.5", liveRatio !== null ? liveRatio <= 1.5 : null),
        bar("writer commit p99 during sweep / presweep", writerRatio, "<= 1.5", writerRatio !== null ? writerRatio <= 1.5 : null),
        bar("sweep correctness violations", sweepOnly.filter((x) => !x.v.ok && x.v.kind !== "error").length, "= 0", sweepOnly.filter((x) => !x.v.ok && x.v.kind !== "error").length === 0),
      ],
    };
  }
  // Correctness overall and validity
  const totalReads = records.length;
  const correctReads = verdicts.filter((v) => v.ok).length;
  const errors = verdicts.filter((v) => v.kind === "error").length;
  const violations = totalReads - correctReads - errors;
  const measured = ["L1", "L4", "L16", "L64", "L256", "L1024", "presweep", "sweep", "p4depth"].map((n) => L(n)).filter(Boolean);
  const saturated = measured.filter((s) => s.client.saturated).map((s) => s.phase);
  const cpu = cpuUse();
  report.correctness = { reads: totalReads, correct: correctReads, violations, errors, violationKinds, violationSample, rule: "a read is correct when its :placement/stamp and its whole-world multiset digest equal the expected-state model at its basis R; errors and wrong answers are never goodput" };
  report.client = { saturatedPhases: saturated, invalid: saturated.length > 0, processCpu: cpu, readerThreads: config.readerThreads, rule: "INVALID when a reader worker or the main thread has mean event-loop utilization > 0.9 in a measured window" };
  report.phases = ctx.phases.map((p) => ({ ...p, stats: strip(stats[p.name]) }));
  report.priorities = { P1: p1, P2: p2, P3: p3, P4: p4, P5: p5 };
  report.secondary = {
    bulkLane: "not measured in v1 (seed uses the bulk lane but no live read p99 is taken during it)",
    retroactiveCorrections: { feedReportsRange: p3.bars[4], explainAtOldBasis: "not measured in v1" },
    explainAudit: "not measured in v1",
  };
  report.engine = { container, samples: engineSamples.length, peakMemBytes: engineSamples.length ? Math.max(...engineSamples.map((e) => e.memBytes)) : null };
  report.histograms = Object.fromEntries(Object.entries(stats).flatMap(([name, s]) => [[`${name}.read`, s._readHist.toJSON()], [`${name}.commit`, s._commitHist.toJSON()]]));

  function recoveryWindows(phase: any, baselineP99: number | null) {
    if (!phase?.end) return null;
    const sub = Math.max(5, Math.round(10 * config.phaseScale)) * 1000;
    const windows: any[] = [];
    let recoveredAfterS: number | null = null;
    for (let from = phase.start; from + sub <= phase.end + 1; from += sub) {
      const to = from + sub;
      const h = new Histogram();
      records.forEach((r, k) => { if (r[R.phase] === phase.idx && r[R.start] >= from && r[R.start] + r[R.latency] <= to && verdicts[k]!.ok) h.recordMs(r[R.latency]); });
      const ch = new Histogram();
      for (const x of writesDone) if (x.scheduledAt >= from && x.scheduledAt < to && !x.expired && !x.failed) ch.recordMs(x.latencyMs);
      const readP99 = h.percentileMs(99), commitP99 = ch.percentileMs(99);
      const meets = readP99 !== null && readP99 <= 100 && (baselineP99 === null || commitP99 === null || commitP99 <= 1.25 * baselineP99);
      windows.push({ fromS: (from - phase.start) / 1000, reads: h.count, readP99Ms: readP99, commitP99Ms: commitP99, meetsL256Bar: meets });
      if (meets && recoveredAfterS === null) recoveredAfterS = (to - phase.start) / 1000;
    }
    return { windows, recoveredAfterS };
  }
}
function countBy(values: string[]) {
  const out: Record<string, number> = {};
  for (const v of values) out[v] = (out[v] ?? 0) + 1;
  return out;
}
function cpuUse() {
  if (cpuMarks.length < 2) return null;
  const a = cpuMarks[0]!, b = cpuMarks.at(-1)!;
  const us = b.cpu.user - a.cpu.user + (b.cpu.system - a.cpu.system);
  const wallUs = (b.t - a.t) * 1000;
  return { coresUsedMean: us / wallUs, hostCores: os.cpus().length, fractionOfHost: us / wallUs / os.cpus().length };
}

// ---------------------------------------------------------------- oracle

function runOracle(finalPosition: number, lastAcked: number) {
  if (!config.oracleRoot) return { status: "NOT-RUN", reason: "no --oracle-root (the gate extracts O-REPLAY from exp/O01-replay-oracle)" };
  const reads: OracleSampleRead[] = oracleSamples
    .filter((s) => s.phase >= 0)
    .slice(0, config.oracleMaxReads)
    .map((s) => ({ subject: s.subject, basis: s.basis, rows: s.rows }));
  if (!reads.length) return { status: "NOT-RUN", reason: "no sampled reads" };
  const caseDoc = buildCase({ caseId: `NS/${runTag}`, commands: recordedCommands, lastPosition: Math.max(finalPosition, lastAcked), reads });
  const result = checkWithOracle({ oracleRoot: config.oracleRoot, dir: rawDir, caseDoc, reads });
  // Cross-check: the driver's model verdict for the same reads.
  const modelAgrees = reads.filter((r) => {
    const rec = records.find((x) => x[R.subject] === r.subject && x[R.recordedAt] === r.basis.recordedAt && x[R.validAt] === r.basis.validAt);
    return rec ? judgeRead(rec).ok : false;
  }).length;
  return { ...result, modelCorrectOnSameReads: modelAgrees, recordedCommands: recordedCommands.length };
}

main();

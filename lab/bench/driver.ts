#!/usr/bin/env node
import {seedAddress} from "./lib/world.ts";
import {tenantAccounts, accountOfSubject as tenantOf, tenantQueries, tenantRows, tenantFacts, tenantRung, TenantWriters,type TenantSpec,type TenantEvent} from "../experiments/EXP-DX1/scale1/tenants.ts";
import {tenantPlan,tenantPhases,tenantWindows,tenantReaders,tenantTraceId} from "../experiments/EXP-DX1/scale1/tenant-traffic.ts";
import {checkImage} from "../experiments/EXP-DX1/scale1/seed-image.ts";
import {MembershipProof,tenantRelease} from "../experiments/EXP-DX1/scale1/tenant-proof.ts";
import {challengeTenants} from "../experiments/EXP-DX1/scale1/tenant-checks.ts";
import {tenantFeedAt} from "../experiments/EXP-DX1/scale1/tenant-feed.ts";
import {tenantObservations} from "../experiments/EXP-DX1/scale1/tenant-metrics.ts";
import {TenantScheduler} from "../experiments/EXP-DX1/scale1/tenant-scheduler.ts";
import type {SchedulerOptions} from "./lib/scheduler.ts";
import { smallId, smallPhases, smallTrace, smallSeconds, smallPeople } from "../experiments/EXP-DX1/scale1/small-plan.ts";
import { interferenceId, interferencePhases, interferenceTrace, interferenceSeconds } from "../experiments/EXP-DX1/scale1/interference.ts";
import assert from "node:assert/strict";
import { DeepActivation } from "./lib/deep-activation.ts";
import { FieldSaveWriter, liveProfile, livePeakWindow, type PeakAlignment } from "../experiments/EXP-DX1/scale1/deep-live.ts";
import { fieldPlan, fieldProfile } from "../experiments/EXP-DX1/int1/field-plan.ts";
import { DEEP_PROFILE, DEEP_RUNGS, deepCells, deepPopulation } from "./lib/deep-world.ts";
import { DEEP_RATE, deepSeed, type DeepEvent } from "./lib/deep-trace.ts";
import { DeepWriter } from "./lib/deep-command.ts";
import { DeepSeedWitness, deepBarrier, confirmDeepStart, finishDeepActivations, frozenDeep, requireIdentity, type DeepIdentity } from "./lib/deep-profile.ts";
import { configureWriterHeap } from "./lib/writer-heap.ts";
import { HotSubjects, ReceiptBasisRing } from "./lib/basis-window.ts";
import { DeferredPublications } from "./lib/deferred-publication.ts";
import { cpuProfileClock } from "./lib/cpu-profile.ts";
import { beginTrace, withTrace, finishTrace, traceSync, traceWork, flushTracing, traceAsync, traceInterval, traceNow, currentTraceStep, traceResource, type Trace } from "./lib/tracing.ts";
import { readObservation, type ReadObservation } from "./lib/read-observation.ts";
import type { Basis } from "./lib/composition.ts";
import { sampleMatches } from "./lib/sample-matches.ts";
import { rawLocalCoverage } from "./lib/raw-local-coverage.ts";
import { httpCounts } from "./lib/http-counts.ts";
import { readLatencyRun } from "../receipts/parse.ts";
import { latencyReceipt, requireQleverConnectionMode } from "../receipts/latency.mjs";
import { commitClocks, instrumentMetrics, verdictEnd, verdictMs, VERDICT_CLOCK } from "../trace/instrument.mjs";
import { acknowledgeReceipt } from "./lib/acknowledgement.ts";
import { pooledPhase } from "./lib/pooled-phases.ts";
import { applyCommitVerdicts, matchBaseline, refreshVerdictEligibility } from "./lib/verdict.ts";
import { checkV3Trace, inIntervals, intervalMs, scheduledV3Windows, settledPhaseWindow, type Interval } from "./lib/verdict-plan.ts";
import { V3_PLAN_ID, V3_OFFER_SECONDS } from "./lib/phases.ts";
import { idlePlan, type IdleEvent } from "./lib/idle-plan.ts";
import { IdleKeep } from "./lib/idle-keep.ts";
/**
 * NS north-star benchmark driver (EXP-N01, measurement semantics v2 = TARGETS 1.1, 2.1, 4.1).
 * Measures P1 to P5 on the frozen writer trace against one composition and writes one report JSON.
 * Normally run by `node lab/bin/gate.mjs NS --lane L --rung R`, which binds the report into a receipt.
 *
 *   node lab/bench/driver.ts --lane xtdb|qlever|datomic --rung 10k|100k|1m|10m --output runs/NS/<id>/ns-report.json
 *     [--profile smoke|screening|acceptance] [--zero-readers [--match-duration-s S]] [--baseline-writes FILE]
 *     [--read-path gateway|replica] [--reader-ladder-only] [--composition public] [--seed ns-v2] [--reader-threads 4] [--seed-budget-s 3600] [--seed-batch-facts 400]
 *     [--reader-entity-cache-mib 640] [--no-reader-affinity] [--writer-max-inflight 32] [--sweep-concurrency 16] [--oracle-root DIR]
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
import { WRITER_CACHE_BUDGET_MIB, WRITER_PREDECESSOR_CACHE_MIB } from "./lib/predecessors.ts";
import { ProbeThread } from "./lib/probe-thread.ts";
import { SideThread } from "./lib/side-thread.ts";
import { commitBreakdown } from "./lib/commit-breakdown.ts";
import { completedMaintenanceInWindow, requestIndex, scheduleMaintenanceBins } from "./lib/maintenance.ts";
import { feedLagWithinBar } from "./lib/feed-lag.ts";
import { historyDepthsComplete, observeFinalHead, mutationsAfterCapture } from "./lib/completion.ts";
import { alignAssertIds } from "./lib/receipt.ts";
import { openLegacyPublicationWriter } from "./lib/legacy-publication.ts";
import { datomicWriterDiagnostics, observeDatomicPublication, observeNativeReceipt } from "./lib/datomic-publication.ts";
import { DeepCommitMeter } from "./lib/deep-commit-meter.ts";
import { FeedConsumer, openHostFeedClock, openPublicationWriter, openAsyncPublicationWriter, openPublicationReader, readProducerPublication, type CrashPoint } from "./lib/feed.ts";
import { Histogram } from "./lib/hist.ts";
import { Model, partsOf } from "./lib/model.ts";
import { ModelJournal } from "./lib/model-journal.ts";
import { ModelJournalThread } from "./lib/model-journal-thread.ts";
import { R, observe, type ReadRecord } from "./lib/observe.ts";
import { MAX_RECEIPT_CAPTURES, PHASE_RYOW, countReceiptFallback, receiptReadRow } from "./lib/receipt-read.ts";
import { ExpectationCache } from "./lib/expectation-cache.ts";
import { splitTarget } from "./lib/split-target.ts";
import { ReaderLifecycle } from "./lib/reader-lifecycle.ts";
import { SpillThread } from "./lib/spill-thread.ts";
import { judgeReadCode, VERDICTS, wasHot } from "./lib/read-judgment.ts";
import { ReadWindow } from "./lib/read-window.ts";
import type { ReadWindowPlan } from "./lib/stream-reads.ts";
import type { HistoricalFallbackThread, HistoricalMode } from "./lib/historical-fallback.ts";
import { monitorEventLoopDelay } from "node:perf_hooks";
import { ReadRecords, type ObservationRecords } from "./lib/read-records.ts";
import { checkWithOracleWorker } from "./lib/oracle-thread.ts";
import { buildCase, type OracleSampleRead } from "./lib/oracle.ts";
import { PROFILES, nsPlan, type Profile } from "./lib/phases.ts";
import { Rng, seedOf } from "./lib/rng.ts";
import { OpenLoopScheduler, type JobResult } from "./lib/scheduler.ts";
import { receiptOfRecord, seedRung, type RecordedCommand } from "./lib/seed.ts";
import { TRACE_DEFAULTS, generateTrace, traceDigest, traceStats, type TraceEvent, type TraceParams } from "./lib/trace.ts";
import { BUCKETS, HOP_SHARE, RUNGS, SEED_VALID_FROM, accountsFor, accountOfSubject, hopOf, ids, memberOf, populationCounts, subjectInCell, worldFactsOf, type Bucket } from "./lib/world.ts";
import { REPO, runtimeApi } from "./lib/triplex.ts";
import { pathToFileURL } from "node:url";
const datomicMaintenanceJobs: any[] = [];
let verdictEvents: readonly TraceEvent[] = [];
import { chooseHistorySample, chooseSamples } from "./lib/samples.ts";
import { seedFromManifest } from "./lib/bulk.ts";
import { startHiccupMeter, type RoundPlan } from "./lib/noise.ts";
import { RoundBook, type ClientStats, type RoundRecord } from "./lib/rounds.ts";

// ---------------------------------------------------------------- arguments

const writerHeap = await configureWriterHeap();
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
const deepSmoke = opt("profile") === "deep-smoke";
const deepLive = opt("profile") === "deep-live";
const deepField = flag("int1-field");
const alignment = opt("peak-alignment") as PeakAlignment | undefined;
if (deepLive || alignment) assert(deepLive && (alignment === "coincident" || alignment === "staggered") && opt("tenant-study") === "interference");
const deep = opt("profile") === "deep" || deepSmoke || deepLive;
const tenantSpec: TenantSpec | undefined = opt("tenant-study") ? {
  ...(alignment ? {live:alignment}:{}),
  study: opt("tenant-study") as TenantSpec["study"],
  topology: opt("tenant-topology") as TenantSpec["topology"],
  physical: Number(opt("deep-account", "0")),
} : undefined;
if(tenantSpec)assert(deep&&["pooled","separate"].includes(tenantSpec.topology)&&["interference","small","million","smoke"].includes(tenantSpec.study));
const tenants=tenantSpec?tenantAccounts(tenantSpec):undefined;
const tenantMembership=tenants ? new MembershipProof() : undefined;
const tenantSize = tenants?.reduce((people, account) => people + account.people, 0) ?? 0;
const smallOnly = deep && flag("deep-small-scopes");
const availableRungs: Record<string, number> = tenantSpec ? { [tenantRung(tenantSpec)]: tenantSize } : smallOnly ? {"deep-small-100":100,"deep-small-2000":2000} : deepSmoke ? { "deep-smoke-40": 40 } : deep ? DEEP_RUNGS : RUNGS;
if (!devSubjects && !Object.hasOwn(availableRungs, rung)) throw new Error(`--rung must be one of ${Object.keys(availableRungs).join("|")}`);
const profile = opt("profile", "smoke") as Profile | "deep" | "deep-smoke" | "deep-live";
const activationOnly = deep && flag("deep-activation"), seedOnly = deep && flag("deep-seed-only");
const interferenceOnly = deep && flag("deep-interference");
if (deepField) assert(deep && !tenantSpec && !smallOnly && !activationOnly && !seedOnly && !interferenceOnly);
if (smallOnly && (activationOnly || seedOnly || interferenceOnly || deepSmoke || flag("zero-readers"))) throw Error("Small scope study requires its separate low-rate arm");
if (interferenceOnly && (activationOnly || seedOnly || deepSmoke || flag("zero-readers") || rung !== "deep-10k")) throw Error("Interference requires the complete deep-10k cohort");
if ((activationOnly || seedOnly) && (flag("zero-readers") || activationOnly && seedOnly)) throw Error("Choose one deep arm");
const fullLength = profile === "v3" || deep && !deepSmoke && !activationOnly && !seedOnly && !interferenceOnly && !smallOnly && !tenantSpec;
if (!deep && !(profile in PROFILES)) throw new Error(`--profile must be one of ${Object.keys(PROFILES).join("|")}`);
const rungSubjects = devSubjects ? Number(devSubjects) : availableRungs[rung]!;
const deepAccount = Number(opt("deep-account", "0"));
const deepId = deep ? { ...(tenantSpec?{tenant:tenantSpec}:{}), ...(deepField ? { field: true as const } : {}), source: process.env.TRIPLEX_TRACE_SOURCE!, slot: process.env.TRIPLEX_TRACE_SLOT!, nonce: opt("deep-nonce")!, people: rungSubjects, account: deepAccount, arm: seedOnly ? "seed" : tenantSpec?.study==="small" ? "small" : tenantSpec && ["smoke","interference"].includes(tenantSpec.study) ? "interference" : smallOnly ? "small" : interferenceOnly ? "interference" : activationOnly ? "activation" : flag("zero-readers") ? "zero" : "reader" } satisfies DeepIdentity : undefined;
if (deepId) {
  requireIdentity(deepId);
  if (!opt("deep-barrier") || devSubjects || lane !== "datomic" || opt("seed-manifest") || opt("round-plan") || opt("idle-gaps-ms") || opt("oracle-root") === undefined || opt("seed", deepSeed(deepAccount)) !== deepSeed(deepAccount)) throw Error("Deep requires its named Datomic rung, independent oracle, account seed, and start barrier");
}
if(smallOnly) assert.equal(rungSubjects,smallPeople(deepAccount));
const plannedTenants=tenantSpec&&deepId?tenantPlan(tenantSpec,deepId.arm):undefined;
const tenantWriters=plannedTenants ? new TenantWriters(plannedTenants.accounts,plannedTenants.events,deepLive) : undefined;
const deepPlan = plannedTenants ?? (smallOnly ? smallTrace(deepAccount) : interferenceOnly ? interferenceTrace(deepAccount) : deepField ? fieldPlan(deepAccount, rungSubjects, deepSmoke) : deep ? frozenDeep(deepAccount, rungSubjects) : undefined);
const deepWriter = deepPlan && !tenantSpec ? new (deepField ? FieldSaveWriter : DeepWriter)(deepPlan.activeSubjects) : undefined;
const deepWitness = deep ? new DeepSeedWitness() : undefined;
const cells = deep ? deepCells(rungSubjects) : undefined;
const output = path.resolve(opt("output") ?? "");
const rawDir = path.dirname(output);
if (flag("int1-guest-output")) {
  // [DX-INT1] Why: the managed fixture needs a real Linux device for the unchanged SQLite guard.
  // Rejected: a FUSE-backed feed ledger or letting arbitrary runs write outside the worktree.
  assert(process.platform === "linux" && deepSmoke && deepId && !tenantSpec);
  assert(process.env.DX_THIN_STACK && process.env.DX_THIN_HOST_PID);
  const stack = JSON.parse(fs.readFileSync(process.env.DX_THIN_STACK, "utf8"));
  assert(stack.managed?.compact && stack.prefix === deepId.slot && /^tx2-dxthin-/.test(stack.prefix));
  const info = fs.lstatSync(rawDir);
  assert.equal(path.dirname(rawDir), fs.realpathSync("/var/tmp"));
  assert(path.basename(rawDir).startsWith(`int1-arm-${deepId.nonce}-`));
  assert.equal(path.basename(output), "ns-report.json");
  assert(info.isDirectory() && info.uid === process.getuid!() && (info.mode & 0o777) === 0o700);
  assert.equal(fs.statfsSync(rawDir).type, 0xef53);
  assert.equal(fs.readdirSync(rawDir).length, 0);
} else if (!output.startsWith(path.join(REPO, "runs") + path.sep)) throw new Error("--output must be under runs/");
fs.mkdirSync(rawDir, { recursive: true });
const devFlags = ["subjects", "max-readers", "burst-multiplier", "level-s", "rate-scale", "probe10-per-s"].filter((f) => opt(f) !== undefined);
const rollingReadSmoke = flag("rolling-read-smoke");
const rd1ReadDiagnostic = flag("rd1-read-diagnostic");
if (rollingReadSmoke) devFlags.push("rolling-read-smoke");
if (rd1ReadDiagnostic) devFlags.push("rd1-read-diagnostic");
if (flag("reader-ladder-only")) devFlags.push("reader-ladder-only");
if (flag("legacy-empty-basis-broadcast")) devFlags.push("legacy-empty-basis-broadcast");
const boundedMemoryTrial = process.env.DX_BOUNDED_MEMORY_TRIAL === "1";
if (boundedMemoryTrial) devFlags.push("bounded-memory-trial");
if (opt("idle-gaps-ms")) devFlags.push("idle-diagnostic");
if(Number(opt("writer-deadline-ms","30000"))!==30000) devFlags.push("writer-deadline-ms");
const config = {
  lane,
  rung: devSubjects ? `dev:${rungSubjects}` : rung,
  rungSubjects,
  profile,
  zeroReaders: flag("zero-readers"),
  readerBasisWire: opt("reader-basis-wire", "snapshot") as "snapshot" | "delta",
  legacyEmptyBasisBroadcast: flag("legacy-empty-basis-broadcast"),
  matchDurationS: opt("match-duration-s") ? Number(opt("match-duration-s")) : null,
  baselineWrites: opt("baseline-writes") ?? null,
  devOverrides: devFlags,
  composition: opt("composition", "public")!,
  seed: opt("seed", deep ? deepSeed(deepAccount) : "ns-v2")!,
  strictRecordClocks: process.env.DX_STRICT_RECORD_CLOCKS !== "0",
  readPath: opt("read-path", "gateway") as "gateway" | "replica",
  replicaYield: opt("replica-yield", "fair") as "loop" | "fair",
  splitTarget: opt("split-target", opt("read-path", "gateway") === "replica" ? "pending" : "mixed") as "pending" | "mixed",
  // [DX-R3] Why: the default stays 64 MiB; a measured benchmark can retain its 2,000-receipt basis cohort explicitly.
  // Rejected: enlarging an unreported window or letting per-reader gateway caches consume 3 x 640 MiB beside the replica.
  replicaWorldCacheMiB: Number(opt("replica-world-cache-mib", "32")),
  replicaHistoryMiB: Number(opt("replica-history-mib", "64")),
  replicaHistoryCoverage: opt("replica-history-coverage", "global") as "global" | "closure",
  historicalFallback: opt("replica-historical-fallback", "off") as HistoricalMode,
  historicalFallbackActive: Number(opt("replica-fallback-active", "4")),
  installedHistoryMiB: Number(opt("replica-installed-history-mib", "32")),
  replicaPeer: opt("replica-peer", "reader") as "reader" | "writer",
  // [DX-R3-P9] Why: retain the established fallback until the bounded worker passes native stress; the unbounded worker had 112 errors.
  // Rejected: promoting from zero-reader captures alone.
  replicaFallbackThread: opt("replica-fallback-thread", "main") as "main" | "worker",
  replicaThread: opt("replica-thread", "worker") as "main" | "worker",
  replicaFeed: opt("replica-feed", "inline") as "legacy" | "inline",
  readerLadderOnly: flag("reader-ladder-only"),
  readerThreads: Number(opt("reader-threads", "4")),
  readerTraceEvery: Number(opt("reader-trace-every", "1")),
  readRetention: opt("read-retention", "auto"),
  sharedReaderIndex: boundedMemoryTrial && !flag("zero-readers"),
  readerEntityCacheMiB: Number(opt("reader-entity-cache-mib", opt("read-path", "gateway") === "replica" ? "16" : lane === "datomic" ? "640" : "128")),
  writerPredecessorCacheMiB: lane === "datomic" ? WRITER_PREDECESSOR_CACHE_MIB : 0,
  readerSubjectAffinity: lane === "datomic" && !flag("no-reader-affinity"),
  seedBudgetS: Number(opt("seed-budget-s", "3600")),
  seedBatchFacts: Number(opt("seed-batch-facts", "400")),
  schedulerTiming: opt("scheduler-timing", "precise") as "precise" | "legacy",
  historyGrowthSubjects: Number(opt("history-growth-subjects", "4")),
  idleGapsMs: opt("idle-gaps-ms")?.split(",").map(Number) ?? null,
  idleCommits: Number(opt("idle-commits", "150")),
  idleWarmupCommits: Number(opt("idle-warmup-commits","200")),
  idleKeep: opt("idle-keep", "none") as "none" | "http" | "refused",
  idleRefusalProofSha256: process.env.DX_IDLE_REFUSAL_PROOF_SHA256 ?? null,
  writerMaxInFlight: Number(opt("writer-max-inflight", "32")),
  writerDeadlineMs: Number(opt("writer-deadline-ms", "30000")),
  sweepConcurrency: Number(opt("sweep-concurrency", "16")),
  sweepMax: Number(opt("sweep-max", "100000")),
  maxReaders: opt("max-readers") ? Number(opt("max-readers")) : null,
  burstMultiplier: Number(opt("burst-multiplier", String(TRACE_DEFAULTS.burstMultiplier))),
  rateScale: Number(opt("rate-scale", "1")),
  levelS: opt("level-s") ? Number(opt("level-s")) : null,
  compactModel: process.env.DX_MODEL_COMPACT === "1",
  expectedStateRetention: opt("expected-state-retention", process.env.DX_EXPECTED_STATE_RETENTION || "heap") as "heap" | "journal" | "worker-journal",
  receiptCapture: opt("receipt-capture", "sender") as "sender" | "replica-worker",
  oracleSampleSubjects: Number(opt("oracle-subjects", "12")),
  oracleRate: Number(opt("oracle-rate", "0.01")),
  oracleMaxReads: Number(opt("oracle-max-reads", "24")),
  splitShare: 0.1,
  probe10PerS: Number(opt("probe10-per-s", deep ? "0" : "1")),
  publicationWaitMs: Number(process.env.DX_PUBLICATION_WAIT_MS ?? "5000"),
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
// [DX-T1-12] Why: Sam approved four-subject growth independently of seed batches and receipt-to-caller verdict timing.
// Rejected: tying history command size to seeding, or releasing the subject queue earlier than the unchanged finish stamp.
// [DX-T1-14] Why: a scale diagnostic must await its real captured witness through a long writer GC, then report the full lag.
// Rejected: invent a publication time, omit delayed rows, or change any judged latency/lag threshold.
if(!Number.isSafeInteger(config.publicationWaitMs)||config.publicationWaitMs<1||config.publicationWaitMs>120_000)throw Error("Invalid publication witness wait");
if (!["precise", "legacy"].includes(config.schedulerTiming) ||
    (config.historyGrowthSubjects !== null && (!Number.isSafeInteger(config.historyGrowthSubjects) || config.historyGrowthSubjects < 1 || config.historyGrowthSubjects > 500)))
  throw Error("Invalid scheduler timing or history growth subjects");
if (config.idleGapsMs && (lane !== "datomic" || !config.zeroReaders || !config.readerLadderOnly ||
    config.probe10PerS !== 0 || config.baselineWrites || config.roundPlan || config.matchDurationS ||
    !["none", "http", "refused"].includes(config.idleKeep))) throw Error("Idle diagnostics require isolated zero-reader, no overlay and no verdict baseline");
if (config.idleKeep !== "none" || process.env.DX_IDLE_SENTINEL === "1" || process.env.DX_IDLE_REFUSAL_PROBE === "1")
  throw Error("Keep-warm requests and sentinels are forbidden (Sam 2026-11-16)");
if(opt("idle-warmup-commits") && !config.idleGapsMs) throw Error("One-time warmup count is currently a fixed-gap diagnostic control, not an adopted v3 policy");
if (fullLength && (config.levelS || config.readerLadderOnly || config.legacyEmptyBasisBroadcast || config.maxReaders !== null || config.rateScale !== 1 || config.schedulerTiming !== "precise" || config.historyGrowthSubjects !== 4 || config.burstMultiplier !== TRACE_DEFAULTS.burstMultiplier || config.matchDurationS !== null && config.matchDurationS !== V3_OFFER_SECONDS))
  throw Error("v3 requires its full fixed phase plan and unchanged offered rate");
if (fullLength) config.matchDurationS = V3_OFFER_SECONDS;
if (!["heap", "journal", "worker-journal"].includes(config.expectedStateRetention)) throw Error("Invalid expected-state retention");
if (!Number.isSafeInteger(config.readerTraceEvery) || config.readerTraceEvery < 1 || !["auto", "raw"].includes(config.readRetention!))
  throw Error("Invalid reader trace interval or observation retention");
if (!["sender", "replica-worker"].includes(config.receiptCapture)) throw Error("Invalid receipt capture mode");
// [DX-BM1] Why: ladder readers and receipt captures have distinct sequenced spill ports and both drain before final accounting.
// Rejected: running the known slow sender on the loaded half or sharing the bounded trial's single reader isolate.
if (config.receiptCapture === "replica-worker" &&
    (lane !== "datomic" || config.sharedReaderIndex || config.readPath !== "replica" ||
      config.replicaThread !== "worker" || config.replicaFallbackThread !== "worker" ||
      config.roundPlan || config.idleGapsMs))
  throw Error("Receipt capture requires separate threaded Datomic replica and fallback workers");
// [DX-T1-15] Why: the bounded reader trial admits one replica index copy and up to 64 logical readers.
// Rejected: tuning caps for a short diagnostic while silently starting the normal four-worker ladder and sweeper.
if (boundedMemoryTrial && (lane !== "datomic" || profile !== "smoke" || config.readPath !== "replica" ||
    ![1000, 100000].includes(rungSubjects) || config.expectedStateRetention !== "journal" || !config.compactModel ||
    config.replicaHistoryMiB !== 192 || config.replicaWorldCacheMiB !== 8 ||
    (!config.zeroReaders && (!config.readerLadderOnly || config.readerThreads !== 1 || config.replicaThread !== "worker" ||
      !Number.isSafeInteger(config.maxReaders) || config.maxReaders! < 1 || config.maxReaders! > 64))))
  throw Error("Invalid bounded-memory trial: require exact local reads, compact journal, fixed replica budgets and a bounded reader ladder");
if (!["snapshot", "delta"].includes(config.readerBasisWire)) throw Error("Invalid reader basis wire mode");
if (!["main", "worker"].includes(config.replicaFallbackThread) || !Number.isSafeInteger(config.replicaWorldCacheMiB) || config.replicaWorldCacheMiB < 0 || config.replicaWorldCacheMiB > 512) throw Error("invalid expectation, fallback or world-cache control");
// [DX-H7] Why: bound aggregate reader and writer cache estimates below half the 8 GiB client grant.
// Rejected: an unbounded per-thread cache (moves saturation to memory pressure).
if (lane === "datomic" && (!Number.isSafeInteger(config.readerEntityCacheMiB) || config.readerEntityCacheMiB < 1 ||
    !Number.isSafeInteger(config.readerThreads) || config.readerThreads < 1 ||
    config.readerThreads * (config.readerEntityCacheMiB + 64) + WRITER_CACHE_BUDGET_MIB > 4096))
  throw new Error(`Reader caches plus ${WRITER_CACHE_BUDGET_MIB} MiB writer cache budgets must total at most 4096 MiB`);
if (!["pending", "mixed"].includes(config.splitTarget) || !Number.isSafeInteger(config.replicaHistoryMiB) || config.replicaHistoryMiB < 1 || config.replicaHistoryMiB > 1024)
  throw Error("invalid split-target or replica-history-mib");
if (!["global", "closure"].includes(config.replicaHistoryCoverage) || config.replicaHistoryCoverage === "closure" && config.readPath !== "replica")
  throw Error("Replica history coverage requires global, or closure with the replica reader");
if (!["off", "lane", "batch", "revision", "install"].includes(config.historicalFallback) ||
    !Number.isSafeInteger(config.historicalFallbackActive) || config.historicalFallbackActive < 1 || config.historicalFallbackActive > 16 ||
    !Number.isSafeInteger(config.installedHistoryMiB) || config.installedHistoryMiB < 1 || config.installedHistoryMiB > 512 ||
    config.historicalFallback !== "off" && (lane !== "datomic" || config.readPath !== "replica" || config.composition !== "reach" || config.sharedReaderIndex || !process.env.DATOMIC_READ_URLS))
  throw Error("Historical fallback requires separate Datomic reach readers and the read gateway");
if (!["reader", "writer"].includes(config.replicaPeer) || !["main", "worker"].includes(config.replicaThread)) throw Error("invalid replica peer/thread");
if (!["loop", "fair"].includes(config.replicaYield) || !["legacy", "inline"].includes(config.replicaFeed))
  throw Error("invalid replica-yield or replica-feed control");
if (!["gateway", "replica"].includes(config.readPath) || (config.readPath === "replica" && lane !== "datomic"))
  throw Error("--read-path replica requires lane datomic");
// [DX-R3] Why: peak RSS must include worker shutdown and all post-run verification/collection work.
// Rejected: reporting only the sample taken before final analysis and report serialization.
if (config.readPath === "replica") process.once("exit", () => {
  console.log(JSON.stringify({ kind: "replica-reader-process-peak", bytes: process.resourceUsage().maxRSS * 1024 }));
});
const pairPlan: RoundPlan | null = config.roundPlan ? JSON.parse(fs.readFileSync(path.resolve(config.roundPlan), "utf8")) : null;
if (pairPlan) {
  if (pairPlan.format !== "tx2-round-plan/1") throw new Error(`--round-plan: format ${pairPlan.format}`);
  if (config.arm !== "A" && config.arm !== "B") throw new Error("--round-plan needs --arm A|B");
  if ((config.barrierDir === null) === (config.startAtAbsMs === null)) throw new Error("--round-plan needs exactly one of --barrier-dir or --start-at-abs-ms");
  if (pairPlan.seed !== config.seed) throw new Error(`--round-plan is for seed ${pairPlan.seed}, not ${config.seed}`);
}
const planSha256 = config.roundPlan ? createHash("sha256").update(fs.readFileSync(path.resolve(config.roundPlan))).digest("hex") : null;
const runTag = deepId ? `deep-${deepId.nonce}-s${deepAccount}` : `ns${Date.now().toString(36)}${randomBytes(2).toString("hex")}`;
const bulkManifest = config.seedManifest ? JSON.parse(fs.readFileSync(path.resolve(config.seedManifest), "utf8")) : null;
if (bulkManifest && (bulkManifest.subjects !== rungSubjects || bulkManifest.lane !== lane || bulkManifest.seed !== config.seed))
  throw new Error(`--seed-manifest is for ${bulkManifest.lane}/${bulkManifest.subjects} subjects/seed ${bulkManifest.seed}, not ${lane}/${rungSubjects}/${config.seed}`);
const restoredSeed=opt("verified-seed-image")?JSON.parse(fs.readFileSync(opt("verified-seed-image")!,"utf8")):undefined;
if(restoredSeed){assert(deepId && ["reader","activation"].includes(deepId.arm));assert.deepEqual(restoredSeed.identity,deepId);checkImage(restoredSeed.origin,deepId);}
const scopeName = restoredSeed?.origin.scope ?? (bulkManifest ? bulkManifest.scope : `ns-${lane}-${config.rung.replace(/[^a-z0-9]/gi, "")}-${runTag}`);
const now = () => performance.timeOrigin + performance.now();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const logLines: string[] = [];
const log = (line: string) => {
  const text = `[ns ${new Date().toISOString().slice(11, 19)}] ${line}`;
  logLines.push(text);
  process.stderr.write(text + "\n");
};
const sha256File = (rel: string) => createHash("sha256").update(fs.readFileSync(path.join(REPO, rel))).digest("hex");
const tenantSources = tenantSpec ? fs.readdirSync(path.join(REPO,"lab/experiments/EXP-DX1/scale1")).filter(f=>(f.startsWith("tenant")&&!f.endsWith("test.ts"))||f==="seed-image.ts"||f==="deep-live.ts"||f==="deep-live-pins.json").map(f=>"lab/experiments/EXP-DX1/scale1/"+f) : [];
const BENCH_FILES = [...tenantSources,"lab/bench/driver.ts", "lab/trace/instrument.mjs", "lab/bench/reader-worker.ts", "lab/bench/side-worker.ts", "lab/bench/probe-worker.ts", ...fs.readdirSync(path.join(REPO, "lab/bench/lib")).filter((f) => f.endsWith(".ts")).sort().map((f) => `lab/bench/lib/${f}`)];
if (deepField) BENCH_FILES.push("lab/experiments/EXP-DX1/int1/field-plan.ts", "lab/experiments/EXP-DX1/scale1/deep-live.ts");
if(smallOnly||interferenceOnly) {
  const names=smallOnly?["small-plan.ts","small-pins.json"]:["interference.ts","interference-pins.json"];
  BENCH_FILES.push(...names.map(n=>"lab/experiments/EXP-DX1/scale1/"+n));
}

const report: Record<string, any> = latencyReceipt({
  writerHeap,
  format: "tx2-ns-report/2",
  qleverConnectionMode: lane === "qlever" ? requireQleverConnectionMode(process.env.TRIPLEX_QLEVER_CONNECTION_MODE ?? "keep-alive") : null,
  semantics: "TARGETS v3: final-receipt ACK, minimum 500 commits, four-subject growth",
  verdictClock: VERDICT_CLOCK,
  verdictPlanId: deepField ? fieldProfile : tenantSpec ? (tenantSpec.live ? liveProfile+"/"+tenantSpec.live : tenantTraceId+"/"+tenantSpec.study) : fullLength ? V3_PLAN_ID : rd1ReadDiagnostic ? "rd1-reader-diagnostic/1" : smallOnly ? smallId : interferenceOnly ? interferenceId : activationOnly ? "deep-activation/1" : `ns-${profile}/2`,
  status: "RUNNING",
  startedAt: new Date().toISOString(),
  config,
  runTag,
  scope: scopeName,
  ...(deepId ? { deep: { profile: deepField ? fieldProfile : deepLive ? liveProfile : DEEP_PROFILE, identity: deepId, ...(plannedTenants?{accounts:tenants,logicalTraces:plannedTenants.logical}: {}) } } : {}),
  generator: { traceSha256: sha256File(deepField ? "lab/experiments/EXP-DX1/int1/field-plan.ts" : deep ? "lab/bench/lib/deep-trace.ts" : "lab/bench/lib/trace.ts"), worldSha256: sha256File(deep ? "lab/bench/lib/deep-world.ts" : "lab/bench/lib/world.ts"), seed: config.seed },
  benchSources: Object.fromEntries(BENCH_FILES.map((f) => [f, sha256File(f)])),
  host: { cpus: os.cpus().length, platform: `${process.platform}-${process.arch}`, node: process.version, totalMemBytes: os.totalmem() },
  harnessStorage: { requested: process.env.DX_HARNESS_STORAGE ?? "volume", filesystemType: fs.statfsSync(rawDir).type },
});
const save = () => atomicWrite(output, JSON.stringify(report, null, 2) + "\n");

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

let model = new Model(rungSubjects);
const modelJournalFile = path.join(rawDir, `expected-model-${runTag}.bin`);
const modelJournalContext = {
  run: process.env.TRIPLEX_TRACE_RUN ?? runTag, source: process.env.TRIPLEX_TRACE_SOURCE ?? "local", slot: process.env.TRIPLEX_TRACE_SLOT ?? runTag, subjects: rungSubjects,
};
// [DX-RD1] Why: the exact rolling verifier needs a private strict-clock scope and the fixed v3 windows.
// Rejected: advancing an observation frontier in irregular-clock, paired or externally written scopes.
const streamReads = (fullLength || rollingReadSmoke) && !config.zeroReaders && lane === "datomic" && config.readPath === "replica" &&
  config.strictRecordClocks && config.replicaThread === "worker" && config.expectedStateRetention === "worker-journal" &&
  !pairPlan && !tenantSpec && config.readRetention !== "raw";
if (rd1ReadDiagnostic && (!rollingReadSmoke || !config.levelS || config.levelS > 45))
  throw Error("RD1 read diagnostics require the rolling smoke plan and levels no longer than 45 s");
if (rollingReadSmoke && ((!streamReads && !(rd1ReadDiagnostic && config.zeroReaders)) || profile !== "smoke" || !config.readerLadderOnly || !config.levelS || config.levelS <= config.settleS))
  throw Error("Rolling read smoke requires the short replica ladder and its worker journal");
let modelJournal = config.expectedStateRetention === "journal" ? new ModelJournal(modelJournalFile, modelJournalContext) : undefined;
const modelJournalThread = config.expectedStateRetention === "worker-journal" && !streamReads ? new ModelJournalThread(modelJournalFile, modelJournalContext) : undefined;
const accounts = accountsFor(rungSubjects);
let expectations = new ExpectationCache(model);
const ryowFallbackReasons: Record<string, number> = {};
const readerFinalDiagnostics: any[] = [];
const spillLimit = process.env.TRIPLEX_BENCH_SPILL_MAX_BYTES === undefined
  ? (config.profile === "v3" ? 28 * 1024 ** 3 : undefined) : Number(process.env.TRIPLEX_BENCH_SPILL_MAX_BYTES);
if (spillLimit !== undefined && (!Number.isSafeInteger(spillLimit) || spillLimit <= 0)) throw Error("Invalid observation spill byte limit");
const spill = config.readPath === "replica" ? new SpillThread(path.join(rawDir, `observations-${runTag}`), spillLimit,
  streamReads ? { file: modelJournalFile, context: modelJournalContext, deep } : undefined) : undefined;
const modelWriter = streamReads ? spill! : modelJournalThread ?? modelJournal ?? model;
let records: ObservationRecords = [];
function visitPhase(phase: number, fn: (record: ReadRecord, index: number) => void) {
  if (records instanceof ReadRecords) records.forPhase(phase, fn);
  else records.forEach((r, k) => { if (r[R.phase] === phase) fn(r, k); });
}
let spillFinished = false;
let mainReadCount = 0;
let judgedReadCount = 0;
const oracleSamples: any[] = [];
const streamedOracleRows: ReadRecord[] = [];
const settledReadCounts = new Map<number, number>();
const spillElu: { t: number; active: number; idle: number; elu: number; threadCpuMs?: number }[] = [];
if (spill) spill.onProgress = m => {
  if (m.client) spillElu.push(m.client);
  if (m.checked) report.streamReadProgress = m.checked;
  for (const [phase, summary] of Object.entries(m.phases) as [string, any][]) settledReadCounts.set(Number(phase), summary.settled);
  for (const sample of m.samples ?? []) oracleSamples.push(sample);
  for (const row of m.sampleRecords ?? []) streamedOracleRows.push(row);
};
const phaseStarts = new Map<number, number>();
const observedPhases = new Map<number, { reads: number; errors: number; read: Histogram; wait: Histogram; routes: Record<string, number> }>();
function retainRead(r: ReadRecord) {
  if (spill) mainReadCount++;
  if (spill && !spillFinished) { spill.push(r); return; }
  records.push(r);
  const phase = r[R.phase];
  const summary = observedPhases.get(phase) ?? { reads: 0, errors: 0, read: new Histogram(), wait: new Histogram(), routes: {} };
  observedPhases.set(phase, summary);
  summary.reads++;
  if (r[R.error] === null && r[R.start] >= (phaseStarts.get(phase) ?? Infinity) + config.settleS * 1000) settledReadCounts.set(phase, (settledReadCounts.get(phase) ?? 0) + 1);
  if (r[R.error] !== null) summary.errors++;
  else summary.read.recordMs(r[R.latency]);
  summary.wait.recordMs(r[R.waitedMs]);
  summary.routes[r[R.route]] = (summary.routes[r[R.route]] ?? 0) + 1;
}
const workerDiagnostics: { worker: number; t: number; diagnostics: unknown; memory: unknown; threadCpuMs: number | null }[] = [];
const workerElu: { worker: number; t: number; elu: number; running?: number; activeMs?: number; idleMs?: number }[] = [];
const acked = new ReceiptBasisRing<{ instant: number; position: number; txId: string; at: number }>();
let highestAckedPosition = 0;
const ackOf = new Map<number, { at: number; instant: number; subject: number; subjects?: number[]; seq: number; stream: string; correction: boolean; correctionValidFrom: number | null; stamp: number }>();
const hotSubjects = new HotSubjects();
const recordedCommands: RecordedCommand[] = [];
const writes: any[] = [];
const outcomes = new Map<string, any>();
const original = new Map<number, { operations: any[]; meta: any; receipt: Receipt }>();
const lostAck: any[] = [];
const resends: any[] = [];
const ryowPending = new Set<Promise<void>>();
let latestInstant = 0;
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
function straddleCandidate(range?: { first: number; people: number }): { subject: number; seq: number } {
  const allowed = (s: number) => !range || s >= range.first && s < range.first + range.people;
  const keys = [...pendingBySubject.keys()].filter(allowed);
  const soon = upcomingJobs(STRADDLE_HORIZON_MS).filter((j) => allowed(j.key) && j.ev.stream === "background" && !j.ev.resend);
  return splitTarget(
    keys.map(subject => ({ subject, seq: pendingBySubject.get(subject)!.at(-1)! })).filter(candidate => config.splitTarget === "mixed" || !ackedBySeq.has(candidate.seq)),
    soon.map(job => ({ subject: job.key, seq: job.ev.seq })),
    n => straddleRng.int(n), config.splitTarget);
}
const overlayCount: Record<string, number> = {};
let feed: FeedConsumer | SideThread | null = null;
let historicalFallback: HistoricalFallbackThread | undefined;
let feedWind: { target: number; checkpointAtStop: number; inFlightAtFeedTarget: number } | null = null;
const lateGrowth: { cmd: any; v: number; pending: Promise<any> }[] = [];
let coordinate: (position: number) => any = (position) => ({ stream: "unknown", epoch: 0, offset: position, ordinal: 0 });

function main() {
  return run().catch((error) => {
    void flushTracing();
    void historicalFallback?.close();
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
  cpuProfileClock("start");
  save();
  const campaignMeter = deepId && process.env.DX_INT1_NATIVE_WRITE_READBACK === "1"
    ? new DeepCommitMeter("s2-" + Buffer.from(String(runtimeApi.DatabaseScope.test(scopeName))).toString("base64url")) : undefined;
  if (campaignMeter) {
    // [DX-INT1] Why: retain the returned path with its native ID, including the seed before reader setup.
    // Rejected: counting options from configuration or treating a duplicate lookup as a new native receipt.
    observeNativeReceipt((db, input, reply, position, commands) => {
      if (db === campaignMeter.database && reply.writePath !== undefined)
        campaignMeter.observe(db, input, reply, position, commands);
    });
  }
  const writer = await openComposition(config.composition, lane, scopeName);
  if (lane === "datomic" && process.env.DX_W1_WRITER_EXPECTATION) {
    const { readWriteOptions } = await import("../experiments/EXP-DX1/w1/write-options.ts");
    const db = "s2-" + Buffer.from(String(runtimeApi.DatabaseScope.test(scopeName))).toString("base64url");
    report.writerOptions = await readWriteOptions(writer.backend.url, db, process.env.DX_W1_WRITER_EXPECTATION);
  }
  const aux = await openComposition(config.composition, lane, scopeName);
  // History growth (bulk, P4 item 2) writes through its own opening, so a writer admission queue full of
  // trace commands cannot starve it; a command that outlives the phase is resolved at wind-down.
  const growthComp = await openComposition(config.composition, lane, scopeName);
  report.composition = { name: writer.name, assignments: writer.assignments, backend: writer.backend, scopeKey: `composition:${writer.name}/source:${lane}/scope:${scopeName}` };
  if (config.readPath === "replica") {
    // [DX-R3] Why: routing through a runtime index changes the composition, even though writes retain their original opening.
    // Rejected: describing locally served reads as the source engine's own index.
    report.composition.readPath = "replica";
    report.composition.scopeKey += "/read:replica";
    report.composition.assignments = { ...writer.assignments,
      current: { lane, role: "process-local packed replica maintained by the ordered journal" },
      history: { lane, role: "local recent-version window with exact gateway fallback" },
      replicationEdges: [...writer.assignments.replicationEdges, { from: "source", to: "current", consumerSourceSha256: null, generation: "DX-R3/recent" }] };
  }
  coordinate = writer.coordinate;
  // [EXP-M01] In paired rounds the coordinator's VM agent reads every container's cgroup counters (lib/noise.ts);
  // the per-second docker stats and watermark polls would only add apparatus load to the engine and the daemon.
  if (!pairPlan) void engineSampler();

  // ---------------------------------------------------------------- seed (bulk lane)
  const pop = deep ? deepPopulation(rungSubjects) : populationCounts(rungSubjects);
  if(tenants){const n=tenantFacts(tenants);Object.assign(pop,{accounts:tenants.length,facts:n,seedAssertions:n,liveFactsAtSeedEnd:n});}
  if (deep) assert.equal(await writer.currentPosition(), restoredSeed?.origin.seed.position??0, "Deep scope differs from its required starting position");
  const oracleSubjects = chooseSamples(rungSubjects, config.oracleSampleSubjects);
  if(tenants) for(const a of tenants) oracleSubjects.push(a.first);
  if (deepPlan && cells) {
    for (const b of ["small", "medium", "large"] as const) for (const h of [3, 4, 6] as const) {
      const subject = cells.pick(b, h, .5); if ((deepSmoke || smallOnly || tenantSpec) && subject === null) continue; assert(subject !== null); oracleSubjects.push(subject);
    }
    for (const kind of ["person", "system", "agent", "runtime"]) {
      const event = deepPlan.events.find(e => e.kind === kind && (kind !== "person" || e.deep.closes));
      if((smallOnly || tenantSpec) && !event)continue;
      assert(event); oracleSubjects.push(event.subject);
    }
  }
  const historySample = chooseHistorySample(rungSubjects, Math.min(config.historySample, Math.floor(rungSubjects / 10)), config.seed, accounts, cells);
  // [DX-H3] Why: a retained history batch retracts rows for every member, including non-read-sample subjects.
  // Rejected: recording only sampled subjects (O-REPLAY rejected an unknown retraction at command 304).
  const oracleRecordSet = new Set(deep ? oracleSubjects : [...oracleSubjects, ...historySample]);
  if (deep) {
    // [DX-SCALE1] Why: retain every predecessor of a sampled history transaction without shipping unrelated deep worlds to O-REPLAY. Rejected: trimming individual operations out of a retained command.
    for (let n = 0; n < historySample.length; n += config.historyGrowthSubjects) {
      const group = historySample.slice(n, n + config.historyGrowthSubjects);
      if (group.some(i => oracleRecordSet.has(i))) for (const i of group) oracleRecordSet.add(i);
    }
  }
  log(`seed: rung ${config.rung}, ${pop.liveFactsAtSeedEnd} live facts planned (${pop.accounts} accounts, mean world ${pop.worldFacts.mean.toFixed(0)} facts)`);
  const seed = bulkManifest
    ? await seedFromManifest(bulkManifest, writer, log)
    : await seedRung({
        comp: writer,
        deep: deepWitness,
        restoredRunTag: restoredSeed?.origin.runTag,
        ...(tenants ? {
          deepRows: (i: number) => {
            const account = tenantOf(tenants, i);
            return tenantRows(account, i - account.first);
          },
          seedAddressOf: (i: number) => seedAddress(i - tenantOf(tenants, i).first),
        } : {}),
        deepProgress: (subjects, facts, position) => {
          const row = JSON.stringify({ identity: deepId, scope: scopeName, subjects, facts, position, at: Date.now() });
          if (tenants) fs.appendFileSync(path.join(rawDir, "seed-rate.jsonl"), row+"\n");
          atomicWrite(path.join(rawDir, "seed-progress.json"), row);
        },
        onReceipt: (operations, receipt) => {
          if (tenantSpec?.study === "million" && !restoredSeed) {
            const sample = { identity: deepId, position: receipt.position, txId: receipt.txId, at: Date.now(), facts: receipt.triples.length };
            fs.appendFileSync(path.join(rawDir, "seed-acks.jsonl"), JSON.stringify(sample)+"\n");
          }
          tenantMembership?.bind(receipt);
          if (!seedOnly) {
            modelWriter.bindReceipt(operations, receipt, "bulk-seed");
            deepWriter?.bind(receipt);
            tenantWriters?.bind(receipt);
          }
        },
        subjects: rungSubjects, runTag, batchFacts: config.seedBatchFacts, budgetMs: config.seedBudgetS * 1000,
        inFlight: Number(process.env.TX2_DATOMIC_SEED_IN_FLIGHT ?? 1),
        recordSubjects: oracleRecordSet, recordAccounts: new Set([...oracleRecordSet].map((i) => accountOfSubject(i, accounts))), historySubjects: new Set(historySample), log,
      });
  report.seedPath = bulkManifest ? { kind: "bulk-index", manifest: config.seedManifest, nqSha256: bulkManifest.nq.sha256, quads: bulkManifest.nq.quads } : { kind: "transact" };
  if(restoredSeed) {report.deep.restoredSeed=restoredSeed; report.seedPath={kind:"verified-seed-image",dumpSha256:restoredSeed.origin.dumpSha256,originalPosition:restoredSeed.origin.seed.position,commandReadbacks:seed.commands};}
  const N = seed.seededSubjects;
  const popN = deep ? (N === rungSubjects ? pop : deepPopulation(N)) : populationCounts(N, accounts);
  recordedCommands.push(...seed.recorded);
  report.seed = {
    plannedSubjects: rungSubjects, seededSubjects: N, complete: seed.complete, commands: seed.commands, assertions: seed.assertions,
    expectedAssertions: popN.seedAssertions, assertionsMatchClosedForm: popN.seedAssertions === seed.assertions,
    wallS: seed.wallMs / 1000, factsPerS: seed.factsPerS, commitMs: seed.commitMs, failureCount: seed.failures.length, failures: seed.failures.slice(0, 10),
    firstPosition: coordinate(seed.firstPosition), lastPosition: coordinate(seed.lastPosition), lastInstant: seed.lastInstant, population: { planned: pop, seeded: popN },
  };
  save();
  if (deepPlan && deepWitness) {
    report.deep.seed = deepWitness.finish(rungSubjects, pop.seedAssertions, deepPlan.populationSha256);
    if(restoredSeed) assert.deepEqual(report.deep.seed,restoredSeed.origin.seed);
    assert.equal(await writer.currentPosition(), report.deep.seed.position, "Seed head changed");
    report.deep.trace = deepPlan.sha256;
    save();
  }
  const tenantReleasePhase = tenantSpec && !tenantSpec.live && (tenantSpec.study === "interference" || tenantSpec.study === "million" && activationOnly);
  const releaseTarget = tenantReleasePhase ? tenants!.find(a => a.index === 1) : undefined;
  const nextRelease = config.composition === "reach-touched" && process.env.DX_INT1_DEEP_RELEASE === "ead90" ? "ead90" : "standard";
  const activation = releaseTarget
    ? new DeepActivation(rawDir, releaseTarget.people, runTag + ":" + releaseTarget.key, releaseTarget.first, nextRelease, releaseTarget, Number(opt("deep-evaluators") ?? 2))
    : activationOnly && !tenantSpec ? new DeepActivation(rawDir, rungSubjects, runTag, 0, nextRelease) : undefined;
  const measureBurst = tenantSpec?.study === "interference";
  const meter = campaignMeter ?? ((activation || measureBurst) && config.composition !== "memory"
    ? new DeepCommitMeter("s2-" + Buffer.from(String(runtimeApi.DatabaseScope.test(scopeName))).toString("base64url")) : undefined);
  if (meter && !campaignMeter) observeNativeReceipt(meter.observe.bind(meter));
  if (deepId) atomicWrite(path.join(rawDir, "seed-observed.json"), JSON.stringify({ identity: deepId, scope: scopeName, seed: report.deep.seed, trace: report.deep.trace }));
  if (seedOnly) {
    report.status = "SEEDED"; save(); samplersOn = false; clearInterval(eluTimer);
    await Promise.all([writer.close(), aux.close(), growthComp.close()]); await flushTracing(); process.exit(0);
  }
  if (activation) {
    // [DX-INT1] Why: charge the durable policy projection to the import and leave the reader empty until its first real request.
    // Rejected: consuming an entire cold population's seed feed inside release activation.
    if (config.composition === "reach-touched") {
      report.deep.seedProjection = await activation.finishImport(writer, {position:seed.lastPosition, validAt:seed.lastInstant});
    }
    report.deep.r1 = await activation.execute(writer, "R1", (receipt, ops, actor) => {
      modelWriter.bindReceipt(ops, receipt, actor);
      seed.lastPosition = receipt.position; seed.lastInstant = receipt.instant;
    });
    save();
  }
  const state: Map<number, SubjectState> = seed.state;
  const versionIds = seed.versionIds;
  const oracleSet = new Set(oracleSubjects.filter((i) => i < N));
  const historyList = historySample.filter((i) => i < N);
  const historyVersion = new Map<number, number>(historyList.map((i) => [i, 0]));
  latestInstant = seed.lastInstant;
  highestAckedPosition = seed.lastPosition;
  acked.push({ instant: seed.lastInstant, position: seed.lastPosition, txId: "seed-end", at: now() });
  if (!pairPlan && !deep) void watermarkSampler(aux);

  // ---------------------------------------------------------------- trace (frozen generator, TARGETS 2.1)
  // [EXP-M01] A round plan names its series' trace parameters (Q60g screening: a burst every 180 s), a new comparison
  // series under TARGETS 2.1 item 5; the plan hash and the parameters are bound in the report.
  const seriesParams: Partial<TraceParams> = pairPlan?.traceParams ?? {};
  const params: TraceParams = { ...TRACE_DEFAULTS, ...seriesParams, burstMultiplier: opt("burst-multiplier") ? config.burstMultiplier : (seriesParams.burstMultiplier ?? TRACE_DEFAULTS.burstMultiplier), steadyFactsPerS: (seriesParams.steadyFactsPerS ?? TRACE_DEFAULTS.steadyFactsPerS) * config.rateScale };
  const idle = config.idleGapsMs ? idlePlan(config.idleGapsMs, config.idleCommits, N,config.idleWarmupCommits) : null;
  const lastTenantWindow = tenantSpec && deepId ? tenantWindows(tenantSpec, deepId.arm).at(-1) : undefined;
  const traceDurationS = deepField ? (deepSmoke ? 30 : V3_OFFER_SECONDS) : lastTenantWindow ? lastTenantWindow.from + lastTenantWindow.seconds : idle ? idle.durationS : pairPlan ? pairPlan.durationS : 7200;
  if (deepPlan) Object.assign(params, { sizeClasses: deepPlan.sizeClasses, steadyFactsPerS: (deepLive || deepField ? 3.5 : DEEP_RATE) * deepPlan.sizeClasses.reduce((n, c) => n + c.min * c.share, 0) });
  const events = deepPlan ? deepPlan.events : idle ? idle.events : generateTrace({ seed: config.seed, subjects: N, durationS: traceDurationS, params });
  if (!tenantSpec && config.receiptCapture === "replica-worker" &&
      events.filter(e => e.stream === "background" && !e.resend && (!deep || e.atMs < V3_OFFER_SECONDS * 1000)).length > MAX_RECEIPT_CAPTURES)
    throw Error("Frozen trace exceeds fixed receipt-capture capacity");
  const resendSequences = new Set(events.filter(e=>e.resend).map(e=>e.seq));
  verdictEvents = events;
  if (profile === "v3") { report.verdictPlan = checkV3Trace(events); log(`v3 scheduled counts: ${JSON.stringify(report.verdictPlan.counts)}`); }
  report.trace = { params, durationS: traceDurationS, digest: traceDigest(events), generated: traceStats(events), generatorSha256: report.generator.traceSha256, seed: config.seed,
    ...(idle ? { diagnostic: "Fixed-gap ten-fact component probe; not the frozen verdict workload", idlePlanSha256: report.benchSources["lab/bench/lib/idle-plan.ts"] } : {}) };
  log(`trace: ${events.length} events over ${traceDurationS}s, digest ${report.trace.digest}, active-set share ${report.trace.generated.activeShare.toFixed(3)}`);
  const idleKeep = idle && config.idleKeep !== "none" ? new IdleKeep({ mode: config.idleKeep, scope: scopeName, dir: rawDir }) : null;
  await idleKeep?.ready;

  // ---------------------------------------------------------------- reader workers
  // [DX-INT1] Why: six reading workers own their demand sets, while the independent sender receipt worker retains its ordered capture and fallback.
  // Rejected: handing all six a population image, or routing receipt observation back through the sender.
  const demandReaders = config.composition === "reach-touched";
  if (!config.zeroReaders && config.historicalFallback !== "off" && !demandReaders) {
    const { HistoricalFallbackThread } = await import("./lib/historical-fallback.ts");
    historicalFallback = new HistoricalFallbackThread({ mode: config.historicalFallback,
      scope: String(runtimeApi.DatabaseScope.test(scopeName)), endpoint: process.env.DATOMIC_READ_URLS!.split(",")[0]!, active: config.historicalFallbackActive });
    if ((await historicalFallback.snapshot()).requested !== 0)
      throw Error("Historical fallback lane handled a request before reader startup");
  }
  const afterReaderImages = Boolean(deep && !demandReaders && !config.zeroReaders && !config.sharedReaderIndex && pairPlan?.readers !== 0);
  const replicaHost = config.readPath === "replica" ? config.replicaThread === "worker"
    ? await (await import("./lib/replica-thread.ts")).ReplicaThread.open({ scope: scopeName, appliedLogPath: spill ? `${spill.directory}-copy-applied.jsonl` : undefined,
      composition: config.composition, roots: demandReaders ? [] : Array.from({ length: N }, (_, i) => ids.placement(i)),
      initial: { position: seed.lastPosition, instant: seed.lastInstant }, feed: config.replicaFeed,
      worldCacheBytes: config.replicaWorldCacheMiB * 1024 ** 2, fallbackThread: config.replicaFallbackThread, historyBytes: config.replicaHistoryMiB * 1024 ** 2, historyCoverage: config.replicaHistoryCoverage, peer: config.replicaPeer,
      sharedReaderIndex: config.sharedReaderIndex, afterReaderImages,
      receiptSpill: config.receiptCapture === "replica-worker" ? spill!.connect() : undefined,
      ...(config.sharedReaderIndex ? { worker: 0, entityCacheBytes: config.readerEntityCacheMiB * 1024 ** 2 } : {}),
    }, aux)
    : await (await import("./lib/replica-reads.ts")).ReplicaReadHost.open(
      scopeName, demandReaders ? [] : Array.from({ length: N }, (_, i) => ids.placement(i)), aux,
      { position: seed.lastPosition, instant: seed.lastInstant }, config.replicaFeed,
      config.replicaHistoryMiB * 1024 ** 2, config.replicaPeer, undefined, demandReaders ? "touched" : "all", undefined, Date.now(), false, config.replicaHistoryCoverage) : undefined;
  const receiptThread = config.receiptCapture === "replica-worker" && replicaHost && "captureReceipt" in replicaHost
    ? replicaHost : undefined;
  let copyApplications: { position: number; at: number }[] = [];
  if (streamReads && replicaHost && "connect" in replicaHost)
    replicaHost.onApply = (position, at) => copyApplications.push({ position, at });
  const mainReplicaHost = replicaHost && !("connect" in replicaHost) ? replicaHost : undefined;
  const replicaLocal = mainReplicaHost ? new (await import("./lib/replica-reads.ts")).ReplicaReader(config.replicaHistoryMiB * 1024 ** 2, mainReplicaHost.index, config.replicaWorldCacheMiB * 1024 ** 2) : undefined;
  if (mainReplicaHost && replicaLocal) {
    mainReplicaHost.subscribe(delta => replicaLocal.notify(delta.reset));
    const gatewayPull = aux.pull.bind(aux);
    const {touchedPull}=await import("./lib/touched-reads.ts");
    aux.pull = (root, basis, between) => demandReaders ? touchedPull(replicaLocal,mainReplicaHost.replica,root,basis,()=>gatewayPull(root,basis),between) : replicaLocal.pullAt(root, basis, () => gatewayPull(root, basis), between);
  } else if (replicaHost && "pull" in replicaHost) {
    const remote = replicaHost;
    aux.pull = (root, basis, between) => {
      if (between) throw Error("RYOW worker does not accept a split callback");
      return remote.pull(root, basis);
    };
  }
  const workerCfg = (w: number) => ({ deep, replicaWorldCacheBytes: config.replicaWorldCacheMiB * 1024 ** 2, splitTarget: config.splitTarget, traceEvery: config.readerTraceEvery, replicaHistoryMiB: config.replicaHistoryMiB, replicaHistoryCoverage: config.replicaHistoryCoverage, replicaYield: config.replicaYield, readPath: demandReaders ? "gateway" : config.readPath, rawSampleLimit: config.readPath === "replica" ? Math.ceil(config.oracleMaxReads / config.readerThreads) : undefined, replicaImage: demandReaders ? undefined : mainReplicaHost?.index.image(), subjectShards: config.readerSubjectAffinity ? config.readerThreads : 1, entityCacheBytes: config.readerEntityCacheMiB * 1024 ** 2, lane, scope: scopeName, composition: config.composition, seed: config.seed, worker: w, subjects: N, accounts, historySample: historyList, sampleSubjects: [...oracleSet], oracleRate: config.oracleRate, splitShare: config.zeroReaders ? 0 : config.splitShare,
    installedHistoryBytes: config.historicalFallback === "install" && w < config.readerThreads ? Math.floor(config.installedHistoryMiB * 1024 ** 2 / config.readerThreads) : undefined });
  const workers: Worker[] = [];
  const stopped: Promise<void>[] = [];
  const readerLives: { worker: number; life: ReaderLifecycle }[] = [];
  const sweepDone = new Map<number, (v: any) => void>();
  const splitDirectory = spill?.directory ?? path.join(rawDir, `observations-${runTag}`);
  let splitWrites = Promise.resolve(), splitWriteError: unknown, splitFileStarted = false;

  const onWorkerMessage = (w: number, worker: Worker) => (msg: any) => traceWork("driver.worker-message", () => {
    if (msg.type === "reads") {
      for (const r of msg.records) retainRead(r); for (const s of msg.samples) oracleSamples.push(s);
      if (msg.splitEvents?.length) {
        const text = msg.splitEvents.map((x: any) => JSON.stringify(x) + "\n").join(""), first = !splitFileStarted;
        splitFileStarted = true;
        splitWrites = splitWrites.then(() => fs.promises.writeFile(`${splitDirectory}-split-steps.jsonl`, text, { flag: first ? "wx" : "a" })).catch(error => { splitWriteError = error; });
      }
    }
    else if (msg.type === "elu") {
      workerElu.push({ worker: w, t: msg.t, elu: msg.elu, running: msg.running, activeMs: msg.activeMs, idleMs: msg.idleMs });
      workerDiagnostics.push({ worker: w, t: msg.t, diagnostics: msg.diagnostics, memory: msg.memory, threadCpuMs: msg.threadCpuMs });
    }
    else if (msg.type === "sweep-done") sweepDone.get(msg.phase)?.(msg);
    else if (msg.type === "split-request") worker.postMessage({ type: "split", token: msg.token, ...straddleCandidate(msg.range), assignedAt: now() });
    else if (msg.type === "straddle") {
      const done = ackedBySeq.get(msg.seq);
      if (done) worker.postMessage({ type: "acked", token: msg.token, ...done });
      else (ackWaiters.get(msg.seq) ?? ackWaiters.set(msg.seq, []).get(msg.seq)!).push((r) => worker.postMessage({ type: "acked", token: msg.token, ...r }));
    }
  });
  const startWorker = async (w: number, cfg: any) => {
    const pendingDeltas: any[] = [];
    const directReplica = !demandReaders && replicaHost && "connect" in replicaHost ? replicaHost : undefined;
    const unsubscribe = demandReaders ? undefined : mainReplicaHost?.subscribe(delta => { pendingDeltas.push(delta); });
    const observationPort = spill?.connect();
    let worker;
    if (config.sharedReaderIndex && !demandReaders) {
      if (!directReplica) throw Error("The shared reader requires the replica worker");
      worker = directReplica.startSharedReader(cfg, observationPort);
    } else {
      const replicaPort = directReplica?.connect();
      const historicalPort = w < config.readerThreads ? historicalFallback?.connect() : undefined;
      worker = config.composition === "memory" ? await inThreadReader(cfg) : new Worker(new URL("./reader-worker.ts", import.meta.url), {
        workerData: { ...cfg, observationPort, replicaPort, historicalPort, readerEntrypoint: true },
        transferList: [...(observationPort ? [observationPort] : []), ...(replicaPort ? [replicaPort] : []), ...(historicalPort ? [historicalPort] : [])],
        env: process.env,
      });
    }
    const life = new ReaderLifecycle(); readerLives.push({ worker: w, life });
    worker.on("error", (error: unknown) => life.error(error));
    worker.on("exit", (code: number) => life.exit(code));
    const stoppedP = new Promise<void>((resolve) => worker.on("message", (m: any) => m.type === "stopped" && (life.acknowledgeStop(), workerHttpCounts.push({ worker: w, counts: m.httpCounts }), readerFinalDiagnostics.push({ worker: w, diagnostics: m.diagnostics }), resolve())));
    await new Promise<void>((resolve, reject) => {
      worker.on("message", (m: any) => { if (m.type === "ready") { if(smallOnly || tenantSpec?.study==="small")(report.deep.readerIsolates??=[]).push({worker:w,heapUsed:m.memory.heapUsed,heapTotal:m.memory.heapTotal,external:m.memory.external,at:Date.now()}); resolve(); } else if (m.type === "error") reject(new Error(`reader worker ${w}: ${m.message}`)); });
      worker.on("error", reject);
    });
    unsubscribe?.();
    for (const delta of pendingDeltas) worker.postMessage({ type: "replica-delta", delta, sentAt: now() });
    if (!demandReaders) mainReplicaHost?.subscribe(delta => worker.postMessage({ type: "replica-delta", delta, sentAt: now() }));
    worker.on("message", onWorkerMessage(w, worker));
    return { worker, stopped: stoppedP };
  };
  if (!config.zeroReaders && !(pairPlan && pairPlan.readers === 0)) {
    const started = await Promise.all(Array.from({ length: config.readerThreads }, (_, w) => startWorker(w, workerCfg(w))));
    for (const s of started) { workers.push(s.worker); stopped.push(s.stopped); }
    log(`readers: ${workers.length} worker threads ready`);
  }
  // [DX-R3] Why: cloning/installing the full window is bootstrap work, not a multi-second sweep-time writer stall.
  // Rejected: starting worker 99 from runSweep while the frozen writer is already issuing commands.
  const preparedSweeper = replicaHost && !tenantSpec && !deepSmoke && !activationOnly && !interferenceOnly && !smallOnly && !config.zeroReaders && !config.readerLadderOnly
    ? await startWorker(99, { ...workerCfg(99), sampleSubjects: [], oracleRate: 0, splitShare: 0 }) : undefined;
  // [DX-SCALE1] Why: READY follows actual seed image installation on every reader, including the sweep worker. Rejected: a timer or a socket deadline larger than one image transfer.
  if (afterReaderImages && replicaHost && "connect" in replicaHost)
    await replicaHost.followAfterImages(workers.length + Number(Boolean(preparedSweeper)));
  let basisCursor: number | null = null;
  const basisBroadcast = { messages: 0, ackItems: 0, ticks: 0, wall: new Histogram() };
  const broadcast = () => {
    const attrs = { mode: config.readerBasisWire, workers: workers.length, added: 0, window: 0, wallMs: 0 };
    return traceWork("driver.reader-basis.broadcast", () => {
    const t = now();
    const hot = hotSubjects.snapshot(t);
    // [DX-T1-6] Why: the sampled stall is structured-cloning unchanged receipt windows; transmit only their exact appended suffix.
    // Rejected: reducing retention, skipping broadcasts or choosing a different read basis to hide client overhead.
    const delta = config.readerBasisWire === "delta" ? acked.delta(t, basisCursor) : null;
    const window = delta ? undefined : acked.snapshot(t);
    for (const w of workers) w.postMessage(delta ? { type: "basis-delta", delta, hot } : { type: "basis", acked: window, hot });
    basisCursor = acked.length;
    basisBroadcast.ticks++; basisBroadcast.messages += workers.length;
    attrs.added = delta?.added.length ?? window!.length;
    attrs.window = delta ? delta.end - delta.start : window!.length;
    basisBroadcast.ackItems += workers.length * attrs.added;
    attrs.wallMs = now() - t;
    basisBroadcast.wall.recordMs(attrs.wallMs);
    }, attrs, true);
  };
  // [DX-T1-15] Why: v3 zero did 59,048 growing receipt scans and sent no messages, including a 277 ms writer-thread pause.
  // Rejected: scanning the full receipt history when there is no subscriber, or dropping any RYOW or feed observation.
  const sendBasis = workers.length > 0 || config.legacyEmptyBasisBroadcast;
  if (sendBasis) broadcast();
  const basisTimer = sendBasis ? setInterval(broadcast, 100) : undefined;
  const setReaders = (phase: number, wantedReaders: number, mode: string) => {
    const readers = config.maxReaders === null ? wantedReaders : Math.min(wantedReaders, config.maxReaders);
    if (tenants && tenantSpec && deepId && phase >= 0) {
      const stage = tenantWindows(tenantSpec, deepId.arm)[phase]!;
      const sets = Array.from({length: workers.length}, () => [] as {first:number; people:number; interReadMs:number; key:string}[]);
      for (const a of tenants) {
        const count = tenantReaders(stage, a.index);
        for (let j = 0; j < count && workers.length; j++) {
          const set = sets[(j + a.index) % workers.length]!;
          set.push({first:a.first, people:a.people, key:a.key, interReadMs:stage.pattern==="low" || stage.pattern==="busy-low" && a.index!==0 ? 15000 : 0});
        }
      }
      assert.equal(sets.reduce((sum,x)=>sum+x.length,0), readers);
      workers.forEach((w,k)=>w.postMessage({type:"level", phase, mode, readers:sets[k]!.length, tenants:sets[k]}));
      return;
    }
    workers.forEach((w, k) => w.postMessage({ type: "level", phase, interReadMs:smallOnly && (deepAccount!==0 || phase===2) ? 15000:0, readers: Math.floor(readers / workers.length) + (k < readers % workers.length ? 1 : 0), mode }));
  };

  // ---------------------------------------------------------------- writer (open loop)
  type Job = { key: number; scheduledAt: number; ev: TraceEvent; onDone?: (position: number) => void };
  // [EXP-M01] Paired rounds: both arms seed, then meet at one absolute trace start, so the same command has the same
  // scheduled instant in both arms (R22 section 1: only simultaneous pairing shares this host's noise).
  const traceStart = deepId ? await deepBarrier(path.resolve(opt("deep-barrier")!), deepId, { scope: scopeName, seed: report.deep.seed, trace: report.deep.trace }) : pairPlan ? await pairBarrier(N, report.trace.digest) : now() + 1000;
  report.traceStartAbsMs = traceStart;
  report.writerSourceDiagnostics = { start: datomicWriterDiagnostics() };
  report.serverRecordTime = process.env.DX_SERVER_RECORD_TIME !== "0";
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
    highestAckedPosition = Math.max(highestAckedPosition, receipt.position);
    latestInstant = Math.max(latestInstant, receipt.instant);
    if (subject >= 0) hotSubjects.update(subject, at);
    if (feed instanceof SideThread) feed.ack(receipt.position, { instant: receipt.instant, ackAt: at, subject, ...info, subjects: info.subjects ?? [subject] });
    else feed?.ackArrived(receipt.position);
    return at;
  };
  const publicationTimes = new Map<number, any>();
  const activeModelWrites = new Map<Job, number>();
  let streamClockCeiling = Infinity;
  let streamFault: string | undefined;
  const readFrontier = () => {
    let through = Math.min(streamClockCeiling, latestInstant);
    for (const clock of activeModelWrites.values()) through = Math.min(through, clock);
    return { through, at: now() };
  };
  // [DX-RD1] Why: a strict clock observed before dispatch is below every possible result of that active mutation.
  // Rejected: certifying through the latest ACK while an earlier native transaction is still unresolved.
  const sendFrontier = () => {
    if (streamFault) return;
    const f = readFrontier();
    spill!.frontier(f.through, f.at, copyApplications);
    copyApplications = [];
  };
  const frontierTimer = streamReads ? setInterval(sendFrontier, 100) : undefined;
  let probeThread: ProbeThread | null = null;
  const jobTraces = new WeakMap<Job, Trace>();
  // [DX-T1-5] Why: native claim identity binds the witness to its measured job even with tracing off or interleaved fibers.
  // Rejected: ambient async context as proof of transaction ownership (failed the concurrent ordering gate).
  const jobsByCommandId = new Map<string, Job>();
  const completedJobs = new WeakSet<Job>();
  const capturedByJob = new WeakMap<Job, any[]>();
  const execute = (job: Job) => {
    const trace = jobTraces.get(job);
    if (!streamReads) return withTrace(trace, () => traceAsync("driver.execute", () => executeTraced(job)));
    activeModelWrites.set(job, latestInstant);
    return withTrace(trace, () => traceAsync("driver.execute", () => executeTraced(job))).catch((error: unknown) => {
      streamFault ??= `Writer ${job.ev.seq} threw before model publication: ${String(error)}`;
      throw error;
    }).finally(() => activeModelWrites.delete(job));
  };
  const executeTraced = async (job: Job) => {
    const ev = job.ev;
    const out: any = { traceId: jobTraces.get(job)?.traceId, attempts: 0, tags: [] as string[], path: "direct" };
    outcomes.set(okey(ev), out);
    if (ev.resend) return resend(job, out);
    const st = state.get(ev.subject)!;
    const cmd = traceSync("driver.plan-and-encode-command", () => {
      if (ev.stream === "background" && tenantWriters) return tenantWriters.build(runTag, ev as TenantEvent, st, job.scheduledAt);
      if (ev.stream === "background" && deepWriter) return deepWriter.build(runTag, ev as DeepEvent, st, job.scheduledAt);
      return buildTraceCommand({ runTag, event: ev, state: st, scheduledAbsMs: job.scheduledAt });
    });
    if (jobsByCommandId.has(cmd.commandId)) throw Error("Duplicate active writer command identity");
    jobsByCommandId.set(cmd.commandId, job);
    out.commandId = cmd.commandId;
    const meta = { commandId: cmd.commandId, actor: ev.kind, preconditions: cmd.preconditions };
    let receipt: Receipt | null = null;
    while (!receipt && out.attempts < 6) {
      out.attempts++;
      out.transactCalledAt ??= now();
      const probeResult = ev.stream === "probe10" && probeThread ? await probeThread.transact(cmd.operations, meta) : null;
      const res = probeResult ? probeResult.result : await traceAsync("triplex.transact", () => writer.transact(cmd.operations, meta));
      out.transactReturnedAt = now();
      if (probeResult) Object.assign(out, probeResult.timing);
      if (res.ok) { receipt = res.value; break; }
      out.tags.push(res.tag);
      out.lastError = String(res.error?.message ?? "").slice(0, 300);
      receipt = await resolveByCommand(cmd.commandId);
      if (receipt) { out.path = "resolved-by-command"; break; }
      if (res.tag === "TransactionConflictError" && out.attempts >= 2) break; // a typed conflict, accounted as such
      await sleep(20 * out.attempts);
    }
    if (!receipt) {
      if (streamReads) streamFault ??= `No terminal original receipt for issued writer ${ev.seq}`;
      out.outcome = out.tags.includes("TransactionConflictError") ? "typed-conflict" : out.tags.length && !out.tags.includes("Unknown") ? "typed-rejection" : "unaccounted";
      job.onDone?.(-1);
      return;
    }
    out.outcome = "committed";
    Object.assign(out, publicationTimes.get(receipt.position));
    publicationTimes.delete(receipt.position);
    const delivered = await acknowledgeReceipt(receipt, {
      reconcileLostAck: ev.ackLoss ? async (receipt) => {
      const retry = await traceAsync("triplex.transact", () => writer.transact(cmd.operations, meta));
      const resolved = await resolveByCommand(cmd.commandId);
      lostAck.push({ seq: ev.seq, retryTag: retry.ok ? "COMMITTED-AGAIN" : retry.tag, retryNamesOriginal: !retry.ok && retry.error?.transactionId === receipt.txId, resolvedOriginal: resolved?.txId === receipt.txId && resolved?.position === receipt.position });
      out.path = "lost-ack-resolved";
      } : undefined,
      updateSubject: (receipt) => traceSync("driver.ack-and-subject-state", () => {
    if (ev.stream === "background") { deepWriter?.bind(receipt); tenantWriters?.bind(receipt); }
    const pl = ids.placement(ev.subject);
    st.stamp = cmd.newStamp;
    st.stampId = receipt.triples.find((t) => t.entityId === pl && t.attribute === ":placement/stamp")!.id;
    st.stampValidFrom = Math.floor(job.scheduledAt);
    if (cmd.newAddress) {
      st.address = cmd.newAddress;
      st.addressId = receipt.triples.find((t) => t.entityId === ids.worker(ev.subject) && t.attribute === ":worker/address")!.id;
      st.addressValidFrom = cmd.validRange.from;
    }
      }),
      stamp: (receipt) => traceSync("driver.ack-and-subject-state", () => noteAck(receipt, ev.subject, { seq: ev.seq, stream: ev.stream, correction: ev.correction, correctionValidFrom: ev.correction ? cmd.validRange.from : null, stamp: cmd.newStamp })),
    });
    const at = delivered.ackAt;
    out.ackPublishedAt = at;
    if (ev.stream === "background") {
      const result = { position: receipt.position, ackAt: at };
      ackedBySeq.set(ev.seq, result);
      for (const w of ackWaiters.get(ev.seq) ?? []) w(result);
      ackWaiters.delete(ev.seq);
    }
    traceSync("driver.expected-state.bind-receipt", () => modelWriter.bindReceipt(cmd.operations, receipt!, ev.kind));
    traceSync("driver.expected-state.add-commit", () => modelWriter.addCommit(ev.subject, { instant: receipt.instant, position: receipt.position, txId: receipt.txId, stamp: cmd.newStamp, stampValidFrom: Math.floor(job.scheduledAt), parts: partsOf(cmd.added, cmd.addedValidFrom, cmd.removed, cmd.removedValidFrom), ackAtMs: at, stream: ev.stream }));
    // [DX-T1-12] Why: only planned resends need original payload/receipt retention, and the frozen trace names them in advance.
    // Rejected: retain full duplicate copies for every commit until shutdown.
    if ((ev.stream === "background" && resendSequences.has(ev.seq)) || ev.stream.startsWith("tenant-check-")) original.set(ev.seq, { operations: cmd.operations, meta, receipt });
    out.position = receipt.position;
    if (oracleRecordSet.has(ev.subject))
      traceSync("driver.oracle-record", () => recordedCommands.push({ commandId: cmd.commandId, operations: cmd.operations, preconditions: cmd.preconditions, actor: ev.kind, receipt: { txId: receipt!.txId, position: receipt!.position, instant: receipt!.instant, assertionIds: alignAssertIds(cmd.operations, receipt!) } }));
    if (ev.stream === "background") traceSync("driver.ryow-dispatch", () => {
      if (receiptThread) {
        const start = now();
        receiptThread.captureReceipt({ subject: ev.subject, start, commitTraceId: jobTraces.get(job)?.traceId ?? "off",
          basis: { recordedAt: receipt.instant, recordedPosition: receipt.position, validAt: Math.floor(start) } });
        return;
      }
      const ryowTrace = beginTrace("read", "driver.ryow", { phase: -2, commitTraceId: jobTraces.get(job)?.traceId ?? "off" });
      const p = withTrace(ryowTrace, () => traceAsync("driver.ryow-capture", () => !replicaHost && feed instanceof SideThread ? feed.ryow(ev.subject, receipt, {recordedAt:receipt.instant,validAt:Math.floor(at)}, at).then((row: any)=>{ row[R.phase]=PHASE_RYOW; retainRead(row); }) : ryow(aux, ev.subject, receipt, !!replicaHost, replicaHost && "observe" in replicaHost ? replicaHost.observe.bind(replicaHost) : undefined))).finally(() => finishTrace(ryowTrace));
      ryowPending.add(p);
      void p.finally(() => ryowPending.delete(p));
    });
    job.onDone?.(receipt.position);
  };
  const resend = async (job: Job, out: any) => {
    const orig = original.get(job.ev.seq);
    if (!orig) { resends.push({ seq: job.ev.seq, result: "original-not-committed" }); out.outcome = "resend-of-uncommitted"; return; }
    out.attempts = 1;
    out.transactCalledAt = now();
    const res = await writer.transact(orig.operations, orig.meta);
    out.transactReturnedAt = now();
    let how = "mismatch";
    if (res.ok) how = "COMMITTED-AGAIN";
    else if (res.tag === "CommandAlreadyCommittedError" && res.error?.transactionId === orig.receipt.txId) how = "already-committed-original";
    else if ((await resolveByCommand(orig.meta.commandId))?.txId === orig.receipt.txId) how = "resolved-by-command";
    out.outcome = how === "mismatch" || how === "COMMITTED-AGAIN" ? "unaccounted" : "duplicate-returned-original";
    if (streamReads && out.outcome !== "duplicate-returned-original") streamFault ??= `Unresolved resend ${job.ev.seq}`;
    out.ackPublishedAt = now();
    original.delete(job.ev.seq);
    resends.push({ seq: job.ev.seq, result: how, tag: res.ok ? null : res.tag });
  };
  const schedulerOptions:SchedulerOptions<Job> = {
    offerTiming: config.schedulerTiming,
    observeQueue: process.env.TRIPLEX_TRACE_LEVEL !== "off" && process.env.TRIPLEX_TRACE_NODE !== "0",
    maxInFlight: config.writerMaxInFlight, deadlineMs: config.writerDeadlineMs, now, exec: execute,
    onOffer: (job: Job) => {
      jobTraces.set(job, beginTrace("commit", "driver.commit", { stream: job.ev.stream, seq: job.ev.seq, burst: job.ev.burst }, job.scheduledAt));
      if (job.ev.stream !== "background" || job.ev.resend) return;
      (pendingBySubject.get(job.key) ?? pendingBySubject.set(job.key, []).get(job.key)!).push(job.ev.seq);
    },
    onDone: (r: JobResult<Job>) => {
      completedJobs.add(r.job);
      for (const key of capturedByJob.get(r.job) ?? []) deferredPublications?.release(key, r.finishedAt);
      const commandId = outcomes.get(okey(r.job.ev))?.commandId;
      if (commandId && jobsByCommandId.get(commandId) === r.job) jobsByCommandId.delete(commandId);
      const ev = r.job.ev;
      const trace = jobTraces.get(r.job) ?? beginTrace("commit", "driver.expired", { stream: ev.stream, seq: ev.seq }, r.job.scheduledAt);
      const queue = r.queue?.map((q) => ({
        cause: q.cause,
        start: q.start,
        end: q.end,
        inFlight: q.inFlight,
        capacity: config.writerMaxInFlight,
        behindTraceId: q.behind ? (jobTraces.get(q.behind)?.traceId ?? null) : null,
      }));
      for (const q of queue ?? [])
        traceInterval(trace, `driver.queue.${q.cause}`, q.start, q.end, "driver-queue", undefined, {
          inFlight: q.inFlight,
          capacity: q.capacity,
          behindTraceId: q.behindTraceId,
        });
      const ack = outcomes.get(okey(ev))?.ackPublishedAt;
      if (Number.isFinite(ack)) traceInterval(trace, "driver.ack", ack, ack, "typescript", undefined, { marker: true });
      finishTrace(trace, { ackPublishedAt: ack, expired: r.expired, outcome: outcomes.get(okey(ev))?.outcome ?? "unknown", position:outcomes.get(okey(ev))?.position??null }, r.finishedAt);
      if (ev.stream === "background" && !ev.resend) {
        const list = pendingBySubject.get(ev.subject);
        if (list) { const k = list.indexOf(ev.seq); if (k >= 0) list.splice(k, 1); if (!list.length) pendingBySubject.delete(ev.subject); }
        const result = ackedBySeq.get(ev.seq) ?? { position: -1, ackAt: now() };
        if (!ackedBySeq.has(ev.seq)) ackedBySeq.set(ev.seq, result);
        for (const w of ackWaiters.get(ev.seq) ?? []) w(result);
        ackWaiters.delete(ev.seq);
      }
      const out = outcomes.get(okey(ev)) ?? {};
      out.traceId = trace?.traceId;
      out.queue = queue;
      if (r.expired) { out.outcome = "unaccounted"; out.reason = "not sent: writer deadline passed"; r.job.onDone?.(-1); }
      const row = { ...(tenantSpec&&ev.stream==="background"?{tenant:(ev as TenantEvent).tenant,localSeq:(ev as TenantEvent).localSeq,localSubject:(ev as TenantEvent).localSubject}:{}), stream: ev.stream, seq: ev.seq, resend: ev.resend, kind: ev.kind, subject: ev.subject, facts: ev.facts, burst: ev.burst, active: ev.active, correction: ev.correction, ackLoss: ev.ackLoss,
        ...(idle ? { idleGapMs: (ev as IdleEvent).idleGapMs, idleWarmup: (ev as IdleEvent).idleWarmup } : {}),
        offsetMs: r.job.scheduledAt - traceStart, scheduledAt: r.job.scheduledAt, offeredAt: r.offeredAt, startedAt: r.startedAt, finishedAt: r.finishedAt, latencyMs: r.latencyMs, waitMs: r.waitMs, expired: r.expired, ...out };
      if (!r.expired && Number.isFinite(row.ackPublishedAt)) Object.assign(row, commitClocks(row));
      if (row.stream === "background" && !row.resend && row.outcome === "committed") {
        row.verdictMs = verdictMs(row); row.verdictClock = VERDICT_CLOCK;
      }
      writes.push(row);
      if (book && ev.stream === "background" && !ev.resend)
        book.recordCommand({ seq: ev.seq, scheduledAt: r.job.scheduledAt, finishedAt: !r.expired && out.outcome === "committed" ? verdictEnd(row) : r.finishedAt, latencyMs: !r.expired && out.outcome === "committed" ? verdictMs(row) : r.latencyMs, outcome: r.expired ? "expired" : out.outcome ?? "unaccounted" });
    },
  };
  const scheduler=tenants ? new TenantScheduler(jobs,schedulerOptions,tenants) : new OpenLoopScheduler<Job>(jobs,schedulerOptions);
  upcomingJobs = (horizonMs) => scheduler.upcoming(horizonMs);
  /** Overlay command (not background): offered now, joins the subject's serial queue, accounted by stream. */
  const overlay = (stream: string, subject: number, facts: number) =>
    new Promise<number>((resolve) => {
      const seq = OVERLAY_SEQ[stream]! + (overlayCount[stream] = (overlayCount[stream] ?? 0) + 1);
      const ev: TraceEvent = { seq, atMs: now() - traceStart, kind: "runtime", subject, facts, correction: false, ackLoss: false, resend: false, burst: false, active: false, stream };
      scheduler.inject({ key: subject, scheduledAt: now(), ev, onDone: resolve });
    });
  const queueContextTimer =
    process.env.TRIPLEX_TRACE_LEVEL !== "off" && process.env.TRIPLEX_TRACE_NODE !== "0"
      ? setInterval(() => {
          const snapshot = scheduler.snapshot();
          if (!snapshot.waiting.length) return;
          traceResource("writer.queue-context", {
            inFlight: snapshot.inFlight,
            capacity: snapshot.capacity,
            active: snapshot.active.map((j) => ({
              traceId: jobTraces.get(j)?.traceId ?? null,
              step: currentTraceStep(jobTraces.get(j)),
            })),
            waiting: snapshot.waiting.slice(0, 128).map((j) => jobTraces.get(j)?.traceId ?? null),
            waitingCount: snapshot.waiting.length,
          });
        }, 20)
      : null;
  const queueTimer = setInterval(() => {
    let background = 0;
    for (const list of pendingBySubject.values()) background += list.length;
    queueSamples.push({ t: now(), background, all: scheduler.pending });
  }, 1000);

  // ---------------------------------------------------------------- feed consumer (P3)
  // [EXP-M01] Paired rounds measure the writer and the read probe; the P3 consumer and its crash injection stay in NS.
  const lvl = (tenantSpec?.study==="smoke" ? 2 : deepSmoke ? 5 : config.levelS ?? PROFILES[profile === "deep" || profile === "deep-live" ? "v3" : profile === "deep-smoke" ? "smoke" : profile].levelS) * 1000;
  const crashPlan: { at: number; point: CrashPoint }[] = idle ? [] : (["before-effect", "after-effect", "after-checkpoint"] as CrashPoint[]).map((point, k) => ({ point, at: traceStart + (k + 1.5) * lvl }));
  // [DX-H1] Why: Datomic observes the native transact-result boundary before the driver ACK; other lanes still lack observers.
  // Rejected: manufacturing a publication time from ackOf.instant or ACK arrival (Q98c/d; QA F2).
  const publicationClock = lane === "datomic" && !pairPlan ? openHostFeedClock() : null;
  const publicationSource = JSON.stringify({ route: "A0-control", dir: rawDir, epoch: `${scopeName}#0` });
  const publicationMode = process.env.DX_PUBLICATION_MODE ?? (lane === "datomic" ? "worker" : "insert");
  if (!["insert","legacy","deferred","worker"].includes(publicationMode)) throw Error("Invalid publication mode");
  report.publicationMode = publicationMode;
  const publicationFactory = publicationMode === "legacy" ? openLegacyPublicationWriter : openPublicationWriter;
  const publicationWriter = publicationClock ? publicationMode === "worker" ? await openAsyncPublicationWriter(path.join(rawDir, "publication.db"), publicationSource, publicationSource, publicationClock, { workerCpus: process.env.TRIPLEX_NODE_WORKER_CPUS, onPersist: (sample: any) => traceResource("driver.publication.persist-worker", { layer: "typescript", start: sample.start, end: sample.end, workerThread: sample.thread, synchronous: true, attributes: { position: sample.position, operationId: sample.publicationId } }) }) : publicationFactory(path.join(rawDir, "publication.db"), publicationSource, publicationSource, publicationClock) : null;
  const deferredPublications = ["deferred","worker"].includes(publicationMode) && publicationWriter ? new DeferredPublications(publicationWriter, key => readProducerPublication(publicationReader, key)) : null;
  const publicationReader = publicationWriter ? openPublicationReader(path.join(rawDir, "publication.db")) : null;
  if (!pairPlan && lane === "datomic" && config.composition !== "memory") {
    feed = new SideThread({tenants,dir:rawDir,epoch:`${scopeName}#0`,startAfter:seed.lastPosition,
      lane,composition:config.composition,scope:scopeName,publication:!!publicationWriter,
      feedPeer: replicaHost ? config.replicaPeer : "writer",
      crashes:crashPlan,publicationWaitMs:config.publicationWaitMs,pollTimeoutMs:120_000},log);
    feed.dir=rawDir;
    await feed.ready;
  } else {
  feed = pairPlan ? null : new FeedConsumer({
    publicationWaitMs: lane === "datomic" ? config.publicationWaitMs : 0,
    // [DX-H3] Why: match the existing 120-second final feed catch-up budget. Rejected: 30 seconds (censored a small poll that the earlier run completed).
    pollTimeoutMs: lane === "datomic" ? 120_000 : 0,
    tenants, dir: rawDir, epoch: `${scopeName}#0`, startAfter: seed.lastPosition, now,
    ...(publicationClock && publicationReader ? { measurement: { clock: publicationClock, records: publicationReader } } : {}),
    commitOf: (p) => { const a = ackOf.get(p); return a ? { instant: a.instant, ackAt: a.at, subject: a.subject, subjects: a.subjects ?? [a.subject], stamp: a.stamp, correction: a.correction, correctionValidFrom: a.correctionValidFrom } : undefined; },
    open: () => openComposition(config.composition, lane, scopeName), log, crashes: crashPlan,
  });
  }
  if (publicationWriter) observeDatomicPublication((position, operationId, diagnostics, commandIds = []) => {
    const publicationStartedAt = now();
    const owners = [...new Set(commandIds.flatMap((id) => jobsByCommandId.has(id) ? [jobsByCommandId.get(id)!] : []))];
    if (owners.length > 1) throw Error("Native transaction crosses measured writer jobs");
    const key = feed!.publicationKey(position), job = owners[0];
    if (deferredPublications) {
      const held = !!job && !completedJobs.has(job);
      withTrace(job && jobTraces.get(job), () => traceSync("driver.publication.capture", () => deferredPublications.capture(key, operationId, job ? jobTraces.get(job)?.traceId ?? null : null, held)));
      if (held) (capturedByJob.get(job!) ?? capturedByJob.set(job!, []).get(job!)!).push(key);
    } else traceSync("driver.publication", () => publicationWriter.publish(key, operationId));
    publicationTimes.set(position, { publicationStartedAt, publicationOperationId: operationId, ...(deferredPublications ? { publicationDeferred: true, publicationCapturedAt: now() } : { publicationDurableAt: now() }), ...(diagnostics === undefined ? {} : { diagnostics }) });
  });
  report.publicationObserver = publicationWriter ? deferredPublications ? "Native transact-result event captured before receipt; primary witness persisted after unchanged scheduler finishedAt; all witnesses drained before final validation" : "DatomicClient.transact result, before Triples receipt and driver ACK; durable bound host-clock sidecar" : "not integrated";
  if (publicationWriter && config.probe10PerS > 0 && config.composition !== "memory") {
    probeThread = new ProbeThread({dir:rawDir,epoch:`${scopeName}#0`,lane,composition:config.composition,scope:scopeName});
    await probeThread.ready;
  }
  const feedTarget = setInterval(() => { if (feed) feed.lifeMaxTarget = acked.latest?.position ?? 0; }, 100);
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
  type ProbeJob = { key: number; scheduledAt: number; ev: { seq: number; atMs: number; subject: number }; ok?: boolean; responseAt?: number };
  const probeComp = pairPlan ? await openComposition(config.composition, lane, scopeName) : null;
  const probeScheduler = pairPlan
    ? new OpenLoopScheduler<ProbeJob>(probeEvents.map((ev) => ({ key: ev.seq, scheduledAt: traceStart + ev.atMs, ev })), {
        maxInFlight: pairPlan.probe.maxInFlight, deadlineMs: pairPlan.probe.deadlineMs, now,
        exec: async (job) => {
          const latest = acked.latest!;
          const basis = { recordedAt: latest.instant, validAt: Math.floor(now()) };
          const start = now();
          const t0 = performance.now();
          try {
            const pr = await probeComp!.pull(ids.placement(job.ev.subject), basis);
            job.responseAt = now();
            const o = observe(pr);
            retainRead([PHASE_PROBE, job.ev.subject, basis.recordedAt, basis.validAt, start, performance.now() - t0, o.stamp, o.facts, o.digest, o.bytes, pr.depth, pr.roundTrips, null, 0, latest.position, 0, -1, 0, pr.route, pr.language, pr.waitedMs]);
            job.ok = true;
          } catch (error: any) {
            retainRead([PHASE_PROBE, job.ev.subject, basis.recordedAt, basis.validAt, start, performance.now() - t0, -1, 0, "", 0, 0, 0, String(error?._tag ?? "Error"), 0, latest.position, 0, -1, 0, "error", "", 0]);
            job.ok = false;
          }
        },
        onDone: (r) => book!.recordProbe({ seq: r.job.ev.seq, scheduledAt: r.job.scheduledAt,
          finishedAt: !r.expired && r.job.ok ? r.job.responseAt! : r.finishedAt,
          latencyMs: !r.expired && r.job.ok ? r.job.responseAt! - r.job.scheduledAt : r.latencyMs,
          ok: !r.expired && r.job.ok === true, expired: r.expired }),
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
  // [DX-RD1] Why: retain the stress, recovery and weighted phases inside one short diagnostic arm and its exact zero control.
  // Rejected: truncating v3 or including the multi-hour depth-growth phases under a short time budget.
  const rd1Phases = new Set(["warmup", "baseline", "L256", "L1024", "recovery", "p4mix"]);
  const keepPhase = (p: ReturnType<typeof nsPlan>[number]) => {
    if (rd1ReadDiagnostic) return rd1Phases.has(p.name);
    return !config.readerLadderOnly || p.name === "warmup" || (p.ladder && p.readers <= (config.maxReaders ?? 256));
  };
  let plan: ReturnType<typeof nsPlan> = tenantSpec && deepId ? tenantPhases(tenantSpec,deepId.arm) : smallOnly ? smallPhases(deepAccount) : interferenceOnly ? interferencePhases(deepAccount) : activation ? [
    { name: "presweep", readers: 64, seconds: 100, measured: true, mode: "mixed" },
    { name: "activation", readers: 64, measured: true, mode: "mixed" },
  ] : deepSmoke ? [
    { name: "warmup", readers: config.zeroReaders ? 0 : 1, seconds: 5, measured: false },
    { name: "L4", readers: config.zeroReaders ? 0 : 4, seconds: 25, measured: true, ladder: true, mode: "mixed" },
  ] : idle ? idle.phases : nsPlan(profile === "deep" || profile === "deep-live" || profile === "deep-smoke" ? "v3" : profile, config.zeroReaders).filter(keepPhase).map((p) => (config.levelS && p.seconds ? { ...p, seconds: Math.min(p.seconds, config.levelS) } : p));
  // [DX-RD1] Why: exercise the real rolling collector and source frontier in a brief owned smoke run.
  // Rejected: weakening the fixed v3 schedule or using a scaled run for a verdict.
  if (rollingReadSmoke) {
    let offset = 0;
    plan = plan.map(p => {
      assert(p.seconds && !p.sweep && !p.growHistoryTo);
      const phase = { ...p, traceFromS: offset };
      offset += p.seconds;
      return phase;
    });
  }
  const phases: any[] = [];
  // [DX-B2-N3] Why: identify a completed indexing job inside each P1 level, not unbound log words.
  // Rejected: issuing maintenance after readers stop.
  const indexClient = lane === "datomic" ? new (await import(pathToFileURL(path.join(REPO,"packages/datomic/dist/index.js")).href)).DatomicClient(process.env["DATOMIC_URL"] ?? "http://127.0.0.1:8493", 601000) : null;
  const indexScope = indexClient ? await indexClient.create(runtimeApi.DatabaseScope.test(scopeName)) : null;
  if (streamReads && indexScope?.strictRecordClocks !== true) throw Error("Rolling verification requires a source-enforced strict clock");
  const indexDb = indexScope?.db ?? null;
  if (deepId) {
    const scopeKey = String(runtimeApi.DatabaseScope.test(scopeName));
    assert.equal(indexDb, `s2-${Buffer.from(scopeKey).toString("base64url")}`, "Gateway opened a different database");
    report.deep.database = indexDb;
    await confirmDeepStart(path.resolve(opt("deep-barrier")!),deepId,indexDb!,traceStart);
  }
  await sleep(Math.max(0, traceStart - now()));
  if (deep) void watermarkSampler(aux);
  if (deep && (fullLength || interferenceOnly || smallOnly || deepSmoke && process.env.DX_INT1_NATIVE_WRITE_READBACK === "1")) scheduler.setUntil(traceStart + (deepSmoke ? 30 : smallOnly ? smallSeconds : interferenceOnly ? interferenceSeconds : V3_OFFER_SECONDS) * 1000);
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
    if (streamReads && spec.traceFromS === undefined && streamClockCeiling === Infinity) streamClockCeiling = latestInstant;
    if (spec.traceFromS !== undefined) {
      const target = traceStart + spec.traceFromS * 1000;
      if (now() < target) await sleep(target - now());
      if (now() - target > config.settleS * 1000)
        throw Error(`v3 phase ${spec.name} missed its fixed start by more than settle`);
    }
    // [DX-H4] Why: settle retained datoms before timing each matched history depth.
    // Rejected: timing immediately after growth (measures live memory-index churn).
    const historyIndex = indexClient && /^p4h(1|3|10)$/.test(spec.name)
      ? await requestIndex(indexClient, indexDb, spec.name, now, 60_000) : null;
    if (historyIndex) datomicMaintenanceJobs.push(historyIndex);
    const phaseCpuStart = process.cpuUsage();
    const writerEluStart = performance.eventLoopUtilization();
    const writerDelay = monitorEventLoopDelay({ resolution: 1 }); writerDelay.enable();
    const start = spec.traceFromS === undefined ? now() : traceStart + spec.traceFromS * 1000;
    const entry: any = { actualStart: now(), pool: spec.pool, cycle: spec.cycle, writerDiagnosticsStart: datomicWriterDiagnostics(), historyIndex, idx, name: spec.name, readers: config.maxReaders === null ? spec.readers : Math.min(spec.readers, config.maxReaders), mode: spec.mode ?? "mixed", measured: spec.measured, start, traceStartS: (start - traceStart) / 1000 };
    phases.push(entry);
    phaseStarts.set(idx, start);
    let checkedPlan: ReadWindowPlan | undefined;
    if (streamReads && spec.traceFromS !== undefined) {
      const to = start + spec.seconds! * 1000, settle = config.settleS * 1000;
      const windows = spec.measured ? [{ name: spec.name, from: start + settle, to }] : [];
      if (spec.name === "L256-A") windows.push({ name: "L256-legacy", from: start + settle, to: start + 45_000 });
      if (spec.name === "L256-D") windows.push({ name: "L256-adjacent", from: to - 45_000 + settle, to });
      const recoveryWidth = Math.min(30, spec.seconds!);
      const recovery = spec.pool === "recovery" || spec.name === "recovery"
        ? Array.from({ length: Math.floor((spec.seconds! - recoveryWidth) / 5) + 1 }, (_, i) =>
          ({ name: spec.name, from: start + i * 5000, to: start + i * 5000 + recoveryWidth * 1000 }))
        : [];
      checkedPlan = { windows, recovery };
    }
    await spill?.beginPhase(idx, start, config.settleS * 1000, checkedPlan);
    setReaders(idx, spec.readers, spec.mode ?? "mixed");
    const indexJob = indexClient && /^L[0-9]+(?:-[A-Z0-9]+)?$/.test(spec.name) && spec.seconds ? (() => {
      const delay = Math.min(config.settleS * 1000, Math.max(0, spec.seconds! * 1000 - 1000));
      return scheduleMaintenanceBins(start + delay, start + spec.seconds! * 1000, fullLength, now, sleep, async waitMs => {
        datomicMaintenanceJobs.push(await requestIndex(indexClient, indexDb, spec.name, now, waitMs));
      });
    })() : null;
    log(`phase ${spec.name}: ${entry.readers} readers at trace ${entry.traceStartS.toFixed(0)}s; writer pending ${scheduler.pending}`);
    if (spec.growHistoryTo) entry.history = await growHistory(spec.growHistoryTo, config.levelS ? Math.min(spec.maxS ?? 1800, 10 * config.levelS) : spec.maxS ?? 1800);
    else if (spec.name === "activation" && activation) {
      report.deep.r2 = await activation.execute(writer, "R2", (receipt, ops, actor) => {
        modelWriter.bindReceipt(ops, receipt, actor);
        noteAck(receipt, -1, { seq: receipt.position, stream: "deep-activation", correction: false, correctionValidFrom: null, stamp: -1, subjects: [] });
      }, async cut => {
        const people = chooseSamples(releaseTarget?.people??N, 10).map(i=>i+(releaseTarget?.first??0)), positions = await Promise.all(people.map(i => overlay("p5-mutation", i, 6)));
        assert(positions.every(p => p > cut.position), "Missing post-capture mutation"); return people.map((subject,k) => ({ subject, position: positions[k] }));
      });
      save();
    }
    else if (spec.name === "activation" && tenantReleasePhase) { /* [DX-SCALE1] Why: wait on the target’s measured release below. Rejected: holding neighbors for the whole ceiling. */ }
    else if (spec.sweep) entry.sweep = await runSweep(idx, config.levelS ? Math.min(spec.maxS ?? 1800, 10 * config.levelS) : spec.maxS ?? 1800);
    else if (spec.seconds) {
      await sleep(Math.max(0, start + spec.seconds * 1000 - now()));
      if (!config.zeroReaders && /^p4h(1|3|10)$/.test(spec.name)) {
        const deadline = now() + 120_000;
        while ((settledReadCounts.get(idx) ?? 0) < 10_000 && now() < deadline) await sleep(250);
      }
    }
    if (spec.name==="activation" && tenantReleasePhase) report.deep.tenantActivation=await tenantRelease(path.resolve(opt("deep-barrier")!),deepId!,start,start+spec.seconds!*1000,report.deep.r2);
    entry.actualEnd = now();
    entry.end = spec.name==="activation" && tenantReleasePhase ? report.deep.tenantActivation.endedAt : spec.traceFromS === undefined ? entry.actualEnd : start + spec.seconds! * 1000;
    writerDelay.disable();
    entry.writerDiagnosticsEnd = datomicWriterDiagnostics();
    entry.writerThread = { elu: performance.eventLoopUtilization(writerEluStart).utilization, longestBlockedMs: writerDelay.max / 1e6, p99BlockedMs: writerDelay.percentile(99) / 1e6 };
    const phaseCpu = process.cpuUsage(phaseCpuStart);
    entry.clientCpuMs = (phaseCpu.user + phaseCpu.system) / 1000;
    await indexJob;
    entry.traceEndS = (entry.end - traceStart) / 1000;
    entry.overlapsBurst = overlapsBurst(entry.traceStartS, entry.traceEndS, params);
    // [DX-R3] Why: finished phase observations and memory survive a late kill; only final all-ACK analysis can certify correctness.
    // Rejected: a final-report-only memory sample or an online PASS before earlier record-time commits settle.
    entry.memory = { ...process.memoryUsage(), peakProcessBytes: process.resourceUsage().maxRSS * 1024,
      retainedReads: spill?.length ?? records.length, numericResidentBytes: records instanceof ReadRecords ? records.residentBytes : null };
    console.log(JSON.stringify({ kind: "phase-memory", phase: entry.name, ...entry.memory }));
    if (spill) await spill.checkpoint(); else if (records instanceof ReadRecords) records.checkpoint();
    report.phaseProgress = spill ? spill.progress : Object.fromEntries([...observedPhases].map(([id, s]) => [id, {
      reads: s.reads, errors: s.errors, read: s.read.toJSON(), watermarkWait: s.wait.toJSON(), routes: s.routes,
      verification: "PENDING final all-ACK model comparison; observed arrivals include settle and may omit in-flight reads" }]));
    report.phases = phases;
    save();
  }
  if (activation && deepId && !tenantSpec) {
    report.deep.activationTraffic = await finishDeepActivations(
      path.resolve(opt("deep-barrier")!), deepId, report.deep.r2.endedAt, report.deep.r2.cut.position,
    );
  }
  if (config.matchDurationS) {
    const until = traceStart + config.matchDurationS * 1000;
    if (now() < until) {
      const entry: any = { idx: phases.length, name: "tail", writerDiagnosticsStart: datomicWriterDiagnostics(), readers: 0, measured: false, start: now(), traceStartS: (now() - traceStart) / 1000 };
      phases.push(entry);
      setReaders(entry.idx, 0, "mixed");
      log(`phase tail: matching both arms to the fixed trace length (${config.matchDurationS}s)`);
      const tailElu = performance.eventLoopUtilization();
      const tailDelay = monitorEventLoopDelay({ resolution: 1 }); tailDelay.enable();
      await sleep(until - now());
      entry.end = now();
      tailDelay.disable();
      entry.writerDiagnosticsEnd = datomicWriterDiagnostics();
      entry.writerThread = { elu: performance.eventLoopUtilization(tailElu).utilization, longestBlockedMs: tailDelay.max / 1e6, p99BlockedMs: tailDelay.percentile(99) / 1e6 };
      entry.traceEndS = (entry.end - traceStart) / 1000;
    }
  }
  cpuMarks.push({ t: now(), cpu: process.cpuUsage() });

  // ---------------------------------------------------------------- wind down
  const endAt = now();
  const deepStage = (stage: string) => { if (deep) log(`deep finalization: ${stage}`); };
  deepStage("stopping offers");
  if (idleKeep) report.idleKeep = await idleKeep.close();
  if (probeTimer) clearInterval(probeTimer);
  clearInterval(queueTimer);
  if (queueContextTimer) clearInterval(queueContextTimer);
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
  if(tenants && (tenantSpec?.study==="small" || tenantSpec?.study==="smoke")){
    assert(scheduler.inFlightCount===0 && scheduler.pending===0,"Timed tenant writes still in progress");
    const startedAt=now(),checks=await challengeTenants(tenants,startedAt+10,schedulerOptions);
    report.deep.tenantChecks={identity:deepId,startedAt,timedEnd:endAt,checks:checks.map(c=>{
      const primary=outcomes.get(c.stream+":"+c.seq+":0"),resend=outcomes.get(c.stream+":"+c.seq+":1");
      const lost=lostAck.find(r=>r.seq===c.seq),ack=ackOf.get(primary?.position);
      assert(primary?.outcome==="committed" && primary.path==="lost-ack-resolved" && resend?.outcome==="duplicate-returned-original");
      assert(lost?.resolvedOriginal && lost.retryNamesOriginal && lost.retryTag==="CommandAlreadyCommittedError" && ack?.correction && ack.subject===c.subject);
      return {...c,commandId:primary.commandId,position:primary.position,lost,duplicate:resend.outcome,validFrom:ack.correctionValidFrom};
    })};
  }
  const inFlightAtFeedTarget = scheduler.inFlightCount;
  deepStage(`flushing publications with ${inFlightAtFeedTarget} writes in flight`);
  report.writerSourceDiagnostics.end = datomicWriterDiagnostics();
  if (deferredPublications) report.deferredPublication = await deferredPublications.flush();
  deepStage("draining receipt reads");
  const receiptQueue = await receiptThread?.drainReceiptCaptures();
  if (receiptQueue) {
    mainReadCount += receiptQueue.retained;
    Object.assign(ryowFallbackReasons, receiptQueue.fallbackReasons);
  } else await Promise.race([Promise.all([...ryowPending]), sleep(30_000)]);
  deepStage("stopping readers");
  for (const w of workers) w.postMessage({ type: "stop" });
  await Promise.race([Promise.all(stopped), sleep(40_000)]);
  for (const w of workers) await w.terminate();
  if (historicalFallback) {
    const stats = await historicalFallback.snapshot();
    await historicalFallback.close();
    if (stats.queued || stats.active || stats.requested !== stats.replied + stats.declined + stats.errors)
      throw Error("Historical fallback requests did not drain exactly");
    report.historicalFallback = stats;
  }
  clearInterval(basisTimer);
  if (preparedSweeper) { preparedSweeper.worker.postMessage({ type: "stop" }); await preparedSweeper.worker.terminate(); }
  deepStage("closing replica");
  await replicaHost?.close();
  if (replicaHost) report.replica = { copyBytes: replicaHost.replica.bytes, historyBytes: replicaHost.index.historyBytes,
    floor: replicaHost.index.floor, position: replicaHost.index.position, positionWindow: replicaHost.index.positions,
    historyBudgetBytes: replicaHost.index.maxBytes, historyCoverage: config.replicaHistoryCoverage, feedPeer: config.replicaPeer, feedEndpoint: "endpoint" in replicaHost ? replicaHost.endpoint : (await import("./lib/replica-reads.ts")).replicaEndpoint(process.env, config.replicaPeer), applyThread: config.replicaThread,
    receiptGateway: "gatewayObserverStats" in replicaHost ? replicaHost.gatewayObserverStats : null,
    acknowledgementToApplied: "applied" in replicaHost ? (await import("./lib/replica-thread.ts")).appliedDelay(replicaHost.applied, ackOf) : null,
    peakProcessBytesBeforeAnalysis: process.resourceUsage().maxRSS * 1024 };
  // Growth commands that outlived their phase: wait for them, then fold any that committed into the model.
  for (const late of lateGrowth) {
    await Promise.race([late.pending, sleep(60_000)]);
    const receipt = await resolveByCommand(late.cmd.commandId);
    if (!receipt) { log(`history growth: ${late.cmd.commandId} never committed`); continue; }
    const at = noteAck(receipt, -1, { seq: -1, stream: "p4-history", correction: false, correctionValidFrom: null, stamp: -1, subjects: late.cmd.perSubject.map((x: any) => x.subject) });
    if (late.cmd.perSubject.some((x: any) => oracleRecordSet.has(x.subject))) recordedCommands.push({ commandId: late.cmd.commandId, operations: late.cmd.operations, preconditions: late.cmd.preconditions, actor: "p4-history", receipt: { txId: receipt.txId, position: receipt.position, instant: receipt.instant, assertionIds: alignAssertIds(late.cmd.operations, receipt) } });
    modelWriter.bindReceipt(late.cmd.operations, receipt, "p4-history");
    for (const s of late.cmd.perSubject) modelWriter.addCommit(s.subject, { instant: receipt.instant, position: receipt.position, txId: receipt.txId, stamp: -1, stampValidFrom: 0, parts: partsOf(s.added, s.added.map(() => SEED_VALID_FROM), s.removed, s.removed.map(() => SEED_VALID_FROM)), ackAtMs: at, stream: "p4-history" });
  }
  lateGrowth.length = 0;
  deepStage("sealing observations");
  if (frontierTimer) clearInterval(frontierTimer);
  if (streamFault || streamReads && activeModelWrites.size) throw Error(streamFault ?? "Unclosed model writer at reader seal");
  if (streamReads) sendFrontier();
  if (spill) { records = await spill.finish(streamReads ? readFrontier() : undefined); spillFinished = true; }
  await splitWrites;
  if (splitWriteError) throw splitWriteError;
  report.splitEvidence = { rule: config.splitTarget,
    ...(spill?.checked?.splits ?? await (await import("./lib/split-evidence.ts")).completeSplitEvidence(splitDirectory, replicaHost && "applied" in replicaHost ? replicaHost.applied : [])) };
  deepStage("draining the feed");
  const lastAcked = Math.max(highestAckedPosition, await writer.currentPosition().catch(() => 0));
  const feedDeadline = now() + 120_000;
  while (feed && !feedFailure && feed.checkpoint < lastAcked && now() < feedDeadline) await sleep(100);
  feedWind = feed ? { target: lastAcked, checkpointAtStop: feed.checkpoint, inFlightAtFeedTarget } : null;
  deepStage("stopping feed consumer");
  feed?.stop();
  await feedDone.catch(() => {});
  clearInterval(feedTarget);
  let replay: any = feedFailure ? { exact: false, status: "NOT-RUN", reason: "feed consumer failed" } : null;
  // [EXP-M01R] Why: paired rounds have no P3 consumer; NS keeps main's post-drain target and replay. Rejected: restoring the old early feed target (misses late commits).
  if (feed && !feedFailure) {
    deepStage("replaying the source journal");
    const replayHandle = await openComposition(config.composition, lane, scopeName);
    const firstCrash = feed.crashReport().find((c) => c.checkpoint !== null);
    replay = await feed.replayCheck(replayHandle, firstCrash?.checkpoint ?? seed.lastPosition);
    await replayHandle.close().catch(() => {});
  }
  report.readerLifecycle = readerLives.map(({ worker, life }) => ({ worker, stopped: life.stopped, failures: life.failures }));
  report.readerBasisBroadcast = { mode: config.readerBasisWire, messages: basisBroadcast.messages, ackItems: basisBroadcast.ackItems, ticks: basisBroadcast.ticks, wall: basisBroadcast.wall.summary() };
  const finalizationErrors: string[] = readerLives.flatMap(({ worker, life }) => [...life.failures, ...(life.stopped ? [] : ["missing drained stopped acknowledgement"])].map(error => `reader ${worker}: ${error}`));
  deepStage("capturing terminal observations");
  const finalPosition = await observeFinalHead(() => writer.currentPosition(), finalizationErrors);
  const deepSamples: any[] = [];
  deepStage(`terminal head ${finalPosition}, reading ${oracleSet.size} sample subjects at two cuts`);
  if (deep && finalPosition !== null) {
    // [DX-SCALE1] Why: query the live source runtime at both exact cuts after the replica has closed. Rejected: using the auxiliary pull routed to the retired replica, or using generated rows as observed evidence.
    const cuts = [[seed.lastInstant, seed.lastPosition], [latestInstant, finalPosition]] as const;
    try {
      if (tenants && tenantMembership) {
        const basis={recordedAt:latestInstant,recordedPosition:finalPosition,validAt:Math.floor(now())};
        const {worlds,...proof}=await tenantQueries(writer,tenants,{position:finalPosition,validAt:basis.validAt});
        assert.deepEqual(proof.receiptProjection,tenantMembership.value(),"Membership at the named cut differs from actual seed receipts");
        const normalize=(rows:unknown[][])=>rows.map(row=>JSON.stringify(row)).sort();
        const witnesses=[];
        for(const w of worlds) {
          const single=await writer.pull(ids.placement(w.subject),basis);
          const rows=w.rows.map(r=>[r.entityId,r.attribute,r.value,r.validFrom,r.validTo??null,r.id]);
          assert.deepEqual(normalize(rows),normalize(single.triples.map(t=>[t.entityId,t.attribute,t.value,t.validFrom,t.validTo?._tag==="Some"?t.validTo.value:null,t.id])));
          witnesses.push({subject:w.subject,account:w.account,rows:rows.length});
          deepSamples.push({subject:w.subject,basis,observation:observe(single),rows,source:"pinned-multi-root"});
        }
        report.deep.crossAccount={identity:deepId,database:report.deep.database,proof,witnesses,seedProjection:tenantMembership.value()};
      }
      for (const subject of oracleSet) for (const [recordedAt, recordedPosition] of cuts) {
        const basis = { recordedAt, recordedPosition, validAt: Math.floor(now()) };
        let timer: ReturnType<typeof setTimeout> | undefined;
        const result = await Promise.race([writer.pull(ids.placement(subject), basis), new Promise<never>((_,reject) => { timer=setTimeout(()=>reject(Error(`Terminal read at ${recordedPosition} exceeded 30 seconds`)),30000); })]).finally(()=>clearTimeout(timer));
        if (deepSamples.length % 10 === 0) deepStage(`terminal gateway sample ${deepSamples.length + 1}`);
        assert(result.triples.some(t => t.entityId === ids.placement(subject) && t.attribute === ":placement/stamp"));
        deepSamples.push({ subject, basis, observation: observe(result), rows: result.triples.map(t => [t.entityId, t.attribute, t.value, t.validFrom ?? null, t.validTo?._tag === "Some" ? t.validTo.value : null, t.id]) });
      }
    } catch (error) {
      finalizationErrors.push(`Deep terminal samples ${deepSamples.length}/${2*oracleSet.size}: ${String(error)}`);
    }
  }
  samplersOn = false;
  clearInterval(eluTimer);
  deepStage("reading maintenance evidence");
  const maintenance = await maintenanceEvents(traceStart);
  indexClient?.close();
  deepStage("closing public runtimes");
  await writer.close().catch(() => {});
  await aux.close().catch(() => {});
  await growthComp.close().catch(() => {});
  await probeComp?.close().catch(() => {});
  await probeThread?.close();
  deepStage("closing feed worker");
  if (feed instanceof SideThread) { report.sideThread = { elu: feed.elus }; await feed.close(); }
  observeDatomicPublication(undefined);
  if (deferredPublications) report.deferredPublication = await deferredPublications.flush();
  deepStage("closing publication witness");
  publicationReader?.close();
  await publicationWriter?.close();
  log(`wind down: writer pending ${scheduler.pending}, probe pending ${probeScheduler?.pending ?? 0}, feed checkpoint ${feed?.checkpoint ?? "-"}/${lastAcked}, final position ${finalPosition}`);
  fs.writeFileSync(path.join(rawDir, "ns-writes.jsonl"), writes.map((w) => JSON.stringify(latencyReceipt({ ...w, writer: "ns-write-event/1", qleverConnectionMode: report.qleverConnectionMode, stream: w.stream, seq: w.seq, resend: w.resend, offsetMs: w.offsetMs, latencyMs: w.latencyMs, facts: w.facts, burst: w.burst, outcome: w.outcome }))).join("\n") + "\n");

  // [DX-R3] Why: persist the final buffered observations before the CPU-heavy all-ACK checker starts.
  // Rejected: only checkpointing phase boundaries while the last worker batch remains memory-only.
  if (records instanceof ReadRecords) records.checkpoint();
  report.phaseProgress = spill ? spill.progress : Object.fromEntries([...observedPhases].map(([id, s]) => [id, {
    reads: s.reads, errors: s.errors, read: s.read.toJSON(), watermarkWait: s.wait.toJSON(), routes: s.routes,
    verification: "PENDING final all-ACK model comparison; all arrived worker batches persisted" }]));
  report.phases = phases;
  save();
  cpuProfileClock("end");
  // [DX-T1-7] Why: every receipt/commit must hydrate and verify before any expected-world verdict is computed.
  // Rejected: accepting a smaller heap by skipping the complete model or exposing an incompletely replayed model.
  if (modelJournalThread) {
    const sealed = await modelJournalThread.seal();
    modelJournal = sealed.journal;
    report.expectedStateJournalQueue = sealed.queue;
  }
  if (spill?.checked) {
    const seal = spill.checked.journal;
    assert.equal(seal.file, modelJournalFile);
    for (const key of ["source", "slot", "run", "subjects"] as const) assert.equal(seal[key], modelJournalContext[key]);
    modelJournal = new ModelJournal(modelJournalFile, modelJournalContext, seal);
    report.expectedStateJournalQueue = spill.modelQueue;
    report.streamReadProgress = { captured: spill.checked.captured, compared: spill.checked.compared,
      pending: spill.checked.pending, peakPending: spill.checked.peakPending, pendingLimit: spill.checked.pendingLimit,
      sealedClock: spill.checked.sealedClock };
  }
  if (modelJournal) {
    const restored = modelJournal.restore(); model = restored.model; expectations = new ExpectationCache(model);
    report.expectedStateJournal = await modelJournal.archive();
  }
  // ---------------------------------------------------------------- analysis
  report.writer = { offered: scheduler.offered, completed: scheduler.completed, expired: scheduler.expired, notOffered: scheduler.notOffered, maxInFlightSeen: scheduler.maxInFlightSeen, pendingAtEnd: scheduler.pending, offeredUntilTraceS: (endAt - traceStart) / 1000, overlays: overlayCount };
  report.finalPosition = finalPosition === null ? null : coordinate(finalPosition);
  if (feed && feed.uncheckedIntents) finalizationErrors.push(`${feed.uncheckedIntents} feed intent checks still lack ACK metadata`);
  if (ryowPending.size) finalizationErrors.push(`${ryowPending.size} read-your-own-write pulls did not finish`);
  if (receiptQueue) {
    // [DX-DRV1] Why: every spooled tuple must name its distinct live ACK even if two worlds have the same digest.
    // Rejected: trusting a matching count or reusing a row from another receipt of the same subject.
    const committed = writes.filter(w => w.stream === "background" && !w.resend && w.outcome === "committed" && !w.expired);
    const expected = new Map<number, typeof committed[number]>(committed.map(w => [w.position, w]));
    let matched = 0, mismatches = committed.length - expected.size;
    visitPhase(PHASE_RYOW, row => {
      const position = row[R.basisPosition], write = expected.get(position);
      if (!write || row[R.subject] !== write.subject || row[R.recordedAt] !== ackOf.get(position)?.instant ||
          row[R.validAt] !== Math.floor(row[R.start]) || row[R.start] < write.ackPublishedAt) mismatches++;
      else { expected.delete(position); matched++; }
    });
    report.receiptCapture = { ...receiptQueue, matched, missing: expected.size, mismatches };
    if (mismatches || expected.size || matched !== receiptQueue.retained)
      finalizationErrors.push("Receipt capture rows differ from actual commit positions and bases");
  }
  if (config.readPath === "replica") {
    report.rawLocalSamples = rawLocalCoverage(phases, oracleSamples);
    report.replicaRecordClockPolicies = readerFinalDiagnostics.map(x => ({ worker: x.worker, strictRecordClocks: x.diagnostics.strictRecordClocks }));
    report.timeOnlyRouting = phases.filter(p => p.readers > 0).map(p => {
      const counts = readerFinalDiagnostics.map(x => x.diagnostics.phases?.[p.idx]);
      const reads = counts.reduce((n, x) => n + (x?.timeOnlyReads ?? 0), 0);
      const local = counts.reduce((n, x) => n + (x?.timeOnlyLocal ?? 0), 0);
      return { phase: p.name, reads, local, localShare: reads ? local / reads : null };
    });
    for (const level of report.rawLocalSamples) if (!level.ok)
      finalizationErrors.push(`${level.phase}: locally answered raw oracle samples ${level.compared}/${level.minimum}`);
  }
  report.finalizationErrors = finalizationErrors;
  report.positionCoordinates = "TARGETS 4.1 item 3: (stream, epoch, offset, ordinal); Triplex gives one dense position per scope and one engine transaction per transact, so offset = position and ordinal = 0";
  report.maintenance = maintenance;
  // [DX-R3-P8] Why: both checks consume immutable post-drain inputs; overlap them after the last measured phase.
  // Rejected: serial analysis plus oracle extending a 45-minute lease, or moving either check onto live read/write paths.
  deepStage("comparing retained reads to the model and O-REPLAY");
  const independentOracle = (config.zeroReaders && !deep ? Promise.resolve({ status: "NOT-RUN", reason: "zero-reader baseline run" }) : pairPlan && pairPlan.readers === 0 ? Promise.resolve({ status: "NOT-RUN", reason: "paired rounds without readers: O-REPLAY samples come from reader threads" }) : finalPosition === null ? Promise.resolve({ status: "NOT-RUN", reason: "final source position unavailable", observedAckFloor: coordinate(lastAcked) }) : runOracle(finalPosition, lastAcked, deepSamples))
    .catch(error => ({ status: "ORACLE-ERROR", stderr: String(error) }));
  if (pairPlan) pairedAnalysis({ rounds: pairRounds!, probeScheduler: probeScheduler!, probeEvents: probeEvents.length });
  else analyse({ phases, traceStart, replay, maintenance, historyList, pendingAtEnd: scheduler.pending, events });
  // [DX-R3-P9] Why: the cache control exposed receipt errors outside ladder windows; DONE must reject every read error too.
  // Rejected: treating zero wrong worlds as a successful zero-error proof.
  if (report.correctness?.violations || report.correctness?.errors)
    finalizationErrors.push(`All-read correctness: ${report.correctness.violations} violations, ${report.correctness.errors} errors`);
  // [DX-R3-P8] Why: a slow or killed independent oracle must not erase already completed all-read judgments and bars.
  // Rejected: first saving analysis only after the independent process returns.
  report.status = "ANALYSED";
  report.oracle = { status: "NOT-RUN", reason: "independent oracle pending" };
  save();
  report.oracle = await independentOracle;
  if (config.oracleRoot && (deep || !config.zeroReaders) && !(pairPlan && pairPlan.readers === 0) && (report.oracle.status !== "PASS" || deep && report.oracle.modelCorrectOnSameReads !== report.oracle.reads))
    finalizationErrors.push(`Independent oracle ${report.oracle.status}`);
  // [DX-H1] Why: API round trips and observed HTTP requests differ when reach falls back inside the adapter.
  // Rejected: discarding the reader's roundTrips field during analysis (cannot compare compositions).
  let pulls = 0, roundTripSum = 0;
  const roundTripDistribution: Record<string, number> = { ...spill?.checked?.trips };
  for (const [trips, n] of Object.entries(roundTripDistribution)) { pulls += n; roundTripSum += Number(trips) * n; }
  records.forEach(r => { if (r[R.error] === null) { pulls++; roundTripSum += r[R.roundTrips]; const key = String(r[R.roundTrips]); roundTripDistribution[key] = (roundTripDistribution[key] ?? 0) + 1; } });
  report.pullRoundTrips = { pulls, mean: pulls ? roundTripSum / pulls : null,
    distribution: roundTripDistribution, unit: "public Triples service calls; see httpRequests for actual HTTP" };
  if (spill) {
    const attempts = readerFinalDiagnostics.reduce((n, x) => n + (x.diagnostics.readAttempts?.attempted ?? 0), 0);
    const completed = readerFinalDiagnostics.reduce((n, x) => n + (x.diagnostics.readAttempts?.completed ?? 0), 0);
    const retained = records.length + (spill.checked?.captured ?? 0), judged = judgedReadCount + (spill.checked?.compared ?? 0);
    report.observationAccounting = { attempts, completed, mainReadCount, retained, judged };
    if (attempts !== completed || retained !== completed + mainReadCount || retained !== judged)
      finalizationErrors.push("Read-attempt, retained-observation and final-verdict counts differ");
  }
  if (records instanceof ReadRecords) report.observationStorage = { format: spill?.checked ? "checked fixed-window reductions and exact terminal tuples" : "lossless Float64 tuples and interned strings", records: records.length, encodedBytes: records.encodedBytes, numericResidentBytes: records.residentBytes, spillDirectory: records.directory, strings: records.stringCount, diskBudget: spill?.diskBudget, checkedFixedWindowReads: spill?.checked?.compared };
  report.httpRequests = { main: httpCounts(), workers: workerHttpCounts };
  report.engineSamples = engineSamples;
  if (feedFailure) {
    report.feedFailure = String(feedFailure);
    report.invalidReasons = [...(report.invalidReasons ?? []), `Feed consumer failed: ${String(feedFailure)}`];
    process.exitCode = 1;
  }
  if (activation) {
    const verifier = await openComposition(config.composition, lane, scopeName);
    try { report.deep.activationOracle = await activation.verify(verifier, report.deep.r1, report.deep.r2); } finally { await verifier.close(); }
  }
  if (meter && deepId) {
    observeNativeReceipt(undefined);
    assert.equal(report.deep.database, meter.database);
    if (activation) {
      for (const [k, name] of ["R1", "R2"].entries()) {
        const r = k === 0 ? report.deep.r1 : report.deep.r2;
        const command = runTag + (releaseTarget ? ":" + releaseTarget.key : "") + ":activate:" + name;
        r.cost.queue = meter.release(r.cut.position, r.publicationPosition, r.wallMs, command);
      }
    }
    if (measureBurst) {
      const w = phases.find(p => p.name === (alignment ? livePeakWindow(alignment) : "all-burst"));
      assert(w && w.end > w.start + config.settleS * 1000);
      report.deep.allBurstQueue = meter.burst(writes, w.start + config.settleS * 1000, w.end);
    }
    report.deep.nativeReceipts = meter.seal(path.join(rawDir, "deep-native-commits.jsonl"), deepId);
    if (campaignMeter) report.deep.writePath = campaignMeter.writePath();
  }
  const incompleteHistory = !tenantSpec && !deepSmoke && !interferenceOnly && !smallOnly && !activation && !config.readerLadderOnly && !config.zeroReaders && !pairPlan && report.priorities?.P4?.history?.eligibleForDepthComparison === false;
  if (incompleteHistory) finalizationErrors.push("History comparison is ineligible: incomplete growth, indexing or fewer than 10,000 correct pulls per depth");
  if (finalizationErrors.length) {
    report.invalidReasons = [...(report.invalidReasons ?? []), ...finalizationErrors];
    process.exitCode = 1;
  }
  report.status = feedFailure || finalizationErrors.length ? "ERROR" : "DONE";
  refreshVerdictEligibility(report);
  report.endedAt = new Date().toISOString();
  fs.writeFileSync(path.join(rawDir, "ns-log.txt"), logLines.join("\n") + "\n");
  save();
  // [DX-R3] Why: all reads have now been checked and the oracle/bars/report saved; only then release the owned raw spill.
  // Rejected: deleting it in a failure trap, which would erase unfinished run evidence.
  if (records instanceof ReadRecords && report.status === "DONE" && report.correctness?.errors === 0 && report.correctness?.violations === 0) records.dispose();
  log(`report: ${path.relative(REPO, output)}`);
  await flushTracing();
  setTimeout(() => process.exit(process.exitCode ?? 0), 500).unref();

  // ---------------------------------------------------------------- phase bodies

  /** TARGETS 1.1 P4 item 2: grow the matched sample's history in place, through the writer, as stream p4-history. */
  async function growHistory(depth: number, maxS: number) {
    const started = now();
    const deadline = started + maxS * 1000;
    let commands = 0, assertions = 0, failures = 0;
    const perCommand = config.historyGrowthSubjects;
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
        // [DX-T1-12] Why: one receipt index replaces quadratic growth lookups and checks the actual returned values before modelling them.
        // Rejected: repeated triples.find or advancing a history depth from a successful status alone.
        const receiptRows=new Map(receipt.triples.map(t=>[JSON.stringify([t.entityId,t.attribute]),t]));
        if(receiptRows.size!==receipt.triples.length || receiptRows.size!==cmd.perSubject.reduce((n,s)=>n+s.added.length,0)) throw Error("History receipt assertion count differs");
        for(const s of cmd.perSubject) for(const f of s.added) {
          const row=receiptRows.get(JSON.stringify([f.e,f.a]));
          if(!row || row.validFrom!==SEED_VALID_FROM || memberOf(row.entityId,row.attribute,row.value)!==memberOf(f.e,f.a,f.v)) throw Error("History receipt value differs");
        }
        const at = noteAck(receipt, -1, { seq: -1, stream: "p4-history", correction: false, correctionValidFrom: null, stamp: -1, subjects: group });
        modelWriter.bindReceipt(cmd.operations, receipt, "p4-history");
        for (const s of cmd.perSubject) {
          versionIds.set(s.subject, s.added.map((f) => receiptRows.get(JSON.stringify([f.e,f.a]))!.id));
          historyVersion.set(s.subject, v);
          modelWriter.addCommit(s.subject, { instant: receipt.instant, position: receipt.position, txId: receipt.txId, stamp: -1, stampValidFrom: 0, parts: partsOf(s.added, s.added.map(() => SEED_VALID_FROM), s.removed, s.removed.map(() => SEED_VALID_FROM)), ackAtMs: at, stream: "p4-history" });
        }
        if (group.some((i) => oracleRecordSet.has(i)))
          recordedCommands.push({ commandId: cmd.commandId, operations: cmd.operations, preconditions: cmd.preconditions, actor: "p4-history", receipt: { txId: receipt.txId, position: receipt.position, instant: receipt.instant, assertionIds: alignAssertIds(cmd.operations, receipt) } });
      }
    }
    const reached = Math.min(...historyList.map((i) => historyVersion.get(i) ?? 0)) + 1;
    return { targetDepth: depth, reachedDepth: reached, subjects: historyList.length, commands, assertions, failures, wallS: (now() - started) / 1000 };
  }

  /** P5: one shared basis, exact coverage, post-capture mutations; evaluate and publish are fail-closed seams. */
  async function runSweep(idx: number, maxS: number) {
    const list = sweepList(N, config.sweepMax);
    const last = acked.latest!;
    const basis = { recordedAt: last.instant, validAt: Math.floor(now()) };
    const release = stubRelease();
    const mutRng = new Rng(seedOf(`p5mut:${config.seed}`));
    const mutated = [...new Set(Array.from({ length: Math.min(config.p5Mutations, list.length) }, () => list[mutRng.int(list.length)]!))];
    const out: any = { subjects: list.length, coverageSha256: coverageHash(list), basis: { ...basis, position: coordinate(last.position), txId: last.txId }, release: { id: release.id, sha256: release.sha256 }, concurrency: config.sweepConcurrency, mutatedAfterCapture: mutated, evaluate: EVALUATE_SEAM, publish: PUBLISH_SEAM, throttledVariant: { status: "not-run", reason: "needs evaluate and an observable compaction or rebuild to overlap (seam)" } };
    // Offered after the capture and not awaited: the sweep starts at once; positions are filled in as ACKs arrive.
    const mutationsDone = Promise.all(mutated.map((s) => overlay("p5-mutation", s, 6))).then((positions) => { out.mutationPositions = positions; });
    void mutationsDone;
    const { worker: sweeper, stopped: sweeperStopped } = preparedSweeper ?? await startWorker(99, { ...workerCfg(99), sampleSubjects: [], oracleRate: 0, splitShare: 0 });
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
  const verdicts = readVerdicts();
  const violationKinds: Record<string, number> = {};
  const violationSample: any[] = [];
  const byKind: Record<string, { reads: number; correct: number; violations: number; errors: number }> = {};
  records.forEach((r, k) => {
    const v = VERDICTS[verdicts[k]!]!;
    const kind = r[R.phase] === PHASE_PROBE ? "probe" : r[R.phase] === PHASE_RYOW ? "readYourOwnWrite" : "readers";
    const b = (byKind[kind] ??= { reads: 0, correct: 0, violations: 0, errors: 0 });
    b.reads++;
    if (v.ok) b.correct++; else if (v.kind === "error") b.errors++; else b.violations++;
    if (v.ok || v.kind === "error") return;
    violationKinds[v.kind] = (violationKinds[v.kind] ?? 0) + 1;
    if (violationSample.length < 10) violationSample.push({ kind: v.kind, phase: r[R.phase], subject: r[R.subject], basis: { recordedAt: r[R.recordedAt], validAt: r[R.validAt], position: r[R.basisPosition] }, observed: { stamp: r[R.stamp], digest: r[R.digest] }, expected: model.expected(r[R.subject], r[R.recordedAt], r[R.validAt]) });
  });
  const total = records.length, ok = verdicts.reduce((n, code) => n + Number(code === 0), 0), errs = verdicts.reduce((n, code) => n + Number(code === 1), 0);
  report.correctness = { reads: total, correct: ok, violations: total - ok - errs, errors: errs, violationKinds, violationSample, byKind, rule: "a read is correct when its :placement/stamp and whole-world multiset digest equal the expected-state model at the basis the driver requested; errors are censored in the latency histograms and never goodput" };
  const histograms: Record<string, any> = {};
  const rounds = ctx.rounds.map((row) => {
    const { hist, ...rest } = row;
    for (const [name, h] of Object.entries(hist)) histograms[`${row.id}.${config.arm}.${name}`] = h;
    if (pairPlan!.readers > 0) {
      const reads = new Histogram();
      records.forEach((r, k) => { if (r[R.phase] === 0 && r[R.start] >= row.fromMs && r[R.start] < row.toMs && VERDICTS[verdicts[k]!]!.ok) reads.recordMs(r[R.latency]); });
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
async function ryow(comp: CompositionHandle, subject: number, receipt: Receipt, replica = false, capture?: (root: string, basis: Basis) => Promise<ReadObservation>) {
  const basis = { ...(replica ? { recordedPosition: receipt.position } : {}), recordedAt: receipt.instant, validAt: Math.floor(now()) };
  const start = now();
  const t = performance.now();
  try {
    const result = capture ? await capture(ids.placement(subject), basis) : await comp.pull(ids.placement(subject), basis);
    const latency = performance.now() - t;
    const pr = "observed" in result ? result : readObservation(result);
    countReceiptFallback(ryowFallbackReasons, pr);
    retainRead(receiptReadRow(subject, basis, receipt.position, start, latency, pr));
  } catch (error: any) {
    retainRead(receiptReadRow(subject, basis, receipt.position, start, performance.now() - t, { error: String(error?._tag ?? "Error") }));
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
  return settledPhaseWindow(phase.start, phase.end, config.settleS * 1000);
}
function judgeRead(r: ReadRecord) {
  return VERDICTS[judgeReadCode(r, expectations)]!;
}
// [DX-R3] Why: one byte per verdict preserves every judgment without a heap object per observation.
// Rejected: retaining millions of identical {ok:true,kind:"correct"} objects during full-ladder analysis.
let judgingCost: { cpuMs: number; wallMs: number; reads: number; cpuMsPerRead: number; cpuScope: string } | undefined;
function readVerdicts(): Uint8Array {
  const threadScope = typeof (process as any).threadCpuUsage === "function";
  const cpuUsage: typeof process.cpuUsage = threadScope ? (process as any).threadCpuUsage : process.cpuUsage;
  const cpuStart = cpuUsage(), wallStart = performance.now();
  const result = new Uint8Array(records.length);
  records.forEach((r, k) => { result[k] = judgeReadCode(r, expectations); });
  judgedReadCount = result.length;
  const cpu = cpuUsage(cpuStart);
  judgingCost = { cpuMs: (cpu.user + cpu.system) / 1000, wallMs: performance.now() - wallStart, reads: result.length, cpuMsPerRead: (cpu.user + cpu.system) / 1000 / result.length, cpuScope: threadScope ? "main thread" : "process upper bound, may include concurrent oracle worker" };
  return result;
}
const bandOf = (f: number) => (f <= 10 ? "5-10" : f <= 25 ? "11-25" : "26-50");
const mean = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);
const ratio = (a: number | null | undefined, b: number | null | undefined) => (a == null || b == null || b === 0 ? null : a / b);
const bar = (id: string, value: any, limit: string, pass: boolean | null, note?: string) => ({ id, value, bar: limit, pass, ...(note ? { note } : {}) });
const countBy = (values: string[]) => { const o: Record<string, number> = {}; for (const v of values) o[v] = (o[v] ?? 0) + 1; return o; };

function analyse(ctx: { phases: any[]; traceStart: number; replay: any; maintenance: any; historyList: number[]; pendingAtEnd: number; events: readonly TraceEvent[] }) {
  const analysisCpuStart = process.cpuUsage(), analysisWallStart = performance.now();
  const verdicts = readVerdicts();
  const checked = spill?.checked;
  const violationKinds: Record<string, number> = {};
  const violationSample: any[] = [...(checked?.violationSample ?? [])];
  if (checked) checked.verdicts.forEach((count, code) => { if (code > 1 && count) violationKinds[VERDICTS[code]!.kind] = count; });
  records.forEach((r, k) => {
    const v = VERDICTS[verdicts[k]!]!;
    if (v.ok || v.kind === "error") return;
    violationKinds[v.kind] = (violationKinds[v.kind] ?? 0) + 1;
    if (violationSample.length < 10) violationSample.push({ kind: v.kind, phase: r[R.phase], subject: r[R.subject], basis: { recordedAt: r[R.recordedAt], validAt: r[R.validAt], position: r[R.basisPosition], kind: r[R.basisKind] }, split: r[R.split], observed: { stamp: r[R.stamp], digest: r[R.digest] }, expected: model.expected(r[R.subject], r[R.recordedAt], r[R.validAt]) });
  });
  const background = writes.filter((w) => w.stream === "background" && !w.resend);
  const baseline = loadBaselineWrites();
  const lagRows = feed!.lags;
  if(tenants && deepId) {
    const source=JSON.stringify({route:"A0-control",dir:rawDir,epoch:scopeName+"#0"});
    const view=tenantFeedAt(path.join(rawDir,"consumer.db"),tenants,source,feedWind!.target,report.deep.r1?.publicationPosition??report.deep.seed.position);
    for (const [position, members] of view.matched) {
      const ack = ackOf.get(position);
      assert(ack, "Tenant feed contains an unknown source commit");
      const subjects = (ack.subjects ?? [ack.subject]).filter(s => s >= 0);
      assert.deepEqual([...members.keys()].sort((a,b)=>a-b), [...subjects].sort((a,b)=>a-b));
    }
    const observed=tenantObservations(tenants,ctx.phases,config.settleS*1000,fn=>records.forEach(fn),verdicts,writes,lagRows,view);
    assert.equal(observed.feed.missing,0,"Account feed views did not cover exactly the committed subjects");
    const bytes=JSON.stringify({identity:deepId,database:report.deep.database,traceStart:ctx.traceStart,...observed});
    fs.writeFileSync(path.join(rawDir,"tenant-observations.json"),bytes,{flag:"wx"});
    report.deep.tenantObservationsSha256 = sha256File(path.relative(REPO, path.join(rawDir, "tenant-observations.json")));
  }
  const levelStats = (phase: any) => {
    const w = windowOf(phase);
    const secs = Math.max(0.001, (w.to - w.from) / 1000);
    const bounds = { name: phase.name, from: w.from, to: w.to };
    const prior = checked?.windows[phase.name];
    const observation = prior ? ReadWindow.restore(prior, bounds) : new ReadWindow(bounds);
    if (!prior) visitPhase(phase.idx, (r, k) => {
      if (r[R.phase] !== phase.idx || r[R.start] < w.from || r[R.start] + r[R.latency] > w.to) return;
      const facts = cells ? cells.sizes[r[R.subject]]! : worldFactsOf(r[R.subject], accounts);
      const b = facts <= 200 ? "small" : facts <= 800 ? "medium" : "large";
      observation.add(r, verdicts[k]!, wasHot(r, expectations), `bucket:${b}`, `hops:${hopOf(r[R.subject])}`);
    });
    const { read, goodputBySecond, reads, correct, violations, errors, hotReads, splitReads, splitForced, splitCorrect,
      byBasis, routes, languages, waited, watermarkWait, buckets, bytesBy } = observation;
    const commits = background.filter((x) => x.scheduledAt >= w.from && x.scheduledAt < w.to && x.outcome === "committed" && !x.expired);
    const commit = new Histogram();
    for (const c of commits) commit.recordMs(verdictMs(c));
    const matched = baseline ? w.invalid ? { commits: 0, expected: 0, invalid: w.invalid, p50Ms: null, p99Ms: null }
      : matchedBaseline(baseline, w.from - ctx.traceStart, w.to - ctx.traceStart) : null;
    const lag = new Histogram();
    for (const l of lagRows) if (l.at >= w.from && l.at < w.to) lag.recordMs(l.lagMs);
    const elus = new Map<number, number[]>();
    for (const e of workerElu) if (e.t >= w.from && e.t < w.to) (elus.get(e.worker) ?? elus.set(e.worker, []).get(e.worker)!).push(e.elu);
    const workerEluMean = [...elus.values()].map((v) => mean(v)!);
    const mainEluMean = mean(mainElu.filter((e) => e.t >= w.from && e.t < w.to).map((e) => e.elu));
    const eng = engineSamples.filter((e) => e.t >= w.from && e.t < w.to);
    const maxWorkerElu = workerEluMean.length ? Math.max(...workerEluMean) : null;
    const maintenancePhase = phase.maintenancePhase ?? phase.name;
    const maint = (ctx.maintenance.events ?? []).filter((e: any) => lane === "datomic" ? completedMaintenanceInWindow(e, maintenancePhase, w.from, w.to) : e.t >= w.from && e.t < w.to).length;
    const maintenanceWindows = w.invalid ? [] : Array.from({ length: Math.ceil(secs / 45) }, (_, i) => {
      const from = w.from + i * 45000, to = Math.min(w.to, from + 45000);
      return { phase: maintenancePhase, from, to, completed: (ctx.maintenance.events ?? []).filter((e: any) => lane === "datomic" ? completedMaintenanceInWindow(e, maintenancePhase, from, to) : e.t >= from && e.t < to).length };
    });
    const marks = watermarkSamples.filter((s) => s.t >= w.from && s.t < w.to).map((s) => s.marks["source"] ?? 0);
    return {
      phase: phase.name, readers: phase.readers, mode: phase.mode, windowS: w.invalid ? 0 : Math.round(secs * 10) / 10, windowInvalid: w.invalid, overlapsBurst: phase.overlapsBurst,
      reads, correct, violations, errors, goodputBySecond, goodputPerS: w.invalid ? null : correct / secs, read: read.summary(),
      hotShare: reads ? hotReads / reads : null, basisMix: { latest: byBasis[0], lastHour: byBasis[1], pastValidTime: byBasis[2] },
      split: { reads: splitReads, straddledATraceCommand: splitForced, straddledCorrect: splitCorrect },
      routing: { routes, languages, fallbackShare: reads ? (routes["fallback"] ?? 0) / reads : null, localShare: reads ? (routes["replica"] ?? 0) / reads : null, waitedReads: waited, watermarkWait: watermarkWait.summary(), watermarkWaitMs: 10 },
      buckets: Object.fromEntries(Object.entries(buckets).map(([k, h]) => [k, { ...h.summary(), meanBytes: bytesBy[k]!.sum / bytesBy[k]!.count }])),
      writer: { commits: commits.length, commit: commit.summary(), maxLatencyMs: commits.length ? commits.reduce((high,c)=>Math.max(high,verdictMs(c)),0) : null, matchedZeroReader: matched },
      feedLag: lag.summary(),
      maintenanceEvents: maint, maintenanceWindows, maintenanceDensityMet: !w.invalid && maintenanceWindows.every(w => w.completed >= 1),
      watermarks: marks.length ? { source: { min: coordinate(Math.min(...marks)), max: coordinate(Math.max(...marks)) } } : null,
      client: { workerEluMean, maxWorkerElu, mainElu: mainEluMean,
        processCpuMsPerLocalReadUpperBound: (routes["replica"] ?? 0) > 0 ? phase.clientCpuMs / routes["replica"] : null,
        saturated: (maxWorkerElu ?? 0) > 0.9 || (mainEluMean ?? 0) > 0.9 },
      engine: { containers: Object.fromEntries(containers.map(name => [name, { cpuPercentMean: mean(eng.map(e => e.containers[name]?.cpuPercent).filter((n): n is number => n !== undefined)) }])), cpuPercentMean: mean(eng.map((e) => e.cpuPercent)), samples: eng.length, peakMemBytes: eng.length ? Math.max(...eng.map((e) => e.memBytes)) : null },
      _read: read,
      _commit: commit, _feedLag: lag, _buckets: buckets,
    };
  };
  const stats: Record<string, any> = {};
  for (const phase of ctx.phases) if (phase.end && phase.measured) stats[phase.name] = levelStats(phase);
  if (fullLength) {
    const windows = scheduledV3Windows();
    for (const name of ["L256", "L1024"] as const) {
      const members = ctx.phases.filter(p => p.pool === name).map(p => stats[p.name]);
      const ref = baseline ? matchBaseline(baseline, windows[name], ctx.events.filter(e => !e.resend && e.stream === "background"), (report.matchedBaseline?.offeredUntilTraceS ?? 0) * 1000, "ack") : null;
      stats[name] = pooledPhase(name, members, windows[name], ref ? { ...ref, rows: undefined, values: undefined } : null);
    }
    const first = ctx.phases.find(p => p.name === "L256-A");
    if (first?.end) stats["L256-legacy"] = { ...levelStats({ ...first, name: "L256-legacy", maintenancePhase: first.name, end: first.start + 45000 }), phase: first.name };
    const last=ctx.phases.find(p=>p.name==="L256-D");
    if(last?.end) stats["L256-adjacent"] = { ...levelStats({...last, name: "L256-adjacent", maintenancePhase: last.name, start:last.end-45000}), phase: last.name };
  }
  const strip = (s: any) => s ? Object.fromEntries(Object.entries(s).filter(([k]) => !k.startsWith("_"))) : s;
  const L = (n: string) => stats[n];

  // ---------------- P1
  const writerRatio = (s: any) => {
    if (!s) return null;
    const m = s.writer.matchedZeroReader;
    if (m?.p99Ms) return { value: ratio(s.writer.commit.p99Ms, m.p99Ms), basis: "matched zero-reader run, same trace-time window" };
    return { value: ratio(s.writer.commit.p99Ms, L("baseline")?.writer.commit.p99Ms), basis: "UNMATCHED: in-run baseline phase (different trace segment); cannot close NS.P1" };
  };
  const recovery = recoveryWindows(ctx.phases.filter((p) => p.name === "recovery" || p.pool === "recovery"), L("L256"), baseline, ctx.traceStart);
  const ladder = ["L1", "L4", "L16", "L64", "L256", "L1024"].map(L).filter(Boolean);
  const r256 = writerRatio(L("L256")), r1024 = writerRatio(L("L1024"));
  const unmatched = (r: any) => (r?.basis?.startsWith("UNMATCHED") ? false : null);
  const p1 = {
    ladder: ladder.map(strip),
    adjacentStressGoodput:fullLength?{endOfLast256:strip(stats["L256-adjacent"]),firstStress:strip(stats["L1024-1"]),
      ratio:ratio(stats["L1024-1"]?.goodputPerS,stats["L256-adjacent"]?.goodputPerS),diagnosticOnly:true}:null,
    recovery,
    writerWaitAttribution: { method: "matched-phase comparison against the zero-reader run of the same trace", baselineRun: config.baselineWrites, engineWaitEvidence: lane === "xtdb" ? "none exposed: XTDB has no read-path locks (TARGETS 1.1 P1 item 5)" : lane === "datomic" ? "not exposed: Datomic transactor/write-queue wait metrics unavailable" : "not exposed: no QLever broker queue in this composition" },
    bars: [
      bar("NS-P1-VIOLATIONS-MAX (L256)", L("L256")?.violations ?? null, "= 0", L("L256") ? L("L256").violations === 0 : null),
      bar("NS-P1-GOODPUT-256-VS-64", ratio((L("L256-legacy") ?? L("L256"))?.goodputPerS, L("L64")?.goodputPerS), ">= 1.0", L("L256") && L("L64") ? (L("L256-legacy") ?? L("L256")).goodputPerS >= L("L64").goodputPerS : null),
      bar("NS-P1-READ-P99-256-MS", L("L256")?.read.p99Ms ?? null, "<= 100", L("L256")?.read.p99Ms != null ? L("L256").read.p99Ms <= 100 : null),
      bar("NS-P1-WRITER-P99-RATIO-256", r256?.value ?? null, "<= 1.25", unmatched(r256) ?? (r256?.value != null ? r256.value <= 1.25 : null), r256?.basis),
      bar("NS-P1-WRITER-WAIT-MAX-MS (L256)", L("L256")?.writer.maxLatencyMs ?? null, "<= 2000", L("L256")?.writer.maxLatencyMs != null ? L("L256").writer.maxLatencyMs <= 2000 : null),
      bar("NS-P1-VIOLATIONS-MAX (L1024)", L("L1024")?.violations ?? null, "= 0", L("L1024") ? L("L1024").violations === 0 : null),
      bar("NS-P1-GOODPUT-1024-VS-256", ratio(L("L1024")?.goodputPerS, L("L256")?.goodputPerS), ">= 0.9", ratio(L("L1024")?.goodputPerS, L("L256")?.goodputPerS) !== null ? ratio(L("L1024")?.goodputPerS, L("L256")?.goodputPerS)! >= 0.9 : null),
      bar("NS-P1-WRITER-P99-RATIO-1024", r1024?.value ?? null, "<= 2.0", unmatched(r1024) ?? (r1024?.value != null ? r1024.value <= 2 : null), r1024?.basis),
      bar("NS-P1-RECOVERY-MS", recovery?.recoveredAfterMs ?? null, "<= 60000", recovery ? recovery.recoveredAfterMs !== null && recovery.recoveredAfterMs <= 60_000 : null, recovery?.note ?? undefined),
      bar("1.1 P1.1 hot-set share of reads (min over ladder levels)", ladder.length ? Math.min(...ladder.map((s) => s.hotShare ?? 0)) : null, ">= 0.5", ladder.length ? ladder.every((s) => (s.hotShare ?? 0) >= 0.5) : null),
      bar("1.1 P1.2 split reads straddling a frozen-trace command, all correct", ladder.reduce((s, x) => s + x.split.straddledATraceCommand, 0), "> 0 and all correct", ladder.length ? ladder.some((s) => s.split.straddledATraceCommand > 0) && ladder.every((s) => s.split.straddledATraceCommand === s.split.straddledCorrect) : null, "step 1 before the trace command's ACK, step 2 after; the driver adds no writes (RULINGS Q31b)"),
      bar("4.1.5 fallback share per window (reported)", ladder.map((s) => s.routing.fallbackShare), "reported", null, "Replica-eligible reads are local; unresolved cuts use the gateway"),
      bar("1.1 P1.3 a maintenance event in every P1 window", ladder.map((s) => s.maintenanceEvents), "every 45 s >= 1", ladder.length ? ladder.every((s) => s.maintenanceDensityMet) : null, lane === "datomic" ? "completed request-index job with request/completion timestamps inside the measured window" : "observed in engine logs only; the driver cannot force compaction or a rebuild yet (seam)"),
    ],
  };

  // ---------------- P2
  const bands = (rows: any[]) => Object.fromEntries(["5-10", "11-25", "26-50"].map((b) => { const h = new Histogram(); for (const w of rows) if (bandOf(w.facts) === b) h.recordMs(verdictMs(w)); return [b, h.summary()]; })) as Record<string, any>;
  const committed = background.filter((w) => w.outcome === "committed" && !w.expired);
  const l256 = ctx.phases.find((p) => p.name === "L256");
  const in256 = fullLength ? committed.filter(w => inIntervals(w.offsetMs, scheduledV3Windows().L256)) : l256?.end ? committed.filter((w) => w.scheduledAt >= windowOf(l256).from && w.scheduledAt < windowOf(l256).to) : [];
  const b256 = bands(in256);
  const byOutcome = countBy(writes.filter((w) => !w.resend).map((w) => `${w.stream}:${w.outcome ?? "unaccounted"}`));
  const unaccounted = writes.filter((w) => (w.outcome ?? "unaccounted") === "unaccounted").length + ctx.pendingAtEnd;
  const ryowRows: { r: ReadRecord; v: ReturnType<typeof judgeRead> }[] = [];
  visitPhase(PHASE_RYOW, (r, k) => { if (r[R.phase] === PHASE_RYOW) ryowRows.push({ r, v: VERDICTS[verdicts[k]!]! }); });
  const ryowHist = new Histogram();
  const ryowWait = new Histogram();
  for (const x of ryowRows) { ryowHist.recordMs(x.r[R.latency]); ryowWait.recordMs(x.r[R.waitedMs]); }
  const ryowOk = ryowRows.filter((x) => x.v.ok).length;
  const dupConsidered = resends.filter((r) => r.result !== "original-not-committed");
  const dupOk = dupConsidered.filter((r) => r.result === "already-committed-original" || r.result === "resolved-by-command").length;
  const lostOk = lostAck.filter((r) => r.resolvedOriginal && r.retryTag !== "COMMITTED-AGAIN").length;
  const progress = p2Progress(background, ctx.traceStart);
  const probeHist = new Histogram();
  for (const w of writes) if (w.stream === "probe10" && w.outcome === "committed" && !w.expired) probeHist.recordMs(verdictMs(w));
  const p2 = {
    bandsAtL256: b256, bandsAll: bands(committed), bandsSteady: bands(committed.filter((w) => !w.burst)), bandsBurst: bands(committed.filter((w) => w.burst)),
    accounting: { byStreamAndOutcome: byOutcome, resendsByResult: countBy(resends.map((r) => r.result)), unaccounted, pendingAtEnd: ctx.pendingAtEnd, errorTags: countBy(writes.flatMap((w) => w.tags ?? [])) },
    readYourOwnWrite: { pulls: ryowRows.length, correct: ryowOk, pull: ryowHist.summary(), watermarkWait: ryowWait.summary(), fallbackReasons: ryowFallbackReasons, routes: countBy(ryowRows.map(x => x.r[R.route])), failures: ryowRows.filter((x) => !x.v.ok).slice(0, 5).map((x) => ({ kind: x.v.kind, subject: x.r[R.subject], position: x.r[R.basisPosition] })) },
    duplicates: { resends: resends.length, considered: dupConsidered.length, returnedOriginal: dupOk },
    lostAck: { simulated: lostAck.length, returnedOriginal: lostOk, retryTags: countBy(lostAck.map((r) => r.retryTag)) },
    breakdown: { units: "ms", note: "driverBeforeAck counts apparatus before the final receipt; driverAfterAck is reported but never judged. driverOwn retains the legacy full-finish diagnostic. Publication witness timings remain separate; per-command segment quantiles do not add",
      byPhase: Object.fromEntries(ctx.phases.map(p => [p.name, commitBreakdown(committed.filter(w => w.scheduledAt >= p.start && w.scheduledAt < p.end))])),
      burst: commitBreakdown(committed.filter(w => w.burst)), all: commitBreakdown(committed) },
    probe10Diagnostic: { note: "diagnostic only (TARGETS 1.1 P2 item 2); overlay stream, not part of any bar", commit: probeHist.summary() },
    progress,
    bars: [
      bar("NS-P2 5-10 band p50 ms (L256)", b256["5-10"].p50Ms, "<= 10", b256["5-10"].p50Ms != null ? b256["5-10"].p50Ms <= 10 : null),
      bar("NS-P2 5-10 band p99 ms (L256)", b256["5-10"].p99Ms, "<= 50", b256["5-10"].p99Ms != null ? b256["5-10"].p99Ms <= 50 : null),
      bar("NS-P2 11-25 band p50 ms (L256)", b256["11-25"].p50Ms, "<= 10", b256["11-25"].p50Ms != null ? b256["11-25"].p50Ms <= 10 : null),
      bar("NS-P2 11-25 band p99 ms (L256)", b256["11-25"].p99Ms, "<= 50", b256["11-25"].p99Ms != null ? b256["11-25"].p99Ms <= 50 : null),
      bar("NS-P2 26-50 band p99 ms (L256, provisional)", b256["26-50"].p99Ms, "<= 100", b256["26-50"].p99Ms != null ? b256["26-50"].p99Ms <= 100 : null),
      bar("NS-P2 every offered command accounted", unaccounted, "= 0", unaccounted === 0),
      bar("NS-P2 no expired primary commands", background.filter(w=>w.expired).length, "= 0", background.every(w=>!w.expired)),
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
  const phaseBytes = (s: any) => {
    const idx = ctx.phases.find((p) => p.name === s?.phase)?.idx;
    if (idx === undefined) return null;
    let sum = 0, count = 0;
    visitPhase(idx, (r, k) => { if (r[R.phase] === idx && verdicts[k] === 0) { sum += r[R.bytes]; count++; } });
    return count ? sum / count : null;
  };
  const quotaRate = best && engineCpus ? best.goodputPerS / engineCpus : null;
  const historyInvalid = [h1, h3, h10].flatMap((h, i) => {
    const phase = ctx.phases.find(p => p.name === ["p4h1", "p4h3", "p4h10"][i]);
    return [ ...(lane === "datomic" && phase?.historyIndex?.completed !== true ? [`${phase?.name}: request-index did not complete within 60 s`] : []),
      ...((h?.read.count ?? 0) < 10_000 ? [`${phase?.name}: fewer than 10,000 correct measured pulls`] : []) ];
  });
  const historyEligible = historyDepthsComplete(ctx.phases.filter(p => p.history).map(p => p.history), ctx.historyList.length) && historyInvalid.length === 0;
  const p4 = {
    weightedMix: mix ? { read: mix.read, buckets: mix.buckets, correct: mix.correct, errors: mix.errors, violations: mix.violations, goodputPerS: mix.goodputPerS } : null,
    history: { eligibleForDepthComparison: historyEligible, invalid: historyInvalid, indexing: ctx.phases.filter(p => p.historyIndex).map(p => p.historyIndex), ratios: { mean: ratio(h10?.read.meanMs, h1?.read.meanMs), p50: ratio(h10?.read.p50Ms, h1?.read.p50Ms), p99: ratio(h10?.read.p99Ms, h1?.read.p99Ms) }, sampleSubjects: ctx.historyList.length, growth: ctx.phases.filter((p) => p.history).map((p) => p.history), depth1: h1?.read ?? null, depth3: h3?.read ?? null, depth10: h10?.read ?? null, clientBytes: { depth1: phaseBytes(h1), depth3: phaseBytes(h3), depth10: phaseBytes(h10) }, engineBytesRead: "not measured: neither engine exposes bytes read per query here (seam)" },
    throughput: { bestLevel: best?.phase ?? null, goodputPerS: best?.goodputPerS ?? null, engineCpuQuotaCores: engineCpus, pullsPerSPerQuotaCore: quotaRate, engineCpuPercentMean: best?.engine.cpuPercentMean ?? null, pullsPerSPerUsedCore: best?.engine.cpuPercentMean ? best.goodputPerS / (best.engine.cpuPercentMean / 100) : null, hostClientCpu: cpu, hostBrokerCpu: "none in this composition (no broker process)" },
    bars: [
      bar("NS-P4 weighted-mix pull p50 ms", mix?.read.p50Ms ?? null, "<= 5", mix?.read.p50Ms != null ? mix.read.p50Ms <= 5 : null),
      bar("NS-P4 weighted-mix pull p99 ms", mix?.read.p99Ms ?? null, "<= 25", mix?.read.p99Ms != null ? mix.read.p99Ms <= 25 : null),
      bar("NS-P4 largest bucket p99 ms (provisional)", largest?.p99Ms ?? null, "<= 50", largest?.p99Ms != null ? largest.p99Ms <= 50 : null),
      bar("NS-P4 pulls/s per engine core (CPU quota)", quotaRate, ">= 1100", quotaRate !== null ? quotaRate >= 1100 : null),
      bar("NS-P4 history flatness p99 depth10 / depth1", ratio(h10?.read.p99Ms, h1?.read.p99Ms), "<= 1.1", ratio(h10?.read.p99Ms, h1?.read.p99Ms) !== null ? historyEligible && ratio(h10?.read.p99Ms, h1?.read.p99Ms)! <= 1.1 : null, "requires complete growth to depths 3 and 10 on the full sample"),
      bar("NS-P4 history flatness bytes read depth10 / depth1", null, "<= 1.1", null, "engine bytes read are not measured (seam); client-observed bytes are reported"),
    ],
  };

  // ---------------- P5
  const sweepPhase = ctx.phases.find((p) => p.name === "sweep" && p.sweep);
  let p5: any = { status: "not-run" };
  if (sweepPhase) {
    const s = sweepPhase.sweep;
    const rows: { r: ReadRecord; v: ReturnType<typeof judgeRead> }[] = [];
    visitPhase(sweepPhase.idx + SWEEP_PHASE_OFFSET, (r, k) => { if (r[R.phase] === sweepPhase.idx + SWEEP_PHASE_OFFSET) rows.push({ r, v: VERDICTS[verdicts[k]!]! }); });
    const h = new Histogram();
    for (const x of rows) h.recordMs(x.r[R.latency]);
    const pulled = new Set(rows.map((x) => x.r[R.subject]));
    const rate = rows.length / (s.wallMs / 1000);
    const mutatedOk = s.mutatedAfterCapture.filter((subject: number) => rows.some((x) => x.r[R.subject] === subject && x.v.ok)).length;
    const pre = L("presweep"), during = L("sweep");
    const exact = pulled.size === s.subjects && rows.length === s.subjects;
    const mutationsCommitted = mutationsAfterCapture(s.mutationPositions, s.mutatedAfterCapture.length, s.basis.position.offset);
    p5 = {
      status: "FAIL-CLOSED (evaluate and publish seams)",
      sweep: { ...s, mutationsCommittedAfterCapture: mutationsCommitted, pulled: rows.length, distinctSubjects: pulled.size, exactCoverage: exact, correctAtBasis: rows.filter((x) => x.v.ok).length, violations: rows.filter((x) => !x.v.ok && x.v.kind !== "error").length, errors: rows.filter((x) => x.v.kind === "error").length, pull: h.summary(), pullsPerS: rate, fetchOnlyWallFor100kS: 100_000 / Math.max(rate, 1e-9), mutatedSubjectsAtBasis: mutatedOk },
      live: { presweep: pre ? { read: pre.read, commit: pre.writer.commit } : null, duringSweep: during ? { read: during.read, commit: during.writer.commit } : null },
      bars: [
        bar("NS-P5 sweep evaluates the release (W0) and publishes through the outbox", false, "= true", false, `${EVALUATE_SEAM.reason}; ${PUBLISH_SEAM.reason}`),
        bar("NS-P5 wall s for 100k subjects incl. evaluation and publication", null, "<= 100", false, `fetch-only diagnostic: ${(100_000 / Math.max(rate, 1e-9)).toFixed(0)} s extrapolated`),
        bar("NS-P5 exact coverage", exact, "= true", exact),
        bar("NS-P5 post-capture mutations do not leak into the sweep", `${mutatedOk}/${s.mutatedAfterCapture.length}`, "all at basis", mutatedOk === s.mutatedAfterCapture.length && mutationsCommitted, `requires committed positions past capture; observed: ${JSON.stringify(s.mutationPositions ?? null)}`),
        bar("NS-P5 live read p99 during sweep / presweep", ratio(during?.read.p99Ms, pre?.read.p99Ms), "<= 1.5", ratio(during?.read.p99Ms, pre?.read.p99Ms) !== null ? ratio(during?.read.p99Ms, pre?.read.p99Ms)! <= 1.5 : null),
        bar("NS-P5 writer commit p99 during sweep / presweep", ratio(during?.writer.commit.p99Ms, pre?.writer.commit.p99Ms), "<= 1.5", ratio(during?.writer.commit.p99Ms, pre?.writer.commit.p99Ms) !== null ? ratio(during?.writer.commit.p99Ms, pre?.writer.commit.p99Ms)! <= 1.5 : null),
        bar("NS-P5 throttled variant overlapping compaction", null, "run", false, s.throttledVariant.reason),
      ],
    };
  }

  const saturated = Object.values(stats).filter((s: any) => s.client.saturated).map((s: any) => s.phase);
  const stressHeadroom = (fullLength || rd1ReadDiagnostic) && !config.zeroReaders ? ctx.phases.filter(p => p.readers === 1024 && p.measured).map(p => {
    const w = windowOf(p);
    const inside = (samples: { t: number; elu: number }[]) => mean(samples.filter(e => e.t >= w.from && e.t < w.to).map(e => e.elu));
    const readers = Array.from({ length: config.readerThreads }, (_, worker) => inside(workerElu.filter(e => e.worker === worker && e.running! > 0)));
    const sender = inside(mainElu), collector = spill ? inside(spillElu) : null;
    const feedConsumer = feed instanceof SideThread ? inside(feed.elus) : null;
    const historicalLane = historicalFallback ? inside(historicalFallback.elus) : null;
    const roles = [sender, ...(spill ? [collector] : []), ...(feed instanceof SideThread ? [feedConsumer] : []), ...(historicalFallback ? [historicalLane] : []), ...readers];
    return { phase: p.name, readers, sender, collector, feedConsumer, historicalLane, limit: 0.70, eligible: roles.every(elu => elu !== null && elu <= 0.70) };
  }) : [];
  const total = records.length + (checked?.compared ?? 0), ok = verdicts.reduce((n, code) => n + Number(code === 0), checked?.verdicts[0] ?? 0), errs = verdicts.reduce((n, code) => n + Number(code === 1), checked?.verdicts[1] ?? 0);
  report.correctness = { reads: total, correct: ok, violations: total - ok - errs, errors: errs, violationKinds, violationSample, rule: "a read is correct when its :placement/stamp and whole-world multiset digest equal the expected-state model at the basis the driver requested (receipt instant R, valid time V); errors and wrong answers are never goodput" };
  report.readerDiagnostics = workerDiagnostics;
  report.readerFinalDiagnostics = readerFinalDiagnostics;
  report.expectedStateCache = { ...expectations.diagnostics, rolling: checked?.expectationCache };
  report.client = { series: {main:mainElu,readers:workerElu,collector:spillElu,historicalLane:historicalFallback?.elus}, stressHeadroom,
    burstMainEluMean: mean(mainElu.filter(e => overlapsBurst((e.t - ctx.traceStart)/1000, (e.t - ctx.traceStart)/1000 + 0.001, report.trace.params)).map(e=>e.elu)),
    peakProcessBytes: process.resourceUsage().maxRSS * 1024, saturatedPhases: saturated, invalid: saturated.length > 0 || stressHeadroom.some(p => !p.eligible), processCpu: cpu, readerThreads: config.zeroReaders ? 0 : config.readerThreads, rule: "Measured windows retain the 0.90 limit. Full stress windows require sampled sender, collector, feed consumer and active reader means at or below 0.70 for roles present in the run." };
  report.phases = ctx.phases.map((p) => ({ ...p, stats: strip(stats[p.name]) }));
  report.priorities = { P1: p1, P2: p2, P3: p3, P4: p4, P5: p5 };
  report.pooledPhases = Object.fromEntries(["L256", "L1024", "L256-legacy"].filter(n => stats[n]).map(n => [n, strip(stats[n])]));
  report.instrument = instrumentMetrics(report, writes, baseline, Histogram);
  report.compositionIdentity = { ...report.composition, watermarkSamples: watermarkSamples.length, note: "image digest, config hash and slot per assignment are bound by the gate (lab/bin/gate.mjs NS)" };
  report.secondary = { bulkLane: "not measured (seed uses the bulk lane without live reads)", retroactiveCorrections: p3.bars[7], explainAtOldBasis: "past-valid-time reads are 5% of the P1 mix; bit-for-bit audit repeats are not measured" };
  report.histograms = Object.fromEntries(Object.entries(stats).flatMap(([name, s]: any) => [[`${name}.read`, s._read.toJSON()], [`${name}.commit`, s._commit.toJSON()], [`${name}.feedLag`, s._feedLag.toJSON()], ...Object.entries(s._buckets).map(([b, h]: any) => [`${name}.${b}`, h.toJSON()])]));
  applyCommitVerdicts(report, writes, baseline, ctx.events);
  const analysisCpu = process.cpuUsage(analysisCpuStart), fullAnalysisCpuMs = (analysisCpu.user + analysisCpu.system) / 1000;
  report.verificationCost = { verdicts: judgingCost, rollingComparisonAndFold: checked?.comparisonAndFold, fullAnalysisCpuMs, fullAnalysisWallMs: performance.now() - analysisWallStart,
    fullAnalysisCpuMsPerRead: fullAnalysisCpuMs / records.length,
    scope: "process CPU after measured phases; includes every verdict and all JS statistics; post-run process CPU may include the concurrent independent oracle worker (not the external oracle process); phase client CPU includes serving/capture, follower, writer and spill" };
}
/** TARGETS 1.1 P2 item 4 (RULINGS Q31a): progress and bounded outstanding work. */
function p2Progress(background: any[], traceStart: number) {
  const p = { ...TRACE_DEFAULTS, burstMultiplier: config.burstMultiplier, steadyFactsPerS: TRACE_DEFAULTS.steadyFactsPerS * config.rateScale };
  const steadyRate = deep ? DEEP_RATE : p.steadyFactsPerS / (p.sizeClasses.reduce((s, c) => s + c.share * ((c.min + c.max) / 2), 0));
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
  const baselineReport = JSON.parse(fs.readFileSync(path.join(path.dirname(config.baselineWrites), "ns-report.json"), "utf8"));
  if (deepId && (baselineReport.deep?.identity?.arm !== "zero" || baselineReport.deep.identity.account !== deepAccount || baselineReport.deep.identity.source !== deepId.source || baselineReport.deep.identity.nonce === deepId.nonce || baselineReport.deep.trace !== report.deep.trace || baselineReport.deep.seed.sha256 !== report.deep.seed.sha256 || baselineReport.config.profile !== config.profile)) throw Error("Deep baseline belongs to a different source, population, trace or account");
  if (baselineReport.config?.zeroReaders !== true || baselineReport.trace?.digest !== report.trace.digest ||
      baselineReport.config?.rungSubjects !== config.rungSubjects || baselineReport.config?.composition !== config.composition ||
      baselineReport.config?.lane !== lane || baselineReport.config?.seed !== config.seed)
    throw Error("Matched baseline identity differs (zero readers, trace, subjects, composition, lane or seed)");
  if (baselineReport.config.schedulerTiming !== config.schedulerTiming || baselineReport.config.historyGrowthSubjects !== config.historyGrowthSubjects)
    throw Error("Matched baseline scheduler/history workload differs");
  report.matchedBaseline = { traceDigest: baselineReport.trace.digest, offeredUntilTraceS: baselineReport.writer?.offeredUntilTraceS,
    source: config.baselineWrites, sha256: createHash("sha256").update(fs.readFileSync(config.baselineWrites)).digest("hex") };
  const rows = readLatencyRun(config.baselineWrites, { lane, encoding: "ndjson", expectedMode: report.qleverConnectionMode }).unwrap().records.filter((w) => w.stream === "background" && !w.resend);
  if (!["DONE", "ERROR"].includes(baselineReport.status) || !baselineReport.correctness ||
      baselineReport.correctness.violations !== 0 || baselineReport.correctness.errors !== 0 ||
      JSON.stringify(baselineReport.benchSources) !== JSON.stringify(report.benchSources))
    throw Error("Matched baseline is incorrect, active or uses different harness source");
  if (baselineReport.verdictClock !== VERDICT_CLOCK || baselineReport.verdictPlanId !== report.verdictPlanId)
    throw Error("Matched baseline clock or phase plan differs");
  for (const row of rows) if (row.outcome === "committed" && !row.expired) verdictMs(row);
  report.matchedBaseline.incompleteCommands = rows.filter(w => w.outcome !== "committed" || w.expired).length;
  report.matchedBaseline.pendingAtEnd = baselineReport.writer?.pendingAtEnd ?? null;
  return rows;
}
function matchedBaseline(rows: any[], fromOffset: number, toOffset: number) {
  const result = matchBaseline(rows, [{ from: fromOffset, to: toOffset }], verdictEvents.filter(e => !e.resend && e.stream === "background"),
    (report.matchedBaseline?.offeredUntilTraceS ?? 0) * 1000, "ack");
  const { rows: _rows, values: _values, ...summary } = result;
  return summary;
}
/** [DX-T1-12] Why: recovery pools the same 30-second offset over all cycles, with matched baseline commands and the 500 floor.
 * Rejected: selecting the easiest single recovery cycle or changing the time the point estimate represents. */
function recoveryWindows(phases: any[], l256: any, baseline: any[] | null, traceStart: number) {
  if (!phases.length || phases.some(p => !p.end)) return null;
  const width = Math.min(30000, ...phases.map(p => p.end - p.start)), windows: any[] = [];
  const cycleWindows = new Map<string, any[]>(phases.map(p => [p.name, []]));
  const good = writes.filter(x => x.stream === "background" && !x.resend && x.outcome === "committed" && !x.expired);
  for (let offset = 0; offset + width <= Math.min(...phases.map(p => p.end - p.start)) + 1; offset += 5000) {
    const intervals = phases.map(p => ({ from: p.start - traceStart + offset, to: p.start - traceStart + offset + width }));
    const h = new Histogram(); let violations = 0, errors = 0;
    for (const p of phases) {
      const one = new Histogram(); let invalidReads = 0, failedReads = 0;
      const from = p.start + offset, to = from + width;
      const folded = spill?.checked?.recovery[p.idx]?.find(s => s.bounds.from === from && s.bounds.to === to);
      if (spill?.checked?.recovery[p.idx] && !folded) throw Error(`Missing checked recovery interval ${p.name}/${offset}`);
      if (folded) {
        one.merge(folded.read);
        invalidReads = folded.violations; failedReads = folded.errors;
      } else visitPhase(p.idx, (r) => {
        if (r[R.start] < from || r[R.start] + r[R.latency] > to) return;
        const v = judgeRead(r);
        if (v.ok) one.recordMs(r[R.latency]); else if (v.kind === "error") failedReads++; else invalidReads++;
      });
      h.merge(one); violations += invalidReads; errors += failedReads;
      const interval = [{ from: from - traceStart, to: to - traceStart }];
      const commit = new Histogram(); good.filter(x => inIntervals(x.offsetMs, interval)).forEach(x => commit.recordMs(verdictMs(x)));
      const ref = baseline ? matchBaseline(baseline, interval, verdictEvents.filter(e => !e.resend && e.stream === "background"), (report.matchedBaseline?.offeredUntilTraceS ?? 0) * 1000, "ack") : null;
      cycleWindows.get(p.name)!.push({ fromS: offset/1000, n: commit.count, denominatorN: ref?.commits ?? 0, reads: one.count, errors: failedReads, routes: folded?.routes, readP99Ms: one.percentileMs(99), commitP99Ms: commit.percentileMs(99),
        descriptiveMeets: invalidReads === 0 && (one.percentileMs(99) ?? Infinity) <= 100 && (!l256 || one.count / (width/1000) >= .9*l256.goodputPerS) &&
          !ref?.invalid && !!ref?.p99Ms && (commit.percentileMs(99) ?? Infinity) <= 1.25*ref.p99Ms,
        diagnosticOnly: true });
    }
    const ch = new Histogram();
    for (const x of writes) if (x.stream === "background" && !x.resend && x.outcome === "committed" && !x.expired && inIntervals(x.offsetMs, intervals)) ch.recordMs(verdictMs(x));
    const matched = baseline ? matchBaseline(baseline, intervals, verdictEvents.filter(e => !e.resend && e.stream === "background"),
      (report.matchedBaseline?.offeredUntilTraceS ?? 0) * 1000, "ack") : null;
    const readP99 = h.percentileMs(99), commitP99 = ch.percentileMs(99), goodput = h.count / (phases.length * width / 1000);
    const meets = ch.count >= 500 && (matched?.commits ?? 0) >= 500 && !matched?.invalid && violations === 0 && readP99 !== null && readP99 <= 100 &&
      (!l256 || goodput >= 0.9 * l256.goodputPerS) && !!matched?.p99Ms && commitP99 !== null && commitP99 <= 1.25 * matched.p99Ms;
    windows.push({ fromS: offset / 1000, windowMs: width, intervals, cycles: phases.length, reads: h.count, violations, errors, readP99Ms: readP99,
      n: ch.count, denominatorN: matched?.commits ?? 0, commitP99Ms: commitP99, matchedZeroReaderP99Ms: matched?.p99Ms ?? null, meets });
  }
  const first = windows.find(w => w.meets);
  const cycles = phases.map(p => {
    const windows = cycleWindows.get(p.name)!, first = windows.find(w => w.descriptiveMeets);
    return { name: p.name, cycle: p.cycle, start: p.start, end: p.end, windows,
      descriptiveRecoveryMs: first ? first.fromS * 1000 + width : null, diagnosticOnly: true };
  });
  return { windows, recoveredAfterMs: first ? first.fromS * 1000 + width : null,
    cycles, slowestCycle: [...cycles].sort((a,b) => (b.descriptiveRecoveryMs ?? Infinity) - (a.descriptiveRecoveryMs ?? Infinity))[0],
    note: "Every pooled offset requires 500 commits per side; individual cycle counts remain diagnostic" };
}
function cpuUse() {
  if (cpuMarks.length < 2) return null;
  const a = cpuMarks[0]!, b = cpuMarks.at(-1)!;
  const wallUs = (b.t - a.t) * 1000;
  return { userCores: (b.cpu.user - a.cpu.user) / wallUs, kernelCores: (b.cpu.system - a.cpu.system) / wallUs, hostCores: os.cpus().length };
}

// ---------------------------------------------------------------- oracle (independent sample check at the driver-recorded basis)

async function runOracle(finalPosition: number, lastAcked: number, deepSamples: any[] = []) {
  const candidates = oracleSamples.filter((s) => s.phase >= 0);
  const liveSamples = config.readPath === "replica" ? candidates : candidates.slice(0, config.oracleMaxReads);
  const selectedSamples = [...liveSamples, ...deepSamples];
  atomicWrite(path.join(rawDir, "ns-full-read-samples.jsonl"), selectedSamples.map((sample: any) => JSON.stringify(sample)).join("\n") + "\n");

  if (!config.oracleRoot) return { status: "NOT-RUN", reason: "no --oracle-root (the gate extracts O-REPLAY from exp/O01-replay-oracle)" };
  const reads: OracleSampleRead[] = selectedSamples.map((s) => ({ subject: s.subject, basis: s.basis, rows: s.rows }));
  if (!reads.length) return { status: "NOT-RUN", reason: "no sampled reads" };
  const caseDoc = buildCase({ caseId: `NS/${runTag}`, commands: recordedCommands, lastPosition: Math.max(finalPosition, lastAcked), reads });
  const result = await checkWithOracleWorker({ oracleRoot: config.oracleRoot, dir: rawDir, caseDoc, reads });
  // [DX-R3] Why: bind each oracle verdict to its exact retained attempt, not another read at the same basis.
  // Rejected: subject/time-only lookup (can attach an earlier read's verdict to this sample).
  function* observations() { yield* streamedOracleRows; yield* records; }
  const modelAgrees = sampleMatches(observations(), liveSamples).filter(rec => rec && judgeRead(rec).ok).length + deepSamples.filter(s => {
    const expected = model.expected(s.subject, s.basis.recordedAt, s.basis.validAt);
    return expected.fullRows && expected.digest === s.observation.digest && expected.facts === s.observation.facts && expected.stamp === s.observation.stamp && s.observation.stamps === 1;
  }).length;
  return { ...result, modelCorrectOnSameReads: modelAgrees, recordedCommands: recordedCommands.length };
}

main();

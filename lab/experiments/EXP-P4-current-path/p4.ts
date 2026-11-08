#!/usr/bin/env node
/**
 * EXP-P4 harness: current-value pulls per arm, exactness first, then timing, at history depth 1, 3 and 10.
 *
 *   node lab/experiments/EXP-P4-current-path/p4.ts --lane xtdb|qlever --subjects N --out DIR
 *     [--source engine|memory] [--container tx2-xtdb-s1] [--quota-cpus 2] [--regime fresh|aged]
 *     [--gate-sample 300] [--gate-pulls 25000] [--gate-concurrency 8] [--timing-pulls 1500]
 *     [--explain-sample 150] [--closed-levels 1,2,4,8,16] [--closed-s 15] [--stages d1,d3,d10,d10x]
 *     [--lean-seed] [--qlever-rebuild] [--eligibility] [--oracle-root DIR]
 *
 * Arms (R24 section 6; lab/experiments/EXP-P4-current-path/BRIEF.md): A0 today's adapter; X1 (xtdb) A0 with
 * current reads under default temporal bounds (packages/xtdb `currentReadTemporalBounds: "default"`); H1 the
 * in-process current table (lab/bench/lib/current-table.ts) over A0, fed by the writer's receipts.
 * Every write goes through the H1 opening, so the table is synchronous with commits (the broker stand-in).
 *
 * Stages: d1 (seed), d3 and d10 (history grown in place on the matched sample, TARGETS 1.1 P4 item 2), d10x
 * (d10 plus expired facts, 20% of each sample subject's own rows; RULINGS Q68e). Per stage:
 *   1. maintenance settled (XTDB: finish-block, compactor_jobs_available == 0, one catalog-refresh write);
 *   2. exactness gate: pulls on every arm at the same (subject, basis), bases from the 80/15/5 mix (RULINGS Q16),
 *      digests recorded per arm; O-REPLAY checks every (subject, basis) at the end (one case, every query);
 *   3. single-client timing on the weighted mix at the current basis, arms interleaved pull by pull;
 *   4. flatness: one pull per arm per matched-sample subject; bytes read (XTDB EXPLAIN ANALYZE scan counters;
 *      engine cgroup CPU and page faults per pull on both lanes; H1 rows and bytes examined);
 *   5. closed-loop throughput per arm and level, with engine cgroup CPU.
 * Eligibility tests (H1) run last: B below H, B above W, a 60 s consumer cut (GS.04b), a regression of W.
 *
 * [EXP-P4] Why one process and in-thread readers: H1 must see every commit synchronously, and the comparison
 * must be relative (same slot, same window, interleaved arms; the host is saturated). Engine CPU and XTDB
 * maintenance are read through `docker -H <lab socket> exec <container>` (read-only observation, as the NS
 * driver samples `docker stats`); finish-block is the XTDB maintenance endpoint R7 and R16 used.
 * Rejected: running the NS driver (its P4 phases have no O-REPLAY gate per pull, no bytes read, no H1 seam).
 */
import { createHash, randomBytes } from "node:crypto";
import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { performance } from "node:perf_hooks";
import { pathToFileURL } from "node:url";
import { Effect, Layer, ManagedRuntime } from "effect";
import { REPO, core, runtimeApi } from "../../bench/lib/triplex.ts";
import { openComposition, type Basis, type CompositionHandle, type Outcome, type PullResult, type Receipt } from "../../bench/lib/composition.ts";
import { CurrentTable, appliedFromReceipt, h1Composition, type H1Handle } from "../../bench/lib/current-table.ts";
import { memoryComposition } from "../../bench/lib/memory.ts";
import { alignIds, seedRung, type RecordedCommand } from "../../bench/lib/seed.ts";
import { buildHistoryGrowth } from "../../bench/lib/commands.ts";
import { chooseHistorySample } from "../../bench/lib/samples.ts";
import { Histogram } from "../../bench/lib/hist.ts";
import { Digest, Rng, seedOf } from "../../bench/lib/rng.ts";
import { observe } from "../../bench/lib/observe.ts";
import { BUCKETS, HOP_SHARE, OWN_FACTS, SEED_VALID_FROM, accountOfSubject, accountsFor, bucketOfAccount, hopOf, ids, memberOf, ownFacts, sharedFacts, subjectInCell, type Bucket, type Hop } from "../../bench/lib/world.ts";

// ---------------------------------------------------------------- arguments

const argv = process.argv.slice(2);
const opt = (k: string, d?: string) => (argv.includes(`--${k}`) ? argv[argv.indexOf(`--${k}`) + 1] : d);
const flag = (k: string) => argv.includes(`--${k}`);
const lane = opt("lane") as "xtdb" | "qlever";
if (lane !== "xtdb" && lane !== "qlever") throw new Error("--lane xtdb|qlever");
const source = opt("source", "engine") as "engine" | "memory";
const N = Number(opt("subjects", "10000"));
const outDir = path.resolve(opt("out") ?? "");
if (!opt("out")) throw new Error("--out DIR is required (durable, never /tmp)");
fs.mkdirSync(outDir, { recursive: true });
const cfg = {
  lane, source, subjects: N, regime: opt("regime", "fresh") as "fresh" | "aged",
  container: opt("container") ?? null, quotaCpus: Number(opt("quota-cpus", "2")),
  gateSample: Number(opt("gate-sample", "300")), gatePulls: Number(opt("gate-pulls", "25000")), gateEnginePulls: Number(opt("gate-engine-pulls", "1000000000")), gateConcurrency: Number(opt("gate-concurrency", "8")),
  timingPulls: Number(opt("timing-pulls", "1500")), explainSample: Number(opt("explain-sample", "150")),
  closedLevels: opt("closed-levels", "1,2,4,8,16")!.split(",").map(Number).filter((x) => x > 0), closedS: Number(opt("closed-s", "15")),
  stages: opt("stages", "d1,d3,d10,d10x")!.split(","), leanSeed: flag("lean-seed"), qleverRebuild: flag("qlever-rebuild"),
  eligibility: flag("eligibility"), historySample: Number(opt("history-sample", "1000")), seedLabel: opt("seed", "ns-v2")!,
  oracleRoot: path.resolve(opt("oracle-root") ?? REPO), oracleProcs: Number(opt("oracle-procs", "3")), skipOracle: flag("skip-oracle"), cutS: Number(opt("cut-s", "60")),
};
const runTag = `p4${Date.now().toString(36)}${randomBytes(2).toString("hex")}`;
const scopeName = `p4-${lane}-${N}-${runTag}`;
const DAY = 86_400_000;
const LAB_DOCKER = "unix:///Users/sam/.colima/triplex2/docker.sock";
const now = () => performance.timeOrigin + performance.now();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const logFile = path.join(outDir, "p4.log");
const log = (line: string) => {
  const text = `[p4 ${new Date().toISOString().slice(11, 19)}] ${line}`;
  fs.appendFileSync(logFile, text + "\n");
  process.stderr.write(text + "\n");
};
const sha = (rel: string) => createHash("sha256").update(fs.readFileSync(path.join(REPO, rel))).digest("hex");
const report: Record<string, any> = {
  format: "tx2-p4-report/1", startedAt: new Date().toISOString(), runTag, scope: scopeName, config: cfg,
  sources: Object.fromEntries(["lab/experiments/EXP-P4-current-path/p4.ts", "lab/bench/lib/current-table.ts", "lab/bench/lib/composition.ts", "lab/bench/lib/world.ts", "lab/bench/lib/seed.ts", "packages/xtdb/src/XtdbStorageAdapter.ts", "packages/qlever/src/QleverStorageAdapter.ts"].map((f) => [f, sha(f)])),
  host: { cpus: os.cpus().length, loadavg: os.loadavg(), node: process.version },
  stages: [] as any[],
};
const save = () => fs.writeFileSync(path.join(outDir, "p4-report.json"), JSON.stringify(report, null, 2) + "\n");
process.on("uncaughtException", (e) => { log(`FATAL ${e?.stack ?? e}`); report.status = "ERROR"; report.error = String(e?.stack ?? e); save(); process.exit(1); });

// ---------------------------------------------------------------- engine observation (docker over the lab socket only)

function dexec(args: string[], timeout = 30_000): string | null {
  if (!cfg.container) return null;
  try {
    return execFileSync("docker", ["-H", LAB_DOCKER, "exec", cfg.container, ...args], { encoding: "utf8", timeout, maxBuffer: 64 << 20 });
  } catch (e: any) {
    log(`docker exec failed: ${args.join(" ").slice(0, 80)}: ${String(e?.message ?? e).slice(0, 200)}`);
    return null;
  }
}
/** Container cgroup v2 counters: CPU microseconds and page faults (both lanes; R17 measured faults per pull). */
function cgroup(): { usageUsec: number; pgfault: number; pgmajfault: number; t: number } | null {
  const text = dexec(["cat", "/sys/fs/cgroup/cpu.stat", "/sys/fs/cgroup/memory.stat"]);
  if (!text) return null;
  const num = (k: string) => Number(new RegExp(`^${k} (\\d+)`, "m").exec(text)?.[1] ?? NaN);
  return { usageUsec: num("usage_usec"), pgfault: num("pgfault"), pgmajfault: num("pgmajfault"), t: now() };
}
const cgDelta = (a: ReturnType<typeof cgroup>, b: ReturnType<typeof cgroup>) =>
  a && b ? { cpuS: (b.usageUsec - a.usageUsec) / 1e6, pgfault: b.pgfault - a.pgfault, pgmajfault: b.pgmajfault - a.pgmajfault, wallS: (b.t - a.t) / 1000 } : null;

// ---------------------------------------------------------------- arms

type Arm = { name: "a0" | "x1" | "h1"; comp: CompositionHandle };
let capture: { sql: string; params: readonly unknown[] }[] | null = null;
let fastRetractLookup = false;
let submitTransform: ((statements: any[]) => any[]) | null = null;
let rawXtdb: any = null;

/** An XTDB runtime over one shared hooked client: SQL capture (EXPLAIN ANALYZE) and seed-time statement transforms. */
async function xtdbArm(scope: string, adapterOptions: Record<string, unknown>, label: string): Promise<CompositionHandle> {
  const xtdb: any = await import(pathToFileURL(path.join(REPO, "packages/xtdb/dist/index.js")).href);
  rawXtdb ??= xtdb.makeXtdbClient(process.env["XTDB_URL"] ?? "postgres://xtdb:xtdb@127.0.0.1:5471/xtdb");
  const hooked = {
    query: (sql: string, params?: readonly unknown[], basis?: unknown, o?: unknown) => {
      if (capture && sql.startsWith("SELECT ") && sql.includes("FROM tx_assertions")) capture.push({ sql, params: params ?? [] });
      // History growth only (--fast-retract-lookup): core reads each retraction target twice by `id = ?`, a scan of
      // the whole table (about 150 ms per retract at 400 subjects on the slot). The adapter writes every row with
      // `_id = JSON.stringify([scope_key, id])`, so adding that `_id` equality returns the same row by IID pruning.
      // The original predicates stay; what is stored is unchanged. Never active while anything is measured.
      if (fastRetractLookup && params && params.length >= 2 && sql.includes("FROM tx_assertions FOR ALL VALID_TIME WHERE scope_key = ? AND id = ? AND")) {
        return rawXtdb.query(sql.replace("WHERE scope_key = ? AND id = ? AND", "WHERE _id = ? AND scope_key = ? AND id = ? AND"), [JSON.stringify([params[0], params[1]]), ...params], basis, o);
      }
      return rawXtdb.query(sql, params, basis, o);
    },
    submit: (statements: any[]) => rawXtdb.submit(submitTransform ? submitTransform(statements) : statements),
    close: async () => {},
  };
  const def = runtimeApi.Runtime.define({
    name: "xtdb",
    storage: Layer.effect(runtimeApi.StorageAdapter, Effect.gen(function* () {
      const rt: any = yield* Effect.service(runtimeApi.TripleStoreRuntime);
      return xtdb.makeXtdbStorageAdapter(hooked, rt.scope, adapterOptions);
    })),
    queries: Layer.effect(runtimeApi.QueryExecutor, Effect.gen(function* () {
      const rt: any = yield* Effect.service(runtimeApi.TripleStoreRuntime);
      return xtdb.makeXtdbQueryExecutor(hooked, rt.scope, undefined);
    })),
  });
  const managed: any = (ManagedRuntime as any).make(def.layer({ scope: runtimeApi.DatabaseScope.test(scope), capabilities: runtimeApi.Capabilities.none }));
  const T: any = await managed.runPromise(Effect.service(core.Triples));
  return triplesComposition(T, managed, label, lane);
}

function failureOf(exit: any) {
  const f = exit?.cause?.failures?.[0];
  const e = f?.error ?? f?.defect ?? exit?.cause;
  return { ok: false as const, tag: String(e?._tag ?? f?._tag ?? "Unknown"), error: e };
}
/** The `public` composition's pull and writer over a Triples service built here (same BFS as lib/composition.ts). */
function triplesComposition(T: any, managed: any, label: string, laneName: "xtdb" | "qlever"): CompositionHandle {
  const E = (id: string) => core.EntityId.make(id);
  const run = (effect: any) => managed.runPromise(effect);
  const pull = async (root: string, basis: Basis): Promise<PullResult> => {
    const seen = new Set<string>([root]);
    let frontier = [root];
    const triples: any[] = [];
    let roundTrips = 0;
    while (frontier.length) {
      const bodies: any[][] = await run(T.entities(frontier.map(E), basis));
      roundTrips++;
      const next: string[] = [];
      for (const body of bodies) for (const t of body) {
        triples.push(t);
        if (t.value?.type === "ref" && !seen.has(t.value.value)) { seen.add(t.value.value); next.push(t.value.value); }
      }
      frontier = next;
    }
    return { triples, entities: seen.size, roundTrips, depth: roundTrips - 1, route: "source", language: `${label}(xtdb-sql)`, waitedMs: 0 };
  };
  const one = { lane: laneName, role: label };
  return {
    name: label, assignments: { source: one, current: one, history: one, analytics: one, replicationEdges: [] },
    watermarks: async () => ({ source: await run(T.currentPosition()) }),
    coordinate: (p) => ({ stream: `triplex-journal:${scopeName}`, epoch: 0, offset: p, ordinal: 0 }),
    backend: { name: laneName, url: "hooked", queryPath: "triplex-entities" },
    transact: async (operations, meta): Promise<Outcome<Receipt>> => {
      const exit = await managed.runPromiseExit(T.transact(operations, meta));
      return exit._tag === "Success" ? { ok: true, value: exit.value } : failureOf(exit);
    },
    transactionByCommand: async (id) => {
      const exit = await managed.runPromiseExit(T.transactionByCommand(id));
      return exit._tag === "Success" ? { ok: true, value: exit.value } : failureOf(exit);
    },
    pull, sweepPull: pull,
    feedPage: (after, limit) => run(T.transactions({ after, limit })),
    currentPosition: () => run(T.currentPosition()),
    close: () => managed.dispose(),
  };
}

const arms: Arm[] = [];
let writer: H1Handle;
/**
 * Negative controls for the gate (offline only): `drop-retracts` applies receipts without their retractions (a
 * stale current table); `serve-ineligible` answers every basis from the table, including B below H.
 * Either must make the O-REPLAY gate FAIL.
 */
const mutant = opt("mutant") ?? null;
if (mutant && source !== "memory") throw new Error("--mutant is an offline negative control (memory source only)");
report.mutant = mutant;
function mutate(h: H1Handle): H1Handle {
  if (mutant === "serve-ineligible") (h.table as any).eligibility = () => ({ ok: true });
  return h;
}
if (source === "memory") {
  const a0 = memoryComposition(lane, scopeName);
  writer = mutant === "drop-retracts"
    ? (() => {
        // The table sees asserts only: every retraction is lost on the way in.
        const h = h1Composition(a0, { applyReceipts: false });
        const transact = h.transact;
        return Object.assign(h, {
          transact: async (operations: readonly any[], meta: any) => {
            const out = await transact(operations, meta);
            if (out.ok) h.table.apply({ ...appliedFromReceipt(out.value, operations), retracts: [] });
            return out;
          },
          catchUp: async () => 0,
        });
      })()
    : mutate(h1Composition(a0, { applyReceipts: true }));
  arms.push({ name: "a0", comp: a0 }, { name: "h1", comp: writer });
} else if (lane === "xtdb") {
  const a0 = await xtdbArm(scopeName, {}, "a0");
  const x1 = await xtdbArm(scopeName, { currentReadTemporalBounds: "default" }, "x1");
  writer = h1Composition(a0, { applyReceipts: true });
  arms.push({ name: "a0", comp: a0 }, { name: "x1", comp: x1 }, { name: "h1", comp: writer });
} else {
  const a0 = await openComposition("public", "qlever", scopeName);
  writer = h1Composition(a0, { applyReceipts: true });
  arms.push({ name: "a0", comp: a0 }, { name: "h1", comp: writer });
}
const armNames = arms.map((a) => a.name);
report.arms = arms.map((a) => ({ name: a.name, assignments: a.comp.assignments }));
log(`scope ${scopeName}; arms ${armNames.join(", ")}; source ${source}; ${N} subjects`);

// ---------------------------------------------------------------- aged regime: XTDB system time per transaction

let agedClock: number | null = null;
if (cfg.regime === "aged") {
  if (lane !== "xtdb" || source !== "engine") throw new Error("--regime aged is an XTDB engine regime");
  // R24 6 step 5: superseded versions must fall in earlier weeks, so the first writer on a fresh database
  // writes at past system times, oldest first. 2.2.0 rejects a time at or below the latest completed tx.
  agedClock = Date.now() - 35 * DAY;
}
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
function agedStatements(statements: any[]): any[] {
  if (agedClock === null) return statements;
  agedClock += 1_000;
  const at = new Date(agedClock).toISOString();
  if (!ISO.test(at)) throw new Error("bad system time");
  // A harness-generated ISO instant checked by the pattern above; XTDB takes no parameters in transaction options.
  return [{ sql: `SET TRANSACTION READ WRITE, SYSTEM_TIME = TIMESTAMP '${at}'` }, ...statements];
}
/** Seed-only statement transform (--lean-seed): drop the assertion-identity ASSERT, whose `id IN (...)` scan of
 * the whole table dominates bulk seeding (NS smokes: 5.8 s per 400-fact command). Seed ids are fresh UUIDs from
 * core, so the check is vacuous there; every row written is byte-identical. Never active outside the seed. */
const dropIdentityAssert = (statements: any[]) => statements.filter((s) => !String(s.sql).startsWith("ASSERT NOT EXISTS (SELECT 1 FROM tx_assertions"));

// ---------------------------------------------------------------- maintenance

async function settle(label: string) {
  if (source !== "engine") return { label, skipped: "memory source" };
  // --settle none: functional smokes on a shared dev resident, where a block flush would touch other agents' scopes.
  if (opt("settle") === "none") return { label, skipped: "--settle none (functional smoke; measurements invalid)" };
  const t0 = now();
  const out: any = { label };
  if (lane === "xtdb") {
    const metric = (text: string, name: string) => {
      const line = text.split("\n").find((l) => l.startsWith(name));
      return line ? Number(line.trim().split(/\s+/).at(-1)) : NaN;
    };
    const read = () => {
      const text = dexec(["wget", "-qO-", "http://127.0.0.1:8080/metrics"]) ?? "";
      return { jobs: metric(text, "compactor_jobs_available"), done: metric(text, "compactor_job_timer_seconds_count"), blocks: metric(text, "block_upload_timer_seconds_count") };
    };
    const before = read();
    out.before = before;
    out.finishBlock = dexec(["wget", "-qO-", "--post-data=", "http://127.0.0.1:8080/system/finish-block"]) !== null;
    // Settled means: the forced block was uploaded, no compaction job is available, and the completed-job count has
    // not moved for 3 polls (6 s). R7 Q1/Q6: L0 files have no blooms and no recency, so measuring early is wrong.
    let polls = 0, stable = 0, last = read(), blockSeen = false;
    for (; polls < 900; polls++) {
      await sleep(2_000);
      const m = read();
      blockSeen ||= m.blocks > before.blocks;
      stable = m.jobs === 0 && m.done === last.done ? stable + 1 : 0;
      last = m;
      if (blockSeen && stable >= 3) break;
      if (!blockSeen && polls >= 30) break; // an empty live index uploads no block
    }
    // Queries see compaction output after the next transaction (upstream #6174, R16 4.2): one write to a side table,
    // then the same settled test again (the write itself may produce work at the next flush, not now).
    const at = agedClock !== null ? [{ sql: `SET TRANSACTION READ WRITE, SYSTEM_TIME = TIMESTAMP '${new Date((agedClock += 1_000)).toISOString()}'` }] : [];
    await rawXtdb.submit([...at, { sql: "INSERT INTO p4_tick (_id, at_ms) VALUES (?, ?)", params: [randomBytes(8).toString("hex"), Date.now()] }]);
    await sleep(2_000);
    out.after = read();
    out.blockSeen = blockSeen;
    out.polls = polls;
    out.compactorJobsAvailable = out.after.jobs;
  }
  out.waitS = (now() - t0) / 1000;
  log(`settle ${label}: ${JSON.stringify(out)}`);
  return out;
}

// ---------------------------------------------------------------- world, samples, command log

const accounts = accountsFor(N);
const matched = chooseHistorySample(N, Math.min(cfg.historySample, Math.floor(N / 10)), cfg.seedLabel, accounts);
// The gate sample: one contiguous block of subjects. Why contiguous: O-REPLAY sorts the whole assertion relation
// for every entity query (views.py `ordered`), so its cost is queries x recorded assertions; a block sits in a few
// seed batches, and its history growth runs in commands of its own, so the case holds about 20-35k assertions
// instead of the whole rung. A block of 20k subjects spans every hop class (i mod 20) and k accounts, whose buckets
// follow a mod 20, so the block keeps the bucket and hop mix approximately. It is grown in place like the matched
// sample (same versions), so the gate checks history depth too.
const gateStart = Math.max(0, Math.min(N - cfg.gateSample, 20 * Math.floor(N / 40)));
const gateSample = Array.from({ length: Math.min(cfg.gateSample, N) }, (_, k) => gateStart + k);
const gateSetAll = new Set(gateSample);
/** Subjects whose history grows: the matched sample outside the gate block, then the gate block, never mixed in one command. */
const growthGroups = (perCommand: number) => {
  const outside = matched.filter((i) => !gateSetAll.has(i));
  const groups: number[][] = [];
  for (const list of [outside, gateSample]) for (let k = 0; k < list.length; k += perCommand) groups.push(list.slice(k, k + perCommand));
  return groups;
};
const recorded: RecordedCommand[] = [];
const receipts: { position: number; instant: number; txId: string; label: string }[] = [];
const noteReceipt = (r: Receipt, label: string) => receipts.push({ position: r.position, instant: r.instant, txId: r.txId, label });
let versionIds = new Map<number, string[]>();
let version = 0;

/** Every entity of subject i's world as the world definition states it (refs do not change in this workload). */
function worldEntities(i: number): string[] {
  const set = new Set<string>();
  for (const f of ownFacts(i, accounts)) { set.add(f.e); if (f.v.type === "ref") set.add(f.v.value); }
  for (const f of sharedFacts(accountOfSubject(i, accounts))) { set.add(f.e); if (f.v.type === "ref") set.add(f.v.value); }
  return [...set];
}

/** Commit through the H1 writer. `record`: the command touches the gate worlds, so the O-REPLAY case carries its intent (others are internal positions). */
async function commit(operations: any[], meta: { commandId: string; actor: string; preconditions?: any[] }, label: string, record = true) {
  for (let attempt = 1; ; attempt++) {
    let out = await writer.transact(operations, meta);
    if (!out.ok && out.tag === "CommandAlreadyCommittedError") {
      const found = await writer.transactionByCommand(meta.commandId);
      if (found.ok && found.value) { await writer.catchUp(); out = { ok: true, value: { txId: found.value.txId, position: found.value.position, instant: found.value.instant, triples: (found.value.changes ?? []).filter((c: any) => c.op === "assert").map((c: any) => ({ id: c.tripleId, entityId: c.entityId, attribute: c.attribute, value: c.value, validFrom: c.validFrom, validTo: c.validTo })) } }; }
    }
    if (out.ok) {
      const r = out.value;
      noteReceipt(r, label);
      if (record) recorded.push({ commandId: meta.commandId, operations, preconditions: meta.preconditions ?? [], actor: meta.actor, receipt: { txId: r.txId, position: r.position, instant: r.instant, assertionIds: alignIds(operations, r) } });
      return r;
    }
    log(`commit ${meta.commandId} failed (${attempt}): ${out.tag} ${String(out.error?.message ?? "").slice(0, 200)}`);
    if (attempt >= 6) throw new Error(`commit ${meta.commandId} failed: ${out.tag}`);
    await sleep(500 * attempt);
  }
}

// ---------------------------------------------------------------- bases (RULINGS Q16 mix; driver-recorded)

interface BasisRec { id: number; recordedAt: number; validAt: number; kind: "latest" | "hour" | "pastV" | "elig"; position: number; stage: string }
const bases: BasisRec[] = [];
const basisKey = new Map<string, number>();
function basisOf(recordedAt: number, validAt: number, kind: BasisRec["kind"], position: number, stage: string): BasisRec {
  const key = `${recordedAt}|${validAt}`;
  const found = basisKey.get(key);
  if (found !== undefined) return bases[found]!;
  const b: BasisRec = { id: bases.length, recordedAt, validAt, kind, position, stage };
  bases.push(b);
  basisKey.set(key, b.id);
  return b;
}
/** Per stage: the latest receipt (80%), four earlier receipts (15%), three past valid times at the latest (5%). */
function stageBases(stage: string, rng: Rng) {
  const latest = receipts.at(-1)!;
  const vNow = Math.floor(now());
  const picks: { b: BasisRec; w: number }[] = [{ b: basisOf(latest.instant, vNow, "latest", latest.position, stage), w: 0.8 }];
  const earlier = receipts.slice(0, -1);
  const chosen = new Set<number>();
  // Spread over the run: the end of the seed, the last receipt of each growth round, and seeded draws.
  const marks = [receipts.findLastIndex((r) => r.label === "seed"), receipts.findLastIndex((r) => r.label === "grow:3"), receipts.findLastIndex((r) => r.label === "grow:10")].filter((k) => k >= 0 && k < earlier.length);
  for (const k of marks) chosen.add(k);
  while (chosen.size < Math.min(4, earlier.length)) chosen.add(rng.int(earlier.length));
  for (const k of [...chosen].slice(0, 4)) picks.push({ b: basisOf(earlier[k]!.instant, vNow, "hour", earlier[k]!.position, stage), w: 0.15 / Math.min(4, chosen.size) });
  for (const back of [10, 45, 89]) picks.push({ b: basisOf(latest.instant, vNow - back * DAY, "pastV", latest.position, stage), w: 0.05 / 3 });
  return picks;
}
const pickWeighted = <T extends { w: number }>(list: T[], u: number) => { let acc = 0; for (const x of list) { acc += x.w; if (u < acc) return x; } return list.at(-1)!; };

// ---------------------------------------------------------------- observations

/** gate[arm][`${subject}|${basisId}`] = Map(digest -> count) */
const gate: Record<string, Map<string, Map<string, number>>> = Object.fromEntries(armNames.map((a) => [a, new Map()]));
const gateRoutes: Record<string, Record<string, number>> = Object.fromEntries(armNames.map((a) => [a, {}]));
const gateErrors: Record<string, number> = Object.fromEntries(armNames.map((a) => [a, 0]));
const crossArmMismatches: any[] = [];
let crossArmMismatchCount = 0;
const rawRecords: string[] = [];
const noteGate = (arm: string, subject: number, basisId: number, digest: string, route: string) => {
  rawRecords.push(JSON.stringify(["gate", arm, subject, basisId, digest, route]));
  const key = `${subject}|${basisId}`;
  const m = gate[arm]!.get(key) ?? new Map<string, number>();
  m.set(digest, (m.get(digest) ?? 0) + 1);
  gate[arm]!.set(key, m);
};

const bucketOf = (i: number): Bucket => bucketOfAccount(accountOfSubject(i, accounts));
async function pullOn(arm: Arm, subject: number, basis: Basis) {
  const t0 = performance.now();
  const pr = await arm.comp.pull(ids.placement(subject), basis);
  const ms = performance.now() - t0;
  const o = observe(pr);
  return { ms, digest: o.digest, facts: o.facts, route: pr.route, roundTrips: pr.roundTrips, rowsExamined: (pr as any).rowsExamined ?? null, bytesExamined: (pr as any).bytesExamined ?? null, bytes: o.bytes };
}

/** One (subject, basis) on every arm, in rotated order; digests must agree across arms. */
async function pullAll(subject: number, basis: Basis, rotation: number, onEach: (arm: Arm, r: Awaited<ReturnType<typeof pullOn>>) => void, only?: ReadonlySet<string>) {
  const digests: string[] = [];
  for (let k = 0; k < arms.length; k++) {
    const arm = arms[(k + rotation) % arms.length]!;
    if (only && !only.has(arm.name)) continue;
    try {
      const r = await pullOn(arm, subject, basis);
      digests[arms.indexOf(arm)] = r.digest;
      onEach(arm, r);
    } catch (e: any) {
      gateErrors[arm.name] = (gateErrors[arm.name] ?? 0) + 1;
      if (gateErrors[arm.name]! <= 5) log(`pull error ${arm.name} ${subject}: ${String(e?.message ?? e).slice(0, 200)}`);
    }
  }
  if (new Set(digests.filter(Boolean)).size > 1) {
    crossArmMismatchCount++;
    if (crossArmMismatches.length < 20) crossArmMismatches.push({ subject, basis, digests: Object.fromEntries(arms.map((a, k) => [a.name, digests[k]])) });
  }
}

const summary = (h: Histogram) => (h.count ? h.summary() : null);

// ---------------------------------------------------------------- stage steps

async function runGate(stage: string, picks: { b: BasisRec; w: number }[], pulls: number) {
  const rng = new Rng(seedOf(`gate:${stage}:${runTag}`));
  const hist: Record<string, Histogram> = Object.fromEntries(armNames.map((a) => [a, new Histogram()]));
  let issued = 0;
  const t0 = now();
  const work = Array.from({ length: pulls }, () => ({ subject: gateSample[rng.int(gateSample.length)]!, b: pickWeighted(picks, rng.next()).b, rot: rng.int(arms.length) }));
  // Engine arms pull the first `gateEnginePulls` items (with H1 at the same key, digests compared); in-process arms
  // pull every item. Why: an engine pull costs 0.17-0.25 engine CPU-seconds on XTDB's 2-CPU slot (smoke, 400
  // subjects), so 100k engine pulls per arm would hold the slot for many hours; O-REPLAY cost is per key, not per pull.
  const enginePulls = Math.min(pulls, cfg.gateEnginePulls);
  const inProcess = new Set(arms.filter((a) => a.name === "h1").map((a) => a.name));
  const perArm: Record<string, number> = Object.fromEntries(armNames.map((a) => [a, 0]));
  let next = 0;
  await Promise.all(Array.from({ length: cfg.gateConcurrency }, async () => {
    while (next < work.length) {
      const k = next++;
      const w = work[k]!;
      await pullAll(w.subject, { recordedAt: w.b.recordedAt, validAt: w.b.validAt }, w.rot, (arm, r) => {
        noteGate(arm.name, w.subject, w.b.id, r.digest, r.route);
        gateRoutes[arm.name]![r.route] = (gateRoutes[arm.name]![r.route] ?? 0) + 1;
        hist[arm.name]!.recordMs(r.ms);
        perArm[arm.name]!++;
      }, k < enginePulls ? undefined : inProcess);
      issued++;
      if (issued % 2500 === 0) log(`gate ${stage}: ${issued}/${pulls} (${((now() - t0) / 1000).toFixed(0)} s)`);
    }
  }));
  return { pulls: issued, pullsPerArm: perArm, enginePulls, wallS: (now() - t0) / 1000, concurrency: cfg.gateConcurrency, latencyAtConcurrency: Object.fromEntries(armNames.map((a) => [a, summary(hist[a]!)])), bases: picks.map((p) => ({ id: p.b.id, kind: p.b.kind, w: p.w, position: p.b.position })) };
}

function weightedSubject(rng: Rng): number {
  const u = rng.next();
  const bucket: Bucket = u < BUCKETS.small.share ? "small" : u < BUCKETS.small.share + BUCKETS.medium.share ? "medium" : "large";
  const w = rng.next();
  const hop: Hop = w < HOP_SHARE[3] ? 3 : w < HOP_SHARE[3] + HOP_SHARE[4] ? 4 : 6;
  return subjectInCell(N, accounts, bucket, hop, rng.next(), rng.next(), rng.next()) ?? rng.int(N);
}

async function runTiming(stage: string) {
  const rng = new Rng(seedOf(`timing:${stage}:${runTag}`));
  const latest = receipts.at(-1)!;
  const mix: Record<string, Histogram> = Object.fromEntries(armNames.map((a) => [a, new Histogram()]));
  const byBucket: Record<string, Record<string, Histogram>> = Object.fromEntries(armNames.map((a) => [a, { small: new Histogram(), medium: new Histogram(), large: new Histogram() }]));
  const byHop: Record<string, Record<string, Histogram>> = Object.fromEntries(armNames.map((a) => [a, { 3: new Histogram(), 4: new Histogram(), 6: new Histogram() }]));
  const routes: Record<string, Record<string, number>> = Object.fromEntries(armNames.map((a) => [a, {}]));
  const t0 = now();
  for (let k = 0; k < cfg.timingPulls; k++) {
    const subject = weightedSubject(rng);
    const basis = { recordedAt: latest.instant, validAt: Math.floor(now()) };
    await pullAll(subject, basis, k % arms.length, (arm, r) => {
      mix[arm.name]!.recordMs(r.ms);
      byBucket[arm.name]![bucketOf(subject)]!.recordMs(r.ms);
      byHop[arm.name]![String(hopOf(subject))]!.recordMs(r.ms);
      routes[arm.name]![r.route] = (routes[arm.name]![r.route] ?? 0) + 1;
      rawRecords.push(JSON.stringify(["timing", stage, arm.name, subject, r.ms.toFixed(3), r.facts, r.roundTrips, r.route]));
    });
  }
  // Flatness sample: every matched subject once per arm (TARGETS 1.1 P4 item 2; p99 per RULINGS Q27).
  const flat: Record<string, Histogram> = Object.fromEntries(armNames.map((a) => [a, new Histogram()]));
  const flatFacts: Record<string, number> = Object.fromEntries(armNames.map((a) => [a, 0]));
  const h1Rows = { rowsExamined: 0, bytesExamined: 0, pulls: 0 };
  for (let k = 0; k < matched.length; k++) {
    const subject = matched[k]!;
    await pullAll(subject, { recordedAt: latest.instant, validAt: Math.floor(now()) }, k % arms.length, (arm, r) => {
      flat[arm.name]!.recordMs(r.ms);
      flatFacts[arm.name]! += r.facts;
      if (arm.name === "h1" && r.rowsExamined !== null) { h1Rows.rowsExamined += r.rowsExamined; h1Rows.bytesExamined += r.bytesExamined; h1Rows.pulls++; }
      rawRecords.push(JSON.stringify(["flat", stage, arm.name, subject, r.ms.toFixed(3), r.facts, r.roundTrips, r.route]));
    });
  }
  const per = (m: Record<string, Record<string, Histogram>>) => Object.fromEntries(Object.entries(m).map(([a, hs]) => [a, Object.fromEntries(Object.entries(hs).map(([k, h]) => [k, summary(h)]))]));
  return {
    wallS: (now() - t0) / 1000, basisPosition: latest.position,
    weightedMix: Object.fromEntries(armNames.map((a) => [a, summary(mix[a]!)])), byBucket: per(byBucket), byHop: per(byHop), routes,
    flatness: Object.fromEntries(armNames.map((a) => [a, { ...summary(flat[a]!), meanFacts: flatFacts[a]! / Math.max(1, matched.length) }])),
    h1Examined: { rowsPerPull: h1Rows.rowsExamined / Math.max(1, h1Rows.pulls), bytesPerPull: h1Rows.bytesExamined / Math.max(1, h1Rows.pulls) },
  };
}

/** Bytes read per pull on the matched sample: XTDB EXPLAIN ANALYZE scan counters; engine CPU and faults per pull. */
async function runBytes(stage: string) {
  const latest = receipts.at(-1)!;
  const sample = matched.slice(0, Math.min(cfg.explainSample, matched.length));
  const out: Record<string, any> = {};
  for (const arm of arms) {
    const basis = { recordedAt: latest.instant, validAt: Math.floor(now()) };
    // Engine work per pull: cgroup CPU and page faults over a block of serial pulls of this arm only.
    const c0 = cgroup();
    for (const s of sample) await arm.comp.pull(ids.placement(s), basis);
    const c1 = cgroup();
    const d = cgDelta(c0, c1);
    out[arm.name] = { pulls: sample.length, engine: d ? { cpuMsPerPull: (d.cpuS * 1000) / sample.length, pgfaultPerPull: d.pgfault / sample.length, wallMsPerPull: (d.wallS * 1000) / sample.length } : null };
    if (lane === "xtdb" && source === "engine" && arm.name !== "h1") {
      const totals = { scan_files_used: 0, scan_files_pruned: 0, scan_pages_used: 0, scan_pages_pruned: 0, scan_rows_read: 0, queries: 0 };
      const perPull: number[] = [];
      for (const s of sample.slice(0, Math.min(60, sample.length))) {
        capture = [];
        await arm.comp.pull(ids.placement(s), basis);
        const qs = capture;
        capture = null;
        let rows = 0;
        for (const q of qs) {
          const plan: any[] = await rawXtdb.query(`EXPLAIN ANALYZE ${q.sql}`, q.params, undefined, { timeoutMs: 60_000 });
          totals.queries++;
          for (const row of plan) {
            const a = typeof row["attributes"] === "string" ? JSON.parse(row["attributes"]) : row["attributes"];
            if (!a) continue;
            for (const k of ["scan_files_used", "scan_files_pruned", "scan_pages_used", "scan_pages_pruned", "scan_rows_read"] as const) totals[k] += Number(a[k] ?? 0);
            rows += Number(a["scan_rows_read"] ?? 0);
          }
        }
        perPull.push(rows);
      }
      const n = perPull.length || 1;
      out[arm.name].explain = { pulls: perPull.length, perPull: Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, v / n])), rowsReadP99: perPull.sort((x, y) => x - y)[Math.floor(0.99 * (perPull.length - 1))] ?? null };
    }
    if (arm.name === "h1") {
      let rows = 0, bytes = 0;
      for (const s of sample) { const pr: any = await arm.comp.pull(ids.placement(s), basis); rows += pr.rowsExamined ?? 0; bytes += pr.bytesExamined ?? 0; }
      out[arm.name].examined = { rowsPerPull: rows / sample.length, bytesPerPull: bytes / sample.length };
    }
  }
  log(`bytes ${stage}: ${JSON.stringify(out)}`);
  return out;
}

async function runClosedLoop(stage: string) {
  const latest = receipts.at(-1)!;
  const out: Record<string, any[]> = Object.fromEntries(armNames.map((a) => [a, []]));
  // Arms alternate in short windows inside each level (3 rounds, rotated order), so host noise lands on every arm
  // alike; a window's engine CPU and host CPU are summed per arm.
  const rounds = 3;
  for (const level of cfg.closedLevels) {
    const acc: Record<string, { h: Histogram; done: number; errors: number; wallS: number; engineS: number; engineWallS: number; hostS: number; rng: Rng }> =
      Object.fromEntries(armNames.map((a) => [a, { h: new Histogram(), done: 0, errors: 0, wallS: 0, engineS: 0, engineWallS: 0, hostS: 0, rng: new Rng(seedOf(`closed:${stage}:${a}:${level}`)) }]));
    for (let round = 0; round < rounds; round++) {
      for (let k = 0; k < arms.length; k++) {
        const arm = arms[(k + round) % arms.length]!;
        const a = acc[arm.name]!;
        let stop = false;
        const c0 = cgroup();
        const cpu0 = process.cpuUsage();
        const t0 = now();
        setTimeout(() => { stop = true; }, (cfg.closedS * 1000) / rounds);
        await Promise.all(Array.from({ length: level }, async () => {
          while (!stop) {
            const s = weightedSubject(a.rng);
            const t = performance.now();
            try { await arm.comp.pull(ids.placement(s), { recordedAt: latest.instant, validAt: Math.floor(now()) }); a.h.recordMs(performance.now() - t); a.done++; } catch { a.errors++; }
            // In-process pulls (H1, memory) never yield to timers; give them a turn so the window ends on time.
            await new Promise((r) => setImmediate(r));
          }
        }));
        a.wallS += (now() - t0) / 1000;
        const cpu = process.cpuUsage(cpu0);
        a.hostS += (cpu.user + cpu.system) / 1e6;
        const d = cgDelta(c0, cgroup());
        if (d) { a.engineS += d.cpuS; a.engineWallS += d.wallS; }
      }
    }
    for (const name of armNames) {
      const a = acc[name]!;
      const row = {
        level, pulls: a.done, errors: a.errors, wallS: a.wallS, pullsPerS: a.done / a.wallS, latency: summary(a.h),
        engineCpuCores: a.engineWallS > 0 ? a.engineS / a.engineWallS : null, pullsPerEngineCpuS: a.engineS > 0 ? a.done / a.engineS : null,
        pullsPerSPerQuotaCore: a.done / a.wallS / cfg.quotaCpus, hostProcessCpuCores: a.hostS / a.wallS, pullsPerHostCpuS: a.hostS > 0 ? a.done / a.hostS : null,
      };
      out[name]!.push(row);
      log(`closed ${stage} ${name} x${level}: ${row.pullsPerS.toFixed(1)} pulls/s, p50 ${row.latency?.p50Ms?.toFixed(2)} ms, engine ${row.engineCpuCores?.toFixed(2)} cores, host ${row.hostProcessCpuCores.toFixed(2)} cores`);
    }
  }
  return out;
}

async function grow(depth: number) {
  const perCommand = 50;
  const t0 = now();
  let commands = 0;
  fastRetractLookup = flag("fast-retract-lookup");
  for (let v = version + 1; v < depth; v++) {
    for (const [k, group] of growthGroups(perCommand).entries()) {
      const cmd = buildHistoryGrowth({ runTag, label: `${v}.${k}`, subjects: group, version: v, ids: versionIds });
      const r = await commit(cmd.operations, { commandId: cmd.commandId, actor: "p4-history", preconditions: cmd.preconditions }, `grow:${depth}`, gateSetAll.has(group[0]!));
      for (const s of cmd.perSubject) versionIds.set(s.subject, s.added.map((f) => r.triples.find((t) => t.entityId === f.e && t.attribute === f.a)!.id));
      commands++;
    }
    version = v;
  }
  fastRetractLookup = false;
  return { depth, commands, wallS: (now() - t0) / 1000, fastRetractLookup: flag("fast-retract-lookup") };
}

/** RULINGS Q68e / R24 6 step 6: facts whose valid_to has passed, 20% of each matched subject's own rows. */
async function addExpired() {
  const perCommand = 50;
  const t0 = now();
  let commands = 0, facts = 0;
  const vt = Math.floor(now());
  for (const [k, group] of growthGroups(perCommand).entries()) {
    const ops: any[] = [];
    for (const i of group) {
      const n = Math.round(OWN_FACTS[hopOf(i)] * 0.25);
      for (let j = 0; j < n; j++) ops.push({ op: "assert", entityId: ids.placement(i), attribute: `:placement/expired-k${j}`, value: { type: "string", value: `expired ${i}.${j}` }, validFrom: vt - 60 * DAY, validTo: vt - DAY });
      facts += n;
    }
    await commit(ops, { commandId: `${runTag}:expired:${k}`, actor: "p4-expired" }, "expired", gateSetAll.has(group[0]!));
    commands++;
  }
  return { commands, facts, wallS: (now() - t0) / 1000 };
}

// ---------------------------------------------------------------- eligibility tests (H1)

async function eligibilityTests() {
  const out: any = {};
  const subjects = gateSample.slice(0, 4);
  const cmp = async (h: CompositionHandle, subject: number, b: BasisRec, tag: string) => {
    const basis = { recordedAt: b.recordedAt, validAt: b.validAt };
    // H1 first: the A0 pull takes hundreds of ms on XTDB, which would hand a lagging follower time to catch up.
    const x = await pullOn({ name: "h1", comp: h }, subject, basis);
    const a = await pullOn(arms[0]!, subject, basis);
    noteGate("a0", subject, b.id, a.digest, a.route);
    noteGate(`h1`, subject, b.id, x.digest, x.route);
    if (a.digest !== x.digest) { crossArmMismatchCount++; if (crossArmMismatches.length < 20) crossArmMismatches.push({ tag, subject, basis, a0: a.digest, h1: x.digest }); }
    return x;
  };
  const flagCommit = async (k: number) => {
    const s = subjects[k % subjects.length]!;
    return commit([{ op: "assert", entityId: ids.placement(s), attribute: `:placement/flag-${k}`, value: { type: "string", value: `f${k}` }, validFrom: SEED_VALID_FROM }], { commandId: `${runTag}:flag:${k}`, actor: "p4-eligibility" }, "elig");
  };
  let flags = 0;
  // 1. B above W: a follower restored from a snapshot, not consuming; a newer basis falls back, then catches up.
  {
    const follower = h1Composition(arms[0]!.comp, { applyReceipts: false, followEveryMs: 0 }, CurrentTable.fromSnapshot(writer.table.snapshot()));
    const r = await flagCommit(flags++);
    const b = basisOf(r.instant, Math.floor(now()), "elig", r.position, "elig:above-w");
    const before = await cmp(follower, subjects[0]!, b, "above-w");
    const caught = await follower.catchUp();
    const after = await cmp(follower, subjects[0]!, b, "above-w-after");
    out.aboveW = { routeBefore: before.route, msBefore: before.ms, caughtUp: caught, routeAfter: after.route };
  }
  // 1b. R24 prediction 8: fallback share at the 80/15/5 mix for a follower polling the feed every 100 ms while
  // commits arrive at about the trace's steady rate (1 per second), against the synchronous writer's table.
  {
    const follower = h1Composition(arms[0]!.comp, { applyReceipts: false, followEveryMs: 100 }, CurrentTable.fromSnapshot(writer.table.snapshot()));
    await follower.catchUp();
    const rng = new Rng(seedOf(`steady:${runTag}`));
    const routes: Record<string, Record<string, number>> = { follower: {}, writer: {} };
    const lagAtRead: number[] = [];
    const t0 = now();
    let lastCommit = 0, reads = 0;
    while (now() - t0 < Math.min(30, cfg.cutS) * 1000) {
      if (now() - lastCommit > 1_000) { await flagCommit(flags++); lastCommit = now(); }
      const latest = receipts.at(-1)!;
      const u = rng.next();
      const r = u < 0.8 ? latest : receipts[receipts.length - 1 - rng.int(Math.min(40, receipts.length))]!;
      const b = basisOf(r.instant, Math.floor(u < 0.95 ? r.instant : r.instant - rng.int(89) * DAY), "elig", r.position, "elig:steady");
      const s = subjects[reads % subjects.length]!;
      lagAtRead.push(latest.position - follower.table.watermark);
      const x = await cmp(follower, s, b, "steady-follower");
      const w = await pullOn({ name: "h1", comp: writer }, s, { recordedAt: b.recordedAt, validAt: b.validAt });
      routes.follower![x.route] = (routes.follower![x.route] ?? 0) + 1;
      routes.writer![w.route] = (routes.writer![w.route] ?? 0) + 1;
      reads++;
      await sleep(20);
    }
    follower.setFollowing(false);
    const share = (m: Record<string, number>) => 1 - (m["current-h1"] ?? 0) / Math.max(1, Object.values(m).reduce((a, b) => a + b, 0));
    out.steadyFollower = { seconds: Math.min(30, cfg.cutS), reads, routes, fallbackShare: { follower: share(routes.follower!), writer: share(routes.writer!) }, positionsBehindAtRead: { mean: lagAtRead.reduce((a, b) => a + b, 0) / Math.max(1, lagAtRead.length), max: Math.max(0, ...lagAtRead) } };
  }
  // 2. GS.04b consumer cut: a following follower stops consuming for cutS seconds while commits continue.
  {
    const follower = h1Composition(arms[0]!.comp, { applyReceipts: false, followEveryMs: 100 }, CurrentTable.fromSnapshot(writer.table.snapshot()));
    await follower.catchUp();
    follower.setFollowing(false);
    const t0 = now();
    const routes: Record<string, number> = {};
    let reads = 0;
    let lastCommit = 0;
    while (now() - t0 < cfg.cutS * 1000) {
      if (now() - lastCommit > 2_000) { await flagCommit(flags++); lastCommit = now(); }
      const latest = receipts.at(-1)!;
      const b = basisOf(latest.instant, Math.floor(latest.instant), "elig", latest.position, "elig:cut");
      const x = await cmp(follower, subjects[reads % subjects.length]!, b, "cut");
      routes[x.route] = (routes[x.route] ?? 0) + 1;
      reads++;
      await sleep(50);
    }
    const resumeAt = now();
    follower.setFollowing(true);
    const target = receipts.at(-1)!;
    while (follower.table.watermark < target.position && now() - resumeAt < 60_000) await sleep(5);
    const catchUpMs = now() - resumeAt;
    const b = basisOf(target.instant, Math.floor(target.instant), "elig", target.position, "elig:cut-after");
    const after = await cmp(follower, subjects[0]!, b, "cut-after");
    out.consumerCut = { cutS: cfg.cutS, reads, routesDuringCut: routes, fallbackShare: 1 - (routes["current-h1"] ?? 0) / Math.max(1, reads), catchUpMs, routeAfter: after.route };
    // Never close a follower here: close() also closes the shared A0 source. Stopping its poller is enough.
    follower.setFollowing(false);
  }
  // 3. Regression of W: replace the table by an older snapshot; bases above its W fall back, older ones serve.
  {
    const old = CurrentTable.fromSnapshot(writer.table.snapshot());
    const oldW = old.watermark;
    const follower = h1Composition(arms[0]!.comp, { applyReceipts: false, followEveryMs: 0 }, CurrentTable.fromSnapshot(writer.table.snapshot()));
    const r = await flagCommit(flags++);
    await follower.catchUp();
    const newer = basisOf(r.instant, Math.floor(r.instant), "elig", r.position, "elig:regress");
    const olderReceipt = receipts.find((x) => x.position === oldW)!;
    const older = basisOf(olderReceipt.instant, Math.floor(olderReceipt.instant), "elig", oldW, "elig:regress");
    const served = await cmp(follower, subjects[1]!, newer, "regress-before");
    follower.replaceTable(old);
    const regressedNewer = await cmp(follower, subjects[1]!, newer, "regress-newer");
    const regressedOlder = await cmp(follower, subjects[1]!, older, "regress-older");
    out.regression = { routeBefore: served.route, routeNewerAfterRegression: regressedNewer.route, routeOlderAfterRegression: regressedOlder.route };
  }
  // 4. B below H: purge the writer's table at the end of the d3 growth; older bases fall back, newer ones serve.
  {
    const cut = receipts.findLast((x) => x.label === "grow:3") ?? receipts[Math.floor(receipts.length / 2)]!;
    const removed = writer.table.purge(cut.position);
    const routes: Record<string, Record<string, number>> = { below: {}, atOrAbove: {} };
    const pick = receipts.filter((_, k) => k % Math.max(1, Math.floor(receipts.length / 40)) === 0);
    for (const rc of pick) {
      const b = basisOf(rc.instant, Math.floor(rc.instant) + 1, "elig", rc.position, "elig:below-h");
      for (const s of subjects.slice(0, 2)) {
        const x = await cmp(writer, s, b, "below-h");
        const side = rc.instant < cut.instant ? "below" : "atOrAbove";
        routes[side]![x.route] = (routes[side]![x.route] ?? 0) + 1;
      }
    }
    out.belowH = { horizonPosition: cut.position, purgedRows: removed, routes, tableAfterPurge: writer.table.stats() };
  }
  log(`eligibility: ${JSON.stringify(out)}`);
  return out;
}

// ---------------------------------------------------------------- O-REPLAY

async function runOracle(label = "final") {
  const t0 = now();
  const last = receipts.reduce((m, r) => Math.max(m, r.position), 0);
  const byPosition = new Map(recorded.map((c) => [c.receipt.position, c]));
  const instantAt = new Map(receipts.map((r) => [r.position, r.instant]));
  const commands: any[] = [];
  const caseReceipts: any[] = [];
  let lastInstant = 0;
  for (let p = 1; p <= last; p++) {
    const c = byPosition.get(p);
    const index = commands.length;
    if (!c) {
      // Commands outside the gate worlds are declared internal (positions stay dense, R-RCP-1), at their real instant.
      lastInstant = Math.max(lastInstant, instantAt.get(p) ?? lastInstant);
      commands.push({ kind: "internal", scope: "s1", expectedOutcome: "committed", journaled: true });
      caseReceipts.push({ command: index, outcome: "committed", txId: `internal:${p}`, position: p, instant: lastInstant });
      continue;
    }
    lastInstant = Math.max(lastInstant, c.receipt.instant);
    commands.push({
      kind: "transact", scope: "s1",
      operations: c.operations.map((op: any) => op.op === "assert" ? { op: "assert", entityId: op.entityId, attribute: op.attribute, value: op.value, validFrom: op.validFrom, ...(op.validTo !== undefined ? { validTo: op.validTo } : {}) } : { op: "retract", id: op.id }),
      meta: { commandId: c.commandId, ...(c.actor ? { actor: c.actor } : {}), ...(c.preconditions.length ? { preconditions: c.preconditions } : {}) },
    });
    caseReceipts.push({ command: index, outcome: "committed", txId: c.receipt.txId, position: p, instant: c.receipt.instant, assertionIds: c.receipt.assertionIds });
  }
  // Queries: every world entity of every (subject, basis) any arm pulled in the gate or the eligibility tests.
  const wanted = new Map<number, Set<string>>();
  const pairs = new Set<string>();
  for (const arm of Object.keys(gate)) for (const key of gate[arm]!.keys()) pairs.add(key);
  const extraEntities = (i: number) => [ids.placement(i)];
  for (const key of pairs) {
    const [s, b] = key.split("|").map(Number) as [number, number];
    const set = wanted.get(b) ?? new Set<string>();
    for (const e of worldEntities(s)) set.add(e);
    for (const e of extraEntities(s)) set.add(e);
    wanted.set(b, set);
  }
  const queries: any[] = [];
  for (const [b, set] of wanted) for (const e of [...set].sort()) queries.push({ id: `${b}|${e}`, kind: "entityTriples", entityId: e, cut: { scope: "s1", position: "latest", recordedAt: bases[b]!.recordedAt, validAt: bases[b]!.validAt } });
  const dir = path.join(outDir, "oracle", label);
  fs.mkdirSync(dir, { recursive: true });
  // The same commands in every chunk, disjoint query sets: O-REPLAY's cost is per query, so chunks run in parallel.
  const chunks = Math.max(1, Math.min(cfg.oracleProcs, Math.ceil(queries.length / 2000)));
  const files = Array.from({ length: chunks }, (_, k) => ({ caseFile: path.join(dir, `case-${k}.json`), outFile: path.join(dir, `expected-${k}.json`) }));
  files.forEach((f, k) => fs.writeFileSync(f.caseFile, JSON.stringify({ format: "triplex-db-2/o-replay-case/1", caseId: `exp-p4-${runTag}-${k}`, defaultScope: "s1", initialPositions: { s1: 0 }, commands, receipts: caseReceipts, queries: queries.filter((_, j) => j % chunks === k) })));
  log(`oracle: ${commands.length} positions (${recorded.length} recorded), ${queries.length} entity queries over ${pairs.size} (subject, basis) pairs; O-REPLAY in ${chunks} parallel chunks`);
  const runs = await Promise.all(files.map((f) => new Promise<{ code: number; stderr: string }>((resolve) => {
    const child = spawn("python3", ["-I", path.join(cfg.oracleRoot, "lab/oracles/replay/cli.py"), f.caseFile, "-o", f.outFile], { stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    child.stderr.on("data", (d) => { if (err.length < 4000) err += d; });
    child.on("close", (code) => resolve({ code: code ?? -1, stderr: err.slice(0, 2000) }));
  })));
  const exitCode = runs.find((r) => r.code !== 0)?.code ?? 0;
  const stderr = runs.map((r) => r.stderr).filter(Boolean).join("\n").slice(0, 2000);
  if (files.some((f) => !fs.existsSync(f.outFile))) return { status: "ORACLE-ERROR", exitCode, stderr };
  const answers = new Map<string, any[]>();
  const docs = files.map((f) => JSON.parse(fs.readFileSync(f.outFile, "utf8")));
  for (const doc of docs) for (const q of doc.queries ?? []) answers.set(q.id, q.result?.raw ?? null);
  const outDoc = docs[0]!;
  const verdicts = [...new Set(docs.map((d) => d.verdict))];
  const caseSha256 = files.map((f) => createHash("sha256").update(fs.readFileSync(f.caseFile)).digest("hex"));
  // Expected world per (subject, basis): BFS over the oracle's visible rows from the placement root.
  const expected = new Map<string, string>();
  let incomplete = 0;
  for (const key of pairs) {
    const [s, b] = key.split("|").map(Number) as [number, number];
    const d = new Digest();
    const root = ids.placement(s);
    const seen = new Set([root]);
    let frontier = [root];
    let ok = true;
    while (frontier.length && ok) {
      const next: string[] = [];
      for (const e of frontier) {
        const rows = answers.get(`${b}|${e}`);
        if (!rows) { ok = false; break; }
        for (const row of rows) {
          d.add(memberOf(row.entityId, row.attribute, row.value));
          if (row.value?.type === "ref" && !seen.has(row.value.value)) { seen.add(row.value.value); next.push(row.value.value); }
        }
      }
      frontier = next;
    }
    if (!ok) { incomplete++; continue; }
    expected.set(key, d.hex());
  }
  const perArm: Record<string, any> = {};
  for (const arm of Object.keys(gate)) {
    let pulls = 0, mismatchedPulls = 0, keys = 0, mismatchedKeys = 0;
    const examples: any[] = [];
    for (const [key, digests] of gate[arm]!) {
      keys++;
      const exp = expected.get(key);
      let bad = false;
      for (const [dg, count] of digests) {
        pulls += count;
        if (exp === undefined || dg !== exp) { mismatchedPulls += count; bad = true; }
      }
      if (bad) { mismatchedKeys++; if (examples.length < 10) examples.push({ key, expected: exp ?? null, observed: Object.fromEntries(digests), basis: bases[Number(key.split("|")[1])] }); }
    }
    perArm[arm] = { pulls, keys, mismatchedPulls, mismatchedKeys, examples };
  }
  const result = {
    status: exitCode === 0 && verdicts.length === 1 && verdicts[0] === "PASS" && docs.every((d) => d.receiptConsistency?.status === "PASS") && incomplete === 0 && Object.values(perArm).every((a: any) => a.mismatchedPulls === 0) ? "PASS" : "FAIL",
    oracleVerdict: verdicts.join(","), oracleVersion: outDoc.oracle?.version, oracleSourceSha256: outDoc.oracle?.sourceSha256 ?? null,
    receiptConsistency: [...new Set(docs.map((d) => d.receiptConsistency?.status ?? null))].join(","),
    receiptViolations: (outDoc.receiptConsistency?.violations ?? []).slice(0, 5), exitCode, stderr: stderr || undefined,
    positions: commands.length, recordedCommands: recorded.length, entityQueries: queries.length, chunks, pairs: pairs.size, incomplete, perArm,
    caseSha256, wallS: (now() - t0) / 1000,
  };
  // The case and the oracle output are regenerable from the run; keep the cases compressed, drop the outputs.
  for (const f of files) { fs.writeFileSync(`${f.caseFile}.gz`, zlib.gzipSync(fs.readFileSync(f.caseFile))); fs.unlinkSync(f.caseFile); fs.unlinkSync(f.outFile); }
  return result;
}

// [EXP-P4] Why: preserve the observed gate digests and their driver-recorded bases independently of
// the final verdict, including rejected stages. Rejected: only saving latency samples (cannot replay a mismatch).
function saveGateEvidence() {
  fs.writeFileSync(path.join(outDir, "pulls.jsonl.gz"), zlib.gzipSync(rawRecords.join("\n") + "\n"));
  const observations = Object.entries(gate).flatMap(([arm, keys]) => [...keys].map(([key, counts]) => ({ arm, key, digests: Object.fromEntries(counts) })));
  fs.writeFileSync(path.join(outDir, "gate-observations.json.gz"), zlib.gzipSync(JSON.stringify({ bases, observations })));
}
async function closeArms() {
  for (const a of arms) await a.comp.close().catch(() => {});
  if (rawXtdb) await rawXtdb.close().catch(() => {});
}

// ---------------------------------------------------------------- main

async function main() {
  report.matchedSample = { size: matched.length, sha256: createHash("sha256").update(matched.join(",")).digest("hex") };
  report.gateSample = { size: gateSample.length, sha256: createHash("sha256").update(gateSample.join(",")).digest("hex") };
  if (lane === "xtdb" && source === "engine" && (flag("probe-system-time") || agedClock !== null)) {
    // R23 section 8 open probe: does `SET TRANSACTION ... SYSTEM_TIME` inside BEGIN READ WRITE set the system time?
    // Only meaningful as the first write on a fresh database (2.2.0 rejects a time at or below the latest tx).
    const at = new Date(agedClock !== null ? (agedClock += 1_000) : Date.now() - 40 * DAY).toISOString();
    const probe: any = { requested: at };
    try {
      await rawXtdb.submit([{ sql: `SET TRANSACTION READ WRITE, SYSTEM_TIME = TIMESTAMP '${at}'` }, { sql: "INSERT INTO p4_tick (_id, at_ms) VALUES (?, ?)", params: ["probe", Date.now()] }]);
      const rows = await rawXtdb.query("SELECT _system_from FROM p4_tick FOR ALL SYSTEM_TIME WHERE _id = ?", ["probe"]);
      probe.systemFrom = rows[0]?.["_system_from"] instanceof Date ? rows[0]["_system_from"].toISOString() : String(rows[0]?.["_system_from"]);
      probe.honoured = Math.abs(new Date(probe.systemFrom).getTime() - new Date(at).getTime()) < 1_000;
    } catch (e: any) { probe.error = String(e?.message ?? e).slice(0, 400); probe.honoured = false; }
    report.systemTimeProbe = probe;
    log(`system-time probe: ${JSON.stringify(probe)}`);
    if (agedClock !== null && !probe.honoured) throw new Error("aged regime needs SET TRANSACTION SYSTEM_TIME; the probe was not honoured");
  }
  if (lane === "xtdb" && source === "engine") {
    await rawXtdb.submit([...(agedClock !== null ? [{ sql: `SET TRANSACTION READ WRITE, SYSTEM_TIME = TIMESTAMP '${new Date((agedClock += 1_000)).toISOString()}'` }] : []), { sql: "INSERT INTO p4_tick (_id, at_ms) VALUES (?, ?)", params: ["init", Date.now()] }]);
  }
  // 1. Seed through the H1 writer (A0's transact; the table applies every receipt).
  const gateSet = new Set(gateSample);
  const seedT0 = now();
  if (cfg.leanSeed || agedClock !== null) submitTransform = (s) => agedStatements(cfg.leanSeed ? dropIdentityAssert(s) : s);
  // QLever keeps every update in its delta (0.75-1.3 GB per million triples, outside -m; R8 verdict 6), so a seed
  // larger than about a million triples merges the delta into the index every K seed commands (`cmd=rebuild-index`).
  const rebuilds: any[] = [];
  const rebuild = async () => {
    const qlever: any = await import(pathToFileURL(path.join(REPO, "packages/qlever/dist/index.js")).href);
    const client = qlever.makeQleverClient(process.env["QLEVER_URL"] ?? "http://127.0.0.1:7071", { accessToken: "p4" });
    const t0 = now();
    try { rebuilds.push({ atCommand: receipts.length, response: await client.command("rebuild-index", { timeoutMs: 1_800_000 }), wallS: (now() - t0) / 1000 }); }
    catch (e: any) { rebuilds.push({ atCommand: receipts.length, error: String(e?.message ?? e).slice(0, 500) }); }
    log(`qlever rebuild: ${JSON.stringify(rebuilds.at(-1)).slice(0, 400)}`);
  };
  const rebuildEvery = Number(opt("qlever-rebuild-every", "0"));
  const seed = await seedRung({
    comp: { ...writer, transact: async (ops: any, meta: any) => {
      const out = await writer.transact(ops, meta);
      if (out.ok) { noteReceipt(out.value, "seed"); if (lane === "qlever" && rebuildEvery > 0 && source === "engine" && receipts.length % rebuildEvery === 0) await rebuild(); }
      return out;
    } } as any,
    subjects: N, runTag, batchFacts: 400, budgetMs: Infinity, recordSubjects: gateSet,
    recordAccounts: new Set([...gateSet].map((i) => accountOfSubject(i, accounts))), historySubjects: new Set([...matched, ...gateSample]), log,
  });
  submitTransform = agedClock !== null ? agedStatements : null;
  // A lost ACK resolved by transactionByCommand inside seedRung bypasses the H1 receipt path: fill from the feed.
  await writer.catchUp();
  if (writer.table.watermark !== seed.lastPosition || receipts.length !== seed.commands)
    log(`seed: H1 watermark ${writer.table.watermark}, seed last position ${seed.lastPosition}, receipts ${receipts.length} of ${seed.commands} commands`);
  if (writer.table.watermark < seed.lastPosition) throw new Error("H1 table did not reach the seed's last position");
  recorded.push(...seed.recorded);
  versionIds = seed.versionIds;
  report.seed = { subjects: seed.seededSubjects, commands: seed.commands, assertions: seed.assertions, wallS: (now() - seedT0) / 1000, factsPerS: seed.factsPerS, commitMs: seed.commitMs, failures: seed.failures.length, lean: cfg.leanSeed, regime: cfg.regime, lastPosition: seed.lastPosition, table: writer.table.stats() };
  log(`seed: ${JSON.stringify(report.seed)}`);
  save();
  if (lane === "qlever" && cfg.qleverRebuild && source === "engine") await rebuild();
  report.qleverRebuilds = rebuilds;
  // Cross-check: this harness's A0 equals the registered `public` composition (and X1 equals `x1`).
  if (source === "engine") {
    const latest = receipts.at(-1)!;
    const checks: any[] = [];
    for (const name of lane === "xtdb" ? ["public", "x1"] : ["public"]) {
      const reg = await openComposition(name, lane, scopeName);
      for (const s of gateSample.slice(0, 5)) {
        const basis = { recordedAt: latest.instant, validAt: Math.floor(now()) };
        const a = observe(await reg.pull(ids.placement(s), basis)).digest;
        const b = observe(await arms[name === "x1" ? 1 : 0]!.comp.pull(ids.placement(s), basis)).digest;
        checks.push({ registered: name, subject: s, equal: a === b });
      }
      await reg.close();
    }
    report.registeredCompositionCheck = checks;
    if (checks.some((c) => !c.equal)) throw new Error(`harness arm differs from the registered composition: ${JSON.stringify(checks)}`);
  }

  for (const stage of cfg.stages) {
    const st: any = { stage, startedAt: new Date().toISOString() };
    if (stage === "d3") st.growth = await grow(3);
    if (stage === "d10") st.growth = await grow(10);
    if (stage === "d10x") st.expired = await addExpired();
    st.settle = await settle(stage);
    st.table = writer.table.stats();
    const picks = stageBases(stage, new Rng(seedOf(`bases:${stage}:${runTag}`)));
    st.gate = await runGate(stage, picks, cfg.gatePulls);
    log(`gate ${stage}: ${JSON.stringify(st.gate.latencyAtConcurrency)}; cross-arm mismatches so far ${crossArmMismatchCount}`);
    // [EXP-P4] Why: exactness must pass before timing an arm; cross-arm agreement alone can share a bug.
    // Rejected: running O-REPLAY only at the end (allows timings of known-wrong arms).
    saveGateEvidence();
    st.oracle = cfg.skipOracle ? null : await runOracle(`stage-${stage}`);
    if (st.oracle?.status !== "PASS" || crossArmMismatchCount > 0 || Object.values(gateErrors).some((n) => n > 0)) {
      report.stages.push(st);
      report.oracle = st.oracle;
      report.status = cfg.skipOracle ? "NO-ORACLE" : "FAIL";
      report.finishedAt = new Date().toISOString();
      report.gateErrors = gateErrors;
      report.crossArm = { mismatches: crossArmMismatchCount, examples: crossArmMismatches };
      save();
      await closeArms();
      return;
    }
    st.timing = await runTiming(stage);
    log(`timing ${stage}: mix ${JSON.stringify(st.timing.weightedMix)}; flat ${JSON.stringify(st.timing.flatness)}`);
    st.bytes = await runBytes(stage);
    st.closedLoop = cfg.closedLevels.length && (opt("closed-stages") ?? stage).split(",").includes(stage) ? await runClosedLoop(stage) : null;
    st.crossArmMismatchCount = crossArmMismatchCount;
    report.stages.push(st);
    save();
  }
  if (cfg.eligibility) report.eligibility = await eligibilityTests();
  report.gateRoutes = gateRoutes;
  report.gateErrors = gateErrors;
  report.crossArm = { mismatches: crossArmMismatchCount, examples: crossArmMismatches };
  report.table = writer.table.stats();
  report.receipts = { count: receipts.length, last: receipts.at(-1) };
  report.bases = bases;
  save();
  fs.writeFileSync(path.join(outDir, "pulls.jsonl.gz"), zlib.gzipSync(rawRecords.join("\n") + "\n"));
  saveGateEvidence();
  if (!cfg.skipOracle) report.oracle = await runOracle();
  report.status = report.oracle?.status === "PASS" && crossArmMismatchCount === 0 && Object.values(gateErrors).every((n) => n === 0) ? "PASS" : cfg.skipOracle ? "NO-ORACLE" : "FAIL";
  // [EXP-P4] Why: a diagnostic PASS with a split gate is not the brief's 100k-per-arm gate.
  // Rejected: inheriting H1's larger denominator for the engine arms.
  report.sampleCoverage = {
    requiredPullsPerArm: 100_000,
    perArm: Object.fromEntries(armNames.map((a) => [a, {
      checkedPulls: report.oracle?.perArm?.[a]?.pulls ?? 0,
      meetsMinimum: (report.oracle?.perArm?.[a]?.pulls ?? 0) >= 100_000,
    }])),
  };
  report.finishedAt = new Date().toISOString();
  save();
  // --receipt NAME: a copy of the report in the experiment's receipts folder (raw samples stay in --out, compressed).
  const receiptName = opt("receipt");
  if (receiptName && /^[a-z0-9-]+$/.test(receiptName)) fs.copyFileSync(path.join(outDir, "p4-report.json"), path.join(REPO, "lab/experiments/EXP-P4-current-path/receipts", `${receiptName}.json`));
  log(`done: ${report.status}; oracle ${JSON.stringify(report.oracle ? { status: report.oracle.status, perArm: Object.fromEntries(Object.entries(report.oracle.perArm ?? {}).map(([k, v]: any) => [k, { pulls: v.pulls, mismatched: v.mismatchedPulls }])) } : null)}`);
  await closeArms();
}

await main();
// [EXP-P4] Why: command success must reflect semantic exactness. Rejected: exit zero for a FAIL report.
process.exit(report.status === "PASS" ? 0 : 1);

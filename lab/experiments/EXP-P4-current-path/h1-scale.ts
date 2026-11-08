#!/usr/bin/env node
/**
 * EXP-P4 H1 at a large rung without an engine (R24 section 6 prediction 9 and the 100k step for H1).
 *
 *   node --max-old-space-size=4096 lab/experiments/EXP-P4-current-path/h1-scale.ts --subjects 100000 --out DIR
 *
 * Builds the H1 table directly from the world definition (the same seed facts, batches of 400, positions and
 * instants in order), grows history in place on the matched sample to depth 3 and 10, adds the 20% expired facts,
 * and measures single-thread pull latency on the weighted mix and on the matched sample at each step, rows and
 * bytes examined per pull, table size and process RSS. Exactness of H1 is the engine runs' gate; this run
 * measures size and cost only (no reference copy, so the host's memory is not doubled).
 * [EXP-P4] Why synthetic receipts: the memory composition would hold a second copy of 3.9M facts on a host with
 * nearly full swap; the table's apply path is the same one receipts and the feed use.
 */
import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { CurrentTable, type AppliedTx } from "../../bench/lib/current-table.ts";
import { Histogram } from "../../bench/lib/hist.ts";
import { Rng, seedOf } from "../../bench/lib/rng.ts";
import { chooseHistorySample } from "../../bench/lib/samples.ts";
import { BUCKETS, HOP_SHARE, OWN_FACTS, SEED_VALID_FROM, accountOfSubject, accountsFor, bucketOfAccount, hopOf, ids, ownFacts, populationCounts, sharedFacts, subjectInCell, versioned, type Bucket, type Fact, type Hop } from "../../bench/lib/world.ts";

const argv = process.argv.slice(2);
const opt = (k: string, d?: string) => (argv.includes(`--${k}`) ? argv[argv.indexOf(`--${k}`) + 1] : d);
const N = Number(opt("subjects", "100000"));
const out = path.resolve(opt("out") ?? "");
fs.mkdirSync(out, { recursive: true });
const pulls = Number(opt("pulls", "5000"));
const accounts = accountsFor(N);
const t = new CurrentTable();
let position = 0, instant = Date.now() - 3_600_000, idSeq = 0;
const nextId = () => `h${(idSeq++).toString(36)}`;
const vIds = new Map<number, string[]>();
const matched = chooseHistorySample(N, Math.min(1000, Math.floor(N / 10)), "ns-v2", accounts);
const matchedSet = new Set(matched);
const commit = (facts: Fact[], retracts: string[] = [], validTo?: number, validFrom = SEED_VALID_FROM) => {
  const asserts = facts.map((f) => ({ id: nextId(), entityId: f.e, attribute: f.a, value: f.v, validFrom, ...(validTo !== undefined ? { validTo } : {}) }));
  const tx: AppliedTx = { position: ++position, instant: ++instant, asserts, retracts };
  t.apply(tx);
  return asserts;
};
const mem = () => { const m = process.memoryUsage(); return { rssMiB: m.rss / 2 ** 20, heapUsedMiB: m.heapUsed / 2 ** 20 }; };
const report: any = { format: "tx2-p4-h1-scale/1", subjects: N, accounts, population: populationCounts(N, accounts), steps: [] };
const t0 = performance.now();
for (let a = 0; a < accounts; a++) { const f = sharedFacts(a); for (let k = 0; k < f.length; k += 400) commit(f.slice(k, k + 400)); }
let batch: Fact[] = [], members: number[] = [];
const flush = () => {
  const asserts = commit(batch);
  for (const i of members) if (matchedSet.has(i)) vIds.set(i, versioned(i, 0).map((f) => asserts.find((x) => x.entityId === f.e && x.attribute === f.a)!.id));
  batch = []; members = [];
};
for (let i = 0; i < N; i++) {
  const f = ownFacts(i, accounts);
  if (batch.length + f.length > 400) flush();
  batch.push(...f); members.push(i);
}
flush();
report.seed = { positions: position, wallS: (performance.now() - t0) / 1000, applyMs: t.counters.applyMs, applyMsPerCommand: t.counters.applyMs / position, ...mem(), table: t.stats() };
console.error(`seed ${JSON.stringify(report.seed)}`);

const weighted = (rng: Rng) => {
  const u = rng.next();
  const bucket: Bucket = u < BUCKETS.small.share ? "small" : u < BUCKETS.small.share + BUCKETS.medium.share ? "medium" : "large";
  const w = rng.next();
  const hop: Hop = w < HOP_SHARE[3] ? 3 : w < HOP_SHARE[3] + HOP_SHARE[4] ? 4 : 6;
  return subjectInCell(N, accounts, bucket, hop, rng.next(), rng.next(), rng.next()) ?? rng.int(N);
};
function measure(label: string) {
  const rng = new Rng(seedOf(`h1-scale:${label}`));
  const basis = { recordedAt: instant, validAt: Date.now() };
  const mix = new Histogram(), flat = new Histogram();
  const byBucket: Record<string, Histogram> = { small: new Histogram(), medium: new Histogram(), large: new Histogram() };
  let rows = 0, bytes = 0, facts = 0, flatRows = 0, flatBytes = 0;
  const cpu0 = process.cpuUsage(), w0 = performance.now();
  for (let k = 0; k < pulls; k++) {
    const s = weighted(rng);
    const a = performance.now();
    const p = t.pull(ids.placement(s), basis);
    const ms = performance.now() - a;
    mix.recordMs(ms);
    byBucket[bucketOfAccount(accountOfSubject(s, accounts))]!.recordMs(ms);
    rows += p.rowsExamined; bytes += p.bytesExamined; facts += p.triples.length;
  }
  const wallS = (performance.now() - w0) / 1000, cpu = process.cpuUsage(cpu0);
  for (const s of matched) {
    const a = performance.now();
    const p = t.pull(ids.placement(s), basis);
    flat.recordMs(performance.now() - a);
    flatRows += p.rowsExamined; flatBytes += p.bytesExamined;
  }
  const step = {
    label, mix: mix.summary(), byBucket: Object.fromEntries(Object.entries(byBucket).map(([k, h]) => [k, h.summary()])), flat: flat.summary(),
    pullsPerS: pulls / wallS, pullsPerCpuS: pulls / ((cpu.user + cpu.system) / 1e6), rowsPerPull: rows / pulls, bytesPerPull: bytes / pulls, factsPerPull: facts / pulls,
    flatRowsPerPull: flatRows / matched.length, flatBytesPerPull: flatBytes / matched.length, table: t.stats(), ...mem(),
  };
  report.steps.push(step);
  console.error(`${label}: mix p50 ${step.mix.p50Ms} p99 ${step.mix.p99Ms} ms; flat p99 ${step.flat.p99Ms}; ${step.pullsPerCpuS.toFixed(0)} pulls/cpu-s; rss ${step.rssMiB.toFixed(0)} MiB`);
}
measure("d1");
let version = 0;
const grow = (depth: number) => {
  for (let v = version + 1; v < depth; v++) {
    for (let k = 0; k < matched.length; k += 50) {
      const group = matched.slice(k, k + 50);
      const facts: Fact[] = [], retracts: string[] = [];
      for (const i of group) { retracts.push(...vIds.get(i)!); facts.push(...versioned(i, v)); }
      const asserts = commit(facts, retracts);
      for (const i of group) vIds.set(i, versioned(i, v).map((f) => asserts.find((x) => x.entityId === f.e && x.attribute === f.a)!.id));
    }
    version = v;
  }
};
grow(3); measure("d3");
grow(10); measure("d10");
const vt = Date.now();
for (let k = 0; k < matched.length; k += 50) {
  const facts: Fact[] = [];
  for (const i of matched.slice(k, k + 50)) for (let j = 0; j < Math.round(OWN_FACTS[hopOf(i)] * 0.25); j++) facts.push({ e: ids.placement(i), a: `:placement/expired-k${j}`, v: { type: "string", value: `expired ${i}.${j}` } });
  commit(facts, [], vt - 86_400_000, vt - 60 * 86_400_000);
}
measure("d10x");
report.applyMsPerRow = t.counters.applyMs / t.counters.appliedRows;
report.applyMaxMs = t.counters.applyMaxMs;
fs.writeFileSync(path.join(out, "h1-scale.json"), JSON.stringify(report, null, 2) + "\n");
console.error(`done: apply ${(report.applyMsPerRow * 1000).toFixed(2)} us/row, max ${report.applyMaxMs.toFixed(2)} ms per tx`);

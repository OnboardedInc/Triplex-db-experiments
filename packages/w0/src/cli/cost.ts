/**
 * Per-subject cost of the P5 sweep's per-subject step on the 100k population, single-threaded (EXP-D01b brief, point of view 4).
 *
 *   node dist/cli/cost.js [--n 100000] [--warmup 5000] [--wire-every 20] [--samples cost.csv.gz] [--out summary.json]
 *
 * For each world (generated first, outside the timed region) and each release R1, R2, R3 (order rotated per subject), four
 * timed segments, which together are exactly `sweepSubject` plus a first publication:
 *   index   SPEC 4.4 steps 2 and 3 (`checkBasis`, `indexWorld`): validate every fact, ballast included, and index the world;
 *   rules   `evaluateIndexed`: the eleven rules, output assembly and work item id and version hashing;
 *   json    `outputJson`: the canonical bytes (SPEC 9);
 *   publish `publish` of the subject's record into an empty outbox (a first activation: every work item is new).
 * Every k-th world also goes through the wire path (`runOpBytes` on the canonical JSON input) to price a JSON hand-off.
 * Timings are wall-clock nanoseconds from `process.hrtime.bigint()`; on a saturated host they include preemption, so the
 * process CPU time of the loop is reported alongside.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { gzipSync } from "node:zlib";
import type { World } from "../kernel.js";
import { checkBasis, evaluateIndexed, indexWorld, outputJson } from "../kernel.js";
import { runOpBytes } from "../ops.js";
import { EMPTY_OUTBOX, publish, recordOf } from "../outbox.js";
import { population, populationBasis, rung } from "../population.js";
import { R1, R2, R3 } from "../release.js";
import { args, intArg } from "./args.js";

const a = args(process.argv.slice(2));
const N = intArg(a, "n", 100_000);
const warmup = intArg(a, "warmup", 5000);
const wireEvery = intArg(a, "wire-every", 20);
const samplesPath = a.get("samples");
const out = a.get("out");

const releases = [R1, R2, R3] as const;
const SEGMENTS = ["index", "rules", "json", "publish"] as const;
const R = rung(N);
const load0 = os.loadavg();
const tb0 = process.hrtime.bigint();
const B = populationBasis(R);
const basisSeconds = Number(process.hrtime.bigint() - tb0) / 1e9;

const now = (): bigint => process.hrtime.bigint();
const lap = (t: bigint): number => Number(process.hrtime.bigint() - t);

function step(world: World, k: number, into: number[]): void {
  const rel = releases[k]!;
  const t0 = now();
  const bad = checkBasis(B);
  const idx = indexWorld(world, B.tx);
  into[0] = lap(t0);
  if (bad !== null || typeof idx === "string")
    throw new Error(`${world.subject} ${rel.name}: ${bad ?? idx}`);
  const t1 = now();
  const r = evaluateIndexed(idx, rel, B);
  into[1] = lap(t1);
  const t2 = now();
  const json = outputJson(r);
  into[2] = lap(t2);
  const t3 = now();
  const p = publish(EMPTY_OUTBOX, [recordOf(r)]);
  into[3] = lap(t3);
  if (json.length === 0 || p.deliveries.length !== r.workItems.length)
    throw new Error("unexpected");
}

const scratch = [0, 0, 0, 0];
// Warm-up: the same code paths on the first worlds, untimed.
for (const pl of population(R, 0, Math.min(warmup, N)))
  for (let k = 0; k < 3; k++) step(pl.world, k, scratch);

/** ns[release][segment][subject] */
const ns = releases.map(() => SEGMENTS.map(() => new Uint32Array(N)));
const wireNs = new Uint32Array(N); // R1 only, 0 when not sampled
const subjectCpuNs = new Uint32Array(N);
const bucket = new Uint8Array(N);
const factsOf = new Uint32Array(N);
const hopsOf = new Uint8Array(N);
const reachedR3 = new Uint8Array(N);
const listed = R3.entries.OT.scope!.jurisdictions;

const cpu0 = process.cpuUsage();
const tm0 = now();
let timedNs = 0;
let i = 0;
for (const pl of population(R)) {
  bucket[i] = pl.plan.bucket;
  factsOf[i] = pl.world.facts.length;
  hopsOf[i] = pl.plan.hops;
  // R3 reaches the subject when its location's jurisdiction is listed (SPEC 10 item 7)
  const jur = pl.world.facts.find((f) => f.a === "jurisdiction");
  reachedR3[i] = jur !== undefined && listed.has(jur.v as string) ? 1 : 0;
  const c0 = process.cpuUsage();
  for (let n = 0; n < 3; n++) {
    const k = (i + n) % 3;
    step(pl.world, k, scratch);
    for (let s = 0; s < 4; s++) {
      ns[k]![s]![i] = scratch[s]!;
      timedNs += scratch[s]!;
    }
  }
  const c1 = process.cpuUsage(c0);
  subjectCpuNs[i] = Math.min(0xffffffff, (c1.user + c1.system) * 1000);
  if (wireEvery > 0 && i % wireEvery === 0) {
    const input = Buffer.from(
      '{"basis":{"tx":' +
        B.tx +
        ',"validTime":"' +
        B.validTime +
        '"},"release":"R1","world":' +
        pl.json +
        "}",
      "utf8",
    );
    const t = now();
    runOpBytes("evaluate", input);
    wireNs[i] = lap(t);
  }
  i++;
}
const wallMeasured = Number(now() - tm0) / 1e9;
const cpu = process.cpuUsage(cpu0);

// ---- summary ----
const pick = (sorted: Uint32Array, q: number): number =>
  sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))]!;
const us = (x: number): number => Math.round(x / 100) / 10; // ns to microseconds, one decimal
function dist(xs: Uint32Array) {
  const s = Uint32Array.from(xs).sort();
  let sum = 0;
  for (const x of s) sum += x;
  return {
    n: s.length,
    meanUs: s.length === 0 ? 0 : us(sum / s.length),
    p50Us: us(pick(s, 0.5)),
    p90Us: us(pick(s, 0.9)),
    p99Us: us(pick(s, 0.99)),
    p999Us: us(pick(s, 0.999)),
    maxUs: us(s.length === 0 ? 0 : s[s.length - 1]!),
    sumSeconds: Math.round(sum / 1e6) / 1e3,
  };
}
const select = (xs: Uint32Array, keep: (i: number) => boolean): Uint32Array => {
  const o: number[] = [];
  for (let k = 0; k < xs.length; k++) if (keep(k)) o.push(xs[k]!);
  return Uint32Array.from(o);
};
const totalOf = (k: number): Uint32Array => {
  const t = new Uint32Array(N);
  for (let n = 0; n < N; n++)
    t[n] = ns[k]![0]![n]! + ns[k]![1]![n]! + ns[k]![2]![n]! + ns[k]![3]![n]!;
  return t;
};
const BUCKETS = ["50-200", "201-800", "801-2000"];
const segmentsOf = (k: number, keep: (n: number) => boolean) => ({
  total: dist(select(totalOf(k), keep)),
  ...Object.fromEntries(SEGMENTS.map((s, si) => [s, dist(select(ns[k]![si]!, keep))])),
});
const perRelease = Object.fromEntries(
  releases.map((rel, k) => [
    rel.name,
    {
      all: segmentsOf(k, () => true),
      byBucket: Object.fromEntries(
        BUCKETS.map((b, bi) => [b, segmentsOf(k, (n) => bucket[n] === bi)]),
      ),
    },
  ]),
);
// The narrow R3 sweep re-runs only the subjects R3 reaches (SPEC 5.3, 10 item 7).
const r3Narrow = dist(select(totalOf(2), (n) => reachedR3[n] === 1));
const sampled = (n: number): boolean => wireNs[n]! > 0;
let factSum = 0;
for (const f of factsOf) factSum += f;

const summary = {
  experiment: "EXP-D01b",
  measurement: "per-subject cost, single thread, 100k population at B (SPEC 12.7)",
  spec: "W0-1.1.2",
  rung: { N, L: R.L, K: R.K },
  basis: B,
  meanFactsPerWorld: factSum / N,
  warmupSubjects: Math.min(warmup, N),
  segments:
    "index = checkBasis + indexWorld; rules = evaluateIndexed; json = outputJson; publish = publish(empty, [record])",
  perRelease,
  r3NarrowSweep: { subjects: r3Narrow.n, total: r3Narrow },
  wirePathR1: {
    every: wireEvery,
    all: dist(select(wireNs, sampled)),
    byBucket: Object.fromEntries(
      BUCKETS.map((b, bi) => [b, dist(select(wireNs, (n) => sampled(n) && bucket[n] === bi))]),
    ),
  },
  aggregate: {
    measuredLoopWallSeconds: wallMeasured,
    measuredLoopCpuSeconds: (cpu.user + cpu.system) / 1e6,
    timedSegmentsSeconds: timedNs / 1e9,
    perSubjectThreeReleasesCpu: dist(subjectCpuNs),
    note: "the measured loop also generates the worlds and runs the wire samples; timedSegments sums the per-step timings over the three releases",
  },
  basisPassSeconds: basisSeconds,
  host: {
    node: process.version,
    platform: os.platform(),
    arch: os.arch(),
    cpus: os.cpus().length,
    cpuModel: os.cpus()[0]?.model ?? null,
    loadavgStart: load0,
    loadavgEnd: os.loadavg(),
  },
  gitCommit: process.env["W0_GIT_COMMIT"] ?? null,
  finishedAt: new Date().toISOString(),
};

if (samplesPath !== undefined) {
  const head = ["i", "bucket", "facts", "hops", "reachedR3"];
  for (const rel of releases)
    for (const s of SEGMENTS) head.push(`${rel.name.toLowerCase()}_${s}_ns`);
  head.push("wire_r1_ns", "subject_cpu_ns");
  const lines = [head.join(",")];
  for (let n = 0; n < N; n++) {
    const row: (number | string)[] = [n, bucket[n]!, factsOf[n]!, hopsOf[n]!, reachedR3[n]!];
    for (let k = 0; k < 3; k++) for (let s = 0; s < 4; s++) row.push(ns[k]![s]![n]!);
    row.push(wireNs[n]! > 0 ? wireNs[n]! : "", subjectCpuNs[n]!);
    lines.push(row.join(","));
  }
  mkdirSync(path.dirname(samplesPath), { recursive: true });
  writeFileSync(samplesPath, gzipSync(lines.join("\n") + "\n"));
}
const text = JSON.stringify(summary, null, 2) + "\n";
if (out !== undefined) {
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, text);
}
process.stdout.write(text);

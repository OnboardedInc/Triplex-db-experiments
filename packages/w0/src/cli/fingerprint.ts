/**
 * The SPEC 12.7 population fingerprint and the measured floors, streamed one world at a time in bounded memory.
 *
 *   node dist/cli/fingerprint.js [--n 100000] [--wire-every 50] [--out receipt.json]
 *
 * Six fingerprint values (SPEC 12.7 item 2): basis.tx, the fact count, the worlds digest and the R1, R2 and R3 output digests.
 * Also the SPEC 12.7 item 1 measurements (the four floors, R3's reached and changed counts, the per-bucket sizes), and a
 * cross-check of the typed path against the wire path (`runOpBytes`) on every k-th world.
 */
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Output } from "../kernel.js";
import { evaluateWorld, isFailure, outputJson } from "../kernel.js";
import { runOpBytes } from "../ops.js";
import { population, populationBasis, rung } from "../population.js";
import type { RuleId } from "../release.js";
import { R1, R2, R3, RULE_ORDER } from "../release.js";
import { args, intArg } from "./args.js";

const a = args(process.argv.slice(2));
const N = intArg(a, "n", 100_000);
const wireEvery = intArg(a, "wire-every", 50);
const out = a.get("out");

const t0 = process.hrtime.bigint();
const cpu0 = process.cpuUsage();
const load0 = os.loadavg();
const R = rung(N);
const B = populationBasis(R);
const tBasis = process.hrtime.bigint();

const releases = [R1, R2, R3] as const;
const hWorlds = createHash("sha256");
const hOut = releases.map(() => createHash("sha256"));
let facts = 0;
let invalid = 0;
let wireChecked = 0;
let wireMismatch = 0;

/** SPEC 12.1 item 3 domain projection, optionally restricted to one rule's outputs. */
function projection(o: Output, rule?: RuleId): string {
  const keep = (x: { rule: string }) => rule === undefined || x.rule === rule;
  const wi = o.workItems
    .filter(keep)
    .map((w) => JSON.stringify([w.rule, w.kind, w.key, w.payload]))
    .sort();
  return JSON.stringify([
    o.tasks.filter(keep),
    o.obligations.filter(keep),
    o.flags.filter(keep),
    wi,
  ]);
}
/** SPEC 12.1 item 2: a rule fires when it emits a task, an obligation (its tasks' due obligations included), a work item or a flag. */
function fired(o: Output): Set<string> {
  const s = new Set<string>();
  for (const x of [...o.tasks, ...o.obligations, ...o.workItems, ...o.flags]) s.add(x.rule);
  return s;
}

const fires = releases.map(() => new Map<string, number>(RULE_ORDER.map((r) => [r, 0])));
const threePlus = releases.map(() => 0);
let r2Changes = 0;
const r2RuleChanges = new Map<string, number>([
  ["I9S2", 0],
  ["DOCEXP", 0],
  ["MINWAGE", 0],
]);
let r3Reached = 0;
let r3Changed = 0;
let r3ChangedNotReached = 0;
const bucketCount = [0, 0, 0];
const bucketFacts = [0, 0, 0];
const bucketBelow = [0, 0, 0];
const hopsCount = new Map<number, number>();
const perLocation = new Map<number, number>();
let maxF = 0;
const listed = R3.entries.OT.scope!.jurisdictions;

let i = 0;
for (const pl of population(R)) {
  hWorlds.update(i === 0 ? "[" : ",");
  hWorlds.update(pl.json);
  facts += pl.world.facts.length;
  const p = pl.plan;
  bucketCount[p.bucket]!++;
  bucketFacts[p.bucket]! += pl.world.facts.length;
  if (pl.world.facts.length < [50, 201, 801][p.bucket]!) bucketBelow[p.bucket]!++;
  hopsCount.set(p.hops, (hopsCount.get(p.hops) ?? 0) + 1);
  if (p.rank !== null) perLocation.set(p.rank, (perLocation.get(p.rank) ?? 0) + 1);
  if (pl.F > maxF) maxF = pl.F;

  const outs: Output[] = [];
  releases.forEach((rel, k) => {
    const r = evaluateWorld(pl.world, rel, B);
    if (isFailure(r)) {
      invalid++;
      throw new Error(`${pl.world.subject} under ${rel.name}: ${r.error}`);
    }
    const json = outputJson(r);
    hOut[k]!.update(i === 0 ? "[" : ",");
    hOut[k]!.update(json);
    outs.push(r);
    for (const rule of fired(r)) fires[k]!.set(rule, fires[k]!.get(rule)! + 1);
    if (r.workItems.length >= 3) threePlus[k]!++;
    if (wireEvery > 0 && i % wireEvery === 0) {
      // The same world through the wire path: canonical bytes in, canonical bytes out.
      const input =
        '{"basis":{"tx":' +
        B.tx +
        ',"validTime":"' +
        B.validTime +
        '"},"release":"' +
        rel.name +
        '","world":' +
        pl.json +
        "}";
      wireChecked++;
      if (runOpBytes("evaluate", Buffer.from(input, "utf8")) !== json) wireMismatch++;
    }
  });
  const [o1, o2, o3] = outs as [Output, Output, Output];
  if (projection(o1) !== projection(o2)) r2Changes++;
  for (const rule of r2RuleChanges.keys())
    if (projection(o1, rule as RuleId) !== projection(o2, rule as RuleId))
      r2RuleChanges.set(rule, r2RuleChanges.get(rule)! + 1);
  // SPEC 10 item 7: R3 reaches s when s's dependencies hold (J, stateMinWageCents) for a listed J.
  const reached = o3.dependencies.some(([e, at]) => at === "stateMinWageCents" && listed.has(e));
  const changed = projection(o2) !== projection(o3);
  if (reached) r3Reached++;
  if (changed) r3Changed++;
  if (changed && !reached) r3ChangedNotReached++;
  i++;
}
hWorlds.update(i === 0 ? "[]" : "]");
hOut.forEach((h) => h.update(i === 0 ? "[]" : "]"));
const t1 = process.hrtime.bigint();
const cpu1 = process.cpuUsage(cpu0);

const pct = (x: number): number => Math.round((x / N) * 1e5) / 1e3;
const counts = [...perLocation.values()];
const located = counts.reduce((s, x) => s + x, 0);
const receipt = {
  experiment: "EXP-D01b",
  spec: "W0-1.1.1",
  seed: "W0-pop-1",
  rung: { N, L: R.L, K: R.K },
  fingerprint: {
    basisTx: B.tx,
    facts,
    worlds: "sha256:" + hWorlds.digest("hex"),
    R1: "sha256:" + hOut[0]!.digest("hex"),
    R2: "sha256:" + hOut[1]!.digest("hex"),
    R3: "sha256:" + hOut[2]!.digest("hex"),
  },
  releases: { R1: R1.hash, R2: R2.hash, R3: R3.hash },
  invalidWorlds: invalid,
  wireCrossCheck: { every: wireEvery, evaluations: wireChecked, mismatches: wireMismatch },
  floors: {
    r2ChangesPct: pct(r2Changes),
    r2RuleChangesPct: Object.fromEntries([...r2RuleChanges].map(([k, v]) => [k, pct(v)])),
    firesPct: Object.fromEntries(
      releases.map((rel, k) => [
        rel.name,
        Object.fromEntries([...fires[k]!].map(([r, v]) => [r, pct(v)])),
      ]),
    ),
    threePlusWorkItemsPct: Object.fromEntries(
      releases.map((rel, k) => [rel.name, pct(threePlus[k]!)]),
    ),
    locations: {
      used: perLocation.size,
      largest: Math.max(...counts),
      smallest: Math.min(...counts),
      rank1: perLocation.get(1) ?? 0,
      rank2: perLocation.get(2) ?? 0,
      rank1000: perLocation.get(1000) ?? 0,
      meanOverL: located / R.L,
      located,
    },
  },
  r3: { reached: r3Reached, changed: r3Changed, changedNotReached: r3ChangedNotReached },
  sizes: {
    bucketSharePct: bucketCount.map(pct),
    bucketMeanFacts: bucketCount.map((c, k) =>
      c === 0 ? 0 : Math.round((bucketFacts[k]! / c) * 10) / 10,
    ),
    worldsBelowBucketBound: bucketBelow,
    hopsSharePct: Object.fromEntries(
      [...hopsCount].sort((x, y) => x[0] - y[0]).map(([h, c]) => [h, pct(c)]),
    ),
    maxNonBallastFacts: maxF,
    meanFacts: facts / N,
  },
  run: {
    seconds: Number(t1 - t0) / 1e9,
    basisPassSeconds: Number(tBasis - t0) / 1e9,
    cpuSeconds: (cpu1.user + cpu1.system) / 1e6,
    node: process.version,
    host: {
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      loadavgStart: load0,
      loadavgEnd: os.loadavg(),
    },
    rssMB: Math.round(process.memoryUsage().rss / 1e6),
    gitCommit: process.env["W0_GIT_COMMIT"] ?? null,
    finishedAt: new Date().toISOString(),
  },
};
const text = JSON.stringify(receipt, null, 2) + "\n";
if (out !== undefined) {
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, text);
}
process.stdout.write(text);

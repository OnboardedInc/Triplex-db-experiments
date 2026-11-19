import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { createInterface } from "node:readline";
import { Histogram } from "../../../bench/lib/hist.ts";
import {
  distribution,
  bootstrap90,
  histogramDistribution,
  percentile,
  commitBar,
  ratioBar,
} from "../../../bench/lib/verdict-statistics.ts";
import { factBand, inIntervals, scheduledV3Windows } from "../../../bench/lib/verdict-plan.ts";
import { V3_OFFER_SECONDS, V3_PLAN_ID } from "../../../bench/lib/phases.ts";
import { VERDICT_CLOCK, verdictMs } from "../../../trace/instrument.mjs";
import { frozenDeep, requireIdentity, type DeepIdentity } from "../../../bench/lib/deep-profile.ts";
import { compareOracleOutput } from "../../../bench/lib/oracle.ts";
import { readOracleOutput } from "../../../bench/lib/oracle-output.ts";
import { deepPopulation, DEEP_PROFILE } from "../../../bench/lib/deep-world.ts";

export async function fileHash(file: string) {
  const h = createHash("sha256");
  for await (const chunk of fs.createReadStream(file)) h.update(chunk);
  return h.digest("hex");
}
const windows = scheduledV3Windows();
export type Quantities = Record<string, number[]>;
export const inputs = (dir: string) => ({
  report: path.join(dir, "ns-report.json"),
  writes: path.join(dir, "ns-writes.jsonl"),
  seed: path.join(dir, "seed-observed.json"),
});
export async function readScope(dir: string, id: DeepIdentity, commonStart: number, exit: number) {
  requireIdentity(id);
  const files = inputs(dir),
    report = JSON.parse(fs.readFileSync(files.report, "utf8"));
  const actualSeed = JSON.parse(fs.readFileSync(files.seed, "utf8"));
  assert.deepEqual(report.deep.identity, id);
  assert.deepEqual(actualSeed.identity, id);
  assert.deepEqual(report.deep.seed, actualSeed.seed);
  const plan = frozenDeep(id.account, id.people),
    expectedCount = deepPopulation(id.people).facts;
  assert.equal(report.deep.profile, DEEP_PROFILE);
  assert.equal(report.config.profile, "deep");
  assert.equal(report.deep.trace, plan.sha256);
  assert.equal(report.deep.seed.sha256, plan.populationSha256);
  assert.equal(report.deep.seed.facts, expectedCount);
  assert.equal(report.deep.seed.people, id.people);
  assert.equal(actualSeed.scope, report.scope);
  const db = String(report.deep.database);
  assert(db.startsWith("s2-"));
  assert.deepEqual(JSON.parse(Buffer.from(db.slice(3), "base64url").toString()), [
    "triplex-scope-v1",
    "test",
    "test",
    report.scope,
    0,
  ]);
  assert.equal(
    report.scope,
    `ns-datomic-deep${id.people === 10000 ? "10k" : "100k"}-deep-${id.nonce}-s${id.account}`,
  );
  assert.equal(report.traceStartAbsMs, commonStart);
  assert.equal(report.verdictClock, VERDICT_CLOCK);
  assert.equal(report.verdictPlanId, id.arm === "activation" ? "deep-activation/1" : V3_PLAN_ID);
  for (const [file, hash] of Object.entries(report.benchSources))
    assert.equal(await fileHash(file), hash, `Harness source mismatch ${file}`);
  const hashes = Object.fromEntries(
    await Promise.all(Object.entries(files).map(async ([k, f]) => [k, await fileHash(f)])),
  );
  const duration = id.arm === "activation" ? report.writer.offeredUntilTraceS : V3_OFFER_SECONDS;
  assert(Number.isFinite(duration) && duration > 0);
  const expected = new Map(
    plan.events.filter((e) => e.atMs < duration * 1000).map((e) => [`${e.seq}/${e.resend}`, e]),
  );
  const ackMinutes = new Uint32Array(Math.ceil(Math.min(duration, 7200) / 60));
  const offered = expected.size,
    values: Quantities = { all: [], L256: [], L1024: [], presweep: [], activation: [] };
  const seenPositions = new Set<number>(),
    invalid: string[] =
      duration > 7200 ? ["Activation exceeded the frozen 7,200-second live traffic horizon"] : [];
  let primaries = 0,
    committed = 0,
    expired = 0,
    resends = 0;
  for await (const line of createInterface({
    input: fs.createReadStream(files.writes),
    crlfDelay: Infinity,
  })) {
    if (!line) continue;
    const w = JSON.parse(line);
    if (w.stream !== "background") continue;
    const key = `${w.seq}/${w.resend}`,
      match = expected.get(key);
    assert(match, `Extra or duplicate offer ${key}`);
    expected.delete(key);
    for (const k of [
      "subject",
      "kind",
      "facts",
      "correction",
      "ackLoss",
      "burst",
      "active",
    ] as const)
      assert.equal(w[k], match[k], `Wrong ${k} for ${key}`);
    assert(
      Math.abs(w.offsetMs - match.atMs) < 0.001 &&
        Math.abs(w.scheduledAt - commonStart - match.atMs) < 0.001,
    );
    if (w.resend) {
      resends++;
      continue;
    }
    primaries++;
    if (w.expired || w.outcome !== "committed") {
      expired += Number(w.expired);
      continue;
    }
    const ms = verdictMs(w);
    assert(Number.isFinite(ms) && ms >= 0 && w.verdictClock === VERDICT_CLOCK);
    assert(Number.isSafeInteger(w.position) && !seenPositions.has(w.position));
    seenPositions.add(w.position);
    const minute = Math.floor((w.ackPublishedAt - commonStart) / 60000);
    if (minute >= 0 && minute < ackMinutes.length) ackMinutes[minute]++;
    committed++;
    values.all!.push(ms);
    for (const level of ["L256", "L1024"] as const)
      if (inIntervals(w.offsetMs, windows[level])) {
        assert(!w.burst);
        values[level]!.push(ms);
        (values[`${level}/${factBand(w.facts)}`] ??= []).push(ms);
      }
    if (w.burst) (values[`burst/${factBand(w.facts)}`] ??= []).push(ms);
    if (id.arm === "activation")
      for (const name of ["presweep", "activation"]) {
        const phase = report.phases.find((p: any) => p.name === name);
        if (phase && w.scheduledAt >= phase.start + 2000 && w.scheduledAt < phase.end)
          values[name]!.push(ms);
      }
  }
  if (expected.size || primaries !== committed || expired)
    invalid.push(
      `${expected.size} missing offers, ${primaries - committed} unsuccessful primaries, ${expired} expired`,
    );
  if (
    exit !== 0 ||
    report.status !== "DONE" ||
    report.invalidReasons?.length ||
    report.client?.invalid
  )
    invalid.push("Attempt did not finish every check or a load generator saturated");
  const c = report.correctness,
    o = report.oracle;
  if (
    !c?.reads ||
    c.correct !== c.reads ||
    c.errors !== 0 ||
    c.violations !== 0 ||
    o?.status !== "PASS" ||
    o.oracleVerdict !== "PASS" ||
    o.receiptConsistency !== "PASS" ||
    o.exitCode !== 0 ||
    !o.reads ||
    o.mismatchCount !== 0 ||
    o.reads !== o.modelCorrectOnSameReads
  )
    invalid.push("Model or independent oracle incomplete");
  if (o?.status === "PASS") {
    const casePath = path.join(dir, "oracle-case.json"),
      caseText = fs.readFileSync(casePath, "utf8"),
      caseDoc = JSON.parse(caseText),
      rawReads = path.join(dir, "ns-full-read-samples.jsonl"),
      expectedPath = path.join(dir, "oracle-expected.json");
    assert.equal(caseDoc.caseId, `NS/${report.runTag}`);
    const reads = fs
      .readFileSync(rawReads, "utf8")
      .trim()
      .split("\n")
      .map((s) => JSON.parse(s));
    assert(
      reads.every((r) =>
        r.rows.some(
          (row: any) =>
            row[0] === `pl:${String(r.subject).padStart(8, "0")}` && row[1] === ":placement/stamp",
        ),
      ),
    );
    const independent = compareOracleOutput({
      out: readOracleOutput(expectedPath),
      caseText,
      caseDoc,
      reads,
      exitCode: o.exitCode,
    });
    assert(
      independent.status === "PASS" &&
        independent.mismatchCount === 0 &&
        independent.reads === o.reads &&
        independent.entityQueries === o.entityQueries,
    );
    for (const f of [casePath, rawReads, expectedPath])
      hashes[path.basename(f)] = await fileHash(f);
  }
  const checks = [...(report.priorities?.P2?.bars ?? []), ...(report.priorities?.P3?.bars ?? [])];
  for (const id of [
    "NS-P2 every offered command accounted",
    "NS-P2 every oracle-valid trace command published",
    "NS-P2 read-your-own-write at the returned tx",
    "NS-P3 gaps",
    "NS-P3 per-subject order violations",
    "NS-P3 visible duplicate effects",
    "NS-P3 resume from checkpoint replays exactly",
    "NS-P3 affected-subject set matches",
  ])
    if (checks.find((b) => b.id === id)?.pass !== true) invalid.push(id);
  if (id.arm === "activation" && report.deep.activationOracle?.checked !== id.people)
    invalid.push("Incomplete activation outbox verification");
  return {
    id,
    scope: report.scope,
    interval: { from: commonStart, to: commonStart + duration * 1000 },
    hashes,
    offered,
    primaries,
    ackMinutes: [...ackMinutes],
    committed,
    resends,
    missing: expected.size,
    invalid,
    values,
    report,
  };
}
export type ScopeMeasurement = Awaited<ReturnType<typeof readScope>>;
function mergedHistogram(scopes: ScopeMeasurement[], key: string) {
  const merged = new Histogram();
  for (const s of scopes) {
    const x = s.report.histograms?.[key];
    if (!x) return null;
    merged.merge(Histogram.fromJSON(x));
  }
  return merged;
}
export function cohort(
  scopes: ScopeMeasurement[],
  expectedScopes: number,
  previous?: Quantities,
  baselineInvalid: string | null = null,
) {
  assert.equal(scopes.length, expectedScopes);
  assert.equal(
    new Set(scopes.map((s) => s.report.deep.database)).size,
    expectedScopes,
    "Duplicate Datomic database in cohort",
  );
  assert(scopes.length && new Set(scopes.map((s) => s.scope)).size === scopes.length);
  const first = scopes[0]!;
  assert(
    scopes.every(
      (s, i) =>
        s.id.account === i &&
        s.id.source === first.id.source &&
        s.id.nonce === first.id.nonce &&
        s.id.arm === first.id.arm &&
        s.id.slot === first.id.slot &&
        s.interval.from === first.interval.from,
    ),
  );
  const invalid = scopes.flatMap((s) => s.invalid.map((r) => `s${s.id.account}: ${r}`));
  const all: Quantities = {};
  for (const s of scopes)
    for (const [name, xs] of Object.entries(s.values)) {
      const merged = (all[name] ??= []);
      for (const x of xs) merged.push(x);
    }
  const bars: any[] = [],
    reason = invalid.join(", ") || null;
  const q = (name: string, key: string, p: number, target: number) =>
    bars.push(commitBar(name, all[key] ?? [], p, target, VERDICT_CLOCK, { invalid: reason }));
  q("NS-P2 all-primary p99 ms", "all", 0.99, 50);
  for (const band of ["5-10", "11-25", "26-50"]) {
    if (band !== "26-50") q(`NS-P2 ${band} band p50 ms (L256)`, `L256/${band}`, 0.5, 10);
    q(`NS-P2 ${band} band p99 ms (L256)`, `L256/${band}`, 0.99, band === "26-50" ? 100 : 50);
    if (band !== "26-50") q(`NS-P2 burst ${band} band p50 ms`, `burst/${band}`, 0.5, 10);
  }
  if (previous)
    for (const [level, limit] of [
      ["L256", 1.25],
      ["L1024", 2],
    ] as const)
      bars.push(
        ratioBar(
          `NS-P1-WRITER-P99-RATIO-${level.slice(1)}`,
          distribution(all[level] ?? [], VERDICT_CLOCK),
          distribution(previous[level] ?? [], VERDICT_CLOCK),
          limit,
          { invalid: reason || baselineInvalid },
        ),
      );
  for (const [id, key, p, target] of [
    ["NS-P1-READ-P99-256-MS", "L256.read", 0.99, 100],
    ["NS-P3 lag p99 ms at L256", "L256.feedLag", 0.99, 250],
    ["NS-P4 weighted-mix pull p50 ms", "p4mix.read", 0.5, 5],
    ["NS-P4 weighted-mix pull p99 ms", "p4mix.read", 0.99, 25],
    ["NS-P4 largest bucket p99 ms (provisional)", "p4mix.bucket:large", 0.99, 50],
  ] as const) {
    const h = mergedHistogram(scopes, key),
      d = h && histogramDistribution(h),
      value = d ? percentile(d, p) : null;
    bars.push({
      id,
      value,
      n: h?.count ?? 0,
      interval90: d ? bootstrap90(d, p, id) : null,
      bar: `<= ${target}`,
      pass:
        reason || value === null || (key === "L256.feedLag" && (all.L256?.length ?? 0) < 500)
          ? null
          : value <= target,
    });
  }
  if (first.id.arm === "activation") {
    bars.push(
      ratioBar(
        "NS-P5 writer commit p99 during sweep / presweep",
        distribution(all.activation ?? [], VERDICT_CLOCK),
        distribution(all.presweep ?? [], VERDICT_CLOCK),
        1.5,
        { invalid: reason },
      ),
    );
    const pre = mergedHistogram(scopes, "presweep.read"),
      during = mergedHistogram(scopes, "activation.read");
    if (pre && during)
      bars.push(
        ratioBar(
          "NS-P5 live read p99 during sweep / presweep",
          histogramDistribution(during),
          histogramDistribution(pre),
          1.5,
          { minimum: 1, invalid: reason },
        ),
      );
  }
  const metric = (values: number[], p: number, name: string) => {
    const d = distribution(values, VERDICT_CLOCK);
    return { value: percentile(d, p), n: values.length, interval90: bootstrap90(d, p, name) };
  };
  const commit = (xs: number[]) => ({
    p50: metric(xs, 0.5, "deep/all/p50"),
    p99: metric(xs, 0.99, "deep/all/p99"),
  });
  const perScope = scopes.map((s) => ({
    commit: commit(s.values.all!),
    account: s.id.account,
    scope: s.scope,
    ackMinutes: s.ackMinutes,
    database: s.report.deep.database,
    hashes: s.hashes,
    invalid: s.invalid,
    observations: {
      offered: s.offered,
      committed: s.committed,
      primaries: s.primaries,
      resends: s.resends,
      missing: s.missing,
      correctness: s.report.correctness,
      oracle: s.report.oracle,
    },
    bars: Object.values(s.report.priorities).flatMap((p: any) => p.bars ?? []),
    deep: s.report.deep,
    anatomy: s.report.priorities.P2.breakdown,
  }));
  // [DX-SCALE1] Why: joint obligations and sample-pooled distributions answer different questions. Rejected: averaging ten p99s or allowing nine complete accounts to hide a missing tenth.
  const obligations = perScope[0]!.bars.map((b: any, index: number) => {
    const matches = perScope.map((s) => s.bars[index]);
    assert(matches.every((m) => m?.id === b.id));
    return {
      id: b.id,
      withinScopes: matches.filter((m) => m.pass === true).length,
      missedScopes: matches.filter((m) => m.pass === false).length,
      unjudgedScopes: matches.filter((m) => typeof m.pass !== "boolean").length,
      scopes: matches.length,
    };
  });
  return {
    values: all,
    summary: {
      profile: DEEP_PROFILE,
      source: first.id.source,
      slot: first.id.slot,
      nonce: first.id.nonce,
      commit: commit(all.all!),
      arm: first.id.arm,
      scopeCount: scopes.length,
      peoplePerScope: first.id.people,
      commonWindow: {
        from: first.interval.from,
        to: Math.min(...scopes.map((s) => s.interval.to)),
      },
      invalid,
      perScope,
      pooledBars: bars,
      jointObligations: obligations,
    },
  };
}

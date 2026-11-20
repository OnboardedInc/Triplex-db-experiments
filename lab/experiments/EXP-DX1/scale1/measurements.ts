import { liveProfile, livePeakWindow } from "./deep-live.ts";
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
import {
  interferenceId,
  interferenceTrace,
  interferencePhases,
  interferenceSeconds,
} from "./interference.ts";
import { checkImage } from "./seed-image.ts";
import { tenantAccounts, tenantFacts, tenantScope } from "./tenants.ts";
import { tenantPlan, tenantPhases, tenantWindows, tenantTraceId } from "./tenant-traffic.ts";
import { compareTenants } from "./tenant-metrics.ts";
import { smallTrace, smallId, smallSeconds, smallPhases, smallScope } from "./small-plan.ts";
import { deepPopulation, DEEP_PROFILE } from "../../../bench/lib/deep-world.ts";
import { DeepCommitMeter } from "../../../bench/lib/deep-commit-meter.ts";
import { fieldPlan, fieldProfile } from "../int1/field-plan.ts";

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
  const mix = id.arm === "interference",
    small = id.arm === "small",
    compactFixture = id.people === 40 && !id.tenant;
  const plan = id.tenant
      ? tenantPlan(id.tenant, id.arm)
      : small
        ? smallTrace(id.account)
        : mix
          ? interferenceTrace(id.account)
          : id.field ? fieldPlan(id.account, id.people, compactFixture) : frozenDeep(id.account, id.people),
    expectedCount = id.tenant
      ? tenantFacts(tenantAccounts(id.tenant))
      : deepPopulation(id.people).facts;
  assert.equal(report.deep.profile, id.field ? fieldProfile : id.tenant?.live ? liveProfile : DEEP_PROFILE);
  const fixture = id.tenant?.study === "smoke" || compactFixture;
  if (fixture && !compactFixture) assert(id.slot.startsWith("tx2-dxscale1-smoke-"));
  assert.equal(
    report.config.profile,
    fixture ? "deep-smoke" : id.tenant?.live ? "deep-live" : "deep",
  );
  assert.equal(report.config.receiptCapture, "replica-worker");
  assert.equal(report.config.expectedStateRetention, "worker-journal");
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
    id.tenant
      ? (report.deep.restoredSeed?.origin.scope ?? tenantScope(id.tenant, id.nonce))
      : small
        ? smallScope(id.nonce, id.account)
        : `ns-datomic-deep${compactFixture ? "smoke40" : id.people === 10000 ? "10k" : "100k"}-deep-${id.nonce}-s${id.account}`,
  );
  assert.equal(report.traceStartAbsMs, commonStart);
  assert.equal(report.verdictClock, VERDICT_CLOCK);
  assert.equal(
    report.verdictPlanId,
    id.field ? fieldProfile : compactFixture ? "ns-deep-smoke/2" : id.tenant
      ? id.tenant.live
        ? liveProfile + "/" + id.tenant.live
        : tenantTraceId + "/" + id.tenant.study
      : id.arm === "activation"
        ? "deep-activation/1"
        : small
          ? smallId
          : mix
            ? interferenceId
            : V3_PLAN_ID,
  );
  for (const [file, hash] of Object.entries(report.benchSources))
    assert.equal(await fileHash(file), hash, `Harness source mismatch ${file}`);
  const hashes = Object.fromEntries(
    await Promise.all(Object.entries(files).map(async ([k, f]) => [k, await fileHash(f)])),
  );
  const duration = compactFixture ? 30 : id.tenant
    ? tenantWindows(id.tenant, id.arm).at(-1)!.pattern === "activation"
      ? report.writer.offeredUntilTraceS
      : (report.phases.at(-1).end - commonStart) / 1000
    : id.arm === "activation"
      ? report.writer.offeredUntilTraceS
      : small
        ? smallSeconds
        : mix
          ? interferenceSeconds
          : V3_OFFER_SECONDS;
  assert(Number.isFinite(duration) && duration > 0);
  const expected = new Map(
    plan.events.filter((e) => e.atMs < duration * 1000).map((e) => [`${e.seq}/${e.resend}`, e]),
  );
  const ackMinutes = new Uint32Array(Math.ceil(Math.min(duration, 7200) / 60));
  const offered = expected.size,
    values: Quantities = { all: [], L256: [], L1024: [], presweep: [], activation: [] };
  const seenPositions = new Set<number>(),
    nativeCommands = new Map<number, string>(),
    invalid: string[] =
      duration > 7200 ? ["Activation exceeded the frozen 7,200-second live traffic horizon"] : [];
  const mixPhases = id.tenant
    ? tenantPhases(id.tenant, id.arm)
    : small
      ? smallPhases(id.account)
      : mix
        ? interferencePhases(id.account)
        : [];
  if (id.tenant) {
    for (const [i, p] of tenantWindows(id.tenant, id.arm).entries()) {
      const x = report.phases[i];
      assert(
        x.name === p.name &&
          x.readers === mixPhases[i]!.readers &&
          x.start === commonStart + p.from * 1000 &&
          (p.pattern === "activation"
            ? x.end === report.deep.tenantActivation.endedAt && x.end <= x.start + p.seconds * 1000
            : x.end === x.start + p.seconds * 1000),
      );
    }
  } else if (mix || small)
    assert.deepEqual(
      report.phases.map((p: any) => [p.name, p.readers, p.start, p.end]),
      mixPhases.map((p) => [
        p.name,
        p.readers,
        commonStart + p.traceFromS * 1000,
        commonStart + (p.traceFromS + p.seconds) * 1000,
      ]),
    );
  // [DX-SCALE1] Why: offered-rate thresholds and deadline losses must reproduce from the source-matched sender ledger, independently of the per-tenant histograms. Rejected: trusting an aggregate counter or using ACK time as the arrival time.
  const liveCounts = id.tenant?.live
    ? mixPhases.map((p) => ({
        from: commonStart + p.traceFromS * 1000,
        to: commonStart + (p.traceFromS + p.seconds) * 1000,
        by: new Map(
          tenantAccounts(id.tenant!).map((a) => [
            a.index,
            { fullOffered: 0, fullExpired: 0, acked: 0 },
          ]),
        ),
      }))
    : undefined;
  const challengeRows = new Map<string, any>();
  const allBurst =
    id.tenant?.study === "interference"
      ? report.phases.find(
          (p: any) => p.name === (id.tenant?.live ? livePeakWindow(id.tenant.live) : "all-burst"),
        )
      : undefined;
  const burstFrom = allBurst ? allBurst.start + report.config.settleS * 1000 : 0;
  const burstWrites: any[] = [];
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
    if (allBurst && w.ackPublishedAt >= burstFrom && w.ackPublishedAt < allBurst.end)
      burstWrites.push(w);
    if (w.stream.startsWith("tenant-check-")) {
      const k = w.seq + "/" + w.resend;
      assert(!challengeRows.has(k));
      challengeRows.set(k, w);
    }
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
    if (id.tenant) {
      const e = match as import("./tenants.ts").TenantEvent;
      assert(
        w.tenant === e.tenant && w.localSeq === e.localSeq && w.localSubject === e.localSubject,
      );
      if (w.outcome === "committed" && !w.resend)
        assert.equal(
          w.commandId,
          report.runTag + ":account-" + String(e.tenant + 1).padStart(3, "0") + ":t" + e.localSeq,
        );
    }
    if (id.tenant?.live && w.expired) {
      assert(
        w.outcome === "unaccounted" &&
          w.reason === "not sent: writer deadline passed" &&
          !w.position &&
          w.startedAt - w.scheduledAt > report.config.writerDeadlineMs,
      );
    }
    if (w.resend) {
      resends++;
      continue;
    }
    primaries++;
    if (liveCounts) {
      const x = liveCounts
        .find((p) => w.scheduledAt >= p.from && w.scheduledAt < p.to)
        ?.by.get(w.tenant);
      assert(x);
      x.fullOffered++;
      if (w.expired) x.fullExpired++;
      if (!w.expired && w.outcome === "committed") {
        const y = liveCounts
          .find(
            (p) =>
              w.ackPublishedAt >= p.from + report.config.settleS * 1000 && w.ackPublishedAt < p.to,
          )
          ?.by.get(w.tenant);
        if (y) y.acked++;
      }
    }

    if (w.expired || w.outcome !== "committed") {
      expired += Number(w.expired);
      continue;
    }
    const ms = verdictMs(w);
    assert(Number.isFinite(ms) && ms >= 0 && w.verdictClock === VERDICT_CLOCK);
    assert(Number.isSafeInteger(w.position) && !seenPositions.has(w.position));
    seenPositions.add(w.position);
    if (report.deep.writePath) nativeCommands.set(w.position, w.commandId);
    const minute = Math.floor((w.ackPublishedAt - commonStart) / 60000);
    if (minute >= 0 && minute < ackMinutes.length) ackMinutes[minute]++;
    committed++;
    values.all!.push(ms);
    for (const level of ["L256", "L1024"] as const)
      if (!mix && !small && inIntervals(w.offsetMs, windows[level])) {
        assert(!w.burst);
        values[level]!.push(ms);
        (values[`${level}/${factBand(w.facts)}`] ??= []).push(ms);
      }
    if ((mix || small) && !id.tenant)
      for (const p of mixPhases)
        if (
          w.offsetMs >= (p.traceFromS + 2) * 1000 &&
          w.offsetMs < (p.traceFromS + p.seconds) * 1000
        )
          (values["mix/" + p.name] ??= []).push(ms);
    if (w.burst) (values[`burst/${factBand(w.facts)}`] ??= []).push(ms);
    if (id.arm === "activation")
      for (const name of ["presweep", "activation"]) {
        const phase = report.phases.find((p: any) => p.name === name);
        if (phase && w.scheduledAt >= phase.start + 2000 && w.scheduledAt < phase.end)
          values[name]!.push(ms);
      }
  }
  if (
    !report.receiptCapture ||
    report.receiptCapture.missing !== 0 ||
    report.receiptCapture.mismatches !== 0 ||
    report.receiptCapture.matched !== committed
  )
    invalid.push("Worker receipt observations differ from committed primaries");
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
  if (
    report.config.composition !== "memory" &&
    report.benchSources["lab/bench/lib/deep-commit-meter.ts"] &&
    (report.deep.r2 || allBurst || report.deep.writePath)
  ) {
    const seal = report.deep.nativeReceipts,
      file = path.join(dir, "deep-native-commits.jsonl");
    assert.deepEqual(seal.identity, id);
    assert.equal(seal.database, db);
    hashes["deep-native-commits.jsonl"] = await fileHash(file);
    assert.equal(hashes["deep-native-commits.jsonl"], seal.sha256);
    const meter = await DeepCommitMeter.read(file, id, db, seal.positions);
    if (report.deep.writePath) {
      assert.deepEqual(report.deep.writePath, meter.writePath());
      for (const [position, command] of nativeCommands) meter.verifyCommand(position, command);
    }
    if (allBurst)
      assert.deepEqual(
        report.deep.allBurstQueue,
        meter.burst(burstWrites, burstFrom, allBurst.end),
      );
    if (report.deep.r2) {
      const account = id.tenant ? tenantAccounts(id.tenant).find((a) => a.index === 1) : undefined;
      for (const [i, name] of ["R1", "R2"].entries()) {
        const release = i === 0 ? report.deep.r1 : report.deep.r2,
          cost = release.cost;
        const marker = report.runTag + (account ? ":" + account.key : "") + ":activate:" + name;
        meter.verifyFacts(release.cut.position, i === 0 ? 1 : 2);
        assert.deepEqual(
          cost.queue,
          meter.release(release.cut.position, release.publicationPosition, release.wallMs, marker),
        );
        assert(
          cost.evaluationCommits === 0 &&
            cost.markerCommits === 1 &&
            cost.mixedPages + cost.guardOnlyPages === release.coverage.pages,
        );
        assert(
          cost.subjects === release.subjects &&
            cost.changedSubjects === report.deep.activationOracle.changedItemsByRelease[i],
        );
        const claimsFile = path.join(dir, "deep-" + name + "-page-claims.json"),
          claimsHash = await fileHash(claimsFile);
        assert.equal(claimsHash, release.claimSha256);
        hashes[path.basename(claimsFile)] = claimsHash;
        const claims = JSON.parse(fs.readFileSync(claimsFile, "utf8"));
        assert.equal(claims.length, release.coverage.pages);
        const timingFile = path.join(dir, "deep-" + name + "-page-timings.json"),
          timingHash = await fileHash(timingFile);
        assert.equal(timingHash, release.timingSha256);
        hashes[path.basename(timingFile)] = timingHash;
        const timing = JSON.parse(fs.readFileSync(timingFile, "utf8"));
        assert(
          timing.cut === release.cut.position &&
            timing.release === release.release &&
            timing.pages.length === claims.length,
        );
        let guardFacts = 0,
          bodyFacts = 0,
          changed = 0,
          mixedMs = 0,
          guardMs = 0,
          mixed = 0;
        for (const [j, c] of timing.pages.entries()) {
          assert(claims[j].position === c.position && claims[j].txId === c.txId);
          meter.verifyFacts(c.position, c.timing.operations);
          assert(
            c.txId === c.timing.receiptTxId &&
              c.position === c.timing.receiptPosition &&
              c.position > release.cut.position &&
              c.position <= release.publicationPosition,
          );
          assert(c.timing.operations === c.timing.guardFacts + c.timing.bodyFacts);
          guardFacts += c.timing.guardFacts;
          bodyFacts += c.timing.bodyFacts;
          changed += c.bodies;
          if (c.bodies) {
            mixed++;
            mixedMs += c.timing.publishCommitMs;
          } else guardMs += c.timing.publishCommitMs;
        }
        assert.deepEqual(
          [guardFacts, bodyFacts, changed, mixed, mixedMs, guardMs],
          [
            cost.guardFacts,
            cost.bodyFacts,
            cost.changedSubjects,
            cost.mixedPages,
            cost.mixedCommitMs,
            cost.guardOnlyCommitMs,
          ],
        );
      }
    }
  }
  for (const id of [
    "NS-P2 every offered command accounted",
    "NS-P2 every oracle-valid trace command published",
    "NS-P2 read-your-own-write at the returned tx",
    "NS-P2 duplicates return the original receipt",
    "NS-P2 lost ACKs return the original receipt",
    "NS-P3 crash injection at three points",
    "NS-P3 corrections report their valid-time range",
    "NS-P3 gaps",
    "NS-P3 per-subject order violations",
    "NS-P3 visible duplicate effects",
    "NS-P3 resume from checkpoint replays exactly",
    "NS-P3 affected-subject set matches",
  ])
    if (checks.find((b) => b.id === id)?.pass !== true) invalid.push(id);
  if (
    !id.tenant &&
    id.arm === "activation" &&
    (report.deep.activationOracle?.checked !== id.people ||
      report.deep.activationOracle.guardComparisons !== 2 * id.people ||
      report.deep.r2?.layout !== "page-cut" ||
      [report.deep.r1, report.deep.r2].some(
        (a) =>
          a?.coverage?.size !== id.people ||
          a.coverage.pages !== Math.ceil(id.people / 256) ||
          a.publications !== a.coverage.pages,
      ) ||
      !report.deep.activationTraffic ||
      report.deep.activationTraffic.trafficHeldThrough <
        report.deep.activationTraffic.lastSweepEndedAt ||
      report.deep.r2?.mutations?.length !== 10 ||
      !report.deep.r2.mutations.every(
        (m: { position: number }) => m.position > report.deep.r2.cut.position,
      ))
  )
    invalid.push("Incomplete activation outbox verification");
  if (report.deep.restoredSeed) {
    assert.deepEqual(report.deep.restoredSeed.identity, id);
    checkImage(report.deep.restoredSeed.origin, id);
    assert.deepEqual(report.deep.seed, report.deep.restoredSeed.origin.seed);
  }
  let tenantEvidence;
  if (id.tenant) {
    const observed = path.join(dir, "tenant-observations.json"),
      cross = report.deep.crossAccount;
    hashes["tenant-observations.json"] = await fileHash(observed);
    assert.equal(hashes["tenant-observations.json"], report.deep.tenantObservationsSha256);
    tenantEvidence = JSON.parse(fs.readFileSync(observed, "utf8"));
    assert.deepEqual(tenantEvidence.identity, id);
    assert.deepEqual(cross.identity, id);
    assert(
      tenantEvidence.database === db &&
        tenantEvidence.traceStart === commonStart &&
        cross.database === db,
    );
    assert.deepEqual(cross.proof.receiptProjection, cross.seedProjection);
    const actual = tenantAccounts(id.tenant);
    if (id.tenant.study === "small" || report.deep.tenantChecks) {
      const post = report.deep.tenantChecks;
      assert.deepEqual(post.identity, id);
      assert(
        post.startedAt >= post.timedEnd &&
          post.timedEnd >= report.phases.at(-1).end &&
          post.checks.length === actual.length &&
          challengeRows.size === 2 * actual.length,
      );
      for (const [i, c] of post.checks.entries()) {
        const a = actual[i]!,
          one = challengeRows.get(c.seq + "/false"),
          retry = challengeRows.get(c.seq + "/true");
        assert(
          c.account === a.key &&
            c.subject === a.first &&
            c.seq === 7000000000 + a.index &&
            one?.stream === "tenant-check-" + a.key &&
            retry?.stream === one.stream,
        );
        assert(
          one.scheduledAt >= post.startedAt &&
            retry.scheduledAt >= one.scheduledAt &&
            one.subject === a.first &&
            one.commandId === c.commandId &&
            one.position === c.position &&
            c.position > report.deep.seed.position,
        );
        assert(
          one.outcome === "committed" &&
            one.ackLoss &&
            one.correction &&
            one.path === "lost-ack-resolved" &&
            !one.expired &&
            c.lost.resolvedOriginal &&
            c.lost.retryNamesOriginal &&
            c.lost.retryTag === "CommandAlreadyCommittedError" &&
            retry.outcome === "duplicate-returned-original" &&
            !retry.expired,
        );
        assert(tenantEvidence.feed.cursors[a.key] >= c.position);
      }
    }
    assert.deepEqual(cross.proof.counts, Object.fromEntries(actual.map((a) => [a.key, a.people])));
    assert(
      cross.proof.total === id.people &&
        cross.proof.crossAccountSingleRequest === actual.length > 1,
    );
    const rawCuts = fs
      .readFileSync(path.join(dir, "ns-full-read-samples.jsonl"), "utf8")
      .trimEnd()
      .split("\n")
      .map((l) => JSON.parse(l))
      .filter((r) => r.source === "pinned-multi-root");
    assert.deepEqual(
      rawCuts.map((r) => r.subject),
      actual.slice(0, 2).map((a) => a.first),
    );
    assert(
      rawCuts.every(
        (r) =>
          r.basis.recordedPosition === cross.proof.basis.position &&
          r.basis.validAt === cross.proof.basis.validAt,
      ),
    );
    if (liveCounts) {
      assert.equal(tenantEvidence.windows.length, liveCounts.length);
      for (const [i, window] of liveCounts.entries()) {
        const saved: {
          start: number;
          to: number;
          accounts: Record<string, { fullOffered: number; fullExpired: number; acked: number }>;
        } = tenantEvidence.windows[i];
        assert(saved.start === window.from && saved.to === window.to);
        for (const a of actual) {
          const counts = window.by.get(a.index)!;
          for (const k of ["fullOffered", "fullExpired", "acked"] as const)
            assert.equal(saved.accounts[a.key]![k], counts[k]);
        }
      }
    }
    if (tenantEvidence.feed.missing || tenantEvidence.feed.matched !== committed)
      invalid.push("Durable account feed did not match every acknowledged primary");
    const target = actual.find((a) => a.index === 1);
    if (
      (id.tenant.study === "interference" && !id.tenant.live) ||
      (id.tenant.study === "million" && id.arm === "activation")
    ) {
      const done = report.deep.tenantActivation;
      assert(
        done?.identity?.source === id.source &&
          done.identity.slot === id.slot &&
          done.identity.nonce === id.nonce &&
          done.account === "account-002",
      );
      if (
        target &&
        (report.deep.activationOracle?.checked !== target.people ||
          report.deep.activationOracle?.guardComparisons !== 2 * target.people ||
          report.deep.r2?.layout !== "page-cut" ||
          done.cut.position !== report.deep.r2.cut.position ||
          report.deep.r2?.mutations?.length !== Math.min(target.people, 10))
      )
        invalid.push("Incomplete tenant page-guard verification");
    }
  }
  return {
    id,
    scope: report.scope,
    interval: { from: commonStart, to: commonStart + duration * 1000 },
    hashes,
    ...(tenantEvidence ? { tenantEvidence } : {}),
    offered,
    primaries,
    ackMinutes: [...ackMinutes],
    committed,
    resends,
    expired,
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
  if (!first.id.tenant && first.id.arm === "activation") {
    const end = Math.max(...scopes.map((s) => s.report.deep.r2?.endedAt ?? Infinity));
    for (const s of scopes) {
      const traffic = s.report.deep.activationTraffic;
      if (
        !traffic ||
        traffic.accounts !== expectedScopes ||
        traffic.lastSweepEndedAt !== end ||
        traffic.trafficHeldThrough < end ||
        s.interval.to < end
      )
        invalid.push(`s${s.id.account}: incomplete shared activation window`);
    }
  }
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
  if (!first.id.tenant && first.id.arm === "activation") {
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
  const compactCommit = (xs: number[]) => {
    const h = new Histogram();
    for (const v of xs) h.recordMs(v);
    return h.toJSON();
  };
  const perScope = scopes.map((s) => ({
    commitHistogram: compactCommit(s.values.all!),
    commit: commit(s.values.all!),
    interference:
      !first.id.tenant && (first.id.arm === "interference" || first.id.arm === "small")
        ? (first.id.arm === "small"
            ? smallPhases(s.id.account)
            : interferencePhases(s.id.account)
          ).map((p) => {
            const from = s.interval.from + p.traceFromS * 1000,
              to = from + p.seconds * 1000;
            const dist = (key: string) => {
              const data = s.report.histograms[p.name + "." + key];
              if (!data) return null;
              const d = histogramDistribution(Histogram.fromJSON(data));
              return {
                value: percentile(d, 0.99),
                n: d.n,
                interval90: bootstrap90(d, 0.99, p.name + "/" + key),
              };
            };
            return {
              window: p.name,
              from,
              to,
              readers: p.readers,
              commit: commit(s.values["mix/" + p.name] ?? []),
              read: dist("read"),
              feedLag: dist("feedLag"),
            };
          })
        : undefined,
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
      expired: s.expired,
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
      ...(first.id.tenant
        ? {
            tenants: compareTenants(
              scopes.map((s) => s.tenantEvidence),
              tenantAccounts({ ...first.id.tenant, topology: "pooled", physical: 0 }),
              first.id.tenant.live
                ? scopes
                    .flatMap((s) =>
                      s.invalid.filter(
                        (r) =>
                          !(
                            s.missing === 0 &&
                            s.expired > 0 &&
                            s.primaries === s.committed + s.expired &&
                            r ===
                              "0 missing offers, " +
                                s.expired +
                                " unsuccessful primaries, " +
                                s.expired +
                                " expired"
                          ),
                      ),
                    )
                    .join(", ") || null
                : reason,
              first.id.tenant.live,
            ),
            layout: first.id.tenant.topology,
            sourceCuts: scopes.map((s) => ({
              scope: s.scope,
              database: s.report.deep.database,
              basis: s.report.deep.crossAccount.proof.basis,
              counts: s.report.deep.crossAccount.proof.counts,
            })),
          }
        : {}),
      profile: first.id.tenant?.live ? liveProfile : DEEP_PROFILE,
      source: first.id.source,
      slot: first.id.slot,
      nonce: first.id.nonce,
      commit: commit(all.all!),
      arm: first.id.arm,
      scopeCount: scopes.length,
      peoplePerScope: first.id.arm === "small" ? null : first.id.people,
      peopleByScope: scopes.map((s) => s.id.people),
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

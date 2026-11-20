import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { generateTrace, traceDigest } from "../../../bench/lib/trace.ts";
import { frozenDeep, type DeepIdentity } from "../../../bench/lib/deep-profile.ts";
import { V3_OFFER_SECONDS } from "../../../bench/lib/phases.ts";
import { populationCounts } from "../../../bench/lib/world.ts";
import { validateCommandTrace, validateWriterBoundary } from "../../../trace/anatomy.mjs";
import { bindNativeTransaction } from "../../../trace/native-transactions.mjs";
import { alignClockRecord, percentile, records } from "../../../trace/report.mjs";
import { verdictMs } from "../../../trace/instrument.mjs";
import { compareOracleOutput } from "../../../bench/lib/oracle.ts";
import { readOracleOutput } from "../../../bench/lib/oracle-output.ts";
import { fileHash, readScope } from "../scale1/measurements.ts";

export type Arm = {
  source: string;
  slot: string;
  nonce: string;
  population: "thin" | "deep";
  lookup: "individual" | "range";
  readers: boolean;
};
export function nativeReadout(n: any) {
  const stats = n.nativeStats,
    reads = stats?.["io-stats"]?.reads;
  assert(
    reads && typeof reads === "object" && !Array.isArray(reads),
    "missing native read counters",
  );
  const sql = Object.hasOwn(reads, "sql") ? reads.sql : 0,
    sqlMs = Object.hasOwn(reads, "sql-ms") ? reads["sql-ms"] : 0,
    deserializeMs = Object.hasOwn(reads, "deserialize-ms") ? reads["deserialize-ms"] : 0,
    applyMs = stats["apply-msec"];
  assert(
    Number.isSafeInteger(sql) &&
      sql >= 0 &&
      [sqlMs, deserializeMs, applyMs].every((v) => Number.isFinite(v) && v >= 0),
  );
  return { sql, sqlMs, deserializeMs, applyMs };
}
const get = (f: string) => JSON.parse(fs.readFileSync(f, "utf8"));
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const quantiles = (xs: number[]) => ({ p50: percentile(xs, 0.5), p99: percentile(xs, 0.99) });
export async function measure(dir: string, arm: Arm) {
  // [DX-W1] Why: match every primary to its exact ACK, gateway parent, transaction-function event and native database/t.
  // Rejected: billing neighbor SQL statements, substituting tx-with for native apply or treating missing read maps as zero.
  const d = path.join(dir, "driver"),
    raw = path.join(dir, "engines", arm.slot, "trace/raw");
  assert.deepEqual(arm, get(path.join(dir, "identity.json")));
  const reportFile = path.join(d, "ns-report.json"),
    writesFile = path.join(d, "ns-writes.jsonl"),
    report = get(reportFile);
  assert.equal(report.config.profile, arm.population === "deep" ? "deep" : "smoke");
  assert(
    report.status === "DONE" &&
      report.config.rungSubjects === 100000 &&
      report.config.zeroReaders === !arm.readers &&
      report.config.receiptCapture === "replica-worker" &&
      report.config.expectedStateRetention === "worker-journal" &&
      !report.client.invalid &&
      !report.invalidReasons?.length,
  );
  assert(
    report.seed.complete &&
      report.seed.seededSubjects === 100000 &&
      report.seed.assertionsMatchClosedForm,
  );
  const deep = arm.population === "deep",
    armMode = arm.readers ? "reader" : "zero";
  const identity: DeepIdentity = {
    account: 0,
    people: 100000,
    source: arm.source,
    slot: arm.slot,
    nonce: arm.nonce,
    arm: armMode,
  };
  if (deep) {
    const result = await readScope(d, identity, report.traceStartAbsMs, 0);
    assert.deepEqual(result.invalid, []);
    assert(result.primaries === result.committed && result.missing === 0);
  } else {
    assert.equal(report.config.seed, "ns-v2");
    assert.equal(report.seed.assertions, populationCounts(100000).seedAssertions);
  }
  for (const [file, hash] of Object.entries(report.benchSources))
    assert.equal(await fileHash(file), hash);
  const events = deep
    ? frozenDeep(0, 100000).events
    : generateTrace({ seed: "ns-v2", subjects: 100000, durationS: 7200 });
  assert.equal(traceDigest(events), report.trace.digest);
  const windowSeconds = deep ? V3_OFFER_SECONDS : 900;
  assert.equal(report.config.matchDurationS, windowSeconds);
  const allAck: number[] = [];
  const expected = new Map(
    events.filter((e) => !e.resend && e.atMs < windowSeconds * 1000).map((e) => [e.seq, e]),
  );
  const writes = new Map<string, any>(),
    positions = new Set<number>();
  for await (const w of records(writesFile)) {
    if (w.stream !== "background" || w.resend) continue;
    assert(!w.expired && w.outcome === "committed");
    allAck.push(verdictMs(w));
    if (w.offsetMs >= windowSeconds * 1000) continue;
    const e = expected.get(w.seq);
    assert(
      e &&
        Math.abs(w.offsetMs - e.atMs) < 0.001 &&
        e.subject === w.subject &&
        e.facts === w.facts &&
        e.kind === w.kind &&
        e.burst === w.burst &&
        e.correction === w.correction &&
        e.ackLoss === w.ackLoss &&
        Math.abs(w.scheduledAt - report.traceStartAbsMs - e.atMs) < 0.001,
    );
    assert(
      !w.expired &&
        w.outcome === "committed" &&
        !writes.has(w.traceId) &&
        !positions.has(w.position),
    );
    assert(Number.isSafeInteger(w.position));
    positions.add(w.position);
    expected.delete(w.seq);
    writes.set(w.traceId, w);
  }
  assert(
    expected.size === 0 &&
      writes.size >= 500 &&
      report.priorities.P2.allPrimary.count === allAck.length,
  );
  const ryow = report.priorities.P2.readYourOwnWrite,
    p3 = report.priorities.P3;
  assert(
    ryow.pulls === allAck.length &&
      ryow.correct === allAck.length &&
      p3.replay?.exact === true &&
      p3.replay.mismatches === 0 &&
      p3.replay.replayed === p3.replay.firstDeliveries &&
      p3.replay.replayed > 0,
  );
  assert(
    report.receiptCapture?.matched === allAck.length &&
      report.receiptCapture.missing === 0 &&
      report.receiptCapture.mismatches === 0,
  );
  const extraFiles: string[] = [];
  const exactBars = [
    "NS-P2 every offered command accounted",
    "NS-P2 every oracle-valid trace command published",
    "NS-P2 read-your-own-write at the returned tx",
    "NS-P2 duplicates return the original receipt",
    "NS-P2 lost ACKs return the original receipt",
    "NS-P3 gaps",
    "NS-P3 per-subject order violations",
    "NS-P3 visible duplicate effects",
    "NS-P3 resume from checkpoint replays exactly",
    "NS-P3 affected-subject set matches",
    "NS-P3 corrections report their valid-time range",
  ];
  const bars = [...report.priorities.P2.bars, ...p3.bars];
  for (const id of exactBars) assert.equal(bars.find((b) => b.id === id)?.pass, true, id);
  if (arm.readers) {
    const c = report.correctness,
      o = report.oracle;
    assert(
      c.reads > 0 &&
        c.reads === c.correct &&
        c.errors === 0 &&
        c.violations === 0 &&
        o.status === "PASS" &&
        o.exitCode === 0 &&
        o.mismatchCount === 0 &&
        o.reads > 0 &&
        o.reads === o.modelCorrectOnSameReads &&
        o.receiptConsistency === "PASS",
    );
  }
  if (arm.readers && !deep) {
    const casePath = path.join(d, "oracle-case.json"),
      cases = fs.readFileSync(casePath, "utf8"),
      caseDoc = JSON.parse(cases);
    assert.equal(caseDoc.caseId, "NS/" + report.runTag);
    const readsFile = path.join(d, "ns-full-read-samples.jsonl"),
      expectedFile = path.join(d, "oracle-expected.json");
    const reads = [];
    for await (const r of records(readsFile)) reads.push(r);
    const checked = compareOracleOutput({
      out: readOracleOutput(expectedFile),
      caseText: cases,
      caseDoc,
      reads,
      exitCode: report.oracle.exitCode,
    });
    assert(
      checked.status === "PASS" &&
        checked.mismatchCount === 0 &&
        checked.reads === report.oracle.reads &&
        checked.entityQueries === report.oracle.entityQueries,
    );
    extraFiles.push(casePath, readsFile, expectedFile);
  }
  const nodeDir = path.join(d, "trace"),
    roots = fs.readdirSync(nodeDir).filter((n) => /^node-\d+-0\.jsonl\.gz$/.test(n));
  assert.equal(roots.length, 1);
  const rootFile = path.join(nodeDir, roots[0]!);
  const gatewayFile = path.join(raw, "gw-w.jsonl");
  const jfr = path.join(raw, "tx.jfr"),
    nativeFile = jfr + ".jsonl",
    completeFile = jfr + "-complete.jsonl",
    seal = get(completeFile);
  assert(
    seal.type === "jfr-complete" &&
      seal.role === "tx" &&
      seal.slot === arm.slot &&
      seal.run === arm.slot &&
      seal.source === arm.source &&
      seal.fileSha256 === (await fileHash(jfr)),
  );
  const native = await readNative(
    writes,
    report.scope,
    arm,
    arm.lookup,
    rootFile,
    gatewayFile,
    nativeFile,
  );
  assert.equal(quantiles(allAck).p99, report.priorities.P2.allPrimary.p99Ms);
  const inputs: Record<string, string> = {};
  for (const file of [
    reportFile,
    writesFile,
    ...extraFiles,
    rootFile,
    gatewayFile,
    nativeFile,
    completeFile,
    path.join(dir, "identity.json"),
  ])
    inputs[path.relative(dir, file)] = await fileHash(file);
  return {
    arm,
    inputs,
    trace: report.trace.digest,
    seedFacts: report.seed.assertions,
    windowSeconds,
    denominator: writes.size,
    allPrimary: allAck.length,
    ...native,
  };
}

// [DX-W1] Why: the existing full-trace baseline exercises the same native database/t and parent joins before a new bench run.
export async function readNative(
  writes: Map<string, any>,
  scope: string,
  arm: Pick<Arm, "slot" | "source">,
  lookup: Arm["lookup"] | "historical",
  rootFile: string,
  gatewayFile: string,
  nativeFile: string,
) {
  let ref: any;
  function bind(r: any) {
    assert(
      r.run === arm.slot &&
        r.slot === arm.slot &&
        r.source === arm.source &&
        r.clock?.bootId &&
        r.clock.domain === "linux-monotonic" &&
        r.clock.crossProcessQualified !== false,
    );
    ref ??= r.clock;
    assert.equal(r.clock.bootId, ref.bootId);
    const out = alignClockRecord(r, ref);
    assert.notEqual(out.clockAlignmentQualified, false);
    return out;
  }
  const parents = new Map<string, Set<string>>();
  for await (const r of records(rootFile))
    if (r.type === "request" && r.name === "driver.commit" && writes.has(r.traceId)) {
      assert(r.process.startsWith("node-") && r.thread === 0);
      const root = bind(r),
        w = writes.get(r.traceId);
      validateWriterBoundary(w, root);
      validateCommandTrace(w, [root]);
      assert(!parents.has(w.traceId) && root.attributes.ackPublishedAt === w.ackPublishedAt);
      parents.set(
        w.traceId,
        new Set(root.spans.filter((s: any) => s.name === "client.http").map((s: any) => s.id)),
      );
    }
  assert.equal(parents.size, writes.size);
  const gateways = new Map<string, any>(),
    nativeKeys = new Map<string, any>();
  const databaseHash = sha(
    "s2-" +
      Buffer.from(JSON.stringify(["triplex-scope-v1", "test", "test", scope, 0])).toString(
        "base64url",
      ),
  );
  for await (const r of records(gatewayFile))
    if (r.type === "request" && r.attributes?.datomicT && writes.has(r.traceId)) {
      assert(r.process === "gw-w" && r.attributes?.status === 200 && r.kind === "commit");
      const g = bind(r);
      assert.equal(g.attributes.databaseHash, databaseHash);
      assert(
        parents.get(g.traceId)!.has(g.parent) &&
          !gateways.has(g.traceId) &&
          !nativeKeys.has(g.attributes.datomicT),
      );
      gateways.set(g.traceId, g);
      nativeKeys.set(g.attributes.datomicT, g);
    }
  assert.equal(gateways.size, writes.size);
  const decisions = new Map<string, string>(),
    metrics = new Map<string, ReturnType<typeof nativeReadout>>();
  for await (const r of records(nativeFile)) {
    if (r.nativeType === "triplex.TransactionFunction" && gateways.has(r.traceId)) {
      assert(r.process === "tx");
      const f = bind(r),
        g = gateways.get(r.traceId),
        peer = g.spans.find((s: any) => s.id === f.parent && s.layer === "peer-wait");
      if (!peer) continue; // a speculative/rejected attempt has a different bound gateway parent
      assert(f.start >= peer.start - 1 && f.end <= peer.end + 1 && !decisions.has(r.traceId));
      if (lookup !== "historical") assert(Object.hasOwn(r, "historyRange"), "missing W1 recorder");
      const decision =
        lookup === "historical" && !Object.hasOwn(r, "historyRange")
          ? "unrecorded"
          : (r.historyRange ?? "individual");
      assert(["individual", "empty", "occupied", "ineligible", "unrecorded"].includes(decision));
      decisions.set(r.traceId, decision);
    }
    const g = nativeKeys.get(r.datomicT);
    if (r.nativeType !== "triplex.NativeTransaction" || !g || r.databaseHash !== databaseHash)
      continue;
    const bound = bindNativeTransaction(g, [bind(r)]);
    assert(bound && !metrics.has(g.traceId));
    metrics.set(g.traceId, nativeReadout(bound));
  }
  assert.equal(metrics.size, writes.size);
  assert.equal(decisions.size, writes.size);
  const counts = (value: string) => [...decisions.values()].filter((v) => v === value).length;
  if (lookup === "individual") assert.equal(counts("individual"), writes.size);
  else if (lookup === "range")
    assert(counts("empty") + counts("occupied") > 0, "no eligible native range decision");
  const all = [...writes.values()],
    samples = all.map((w) => metrics.get(w.traceId)!);
  const ack = quantiles(all.map(verdictMs));
  const total = (field: keyof ReturnType<typeof nativeReadout>) =>
    samples.reduce((n, r) => n + r[field], 0);
  return {
    ackMs: ack,
    applyMs: quantiles(samples.map((s) => s.applyMs)),
    sqlReads: total("sql"),
    sqlReadsPerCommit: total("sql") / samples.length,
    commitsReadingSql: samples.filter((s) => s.sql > 0).length,
    sqlMs: total("sqlMs"),
    deserializeMs: total("deserializeMs"),
    decisions: Object.fromEntries(
      ["individual", "empty", "occupied", "ineligible", "unrecorded"].map((v) => [v, counts(v)]),
    ),
  };
}

// @ts-nocheck -- [DX-T1-11] Why: join native counters by database/t and exact primary/replay identities. Rejected: nearest-time or historical size estimates.
import fs from "node:fs";
import path from "node:path";
import { records, alignClockRecord, percentile } from "./report.mjs";
import { bindNativeTransaction } from "./native-transactions.mjs";
import { parsePostgres } from "./anatomy.mjs";
import { verifiedRawManifest } from "./pack-oracle.mjs";
import { qualifyReplay, readRaw, factBand, sha256 } from "./layout-replay.mjs";
const [base, prefix, outputPath] = process.argv.slice(2);
if (!base || !/^tx2-dxt1-[a-z0-9-]+$/.test(prefix ?? ""))
  throw Error("Invalid calibration session");
const session = path.join(base, prefix + "-session"),
  source = fs.readFileSync(path.join(session, "head.txt"), "utf8").trim();
const check = (ok, reason) => {
  if (!ok) throw Error(reason);
};
const quantile = (xs) => ({
  n: xs.length,
  p50: percentile(xs, 0.5),
  p99: percentile(xs, 0.99),
  mean: xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null,
});
const arms = [];
let build;
for (const suffix of ["zero-before", "loaded", "zero-after"]) {
  const tag = `${prefix}-${suffix}`,
    dir = path.join(base, tag),
    json = (f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  check(
    fs.readFileSync(path.join(session, suffix + "-exit.txt"), "utf8").trim() === "0",
    "Incomplete controller",
  );
  const m = json("trace-run.json"),
    b = json("driver/ns-report.json"),
    t = json("trace-summary.json");
  check(
    m.tag === tag &&
      m.slot === tag &&
      m.source === source &&
      m.session === prefix &&
      m.level === "full" &&
      t.complete &&
      t.source === source &&
      b.status === "DONE" &&
      !b.finalizationErrors.length &&
      b.seed.seededSubjects === 10000 &&
      b.config.readPath === "replica" &&
      b.config.strictRecordClocks &&
      b.trace.digest === "aa8a7636ff027ab3" &&
      b.config.matchDurationS === 300 &&
      b.config.readerLadderOnly &&
      b.config.zeroReaders === (suffix !== "loaded"),
    "Source, workload or collection mismatch",
  );
  const hashes = fs.readFileSync(path.join(dir, "source-build-hashes.json"), "utf8");
  check(build === undefined || hashes === build, "Source/build differs across bookends");
  build = hashes;
  const seal = await verifiedRawManifest(dir);
  const bundle = {
    payloads: readRaw(dir, "layout-payloads.edn"),
    capturesText: readRaw(dir, "layout-captures.jsonl"),
    selectionText: readRaw(dir, "layout-selection.json"),
    recordsText: readRaw(dir, "layout-replay.jsonl"),
    complete: JSON.parse(readRaw(dir, "layout-replay-complete.json")),
  };
  const replay = qualifyReplay(bundle, m),
    writesText = fs.readFileSync(path.join(dir, "driver/ns-writes.jsonl"), "utf8");
  check(replay.selection.writesSha256 === sha256(writesText), "Writer input differs");
  const writes = writesText
    .trim()
    .split("\n")
    .map(JSON.parse)
    .filter((w) => w.stream === "background" && !w.resend);
  check(
    writes.length &&
      writes.every((w) => w.outcome === "committed" && !w.expired) &&
      new Set(writes.map((w) => w.traceId)).size === writes.length,
    "Primary accounting differs",
  );
  const ids = new Set(writes.map((w) => w.traceId)),
    reference = t.clockAlignment.reference;
  const gateways = [],
    natives = [],
    host = [];
  for (const name of ["gw-w.jsonl.gz", "tx.jfr.jsonl.gz", "system-darwin.jsonl.gz"])
    for await (const raw of records(path.join(dir, "trace/raw", name))) {
      check(raw.run === tag && raw.slot === tag && raw.source === source, "Foreign raw record");
      const e = alignClockRecord(raw, reference);
      if (e.type === "request" && ids.has(e.traceId) && e.attributes?.datomicT) gateways.push(e);
      if (e.nativeType === "triplex.NativeTransaction") natives.push(e);
      if (e.process === "system-darwin" && e.type === "resource" && !e.name) host.push(e);
    }
  const nativeMap = new Map(),
    byTrace = new Map();
  const unboundNative = natives.filter(
    (n) => !(/^[a-f0-9]{64}$/.test(n.databaseHash ?? "") && /^\d+$/.test(n.datomicT ?? "")),
  );
  for (const n of natives.filter((n) => !unboundNative.includes(n))) {
    const key = n.databaseHash + "/" + n.datomicT;
    check(!nativeMap.has(key), "Duplicate bound native counter");
    nativeMap.set(key, n);
  }
  for (const g of gateways) {
    const candidates = [
      nativeMap.get(g.attributes.databaseHash + "/" + g.attributes.datomicT),
    ].filter(Boolean);
    const n = bindNativeTransaction(g, candidates),
      peer = g.spans.find((s) => s.layer === "peer-wait");
    check(n && peer && !byTrace.has(g.traceId), "Missing or duplicate native/gateway result");
    byTrace.set(g.traceId, { g, n, peer });
  }
  let previousEnd = -Infinity;
  const rows = [...writes]
    .sort((a, b) => a.startedAt - b.startedAt)
    .map((w) => {
      const x = byTrace.get(w.traceId);
      check(x, "Primary native counter absent");
      const ns = x.n.nativeStats,
        reads = ns["io-stats"]?.reads ?? {};
      const gap = Number.isFinite(previousEnd) ? w.startedAt - previousEnd : null;
      previousEnd = Math.max(previousEnd, w.finishedAt);
      const phase = b.phases.find((p) => w.scheduledAt >= p.start && w.scheduledAt < p.end);
      return {
        operationId: w.publicationOperationId,
        traceId: w.traceId,
        datomicT: Number(x.n.datomicT),
        databaseHash: x.n.databaseHash,
        facts: w.facts,
        band: factBand(w.facts),
        kind: w.kind,
        scheduledAt: w.scheduledAt,
        start: w.startedAt,
        end: w.finishedAt,
        offsetMs: w.offsetMs,
        phase: phase?.name,
        readers: phase?.readers,
        burst: w.burst,
        idleMs: gap,
        overlap: gap !== null && gap < 0,
        wall: w.latencyMs,
        ack: w.latencyToAckMs,
        corrected: w.latencyCorrectedMs,
        queue: w.waitMs,
        service: w.latencyMs - w.waitMs,
        peer: x.peer.end - x.peer.start,
        apply: ns["apply-msec"],
        native: ns.msec,
        datoms: ns["datom-count"],
        functionMs: ns["tx-stats"]?.["tx-fn-ms"],
        sqlReads: reads.sql ?? 0,
        sqlMs: reads["sql-ms"] ?? 0,
        nativeStats: ns,
      };
    });
  const byOperation = new Map(rows.map((w) => [w.operationId, w]));
  check(byOperation.size === rows.length, "Duplicate operation");
  for (const c of replay.captures) {
    const w = byOperation.get(c.operationId);
    check(w && w.facts === c.facts && w.datomicT === c.datomicT, "Capture/native commit differs");
    const a = replay.rows.find((r) => r.operationId === c.operationId && r.shape === "A");
    check(a.datoms === w.datoms, "Replay A/native datom count differs");
    Object.assign(w, { fressianBytes: a.fressianBytes, valueUtf8Bytes: a.valueUtf8Bytes });
  }
  const window = {
    start: Math.min(...writes.map((w) => w.scheduledAt)),
    end: Math.max(...writes.map((w) => w.finishedAt)),
  };
  const h = host.filter((e) => e.at >= window.start && e.at <= window.end);
  check(
    h.length >= 280 &&
      h.every((e) => Number.isFinite(e.otherCpu) && /used\s*=\s*[\d.]+[MG]/.test(e.swap)),
    "Host context absent",
  );
  const swap = (e) => {
    const [, n, unit] = /used\s*=\s*([\d.]+)([MG])/.exec(e.swap);
    return +n * (unit === "M" ? 1 / 1024 : 1);
  };
  const replayHost = host.filter(
    (e) => e.at >= replay.complete.startedAt && e.at <= replay.complete.endedAt,
  );
  check(
    replayHost.length >= 4 && replayHost.every((e) => Number.isFinite(e.otherCpu) && e.swap),
    "Replay host context absent",
  );
  const sqlLines = readRaw(dir, "pg.log").split("\n"),
    statements = sqlLines
      .map(parsePostgres)
      .filter(Boolean)
      .filter((s) => s.end >= window.start && s.end <= window.end),
    sqlCounts = {};
  for (const s of statements) sqlCounts[s.kind] = (sqlCounts[s.kind] ?? 0) + 1;
  const samples = readRaw(dir, "postgres-samples.log")
    .split("\n")
    .filter((l) => l.trim().startsWith("{"))
    .map(JSON.parse)
    .filter((s) => s.at >= window.start && s.at <= window.end);
  check(samples.length >= 280, "Postgres counter window absent");
  const first = samples[0],
    last = samples.at(-1),
    wal = {};
  for (const k of [
    "wal_bytes",
    "wal_records",
    "wal_fpi",
    "wal_write",
    "wal_sync",
    "wal_write_time",
    "wal_sync_time",
  ]) {
    const delta = Number(last.wal[k]) - Number(first.wal[k]);
    check(Number.isFinite(delta) && delta >= 0, "WAL counter reset/invalid");
    wal[k] = delta;
  }
  const settings = json("storage-settings.json");
  const durable = Object.fromEntries(settings.settings.map((s) => [s.name, s.setting]));
  check(
    ["fsync", "synchronous_commit", "full_page_writes"].every((k) => durable[k] === "on"),
    "Durability differs",
  );
  const correctness = b.correctness;
  check(
    correctness.reads === correctness.correct &&
      correctness.errors === 0 &&
      correctness.violations === 0 &&
      b.observationAccounting.retained === b.observationAccounting.judged,
    "Incorrect/incomplete observations",
  );
  if (suffix === "loaded")
    check(
      b.oracle.status === "PASS" &&
        b.oracle.oracleVerdict === "PASS" &&
        b.oracle.receiptConsistency === "PASS" &&
        b.oracle.exitCode === 0 &&
        b.oracle.mismatchCount === 0 &&
        b.oracle.mismatches.length === 0 &&
        b.oracle.receiptViolations.length === 0 &&
        b.oracle.modelCorrectOnSameReads === b.oracle.reads,
      "Oracle result incomplete/different",
    );
  const fields = [
    "wall",
    "ack",
    "corrected",
    "service",
    "peer",
    "native",
    "apply",
    "functionMs",
    "datoms",
    "sqlMs",
  ];
  const bands = Object.fromEntries(
    ["small", "medium", "large"].map((band) => {
      const pop = rows.filter((r) => r.band === band);
      return [band, Object.fromEntries(fields.map((k) => [k, quantile(pop.map((r) => r[k]))]))];
    }),
  );
  arms.push({
    tag,
    source,
    level: m.level,
    window,
    sourceBuildSha256: sha256(hashes),
    rawManifestSha256: sha256(seal),
    host: { cpu: quantile(h.map((e) => e.otherCpu)), swapGiB: quantile(h.map(swap)) },
    latency: quantile(rows.map((r) => r.wall)),
    slow: rows.filter((r) => r.wall > 50).length,
    replayHost: {
      cpu: quantile(replayHost.map((e) => e.otherCpu)),
      swapGiB: quantile(replayHost.map(swap)),
      start: replay.complete.startedAt,
      end: replay.complete.endedAt,
    },
    correctness,
    oracle: b.oracle,
    instrument: b.instrument,
    bands,
    durable,
    storage: {
      sqlCounts,
      writeCommitsPerTransaction: ((sqlCounts.insert ?? 0) + (sqlCounts.update ?? 0)) / rows.length,
      wal,
      sampleWindow: { start: first.at, end: last.at },
      samplePrimary: rows.filter((r) => r.scheduledAt >= first.at && r.scheduledAt <= last.at)
        .length,
      note: "SQL write autocommits include background storage; WAL counters cover sampled window, not individual commits. open_datasync flushes in WAL writes.",
    },
    unboundNativeEvents: unboundNative.length,
    native: rows,
    replay: replay.rows,
    captures: replay.captures.map((c) => ({ ...c, dataEdn: undefined })),
  });
  console.log(
    tag,
    rows.length,
    "native joins;",
    replay.rows.length,
    "replay rows; slow",
    arms.at(-1).slow,
  );
}
const result = {
  schema: "triplex.layout-calibration.v1",
  prefix,
  source,
  createdAt: Date.now(),
  collectorSha256: sha256(fs.readFileSync(process.argv[1])),
  scope: "current layout; full tracing; no layout adoption or full verdict",
  arms,
};
fs.writeFileSync(
  outputPath ?? path.join(session, "calibration.json"),
  JSON.stringify(result, null, 2) + "\n",
  { flag: "wx" },
);

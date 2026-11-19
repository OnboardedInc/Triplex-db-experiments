import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createReadStream, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { committedRows } from "../../../bench/lib/verdict.ts";
import { commitBar } from "../../../bench/lib/verdict-statistics.ts";
import { validateWriterBoundary, validateCommandTrace } from "../../../trace/anatomy.mjs";
import { verdictMs, VERDICT_CLOCK } from "../../../trace/instrument.mjs";
import { nativeCounterSummary } from "../../../trace/native-counters.mjs";
import {
  alignClockRecord,
  attribute,
  percentile,
  records,
  traceChildren,
} from "../../../trace/report.mjs";

// [DX-W1] Why: keep the whole ordered ledger, including probes and resends that can own a subject turn.
// Rejected: inferring predecessors from the slow primary sample or counting an adoption as SQL time.
const [base, output] = process.argv.slice(2);
assert(base && output, "usage: tail.ts DX-BM1 NEW_OUTPUT_DIRECTORY");
const read = (name: string) => readFileSync(name, "utf8");
const json = (name: string) => JSON.parse(read(name));
const digest = (input: string) => createHash("sha256").update(input).digest("hex");
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const raw = (name: string) => `trace/raw/${name}.jsonl.gz`;
const origin = "4d1bdb6ed7c6de23f2532218218a9ef114b1897d";
const arms = [],
  byId = new Map<string, any>();
let cohort: string | undefined;
for (const letter of ["a", "b", "c"]) {
  const tag = `tx2-dxt1-drv1-drv1a-${letter}`,
    file = (name: string) => path.join(base, tag, name);
  const seal = read(file("SHA256SUMS"));
  const pins = new Map(
    seal
      .trim()
      .split("\n")
      .map((line) => [line.slice(66), line.slice(0, 64)]),
  );
  const candidate = letter === "b";
  for (const name of [
    "head.txt",
    "driver/ns-writes.jsonl",
    "driver/ns-report.json",
    "trace-run.json",
    ...(candidate
      ? [
          "trace-summary.json",
          "NATIVE-COUNTERS.json",
          ...["node-14-0", "gw-w", "gw-r", "tx"].map(raw),
        ]
      : []),
  ]) {
    const hash = createHash("sha256");
    for await (const chunk of createReadStream(file(name))) hash.update(chunk);
    assert.equal(hash.digest("hex"), pins.get(name), `${tag}/${name}`);
  }
  const manifest = json(file("trace-run.json")),
    report = json(file("driver/ns-report.json"));
  assert(
    manifest.tag === tag &&
      manifest.slot === tag &&
      manifest.source === origin &&
      read(file("head.txt")).trim() === origin,
  );
  assert(
    report.status === "DONE" &&
      report.config.rungSubjects === 10_000 &&
      report.config.zeroReaders &&
      report.verdictPlan.offeredSeconds === 5910,
  );
  assert.equal(report.config.expectedStateRetention, candidate ? "worker-journal" : "heap");
  assert.equal(report.config.receiptCapture, candidate ? "replica-worker" : "sender");
  const writers = [];
  for await (const row of records(file("driver/ns-writes.jsonl"))) {
    writers.push(row);
    if (candidate) {
      assert(!byId.has(row.traceId));
      byId.set(row.traceId, row);
    }
  }
  const primary = committedRows(writers).sort((a, b) => a.seq - b.seq);
  assert.equal(primary.length, 38826);
  assert.equal(
    writers.filter((r) => r.stream === "background" && !r.resend).length,
    primary.length,
  );
  assert.equal(new Set(primary.map((r) => r.seq)).size, primary.length);
  const shape = digest(
    JSON.stringify(
      primary.map((r) => [
        r.seq,
        Math.round(r.offsetMs * 1000),
        r.subject,
        r.facts,
        r.kind,
        r.correction,
        r.ackLoss,
      ]),
    ),
  );
  cohort ??= shape;
  assert.equal(shape, cohort);
  const ack = primary.map(verdictMs);
  const bar = commitBar("NS-P2 all-primary p99 ms", ack, 0.99, 50, VERDICT_CLOCK, {
    minimum: 500,
    estimator: "exact",
  });
  assert.deepEqual(
    bar,
    report.priorities.P2.bars.find((b: any) => b.id === bar.id),
  );
  arms.push({
    tag,
    manifestSha256: digest(seal),
    cohort,
    n: primary.length,
    p99: bar.value,
    interval: bar.interval90,
    over50: ack.filter((x) => x > 50).length,
  });
}
const tag = arms[1]!.tag,
  file = (name: string) => path.join(base, tag, name);
const manifest = json(file("trace-run.json")),
  summary = json(file("trace-summary.json")),
  report = json(file("driver/ns-report.json"));
const ref = summary.clockAlignment.reference;
function bind(r: any) {
  assert(r.run === tag && r.slot === tag && r.source === origin && r.clock?.bootId === ref.bootId);
  const aligned = alignClockRecord(r, ref);
  assert.notEqual(aligned.clockAlignmentQualified, false);
  assert((aligned.at ?? aligned.start) >= manifest.startedAt - 1000);
  return aligned;
}
const adoptionRecords = [];
for await (const r of records(file(raw("tx"))))
  if (["metrics", "index-adoption", "native-counter-state"].includes(r.type))
    adoptionRecords.push(r);
const native = nativeCounterSummary(manifest, adoptionRecords);
assert.deepEqual(native, json(file("NATIVE-COUNTERS.json")));
assert(
  native.indexAdoptions.observer.dropped === 0 &&
    native.indexAdoptions.completed === native.indexAdoptions.observed,
);
const adoptions = adoptionRecords.filter((r) => r.type === "index-adoption").map(bind);
const primary = committedRows([...byId.values()]),
  slow = primary.filter((r) => verdictMs(r) > 30);
const wanted = new Set(slow.map((r) => r.traceId));
function predecessor(w: any) {
  const waits = w.queue.filter((q: any) => q.cause === "subject");
  assert(waits.length <= 1);
  if (!waits.length) return null;
  const q = waits[0],
    p = byId.get(q.behindTraceId);
  assert(p && p.subject === w.subject && p.offeredAt <= w.offeredAt && p.startedAt < w.startedAt);
  assert(Math.abs(p.finishedAt - q.end) < 0.001 && q.start === w.offeredAt);
  return p;
}
for (const w of slow) {
  let p = predecessor(w);
  while (p && !wanted.has(p.traceId)) {
    wanted.add(p.traceId);
    p = predecessor(p);
  }
}
const roots = new Map<string, any>(),
  gateways = new Map<string, any[]>(),
  gc = [];
for await (const r of records(file(raw("node-14-0")))) {
  if (r.type === "event" && r.layer === "typescript-gc") gc.push(bind(r));
  if (r.type !== "request" || r.name !== "driver.commit" || !wanted.has(r.traceId)) continue;
  const root = bind(r),
    w = byId.get(r.traceId);
  validateWriterBoundary(w, root);
  if (w.outcome === "committed") validateCommandTrace(w, [root]);
  assert(root.attributes.seq === w.seq && root.attributes.ackPublishedAt === w.ackPublishedAt);
  assert(!roots.has(w.traceId));
  roots.set(w.traceId, root);
}
for (const name of ["gw-w", "gw-r"])
  for await (const r of records(file(raw(name)))) {
    if (r.type !== "request" || !wanted.has(r.traceId)) continue;
    const calls = gateways.get(r.traceId) ?? [];
    calls.push(bind(r));
    gateways.set(r.traceId, calls);
  }
const duration = (a: any, b: any) =>
  Math.max(0, Math.min(a.end, b.end) - Math.max(a.start, b.start));
function partition(w: any) {
  const root = roots.get(w.traceId);
  assert(root);
  const calls = traceChildren(root, gateways.get(w.traceId) ?? []);
  const commits = calls.filter((g) => g.kind === "commit" && g.attributes?.datomicT);
  if (w.outcome === "committed") assert.equal(commits.length, 1);
  const io = commits[0]?.attributes?.transactionIoStats;
  if (io) assert(io.api === "tx-with" && io["io-context"] === "commit");
  const reads = io?.reads;
  const sql = reads ? (reads.sql ?? 0) : null,
    sqlMs = reads ? (reads["sql-ms"] ?? 0) : null;
  if (reads) assert(Number.isSafeInteger(sql) && sql >= 0 && Number.isFinite(sqlMs) && sqlMs >= 0);
  const pauses = gc.filter((g) => g.start < w.ackPublishedAt && g.end > w.scheduledAt);
  const { layers } = attribute({ ...root, end: w.ackPublishedAt }, calls, pauses);
  const queue = (name: string) =>
    sum(w.queue.filter((q: any) => q.cause === name).map((q: any) => q.end - q.start));
  const times = {
    subject: queue("subject"),
    late: queue("scheduler-late"),
    dispatch: queue("scheduler-dispatch"),
    slot: queue("slot"),
    node: layers.typescript + layers["typescript-gc"] + (layers["event-loop"] ?? 0),
    socket: layers.network,
    gateway: layers.gateway + layers["peer-call"] + layers["gateway-queue"] + layers["gateway-gc"],
    peer: layers["peer-wait"],
    unknown: layers.unknown,
  };
  const ack = w.ackPublishedAt - w.scheduledAt;
  assert(Math.abs(ack - sum(Object.values(times))) < 0.01);
  let adoptionOverlap = 0,
    ageMs: number | null = null;
  for (const g of calls)
    for (const s of g.spans.filter((s: any) => s.layer === "peer-wait")) {
      for (const a of adoptions) {
        adoptionOverlap += duration(a, s);
        if (a.end <= s.start) ageMs = Math.min(ageMs ?? Infinity, s.start - a.end);
      }
    }
  const dominant = Object.entries(times).sort((a, b) => b[1] - a[1])[0]![0];
  const p = predecessor(w);
  return {
    traceId: w.traceId,
    command: w.commandId,
    subject: w.subject,
    stream: w.stream,
    seq: w.seq,
    primary: w.stream === "background" && !w.resend,
    scheduled: w.scheduledAt,
    offered: w.offeredAt,
    started: w.startedAt,
    ackAt: w.ackPublishedAt,
    released: w.finishedAt,
    predecessor: p?.traceId ?? null,
    ack,
    times,
    dominant,
    adoptionOverlap,
    ageMs,
    sql,
    sqlMs,
    txWithMs: io?.["api-ms"] ?? null,
    senderGcDuringLate: sum(
      pauses.map((g) => duration(g, { start: w.scheduledAt, end: w.offeredAt })),
    ),
  };
}
const chain = [...wanted].map((k) => partition(byId.get(k)));
const ledger = new Map(chain.map((r) => [r.traceId, r]));
const tail = slow.map((w) => ledger.get(w.traceId)!);
function totals(rows: typeof chain) {
  return {
    count: rows.length,
    over50: rows.filter((r) => r.ack > 50).length,
    dominant: Object.fromEntries(
      Object.keys(rows[0]!.times).map((k) => [k, rows.filter((r) => r.dominant === k).length]),
    ),
    ms: Object.fromEntries(
      Object.keys(rows[0]!.times).map((k) => [
        k,
        sum(rows.map((r) => r.times[k as keyof typeof r.times])),
      ]),
    ),
    withPredecessor: rows.filter((r) => r.predecessor).length,
    adoptionOverlapCount: rows.filter((r) => r.adoptionOverlap > 0).length,
    adoptionOverlapMs: sum(rows.map((r) => r.adoptionOverlap)),
    within2s: rows.filter((r) => r.ageMs !== null && r.ageMs < 2000).length,
    sqlObserved: rows.filter((r) => r.sql !== null).length,
    sqlCold: rows.filter((r) => r.sql > 0).length,
    sqlReads: sum(rows.map((r) => r.sql ?? 0)),
    sqlReadMs: sum(rows.map((r) => r.sqlMs ?? 0)),
    sqlTimeAloneCrosses50: rows.filter(
      (r) => r.ack > 50 && r.sqlMs !== null && r.ack - r.sqlMs <= 50,
    ).length,
    txWithObserved: rows.filter((r) => r.txWithMs !== null).length,
    txWithMs: sum(rows.map((r) => r.txWithMs ?? 0)),
    senderGcDuringLateMs: sum(rows.map((r) => r.senderGcDuringLate)),
  };
}
const chains = new Map<string, { root: string; followers: string[]; waitMs: number }>();
for (const row of tail.filter((r) => r.predecessor)) {
  let first = row;
  while (first.predecessor) first = ledger.get(first.predecessor)!;
  const c = chains.get(first.traceId) ?? { root: first.command, followers: [], waitMs: 0 };
  c.followers.push(row.command);
  c.waitMs += row.times.subject;
  chains.set(first.traceId, c);
}
const { firstBurstAtS, burstDurationS, burstPeriodS } = report.trace.params;
const bursts = Array.from({ length: 10 }, (_, i) => {
  const start = (firstBurstAtS + i * burstPeriodS) * 1000;
  const group = primary.filter(
    (r) => r.offsetMs >= start && r.offsetMs < start + burstDurationS * 1000,
  );
  assert(group.every((r) => r.burst));
  const ack = group.map(verdictMs);
  return {
    burst: i + 1,
    n: group.length,
    p99: percentile(ack, 0.99),
    over30: ack.filter((x) => x > 30).length,
    over50: ack.filter((x) => x > 50).length,
  };
});
mkdirSync(output);
writeFileSync(
  path.join(output, "chains.jsonl"),
  chain.map((r) => JSON.stringify(r)).join("\n") + "\n",
  { flag: "wx" },
);
writeFileSync(
  path.join(output, "summary.json"),
  JSON.stringify(
    {
      arms,
      source: origin,
      tail: totals(tail),
      over50: totals(tail.filter((r) => r.ack > 50)),
      causalChainRows: chain.length,
      topChains: [...chains.values()].sort((a, b) => b.waitMs - a.waitMs).slice(0, 10),
      bursts,
      adoptionEvents: adoptions.length,
      adoptionScope: "process wall-clock overlap; gateway database hash absent",
      nativeApply: null,
      postgresStatementAndWal: null,
      gatewayJvmPauses: null,
    },
    null,
    2,
  ) + "\n",
  { flag: "wx" },
);

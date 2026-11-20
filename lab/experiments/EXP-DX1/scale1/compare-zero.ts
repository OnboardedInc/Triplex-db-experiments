import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { deserialize } from "node:v8";
import { createInterface } from "node:readline";
import { createGunzip, createZstdDecompress } from "node:zlib";

const [source, slot, reportFile, writesFile, gatewayFile, txFile, journalFile] = process.argv.slice(
  2,
) as string[];
assert(/^[a-f0-9]{40}$/.test(source!) && /^tx2-[a-z0-9-]+$/.test(slot!));
const json = (file: string) => JSON.parse(fs.readFileSync(file, "utf8"));
const report = json(reportFile!);
assert(report.status === "DONE" && !report.finalizationErrors?.length && report.config.zeroReaders);
assert(
  report.config.receiptCapture === "replica-worker" &&
    report.config.expectedStateRetention === "worker-journal",
);
if (report.deep)
  assert(report.deep.identity.slot === slot && report.deep.identity.source === source);
const files: Record<string, string> = {};
async function* rows(file: string) {
  const raw = fs.createReadStream(file),
    hash = createHash("sha256");
  raw.on("data", (chunk) => hash.update(chunk));
  const input = file.endsWith(".gz")
    ? raw.pipe(createGunzip())
    : file.endsWith(".zst")
      ? raw.pipe(createZstdDecompress())
      : raw;
  for await (const line of createInterface({ input, crlfDelay: Infinity }))
    if (line) yield JSON.parse(line);
  files[file] = hash.digest("hex");
}
const from = report.traceStartAbsMs,
  to = from + report.writer.offeredUntilTraceS * 1000;
assert(Number.isFinite(from) && to > from);
type Samples = Record<string, number[]>;
const add = (bag: Samples, values: Record<string, number | undefined>) => {
  for (const [key, value] of Object.entries(values))
    if (typeof value === "number" && Number.isFinite(value)) (bag[key] ??= []).push(value);
};
function quantiles(xs: number[]) {
  xs.sort((a, b) => a - b);
  const k = (q: number) => xs[Math.max(0, Math.ceil(q * xs.length) - 1)] ?? null;
  return {
    n: xs.length,
    mean: xs.length ? xs.reduce((sum, x) => sum + x, 0) / xs.length : null,
    p50: k(0.5),
    p95: k(0.95),
    p99: k(0.99),
    max: xs.at(-1) ?? null,
  };
}
const byPosition = new Map<number, any>();
const byTrace = new Map<string, any>(),
  byCommand = new Map<string, any>(),
  byKind: Record<string, Samples> = {};
const gateway = new Map<string, any[]>();
const joined: { row: any; observed: Record<string, number | undefined> }[] = [];
for await (const w of rows(writesFile!)) {
  if (w.stream !== "background" || w.resend) continue;
  assert(
    w.outcome === "committed" &&
      !w.expired &&
      w.verdictClock === "ack/1" &&
      w.scheduledAt >= from &&
      w.scheduledAt < to &&
      w.ackPublishedAt >= w.transactReturnedAt &&
      w.transactReturnedAt >= w.transactCalledAt &&
      w.transactCalledAt >= w.startedAt &&
      w.startedAt >= w.scheduledAt &&
      Math.abs(w.verdictMs - (w.ackPublishedAt - w.scheduledAt)) < 0.001,
  );
  assert(
    /^[a-f0-9]{32}$/.test(w.traceId) && !byTrace.has(w.traceId) && !byCommand.has(w.commandId),
  );
  byTrace.set(w.traceId, w);
  byCommand.set(w.commandId, w);
  assert(Number.isSafeInteger(w.position) && !byPosition.has(w.position));
  byPosition.set(w.position, w);
}
assert(byTrace.size === report.receiptCapture.matched);
let boot: string | undefined,
  ambiguous = 0,
  noGateway = 0;
for await (const g of rows(gatewayFile!)) {
  if (g.name !== "gateway /v1/db/{db}/transact" || g.attributes?.status !== 200) continue;
  if (!byTrace.has(g.traceId)) continue;
  assert(g.source === source && g.slot === slot && g.run === slot && g.process === "gw-w");
  boot ??= g.clock?.bootId;
  assert(boot && boot === g.clock?.bootId && Number.isFinite(g.start) && g.end >= g.start);
  const list = gateway.get(g.traceId) ?? [];
  list.push(g);
  gateway.set(g.traceId, list);
}
for (const [traceId, w] of byTrace) {
  const groups = (byKind[w.kind] ??= {});
  const possible = (gateway.get(traceId) ?? []).filter(
    (g) => g.start >= w.transactCalledAt - 2 && g.end <= w.transactReturnedAt + 2,
  );
  if (possible.length > 1) ambiguous++;
  if (!possible.length) noGateway++;
  const g = possible.length === 1 ? possible[0] : undefined;
  const reads = g?.attributes.transactionIoStats?.reads,
    io = g?.attributes.transactionIoStats;
  const spans = new Map<string, any>(g?.spans?.map((s: any) => [s.name, s]));
  const stage = (name: string) => {
    const span = spans.get(name);
    return span ? span.end - span.start : undefined;
  };
  if (io) assert(io.api === "tx-with" && io["io-context"] === "commit");
  const observed = {
    ackMs: w.verdictMs,
    beforeTransactionMs: w.transactCalledAt - w.scheduledAt,
    sameSubjectMs: (w.queue ?? [])
      .filter((q: any) => q.cause === "subject")
      .reduce((s: number, q: any) => s + q.end - q.start, 0),
    driverDispatchMs: w.startedAt - w.scheduledAt,
    transactionMs: w.transactReturnedAt - w.transactCalledAt,
    afterTransactionMs: w.ackPublishedAt - w.transactReturnedAt,
    gatewayMs: g ? g.end - g.start : undefined,
    beforeGatewayMs: g ? g.start - w.transactCalledAt : undefined,
    afterGatewayMs: g ? w.transactReturnedAt - g.end : undefined,
    transactionOutsideGatewayMs: g
      ? w.transactReturnedAt - w.transactCalledAt - (g.end - g.start)
      : undefined,
    gatewayParseMs: stage("gateway.request-parse"),
    gatewayPrepareMs: stage("commit.prepare-and-validate"),
    peerWaitMs: stage("peer.transact-await (includes order/network/storage)"),
    serialTxWithMs: io?.["api-ms"],
    sqlReads: reads ? (reads.sql ?? 0) : undefined,
    sqlReadMs: reads ? (reads["sql-ms"] ?? 0) : undefined,
    deserializeMs: reads ? (reads["deserialize-ms"] ?? 0) : undefined,
    objectCacheReads: reads ? (reads.ocache ?? 0) : undefined,
    aevt: reads ? (reads.aevt ?? 0) : undefined,
    eavt: reads ? (reads.eavt ?? 0) : undefined,
    avet: reads ? (reads.avet ?? 0) : undefined,
    asserts: w.facts,
  };
  add(groups, observed);
  joined.push({ row: w, observed });
}
const overall: Samples = {},
  steady: Samples = {},
  burst: Samples = {},
  sameSize: Samples = {},
  tail: Samples = {},
  cold: Samples = {},
  warm: Samples = {};
const cutoff = quantiles(joined.map((j) => j.row.verdictMs)).p99!;
for (const x of joined) {
  add(overall, x.observed);
  add(x.row.burst ? burst : steady, x.observed);
  if (x.row.facts >= 5 && x.row.facts <= 10) add(sameSize, x.observed);
  if (x.row.verdictMs >= cutoff) add(tail, x.observed);
  if (x.observed.sqlReads !== undefined) add(x.observed.sqlReads > 0 ? cold : warm, x.observed);
}
const index: number[] = [],
  windows: { start: number; end: number }[] = [];
let txLines = 0;
for await (const t of rows(txFile!)) {
  txLines++;
  if (t.type !== "index-adoption") continue;
  assert(t.source === source && t.slot === slot && t.run === slot && t.clock?.bootId === boot);
  if (t.completed && t.start >= from && t.end <= to) {
    assert(t.end >= t.start);
    index.push(t.end - t.start);
    windows.push({ start: t.start, end: t.end });
  }
}
const appliedOverlap = joined.filter(({ row: w }) =>
  windows.some((x) => w.transactCalledAt < x.end && x.start < w.transactReturnedAt),
);
// [DX-SCALE1] Why: both zero runs sealed every expected-state journal frame. Match its actual transaction input to acknowledged positions and verify raw and compressed hashes. Rejected: estimating bytes from fact counts or treating this JSON as the wire frame.
const seal = report.expectedStateJournal,
  wireHash = createHash("sha256"),
  decodedHash = createHash("sha256");
assert(seal.source === source && seal.slot === slot && seal.run === slot);
const encoded = fs.createReadStream(journalFile!);
encoded.on("data", (chunk) => wireHash.update(chunk));
const commandInput: Samples = {},
  byKindInput: Record<string, Samples> = {};
let decodedBytes = 0,
  parsed = 0,
  frames = 0,
  pending = Buffer.alloc(0);
const matched = new Set<number>();
for await (const chunk of encoded.pipe(createGunzip())) {
  decodedHash.update(chunk);
  decodedBytes += chunk.length;
  pending = Buffer.concat([pending, chunk]);
  let at = 0;
  while (pending.length - at >= 4) {
    const size = pending.readUInt32LE(at);
    assert(size > 0 && size <= 128 * 1024 ** 2);
    if (pending.length - at < 4 + size) break;
    const e = deserialize(pending.subarray(at + 4, at + 4 + size));
    at += 4 + size;
    if (frames++ === 0) {
      assert(
        e.schema === "triplex.expected-model/1" &&
          e.slot === slot &&
          e.source === source &&
          e.run === slot &&
          e.subjects === seal.subjects,
      );
      continue;
    }
    assert(e.seq === frames - 2);
    const w = e.kind === "receipt" && byPosition.get(e.receipt.position);
    if (!w) continue;
    assert(!matched.has(w.position));
    matched.add(w.position);
    const values = {
      operationJsonBytes: Buffer.byteLength(JSON.stringify(e.operations)),
      operations: e.operations.length,
      assertions: e.operations.filter((op: any) => op.op === "assert").length,
      retractions: e.operations.filter((op: any) => op.op === "retract").length,
    };
    assert(values.assertions === w.facts);
    add(commandInput, values);
    add((byKindInput[w.kind] ??= {}), values);
    parsed++;
  }
  pending = Buffer.from(pending.subarray(at));
}
assert(
  pending.length === 0 &&
    frames === seal.frames + 1 &&
    decodedBytes === seal.bytes &&
    parsed === byPosition.size,
);
assert(decodedHash.digest("hex") === seal.sha256);
files[journalFile!] = wireHash.digest("hex");
assert(
  files[journalFile!] === seal.archive.sha256 &&
    fs.statSync(journalFile!).size === seal.archive.bytes,
);
files[reportFile!] = createHash("sha256").update(fs.readFileSync(reportFile!)).digest("hex");
const summarize = (samples: Samples) =>
  Object.fromEntries(Object.entries(samples).map(([key, xs]) => [key, quantiles(xs)]));
const sanitizedHashes = Object.fromEntries(
  Object.entries(files).map(([p, h]) => [p.split("/").at(-1), h]),
);
console.log(
  JSON.stringify(
    {
      source,
      slot,
      boot,
      from,
      to,
      frozenCommands: byTrace.size,
      ambiguous,
      noGateway,
      overall: summarize(overall),
      steady: summarize(steady),
      burst: summarize(burst),
      facts5to10: summarize(sameSize),
      slowestOnePercent: summarize(tail),
      cold: summarize(cold),
      warm: summarize(warm),
      byKind: Object.fromEntries(Object.entries(byKind).map(([k, m]) => [k, summarize(m)])),
      index: {
        traceRows: txLines,
        adoptions: quantiles(index),
        overlappingCommits: appliedOverlap.length,
        overlappingTail: appliedOverlap.filter((x) => x.row.verdictMs >= cutoff).length,
      },
      commandInput: {
        matched: parsed,
        all: summarize(commandInput),
        byKind: Object.fromEntries(Object.entries(byKindInput).map(([k, m]) => [k, summarize(m)])),
      },
      inputHashes: sanitizedHashes,
    },
    null,
    2,
  ),
);

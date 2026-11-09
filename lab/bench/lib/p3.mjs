// [EXP-P3M] Why: R41 E3 measures the native feed against a source-owned prefix, before ACK reconciliation.
// Rejected: transactions() and an ACK-derived expected set (both omit published lost-ACK commits).
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import fs from "node:fs";
const req = (pkg) =>
  createRequire(new URL(`../../../packages/${pkg}/package.json`, import.meta.url));
export const host = req("host")("@triplex-build/triplex-host/feed");
export const core = req("core")("@triplex-build/triplex/feed");
export const kit = req("testkit")("@triplex-build/triplex-testkit/feed");
export const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
export const fileHash = (file) => sha(fs.readFileSync(file));
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
export function positions(source, entries) {
  return entries.flatMap((e) =>
    e.kind === "commit"
      ? e.transactions.flatMap((t) =>
          t.positions.map((position) => ({ source, stream: e.stream, epoch: e.epoch, position })),
        )
      : [],
  );
}
export function adapter(config, native) {
  if (config.lane === "qlever")
    return host.brokerChangeFeed(config.source, config.stream, native.broker);
  if (config.lane === "xtdb")
    return host.xtdbChangeFeed(config.source, config.stream, native.xtdb, native.identities);
  if (config.lane === "datomic") return host.datomicChangeFeed(config.source);
  throw Error("Unknown lane");
}
export function distribution(rows) {
  const sorted = rows.map((r) => r.lagMs).sort((a, b) => a - b);
  const q = (p) => (sorted.length ? sorted[Math.ceil(p * sorted.length) - 1] : null);
  return { count: sorted.length, p50Ms: q(0.5), p99Ms: q(0.99), maxMs: sorted.at(-1) ?? null };
}
// [EXP-P3M] Why: exact samples preserve 249/251 ms around the inclusive 250 ms boundary.
// Rejected: the logarithmic NS histogram (rounding can move a sample across the bar).
export function lagSample(publication, known, producer, burst) {
  return {
    key: core.feedPositionKey(known),
    publication,
    known,
    burst,
    lagMs: core.publicationLagMs(publication, known, producer),
  };
}
export function auditP3({ config, prefix, consumed, readers, acks, records }) {
  if (prefix.runId !== config.runId || consumed.runId !== config.runId)
    throw Error("Attempt binding mismatch");
  if (prefix.source !== config.source || prefix.stream !== config.stream)
    throw Error("Prefix source mismatch");
  if (JSON.stringify(consumed.checkpoint) !== JSON.stringify(prefix.cursor))
    throw Error("Durable checkpoint differs from prefix");
  const coverage = kit.auditFeed(consumed.pages, {
    entries: prefix.entries,
    source: config.source,
    finalToken: prefix.cursor.token,
  });
  if (prefix.cursor.source !== config.source) throw Error("Prefix cursor source mismatch");
  const expected = new Map(
    positions(config.source, prefix.entries).map((k) => [core.feedPositionKey(k), k]),
  );
  const metadata = new Map(prefix.publications.map((p) => [core.feedPositionKey(p.key), p]));
  if (metadata.size !== prefix.publications.length || metadata.size !== expected.size)
    throw Error("Publication inventory differs from prefix");
  const samples = new Map();
  for (const sample of consumed.samples) {
    if (samples.has(sample.key) || !expected.has(sample.key))
      throw Error("Duplicate/foreign lag sample");
    const key = expected.get(sample.key),
      meta = metadata.get(sample.key);
    const record = host.readProducerPublication(records, key);
    if (!record) throw Error("Missing source publication instant");
    const tx = prefix.entries
      .flatMap((e) => (e.kind === "commit" && e.epoch === key.epoch ? e.transactions : []))
      .find((t) => t.positions.includes(key.position));
    if (!meta || (!tx.txIds.includes(meta.publicationId) && meta.publicationId !== tx.operationId))
      throw Error("Publication transaction binding mismatch");
    if (typeof meta.burst !== "boolean") throw Error("Missing frozen trace segment");
    if (meta.publicationId !== record.publicationId) throw Error("Producer identity mismatch");
    if (
      config.lane === "qlever" &&
      (meta.kind !== "watermarkAt" || meta.watermarkAt !== record.atNs)
    )
      throw Error("Missing broker watermarkAt");
    if (
      config.lane === "xtdb" &&
      (meta.kind !== "commit-sync-return" ||
        typeof meta.systemTime !== "string" ||
        !meta.systemTime)
    )
      throw Error("Missing XTDB system_time cross-check");
    if (config.lane === "datomic" && meta.kind !== "transact-result")
      throw Error("Missing Datomic transact result");
    const checked = lagSample(sample.publication, sample.known, record, meta.burst);
    if (
      checked.key !== sample.key ||
      checked.lagMs !== sample.lagMs ||
      checked.burst !== sample.burst
    )
      throw Error("Changed lag sample");
    samples.set(sample.key, checked);
  }
  if (samples.size !== expected.size) throw Error("Position without lag sample");
  // [EXP-P3M] Why: reader counts are observed by each executing closed loop over the whole window.
  // Rejected: deriving L256 from requested configuration or a worker-ready message alone.
  const ids = new Set();
  for (const r of readers) {
    if (
      r.runId !== config.runId ||
      r.composition !== config.readerComposition ||
      r.errors ||
      r.completed < 2 ||
      BigInt(r.firstCompletedNs) > BigInt(config.windowStartNs) ||
      BigInt(r.lastCompletedNs) < BigInt(config.windowEndNs) ||
      BigInt(r.startedNs) > BigInt(config.windowStartNs) ||
      BigInt(r.stoppedNs) < BigInt(config.windowEndNs) ||
      ids.has(r.id)
    )
      throw Error("Invalid reader observation");
    ids.add(r.id);
  }
  if (ids.size !== config.readers) throw Error("Reader label exceeds observed closed loops");
  const publishedCommands = new Map();
  for (const e of prefix.entries)
    if (e.kind === "commit")
      for (const t of e.transactions)
        for (const id of t.commandIds)
          publishedCommands.set(id, { epoch: e.epoch, positions: t.positions, txIds: t.txIds });
  for (const ack of acks) {
    const p = publishedCommands.get(ack.commandId);
    if (
      !p ||
      p.epoch !== ack.epoch ||
      !p.positions.includes(ack.position) ||
      !p.txIds.includes(ack.txId)
    )
      throw Error("ACK not in final published prefix");
  }
  const rows = [...samples.values()].filter(
    (r) =>
      BigInt(r.publication.atNs) >= BigInt(config.windowStartNs) &&
      BigInt(r.publication.atNs) < BigInt(config.windowEndNs),
  );
  if (!rows.length) throw Error("Void measured window");
  return {
    coverage,
    readerLevel: ids.size,
    lag: {
      pooled: distribution(rows),
      steady: distribution(rows.filter((r) => !r.burst)),
      burst: distribution(rows.filter((r) => r.burst)),
    },
    lagWithin250ms: distribution(rows).p99Ms <= 250,
    publishedWithoutAck: [...publishedCommands.keys()].filter(
      (id) => !acks.some((a) => a.commandId === id),
    ),
    allPositionsAccounted: true,
    sourcePrefixEnumerated: true,
  };
}

// [EXP-P3M] Why: writer hooks record host instants at source publication, separately from ACKs (R41-c).
// Rejected: subtracting engine system_time, or populating the map when a consumer first polls.
// Invoke synchronously at the named source event. Broker owners must invoke this at watermarkAt
// and use the returned atNs as the watermark's host-clock observation; do not relabel an old LSN.
export function openSourceRecorder(config) {
  const writer = host.openPublicationWriter(
    config.publicationFile,
    config.source,
    config.stream,
    host.openHostFeedClock(),
  );
  return {
    published(key, publicationId, event) {
      if (
        config.lane === "xtdb" &&
        (event.kind !== "commit-sync-return" ||
          typeof event.systemTime !== "string" ||
          !event.systemTime)
      )
        throw Error("XTDB publication requires COMMIT SYNC and system_time");
      if (config.lane === "qlever" && event.kind !== "watermarkAt")
        throw Error("Broker publication requires watermarkAt");
      if (config.lane === "datomic" && event.kind !== "transact-result")
        throw Error("Datomic publication requires transact result");
      if (typeof event.burst !== "boolean") throw Error("Missing frozen writer-trace segment");
      const record = writer.publish(key, publicationId);
      return {
        key,
        publicationId,
        kind: event.kind,
        burst: event.burst,
        ...(config.lane === "xtdb" ? { systemTime: event.systemTime } : {}),
        ...(config.lane === "qlever" ? { watermarkAt: record.atNs } : {}),
      };
    },
    close: () => writer.close(),
  };
}

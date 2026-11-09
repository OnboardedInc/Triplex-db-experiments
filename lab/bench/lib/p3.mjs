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
export { positions, distribution, lagSample, auditP3 } from "../ns-driver/p3.mjs";
export function adapter(config, native) {
  if (config.lane === "qlever")
    return host.brokerChangeFeed(config.source, config.stream, native.broker);
  if (config.lane === "xtdb")
    return host.xtdbChangeFeed(config.source, config.stream, native.xtdb, native.identities);
  if (config.lane === "datomic") return host.datomicChangeFeed(config.source);
  throw Error("Unknown lane");
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

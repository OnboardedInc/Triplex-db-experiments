import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { platform } from "node:os";
import { readFileSync, statSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import {
  feedPositionKey,
  sameFeedClock,
  type FeedClockDomain,
  type FeedInstant,
  type FeedPosition,
  type FeedPublication,
} from "@triplex-build/triplex/feed";

const hash = (bytes: string) => createHash("sha256").update(bytes).digest("hex");
export interface HostFeedClock {
  readonly domain: FeedClockDomain;
}
const clocks = new WeakSet<object>();
// [EXP-FD01-R3] Why: hrtime shares one numerical origin on a host/boot, unlike per-process performance.now.
// Rejected: a default label on an arbitrary callback or a wall-clock-based inferred origin (QA R2-F1).
export function openHostFeedClock(): HostFeedClock {
  const boot =
    platform() === "darwin"
      ? execFileSync("/usr/sbin/sysctl", ["-n", "kern.bootsessionuuid"], {
          encoding: "utf8",
        }).trim()
      : platform() === "linux"
        ? readFileSync("/proc/sys/kernel/random/boot_id", "utf8").trim()
        : "";
  if (!boot) throw new Error("Host boot identity unavailable; refusing feed measurement");
  // [EXP-NSR] Why: one kernel/time namespace is shared across differently named containers. Rejected: hostname, which both splits one clock and conflates separate VMs.
  const domain: FeedClockDomain = Object.freeze(
    platform() === "linux"
      ? {
          primitive: "CLOCK_MONOTONIC" as const,
          bootId: boot,
          timeNs: String(statSync("/proc/self/ns/time", { bigint: true }).ino),
        }
      : {
          primitive: "node-hrtime-v1" as const,
          host: hash(platform() + ":" + boot),
          boot: hash(boot),
          origin: "host-boot" as const,
        },
  );
  const clock = Object.freeze({ domain });
  clocks.add(clock);
  return clock;
}
export function captureFeedInstant(clock: HostFeedClock, position: FeedPosition): FeedInstant {
  if (!clocks.has(clock)) throw new Error("Unbound feed clock; use shared host capture primitive");
  feedPositionKey(position);
  return Object.freeze({
    ...position,
    domain: clock.domain,
    atNs: String(process.hrtime.bigint()),
  });
}
export interface PublicationReader {
  readonly get: (key: FeedPosition) => FeedPublication | undefined;
  readonly close: () => void;
}
const readers = new WeakSet<object>();
export function readProducerPublication(
  reader: PublicationReader,
  key: FeedPosition,
): FeedPublication | undefined {
  if (!readers.has(reader)) throw new Error("Unbound producer publication reader");
  return reader.get(key);
}
const payload = (r: Omit<FeedPublication, "recordId">) =>
  JSON.stringify([r.source, r.stream, r.epoch, r.position, r.publicationId, r.domain, r.atNs]);
declare const publicationCapture: unique symbol;
export interface PublicationCapture {
  readonly [publicationCapture]: true;
}
/** Producer-owned append-only position record. Invoke publish at source publication, never at ACK/poll. */
export function openPublicationWriter(
  file: string,
  source: string,
  stream: string,
  clock: HostFeedClock,
) {
  if (!clocks.has(clock) || !file || file === ":memory:")
    throw new Error("Unbound publication writer");
  const db = new DatabaseSync(file);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA fullfsync=ON; PRAGMA checkpoint_fullfsync=ON;
    PRAGMA wal_autocheckpoint=0; PRAGMA journal_size_limit=16777216; PRAGMA locking_mode=NORMAL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS publications(key TEXT PRIMARY KEY, body TEXT NOT NULL);`);
  // [DX-T1-5] Why: one autocommitted insert is already atomic and FULL-synchronous; prepare once.
  // Rejected: BEGIN/SELECT/INSERT/COMMIT for every new position (extra writer-thread work, same durable row).
  const insert = db.prepare("INSERT OR IGNORE INTO publications VALUES(?,?)");
  const select = db.prepare("SELECT body FROM publications WHERE key=?");
  const captures = new WeakMap<PublicationCapture, FeedPublication>();
  let closed = false;
  // [DX-T1-5] Why: capture the source event now and permit its witness to be persisted later without inventing a time.
  // Rejected: accepting a caller-supplied instant or returning a publication receipt before FULL-synchronous storage.
  const capture = (key: FeedPosition, publicationId: string): PublicationCapture => {
    if (closed) throw new Error("Publication writer is closed");
    const bound = {
      source: key.source,
      stream: key.stream,
      epoch: key.epoch,
      position: key.position,
    };
    if (
      bound.source !== source ||
      bound.stream !== stream ||
      typeof publicationId !== "string" ||
      !publicationId
    )
      throw new Error("Producer publication binding mismatch");
    feedPositionKey(bound);
    const value = { ...captureFeedInstant(clock, bound), publicationId };
    const record = Object.freeze({ ...value, recordId: hash(payload(value)) });
    const token = Object.freeze({}) as PublicationCapture;
    captures.set(token, record);
    return token;
  };
  const persistCaptured = (token: PublicationCapture): FeedPublication => {
    if (closed) throw new Error("Publication writer is closed");
    const record = captures.get(token);
    if (!record) throw new Error("Foreign or forged publication capture");
    const positionKey = feedPositionKey(record);
    if (Number(insert.run(positionKey, JSON.stringify(record)).changes) === 1) return record;
    const prior = select.get(positionKey);
    if (!prior) throw new Error("Producer insert did not persist a publication");
    const existing = decode(String(prior["body"]), record);
    if (existing.publicationId !== record.publicationId)
      throw new Error("Position already has a different publication record");
    return existing;
  };
  return Object.freeze({
    capture,
    persistCaptured,
    publish: (key: FeedPosition, publicationId: string): FeedPublication => {
      // [EXP-FD01-R3] Why: retry/poll must not replace an original position's publication time.
      // Rejected: overwriting the timestamp when a late map entry or lost ACK is observed.
      // [EXP-FD01-R3] Why: include sidecar lock/fsync delay after the source publication event.
      // Rejected: capturing after BEGIN, which understates lag when another writer holds the lock.
      return persistCaptured(capture(key, publicationId));
    },
    close: () => {
      db.close();
      closed = true;
    },
  });
}
function decode(body: string, key: FeedPosition): FeedPublication {
  const record = JSON.parse(body) as FeedPublication;
  if (
    feedPositionKey(record) !== feedPositionKey(key) ||
    !sameFeedClock(record.domain, record.domain) ||
    !/^(0|[1-9][0-9]*)$/.test(record.atNs) ||
    !record.publicationId ||
    hash(payload(record)) !== record.recordId
  )
    throw new Error("Producer publication record corrupt or mismatched");
  Object.freeze(record.domain);
  return Object.freeze(record);
}
export function openPublicationReader(file: string): PublicationReader {
  const db = new DatabaseSync(file, { readOnly: true });
  const reader = Object.freeze({
    get: (key: FeedPosition) => {
      const row = db.prepare("SELECT body FROM publications WHERE key=?").get(feedPositionKey(key));
      return row ? decode(String(row["body"]), key) : undefined;
    },
    close: () => db.close(),
  });
  readers.add(reader);
  return reader;
}

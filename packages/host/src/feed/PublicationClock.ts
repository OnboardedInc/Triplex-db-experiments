import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { platform } from "node:os";
import { readFileSync, statSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { Worker } from "node:worker_threads";
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
function publicationCaptures(
  source: string,
  stream: string,
  clock: HostFeedClock,
  assertOpen: () => void,
) {
  const captures = new WeakMap<PublicationCapture, FeedPublication>();

  // [DX-T1-5] Why: capture the source event now and permit its witness to be persisted later without inventing a time.
  // Rejected: accepting a caller-supplied instant or returning a publication receipt before FULL-synchronous storage.
  const capture = (key: FeedPosition, publicationId: string): PublicationCapture => {
    assertOpen();
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
  return {
    capture,
    record: (token: PublicationCapture) => {
      assertOpen();
      const record = captures.get(token);
      if (!record) throw new Error("Foreign or forged publication capture");
      return record;
    },
  };
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
  let closed = false;
  const captures = publicationCaptures(source, stream, clock, () => {
    if (closed) throw new Error("Publication writer is closed");
  });
  const capture = captures.capture;
  const persistCaptured = (token: PublicationCapture): FeedPublication => {
    const record = captures.record(token);
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

export interface PublicationPersistenceSample {
  readonly thread: number;
  readonly start: number;
  readonly end: number;
  readonly position: string;
  readonly publicationId: string;
}
// [DX-T1-9] Why: capture on the producer's clock, but keep FULL-synchronous SQLite and its readback off that isolate.
// Rejected: capturing a later worker timestamp, acknowledging before readback, or transferring forgeable capture tokens.
export async function openAsyncPublicationWriter(
  file: string,
  source: string,
  stream: string,
  clock: HostFeedClock,
  options: { workerCpus?: string; onPersist?: (sample: PublicationPersistenceSample) => void } = {},
) {
  if (!clocks.has(clock) || !file || file === ":memory:")
    throw new Error("Unbound publication writer");
  const worker = new Worker(`(${publicationWorker.toString()})()`, {
    eval: true,
    workerData: { file, cpus: options.workerCpus },
  });
  let closed = false,
    closing = false,
    failed: Error | undefined,
    sequence = 0;
  const pending = new Map<
    number,
    { resolve: (value: string) => void; reject: (error: Error) => void }
  >();
  let readyResolve!: () => void, readyReject!: (error: Error) => void;
  const ready = new Promise<void>((resolve, reject) => {
    readyResolve = resolve;
    readyReject = reject;
  });
  const fail = (error: Error) => {
    failed ??= error;
    readyReject(error);
    for (const request of pending.values()) request.reject(error);
    pending.clear();
  };
  worker.on("error", fail);
  const exited = new Promise<void>((resolve) =>
    worker.once("exit", (code) => {
      closed = true;
      if (!closing || code !== 0 || pending.size)
        fail(new Error(`Publication worker exited (${code})`));
      resolve();
    }),
  );
  worker.on(
    "message",
    (message: {
      ready?: boolean;
      id: number;
      body?: string;
      error?: string;
      sample?: PublicationPersistenceSample;
    }) => {
      if (message.ready) {
        readyResolve();
        return;
      }
      const request = pending.get(message.id);
      if (!request) {
        fail(new Error("Unbound publication worker reply"));
        return;
      }
      pending.delete(message.id);
      if (message.error) request.reject(new Error(message.error));
      else if (typeof message.body !== "string")
        request.reject(new Error("Missing durable publication readback"));
      else {
        try {
          if (message.sample) options.onPersist?.(message.sample);
          request.resolve(message.body);
        } catch (error) {
          request.reject(error instanceof Error ? error : new Error(String(error)));
        }
      }
    },
  );
  try {
    await ready;
  } catch (error) {
    await worker.terminate();
    throw error;
  }
  const captures = publicationCaptures(source, stream, clock, () => {
    if (failed) throw failed;
    if (closed || closing) throw new Error("Publication writer is closed");
  });
  return Object.freeze({
    capture: captures.capture,
    persistCaptured: async (token: PublicationCapture): Promise<FeedPublication> => {
      const captured = captures.record(token),
        id = ++sequence;
      const body = await new Promise<string>((resolve, reject) => {
        pending.set(id, { resolve, reject });
        try {
          worker.postMessage({
            id,
            key: feedPositionKey(captured),
            body: JSON.stringify(captured),
          });
        } catch (error) {
          pending.delete(id);
          reject(error);
        }
      });
      const record = decode(body, captured);
      if (
        record.publicationId !== captured.publicationId ||
        !sameFeedClock(record.domain, captured.domain) ||
        BigInt(record.atNs) > BigInt(captured.atNs)
      )
        throw new Error("Durable publication capture binding mismatch");
      return record;
    },
    close: async () => {
      if (closed) {
        if (failed) throw failed;
        return;
      }
      // [DX-T1-9] Why: a close is queued after writes and their exact readbacks on the same ordered port.
      // Rejected: terminate() during normal shutdown (could lose a pending witness and conceal failure).
      closing = true;
      worker.postMessage({ close: true });
      await exited;
      if (failed) throw failed;
    },
  });
}
// [DX-T1-9] Why: a self-contained worker function works in source tests and built ESM without a second runtime loader.
// Rejected: a worker URL pointing at an unbuilt TypeScript sibling or a new SQLite dependency.
function publicationWorker() {
  const { parentPort, workerData, threadId } =
    require("node:worker_threads") as typeof import("node:worker_threads");
  const { DatabaseSync: Sqlite } = require("node:sqlite") as typeof import("node:sqlite");
  const { performance: timer } = require("node:perf_hooks") as typeof import("node:perf_hooks");
  if (!parentPort) throw new Error("Missing publication worker port");
  if (workerData.cpus && process.platform === "linux") {
    const { readFileSync: read } = require("node:fs") as typeof import("node:fs");
    const { execFileSync: exec } =
      require("node:child_process") as typeof import("node:child_process");
    const tid = read("/proc/thread-self/stat", "utf8").split(" ")[0]!;
    exec("taskset", ["-pc", workerData.cpus, tid], { stdio: "ignore" });
  }
  const db = new Sqlite(workerData.file);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA fullfsync=ON; PRAGMA checkpoint_fullfsync=ON;
    PRAGMA wal_autocheckpoint=0; PRAGMA journal_size_limit=16777216; PRAGMA locking_mode=NORMAL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS publications(key TEXT PRIMARY KEY, body TEXT NOT NULL);`);
  const insert = db.prepare("INSERT OR IGNORE INTO publications VALUES(?,?)"),
    select = db.prepare("SELECT body FROM publications WHERE key=?");
  parentPort.on(
    "message",
    (message: { close?: boolean; id: number; key: string; body: string }) => {
      if (message.close) {
        db.close();
        parentPort.close();
        return;
      }
      const start = timer.timeOrigin + timer.now();
      try {
        insert.run(message.key, message.body);
        const row = select.get(message.key);
        if (!row || typeof row["body"] !== "string")
          throw new Error("Producer insert did not persist a publication");
        const captured = JSON.parse(message.body) as { position: string; publicationId: string };
        parentPort.postMessage({
          id: message.id,
          body: row["body"],
          sample: {
            thread: threadId,
            start,
            end: timer.timeOrigin + timer.now(),
            position: captured.position,
            publicationId: captured.publicationId,
          },
        });
      } catch (error) {
        parentPort.postMessage({ id: message.id, error: String(error) });
      }
    },
  );
  parentPort.postMessage({ ready: true });
}

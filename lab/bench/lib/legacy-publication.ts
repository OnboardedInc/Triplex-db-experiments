// [DX-T1-5] Why: freeze the 76939dd2 publication protocol for same-source bookend controls.
// Rejected: compare different sessions, or remove the durable witness from latency.
import { createHash } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { createRequire } from "node:module";
const hostRequire = createRequire(new URL("../../../packages/host/package.json", import.meta.url));
const { captureFeedInstant } = hostRequire("@triplex-build/triplex-host/feed");
const coreRequire = createRequire(new URL("../../../packages/core/package.json", import.meta.url));
const { feedPositionKey, sameFeedClock } = coreRequire("@triplex-build/triplex/feed");
// The boundary is exercised against the same host reader's bound record decoder.
type HostFeedClock = any;
type FeedPosition = any;
type FeedPublication = any;
const hash = (bytes: string) => createHash("sha256").update(bytes).digest("hex");
const payload = (r: any) =>
  JSON.stringify([r.source, r.stream, r.epoch, r.position, r.publicationId, r.domain, r.atNs]);
export function openLegacyPublicationWriter(
  file: string,
  source: string,
  stream: string,
  clock: HostFeedClock,
) {
  if (!file || file === ":memory:") throw new Error("Unbound publication writer");
  captureFeedInstant(clock, { source, stream, epoch: "0", position: "0" });
  const db = new DatabaseSync(file);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA fullfsync=ON; PRAGMA checkpoint_fullfsync=ON;
    PRAGMA wal_autocheckpoint=0; PRAGMA journal_size_limit=16777216; PRAGMA locking_mode=NORMAL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS publications(key TEXT PRIMARY KEY, body TEXT NOT NULL);`);
  return Object.freeze({
    publish: (key: FeedPosition, publicationId: string): FeedPublication => {
      if (key.source !== source || key.stream !== stream || !publicationId)
        throw new Error("Producer publication binding mismatch");
      const positionKey = feedPositionKey(key);
      // [EXP-FD01-R3] Why: retry/poll must not replace an original position's publication time.
      // Rejected: overwriting the timestamp when a late map entry or lost ACK is observed.
      // [EXP-FD01-R3] Why: include sidecar lock/fsync delay after the source publication event.
      // Rejected: capturing after BEGIN, which understates lag when another writer holds the lock.
      const observed = captureFeedInstant(clock, key);
      db.exec("BEGIN IMMEDIATE");
      try {
        const prior = db.prepare("SELECT body FROM publications WHERE key=?").get(positionKey);
        if (prior) {
          const record = decode(String(prior["body"]), key);
          if (record.publicationId !== publicationId)
            throw new Error("Position already has a different publication record");
          db.exec("COMMIT");
          return record;
        }
        const value = { ...observed, publicationId };
        const record: FeedPublication = { ...value, recordId: hash(payload(value)) };
        db.prepare("INSERT INTO publications VALUES(?,?)").run(positionKey, JSON.stringify(record));
        db.exec("COMMIT");
        return Object.freeze(record);
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    },
    close: () => db.close(),
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

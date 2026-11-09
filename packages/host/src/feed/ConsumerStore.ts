import { assertDurableFlush } from "./DurableFlush.js";
import { DatabaseSync } from "node:sqlite";
import { createHash } from "node:crypto";
import {
  feedBytes,
  type ConsumerStore,
  type FeedCursor,
  type FeedPage,
  type AffectedSubject,
  type FeedCrashPoint,
} from "@triplex-build/triplex/feed";

// [EXP-FD01] Why: Q98b moves durability off the source's serial writer; Q84a supplies host durability.
// Rejected: JSONL effects plus a separate checkpoint (the X3 after-effect crash duplicates effects).
export class SqliteConsumerStore implements ConsumerStore {
  readonly durability: ReturnType<typeof assertDurableFlush>;
  private readonly db: DatabaseSync;
  private readonly lock: DatabaseSync;
  constructor(file: string) {
    if (!file || file === ":memory:") throw new Error("ConsumerStore requires a durable host file");
    this.durability = assertDurableFlush(file);
    this.db = new DatabaseSync(file);
    this.lock = new DatabaseSync(file + ".lock");
    try {
      this.lock.exec(`PRAGMA synchronous=FULL; PRAGMA fullfsync=ON; PRAGMA checkpoint_fullfsync=ON;
        PRAGMA wal_autocheckpoint=0; PRAGMA journal_size_limit=16777216;
        PRAGMA locking_mode=EXCLUSIVE; BEGIN EXCLUSIVE; COMMIT;`);
      const version = String(this.db.prepare("SELECT sqlite_version() v").get()!["v"])
        .split(".")
        .map(Number);
      if (
        version[0]! < 3 ||
        (version[0] === 3 && (version[1]! < 51 || (version[1] === 51 && version[2]! < 3)))
      )
        throw new Error("SQLite >= 3.51.3 required");
      this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA fullfsync=ON;
        PRAGMA checkpoint_fullfsync=ON; PRAGMA wal_autocheckpoint=0;
        PRAGMA journal_size_limit=16777216; PRAGMA locking_mode=NORMAL; PRAGMA busy_timeout=5000;
        CREATE TABLE IF NOT EXISTS checkpoints(consumer TEXT PRIMARY KEY, source TEXT NOT NULL, token TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS effects(consumer TEXT NOT NULL, epoch TEXT NOT NULL, position TEXT NOT NULL, subject TEXT NOT NULL, PRIMARY KEY(consumer,epoch,position,subject));
        CREATE TABLE IF NOT EXISTS affected(consumer TEXT NOT NULL, epoch TEXT NOT NULL, position TEXT NOT NULL, subject TEXT NOT NULL, PRIMARY KEY(consumer,epoch,position,subject));
        CREATE TABLE IF NOT EXISTS frontier(consumer TEXT PRIMARY KEY, stream TEXT NOT NULL, epoch TEXT NOT NULL, offset TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS deliveries(consumer TEXT NOT NULL, stream TEXT NOT NULL, epoch TEXT NOT NULL, offset TEXT NOT NULL, digest TEXT NOT NULL, PRIMARY KEY(consumer,stream,epoch,offset));`);
      const configured = this.pragmas();
      const required = {
        journal_mode: "wal",
        synchronous: 2,
        fullfsync: 1,
        checkpoint_fullfsync: 1,
        wal_autocheckpoint: 0,
        journal_size_limit: 16777216,
        locking_mode: "normal",
      };
      for (const [name, value] of Object.entries(required))
        if (configured[name] !== value) throw new Error(`ConsumerStore pragma refused: ${name}`);
    } catch (error) {
      this.db.close();
      this.lock.close();
      throw error;
    }
  }
  checkpoint(consumer: string): FeedCursor | null {
    const row = this.db
      .prepare("SELECT source, token FROM checkpoints WHERE consumer=?")
      .get(consumer);
    return row ? { source: String(row["source"]), token: String(row["token"]) } : null;
  }
  apply(
    consumer: string,
    expected: FeedCursor | null,
    page: FeedPage,
    affected: readonly AffectedSubject[],
    crash?: (point: FeedCrashPoint) => void,
  ): void {
    if (!consumer || !page.cursor.source) throw new Error("Missing consumer/source binding");
    if (expected && expected.source !== page.cursor.source)
      throw new Error("Consumer source mismatch");
    const positions = new Set(
      page.entries.flatMap((e) =>
        e.kind === "commit"
          ? e.transactions.flatMap((t) => t.positions.map((p) => JSON.stringify([e.epoch, p])))
          : [],
      ),
    );
    const digests = page.entries.map((e) =>
      createHash("sha256").update(feedBytes(e)).digest("hex"),
    );
    for (const a of affected)
      if (!a.subject || !positions.has(JSON.stringify([a.epoch, a.position])))
        throw new Error("Affected subject outside page");
    this.db.exec("BEGIN IMMEDIATE");
    let committed = false;
    try {
      if (JSON.stringify(this.checkpoint(consumer)) !== JSON.stringify(expected))
        throw new Error("Stale consumer checkpoint");
      const row = this.db
        .prepare("SELECT stream,epoch,offset FROM frontier WHERE consumer=?")
        .get(consumer);
      const latest = row
        ? {
            stream: String(row["stream"]),
            epoch: String(row["epoch"]),
            offset: String(row["offset"]),
          }
        : undefined;
      const compare = (
        a: { epoch: string; offset: string },
        b: { epoch: string; offset: string },
      ) =>
        BigInt(a.epoch) === BigInt(b.epoch)
          ? BigInt(a.offset) < BigInt(b.offset)
            ? -1
            : BigInt(a.offset) > BigInt(b.offset)
              ? 1
              : 0
          : BigInt(a.epoch) < BigInt(b.epoch)
            ? -1
            : 1;
      let previous: typeof latest;
      for (const e of page.entries) {
        if (
          (latest && latest.stream !== e.stream) ||
          (previous && (previous.stream !== e.stream || compare(previous, e) >= 0))
        )
          throw new Error("Consumer stream/order mismatch");
        previous = e;
      }
      if (
        latest &&
        previous &&
        compare(previous, latest) <= 0 &&
        expected?.token !== page.cursor.token
      )
        throw new Error("Checkpoint would regress or move without a new resolution");
      crash?.("before-effect");
      for (let i = 0; i < page.entries.length; i++) {
        const e = page.entries[i]!;
        const prior = this.db
          .prepare(
            "SELECT digest FROM deliveries WHERE consumer=? AND stream=? AND epoch=? AND offset=?",
          )
          .get(consumer, e.stream, e.epoch, e.offset);
        if (prior && prior["digest"] !== digests[i]) throw new Error("Feed resume bytes changed");
        this.db
          .prepare("INSERT OR IGNORE INTO deliveries VALUES(?,?,?,?,?)")
          .run(consumer, e.stream, e.epoch, e.offset, digests[i]!);
      }
      for (const a of affected) {
        for (const table of ["effects", "affected"])
          this.db
            .prepare(`INSERT OR IGNORE INTO ${table} VALUES(?,?,?,?)`)
            .run(consumer, a.epoch, a.position, a.subject);
      }
      crash?.("after-effect");
      this.db
        .prepare(
          "INSERT INTO checkpoints VALUES(?,?,?) ON CONFLICT(consumer) DO UPDATE SET token=excluded.token",
        )
        .run(consumer, page.cursor.source, page.cursor.token);
      if (previous && (!latest || compare(previous, latest) > 0))
        this.db
          .prepare(
            "INSERT INTO frontier VALUES(?,?,?,?) ON CONFLICT(consumer) DO UPDATE SET stream=excluded.stream,epoch=excluded.epoch,offset=excluded.offset",
          )
          .run(consumer, previous.stream, previous.epoch, previous.offset);
      this.db.exec("COMMIT");
      committed = true;
      crash?.("after-checkpoint");
    } finally {
      if (!committed) this.db.exec("ROLLBACK");
    }
  }
  effects(consumer: string): readonly AffectedSubject[] {
    return this.db
      .prepare(
        "SELECT epoch,position,subject FROM effects WHERE consumer=? ORDER BY epoch,position,subject",
      )
      .all(consumer)
      .map((r) => ({
        epoch: String(r["epoch"]),
        position: String(r["position"]),
        subject: String(r["subject"]),
      }));
  }
  affected(consumer: string): readonly AffectedSubject[] {
    return this.db
      .prepare(
        "SELECT epoch,position,subject FROM affected WHERE consumer=? ORDER BY epoch,position,subject",
      )
      .all(consumer)
      .map((r) => ({
        epoch: String(r["epoch"]),
        position: String(r["position"]),
        subject: String(r["subject"]),
      }));
  }
  pragmas(): Record<string, unknown> {
    return Object.fromEntries(
      [
        "journal_mode",
        "synchronous",
        "fullfsync",
        "checkpoint_fullfsync",
        "wal_autocheckpoint",
        "journal_size_limit",
        "locking_mode",
      ].map((p) => [p, Object.values(this.db.prepare(`PRAGMA ${p}`).get()!)[0]]),
    );
  }
  close(): void {
    this.db.close();
    this.lock.close();
  }
}

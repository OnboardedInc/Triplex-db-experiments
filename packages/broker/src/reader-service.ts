import { ReadOperationLimit } from "./resource-errors.js";
// [EXP-P2B-R3] Why: indexed source reads execute on their caller's reader thread, never the decider.
// Rejected: proxying each overlay row through the broker event loop (R42 tail feedback).
import Database from "better-sqlite3";
import fs from "node:fs";
import { createHash } from "node:crypto";
import type { TripleRow } from "@triplex-build/triplex/runtime";
import { BasisNotAvailable, type BasisSurface } from "./errors.js";
import { H1BasisUnsupported, type H1Basis, type Selection, type StoreSnapshot } from "./log.js";

export class BrokerWatermark {
  readonly buffer: SharedArrayBuffer;
  private readonly words: BigInt64Array;
  constructor(buffer = new SharedArrayBuffer(128)) {
    if (buffer.byteLength !== 128) throw new Error("Invalid broker watermark buffer");
    this.buffer = buffer;
    this.words = new BigInt64Array(buffer);
  }
  bind(file: string) {
    Atomics.store(this.words, 2, this.identity(file));
  }
  private identity(file: string) {
    const st = fs.statSync(file, { bigint: true });
    return createHash("sha256")
      .update(`${fs.realpathSync(file)}:${st.dev}:${st.ino}`)
      .digest()
      .readBigInt64LE();
  }
  checkFile(file: string) {
    if (Atomics.load(this.words, 2) !== this.identity(file))
      throw new Error("Reader source/watermark file identity mismatch");
  }
  publish(epoch: number, lsn: number, position: number, stamp: number) {
    const next = Atomics.load(this.words, 0) + 1n,
      base = 4 + Number(next % 2n) * 4;
    for (const [i, value] of [epoch, lsn, position, stamp].entries())
      Atomics.store(this.words, base + i, BigInt(value));
    Atomics.store(this.words, 0, next);
  }
  close() {
    Atomics.store(this.words, 1, 1n);
  }
  read() {
    // [EXP-P2B-R3] Why: publish an inactive slot with one atomic generation switch; readers retain the old complete prefix during a write.
    // Rejected: an odd/even writer seqlock (a descheduled writer would make readers wait or refuse).
    for (let attempt = 0; attempt < 1000; attempt++) {
      if (Atomics.load(this.words, 1)) throw new Error("Broker watermark is closed");
      const before = Atomics.load(this.words, 0),
        base = 4 + Number(before % 2n) * 4;
      const epoch = Number(Atomics.load(this.words, base)),
        lsn = Number(Atomics.load(this.words, base + 1)),
        position = Number(Atomics.load(this.words, base + 2)),
        stamp = Number(Atomics.load(this.words, base + 3));
      if (before === Atomics.load(this.words, 0)) return { epoch, lsn, position, stamp };
    }
    throw new Error("Broker watermark changed repeatedly");
  }
}

export class BrokerReadService {
  private readonly db: Database.Database;
  readonly watermark: BrokerWatermark;
  readonly costs = { calls: 0, cpuUs: 0, maxMs: 0, walBytes: 0 };
  constructor(
    readonly file: string,
    buffer: SharedArrayBuffer,
  ) {
    this.watermark = new BrokerWatermark(buffer);
    this.watermark.checkFile(file);
    this.db = new Database(file, { readonly: true, fileMustExist: true, timeout: 0 });
    this.db.pragma("query_only=ON");
  }
  head = () => this.watermark.read().position;
  recordInstant = () => {
    const stamp = this.watermark.read().stamp;
    return stamp < 0 ? undefined : stamp / 1000;
  };
  awaitResolved = async (basis: number, _deadline = 0, surface: BasisSurface = "repository") => {
    const observed = this.head();
    if (!Number.isSafeInteger(basis) || basis < 0 || basis > observed)
      throw new BasisNotAvailable({
        required: basis,
        observed,
        replica: "sqlite-reader",
        surface,
        waitedMs: 0,
      });
  };
  private readRows(
    selection: Selection,
    sources: readonly { table: string; where: string; args: number[] }[],
  ) {
    this.watermark.checkFile(this.file);
    const start = performance.now(),
      cpu = process.threadCpuUsage(),
      published = this.watermark.read();
    try {
      // [EXP-P2B-R4] Why: a JS pause after a completed marker probe must retain no SQLite read transaction.
      // Rejected: BEGIN around marker plus rows (a logical pin would retain WAL while its worker is descheduled).
      const probe = this.db
        .prepare("SELECT lsn,epoch,h,position,crc,size FROM marker WHERE id=1")
        .get() as StoreSnapshot;
      if (probe.epoch !== published.epoch)
        throw new Error("Reader source/watermark epoch or prefix mismatch");
      const values: (string | number)[] = [],
        clauses: string[] = [];
      for (const source of sources) {
        const predicates = [source.where];
        values.push(...source.args);
        if (selection.id !== undefined) {
          predicates.push("id=?");
          values.push(selection.id);
        }
        if (selection.entities !== undefined) {
          if (!selection.entities.length) predicates.push("0");
          else {
            predicates.push(`entity IN (${selection.entities.map(() => "?").join(",")})`);
            values.push(...selection.entities);
          }
        }
        clauses.push(`SELECT row FROM ${source.table} WHERE ${predicates.join(" AND ")}`);
      }
      // [EXP-P2B-R4] Why: one native all() establishes and releases the snapshot before any caller JS runs.
      // Rejected: an iterator or callback per row (can leave a transaction open across caller scheduling).
      const result = this.db
        .prepare(
          `SELECT 'marker' kind,json_object('lsn',lsn,'epoch',epoch,'h',h,'position',position,'crc',crc,'size',size) payload FROM marker WHERE id=1 UNION ALL SELECT 'row',row FROM (${clauses.join(" UNION ALL ")} LIMIT 4097)`,
        )
        .all(...values) as { kind: string; payload: string }[];
      const marker = JSON.parse(result[0]!.payload) as StoreSnapshot;
      if (marker.epoch !== published.epoch || marker.lsn < published.lsn)
        throw new Error("Reader source/watermark epoch or prefix mismatch");
      const bytes = result.reduce((n, r) => n + Buffer.byteLength(r.payload), 0);
      if (result.length > 4097 || bytes > 8 * 1024 * 1024 || performance.now() - start > 250)
        throw new ReadOperationLimit(
          "Source operation exceeded 4096 rows, 8 MiB response or 250 ms elapsed; retry the same position",
        );
      return { marker, rows: result.slice(1).map((r) => JSON.parse(r.payload) as TripleRow) };
    } finally {
      const used = process.threadCpuUsage(cpu);
      this.costs.calls++;
      this.costs.cpuUs += used.user + used.system;
      this.costs.maxMs = Math.max(this.costs.maxMs, performance.now() - start);
      if (fs.existsSync(this.file + "-wal"))
        this.costs.walBytes = Math.max(this.costs.walBytes, fs.statSync(this.file + "-wal").size);
    }
  }
  fromLogAsync = async (
    position: number,
    selection: Selection,
    select: (row: TripleRow) => boolean,
  ) =>
    this.readRows(selection, [
      { table: "recent_rows", where: "lsn>?", args: [Math.floor(position / 1024)] },
    ]).rows.filter(select);
  // [EXP-P2B-R4] Why: this branch's recent_rows is retained history of record; retirement purge cannot erase an old logical cut.
  // Rejected: importing HS01's unfinished compact layout or holding an SQLite snapshot for a pin lease.
  overlayAsync = this.fromLogAsync;
  pullAt = async (basis: H1Basis, selection: Selection) => {
    if (typeof basis !== "number" && basis.recordedAt !== undefined) throw new H1BasisUnsupported();
    const b = typeof basis === "number" ? basis : basis.recordedPosition;
    await this.awaitResolved(b);
    const { marker, rows } = this.readRows(selection, [
      { table: "live_rows", where: "pos<=?", args: [b] },
      { table: "retired_rows", where: "rpos>? AND pos<=?", args: [b, b] },
    ]);
    return { snapshot: marker, basis: b, eligible: b >= marker.h, rows: b < marker.h ? [] : rows };
  };
  close() {
    this.db.close();
  }
}

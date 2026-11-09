/**
 * The change feed is the host log itself (EXP-P2Q brief point 5; R17 section 3; TARGETS 1.1 P3).
 *
 * R17 3.2 measured the host log as a feed with zero gaps, zero per-subject order violations and exact resume
 * after `kill -9`, and found one hazard: a tailing consumer sees a frame about 3 ms before the producer's
 * fsync returns. So the feed returns frames only up to the durable watermark the broker publishes after each
 * fsync (log.ts `publishWatermark`), never every byte that is visible in the file.
 *
 * Each commit frame resolves to transacts carrying position, epoch, LSN, operation, transaction ids, command
 * ids, subjects and per-fact (op, entity, attribute, valid-from, valid-to, position): TARGETS 3's "entity,
 * attribute and valid-time range affected" is a property of the frame. EPOCH_BEGIN frames resolve to an
 * epoch change plus the LSNs it burned, listed as aborted (RULINGS Q31c: aborted offsets are accounted in
 * the feed's resolution stream).
 *
 * Consumers (`FeedConsumerStore`) checkpoint (LSN, byte offset, chain CRC) and key their effects by
 * (consumer, position, subject), so at-least-once redelivery from the last checkpoint is idempotent
 * (TARGETS 1.1 P3 item 5). Two durability modes, as in EXP-P2X:
 * - atomic: one record holding the affected-subject set and the new checkpoint, written and fsynced once
 *   (TARGETS 1.1 P3 item 4, "in one durable write");
 * - split: effects appended and fsynced, then the checkpoint written tmp + fsync + rename (brief point 5),
 *   which opens the crash window "after the effect, before the checkpoint" that keys must close.
 */
import fs from "node:fs";
import path from "node:path";
import type { TripleRow } from "@triplex-build/triplex/runtime";
import { FrameKind } from "./frame.js";
import { decodeCommitGroup } from "./frames.js";
import { readFramesFrom, readWatermark, segmentStart, type EpochBeginPayload, type Watermark } from "./log.js";
import { crc32c } from "./crc32c.js";

export interface FeedChange {
  readonly op: "assert" | "retract";
  readonly entity: string;
  readonly attribute: string;
  readonly validFrom: number;
  readonly validTo: number | null;
  readonly position: number;
}
export interface FeedTransact {
  readonly position: number;
  readonly positions: readonly number[];
  readonly operationId: string;
  readonly txIds: readonly string[];
  readonly commandIds: readonly string[];
  readonly subjects: readonly string[];
  readonly changes: readonly FeedChange[];
}
export type FeedResolution =
  | { readonly kind: "commit"; readonly lsn: number; readonly epoch: number; readonly transacts: readonly FeedTransact[] }
  | { readonly kind: "epoch"; readonly lsn: number; readonly epoch: number; readonly previousEpoch: number }
  | { readonly kind: "aborted"; readonly lsn: number; readonly epoch: number };
export interface FeedCursor {
  /** Every LSN at or below this one has been delivered. */
  readonly lsn: number;
  readonly offset: number;
  readonly seed: number;
  readonly nextLsn: number;
}
export interface FeedPage {
  readonly resolutions: readonly FeedResolution[];
  readonly cursor: FeedCursor;
  readonly watermark: Watermark | undefined;
}

const isJournalRow = (row: TripleRow) => row.entity_type === "_Transaction" && row.entity_id === row.tx_id;

export class LogFeed {
  readonly segmentPath: string;
  constructor(readonly dir: string) {
    this.segmentPath = path.join(dir, "segment-000001.log");
  }
  /** A cursor before the first frame. */
  start(): FeedCursor {
    const start = segmentStart(this.segmentPath);
    return { lsn: start.nextLsn - 1, ...start };
  }
  watermark(): Watermark | undefined {
    return readWatermark(this.dir);
  }
  /** Frames after the cursor up to the durable watermark, resolved (bounded by `maxBytes` read). */
  poll(cursor: FeedCursor, options: { readonly maxBytes?: number } = {}): FeedPage {
    const watermark = readWatermark(this.dir);
    if (!watermark || watermark.lsn <= cursor.lsn) return { resolutions: [], cursor, watermark };
    const { frames, next } = readFramesFrom(
      this.segmentPath,
      { offset: cursor.offset, seed: cursor.seed, nextLsn: cursor.nextLsn },
      watermark.lsn,
      options.maxBytes ?? 8 * 1024 * 1024,
    );
    const resolutions: FeedResolution[] = [];
    for (const frame of frames) {
      if (frame.kind === FrameKind.EPOCH_BEGIN) {
        const begin = JSON.parse(frame.payload.toString("utf8")) as EpochBeginPayload;
        for (const lsn of begin.abortedLsns) resolutions.push({ kind: "aborted", lsn, epoch: begin.previousEpoch });
        resolutions.push({ kind: "epoch", lsn: frame.lsn, epoch: frame.epoch, previousEpoch: begin.previousEpoch });
        continue;
      }
      if (frame.kind !== FrameKind.COMMIT_GROUP) continue;
      const payload = decodeCommitGroup(frame.payload);
      resolutions.push({
        kind: "commit",
        lsn: frame.lsn,
        epoch: frame.epoch,
        transacts: payload.members.map((member) => {
          const own = new Set(member.positions);
          const changes: FeedChange[] = [];
          const txIds = new Set<string>();
          for (const row of member.rows) {
            if (row.tx_id !== null && own.has(row.recorded_position)) txIds.add(row.tx_id);
            if (isJournalRow(row)) continue;
            const base = { entity: row.entity_id, attribute: row.attribute, validFrom: row.valid_from, validTo: row.valid_to };
            if (own.has(row.recorded_position)) changes.push({ op: "assert", ...base, position: row.recorded_position });
            if (row.retracted_position !== null && own.has(row.retracted_position))
              changes.push({ op: "retract", ...base, position: row.retracted_position });
          }
          return {
            position: member.positions[0]!,
            positions: member.positions,
            operationId: member.operationId,
            txIds: [...txIds],
            commandIds: member.claims.map((claim) => claim.commandId),
            subjects: member.subjects,
            changes,
          };
        }),
      });
    }
    const last = frames[frames.length - 1];
    return {
      resolutions,
      cursor: last ? { lsn: last.lsn, offset: next.offset, seed: next.seed, nextLsn: next.nextLsn } : cursor,
      watermark,
    };
  }
}

export interface ConsumerEffect {
  readonly position: number;
  readonly subject: string;
}
export type ConsumerMode = "atomic" | "split";

const fsyncDir = (dir: string) => {
  const fd = fs.openSync(dir, "r");
  try {
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
};
/** One framed journal line: crc32c hex, a space, JSON. A torn last line fails its CRC and is ignored. */
const line = (value: unknown) => {
  const json = JSON.stringify(value);
  return `${crc32c(Buffer.from(json)).toString(16).padStart(8, "0")} ${json}\n`;
};
const parseLines = <T>(text: string): T[] => {
  const out: T[] = [];
  for (const raw of text.split("\n")) {
    if (raw.length < 10) continue;
    const json = raw.slice(9);
    if (crc32c(Buffer.from(json)).toString(16).padStart(8, "0") !== raw.slice(0, 8)) continue;
    out.push(JSON.parse(json) as T);
  }
  return out;
};

/**
 * A consumer's durable state on the host: its effects keyed by (consumer, position, subject) and its
 * checkpoint. `keyed: false` is the control arm: it appends every delivered effect, so a replay after a crash
 * between effect and checkpoint shows up as a visible duplicate (the test must be able to fail).
 */
export class FeedConsumerStore {
  private readonly keys = new Set<string>();
  private readonly journal: string;
  private readonly checkpointFile: string;
  private cursor: FeedCursor | undefined;
  private fd: number;
  replayAttempts = 0;
  constructor(
    readonly dir: string,
    readonly consumer: string,
    readonly mode: ConsumerMode,
    readonly keyed: boolean,
  ) {
    fs.mkdirSync(dir, { recursive: true });
    this.journal = path.join(dir, `${consumer}.effects`);
    this.checkpointFile = path.join(dir, `${consumer}.checkpoint`);
    if (fs.existsSync(this.journal)) {
      // A record torn by a crash mid-write has no trailing newline; cut it before appending, or the next
      // record would be glued onto it and lost with it (the log's torn-tail rule, R13 2.4, applied here).
      const bytes = fs.readFileSync(this.journal);
      const end = bytes.lastIndexOf(0x0a) + 1;
      if (end < bytes.length) {
        const fd = fs.openSync(this.journal, "r+");
        fs.ftruncateSync(fd, end);
        fs.fsyncSync(fd);
        fs.closeSync(fd);
      }
    }
    const records = fs.existsSync(this.journal)
      ? parseLines<{ c: string; e: [number, string][]; k?: FeedCursor }>(fs.readFileSync(this.journal, "utf8"))
      : [];
    for (const record of records) {
      for (const [position, subject] of record.e) this.keys.add(`${position}|${subject}`);
      if (mode === "atomic" && record.k) this.cursor = record.k;
    }
    if (mode === "split" && fs.existsSync(this.checkpointFile))
      this.cursor = JSON.parse(fs.readFileSync(this.checkpointFile, "utf8")) as FeedCursor;
    this.fd = fs.openSync(this.journal, "a");
  }
  checkpoint(): FeedCursor | undefined {
    return this.cursor;
  }
  private filter(effects: readonly ConsumerEffect[]): ConsumerEffect[] {
    if (!this.keyed) return [...effects];
    const fresh: ConsumerEffect[] = [];
    for (const effect of effects) {
      const k = `${effect.position}|${effect.subject}`;
      if (this.keys.has(k)) this.replayAttempts++;
      else fresh.push(effect);
    }
    return fresh;
  }
  /**
   * Durably record effects and, in atomic mode, the checkpoint in the same write. `tear` writes only part of
   * the record (a crash mid-write) and returns without fsync; the torn line is ignored on reload.
   */
  recordEffects(effects: readonly ConsumerEffect[], cursor: FeedCursor, options: { readonly tear?: boolean } = {}): number {
    const fresh = this.filter(effects);
    const record = { c: this.consumer, e: fresh.map((e) => [e.position, e.subject]), ...(this.mode === "atomic" ? { k: cursor } : {}) };
    if (this.mode === "split" && fresh.length === 0) return 0;
    const bytes = Buffer.from(line(record));
    if (options.tear) {
      fs.writeSync(this.fd, bytes, 0, Math.max(1, Math.floor(bytes.length / 2)));
      return fresh.length;
    }
    fs.writeSync(this.fd, bytes);
    fs.fsyncSync(this.fd);
    for (const effect of fresh) this.keys.add(`${effect.position}|${effect.subject}`);
    if (this.mode === "atomic") this.cursor = cursor;
    return fresh.length;
  }
  /** Split mode: tmp + fsync + rename + fsync(dir) (R13 2.6: fsync the directory after every rename). */
  writeCheckpoint(cursor: FeedCursor): void {
    if (this.mode === "atomic") return;
    const tmp = `${this.checkpointFile}.tmp`;
    const fd = fs.openSync(tmp, "w");
    try {
      fs.writeSync(fd, JSON.stringify(cursor));
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
    fs.renameSync(tmp, this.checkpointFile);
    fsyncDir(this.dir);
    this.cursor = cursor;
  }
  close(): void {
    fs.closeSync(this.fd);
  }
}

/** Audit a consumer's durable effects: key -> count, for gaps, extras and visible duplicates. */
export const readConsumerEffects = (dir: string, consumer: string): Map<string, number> => {
  const file = path.join(dir, `${consumer}.effects`);
  const counts = new Map<string, number>();
  if (!fs.existsSync(file)) return counts;
  for (const record of parseLines<{ e: [number, string][] }>(fs.readFileSync(file, "utf8")))
    for (const [position, subject] of record.e) {
      const k = `${position}|${subject}`;
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
  return counts;
};

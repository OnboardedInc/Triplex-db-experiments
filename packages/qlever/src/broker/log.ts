/**
 * The host log of record (EXP-P2Q; R13 sections 2 and 6, PLAN C2 and C3).
 *
 * One directory per broker stream:
 *   LOCK                  pid lock for the broker's whole life (see `acquireLock` for its limits)
 *   segment-000001.log    the single segment (rotation is out of scope for this experiment)
 *   WATERMARK             32 bytes: the durable watermark, rewritten in place after every fsync
 *   broken-*.bin          bytes cut from a torn tail, kept before truncation (etcd `Repair` style)
 *
 * Durability (R13 2.1, 3.4): `FileHandle.sync()` is `fcntl(F_FULLFSYNC)` on macOS (libuv 1.51), measured
 * 2.9 ms per append on this host, and the fsync return is the irrevocable decision (C2). O_DSYNC and
 * O_SYNC are 0.02 ms on macOS (not durable) and are never used. Any write or fsync error marks the log
 * failed and every later append throws: never retry an fsync on the same descriptor (R13 1.3, fsyncgate).
 */
import fs from "node:fs";
import path from "node:path";
import {
  FrameKind,
  SEGMENT_HEADER_LEN,
  encodeFrame,
  encodeSegmentHeader,
  framePayload,
  scanSegment,
  segmentSeed,
  type ScannedFrame,
} from "./frame.js";
import { crc32c } from "./crc32c.js";

export class BrokerLogError extends Error {
  readonly _tag = "BrokerLogError";
}

export interface LogFrame {
  readonly lsn: number;
  readonly epoch: number;
  readonly kind: number;
  readonly offset: number;
  readonly end: number;
  readonly crc: number;
  readonly payload: Buffer;
}
export interface EpochBeginPayload {
  readonly v: 1;
  readonly epoch: number;
  readonly previousEpoch: number;
  readonly lastValidLsn: number;
  /** LSNs burned at this epoch change (the torn in-flight frame), listed as aborted by the feed. */
  readonly abortedLsns: readonly number[];
  readonly tornBytes: number;
  readonly at: number;
}
export interface OpenedLog {
  readonly log: HostLog;
  /** Every valid frame, in LSN order, including the EPOCH_BEGIN this open wrote. */
  readonly frames: readonly LogFrame[];
  readonly recovery: {
    readonly status: "created" | "clean-end" | "torn-tail";
    readonly tornBytes: number;
    readonly abortedLsns: readonly number[];
    readonly brokenFile?: string;
    readonly fsyncCalibrationMs: number;
  };
}
export interface Watermark {
  readonly epoch: number;
  readonly lsn: number;
  readonly position: number;
}

const SEGMENT = "segment-000001.log";
const WATERMARK_MAGIC = 0x4d575854; // 'TXWM'
const fsyncDir = (dir: string) => {
  const fd = fs.openSync(dir, "r");
  try {
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
};

/**
 * Take the stream's LOCK file. Why a pid file rather than a kernel lock: Node has no flock/lockf without a
 * native addon (R13 8 item 7 leaves the helper open). Safety does not rest on it: the marker guard
 * `(broker_position, broker_epoch)` in every QLever update fences a second writer at the resource, which is
 * what makes Datomic's and Kafka's designs safe (R13 1.1 item 3, 5.1). A lock held by this same process is
 * taken over, because the tests simulate a crash by abandoning a broker object and reopening its directory.
 */
const acquireLock = (dir: string) => {
  const file = path.join(dir, "LOCK");
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      fs.writeFileSync(file, `${process.pid}\n`, { flag: "wx" });
      fsyncDir(dir);
      return;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      const holder = Number(fs.readFileSync(file, "utf8").trim());
      let alive = false;
      if (Number.isSafeInteger(holder) && holder > 0 && holder !== process.pid)
        try {
          process.kill(holder, 0);
          alive = true;
        } catch {
          alive = false;
        }
      if (alive) throw new BrokerLogError(`Broker log ${dir} is locked by live pid ${holder}`);
      fs.rmSync(file, { force: true });
    }
  }
  throw new BrokerLogError(`Cannot take broker log lock in ${dir}`);
};

/**
 * Startup check (R13 6.3 item 6): a median fsync under about 1 ms on macOS means F_FULLFSYNC is not in
 * effect (plain fsync is 0.02 ms), for example on a virtiofs or network volume. The result is reported in
 * every receipt; `requireFullFsync` turns a fast median into a refusal.
 */
const calibrate = (dir: string, samples = 12): number => {
  const file = path.join(dir, ".fsync-calibration");
  const fd = fs.openSync(file, "w");
  const times: number[] = [];
  try {
    const block = Buffer.alloc(1024, 7);
    for (let i = 0; i < samples; i++) {
      fs.writeSync(fd, block);
      const t0 = performance.now();
      fs.fsyncSync(fd);
      times.push(performance.now() - t0);
    }
  } finally {
    fs.closeSync(fd);
    fs.rmSync(file, { force: true });
  }
  times.sort((a, b) => a - b);
  return times[Math.floor(times.length / 2)]!;
};

export class HostLog {
  private failed: Error | undefined;
  private writing = false;
  private closed = false;
  private constructor(
    readonly dir: string,
    private readonly handle: fs.promises.FileHandle,
    private readonly watermarkFd: number,
    public epoch: number,
    public nextLsn: number,
    private prevCrc: number,
    private size: number,
  ) {}

  /**
   * Open (or create) a stream directory and recover it (R13 6.5 startup steps 1 to 4): take the lock,
   * scan the segment, back up and truncate a torn tail, refuse to start on corruption, then append and
   * fsync EPOCH_BEGIN(E+1). After a torn tail the EPOCH_BEGIN burns the in-flight LSN (frame.ts).
   */
  static async open(
    dir: string,
    options: { readonly minFreeBytes?: number; readonly requireFullFsync?: boolean } = {},
  ): Promise<OpenedLog> {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    acquireLock(dir);
    // R13 2.6: ENOSPC mid-frame is the one torn write the broker causes itself, so refuse below a floor.
    const stats = fs.statfsSync(dir);
    const free = stats.bavail * stats.bsize;
    if (free < (options.minFreeBytes ?? 2 * 1024 ** 3))
      throw new BrokerLogError(`Broker log volume has ${free} bytes free, below the floor`);
    const fsyncCalibrationMs = calibrate(dir);
    if (options.requireFullFsync && process.platform === "darwin" && fsyncCalibrationMs < 1)
      throw new BrokerLogError(`fsync median ${fsyncCalibrationMs} ms: F_FULLFSYNC is not in effect`);
    const file = path.join(dir, SEGMENT);
    let status: OpenedLog["recovery"]["status"] = "created";
    let tornBytes = 0;
    let brokenFile: string | undefined;
    if (!fs.existsSync(file)) {
      const header = encodeSegmentHeader({ epoch: 0, firstLsn: 1 });
      const fd = fs.openSync(file, "wx");
      fs.writeSync(fd, header);
      fs.fsyncSync(fd);
      fs.closeSync(fd);
      fsyncDir(dir);
    }
    const bytes = fs.readFileSync(file);
    const scan = scanSegment(bytes);
    if (scan.status === "bad-header" || scan.status === "corruption")
      throw new BrokerLogError(`Broker log ${file}: ${scan.status} (${scan.detail ?? ""}); refusing to start`);
    if (scan.frames.length > 0 || bytes.length > SEGMENT_HEADER_LEN) status = "clean-end";
    if (scan.status === "torn-tail" && scan.validEnd < bytes.length) {
      status = "torn-tail";
      tornBytes = bytes.length - scan.validEnd;
      brokenFile = path.join(dir, `broken-lsn${scan.nextLsn}-${Date.now()}.bin`);
      fs.writeFileSync(brokenFile, bytes.subarray(scan.validEnd));
      const fd = fs.openSync(file, "r+");
      fs.ftruncateSync(fd, scan.validEnd);
      fs.fsyncSync(fd);
      fs.closeSync(fd);
      fsyncDir(dir);
    }
    const frames: LogFrame[] = scan.frames.map((frame: ScannedFrame) => ({
      lsn: frame.lsn,
      epoch: frame.epoch,
      kind: frame.kind,
      offset: frame.offset,
      end: frame.end,
      crc: frame.payloadCrc,
      payload: Buffer.from(framePayload(bytes, frame)),
    }));
    const lastEpoch = frames.length ? frames[frames.length - 1]!.epoch : scan.header!.epoch;
    const prevCrc = frames.length ? frames[frames.length - 1]!.crc : segmentSeed(bytes);
    const handle = await fs.promises.open(file, "a");
    const watermarkPath = path.join(dir, "WATERMARK");
    const watermarkFd = fs.openSync(watermarkPath, fs.existsSync(watermarkPath) ? "r+" : "w+");
    const log = new HostLog(dir, handle, watermarkFd, lastEpoch, scan.nextLsn, prevCrc, scan.validEnd);
    const abortedLsns = status === "torn-tail" ? [scan.nextLsn] : [];
    const begin: EpochBeginPayload = {
      v: 1,
      epoch: lastEpoch + 1,
      previousEpoch: lastEpoch,
      lastValidLsn: scan.nextLsn - 1,
      abortedLsns,
      tornBytes,
      at: Date.now(),
    };
    log.epoch = lastEpoch + 1;
    if (abortedLsns.length) log.nextLsn += 1;
    frames.push(await log.append(FrameKind.EPOCH_BEGIN, Buffer.from(JSON.stringify(begin))));
    fsyncDir(dir);
    return {
      log,
      frames,
      recovery: {
        status,
        tornBytes,
        abortedLsns,
        ...(brokenFile === undefined ? {} : { brokenFile }),
        fsyncCalibrationMs,
      },
    };
  }

  get segmentPath(): string {
    return path.join(this.dir, SEGMENT);
  }
  get failure(): Error | undefined {
    return this.failed;
  }

  /**
   * Append one frame and fsync it. One frame per commit group and one fsync per frame (R13 6.3 item 1);
   * the caller never starts frame k+1 before frame k's fsync returned, which is what makes the torn-tail
   * classification sound. `sync: false` is only for APPLIED_HINT, which rides the next fsync (R13 6.3 item 4).
   */
  async append(kind: number, payload: Buffer, options: { readonly sync?: boolean } = {}): Promise<LogFrame> {
    if (this.failed) throw this.failed;
    if (this.closed) throw new BrokerLogError("Broker log is closed");
    if (this.writing) throw new BrokerLogError("Broker log append while another append is in flight");
    this.writing = true;
    const lsn = this.nextLsn;
    const { bytes, crc } = encodeFrame({ lsn, epoch: this.epoch, kind, payload, prevCrc: this.prevCrc });
    try {
      let written = 0;
      while (written < bytes.length) {
        const result = await this.handle.write(bytes, written, bytes.length - written);
        written += result.bytesWritten;
      }
      if (options.sync !== false) await this.handle.sync();
    } catch (cause) {
      this.failed = new BrokerLogError(`Broker log write or fsync failed; fail-stop: ${String(cause)}`);
      throw this.failed;
    } finally {
      this.writing = false;
    }
    const offset = this.size;
    this.size += bytes.length;
    this.prevCrc = crc;
    this.nextLsn = lsn + 1;
    return { lsn, epoch: this.epoch, kind, offset, end: this.size, crc, payload };
  }

  /**
   * Publish the durable watermark for out-of-process readers (the feed consumer). It is written only after
   * the fsync that made the frame durable and is never fsynced itself: after a crash it can only be at or
   * below what the log holds, and the log, not this file, is the truth (R17 3.1 item 2: a tailer must read
   * only up to a durable watermark).
   */
  publishWatermark(mark: Watermark): void {
    const out = Buffer.alloc(32);
    out.writeUInt32LE(WATERMARK_MAGIC, 0);
    out.writeUInt32LE(mark.epoch >>> 0, 4);
    out.writeBigUInt64LE(BigInt(mark.lsn), 8);
    out.writeBigUInt64LE(BigInt(mark.position), 16);
    out.writeUInt32LE(crc32c(out, 0, 0, 24), 24);
    fs.writeSync(this.watermarkFd, out, 0, 32, 0);
  }

  /** Abandon without releasing the lock or writing anything: a simulated crash for tests. */
  async abandon(): Promise<void> {
    this.closed = true;
    await this.handle.close().catch(() => {});
    try {
      fs.closeSync(this.watermarkFd);
    } catch {
      /* already closed */
    }
  }
  async close(): Promise<void> {
    if (this.closed) return;
    await this.abandon();
    fs.rmSync(path.join(this.dir, "LOCK"), { force: true });
  }
}

/** Read the published durable watermark of a stream directory (out-of-process readers). */
export const readWatermark = (dir: string): Watermark | undefined => {
  let buf: Buffer;
  try {
    buf = fs.readFileSync(path.join(dir, "WATERMARK"));
  } catch {
    return undefined;
  }
  if (buf.length < 32 || buf.readUInt32LE(0) !== WATERMARK_MAGIC) return undefined;
  if (crc32c(buf, 0, 0, 24) !== buf.readUInt32LE(24)) return undefined;
  return {
    epoch: buf.readUInt32LE(4),
    lsn: Number(buf.readBigUInt64LE(8)),
    position: Number(buf.readBigUInt64LE(16)),
  };
};

/**
 * Sequential reader of a segment from a byte offset, verifying the CRC chain from a known seed. The feed
 * consumer checkpoints (lsn, offset, crc) so a resumed reader continues the chain exactly (R17 3.4).
 * Frames beyond `uptoLsn` (the durable watermark) are never returned, even when their bytes are visible.
 */
export const readFramesFrom = (
  segmentPath: string,
  from: { readonly offset: number; readonly seed: number; readonly nextLsn: number },
  uptoLsn: number,
  maxBytes = 64 * 1024 * 1024,
): { readonly frames: readonly LogFrame[]; readonly next: { offset: number; seed: number; nextLsn: number } } => {
  const fd = fs.openSync(segmentPath, "r");
  try {
    const size = fs.fstatSync(fd).size;
    let length = Math.min(size - from.offset, maxBytes);
    if (length <= 0) return { frames: [], next: { ...from } };
    if (size - from.offset >= 8) {
      // Always read at least one whole frame, however small the byte budget.
      const head = Buffer.alloc(8);
      fs.readSync(fd, head, 0, 8, from.offset);
      length = Math.min(size - from.offset, Math.max(length, 32 + head.readUInt32LE(4) + 4));
    }
    const buf = Buffer.alloc(length);
    fs.readSync(fd, buf, 0, length, from.offset);
    const frames: LogFrame[] = [];
    let offset = 0;
    let seed = from.seed;
    let expectLsn = from.nextLsn;
    while (offset + 32 <= buf.length) {
      const lsn = Number(buf.readBigUInt64LE(offset + 8));
      if (lsn > uptoLsn) break;
      const payloadLen = buf.readUInt32LE(offset + 4);
      const end = offset + 32 + payloadLen + 4;
      if (end > buf.length) break;
      const kind = buf.readUInt16LE(offset + 24);
      const headerCrc = buf.readUInt32LE(offset + 28);
      if (crc32c(buf, seed, offset, offset + 28) !== headerCrc)
        throw new BrokerLogError(`Feed read: chain mismatch at offset ${from.offset + offset}`);
      if (lsn !== expectLsn && !(kind === FrameKind.EPOCH_BEGIN && lsn === expectLsn + 1))
        throw new BrokerLogError(`Feed read: LSN ${lsn} where ${expectLsn} was expected`);
      const crc = buf.readUInt32LE(offset + 32 + payloadLen);
      if (crc32c(buf, headerCrc, offset + 32, offset + 32 + payloadLen) !== crc)
        throw new BrokerLogError(`Feed read: payload CRC mismatch at LSN ${lsn}`);
      frames.push({
        lsn,
        epoch: buf.readUInt32LE(offset + 16),
        kind,
        offset: from.offset + offset,
        end: from.offset + end,
        crc,
        payload: Buffer.from(buf.subarray(offset + 32, offset + 32 + payloadLen)),
      });
      seed = crc;
      expectLsn = lsn + 1;
      offset = end;
    }
    return { frames, next: { offset: from.offset + offset, seed, nextLsn: expectLsn } };
  } finally {
    fs.closeSync(fd);
  }
};

/** The chain start of a segment: its first frame's offset and seed. */
export const segmentStart = (segmentPath: string): { offset: number; seed: number; nextLsn: number } => {
  const fd = fs.openSync(segmentPath, "r");
  try {
    const header = Buffer.alloc(SEGMENT_HEADER_LEN);
    fs.readSync(fd, header, 0, SEGMENT_HEADER_LEN, 0);
    return { offset: SEGMENT_HEADER_LEN, seed: segmentSeed(header), nextLsn: Number(header.readBigUInt64LE(24)) };
  } finally {
    fs.closeSync(fd);
  }
};

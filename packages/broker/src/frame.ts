/**
 * Log-of-record frame format for the QLever host broker (EXP-P2Q).
 *
 * Ported from R13's reference implementation (`R13-log-durability/scripts/wal.mjs`, R13 section 2.4),
 * which classified all 72,204 truncation points and every single-bit flip in two test frames correctly.
 *
 *   Segment       := SegmentHeader(32) Frame*  [zero padding allowed]
 *   SegmentHeader := "TRPLXLG1"(8) | formatVersion u32 | headerCrc u32 | epoch u64 | firstLsn u64   (LE)
 *                    (format 2; format 1 had flags = 0 there and is accepted only with firstLsn = 1)
 *   Frame         := FrameHeader(32) Payload(payloadLen) PayloadCrc(4)
 *   FrameHeader   := magic u32 'TXLF' | payloadLen u32 | lsn u64 | epoch u32 | prevCrc u32 | kind u16 |
 *                    flags u16 | headerCrc u32
 *   headerCrc  = crc32c(header[0..28), seed = prevCrc)    prevCrc = previous frame's PayloadCrc, or
 *   PayloadCrc = crc32c(payload, seed = headerCrc)        crc32c(segment header) for the first frame
 *
 * Why chained CRC32C (R13 2.4, 2.5): a frame is valid only after its predecessor, so a spliced or swapped
 * frame is rejected, and CRC32C is the checksum etcd, RocksDB and Kafka v2 use for small records. The
 * writer never writes frame k+1 before the fsync of frame k returned, so after a crash at most one frame
 * can be torn and nothing valid can follow it; a valid-looking header after an invalid frame therefore
 * means damage to an acknowledged frame, and the broker refuses to start (R13 2.4 table).
 *
 * One deviation from R13, for RULINGS Q31c: an EPOCH_BEGIN frame written after a torn tail takes LSN
 * `lastValid + 2`, burning the torn frame's LSN. A tailer can see a frame about 3 ms before its fsync
 * returns (R17 3.1 item 2); burning the LSN guarantees that no LSN, and so no packed Triplex position
 * (which omits the epoch, see position.ts), ever names two different frames. The burned LSN is the
 * "abort gap" the feed lists in its resolution stream.
 */
import { crc32c } from "./crc32c.js";

export const SEGMENT_MAGIC = Buffer.from("TRPLXLG1");
export const SEGMENT_HEADER_LEN = 32;
export const FRAME_MAGIC = 0x464c5854; // 'TXLF' little endian
export const FRAME_HEADER_LEN = 32;
export const FRAME_TRAILER_LEN = 4;
export const MAX_PAYLOAD = 256 * 1024 * 1024;
export const FORMAT_VERSION = 2;

/** R13 6.2 frame kinds (SEAL, CHECKPOINT_MARK and BULK_FILE_REF are not used by this experiment). */
export const FrameKind = {
  COMMIT_GROUP: 1,
  EPOCH_BEGIN: 2,
  APPLIED_HINT: 4,
} as const;
export type FrameKind = (typeof FrameKind)[keyof typeof FrameKind];

export interface SegmentHeader {
  readonly formatVersion: number;
  readonly epoch: number;
  readonly firstLsn: number;
}
export interface ScannedFrame {
  readonly offset: number;
  readonly lsn: number;
  readonly epoch: number;
  readonly kind: number;
  readonly flags: number;
  readonly payloadLen: number;
  readonly payloadCrc: number;
  /** Byte offset just past this frame's trailer. */
  readonly end: number;
}
export type ScanStatus = "clean-end" | "torn-tail" | "corruption" | "bad-header";
export interface ScanResult {
  readonly header?: SegmentHeader;
  readonly frames: readonly ScannedFrame[];
  readonly validEnd: number;
  readonly status: ScanStatus;
  readonly detail?: string;
  /** The chain seed for the next frame (PayloadCrc of the last valid frame). */
  readonly nextSeed: number;
  readonly nextLsn: number;
}

/**
 * V-P2Q M1: in format 1 one flipped bit in firstLsn made the first frame look torn (its expected LSN became
 * huge, so no later header looked plausible) and a full open cut every ACKed frame. Format 2 stores
 * crc32c(header with bytes 12..16 zeroed) in the former flags word, so any header damage is a bad header and
 * the broker refuses to start. Format 1 segments are still read, but only with firstLsn = 1 (segment 1 is the
 * only segment this experiment writes).
 */
const headerCrc = (buf: Buffer): number => {
  const copy = Buffer.from(buf.subarray(0, SEGMENT_HEADER_LEN));
  copy.writeUInt32LE(0, 12);
  return crc32c(copy);
};
export const encodeSegmentHeader = (header: { epoch: number; firstLsn: number }): Buffer => {
  const out = Buffer.alloc(SEGMENT_HEADER_LEN);
  SEGMENT_MAGIC.copy(out, 0);
  out.writeUInt32LE(FORMAT_VERSION, 8);
  out.writeUInt32LE(0, 12);
  out.writeBigUInt64LE(BigInt(header.epoch), 16);
  out.writeBigUInt64LE(BigInt(header.firstLsn), 24);
  out.writeUInt32LE(headerCrc(out), 12);
  return out;
};
export const decodeSegmentHeader = (buf: Buffer): SegmentHeader | undefined => {
  if (buf.length < SEGMENT_HEADER_LEN || !buf.subarray(0, 8).equals(SEGMENT_MAGIC))
    return undefined;
  const header = {
    formatVersion: buf.readUInt32LE(8),
    epoch: Number(buf.readBigUInt64LE(16)),
    firstLsn: Number(buf.readBigUInt64LE(24)),
  };
  if (header.formatVersion === 2)
    return buf.readUInt32LE(12) === headerCrc(buf) ? header : undefined;
  if (header.formatVersion === 1)
    return header.firstLsn === 1 && buf.readUInt32LE(12) === 0 ? header : undefined;
  return undefined;
};
/** The first frame's chain seed, so a recycled or renamed segment cannot be spliced in (R13 2.4). */
export const segmentSeed = (header: Buffer): number => crc32c(header, 0, 0, SEGMENT_HEADER_LEN);

export const encodeFrame = (input: {
  readonly lsn: number;
  readonly epoch: number;
  readonly kind: number;
  readonly flags?: number;
  readonly payload: Buffer;
  readonly prevCrc: number;
}): { readonly bytes: Buffer; readonly crc: number } => {
  if (input.payload.length > MAX_PAYLOAD) throw new RangeError("Frame payload too large");
  const out = Buffer.alloc(FRAME_HEADER_LEN + input.payload.length + FRAME_TRAILER_LEN);
  out.writeUInt32LE(FRAME_MAGIC, 0);
  out.writeUInt32LE(input.payload.length, 4);
  out.writeBigUInt64LE(BigInt(input.lsn), 8);
  out.writeUInt32LE(input.epoch >>> 0, 16);
  out.writeUInt32LE(input.prevCrc >>> 0, 20);
  out.writeUInt16LE(input.kind, 24);
  out.writeUInt16LE(input.flags ?? 0, 26);
  const headerCrc = crc32c(out, input.prevCrc, 0, 28);
  out.writeUInt32LE(headerCrc, 28);
  input.payload.copy(out, FRAME_HEADER_LEN);
  const crc = crc32c(out, headerCrc, FRAME_HEADER_LEN, FRAME_HEADER_LEN + input.payload.length);
  out.writeUInt32LE(crc, FRAME_HEADER_LEN + input.payload.length);
  return { bytes: out, crc };
};

const allZero = (buf: Buffer, start: number, end: number) => {
  for (let i = start; i < end; i++) if (buf[i] !== 0) return false;
  return true;
};

/** Null when the frame at `offset` is valid for the chain seed and expected LSN; else the reason. */
const invalidReason = (
  buf: Buffer,
  offset: number,
  seed: number,
  expectLsn: number,
  minEpoch: number,
): string | null => {
  const remain = buf.length - offset;
  if (remain < FRAME_HEADER_LEN) return "short header";
  if (buf.readUInt32LE(offset) !== FRAME_MAGIC) return "bad magic";
  const headerCrc = buf.readUInt32LE(offset + 28);
  if (crc32c(buf, seed, offset, offset + 28) !== headerCrc) return "header crc or chain mismatch";
  const payloadLen = buf.readUInt32LE(offset + 4);
  if (payloadLen > MAX_PAYLOAD) return "payload too large";
  const lsn = Number(buf.readBigUInt64LE(offset + 8));
  const kind = buf.readUInt16LE(offset + 24);
  // Only an EPOCH_BEGIN may skip exactly one LSN: the burned in-flight frame (module comment).
  if (lsn !== expectLsn && !(kind === FrameKind.EPOCH_BEGIN && lsn === expectLsn + 1))
    return `lsn ${lsn} != expected ${expectLsn}`;
  if (buf.readUInt32LE(offset + 16) < minEpoch) return "epoch went backwards";
  if (remain < FRAME_HEADER_LEN + payloadLen + FRAME_TRAILER_LEN) return "short payload";
  const payloadCrc = buf.readUInt32LE(offset + FRAME_HEADER_LEN + payloadLen);
  if (
    crc32c(buf, headerCrc, offset + FRAME_HEADER_LEN, offset + FRAME_HEADER_LEN + payloadLen) !==
    payloadCrc
  )
    return "payload crc mismatch";
  return null;
};

/**
 * Any later offset with the frame magic and a plausible header (LSN above the expected one, sane length,
 * fits in the file) is evidence that bytes after the invalid frame were once written and fsynced, so
 * the scan reports corruption, not a torn tail (R13 2.4: fail closed; a false positive refuses to start,
 * it never loses data).
 */
const laterHeader = (buf: Buffer, from: number, expectLsn: number): number => {
  const magic = Buffer.alloc(4);
  magic.writeUInt32LE(FRAME_MAGIC);
  for (let i = from; ; i++) {
    i = buf.indexOf(magic, i);
    if (i === -1 || i + FRAME_HEADER_LEN > buf.length) return -1;
    const len = buf.readUInt32LE(i + 4);
    const lsn = Number(buf.readBigUInt64LE(i + 8));
    if (
      len <= MAX_PAYLOAD &&
      lsn > expectLsn &&
      i + FRAME_HEADER_LEN + len + FRAME_TRAILER_LEN <= buf.length
    )
      return i;
  }
};

/** Scan one segment (R13 2.4 `scanSegment`), classifying the first invalid frame. */
export const scanSegment = (buf: Buffer): ScanResult => {
  const header = decodeSegmentHeader(buf);
  if (!header)
    return {
      frames: [],
      validEnd: 0,
      status: "bad-header",
      detail: "segment header",
      nextSeed: 0,
      nextLsn: 0,
    };
  let seed = segmentSeed(buf);
  let offset = SEGMENT_HEADER_LEN;
  let expectLsn = header.firstLsn;
  let minEpoch = header.epoch;
  const frames: ScannedFrame[] = [];
  for (;;) {
    const done = (status: ScanStatus, detail?: string): ScanResult => ({
      header,
      frames,
      validEnd: offset,
      status,
      ...(detail === undefined ? {} : { detail }),
      nextSeed: seed,
      nextLsn: expectLsn,
    });
    if (offset === buf.length) return done("clean-end");
    if (allZero(buf, offset, buf.length)) return done("clean-end", "zero padding");
    const reason = invalidReason(buf, offset, seed, expectLsn, minEpoch);
    if (reason !== null) {
      const later = laterHeader(buf, offset + 1, expectLsn);
      return later === -1
        ? done("torn-tail", reason)
        : done("corruption", `${reason}; plausible header at ${later}`);
    }
    const payloadLen = buf.readUInt32LE(offset + 4);
    const frame: ScannedFrame = {
      offset,
      lsn: Number(buf.readBigUInt64LE(offset + 8)),
      epoch: buf.readUInt32LE(offset + 16),
      kind: buf.readUInt16LE(offset + 24),
      flags: buf.readUInt16LE(offset + 26),
      payloadLen,
      payloadCrc: buf.readUInt32LE(offset + FRAME_HEADER_LEN + payloadLen),
      end: offset + FRAME_HEADER_LEN + payloadLen + FRAME_TRAILER_LEN,
    };
    frames.push(frame);
    seed = frame.payloadCrc;
    expectLsn = frame.lsn + 1;
    minEpoch = frame.epoch;
    offset = frame.end;
  }
};

/** The payload bytes of a scanned frame. */
export const framePayload = (buf: Buffer, frame: ScannedFrame): Buffer =>
  buf.subarray(frame.offset + FRAME_HEADER_LEN, frame.offset + FRAME_HEADER_LEN + frame.payloadLen);

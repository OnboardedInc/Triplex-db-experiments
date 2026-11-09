/** SQLite log of record. [EXP-SQL01] Why: R25/Q84 atomic frames, indexes and H1 with independent readers.
 * Rejected: a segment plus replayed maps (outage pulls grow with the entire command history).
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { Worker, MessageChannel, receiveMessageOnPort } from "node:worker_threads";
import type { TripleRow } from "@triplex-build/triplex/runtime";
import { FrameKind, encodeFrame, encodeSegmentHeader, segmentSeed } from "./frame.js";
import { decodeCommitGroup } from "./frames.js";
import { sqliteWorker } from "./sqlite-worker.js";
import { BasisNotAvailable } from "./errors.js";
import { ReadError } from "@triplex-build/triplex/runtime";

export type H1Basis = number | { readonly recordedPosition: number; readonly recordedAt?: number };
export class H1BasisUnsupported extends ReadError {
  readonly reason = "h1-record-time-unsupported" as const;
  constructor() {
    super({
      message: "H1 retires by position and cannot answer a record-time basis; route to source",
    });
  }
}

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
  readonly abortedLsns: readonly number[];
  readonly tornBytes: number;
  readonly at: number;
}
export interface OpenedLog {
  readonly log: HostLog;
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
export interface Selection {
  readonly entities?: readonly string[];
  readonly id?: string;
}
export interface StoreSnapshot extends Watermark {
  readonly h: number;
  readonly crc: number;
  readonly size: number;
}
export interface CheckpointStatus {
  readonly counts: Readonly<Record<string, number>>;
  readonly events: readonly {
    readonly at: number;
    readonly mode: string;
    readonly outcome: string;
    readonly ms: number;
    readonly busy?: number;
    readonly log?: number;
    readonly checkpointed?: number;
  }[];
}
export interface PinnedPull {
  readonly snapshot: StoreSnapshot;
  readonly basis: number;
  readonly eligible: boolean;
  readonly rows: TripleRow[];
}
type Receipt = {
  readonly lsn: number;
  readonly epoch: number;
  readonly positions: readonly number[];
};
const seed = segmentSeed(encodeSegmentHeader({ epoch: 0, firstLsn: 1 }));
const driver = createRequire(import.meta.url).resolve("better-sqlite3");
class Connection {
  private dead: string | undefined;
  constructor(readonly worker: Worker) {
    worker.on("error", (error) => {
      this.dead = String(error);
    });
    worker.on("exit", (code) => {
      this.dead = `SQLite worker exited ${code}`;
    });
    worker.unref();
  }
  sync<T>(op: string, args?: unknown): T {
    if (this.dead) throw new BrokerLogError(this.dead);
    const { port1, port2 } = new MessageChannel(),
      signal = new SharedArrayBuffer(4),
      state = new Int32Array(signal);
    try {
      this.worker.postMessage({ op, args, response: port2, signal }, [port2]);
      const deadline = performance.now() + 30_000;
      let packet;
      while (!(packet = receiveMessageOnPort(port1))) {
        if (performance.now() > deadline)
          throw new BrokerLogError(`SQLite ${op} timed out; outcome unknown`);
        Atomics.wait(state, 0, 0, 10);
      }
      const data = packet.message as { result: T; error?: string };
      if (data.error) throw new BrokerLogError(data.error);
      return data.result;
    } finally {
      port1.close();
    }
  }
  async request<T>(op: string, args?: unknown): Promise<T> {
    if (this.dead) throw new BrokerLogError(this.dead);
    const { port1, port2 } = new MessageChannel();
    return new Promise<T>((resolve, reject) => {
      const cleanup = () => {
        clearTimeout(timer);
        port1.close();
        this.worker.off("error", onError);
        this.worker.off("exit", onExit);
      };
      const onError = (error: Error) => {
        cleanup();
        reject(new BrokerLogError(`SQLite worker failed; outcome unknown: ${String(error)}`));
      };
      const onExit = (code: number) => onError(new Error(`worker exited ${code}`));
      const timer = setTimeout(() => {
        cleanup();
        reject(new BrokerLogError(`SQLite ${op} timed out; outcome unknown`));
      }, 30_000);
      this.worker.once("error", onError);
      this.worker.once("exit", onExit);
      port1.once("message", (data: { result: T; error?: string; observed?: number }) => {
        cleanup();
        if (data.error)
          reject(
            data.error.includes("H1_RECORD_TIME_UNSUPPORTED")
              ? new H1BasisUnsupported()
              : data.error.includes("H1_BASIS_NOT_AVAILABLE")
                ? new BasisNotAvailable({
                    required: (args as any).basis,
                    observed: data.observed ?? -1,
                    replica: "broker-h1",
                    surface: "repository",
                    waitedMs: 0,
                    cause: data.error,
                  })
                : new BrokerLogError(data.error),
          );
        else resolve(data.result);
      });
      this.worker.postMessage({ op, args, response: port2 }, [port2]);
    });
  }
  async close() {
    try {
      await this.request("close");
    } finally {
      await this.worker.terminate();
    }
  }
}
const connect = (
  file: string,
  role: string,
  gateBuffer: SharedArrayBuffer,
  requireFullFsync = false,
) =>
  new Connection(
    new Worker(sqliteWorker, {
      eval: true,
      // [EXP-SQL01] Why: eval workers contain CommonJS; an ESM CLI parent's --input-type changes eval parsing.
      // Rejected: inheriting that flag (require is undefined), or stripping all flags (loses resource settings).
      execArgv: process.execArgv.filter(
        (arg, i, args) =>
          arg !== "--input-type" &&
          !arg.startsWith("--input-type=") &&
          args[i - 1] !== "--input-type",
      ),
      workerData: { file, role, seed, driver, gateBuffer, requireFullFsync },
    }),
  );
const streams = new Map<string, HostLog>();
const readers = new Map<string, Connection>();
const streamReaders = new Map<string, Connection>();
const readConnection = (file: string) => {
  const real = path.resolve(file);
  const owned = streamReaders.get(real);
  if (owned) return owned;
  let c = readers.get(real);
  if (!c) {
    c = connect(real, "reader", new SharedArrayBuffer(8));
    c.sync("init");
    readers.set(real, c);
  }
  return c;
};
const normalize = (frame: LogFrame): LogFrame => ({
  ...frame,
  payload: Buffer.from(frame.payload),
});
export class HostLog {
  private closed = false;
  private writing = false;
  private failed: Error | undefined;
  private readerIndex = 0;
  private readonly sweepPool = new Map<number, Connection>();
  private constructor(
    readonly dir: string,
    private readonly writer: Connection,
    private readonly pool: Connection[],
    private readonly checkpointer: Connection,
    public epoch: number,
    public nextLsn: number,
    private prevCrc: number,
    private readonly gate: SharedArrayBuffer,
  ) {}
  static async open(
    dir: string,
    options: {
      readonly minFreeBytes?: number;
      readonly requireFullFsync?: boolean;
      readonly takeover?: boolean;
    } = {},
  ): Promise<OpenedLog> {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    dir = fs.realpathSync(dir);
    const prior = streams.get(dir);
    if (prior) {
      if (!options.takeover)
        throw new BrokerLogError(`Broker log ${dir} is already open in this process`);
      await prior.abandon();
    }
    if (fs.existsSync(path.join(dir, "segment-000001.log")))
      throw new BrokerLogError(
        "Legacy broker segment requires explicit migration; refusing to replace it",
      );
    const stats = fs.statfsSync(dir);
    if (stats.bavail * stats.bsize < (options.minFreeBytes ?? 2 * 1024 ** 3))
      throw new BrokerLogError("Broker log volume below free-space floor");
    const file = path.join(dir, "broker.db"),
      gate = new SharedArrayBuffer(12),
      writer = connect(file, "writer", gate, options.requireFullFsync);
    const connections = [writer];
    try {
      const init = await writer.request<{ marker: StoreSnapshot; calibrationMs: number }>("init");
      const result = writer.sync<{ frames: LogFrame[] }>("frames", {
        from: { offset: 32, seed, nextLsn: 1 },
        upto: init.marker.lsn,
        maxBytes: Number.MAX_SAFE_INTEGER,
      });
      const frames = result.frames.map(normalize);
      let crc = seed;
      for (const f of frames) {
        const encoded = encodeFrame({
          lsn: f.lsn,
          epoch: f.epoch,
          kind: f.kind,
          payload: f.payload,
          prevCrc: crc,
        });
        if (encoded.crc !== f.crc) throw new BrokerLogError(`Corrupt frame CRC at ${f.lsn}`);
        crc = f.crc;
      }
      const last = frames.at(-1);
      if (
        (last?.lsn ?? 0) !== init.marker.lsn ||
        (last?.epoch ?? 0) !== init.marker.epoch ||
        crc !== init.marker.crc ||
        (last?.end ?? 32) !== init.marker.size
      )
        throw new BrokerLogError("Marker/frame cross-check failed");
      const epoch = init.marker.epoch + 1;
      const begin: EpochBeginPayload = {
        v: 1,
        epoch,
        previousEpoch: init.marker.epoch,
        lastValidLsn: init.marker.lsn,
        abortedLsns: [],
        tornBytes: 0,
        at: Date.now(),
      };
      const payload = Buffer.from(JSON.stringify(begin));
      const encoded = encodeFrame({
        lsn: init.marker.lsn + 1,
        epoch,
        kind: FrameKind.EPOCH_BEGIN,
        payload,
        prevCrc: crc,
      });
      frames.push(
        normalize(
          await writer.request<LogFrame>("append", {
            lsn: init.marker.lsn + 1,
            epoch,
            kind: FrameKind.EPOCH_BEGIN,
            payload,
            prev: crc,
            crc: encoded.crc,
            length: encoded.bytes.length,
            members: [],
          }),
        ),
      );
      const checkpointer = connect(file, "checkpointer", gate, options.requireFullFsync);
      connections.push(checkpointer);
      await checkpointer.request("init");
      const pool = [];
      for (let i = 0; i < 4; i++) {
        const c = connect(file, "reader", gate);
        connections.push(c);
        await c.request("init");
        pool.push(c);
      }
      const log = new HostLog(
        dir,
        writer,
        pool,
        checkpointer,
        epoch,
        init.marker.lsn + 2,
        encoded.crc,
        gate,
      );
      streams.set(dir, log);
      streamReaders.set(file, pool[0]!);
      // [EXP-SQL01] Why: directory entries for the DB and ACKED must survive alongside synced SQLite commits.
      const fd = fs.openSync(dir, "r");
      try {
        fs.fsyncSync(fd);
      } finally {
        fs.closeSync(fd);
      }
      return {
        log,
        frames,
        recovery: {
          status: init.marker.lsn === 0 ? "created" : "clean-end",
          tornBytes: 0,
          abortedLsns: [],
          fsyncCalibrationMs: init.calibrationMs,
        },
      };
    } catch (error) {
      await Promise.all(connections.map((c) => c.close().catch(() => {})));
      throw error;
    }
  }
  get segmentPath() {
    return path.join(this.dir, "broker.db");
  }
  get failure() {
    return this.failed;
  }
  async append(
    kind: number,
    payload: Buffer,
    _options: { readonly sync?: boolean } = {},
  ): Promise<LogFrame> {
    if (this.failed) throw this.failed;
    if (this.closed) throw new BrokerLogError("Broker log is closed");
    if (this.writing) throw new BrokerLogError("Broker append while another append is in flight");
    this.writing = true;
    try {
      const lsn = this.nextLsn,
        epoch = this.epoch,
        encoded = encodeFrame({ lsn, epoch, kind, payload, prevCrc: this.prevCrc });
      const frame = normalize(
        await this.writer.request<LogFrame>("append", {
          lsn,
          epoch,
          kind,
          payload,
          prev: this.prevCrc,
          crc: encoded.crc,
          length: encoded.bytes.length,
          members: kind === FrameKind.COMMIT_GROUP ? decodeCommitGroup(payload).members : [],
        }),
      );
      this.nextLsn = lsn + 1;
      this.prevCrc = frame.crc;
      return frame;
    } catch (error) {
      this.failed = new BrokerLogError(`Broker write failed; outcome unknown: ${String(error)}`);
      throw this.failed;
    } finally {
      this.writing = false;
    }
  }
  async framesAfterAsync(after: number, maxFrames: number) {
    const frames = (
      await this.pool[0]!.request<(LogFrame & { prev_crc: number })[]>("after", {
        after,
        maxBytes: 32 * 1024 * 1024,
        maxFrames,
      })
    ).map(normalize) as (LogFrame & { prev_crc: number })[];
    for (const f of frames) {
      const encoded = encodeFrame({
        lsn: f.lsn,
        epoch: f.epoch,
        kind: f.kind,
        payload: f.payload,
        prevCrc: f.prev_crc,
      });
      if (encoded.crc !== f.crc)
        throw new BrokerLogError(`Replica replay CRC mismatch at ${f.lsn}`);
    }
    return frames;
  }
  async recentAsync(after: number, selection: Selection) {
    if (this.closed) throw new BrokerLogError("Broker log is closed");
    return this.pool[this.readerIndex++ % this.pool.length]!.request<TripleRow[]>("recent", {
      after,
      selection,
    });
  }
  async claimAsync(id: string) {
    if (this.closed) throw new BrokerLogError("Broker log is closed");
    return this.pool[this.readerIndex++ % this.pool.length]!.request<
      { txId: string; position: number } | undefined
    >("claim", id);
  }
  async sweepPage(
    basis: H1Basis,
    entities: readonly string[],
    options: { worker?: number; validAt?: number } = {},
  ) {
    if (this.closed) throw new BrokerLogError("Broker log is closed");
    const worker = options.worker ?? 0;
    if (!Number.isInteger(worker) || worker < 0 || worker > 3 || entities.length > 64)
      throw new BrokerLogError("Sweep requires worker 0..3 and at most 64 subjects");
    if (options.validAt !== undefined && !Number.isFinite(options.validAt))
      throw new BrokerLogError("Sweep validAt must be finite");
    // [EXP-P5B] Why: R34/Q92h isolates page BFS from four live readers and shares the maintenance gate.
    // Rejected: pull() per hop (different snapshots, and sweep pages queue live traffic).
    let connection = this.sweepPool.get(worker);
    if (!connection) {
      connection = connect(this.segmentPath, "reader", this.gate);
      this.sweepPool.set(worker, connection);
    }
    return connection.request<
      PinnedPull & {
        transactionMs: number;
        cpuMicros: number;
        cpuScope: string;
        roundTrips: number;
      }
    >("sweep", {
      basis: typeof basis === "number" ? basis : basis.recordedPosition,
      recordedAt: typeof basis === "number" ? undefined : basis.recordedAt,
      entities,
      validAt: options.validAt,
    });
  }
  private lookup<T>(op: string, args?: unknown): T {
    if (this.closed) throw new BrokerLogError("Broker log is closed");
    return this.writer.sync<T>(op, args);
  }
  publishWatermark(mark: Watermark) {
    this.lookup("ack", mark);
  }
  claim(id: string) {
    return this.lookup<{ txId: string; position: number } | undefined>("claim", id);
  }
  operation(id: string) {
    return this.lookup<Receipt | undefined>("operation", id);
  }
  head(entity: string) {
    return this.lookup<number>("head", entity);
  }
  recent(after: number, selection: Selection) {
    return this.pool[0]!.sync<TripleRow[]>("recent", { after, selection });
  }
  async pull(basis: H1Basis, selection: Selection): Promise<PinnedPull> {
    // [CX-INT-Q] Why: Q89b requires refusal before position retirement drops rows needed at T.
    // Rejected: post-filtering H1 rows by timestamp (cannot restore discarded assertions).
    const position = typeof basis === "number" ? basis : basis.recordedPosition;
    const recordedAt = typeof basis === "number" ? undefined : basis.recordedAt;
    if (this.closed) throw new BrokerLogError("Broker log is closed");
    return this.pool[this.readerIndex++ % this.pool.length]!.request("pull", {
      basis: position,
      recordedAt,
      selection,
    });
  }
  checkpoint() {
    return this.checkpointer.request<CheckpointStatus>("checkpoint");
  }
  checkpointStatus() {
    return this.checkpointer.request<CheckpointStatus>("checkpointStatus");
  }
  pinBasis(basis: number, owner: string, lease?: { ttlMs: number; maxLagPositions: number }) {
    if (
      lease &&
      (!Number.isSafeInteger(lease.ttlMs) ||
        lease.ttlMs < 1 ||
        lease.ttlMs > 300_000 ||
        !Number.isSafeInteger(lease.maxLagPositions) ||
        lease.maxLagPositions < 0)
    )
      throw new BrokerLogError("Invalid pin lease");
    const token = randomUUID();
    this.lookup("pin", { token, basis, owner, lease });
    let released = false;
    return {
      basis,
      renew: () => {
        if (released || !lease) throw new BrokerLogError("No active lease to renew");
        this.lookup("renew", { token, ttlMs: lease.ttlMs });
      },
      release: () => {
        if (!released) {
          this.lookup("unpin", token);
          released = true;
        }
      },
    };
  }
  purge(horizon: number) {
    return this.lookup<{ h: number; removed: number }>("purge", horizon);
  }
  async abandon() {
    if (this.closed) return;
    this.closed = true;
    streams.delete(this.dir);
    streamReaders.delete(this.segmentPath);
    await Promise.all([...this.pool, ...this.sweepPool.values()].map((c) => c.close()));
    await this.checkpointer.close();
    await this.writer.close();
    const external = readers.get(this.segmentPath);
    if (external) {
      readers.delete(this.segmentPath);
      await external.close();
    }
  }
  async close() {
    await this.abandon();
  }
}
export const readWatermark = (dir: string): Watermark | undefined => {
  const file = path.join(dir, "broker.db");
  if (!fs.existsSync(file)) return undefined;
  return readConnection(file).sync<StoreSnapshot>("marker");
};
export const segmentStart = (_file: string) => ({ offset: 32, seed, nextLsn: 1 });
export const readFramesFrom = (
  file: string,
  from: { readonly offset: number; readonly seed: number; readonly nextLsn: number },
  uptoLsn: number,
  maxBytes = 64 * 1024 * 1024,
): {
  readonly frames: readonly LogFrame[];
  readonly next: { offset: number; seed: number; nextLsn: number };
} => {
  const result = readConnection(file).sync<{
    frames: LogFrame[];
    next: { offset: number; seed: number; nextLsn: number };
  }>("frames", { from, upto: uptoLsn, maxBytes });
  let crc = from.seed;
  const frames = result.frames.map(normalize);
  for (const f of frames) {
    const encoded = encodeFrame({
      lsn: f.lsn,
      epoch: f.epoch,
      kind: f.kind,
      payload: f.payload,
      prevCrc: crc,
    });
    if (encoded.crc !== f.crc) throw new BrokerLogError(`Feed CRC mismatch at ${f.lsn}`);
    crc = f.crc;
  }
  return { ...result, frames };
};

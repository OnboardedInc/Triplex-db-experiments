import { MessageChannel, Worker, type MessagePort } from "node:worker_threads";
import { deserialize } from "node:v8";
import type { PullResult } from "./composition.ts";
import { restoreReplicaReply } from "./replica-reads.ts";
import type { ReadBasis } from "../../../packages/datomic/dist/index.js";

export type HistoricalMode = "off" | "lane" | "batch" | "revision" | "install";
export type HistoricalConfig = {
  mode: Exclude<HistoricalMode, "off">;
  scope: string;
  endpoint: string;
  active: number;
  capture?: boolean;
};
export type HistoricalPayload = {
  root: string;
  result: Omit<PullResult, "triples">;
  triples: Uint8Array;
  from: number;
  to: number;
  recordedAt?: number;
  recordedPosition?: number;
  t: string;
};
export type HistoricalRequest = {
  id: number;
  root: string;
  basis: ReadBasis;
  port: MessagePort;
  queued: number;
};

type Reply = { id: number; world?: HistoricalPayload; error?: string };

// [DX-RD1] Why: keep gateway responses, decode work and queued misses off the event loops serving local hits.
// Rejected: routing local reads through the same FIFO or spinning up one gateway client per logical caller.
export class HistoricalFallbackThread {
  private readonly worker: Worker;
  private failure?: Error;
  private closing = false;
  private serial = 0;
  private replies = new Map<number, (data: any) => void>();
  readonly elus: { t: number; elu: number }[] = [];

  constructor(config: HistoricalConfig) {
    this.worker = new Worker(new URL("./historical-fallback-worker.ts", import.meta.url), {
      workerData: config,
      env: process.env,
    });
    const fail = (error: Error) => {
      this.failure ??= error;
      for (const done of this.replies.values()) done({ error: error.message });
      this.replies.clear();
    };
    this.worker.on("error", fail);
    this.worker.on("exit", (code) => {
      if (!this.closing) fail(Error(`Historical lane exited ${code}`));
    });
    this.worker.on("message", (msg) => {
      if (msg.type === "elu") this.elus.push({ t: msg.t, elu: msg.elu });
      else if (msg.type === "snapshot") {
        this.replies.get(msg.id)?.(msg);
        this.replies.delete(msg.id);
      }
    });
  }

  connect(): MessagePort {
    if (this.failure) throw this.failure;
    const { port1, port2 } = new MessageChannel();
    this.worker.postMessage({ type: "connect", port: port1 }, [port1]);
    return port2;
  }

  async snapshot(): Promise<any> {
    if (this.failure) throw this.failure;
    const id = ++this.serial;
    return new Promise((resolve, reject) => {
      this.replies.set(id, (data) =>
        data.error ? reject(Error(data.error)) : resolve(data.stats),
      );
      this.worker.postMessage({ type: "snapshot", id });
    });
  }

  async close() {
    this.closing = true;
    await this.worker.terminate();
  }
}

export class HistoricalFallbackPort {
  private serial = 0;
  private closed = false;
  private pending = new Map<number, (reply: Reply) => void>();
  constructor(private readonly port: MessagePort) {
    port.on("message", (reply: Reply) => {
      const done = this.pending.get(reply.id);
      if (!done) return;
      this.pending.delete(reply.id);
      done(reply);
    });
    port.once("close", () => {
      this.closed = true;
      for (const done of this.pending.values())
        done({ id: -1, error: "Historical lane closed before the exact reply" });
      this.pending.clear();
    });
  }
  async pull(root: string, basis: ReadBasis): Promise<HistoricalPayload | undefined> {
    if (this.closed) throw Error("Historical lane closed");
    const id = ++this.serial;
    return new Promise((resolve, reject) => {
      this.pending.set(id, ({ world, error }) => {
        if (error) reject(Error(error));
        else if (world && !sameCut(root, basis, world)) reject(Error("Historical lane response cut mismatch"));
        else resolve(world);
      });
      this.port.postMessage({ id, root, basis });
    });
  }
  close() {
    this.port.close();
  }
}

function sameCut(root: string, basis: ReadBasis, world: HistoricalPayload) {
  return world.root === root && world.recordedAt === basis.recordedAt &&
    world.recordedPosition === basis.recordedPosition && /^\d+$/.test(world.t) &&
    world.from <= basis.validAt && basis.validAt < world.to;
}

// [DX-RD1] Why: native rows cross the isolate losslessly, including signed zero and tagged Option values.
// Rejected: eagerly deserializing every world on the local reader or transporting only its digest.
export function historicalResult(world: HistoricalPayload, local: boolean): PullResult {
  let triples: PullResult["triples"] | undefined;
  return {
    ...world.result,
    route: local ? "replica" : "source",
    language: local ? "installed-history" : "reach",
    ...(local ? { roundTrips: 0 } : {}),
    get triples() {
      triples ??= restoreReplicaReply({
        ...world.result,
        triples: deserialize(world.triples),
      }).triples;
      return triples;
    },
  };
}

// [DX-RD1] Why: retain only demanded immutable record cuts and the valid-time interval proved by their full closure.
// Rejected: rebasing a fetched historical world to the live index or inferring a wider valid-time interval.
export class InstalledHistory {
  private readonly values = new Map<string, { world: HistoricalPayload; bytes: number }>();
  readonly diagnostics = { bytes: 0, peakBytes: 0, hits: 0, installs: 0, evictions: 0 };
  constructor(readonly limit: number) {}
  private key(root: string, basis: ReadBasis) {
    return JSON.stringify([root, basis.recordedAt ?? null, basis.recordedPosition ?? null]);
  }
  get(root: string, basis: ReadBasis): PullResult | undefined {
    const key = this.key(root, basis),
      entry = this.values.get(key);
    if (!entry || !(entry.world.from <= basis.validAt && basis.validAt < entry.world.to)) return;
    this.values.delete(key);
    this.values.set(key, entry);
    this.diagnostics.hits++;
    return historicalResult(entry.world, true);
  }
  put(root: string, basis: ReadBasis, world: HistoricalPayload) {
    if (!sameCut(root, basis, world))
      throw Error("Installed history response cut mismatch");
    const key = this.key(root, basis),
      bytes = world.triples.byteLength + 384 + 2 * key.length;
    if (bytes > this.limit) return;
    this.remove(key);
    while (this.diagnostics.bytes + bytes > this.limit) {
      this.remove(this.values.keys().next().value!);
      this.diagnostics.evictions++;
    }
    this.values.set(key, { world, bytes });
    this.diagnostics.bytes += bytes;
    this.diagnostics.peakBytes = Math.max(this.diagnostics.peakBytes, this.diagnostics.bytes);
    this.diagnostics.installs++;
  }
  private remove(key: string) {
    const entry = this.values.get(key);
    if (!entry) return;
    this.values.delete(key);
    this.diagnostics.bytes -= entry.bytes;
  }
  clear() {
    this.values.clear();
    this.diagnostics.bytes = 0;
  }
}

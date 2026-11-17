// [DX-S5] Why: keep live commit scheduling independent of reads, feed decoding and publication coordination.
// Rejected: one saturated event loop as the denominator for the activation latency ratio.
import { Worker, MessageChannel } from "node:worker_threads";
import fs from "node:fs";
import path from "node:path";
import type { Replica } from "../../../packages/datomic/dist/index.js";
import { offerLiveWrite, finishLiveWrite } from "./w0-outbox.ts";
import { percentile } from "./w0-traffic.ts";
import type { startW0Live } from "./w0-replica-live.ts";
const workerUrl = new URL("./w0-runtime-worker.ts", import.meta.url);
// [DX-S5] Why: openTriples routes every worker to READ_URLS by default, including a writer worker unless its environment is explicit.
// Rejected: inheriting the reader endpoint (100k A routed all trace commits to the one-CPU read peer and queued before activation).
export function runtimeWorkerEnvironment(role: string, url?: string) {
  if (role !== "writer" && role !== "follower") return { ...process.env };
  if (!url || !["http:", "https:"].includes(new URL(url).protocol))
    throw Error("missing runtime writer endpoint");
  return { ...process.env, DATOMIC_URL: url, DATOMIC_READ_URLS: url };
}
function managed(data: any, transferList: import("node:worker_threads").TransferListItem[] = []) {
  const worker = new Worker(workerUrl, {
    workerData: data,
    transferList,
    env: runtimeWorkerEnvironment(data.role, data.url),
  });
  let failure: Error | undefined;
  let readyResolve!: () => void, readyReject!: (error: Error) => void;
  let stopResolve!: (value: any) => void, stopReject!: (error: Error) => void;
  const ready = new Promise<void>((resolve, reject) => {
    readyResolve = resolve;
    readyReject = reject;
  });
  const stopped = new Promise<any>((resolve, reject) => {
    stopResolve = resolve;
    stopReject = reject;
  });
  void stopped.catch(() => {});
  const fail = (error: Error) => {
    failure ??= error;
    readyReject(error);
    stopReject(error);
  };
  worker.on("error", fail);
  worker.on("exit", (code) => {
    if (code !== 0) fail(Error("runtime worker exited " + code));
  });
  worker.on("message", (message) => {
    if (message.type === "ready") readyResolve();
    if (message.type === "stopped") stopResolve(message);
    if (message.type === "failure") fail(Error(message.error));
  });
  return {
    worker,
    ready,
    stopped,
    check: () => {
      if (failure) throw failure;
    },
  };
}
export async function startRuntimeFollower(
  replica: Replica,
  scope: string,
  db: string,
  url: string,
) {
  const image = (await replica.snapshotAt(replica.position)).sharedImage();
  const owner = managed({ role: "follower", image, scope, db, url });
  owner.worker.on("message", (message) => {
    if (message.type === "delta") {
      // [DX-S5] Why: invalidation is followed by the owner's original failure; terminating here discarded that cause in 100k C.
      // Rejected: trying to apply a reset as a normal delta and killing the worker before its error message arrives.
      if (!message.update.valid) return;
      try {
        replica.applyUpdate(message.update);
      } catch (error) {
        console.error("mirror application failed", error);
        void owner.worker.terminate();
      }
    }
  });
  await owner.ready;
  return {
    check: owner.check,
    subscribe() {
      const channel = new MessageChannel();
      owner.worker.postMessage({ type: "subscribe", port: channel.port1 }, [channel.port1]);
      return channel.port2;
    },
    async stop() {
      owner.worker.postMessage({ type: "stop" });
      const result = await owner.stopped;
      if (replica.position !== result.position) throw Error("follower/main final cut mismatch");
      await owner.worker.terminate();
      return result.metrics;
    },
    metrics() {
      owner.check();
      return new Promise<any>((resolve, reject) => {
        const timer = setTimeout(() => {
          owner.worker.off("message", listener);
          try {
            owner.check();
          } catch (error) {
            reject(error);
            return;
          }
          reject(Error("follower metrics timed out"));
        }, 10000);
        const listener = (message: any) => {
          if (message.type === "metrics") {
            clearTimeout(timer);
            owner.worker.off("message", listener);
            resolve(message.metrics);
          }
        };
        owner.worker.on("message", listener);
        owner.worker.postMessage({ type: "metrics" });
      });
    },
  };
}
export async function startThreadedW0Live(
  options: Parameters<typeof startW0Live>[0],
  follower: Awaited<ReturnType<typeof startRuntimeFollower>>,
  readerThreads = 2,
) {
  if (![2, 3].includes(readerThreads)) throw Error("runtime needs two or three reader workers");
  const readers: ReturnType<typeof managed>[] = [];
  const readFile = path.join(options.dir, options.id + "-readers.ndjson");
  const fd = fs.openSync(readFile, "wx");
  const samples: { started: number; ms: number }[] = [];
  let pending = 0;
  try {
    let offset = 0;
    for (let worker = 0; worker < readerThreads; worker++) {
      const port = follower.subscribe();
      const count = Math.floor(256 / readerThreads) + (worker < 256 % readerThreads ? 1 : 0);
      const reader = managed(
        {
          role: "reader",
          port,
          N: options.N,
          seed: options.seed,
          worker,
          readers: count,
          readerOffset: offset,
        },
        [port],
      );
      offset += count;
      reader.worker.on("message", (message) => {
        if (message.type === "reads") {
          for (const record of message.records)
            samples.push({ started: record.started, ms: record.ms });
          fs.writeSync(
            fd,
            message.records.map((record: any) => JSON.stringify(record) + "\n").join(""),
          );
        }
      });
      readers.push(reader);
    }
    await Promise.all(readers.map((reader) => reader.ready));
    const { comp: _comp, replica: _replica, currentReads: _reads, ...plain } = options;
    const writer = managed({
      role: "writer",
      url: options.comp.backend.url,
      options: { ...plain, id: options.id + "-writer" },
    });
    writer.worker.on("message", (message) => {
      if (message.type === "write-activity") {
        if (message.pending) {
          pending++;
          offerLiveWrite();
        } else {
          pending--;
          finishLiveWrite();
        }
      }
    });
    await writer.ready;
    const followerBefore = await follower.metrics();
    let stopping: Promise<any> | undefined;
    return {
      check() {
        follower.check();
        writer.check();
        readers.forEach((reader) => reader.check());
      },
      stop: () =>
        (stopping ??= (async () => {
          writer.worker.postMessage({ type: "stop" });
          readers.forEach((reader) => reader.worker.postMessage({ type: "stop" }));
          try {
            const [write, read] = await Promise.all([
              writer.stopped,
              Promise.all(readers.map((reader) => reader.stopped)),
            ]);
            fs.closeSync(fd);
            const summary = write.summary;
            const ms = samples
              .filter(
                (sample) =>
                  sample.started >= summary.startedAtMs && sample.started < summary.endedAtMs,
              )
              .map((sample) => sample.ms);
            // [DX-S5] Why: keep every raw read and write sample in the same matching input, without sending full worlds between threads.
            // Rejected: computing ratios from unbound worker aggregates or dropping slow reads at stop.
            const raw = path.join(options.dir, options.id + "-traffic.ndjson");
            fs.copyFileSync(summary.raw, raw);
            const out = fs.openSync(raw, "a");
            const input = fs.openSync(readFile, "r");
            try {
              const chunk = Buffer.alloc(65536);
              let n: number;
              while ((n = fs.readSync(input, chunk, 0, chunk.length, null)))
                fs.writeSync(out, chunk.subarray(0, n));
            } finally {
              fs.closeSync(input);
              fs.closeSync(out);
            }
            fs.unlinkSync(summary.raw);
            fs.unlinkSync(readFile);
            const followerAfter = await follower.metrics();
            return {
              ...summary,
              readers: 256,
              readerMode: "worker-current-immutable-packed-world-fixed-valid-time",
              raw,
              read: {
                count: ms.length,
                p50: ms.length ? percentile(ms, 0.5) : null,
                p99: ms.length ? percentile(ms, 0.99) : null,
              },
              readsPerSecond: ms.length / (summary.windowMs / 1000),
              threads: {
                writer: write.metrics,
                readers: read.map((result) => result.metrics),
                followerBefore,
                followerAfter,
              },
            };
          } finally {
            while (pending > 0) {
              pending--;
              finishLiveWrite();
            }
            await Promise.all([writer, ...readers].map((thread) => thread.worker.terminate()));
          }
        })()),
    };
  } catch (error) {
    fs.closeSync(fd);
    await Promise.all(readers.map((reader) => reader.worker.terminate()));
    throw error;
  }
}

// [DX-S5] Why: isolate frozen trace I/O, feed application, and graph decoding in separate event loops.
// Rejected: 256 local reads and publication callbacks competing with the commit-issuing thread.
import { parentPort, workerData } from "node:worker_threads";
import { performance } from "node:perf_hooks";
import { inspect } from "node:util";
import { Replica, DatomicClient } from "../../../packages/datomic/dist/index.js";
import { openComposition } from "./composition.ts";
import { startW0Live, localReadTurns } from "./w0-replica-live.ts";
import { W0 } from "./w0-world.ts";
import { adaptiveReplicaFeed } from "./w0-parallel.ts";
import { Rng, seedOf } from "./rng.ts";
const port = parentPort!;
const origin = () => performance.timeOrigin + performance.now();
const beginning = performance.eventLoopUtilization();
const cpuStart = process.threadCpuUsage();
const wallStart = performance.now();
const metrics = () => ({
  role: workerData.role,
  worker: workerData.worker,
  elu: performance.eventLoopUtilization(beginning),
  threadCpu: process.threadCpuUsage(cpuStart),
  wallMs: performance.now() - wallStart,
});
try {
  if (workerData.role === "writer") {
    const comp = await openComposition(
      workerData.options.composition,
      workerData.options.lane,
      workerData.options.scope,
    );
    if (comp.backend.url !== workerData.url)
      throw Error("writer routed outside its bound write gateway: " + comp.backend.url);
    const traffic = await startW0Live({
      ...workerData.options,
      comp,
      readersDisabled: true,
      writerInFlight: 32,
      writeActivity: (pending) => port.postMessage({ type: "write-activity", pending }),
    });
    const atReady = performance.eventLoopUtilization();
    port.postMessage({ type: "ready", metrics: metrics() });
    port.once("message", async () => {
      try {
        const summary = await traffic.stop();
        port.postMessage({
          type: "stopped",
          summary,
          metrics: { ...metrics(), measuredElu: performance.eventLoopUtilization(atReady) },
        });
      } catch (error) {
        port.postMessage({ type: "failure", error: inspect(error, { depth: 8 }) });
      } finally {
        await comp.close();
        port.close();
      }
    });
  } else if (workerData.role === "follower") {
    const client = new DatomicClient(workerData.url, 35000, 64 * 1024 ** 2, {
      entityCacheBytes: 1,
      rowCacheBytes: 1,
    });
    const comp = await openComposition("reach", "datomic", workerData.scope);
    if (comp.backend.url !== workerData.url)
      throw Error("follower head routed outside its bound write gateway");
    const source = Replica.source(
      client,
      workerData.db,
      () => comp.currentPosition(),
      workerData.image.validAt,
    );
    source.feed = adaptiveReplicaFeed(source.feed, (event) =>
      console.log(
        JSON.stringify({ kind: "replica-feed-page-retry", scope: workerData.scope, ...event }),
      ),
    );
    const replica = Replica.fromImage(source, workerData.image);
    workerData.image = undefined;
    const subscribers: import("node:worker_threads").MessagePort[] = [];
    replica.onUpdate = (update) => {
      port.postMessage({ type: "delta", update });
      for (const subscriber of subscribers) subscriber.postMessage({ type: "delta", update });
    };
    let stopped = false;
    port.on("message", (message) => {
      if (message.type === "subscribe") {
        // [DX-S5] Why: image and subsequent deltas use one FIFO port, captured synchronously between complete cuts.
        // Rejected: registering after sending an image (can omit a journal in the handoff interval).
        const subscriber = message.port;
        subscribers.push(subscriber);
        void replica
          .snapshotAt(replica.position)
          .then((snapshot) => {
            subscriber.postMessage({ type: "image", image: snapshot.sharedImage() });
          })
          .catch((error) => port.postMessage({ type: "failure", error: String(error) }));
      } else if (message.type === "stop") stopped = true;
      else if (message.type === "metrics")
        port.postMessage({ type: "metrics", metrics: metrics() });
    });
    port.postMessage({ type: "ready" });
    while (!stopped) await replica.followOnce(100);
    port.postMessage({ type: "stopped", metrics: metrics(), position: replica.position });
    subscribers.forEach((subscriber) => subscriber.close());
    client.close();
    await comp.close();
    port.close();
  } else if (workerData.role === "reader") {
    const source = {
      head: async () => {
        throw Error("reader network forbidden");
      },
      page: async () => {
        throw Error("reader network forbidden");
      },
      feed: async () => {
        throw Error("reader network forbidden");
      },
    };
    let replica: Replica | undefined;
    let stopped = false;
    const feed = workerData.port as import("node:worker_threads").MessagePort;
    const waiting: any[] = [];
    await new Promise<void>((resolve, reject) => {
      feed.on("message", (message) => {
        try {
          if (message.type === "image") {
            if (replica) throw Error("duplicate reader image");
            replica = Replica.fromImage(source, message.image);
            waiting.forEach((update) => replica!.applyUpdate(update));
            waiting.length = 0;
            resolve();
          } else if (message.type === "delta") {
            if (replica) replica.applyUpdate(message.update);
            else waiting.push(message.update);
          }
        } catch (error) {
          reject(error);
          port.postMessage({ type: "failure", error: inspect(error) });
          stopped = true;
        }
      });
    });
    port.on("message", () => {
      stopped = true;
    });
    const readTurn = localReadTurns();
    let batch: any[] = [];
    const flush = () => {
      if (batch.length) {
        port.postMessage({ type: "reads", records: batch });
        batch = [];
      }
    };
    const interval = setInterval(flush, 100);
    const atReady = performance.eventLoopUtilization();
    port.postMessage({ type: "ready" });
    await Promise.all(
      Array.from({ length: workerData.readers }, (_, id) =>
        (async () => {
          const rng = new Rng(seedOf(workerData.seed + ":local:" + (workerData.readerOffset + id)));
          while (!stopped) {
            const started = origin();
            await readTurn();
            const subject = W0.placementId(rng.int(workerData.N));
            const position = replica!.position;
            // [DX-S5] Why: a synchronous walk cannot interleave with delta application; only this reachable world is decoded.
            // Rejected: snapshot construction or copying the entire overlay per read.
            const rows = replica!.world(subject);
            if (!rows.length || rows.some((row) => row.position > position))
              throw Error("invalid local read cut/content");
            batch.push({
              kind: "read",
              started,
              ms: origin() - started,
              subject,
              position,
              validAt: replica!.validAt,
              rows: rows.length,
            });
            if (batch.length >= 128) flush();
          }
        })(),
      ),
    );
    clearInterval(interval);
    flush();
    port.postMessage({
      type: "stopped",
      metrics: { ...metrics(), measuredElu: performance.eventLoopUtilization(atReady) },
      position: replica!.position,
    });
    feed.close();
    port.close();
  } else throw Error("unknown runtime worker role");
} catch (error) {
  port.postMessage({ type: "failure", error: inspect(error, { depth: 8 }), metrics: metrics() });
  port.close();
}

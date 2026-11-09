// [EXP-P3M] Why: durable feed IO has its own worker, distinct from closed-loop read clients (R41 E3).
// Rejected: Promise-wrapping synchronous SQLite on the reader event loop.
import { parentPort, workerData } from "node:worker_threads";
import { adapter, core, host, lagSample, positions, sleep } from "./lib/p3.mjs";
const { role, config, ids } = workerData;
let stopping = false;
let target;
parentPort.on("message", (msg) => {
  if (msg.type === "stop") stopping = true;
  if (msg.type === "target") target = msg.prefix;
});
try {
  const provider = await import(config.provider);
  if (role === "reader") {
    let ready = 0;
    const values = await Promise.all(
      ids.map(async (id) => {
        const reader = await provider.openReader(config, id);
        let completed = 0,
          errors = 0,
          firstCompletedNs,
          lastCompletedNs;
        const startedNs = String(process.hrtime.bigint());
        try {
          await reader.pull();
          completed++;
          firstCompletedNs = lastCompletedNs = String(process.hrtime.bigint());
          if (++ready === ids.length) parentPort.postMessage({ type: "ready" });
          while (!stopping) {
            await reader.pull();
            completed++;
            lastCompletedNs = String(process.hrtime.bigint());
          }
          await reader.pull();
          completed++;
          lastCompletedNs = String(process.hrtime.bigint());
        } catch (error) {
          errors++;
          stopping = true;
          throw error;
        } finally {
          await reader.close();
        }
        return {
          runId: config.runId,
          id,
          composition: config.readerComposition,
          startedNs,
          stoppedNs: String(process.hrtime.bigint()),
          firstCompletedNs,
          lastCompletedNs,
          completed,
          errors,
        };
      }),
    );
    parentPort.postMessage({ type: "result", value: values });
  } else {
    const native = await provider.openFeed(config);
    const feed = adapter(config, native);
    const store = new host.SqliteConsumerStore(config.storeFile);
    const clock = host.openHostFeedClock();
    const records = host.openPublicationReader(config.publicationFile);
    const pages = [],
      samples = [],
      seen = new Set();
    let cursor = config.startCursor;
    try {
      if (store.checkpoint(config.runId)) throw Error("Consumer store is not fresh");
      parentPort.postMessage({ type: "ready" });
      for (;;) {
        const page = await feed.poll(cursor);
        const keys = positions(config.source, page.entries);
        const publications = new Map();
        for (const key of keys) {
          const record = host.readProducerPublication(records, key);
          core.publicationLagMs(record, host.captureFeedInstant(clock, key), record);
          publications.set(core.feedPositionKey(key), record);
        }
        const affected = await native.affected(page);
        store.apply(config.runId, store.checkpoint(config.runId), page, affected);
        // [EXP-P3M] Why: all positions become durable at the same atomic page COMMIT.
        // Rejected: capturing after each asynchronous metadata lookup (inflates later positions).
        const durable = keys.length ? host.captureFeedInstant(clock, keys[0]) : null;
        for (const key of keys) {
          const k = core.feedPositionKey(key);
          if (seen.has(k)) throw Error("Repeated feed position");
          seen.add(k);
          const record = publications.get(k);
          samples.push(
            lagSample(record, { ...durable, ...key }, record, await native.isBurst(key)),
          );
        }
        pages.push(page);
        cursor = page.cursor;
        if (target && cursor.token === target.cursor.token) break;
        if (stopping) throw Error("Consumer aborted before prefix");
        await sleep(5);
      }
      parentPort.postMessage({
        type: "result",
        value: {
          runId: config.runId,
          pages,
          samples,
          checkpoint: store.checkpoint(config.runId),
          pragmas: store.pragmas(),
        },
      });
    } finally {
      records.close();
      store.close();
      await native.close();
    }
  }
} catch (error) {
  parentPort.postMessage({ type: "error", error: error.stack });
}
parentPort.close();

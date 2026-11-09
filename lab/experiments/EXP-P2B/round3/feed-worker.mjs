// [EXP-P2B-R3] Why: atomic consumer fsync and feed polling must not occupy the broker thread.
// Rejected: removing the consumer flush (would trade away P3 checkpoint durability).
import { parentPort, workerData } from "node:worker_threads";
import { pathToFileURL } from "node:url";
import path from "node:path";
import fs from "node:fs";
const manifest = JSON.parse(fs.readFileSync("packages/broker/package.json"));
const { LogFeed, FeedConsumerStore } = await import(
  pathToFileURL(path.resolve("packages/broker", manifest.exports["."].import))
);
const feed = new LogFeed(workerData.dir),
  consumer = new FeedConsumerStore(workerData.consumerDir, "r2", "atomic", true);
let cursor = feed.start(),
  stopped = false,
  busy = false;
const events = [],
  errors = [],
  costs = { calls: 0, cpuUs: 0, wallMs: 0 };
const poll = async () => {
  if (busy) return;
  busy = true;
  const t = process.hrtime.bigint(),
    c = process.threadCpuUsage();
  try {
    const page = workerData.asyncFeed ? await feed.pollAsync(cursor) : feed.pollSync(cursor);
    if (page.resolutions.length) {
      const effects = [];
      for (const r of page.resolutions)
        if (r.kind === "commit")
          for (const tx of r.transacts)
            effects.push(...tx.subjects.map((subject) => ({ position: tx.position, subject })));
      consumer.recordEffects(effects, page.cursor);
      cursor = page.cursor;
      events.push({ type: "feed", ...page, durableNs: process.hrtime.bigint().toString() });
    }
  } catch (e) {
    errors.push(String(e));
  } finally {
    costs.calls++;
    const d = process.threadCpuUsage(c);
    costs.cpuUs += d.user + d.system;
    costs.wallMs += Number(process.hrtime.bigint() - t) / 1e6;
    busy = false;
  }
};
const timer = setInterval(() => void poll(), 10);
parentPort.on("message", async ({ id, method }) => {
  if (method === "stop") {
    clearInterval(timer);
    stopped = true;
    while (busy) await new Promise((r) => setTimeout(r, 1));
    await poll();
    consumer.close();
    const reopened = new FeedConsumerStore(workerData.consumerDir, "r2", "atomic", true);
    if (JSON.stringify(reopened.checkpoint()) !== JSON.stringify(cursor))
      errors.push("checkpoint-reopen");
    reopened.close();
    parentPort.postMessage({ reply: id, value: { events, cursor, errors, costs, stopped } });
  }
});
parentPort.postMessage({ ready: true });

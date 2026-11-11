import { parentPort as port, workerData as cfg } from "node:worker_threads";
import { ReadRecords } from "./lib/read-records.ts";
const records = new ReadRecords(cfg.directory);
port!.on("message", m => {
  try {
    if (m.type === "rows") { records.push(...m.rows); port!.postMessage({ type: "progress", count: records.length }); }
    if (m.type === "checkpoint") { records.checkpoint(); port!.postMessage({ type: "reply", id: m.id }); }
  } catch (error) { if (m.id) port!.postMessage({ type: "reply", id: m.id, error: String(error) }); else throw error; }
});

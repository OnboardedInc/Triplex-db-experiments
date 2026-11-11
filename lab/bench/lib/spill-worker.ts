import { parentPort as port, workerData as cfg } from "node:worker_threads";
import { ReadRecords } from "./read-records.ts";
import { R, type ReadRecord } from "./observe.ts";
import { Histogram } from "./hist.ts";
const records = new ReadRecords(cfg.directory);
const starts = new Map<number, number>();
const phases = new Map<number, { reads: number; errors: number; settled: number; read: Histogram; wait: Histogram; routes: Record<string, number> }>();
function retain(rows: ReadRecord[], samples: any[] = []) {
  const changed = new Set<number>();
  for (const row of rows) {
    records.push(row);
    const phase = row[R.phase]; changed.add(phase);
    const summary = phases.get(phase) ?? { reads: 0, errors: 0, settled: 0, read: new Histogram(), wait: new Histogram(), routes: {} };
    phases.set(phase, summary); summary.reads++;
    if (row[R.error] !== null) summary.errors++;
    else { summary.read.recordMs(row[R.latency]); if (row[R.start] >= (starts.get(phase) ?? Infinity)) summary.settled++; }
    summary.wait.recordMs(row[R.waitedMs]);
    summary.routes[row[R.route]] = (summary.routes[row[R.route]] ?? 0) + 1;
  }
  port!.postMessage({ type: "progress", count: records.length, samples, phases: Object.fromEntries([...changed].map(phase => {
    const s = phases.get(phase)!;
    return [phase, { reads: s.reads, errors: s.errors, settled: s.settled, read: s.read.toJSON(), watermarkWait: s.wait.toJSON(), routes: s.routes,
      verification: "PENDING final all-ACK model comparison; observed arrivals include settle and may omit in-flight reads" }];
  })) });
}
port!.on("message", m => {
  try {
    if (m.type === "connect") m.port.on("message", (batch: any) => {
      retain(batch.records, batch.samples);
      // [DX-R3] Why: reader shutdown must acknowledge the exact retained prefix before parent finalization crosses ports.
      // Rejected: relying on FIFO ordering between unrelated MessagePorts.
      m.port.postMessage({ id: batch.id });
    });
    if (m.type === "phase") { starts.set(m.phase, m.start + m.settleMs); port!.postMessage({ type: "reply", id: m.id }); }
    if (m.type === "rows") retain(m.rows);
    if (m.type === "checkpoint") { records.checkpoint(); port!.postMessage({ type: "reply", id: m.id }); }
  } catch (error) { if (m.id) port!.postMessage({ type: "reply", id: m.id, error: String(error) }); else throw error; }
});

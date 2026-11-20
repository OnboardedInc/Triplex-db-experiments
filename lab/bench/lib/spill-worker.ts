import { traceWork, flushTracing } from "./tracing.ts";
import fs from "node:fs";
import { parentPort as port, workerData as cfg } from "node:worker_threads";
import { BatchSequence } from "./reader-lifecycle.ts";
import { ReadRecords } from "./read-records.ts";
import { R, type ReadRecord } from "./observe.ts";
import { Histogram } from "./hist.ts";
import { SpillBudget } from "./spill-budget.ts";
import { unpackReadBatch } from "./read-batch.ts";
import { StreamReads } from "./stream-reads.ts";
import { performance } from "node:perf_hooks";
const budget = cfg.maxBytes === undefined ? undefined : new SpillBudget(cfg.maxBytes);
const records = new ReadRecords(cfg.directory, false, budget);
const stream = cfg.stream ? new StreamReads(cfg.stream) : undefined;
const starts = new Map<number, number>();
const phases = new Map<number, { reads: number; errors: number; settled: number; read: Histogram; wait: Histogram; routes: Record<string, number> }>();
let senderRows = 0;
const changed = new Set<number>();
let pendingSamples: any[] = [];
let elu = performance.eventLoopUtilization();
function reportProgress() {
  if (!changed.size && !pendingSamples.length) return;
  const next = performance.eventLoopUtilization();
  const client = performance.eventLoopUtilization(next, elu);
  elu = next;
  const cpu = typeof process.threadCpuUsage === "function" ? process.threadCpuUsage() : undefined;
  port!.postMessage({ type: "progress", count: records.length + (stream?.progress.captured ?? 0), senderRows, samples: pendingSamples,
    client: { t: performance.timeOrigin + performance.now(), active: client.active, idle: client.idle, elu: client.utilization,
      threadCpuMs: cpu && (cpu.user + cpu.system) / 1000 }, checked: stream?.progress,
    diskBudget: budget && { bytes: budget.bytes, peakBytes: budget.peakBytes, maxBytes: budget.maxBytes, includes: "numeric tuples, strings, checkpoint, split steps and atomic-write scratch; excludes traces and replica apply log" },
    phases: Object.fromEntries([...changed].map(phase => {
    const s = phases.get(phase)!;
    return [phase, { reads: s.reads, errors: s.errors, settled: s.settled, read: s.read.toJSON(), watermarkWait: s.wait.toJSON(), routes: s.routes,
      verification: "PENDING terminal model, reader drain and independent replay" }];
  })) });
  changed.clear(); pendingSamples = [];
}
const timer = setInterval(reportProgress, 250);
timer.unref();
function retain(rows: Iterable<ReadRecord>, samples: any[] = [], splits: any[] = [], sender = false) {
  // [DX-R3] Why: persist each actual split's step timestamps before acknowledging its observation batch.
  // Rejected: inferring straddles from the target-selection policy or ACK counts alone.
  if (stream) for (const split of splits) stream.splits.add(split);
  else if (splits.length) {
    const file = `${cfg.directory}-split-steps.jsonl`, bytes = splits.map(x => JSON.stringify(x) + "\n").join("");
    if (budget) budget.append(file, bytes); else fs.appendFileSync(file, bytes);
  }
  const retainRows = () => { for (const row of rows) {
    if (sender) senderRows++;
    if (!stream?.capture(row)) records.push(row);
    const phase = row[R.phase]; changed.add(phase);
    let summary = phases.get(phase);
    if (!summary) { summary = { reads: 0, errors: 0, settled: 0, read: new Histogram(), wait: new Histogram(), routes: {} }; phases.set(phase, summary); }
    summary.reads++;
    if (row[R.error] !== null) summary.errors++;
    else { summary.read.recordMs(row[R.latency]); if (row[R.start] >= (starts.get(phase) ?? Infinity)) summary.settled++; }
    summary.wait.recordMs(row[R.waitedMs]);
    summary.routes[row[R.route]] = (summary.routes[row[R.route]] ?? 0) + 1;
  } };
  if (stream) stream.measureCapture(retainRows); else retainRows();
  pendingSamples.push(...samples);
}
port!.on("message", async m => {
  try {
    if (m.type === "connect") { const sequence = new BatchSequence(); m.port.on("message", (batch: any) => {
      sequence.accept(batch.id);
      traceWork("spill.retain-batch", () => retain(batch.packed ? unpackReadBatch(batch.packed) : batch.records, batch.samples, batch.splitEvents));
      // [DX-R3] Why: reader shutdown must acknowledge the exact retained prefix before parent finalization crosses ports.
      // Rejected: relying on FIFO ordering between unrelated MessagePorts.
      if (batch.packed) {
        const buffer = batch.packed.values.buffer;
        m.port.postMessage({ id: batch.id, buffer }, [buffer]);
      } else m.port.postMessage({ id: batch.id });
    }); }
    if (m.type === "phase") { starts.set(m.phase, m.start + m.settleMs); if (m.plan) stream!.phase(m.phase, m.plan); port!.postMessage({ type: "reply", id: m.id }); }
    if (m.type === "rows") retain(m.rows, [], [], true);
    if (m.type === "model") {
      const progress = cfg.stream.progress as Int32Array;
      if (m.seq !== Atomics.load(progress, 0)) throw Error("Streaming expectation model frame sequence mismatch");
      stream!.addModel(m.entry);
      Atomics.add(progress, 0, 1);
    }
    if (m.type === "frontier") { stream!.splits.apply(m.applied); stream!.advance(m.through, m.at); }
    if (m.type === "seal") {
      const value = stream!.seal(m.through, m.at, m.frames);
      port!.postMessage({ type: "reply", id: m.id, value });
    }
    if (m.type === "trace-close") { await flushTracing(); port!.postMessage({ type: "reply", id: m.id }); }
    if (m.type === "checkpoint") { records.checkpoint(); reportProgress(); port!.postMessage({ type: "reply", id: m.id }); }
  } catch (error) { if (m.id) port!.postMessage({ type: "reply", id: m.id, error: String(error) }); else throw error; }
});

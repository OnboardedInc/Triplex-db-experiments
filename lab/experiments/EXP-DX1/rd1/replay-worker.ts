import assert from "node:assert/strict";
import { parentPort, workerData, type MessagePort } from "node:worker_threads";
import { performance } from "node:perf_hooks";
import { setImmediate as yieldNow, setTimeout as sleep } from "node:timers/promises";
import { ReadBatch, READ_BATCH_SIZE } from "../../../bench/lib/read-batch.ts";
import { R, type ReadRecord } from "../../../bench/lib/observe.ts";
import type { Expected } from "../../../bench/lib/model.ts";
import type { ReadImage } from "../../../../packages/datomic/dist/index.js";

type Replay = { at: number; until: number; perSecond: number; observationPort: MessagePort };
const opt = workerData as { worker: number; image?: ReadImage; expected: Expected[] };
const now = () => performance.timeOrigin + performance.now();
const cpu = () => { const t = process.threadCpuUsage(); return (t.user + t.system) / 1000; };
const real = opt.image ? await import("./reader-cost.ts") : undefined;
const reader = real ? new (await import("../../../bench/lib/replica-reads.ts")).ReplicaReader() : undefined;
if (reader) reader.install(opt.image!);
const batch = new ReadBatch();
parentPort!.once("message", async ({ at, until, perSecond, observationPort }: Replay) => {
  while (now() < at) await sleep(Math.max(1, at - now()));
  const start = now(), threadStart = cpu(), eluStart = performance.eventLoopUtilization();
  let reads = 0, serial = 0;
  const flush = async () => {
    if (!batch.length) return;
    const packed = batch.take(), id = ++serial;
    const ack = new Promise<ArrayBuffer>((resolve, reject) => observationPort.once("message", (m) => {
      if (m.id !== id || !m.buffer) reject(Error("Replay recorder ACK differs from sent batch"));
      else resolve(m.buffer);
    }));
    observationPort.postMessage({ id, packed, samples: [], splitEvents: [] }, [packed.values.buffer]);
    batch.recycle(await ack);
  };
  while (now() < until) {
    const subject = (reads * 31 + opt.worker * 7) % opt.expected.length, expect = opt.expected[subject]!;
    const row: ReadRecord = real ? await real.fixtureRead(reader!, subject) :
      [0, subject, 100, 1_000, now(), 0, expect.stamp, expect.facts, expect.digest, 0, 0, 0, null, 0, 1, 0, -1, 0, "replica", "fixture", 0];
    row[R.start] = now();
    assert(expect.fullRows && row[R.route] === "replica" && row[R.stamp] === expect.stamp && row[R.facts] === expect.facts && row[R.digest] === expect.digest);
    batch.push(row);
    reads++;
    if (batch.length === READ_BATCH_SIZE) await flush();
    if (reads % 128 === 0) {
      const due = at + reads * 1_000 / perSecond;
      if (due > now()) await sleep(Math.max(1, due - now())); else await yieldNow();
    }
  }
  const measured = { reads, start, end: now(), cpuMs: cpu() - threadStart, elu: performance.eventLoopUtilization(eluStart).utilization };
  await flush();
  observationPort.close();
  parentPort!.postMessage(measured);
});
parentPort!.postMessage({ ready: true });

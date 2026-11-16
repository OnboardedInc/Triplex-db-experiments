import fs from "node:fs";
import path from "node:path";
import { Worker, parentPort, workerData, isMainThread } from "node:worker_threads";
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import { REPO, runtimeApi } from "./triplex.ts";
import { beginTrace, withTrace, finishTrace, flushTracing } from "./tracing.ts";

// [DX-T1-10] Why: diagnostic warm requests use a separate isolate, client identity and ordered sequence, with every refusal checked.
// Rejected: a shipping keep-warm default, successful empty transactions, or sharing the measured writer's send sequence.
export class IdleKeep {
  private worker: Worker;
  private failed: Error | null = null;
  readonly ready: Promise<void>;
  private closed: Promise<any>;
  constructor(cfg: { mode: "http" | "refused"; scope: string; dir: string }) {
    this.worker = new Worker(new URL(import.meta.url), { workerData: { idleKeep: true, ...cfg } });
    let ready!: () => void,
      rejectReady!: (e: Error) => void,
      done!: (v: any) => void,
      rejectDone!: (e: Error) => void;
    this.ready = new Promise((r, j) => {
      ready = r;
      rejectReady = j;
    });
    this.closed = new Promise((r, j) => {
      done = r;
      rejectDone = j;
    });
    void this.closed.catch(() => {});
    this.worker.on("message", (m) => {
      if (m.ready) ready();
      if (m.done) done(m.stats);
    });
    this.worker.on("error", (cause) => {
      const e = cause instanceof Error ? cause : Error(String(cause));
      this.failed = e;
      rejectReady(e);
      rejectDone(e);
    });
    this.worker.on("exit", (code) => {
      if (code) {
        const e = Error(`Idle diagnostic worker exited ${code}`);
        this.failed = e;
        rejectReady(e);
        rejectDone(e);
      }
    });
  }
  async close() {
    if (this.failed) throw this.failed;
    this.worker.postMessage({ stop: true });
    const stats = await this.closed;
    await this.worker.terminate();
    return stats;
  }
}
if (!isMainThread && workerData?.idleKeep) {
  const cfg = workerData;
  if (
    !["http", "refused"].includes(cfg.mode) ||
    (cfg.mode === "refused" &&
      !/^[a-f0-9]{64}$/.test(process.env.DX_IDLE_REFUSAL_PROOF_SHA256 ?? ""))
  )
    throw Error("Unproved or unsupported idle diagnostic");
  const { DatomicClient } = await import(
    pathToFileURL(path.join(REPO, "packages/datomic/dist/index.js")).href
  );
  const client = new DatomicClient(process.env.DATOMIC_URL!, 5000),
    database = await client.create(runtimeApi.DatabaseScope.test(cfg.scope), "lean", true),
    clientId = "idle-refused-" + randomUUID(),
    output = fs.createWriteStream(path.join(cfg.dir, "idle-keep.jsonl"), { flags: "wx" });
  let stop = false,
    calls = 0,
    sequence = 0;
  parentPort!.on("message", (m) => {
    if (m.stop) stop = true;
  });
  const sched = () =>
    fs.readFileSync("/proc/thread-self/schedstat", "utf8").trim().split(/\s+/).map(Number);
  const start = performance.timeOrigin + performance.now(),
    cpu = process.cpuUsage(),
    before = sched();
  parentPort!.postMessage({ ready: true });
  while (!stop) {
    const at = performance.timeOrigin + performance.now(),
      trace = beginTrace("commit", "idle.keep." + cfg.mode, { diagnostic: true });
    let code = "HTTP-200";
    try {
      await withTrace(trace, async () => {
        if (cfg.mode === "http") await client.health();
        else {
          try {
            await client.transact(database.db, {
              sourceK: null,
              span: 1,
              position: 1,
              operationId: randomUUID(),
              attemptId: randomUUID(),
              clientId,
              sendSequence: ++sequence,
              assignRecordTime: true,
              rows: [],
              newIds: [],
              claims: [],
              live: ["idle-missing-" + clientId],
            });
            throw Error("Refused diagnostic unexpectedly committed");
          } catch (e: any) {
            if (e?.status !== 409 || e?.code !== "CasConflict") throw e;
            code = e.code;
          }
        }
      });
    } finally {
      finishTrace(trace);
    }
    calls++;
    const end = performance.timeOrigin + performance.now();
    output.write(
      JSON.stringify({
        at,
        end,
        mode: cfg.mode,
        code,
        clientId,
        sequence,
        run: process.env.TRIPLEX_TRACE_RUN,
        source: process.env.TRIPLEX_TRACE_SOURCE,
        slot: process.env.TRIPLEX_TRACE_SLOT,
      }) + "\n",
    );
    await new Promise((r) => setTimeout(r, Math.max(0, 20 - (end - at))));
  }
  const elapsedMs = performance.timeOrigin + performance.now() - start,
    usage = process.cpuUsage(cpu),
    after = sched();
  client.close();
  await new Promise<void>((r, j) => {
    output.on("error", j);
    output.end(r);
  });
  await flushTracing();
  parentPort!.postMessage({
    done: true,
    stats: {
      mode: cfg.mode,
      calls,
      elapsedMs,
      processCpuMs: (usage.user + usage.system) / 1000,
      threadRuntimeMs: (after[0] - before[0]) / 1e6,
      threadRunqueueMs: (after[1] - before[1]) / 1e6,
      clientId,
      proofSha256: process.env.DX_IDLE_REFUSAL_PROOF_SHA256 ?? null,
      heap: process.memoryUsage(),
    },
  });
  parentPort!.close();
}

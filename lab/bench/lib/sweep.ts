import fs from "node:fs";
import { Worker } from "node:worker_threads";
import type { CompositionHandle } from "./composition.ts";
import { canonical, sha256, W0, type PositionBasis } from "./w0-world.ts";
export const CONTROLLER = {
  intervalMs: 100,
  queueTargetFactor: 0.25,
  increaseBelow: 0.5,
  increaseRatio: 1.25,
  multiply: 0.8,
  halveRatio: 1.4,
  holdMs: 1000,
  stopRatio: 1.5,
  stopWindows: 2,
} as const;
export class Controller {
  limit: number;
  holdUntil = 0;
  breaches = 0;
  readonly max: number;
  readonly enabled: boolean;
  constructor(max: number, enabled = true) {
    this.max = max;
    this.enabled = enabled;
    this.limit = max;
  }
  update(
    s: { queueMs: number; baselineP99: number; readRatio: number; commitRatio: number },
    now: number,
  ) {
    if (!Object.values(s).every(Number.isFinite) || s.baselineP99 <= 0)
      throw new Error("invalid controller observation");
    if (!this.enabled) return this.limit;
    const ratio = Math.max(s.readRatio, s.commitRatio),
      target = s.baselineP99 * CONTROLLER.queueTargetFactor;
    this.breaches = ratio > CONTROLLER.stopRatio ? this.breaches + 1 : 0;
    if (now < this.holdUntil && this.breaches < CONTROLLER.stopWindows) return this.limit;
    if (this.breaches >= CONTROLLER.stopWindows) {
      this.limit = 0;
      this.holdUntil = now + CONTROLLER.holdMs;
      this.breaches = 0;
    } else if (ratio > CONTROLLER.halveRatio) {
      this.limit = Math.max(1, Math.floor(this.limit / 2));
      this.holdUntil = now + CONTROLLER.holdMs;
    } else if (s.queueMs > target)
      this.limit = Math.max(1, Math.floor(this.limit * CONTROLLER.multiply));
    else if (s.queueMs < target * CONTROLLER.increaseBelow && ratio < CONTROLLER.increaseRatio)
      this.limit = Math.min(this.max, Math.max(1, this.limit + 1));
    return this.limit;
  }
}
export function subjectList(N: number) {
  return Array.from({ length: N }, (_, i) => W0.placementId(i)).sort();
}
export const subjectHash = (subjects: readonly string[]) => sha256(canonical(subjects));
export interface SweepOptions {
  comp: CompositionHandle;
  composition: string;
  lane: "xtdb" | "qlever" | "datomic";
  scope: string;
  subjects: readonly string[];
  basis: PositionBasis;
  sweepId: string;
  cursor: string;
  metricsFile?: string;
  workers: number;
  release?: string;
  activations?: readonly W0.Activation[];
  onPage: (records: readonly any[], page: number) => Promise<void | Record<string, number>>;
  stopAfterPages?: number;
  afterCheckpoint?: (page: number) => Promise<void>;
  controller?: Controller;
  beforePublish?: () => Promise<void>;
  beforeTimedWindow?: () => Promise<void>;
  afterTimedStart?: () => Promise<void>;
  reused?: Map<string, any>;
  pageSize?: number;
  captureClosure?: boolean;
  orderedPublication?: boolean;
}
export async function runW0Sweep(o: SweepOptions) {
  if (
    !Number.isInteger(o.workers) ||
    o.workers < 1 ||
    o.workers > 8 ||
    new Set(o.subjects).size !== o.subjects.length ||
    canonical([...o.subjects].sort()) !== canonical(o.subjects)
  )
    throw new Error("invalid worker count or subject list");
  const pageSize = o.pageSize ?? 64;
  if (![64, 256, 512, 1024].includes(pageSize)) throw Error("invalid sweep publication size");
  const binding = {
    sweepId: o.sweepId,
    basis: o.basis,
    listSha256: subjectHash(o.subjects),
    release: o.release ?? null,
    activations: o.activations ?? null,
    pageSize,
    scope: o.scope,
  };
  let published: number[] = [];
  if (fs.existsSync(o.cursor)) {
    const c = JSON.parse(fs.readFileSync(o.cursor, "utf8"));
    if (
      canonical(c.binding) !== canonical(binding) ||
      !Array.isArray(c.published) ||
      c.published.some(
        (x: any) => !Number.isInteger(x) || x < 0 || x >= Math.ceil(o.subjects.length / pageSize),
      ) ||
      new Set(c.published).size !== c.published.length
    )
      throw new Error("cursor binding/shape mismatch");
    published = c.published;
  }
  const remaining = Array.from(
    { length: Math.ceil(o.subjects.length / pageSize) },
    (_, i) => i,
  ).filter((i) => !published.includes(i));
  let completed = 0,
    index = 0;
  const metrics: any[] = [];
  let epoch: string | undefined;
  const pin = await o.comp.pinBasis?.(o.basis.position, "sweep:" + o.sweepId);
  const threads: Worker[] = [];
  const startupStarted = performance.now();
  let sweepStarted = startupStarted;
  let workersReadyAt = startupStarted;
  let readyCount = 0;
  let start!: () => void, rejectStart!: (e: unknown) => void;
  const allReady = new Promise<void>((r, j) => {
    start = r;
    rejectStart = j;
  });
  void allReady.catch(() => {});
  const ordered = new Map<
    number,
    { done: Promise<void>; resolve: () => void; reject: (e: any) => void }
  >();
  for (const page of remaining) {
    let resolve!: () => void, reject!: (e: any) => void;
    const done = new Promise<void>((r, j) => {
      resolve = r;
      reject = j;
    });
    void done.catch(() => {});
    ordered.set(page, { done, resolve, reject });
  }
  const activePublications = new Set<Promise<void>>();
  let failed: unknown;
  const fail = (error: unknown) => {
    failed = error;
    rejectStart(error);
    for (const gate of ordered.values()) gate.reject(error);
  };
  try {
    await Promise.all(
      Array.from({ length: o.workers }, async (_, workerIndex) => {
        const worker = new Worker(new URL("./sweep-worker.ts", import.meta.url), {
          workerData: {
            composition: o.composition,
            lane: o.lane,
            scope: o.scope,
            worker: workerIndex,
          },
        });
        threads.push(worker);
        let resolve: ((v: any) => void) | undefined, reject: ((e: any) => void) | undefined;
        let readyResolve!: () => void, readyReject!: (e: any) => void;
        const ready = new Promise<void>((r, j) => {
          readyResolve = r;
          readyReject = j;
        });
        worker.on("error", (e) => {
          readyReject(e);
          reject?.(e);
          fail(e);
        });
        worker.on("exit", (code) => {
          if (code) {
            const e = new Error("worker exited " + code);
            readyReject(e);
            reject?.(e);
            fail(e);
          }
        });
        worker.on("message", async (msg) => {
          if (msg.type === "ready") {
            readyResolve();
            return;
          }
          if (msg.type === "read") {
            try {
              worker.postMessage({
                type: "rows",
                id: msg.id,
                ...(await o.comp.sweepPage(msg.subjects, msg.basis)),
              });
            } catch (e) {
              worker.postMessage({ type: "rows", id: msg.id, error: String(e) });
            }
          } else if (msg.type === "error") reject?.(new Error(msg.error));
          else if (msg.type === "result") resolve?.(msg);
        });
        await ready;
        if (++readyCount === o.workers) {
          workersReadyAt = performance.now();
          // [DX-H6] Why: a long-lived sweep pool exists before paired baseline/live traffic starts.
          // Rejected: excluding startup from P5 wall while letting it distort the live latency arm.
          try {
            await o.beforeTimedWindow?.();
            sweepStarted = performance.now();
            await o.afterTimedStart?.();
            start();
          } catch (error) {
            fail(error);
            throw error;
          }
        }
        await allReady;
        // [DX-H6] Why: bounded double buffering lets the next page fetch/evaluate overlap ordered publication.
        // Rejected: retaining an unbounded ready-results queue or publishing pages out of order.
        const inFlight: Promise<void>[] = [];
        while (
          index < remaining.length &&
          (o.stopAfterPages === undefined || index < o.stopAfterPages)
        ) {
          if (failed) throw failed;
          while (o.controller && (o.controller.limit === 0 || workerIndex >= o.controller.limit))
            await new Promise((r) => setTimeout(r, 10));
          if (
            index >= remaining.length ||
            (o.stopAfterPages !== undefined && index >= o.stopAfterPages)
          )
            break;
          const assignedAtMs = performance.now() - sweepStarted;
          const workerCpuStart = process.cpuUsage();
          const pageIndex = remaining[index++]!,
            subjects = o.subjects.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);
          const page: any = await new Promise((res, rej) => {
            resolve = res;
            reject = rej;
            worker.postMessage({
              type: "page",
              id: pageIndex,
              dispatchedAtEpochMs: performance.timeOrigin + performance.now(),
              subjects,
              captureClosure: o.captureClosure,
              reused: subjects.map((s) => o.reused?.get(s)).filter(Boolean),
              basis: o.basis,
              release: o.release ?? "R2",
              activations: o.activations,
            });
          });
          if (
            !Number.isSafeInteger(page.position) ||
            page.position < o.basis.position ||
            typeof page.epoch !== "string"
          )
            throw new Error("G7 missing/ineligible page snapshot");
          if (!page.fromMemo && epoch !== undefined && page.epoch !== epoch)
            throw new Error("G7 epoch changed; resume requires fresh read");
          if (!page.fromMemo) epoch = page.epoch;
          const decodeStart = performance.now(),
            controllerCpuStart = process.threadCpuUsage();
          const records = JSON.parse(new TextDecoder().decode(page.bytes));
          if (
            canonical(records.map((r: any) => r.subject)) !== canonical(subjects) ||
            records.some(
              (r: any) =>
                r.output.basis.tx !== o.basis.position ||
                r.output.basis.validTime !==
                  new Date(o.basis.validAt).toISOString().replace(".000Z", ".000000Z"),
            )
          )
            throw new Error("G4/G7 worker coverage or basis mismatch");
          const controllerDecodeMs = performance.now() - decodeStart;
          const controllerDecodedCpu = process.threadCpuUsage(controllerCpuStart);
          const controllerDecodeCpuMs =
            (controllerDecodedCpu.user + controllerDecodedCpu.system) / 1000;
          const publishTask = (async () => {
            const ordinal = remaining.indexOf(pageIndex);
            if (ordinal > 0) await ordered.get(remaining[ordinal - 1]!)!.done;
            if (failed) throw failed;
            await o.beforePublish?.();
            const callbackStart = performance.now();
            const callback = o.onPage(records, pageIndex);
            // [DX-H8] Why: activation frames enter the source only after the previous ACK.
            // Rejected: relying on an asynchronous SDK call boundary as proof of native commit order.
            if (!o.orderedPublication) ordered.get(pageIndex)!.resolve();
            const callbackTiming = await callback;
            const callbackWallMs = performance.now() - callbackStart;
            // [EXP-P5] Why: only an ACKed publication advances the cursor. Rejected: advancing at evaluation (drops results on process stop).
            published.push(pageIndex);
            published.sort((a, b) => a - b);
            fs.writeFileSync(o.cursor + ".tmp", canonical({ binding, published }));
            fs.renameSync(o.cursor + ".tmp", o.cursor);
            await o.afterCheckpoint?.(pageIndex);
            metrics.push({
              page: pageIndex,
              subjects: subjects.length,
              worker: workerIndex,
              timing: {
                ...page.timing,
                assignedAtMs,
                workerWaitMs: assignedAtMs,
                completedAtMs: performance.now() - sweepStarted,
                assignedAtEpochMs: performance.timeOrigin + sweepStarted + assignedAtMs,
                clientProcessCpuMsOverlapping:
                  (process.cpuUsage(workerCpuStart).user +
                    process.cpuUsage(workerCpuStart).system) /
                  1000,
                controllerDecodeMs,
                controllerDecodeCpuMs,
                callbackWallMs,
                ...(callbackTiming ?? {}),
              },
              cpu: page.cpu,
              cgroupIntervalMicros: page.cgroupIntervalMicros,
              cpuScope: page.cpuScope,
              elu: page.elu,
              position: page.position,
              epoch: page.epoch,
            });
            if (o.metricsFile)
              fs.appendFileSync(
                o.metricsFile,
                JSON.stringify({
                  sweepId: o.sweepId,
                  scope: o.scope,
                  basis: o.basis,
                  ...metrics.at(-1),
                }) + "\n",
              );
            completed++;
            ordered.get(pageIndex)!.resolve();
          })().catch((e) => {
            fail(e);
            throw e;
          });
          activePublications.add(publishTask);
          void publishTask.finally(() => activePublications.delete(publishTask)).catch(() => {});
          inFlight.push(publishTask);
          if (inFlight.length >= 2) await inFlight.shift();
        }
        await Promise.all(inFlight);
      }),
    );
    return {
      activationStartedAtEpochMs: performance.timeOrigin + sweepStarted,
      workersReadyBeforeTimedWindow: true,
      workerStartupMs: workersReadyAt - startupStarted,
      preTimedWindowHookMs: sweepStarted - workersReadyAt,
      binding,
      wallMs: performance.now() - sweepStarted,
      subjectsPerS: o.subjects.length / ((performance.now() - sweepStarted) / 1000),
      totals: metrics.reduce(
        (sum, m) => {
          for (const [key, value] of Object.entries(m.timing))
            if (typeof value === "number") sum[key] = (sum[key] ?? 0) + value;
          return sum;
        },
        {} as Record<string, number>,
      ),
      published,
      metrics,
      complete: published.length === Math.ceil(o.subjects.length / pageSize),
      controller: CONTROLLER,
    };
  } finally {
    await Promise.all(threads.map((w) => w.terminate()));
    // [DX-H6] Why: a failed page must not release its pin while previously submitted publications are unresolved.
    // Rejected: abandoning in-flight ACKs during worker cleanup.
    await Promise.allSettled(activePublications);
    await pin?.release();
  }
}

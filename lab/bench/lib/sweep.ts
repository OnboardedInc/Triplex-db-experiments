import fs from "node:fs";
import { performance } from "node:perf_hooks";
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
  lane: "xtdb" | "qlever";
  scope: string;
  subjects: readonly string[];
  basis: PositionBasis;
  sweepId: string;
  cursor: string;
  workers: number;
  release?: string;
  activations?: readonly W0.Activation[];
  onPage: (records: readonly any[], page: number) => Promise<void>;
  stopAfterPages?: number;
  afterCheckpoint?: (page: number) => Promise<void>;
  controller?: Controller;
  beforePublish?: () => Promise<void>;
  signal?: AbortSignal;
  readThroughOwner?: boolean;
  /** [EXP-P5N] Return the full world only for every sampleEvery-th subject of the list (default: all). */
  sampleEvery?: number;
  /** [EXP-P5N] D3: workers read SQLite themselves (needs comp.sweepWorkerSpec). */
  directReads?: boolean;
}
export async function runW0Sweep(o: SweepOptions) {
  if (
    !Number.isInteger(o.workers) ||
    o.workers < 1 ||
    // [EXP-P5N] Why: D6, the 4-worker cap is lifted to 16 here and in the owner's sweep connection pool. Rejected: no cap (an unbounded thread count would fail on a typo).
    o.workers > 16 ||
    new Set(o.subjects).size !== o.subjects.length ||
    canonical([...o.subjects].sort()) !== canonical(o.subjects)
  )
    throw new Error("invalid worker count or subject list");
  const binding = {
    sweepId: o.sweepId,
    basis: o.basis,
    listSha256: subjectHash(o.subjects),
    release: o.release ?? null,
    activations: o.activations ?? null,
    pageSize: 64,
    scope: o.scope,
    ...(o.comp.positionBinding
      ? { positionBinding: o.comp.positionBinding(o.basis.position) }
      : {}),
  };
  let published: number[] = [];
  if (fs.existsSync(o.cursor)) {
    const c = JSON.parse(fs.readFileSync(o.cursor, "utf8"));
    if (
      canonical(c.binding) !== canonical(binding) ||
      !Array.isArray(c.published) ||
      c.published.some(
        (x: any) => !Number.isInteger(x) || x < 0 || x >= Math.ceil(o.subjects.length / 64),
      ) ||
      new Set(c.published).size !== c.published.length
    )
      throw new Error("cursor binding/shape mismatch");
    published = c.published;
  }
  const publishedSet = new Set(published);
  const remaining = Array.from({ length: Math.ceil(o.subjects.length / 64) }, (_, i) => i).filter(
    (i) => !publishedSet.has(i),
  );
  let cancelled = false;
  let dispatched = 0,
    index = 0;
  const metrics: any[] = [];
  let epoch: string | undefined;
  const pin = await o.comp.pinBasis?.(o.basis.position, "sweep:" + o.sweepId);
  const threads: Worker[] = [];
  // [EXP-P5N] Why: D3 hands each worker the owner's file, gate and a frozen native-position array so it reads SQLite itself.
  const direct = o.directReads ? await o.comp.sweepWorkerSpec!(o.basis) : undefined;
  // [EXP-P5N] Why: D5. Workers push finished pages to a bounded queue (at most 2W) and a single publisher drains it, so a worker never waits for the publication of its own page.
  // The cursor still advances only on an ACKed publication and records a set, so out-of-order publication resumes correctly. Rejected: publishing from each worker (W concurrent publishers
  // would interleave outbox frames and split the writer's group commits).
  const queue: { records: any[]; pageIndex: number; page: any; resultAt: number; parsedAt: number }[] = [];
  const queueLimit = 2 * o.workers;
  const waiters: (() => void)[] = [];
  const signal = () => {
    for (const w of waiters.splice(0)) w();
  };
  const waitSignal = () => new Promise<void>((r) => waiters.push(r));
  let workersLive = o.workers;
  let fatal: ((e: any) => void) | undefined;
  const failure = new Promise<never>((_, rej) => (fatal = rej));
  failure.catch(() => {});
  try {
    const run = Promise.all([
      ...Array.from({ length: o.workers }, async (_, workerIndex) => {
        try {
          const worker = new Worker(new URL("./sweep-worker.ts", import.meta.url), {
            workerData: {
              composition: o.composition,
              lane: o.lane,
              scope: o.scope,
              rpcReads: o.readThroughOwner,
              direct,
            },
          });
          threads.push(worker);
          let resolve: ((v: any) => void) | undefined, reject: ((e: any) => void) | undefined;
          worker.on("error", (e) => (reject ?? fatal)?.(e));
          o.signal?.addEventListener("abort", () => (reject ?? fatal)?.(o.signal!.reason), { once: true });
          worker.on("exit", (code) => {
            if (code && !cancelled) (reject ?? fatal)?.(new Error("worker exited " + code));
          });
          worker.on("message", async (msg) => {
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
            } else if (msg.type === "error") (reject ?? fatal)?.(new Error(msg.error));
            else if (msg.type === "result") resolve?.(msg);
          });
          while (index < remaining.length && (o.stopAfterPages === undefined || dispatched < o.stopAfterPages)) {
            while (
              !cancelled &&
              index < remaining.length &&
              o.controller &&
              (o.controller.limit === 0 || workerIndex >= o.controller.limit)
            )
              await new Promise((r) => setTimeout(r, 10));
            o.signal?.throwIfAborted();
            while (!cancelled && queue.length >= queueLimit) await waitSignal();
            if (cancelled || index >= remaining.length) break;
            if (o.stopAfterPages !== undefined && dispatched >= o.stopAfterPages) break;
            dispatched++;
            const pageIndex = remaining[index++]!,
              subjects = o.subjects.slice(pageIndex * 64, (pageIndex + 1) * 64);
            const page: any = await new Promise((res, rej) => {
              resolve = res;
              reject = rej;
              worker.postMessage({
                type: "page",
                id: pageIndex,
                subjects,
                basis: o.basis,
                release: o.release ?? "R2",
                activations: o.activations,
                sample:
                  o.sampleEvery === undefined
                    ? undefined
                    : subjects.map((_, i) => (pageIndex * 64 + i) % o.sampleEvery! === 0),
              });
            });
            reject = undefined;
            if (
              !Number.isSafeInteger(page.position) ||
              page.position < o.basis.position ||
              typeof page.epoch !== "string"
            )
              throw new Error("G7 missing/ineligible page snapshot");
            if (epoch !== undefined && page.epoch !== epoch)
              throw new Error("G7 epoch changed; resume requires fresh read");
            epoch = page.epoch;
            const resultAt = performance.timeOrigin + performance.now();
            const records = JSON.parse(new TextDecoder().decode(page.bytes));
            const parsedAt = performance.timeOrigin + performance.now();
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
            queue.push({ records, pageIndex, page, resultAt, parsedAt });
            signal();
          }
        } catch (e) {
          fatal?.(e);
        } finally {
          workersLive--;
          signal();
        }
      }),
      (async () => {
        try {
          for (;;) {
            while (!queue.length && workersLive > 0 && !cancelled) await waitSignal();
            const item = queue.shift();
            if (!item) break;
            signal();
            const { records, pageIndex, page, resultAt, parsedAt } = item;
            await o.beforePublish?.();
            const pubStart = performance.timeOrigin + performance.now();
            await o.onPage(records, pageIndex);
            const pubEnd = performance.timeOrigin + performance.now();
            // [EXP-P5] Why: only an ACKed publication advances the cursor. Rejected: advancing at evaluation (drops results on process stop).
            published.push(pageIndex);
            published.sort((a, b) => a - b);
            fs.writeFileSync(o.cursor + ".tmp", canonical({ binding, published }));
            fs.renameSync(o.cursor + ".tmp", o.cursor);
            const cursorEnd = performance.timeOrigin + performance.now();
            await o.afterCheckpoint?.(pageIndex);
            metrics.push({
              page: pageIndex,
              store: page.store,
              cpu: page.cpu,
              cpuScope: page.cpuScope,
              elu: page.elu,
              position: page.position,
              epoch: page.epoch,
              // [EXP-P5N] Why: per-page timeline (absolute ms): worker start, read end, kernel end, encode end, result received, parsed, publish start and end, cursor written.
              tl: { ...page.tl, resultAt, parsedAt, pubStart, pubEnd, cursorEnd },
            });
          }
        } catch (e) {
          fatal?.(e);
        }
      })(),
    ]);
    await Promise.race([run, failure]);
    return {
      binding,
      published,
      metrics,
      complete: published.length === Math.ceil(o.subjects.length / 64),
      controller: CONTROLLER,
    };
  } finally {
    cancelled = true;
    signal();
    await Promise.all(threads.map((w) => w.terminate()));
    await pin?.release();
  }
}

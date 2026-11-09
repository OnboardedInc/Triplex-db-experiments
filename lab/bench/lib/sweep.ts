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
}
export async function runW0Sweep(o: SweepOptions) {
  if (
    !Number.isInteger(o.workers) ||
    o.workers < 1 ||
    o.workers > 4 ||
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
  const remaining = Array.from({ length: Math.ceil(o.subjects.length / 64) }, (_, i) => i).filter(
    (i) => !published.includes(i),
  );
  let cancelled = false;
  let completed = 0,
    index = 0;
  const metrics: any[] = [];
  let epoch: string | undefined;
  const pin = await o.comp.pinBasis?.(o.basis.position, "sweep:" + o.sweepId);
  const threads: Worker[] = [];
  try {
    await Promise.all(
      Array.from({ length: o.workers }, async (_, workerIndex) => {
        const worker = new Worker(new URL("./sweep-worker.ts", import.meta.url), {
          workerData: {
            composition: o.composition,
            lane: o.lane,
            scope: o.scope,
            rpcReads: o.readThroughOwner,
          },
        });
        threads.push(worker);
        let resolve: ((v: any) => void) | undefined, reject: ((e: any) => void) | undefined;
        worker.on("error", (e) => reject?.(e));
        o.signal?.addEventListener("abort", () => reject?.(o.signal!.reason), { once: true });
        worker.on("exit", (code) => {
          if (code) reject?.(new Error("worker exited " + code));
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
          } else if (msg.type === "error") reject?.(new Error(msg.error));
          else if (msg.type === "result") resolve?.(msg);
        });
        while (
          index < remaining.length &&
          (o.stopAfterPages === undefined || completed < o.stopAfterPages)
        ) {
          while (
            !cancelled &&
            index < remaining.length &&
            o.controller &&
            (o.controller.limit === 0 || workerIndex >= o.controller.limit)
          )
            await new Promise((r) => setTimeout(r, 10));
          o.signal?.throwIfAborted();
          if (cancelled || index >= remaining.length) break;
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
            });
          });
          if (
            !Number.isSafeInteger(page.position) ||
            page.position < o.basis.position ||
            typeof page.epoch !== "string"
          )
            throw new Error("G7 missing/ineligible page snapshot");
          if (epoch !== undefined && page.epoch !== epoch)
            throw new Error("G7 epoch changed; resume requires fresh read");
          epoch = page.epoch;
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
          await o.beforePublish?.();
          await o.onPage(records, pageIndex);
          // [EXP-P5] Why: only an ACKed publication advances the cursor. Rejected: advancing at evaluation (drops results on process stop).
          published.push(pageIndex);
          published.sort((a, b) => a - b);
          fs.writeFileSync(o.cursor + ".tmp", canonical({ binding, published }));
          fs.renameSync(o.cursor + ".tmp", o.cursor);
          await o.afterCheckpoint?.(pageIndex);
          metrics.push({
            page: pageIndex,
            store: page.store,
            cpu: page.cpu,
            cpuScope: page.cpuScope,
            elu: page.elu,
            position: page.position,
            epoch: page.epoch,
          });
          completed++;
        }
      }),
    );
    return {
      binding,
      published,
      metrics,
      complete: published.length === Math.ceil(o.subjects.length / 64),
      controller: CONTROLLER,
    };
  } finally {
    cancelled = true;
    await Promise.all(threads.map((w) => w.terminate()));
    await pin?.release();
  }
}

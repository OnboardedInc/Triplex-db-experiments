import { AsyncLocalStorage } from "node:async_hooks";
import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  createWriteStream,
  readFileSync,
  openSync,
  readSync,
  readdirSync,
  readlinkSync,
  existsSync,
} from "node:fs";
import { join } from "node:path";
import { performance, PerformanceObserver, monitorEventLoopDelay } from "node:perf_hooks";
import { threadId } from "node:worker_threads";
import { createGzip } from "node:zlib";

export interface SchedulerSnapshot {
  at: number;
  runtimeNs: number;
  runqueueNs: number;
  switches: number;
  waitEnabled: boolean;
}
export function parseSchedulerStats(
  value: string,
): Omit<SchedulerSnapshot, "at" | "waitEnabled"> | undefined {
  const fields = value.trim().split(/\s+/).map(Number);
  if (fields.length !== 3 || !fields.every((v) => Number.isSafeInteger(v) && v >= 0)) return;
  return { runtimeNs: fields[0]!, runqueueNs: fields[1]!, switches: fields[2]! };
}
let fd: number | undefined;
let unavailable = process.platform !== "linux";
let waitEnabled = false;
const buffer = Buffer.alloc(128);
// [DX-T1-2] Why: a persistent per-isolate descriptor measures this Linux thread at boundaries without reopening procfs.
// Rejected: process.cpuUsage (all threads), clock ticks (too coarse), or calling a zero disabled wait counter zero contention.
export function readSchedulerSnapshot(): SchedulerSnapshot | undefined {
  if (unavailable) return;
  try {
    if (fd === undefined) {
      fd = openSync("/proc/thread-self/schedstat", "r");
      waitEnabled = readFileSync("/proc/sys/kernel/sched_schedstats", "utf8").trim() === "1";
    }
    const n = readSync(fd, buffer, 0, buffer.length, 0);
    const counters = parseSchedulerStats(buffer.toString("utf8", 0, n));
    return counters
      ? { ...counters, waitEnabled, at: performance.timeOrigin + performance.now() }
      : undefined;
  } catch {
    unavailable = true;
    return;
  }
}

export type TraceLevel = "off" | "summary" | "full";
export type TraceAttributes = Record<string, string | number | boolean | null>;
export interface TraceSpan {
  id: string;
  parent?: string | undefined;
  name: string;
  layer: string;
  start: number;
  end: number;
  attributes?: TraceAttributes;
  synchronous?: boolean;
  schedulerStart?: SchedulerSnapshot | undefined;
  schedulerEnd?: SchedulerSnapshot | undefined;
}
export interface TraceClock {
  domain: "linux-monotonic";
  bootId: string;
  offsetMs: number;
  uncertaintyMs: number;
}
export interface RequestTrace {
  clock?: TraceClock | undefined;
  schema: "triplex.trace.v1";
  type: "request";
  run: string;
  source: string;
  slot: string;
  process: string;
  thread: number;
  traceId: string;
  kind: "commit" | "read" | "internal";
  name: string;
  start: number;
  end: number;
  root: string;
  parent?: string | undefined;
  spans: TraceSpan[];
  attributes: TraceAttributes;
  truncated: number;
  schedulerStart?: SchedulerSnapshot | undefined;
  schedulerEnd?: SchedulerSnapshot | undefined;
}
type Context = { trace: RequestTrace; span: string };
const context = new AsyncLocalStorage<Context>();
const liveSpans = new WeakMap<RequestTrace, Map<string, string>>();
const configured =
  process.env["TRIPLEX_TRACE_NODE"] === "0" ? "off" : (process.env["TRIPLEX_TRACE_LEVEL"] ?? "off");
if (!["off", "summary", "full"].includes(configured))
  throw new TypeError("TRIPLEX_TRACE_LEVEL must be off, summary or full");
export const traceLevel = configured as TraceLevel;
export const TRACE_SLOW_READ_MS = 50;
export const TRACE_READ_SAMPLE = 1024;
export function parseTraceCpuSet(value: string): number[] {
  if (!/^\d+(,\d+)*$/.test(value)) throw new TypeError("Expected a comma-separated CPU list");
  const cpus = value.split(",").map(Number);
  if (
    new Set(cpus).size !== cpus.length ||
    cpus.some((c) => !Number.isSafeInteger(c) || c < 0 || c > 65535)
  )
    throw new TypeError("Invalid/duplicate CPU");
  return cpus;
}
// [DX-T1-2] Why: a measured writer can reserve a core while reader, replica and runtime threads share the others.
// Rejected: change read concurrency, hide queue delay, or let new workers inherit the writer's exclusive affinity.
function configureThreadPlacement(): void {
  const main = process.env["TRIPLEX_NODE_MAIN_CPUS"],
    workers = process.env["TRIPLEX_NODE_WORKER_CPUS"];
  if (!main && !workers) return;
  if (process.platform !== "linux" || !main || !workers)
    throw new Error("Thread placement requires Linux and both CPU lists");
  const mainSet = parseTraceCpuSet(main),
    workerSet = parseTraceCpuSet(workers);
  if (mainSet.some((c) => workerSet.includes(c)))
    throw new Error("Writer and worker CPU sets must be disjoint");
  const tid = Number(readlinkSync("/proc/thread-self").split("/").at(-1));
  if (!Number.isSafeInteger(tid) || tid < 1) throw new Error("Missing Linux thread identity");
  const pin = (target: number, cpus: string) => {
    try {
      execFileSync("/usr/bin/taskset", ["-pc", cpus, String(target)], { stdio: "pipe" });
    } catch (error) {
      if (existsSync(`/proc/self/task/${target}`)) throw error;
    }
  };
  if (threadId === 0)
    for (const child of readdirSync("/proc/self/task"))
      if (Number(child) !== tid) pin(Number(child), workers);
  pin(tid, threadId === 0 ? main : workers);
  const allowed = (readFileSync(`/proc/self/task/${tid}/status`, "utf8").match(
    /^Cpus_allowed_list:\s*(.+)$/m,
  ) ?? [])[1]?.trim();
  const background =
    threadId === 0
      ? readdirSync("/proc/self/task")
          .filter((t) => Number(t) !== tid)
          .map((t) => ({
            tid: Number(t),
            allowed: (readFileSync(`/proc/self/task/${t}/status`, "utf8").match(
              /^Cpus_allowed_list:\s*(.+)$/m,
            ) ?? [])[1]?.trim(),
          }))
      : undefined;
  process.stdout.write(
    JSON.stringify({
      type: "node-thread-placement",
      at: Date.now(),
      run: process.env["TRIPLEX_TRACE_RUN"],
      source: process.env["TRIPLEX_TRACE_SOURCE"],
      slot: process.env["TRIPLEX_TRACE_SLOT"],
      pid: process.pid,
      thread: threadId,
      tid,
      main,
      workers,
      allowed,
      background,
    }) + "\n",
  );
}
configureThreadPlacement();
function readTraceClock(): TraceClock | undefined {
  if (process.platform !== "linux") return;
  try {
    const bootId = readFileSync("/proc/sys/kernel/random/boot_id", "utf8").trim();
    const before = Number(process.hrtime.bigint()) / 1e6;
    const epoch = performance.timeOrigin + performance.now();
    const after = Number(process.hrtime.bigint()) / 1e6;
    return {
      domain: "linux-monotonic",
      bootId,
      offsetMs: epoch - (before + after) / 2,
      uncertaintyMs: (after - before) / 2,
    };
  } catch {
    return;
  }
}
const identity = {
  clock: readTraceClock(),
  run: process.env["TRIPLEX_TRACE_RUN"] ?? "unbound",
  source: process.env["TRIPLEX_TRACE_SOURCE"] ?? "unbound",
  slot: process.env["TRIPLEX_TRACE_SLOT"] ?? "unbound",
  process: `${process.env["TRIPLEX_TRACE_PROCESS"] ?? "node"}-${process.pid}`,
  thread: threadId,
};
let serial = 0;
const prefix = randomBytes(8).toString("hex");
// [DX-T1] Why: continued traces cross isolates; a process-local counter alone collides across workers.
// Rejected: crypto allocation for every span; a random 64-bit starting point plus increment is cheap.
let spanCounter = BigInt("0x" + randomBytes(8).toString("hex"));
const spanId = () => {
  spanCounter = (spanCounter + 1n) & 0xffffffffffffffffn;
  if (spanCounter === 0n) spanCounter = 1n;
  return spanCounter.toString(16).padStart(16, "0");
};
export const traceNow = () => performance.timeOrigin + performance.now();
let failure: string | undefined;
let sink: ReturnType<typeof createGzip> | undefined;
let output: ReturnType<typeof createWriteStream> | undefined;
let stopped = false;
let pendingOutput: string[] = [];
let pendingBytes = 0;
let outputTimer: ReturnType<typeof setTimeout> | undefined;
const topReads = new Map<string, RequestTrace[]>();
const emitted = new WeakSet<RequestTrace>();
const histograms = new Map<string, { count: number; max: number; buckets: number[] }>();

// [DX-T1-2] Why: one zlib job per small record adds cross-thread bookkeeping on the request path; a bounded batch amortizes it.
// Rejected: sampling commits, moving timestamps, or leaving the final partial batch to an unreferenced timer.
function flushOutput(): void {
  if (outputTimer) clearTimeout(outputTimer);
  outputTimer = undefined;
  if (!pendingOutput.length || !sink) return;
  const chunk = pendingOutput.join("");
  pendingOutput = [];
  pendingBytes = 0;
  try {
    sink.write(chunk);
  } catch (error) {
    failure = String(error);
    process.stderr.write("Triplex trace output failed; trace evidence is incomplete\n");
  }
}

// [DX-T1] Why: batch compressed output per isolate; no payloads, SQL, entity IDs or error messages.
// Rejected: an SDK/exporter and synchronous writes on the commit thread.
function emit(row: object): void {
  if (traceLevel === "off" || stopped || failure) return;
  const directory = process.env["TRIPLEX_TRACE_DIR"];
  if (!directory) return;
  try {
    if (!sink) {
      mkdirSync(directory, { recursive: true });
      output = createWriteStream(join(directory, `node-${process.pid}-${threadId}.jsonl.gz`), {
        flags: "wx",
      });
      sink = createGzip({ level: 1 });
      const failed = (error: Error) => {
        failure = error.message;
        process.stderr.write("Triplex trace output failed; trace evidence is incomplete\n");
      };
      output.on("error", failed);
      sink.on("error", failed);
      sink.pipe(output);
    }
    const line = JSON.stringify({ ...identity, ...row }) + "\n";
    pendingOutput.push(line);
    pendingBytes += Buffer.byteLength(line);
    if (pendingBytes >= 65536) flushOutput();
    else if (!outputTimer) {
      outputTimer = setTimeout(flushOutput, 20);
      outputTimer.unref();
    }
  } catch (error) {
    failure = String(error);
  }
}
export function parseTraceparent(value: unknown): { traceId: string; parent: string } | undefined {
  if (typeof value !== "string") return;
  const match = /^00-([0-9a-f]{32})-([0-9a-f]{16})-0[01]$/.exec(value);
  if (!match || /^0+$/.test(match[1]!) || /^0+$/.test(match[2]!)) return;
  return { traceId: match[1]!, parent: match[2]! };
}
export function sampledTrace(traceId: string): boolean {
  let hash = 2166136261;
  for (let i = 0; i < traceId.length; i++)
    hash = Math.imul(hash ^ traceId.charCodeAt(i), 16777619) >>> 0;
  return hash % TRACE_READ_SAMPLE === 0;
}
export function keepTrace(kind: string, traceId: string, duration: number): boolean {
  return kind !== "read" || duration >= TRACE_SLOW_READ_MS || sampledTrace(traceId);
}
export function beginTrace(
  kind: RequestTrace["kind"],
  name: string,
  attributes: TraceAttributes = {},
  start = traceNow(),
): RequestTrace | undefined {
  if (traceLevel === "off") return;
  return {
    schema: "triplex.trace.v1",
    type: "request",
    ...identity,
    traceId: prefix + (++serial).toString(16).padStart(16, "0"),
    kind,
    name,
    start,
    end: start,
    root: spanId(),
    spans: [],
    attributes,
    truncated: 0,
    ...(kind === "commit" && threadId === 0 ? { schedulerStart: readSchedulerSnapshot() } : {}),
  };
}
export interface WireTraceContext {
  traceId: string;
  parent: string;
  run: string;
  source: string;
  slot: string;
  kind?: RequestTrace["kind"];
}
export function captureTraceContext(): WireTraceContext | undefined {
  const active = context.getStore();
  return active
    ? {
        traceId: active.trace.traceId,
        parent: active.span,
        run: active.trace.run,
        source: active.trace.source,
        slot: active.trace.slot,
        kind: active.trace.attributes["logicalKind"] === "commit" ? "commit" : active.trace.kind,
      }
    : undefined;
}
export async function continueTrace<A>(
  wire: WireTraceContext | undefined,
  name: string,
  run: () => Promise<A>,
): Promise<A> {
  if (traceLevel === "off") return run();
  const parsed = wire ? parseTraceparent(`00-${wire.traceId}-${wire.parent}-01`) : undefined;
  const trace = beginTrace("internal", name)!;
  if (
    parsed &&
    wire?.run === identity.run &&
    wire.source === identity.source &&
    wire.slot === identity.slot
  ) {
    trace.traceId = parsed.traceId;
    trace.parent = parsed.parent;
    if (wire.kind === "commit") trace.attributes["logicalKind"] = "commit";
  } else if (wire) trace.attributes["invalidParent"] = true;
  try {
    return await withTrace(trace, run);
  } finally {
    finishTrace(trace);
  }
}
export function currentTrace(): RequestTrace | undefined {
  return context.getStore()?.trace;
}
export function withTrace<A>(trace: RequestTrace | undefined, run: () => A): A {
  return trace ? context.run({ trace, span: trace.root }, run) : run();
}
// [DX-T1-2] Why: a queued callback can be invoked by another request's HTTP finish event.
// Rejected: ordinary closure capture (AsyncLocalStorage follows the caller, not where the function was created).
export function bindTraceCallback<A extends unknown[], R>(
  callback: (...args: A) => R,
): (...args: A) => R {
  const active = context.getStore();
  return active ? (...args: A) => context.run(active, () => callback(...args)) : callback;
}
export function beginSpan(
  name: string,
  layer = "typescript",
  attributes?: TraceAttributes,
): TraceSpan | undefined {
  const active = context.getStore();
  if (!active || traceLevel === "off") return;
  const id = spanId();
  if (active.trace.kind === "commit" || active.trace.attributes["logicalKind"] === "commit") {
    const spans = liveSpans.get(active.trace) ?? new Map<string, string>();
    spans.set(id, name);
    liveSpans.set(active.trace, spans);
  }
  return {
    id,
    parent: active.span,
    name,
    layer,
    start: traceNow(),
    end: 0,
    ...(attributes ? { attributes } : {}),
  };
}
export function addSpan(trace: RequestTrace | undefined, span: TraceSpan): void {
  if (!trace) return;
  // [DX-T1] Why: bound a pathological request while reporting every omitted span.
  // Rejected: silently exhausting memory during a slow read or marking omitted work explained.
  if (trace.spans.length >= 8192) {
    trace.truncated++;
    return;
  }
  trace.spans.push(span);
}
export function endSpan(span: TraceSpan | undefined, attributes?: TraceAttributes): void {
  const trace = currentTrace();
  if (!span || !trace) return;
  span.end = traceNow();
  liveSpans.get(trace)?.delete(span.id);
  if (attributes) span.attributes = { ...span.attributes, ...attributes };
  if (
    traceLevel === "summary" &&
    trace.kind === "read" &&
    span.layer === "typescript" &&
    span.end - span.start < 0.5 &&
    !trace.spans.some((child) => child.parent === span.id)
  )
    return;
  addSpan(trace, span);
}
export function inSpan<A>(span: TraceSpan | undefined, run: () => A): A {
  const active = context.getStore();
  return span && active ? context.run({ trace: active.trace, span: span.id }, run) : run();
}
export function traceSync<A>(
  name: string,
  run: () => A,
  layer = "typescript",
  attributes?: TraceAttributes,
): A {
  const span = beginSpan(name, layer, attributes);
  if (span) {
    span.synchronous = true;
    const trace = currentTrace();
    if (trace?.kind === "commit" || trace?.attributes["logicalKind"] === "commit")
      span.schedulerStart = readSchedulerSnapshot();
  }
  try {
    return inSpan(span, run);
  } finally {
    if (span?.schedulerStart) span.schedulerEnd = readSchedulerSnapshot();
    endSpan(span);
    // [DX-T1] Why: long synchronous work must be visible to other requests queued on this same isolate.
    // Rejected: showing a queue stall without the other request's blocking stack scope.
    if (span && span.end - span.start >= 1)
      emit({
        type: "event",
        name: span.name,
        layer: span.layer,
        start: span.start,
        end: span.end,
        traceId: currentTrace()?.traceId,
        attributes: span.attributes,
        synchronous: true,
      });
  }
}
export function traceWork<A>(
  name: string,
  run: () => A,
  attributes?: TraceAttributes,
  retainEvery = false,
): A {
  if (traceLevel === "off") return run();
  if (currentTrace()) return traceSync(name, run, "typescript", attributes);
  const start = traceNow();
  try {
    return run();
  } finally {
    const end = traceNow();
    if (retainEvery || end - start >= 0.5)
      emit({ type: "event", name, layer: "typescript", start, end, attributes });
  }
}
export async function traceAsync<A>(
  name: string,
  run: () => Promise<A>,
  layer = "typescript",
): Promise<A> {
  const span = beginSpan(name, layer);
  try {
    return await inSpan(span, run);
  } finally {
    endSpan(span);
  }
}
export function traceInterval(
  trace: RequestTrace | undefined,
  name: string,
  start: number,
  end: number,
  layer: string,
  parent?: string,
  attributes?: TraceAttributes,
): void {
  if (Number.isFinite(start) && Number.isFinite(end) && end >= start)
    addSpan(trace, {
      id: spanId(),
      parent: parent ?? trace?.root,
      name,
      layer,
      start,
      end,
      ...(attributes ? { attributes } : {}),
    });
}
// [DX-T1-2] Why: record the actual in-flight steps during long waits, rather than reconstruct a stage from its eventual result.
// Rejected: treating a later completed span as the stage observed while its dependent job was waiting.
export function currentTraceStep(trace: RequestTrace | undefined): string {
  if (!trace) return "untraced";
  return (
    [...(liveSpans.get(trace)?.values() ?? [])].at(-1) ??
    (trace.end > trace.start ? "completed" : trace.name)
  );
}
export function traceResource(name: string, fields: Record<string, unknown>): void {
  emit({ type: "resource", name, at: traceNow(), ...fields });
}
export function traceparent(span?: TraceSpan): string {
  const active = context.getStore();
  // [DX-T1] Why: even level off preserves W3C wire propagation for another service's tracing.
  // Rejected: treating the sampling flag as permission to omit request identity.
  return `00-${active?.trace.traceId ?? randomBytes(16).toString("hex")}-${span?.id ?? active?.span ?? spanId()}-01`;
}
export function finishTrace(
  trace: RequestTrace | undefined,
  attributes: TraceAttributes = {},
): void {
  if (!trace) return;
  if (trace.schedulerStart) trace.schedulerEnd = readSchedulerSnapshot();
  trace.end = traceNow();
  Object.assign(trace.attributes, attributes);
  const duration = trace.end - trace.start;
  const key = `${trace.kind}:${trace.attributes["phase"] ?? "unphased"}`;
  const h = histograms.get(key) ?? {
    count: 0,
    max: 0,
    buckets: Array.from({ length: 256 }, () => 0),
  };
  h.count++;
  h.max = Math.max(h.max, duration);
  const bucket = Math.max(
    0,
    Math.min(255, Math.floor(Math.log2(Math.max(0.001, duration) / 0.001) * 8)),
  );
  h.buckets[bucket] = (h.buckets[bucket] ?? 0) + 1;
  histograms.set(key, h);
  // [DX-T1] Why: retain the actual top 20 per phase/thread even when every read is below the slow threshold.
  // Rejected: presenting the slowest fixed-sample reads as the actual slowest reads.
  if (trace.kind === "read") {
    const top = topReads.get(key) ?? [];
    if (top.length < 20 || duration > top[0]!.end - top[0]!.start) {
      top.push(trace);
      top.sort((a, b) => a.end - a.start - (b.end - b.start));
      if (top.length > 20) top.shift();
      topReads.set(key, top);
    }
  }
  if (keepTrace(trace.kind, trace.traceId, duration)) {
    emit(trace);
    emitted.add(trace);
  }
}
export async function tracedRequest<A>(
  kind: RequestTrace["kind"],
  name: string,
  attributes: TraceAttributes,
  run: () => Promise<A>,
): Promise<A> {
  if (currentTrace()) return traceAsync(name, run);
  const trace = beginTrace(kind, name, attributes);
  try {
    return await withTrace(trace, run);
  } finally {
    finishTrace(trace);
  }
}

let telemetryTimer: ReturnType<typeof setInterval> | undefined;
let gc: PerformanceObserver | undefined;
let delay: ReturnType<typeof monitorEventLoopDelay> | undefined;
function threadCpu(): number | null {
  try {
    const stat = readFileSync("/proc/thread-self/stat", "utf8");
    const fields = stat.slice(stat.lastIndexOf(")") + 2).split(" ");
    return (Number(fields[11]) + Number(fields[12])) * 10;
  } catch {
    return null;
  }
}
export function startTraceTelemetry(): void {
  if (traceLevel === "off" || telemetryTimer) return;
  gc = new PerformanceObserver((list) => {
    for (const entry of list.getEntries())
      emit({
        type: "event",
        name: "node.gc",
        layer: "typescript-gc",
        start: performance.timeOrigin + entry.startTime,
        end: performance.timeOrigin + entry.startTime + entry.duration,
      });
  });
  gc.observe({ entryTypes: ["gc"] });
  delay = monitorEventLoopDelay({ resolution: 10 });
  delay.enable();
  let previous = traceNow();
  let elu = performance.eventLoopUtilization();
  telemetryTimer = setInterval(() => {
    const at = traceNow();
    const next = performance.eventLoopUtilization();
    // Timer drift locates a bounded stall interval, not a proof of its cause.
    if (at - previous > 1020)
      emit({
        type: "event",
        name: "node.timer-drift (estimated)",
        layer: "event-loop",
        start: previous + 1000,
        end: at,
        estimated: true,
      });
    emit({
      type: "resource",
      at,
      threadCpuMs: threadCpu(),
      processCpu: process.cpuUsage(),
      memory: process.memoryUsage(),
      heapUsedScope: "isolate",
      rssScope: "process",
      elu: performance.eventLoopUtilization(next, elu),
      loopDelay: {
        p50: delay!.percentile(50) / 1e6,
        p99: delay!.percentile(99) / 1e6,
        max: delay!.max / 1e6,
      },
    });
    delay!.reset();
    previous = at;
    elu = next;
  }, 1000);
  telemetryTimer.unref();
  emit({
    type: "metadata",
    at: traceNow(),
    level: traceLevel,
    slowReadMs: TRACE_SLOW_READ_MS,
    readSample: TRACE_READ_SAMPLE,
    topReadsPerPhase: 20,
    clock: "unix-ms anchored to monotonic performance clock",
  });
}
export async function flushTracing(): Promise<void> {
  if (stopped) return;
  if (telemetryTimer) clearInterval(telemetryTimer);
  gc?.disconnect();
  delay?.disable();
  for (const top of topReads.values())
    for (const trace of top)
      if (!emitted.has(trace)) {
        trace.attributes["retention"] = "phase-top20";
        emit(trace);
        emitted.add(trace);
      }
  emit({
    type: "histograms",
    at: traceNow(),
    histograms: Object.fromEntries(histograms),
    failure: failure ?? null,
  });
  flushOutput();
  stopped = true;
  if (!sink || !output || failure) return;
  const destination = output;
  await new Promise<void>((resolve) => {
    destination.once("close", resolve);
    destination.once("error", () => resolve());
    sink!.end();
  });
}
if (traceLevel !== "off" && process.env["TRIPLEX_TRACE_DIR"]) {
  startTraceTelemetry();
  process.once("beforeExit", () => {
    void flushTracing();
  });
}

import { AsyncLocalStorage } from "node:async_hooks";
import { randomBytes } from "node:crypto";
import { mkdirSync, createWriteStream, readFileSync } from "node:fs";
import { join } from "node:path";
import { performance, PerformanceObserver, monitorEventLoopDelay } from "node:perf_hooks";
import { threadId } from "node:worker_threads";
import { createGzip } from "node:zlib";

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
}
export interface RequestTrace {
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
  spans: TraceSpan[];
  attributes: TraceAttributes;
  truncated: number;
}
type Context = { trace: RequestTrace; span: string };
const context = new AsyncLocalStorage<Context>();
const configured = process.env["TRIPLEX_TRACE_LEVEL"] ?? "off";
if (!["off", "summary", "full"].includes(configured))
  throw new TypeError("TRIPLEX_TRACE_LEVEL must be off, summary or full");
export const traceLevel = configured as TraceLevel;
export const TRACE_SLOW_READ_MS = 50;
export const TRACE_READ_SAMPLE = 1024;
const identity = {
  run: process.env["TRIPLEX_TRACE_RUN"] ?? "unbound",
  source: process.env["TRIPLEX_TRACE_SOURCE"] ?? "unbound",
  slot: process.env["TRIPLEX_TRACE_SLOT"] ?? "unbound",
  process: `${process.env["TRIPLEX_TRACE_PROCESS"] ?? "node"}-${process.pid}`,
  thread: threadId,
};
let serial = 0;
const prefix = randomBytes(8).toString("hex");
const spanId = () => (++serial).toString(16).padStart(16, "0");
export const traceNow = () => performance.timeOrigin + performance.now();
let failure: string | undefined;
let sink: ReturnType<typeof createGzip> | undefined;
let output: ReturnType<typeof createWriteStream> | undefined;
let stopped = false;
const histograms = new Map<string, { count: number; max: number; buckets: number[] }>();

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
    sink.write(JSON.stringify({ ...identity, ...row }) + "\n");
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
  };
}
export function currentTrace(): RequestTrace | undefined {
  return context.getStore()?.trace;
}
export function withTrace<A>(trace: RequestTrace | undefined, run: () => A): A {
  return trace ? context.run({ trace, span: trace.root }, run) : run();
}
export function beginSpan(
  name: string,
  layer = "typescript",
  attributes?: TraceAttributes,
): TraceSpan | undefined {
  const active = context.getStore();
  if (!active || traceLevel === "off") return;
  return {
    id: spanId(),
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
  if (attributes) span.attributes = { ...span.attributes, ...attributes };
  if (traceLevel === "summary" && span.layer === "typescript" && span.end - span.start < 0.5)
    return;
  addSpan(trace, span);
}
export function inSpan<A>(span: TraceSpan | undefined, run: () => A): A {
  const active = context.getStore();
  return span && active ? context.run({ trace: active.trace, span: span.id }, run) : run();
}
export function traceSync<A>(name: string, run: () => A, layer = "typescript"): A {
  const span = beginSpan(name, layer);
  try {
    return inSpan(span, run);
  } finally {
    endSpan(span);
  }
}
export function traceWork<A>(name: string, run: () => A): A {
  if (traceLevel === "off") return run();
  if (currentTrace()) return traceSync(name, run);
  const start = traceNow();
  try {
    return run();
  } finally {
    const end = traceNow();
    if (end - start >= 0.5) emit({ type: "event", name, layer: "typescript", start, end });
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
  trace.end = traceNow();
  Object.assign(trace.attributes, attributes);
  const duration = trace.end - trace.start;
  const key = `${trace.kind}:${trace.attributes["phase"] ?? "unphased"}`;
  const h = histograms.get(key) ?? { count: 0, max: 0, buckets: new Array<number>(256).fill(0) };
  h.count++;
  h.max = Math.max(h.max, duration);
  const bucket = Math.max(
    0,
    Math.min(255, Math.floor(Math.log2(Math.max(0.001, duration) / 0.001) * 8)),
  );
  h.buckets[bucket] = (h.buckets[bucket] ?? 0) + 1;
  histograms.set(key, h);
  if (keepTrace(trace.kind, trace.traceId, duration)) emit(trace);
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
    clock: "unix-ms anchored to monotonic performance clock",
  });
}
export async function flushTracing(): Promise<void> {
  if (stopped) return;
  if (telemetryTimer) clearInterval(telemetryTimer);
  gc?.disconnect();
  delay?.disable();
  emit({
    type: "histograms",
    at: traceNow(),
    histograms: Object.fromEntries(histograms),
    failure: failure ?? null,
  });
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

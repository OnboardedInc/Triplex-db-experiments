import { AsyncLocalStorage } from "node:async_hooks";
import { open } from "node:fs/promises";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import {
  beginTrace,
  finishTrace,
  withTrace,
  type DatomicRequestSample,
  type RequestTrace,
} from "@triplex-build/triplex-datomic";
import type { Timing } from "./actions.ts";

type GatewayEvent = {
  type: string;
  run: string;
  slot: string;
  source: string;
  traceId: string;
  parent: string;
  start: number;
  end: number;
  attributes?: { transactionIoStats?: { "api-ms"?: number } };
};

export const requestSamples = new AsyncLocalStorage<DatomicRequestSample[]>();
export function observe(sample: DatomicRequestSample) {
  requestSamples.getStore()?.push(sample);
}
const sum = (values: number[]) =>
  values.length ? values.reduce((total, n) => total + n, 0) : null;
const positive = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n >= 0;
const boundedTail = 2 * 1024 ** 2;

// [DX-PLAY1] Why: join only the gateway response to its parent trace span for the current attempt.
// Rejected: attributing time-window Postgres samples or peer waits to an individual storage call.
export class Timings {
  readonly dir: string | undefined;
  readonly run: string;
  readonly source: string;
  constructor(dir: string | undefined, run: string, source: string) {
    this.dir = dir;
    this.run = run;
    this.source = source;
  }

  async gateway(trace: RequestTrace) {
    if (!this.dir) return [];
    const exchanges = new Set(
      trace.spans.filter((span) => span.name === "client.http").map((span) => span.id),
    );
    if (!exchanges.size) return [];
    const found = new Map<string, GatewayEvent>();
    const until = performance.now() + 1250;
    do {
      for (const role of ["write", "read"]) {
        const file = await open(join(this.dir, role + ".jsonl"), "r").catch(() => null);
        if (!file) continue;
        try {
          const { size } = await file.stat();
          const start = Math.max(0, size - boundedTail);
          const bytes = Buffer.alloc(size - start);
          const { bytesRead } = await file.read(bytes, 0, bytes.length, start);
          const lines = bytes
            .toString("utf8", 0, bytesRead)
            .split("\n")
            .slice(start > 0 ? 1 : 0, -1);
          for (const line of lines) {
            if (!line.includes(trace.traceId)) continue;
            const event = JSON.parse(line) as GatewayEvent;
            if (
              event.type === "request" &&
              event.traceId === trace.traceId &&
              event.run === this.run &&
              event.slot === this.run &&
              event.source === this.source &&
              exchanges.has(event.parent) &&
              positive(event.end - event.start)
            )
              found.set(event.parent, event);
          }
        } finally {
          await file.close();
        }
      }
      if (found.size === exchanges.size) break;
      await delay(120);
    } while (performance.now() < until);
    return [...found.values()];
  }

  async measure<A>(name: string, work: () => Promise<A>): Promise<{ value: A; timings: Timing }> {
    const trace = beginTrace("internal", "playground." + name);
    const samples: DatomicRequestSample[] = [];
    const started = performance.now();
    const value = await requestSamples.run(samples, () => withTrace(trace, work));
    const totalMs = performance.now() - started;
    finishTrace(trace);
    const spans = trace?.spans.filter((s) => s.layer === "typescript" && s.synchronous) ?? [];
    // Synchronous spans can nest. Bound each interval to the union of observed client work.
    const ranges = spans.map((s) => [s.start, s.end] as const).sort((a, b) => a[0] - b[0]);
    let end = -Infinity;
    const clientMs = sum(
      ranges.map(([first, last]) => {
        const duration = Math.max(0, last - Math.max(first, end));
        end = Math.max(end, last);
        return duration;
      }),
    );
    const native = trace ? await this.gateway(trace) : [];
    const gateway = native.map((r) => r.end - r.start);
    const nativeApply = native
      .map((r) => r.attributes?.transactionIoStats?.["api-ms"])
      .filter(positive);
    return {
      value,
      timings: {
        totalMs,
        clientMs,
        gatewayMs: sum(
          gateway.length
            ? gateway
            : samples
                .map((r) => r.gatewayMicros)
                .filter(positive)
                .map((n) => n / 1000),
        ),
        transactorMs: sum(nativeApply),
        storageMs: null,
        peerWaitMs: sum(
          samples
            .map((r) => r.transactMicros)
            .filter(positive)
            .map((n) => n / 1000),
        ),
        traceId: trace?.traceId ?? null,
      },
    };
  }
}

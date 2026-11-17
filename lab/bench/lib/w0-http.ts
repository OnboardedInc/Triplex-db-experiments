import "./w0-cache.ts";
import { measureHttp } from "./http-counts.ts";
import { AsyncLocalStorage } from "node:async_hooks";
import { DatomicClient } from "../../../packages/datomic/dist/index.js";
// [DX-H5] Why: use the existing public request observer to attribute bytes/service/datoms per page.
// Rejected: parsing each response a second time or subtracting global live-traffic counters.
const context = new AsyncLocalStorage<{
  samples: Record<string, unknown>[];
  commits: Record<string, unknown>[];
  nativeFrames: Record<string, unknown>[];
  requests: number;
  responseBytes: number;
  gatewayMicros: number;
  gatewayHeaders: number;
  datoms: number;
  datomSamples: number;
  wireParseMicros: number;
  wireSerializeMicros: number;
}>();
const original = DatomicClient.prototype.request;
const installed = new WeakSet<object>();
DatomicClient.prototype.request = function (...args: any[]) {
  if (!installed.has(this)) {
    installed.add(this);
    const priorCommit = this.onCommit;
    // [DX-S5] Why: the adapter's existing diagnostic observer separates precondition/build time from send-order wait.
    // Rejected: calling all client wall time native transact time, or changing the commit function for instrumentation.
    this.onCommit = (sample) => {
      priorCommit?.(sample);
      context.getStore()?.commits.push({
        operationId: sample.operationId,
        transactionIds: sample.transactionIds,
        wallMs: sample.returned - sample.started,
        httpCalls: sample.httpCalls,
        replays: sample.replays,
        attempts: sample.attempts.map((a) => ({
          optimistic: a.optimistic,
          begin: a.begin,
          httpCalls: a.httpCalls,
          beforeAdapterMs: a.firstAdapterCall - sample.started,
          preparationMs: a.ready === undefined ? null : a.ready - a.firstAdapterCall,
          orderWaitMs:
            a.ready === undefined || a.released === undefined ? null : a.released - a.ready,
          requests: a.requests.map((q) => ({
            operationId: q.operationId,
            path: q.path,
            wallMs: q.finished - q.started,
            requestBytes: q.requestBytes,
            responseBytes: q.responseBytes,
            serializeMicros: q.serializeMicros,
            gatewayParseMicros: q.parseMicros,
            gatewayMicros: q.gatewayMicros,
            transactMicros: q.transactMicros,
            datoms: q.datoms,
            timeline: q.gatewayTimeline,
          })),
        })),
      });
    };
    const prior = this.onRequest;
    this.onRequest = (sample) => {
      prior?.(sample);
      const active = context.getStore();
      if (!active) return;
      active.requests++;
      active.samples.push({
        path: sample.path,
        wallMs: sample.finished - sample.started,
        requestBytes: sample.requestBytes,
        responseBytes: sample.responseBytes,
        serializeMicros: sample.serializeMicros,
        gatewayParseMicros: sample.parseMicros,
        gatewayMicros: sample.gatewayMicros,
        transactMicros: sample.transactMicros,
        timeline: sample.gatewayTimeline,
      });
      active.responseBytes += sample.responseBytes;
      if (Number.isFinite(sample.gatewayMicros)) {
        active.gatewayMicros += sample.gatewayMicros;
        active.gatewayHeaders++;
      }
      if (Number.isFinite(sample.datoms)) {
        active.datoms += sample.datoms!;
        active.datomSamples++;
      }
      if (Number.isFinite(sample.serializeMicros))
        active.wireSerializeMicros += sample.serializeMicros;
      // sample.parseMicros is gateway request JSON parsing, not client response JSON decoding.
      if (Number.isFinite(sample.parseMicros)) active.wireParseMicros += sample.parseMicros;
    };
  }
  const active = context.getStore(),
    body = args[2];
  if (active && String(args[1]).endsWith("/transact"))
    active.nativeFrames.push({
      operationId: body.operationId,
      rows: body.rowOrder?.length ?? body.rows?.length ?? 0,
      newRows: Object.keys(body.rowTexts ?? {}).length,
      nativeRetractions: body.rows?.length ?? 0,
      entities: body.entities?.length ?? 0,
      live: body.live?.length ?? 0,
      span: body.span,
      clientId: body.clientId,
      sendSequence: body.sendSequence,
    });
  return (original as any).apply(this, args);
};
export async function measureW0Http<T>(run: () => Promise<T>) {
  const active = {
    samples: [] as Record<string, unknown>[],
    commits: [] as Record<string, unknown>[],
    nativeFrames: [] as Record<string, unknown>[],
    requests: 0,
    responseBytes: 0,
    gatewayMicros: 0,
    gatewayHeaders: 0,
    datoms: 0,
    datomSamples: 0,
    wireParseMicros: 0,
    wireSerializeMicros: 0,
  };
  const counted = await context.run(active, () => measureHttp(run));
  // [DX-H5] Why: successful response samples omit errors; Agent counts retain every actual HTTP attempt.
  // Rejected: granting a one-request verdict from only successful observer callbacks.
  return {
    ...active,
    successfulRequestSamples: active.requests,
    requests: counted.requests,
    value: counted.value,
  };
}

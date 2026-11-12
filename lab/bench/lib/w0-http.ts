import "./w0-cache.ts";
import { measureHttp } from "./http-counts.ts";
import { AsyncLocalStorage } from "node:async_hooks";
import { DatomicClient } from "../../../packages/datomic/dist/index.js";
// [DX-H5] Why: use the existing public request observer to attribute bytes/service/datoms per page.
// Rejected: parsing each response a second time or subtracting global live-traffic counters.
const context = new AsyncLocalStorage<{
  samples: Record<string, unknown>[];
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
  return (original as any).apply(this, args);
};
export async function measureW0Http<T>(run: () => Promise<T>) {
  const active = {
    samples: [] as Record<string, unknown>[],
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

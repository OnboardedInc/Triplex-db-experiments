import assert from "node:assert/strict";
import { parentPort, workerData, type MessagePort } from "node:worker_threads";
import { serialize } from "node:v8";
import { performance } from "node:perf_hooks";
import { DatomicClient } from "../../../packages/datomic/dist/index.js";
import { replicaReply } from "./replica-reads.ts";
import { observe } from "./observe.ts";
import { beginTrace, finishTrace, gatewayExchanges, withTrace } from "./tracing.ts";
import type { PullResult } from "./composition.ts";
import type {
  HistoricalConfig,
  HistoricalPayload,
  HistoricalRequest,
} from "./historical-fallback.ts";

const cfg = workerData as HistoricalConfig;
assert(Number.isSafeInteger(cfg.active) && cfg.active >= 1 && cfg.active <= 16);
const revision = cfg.mode === "revision" || cfg.mode === "install";
const client = new DatomicClient(cfg.endpoint, 5_000, 32 * 1024 ** 2, {
  historicalRevisionReuse: revision,
  entityCacheBytes: 32 * 1024 ** 2,
  predecessorCacheBytes: 0,
  rowCacheBytes: 0,
});
const pending: HistoricalRequest[] = [];
let running = 0,
  scheduled = false;
const stats = {
  requested: 0,
  replied: 0,
  declined: 0,
  errors: 0,
  groups: 0,
  roots: 0,
  activePeak: 0,
  queuedPeak: 0,
  queueMs: 0,
  wireExchanges: 0,
  exchanges: [] as {
    traceId: string;
    requests: number;
    roots: number;
    logical: number;
    started: number;
    ended: number;
    wire: ReturnType<typeof gatewayExchanges>;
  }[],
};
let elu = performance.eventLoopUtilization();
const tick = setInterval(() => {
  const next = performance.eventLoopUtilization();
  parentPort!.postMessage({
    type: "elu",
    t: performance.timeOrigin + performance.now(),
    elu: performance.eventLoopUtilization(next, elu).utilization,
  });
  elu = next;
}, 500);
tick.unref();
const key = (e: HistoricalRequest) =>
  JSON.stringify([e.basis.recordedAt, e.basis.recordedPosition, e.basis.validAt]);

function schedule() {
  if (scheduled || running >= cfg.active || !pending.length) return;
  scheduled = true;
  setImmediate(drain);
}

function drain() {
  scheduled = false;
  while (running < cfg.active && pending.length) {
    const first = pending.shift()!,
      group = [first];
    // [DX-RD1] Why: collect already queued equal cuts within a bounded turn and honor the oldest pending request.
    // Rejected: a timer that holds single callers, or reading a shared valid time for callers that requested different ones.
    if (cfg.mode !== "lane") {
      const wanted = key(first);
      for (let i = 0; i < pending.length && group.length < 16; ) {
        if (key(pending[i]!) === wanted) group.push(pending.splice(i, 1)[0]!);
        else i++;
      }
    }
    running++;
    stats.activePeak = Math.max(stats.activePeak, running);
    void execute(group).finally(() => {
      running--;
      schedule();
    });
  }
}

async function execute(group: HistoricalRequest[]) {
  const basis = group[0]!.basis;
  const roots = [...new Set(group.map((r) => r.root))];
  stats.groups++;
  stats.roots += roots.length;
  const started = performance.timeOrigin + performance.now();
  for (const request of group) stats.queueMs += started - request.queued;
  const trace = beginTrace("read", "rd1.historical.exchange", {
    roots: roots.length,
    callers: group.length,
  });
  try {
    const result: Awaited<ReturnType<DatomicClient["readHistoricalWorlds"]>> = await withTrace(
      trace,
      () => client.readHistoricalWorlds(cfg.scope, roots, basis),
    );
    if (!result) {
      stats.declined += group.length;
      for (const r of group) r.port.postMessage({ id: r.id });
      return;
    }
    stats.wireExchanges += result.requests;
    const byRoot = new Map(
      result.worlds.map((w) => {
        const full: PullResult = {
          triples: w.triples,
          roundTrips: result.requests,
          entities: w.entities,
          depth: w.hops - 1,
          waitedMs: 0,
          route: "source",
          language: "reach",
        };
        const { triples, ...meta } = replicaReply(full);
        const world: HistoricalPayload = {
          root: w.root,
          result: { ...meta, observation: observe(full) },
          triples: serialize(triples),
          from: w.from,
          to: w.to,
          recordedAt: basis.recordedAt,
          recordedPosition: basis.recordedPosition,
          t: result.t,
        };
        return [w.root, world];
      }),
    );
    if (cfg.capture && trace) {
      if (stats.exchanges.length >= 20_000)
        throw Error("Historical probe exchange allowance exceeded");
      const wire = gatewayExchanges(trace);
      assert.equal(wire.length, result.requests);
      stats.exchanges.push({
        traceId: trace.traceId,
        requests: result.requests,
        roots: roots.length,
        logical: group.length,
        started,
        ended: performance.timeOrigin + performance.now(),
        wire,
      });
    }
    for (const r of group) {
      const world = byRoot.get(r.root);
      if (!world) throw Error("Historical batch root coverage differs");
      r.port.postMessage({ id: r.id, world });
      stats.replied++;
    }
  } catch (error) {
    stats.errors += group.length;
    for (const r of group) r.port.postMessage({ id: r.id, error: String(error) });
  } finally {
    finishTrace(trace);
  }
}

parentPort!.on("message", (m: { type: string; port: MessagePort; id: number }) => {
  if (m.type === "snapshot") {
    parentPort!.postMessage({
      type: "snapshot",
      id: m.id,
      stats: {
        ...stats,
        queued: pending.length,
        active: running,
        revision: client.reachDiagnostics,
      },
    });
  } else if (m.type === "connect")
    m.port.on("message", (r: Omit<HistoricalRequest, "port" | "queued">) => {
      stats.requested++;
      if (pending.length >= 2_048) {
        stats.errors++;
        m.port.postMessage({ id: r.id, error: "Historical lane exceeded its 2,048-request queue" });
        return;
      }
      pending.push({ ...r, port: m.port, queued: performance.timeOrigin + performance.now() });
      stats.queuedPeak = Math.max(stats.queuedPeak, pending.length);
      schedule();
    });
});

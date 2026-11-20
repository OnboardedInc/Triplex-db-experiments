import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import {
  DatomicClient,
  type DatomicRequestSample,
} from "../../../../packages/datomic/dist/index.js";
import { openComposition, type PullResult } from "../../../bench/lib/composition.ts";
import { ReplicaReadHost, ReplicaReader } from "../../../bench/lib/replica-reads.ts";
import { ReaderTurn } from "../../../bench/lib/reader-turn.ts";
import { Model } from "../../../bench/lib/model.ts";
import { observe } from "../../../bench/lib/observe.ts";
import { Histogram } from "../../../bench/lib/hist.ts";
import { ids, ownFacts, sharedFacts, SEED_VALID_FROM } from "../../../bench/lib/world.ts";
import { seedOps } from "../../../bench/lib/commands.ts";
import {
  beginTrace,
  currentTrace,
  finishTrace,
  gatewayExchanges,
  withTrace,
} from "../../../bench/lib/tracing.ts";
import { runtimeApi } from "../../../bench/lib/triplex.ts";
import { inLocalSlot } from "./owned-local.ts";
import {
  HistoricalFallbackThread,
  HistoricalFallbackPort,
  InstalledHistory,
  historicalResult,
  type HistoricalMode,
} from "../../../bench/lib/historical-fallback.ts";

const source = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const [output, topology = "s3", interval = "3", seatCount = "128", mode = "mechanism"] =
  process.argv.slice(2);
const seconds = Number(interval),
  seats = Number(seatCount),
  permits = 2;
assert(
  output &&
    /^(s[123]|prepared)$/.test(topology) &&
    Number.isSafeInteger(seats) &&
    seats >= 16 &&
    seats <= 1024,
);
assert(Number.isFinite(seconds) && seconds >= 1 && seconds <= 20);
assert(["mechanism", "control", "treatments", "recovery"].includes(mode ?? ""));
const samples = [0, 1, 2, 4, 10] as const;
const order: { share: number; treatment: HistoricalMode; transition?: boolean; low?: boolean }[] =
  mode === "treatments"
    ? (
        [
          "off",
          "lane",
          "batch",
          "revision",
          "install",
          "install",
          "revision",
          "batch",
          "lane",
          "off",
        ] as const
      ).map((treatment) => ({ share: 10, treatment }))
    : mode === "recovery"
      ? [
          { share: 0, treatment: "off", low: true },
          { share: 10, treatment: "off", transition: true },
          { share: 10, treatment: "install", transition: true },
          { share: 10, treatment: "install", transition: true },
          { share: 10, treatment: "off", transition: true },
          { share: 0, treatment: "off", low: true },
        ]
      : [...samples, ...[...samples].reverse()].map((share) => ({ share, treatment: "off" }));
const clock = () => performance.timeOrigin + performance.now();
const cpu = () => {
  const t = process.threadCpuUsage();
  return (t.user + t.system) / 1000;
};
const sha = (text: string) => createHash("sha256").update(text).digest("hex");
const count = 24;
type Exchange = {
  started: number;
  headers: number;
  clientMs: number;
  gatewayMs: number;
  bytes: number;
};
type Miss = {
  id: string;
  at: number;
  end: number;
  exchanges: Exchange[];
  count?: number;
  wire: ReturnType<typeof gatewayExchanges>;
};
type Span = { name: string; start: number; end: number };
type GatewayRow = {
  schema: string;
  type: string;
  traceId: string;
  root: string;
  parent: string;
  process: string;
  source: string;
  run: string;
  slot: string;
  start: number;
  end: number;
  spans: Span[];
  attributes: { status?: number };
};

// [DX-RD1] Why: the old and new cuts are real receipts for the same subjects, with deliberately different stored rows.
// Rejected: injecting artificial HTTP sleeps or substituting a recent answer for an evicted cut.
async function fixture(scope: string) {
  const runtime = await openComposition("reach", "datomic", scope);
  const model = new Model(count),
    roots = Array.from({ length: count }, (_, i) => ids.placement(i));
  const commit = async (ops: Parameters<typeof runtime.transact>[0], label: string) => {
    const result = await runtime.transact(ops, { actor: "probe", commandId: `${scope}-${label}` });
    if (!result.ok) throw Error(`Fixture ${label}: ${result.tag}`);
    model.bindReceipt(ops, result.value, "probe");
    return result.value;
  };
  try {
    assert.equal(await runtime.currentPosition(), 0);
    const all = [...sharedFacts(0), ...roots.flatMap((_, i) => ownFacts(i, 1))];
    let first: Awaited<ReturnType<typeof commit>> | undefined;
    for (let i = 0; i < all.length; i += 900)
      first = await commit(seedOps(all.slice(i, i + 900)), `seed-${i}`);
    assert(first);
    const old = first;
    const more = (v: number) =>
      roots.map((entityId) => ({
        op: "assert" as const,
        entityId,
        attribute: ":rd1/marker",
        value: { type: "long" as const, value: String(v) },
        validFrom: SEED_VALID_FROM,
      }));
    const middle = await commit(more(1), "middle"),
      head = await commit(more(2), "head");
    assert(old.instant < middle.instant && middle.instant < head.instant);
    const validAt = SEED_VALID_FROM + 1_000_000;
    const cuts = [old, middle, head].map((r) => ({
      position: r.position,
      basis: { recordedAt: r.instant, validAt },
      expected: roots.map((_, i) => model.expected(i, r.instant, validAt)),
    }));
    assert(cuts.every((c) => c.expected.every((e) => e.fullRows && e.facts > 1)));
    assert(cuts[0]!.expected.every((e, i) => e.digest !== cuts[2]!.expected[i]!.digest));
    return { runtime, roots, head, cuts };
  } catch (e) {
    await runtime.close();
    throw e;
  }
}

function timing(
  traceRows: readonly GatewayRow[],
  misses: readonly Miss[],
  nativeSource: string,
  requireEvery: boolean,
) {
  const byTrace = new Map(misses.map((m) => [m.id, m]));
  assert.equal(byTrace.size, misses.length);
  const seen = new Set<string>(),
    runSlots = new Set<string>();
  const nativeByMiss = new Map<
    string,
    { queue: number; work: number; routes: number; wall: number }
  >();
  const q = new Histogram(),
    s = new Histogram(),
    residence = new Histogram(),
    residual = new Histogram();
  for (const row of traceRows) {
    const miss = byTrace.get(row.traceId);
    if (!miss || !row.spans.some((x) => x.name === "gateway.admission-wait")) continue;
    assert(
      row.source === nativeSource &&
        row.process === "gateway" &&
        row.attributes.status === 200 &&
        row.slot &&
        row.run === `rd1-${row.slot}` &&
        miss.wire.some((http) => http.parent === row.parent && http.root === row.root) &&
        !seen.has(row.root),
    );
    runSlots.add(`${row.run}/${row.slot}`);
    seen.add(row.root);
    const wait = row.spans.find((x) => x.name === "gateway.admission-wait")!,
      work = row.spans.find((x) => x.name === "gateway.admitted-work")!;
    assert(
      work &&
        [row.start, row.end, wait.start, wait.end, work.start, work.end].every(Number.isFinite),
    );
    assert(
      row.start <= wait.start &&
        wait.end <= work.start &&
        work.end <= row.end &&
        wait.end >= wait.start &&
        work.end >= work.start,
    );
    const aggregate = nativeByMiss.get(row.traceId) ?? { queue: 0, work: 0, wall: 0, routes: 0 };
    aggregate.queue += wait.end - wait.start;
    aggregate.work += work.end - work.start;
    aggregate.wall += row.end - row.start;
    aggregate.routes++;
    nativeByMiss.set(row.traceId, aggregate);
  }
  let workMs = 0,
    queueMs = 0,
    clientMs = 0,
    exchanges = 0,
    responseBytes = 0,
    matchedMisses = 0;
  for (const miss of misses) {
    const client =
        miss.count === undefined
          ? miss.exchanges.reduce((n, x) => n + x.clientMs, 0)
          : miss.end - miss.at,
      native = nativeByMiss.get(miss.id);
    const count = miss.count ?? miss.exchanges.length;
    assert(count > 0 && count === miss.wire.length);
    exchanges += count;
    responseBytes += miss.exchanges.reduce((n, x) => n + x.bytes, 0);
    clientMs += client;
    residence.recordMs(miss.end - miss.at);
    if (native?.routes !== count) continue;
    matchedMisses++;
    workMs += native.work;
    queueMs += native.queue;
    q.recordMs(native.queue);
    s.recordMs(native.work);
    residual.recordMs(Math.max(0, miss.end - miss.at - native.wall));
  }
  assert(runSlots.size <= 1);
  if (requireEvery)
    assert.equal(matchedMisses, misses.length, "Native gateway trace census differs");
  return {
    matchedMisses,
    exchanges,
    responseBytes,
    nativeRunSlot: [...runSlots][0] ?? null,
    meanWorkMs: matchedMisses ? workMs / matchedMisses : null,
    meanQueueMs: matchedMisses ? queueMs / matchedMisses : null,
    meanClientExchangeMs: misses.length ? clientMs / misses.length : null,
    queue: q.summary(),
    service: s.summary(),
    residence: residence.summary(),
    nonGatewayResidual: residual.summary(),
  };
}

async function run(slot: string, logs: () => Promise<string>) {
  const nonce = randomUUID(),
    scope = `rd1-miss-${nonce}`,
    fx = await fixture(scope);
  const endpoint = process.env.DATOMIC_READ_URLS?.split(",")[0] ?? process.env.DATOMIC_URL!;
  const scopeKey = String(runtimeApi.DatabaseScope.test(scope));
  const host = await ReplicaReadHost.open(scope, fx.roots, fx.runtime, fx.head, "inline", 0);
  const image = host.index.image();
  assert(image.floor === fx.head.position && image.strictRecordClocks);
  await host.close();
  let retained = image;
  if (mode === "recovery") {
    const middle = fx.cuts[1]!;
    const history = await ReplicaReadHost.open(
      scope,
      fx.roots,
      fx.runtime,
      { position: middle.position, instant: middle.basis.recordedAt },
      "inline",
      192 * 1024 ** 2,
      "reader",
      endpoint,
      "all",
      undefined,
      Date.now(),
      false,
      "closure",
    );
    try {
      const deadline = performance.now() + 10_000;
      while (history.index.position < fx.head.position && performance.now() < deadline)
        await sleep(5);
      assert(
        history.index.position === fx.head.position && history.index.floor === middle.position,
      );
      assert(
        history.index.historyBytes > 0 && history.index.resolve(middle.basis) === middle.position,
      );
      retained = history.index.image();
    } finally {
      await history.close();
    }
  }
  const arms: Record<string, any>[] = [],
    allMisses: Miss[][] = [];
  const referenceHead = fx.cuts.at(-1)!;
  const admission = process.env.DX_RD1_MEASURE_LOCK;
  let ownsMeasure = false;
  try {
    if (admission) {
      fs.mkdirSync(admission);
      ownsMeasure = true;
      fs.writeFileSync(
        path.join(admission, "owner.json"),
        JSON.stringify({
          id: "DX-RD1",
          pid: process.pid,
          slot,
          nonce,
          at: new Date().toISOString(),
        }) + "\n",
        { flag: "wx" },
      );
    }
    for (const { share: oldPer200, treatment, transition, low } of order) {
      const client = new DatomicClient(endpoint);
      const misses = new Map<string, Miss>();
      const chosen = treatment === "install" && transition ? retained : image;
      const reader = new ReplicaReader(
        chosen === retained && retained !== image ? 192 * 1024 ** 2 : 0,
        undefined,
        32 * 1024 ** 2,
        chosen.historyCoverage,
      );
      reader.install(chosen);
      const lane =
        treatment === "off"
          ? undefined
          : new HistoricalFallbackThread({
              mode: treatment,
              active: 4,
              capture: true,
              scope: scopeKey,
              endpoint,
            });
      const port = lane ? new HistoricalFallbackPort(lane.connect()) : undefined;
      if (treatment === "install") reader.installedHistory = new InstalledHistory(32 * 1024 ** 2);
      const turn = new ReaderTurn(),
        histogram = new Histogram();
      let serial = 0,
        correct = 0,
        fallbacks = 0,
        recovery = 0,
        cross = 0,
        drain = 0,
        localDuringMiss = 0,
        pending = 0,
        maxPending = 0,
        pendingMs = 0,
        peakHeap = 0,
        fallbackCalls = 0;
      const recoveryBins = Array.from({ length: Math.ceil(seconds) }, () => ({
        reads: 0,
        fallbacks: 0,
      }));
      const nSeats = low ? (seats / 4) | 0 : seats;
      client.onRequest = (s: DatomicRequestSample) => {
        const miss = misses.get(currentTrace()?.traceId ?? "");
        assert(miss, "Fallback exchange missing its initiating probe identity");
        miss.exchanges.push({
          started: s.started,
          headers: s.headers,
          clientMs: s.finished - s.started,
          gatewayMs: s.gatewayMicros / 1000,
          bytes: s.responseBytes,
        });
      };
      // [DX-RD1] Why: time the fallback path after its isolate has loaded, as in the driver.
      // Rejected: a priming read before the first measurement (it would populate gateway and replica caches).
      try {
        if (lane) assert.equal((await lane.snapshot()).requested, 0);
      } catch (error) {
        port?.close();
        await lane?.close();
        throw error;
      }
      const start = clock(),
        until = start + seconds * 1000,
        stop = until + (transition ? seconds * 1000 : 0),
        e0 = performance.eventLoopUtilization(),
        cpu0 = cpu();
      const worker = async (seat: number) => {
        for (;;) {
          await turn.enter();
          const at = clock();
          if (at >= stop || (at >= until && seat >= ((seats / 4) | 0))) break;
          const n = serial++,
            subject = n % fx.roots.length,
            root = fx.roots[subject]!;
          // [DX-RD1] Why: every 200 introductions has the same exact programmed old-cut count.
          // Rejected: changing the subject list or offering more native requests than the selected logical reads.
          const old = (n * 67) % 200 < oldPer200;
          const cut = old ? fx.cuts[(Math.floor(n / 200) + subject) & 1]! : referenceHead;
          const pull = async (): Promise<PullResult> => {
            assert(old);
            if (port) {
              const start = clock();
              pending++;
              maxPending = Math.max(pending, maxPending);
              try {
                const payload = await port.pull(root, cut.basis);
                assert(payload, "Isolated gateway declined an exact fixture cut");
                if (reader.canInstallHistory(cut.basis))
                  reader.installedHistory?.put(root, cut.basis, payload);
                return historicalResult(payload, false);
              } finally {
                pending--;
                pendingMs += Math.max(0, Math.min(until, clock()) - start);
              }
            }
            const trace = beginTrace("read", "rd1.miss", { arm: arms.length, subject });
            assert(trace, "Run the probe with TRIPLEX_TRACE_LEVEL=summary or full");
            const miss: Miss = {
              id: trace.traceId,
              at: clock(),
              end: NaN,
              exchanges: [],
              wire: [],
            };
            misses.set(miss.id, miss);
            pending++;
            maxPending = Math.max(pending, maxPending);
            try {
              const g = await withTrace(trace, () =>
                client.readDemandWorld(scopeKey, root, cut.basis),
              );
              assert(g, "Gateway declined the exact probe cut");
              fallbackCalls += g.requests;
              return {
                triples: g.triples,
                roundTrips: g.requests,
                entities: g.entities,
                depth: g.hops - 1,
                waitedMs: 0,
                route: "source",
                language: "reach",
              };
            } finally {
              miss.end = clock();
              pending--;
              pendingMs += Math.max(0, Math.min(until, miss.end) - miss.at);
              miss.wire = gatewayExchanges(trace);
              finishTrace(trace);
            }
          };
          const result = await reader.pullAt(root, cut.basis, pull);
          const found = observe(result),
            exp = cut.expected[subject]!;
          if (found.digest !== exp.digest || found.facts !== exp.facts || found.stamp !== exp.stamp)
            throw Error(
              `Exact probe comparison differs at receipt ${cut.position}, subject ${subject}`,
            );
          if (!old || treatment === "off" || !reader.installedHistory)
            assert.equal(result.route, old ? "fallback" : "replica");
          const fallback = result.route === "fallback";
          if (fallback) assert.equal(result.replicaFallbackReason, "before-retained-clock");
          const end = clock();
          if (end >= stop) {
            drain++;
            continue;
          }
          if (at >= until) {
            recovery++;
            const bin = recoveryBins[Math.floor((end - until) / 1000)]!;
            bin.reads++;
            bin.fallbacks += Number(fallback);
            continue;
          }
          if (end >= until) {
            cross++;
            continue;
          }
          correct++;
          fallbacks += Number(fallback);
          if (!fallback && pending > 0) localDuringMiss++;
          histogram.recordMs(end - at);
          if ((correct & 1023) === 0) peakHeap = Math.max(peakHeap, process.memoryUsage().heapUsed);
        }
      };
      let laneStats: any;
      try {
        await Promise.all(Array.from({ length: nSeats }, (_, i) => worker(i)));
        laneStats = await lane?.snapshot();
      } finally {
        client.close();
        port?.close();
        await lane?.close();
      }
      assert(serial === correct + drain + recovery + cross && pending === 0);
      if (laneStats)
        assert(
          laneStats.queued === 0 &&
            laneStats.active === 0 &&
            laneStats.replied === laneStats.requested &&
            laneStats.errors === 0,
        );
      const store = laneStats
        ? laneStats.exchanges.map((s: any) => ({
            id: s.traceId,
            at: s.started,
            end: s.ended,
            count: s.requests,
            exchanges: [],
            wire: s.wire,
          }))
        : [...misses.values()];
      allMisses.push(store);
      arms.push({
        oldPer200,
        treatment,
        transition,
        low,
        slot,
        nonce,
        seconds,
        seats: nSeats,
        issued: serial,
        correct,
        fallbacks,
        drain,
        cross,
        recovery,
        recoveryBins,
        goodput: correct / seconds,
        localDuringMiss,
        maxPending,
        meanFallbackSeats: pendingMs / seconds / 1000,
        readerCpuMs: cpu() - cpu0,
        peakHeap,
        elu: performance.eventLoopUtilization(e0).utilization,
        gatewayCalls: laneStats?.wireExchanges ?? fallbackCalls,
        latency: histogram.summary(),
        revision: laneStats?.revision ?? client.reachDiagnostics,
        ...(laneStats
          ? {
              lane: { ...laneStats, exchanges: undefined },
              installed: reader.installedHistory?.diagnostics,
            }
          : {}),
      });
    }
    await sleep(1_200);
    const gatewayRaw = await logs();
    const nativeClient = new DatomicClient(endpoint);
    const nativeSource = await nativeClient
      .health()
      .then((v) => v.gatewaySourceHash)
      .finally(() => nativeClient.close());
    const raw = gatewayRaw
      .split("\n")
      .filter((l) => l.startsWith('{"') && l.includes('"triplex.trace.v1"'))
      .map((l) => JSON.parse(l) as GatewayRow);
    const selected = new Set(allMisses.flat().map((x) => x.id));
    const nativeRows =
      raw
        .filter((r) => selected.has(r.traceId))
        .map((r) => JSON.stringify(r))
        .join("\n") + "\n";
    fs.writeFileSync(path.join(output!, "native.jsonl"), nativeRows, { flag: "wx" });
    fs.writeFileSync(path.join(output!, "exchanges.json"), JSON.stringify(allMisses) + "\n", {
      flag: "wx",
    });
    const controls = arms.filter(
      (a) => a.oldPer200 === 0 || (mode === "treatments" && a.treatment === "off"),
    );
    const baseline = controls.reduce((n, a) => n + a.goodput, 0) / controls.length;
    for (const [i, a] of arms.entries()) {
      a.gateway = timing(raw, allMisses[i]!, nativeSource, mode !== "control");
      const p = a.fallbacks / a.correct,
        w = a.gateway.meanWorkMs;
      a.admissionCeiling = p && w ? (permits * 1000) / p / w : null;
      a.predicted = Math.min(baseline, a.admissionCeiling ?? Infinity);
      a.completedFallbackShare = p;
      a.goodputRatio = a.goodput / baseline;
      if (a.transition) a.recoveryRatio = a.recovery / a.seconds / baseline;
    }
    const result = {
      nonce,
      source,
      slot,
      scope,
      nativeSource,
      permits,
      mode,
      baseline,
      cuts: fx.cuts.map((c) => ({
        position: c.position,
        basis: c.basis,
        modelDigest: sha(JSON.stringify(c.expected)),
      })),
      entrypointSha256: sha(fs.readFileSync(import.meta.filename, "utf8")),
      nativeSha256: sha(nativeRows),
      arms,
    };
    fs.writeFileSync(path.join(output!, "result.json"), JSON.stringify(result, null, 2) + "\n", {
      flag: "wx",
    });
    console.log(
      JSON.stringify({
        slot,
        nonce,
        baseline,
        arms: arms.map((a) => [
          a.oldPer200 / 2,
          a.treatment,
          Math.round(a.goodput),
          a.completedFallbackShare,
          a.gateway.meanQueueMs,
          a.gateway.meanWorkMs,
          a.localDuringMiss,
          a.recoveryRatio,
        ]),
      }),
    );
  } finally {
    if (ownsMeasure) {
      const owner = path.join(admission!, "owner.json");
      if (fs.existsSync(owner)) {
        assert.equal(JSON.parse(fs.readFileSync(owner, "utf8")).nonce, nonce);
        fs.unlinkSync(owner);
      }
      fs.rmdirSync(admission!);
    }
    await fx.runtime.close();
  }
}

if (topology === "prepared") {
  assert(
    mode === "control" && process.env.TRIPLEX_TRACE_SLOT,
    "Prepared control requires an isolated scope and explicit slot identity",
  );
  fs.mkdirSync(output);
  await run(process.env.TRIPLEX_TRACE_SLOT, async () => "");
} else
  await inLocalSlot(topology, async (slot, logs) => {
    fs.mkdirSync(output);
    await run(slot, logs);
  });

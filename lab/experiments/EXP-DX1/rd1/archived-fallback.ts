import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { createGunzip } from "node:zlib";
import { createInterface } from "node:readline";
import path from "node:path";
import { sampledTrace } from "../../../../packages/datomic/dist/index.js";
import { alignClockRecord } from "../../../trace/report.mjs";
import {
  coveredMs,
  wireIntervals,
  type ArchivedSpan,
  type Interval,
} from "./archived-intervals.ts";

const [reportFile, summaryFile, archive, ...readerMembers] = process.argv.slice(2);
assert(reportFile && summaryFile && archive && readerMembers.length);
const hash = (data: Buffer) => createHash("sha256").update(data).digest("hex");
const bytes = fs.readFileSync(reportFile),
  report = JSON.parse(bytes.toString()),
  summaryBytes = fs.readFileSync(summaryFile),
  traceSummary = JSON.parse(summaryBytes.toString());
const reference = traceSummary.clockAlignment.reference,
  { source, tag } = traceSummary;
assert(/^[a-f0-9]{40}$/.test(source) && reference?.bootId);
assert(
  report.verdictPlanId === "ns-v3/2" &&
    report.correctness.violations === 0 &&
    report.correctness.errors === 0,
);
const phases = report.phases.filter((p: any) => p.pool === "L1024");
assert.equal(phases.length, 18);
const weighted = report.phases.filter((p: any) => p.name === "p4mix");
assert.equal(weighted.length, 1);
const windows = [...phases, ...weighted];
const phaseFor = (r: { start: number; end: number }) =>
  windows.find((p: any) => r.start >= p.start + report.config.settleS * 1000 && r.end < p.end);
const low = phases.filter((p: any) => p.stats.routing.fallbackShare < 0.01),
  high = phases.filter((p: any) => p.stats.routing.fallbackShare >= 0.01);
const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0);
const mean = (xs: number[]) => (xs.length ? sum(xs) / xs.length : null);
const group = (ps: any[]) => {
  const n = sum(ps.map((p) => p.stats.correct)),
    misses = sum(ps.map((p) => p.stats.routing.routes.fallback ?? 0)),
    seconds = sum(ps.map((p) => p.stats.windowS));
  return {
    phases: ps.map((p) => p.name),
    n,
    misses,
    seconds,
    rate: n / seconds,
    p: misses / n,
    missesPerS: misses / seconds,
  };
};
const light = group(low),
  heavy = group(high);
async function* member(file: string) {
  assert(/^trace\/raw\/(node-\d+-\d+|gw-r)\.jsonl\.gz$/.test(file));
  if (fs.statSync(archive!).isDirectory()) {
    const input = fs.createReadStream(path.join(archive!, file)).pipe(createGunzip());
    for await (const line of createInterface({ input, crlfDelay: Infinity }))
      if (line) yield JSON.parse(line);
    return;
  }
  const tar = spawn("tar", ["-xOf", archive!, file], { stdio: ["ignore", "pipe", "inherit"] });
  const exit = new Promise<void>((resolve, reject) => {
    tar.once("error", reject);
    tar.once("close", (code) =>
      code === 0 ? resolve() : reject(Error(`Archive member ${file} exit ${code}`)),
    );
  });
  const decoded = tar.stdout.pipe(createGunzip());
  for await (const line of createInterface({ input: decoded, crlfDelay: Infinity }))
    if (line) yield JSON.parse(line);
  await exit;
}

// [DX-RD1] Why: the service estimate comes from a fixed-ID subsample of bound exchanges, independent of the cohort's throughput.
// Rejected: deriving service capacity from the slow throughput and using that same number to explain it.
const roots = new Map<string, any>();
const local = new Map<string, number[]>();
const activity = new Map<number, (Interval & { name: string })[]>();
for (const file of readerMembers)
  for await (const raw of member(file)) {
    if (
      raw.type === "event" &&
      (raw.synchronous === true || raw.name === "node.gc") &&
      raw.end - raw.start >= 0.1
    ) {
      assert(
        raw.source === source &&
          raw.run === tag &&
          raw.slot === tag &&
          raw.clock?.bootId === reference.bootId,
      );
      const { start, end, thread, name } = alignClockRecord(raw, reference);
      if (phaseFor({ start, end })) {
        const events = activity.get(thread) ?? [];
        events.push({ start, end, name });
        activity.set(thread, events);
      }
      continue;
    }
    if (raw.name !== "reader.pull" || !sampledTrace(raw.traceId) || raw.attributes?.oracle === true)
      continue;
    assert(
      raw.source === source &&
        raw.run === tag &&
        raw.slot === tag &&
        raw.clock?.bootId === reference.bootId,
    );
    const r = alignClockRecord(raw, reference),
      phase = phaseFor(r);
    if (
      !phase ||
      r.truncated !== 0 ||
      r.spans.some((s: any) => s.name === "reader.straddle-await-ack")
    )
      continue;
    const http = new Map(
      r.spans.filter((s: any) => s.name === "client.http").map((s: any) => [s.id, s]),
    );
    if (http.size)
      roots.set(r.traceId, {
        phase: phase.name,
        duration: r.end - r.start,
        reader: r,
        http,
        gateway: new Map(),
      });
    else {
      const timings = local.get(phase.name) ?? [];
      timings.push(r.end - r.start);
      local.set(phase.name, timings);
    }
  }
for await (const raw of member("trace/raw/gw-r.jsonl.gz")) {
  const root = roots.get(raw.traceId);
  if (!root?.http.has(raw.parent)) continue;
  assert(
    raw.source === source &&
      raw.run === tag &&
      raw.slot === tag &&
      raw.clock?.bootId === reference.bootId,
  );
  const parent = root.http.get(raw.parent);
  if (parent.attributes?.responseTraceparent !== `00-${raw.traceId}-${raw.root}-01`) continue;
  const q = raw.spans.find((s: any) => s.name === "gateway.admission-wait"),
    w = raw.spans.find((s: any) => s.name === "gateway.admitted-work");
  if (q && raw.truncated === 0 && raw.attributes?.status === 200) {
    assert(!root.gateway.has(raw.parent));
    const work = w ? w.end - w.start : 0;
    // In summary a complete gateway record may omit admitted work shorter than 0.5 ms.
    root.gateway.set(raw.parent, {
      work,
      workUpper: w ? work : 0.5,
      queue: q.end - q.start,
      wall: raw.end - raw.start,
      route: raw.name.endsWith("/reach-many") ? "repair" : "reach",
      interval: alignClockRecord(raw, reference),
    });
  }
}

// [DX-RD1] Why: account for every millisecond on the original clock and keep recorded CPU work distinct from waits.
// Rejected: attributing a first-byte callback gap to the network or a whole reach duration to row decoding.
function stages(r: any) {
  const read = r.reader as Interval & { spans: ArchivedSpan[]; thread: number; traceId: string };
  const http: ArchivedSpan[] = [...r.http.values()].sort((a, b) => a.start - b.start);
  const events = activity.get(read.thread) ?? [];
  const exchanges = http.map((h) => {
    const g = r.gateway.get(h.id);
    const w = wireIntervals(h, read.spans, g.interval);
    if (!w) return;
    const overlaps = events.filter(
      (e) => e.start < w.responseWindow.end && e.end > w.responseWindow.start,
    );
    const named = new Map<string, Interval[]>();
    for (const event of overlaps) {
      const group = named.get(event.name) ?? [];
      group.push(event);
      named.set(event.name, group);
    }
    return {
      ...w.parts,
      route: g.route,
      queue: g.queue,
      workLower: g.work,
      workUpper: g.workUpper,
      responseOverlap: coveredMs(w.responseWindow, overlaps),
      gcOverlap: coveredMs(w.responseWindow, named.get("node.gc") ?? []),
      replicaApplyOverlap: coveredMs(w.responseWindow, named.get("replica.apply-delta") ?? []),
      overlapsByName: Object.fromEntries(
        [...named].map(([name, group]) => [name, coveredMs(w.responseWindow, group)]),
      ),
    };
  });
  if (!exchanges.every((x) => x !== undefined)) return;
  const before = http[0]!.start - read.start;
  const betweenIntervals = http.slice(1).map((h, i) => h.start - http[i]!.end);
  const between = sum(betweenIntervals);
  const after = read.end - http.at(-1)!.end;
  assert(
    before >= 0 && betweenIntervals.every((ms) => ms >= 0) && after >= 0,
    "Reader exchanges must be serial and contained",
  );
  const interval = (name: string) => {
    const spans = read.spans.filter((s) => s.name === name);
    return { observed: spans.length, ms: sum(spans.map((s) => s.end - s.start)) };
  };
  const syncNames = [
    "client.encode",
    "client.parse",
    "client.reach-decode-and-cache",
    "reader.observe",
  ];
  const outside =
    before +
    between +
    after +
    sum(
      exchanges.map(
        (e) =>
          e.httpSetup +
          e.queueAndWrite +
          e.writeToGateway +
          e.gatewayEndToHeaders +
          e.headersToBodyEnd +
          e.bodyEndToHttpEnd,
      ),
    );
  assert(Math.abs(outside + sum(exchanges.map((e) => e.gatewayWall)) - r.duration) < 0.01);
  return {
    traceId: read.traceId,
    phase: r.phase as string,
    workerThread: read.thread,
    beforeHttp: before,
    betweenHttp: between,
    afterHttp: after,
    outside,
    synchronous: Object.fromEntries(syncNames.map((name) => [name, interval(name)])),
    exchanges,
  };
}

const complete = [...roots.values()]
  .filter((r) => r.http.size === r.gateway.size)
  .map((r) => ({
    phase: r.phase,
    duration: r.duration,
    calls: r.http.size,
    work: sum([...r.gateway.values()].map((e) => e.work)),
    workUpper: sum([...r.gateway.values()].map((e) => e.workUpper)),
    queue: sum([...r.gateway.values()].map((e) => e.queue)),
    nonGateway: r.duration - sum([...r.gateway.values()].map((e) => e.wall)),
    stages: stages(r),
  }));
const estimates = complete.filter((r) => heavy.phases.includes(r.phase));
const work = mean(estimates.map((r) => r.work)),
  workUpper = mean(estimates.map((r) => r.workUpper)),
  duration = mean(estimates.map((r) => r.duration));
assert(work !== null && workUpper && duration && workUpper > 0 && duration > 0);
const permits = 2,
  localBaseline = light.rate,
  fastCycleMs = (1024 * 1000) / localBaseline;
const localTimings = (g: typeof heavy) => {
  const samples = g.phases.flatMap((p: string) => local.get(p) ?? []).sort((a, b) => a - b);
  return {
    n: samples.length,
    mean: mean(samples),
    p50: samples[Math.floor(samples.length * 0.5)] ?? null,
    p99: samples[Math.floor(samples.length * 0.99)] ?? null,
  };
};
const predict = (g: typeof heavy) => ({
  capacityOnly: [workUpper, work].map((s) => Math.min(localBaseline, (permits * 1000) / (g.p * s))),
  cycleOnly: (1024 * 1000) / ((1 - g.p) * fastCycleMs + g.p * duration),
  workImpliedByThroughputMs: (permits * 1000) / g.missesPerS,
  residenceImpliedAtUnchangedLocalCycleMs: ((1024 * 1000) / g.rate - (1 - g.p) * fastCycleMs) / g.p,
  nonFallbackCycleImpliedAtObservedMissResidenceMs:
    ((1024 * 1000) / g.rate - g.p * duration) / (1 - g.p),
});
type Stage = NonNullable<ReturnType<typeof stages>>;
// [DX-RD1] Why: the client did retain cumulative decoded text bytes, even though individual response lengths were never sealed.
// Rejected: treating decoded bytes as HTTP wire bytes or dividing them among the randomly sampled requests.
function readerCounters(names: readonly string[]) {
  const keys = ["decodedRows", "decodedTextBytes", "needRequests", "waits", "waitHits"] as const;
  const totals: Record<(typeof keys)[number], number> = {
    decodedRows: 0,
    decodedTextBytes: 0,
    needRequests: 0,
    waits: 0,
    waitHits: 0,
  };
  let workerWindows = 0;
  for (const phase of windows.filter((p: any) => names.includes(p.name))) {
    const samples = new Map<number, [any, any]>();
    for (const r of report.readerDiagnostics) {
      if (
        r.t < phase.start + report.config.settleS * 1000 ||
        r.t >= phase.end ||
        r.diagnostics?.gateway?.length !== 1
      )
        continue;
      const pair = samples.get(r.worker);
      if (!pair) samples.set(r.worker, [r, r]);
      else {
        if (r.t < pair[0].t) pair[0] = r;
        if (r.t > pair[1].t) pair[1] = r;
      }
    }
    for (const [a, b] of samples.values()) {
      if (b.t <= a.t) continue;
      const before = a.diagnostics.gateway[0].reach,
        after = b.diagnostics.gateway[0].reach;
      const differences = keys.map((key) => after[key] - before[key]);
      if (differences.some((d) => !Number.isSafeInteger(d) || d < 0)) continue;
      workerWindows++;
      keys.forEach((key, i) => {
        totals[key] += differences[i]!;
      });
    }
  }
  return { workerWindows, ...totals };
}

function summarizeStages(names: readonly string[]) {
  const eligible = complete.filter((r) => names.includes(r.phase));
  const measured = eligible.map((r) => r.stages).filter((r): r is Stage => r !== undefined);
  const exchanges = measured.flatMap((r) => r.exchanges);
  const activityNames = new Set(exchanges.flatMap((e) => Object.keys(e.overlapsByName)));
  const exchangeTotals = [
    "httpSetup",
    "queueAndWrite",
    "writeToGateway",
    "gatewayWall",
    "gatewayEndToHeaders",
    "headersToBodyEnd",
    "bodyEndToHttpEnd",
    "queue",
    "workLower",
    "workUpper",
    "responseOverlap",
    "gcOverlap",
    "replicaApplyOverlap",
  ] as const;
  const forStage = (times: readonly number[]) =>
    measured.length ? sum([...times]) / measured.length : null;
  return {
    names,
    eligible: eligible.length,
    measured: measured.length,
    readerCounters: readerCounters(names),
    exchanges: exchanges.length,
    repairExchanges: exchanges.filter((e) => e.route === "repair").length,
    headersAtLeast50MsAfterGateway: exchanges.filter((e) => e.gatewayEndToHeaders >= 50).length,
    responseCallbackOverlap: Object.fromEntries(
      [...activityNames].map((name) => {
        const values = exchanges.map((e) => e.overlapsByName[name] ?? 0);
        return [
          name,
          { exchanges: values.filter((x) => x > 0).length, meanMsPerMiss: forStage(values) },
        ];
      }),
    ),
    samplesDominatedByHeaderGap: measured.filter(
      (r) => sum(r.exchanges.map((e) => e.gatewayEndToHeaders)) > r.outside / 2,
    ).length,
    meanMsPerMiss: {
      outside: mean(measured.map((r) => r.outside)),
      beforeHttp: mean(measured.map((r) => r.beforeHttp)),
      betweenHttp: mean(measured.map((r) => r.betweenHttp)),
      afterHttp: mean(measured.map((r) => r.afterHttp)),
      ...Object.fromEntries(
        exchangeTotals.map((name) => [name, forStage(exchanges.map((e) => e[name]))]),
      ),
    },
    synchronous: Object.fromEntries(
      Object.keys(measured[0]?.synchronous ?? {}).map((name) => [
        name,
        {
          observed: sum(measured.map((r) => r.synchronous[name]!.observed)),
          lowerMeanMsPerMiss: forStage(measured.map((r) => r.synchronous[name]!.ms)),
        },
      ]),
    ),
  };
}
console.log(
  JSON.stringify(
    {
      source,
      tag,
      reportSha256: hash(bytes),
      traceSummarySha256: hash(summaryBytes),
      analyzers: Object.fromEntries(
        ["archived-fallback.ts", "archived-intervals.ts"].map((name) => [
          name,
          hash(fs.readFileSync(new URL(name, import.meta.url))),
        ]),
      ),
      sampledNodeMembers: readerMembers,
      candidateRoots: roots.size,
      fullyJoined: complete.length,
      sampledHeavy: estimates.length,
      heavySample: {
        meanWorkMs: [work, workUpper],
        meanResidenceMs: duration,
        meanQueueMs: mean(estimates.map((r) => r.queue)),
        meanOutsideGatewayMs: mean(estimates.map((r) => r.nonGateway)),
        meanCalls: mean(estimates.map((r) => r.calls)),
      },
      low: { ...light, ...predict(light), localRootMs: localTimings(light) },
      high: { ...heavy, ...predict(heavy), localRootMs: localTimings(heavy) },
      stages: {
        light: summarizeStages(light.phases),
        heavy: summarizeStages(heavy.phases),
        weighted: { ...group(weighted), ...summarizeStages(weighted.map((p: any) => p.name)) },
        unavailable: [
          "per-request socket reuse and TCP setup",
          "response bytes",
          "fallback decision stamp",
          "driver model checker interval",
        ],
      },
      evidence: estimates,
    },
    null,
    2,
  ),
);

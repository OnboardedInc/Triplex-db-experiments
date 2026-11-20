import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { createGunzip } from "node:zlib";
import { createInterface } from "node:readline";
import { sampledTrace } from "../../../../packages/datomic/dist/index.js";
import { alignClockRecord } from "../../../trace/report.mjs";

const [reportFile, summaryFile, archive, ...readerMembers] = process.argv.slice(2);
assert(reportFile && summaryFile && archive && readerMembers.length);
const bytes = fs.readFileSync(reportFile),
  report = JSON.parse(bytes.toString()),
  traceSummary = JSON.parse(fs.readFileSync(summaryFile, "utf8"));
const reference = traceSummary.clockAlignment.reference,
  { source, tag } = traceSummary;
assert(
  report.verdictPlanId === "ns-v3/2" &&
    report.correctness.violations === 0 &&
    report.correctness.errors === 0,
);
const phases = report.phases.filter((p: any) => p.pool === "L1024");
assert.equal(phases.length, 18);
const phaseFor = (r: { start: number; end: number }) =>
  phases.find((p: any) => r.start >= p.start + report.config.settleS * 1000 && r.end < p.end);
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
for (const file of readerMembers)
  for await (const raw of member(file)) {
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
    if (!phase || r.spans.some((s: any) => s.name === "reader.straddle-await-ack")) continue;
    const http = new Map(
      r.spans.filter((s: any) => s.name === "client.http").map((s: any) => [s.id, s]),
    );
    if (http.size)
      roots.set(r.traceId, {
        phase: phase.name,
        duration: r.end - r.start,
        http,
        gateway: new Map(),
      });
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
  const q = raw.spans.find((s: any) => s.name === "gateway.admission-wait"),
    w = raw.spans.find((s: any) => s.name === "gateway.admitted-work");
  if (q && w && raw.attributes?.status === 200) {
    assert(!root.gateway.has(raw.parent));
    root.gateway.set(raw.parent, {
      work: w.end - w.start,
      queue: q.end - q.start,
      wall: raw.end - raw.start,
    });
  }
}
const complete = [...roots.values()]
  .filter((r) => r.http.size === r.gateway.size)
  .map((r) => ({
    phase: r.phase,
    duration: r.duration,
    calls: r.http.size,
    work: sum([...r.gateway.values()].map((e) => e.work)),
    queue: sum([...r.gateway.values()].map((e) => e.queue)),
    nonGateway: r.duration - sum([...r.gateway.values()].map((e) => e.wall)),
  }));
const estimates = complete.filter((r) => heavy.phases.includes(r.phase));
const work = mean(estimates.map((r) => r.work)),
  duration = mean(estimates.map((r) => r.duration));
assert(work && duration && work > 0 && duration > 0);
const permits = 2,
  localBaseline = light.rate,
  fastCycleMs = (1024 * 1000) / localBaseline;
const predict = (g: typeof heavy) => ({
  capacityOnly: Math.min(localBaseline, (permits * 1000) / (g.p * work)),
  cycleOnly: (1024 * 1000) / ((1 - g.p) * fastCycleMs + g.p * duration),
  workImpliedByThroughputMs: (permits * 1000) / g.missesPerS,
  residenceImpliedAtUnchangedLocalCycleMs: ((1024 * 1000) / g.rate - (1 - g.p) * fastCycleMs) / g.p,
});
console.log(
  JSON.stringify(
    {
      source,
      tag,
      reportSha256: createHash("sha256").update(bytes).digest("hex"),
      sampledNodeMembers: readerMembers,
      candidateRoots: roots.size,
      fullyJoined: complete.length,
      sampledHeavy: estimates.length,
      heavySample: {
        meanWorkMs: work,
        meanResidenceMs: duration,
        meanQueueMs: mean(estimates.map((r) => r.queue)),
        meanOutsideGatewayMs: mean(estimates.map((r) => r.nonGateway)),
        meanCalls: mean(estimates.map((r) => r.calls)),
      },
      low: { ...light, ...predict(light) },
      high: { ...heavy, ...predict(heavy) },
      evidence: estimates,
    },
    null,
    2,
  ),
);

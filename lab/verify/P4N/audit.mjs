// [CX-VP4N] Why: recompute retained evidence and statistics without adopting the builder's success labels.
// Rejected: trusting summary files without checking their underlying bytes and denominators.
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
const E = "/Users/sam/Claude/Projects/triplex-db-2/evidence";
const R = path.join(E, "P4N-R1");
const out = path.dirname(process.env.QH1_RESULT);
const sha = (b) => createHash("sha256").update(b).digest("hex");
const result = { manifest: {}, builds: {}, summaries: {}, p2: {}, pins: {} };
let checked = 0;
for (const line of fs
  .readFileSync("lab/experiments/EXP-P4N/R1-SHA256SUMS", "utf8")
  .trim()
  .split("\n")) {
  const [_, expected, rel] = line.match(/^([a-f0-9]{64})  (.+)$/);
  assert.equal(sha(fs.readFileSync(path.join(R, rel))), expected, rel);
  checked++;
}
result.manifest = { checked };
const treeHash = (dir) => {
  const h = createHash("sha256");
  for (const f of fs.readdirSync(dir, { recursive: true }).map(String).sort()) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isFile()) h.update(f).update(sha(fs.readFileSync(p)));
  }
  return h.digest("hex");
};
for (const arm of ["sb", "sbe", "sbf"]) {
  const armRoot = path.join(R, "arms", arm);
  const bound = JSON.parse(fs.readFileSync(path.join(armRoot, "arm.json")));
  const builds = {
    coreDist: treeHash(path.join(armRoot, "packages/core/dist")),
    qleverDist: treeHash(path.join(armRoot, "packages/qlever/dist")),
  };
  assert.equal(builds.coreDist, bound.coreDist);
  assert.equal(builds.qleverDist, bound.qleverDist);
  result.builds[arm] = builds;
}
const replay = execFileSync(
  "node",
  [
    "lab/experiments/EXP-P4N/g4/replay-compare.mjs",
    path.join(E, "QH1-R3/replay/ref-baseline.txt"),
    path.join(R, "replay/sbe.txt"),
  ],
  { encoding: "utf8" },
);
result.replay = JSON.parse(replay);
assert.equal(result.replay.compared, 100000);
assert.equal(result.replay.mismatches, 0);
for (const series of ["fin-c1", "fin-c4", "sb-c1", "sb-c4", "lev-c1", "lev-c4", "lev2-c1"]) {
  const raw = execFileSync(
    "node",
    [
      "lab/experiments/EXP-P4N/g4/summary4.mjs",
      path.join(R, series),
      series.startsWith("lev") ? "sb" : "final",
    ],
    { encoding: "utf8", maxBuffer: 8 << 20 },
  );
  const actual = JSON.parse(raw);
  const expected = JSON.parse(fs.readFileSync(path.join(R, series + "-summary.json")));
  assert.deepEqual(actual, expected, series);
  fs.writeFileSync(path.join(out, series + "-recomputed.json"), raw);
  const runs = fs
    .readdirSync(path.join(R, series))
    .filter((f) => /^r\d+-.*\.json$/.test(f))
    .map((f) => ({
      round: Number(f.match(/^r(\d+)/)[1]),
      ...JSON.parse(fs.readFileSync(path.join(R, series, f))),
    }));
  const greenDetail = actual.hostPerRound
    .filter((r) => r.green)
    .map((r) => {
      const segs = runs.filter((x) => x.round === r.round).flatMap((x) => x.segments);
      return {
        round: r.round,
        probeMedian: r.probeUsMedian,
        segments: segs.length,
        failingSegments: segs.filter(
          (s) => Math.max(s.probeBefore.totalUs, s.probeAfter.totalUs) > actual.quietProbeUs * 1.1,
        ).length,
        maxProbeRatio:
          Math.max(...segs.flatMap((s) => [s.probeBefore.totalUs, s.probeAfter.totalUs])) /
          actual.quietProbeUs,
      };
    });
  for (const run of runs.filter((x) => ["sb", "sbe", "sbf"].includes(x.build))) {
    assert.equal(run.builds.core, result.builds[run.build].coreDist);
    assert.equal(run.builds.qlever, result.builds[run.build].qleverDist);
  }
  result.summaries[series] = {
    reproducedExactly: true,
    arms: Object.fromEntries(
      Object.entries(actual.arms).map(([k, v]) => [
        k,
        {
          pulls: v.pullsMeasured,
          pullsPerCpuSecond: v.pullsPerCpuSecond,
          bootstrap95: v.bootstrap95,
        },
      ]),
    ),
    greenDetail,
  };
}
const p2 = JSON.parse(fs.readFileSync(path.join(R, "p2/p2guard.json")));
const band = Math.max(
  ...p2.perRound.map((r) => Math.abs(r.p99RatioTwinOff - 1)),
  p2.p99RatioTwinOff.bootstrap95.hi - 1,
  1 - p2.p99RatioTwinOff.bootstrap95.lo,
);
assert.equal(p2.aaBand, band);
assert.equal(p2.p99RatioOnOff.point, p2.pooled.on.p99 / p2.pooled.off.p99);
assert.equal(p2.regression, p2.p99RatioOnOff.bootstrap95.lo > 1 + band);
assert.equal(p2.resolvable, band <= 0.1);
const logs = p2.perRound.map((r) => Math.log(r.p99RatioTwinOff));
const mean = logs.reduce((a, b) => a + b, 0) / logs.length;
const sd = Math.sqrt(logs.reduce((a, b) => a + (b - mean) ** 2, 0) / (logs.length - 1));
result.p2 = {
  point: p2.p99RatioOnOff.point,
  band,
  regression: p2.regression,
  resolvable: p2.resolvable,
  aaLogSd: sd,
  rawCommitSamplesRetained: false,
  bootstrapRecomputed: false,
};
const pins = JSON.parse(fs.readFileSync("lab/experiments/EXP-P4N/pin-changes.json"));
for (const p of pins.changed) {
  assert.equal(sha(execFileSync("git", ["show", "365fe188:" + p.path])), p.oldSha256);
  assert.equal(sha(fs.readFileSync(p.path)), p.newSha256);
}
assert.equal(
  execFileSync("git", ["diff", "365fe188", "--", "lab/acceptance"], { encoding: "utf8" }),
  "",
);
result.pins = { unchangedContract: true, checked: pins.changed };
fs.writeFileSync(path.join(out, "audit.json"), JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify(result, null, 2));

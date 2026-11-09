// [EXP-QH1-R3] (copy of g0/summary.mjs, reference arm for answer equality is env REF_ARM, default baseline)
// [EXP-QH1-R2] Why: ratios per round (paired, same roots), medians across rounds, and cross-arm answer equality on the fixed warmup roots.
// usage: node summary.mjs <outdir> [baseArm=baseline]
import fs from "node:fs";
import path from "node:path";
const [dir, baseArm = "baseline"] = process.argv.slice(2);
const files = fs
  .readdirSync(dir)
  .filter((f) => /^r\d+-.*\.json$/.test(f) && f !== "schedule.json");
const runs = files.map((f) => ({
  f,
  round: Number(f.match(/^r(\d+)-/)[1]),
  ...JSON.parse(fs.readFileSync(path.join(dir, f))),
}));
const med = (a) => {
  const s = a.filter((x) => x != null).sort((x, y) => x - y);
  return s.length ? s[Math.floor((s.length - 1) / 2)] : null;
};
const arms = [...new Set(runs.map((r) => r.arm))];
const per = (r, k) => med(r.segments.map((s) => s[k]));
const rows = {};
for (const arm of arms) {
  const rs = runs
    .filter((r) => r.arm === arm)
    .sort((a, b) => a.round - b.round);
  const base = (r) =>
    runs.find((x) => x.arm === baseArm && x.round === r.round);
  const ratio = rs.map((r) =>
    base(r) ? per(r, "cpuUsPerPull") / per(base(r), "cpuUsPerPull") : null,
  );
  rows[arm] = {
    rounds: rs.length,
    cpuUsPerPull: med(rs.map((r) => per(r, "cpuUsPerPull"))),
    mainUs: med(rs.map((r) => per(r, "mainUsPerPull"))),
    workersUs: med(rs.map((r) => per(r, "workersUsPerPull"))),
    otherUs: med(rs.map((r) => per(r, "otherUsPerPull"))),
    systemUs: med(rs.map((r) => per(r, "systemUsPerPull"))),
    pullsPerCpuSecond: med(rs.map((r) => per(r, "pullsPerCpuSecond"))),
    ratioToBaseline_perRound: ratio.map((x) =>
      x == null ? null : +x.toFixed(3),
    ),
    ratioToBaseline_median: +med(ratio)?.toFixed(3),
    p50ms: med(rs.map((r) => per(r, "p50"))),
    p99ms: med(rs.map((r) => per(r, "p99"))),
    rowsPerPull: per(rs[0], "rowsPerPull"),
    hopsPerPull: per(rs[0], "hopsPerPull"),
    calibrationMs_median: med(
      rs.flatMap((r) => r.segments.map((s) => s.calibration.ms)),
    ),
    load1_median: med(rs.flatMap((r) => r.segments.map((s) => s.load[0]))),
    perRoundCpuUs: rs.map((r) => +per(r, "cpuUsPerPull").toFixed(1)),
  };
}
// calibration-normalised efficiency: CPU per pull divided by calibration loop time, same process
for (const arm of arms) {
  const rs = runs.filter((r) => r.arm === arm);
  rows[arm].cpuUsPerPull_perCalibrationMs = +med(
    rs.flatMap((r) => r.segments.map((s) => s.cpuUsPerPull / s.calibration.ms)),
  ).toFixed(1);
}
// answer equality across arms (first N fixed warmup roots; core digest = entity, attribute, type, value multiset; full = every field)
const refArm =
  process.env.REF_ARM ?? (arms.includes("baseline") ? "baseline" : arms[0]);
const ref = runs.find((r) => r.arm === refArm);
const eq = {};
for (const arm of arms) {
  let coreEq = 0,
    fullEq = 0,
    fullN = 0,
    n = 0;
  for (const r of runs.filter((x) => x.arm === arm))
    for (
      let i = 0;
      i < Math.min(r.answerDigests.length, ref.answerDigests.length);
      i++
    ) {
      n++;
      if (
        r.answerDigests[i].core === ref.answerDigests[i].core &&
        r.answerDigests[i].n === ref.answerDigests[i].n
      )
        coreEq++;
      if (r.answerDigests[i].full) {
        fullN++;
        if (r.answerDigests[i].full === ref.answerDigests[i].full) fullEq++;
      }
    }
  eq[arm] = {
    compared: n,
    coreEqualToRef: coreEq,
    fullCompared: fullN,
    fullEqualToRef: fullEq,
  };
}
console.log(
  JSON.stringify({ dir, baseArm, refArm, rows, answerEquality: eq }, null, 2),
);

// [EXP-P4N] Why: absolute pulls per CPU-second with a bootstrap interval, paired ratios, the in-run A/A band and the host grade of
// every round. Statistic = sum(pulls) / sum(process CPU) over 100-pull batches. Bootstrap = resample rounds with replacement, then
// resample the batches inside each chosen round (two-level, so round-to-round host drift is in the interval), 5,000 draws, seeded.
// Paired ratio = per-round CPU per pull of an arm over the reference arm's in the same round (independent batch resampling per arm).
// The probe is a grade, never a divisor. Rejected: pooling all batches as if independent (understates round-to-round drift).
// usage: node summary4.mjs <dir> <refArm> [quietProbeUs]
import fs from "node:fs";
import path from "node:path";
const [dir, refArm, quietArg] = process.argv.slice(2);
if (!dir || !refArm) throw Error("usage: summary4.mjs dir refArm [quietProbeUs]");
const files = fs.readdirSync(dir).filter((f) => /^r\d+-.*\.json$/.test(f));
const runs = files.map((f) => ({ f, round: Number(f.match(/^r(\d+)-/)[1]), ...JSON.parse(fs.readFileSync(path.join(dir, f))) }));
const labels = [...new Set(runs.map((r) => r.arm))];
const rounds = [...new Set(runs.map((r) => r.round))].sort((a, b) => a - b);
const byArm = (arm) => Object.fromEntries(runs.filter((r) => r.arm === arm).map((r) => [r.round, r]));
const batchesOf = (run) => run.segments.flatMap((s) => s.batches);
const sumCpu = (bs) => bs.reduce((a, b) => a + b.totalUs, 0);
const sumPulls = (bs) => bs.reduce((a, b) => a + b.pulls, 0);
let seed = 20261109;
const rnd = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
const pick = (a) => a[Math.floor(rnd() * a.length)];
const resampleRound = (bs) => Array.from({ length: bs.length }, () => pick(bs));
const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.max(0, Math.round(p * (s.length - 1))))]; };
const med = (a) => pct(a, 0.5);
const B = 5000;
const ci = (draws) => ({ lo: pct(draws, 0.025), median: pct(draws, 0.5), hi: pct(draws, 0.975) });
const quietProbe = quietArg ? Number(quietArg) : Math.min(...runs.flatMap((r) => r.segments.flatMap((s) => [s.probeBefore.totalUs, s.probeAfter.totalUs])));
const out = { dir, refArm, rounds: rounds.length, quietProbeUs: quietProbe, quietProbeSource: quietArg ? "argument" : "minimum observed in this directory", arms: {}, paired: {}, hostPerRound: [] };
for (const arm of labels) {
  const per = byArm(arm), rs = rounds.filter((r) => per[r]);
  const bsByRound = rs.map((r) => batchesOf(per[r]));
  const all = bsByRound.flat();
  const draws = [];
  for (let i = 0; i < B; i++) {
    const chosen = Array.from({ length: rs.length }, () => pick(bsByRound));
    const bs = chosen.flatMap(resampleRound);
    draws.push((sumPulls(bs) * 1e6) / sumCpu(bs));
  }
  const perRound = bsByRound.map((bs) => (sumPulls(bs) * 1e6) / sumCpu(bs));
  const segs = rs.flatMap((r) => per[r].segments);
  const f = (k) => med(segs.map((s) => s[k]));
  out.arms[arm] = {
    rounds: rs.length,
    pullsMeasured: sumPulls(all),
    pullsPerRound: bsByRound.map(sumPulls),
    pullsPerCpuSecond: (sumPulls(all) * 1e6) / sumCpu(all),
    bootstrap95: ci(draws),
    perRoundPullsPerCpuSecond: perRound.map((x) => +x.toFixed(1)),
    cpuUsPerPull: sumCpu(all) / sumPulls(all),
    mainUs: f("mainUsPerPull"), workersUs: f("workersUsPerPull"), otherUs: f("otherUsPerPull"),
    p50ms: f("p50"), p99ms: f("p99"), rowsPerPull: f("rowsPerPull"),
    execArgv: runs.find((r) => r.arm === arm).execArgv,
  };
}
const ref = byArm(refArm);
for (const arm of labels) {
  if (arm === refArm) continue;
  const per = byArm(arm), rs = rounds.filter((r) => per[r] && ref[r]);
  const mk = (bsOf) => rs.map((r) => bsOf(per[r]));
  const aB = rs.map((r) => batchesOf(per[r])), rB = rs.map((r) => batchesOf(ref[r]));
  const cpp = (bs) => sumCpu(bs) / sumPulls(bs);
  const ratios = rs.map((_, i) => cpp(aB[i]) / cpp(rB[i]));
  const draws = [];
  for (let i = 0; i < B; i++) {
    const idx = Array.from({ length: rs.length }, () => Math.floor(rnd() * rs.length));
    draws.push(idx.reduce((a, j) => a + cpp(resampleRound(aB[j])) / cpp(resampleRound(rB[j])), 0) / idx.length);
  }
  out.paired[arm] = { rounds: rs.length, perRoundRatio: ratios.map((x) => +x.toFixed(3)), median: +med(ratios).toFixed(3), mean: +(ratios.reduce((a, b) => a + b, 0) / ratios.length).toFixed(3), sd: +Math.sqrt(ratios.reduce((a, b) => a + (b - ratios.reduce((x, y) => x + y, 0) / ratios.length) ** 2, 0) / Math.max(1, ratios.length - 1)).toFixed(3), bootstrap95OfMeanRatio: ci(draws) };
}
for (const r of rounds) {
  const rr = runs.filter((x) => x.round === r), segs = rr.flatMap((x) => x.segments);
  const probes = segs.flatMap((s) => [s.probeBefore.totalUs, s.probeAfter.totalUs]);
  const slots = segs.flatMap((s) => [s.heavySlotsBefore, s.heavySlotsAfter].map((l) => l.filter((x) => !x.startsWith("P4N-R1")).length));
  const loads = segs.flatMap((s) => [s.loadBefore[0], s.loadAfter[0]]);
  out.hostPerRound.push({ round: r, load1: [+Math.min(...loads).toFixed(2), +Math.max(...loads).toFixed(2)], otherHeavySlotsHeld: [Math.min(...slots), Math.max(...slots)], probeUsMedian: +med(probes).toFixed(0), probeUsMin: +Math.min(...probes).toFixed(0), probeVsQuiet: +(med(probes) / quietProbe).toFixed(2), green: med(probes) / quietProbe <= 1.1 });
}
// answer equality against the reference arm on the fixed warmup roots (full-field digests)
out.answerEquality = {};
const refRun = Object.values(ref)[0];
for (const arm of labels) {
  let n = 0, eq = 0;
  for (const r of runs.filter((x) => x.arm === arm)) for (let i = 0; i < Math.min(r.answerDigests.length, refRun.answerDigests.length); i++) { n++; if (r.answerDigests[i].full && r.answerDigests[i].full === refRun.answerDigests[i].full) eq++; }
  out.answerEquality[arm] = { compared: n, fullEqual: eq };
}
console.log(JSON.stringify(out, null, 2));

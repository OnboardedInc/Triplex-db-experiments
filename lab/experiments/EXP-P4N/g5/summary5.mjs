// [EXP-P4N-R2] Why (F3): absolute pulls per CPU-second with a two-level bootstrap, paired ratios, the in-run A/A band, and the host grade applied
// per ARM and per SEGMENT against a quiet reference fixed beforehand (quiet.json), exactly as BRIEF 4.3 item 2 says. A segment is eligible only
// when BOTH of its probes (before and after) are within +10% of the fixed quiet value. The headline "eligible" estimate uses only the batches of
// eligible segments of that arm; the all-segments estimate stays beside it, labelled as loaded. Round 1 graded a whole round by the median of
// every arm's probes against the minimum found in the directory, so one arm's lucky probe graded every arm (review F3). No round label is
// produced here. Statistic = sum(pulls)/sum(process CPU) over 100-pull batches; bootstrap = resample rounds with replacement, then batches inside
// each chosen round, 5,000 seeded draws, 95%.
// usage: node summary5.mjs <dir> <refArm> <quiet.json>
import fs from "node:fs";
import path from "node:path";
const [dir, refArm, quietFile, sensitivityArg] = process.argv.slice(2);
const SENS = Number(sensitivityArg ?? 1.25);
if (!dir || !refArm || !quietFile) throw Error("usage: summary5.mjs dir refArm quiet.json");
const quiet = JSON.parse(fs.readFileSync(quietFile, "utf8"));
const quietUs = quiet.quietUs;
if (!(quietUs > 0)) throw Error("quiet.json has no quietUs");
const THRESH = 1.1;
const files = fs.readdirSync(dir).filter((f) => /^r\d+-.*\.json$/.test(f));
const runs = files.map((f) => ({
  f,
  round: Number(f.match(/^r(\d+)-/)[1]),
  ...JSON.parse(fs.readFileSync(path.join(dir, f))),
}));
const labels = [...new Set(runs.map((r) => r.arm))];
const rounds = [...new Set(runs.map((r) => r.round))].sort((a, b) => a - b);
const byArm = (arm) =>
  Object.fromEntries(runs.filter((r) => r.arm === arm).map((r) => [r.round, r]));
const worst = (s) => Math.max(s.probeBefore.totalUs, s.probeAfter.totalUs);
const eligible = (s) => worst(s) <= THRESH * quietUs;
// Sensitivity only (NOT the brief's rule): the same grading at a looser threshold, reported beside the strict one so a reader can see how much
// the strict rule's few eligible segments leave out. Never a verdict.
const loose = (s) => worst(s) <= SENS * quietUs;
const batchesOf = (run, onlyEligible) =>
  run.segments
    .filter((s) => !onlyEligible || (onlyEligible === "loose" ? loose(s) : eligible(s)))
    .flatMap((s) => s.batches);
const sumCpu = (bs) => bs.reduce((a, b) => a + b.totalUs, 0);
const sumPulls = (bs) => bs.reduce((a, b) => a + b.pulls, 0);
let seed = 20261109;
const rnd = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
const pick = (a) => a[Math.floor(rnd() * a.length)];
const resample = (bs) => Array.from({ length: bs.length }, () => pick(bs));
const pct = (a, p) => {
  const s = [...a].sort((x, y) => x - y);
  return s[Math.min(s.length - 1, Math.max(0, Math.round(p * (s.length - 1))))];
};
const med = (a) => pct(a, 0.5);
const B = 5000;
const ci = (draws) => ({ lo: pct(draws, 0.025), median: pct(draws, 0.5), hi: pct(draws, 0.975) });
const estimate = (per, rs, onlyEligible) => {
  const byRound = rs.map((r) => batchesOf(per[r], onlyEligible)).filter((bs) => bs.length);
  if (!byRound.length) return null;
  const all = byRound.flat();
  const draws = [];
  for (let i = 0; i < B; i++) {
    const chosen = Array.from({ length: byRound.length }, () => pick(byRound));
    const bs = chosen.flatMap(resample);
    draws.push((sumPulls(bs) * 1e6) / sumCpu(bs));
  }
  return {
    rounds: byRound.length,
    pulls: sumPulls(all),
    pullsPerCpuSecond: (sumPulls(all) * 1e6) / sumCpu(all),
    cpuUsPerPull: sumCpu(all) / sumPulls(all),
    bootstrap95: ci(draws),
  };
};
const out = {
  dir,
  refArm,
  quietFile,
  quietUs,
  threshold: THRESH,
  rule: "segment eligible iff max(probeBefore, probeAfter) <= 1.10 x quietUs",
  rounds: rounds.length,
  arms: {},
  paired: {},
  hostPerRound: [],
};
for (const arm of labels) {
  const per = byArm(arm),
    rs = rounds.filter((r) => per[r]);
  const segs = rs.flatMap((r) => per[r].segments);
  const f = (k) => med(segs.map((s) => s[k]));
  const docs = segs.filter((s) => s.docStatsDelta);
  const dsum = (k) => docs.reduce((a, s) => a + (s.docStatsDelta[k] ?? 0), 0);
  const lookups = dsum("hit") + dsum("absent") + dsum("stale") + dsum("behind");
  const first = per[rs[0]];
  out.arms[arm] = {
    rounds: rs.length,
    segments: segs.length,
    eligibleSegments: segs.filter(eligible).length,
    eligibleShare: +(segs.filter(eligible).length / segs.length).toFixed(3),
    loadedAllSegments: estimate(per, rs, false),
    eligibleOnly: estimate(per, rs, true),
    looseSegments: segs.filter(loose).length,
    sensitivityOnly: { threshold: SENS, note: "diagnostic only, not the brief's +10% rule", estimate: estimate(per, rs, "loose") },
    mainUs: f("mainUsPerPull"),
    workersUs: f("workersUsPerPull"),
    otherUs: f("otherUsPerPull"),
    p50ms: f("p50"),
    p99ms: f("p99"),
    rowsPerPull: f("rowsPerPull"),
    execArgv: first.execArgv,
    docMode: first.docMode,
    writerOn: first.writerOn,
    sweepOn: first.sweepOn,
    commitsPerSegment: first.writerOn ? f("commits") : undefined,
    docs: docs.length
      ? {
          lookups,
          hit: dsum("hit"),
          absent: dsum("absent"),
          stale: dsum("stale"),
          behind: dsum("behind"),
          hitShare: +(dsum("hit") / lookups).toFixed(4),
          fills: dsum("fills"),
          fillBusy: dsum("fillBusy"),
          fillErrors: dsum("fillErrors"),
          currentDbEndBytes: first.currentDbEnd,
          prefill: first.prefill,
        }
      : undefined,
    buckets: Object.fromEntries(
      ["50-200", "201-800", "801-2000"].map((b) => [
        b,
        {
          p50: med(segs.map((s) => s.buckets[b]?.p50).filter((x) => x != null)),
          p99: med(segs.map((s) => s.buckets[b]?.p99).filter((x) => x != null)),
        },
      ]),
    ),
  };
}
const ref = byArm(refArm);
for (const arm of labels) {
  if (arm === refArm) continue;
  const per = byArm(arm),
    rs = rounds.filter((r) => per[r] && ref[r]);
  const ratioSet = (onlyEligible) => {
    const ok = rs.filter(
      (r) => batchesOf(per[r], onlyEligible).length && batchesOf(ref[r], onlyEligible).length,
    );
    if (!ok.length) return null;
    const aB = ok.map((r) => batchesOf(per[r], onlyEligible)),
      rB = ok.map((r) => batchesOf(ref[r], onlyEligible));
    const cpp = (bs) => sumCpu(bs) / sumPulls(bs);
    const ratios = ok.map((_, i) => cpp(aB[i]) / cpp(rB[i]));
    const m = ratios.reduce((a, b) => a + b, 0) / ratios.length;
    const draws = [];
    for (let i = 0; i < B; i++) {
      const idx = Array.from({ length: ok.length }, () => Math.floor(rnd() * ok.length));
      draws.push(
        idx.reduce((a, j) => a + cpp(resample(aB[j])) / cpp(resample(rB[j])), 0) / idx.length,
      );
    }
    return {
      rounds: ok.length,
      perRoundRatio: ratios.map((x) => +x.toFixed(3)),
      median: +med(ratios).toFixed(3),
      mean: +m.toFixed(3),
      sd: +Math.sqrt(
        ratios.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(1, ratios.length - 1),
      ).toFixed(3),
      bootstrap95OfMeanRatio: ci(draws),
    };
  };
  out.paired[arm] = { allSegments: ratioSet(false), eligibleOnly: ratioSet(true), sensitivityOnly: ratioSet("loose") };
}
for (const r of rounds) {
  const rr = runs.filter((x) => x.round === r);
  out.hostPerRound.push({
    round: r,
    load1: [
      Math.min(
        ...rr.flatMap((x) => x.segments.flatMap((s) => [s.loadBefore[0], s.loadAfter[0]])),
      ).toFixed(2) * 1,
      Math.max(
        ...rr.flatMap((x) => x.segments.flatMap((s) => [s.loadBefore[0], s.loadAfter[0]])),
      ).toFixed(2) * 1,
    ],
    otherHeavySlotsHeld: [
      Math.min(
        ...rr.flatMap((x) =>
          x.segments.flatMap((s) =>
            [s.heavySlotsBefore, s.heavySlotsAfter].map(
              (l) => l.filter((n) => !n.startsWith("P4N-R")).length,
            ),
          ),
        ),
      ),
      Math.max(
        ...rr.flatMap((x) =>
          x.segments.flatMap((s) =>
            [s.heavySlotsBefore, s.heavySlotsAfter].map(
              (l) => l.filter((n) => !n.startsWith("P4N-R")).length,
            ),
          ),
        ),
      ),
    ],
    eligibleSegmentsByArm: Object.fromEntries(
      rr.map((x) => [x.arm, `${x.segments.filter(eligible).length}/${x.segments.length}`]),
    ),
    worstProbeVsQuiet: +(
      Math.max(
        ...rr.flatMap((x) =>
          x.segments.flatMap((s) => [s.probeBefore.totalUs, s.probeAfter.totalUs]),
        ),
      ) / quietUs
    ).toFixed(3),
  });
}
// answer equality against the reference arm's first run on the fixed warm roots; meaningless (and skipped) when a writer changed the data
out.answerEquality = {};
const refRun = Object.values(ref)[0];
for (const arm of labels) {
  const rs = runs.filter((x) => x.arm === arm);
  if (rs.some((x) => x.writerOn) || refRun.writerOn) {
    out.answerEquality[arm] = "skipped: writer-on series";
    continue;
  }
  let n = 0,
    eq = 0;
  for (const r of rs)
    for (let i = 0; i < Math.min(r.answerDigests.length, refRun.answerDigests.length); i++) {
      n++;
      if (r.answerDigests[i].full && r.answerDigests[i].full === refRun.answerDigests[i].full) eq++;
    }
  out.answerEquality[arm] = { compared: n, fullEqual: eq };
}
console.log(JSON.stringify(out, null, 2));

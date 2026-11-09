// [EXP-P5N] Why: brief 3.4 verdict for the sweep-on against sweep-off live ratios, computed from the saved raw samples of one screen run: A/A window validity first, then the paired bootstrap upper bound
// (whole rounds resampled). The verdict is INVALID (inconclusive), never PASS or FAIL, when the window rule fails. Pure recomputation from files; no store is opened.
// usage: node p5n-aa.mjs <screen output dir>
import fs from "node:fs";
const dir = process.argv[2];
const rep = JSON.parse(fs.readFileSync(dir + "/screen.json", "utf8"));
const P = rep.params, W0 = P.WARM_S * 1000, W1 = (P.WARM_S + P.WINDOW_S) * 1000;
const pct = (xs, q) => { const a = Float64Array.from(xs).sort(); return a[Math.min(a.length - 1, Math.ceil(a.length * q) - 1)]; };
const raw = (r, arm) => {
  const x = JSON.parse(fs.readFileSync(`${dir}/lat-${r}-${arm}-raw.json`, "utf8"));
  const inWin = (s) => s.rel >= W0 && s.rel < W1;
  return { commit: x.commits.filter(inWin).map((s) => s.lat), read: x.reads.filter(inWin).map((s) => s.ms), svc: x.commits.filter(inWin).map((s) => s.svc ?? 0) };
};
const rounds = rep.latency.rounds;
const pairs = rounds.filter((r) => !r.aa), aas = rounds.filter((r) => r.aa);
const data = (r) => (r.aa ? { t: raw(r.round, "base-a"), b: raw(r.round, "base-b") } : { t: raw(r.round, "sweep"), b: raw(r.round, "base") });
const cache = new Map(rounds.map((r) => [r.round, data(r)]));
const pooled = (rs, side, f) => rs.flatMap((r) => cache.get(r.round)[side][f]);
const ratioP99 = (rs, f) => pct(pooled(rs, "t", f), 0.99) / pct(pooled(rs, "b", f), 0.99);
// window rules
const lnP50 = aas.map((r) => Math.log(pct(cache.get(r.round).t.commit, 0.5) / pct(cache.get(r.round).b.commit, 0.5)));
const mean = lnP50.reduce((a, b) => a + b, 0) / (lnP50.length || 1);
const sd = lnP50.length > 1 ? Math.sqrt(lnP50.reduce((a, b) => a + (b - mean) ** 2, 0) / (lnP50.length - 1)) : null;
const aaCommit = aas.length ? ratioP99(aas, "commit") : null, aaRead = aas.length ? ratioP99(aas, "read") : null;
const util = rounds.flatMap((r) => (r.aa ? ["base-a", "base-b"] : ["base"]).map((arm) => ({ round: r.round, arm, util: cache.get(r.round)[arm === "base" || arm === "base-b" ? "b" : "t"].svc.reduce((a, b) => a + b, 0) / (W1 - W0) })));
const utilSorted = util.map((u) => u.util).sort((a, b) => a - b);
// paired bootstrap, whole rounds resampled
let seed = 20261109;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
const B = 600, bc = [], br = [];
for (let b = 0; b < B; b++) {
  const pick = Array.from({ length: pairs.length }, () => pairs[Math.floor(rnd() * pairs.length)]);
  bc.push(ratioP99(pick, "commit"));
  br.push(ratioP99(pick, "read"));
}
const ub = (xs) => pct(xs, 0.975);
const out = {
  pairRounds: pairs.length, aaRounds: aas.length,
  pooledRatios: { commitP99: ratioP99(pairs, "commit"), readP99: ratioP99(pairs, "read"), commitP50: pct(pooled(pairs, "t", "commit"), 0.5) / pct(pooled(pairs, "b", "commit"), 0.5), readP50: pct(pooled(pairs, "t", "read"), 0.5) / pct(pooled(pairs, "b", "read"), 0.5) },
  perRoundCommitP99: pairs.map((r) => +r.ratios.commitP99?.toFixed(2)), perRoundReadP99: pairs.map((r) => +r.ratios.readP99?.toFixed(2)),
  bootstrap95Upper: { commitP99: ub(bc), readP99: ub(br), resamples: B },
  window: {
    sdLnP50CommitAA: sd, sdRule: "<= 0.28 over >= 12 rounds", aaPooledCommitP99: aaCommit, aaPooledReadP99: aaRead, aaRule: "both in 0.85 to 1.18",
    baseWriterUtilization: { median: utilSorted[Math.floor(utilSorted.length / 2)], max: utilSorted.at(-1), over50pct: util.filter((u) => u.util > 0.5).length, arms: util.length }, utilRule: "<= 0.5",
    loadStartMax: Math.max(...rounds.flatMap((r) => ["sweep", "base", "base-a", "base-b"].filter((a) => r[a]).map((a) => r[a].load?.[0] ?? 0))),
  },
};
const w = out.window;
const reasons = [];
if (pairs.length < 12) reasons.push("fewer than 12 rounds");
if (sd === null || sd > 0.28) reasons.push(sd === null ? "s_d not computable (fewer than 2 A/A rounds)" : "s_d " + sd.toFixed(2) + " > 0.28");
if (aaCommit === null || aaCommit < 0.85 || aaCommit > 1.18) reasons.push("A/A pooled commit p99 ratio " + aaCommit?.toFixed(2) + " outside 0.85 to 1.18");
if (aaRead === null || aaRead < 0.85 || aaRead > 1.18) reasons.push("A/A pooled read p99 ratio " + aaRead?.toFixed(2) + " outside 0.85 to 1.18");
if (w.baseWriterUtilization.median > 0.5) reasons.push("base writer utilization median " + w.baseWriterUtilization.median.toFixed(2) + " > 0.5");
out.verdict = reasons.length ? { status: "INVALID-INCONCLUSIVE", reasons } : out.bootstrap95Upper.commitP99 <= 1.5 && out.bootstrap95Upper.readP99 <= 1.5 ? { status: "HOLDS" } : { status: "FAIL", note: "valid window, upper bound above 1.5" };
console.log(JSON.stringify(out, null, 1));

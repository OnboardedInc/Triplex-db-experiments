// [EXP-P5B-R3] Why: the 10k screening run saved every round and raw sample, then crashed in its own pooling step (Math.max over about 100k samples
// overflowed the call stack, since fixed). This recomputes the pooled ratios from the saved raw files with the same rule: samples of the non-A/A rounds
// are pooled per side inside the measured window, then the p99 of each side. It reads files, it never re-measures.
// Rejected: rerunning 25 minutes of arms to reach a summary line, and editing the original receipt.
// usage: node p5-screen-pool.mjs <screen dir> <out.json>
import fs from "node:fs";
import path from "node:path";
const [dir, out] = process.argv.slice(2);
if (!out) throw Error("usage: p5-screen-pool.mjs <screen dir> <out.json>");
const r = JSON.parse(fs.readFileSync(path.join(dir, "screen.json"), "utf8"));
const { WARM_S, WINDOW_S } = r.params;
const q = (xs, p) => [...xs].sort((a, b) => a - b)[Math.max(0, Math.ceil(xs.length * p) - 1)];
const sum = (xs) => ({ count: xs.length, p50: q(xs, 0.5), p99: q(xs, 0.99), max: xs.reduce((a, b) => (b > a ? b : a), 0) });
const pool = (kind, key, f) =>
  r.latency.rounds
    .filter((x) => !x.aa)
    .flatMap((x) =>
      JSON.parse(fs.readFileSync(path.join(dir, `lat-${x.round}-${kind}-raw.json`), "utf8"))[key]
        .filter((s) => s.rel >= WARM_S * 1000 && s.rel < (WARM_S + WINDOW_S) * 1000)
        .map(f),
    );
const sc = pool("sweep", "commits", (s) => s.lat),
  bc = pool("base", "commits", (s) => s.lat),
  sr = pool("sweep", "reads", (s) => s.ms),
  br = pool("base", "reads", (s) => s.ms);
const result = {
  source: path.join(dir, "screen.json"),
  note: "recomputed from saved raw samples; the run's own pooling step crashed after all rounds were saved",
  rounds: r.latency.rounds.filter((x) => !x.aa).length,
  commit: { sweep: sum(sc), base: sum(bc), p99Ratio: q(sc, 0.99) / q(bc, 0.99), p50Ratio: q(sc, 0.5) / q(bc, 0.5) },
  liveRead: { sweep: sum(sr), base: sum(br), p99Ratio: q(sr, 0.99) / q(br, 0.99), p50Ratio: q(sr, 0.5) / q(br, 0.5) },
  perRound: r.latency.rounds.map((x) => ({ round: x.round, aa: x.aa, order: x.order, ratios: x.ratios })),
  verdict: "none: diagnostic screening, 4 pairs and 1 A/A on a shared host, no duet, no bootstrap interval",
};
fs.writeFileSync(out, JSON.stringify(result, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify({ commit: result.commit, liveRead: result.liveRead }, null, 1));

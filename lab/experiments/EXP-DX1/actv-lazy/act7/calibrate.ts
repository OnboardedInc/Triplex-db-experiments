// [DX-ACT7] Reads the frame counters of a server settlement run (act7-frame-counters-*.json, written with
// DX_ACT7_FRAME_COUNTERS=1 on a write gateway with TX2_GROUP_STAGE_CLOCK=1) and states, per writer and together:
// frames, datoms, request bytes, the transactor's serial apply time (`nativeComputeMs`, Datomic's io-stats api-ms) against
// each frame's estimated service, and a conservative calibration of the estimate's three coefficients: the least-squares
// fit of apply time on (estimated rows, estimated wire KiB), its fixed part raised by the largest residual so that no
// measured frame is above the calibrated model, then doubled (TX2_SETTLE_COST is the doubled model).
// Usage: node --experimental-transform-types calibrate.ts COUNTERS.json [...]
import assert from "node:assert/strict";
import fs from "node:fs";
import type { FrameCounter } from "../join/bulk.ts";

const frames = process.argv.slice(2).flatMap((f) => (JSON.parse(fs.readFileSync(f, "utf8")).frames as FrameCounter[]))
  .filter((f) => f.applyMs !== null && f.estimate !== null);
assert(frames.length >= 100, "fewer than 100 frames with an apply time and an estimate");
const pct = (xs: number[], q: number) => xs.toSorted((a, b) => a - b)[Math.max(0, Math.ceil(xs.length * q) - 1)]!;
function describe(xs: FrameCounter[]) {
  const apply = xs.map((f) => f.applyMs! * 1000), est = xs.map((f) => f.estimate!.us);
  return { frames: xs.length, datomsP50: pct(xs.map((f) => f.datoms ?? 0), 0.5), datomsMax: Math.max(...xs.map((f) => f.datoms ?? 0)),
    requestBytesP50: pct(xs.map((f) => f.requestBytes), 0.5), applyUsP50: pct(apply, 0.5), applyUsP99: pct(apply, 0.99),
    applyUsMax: Math.max(...apply), estimatedUsP50: pct(est, 0.5), realShareOfEstimate: apply.reduce((a, b) => a + b, 0) / est.reduce((a, b) => a + b, 0) };
}
// Least squares: apply = a + b * rows + c * wireKiB, rows = 5 * ops + 16 (the estimate's own variables).
const X = frames.map((f) => [1, f.estimate!.ops * 5 + 16, f.estimate!.wire / 1024]);
const y = frames.map((f) => f.applyMs! * 1000);
const xtx = [0, 1, 2].map((i) => [0, 1, 2].map((j) => X.reduce((s, r) => s + r[i]! * r[j]!, 0)));
const xty = [0, 1, 2].map((i) => X.reduce((s, r, k) => s + r[i]! * y[k]!, 0));
function solve(m: number[][], v: number[]) {
  const a = m.map((r, i) => [...r, v[i]!]);
  for (let c = 0; c < 3; c++) {
    const p = a.reduce((best, r, i) => (i >= c && Math.abs(r[c]!) > Math.abs(a[best]![c]!) ? i : best), c);
    [a[c], a[p]] = [a[p]!, a[c]!];
    for (let r = 0; r < 3; r++) if (r !== c) {
      const f = a[r]![c]! / a[c]![c]!;
      for (let k = c; k < 4; k++) a[r]![k]! -= f * a[c]![k]!;
    }
  }
  return a.map((r, i) => r[3]! / r[i]!);
}
const [a, b, c] = solve(xtx, xty).map((v) => Math.max(0, v)) as [number, number, number];
const worst = Math.max(...X.map((r, k) => y[k]! - (a + b * r[1]! + c * r[2]!)));
const model = { fixedUs: a + Math.max(0, worst), rowUs: b, kibUs: c };
const cost = [Math.max(500, Math.ceil(2 * model.fixedUs)), Math.ceil(2 * model.rowUs), Math.ceil(2 * model.kibUs)];
console.log(JSON.stringify({
  values: describe(frames.filter((f) => f.kind === "activation")), notices: describe(frames.filter((f) => f.kind === "notice")),
  all: describe(frames), fit: { fixedUs: a, rowUs: b, kibUs: c, largestResidualUs: worst }, envelope: model,
  TX2_SETTLE_COST: cost.join(","),
}, null, 2));

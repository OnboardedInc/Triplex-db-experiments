// [EXP-P5B-R3] Why: the 100k forecast must come from the 1k and 10k receipts by a stated rule, not by hand.
// Rule: time and bytes are fitted through the two points both as linear (a + b N) and as a power law (c N^k); the report quotes both and the
// fixed-cost-free reading (per-subject cost at 10k times 100k). Rejected: one curve (two points cannot tell the shapes apart, so the spread is the uncertainty).
// usage: node p5-extrapolate.mjs <b0-1k dir> <b1-1k dir> <b0-10k dir> <b1-10k dir> <out.json>
import fs from "node:fs";
import path from "node:path";
const [b01, b11, b010, b110, out] = process.argv.slice(2);
if (!out) throw Error("usage: p5-extrapolate.mjs <b0-1k> <b1-1k> <b0-10k> <b1-10k> <out.json>");
const read = (d, f) => JSON.parse(fs.readFileSync(path.join(d, f), "utf8"));
const pts = [
  { N: 1000, b0: read(b01, "receipt.json"), b1: read(b11, "screen.json") },
  { N: 10000, b0: read(b010, "receipt.json"), b1: read(b110, "screen.json") },
];
const N = 100000;
const fit = (y1, y2) => {
  const [x1, x2] = [pts[0].N, pts[1].N];
  const b = (y2 - y1) / (x2 - x1),
    a = y1 - b * x1,
    k = Math.log(y2 / y1) / Math.log(x2 / x1);
  return {
    linear: a + b * N,
    powerLaw: y2 * (N / x2) ** k,
    perUnitAt10k: (y2 / x2) * N,
    exponent: k,
  };
};
const series = {
  seedWallS: pts.map((p) => p.b0.seed.wallS),
  g0WallS: pts.map((p) => p.b0.G0.wallS),
  storeLogicalBytes: pts.map((p) => p.b0.bytes.logicalBytes),
  seedIntentGzBytes: pts.map((p) => p.b0.bytes.seedIntentBytes),
  positionMapBytes: pts.map((p) => p.b0.bytes.positionMapBytes),
  assertions: pts.map((p) => p.b0.seed.assertions),
  activationW1WallS: pts.map((p) => p.b1.activation?.W1?.wallMs / 1000),
  activationW4WallS: pts.map((p) => p.b1.activation?.W4?.wallMs / 1000),
  longestPageMs: pts.map((p) => p.b1.activation?.W4?.pageTransactionMs?.max),
};
const result = { N, basis: "1k and 10k receipts", series, forecast: {} };
for (const [k, v] of Object.entries(series))
  if (v.every(Number.isFinite)) result.forecast[k] = fit(v[0], v[1]);
// Stage split at 10k (W4): where the wall goes, so a 100k forecast says what to fix.
const w4 = pts[1].b1.activation?.W4;
if (w4)
  result.stageSplit10kW4 = {
    wallS: w4.wallMs / 1000,
    publishMsTotal: w4.publishMsTotal,
    publishStage: w4.publishStage,
    cpuS: w4.cpuS,
    pages: w4.pages,
  };
// Disk needed for one 100k seed plus screening: store + gz intent + map + 64 MiB WAL allowance + arm growth, above the 5 GiB floor.
const gib = 1024 ** 3,
  floor = 5 * gib;
const store = result.forecast.storeLogicalBytes?.perUnitAt10k,
  intent = result.forecast.seedIntentGzBytes?.perUnitAt10k,
  map = result.forecast.positionMapBytes?.perUnitAt10k;
if (store && intent && map) {
  const need = store + intent + map + 64 * 1024 ** 2 + 2 * gib;
  result.disk100k = {
    storeBytes: store,
    intentGzBytes: intent,
    mapBytes: map,
    armGrowthAllowanceBytes: 2 * gib,
    ownBytes: need,
    freeNeededBytes: need + floor,
    freeNeededGiB: (need + floor) / gib,
    note: "arms are APFS clones: only changed pages cost space; a plain copy per arm would add one store per arm",
  };
}
fs.writeFileSync(out, JSON.stringify(result, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify(result.forecast, null, 1));

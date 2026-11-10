import fs from "node:fs";
// [DX-H6] Why: retain the full seed rate curve even when a deadline prevents a final receipt.
// Rejected: inferring an exact timing trace from rounded cumulative progress text or calling progress a fingerprint PASS.
const root = "/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H6";
const text = fs.readFileSync(root + "/tx2-dxh6-seed10000/driver.log", "utf8");
const samples = [
  ...text.matchAll(/\[DX-H6 seed\] (\d+) commands, ([\d.]+) commands\/s, window (\d+)/g),
].map((m) => ({
  commands: Number(m[1]),
  cumulativeCommandsPerS: Number(m[2]),
  window: Number(m[3]),
  approximateCommandElapsedS: Number(m[1]) / Number(m[2]),
}));
let previous = { commands: 0, approximateCommandElapsedS: 0 };
const buckets = samples
  .filter((s) => s.commands % 50000 === 0 || s === samples.at(-1))
  .map((s) => {
    const result = {
      ...s,
      approximateIntervalCommandsPerS:
        (s.commands - previous.commands) /
        (s.approximateCommandElapsedS - previous.approximateCommandElapsedS),
    };
    previous = s;
    return result;
  });
fs.writeFileSync(
  root + "/seed10000-rate-curve.json",
  JSON.stringify(
    {
      classification: "PROGRESS-OBSERVATION-NOT-FINGERPRINT-OR-ACCEPTANCE",
      timing:
        "Elapsed and interval rates are reconstructed from cumulative rates rounded to 0.1 commands/s; final receipt commandWallMs, if present, is authoritative.",
      samples,
      buckets,
    },
    null,
    2,
  ) + "\n",
);
console.log(JSON.stringify(buckets));

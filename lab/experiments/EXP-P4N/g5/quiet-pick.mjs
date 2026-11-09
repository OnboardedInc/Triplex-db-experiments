// [EXP-P4N-R2] Why (F3): writes quiet.json from at least three recorded calibration attempts, choosing the lowest attempt 5th percentile; every
// attempt stays in the file, with its load and heavy-holder ranges, so the choice is auditable. Run once, before any round 2 grade is applied.
// usage: node quiet-pick.mjs <out quiet.json> <attempt.json>...
import fs from "node:fs";
const [out, ...files] = process.argv.slice(2);
if (!out || files.length < 3) throw Error("need at least three attempts");
const attempts = files.map((f) => ({ file: f, ...JSON.parse(fs.readFileSync(f, "utf8")) }));
const best = attempts.reduce((a, b) => (b.p05Us < a.p05Us ? b : a));
fs.writeFileSync(
  out,
  JSON.stringify(
    {
      kind: "quiet-reference",
      chosen: best.file,
      quietUs: best.p05Us,
      rule: "lowest 5th percentile of >= 3 attempts, fixed before round 2 grading",
      attempts: attempts.map((a) => ({
        file: a.file,
        at: a.at,
        p05Us: a.p05Us,
        medianUs: a.medianUs,
        minUs: a.minUs,
        loadRange: a.loadRange,
        heavyHoldersRange: a.heavyHoldersRange,
      })),
    },
    null,
    2,
  ) + "\n",
);
console.log(JSON.stringify({ quietUs: best.p05Us, chosen: best.file }));

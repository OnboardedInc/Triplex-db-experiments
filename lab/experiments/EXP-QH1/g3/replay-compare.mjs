// [EXP-QH1-R3] Why: index-by-index comparison of two replay digest files; exits nonzero on any mismatch or length difference.
// Content: the digest covers every Triple field; freshness: files are written by the run that ends just before; binding: each line names the request index and root.
import fs from "node:fs";
const [refFile, candFile] = process.argv.slice(2);
const read = (f) => fs.readFileSync(f, "utf8").trim().split("\n");
const a = read(refFile),
  b = read(candFile);
let mismatches = 0,
  first = [];
if (a.length !== b.length) {
  console.log(
    JSON.stringify({ error: "length", ref: a.length, cand: b.length }),
  );
  process.exit(1);
}
for (let i = 0; i < a.length; i++)
  if (a[i] !== b[i]) {
    mismatches++;
    if (first.length < 5) first.push({ ref: a[i], cand: b[i] });
  }
console.log(
  JSON.stringify({ refFile, candFile, compared: a.length, mismatches, first }),
);
process.exit(mismatches ? 1 : 0);

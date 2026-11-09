// @ts-nocheck -- [EXP-CHECKJS-R2] dynamic collections, runtime Buffer-to-JSON coercion, or validated values without static narrowing. Binding errors remain checked by lab/bin/checkjs.mjs.
import fs from "node:fs";
import zlib from "node:zlib";
import { createHash } from "node:crypto";
const [seedDir, targetDir] = process.argv.slice(2);
if (fs.existsSync(targetDir)) throw Error("new directory required");
fs.mkdirSync(targetDir, { recursive: true });
const manifest = JSON.parse(fs.readFileSync(`${seedDir}/manifest.json`));
const target = 10000000;
const count = manifest.nq.quads + 1;
if (count > target || count < target * 0.85 || !manifest.result.complete)
  throw Error(`base seed must be complete and 85-100% of target; got ${count}`);
fs.copyFileSync(`${seedDir}/seed.nq.gz`, `${targetDir}/seed.nq.gz`);
// [EXP-QG1] Why: retain every real adapter-emitted quad, pad a separate diagnostic graph
// to exactly 10M. Rejected: truncating a command/assertion to hit a rounded scale number.
// Padding is reported and disqualifies a representative 100k-subject/P4 claim.
for (let i = count; i < target; i += 10000) {
  const text = Array.from(
    { length: Math.min(10000, target - i) },
    (_, j) => `<urn:qg1:padding:${i + j}> <urn:qg1:padding> "${i + j}" <urn:qg1:padding> .\n`,
  ).join("");
  fs.appendFileSync(`${targetDir}/seed.nq.gz`, zlib.gzipSync(text));
}
const sha256 = createHash("sha256")
  .update(fs.readFileSync(`${targetDir}/seed.nq.gz`))
  .digest("hex");
fs.writeFileSync(
  `${targetDir}/manifest.json`,
  JSON.stringify(
    {
      target,
      adapterQuadCount: count,
      paddingTriples: target - count,
      sha256,
      seedManifest: manifest,
    },
    null,
    2,
  ),
);
console.log(
  JSON.stringify({ target, adapterQuadCount: count, paddingTriples: target - count, sha256 }),
);

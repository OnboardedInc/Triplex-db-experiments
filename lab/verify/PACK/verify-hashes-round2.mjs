// [CX-VPACK-R2] Why: prove cache retirement preserved earlier proof and verify the
// new manifest independently. Rejected: trusting manifest generation without rereading.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const evidence = "/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VPACK";
const counts = [];
for (const [name, base] of [
  ["SHA256SUMS", evidence],
  ["ROUND2-SHA256SUMS", join(evidence, "round2")],
]) {
  const startedAt = new Date().toISOString();
  const manifest = readFileSync(new URL(`./${name}`, import.meta.url), "utf8");
  let checked = 0;
  for (const line of manifest.trim().split("\n")) {
    const match = /^([0-9a-f]{64})  (.+)$/.exec(line);
    assert(match);
    const path = resolve(base, match[2]);
    assert(path.startsWith(base + "/"));
    assert.equal(createHash("sha256").update(readFileSync(path)).digest("hex"), match[1], path);
    checked++;
  }
  counts.push({ name, base, startedAt, finishedAt: new Date().toISOString(), checked });
}
writeFileSync(
  new URL("./ROUND2-checksums-verified.json", import.meta.url),
  JSON.stringify(counts, null, 2) + "\n",
);
console.log(JSON.stringify(counts));

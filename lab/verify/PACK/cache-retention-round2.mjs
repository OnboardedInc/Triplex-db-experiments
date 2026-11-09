// [CX-VPACK-R2] Why: reclaim only completed reviewer dependency installations/caches
// while retaining original proof bytes. Rejected: deleting tarballs or another agent's data.
import assert from "node:assert/strict";
import { existsSync, lstatSync, readFileSync, rmSync, statfsSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const evidence = "/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VPACK";
const retainedManifest = readFileSync(new URL("./SHA256SUMS", import.meta.url), "utf8");
assert(
  readFileSync(join(evidence, "review-r2.log"), "utf8").includes(
    "CX-VPACK completed all seven observations",
  ),
);
const results = JSON.parse(readFileSync(join(evidence, "results.json")));
assert.equal(results.length, 7);
const targets = [];
for (const result of results) {
  assert(
    result.attempt.startsWith(evidence + "/") && !result.attempt.startsWith(evidence + "/round2/"),
  );
  const receipt = JSON.parse(readFileSync(join(result.attempt, "receipt.json")));
  assert(["PASS", "FAIL"].includes(receipt.status) && receipt.finishedAt);
  let alive = false;
  try {
    process.kill(receipt.pid, 0);
    alive = true;
  } catch (error) {
    assert.equal(error.code, "ESRCH", "Cannot establish old gate process absence");
  }
  assert(!alive, "Old gate PID still exists; refuse cleanup");
  for (const suffix of ["consumer/node_modules", "npm-cache"]) {
    const path = join(result.attempt, suffix);
    if (!existsSync(path)) continue;
    assert(lstatSync(path).isDirectory() && !lstatSync(path).isSymbolicLink());
    assert(!retainedManifest.includes(path.slice(evidence.length + 1) + "/"));
    targets.push({ path, receiptPid: receipt.pid, finishedAt: receipt.finishedAt });
  }
}
const diskBefore = statfsSync(evidence);
for (const target of targets) rmSync(target.path, { recursive: true });
const diskAfter = statfsSync(evidence);
for (const target of targets) assert(!existsSync(target.path));
const receipt = {
  kind: "CX-VPACK-dependency-retention-change/1",
  at: new Date().toISOString(),
  retained:
    "all SHA256SUMS entries, source/fixture bytes, tarballs, logs, receipts, consumer inputs and lockfiles",
  removed: targets,
  oldGatePidsAbsent: true,
  freeBytesBefore: diskBefore.bavail * diskBefore.bsize,
  freeBytesAfter: diskAfter.bavail * diskAfter.bsize,
};
const receiptPath = join(evidence, "round2", "round1-dependency-cleanup.json");
assert(!existsSync(receiptPath));
writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + "\n");
console.log(JSON.stringify(receipt));

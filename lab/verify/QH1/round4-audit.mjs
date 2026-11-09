// [CX-VQH1-R4] Why: check the retained round-4 evidence bytes and pin coverage independently of the report's claims.
// Rejected: calling a historical replay or benchmark a fresh execution.
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
const root = "/Users/sam/Claude/Projects/triplex-db-2/evidence/QH1-R4";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const hash = (p) => sha(fs.readFileSync(p));
const git = (...args) =>
  execFileSync("git", args, { maxBuffer: 20 << 20, stdio: ["ignore", "pipe", "pipe"] });
const entries = fs.readFileSync("lab/experiments/EXP-QH1/R4-SHA256SUMS", "utf8").trim().split("\n");
for (const line of entries) {
  const [, expected, rel] = /^([a-f0-9]{64})  (.+)$/.exec(line);
  assert.equal(hash(path.join(root, rel)), expected, rel);
}
const arm = JSON.parse(fs.readFileSync(path.join(root, "arms/r4/arm.json")));
for (const [pkg, key] of [
  ["core", "coreDist"],
  ["qlever", "qleverDist"],
]) {
  const dir = path.join(root, "arms/r4/packages", pkg, "dist");
  const h = createHash("sha256");
  for (const f of fs.readdirSync(dir, { recursive: true }).map(String).sort()) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isFile()) h.update(f).update(hash(p));
  }
  assert.equal(h.digest("hex"), arm[key]);
}
const refPath = "/Users/sam/Claude/Projects/triplex-db-2/evidence/QH1-R3/replay/ref-baseline.txt";
const refPin = fs
  .readFileSync("lab/experiments/EXP-QH1/R3-SHA256SUMS", "utf8")
  .split("\n")
  .find((l) => l.endsWith("  replay/ref-baseline.txt"));
assert.ok(refPin);
assert.equal(hash(refPath), refPin.split("  ")[0]);
const reference = fs.readFileSync(refPath, "utf8").trim().split("\n");
const candidate = fs.readFileSync(path.join(root, "replay/r4.txt"), "utf8").trim().split("\n");
assert.equal(reference.length, 100000);
assert.equal(candidate.length, 100000);
assert.deepEqual(candidate, reference);
assert.equal(git("diff", "365fe188", "HEAD", "--", "packages").length, 0);
assert.equal(git("diff", "7965540b", "HEAD", "--", "lab/acceptance").length, 0);
const pinChanges = JSON.parse(fs.readFileSync("lab/experiments/EXP-QH1/pin-changes.json"));
const changed = git("diff", "--name-only", pinChanges.base, "HEAD", "--", "packages", "lab/bench")
  .toString()
  .trim()
  .split("\n")
  .sort();
assert.deepEqual(pinChanges.changed.map((p) => p.path).sort(), changed);
for (const p of pinChanges.changed) {
  let old = null;
  try {
    old = sha(git("show", pinChanges.base + ":" + p.path));
  } catch {}
  assert.equal(old, p.oldSha256);
  assert.equal(hash(p.path), p.newSha256);
}
const result = {
  manifestFiles: entries.length,
  retainedReplayComparisons: candidate.length,
  mismatches: 0,
  arm,
  productMatches365fe188: true,
  contractUnchanged: true,
  pinnedChanges: pinChanges.changed.filter((p) => p.referencedBy.length),
  storesOpened: false,
};
fs.writeFileSync(process.env.QH1_RESULT, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));

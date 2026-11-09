// [CX-VQH1] Why: independently recalculate retained equality, hash bindings, pin deltas and diagnostic quantiles.
// Rejected: trusting the builder's summary counts or opening its retained stores read-write.
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
const E = "/Users/sam/Claude/Projects/triplex-db-2/evidence/QH1-R3";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const hash = (p) => sha(fs.readFileSync(p));
const git = (...a) => execFileSync("git", a, { maxBuffer: 20 << 20 });
const treeHash = (d) => {
  const h = createHash("sha256");
  for (const f of fs.readdirSync(d, { recursive: true }).map(String).sort()) {
    const p = path.join(d, f);
    if (fs.statSync(p).isFile()) h.update(f).update(hash(p));
  }
  return h.digest("hex");
};
const manifest = fs
  .readFileSync("lab/experiments/EXP-QH1/R3-SHA256SUMS", "utf8")
  .trim()
  .split("\n");
const mismatches = [];
for (const line of manifest) {
  const [, expected, rel] = /^([a-f0-9]{64})  (.+)$/.exec(line);
  if (hash(path.join(E, rel)) !== expected) mismatches.push(rel);
}
assert.deepEqual(mismatches, []);
const r2 = "/Users/sam/Claude/Projects/triplex-db-2/evidence/QH1-R2";
const r2arms = path.join(r2, "arms/arms.json");
const r2pin = fs
  .readFileSync("lab/experiments/EXP-QH1/R2-SHA256SUMS", "utf8")
  .split("\n")
  .find((s) => s.endsWith("  arms/arms.json"));
assert.ok(r2pin);
assert.equal(hash(r2arms), r2pin.split("  ")[0]);
const baseline = JSON.parse(fs.readFileSync(r2arms)).baseline;
assert.equal(treeHash(path.join(baseline.root, "packages/core/dist")), baseline.coreDist);
assert.equal(treeHash(path.join(baseline.root, "packages/qlever/dist")), baseline.qleverDist);
assert.equal(
  fs.realpathSync(path.join(baseline.root, "packages/qlever/node_modules/@triplex-build/triplex")),
  path.join(baseline.root, "packages/core"),
);
const lines = (p) => fs.readFileSync(path.join(E, p), "utf8").trim().split("\n");
const ref = lines("replay/ref-baseline.txt");
assert.equal(ref.length, 100000);
for (let i = 0; i < ref.length; i++) assert.ok(ref[i].startsWith(i + " "));
const replays = [];
for (const arm of ["s1", "s2", "s3", "s4", "final"]) {
  const answer = lines(`replay/${arm}.txt`);
  assert.equal(answer.length, 100000);
  assert.deepEqual(answer, ref);
  const binding = JSON.parse(fs.readFileSync(path.join(E, "arms", arm, "arm.json")));
  const core = treeHash(path.join(E, "arms", arm, "packages/core/dist"));
  const qlever = treeHash(path.join(E, "arms", arm, "packages/qlever/dist"));
  assert.equal(core, binding.coreDist);
  assert.equal(qlever, binding.qleverDist);
  replays.push({ arm, compared: answer.length, mismatches: 0, core, qlever });
}
const pins = JSON.parse(fs.readFileSync("lab/experiments/EXP-QH1/pin-changes.json"));
const actualPaths = git("diff", "--name-only", pins.base, "HEAD", "--", "packages", "lab/bench")
  .toString()
  .trim()
  .split("\n")
  .sort();
assert.deepEqual(pins.changed.map((x) => x.path).sort(), actualPaths);
const contractFiles = fs
  .readdirSync("lab/acceptance", { recursive: true })
  .map((f) => "lab/acceptance/" + f)
  .filter((f) => fs.statSync(f).isFile());
const pinned = [];
for (const entry of pins.changed) {
  let old = null;
  try {
    old = sha(git("show", pins.base + ":" + entry.path));
  } catch {}
  assert.equal(old, entry.oldSha256);
  assert.equal(hash(entry.path), entry.newSha256);
  const refs = contractFiles.filter((p) => fs.readFileSync(p, "utf8").includes(entry.path));
  assert.deepEqual(refs, entry.referencedBy);
  if (refs.length) pinned.push(entry);
}
assert.equal(git("diff", pins.base, "HEAD", "--", "lab/acceptance").length, 0);
const quantile = (a, p) => [...a].sort((a, b) => a - b)[Math.floor((a.length - 1) * p)];
const writers = [];
for (let i = 1; i <= 7; i++) {
  const r = JSON.parse(fs.readFileSync(path.join(E, "gates-final", "writer" + i, "writer.json")));
  for (const arm of ["baseline", "candidate", "twin"]) {
    assert.equal(r.latencies[arm].length, 350);
    assert.equal(quantile(r.latencies[arm], 0.99), r[arm].p99);
    assert.equal(quantile(r.latencies[arm], 0.5), r[arm].p50);
  }
  const ratio = r.candidate.p99 / r.baseline.p99,
    twin = r.twin.p99 / r.baseline.p99;
  assert.equal(ratio, r.p99Ratio);
  assert.equal(twin, r.twinP99Ratio);
  writers.push({ run: i, ratio, twin, p50Delta: r.p50Delta });
}
const out = {
  manifestFiles: manifest.length,
  baseline,
  replays,
  pinned,
  writers,
  candidateExceedances: writers.filter((w) => w.ratio > 1.1).length,
  storesRead: false,
};
fs.writeFileSync(process.env.QH1_RESULT, JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));

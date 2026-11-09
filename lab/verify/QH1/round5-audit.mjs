// [CX-VQH1-R5] Why: independently check round-5 retained bytes, source scope and complete pin changes.
// Rejected: silently regenerating acceptance or adopting historical gate exits as fresh semantic execution.
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
const root = "/Users/sam/Claude/Projects/triplex-db-2/evidence/QH1-R5";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const hash = (p) => sha(fs.readFileSync(p));
const git = (...args) =>
  execFileSync("git", args, { maxBuffer: 20 << 20, stdio: ["ignore", "pipe", "pipe"] });
const entries = fs.readFileSync("lab/experiments/EXP-QH1/R5-SHA256SUMS", "utf8").trim().split("\n");
for (const line of entries) {
  const [, expected, rel] = /^([a-f0-9]{64})  (.+)$/.exec(line);
  assert.equal(hash(path.join(root, rel)), expected, rel);
}
assert.equal(git("diff", "7c5253dc", "HEAD", "--", "packages").length, 0);
assert.equal(git("diff", "febcd098", "HEAD", "--", "lab/acceptance").length, 0);
const pins = JSON.parse(fs.readFileSync("lab/experiments/EXP-QH1/pin-changes.json"));
const changed = git("diff", "--name-only", pins.base, "HEAD", "--", "packages", "lab/bench")
  .toString()
  .trim()
  .split("\n")
  .sort();
assert.deepEqual(pins.changed.map((p) => p.path).sort(), changed);
const contracts = fs
  .readdirSync("lab/acceptance", { recursive: true })
  .map((f) => "lab/acceptance/" + f)
  .filter((f) => fs.statSync(f).isFile());
for (const p of pins.changed) {
  let old = null;
  try {
    old = sha(git("show", pins.base + ":" + p.path));
  } catch {}
  assert.equal(old, p.oldSha256);
  assert.equal(hash(p.path), p.newSha256);
  assert.deepEqual(
    contracts.filter((f) => fs.readFileSync(f, "utf8").includes(p.path)),
    p.referencedBy,
  );
}
const round5Paths = git("diff", "--name-only", "febcd098", "HEAD", "--", "packages")
  .toString()
  .trim()
  .split("\n")
  .sort();
assert.deepEqual(round5Paths, [
  "packages/datomic/src/DatomicStorageAdapter.ts",
  "packages/qlever/src/QleverStorageAdapter.ts",
  "packages/xtdb/src/XtdbStorageAdapter.ts",
]);
const unchanged = [
  "packages/core/src/store/TriplesLive.ts",
  "packages/qlever/src/broker/BrokerStorageAdapter.ts",
  "packages/qlever/src/broker/h1.ts",
  "packages/qlever/src/broker/sqlite-worker.ts",
];
for (const p of unchanged) assert.equal(hash(p), sha(git("show", "365fe188:" + p)));
const result = {
  manifestFiles: entries.length,
  productMatches7c5253dc: true,
  contractUnchanged: true,
  round5Paths,
  unchangedSinceRound4: unchanged,
  pinnedChanges: pins.changed.filter((p) => p.referencedBy.length),
  storesOpened: false,
};
fs.writeFileSync(process.env.QH1_RESULT, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));

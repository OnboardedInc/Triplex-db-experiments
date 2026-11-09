// [CX-VNSR-R3] Why: bind the closed-artifact review to target bytes and preserved builder evidence. Rejected: adopting a historical runtime-control summary as fresh review execution.
import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import path from "node:path";
import { buildDriver } from "../../../bench/ns-driver/build.mjs";
const target = "46b3f361d5f0aefe51f0f28af030ba8e56b18a53";
const root = "/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-NSR/round3/";
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
let bytes = 0,
  count = 0;
for (const line of fs
  .readFileSync("lab/experiments/EXP-NSR/round3/SHA256SUMS", "utf8")
  .trim()
  .split("\n")) {
  const [, digest, file] = /^([a-f0-9]{64})\s+(.+)$/.exec(line);
  const actual = fs.readFileSync(root + file);
  assert.equal(sha(actual), digest, file);
  count++;
  bytes += actual.length;
}
const source = JSON.parse(fs.readFileSync(root + "source-hashes.json"));
for (const [file, digest] of Object.entries(source.sources)) {
  const actual = fs.readFileSync(file);
  assert.equal(sha(actual), digest, file);
  assert.deepEqual(actual, execFileSync("git", ["show", target + ":" + file]), file);
}
assert.equal(
  execFileSync(
    "git",
    ["diff", "--name-only", target, "--", "packages", "lab/bench", "lab/acceptance"],
    { encoding: "utf8" },
  ),
  "",
);
const changed = execFileSync("git", ["diff", "--name-only", "76e6efd0", target], {
  encoding: "utf8",
})
  .trim()
  .split("\n");
const pinChanges = [];
for (const file of fs.readdirSync("lab/acceptance").filter((f) => f.endsWith(".json"))) {
  let data;
  try {
    data = JSON.parse(fs.readFileSync("lab/acceptance/" + file));
  } catch {
    continue;
  }
  const walk = (v) => {
    if (v && typeof v === "object")
      for (const [k, x] of Object.entries(v)) {
        if (changed.includes(k) && typeof x === "string" && /^[a-f0-9]{64}$/.test(x)) {
          const old = sha(execFileSync("git", ["show", "76e6efd0:" + k])),
            current = sha(fs.readFileSync(k));
          if (old !== current)
            pinChanges.push({ contract: file, path: k, oldSha256: old, newSha256: current });
        }
        walk(x);
      }
  };
  walk(data);
}
const artifactDir = path.resolve(".cache/verify-nsr-r3", "main-artifact-" + randomUUID());
const artifact = buildDriver(artifactDir);
assert.equal(artifact.bundleSha256, source.bundleSha256);
assert.equal(sha(fs.readFileSync(path.join(artifactDir, artifact.entry))), artifact.bundleSha256);
console.log(
  JSON.stringify(
    {
      target,
      builderFilesVerified: count,
      builderBytesVerified: bytes,
      sourceFilesEqualTarget: Object.keys(source.sources).length,
      changedPinnedPaths: pinChanges,
      actualMainArtifactSha256: artifact.bundleSha256,
      artifactDir,
      qualification: false,
    },
    null,
    2,
  ),
);

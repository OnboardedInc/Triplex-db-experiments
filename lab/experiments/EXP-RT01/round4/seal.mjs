import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
const dir = import.meta.dirname,
  experiment = path.dirname(dir),
  root = path.resolve(dir, "../../../..");
const hash = (p) => createHash("sha256").update(fs.readFileSync(p)).digest("hex");
// [EXP-RT01] Why: a manifest qualifies byte retention only after reading the durable bytes back. Rejected: treating checksums as journal correctness or engine acceptance.
const lines = fs.readFileSync(path.join(dir, "DURABLE-SHA256SUMS"), "utf8").trim().split("\n");
for (const line of lines) {
  const [expected, file] = line.split("  ");
  assert.equal(hash(file), expected, file);
}
const listed = [
  ...new Set(
    execFileSync("git", ["ls-files", "-co", "--exclude-standard", "lab/experiments/EXP-RT01"], {
      cwd: root,
      encoding: "utf8",
    })
      .trim()
      .split("\n"),
  ),
]
  .filter(Boolean)
  .sort();
for (const file of listed) assert.ok(fs.statSync(path.join(root, file)).size <= 1000000, file);
const sums = (base, files) =>
  fs.writeFileSync(
    path.join(base, "SHA256SUMS"),
    files
      .map((p) => `${hash(path.join(root, p))}  ${path.relative(base, path.join(root, p))}`)
      .join("\n") + "\n",
  );
sums(
  dir,
  listed.filter(
    (p) => p.startsWith("lab/experiments/EXP-RT01/round4/") && !p.endsWith("/SHA256SUMS"),
  ),
);
const all = [...new Set([...listed, "lab/experiments/EXP-RT01/round4/SHA256SUMS"])].sort();
sums(
  experiment,
  all.filter((p) => p !== "lab/experiments/EXP-RT01/SHA256SUMS"),
);
let local = 0;
for (const base of [dir, experiment])
  for (const line of fs.readFileSync(path.join(base, "SHA256SUMS"), "utf8").trim().split("\n")) {
    const [expected, file] = line.split("  ");
    assert.equal(hash(path.join(base, file)), expected, file);
    local++;
  }
console.log(
  JSON.stringify({ durableFilesVerified: lines.length, localManifestEntriesVerified: local }),
);

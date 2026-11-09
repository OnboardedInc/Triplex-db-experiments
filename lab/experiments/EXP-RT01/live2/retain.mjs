import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
const raw = "/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-RT01/live2",
  dest = import.meta.dirname;
const hash = (p) => createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const result = JSON.parse(fs.readFileSync(path.join(dest, "RESULT.json")));
assert.equal(result.G2.builderGate, "PASS");
assert.equal(result.G6.verdict, "FAIL_REGRESSION");
assert.equal(result.sealSha256, hash(path.join(dest, "seal.mjs")));
assert.match(fs.readFileSync(path.join(raw, "seal-stdout.txt"), "utf8"), /"G6":"FAIL_REGRESSION"/);
assert.equal(fs.readFileSync(path.join(raw, "seal-stderr.txt"), "utf8"), "");
// [EXP-RT01] Why: inventory controller stdout only after that controller has exited. Rejected: hashing its still-open output file while the seal is printing its terminal summary.
function inventory(excludeInventory = false) {
  const files = [];
  const visit = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) visit(p);
      else if (e.isFile() && !(excludeInventory && p === path.join(raw, "ARTIFACTS.json")))
        files.push({ path: path.relative(raw, p), bytes: fs.statSync(p).size, sha256: hash(p) });
    }
  };
  visit(raw);
  return files.sort((a, b) => a.path.localeCompare(b.path));
}
fs.writeFileSync(
  path.join(raw, "ARTIFACTS.json"),
  JSON.stringify({ root: raw, excludesSelf: true, entries: inventory(true) }, null, 2) + "\n",
);
const files = inventory(),
  manifest = files.map((f) => `${f.sha256}  ${f.path}\n`).join("");
fs.writeFileSync(path.join(dest, "DURABLE-SHA256SUMS"), manifest);
const index = {
  root: raw,
  files: files.length,
  bytes: files.reduce((n, f) => n + f.bytes, 0),
  inventory: "ARTIFACTS.json",
  inventorySha256: hash(path.join(raw, "ARTIFACTS.json")),
  manifestSha256: hash(path.join(dest, "DURABLE-SHA256SUMS")),
  retentionRunnerSha256: hash(import.meta.filename),
  semanticReceipt: "RESULT.json",
  G2: "BUILDER_GATE_PASS",
  G6: "FAIL_REGRESSION_STOPPED",
  independentReview: false,
};
fs.writeFileSync(path.join(dest, "DURABLE-INDEX.json"), JSON.stringify(index, null, 2) + "\n");
for (const f of files) {
  assert.equal(fs.statSync(path.join(raw, f.path)).size, f.bytes);
  assert.equal(hash(path.join(raw, f.path)), f.sha256, f.path);
}
assert.equal(fs.readFileSync(path.join(dest, "DURABLE-SHA256SUMS"), "utf8"), manifest);
console.log(JSON.stringify(index));

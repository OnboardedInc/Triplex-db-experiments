import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

// [DX-V1-R3] Why: independently read back the bound bytes before committing the review receipt.
// Rejected: treating a manifest's existence or its own recorded hashes as verification of those files.
const root = path.resolve(import.meta.dirname, "../../../..");
const binding = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, "binding.json")));
assert.equal(binding.reviewedHead, "59fb16aef7e74a1c6d2b18dd297803f88765f638");
let count = 0;
const check = (r) => {
  const bytes = fs.readFileSync(path.resolve(root, r.path));
  assert.equal(bytes.length, r.bytes, r.path);
  assert.equal(createHash("sha256").update(bytes).digest("hex"), r.sha256, r.path);
  count++;
};
const local = [...binding.source, ...binding.built, ...binding.dependencies, binding.external, ...binding.local];
for (const row of local) check(row);
const external = JSON.parse(fs.readFileSync(binding.external.path));
assert.equal(external.length, binding.external.entries);
for (const row of external) check(row);
assert.equal(fs.readFileSync(path.join(import.meta.dirname, "SHA256SUMS"), "utf8"),
  local.map(r => `${r.sha256}  ${r.path}`).join("\n") + "\n");
console.log(JSON.stringify({ byteRecordsVerified: count, source: binding.source.length,
  built: binding.built.length, external: external.length, semanticAcceptance: false }));

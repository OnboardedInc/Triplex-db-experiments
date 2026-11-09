// [EXP-QH1-R3] Why: bulky round 3 evidence stays out of git (rule 9c); this writes the SHA256SUMS manifest that lets a reviewer verify it.
// Content: every listed file is hashed from its bytes at manifest time; freshness: the manifest is regenerated after the last run of the
// attempt; binding: each line is a path relative to the evidence root, and arm.json binds each retained build to its dist tree hash.
// Excluded: stores (seeds cloned from round 2), the dist trees themselves (bound by arm.json), scratch and node_modules.
// usage: node manifest.mjs <evidenceRoot> <out SHA256SUMS>
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
const [root, out] = process.argv.slice(2);
const skip = (rel) =>
  /^(store-|scratch|arms\/[^/]+\/packages)/.test(rel) || rel.includes("node_modules/");
const lines = [];
for (const f of fs.readdirSync(root, { recursive: true }).map(String).sort()) {
  const p = path.join(root, f);
  if (!fs.statSync(p).isFile() || skip(f)) continue;
  lines.push(`${createHash("sha256").update(fs.readFileSync(p)).digest("hex")}  ${f}`);
}
fs.writeFileSync(out, lines.join("\n") + "\n");
console.log(lines.length + " files");

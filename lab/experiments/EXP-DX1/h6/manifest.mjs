import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
// [DX-H6] Why: bind durable bulky evidence without committing raw gateway/world/oracle bytes.
// Rejected: checking multi-megabyte raw artifacts into git or treating a manifest as semantic acceptance.
const root = "/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H6";
const walk = (dir) =>
  fs
    .readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((d) =>
      d.isDirectory() ? walk(path.join(dir, d.name)) : d.isFile() ? [path.join(dir, d.name)] : [],
    );
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const files = walk(root);
// [DX-H6] Why: seed journals exceed a gigabyte; evidence hashing must stay bounded in memory.
// Rejected: allocating each full raw journal as one Buffer before hashing.
const sums = [];
for (const file of files) {
  const digest = createHash("sha256");
  for await (const chunk of fs.createReadStream(file)) digest.update(chunk);
  sums.push(digest.digest("hex") + "  " + file);
}
fs.writeFileSync("lab/experiments/EXP-DX1/h6/SHA256SUMS", sums.join("\n") + "\n");
const base = fs.readFileSync("lab/experiments/EXP-DX1/h6/BASE.txt", "utf8").trim();
const changed = execFileSync("git", ["diff", "--name-only", base], { encoding: "utf8" })
  .trim()
  .split("\n")
  .filter(Boolean);
const acceptance = walk("lab/acceptance")
  .filter((p) => p.endsWith(".json") || p.endsWith(".md"))
  .map((p) => fs.readFileSync(p, "utf8"))
  .join("\n");
const pins = changed
  .filter((file) => acceptance.includes(file))
  .map((file) => ({
    path: file,
    old: hash(execFileSync("git", ["show", base + ":" + file])),
    new: hash(fs.readFileSync(file)),
  }));
fs.writeFileSync(
  "lab/experiments/EXP-DX1/h6/PIN-CHANGES.json",
  JSON.stringify({ classification: "HASH-INVENTORY-NOT-ACCEPTANCE", pins }, null, 2) + "\n",
);
console.log(JSON.stringify({ files: files.length, pins }));

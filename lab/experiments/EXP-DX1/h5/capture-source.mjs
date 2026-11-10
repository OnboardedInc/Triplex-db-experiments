import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
// [DX-H5] Why: retain exact current source/build bytes before VM runtime, preserving older prequeue manifests.
// Rejected: rewriting an old attempt's HEAD/hash manifest after queued source preparation changed.
const startedAt = new Date().toISOString();
const gitHead = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const target =
  "/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H5/source-" + gitHead + "-" + Date.now();
fs.mkdirSync(target, { recursive: true });
const tracked = execFileSync(
  "git",
  [
    "ls-files",
    "lab/bench",
    "lab/experiments/EXP-DX1/h5",
    "lab/bin/heavy.mjs",
    "lab/bin/heavy-lock.mjs",
    "lab/bin/lib.mjs",
    "packages/datomic",
    "packages/core",
    "packages/host",
    "packages/qualification",
    "packages/w0",
    "packages/xtdb",
    "packages/qlever",
    "packages/sql",
    "lab/world/W0",
    "lab/oracles/domain",
    "lab/acceptance/obligations.json",
    "lab/acceptance/oracle-contract.json",
    "pnpm-lock.yaml",
    "pnpm-workspace.yaml",
    "package.json",
  ],
  { encoding: "utf8" },
)
  .trim()
  .split("\n");
const generated = [];
const walk = (dir) => {
  if (!fs.existsSync(dir)) return;
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, item.name);
    if (item.isDirectory()) walk(file);
    else if (item.isFile()) generated.push(file);
  }
};
for (const name of ["datomic", "core", "host", "qualification", "w0", "xtdb", "qlever", "sql"])
  walk("packages/" + name + "/dist");
const files = [];
for (const file of [...new Set([...tracked, ...generated])].sort()) {
  if (!file || path.isAbsolute(file) || file.split("/").includes(".."))
    throw Error("invalid capture path");
  const bytes = fs.readFileSync(file),
    out = path.join(target, file);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, bytes);
  files.push({
    path: file,
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  });
}
const receipt = {
  classification: "SOURCE-BUILD-PREIMAGES-NO-SEMANTIC-VERDICT",
  startedAt,
  finishedAt: new Date().toISOString(),
  gitHead,
  dirtyTracked: execFileSync("git", ["diff", "--name-only"], { encoding: "utf8" })
    .trim()
    .split("\n")
    .filter(Boolean),
  captureProcessNode: process.version,
  files,
};
fs.writeFileSync(target + "/CAPTURE.json", JSON.stringify(receipt, null, 2) + "\n");
console.log(
  JSON.stringify({
    target,
    files: files.length,
    bytes: files.reduce((n, f) => n + f.bytes, 0),
    gitHead,
  }),
);

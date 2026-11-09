// [CX-VNSR] Why: preserve raw attempts outside git and read back every copied byte before indexing them. Rejected: committing bulky captures or asserting preservation from a copy exit code alone.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
const target = "05c26355dfc653520067bfb1006e07475187c813";
const raw = path.resolve(".cache/verify-nsr");
const output = "/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VNSR";
const review = path.resolve("lab/verify/NSR");
execFileSync("git", ["diff", "--exit-code", target, "--", "lab/acceptance"]);
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const walk = (dir) =>
  fs
    .readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((e) =>
      e.isDirectory() ? walk(path.join(dir, e.name)) : e.isFile() ? [path.join(dir, e.name)] : [],
    );
const changed = execFileSync("git", ["diff", "--name-only", "d523f632", target], {
  encoding: "utf8",
})
  .trim()
  .split("\n")
  .filter(
    (p) => p.startsWith("packages/") || p.startsWith("lab/bench/") || p === "lab/bin/gate.mjs",
  );
const inputs = [
  ...new Set([
    ...changed,
    "pnpm-lock.yaml",
    "package.json",
    ...["core", "sql", "sqlite", "postgres", "host", "testkit", "cli"].map(
      (p) => `packages/${p}/package.json`,
    ),
  ]),
].sort();
const sourceHashes = {};
for (const file of inputs) {
  const current = fs.readFileSync(file);
  assert.deepEqual(current, execFileSync("git", ["show", `${target}:${file}`]), file);
  sourceHashes[file] = sha(current);
}
const snapshot = new Map(
  walk(raw).map((file) => [path.relative(raw, file), sha(fs.readFileSync(file))]),
);
fs.mkdirSync(output);
for (const [relative, digest] of snapshot) {
  const destination = path.join(output, relative);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(path.join(raw, relative), destination, fs.constants.COPYFILE_EXCL);
  assert.equal(sha(fs.readFileSync(destination)), digest, relative);
  assert.equal(
    sha(fs.readFileSync(path.join(raw, relative))),
    digest,
    "source changed: " + relative,
  );
}
const toolHashes = {};
for (const file of walk(review).filter((p) => /\.(mjs|ts)$/.test(p))) {
  const relative = path.join("review-tools", path.relative(review, file));
  const destination = path.join(output, relative);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(file, destination, fs.constants.COPYFILE_EXCL);
  const digest = sha(fs.readFileSync(file));
  assert.equal(sha(fs.readFileSync(destination)), digest, relative);
  toolHashes[relative] = digest;
}
const summary = {
  kind: "CX-VNSR retained offline review evidence",
  target,
  retainedAt: new Date().toISOString(),
  slot: "offline-no-slot",
  sourceHashes,
  toolHashes,
  copiedRawFiles: snapshot.size,
  limitation:
    "Current tool copies include formatting after some executions. Candidate source matches target exactly. Preservation only, no semantic PASS.",
};
fs.writeFileSync(
  path.join(output, "retention-summary.json"),
  JSON.stringify(summary, null, 2) + "\n",
  { flag: "wx" },
);
const files = walk(output);
const lines = files.map((file) => `${sha(fs.readFileSync(file))}  ${path.relative(output, file)}`);
fs.writeFileSync(path.join(review, "SHA256SUMS"), lines.join("\n") + "\n", { flag: "wx" });
console.log(
  JSON.stringify(
    {
      output,
      files: files.length,
      bytes: files.reduce((n, p) => n + fs.statSync(p).size, 0),
      allCopiedBytesReadBack: true,
      targetSourceFilesVerified: inputs.length,
      contractChanged: false,
    },
    null,
    2,
  ),
);

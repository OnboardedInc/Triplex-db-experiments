// [CX-VNSR-R2] Why: retain exact source-bound review bytes with readback outside git. Rejected: reusing round-1 manifests or overwriting prior raw attempts.
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
const target = "76e6efd0ce3977bb21b3628df00ef4512a7f5265";
const root = path.resolve("lab/verify/NSR/round2");
const raw = path.resolve(".cache/verify-nsr-r2");
const durable = "/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VNSR/round2";
const sha = (v) => createHash("sha256").update(v).digest("hex");
const walk = (dir) =>
  fs
    .readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((e) =>
      e.isDirectory() ? walk(path.join(dir, e.name)) : e.isFile() ? [path.join(dir, e.name)] : [],
    );
assert.equal(
  execFileSync(
    "git",
    ["diff", "--name-only", target, "--", "packages", "lab/bench", "lab/acceptance"],
    { encoding: "utf8" },
  ),
  "",
);
const source = JSON.parse(
  fs.readFileSync(
    "/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-NSR/round2/source-hashes.json",
  ),
);
const sourceHashes = {};
for (const file of [
  ...Object.keys(source.sources),
  "pnpm-lock.yaml",
  "packages/host/package.json",
]) {
  const actual = fs.readFileSync(file);
  assert.deepEqual(actual, execFileSync("git", ["show", target + ":" + file]), file);
  sourceHashes[file] = sha(actual);
}
fs.mkdirSync(durable);
const copy = (from, to) => {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  const hash = sha(fs.readFileSync(from));
  fs.copyFileSync(from, to, fs.constants.COPYFILE_EXCL);
  assert.equal(sha(fs.readFileSync(to)), hash, to);
  assert.equal(sha(fs.readFileSync(from)), hash, "source changed: " + from);
  return hash;
};
const rawFiles = walk(raw);
for (const file of rawFiles) copy(file, path.join(durable, path.relative(raw, file)));
const toolHashes = {};
for (const file of walk(root).filter((p) => /\.(mjs|ts)$/.test(p)))
  toolHashes[path.relative(root, file)] = copy(
    file,
    path.join(durable, "review-tools", path.relative(root, file)),
  );
const hostDist = {};
for (const file of walk("packages/host/dist"))
  hostDist[file] = copy(
    file,
    path.join(durable, "host-build", path.relative("packages/host/dist", file)),
  );
fs.writeFileSync(
  path.join(durable, "retention-summary.json"),
  JSON.stringify(
    {
      target,
      retainedAt: new Date().toISOString(),
      slot: "offline-no-slot",
      sourceHashes,
      toolHashes,
      hostDist,
      rawFiles: rawFiles.length,
      limitation: "Copy preservation only; no NS qualification or actual Linux durability claim.",
    },
    null,
    2,
  ) + "\n",
  { flag: "wx" },
);
const files = walk(durable);
const manifest =
  files.map((file) => `${sha(fs.readFileSync(file))}  ${path.relative(durable, file)}`).join("\n") +
  "\n";
fs.writeFileSync(path.join(root, "SHA256SUMS"), manifest, { flag: "wx" });
console.log(
  JSON.stringify(
    {
      durable,
      files: files.length,
      bytes: files.reduce((n, p) => n + fs.statSync(p).size, 0),
      sourceFilesVerified: Object.keys(sourceHashes).length,
      allCopiedBytesReadBack: true,
    },
    null,
    2,
  ),
);

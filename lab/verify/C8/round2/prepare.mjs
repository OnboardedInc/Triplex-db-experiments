import { spawnSync, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  symlinkSync,
  readdirSync,
  copyFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// [CX-VC8-2] Why: test exact committed product bytes without editing product files on verify/C8. Rejected: merging the builder's logs over prior review evidence.
const output = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(output, "../../../..");
const sut = path.join(output, "sut");
const revision = execFileSync("git", ["rev-parse", "0527233"], {
  cwd: root,
  encoding: "utf8",
}).trim();
const git = (...args) => execFileSync("git", args, { cwd: root, maxBuffer: 64 * 1024 * 1024 });
if (!existsSync(path.join(sut, "package.json"))) {
  mkdirSync(sut, { recursive: true });
  const unpack = spawnSync("tar", ["-x", "-C", sut], {
    input: git(
      "archive",
      revision,
      "packages",
      "vitest.workspace-aliases.ts",
      "package.json",
      "qualification",
      "tsconfig.node.json",
      "tsconfig.base.json",
      "pnpm-lock.yaml",
    ),
  });
  if (unpack.status !== 0) throw new Error(String(unpack.stderr));
}
if (!existsSync(path.join(sut, "node_modules")))
  symlinkSync(path.join(root, "node_modules"), path.join(sut, "node_modules"), "dir");
for (const pkg of readdirSync(path.join(sut, "packages"))) {
  const modules = path.join(root, "packages", pkg, "node_modules");
  const target = path.join(sut, "packages", pkg, "node_modules");
  if (existsSync(modules) && !existsSync(target)) symlinkSync(modules, target, "dir");
}
mkdirSync(path.join(sut, "lab/verify/C8"), { recursive: true });
const probes = ["adversarial.test.ts", "light-live.test.ts", "vitest.config.ts"];
for (const file of probes)
  copyFileSync(path.join(root, "lab/verify/C8", file), path.join(sut, "lab/verify/C8", file));
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const paths = git(
  "ls-tree",
  "-r",
  "--name-only",
  revision,
  "packages",
  "vitest.workspace-aliases.ts",
  "package.json",
  "qualification",
  "tsconfig.node.json",
  "tsconfig.base.json",
  "pnpm-lock.yaml",
)
  .toString()
  .trim()
  .split("\n");
const records = paths.map((file) => {
  const bytes = readFileSync(path.join(sut, file));
  const expected = git("rev-parse", `${revision}:${file}`).toString().trim();
  const actual = createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
  if (actual !== expected) throw new Error(`Snapshot mismatch: ${file}`);
  return { path: file, bytes: bytes.length, gitBlob: actual, sha256: sha(bytes) };
});
const manifest = {
  revision,
  tree: git("rev-parse", `${revision}^{tree}`).toString().trim(),
  capturedAt: new Date().toISOString(),
  node: process.version,
  trackedSnapshotFiles: records.length,
  files: records,
  reviewerInputs: probes.map((file) => {
    const bytes = readFileSync(path.join(root, "lab/verify/C8", file));
    if (!bytes.equals(git("show", `74e5627:lab/verify/C8/${file}`)))
      throw new Error(`Prior probe changed: ${file}`);
    return { path: file, sha256: sha(bytes), originalRevision: "74e5627" };
  }),
  lockfile: {
    revisionSha256: sha(git("show", `${revision}:pnpm-lock.yaml`)),
    installedWorktreeSha256: sha(readFileSync(path.join(root, "pnpm-lock.yaml"))),
  },
};
const ruleRoot = "/Users/sam/projects/triplex-db-2";
const rules = [
  "CLAUDE.md",
  "lab/SCOPE.md",
  "lab/NORTH-STAR.md",
  "lab/TARGETS.md",
  "lab/PROTOCOL.md",
  "lab/acceptance/RULINGS-PENDING.md",
];
mkdirSync(path.join(output, "inputs"), { recursive: true });
manifest.ruleInputs = rules.map((file) => {
  const bytes = readFileSync(path.join(ruleRoot, file));
  const saved = path.join("inputs", file.replaceAll("/", "__"));
  writeFileSync(path.join(output, saved), bytes);
  return { originalPath: path.join(ruleRoot, file), savedPath: saved, sha256: sha(bytes) };
});
writeFileSync(path.join(output, "source-manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log(
  JSON.stringify({
    revision,
    tree: manifest.tree,
    files: records.length,
    allGitBlobsMatch: true,
    lockfile: manifest.lockfile,
  }),
);

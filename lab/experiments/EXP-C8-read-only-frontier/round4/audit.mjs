import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
// [EXP-C8-R4] Why: verify both measured snapshots against Git and reproduce them without using sibling source.
// Rejected: trusting a mutable integration worktree or installed dist output.
const out = "lab/experiments/EXP-C8-read-only-frontier/round4";
const git = (...args) => execFileSync("git", args);
const sha = (b) => createHash("sha256").update(b).digest("hex");
const revisions = {
  baseline: git("rev-parse", "514c3b6").toString().trim(),
  integration: git("rev-parse", "ec1a815").toString().trim(),
};
const snapshots = [];
for (const [name, revision] of Object.entries(revisions)) {
  const files = git(
    "ls-tree",
    "-r",
    "--name-only",
    revision,
    "--",
    "packages/core",
    "packages/qlever",
    "vitest.workspace-aliases.ts",
    ...git("ls-files", "tsconfig*").toString().trim().split("\n"),
  )
    .toString()
    .trim()
    .split("\n");
  for (const file of files) {
    const expected = git("show", `${revision}:${file}`);
    const target = path.join(out, `${name}-snapshot`, file);
    if (!existsSync(target)) {
      mkdirSync(path.dirname(target), { recursive: true });
      writeFileSync(target, expected);
    }
    const bytes = readFileSync(target);
    if (!bytes.equals(expected)) throw new Error(`Snapshot mismatch: ${target}`);
    snapshots.push({ name, revision, file, sha256: sha(bytes) });
  }
}
const sameCut = readFileSync(`${out}/paired/measure-events.jsonl`, "utf8")
  .trim()
  .split("\n")
  .map(JSON.parse);
const paired = [];
for (const variant of ["original", "dataset", "unscoped"])
  for (let i = 1; i <= 3; i++) {
    const a = sameCut.find((e) => e.event === "start" && e.id === `baseline-${variant}-${i}`);
    const b = sameCut.find((e) => e.event === "start" && e.id === `integration-${variant}-${i}`);
    if (!a || !b || a.sha256 !== b.sha256) throw new Error("Same-cut query mismatch");
    paired.push({ variant, request: i, sha256: a.sha256, identical: true });
  }
const sourceDifferences = git(
  "diff",
  "--name-only",
  revisions.baseline,
  revisions.integration,
  "--",
  "packages/core/src",
  "packages/qlever/src",
)
  .toString()
  .trim()
  .split("\n")
  .filter(Boolean);
const control = "packages/qualification/test/c8-reads-never-write.test.ts";
const unchanged = readFileSync(control).equals(git("show", `${revisions.baseline}:${control}`));
if (!unchanged) throw new Error("C8 control changed");
writeFileSync(
  `${out}/source-audit.json`,
  JSON.stringify(
    {
      at: new Date().toISOString(),
      node: process.version,
      revisions,
      snapshots,
      paired,
      sourceDifferences,
      control: { path: control, sha256: sha(readFileSync(control)), unchanged },
      lockfile: {
        sha256: sha(readFileSync("pnpm-lock.yaml")),
        sameBetweenRevisions: git("show", `${revisions.baseline}:pnpm-lock.yaml`).equals(
          git("show", `${revisions.integration}:pnpm-lock.yaml`),
        ),
      },
    },
    null,
    2,
  ) + "\n",
);
writeFileSync(
  `${out}/query-path.diff`,
  git(
    "diff",
    revisions.baseline,
    revisions.integration,
    "--",
    "packages/qlever/src",
    "packages/core/src",
  ),
);
console.log({
  snapshots: snapshots.length,
  pairedIdentical: paired.length,
  sourceDifferences,
  controlUnchanged: unchanged,
});

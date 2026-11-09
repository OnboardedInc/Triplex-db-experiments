// [CX-VP4N] Why: reviewer commands retain independent logs and source bindings, including failures.
// Rejected: invoking builder scripts (they hard-code another worktree and overwrite builder evidence).
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";

const [label, ...command] = process.argv.slice(2);
if (!label || !command.length) throw Error("usage: run.mjs label command...");
const root = "/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VP4N";
const dir = path.join(root, label);
fs.mkdirSync(dir, { recursive: true });
const sha = (b) => createHash("sha256").update(b).digest("hex");
const git = (args) => execFileSync("git", args, { encoding: "utf8" }).trim();
const inputs = () =>
  Object.fromEntries(
    git([
      "ls-files",
      "--cached",
      "--others",
      "--exclude-standard",
      "packages",
      "lab/verify/QH1",
      "lab/verify/P4N",
      "lab/experiments/EXP-P4N",
      "lab/experiments/EXP-QH1",
      "lab/acceptance",
      "lab/bin",
      "pnpm-lock.yaml",
      "vitest.workspace-aliases.ts",
    ])
      .split("\n")
      .filter((f) => f && fs.existsSync(f))
      .map((f) => [f, sha(fs.readFileSync(f))]),
  );
const before = inputs();
const receipt = {
  label,
  command,
  head: git(["rev-parse", "HEAD"]),
  cwd: process.cwd(),
  started: new Date().toISOString(),
  node: process.version,
  inputs: before,
  env: { QH1_PULLS: process.env.QH1_PULLS ?? null },
  slot: null,
  heavy: fs
    .readdirSync("/Users/sam/projects/triplex-db-2/lab/locks/heavy")
    .map((n) =>
      JSON.parse(
        fs.readFileSync(
          "/Users/sam/projects/triplex-db-2/lab/locks/heavy/" + n + "/owner.json",
          "utf8",
        ),
      ),
    ),
};
const disk = fs.statfsSync(".");
if (disk.bavail * disk.bsize < 5 * 1024 ** 3) throw Error("less than 5 GiB free");
if (fs.existsSync(path.join(dir, "receipt.json"))) throw Error("attempt already exists");
const fd = fs.openSync(path.join(dir, "command.log"), "wx");
const result = spawnSync(command[0], command.slice(1), {
  stdio: ["ignore", fd, fd],
  env: { ...process.env, QH1_RESULT: path.join(dir, "measurements.json") },
});
fs.closeSync(fd);
Object.assign(receipt, {
  ended: new Date().toISOString(),
  exit: result.status,
  signal: result.signal,
  error: result.error?.message,
  sourceUnchanged: JSON.stringify(before) === JSON.stringify(inputs()),
  logSha256: sha(fs.readFileSync(path.join(dir, "command.log"))),
});
fs.writeFileSync(path.join(dir, "receipt.json"), JSON.stringify(receipt, null, 2) + "\n", {
  flag: "wx",
});
console.log(
  JSON.stringify({ label, exit: receipt.exit, sourceUnchanged: receipt.sourceUnchanged, dir }),
);
process.exitCode = result.status ?? 1;

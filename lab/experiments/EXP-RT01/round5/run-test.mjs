import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
const root = path.resolve(import.meta.dirname, "../../../.."),
  output = "/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-RT01/round5/test1";
assert.ok(!fs.existsSync(output));
fs.mkdirSync(output, { recursive: true });
const hash = (p) => createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const files = [
  ...new Set(
    execFileSync(
      "git",
      [
        "ls-files",
        "-co",
        "--exclude-standard",
        "packages",
        "pnpm-lock.yaml",
        "vitest.workspace-aliases.ts",
      ],
      { cwd: root, encoding: "utf8" },
    )
      .trim()
      .split("\n"),
  ),
]
  .filter(Boolean)
  .sort();
files.push(path.relative(root, import.meta.filename));
const snapshot = () => Object.fromEntries(files.map((p) => [p, hash(path.join(root, p))]));
const before = snapshot(),
  started = new Date().toISOString(),
  args = ["run", "test/journal-clock.test.ts", "--maxWorkers=1", "--no-file-parallelism"];
const command = path.join(root, "node_modules/.bin/vitest"),
  result = spawnSync(command, args, {
    cwd: path.join(root, "packages/xtdb"),
    encoding: "utf8",
    timeout: 120000,
    maxBuffer: 8 * 1024 ** 2,
  });
for (const kind of ["stdout", "stderr"])
  fs.writeFileSync(path.join(output, kind + ".txt"), result[kind] ?? "");
const after = snapshot(),
  sourceUnchanged = JSON.stringify(before) === JSON.stringify(after);
// [EXP-RT01] Why: qualify only the fresh two-encoding test with unchanged inputs and its exact assertion source. Rejected: treating exit zero or an earlier test count as sufficient evidence.
const contentMatches = result.status === 0 && /Tests\s+2 passed \(2\)/.test(result.stdout ?? "");
fs.writeFileSync(
  path.join(output, "execution.json"),
  JSON.stringify(
    {
      started,
      ended: new Date().toISOString(),
      context: "offline-no-engine",
      holder: "CX-RT01",
      head: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
      command,
      args,
      node: process.version,
      nodeSha256: hash(process.execPath),
      commandSha256: hash(command),
      exit: result.status,
      signal: result.signal,
      error: result.error?.message ?? null,
      before,
      after,
      sourceUnchanged,
      contentMatches,
      stdoutSha256: hash(path.join(output, "stdout.txt")),
      stderrSha256: hash(path.join(output, "stderr.txt")),
    },
    null,
    2,
  ) + "\n",
);
assert.ok(sourceUnchanged);
assert.ok(contentMatches, result.stdout + result.stderr);
console.log(JSON.stringify({ output, sourceUnchanged, contentMatches, tests: 2 }));

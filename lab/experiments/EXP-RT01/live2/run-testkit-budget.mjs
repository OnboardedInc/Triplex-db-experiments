import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync, execFileSync } from "node:child_process";
const root = path.resolve(import.meta.dirname, "../../../..");
const out =
  "/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-RT01/live2/offline/testkit-budget1";
assert.ok(!fs.existsSync(out));
fs.mkdirSync(out, { recursive: true });
const hash = (p) => createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const paths = execFileSync(
  "git",
  ["ls-files", "-co", "--exclude-standard", "packages", "pnpm-lock.yaml"],
  { cwd: root, encoding: "utf8" },
)
  .trim()
  .split("\n");
const snapshot = () => Object.fromEntries(paths.map((p) => [p, hash(path.join(root, p))]));
const before = snapshot(),
  runnerSha256 = hash(import.meta.filename),
  started = new Date().toISOString();
// [EXP-RT01] Why: retain the actual five-second timeout and rerun all testkit assertions with a declared budget on the shared host. Rejected: changing product behavior or silently adopting a rerun.
const args = ["run", "--maxWorkers=1", "--no-file-parallelism", "--testTimeout=120000"];
const r = spawnSync(path.join(root, "node_modules/.bin/vitest"), args, {
  cwd: path.join(root, "packages/testkit"),
  encoding: "utf8",
  timeout: 600000,
  maxBuffer: 32 * 1024 ** 2,
});
fs.writeFileSync(path.join(out, "tests.txt"), (r.stdout ?? "") + (r.stderr ?? ""));
const after = snapshot();
fs.writeFileSync(
  path.join(out, "execution.json"),
  JSON.stringify(
    {
      reason:
        "attempt1 testkit default 5000ms timeout; identical product source, explicit 120000ms per-test budget",
      args,
      started,
      ended: new Date().toISOString(),
      exit: r.status,
      signal: r.signal,
      error: r.error?.message ?? null,
      runnerSha256,
      runnerUnchanged: runnerSha256 === hash(import.meta.filename),
      sourceBefore: before,
      sourceAfter: after,
      sourceUnchanged: JSON.stringify(before) === JSON.stringify(after),
      logSha256: hash(path.join(out, "tests.txt")),
    },
    null,
    2,
  ) + "\n",
);
process.exitCode = r.status === 0 && JSON.stringify(before) === JSON.stringify(after) ? 0 : 1;

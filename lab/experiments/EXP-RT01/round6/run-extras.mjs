import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
const root = path.resolve(import.meta.dirname, "../../../.."),
  out = "/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-RT01/round6/extras1";
assert.ok(!fs.existsSync(out));
fs.mkdirSync(out, { recursive: true });
const hash = (p) => createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const snapshot = () =>
  Object.fromEntries(
    execFileSync(
      "git",
      [
        "ls-files",
        "-co",
        "--exclude-standard",
        "packages",
        "lab/experiments/EXP-RT01/round6",
        "pnpm-lock.yaml",
      ],
      { cwd: root, encoding: "utf8" },
    )
      .trim()
      .split("\n")
      .map((p) => [p, hash(path.join(root, p))]),
  );
const before = snapshot(),
  phases = [];
for (const [name, args] of [
  [
    "reproductions",
    [process.execPath, path.join(import.meta.dirname, "run-reproductions.mjs"), "attempt1"],
  ],
  [
    "guard-plan",
    [path.join(root, "node_modules/.bin/tsx"), path.join(import.meta.dirname, "guard-plan.ts")],
  ],
]) {
  const started = new Date().toISOString(),
    r = spawnSync(args[0], args.slice(1), {
      cwd: root,
      encoding: "utf8",
      timeout: 600000,
      maxBuffer: 32 * 1024 ** 2,
    });
  fs.writeFileSync(path.join(out, name + ".stdout"), r.stdout ?? "");
  fs.writeFileSync(path.join(out, name + ".stderr"), r.stderr ?? "");
  phases.push({
    name,
    args,
    started,
    ended: new Date().toISOString(),
    exit: r.status,
    error: r.error?.message ?? null,
    stdoutSha256: hash(path.join(out, name + ".stdout")),
    stderrSha256: hash(path.join(out, name + ".stderr")),
  });
  console.log(name, r.status);
  if (r.status !== 0) break;
}
const after = snapshot();
fs.writeFileSync(
  path.join(out, "execution.json"),
  JSON.stringify(
    { before, after, sourceUnchanged: JSON.stringify(before) === JSON.stringify(after), phases },
    null,
    2,
  ) + "\n",
);
process.exitCode =
  phases.length === 2 &&
  phases.every((p) => p.exit === 0) &&
  JSON.stringify(before) === JSON.stringify(after)
    ? 0
    : 1;

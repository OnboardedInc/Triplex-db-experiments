import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync, execFileSync } from "node:child_process";
const root = path.resolve(import.meta.dirname, "../../../.."),
  out = "/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-RT01/round6/plan2";
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
  started = new Date().toISOString();
const r = spawnSync(
  path.join(root, "node_modules/.bin/tsx"),
  [path.join(import.meta.dirname, "guard-plan.ts")],
  { cwd: root, encoding: "utf8", timeout: 120000, maxBuffer: 32 * 1024 ** 2 },
);
fs.writeFileSync(path.join(out, "plan.json"), r.stdout ?? "");
fs.writeFileSync(path.join(out, "plan.stderr"), r.stderr ?? "");
const after = snapshot();
fs.writeFileSync(
  path.join(out, "execution.json"),
  JSON.stringify(
    {
      reason:
        "retained wire uses normalized PostgreSQL placeholders; compare actual normalized emitted SQL, not its pre-transport question marks",
      before,
      after,
      started,
      ended: new Date().toISOString(),
      exit: r.status,
      error: r.error?.message ?? null,
      sourceUnchanged: JSON.stringify(before) === JSON.stringify(after),
      planSha256: hash(path.join(out, "plan.json")),
    },
    null,
    2,
  ) + "\n",
);
process.exitCode = r.status === 0 && JSON.stringify(before) === JSON.stringify(after) ? 0 : 1;

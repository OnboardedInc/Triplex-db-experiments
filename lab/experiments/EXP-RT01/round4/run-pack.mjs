import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
const root = path.resolve(import.meta.dirname, "../../../.."),
  out = "/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-RT01/round4/pack1";
assert.ok(!fs.existsSync(out));
fs.mkdirSync(path.join(out, "tools"), { recursive: true });
// [EXP-RT01] Why: the upstream pack check invokes pnpm internally; bind every invocation to the owned store. Rejected: changing global pnpm configuration or using its default cache.
const shim =
  '#!/bin/sh\nexec /opt/homebrew/bin/pnpm --store-dir /Users/sam/projects/triplex-db-2/.pnpm-store "$@"\n';
fs.writeFileSync(path.join(out, "tools/pnpm"), shim, { mode: 0o755 });
const hash = (p) => createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const names = spawnSync(
  "git",
  [
    "ls-files",
    "-co",
    "--exclude-standard",
    "packages",
    "pnpm-lock.yaml",
    "scripts/check-packages.mjs",
  ],
  { cwd: root, encoding: "utf8" },
)
  .stdout.trim()
  .split("\n");
names.push(path.relative(root, import.meta.filename));
for (const pkg of fs.readdirSync(path.join(root, "packages"))) {
  const dist = path.join(root, "packages", pkg, "dist");
  if (fs.existsSync(dist))
    for (const file of fs.readdirSync(dist, { recursive: true }))
      if (fs.statSync(path.join(dist, file)).isFile())
        names.push(path.relative(root, path.join(dist, file)));
}
const snapshot = () =>
  Object.fromEntries([...new Set(names)].sort().map((p) => [p, hash(path.join(root, p))]));
const before = snapshot(),
  started = new Date().toISOString();
const result = spawnSync(path.join(out, "tools/pnpm"), ["pack:check"], {
  cwd: root,
  env: {
    ...process.env,
    PATH: path.join(out, "tools") + ":" + process.env.PATH,
    TRIPLEX_PACK_ARTIFACT_ROOT: path.join(out, "artifacts"),
    TRIPLEX_PACK_NATIVE_SMOKE: "0",
  },
  encoding: "utf8",
  timeout: 300000,
  maxBuffer: 16 * 1024 ** 2,
});
for (const kind of ["stdout", "stderr"])
  fs.writeFileSync(path.join(out, kind + ".txt"), result[kind] ?? "");
const after = snapshot();
fs.writeFileSync(
  path.join(out, "execution.json"),
  JSON.stringify(
    {
      started,
      ended: new Date().toISOString(),
      context: "offline-pack-check-no-native-smoke",
      exit: result.status,
      signal: result.signal,
      error: result.error?.message ?? null,
      before,
      after,
      sourceUnchanged: JSON.stringify(before) === JSON.stringify(after),
      shimSha256: hash(path.join(out, "tools/pnpm")),
      stdoutSha256: hash(path.join(out, "stdout.txt")),
      stderrSha256: hash(path.join(out, "stderr.txt")),
    },
    null,
    2,
  ) + "\n",
);
console.log(
  JSON.stringify({
    exit: result.status,
    error: result.error?.message ?? null,
    sourceUnchanged: JSON.stringify(before) === JSON.stringify(after),
  }),
);
process.exitCode = result.status ?? 1;

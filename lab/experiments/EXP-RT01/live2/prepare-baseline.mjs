import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
const root = path.resolve(import.meta.dirname, "../../../..");
const out = "/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-RT01/live2/baseline";
const commit = "59e07afb7a25dfb22bca60f8d769b74651aa835a";
assert.ok(!fs.existsSync(out));
fs.mkdirSync(out, { recursive: true });
const archive = execFileSync(
  "git",
  [
    "archive",
    commit,
    "packages/core",
    "packages/xtdb",
    "package.json",
    "tsconfig.base.json",
    "tsconfig.node.json",
    "pnpm-workspace.yaml",
  ],
  { cwd: root, maxBuffer: 32 * 1024 ** 2 },
);
fs.writeFileSync(path.join(out, "source.tar"), archive);
execFileSync("tar", ["-xf", path.join(out, "source.tar"), "-C", out]);
fs.symlinkSync(path.join(root, "node_modules"), path.join(out, "node_modules"));
// [EXP-RT01] Why: baseline XTDB must resolve baseline core, while third-party dependencies remain the exact installed lock-bound bytes. Rejected: mixing main adapter code with RT01 core or rebuilding in another agent's checkout.
for (const pkg of ["core", "xtdb"]) {
  const dest = path.join(out, "packages", pkg, "node_modules");
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(path.join(root, "packages", pkg, "node_modules"))) {
    const src = path.join(root, "packages", pkg, "node_modules", entry);
    if (entry === "@triplex-build") {
      fs.mkdirSync(path.join(dest, entry));
      for (const name of fs.readdirSync(src))
        fs.symlinkSync(
          name === "triplex"
            ? path.join(out, "packages/core")
            : fs.realpathSync(path.join(src, name)),
          path.join(dest, entry, name),
        );
    } else fs.symlinkSync(fs.realpathSync(src), path.join(dest, entry));
  }
}
const phases = [];
for (const pkg of ["core", "xtdb"]) {
  const r = spawnSync(path.join(root, "node_modules/.bin/tsdown"), [], {
    cwd: path.join(out, "packages", pkg),
    encoding: "utf8",
    timeout: 300000,
    maxBuffer: 16 * 1024 ** 2,
  });
  fs.writeFileSync(path.join(out, `${pkg}-build.txt`), (r.stdout ?? "") + (r.stderr ?? ""));
  phases.push({ pkg, exit: r.status, error: r.error?.message });
  if (r.status !== 0) break;
}
const hash = (p) => createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const files = {};
for (const pkg of ["core", "xtdb"])
  for (const file of fs.readdirSync(path.join(out, "packages", pkg), { recursive: true })) {
    const p = path.join(out, "packages", pkg, file);
    if (!file.includes("node_modules") && fs.statSync(p).isFile())
      files[`packages/${pkg}/${file}`] = hash(p);
  }
fs.writeFileSync(
  path.join(out, "identity.json"),
  JSON.stringify(
    {
      commit,
      archiveSha256: hash(path.join(out, "source.tar")),
      runnerSha256: hash(import.meta.filename),
      phases,
      files,
    },
    null,
    2,
  ) + "\n",
);
assert.equal(phases.length, 2);
assert.ok(phases.every((p) => p.exit === 0));
console.log("baseline built", commit);

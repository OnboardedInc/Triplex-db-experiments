import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
const hash = (b: string | Buffer) => createHash("sha256").update(b).digest("hex");
// [EXP-DI01] Why: bind every executed build, oracle, recipe and fixture before starting observations. Rejected: source-only receipts with potentially stale generated modules.
export function evidenceBinding() {
  const file = process.env.DI01_BINDING;
  if (!file) return null;
  const bytes = fs.readFileSync(file),
    manifest = JSON.parse(bytes.toString());
  for (const item of manifest.files)
    assert.equal(hash(fs.readFileSync(item.path)), item.sha256, `binding moved: ${item.path}`);
  return { path: file, sha256: hash(bytes) };
}
export function createBinding(dir: string) {
  const files: string[] = [];
  const walk = (p: string) => {
    for (const e of fs.readdirSync(p, { withFileTypes: true })) {
      const f = path.join(p, e.name);
      if (e.isDirectory() && !["node_modules", "__pycache__"].includes(e.name)) walk(f);
      else if (e.isFile() && /\.(ts|mjs|js|json|py|md)$/.test(f)) files.push(f);
    }
  };
  for (const p of [
    "packages/host/src",
    "packages/host/dist",
    "packages/core/src",
    "packages/core/dist",
    "packages/testkit/src/feed",
    "packages/testkit/dist/feed",
    "packages/w0/src",
    "packages/w0/dist",
    "lab/world/W0",
    "lab/oracles/domain",
    "lab/bench/lib",
    "lab/scenarios/v2",
  ])
    walk(p);
  for (const f of fs.readdirSync("lab/bench").filter((f) => f.startsWith("di01")))
    files.push("lab/bench/" + f);
  files.push(
    "pnpm-lock.yaml",
    "lab/experiments/EXP-DI01/BRIEF.md",
    "lab/experiments/EXP-FD01/round2/reviewer-probes/mutate.mjs",
  );
  fs.mkdirSync(path.join(dir, "preimages"), { recursive: true });
  const manifest = {
    files: [...new Set(files)].sort().map((p) => {
      const bytes = fs.readFileSync(p),
        sha256 = hash(bytes),
        target = path.join(dir, "preimages", sha256);
      if (!fs.existsSync(target)) fs.writeFileSync(target, bytes, { flag: "wx" });
      return { path: p, sha256, bytes: bytes.length };
    }),
  };
  fs.writeFileSync(path.join(dir, "binding.json"), JSON.stringify(manifest, null, 2), {
    flag: "wx",
  });
}
if (process.argv[2] === "--create-binding") createBinding(process.argv[3]!);

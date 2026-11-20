import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
const [host, ref] = process.argv.slice(2);
assert((host === "lazy" || host === "delta") && /^[a-f0-9]{40}$/.test(ref!));
const repo = path.resolve(import.meta.dirname, "../../../.."),
  dest = path.join(repo, "runs", "notify-hosts", host + "-" + ref);
const paths = [
  "package.json",
  "tsconfig.base.json",
  "tsconfig.node.json",
  "lab/bench/lib",
  "lab/experiments/EXP-DX1/import1/source.ts",
  "lab/experiments/EXP-DX1/actv-" + host,
];
if (host === "lazy") paths.push("packages/datomic");
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.mkdirSync(dest);
const archive = execFileSync("git", ["archive", ref!, ...paths], {
  cwd: repo,
  maxBuffer: 32 * 1024 ** 2,
});
execFileSync("tar", ["-xf", "-", "-C", dest], { input: archive });
const link = (file: string) => {
  const to = path.join(dest, file);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.symlinkSync(path.join(repo, file), to);
};
for (const dep of [
  "node_modules",
  "lab/world",
  "lab/oracles",
  "packages/core",
  "packages/w0",
  "packages/qualification",
  "packages/host",
  "packages/xtdb",
  "packages/qlever",
  "packages/sql",
  "packages/sqlite",
])
  link(dep);
// [DX-STG1] Why: LAZY's source-position admission primitive and runtime must share the same built transaction context. Rejected: linking a different Datomic package into a native host probe.
if (host === "lazy") {
  link("packages/datomic/node_modules");
  execFileSync(path.join(repo, "node_modules/.bin/tsdown"), [], {
    cwd: path.join(dest, "packages/datomic"),
    stdio: "inherit",
  });
} else link("packages/datomic");
fs.writeFileSync(path.join(dest, "version"), ref!, { flag: "wx" });
console.log(dest);

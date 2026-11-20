import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
const [host, ref, mode] = process.argv.slice(2);
assert((host === "lazy" || host === "delta") && /^[a-f0-9]{40}$/.test(ref!));
assert(mode === undefined || (mode === "joined" && host === "lazy"));
const repo = path.resolve(import.meta.dirname, "../../../.."),
  dest = path.join(repo, "runs", "notify-hosts", [host, ref, mode].filter(Boolean).join("-"));
const paths = [
  "package.json",
  "tsconfig.base.json",
  "tsconfig.node.json",
  "lab/bench/lib",
  "lab/experiments/EXP-DX1/import1/source.ts",
  "lab/experiments/EXP-DX1/actv-" + host,
];
if (host === "lazy") paths.push("packages/datomic");
if (mode === "joined")
  paths.push("lab/experiments/EXP-DX1/actv-delta", "lab/experiments/EXP-DX1/notify1");
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.mkdirSync(dest);
const archive = execFileSync("git", ["archive", ref!, ...paths], {
  cwd: repo,
  maxBuffer: 32 * 1024 ** 2,
});
execFileSync("tar", ["-xf", "-", "-C", dest], { input: archive });
if (mode === "joined") {
  const files = [
    "journal.ts",
    "census.ts",
    "dispatcher.ts",
    "ranges.ts",
    "store.ts",
    "receiver.ts",
    "join-range.patch",
  ];
  const source = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8", cwd: repo }).trim();
  const folder = "lab/experiments/EXP-DX1/notify1/";
  const inputs = Object.fromEntries(
    files.map((name) => {
      const file = folder + name;
      const committed = execFileSync("git", ["show", source + ":" + file], { cwd: repo });
      assert(committed.equals(fs.readFileSync(path.join(repo, file))));
      fs.writeFileSync(path.join(dest, file), committed);
      return [file, createHash("sha256").update(committed).digest("hex")];
    }),
  );
  // [DX-STG1] Why: run the exact joined ingress, gate and native runtime at
  // the companion revision plus the proposed patch. Rejected: editing its branch.
  execFileSync("git", ["apply", path.join(dest, folder, "join-range.patch")], {
    cwd: dest,
    env: { ...process.env, GIT_CEILING_DIRECTORIES: path.dirname(dest) },
  });
  fs.writeFileSync(
    path.join(dest, "overlay.json"),
    JSON.stringify({ host: ref, source, inputs }) + "\n",
    { flag: "wx" },
  );
}
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

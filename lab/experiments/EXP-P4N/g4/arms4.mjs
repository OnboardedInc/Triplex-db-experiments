// [EXP-P4N] Why: each kept step is retained as its own byte-exact build so ABAB arms are separate processes on fixed code.
// Rejected: rebuilding dist in place between arms (an arm would silently run a later step).
// usage: node arms4.mjs <name>   copies the worktree's built core/qlever dist into evidence QH1-R3/arms/<name>
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
const wt = path.resolve(import.meta.dirname, "../../../..");
const name = process.argv[2];
if (!/^[A-Za-z0-9_-]+$/.test(name ?? "")) throw Error("usage: arms4.mjs <name>");
const root = path.join("/Users/sam/Claude/Projects/triplex-db-2/evidence/P4N-R1/arms", name);
if (fs.existsSync(root)) throw Error("arm already retained: " + root);
const sha = (f) => createHash("sha256").update(fs.readFileSync(f)).digest("hex");
const treeHash = (dir) => {
  const h = createHash("sha256");
  for (const f of fs.readdirSync(dir, { recursive: true }).map(String).sort()) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isFile()) h.update(f).update(sha(p));
  }
  return h.digest("hex");
};
const link = (from, to) => (
  fs.mkdirSync(path.dirname(to), { recursive: true }), fs.symlinkSync(from, to)
);
for (const pkg of ["core", "qlever"]) {
  const dest = path.join(root, "packages", pkg);
  fs.mkdirSync(dest, { recursive: true });
  fs.cpSync(path.join(wt, "packages", pkg, "dist"), path.join(dest, "dist"), {
    recursive: true,
  });
  fs.copyFileSync(path.join(wt, "packages", pkg, "package.json"), path.join(dest, "package.json"));
  for (const dep of pkg === "core" ? ["effect", "ulidx"] : ["better-sqlite3", "effect"])
    link(
      fs.realpathSync(path.join(wt, "packages", pkg, "node_modules", dep)),
      path.join(dest, "node_modules", dep),
    );
}
link(
  path.join(root, "packages/core"),
  path.join(root, "packages/qlever/node_modules/@triplex-build/triplex"),
);
fs.mkdirSync(path.join(root, "packages/core/node_modules/@effect"), {
  recursive: true,
});
for (const e of fs.readdirSync(path.join(wt, "packages/core/node_modules/@effect")))
  link(
    fs.realpathSync(path.join(wt, "packages/core/node_modules/@effect", e)),
    path.join(root, "packages/core/node_modules/@effect", e),
  );
const result = {
  name,
  root,
  coreDist: treeHash(path.join(root, "packages/core/dist")),
  qleverDist: treeHash(path.join(root, "packages/qlever/dist")),
  sourceCoreDist: treeHash(path.join(wt, "packages/core/dist")),
  sourceQleverDist: treeHash(path.join(wt, "packages/qlever/dist")),
};
if (result.coreDist !== result.sourceCoreDist || result.qleverDist !== result.sourceQleverDist)
  throw Error("retained build differs from source dist");
fs.writeFileSync(path.join(root, "arm.json"), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));

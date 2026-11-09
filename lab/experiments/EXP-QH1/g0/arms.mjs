// [EXP-QH1-R2] Why: arms must load byte-exact retained builds (baseline HS01 and round-1 candidate) in separate processes,
// each resolving its own core/qlever pair. Rejected: rebuilding dist in place (round 1 had to serialize builds), and one
// process importing two builds (qlever resolves @triplex-build/triplex to whichever core is linked).
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
const wt = path.resolve(import.meta.dirname, "../../../..");
const E = "/Users/sam/Claude/Projects/triplex-db-2/evidence";
const out = path.join(E, "QH1-R2/arms");
const builds = { baseline: path.join(E, "CX-QH1/baseline-builds"), candidate: path.join(E, "CX-QH1/candidate-builds") };
const sha = (f) => createHash("sha256").update(fs.readFileSync(f)).digest("hex");
const treeHash = (dir) => {
  const h = createHash("sha256");
  for (const f of fs.readdirSync(dir, { recursive: true }).map(String).sort()) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isFile()) h.update(f).update(sha(p));
  }
  return h.digest("hex");
};
const link = (from, to) => (fs.mkdirSync(path.dirname(to), { recursive: true }), fs.symlinkSync(from, to));
const result = {};
for (const [arm, src] of Object.entries(builds)) {
  const root = path.join(out, arm);
  fs.rmSync(root, { recursive: true, force: true });
  for (const pkg of ["core", "qlever"]) {
    const dest = path.join(root, "packages", pkg);
    fs.mkdirSync(dest, { recursive: true });
    fs.cpSync(path.join(src, pkg), path.join(dest, "dist"), { recursive: true });
    // package.json (exports map) from the exact source revision of the arm.
    const rev = arm === "baseline" ? "2f7b42d6" : "HEAD";
    fs.writeFileSync(path.join(dest, "package.json"), execFileSync("git", ["-C", wt, "show", `${rev}:packages/${pkg}/package.json`]));
    const nm = path.join(dest, "node_modules");
    for (const dep of pkg === "core" ? ["effect", "ulidx"] : ["better-sqlite3", "effect"])
      link(fs.realpathSync(path.join(wt, "packages", pkg, "node_modules", dep)), path.join(nm, dep));
  }
  link(path.join(root, "packages/core"), path.join(root, "packages/qlever/node_modules/@triplex-build/triplex"));
  fs.mkdirSync(path.join(root, "packages/core/node_modules/@effect"), { recursive: true });
  for (const e of fs.readdirSync(path.join(wt, "packages/core/node_modules/@effect")))
    link(fs.realpathSync(path.join(wt, "packages/core/node_modules/@effect", e)), path.join(root, "packages/core/node_modules/@effect", e));
  result[arm] = { root, coreDist: treeHash(path.join(root, "packages/core/dist")), qleverDist: treeHash(path.join(root, "packages/qlever/dist")), sourceCoreDist: treeHash(path.join(src, "core")), sourceQleverDist: treeHash(path.join(src, "qlever")) };
}
fs.writeFileSync(path.join(out, "arms.json"), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));

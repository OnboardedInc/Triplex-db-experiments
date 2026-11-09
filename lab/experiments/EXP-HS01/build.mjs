// [EXP-HS01] Why: build through package configuration with cwd-correct entrypoints and no global cache changes.
// Rejected: generated dist edits or sibling worktree imports.
import { execFileSync } from "node:child_process";
import path from "node:path";
const root = process.cwd(),
  bin = path.join(root, "node_modules/.bin");
for (const name of ["core", "testkit", "qlever"]) {
  execFileSync(path.join(bin, "tsdown"), [], {
    cwd: path.join(root, "packages", name),
    stdio: "inherit",
  });
  execFileSync(path.join(bin, "tsc"), ["--noEmit"], {
    cwd: path.join(root, "packages", name),
    stdio: "inherit",
  });
}

// [EXP-HS01] Why: build through package configuration with cwd-correct entrypoints and no global cache changes.
// Rejected: generated dist edits or sibling worktree imports.
import { execFileSync } from "node:child_process";
import path from "node:path";
const root = process.cwd(),
  bin = path.join(root, "node_modules/.bin");
for (const name of ["core", "testkit", "qlever", "w0"]) {
  const cwd = path.join(root, "packages", name);
  if (name === "w0")
    execFileSync(path.join(bin, "tsc"), ["-p", "tsconfig.json"], { cwd, stdio: "inherit" });
  else {
    execFileSync(path.join(bin, "tsdown"), [], { cwd, stdio: "inherit" });
    if (name === "qlever")
      execFileSync(
        path.join(bin, "tsc"),
        ["--declaration", "--emitDeclarationOnly", "--rootDir", "src", "--outDir", "dist"],
        { cwd, stdio: "inherit" },
      );
  }
  execFileSync(path.join(bin, "tsc"), ["--noEmit"], { cwd, stdio: "inherit" });
}

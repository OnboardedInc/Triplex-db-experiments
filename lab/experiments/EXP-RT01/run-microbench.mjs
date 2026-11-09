import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import ts from "typescript";
const root = path.resolve(import.meta.dirname, "../../..");
const files = [];
try {
  for (const name of ["TriplesLive", "transactionMetadata"]) {
    let source = await fs.readFile(
      path.join(import.meta.dirname, `evidence/main-${name}.txt`),
      "utf8",
    );
    if (name === "TriplesLive")
      source = source.replace(
        '"./transactionMetadata.js"',
        '"./__rt01_main_transactionMetadata.js"',
      );
    // [EXP-RT01] Why: compare the exact pre-change core without another checkout/install. Rejected: benchmarking the stamp helper alone (omits journal cost).
    const target = path.join(root, `packages/core/src/store/__rt01_main_${name}.js`);
    await fs.writeFile(
      target,
      ts.transpileModule(source, {
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
      }).outputText,
    );
    files.push(target);
  }
  if (process.argv.includes("--adapter")) {
    const source = await fs.readFile(
      path.join(import.meta.dirname, "evidence/main-XtdbStorageAdapter.txt"),
      "utf8",
    );
    const target = path.join(root, "packages/xtdb/src/__rt01_main_XtdbStorageAdapter.js");
    await fs.writeFile(
      target,
      ts.transpileModule(source, {
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
      }).outputText,
    );
    files.push(target);
  }
  const result = spawnSync(
    path.join(root, "node_modules/.bin/tsx"),
    [
      path.join(
        import.meta.dirname,
        process.argv.includes("--adapter") ? "adapter-microbench.ts" : "microbench.ts",
      ),
    ],
    { cwd: root, stdio: "inherit" },
  );
  process.exitCode = result.status ?? 1;
} finally {
  for (const file of files) await fs.unlink(file);
}

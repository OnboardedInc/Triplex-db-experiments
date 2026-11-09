// [CX-VNSR] Why: run exact declared build steps with installed local binaries; pnpm rejects --store-dir on exec/run. Rejected: modifying package scripts or using a global dependency cache.
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
const root = process.cwd();
for (const name of ["core", "sql", "sqlite", "postgres", "host", "testkit", "cli"]) {
  const cwd = path.join(root, "packages", name);
  const script = JSON.parse(fs.readFileSync(path.join(cwd, "package.json"))).scripts.build;
  console.log(JSON.stringify({ package: name, script }));
  for (const part of script.split(" && ")) {
    const [command, ...args] = part.split(" ");
    assert.ok(["tsdown", "tsc"].includes(command));
    const child = spawnSync(path.join(root, "node_modules/.bin", command), args, {
      cwd,
      stdio: "inherit",
    });
    assert.equal(child.status, 0, `${name}: ${part}`);
  }
}
for (const file of ["dist/index.js", "dist/index.d.ts", "dist/cli.js"])
  assert.ok(fs.statSync(path.join(root, "packages/cli", file)).isFile());
console.log("Exact declared builds completed; CLI dist entry points exist.");

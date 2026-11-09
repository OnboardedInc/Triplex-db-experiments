import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
const root = path.resolve(import.meta.dirname, "../../..");
const suffix = process.argv[2] ? `-${process.argv[2]}` : "";
const target = path.join(import.meta.dirname, `.baseline-declarations${suffix}`);
await fs.mkdir(target, { recursive: false });
try {
  const archive = spawnSync(
    "git",
    [
      "archive",
      "59e07afb7a25dfb22bca60f8d769b74651aa835a",
      "packages/core",
      "tsconfig.base.json",
      "tsconfig.node.json",
    ],
    { cwd: root, maxBuffer: 32 * 1024 ** 2 },
  );
  if (archive.status !== 0) throw new Error(archive.stderr.toString());
  const unpack = spawnSync("tar", ["-x", "-C", target], { input: archive.stdout });
  if (unpack.status !== 0) throw new Error("Cannot unpack exact main baseline");
  await fs.symlink(path.join(root, "node_modules"), path.join(target, "node_modules"));
  await fs.symlink(
    path.join(root, "packages/core/node_modules"),
    path.join(target, "packages/core/node_modules"),
  );
  const build = spawnSync(path.join(root, "node_modules/.bin/tsdown"), [], {
    cwd: path.join(target, "packages/core"),
    encoding: "utf8",
    maxBuffer: 16 * 1024 ** 2,
  });
  await fs.writeFile(
    path.join(import.meta.dirname, `evidence/baseline-declarations-build${suffix}.txt`),
    `${build.stdout}${build.stderr}`,
  );
  if (build.status !== 0) throw new Error("Baseline declaration build failed");
  const baseline = path.join(target, "packages/core/dist");
  const current = path.join(root, "packages/core/dist");
  const files = async (dir, prefix = "") => {
    const result = [];
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      if (entry.isDirectory())
        result.push(...(await files(path.join(dir, entry.name), `${prefix}${entry.name}/`)));
      else if (entry.name.endsWith(".d.ts")) result.push(`${prefix}${entry.name}`);
    }
    return result;
  };
  let diff = "";
  const changes = [];
  for (const name of new Set([...(await files(baseline)), ...(await files(current))])) {
    const a = await fs.readFile(path.join(baseline, name), "utf8").catch(() => "");
    const b = await fs.readFile(path.join(current, name), "utf8").catch(() => "");
    if (a === b) continue;
    changes.push(name);
    const result = spawnSync("diff", ["-u", path.join(baseline, name), path.join(current, name)], {
      encoding: "utf8",
    });
    diff += result.stdout || `NEW ${name}\n${b}\n`;
  }
  await fs.writeFile(path.join(import.meta.dirname, `evidence/declarations${suffix}.diff`), diff);
  await fs.writeFile(
    path.join(import.meta.dirname, `evidence/declaration-changes${suffix}.json`),
    JSON.stringify({ baseline: "59e07afb7a25dfb22bca60f8d769b74651aa835a", changes }, null, 2) +
      "\n",
  );
} finally {
  // [EXP-RT01] Why: only this exact newly created export/build tree is temporary. Rejected: deleting dependency stores or retained engine state.
  await fs.rm(target, { recursive: true });
}

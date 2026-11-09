// [EXP-NSR-R3] Why: the bundler's resolved inputs, not loader-name heuristics, define the artifact graph. Rejected: claiming an AST spelling blacklist is a closed execution graph (F2).
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
const requireTool = createRequire(import.meta.resolve("tsx"));
const esbuild = requireTool("esbuild");
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
export function compileDriver(entry, root) {
  root = fs.realpathSync(root);
  entry = fs.realpathSync(entry);
  const built = esbuild.buildSync({
    absWorkingDir: root,
    entryPoints: [entry],
    outfile: "driver.mjs",
    bundle: true,
    splitting: false,
    format: "esm",
    platform: "node",
    target: "node24",
    metafile: true,
    write: false,
    logLevel: "silent",
  });
  const files = {};
  for (const input of Object.keys(built.metafile.inputs)) {
    const file = fs.realpathSync(path.resolve(root, input)),
      relative = path.relative(root, file);
    if (relative.startsWith("..") || relative.split(path.sep).includes("packages"))
      throw Error("Driver candidate/outside import: " + file);
    files[relative] = sha(fs.readFileSync(file));
  }
  const outputs = Object.values(built.metafile.outputs);
  if (built.outputFiles.length !== 1 || outputs.length !== 1)
    throw Error("Driver is not a single closed artifact");
  const externals = outputs[0].imports.map((x) => x.path);
  if (outputs[0].imports.some((x) => !x.external || !x.path.startsWith("node:")))
    throw Error("Unresolved external file/package import");
  const code = built.outputFiles[0].contents;
  return {
    code,
    metafile: built.metafile,
    files: Object.fromEntries(Object.entries(files).sort(([a], [b]) => a.localeCompare(b))),
    externals: [...new Set(externals)].sort(),
    bundleSha256: sha(code),
    bundler: { name: "esbuild", version: esbuild.version },
  };
}

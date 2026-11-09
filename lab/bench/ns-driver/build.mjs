// [EXP-NSR] Why: the evaluator publishes only its checked import closure as a content-addressed bundle. Rejected: copying the repository or candidate dependencies into the driver volume.
import fs from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { checkImports } from "./check-imports.mjs";
export function buildDriver(output, root = path.resolve(import.meta.dirname, "../../..")) {
  const graph = checkImports(path.join(root, "lab/bench/ns-driver/driver.mjs"), root);
  fs.mkdirSync(output, { recursive: true });
  if (fs.readdirSync(output).length) throw Error("Driver bundle destination is not fresh");
  for (const [relative, sha256] of Object.entries(graph.files)) {
    const target = path.join(output, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(root, relative), target, fs.constants.COPYFILE_EXCL);
    if (createHash("sha256").update(fs.readFileSync(target)).digest("hex") !== sha256)
      throw Error("Driver changed during bundle copy");
  }
  const manifest = {
    schema: "ns-driver-bundle/1",
    ...graph,
    generatorSha256: graph.files["lab/bench/lib/trace.ts"],
    entry: "lab/bench/ns-driver/driver.mjs",
  };
  fs.writeFileSync(path.join(output, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n", {
    flag: "wx",
  });
  return manifest;
}
if (process.argv[1] && path.resolve(process.argv[1]) === import.meta.filename)
  console.log(JSON.stringify(buildDriver(path.resolve(process.argv[2]))));

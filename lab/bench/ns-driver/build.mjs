// [EXP-NSR-R3] Why: publish one executable artifact plus its mandatory hash-checked runtime launcher, retaining the bundler's own metafile. Rejected: a source-directory copy described as a closed bundle.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { compileDriver } from "./compile.mjs";
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
export function buildDriver(
  output,
  root = path.resolve(import.meta.dirname, "../../.."),
  entry = path.join(root, "lab/bench/ns-driver/driver.mjs"),
) {
  const { code, metafile, ...graph } = compileDriver(entry, root);
  fs.mkdirSync(output, { recursive: true });
  if (fs.readdirSync(output).length) throw Error("Driver bundle destination is not fresh");
  fs.writeFileSync(path.join(output, "driver.mjs"), code, { flag: "wx" });
  const support = {};
  for (const name of ["runtime-guard.mjs", "launch-artifact.mjs"]) {
    const bytes = fs.readFileSync(new URL(name, import.meta.url));
    support[name] = sha(bytes);
    fs.writeFileSync(path.join(output, name), bytes, { flag: "wx" });
  }
  const metaBytes = JSON.stringify(metafile, null, 2) + "\n";
  fs.writeFileSync(path.join(output, "metafile.json"), metaBytes, { flag: "wx" });
  const manifest = {
    schema: "ns-driver-bundle/2",
    ...graph,
    generatorSha256: graph.files["lab/bench/lib/trace.ts"] ?? null,
    entry: "driver.mjs",
    metafileSha256: sha(metaBytes),
    support,
    launch: ["node", "launch-artifact.mjs", ".", "<config.json>"],
    runtime:
      "Node --permission (no workers/children) plus registerHooks closed-artifact load policy",
  };
  fs.writeFileSync(path.join(output, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n", {
    flag: "wx",
  });
  return manifest;
}
if (process.argv[1] && path.resolve(process.argv[1]) === import.meta.filename)
  console.log(JSON.stringify(buildDriver(path.resolve(process.argv[2]))));

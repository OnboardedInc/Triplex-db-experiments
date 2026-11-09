import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { createHash } from "node:crypto";
const root = process.argv[2],
  output = process.argv[3];
if (!root || !output || fs.existsSync(output)) throw Error("evidence root and new output required");
const checked = [];
const sha = (x) => createHash("sha256").update(x).digest("hex");
for (const arm of ["M", "U"]) {
  const dir = path.join(root, `grid-${arm}-attempt2`);
  for (const f of fs.readdirSync(dir).filter((f) => /^\d+\.request\.json(?:\.gz)?$/.test(f))) {
    const bytes = fs.readFileSync(path.join(dir, f));
    const meta = JSON.parse(f.endsWith(".gz") ? zlib.gunzipSync(bytes) : bytes);
    if (!meta.params.update) continue;
    // [EXP-QG1] Why: inspect actual emitted updates, excluding term contents so
    // a literal containing "BIND(" cannot cause a false finding. Rejected:
    // searching read queries (BIND in SELECT does not create update terms).
    const syntax = meta.params.update.replace(/"(?:\\.|[^"\\])*"|<[^>]*>|'(?:\\.|[^'\\])*'/g, "");
    checked.push({
      path: `grid-${arm}-attempt2/${f}`,
      sha256: sha(meta.params.update),
      constructedTerms: /\b(?:IRI|URI|BIND)\s*\(/i.test(syntax),
    });
  }
}
const source = fs.readFileSync("packages/qlever/src/QleverStorageAdapter.ts");
// [EXP-QG1] Why: BIND in dependency-state SELECTs does not construct update
// terms. Rejected: whole-file matching (incorrectly flags read-only SELECTs).
const start = source.indexOf("  const persist = (");
const end = source.indexOf("        let acknowledged = false", start);
if (start < 0 || end <= start) throw Error("persist assembly boundaries changed");
const updateAssembly = source.subarray(start, end);
const result = {
  checked,
  adapterTemplate: {
    path: "packages/qlever/src/QleverStorageAdapter.ts",
    sha256: sha(source),
    assemblyStartByte: start,
    assemblyEndByte: end,
    assemblySha256: sha(updateAssembly),
    iriOrBindText: /\b(?:IRI|BIND)\s*\(/i.test(updateAssembly.toString()),
  },
  verdict: "DIAGNOSTIC template inventory; not proof for every dynamically generated future update",
};
fs.writeFileSync(output, JSON.stringify(result, null, 2));
if (checked.some((x) => x.constructedTerms) || result.adapterTemplate.iriOrBindText)
  process.exitCode = 1;

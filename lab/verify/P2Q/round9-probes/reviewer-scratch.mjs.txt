// [CX-VP2Q-4-R9] Why: challenge the unchanged enumeration in real isolated source copies, including TypeScript inheritance and merging.
// Rejected: editing the reviewed tree or a copied approximation of the inventory test (would not prove the actual guard's behavior).
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
const root = process.cwd(), base = path.join(root, "lab/verify/P2Q/scratch-round9");
if (fs.statfsSync(root).bavail * fs.statfsSync(root).bsize < 5 * 1024 ** 3) throw new Error("below 5 GiB admission floor");
fs.mkdirSync(base);
const hash = file => createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const field = "readonly round9Read: (basis?: { readonly recordedPosition: number; readonly validAt: number }) => Effect.Effect<readonly Triple[], ReadError>;";
const copy = (destination, file) => { fs.mkdirSync(path.dirname(path.join(destination, file)), { recursive: true }); fs.cpSync(path.join(root, file), path.join(destination, file), { recursive: true }); };
const mutations = [];
for (const kind of ["baseline", "direct", "inherited", "merged"]) {
  const dest = path.join(base, kind);
  fs.mkdirSync(dest);
  for (const file of ["packages/core/src", "packages/qlever/src", "packages/core/package.json", "packages/qlever/package.json", "package.json", "vitest.workspace-aliases.ts", "lab/verify/P2Q/vitest.config.ts", "lab/verify/P2Q/tests/harness.ts", "lab/verify/P2Q/tests/round8-policy.test.ts"]) copy(dest, file);
  fs.symlinkSync(path.join(root, "node_modules"), path.join(dest, "node_modules"), "dir");
  if (kind !== "baseline") {
    const contract = path.join(dest, "packages/core/src/store/Triples.ts"), implementation = path.join(dest, "packages/core/src/store/TriplesLive.ts");
    let source = fs.readFileSync(contract, "utf8");
    if (kind === "direct") source = source.replace("export interface TriplesService {", `export interface TriplesService {\n  ${field}`);
    if (kind === "inherited") source = source.replace("export interface TriplesService {", `export interface Round9AdditionalReads { ${field} }\nexport interface TriplesService extends Round9AdditionalReads {`);
    if (kind === "merged") source += `\nexport interface TriplesService { ${field} }\n`;
    fs.writeFileSync(contract, source);
    const body = fs.readFileSync(implementation, "utf8").replace("      assert: assert_,", "      round9Read: (_basis?: { readonly recordedPosition: number; readonly validAt: number }) => Effect.succeed([]),\n      assert: assert_,");
    fs.writeFileSync(implementation, body);
    fs.copyFileSync(path.join(root, "lab/verify/P2Q/scripts/round9-added-read.test.ts"), path.join(dest, "lab/verify/P2Q/tests/round9-added-read.test.ts"));
  }
  mutations.push({ kind, root: dest, testMatchesOriginal: hash(path.join(dest, "lab/verify/P2Q/tests/round8-policy.test.ts")) === hash("lab/verify/P2Q/tests/round8-policy.test.ts"),
    contractSha256: hash(path.join(dest, "packages/core/src/store/Triples.ts")), implementationSha256: hash(path.join(dest, "packages/core/src/store/TriplesLive.ts")) });
}
fs.writeFileSync("lab/verify/P2Q/evidence-round9/scratch-inputs.json", JSON.stringify({ mutations }, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify({ scratchCopies: mutations.length, unchangedInventoryBytes: mutations.every(row => row.testMatchesOriginal) }));

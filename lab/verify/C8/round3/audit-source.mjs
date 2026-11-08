import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

// [CX-VC8-3] Why: preserve source/merge checks alongside runtime receipts. Rejected: relying only on the builder's merge report.
const output = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(output, "../../../..");
const sut = path.join(output, "sut");
const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" });
const manifest = JSON.parse(readFileSync(path.join(output, "source-manifest.json")));
for (const entry of manifest.files) {
  const bytes = readFileSync(path.join(sut, entry.path));
  const sha = createHash("sha256").update(bytes).digest("hex");
  if (entry.sha256 !== sha) throw new Error(`Changed snapshot: ${entry.path}`);
}
const retainedFromX02 = ["packages/xtdb/src/native/ReadOnlySql.ts", "packages/core/src/datalog/compiler.ts"];
const retainedFromC8Round2 = [
  "packages/core/src/native/FrontierClosure.ts",
  "packages/xtdb/src/native/Reachability.ts", "packages/xtdb/src/query/recursion.ts",
  "packages/qlever/src/recursion.ts", "packages/qlever/src/native/BasisRelations.ts",
  "packages/xtdb/src/ReadOnlyClient.ts", "packages/qlever/src/ReadOnlyClient.ts",
];
for (const [from, files] of [["6cd68dc", retainedFromX02], ["0527233", retainedFromC8Round2]])
  git("diff", "--exit-code", from, manifest.revision, "--", ...files);
const excerpts = {};
for (const [file, start, end] of [
  ["packages/qualification/src/engine-write-counter.ts", 340, 373],
  ["packages/qualification/src/engine-write-counter.ts", 453, 502],
  ["packages/xtdb/src/native/ReadOnlySql.ts", 100, 128],
  ["packages/core/src/datalog/compiler.ts", 553, 575],
  ["packages/xtdb/src/query/compiler.ts", 19, 32],
  ["packages/qualification/src/native/xtdb-workloads.ts", 250, 330],
]) {
  const lines = readFileSync(path.join(sut, file), "utf8").split("\n");
  excerpts[`${file}:${start}-${end}`] = lines.slice(start - 1, end).map((line, i) => `${start + i}: ${line}`);
}
const result = {
  revision: manifest.revision, checkedAt: new Date().toISOString(),
  allSnapshotFilesUnchanged: manifest.files.length,
  x02ByteIdenticalTo6cd68dc: retainedFromX02,
  c8ByteIdenticalTo0527233: retainedFromC8Round2,
  mergeParents: git("show", "-s", "--format=%P", "b5a995a").trim(),
  packageDelta: git("diff", "--stat", "0527233", manifest.revision, "--", "packages"),
  excerpts,
};
writeFileSync(path.join(output, "source-audit.json"), JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify({ revision: result.revision, allSnapshotFilesUnchanged: result.allSnapshotFilesUnchanged, mergeByteChecks: "PASS" }));

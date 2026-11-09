// [CX-VNSR] Why: isolate the missing-CLI-artifact failure without fetching a consumer or changing scripts. Rejected: labeling a targeted archive check as full pack:check acceptance.
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { spawnSync, execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
const output = path.resolve(".cache/verify-nsr", `cli-pack-${randomUUID()}`);
fs.mkdirSync(output, { recursive: true });
const old =
  "/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-NSR/pack/triplex-pack-YbTNVI/tarballs/triplex-build-triplex-cli-0.1.1.tgz";
const entries = (file) =>
  execFileSync("tar", ["-tzf", file], { encoding: "utf8" }).trim().split("\n");
assert.equal(entries(old).includes("package/dist/index.js"), false);
const child = spawnSync(
  "npm",
  [
    "pack",
    "--offline",
    "--ignore-scripts",
    "--json",
    "--cache",
    path.join(output, "npm-cache"),
    "--pack-destination",
    output,
  ],
  { cwd: path.resolve("packages/cli"), encoding: "utf8" },
);
fs.writeFileSync(path.join(output, "npm-pack.stdout"), child.stdout ?? "");
fs.writeFileSync(path.join(output, "npm-pack.stderr"), child.stderr ?? "");
assert.equal(child.status, 0, child.stderr);
const file = path.join(output, JSON.parse(child.stdout)[0].filename);
const present = entries(file);
for (const required of [
  "package/package.json",
  "package/README.md",
  "package/LICENSE",
  "package/dist/index.js",
  "package/dist/index.d.ts",
  "package/dist/cli.js",
])
  assert.ok(present.includes(required), required);
console.log(
  JSON.stringify(
    {
      originalBuilderTarball: old,
      originalMissingIndex: true,
      freshlyBuiltTarball: file,
      sha256: createHash("sha256").update(fs.readFileSync(file)).digest("hex"),
      requiredEntriesPresent: true,
      conclusion:
        "The reported missing CLI dist/index.js failure was setup: its declared build generates and packs the entry.",
      limitation:
        "npm offline archive presence check; not pnpm workspace-dependency rewriting or a clean consumer/install/runtime verification.",
    },
    null,
    2,
  ),
);

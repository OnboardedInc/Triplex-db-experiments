/** Fresh direct-public SDK entry recipe; no qualification registry or task library dependency. */
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
const root = path.resolve(import.meta.dirname, "../../.."),
  args = process.argv.slice(2);
const option = (key) => args[args.indexOf(key) + 1];
assert(args.includes("--job") && args.includes("--inventory"));
const id = option("--job");
assert.match(id, /^[a-z0-9][a-z0-9._-]{0,100}$/);
const inventory = JSON.parse(await readFile(path.resolve(root, option("--inventory")), "utf8"));
assert.equal(inventory.backend, "xtdb");
const directory = path.join(root, "qualification/native-jobs", id);
await mkdir(directory, { recursive: true });
const expectedPath = path.relative(root, path.join(directory, "expected-checks.json"));
const ids = [
  "triplex-shared-schema-write",
  "current/typed-xtql-fractional-cut",
  "current/half-open-boundary",
  "current/safe-native-parameters",
  "current/future-retraction-metadata-mask",
  "triplex-correction-preserves-original-history",
  "reopened/typed-xtql-fractional-cut",
  "reopened/half-open-boundary",
  "reopened/safe-native-parameters",
  "reopened/future-retraction-metadata-mask",
  "native-read-only-refusal",
  "native-fixed-cut-page-continuation",
  "native-cancellation-and-connection-reuse",
];
await writeFile(
  path.join(root, expectedPath),
  JSON.stringify(
    {
      format: "triplex-native-entry-checks/1",
      backend: "xtdb",
      queryPath: "xtdb-native",
      checks: ids.map((id) => ({ id, status: "PASS" })),
    },
    null,
    2,
  ) + "\n",
  { flag: "wx" },
);
// Reuse only the inventory of dependency paths, never an earlier hash or pass.
// Every selected byte is freshly hashed. The entry imports public core/XTDB
// only, so unrelated qualification-index edits cannot invalidate this closure.
const inputs = new Map();
for (const item of inventory.inputs) {
  if (
    item.path.startsWith("packages/qualification/") ||
    item.path.startsWith("qualification/") ||
    item.path.startsWith("packages/testkit/")
  )
    continue;
  const absolute = path.resolve(root, item.path);
  assert(absolute.startsWith(root + path.sep));
  inputs.set(item.path, {
    ...item,
    sha256: createHash("sha256")
      .update(await readFile(absolute))
      .digest("hex"),
  });
}
for (const [relative, role] of [
  ["packages/xtdb/experiments/native-entry.ts", "runner"],
  ["packages/xtdb/experiments/prepare-native-entry-job.mjs", "runner"],
  [expectedPath, "oracle"],
])
  inputs.set(relative, {
    path: relative,
    role,
    sha256: createHash("sha256")
      .update(await readFile(path.join(root, relative)))
      .digest("hex"),
  });
const manifest = {
  ...inventory,
  id,
  author: "xtdb-native-provider-owner",
  kind: "verification",
  queryPath: "xtdb-native",
  backend: "xtdb",
  problemId: "native-entry-cr-line-boundary",
  logicalTaskId: "native-entry-current-reopen-13",
  hypothesis:
    "The built public typed native API preserves current/reopened cuts, exact integers and connection reuse while its single-query guard rejects CR/LF second-SELECT escapes before execution",
  command: {
    argv: [
      inventory.command.argv[0],
      "packages/xtdb/experiments/native-entry.ts",
      "--output",
      "{RUN_ARTIFACTS}/report.json",
      "--checks-output",
      "{RUN_ARTIFACTS}/checks.json",
    ],
    cwd: ".",
    env: inventory.command.env,
  },
  resources: {
    heavy: true,
    memoryBytes: 896 * 1024 ** 2,
    cpuUnits: 1,
    diskBytes: 128 * 1024 ** 2,
    timeoutMilliseconds: 120000,
    maximumLogBytes: 8 * 1024 ** 2,
  },
  inputs: [...inputs.values()].sort((a, b) => a.path.localeCompare(b.path, "en")),
  requiredOwners: ["foundation-xtdb"],
  dependsOn: [],
  evidence: {
    checks: [
      {
        key: "public-native-entry-current-reopen",
        expectedInput: expectedPath,
        actual: "artifacts/checks.json",
      },
    ],
    requiredCheckKeys: ["public-native-entry-current-reopen"],
  },
  inspiration: [
    {
      reference:
        "https://github.com/xtdb/xtdb/blob/v2.2.0/core/src/main/antlr/xtdb/antlr/SqlLexer.g4",
      mechanism: "Line comments end at either CR or LF",
      adaptation:
        "Local lexical envelope matches both boundaries; live refusal controls use harmless SELECT pairs. Mutating tokens are exercised only in pure local tests.",
    },
  ],
  retention: {
    scratch: "retain-forensic",
    meaning:
      "Fresh owned public fixture and complete entry traces retained; no earlier export/Git acceptance or physical cancellation reclamation claim.",
  },
};
await writeFile(path.join(directory, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n", {
  flag: "wx",
});
console.log(
  JSON.stringify({
    manifest: path.relative(root, path.join(directory, "manifest.json")),
    currentReopenEntryChecks: ids.length,
    pinnedFiles: inputs.size,
    scope: "Direct public core/XTDB; qualification index excluded",
  }),
);

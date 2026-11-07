/** Freeze a read-only public parameter probe; starts no process or engine. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../../..");
const args = process.argv.slice(2);
const option = (key) => args[args.indexOf(key) + 1];
assert(args.includes("--job") && args.includes("--inventory"));
const id = option("--job");
assert.match(id, /^[a-z0-9][a-z0-9._-]{0,100}$/);
const inventory = JSON.parse(await readFile(path.resolve(root, option("--inventory")), "utf8"));
assert.equal(inventory.backend, "xtdb");
const directory = path.join(root, "qualification/native-jobs", id);
await mkdir(directory, { recursive: true });
const expectedPath = path.relative(root, path.join(directory, "expected-checks.json"));
// Independent binary64 expectations are declared before observing the server.
// Literal controls have no inferred cross-language signed-zero obligation;
// their exact in-memory bits remain observations in the retained report.
const payloads = [
  ["negative-zero", "8000000000000000"],
  ["positive-zero", "0000000000000000"],
  ["minimum-positive", "0000000000000001"],
  ["minimum-negative", "8000000000000001"],
  ["adjacent-to-tenth", "3fb999999999999b"],
  ["largest-safe-number", "433fffffffffffff"],
];
const expected = {
  format: "triplex-native-f64-checks/1",
  cases: ["current", "reopened"].flatMap((phase) =>
    ["sql", "xtql"].flatMap((language) =>
      payloads.map(([id, expectedBits]) => ({
        id: `${phase}/${language}/parameter/${id}`,
        expectedBits,
        actualBits: expectedBits,
        status: "PASS",
      })),
    ),
  ),
  controls: ["current", "reopened"].flatMap((phase) =>
    [
      "sql/literal-negative-zero",
      "sql/literal-positive-zero",
      "sql/string-parameter-negative-zero",
      "xtql/literal-negative-zero",
      "xtql/literal-positive-zero",
    ].map((id) => ({ id: `${phase}/${id}`, status: "EXECUTED" })),
  ),
};
await writeFile(path.join(root, expectedPath), JSON.stringify(expected, null, 2) + "\n", {
  flag: "wx",
});
const inputs = new Map();
for (const input of inventory.inputs) {
  if (
    input.path.startsWith("packages/qualification/") ||
    input.path.startsWith("qualification/") ||
    input.path.startsWith("packages/testkit/")
  )
    continue;
  const absolute = path.resolve(root, input.path);
  assert(absolute.startsWith(root + path.sep));
  inputs.set(input.path, {
    ...input,
    sha256: createHash("sha256")
      .update(await readFile(absolute))
      .digest("hex"),
  });
}
for (const [relative, role] of [
  ["packages/xtdb/experiments/native-f64-parameters.ts", "runner"],
  ["packages/xtdb/experiments/prepare-native-f64-job.mjs", "runner"],
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
  problemId: "native-binary64-parameter-identity",
  logicalTaskId: "native-numeric-parameters-current-reopen",
  hypothesis:
    "Public numeric parameter round trips preserve the declared binary64 subset; SQL/XTQL literal and string-cast controls isolate language/transport differences without application writes",
  command: {
    argv: [
      inventory.command.argv[0],
      "packages/xtdb/experiments/native-f64-parameters.ts",
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
    diskBytes: 16 * 1024 ** 2,
    timeoutMilliseconds: 120000,
    maximumLogBytes: 2 * 1024 ** 2,
  },
  inputs: [...inputs.values()].sort((a, b) => a.path.localeCompare(b.path, "en")),
  requiredOwners: ["foundation-xtdb"],
  dependsOn: [],
  evidence: {
    checks: [
      {
        key: "native-binary64-parameter-subset",
        expectedInput: expectedPath,
        actual: "artifacts/checks.json",
      },
    ],
    requiredCheckKeys: ["native-binary64-parameter-subset"],
  },
  inspiration: [
    {
      reference: "https://tc39.es/ecma262/#sec-samevalue",
      mechanism: "SameValue distinguishes negative and positive zero",
      adaptation:
        "Observe Object.is and big-endian DataView binary64 bits before JSON; ordinary numeric trace text is insufficient evidence",
    },
    {
      reference: "packages/xtdb/src/XtdbClient.ts",
      mechanism:
        "The current PostgreSQL parameter mapper chooses OID20 for Number.isSafeInteger(value)",
      adaptation:
        "Probe typed public SQL and XTQL parameters plus separate literal/string-cast controls; do not modify codecs or infer assertion storage behavior",
    },
  ],
  retention: {
    scratch: "retain-forensic",
    meaning:
      "Read-only probe and all pre-JSON bit observations remain retained, including failed expectations. No application fact writes or performance claim.",
  },
};
await writeFile(path.join(directory, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n", {
  flag: "wx",
});
console.log(
  JSON.stringify({
    manifest: path.relative(root, path.join(directory, "manifest.json")),
    numericParameterCases: expected.cases.length,
    observedLanguageControls: expected.controls.length,
    pinnedFiles: inputs.size,
    applicationWrites: 0,
  }),
);

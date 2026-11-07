/** Add pinned isolated observation to an unchanged public34/13 entry contract. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../../../..");
const args = process.argv.slice(2);
const option = (key) => args[args.indexOf(key) + 1];
assert(args.includes("--job") && args.includes("--base-manifest"));
const id = option("--job");
assert.match(id, /^[a-z0-9][a-z0-9._-]{0,100}$/);
const base = JSON.parse(await readFile(path.resolve(root, option("--base-manifest")), "utf8"));
assert.equal(base.queryPath, "xtdb-native");
assert(
  base.command.argv[1].endsWith("native-entry.ts") ||
    base.command.argv[1].endsWith("native-f64-parameters.ts"),
);
const inputs = new Map();
const hash = (value) => createHash("sha256").update(value).digest("hex");
for (const input of base.inputs) {
  assert.equal(
    hash(await readFile(path.resolve(root, input.path))),
    input.sha256,
    `Stale public base: ${input.path}`,
  );
  inputs.set(input.path, input);
}
const directory = path.join(root, "qualification/native-jobs", id);
await mkdir(directory, { recursive: true });
const expectedPath = path.relative(root, path.join(directory, "expected-driver-checks.json"));
const expected = {
  format: "triplex-xtdb-driver-observation-checks/1",
  status: "COMPLETE",
  observerErrors: 0,
  openPools: 0,
  unreleasedLeases: 0,
  unsettledQueries: 0,
};
await writeFile(path.join(root, expectedPath), JSON.stringify(expected, null, 2) + "\n", {
  flag: "wx",
});
for (const [relative, role] of [
  ...[
    "register.mjs",
    "driver-wrapper.mjs",
    "observe-postgres.mjs",
    "trace-session.mjs",
    "observe-postgres.test.mjs",
    "prepare-observed-entry.mjs",
  ].map((file) => [`packages/xtdb/experiments/attribution/${file}`, "runner"]),
  [expectedPath, "oracle"],
])
  inputs.set(relative, {
    path: relative,
    role,
    sha256: hash(await readFile(path.join(root, relative))),
  });
const manifest = {
  ...base,
  id,
  author: "xtdb-native-provider-owner",
  problemId: "transparent-driver-stage-observation",
  hypothesis:
    "The isolated pinned preload observes driver handler dispatch/settlement without eagerly starting or replacing a lazy Query; unchanged public semantic checks remain exact",
  command: {
    ...base.command,
    argv: [
      base.command.argv[0],
      "--import",
      "./packages/xtdb/experiments/attribution/register.mjs",
      ...base.command.argv.slice(1),
    ],
  },
  resources: { ...base.resources, diskBytes: 64 * 1024 ** 2 },
  inputs: [...inputs.values()].sort((a, b) => a.path.localeCompare(b.path, "en")),
  paramsAndCut: {
    diagnosticPreload: "pinned-postgres3.4.9-driver-callbacks/1",
    productInputs: "Unchanged exact base source/build/dependency/oracle bytes",
    traceLimitBytes: 16 * 1024 ** 2,
    spanAuthority:
      "Driver issue/handler-dispatch/settlement callbacks; not independently observed wire/engine/index timestamps",
  },
  evidence: {
    ...base.evidence,
    checks: [
      ...base.evidence.checks,
      {
        key: "driver-observation-complete",
        expectedInput: expectedPath,
        actual: "artifacts/xtdb-driver-checks.json",
      },
    ],
    requiredCheckKeys: [...base.evidence.requiredCheckKeys, "driver-observation-complete"],
  },
  inspiration: [
    ...base.inspiration,
    {
      reference:
        "https://nodejs.org/download/release/v24.13.0/docs/api/module.html#moduleregisterhooksoptions",
      mechanism: "Explicit --import synchronous hooks run before the entry point",
      adaptation:
        "Resolve only the built XTDB module's exact postgres import; preserve the originally resolved driver and leave product bytes unchanged",
    },
    {
      reference: "https://raw.githubusercontent.com/porsager/postgres/v3.4.9/src/query.js",
      mechanism: "Lazy handle invokes handler; resolve/reject callbacks settle the original Query",
      adaptation:
        "Observe those callbacks on the same pending object; never attach an observing then/catch/finally or start a query early",
    },
  ],
  retention: {
    scratch: "retain-forensic",
    meaning:
      "Original semantic checks and bounded redacted driver trace retained with source preimages; no performance or independently timed wire/index claim",
  },
};
await writeFile(path.join(directory, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n", {
  flag: "wx",
});
console.log(
  JSON.stringify({
    manifest: path.relative(root, path.join(directory, "manifest.json")),
    pinnedFiles: inputs.size,
    unchangedSemanticChecks: base.evidence.requiredCheckKeys,
    maximumTraceBytes: 16 * 1024 ** 2,
  }),
);

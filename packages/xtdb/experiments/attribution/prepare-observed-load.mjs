// @ts-nocheck -- [EXP-CHECKJS-R2] dynamic collections, runtime Buffer-to-JSON coercion, or validated values without static narrowing. Binding errors remain checked by lab/bin/checkjs.mjs.
/** Freeze observation/cohort wrappers around an existing unchanged load recipe. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { cohortBounds } from "./cohort-contract.mjs";

const root = path.resolve(import.meta.dirname, "../../../..");
const args = process.argv.slice(2),
  option = (key) => args[args.indexOf(key) + 1];
assert(args.includes("--job") && args.includes("--base-manifest"));
const id = option("--job");
assert.match(id, /^[a-z0-9][a-z0-9._-]{0,100}$/);
const base = JSON.parse(await readFile(path.resolve(root, option("--base-manifest")), "utf8"));
assert.equal(base.queryPath, "xtdb-datalog");
assert.equal(base.profile.phase, "diagnostic");
assert.equal(base.command.argv[1], "packages/qualification/load/runner.ts");
assert.equal(base.profile.clients, 256);
assert.equal(base.profile.endMilliseconds, 30000);
assert.deepEqual(base.profile.execution, {
  mode: "open-loop",
  writerMode: "rate",
  readRate: 16,
  writeRate: 0.2,
  dispatch: 16,
  pending: 4096,
  readTimeoutMs: 30000,
  maximumReads: 10000,
  maximumWriterCommands: 6,
  fixtureInstances: 1,
  timingPolicy: "monotonic-scheduled-offer-deadline/1",
});
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const inputs = new Map();
for (const input of base.inputs) {
  assert.equal(
    hash(await readFile(path.resolve(root, input.path))),
    input.sha256,
    `Stale base: ${input.path}`,
  );
  inputs.set(input.path, input);
}
const planPath = "qualification/load-waves/xtdb-driver-stages-v1/plan.json";
const planBytes = await readFile(path.join(root, planPath));
assert.equal(JSON.parse(planBytes).id, "xtdb-driver-stages-v1");
inputs.set(planPath, { path: planPath, role: "recipe", sha256: hash(planBytes) });
const head = execFileSync("git", ["rev-parse", "--verify", "HEAD"], {
  cwd: root,
  encoding: "utf8",
}).trim();
assert(/^[a-f0-9]{40,64}$/.test(head));
const directory = path.join(root, "qualification/load-jobs", id);
await mkdir(directory, { recursive: true });
const expectations = [
  [
    "driver",
    {
      format: "triplex-xtdb-driver-observation-checks/1",
      status: "COMPLETE",
      observerErrors: 0,
      openPools: 0,
      unreleasedLeases: 0,
      unsettledQueries: 0,
    },
  ],
  ["cohort", { format: "triplex-isolated-cohort-checks/1", status: "COMPLETE", violations: 0 }],
];
for (const [name, value] of expectations) {
  const relative = path.relative(root, path.join(directory, `expected-${name}.json`));
  await writeFile(path.join(root, relative), JSON.stringify(value, null, 2) + "\n", { flag: "wx" });
  inputs.set(relative, {
    path: relative,
    role: "oracle",
    sha256: hash(await readFile(path.join(root, relative))),
  });
}
const helpers = [
  "register.mjs",
  "driver-wrapper.mjs",
  "observe-postgres.mjs",
  "trace-session.mjs",
  "observe-postgres.test.mjs",
  "verify-trace.mjs",
  "cohort-contract.mjs",
  "cohort-contract.test.mjs",
  "isolated-load-entry.mjs",
  "verify-isolated-cohort.mjs",
  "prepare-observed-load.mjs",
];
const helperProvenance = [];
for (const file of helpers) {
  const relative = `packages/xtdb/experiments/attribution/${file}`,
    bytes = await readFile(path.join(root, relative));
  inputs.set(relative, { path: relative, role: "runner", sha256: hash(bytes) });
  let atHead;
  try {
    atHead = hash(
      execFileSync("git", ["show", `${head}:${relative}`], {
        cwd: root,
        stdio: ["ignore", "pipe", "ignore"],
      }),
    );
  } catch {
    /* A new helper can be explicitly CAS-bound outside the251-file checkpoint. */
  }
  helperProvenance.push({
    path: relative,
    sha256: hash(bytes),
    gitAuthority:
      atHead === hash(bytes)
        ? "MATCHES_LOCAL_HEAD"
        : "DIRTY_OR_UNTRACKED_HELPER_BYTES_BOUND_BY_CAS",
  });
}
const manifest = {
  ...base,
  id,
  problemId: "driver-stage-attribution-without-optimization",
  hypothesis:
    "Observe lookup/submit/commit-composite/receipt/visibility driver callbacks through the unchanged public runtime in a named no-other-heavy-client cohort",
  command: {
    ...base.command,
    argv: [
      base.command.argv[0],
      "--import",
      "./packages/xtdb/experiments/attribution/register.mjs",
      "packages/xtdb/experiments/attribution/isolated-load-entry.mjs",
      ...base.command.argv.slice(2),
    ],
    env: { ...base.command.env, TRIPLEX_LOCAL_SOURCE_GIT_HEAD: head },
  },
  resources: { ...base.resources, timeoutMilliseconds: cohortBounds.workerMilliseconds },
  requiredOwners: ["foundation-xtdb", "foundation-qlever"],
  inputs: [...inputs.values()].sort((a, b) => a.path.localeCompare(b.path, "en")),
  profile: {
    ...base.profile,
    id: `driver-observation-isolated-${base.profile.id}`,
    cohortIdentity: "no-other-heavy-client-groups-stage-attribution-v1",
  },
  paramsAndCut: {
    ...base.paramsAndCut,
    localSourceGitHead: head,
    treeCleanClaimed: false,
    helperProvenance,
    cohortBounds,
    completeAttemptOverlapVerificationRequired: true,
    meaning:
      "Real local checkpoint plus exact CAS-bound helper bytes; original sanitized-export authority remains separate",
  },
  evidence: {
    ...base.evidence,
    checks: [
      ...base.evidence.checks,
      ...expectations.map(([name]) => ({
        key: `${name}-observation-complete`,
        expectedInput: path.relative(root, path.join(directory, `expected-${name}.json`)),
        actual: `artifacts/xtdb-${name === "driver" ? "driver" : "cohort"}-checks.json`,
      })),
    ],
    requiredCheckKeys: [
      ...base.evidence.requiredCheckKeys,
      "driver-observation-complete",
      "cohort-observation-complete",
    ],
  },
  retention: {
    scratch: "retain-forensic",
    meaning:
      "Every original outcome, source preimage, redacted driver callback, sampled cohort record and post-terminal complete-attempt overlap receipt is retained; unexpected overlap invalidates rather than reclassifies performance",
  },
};
await writeFile(path.join(directory, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n", {
  flag: "wx",
});
console.log(
  JSON.stringify({
    manifest: path.relative(root, path.join(directory, "manifest.json")),
    localSourceGitHead: head,
    treeCleanClaimed: false,
    pinnedFiles: inputs.size,
    cohortBounds,
    execution: manifest.profile.execution,
  }),
);

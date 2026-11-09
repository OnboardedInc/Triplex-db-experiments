// [EXP-PACK] Why: reversible independent fixtures against the unchanged gate, with
// each observation tied to fresh bytes. Adapted from verify/PACK c71ec6d6; fixed gaps now must fail. Rejected: mocking pnpm/build (cannot prove freshness).
import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  statfsSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import assert from "node:assert/strict";

const root = resolve(import.meta.dirname, "../../..");
process.chdir(root);
const evidence = resolve(
  process.env.CX_VPACK_EVIDENCE ??
    "/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-PACK/round2",
);
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const head = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const gateHash = sha(readFileSync("lab/bin/check-packages.mjs"));
const names = [
  "core",
  "sql",
  "sqlite",
  "postgres",
  "cloudflare",
  "host",
  "foundationdb",
  "testkit",
  "cli",
  "http",
  "xtdb",
  "qlever",
];
const shimDir = join(evidence, "bin");
mkdirSync(shimDir, { recursive: true });
const realNpm = execFileSync("which", ["npm"], { encoding: "utf8" }).trim();
const npmShim = join(shimDir, "npm");
if (!existsSync(npmShim)) symlinkSync(join(import.meta.dirname, "npm-offline.mjs"), npmShim);
const env = {
  ...process.env,
  PATH: `${shimDir}:${process.env.PATH}`,
  npm_config_offline: "true",
  npm_config_update_notifier: "false",
  CX_VPACK_NPM: realNpm,
  CX_VPACK_CACHE:
    "/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-PACK/attempts/triplex-pack-UMylBa/npm-cache",
};
const resultFile = join(evidence, "results.json");
const results = existsSync(resultFile) ? JSON.parse(readFileSync(resultFile)) : [];
const cases = [
  {
    id: "baseline",
    expected: "PASS",
    setup() {
      for (const name of names) {
        mkdirSync(`packages/${name}/dist`, { recursive: true });
        writeFileSync(`packages/${name}/dist/CX_VPACK_STALE.txt`, "stale dist must be removed");
      }
    },
  },
  {
    id: "added-package",
    expected: "FAIL",
    error: "CX_VPACK_ADDED_BUILD_MUST_FAIL",
    setup() {
      const dir = "packages/cx-vpack-added";
      mkdirSync(dir);
      writeFileSync(
        `${dir}/package.json`,
        JSON.stringify(
          {
            name: "@triplex-build/triplex-cx-vpack-added",
            version: "0.1.0",
            private: true,
            type: "module",
            files: ["dist", "README.md", "LICENSE"],
            main: "./dist/index.js",
            types: "./dist/index.d.ts",
            exports: { ".": { types: "./dist/index.d.ts", import: "./dist/index.js" } },
            peerDependencies: { effect: "catalog:" },
            scripts: { build: "node -e \"throw new Error('CX_VPACK_ADDED_BUILD_MUST_FAIL')\"" },
          },
          null,
          2,
        ),
      );
      writeFileSync(`${dir}/README.md`, "CX-VPACK temporary lab workspace package");
      writeFileSync(`${dir}/LICENSE`, "CX-VPACK fixture");
      const list = execFileSync(
        "pnpm",
        [
          "--config.store-dir=/Users/sam/projects/triplex-db-2/.pnpm-store",
          "--recursive",
          "list",
          "--depth",
          "-1",
          "--json",
        ],
        { encoding: "utf8", env },
      );
      writeFileSync(join(currentDir, "workspace-list.json"), list);
      assert(
        JSON.parse(list).some((item) => item.name === "@triplex-build/triplex-cx-vpack-added"),
      );
      const control = spawnSync(
        "pnpm",
        [
          "--config.store-dir=/Users/sam/projects/triplex-db-2/.pnpm-store",
          "--filter",
          "@triplex-build/triplex-cx-vpack-added",
          "build",
        ],
        { encoding: "utf8", env },
      );
      writeFileSync(
        join(currentDir, "added-build-control.log"),
        `${control.stdout}${control.stderr}`,
      );
      assert.notEqual(control.status, 0);
      assert(`${control.stdout}${control.stderr}`.includes("CX_VPACK_ADDED_BUILD_MUST_FAIL"));
    },
  },
  {
    id: "missing-export",
    expected: "FAIL",
    edit: "packages/host/package.json",
    setup() {
      editJson("packages/host/package.json", (manifest) => {
        manifest.exports["./cx-vpack-missing"] = {
          types: "./dist/cx-vpack-missing.d.ts",
          import: "./dist/cx-vpack-missing.js",
        };
      });
    },
    error: "missing or non-dist export/bin target ./dist/cx-vpack-missing.d.ts",
  },
  {
    id: "broken-declaration",
    expected: "FAIL",
    edit: "packages/cloudflare/package.json",
    setup() {
      editJson("packages/cloudflare/package.json", (manifest) => {
        manifest.scripts.build += ` && node ${join(import.meta.dirname, "inject-declaration.mjs")}`;
      });
    },
    error: "CX_VPACK_MissingType",
  },
  {
    id: "qlever-runtime-throw",
    expected: "FAIL",
    error: "CX_VPACK_QLEVER_RUNTIME_THROW",
    edit: "packages/qlever/src/index.ts",
    setup() {
      appendFileSync(
        "packages/qlever/src/index.ts",
        '\n// [EXP-PACK] Why: test import-time failure detection. Rejected: a type error (different gate).\nthrow new Error("CX_VPACK_QLEVER_RUNTIME_THROW");\n',
      );
    },
  },
  {
    id: "sqlite-runtime-control",
    expected: "FAIL",
    edit: "packages/sqlite/src/index.ts",
    setup() {
      appendFileSync(
        "packages/sqlite/src/index.ts",
        '\n// [EXP-PACK] Why: positive control for runtime smoke. Rejected: URL resolution (does not evaluate modules).\nthrow new Error("CX_VPACK_SQLITE_RUNTIME_THROW");\n',
      );
    },
    error: "CX_VPACK_SQLITE_RUNTIME_THROW",
  },
  {
    id: "stale-dist-source-error",
    expected: "FAIL",
    edit: "packages/host/src/index.ts",
    setup() {
      assert(existsSync("packages/host/dist/index.js"));
      appendFileSync(
        "packages/host/src/index.ts",
        "\n// [EXP-PACK] Why: valid old dist cannot conceal broken current source. Rejected: only checking mtimes.\nexport type CX_VPACK_SourceFailure = CX_VPACK_UNDEFINED_SOURCE_TYPE;\n",
      );
    },
    error: "CX_VPACK_UNDEFINED_SOURCE_TYPE",
  },
];
let currentDir;
function editJson(path, mutate) {
  const manifest = JSON.parse(readFileSync(path));
  mutate(manifest);
  writeFileSync(path, JSON.stringify(manifest, null, 2) + "\n");
}
for (const test of cases.filter(
  (test) => process.argv.length === 2 || process.argv.slice(2).includes(test.id),
)) {
  assert(statfsSync(root).bavail * statfsSync(root).bsize >= 5 * 1024 ** 3, "host disk floor");
  currentDir = join(evidence, `${test.id}${process.env.CX_VPACK_SUFFIX ?? ""}`);
  assert(!existsSync(currentDir), "Do not overwrite prior attempts");
  mkdirSync(currentDir);
  const original = test.edit ? readFileSync(test.edit) : null;
  const startedAt = new Date().toISOString();
  writeFileSync(
    join(currentDir, "regression-binding.json"),
    JSON.stringify(
      {
        head,
        gateHash,
        exclusionsSha256: sha(readFileSync("lab/config/pack-exclusions.json")),
        startedAt,
      },
      null,
      2,
    ),
  );
  try {
    test.setup();
    if (test.edit) {
      writeFileSync(
        join(currentDir, "fixture.diff"),
        execFileSync("git", ["diff", "--", test.edit]),
      );
      writeFileSync(join(currentDir, "fixture-bytes"), readFileSync(test.edit));
    }
    if (test.id === "added-package") {
      writeFileSync(
        join(currentDir, "fixture-package.json"),
        readFileSync("packages/cx-vpack-added/package.json"),
      );
    }
    const attemptRoot = join(currentDir, "attempts");
    const command = spawnSync("node", ["lab/bin/check-packages.mjs"], {
      env: { ...env, TRIPLEX_PACK_ARTIFACT_ROOT: attemptRoot },
      encoding: "utf8",
      maxBuffer: 64 * 1024 ** 2,
    });
    const output = `${command.stdout}${command.stderr}`;
    writeFileSync(join(currentDir, "gate.log"), output);
    assert.equal(readdirSync(attemptRoot).length, 1);
    const attempt = join(attemptRoot, readdirSync(attemptRoot)[0]);
    const receipt = JSON.parse(readFileSync(join(attempt, "receipt.json")));
    // [EXP-PACK] Why: an observed verdict needs this attempt, source and bytes. Rejected:
    // accepting a printed PASS alone (could be a previous run or an unrelated process).
    assert.equal(receipt.root, root);
    assert.equal(receipt.head, head);
    assert(Date.parse(receipt.startedAt) >= Date.parse(startedAt));
    assert(Date.parse(receipt.finishedAt) >= Date.parse(receipt.startedAt));
    assert.equal(receipt.inputs["lab/bin/check-packages.mjs"], gateHash);
    if (test.edit) assert.equal(receipt.inputs[test.edit], sha(readFileSync(test.edit)));
    assert.equal(receipt.status, test.expected, output);
    assert.equal(command.status === 0, test.expected === "PASS", output);
    assert(
      output.includes("DuckDB: OUT-OF-SCOPE") &&
        output.includes("TS4023") &&
        output.includes("unresolved and not tested"),
    );
    if (test.error) assert(output.includes(test.error), output);
    const commands = JSON.parse(readFileSync(join(attempt, "commands.json")));
    for (const item of commands) assert.equal(item.outputSha256, sha(readFileSync(item.log)));
    const observed = {
      id: test.id,
      startedAt,
      finishedAt: new Date().toISOString(),
      sourceHead: head,
      gateSha256: gateHash,
      exit: command.status,
      gateStatus: receipt.status,
      attempt,
      commands: commands.length,
      packages: receipt.packages.map((p) => p.name),
      duckdbVisible: true,
    };
    if (test.expected === "PASS") {
      const consumer = join(attempt, "consumer");
      assert(
        readFileSync(commands.find((c) => c.command === "npm").log, "utf8").includes("npm offline"),
      );
      for (const packed of receipt.packages) {
        assert.equal(packed.sha256, sha(readFileSync(packed.tarball)));
        const installed = join(consumer, "node_modules", packed.name);
        assert(realpathSync(installed).startsWith(consumer + "/node_modules/"));
        const packedIndex = execFileSync("tar", ["-xOzf", packed.tarball, "package/dist/index.js"]);
        assert.equal(sha(readFileSync(join(installed, "dist/index.js"))), sha(packedIndex));
        assert(!packed.entries.some((e) => e.includes("CX_VPACK_STALE")));
      }
      observed.installedPackageBytesMatch = true;
      observed.consumerPackagesLocal = true;
    }
    if (test.id === "baseline") {
      for (const name of names) assert(!existsSync(`packages/${name}/dist/CX_VPACK_STALE.txt`));
      observed.staleSentinelsRemoved = names.length;
      const specifiers = receipt.packages.flatMap((packed) =>
        Object.keys(
          JSON.parse(
            readFileSync(join(attempt, "consumer/node_modules", packed.name, "package.json")),
          ).exports,
        ).map((key) => (key === "." ? packed.name : packed.name + key.slice(1))),
      );
      assert.deepEqual(receipt.imports, specifiers);
      assert.equal(
        commands.filter((item) => item.command === "node" && item.args.includes("--eval")).length,
        specifiers.length,
      );
      assert.equal(
        receipt.workspace.length,
        receipt.packages.length + Object.keys(receipt.exclusions).length,
      );
      observed.freshImports = specifiers.length;
    }
    if (test.id === "added-package") {
      assert(!receipt.packages.some((p) => p.name.includes("cx-vpack-added")));
      assert(
        receipt.workspace.some((item) => item.name === "@triplex-build/triplex-cx-vpack-added"),
      );
      assert(
        commands.some(
          (item) => item.args.includes("@triplex-build/triplex-cx-vpack-added") && item.exit !== 0,
        ),
      );
      assert.equal(
        receipt.inputs["packages/cx-vpack-added/package.json"],
        sha(readFileSync("packages/cx-vpack-added/package.json")),
      );
      observed.newWorkspacePackageBuildRejected = true;
    }
    if (test.id === "qlever-runtime-throw") {
      const consumer = join(attempt, "consumer");
      const control = spawnSync(
        "node",
        ["--input-type=module", "-e", 'await import("@triplex-build/triplex-qlever")'],
        { cwd: consumer, env, encoding: "utf8" },
      );
      writeFileSync(
        join(currentDir, "direct-import-control.log"),
        `${control.stdout}${control.stderr}`,
      );
      assert.notEqual(control.status, 0);
      assert(control.stderr.includes("CX_VPACK_QLEVER_RUNTIME_THROW"));
      observed.directImportExit = control.status;
      const pack = receipt.packages.find((p) => p.name === "@triplex-build/triplex-qlever");
      assert(
        execFileSync("tar", ["-xOzf", pack.tarball, "package/dist/index.js"], {
          encoding: "utf8",
        }).includes("CX_VPACK_QLEVER_RUNTIME_THROW"),
      );
      observed.freshRuntimeMutationInTarball = true;
    }
    if (test.id === "broken-declaration")
      assert(commands.at(-1).command === "npx", "must reach consumer compiler");
    if (test.id === "stale-dist-source-error")
      assert.equal(commands.length, 2, "workspace list then fresh build fails before pack");
    results.push(observed);
    writeFileSync(join(evidence, "results.json"), JSON.stringify(results, null, 2) + "\n");
    console.log(JSON.stringify(observed));
  } finally {
    if (test.edit) writeFileSync(test.edit, original);
    if (test.id === "added-package") rmSync("packages/cx-vpack-added", { recursive: true });
  }
}
assert.equal(
  new Set(results.map((result) => result.id)).size,
  cases.length,
  "all seven cases observed",
);
assert.equal(sha(readFileSync("lab/bin/check-packages.mjs")), gateHash);
assert.equal(
  execFileSync(
    "git",
    [
      "diff",
      "--",
      "packages",
      "lab/bin/check-packages.mjs",
      "scripts/check-packages.mjs",
      "pnpm-lock.yaml",
      "lab/acceptance",
    ],
    { encoding: "utf8" },
  ),
  "",
);
const originalChecker = readFileSync("scripts/check-packages.mjs");
const checkerAtBase = execFileSync("git", ["show", "0aa97f0f:scripts/check-packages.mjs"]);
assert.equal(sha(originalChecker), sha(checkerAtBase));
const contractDiff = execFileSync("git", ["diff", "0aa97f0f", "--", "lab/acceptance"], {
  encoding: "utf8",
});
assert.equal(contractDiff, "");
writeFileSync(
  join(evidence, "audit.json"),
  JSON.stringify(
    {
      sourceHead: head,
      gateSha256: gateHash,
      originalCheckerBeforeSha256: sha(checkerAtBase),
      originalCheckerAfterSha256: sha(originalChecker),
      acceptanceDiffFromPreExperiment: contractDiff,
      fixtureSourceRestored: true,
      engines: "none; no engine slot used",
      npmOffline: true,
      npmCacheSource: env.CX_VPACK_CACHE,
      consumerNodeModulesReused: false,
    },
    null,
    2,
  ) + "\n",
);
const sourceCopy = join(evidence, "regression-source");
mkdirSync(sourceCopy);
for (const file of ["regressions.mjs", "npm-offline.mjs", "inject-declaration.mjs"])
  writeFileSync(join(sourceCopy, file), readFileSync(join(import.meta.dirname, file)));
writeFileSync(join(import.meta.dirname, "ROUND2-results.json"), readFileSync(resultFile));
// [EXP-PACK] Why: retain bulky raw bytes outside git, and re-read every listed hash.
// Rejected: committing consumer installations or caches (large and not review evidence).
function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (["node_modules", "npm-cache", "bin"].includes(entry.name)) return [];
    const path = join(dir, entry.name);
    return entry.isDirectory() ? files(path) : entry.isFile() ? [path] : [];
  });
}
const manifestEntries = files(evidence)
  .filter((path) => !["review.log", "review-r2.log"].some((name) => path === join(evidence, name)))
  .sort()
  .map((path) => ({ path, hash: sha(readFileSync(path)) }));
for (const entry of manifestEntries) assert.equal(sha(readFileSync(entry.path)), entry.hash);
writeFileSync(
  join(import.meta.dirname, "ROUND2-SHA256SUMS"),
  manifestEntries
    .map((entry) => `${entry.hash}  ${entry.path.slice(evidence.length + 1)}`)
    .join("\n") + "\n",
);
console.log(
  "EXP-PACK round 2 completed seven builder regressions; this is not independent acceptance.",
);

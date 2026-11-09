// [CX-VPACK-R2] Why: independently exercise inventory and evaluated exports against
// exact fresh tarballs. Rejected: accepting builder regression receipts as verification.
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
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

const root = resolve(import.meta.dirname, "../../..");
process.chdir(root);
const evidence = resolve(
  process.env.CX_VPACK_R2_EVIDENCE ??
    "/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VPACK/round2",
);
const resume = process.env.CX_VPACK_R2_RESUME === "1";
assert(!existsSync(evidence) || resume, "Preserve previous evidence; use a new directory");
mkdirSync(evidence, { recursive: true });
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const target = execFileSync("git", ["rev-parse", "6a7551b6"], { encoding: "utf8" }).trim();
const head = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const gate = "lab/bin/check-packages.mjs";
const gateHash = sha(readFileSync(gate));
assert.equal(gateHash, sha(execFileSync("git", ["show", `${target}:${gate}`])));
const policy = "lab/config/pack-exclusions.json";
const policyHash = sha(readFileSync(policy));
const exclusions = JSON.parse(readFileSync(policy));
const originalSourceDiff = () =>
  execFileSync(
    "git",
    [
      "diff",
      target,
      "--",
      "packages",
      "examples",
      "test",
      gate,
      policy,
      "scripts/check-packages.mjs",
      "pnpm-lock.yaml",
      "lab/acceptance",
    ],
    { encoding: "utf8" },
  );
assert.equal(originalSourceDiff(), "");
const sourceCopy = join(evidence, resume ? "reviewer-source-rerun" : "reviewer-source");
mkdirSync(sourceCopy);
for (const file of ["review-round2.mjs", "npm-offline.mjs"])
  writeFileSync(join(sourceCopy, file), readFileSync(join(import.meta.dirname, file)));
const heavyDir = "/Users/sam/projects/triplex-db-2/lab/locks/heavy";
const holder = readdirSync(heavyDir)
  .map((slot) => ({ slot, ...JSON.parse(readFileSync(join(heavyDir, slot, "owner.json"))) }))
  .find((item) => item.pid === process.ppid);
assert(holder, "The controller must run inside an admitted heavy slot");
const realNpm = execFileSync("which", ["npm"], { encoding: "utf8" }).trim();
const bin = join(evidence, "bin");
mkdirSync(bin, { recursive: true });
if (!existsSync(join(bin, "npm")))
  symlinkSync(join(import.meta.dirname, "npm-offline.mjs"), join(bin, "npm"));
const env = {
  ...process.env,
  PATH: `${bin}:${process.env.PATH}`,
  npm_config_offline: "true",
  npm_config_update_notifier: "false",
  CX_VPACK_NPM: realNpm,
  CX_VPACK_CACHE:
    "/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-PACK/attempts/triplex-pack-UMylBa/npm-cache",
};
const inventory = () =>
  JSON.parse(
    execFileSync(
      "pnpm",
      [
        "--config.store-dir=/Users/sam/projects/triplex-db-2/.pnpm-store",
        "--recursive",
        "list",
        "--depth",
        "-1",
        "--json",
      ],
      { env, encoding: "utf8" },
    ),
  );
const baselineWorkspace = inventory();
const selected = baselineWorkspace.filter((item) => !Object.hasOwn(exclusions, item.name));
assert.equal(selected.length, 12);
assert.equal(Object.keys(exclusions).length, 13);
writeFileSync(
  join(evidence, resume ? "binding-rerun.json" : "binding.json"),
  JSON.stringify(
    {
      target,
      head,
      root,
      gateHash,
      policyHash,
      holder,
      baselineWorkspace,
      exclusions,
      offline: true,
    },
    null,
    2,
  ),
);
const entryFile = "packages/qlever/src/CXVPACKRound2Entry.ts";
const specifier = "@triplex-build/triplex-qlever/cx-vpack-round2";
const results = resume ? JSON.parse(readFileSync(join(evidence, "results.json"))) : [];
if (resume)
  writeFileSync(join(evidence, "results-before-resume.json"), JSON.stringify(results, null, 2));
const tests = [
  {
    id: "baseline",
    status: "PASS",
    setup() {
      for (const item of selected) {
        mkdirSync(join(item.path, "dist"), { recursive: true });
        writeFileSync(join(item.path, "dist/CX_VPACK_R2_STALE.txt"), "must be removed");
      }
      return [];
    },
  },
  {
    id: "added-package",
    status: "FAIL",
    marker: "CX_VPACK_ADDED_BUILD_MUST_FAIL",
    setup() {
      mkdirSync("packages/cx-vpack-added");
      writeFileSync(
        "packages/cx-vpack-added/package.json",
        JSON.stringify(
          {
            name: "@triplex-build/triplex-cx-vpack-added",
            version: "0.1.0",
            private: true,
            type: "module",
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
      assert(inventory().some((item) => item.name === "@triplex-build/triplex-cx-vpack-added"));
      return ["packages/cx-vpack-added/package.json"];
    },
  },
  {
    id: "qlever-runtime-throw",
    status: "FAIL",
    marker: "CX_VPACK_QLEVER_RUNTIME_THROW",
    setup() {
      appendFileSync(
        "packages/qlever/src/index.ts",
        '\n// [CX-VPACK-R2] Why: recheck the original runtime gap. Rejected: resolution-only checks.\nthrow new Error("CX_VPACK_QLEVER_RUNTIME_THROW");\n',
      );
      return ["packages/qlever/src/index.ts"];
    },
  },
  {
    id: "new-export-success",
    status: "PASS",
    newEntry: true,
    setup(token) {
      newExport(
        `console.log("CX_VPACK_R2_NEW_ENTRY:" + JSON.stringify({token: ${JSON.stringify(token)}, pid: process.pid, cwd: process.cwd(), url: import.meta.url}));\nexport const marker = ${JSON.stringify(token)};\n`,
      );
      return ["packages/qlever/package.json", entryFile];
    },
  },
  {
    id: "new-export-throw",
    status: "FAIL",
    marker: "CX_VPACK_R2_NEW_ENTRY_THROW",
    newEntry: true,
    setup() {
      newExport(
        'export const marker = "throw-control";\nthrow new Error("CX_VPACK_R2_NEW_ENTRY_THROW");\n',
      );
      return ["packages/qlever/package.json", entryFile];
    },
  },
];
function newExport(source) {
  const manifest = JSON.parse(readFileSync("packages/qlever/package.json"));
  manifest.exports["./cx-vpack-round2"] = {
    types: "./dist/CXVPACKRound2Entry.d.ts",
    import: "./dist/CXVPACKRound2Entry.js",
  };
  writeFileSync("packages/qlever/package.json", JSON.stringify(manifest, null, 2) + "\n");
  writeFileSync(
    entryFile,
    "// [CX-VPACK-R2] Why: an added export must be evaluated. Rejected: assuming the initial 22 are exhaustive.\n" +
      source,
  );
}
for (const test of tests.filter((test) => !results.some((result) => result.id === test.id))) {
  const disk = statfsSync(root);
  assert(disk.bavail * disk.bsize >= 5 * 1024 ** 3, "host disk free floor");
  const dir = join(evidence, `${test.id}${resume ? "-rerun" : ""}`);
  mkdirSync(dir);
  const originals = new Map(
    ["packages/qlever/package.json", "packages/qlever/src/index.ts"].map((path) => [
      path,
      readFileSync(path),
    ]),
  );
  const startedAt = new Date().toISOString();
  const token = randomUUID();
  try {
    const fixtures = test.setup(token);
    const fixtureHashes = Object.fromEntries(
      fixtures.map((path, i) => {
        const bytes = readFileSync(path);
        writeFileSync(join(dir, `fixture-${i}.bytes`), bytes);
        return [path, sha(bytes)];
      }),
    );
    writeFileSync(
      join(dir, "fixture-binding.json"),
      JSON.stringify({ token, fixtureHashes }, null, 2),
    );
    writeFileSync(
      join(dir, "fixture.diff"),
      execFileSync("git", ["diff", "--", "packages/qlever"]),
    );
    const attempts = join(dir, "attempts");
    const run = spawnSync("node", [gate], {
      env: { ...env, TRIPLEX_PACK_ARTIFACT_ROOT: attempts },
      encoding: "utf8",
      maxBuffer: 64 * 1024 ** 2,
    });
    const output = `${run.stdout}${run.stderr}`;
    writeFileSync(join(dir, "gate.log"), output);
    assert.equal(readdirSync(attempts).length, 1);
    const attempt = join(attempts, readdirSync(attempts)[0]);
    const receipt = JSON.parse(readFileSync(join(attempt, "receipt.json")));
    // [CX-VPACK-R2] Why: verdicts need this source, fixture and fresh admitted attempt.
    // Rejected: trusting exit status without receipt/content checks.
    assert.equal(receipt.head, head);
    assert.equal(receipt.root, root);
    assert.equal(receipt.inputs[gate], gateHash);
    assert.equal(receipt.inputs[policy], policyHash);
    assert(Date.parse(receipt.startedAt) >= Date.parse(startedAt));
    assert(Date.parse(receipt.finishedAt) >= Date.parse(receipt.startedAt));
    for (const [path, hash] of Object.entries(fixtureHashes))
      assert.equal(receipt.inputs[path], hash);
    assert.equal(receipt.status, test.status, output);
    assert.equal(run.status, test.status === "PASS" ? 0 : 1, output);
    if (test.marker) assert(output.includes(test.marker), output);
    assert(output.includes("DuckDB: OUT-OF-SCOPE") && output.includes("unresolved and not tested"));
    const commands = JSON.parse(readFileSync(join(attempt, "commands.json")));
    for (const command of commands)
      assert.equal(sha(readFileSync(command.log)), command.outputSha256);
    const imports = commands.filter(
      (command) => command.command === "node" && command.args.includes("--eval"),
    );
    const consumer = join(attempt, "consumer");
    const result = {
      id: test.id,
      token,
      startedAt,
      finishedAt: new Date().toISOString(),
      target,
      head,
      gateHash,
      holder,
      attempt,
      gateStatus: receipt.status,
      exit: run.status,
      fixtureHashes,
      commands: commands.length,
      importCommands: imports.length,
      completedImports: receipt.imports,
    };
    if (test.id === "added-package") {
      assert.equal(receipt.workspace.length, baselineWorkspace.length + 1);
      assert(!Object.hasOwn(receipt.exclusions, "@triplex-build/triplex-cx-vpack-added"));
      assert.equal(commands.length, 2, "inventory then actual selected build");
      assert(commands[1].args.includes("@triplex-build/triplex-cx-vpack-added"));
      assert.equal(imports.length, 0);
      result.addedPackageBuildSelected = true;
    }
    if (test.status === "PASS") {
      assert.equal(receipt.workspace.length, baselineWorkspace.length);
      assert.equal(receipt.packages.length, selected.length);
      assert.deepEqual(receipt.exclusions, exclusions);
      for (const item of receipt.workspace)
        assert(
          receipt.packages.some((p) => p.name === item.name) !==
            Object.hasOwn(receipt.exclusions, item.name),
        );
      for (const [name, reason] of Object.entries(exclusions))
        assert(
          reason.trim() &&
            output.includes(reason) &&
            (output.includes(name) || name.endsWith("-duckdb")),
        );
      const expectedSpecifiers = [];
      for (const packed of receipt.packages) {
        assert.equal(sha(readFileSync(packed.tarball)), packed.sha256);
        assert(!packed.entries.some((entry) => entry.includes("CX_VPACK_R2_STALE")));
        const manifest = JSON.parse(
          execFileSync("tar", ["-xOzf", packed.tarball, "package/package.json"], {
            encoding: "utf8",
          }),
        );
        for (const key of Object.keys(manifest.exports))
          expectedSpecifiers.push(key === "." ? manifest.name : manifest.name + key.slice(1));
        const installed = join(consumer, "node_modules", packed.name);
        assert(realpathSync(installed).startsWith(consumer + "/node_modules/"));
        assert.equal(
          sha(readFileSync(join(installed, "dist/index.js"))),
          sha(execFileSync("tar", ["-xOzf", packed.tarball, "package/dist/index.js"])),
        );
      }
      assert.deepEqual(receipt.imports, expectedSpecifiers);
      assert.equal(imports.length, expectedSpecifiers.length);
      for (let i = 0; i < imports.length; i++) {
        assert.deepEqual(imports[i].args, [
          "--input-type=module",
          "--eval",
          `await import(${JSON.stringify(expectedSpecifiers[i])});`,
        ]);
        assert.equal(imports[i].cwd, consumer);
        assert.equal(imports[i].exit, 0);
      }
      result.workspaceAccounting = {
        total: receipt.workspace.length,
        checked: receipt.packages.length,
        excluded: Object.keys(receipt.exclusions).length,
      };
      result.exactInstalledRootBytesChecked = receipt.packages.length;
      if (test.id === "baseline") {
        assert.equal(imports.length, 22);
        for (const item of selected)
          assert(!existsSync(join(item.path, "dist/CX_VPACK_R2_STALE.txt")));
        result.staleSentinelsRemoved = selected.length;
      }
    }
    if (test.newEntry) {
      const imported = imports.find(
        (command) => command.args.at(-1) === `await import(${JSON.stringify(specifier)});`,
      );
      assert(imported, "new subpath must have its own evaluated import");
      result.newEntryImportCommand = imported;
      const packed = receipt.packages.find((item) => item.name === "@triplex-build/triplex-qlever");
      assert.equal(sha(readFileSync(packed.tarball)), packed.sha256);
      const packedBytes = execFileSync("tar", [
        "-xOzf",
        packed.tarball,
        "package/dist/CXVPACKRound2Entry.js",
      ]);
      assert.equal(
        sha(packedBytes),
        sha(
          readFileSync(
            join(consumer, "node_modules/@triplex-build/triplex-qlever/dist/CXVPACKRound2Entry.js"),
          ),
        ),
      );
      if (test.status === "PASS") {
        assert.equal(imports.length, 23);
        const line = readFileSync(imported.log, "utf8").trim();
        assert(line.startsWith("CX_VPACK_R2_NEW_ENTRY:"));
        const marker = JSON.parse(line.slice("CX_VPACK_R2_NEW_ENTRY:".length));
        assert.equal(marker.token, token);
        assert.equal(marker.cwd, consumer);
        assert(
          marker.url.includes(
            "/consumer/node_modules/@triplex-build/triplex-qlever/dist/CXVPACKRound2Entry.js",
          ),
        );
        assert.notEqual(marker.pid, receipt.pid);
        assert.notEqual(marker.pid, process.pid);
        result.importEvaluationMarker = marker;
      } else assert.equal(imported.exit, 1);
    }
    if (test.id === "qlever-runtime-throw") {
      const imported = imports.at(-1);
      assert.equal(imported.args.at(-1), 'await import("@triplex-build/triplex-qlever");');
      assert.equal(imported.exit, 1);
      const direct = spawnSync(
        "node",
        ["--input-type=module", "--eval", 'await import("@triplex-build/triplex-qlever");'],
        { cwd: consumer, env, encoding: "utf8" },
      );
      writeFileSync(join(dir, "direct-import.log"), `${direct.stdout}${direct.stderr}`);
      assert.equal(direct.status, 1);
      assert(direct.stderr.includes(test.marker));
      result.directImportExit = direct.status;
    }
    results.push(result);
    writeFileSync(join(evidence, "results.json"), JSON.stringify(results, null, 2));
    console.log(
      JSON.stringify({
        id: test.id,
        gateStatus: receipt.status,
        commands: commands.length,
        imports: imports.length,
        attempt,
      }),
    );
  } finally {
    for (const [path, bytes] of originals) writeFileSync(path, bytes);
    if (existsSync(entryFile)) rmSync(entryFile);
    if (existsSync("packages/cx-vpack-added"))
      rmSync("packages/cx-vpack-added", { recursive: true });
  }
}
assert.equal(results.length, tests.length);
assert.equal(originalSourceDiff(), "");
assert.equal(sha(readFileSync(gate)), gateHash);
writeFileSync(
  join(evidence, "audit.json"),
  JSON.stringify(
    {
      reviewedTarget: target,
      executionHead: head,
      holder,
      gateHash,
      policyHash,
      fixtureSourcesRestored: true,
      productAndAcceptanceDiffFromTarget: "",
      engines: "none",
      cases: results.length,
    },
    null,
    2,
  ),
);
writeFileSync(
  join(import.meta.dirname, "ROUND2-results.json"),
  JSON.stringify(results, null, 2) + "\n",
);
function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (["node_modules", "npm-cache", "bin"].includes(entry.name)) return [];
    const path = join(dir, entry.name);
    return entry.isDirectory() ? files(path) : entry.isFile() ? [path] : [];
  });
}
// [CX-VPACK-R2] Why: bind all retained proof bytes and reread hashes under admission.
// Rejected: treating the evidence manifest itself as a semantic success check.
const manifest = files(evidence)
  .sort()
  .map((path) => ({ path, sha256: sha(readFileSync(path)) }));
for (const item of manifest) assert.equal(sha(readFileSync(item.path)), item.sha256);
writeFileSync(
  join(import.meta.dirname, "ROUND2-SHA256SUMS"),
  manifest.map((item) => `${item.sha256}  ${item.path.slice(evidence.length + 1)}`).join("\n") +
    "\n",
);
console.log(
  `Completed ${results.length} independent observations; ${manifest.length} retained evidence hashes reread.`,
);

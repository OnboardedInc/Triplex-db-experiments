#!/usr/bin/env node
// Run a public contract check with create-only evidence and source-drift detection.
import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  readdirSync,
  readFileSync,
  mkdirSync,
  writeFileSync,
  openSync,
  closeSync,
  existsSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runBoundedChild } from "./xtdb-budget-runner.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const value = (key, fallback) => (args.includes(key) ? args[args.indexOf(key) + 1] : fallback);
const mode = value("--mode", "suite");
const backend = process.env.TRIPLEX_BACKEND ?? "xtdb";
if (!["xtdb", "qlever"].includes(backend))
  throw new TypeError("TRIPLEX_BACKEND must be xtdb or qlever");
if (mode === "capacity" && backend !== "xtdb")
  throw new Error(
    "Legacy XTDB native capacity control is not a QLever implementation; use shared public scale/pilot gates",
  );
if (
  !["suite", "cases", "pilot", "scale", "verify", "recovery", "capacity", "workloads"].includes(
    mode,
  )
)
  throw new Error(
    "--mode must be suite, cases, pilot, scale, verify, recovery, capacity or workloads",
  );
if (mode === "recovery" && backend !== "qlever")
  throw new Error("This retained-data recovery fixture belongs to QLever");
const fixedAdapterBudget = JSON.parse(
  readFileSync(path.join(root, "qualification/resource-profile.json"), "utf8"),
).adapterTotalMemoryMaximumBytes;
const adapterMemoryBytes = Number(value("--adapter-memory-bytes", String(fixedAdapterBudget)));
if (
  !Number.isSafeInteger(adapterMemoryBytes) ||
  adapterMemoryBytes <= 0 ||
  adapterMemoryBytes > fixedAdapterBudget
)
  throw new RangeError(
    "Adapter sub-budget must be a positive safe integer within the fixed total budget",
  );
const adapterBudgetProfile =
  adapterMemoryBytes === 1024 ** 3
    ? "paired-correctness-1GiB-each-v1"
    : adapterMemoryBytes === fixedAdapterBudget
      ? "single-controller-2GiB-v1"
      : "explicit-lower-adapter-budget";
const id = `${new Date().toISOString().replaceAll(/[:.]/g, "-")}-${randomUUID().slice(0, 8)}`;
const evidence = path.join(root, "qualification/evidence", backend);
mkdirSync(evidence, { recursive: true });
const prefix = path.join(evidence, `${mode}-${id}`);
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const sourceHashes = () => {
  const files = [
    "package.json",
    "pnpm-lock.yaml",
    `compose.${backend}.yaml`,
    backend === "xtdb" ? "xtdb-config.yaml" : "qlever-start.sh",
    "qualification/resource-profile.json",
    "scripts/xtdb-qualification.mjs",
    "scripts/triplex-qualification.mjs",
    "scripts/triplex-resources.mjs",
    "scripts/xtdb-budget-runner.mjs",
    "scripts/triplex-workloads.ts",
    "scripts/triplex-public-pilot.ts",
    "scripts/triplex-scale.ts",
    "scripts/triplex-scale-verify.ts",
    "scripts/triplex-qlever-recovery.ts",
    "scripts/triplex-lease.py",
    "packages/qualification/package.json",
    "packages/core/package.json",
    "packages/testkit/package.json",
    "packages/qualification/vitest.config.ts",
    "qualification/workloads/temporal-workloads.json",
    "qualification/workloads/engine_cases.mjs",
    `packages/${backend}/package.json`,
    ...(backend === "qlever"
      ? ["compose.qlever-compact-v3.yaml", "scripts/qlever-compact-v3-ready.py"]
      : []),
  ];
  const collect = (directory) => {
    for (const entry of readdirSync(path.join(root, directory), { withFileTypes: true })) {
      const relative = path.join(directory, entry.name);
      if (entry.isDirectory()) collect(relative);
      else if (entry.isFile()) files.push(relative);
    }
  };
  for (const directory of [
    "packages/core/src",
    "packages/testkit/src",
    `packages/${backend}/src`,
    `packages/${backend}/test`,
    "packages/qualification/src",
    "packages/qualification/test",
    "packages/qualification/workloads",
  ]) {
    if (existsSync(path.join(root, directory))) collect(directory);
  }
  if (mode === "capacity") collect("packages/xtdb/workloads");
  // Every mode imports the selected backend through its public compiled export.
  // Source stability alone cannot establish which runtime implementation ran.
  for (const directory of [
    "packages/core/dist",
    "packages/testkit/dist",
    `packages/${backend}/dist`,
    "packages/qualification/dist",
  ]) {
    if (existsSync(path.join(root, directory))) collect(directory);
  }
  return Object.fromEntries(
    files.sort().map((file) => [file, hash(readFileSync(path.join(root, file)))]),
  );
};
const before = sourceHashes();
const nativeProfileReadiness =
  backend === "qlever" && process.env.TRIPLEX_RESOURCE_PROFILE === "qlever-compact-v3"
    ? JSON.parse(
        execFileSync(
          "python3",
          [path.join(root, "scripts/qlever-compact-v3-ready.py"), "--check"],
          { encoding: "utf8" },
        ),
      )
    : null;
const resource = JSON.parse(
  execFileSync(
    process.execPath,
    [
      path.join(root, "scripts/triplex-resources.mjs"),
      "--planned-bytes",
      String(32 * 1024 * 1024),
      "--require-server",
    ],
    { encoding: "utf8" },
  ),
);
const environment = {
  ...process.env,
  NODE_OPTIONS: "--max-old-space-size=1536",
  TRIPLEX_INTEGRATION: "1",
  TRIPLEX_BACKEND: backend,
  TRIPLEX_CONFORMANCE_CASES: mode === "cases" ? "1" : "0",
};
const command =
  mode === "recovery"
    ? [
        "pnpm@10.11.0",
        "exec",
        "tsx",
        "scripts/triplex-qlever-recovery.ts",
        "--output",
        `${prefix}-recovery.json`,
      ]
    : mode === "verify"
      ? ["pnpm@10.11.0", "exec", "tsx", "scripts/triplex-scale-verify.ts", value("--input", "")]
      : mode === "workloads"
        ? [
            "pnpm@10.11.0",
            "exec",
            "tsx",
            "scripts/triplex-workloads.ts",
            "--output",
            `${prefix}-workloads.json`,
            ...(value("--workloads", "") ? ["--workloads", value("--workloads", "")] : []),
          ]
        : mode === "capacity"
          ? [
              "pnpm@10.11.0",
              "exec",
              "tsx",
              "scripts/xtdb-capacity-experiments.ts",
              "--output",
              `${prefix}-capacity.json`,
            ]
          : mode === "scale"
            ? [
                "pnpm@10.11.0",
                "exec",
                "tsx",
                "scripts/triplex-scale.ts",
                "--entities",
                value("--entities", "100000"),
                "--facts-per-entity",
                value("--facts-per-entity", "1"),
                "--batch-entities",
                value("--batch-entities", "500"),
                "--calibration",
                value("--calibration", ""),
                ...(value("--resume", "") ? ["--resume", value("--resume", "")] : []),
                "--output",
                `${prefix}-scale.json`,
              ]
            : mode === "pilot"
              ? [
                  "pnpm@10.11.0",
                  "exec",
                  "tsx",
                  "scripts/triplex-public-pilot.ts",
                  "--entities",
                  value("--entities", "100"),
                  "--facts-per-entity",
                  value("--facts-per-entity", "1"),
                  "--samples",
                  value("--samples", "3"),
                  "--output",
                  `${prefix}-pilot.json`,
                ]
              : [
                  "pnpm@10.11.0",
                  "--filter",
                  "@triplex-build/triplex-qualification",
                  "exec",
                  "vitest",
                  "run",
                  "test/runtime-conformance.test.ts",
                  "--reporter=verbose",
                  "--reporter=json",
                  `--outputFile.json=${prefix}-vitest.json`,
                ];
const record = {
  format: "triplex-backend-qualification-run/2",
  backend,
  mode,
  id,
  timestampUtc: new Date().toISOString(),
  status: "RUNNING",
  command: ["npx", ...command],
  sourceSha256Before: before,
  resourceAdmission: resource,
  nativeProfileReadiness,
  adapterBudget: {
    profile: adapterBudgetProfile,
    reservedBytesThisController: adapterMemoryBytes,
    fixedTotalBytes: fixedAdapterBudget,
    scheduling:
      "At most two 1GiB gate controllers; all other native clients held. A 2GiB controller runs alone.",
    limitation:
      "Sampled owned child group plus controller RSS; operational reservations are not physical aggregate containment.",
  },
  ...(mode === "verify" ? { inputReceipt: value("--input", "") } : {}),
  scope:
    mode === "cases"
      ? "Unchanged upstream cases individually isolated; diagnostic only"
      : mode === "suite"
        ? "Complete unchanged upstream runtimeConformance; base contract only"
        : mode === "recovery"
          ? "Independent read recovery of 45 retained typed facts, historical event source cut and acknowledged receipts; no write-failure atomicity claim"
          : mode === "verify"
            ? "Fresh public distinct-entity/count/sum/receipt verification of a retained scale prefix"
            : mode === "scale"
              ? "Measured-admission public entity loading and small reader correctness; no SLO/ingestion qualification"
              : mode === "capacity"
                ? "Three simultaneous isolated-scope batch-width correctness experiments; no latency qualification"
                : mode === "workloads"
                  ? "Copied twenty-family/71-case packet through public Triplex mutations/Datalog, including reopened reads; functional only"
                  : "Bounded public pilot; no scale/SLO qualification",
};
writeFileSync(`${prefix}-receipt.json`, JSON.stringify(record, null, 2) + "\n", { flag: "wx" });
const fd = openSync(`${prefix}.log`, "wx");
const started = performance.now();
const adapterResources = await runBoundedChild("npx", command, {
  cwd: root,
  env: environment,
  stdio: ["ignore", fd, fd],
  memoryBytes: adapterMemoryBytes,
  timeoutMs: 15 * 60_000,
});
const exit = adapterResources.exit;
closeSync(fd);
const after = sourceHashes();
const changedFiles = [...new Set([...Object.keys(before), ...Object.keys(after)])].filter(
  (file) => before[file] !== after[file],
);
const sourceVerification = JSON.parse(
  execFileSync("python3", [path.join(root, "scripts/xtdb-source-manifest.py"), "--verify"], {
    encoding: "utf8",
    env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" },
  }),
);
Object.assign(record, {
  exit,
  adapterResources,
  elapsedMs: performance.now() - started,
  sourceSha256After: after,
  changedFiles,
  protectedSourceVerification: sourceVerification,
  status:
    adapterResources.termination || exit?.code !== 0
      ? "FAIL"
      : changedFiles.length
        ? "UNQUALIFIED_SOURCE_CHANGED"
        : "PASS",
});
if (mode === "workloads" && existsSync(`${prefix}-workloads.json`)) {
  const artifactPath = `${prefix}-workloads.json`;
  const bytes = readFileSync(artifactPath);
  const result = JSON.parse(bytes.toString("utf8"));
  record.resultArtifact = {
    format: "triplex-qualification-result-artifact/1",
    path: path.relative(root, artifactPath),
    bytes: bytes.length,
    sha256: hash(bytes),
    backend: result.backend,
    runId: result.runId,
    packetSha256: result.packetSha256,
  };
}
writeFileSync(`${prefix}-receipt.json`, JSON.stringify(record, null, 2) + "\n");
console.log(
  JSON.stringify({
    result: record.status,
    mode,
    receipt: `${prefix}-receipt.json`,
    log: `${prefix}.log`,
    changedFiles,
  }),
);
if (record.status !== "PASS") process.exitCode = 1;

// @ts-nocheck -- [EXP-CHECKJS-R2] dynamic collections, runtime Buffer-to-JSON coercion, or validated values without static narrowing. Binding errors remain checked by lab/bin/checkjs.mjs.
/** Freeze seed/load recipes using a freshly captured public backend input closure. Starts nothing. */
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { canonical, classes, makeOracle, recipeIdentity, sha256, validateSpec } from "./model.ts";
import { fixtureSchema } from "./schema.ts";

const root = path.resolve(import.meta.dirname, "../../..");
const args = process.argv.slice(2);
const option = (key, fallback) => (args.includes(key) ? args[args.indexOf(key) + 1] : fallback);
const baseFile = option("--base-manifest");
assert(baseFile, "Capture a fresh public backend manifest first");
const base = JSON.parse(await readFile(path.resolve(root, baseFile), "utf8"));
assert.equal(base.format, "triplex-devloop-job/1");
const id = option("--job");
assert.match(id ?? "", /^[a-z0-9][a-z0-9._-]{0,100}$/);
const stage = option("--stage", "load");
assert(["seed", "load"].includes(stage));
const directory = path.join(root, "qualification/load-jobs", id);
await mkdir(directory, { recursive: true });
const pins = new Map();
const pin = async (relative, role) => {
  const absolute = path.resolve(root, relative);
  assert(absolute.startsWith(root + path.sep));
  pins.set(relative, { path: relative, role, sha256: sha256(await readFile(absolute)) });
};
for (const input of base.inputs) {
  assert.equal(
    sha256(await readFile(path.resolve(root, input.path))),
    input.sha256,
    `Stale base closure: ${input.path}; capture again`,
  );
  pins.set(input.path, input);
}
for (const file of ["model.ts", "schema.ts", "dispatch.ts", "runner.ts", "prepare-job.mjs"])
  await pin(`packages/qualification/load/${file}`, file === "model.ts" ? "oracle" : "runner");
let specFile = option("--spec");
if (stage === "seed") {
  assert(!specFile, "Seed preparation creates an exclusive frozen specification");
  const spec = {
    format: "triplex-load-spec/1",
    id: option("--fixture-id", id),
    entities: Number(option("--entities", "1000")),
    factsPerEntity: Number(option("--facts-per-entity", "1")),
    instances: Number(option("--instances", "1")),
    batchFacts: 500,
    probeEntities: Number(option("--probe-entities", "64")),
    maximumWriterCommands: Number(option("--maximum-writes", "10")),
    validAt: 1.25,
    schema: fixtureSchema(Number(option("--facts-per-entity", "1"))),
    schemaSha256: sha256(canonical(fixtureSchema(Number(option("--facts-per-entity", "1"))))),
  };
  validateSpec(spec);
  specFile = path.relative(root, path.join(directory, "spec.json"));
  await writeFile(path.join(root, specFile), JSON.stringify(spec, null, 2) + "\n", { flag: "wx" });
}
assert(specFile, "Load preparation needs the existing frozen --spec");
const spec = JSON.parse(await readFile(path.resolve(root, specFile), "utf8"));
validateSpec(spec);
await pin(specFile, "fixture");
const relative = (file) => path.relative(root, path.resolve(root, file));
const expected = {
  format: "triplex-public-load-checks/1",
  queryPath: base.queryPath,
  status: "PASS",
  checks:
    stage === "seed"
      ? ["fresh-scopes", "seed-counts", "seed-positions"]
      : ["read-oracle", "returned-basis", "writer-reconciled", "queue-drained"],
};
// Repeats pin one shared check/oracle bundle. Per-job expected-file paths would
// silently change inputFingerprint even when all actual source bytes match.
const expectedFile = path.relative(
  root,
  path.join(path.dirname(path.resolve(root, specFile)), `checks-${base.queryPath}-${stage}.json`),
);
const expectedBytes = JSON.stringify(expected, null, 2) + "\n";
try {
  await writeFile(path.join(root, expectedFile), expectedBytes, { flag: "wx" });
} catch (cause) {
  if (cause.code !== "EEXIST") throw cause;
  assert.equal(await readFile(path.join(root, expectedFile), "utf8"), expectedBytes);
}
await pin(expectedFile, "oracle");
const commandArgs = [
  "packages/qualification/load/runner.ts",
  "--stage",
  stage,
  "--spec",
  specFile,
  "--output",
  "{RUN_ARTIFACTS}/report.json",
];
const env = { ...base.command.env };
// Three foundations remain three foundations. Both surfaces share the same
// recipe and can select the same frozen bundle; only one run may mutate an instance.
if (base.backend === "duckdb")
  env.DUCKDB_DATABASE_DIRECTORY = path.join(root, ".runtime/load-fixtures", spec.id, "duckdb");
let profile, oracleFile;
if (stage === "load") {
  const fixture = option("--fixture");
  assert(fixture, "Pin the actual seed-receipt bundle before load");
  const bundle = JSON.parse(await readFile(path.resolve(root, fixture), "utf8"));
  assert.equal(bundle.backend, base.backend);
  assert.equal(bundle.specSha256, sha256(canonical(spec)));
  await pin(relative(fixture), "fixture");
  // Repeats use one shared precomputed catalog containing every admitted scope.
  oracleFile = option("--oracle");
  if (!oracleFile) {
    oracleFile = path.relative(
      root,
      path.join(path.dirname(path.resolve(root, specFile)), `read-oracle-${base.backend}.json`),
    );
    const bytes = JSON.stringify(makeOracle(spec, bundle), null, 2) + "\n";
    try {
      await writeFile(path.join(root, oracleFile), bytes, { flag: "wx" });
    } catch (cause) {
      if (cause.code !== "EEXIST") throw cause;
      assert.equal(
        await readFile(path.join(root, oracleFile), "utf8"),
        bytes,
        "Frozen catalog differs",
      );
    }
  }
  await pin(relative(oracleFile), "oracle");
  const clients = Number(option("--clients", "32")),
    duration = Number(option("--duration-ms", "5000"));
  const mode = option("--mode", "closed-loop"),
    writerMode = option("--writer-mode", "rate");
  const phase = option("--phase", "diagnostic");
  assert(["diagnostic", "capacity-calibration", "measurement", "stress"].includes(phase));
  const instance = Number(option("--instance", "0"));
  assert(bundle.instances.some((receipt) => receipt.index === instance));
  const calibrationFile = option("--calibration");
  let writeRate = option("--write-rate", "0.2");
  if (calibrationFile) {
    const calibration = JSON.parse(await readFile(path.resolve(root, calibrationFile), "utf8"));
    assert.equal(calibration.format, "triplex-devloop-calibration/1");
    writeRate = String(calibration.writerRateCommandsPerSecond);
    await pin(relative(calibrationFile), "calibration");
  }
  if (phase === "measurement") assert(calibrationFile && clients === 256 && writerMode === "rate");
  if (phase === "capacity-calibration")
    assert(clients === 256 && writerMode === "closed-loop-capacity");
  assert([32, 256, 512, 1024].includes(clients));
  assert(Number.isSafeInteger(duration) && duration > 0 && duration <= 600_000);
  assert(
    writerMode !== "rate" ||
      Math.ceil((duration / 1000) * Number(writeRate)) <= spec.maximumWriterCommands,
  );
  const execution = {
    mode,
    writerMode,
    readRate: Number(option("--read-rate", "256")),
    writeRate: Number(writeRate),
    dispatch: Number(option("--dispatch", String(Math.min(32, clients)))),
    pending: Number(option("--pending", String(clients * 2))),
    readTimeoutMs: Number(option("--read-timeout-ms", "30000")),
    maximumReads: Number(option("--maximum-reads", "100000")),
    maximumWriterCommands: spec.maximumWriterCommands,
    fixtureInstances: spec.instances,
    timingPolicy: "monotonic-scheduled-offer-deadline/1",
  };
  assert(["closed-loop", "open-loop"].includes(mode));
  assert(["rate", "closed-loop-capacity"].includes(writerMode));
  for (const value of [
    execution.dispatch,
    execution.pending,
    execution.readTimeoutMs,
    execution.maximumReads,
  ])
    assert(Number.isSafeInteger(value) && value > 0);
  assert(execution.dispatch <= clients && execution.pending <= 100_000);
  if (mode === "closed-loop")
    assert(
      execution.pending >= clients - execution.dispatch,
      "Closed-loop needs one bounded outstanding request per client",
    );
  assert(
    Number.isFinite(execution.readRate) &&
      execution.readRate > 0 &&
      Number.isFinite(execution.writeRate) &&
      execution.writeRate > 0,
  );
  for (const [key, value] of [
    ["--fixture", fixture],
    ["--oracle", oracleFile],
    ["--instance", String(instance)],
    ["--clients", String(clients)],
    ["--duration-ms", String(duration)],
    ["--mode", mode],
    ["--dispatch", String(execution.dispatch)],
    ["--pending", String(execution.pending)],
    ["--read-rate", String(execution.readRate)],
    ["--writer-mode", writerMode],
    ["--write-rate", writeRate],
    ["--read-timeout-ms", String(execution.readTimeoutMs)],
    ["--maximum-reads", String(execution.maximumReads)],
  ])
    commandArgs.push(key, value);
  profile = {
    format: "triplex-devloop-load-profile/1",
    id: `${option("--profile", `point-current-history-${mode}-${writerMode}`)}-${sha256(canonical(execution)).slice(0, 24)}`,
    execution,
    clients,
    startMilliseconds: 0,
    endMilliseconds: duration,
    requiredClasses: [...classes],
    fixtureIdentity: recipeIdentity(spec),
    resourceIdentity: option("--resource-identity", "owned-three-foundations-fixed-defaults-v1"),
    cohortIdentity: option("--cohort", "diagnostic-no-performance-claim"),
    phase,
    synthetic: false,
    ...(clients >= 512 ? { overloadPolicy: "bounded-explicit-rejection" } : {}),
    ...(calibrationFile ? { calibration: relative(calibrationFile) } : {}),
  };
}
const memoryBytes = (base.backend === "duckdb" ? 2048 : 896) * 1024 ** 2;
const manifest = {
  ...base,
  id,
  kind: stage === "seed" ? "fixture" : "verification",
  author: option("--author", "xtdb-native-provider-owner"),
  problemId: stage === "seed" ? "bounded-load-fixture" : "read-priority-concurrency",
  logicalTaskId: stage === "seed" ? "load/fixture" : "load/point-current-history",
  hypothesis:
    stage === "seed"
      ? "The fixed generator writes the admitted number of distinct entities/facts using500-assertion atomic commands"
      : "Actual public current/history reads return independent recipe answers at their returned cuts while ten-entity corrections make visible progress",
  inspiration: [
    {
      reference: "packages/core/src/store/Triples.ts",
      mechanism: "Public writes, command reconciliation and opt-in actual read basis",
      adaptation:
        "Separate reader/writer runtime roots and independent expected answers; no racing reread of currentPosition for read cuts",
    },
    {
      reference: "qualification/devloop/compare.mjs",
      mechanism: "Scheduled offer latency and pinned returned-cut oracle checks",
      adaptation:
        "Raw complete-call events retain queues, failed offers and bounded tail drain; diagnostics cannot imply calibrated promotion",
    },
  ],
  command: { ...base.command, argv: [base.command.argv[0], ...commandArgs], env },
  resources: {
    ...base.resources,
    memoryBytes,
    diskBytes: Number(option("--disk-bytes", String(256 * 1024 ** 2))),
    timeoutMilliseconds: Number(option("--timeout-ms", "600000")),
  },
  inputs: [...pins.values()].sort((a, b) => a.path.localeCompare(b.path, "en")),
  evidence: {
    checks: [
      {
        key: stage === "seed" ? "load-seed" : "load-correctness",
        expectedInput: expectedFile,
        actual: "artifacts/results.json",
      },
    ],
    requiredCheckKeys: [stage === "seed" ? "load-seed" : "load-correctness"],
    ...(stage === "load"
      ? { events: "artifacts/events.jsonl", readOracleInput: relative(oracleFile) }
      : {}),
  },
  ...(profile ? { profile } : {}),
  retention: {
    scratch: "retain-forensic",
    meaning:
      "Fresh scope fixture, correction history and raw event bytes retained and charged. No application/history deletion or target-scale replicas implied.",
  },
};
// The generic process proof must not count a variable read count as a semantic pass.
// Exact checks above require actual oracle validation, visibility and a drained queue.
const manifestFile = path.join(directory, "manifest.json");
await writeFile(manifestFile, JSON.stringify(manifest, null, 2) + "\n", { flag: "wx" });
console.log(
  JSON.stringify({
    manifest: path.relative(root, manifestFile),
    stage,
    spec: specFile,
    instances: spec.instances,
    entities: spec.entities,
    factsPerEntity: spec.factsPerEntity,
    pinnedFiles: pins.size,
  }),
);

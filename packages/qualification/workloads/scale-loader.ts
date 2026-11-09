import { readLatencyRun } from "../../../lab/receipts/parse.ts";
import {
  latencyReceipt,
  connectionModeForBackend,
  recordedConnectionMode,
} from "../../../lab/receipts/latency.mjs";
/** Public transactional scale loading with conservative, measured admission. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Effect } from "effect";
import {
  EntityId,
  Triples,
  boolean,
  datetime,
  json,
  number,
  ref,
  string,
} from "@triplex-build/triplex";
import { Capabilities, DatabaseScope } from "@triplex-build/triplex/runtime";
import { loadQualificationBackend } from "@triplex-build/triplex-qualification";

const root = path.resolve(import.meta.dirname, "../../..");
const args = process.argv.slice(2);
const option = (key: string, fallback: string) =>
  args.includes(key) ? args[args.indexOf(key) + 1]! : fallback;
const entities = Number(option("--entities", "100000"));
const width = Number(option("--facts-per-entity", "1"));
const batchEntities = Number(option("--batch-entities", "500"));
const calibrationPath = path.resolve(option("--calibration", ""));
assert.ok(Number.isSafeInteger(entities) && entities > 0 && entities <= 10_000_000);
assert.ok([1, 10].includes(width));
assert.ok(Number.isSafeInteger(batchEntities) && batchEntities > 0 && batchEntities <= 1000);
assert.ok(
  calibrationPath.startsWith(path.join(root, "qualification") + path.sep),
  "Calibration must be owned evidence",
);
const calibration = JSON.parse(readFileSync(calibrationPath, "utf8"));
const resourceProfile = JSON.parse(
  readFileSync(path.join(root, "qualification/resource-profile.json"), "utf8"),
);
const phaseModel = calibration.format === "triplex-xtdb-capacity-model/2";
assert.equal(calibration.status, phaseModel ? "CALIBRATED_MODEL_V2" : "PASS_DIAGNOSTIC_ONLY");
assert.ok(
  Number.isFinite(
    phaseModel
      ? calibration.unitBytesPerDomainFact
      : calibration.observedOwnedDiskGrowthBytesPerDomainFact,
  ),
  "Measured disk growth is required",
);
// Fixed overhead in small pilots and concurrent server work can overstate this
// estimate; it remains conservative, and a blocked estimate is not an OOM claim.
let observedBytesPerFact = phaseModel
  ? calibration.unitBytesPerDomainFact
  : Math.max(4096, calibration.observedOwnedDiskGrowthBytesPerDomainFact);
const totalFacts = entities * width;
const resumeFile = option("--resume", "");
const prior = resumeFile ? readLatencyRun(path.resolve(resumeFile)).unwrap().data : null;
if (prior) {
  assert.equal(prior.factsPerEntity, width);
  assert.ok(prior.acknowledgedEntities < entities);
  assert.equal(
    prior.pendingCommand,
    null,
    "Reconcile any uncertain pending command before resuming",
  );
}
const backend = await loadQualificationBackend();
assert.equal(
  calibration.backend ?? "xtdb",
  backend.name,
  "Capacity calibration cannot be reused across backends",
);
if (prior?.backend) assert.equal(prior.backend, backend.name);
else if (prior)
  assert.equal(backend.name, "xtdb", "Legacy XTDB fixture cannot resume on another backend");
if (prior && backend.name === "qlever")
  assert.equal(
    recordedConnectionMode(prior),
    connectionModeForBackend(backend.name),
    "resume cannot mix connection modes",
  );
const runId = prior?.runId ?? randomUUID();
const scope = prior
  ? (prior.scope as DatabaseScope)
  : DatabaseScope.test(`${backend.name}-scale-${runId}`);
const firstEntity = prior?.acknowledgedEntities ?? 0;
const output = path.resolve(
  option(
    "--output",
    path.join(root, "qualification/evidence", `${backend.name}-scale-${randomUUID()}.json`),
  ),
);
assert.ok(output.startsWith(path.join(root, "qualification") + path.sep));
mkdirSync(path.dirname(output), { recursive: true });
const report: Record<string, unknown> = latencyReceipt({
  qleverConnectionMode: connectionModeForBackend(backend.name),
  format: "triplex-entity-scale-load/2",
  backend: backend.name,
  runId,
  scope,
  timestampUtc: new Date().toISOString(),
  status: "PREPARING",
  requestedDistinctEntities: entities,
  requestedActiveDomainFacts: totalFacts,
  factsPerEntity: width,
  relationshipCount: width === 10 ? entities : 0,
  graphShape: width === 10 ? "ring" : "none",
  presenceVersionEvents: "not-qualified",
  historicalDepth: 1,
  calibrationPath: path.relative(root, calibrationPath),
  initialBytesPerDomainFact: observedBytesPerFact,
  admissionModel: phaseModel
    ? calibration.formula
    : "max(4096, measured bytes/domain fact, observed incremental bytes/domain fact) times remaining facts times 4, plus full dataset times 2 for backup/restore overlap; conservative estimate, not physical allocation proof",
  admissionModelVersion: phaseModel ? 2 : 1,
  sourcePrefixReceipt: resumeFile || null,
  batchEntities,
  acknowledgedEntities: firstEntity,
  acknowledgedDomainFacts: firstEntity * width,
  commands: prior?.commands ?? [],
  diskAdmissions: [],
  limitations: [
    "Initial load/correctness gate only; numeric SLOs and representative/history/ingestion variants remain separate.",
    "Distinct domain entity count excludes Triplex internal journal entities; domain active facts exclude receipt/journal metadata.",
    "No performance qualification is inferred from loading or short reader checks.",
    "A blocked estimate is a capacity-admission result, not proof of physical impossibility.",
    "Fixtures and failed outcomes are retained; no deletion or budget increase is attempted.",
  ],
});
writeFileSync(output, JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
const save = () => writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
const admissions: unknown[] = [];
let initialOwnedBytes: number | undefined;
let acknowledgedFacts = firstEntity * width;
const admit = () => {
  const remaining = totalFacts - acknowledgedFacts;
  const planned = phaseModel
    ? 0
    : Math.ceil(observedBytesPerFact * (remaining * 4 + totalFacts * 2));
  let admission: Record<string, any>;
  try {
    admission = JSON.parse(
      execFileSync(
        process.execPath,
        [
          path.join(root, "scripts/triplex-resources.mjs"),
          "--planned-bytes",
          String(planned),
          "--require-server",
        ],
        { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
      ),
    );
  } catch (error) {
    const stdout = (error as { stdout?: string | Buffer }).stdout;
    admission = stdout
      ? JSON.parse(String(stdout))
      : { result: "BLOCKED", reasons: [String(error)] };
  }
  if (initialOwnedBytes === undefined && typeof admission["ownedBytes"] === "number")
    initialOwnedBytes = admission["ownedBytes"];
  if (
    !phaseModel &&
    acknowledgedFacts > 0 &&
    initialOwnedBytes !== undefined &&
    typeof admission["ownedBytes"] === "number"
  ) {
    observedBytesPerFact = Math.max(
      observedBytesPerFact,
      (admission["ownedBytes"] - initialOwnedBytes) / acknowledgedFacts,
    );
  }
  const phaseCalculations: Record<string, number> = {};
  if (phaseModel && admission["result"] === "ADMITTED") {
    const currentData = admission["databaseAllocatedBytes"].value;
    const finalData =
      currentData + remaining * observedBytesPerFact * calibration.uncertaintyMultiplier;
    phaseCalculations["currentDataBytes"] = currentData;
    phaseCalculations["projectedFinalDataBytes"] = finalData;
    phaseCalculations["loadingPeakOwnedBytes"] =
      admission["ownedBytes"] + 2 * (finalData - currentData) + finalData;
    phaseCalculations["stoppedBackupRestorePeakOwnedBytes"] =
      admission["ownedBytes"] - currentData + 3 * finalData;
    phaseCalculations["peakOwnedBytes"] = Math.max(
      phaseCalculations["loadingPeakOwnedBytes"]!,
      phaseCalculations["stoppedBackupRestorePeakOwnedBytes"]!,
    );
  }
  const revisedPlanned = phaseModel
    ? Math.max(0, Math.ceil((phaseCalculations["peakOwnedBytes"] ?? 0) - admission["ownedBytes"]))
    : Math.ceil(observedBytesPerFact * (remaining * 4 + totalFacts * 2));
  if (
    admission["result"] === "ADMITTED" &&
    revisedPlanned > planned &&
    (admission["ownedBytes"] + revisedPlanned > resourceProfile.ownedDiskMaximumBytes ||
      admission["host"].freeBytes.value - revisedPlanned < resourceProfile.hostFreeReserveBytes ||
      admission["dockerFilesystems"].value.some(
        (fs: { availableBytes: number }) =>
          fs.availableBytes - revisedPlanned < resourceProfile.dockerGuestFreeReserveBytes,
      ))
  ) {
    admission["result"] = "BLOCKED";
    admission["reasons"].push(
      "Updated measured bytes/fact would exceed fixed capacity or free-space reserve",
    );
  }
  admissions.push({
    ...admission,
    acknowledgedFacts,
    plannedWorstOverlapBytes: revisedPlanned,
    bytesPerDomainFact: observedBytesPerFact,
    ...(phaseModel ? { phaseCalculations } : {}),
  });
  report["diskAdmissions"] = admissions;
  save();
  if (admission["result"] !== "ADMITTED") throw new Error("BLOCKED_CAPACITY");
};
const entity = (index: number) => EntityId.make(`scale:${String(index).padStart(10, "0")}`);
const inputsFor = (index: number) => {
  const values = [
    number(index),
    string(`name-${index}`),
    boolean(index % 2 === 0),
    ref(entity((index + 1) % entities)),
    datetime(1000 + index),
    json({ index }),
    number(index % 7),
    string(`group-${index % 10}`),
    number(index + 0.5),
    boolean(true),
  ];
  return values.slice(0, width).map((value, field) => ({
    entityId: entity(index),
    attribute: field === 0 ? ":scale/index" : `:scale/field${field}`,
    value,
    validFrom: 1,
  }));
};
const query = {
  find: ["?count", "?sum"],
  where: [["?entity", ":scale/index", "?value"]],
  aggregate: [
    ["count", "?entity", "?count"],
    ["sum", "?value", "?sum"],
  ],
} as const;
const expected = { count: entities, sum: (entities * (entities - 1)) / 2 };
const verify = Effect.gen(function* () {
  const triples = yield* Triples;
  const result = yield* triples.queryAll(query, { basis: { validAt: 100 } });
  assert.deepEqual(
    { count: result.results[0]?.["?count"], sum: result.results[0]?.["?sum"] },
    expected,
  );
});
const program = Effect.gen(function* () {
  const triples = yield* Triples;
  const commands: unknown[] = [...(prior?.commands ?? [])];
  const loadStarted = performance.now();
  for (let start = firstEntity; start < entities; start += batchEntities) {
    yield* Effect.sync(admit);
    const count = Math.min(batchEntities, entities - start);
    const inputs = Array.from({ length: count }, (_, offset) => inputsFor(start + offset)).flat();
    const commandId = `${runId}:batch:${start}`;
    report["pendingCommand"] = { commandId, start, entities: count, assertions: inputs.length };
    save();
    const started = performance.now();
    const receipt = yield* triples.transact(
      inputs.map((input) => ({ op: "assert" as const, ...input })),
      { commandId },
    );
    acknowledgedFacts += inputs.length;
    commands.push({
      commandId,
      position: receipt.position,
      entities: count,
      assertions: inputs.length,
      acknowledgedMs: performance.now() - started,
    });
    report["commands"] = commands;
    report["acknowledgedEntities"] = start + count;
    report["acknowledgedDomainFacts"] = acknowledgedFacts;
    report["pendingCommand"] = null;
    report["loadElapsedMs"] = performance.now() - loadStarted;
    save();
    console.log(
      JSON.stringify(
        latencyReceipt({
          runId,
          acknowledgedEntities: start + count,
          requestedEntities: entities,
          position: receipt.position,
          qleverConnectionMode: connectionModeForBackend(backend.name),
        }),
      ),
    );
  }
  yield* verify;
  const distinct = yield* triples.queryPage(
    {
      inner: { find: ["?entity"], where: [["?entity", ":scale/index", "?value"]] },
      limit: 1,
      includeCount: true,
    },
    { basis: { validAt: 100 } },
  );
  assert.equal(distinct.totalCount, entities);
  report["distinctEntityCount"] = {
    status: "PASS",
    count: distinct.totalCount,
    method:
      "Public distinct entity projection with server-side pagination totalCount; one result row decoded",
  };
  for (const readerClients of [1, 4, 16]) {
    const started = performance.now();
    yield* Effect.all(
      Array.from({ length: readerClients }, () => verify),
      { concurrency: readerClients },
    );
    report[`reader${readerClients}Correctness`] = {
      status: "PASS",
      observations: readerClients,
      elapsedMsDiagnostic: performance.now() - started,
    };
    save();
  }
  const bodies = yield* triples.entities([entity(0), entity(entities - 1)], { validAt: 100 });
  assert.ok(bodies.every((body) => body.length === width));
  report["endpointBodies"] = "PASS";
});
try {
  admit();
  report["status"] = "LOADING";
  save();
  await Effect.runPromise(
    program.pipe(
      Effect.provide(backend.makeRuntime().layer({ scope, capabilities: Capabilities.none })),
      Effect.scoped,
    ),
  );
  await Effect.runPromise(
    verify.pipe(
      Effect.provide(backend.makeRuntime().layer({ scope, capabilities: Capabilities.none })),
      Effect.scoped,
    ),
  );
  report["reopen"] = "PASS";
  report["status"] = "PASS_LOAD_AND_SMALL_READER_CORRECTNESS_ONLY";
} catch (error) {
  const message = String(error);
  report["status"] = message.includes("BLOCKED_CAPACITY") ? "BLOCKED_CAPACITY" : "FAIL";
  report["error"] = message;
  process.exitCode = 1;
} finally {
  report["finalBytesPerDomainFactEstimate"] = observedBytesPerFact;
  report["adapterMemoryAtEnd"] = process.memoryUsage();
  save();
  console.log(
    JSON.stringify(
      latencyReceipt({
        result: report["status"],
        output,
        acknowledgedEntities: report["acknowledgedEntities"],
        qleverConnectionMode: connectionModeForBackend(backend.name),
      }),
    ),
  );
}

import { latencyReceipt, connectionModeForBackend } from "../../../lab/receipts/latency.mjs";
/** Bounded public-API pilot, never a scale or tail-latency qualification. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
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
  type Triple,
  type TripleInput,
} from "@triplex-build/triplex";
import { Capabilities, DatabaseScope } from "@triplex-build/triplex/runtime";
import { loadQualificationBackend } from "@triplex-build/triplex-qualification";

const args = process.argv.slice(2);
const option = (name: string, fallback: string) =>
  args.includes(name) ? args[args.indexOf(name) + 1]! : fallback;
const entities = Number(option("--entities", "100"));
const width = Number(option("--facts-per-entity", "1"));
const samples = Number(option("--samples", "3"));
const readers = option("--readers", "1,4,16").split(",").map(Number);
assert.ok(
  Number.isSafeInteger(entities) && entities >= 10 && entities <= 1000,
  "Pilot admits 10–1000 entities only; larger stages require measured admission and qualification tooling",
);
assert.ok([1, 10].includes(width));
assert.ok(Number.isSafeInteger(samples) && samples >= 1 && samples <= 100);
assert.ok(readers.length && readers.every((value) => [1, 4, 16].includes(value)));
const root = path.resolve(import.meta.dirname, "../../..");
const admission = JSON.parse(
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
assert.equal(admission.result, "ADMITTED");
const runId = randomUUID();
const backend = await loadQualificationBackend();
const scope = DatabaseScope.test(`${backend.name}-pilot-${runId}`);
const runtime = backend.makeRuntime();
const output = path.resolve(
  option("--output", path.join(root, "qualification/evidence", `pilot-${runId}.json`)),
);
assert.ok(output.startsWith(path.join(root, "qualification") + path.sep));
mkdirSync(path.dirname(output), { recursive: true });
const report: Record<string, unknown> = latencyReceipt({
  qleverConnectionMode: connectionModeForBackend(backend.name),
  format: "triplex-public-pilot/2",
  backend: backend.name,
  runId,
  scope,
  timestampUtc: new Date().toISOString(),
  status: "RUNNING",
  entities,
  factsPerEntity: width,
  domainActiveFactsBeforeCorrection: entities * width,
  relationshipCount: width === 10 ? entities : 0,
  graphShape: width === 10 ? "ring" : "none",
  commandBatchEntities: 100,
  readerClients: readers,
  samplesPerClient: samples,
  admission,
  cells: [],
  correctness: {},
  limitations: [
    "Diagnostic pilot, no P99 or scale acceptance; numeric SLO calibration remains pending.",
    "Competing result is this selected public Triplex backend; native probes, if run separately, are diagnostic controls.",
    "Replay is an independent expected-answer oracle, not charged as an equivalent durable database operation.",
    "Resource samples bracket operations and do not establish physical allocation peaks.",
    "This pilot runs read-only cells after ingestion; sustained ingestion is unqualified.",
  ],
});
writeFileSync(output, JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
const save = () => writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
const id = (index: number) => EntityId.make(`pilot:${String(index).padStart(8, "0")}`);
const fields = (index: number): readonly TripleInput[] => {
  const entityId = id(index);
  const values = [
    number(index),
    string(`name-${index}`),
    boolean(index % 2 === 0),
    ref(id((index + 1) % entities)),
    datetime(1000 + index),
    json({ index }),
    number(index % 7),
    string(`group-${index % 10}`),
    number(index + 0.5),
    boolean(true),
  ];
  return values.slice(0, width).map((value, field) => ({
    entityId,
    attribute: field === 0 ? ":pilot/index" : `:pilot/field${field}`,
    value,
    validFrom: 1,
  }));
};
const query = {
  find: ["?count", "?sum"],
  where: [["?entity", ":pilot/index", "?value"]],
  aggregate: [
    ["count", "?entity", "?count"],
    ["sum", "?value", "?sum"],
  ],
} as const;
const expectedInitial = { count: entities, sum: (entities * (entities - 1)) / 2 };
const quantiles = (values: number[]) => {
  const sorted = [...values].sort((left, right) => left - right);
  return {
    observations: sorted.length,
    min: sorted[0],
    median: sorted[Math.ceil(sorted.length / 2) - 1],
    max: sorted.at(-1),
  };
};
const program = Effect.gen(function* () {
  const triples = yield* Triples;
  const writes: unknown[] = [];
  let correctedFact: Triple | undefined;
  const loadStarted = performance.now();
  for (let start = 0; start < entities; start += 100) {
    const inputs = Array.from({ length: Math.min(100, entities - start) }, (_, offset) =>
      fields(start + offset),
    ).flat();
    const started = performance.now();
    const receipt = yield* triples.transact(
      inputs.map((input) => ({ op: "assert" as const, ...input })),
      { commandId: `${runId}:load:${start}` },
    );
    correctedFact =
      receipt.triples.find(
        (fact) => fact.entityId === id(entities - 1) && fact.attribute === ":pilot/index",
      ) ?? correctedFact;
    writes.push({
      commandId: `${runId}:load:${start}`,
      position: receipt.position,
      assertions: inputs.length,
      acknowledgedMs: performance.now() - started,
    });
  }
  report["loading"] = { elapsedMs: performance.now() - loadStarted, commands: writes };
  const initialPosition = yield* triples.currentPosition();
  report["initialPosition"] = initialPosition;
  const cells: unknown[] = [];
  for (const concurrency of readers) {
    for (const route of ["public-triplex"]) {
      const cellStarted = performance.now();
      const observations = yield* Effect.all(
        Array.from({ length: concurrency }, (_, client) =>
          Effect.gen(function* () {
            const measurements: unknown[] = [];
            for (let sample = 0; sample < samples; sample++) {
              const started = performance.now();
              const actual = yield* triples.queryAll(query, { basis: { validAt: 100 } }).pipe(
                Effect.map((result) => ({
                  count: result.results[0]?.["?count"],
                  sum: result.results[0]?.["?sum"],
                })),
              );
              const elapsedMs = performance.now() - started;
              assert.deepEqual(actual, expectedInitial);
              measurements.push({ client, sample, elapsedMs });
            }
            return measurements;
          }),
        ),
        { concurrency },
      );
      const raw = observations.flat() as { elapsedMs: number }[];
      const cell = {
        route,
        readerClients: concurrency,
        elapsedMs: performance.now() - cellStarted,
        latenciesDiagnosticMs: quantiles(raw.map((item) => item.elapsedMs)),
        samples: raw,
        correctness: "PASS",
      };
      cells.push(cell);
      report["cells"] = cells;
      save();
    }
  }
  const pageQuery = {
    find: ["?entity", "?value"],
    where: [["?entity", ":pilot/index", "?value"]],
    orderBy: [{ variable: "?value", direction: "asc" }],
  } as const;
  const first = yield* triples.query(pageQuery, { basis: { validAt: 100 }, pageSize: 7 });
  assert.ok(correctedFact);
  const correction = yield* triples.transact(
    [
      { op: "retract", id: correctedFact.id },
      {
        op: "assert",
        entityId: id(entities - 1),
        attribute: ":pilot/index",
        value: number(100_000),
        validFrom: 1,
      },
    ],
    { commandId: `${runId}:correction` },
  );
  const historicalRows = [...first.results];
  let cursor = first.nextCursor;
  while (cursor) {
    const page = yield* triples.query(pageQuery, { cursor, pageSize: 7 });
    historicalRows.push(...page.results);
    cursor = page.nextCursor;
  }
  assert.equal(historicalRows.length, entities);
  assert.equal(
    historicalRows.reduce((sum, row) => sum + Number(row["?value"]), 0),
    expectedInitial.sum,
  );
  const fresh = yield* triples.queryAll(query, { basis: { validAt: 100 } });
  const expectedFreshSum = expectedInitial.sum - (entities - 1) + 100_000;
  assert.equal(fresh.results[0]?.["?sum"], expectedFreshSum);
  const receipt = yield* triples.transactionByCommand(`${runId}:correction`);
  assert.equal(receipt?.txId, correction.txId);
  report["correctness"] = {
    publicAggregates: "PASS",
    analyticExpectedAnswers: "PASS",
    cursorSnapshotAcrossCorrection: "PASS",
    correctionReceipt: "PASS",
  };
  report["correction"] = { position: correction.position, expectedFreshSum };
  report["adapterMemoryAtEnd"] = process.memoryUsage();
  return expectedFreshSum;
});
try {
  const expectedFreshSum = await Effect.runPromise(
    program.pipe(
      Effect.provide(runtime.layer({ scope, capabilities: Capabilities.none })),
      Effect.scoped,
    ),
  );
  const reopened = await Effect.runPromise(
    Effect.gen(function* () {
      const triples = yield* Triples;
      return yield* triples.queryAll(query, { basis: { validAt: 100 } });
    }).pipe(
      Effect.provide(backend.makeRuntime().layer({ scope, capabilities: Capabilities.none })),
      Effect.scoped,
    ),
  );
  assert.equal(reopened.results[0]?.["?sum"], expectedFreshSum);
  report["reopen"] = "PASS";
  report["status"] = "PASS_DIAGNOSTIC_ONLY";
} catch (error) {
  report["status"] = "FAIL";
  report["error"] = {
    name: error instanceof Error ? error.name : "unknown",
    message: String(error),
  };
  process.exitCode = 1;
} finally {
  try {
    const after = JSON.parse(
      execFileSync(
        process.execPath,
        [
          path.join(root, "scripts/triplex-resources.mjs"),
          "--planned-bytes",
          "0",
          "--require-server",
        ],
        { encoding: "utf8" },
      ),
    );
    report["resourceAfter"] = after;
    report["observedOwnedDiskGrowthBytes"] = Math.max(
      0,
      Number(after.ownedBytes) - Number(admission.ownedBytes),
    );
    report["observedOwnedDiskGrowthBytesPerDomainFact"] =
      Number(report["observedOwnedDiskGrowthBytes"]) / (entities * width);
    if (after.databaseAllocatedBytes?.available && admission.databaseAllocatedBytes?.available) {
      report["observedDatabaseGrowthBytes"] = Math.max(
        0,
        after.databaseAllocatedBytes.value - admission.databaseAllocatedBytes.value,
      );
      report["observedDatabaseGrowthBytesPerDomainFact"] =
        Number(report["observedDatabaseGrowthBytes"]) / (entities * width);
    }
    report["diskCalibrationCaveat"] =
      "Includes journal, log, evidence and any simultaneous owned-server work; small fixtures may overstate fixed overhead. No attribution or linear-growth guarantee.";
  } catch (error) {
    report["resourceAfterError"] = String(error);
  }
  save();
  console.log(
    JSON.stringify(
      latencyReceipt({
        result: report["status"],
        output,
        entities,
        domainActiveFacts: entities * width,
        qleverConnectionMode: connectionModeForBackend(backend.name),
      }),
    ),
  );
}

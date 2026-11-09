import { latencyReceipt, connectionModeForBackend } from "../../../lab/receipts/latency.mjs";
/** Real public seed/load entry point. The controller owns admission and process cleanup. */
import assert from "node:assert/strict";
import {
  closeSync,
  mkdirSync,
  openSync,
  readFileSync,
  realpathSync,
  writeFileSync,
  writeSync,
} from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { execFileSync } from "node:child_process";
import { Effect } from "effect";
import {
  EntityId,
  Triples,
  string,
  number,
  integer,
  boolean,
  datetime,
  json,
  ref,
  blob,
  type TripleInput,
  type TripleId,
  type TriplesService,
  type TransactionRecord,
} from "@triplex-build/triplex";
import { TypeExpr } from "@triplex-build/triplex/config";
import {
  Capabilities,
  DatabaseScope,
  type ReadBasis,
  type NativeReadResult,
  type NativeQueryContract,
  type NativeReadOptions,
} from "@triplex-build/triplex/runtime";
import { loadQualificationBackend } from "@triplex-build/triplex-qualification";
import {
  basisFor,
  canonical,
  classes,
  entity,
  expectedSeedTransactions,
  instanceName,
  name,
  oracleKey,
  probeIndex,
  recipeIdentity,
  sha256,
  validateSpec,
  type LoadSpec,
  type SeedBundle,
  type SeedInstance,
  type TaskClass,
} from "./model.ts";
import { fixtureSchema, loadAttributes } from "./schema.ts";
import { Dispatch, delay, waitUntil } from "./dispatch.ts";

const root = path.resolve(import.meta.dirname, "../../..");
const args = process.argv.slice(2);
const option = (key: string, fallback?: string): string => {
  const result = args.includes(key) ? args[args.indexOf(key) + 1] : fallback;
  assert(result !== undefined, `Missing ${key}`);
  return result;
};
const jsonFile = <T>(file: string): T => JSON.parse(readFileSync(file, "utf8"));
const spec = jsonFile<LoadSpec>(option("--spec"));
validateSpec(spec);
assert.equal(
  spec.schemaSha256,
  sha256(canonical(fixtureSchema(spec.factsPerEntity))),
  "Frozen schema differs from the authored Triplex handles",
);
const backend = await loadQualificationBackend();
const admissionPath = realpathSync(process.env["TRIPLEX_RESOURCE_ADMISSION"] ?? "");
assert(admissionPath.startsWith(realpathSync(root) + path.sep));
const admissionBytes = readFileSync(admissionPath);
assert.equal(sha256(admissionBytes), process.env["TRIPLEX_RESOURCE_ADMISSION_SHA256"]);
const admission = JSON.parse(admissionBytes.toString());
assert.equal(admission.format, "triplex-devloop-resource-admission/1");
assert.equal(admission.proofPolicy, "portable-export-devloop-v1");
assert.equal(admission.state, "ADMITTED");
assert.equal(admission.localResourcesOnly, true);
assert.equal(path.resolve(admission.root), root);
assert.equal(admission.backend, backend.name);
assert.equal(admission.queryPath, backend.queryPath);
process.kill(admission.controller.pid, 0);
const artifacts = path.resolve(root, admission.directory, "artifacts");
const output = path.resolve(option("--output"));
assert(output.startsWith(artifacts + path.sep));
mkdirSync(artifacts, { recursive: true });
const writeJson = (file: string, value: unknown, exclusive = false) => {
  assert(path.resolve(file).startsWith(artifacts + path.sep));
  writeFileSync(file, JSON.stringify(value, null, 2) + "\n", exclusive ? { flag: "wx" } : {});
};
type Backend = typeof backend;
const withTriples = <A>(
  scope: DatabaseScope,
  use: (triples: TriplesService) => Promise<A>,
  deterministic = false,
): Promise<A> =>
  Effect.runPromise(
    Effect.gen(function* () {
      const triples = yield* Triples;
      return yield* Effect.tryPromise({ try: () => use(triples), catch: (cause) => cause });
    }).pipe(
      Effect.provide(
        backend.makeRuntime().layer({
          scope,
          capabilities: Capabilities.none,
          ...(deterministic
            ? { deterministic: { startTime: 1000.25, seed: `${spec.id}:${scope}` } }
            : {}),
        }),
      ),
      Effect.scoped,
    ),
  );
const NAME = loadAttributes.name;
const recordType = (fields: Record<string, TypeExpr.TypeExpr>) =>
  TypeExpr.struct(
    Object.fromEntries(Object.entries(fields).map(([key, type]) => [key, TypeExpr.required(type)])),
  );
const contract: NativeQueryContract = {
  name: "load/typed-point-name",
  parameters: recordType({ entity: TypeExpr.text }),
  row: recordType({ name: TypeExpr.text }),
};
const expectedChecks = (kind: "seed" | "load") => ({
  format: "triplex-public-load-checks/1",
  queryPath: backend.queryPath,
  status: "PASS",
  checks:
    kind === "seed"
      ? ["fresh-scopes", "seed-counts", "seed-positions"]
      : ["read-oracle", "returned-basis", "writer-reconciled", "queue-drained"],
});
const physicalObservation = () => {
  const bounded = JSON.parse(
    execFileSync("python3", [path.join(root, "tools/bootstrap/check-storage.py")], {
      encoding: "utf8",
    }),
  );
  const directory =
    backend.name === "duckdb"
      ? backend.url
      : path.join(root, ".runtime/engines", `${backend.name}-main`);
  const kilobytes = Number(
    execFileSync("du", ["-sk", directory], { encoding: "utf8" }).split(/\s+/)[0],
  );
  assert(Number.isSafeInteger(kilobytes) && kilobytes >= 0);
  return {
    at: new Date().toISOString(),
    bounded,
    engineDirectory: path.relative(root, directory),
    allocatedEngineDirectoryBytes: kilobytes * 1024,
    attribution:
      "Live engine directory observation includes application/history/journal/native metadata, engine background work and prior retained fixtures. APFS accounting is not additive; never add this to backing bytes.",
  };
};

function* facts(): Generator<{ index: number; input: TripleInput }> {
  for (let index = 0; index < spec.entities; index++) {
    const values = [
      [NAME.key, string(name(spec, index, 0))],
      [loadAttributes.kind.key, string(`kind-${index % 7}`)],
      [loadAttributes.peer.key, ref(EntityId.make(entity(spec, (index + 1) % spec.entities)))],
      [loadAttributes.exact.key, integer(9_223_372_036_854_775_807n - BigInt(index))],
      [loadAttributes.ratio.key, number(index / 3 + 0.25)],
      [loadAttributes.active.key, boolean(index % 2 === 0)],
      [loadAttributes.at.key, datetime(1000.25 + index)],
      [loadAttributes.payload.key, json({ index, label: "payload", nested: [true, null] })],
      // A blob descriptor fact, not an invented blob-content store or byte claim.
      [
        loadAttributes.blob.key,
        blob(sha256(`load-descriptor:${index}`), "application/octet-stream", index),
      ],
      [loadAttributes.group.key, string(`group-${index % 31}`)],
    ] as const;
    for (const [attribute, value] of values.slice(0, spec.factsPerEntity))
      yield {
        index,
        input: { entityId: EntityId.make(entity(spec, index)), attribute, value, validFrom: 0 },
      };
  }
}

async function seed(): Promise<void> {
  const receipts: SeedInstance[] = [],
    observations: unknown[] = [];
  const started = performance.now();
  // Before/after observations are outside timed read windows. The first sparse
  // point remains a capacity observation, not an unearned full-scale estimate.
  const physicalBefore = backend.name === "duckdb" ? undefined : physicalObservation();
  for (let index = 0; index < spec.instances; index++) {
    const scope = DatabaseScope.make({
      env: "benchmark",
      tenant: "triplex-load",
      database: instanceName(spec, index),
      generation: 0,
    });
    const receipt = await withTriples(
      scope,
      async (triples) => {
        assert.equal(
          await Effect.runPromise(triples.currentPosition()),
          0,
          "Fixture scope must be fresh; no replay or silent reuse",
        );
        const hotFactIds: string[] = [];
        let batch: { index: number; input: TripleInput }[] = [],
          assertions = 0,
          baselinePosition = 0,
          recordedAt = 0;
        const flush = async () => {
          if (!batch.length) return;
          const began = performance.now();
          const write = await Effect.runPromise(
            triples.transact(
              batch.map(({ input }) => ({ op: "assert" as const, ...input })),
              {
                commandId: `${spec.id}:${index}:seed:${baselinePosition + 1}`,
              },
            ),
          );
          assert.equal(write.triples.length, batch.length);
          assert.equal(write.position, baselinePosition + 1);
          batch.forEach((item, offset) => {
            if (item.index < 10 && item.input.attribute === NAME.key)
              hotFactIds[item.index] = write.triples[offset]!.id;
          });
          assertions += write.triples.length;
          baselinePosition = write.position;
          recordedAt = Math.max(recordedAt, write.instant);
          observations.push({
            instance: index,
            position: write.position,
            assertions: batch.length,
            elapsedMs: performance.now() - began,
          });
          batch = [];
        };
        for (const fact of facts()) {
          batch.push(fact);
          if (batch.length === spec.batchFacts) await flush();
        }
        await flush();
        assert.equal(assertions, spec.entities * spec.factsPerEntity);
        assert.equal(baselinePosition, expectedSeedTransactions(spec));
        assert.equal(hotFactIds.filter(Boolean).length, 10);
        assert.equal(await Effect.runPromise(triples.currentPosition()), baselinePosition);
        return { index, scope, baselinePosition, recordedAt, hotFactIds };
      },
      true,
    );
    receipts.push(receipt);
  }
  const bundle: SeedBundle = {
    format: "triplex-load-seed-receipts/1",
    backend: backend.name,
    specSha256: sha256(canonical(spec)),
    instances: receipts,
  };
  writeJson(path.join(artifacts, "fixture.json"), bundle, true);
  writeJson(
    output,
    latencyReceipt({
      qleverConnectionMode: connectionModeForBackend(backend.name),
      format: "triplex-public-load-seed/1",
      status: "PASS",
      backend: backend.name,
      queryPath: backend.queryPath,
      recipeIdentity: recipeIdentity(spec),
      spec,
      receipts,
      elapsedMsDiagnostic: performance.now() - started,
      observations,
      physicalBefore,
      physicalAfter: physicalObservation(),
      counts: {
        distinctEntitiesPerInstance: spec.entities,
        distinctDomainFactSubjectsPerInstance: spec.entities,
        persistedConfiguredEntities: 0,
        entityPresenceEvents: 0,
        typeVersionEvents: 0,
        activeDomainFactsPerInstance: spec.entities * spec.factsPerEntity,
        assertedDomainFacts: spec.entities * spec.factsPerEntity * spec.instances,
        retractions: 0,
        seedTransactionsPerInstance: expectedSeedTransactions(spec),
      },
      limitations: [
        "Metadata/journal/history bytes remain engine costs; counts are not physical byte measurements.",
        "Admitted tiny replicas are retained and charged; this is not permission for target-scale copies.",
        "No performance or full-scale acceptance.",
      ],
    }),
    true,
  );
  writeJson(path.join(artifacts, "results.json"), expectedChecks("seed"), true);
}

type NativeContext = {
  facts: () => string;
  bind: (value: unknown) => string;
  attribute: (value: unknown) => string;
  fact: (entity: unknown, attribute: unknown, variable: string) => string;
  entity: (value: string) => unknown;
};
type NativeProvider = {
  select: (
    contract: NativeQueryContract,
    input: unknown,
    build: (ctx: NativeContext, input: unknown) => string,
    options: NativeReadOptions,
  ) => Effect.Effect<NativeReadResult, unknown>;
};
interface PointResult {
  rows: string[][];
  basis: ReadBasis;
  trace?: NativeReadResult["trace"];
}
function reader(
  selected: Backend,
  triples: TriplesService,
  native: NativeProvider | undefined,
  receipt: SeedInstance,
  readTimeout: number,
) {
  return async (task: TaskClass, probe: number, budgetMs = readTimeout): Promise<PointResult> => {
    const subject = entity(spec, probeIndex(spec, probe));
    const basis = {
      validAt: spec.validAt,
      ...(task === "point-history" ? { recordedAt: receipt.recordedAt } : {}),
    };
    if (native) {
      const answer = await Effect.runPromise(
        native.select(
          contract,
          { entity: subject },
          (ctx, decoded) => {
            const input = decoded as { entity: string };
            // Native-authored query surface, not Datalog-to-text lowering.
            return selected.queryPath === "xtdb-native"
              ? `(-> ${ctx.facts()} (where (= entity_id ${ctx.bind(input.entity)}) (= attribute ${ctx.attribute(NAME)})) (return {:name value_string}))`
              : `SELECT ?name WHERE { ${ctx.fact(ctx.entity(input.entity), NAME, "?name")} }`;
          },
          { basis, timeoutMs: budgetMs, signal: AbortSignal.timeout(budgetMs), maxRows: 2 },
        ),
      );
      return {
        rows: answer.rows.map((row) => [(row as { name: string }).name]),
        basis: answer.basis,
        trace: answer.trace,
      };
    }
    const answer = await Effect.runPromise(
      triples
        .queryAll(
          { find: ["?name"], where: [[subject, NAME.key, "?name"]] },
          { basis, includeBasis: true },
        )
        .pipe(Effect.timeout(budgetMs)),
    );
    assert(answer.basis, "Public provider did not return its actual resolved read basis");
    return {
      rows: answer.results.map((row) => {
        assert.equal(typeof row["?name"], "string");
        return [row["?name"] as string];
      }),
      basis: answer.basis,
    };
  };
}

async function load(): Promise<void> {
  const bundle = jsonFile<SeedBundle>(option("--fixture"));
  assert.equal(bundle.specSha256, sha256(canonical(spec)));
  assert.equal(bundle.backend, backend.name);
  const instance = Number(option("--instance", "0")),
    receipt = bundle.instances.find((item) => item.index === instance);
  assert(receipt);
  assert.equal(receipt.baselinePosition, expectedSeedTransactions(spec));
  const scope = receipt.scope as DatabaseScope;
  const oracle = jsonFile<{
    entries: Record<string, { expectedSha256: string; paramsSha256: string; basis: unknown }>;
  }>(option("--oracle"));
  const clients = Number(option("--clients", "32")),
    duration = Number(option("--duration-ms", "5000"));
  const mode = option("--mode", "closed-loop"),
    dispatchLimit = Number(option("--dispatch", "32"));
  const pendingLimit = Number(option("--pending", String(Math.max(clients * 2, dispatchLimit))));
  const offeredReadRate = Number(option("--read-rate", "256")),
    writerRate = Number(option("--write-rate", "0.2"));
  const writerMode = option("--writer-mode", "rate"),
    readTimeout = Number(option("--read-timeout-ms", "30000"));
  const maximumReads = Number(option("--maximum-reads", "100000"));
  assert([32, 256, 512, 1024].includes(clients));
  assert(["closed-loop", "open-loop"].includes(mode));
  assert(["rate", "closed-loop-capacity"].includes(writerMode));
  for (const value of [duration, dispatchLimit, pendingLimit, readTimeout, maximumReads])
    assert(Number.isSafeInteger(value) && value > 0);
  assert(duration <= 600_000 && dispatchLimit <= clients && pendingLimit <= 100_000);
  if (mode === "closed-loop")
    assert(
      pendingLimit >= clients - dispatchLimit,
      "Closed-loop reserves one bounded outstanding request per logical client; explicit rejection stress uses open-loop",
    );
  assert(
    Number.isFinite(offeredReadRate) &&
      offeredReadRate > 0 &&
      Number.isFinite(writerRate) &&
      writerRate > 0,
  );
  const offeredWriters =
    writerMode === "rate" ? Math.ceil((duration / 1000) * writerRate) : spec.maximumWriterCommands;
  assert(offeredWriters <= spec.maximumWriterCommands);
  const dispatch = new Dispatch(dispatchLimit, pendingLimit);
  const eventPath = path.join(artifacts, "events.jsonl"),
    tracePath = path.join(artifacts, "queries.jsonl");
  const eventFd = openSync(eventPath, "wx"),
    traceFd = openSync(tracePath, "wx");
  const traceKeys = new Set<string>(),
    seenClasses = new Set<string>(),
    clientProgress = new Set<number>();
  const failures: unknown[] = [];
  const writerEvidence: { offeredMs: number; visibleMs?: number; reconciled: boolean }[] = [];
  let emittedReadEvents = 0;
  let bytes = 0,
    reads = 0,
    rejected = 0,
    writes = 0,
    writtenVersion = 0,
    capped = false;
  const maximumEventBytes = 128 * 1024 ** 2;
  const emit = (event: Record<string, unknown>, fd = eventFd) => {
    const line =
      JSON.stringify(
        latencyReceipt({ ...event, qleverConnectionMode: connectionModeForBackend(backend.name) }),
      ) + "\n";
    bytes += Buffer.byteLength(line);
    assert(bytes <= maximumEventBytes, "Raw observation byte budget exhausted");
    writeSync(fd, line);
    const observed = event as Record<string, unknown>;
    if (observed["type"] === "read") {
      emittedReadEvents++;
      assert(typeof observed["startedMs"] === "number" && Number.isFinite(observed["startedMs"]));
      assert(
        typeof observed["finishedMs"] === "number" &&
          observed["finishedMs"] >= observed["startedMs"],
        "Real complete-call time cannot precede its scheduled offer",
      );
      if (observed["dispatchedMs"] !== undefined)
        assert((observed["dispatchedMs"] as number) >= observed["startedMs"]);
      if (observed["ok"] === true)
        assert.equal(sha256(observed["resultJson"] as string), observed["resultSha256"]);
    } else if (observed["type"] === "write")
      writerEvidence.push(
        observed as unknown as { offeredMs: number; visibleMs?: number; reconciled: boolean },
      );
  };
  let start = 0;
  const now = () => performance.now() - start;
  const waitFor = (instant: number) => waitUntil(instant, now);
  let hotIds = [...receipt.hotFactIds] as TripleId[];
  const report: Record<string, unknown> = latencyReceipt({
    qleverConnectionMode: connectionModeForBackend(backend.name),
    format: "triplex-public-load-run/1",
    status: "RUNNING",
    backend: backend.name,
    queryPath: backend.queryPath,
    specSha256: bundle.specSha256,
    recipeIdentity: recipeIdentity(spec),
    scope,
    instance,
    clients,
    durationMilliseconds: duration,
    mode,
    writerMode,
    offeredReadRate,
    offeredWriterRate: writerMode === "rate" ? writerRate : null,
    timingPolicy: "monotonic-scheduled-offer-deadline/1",
    deadlineOrigin: "Scheduled offer; host queue waiting consumes the native/Effect call budget",
    dispatch: {
      limit: dispatchLimit,
      pendingLimit,
      writerLogicalSlots: 1,
      writerReservationMeaning:
        "One host writer slot outside the read dispatch queue; physical owner/transport serialization remains foundation-specific",
      transportConnections:
        "provider default; logical clients are not a claim of simultaneous backend execution",
    },
    limitations: [
      "First-wave point current/history profile, not all71-task performance qualification or 10m capacity.",
      "Complete-call latency begins at scheduled offer, including dispatch queue and result decoding/hash.",
      "Per-call cancellation requests and controller process cleanup do not alone prove physical engine resource reclamation.",
      "No production latency SLA. Tail promotion requires controller sample/calibration gates.",
    ],
  });
  writeJson(output, report, true);
  try {
    // Separate roots isolate service contexts and logical writer dispatch.
    // DuckDB intentionally shares one serialized physical C++ owner connection.
    await withTriples(scope, (writeTriples) =>
      withTriples(scope, async (readTriples) => {
        assert.equal(
          await Effect.runPromise(writeTriples.currentPosition()),
          receipt.baselinePosition,
          "Load instance was already mutated; select a fresh admitted instance",
        );
        const session = backend.queryPath.endsWith("-native")
          ? backend.openNative(scope)
          : undefined;
        try {
          const point = reader(
            backend,
            readTriples,
            session?.provider as NativeProvider | undefined,
            receipt,
            readTimeout,
          );
          const validate = (answer: PointResult, task: TaskClass, probe: number) => {
            assert.equal(answer.basis.scope, scope);
            assert(Number.isSafeInteger(answer.basis.recordedPosition));
            assert.equal(answer.basis.validAt, spec.validAt);
            assert.equal(
              answer.basis.recordedAt,
              task === "point-history" ? receipt.recordedAt : undefined,
            );
            const key = oracleKey(instance, task, probe, answer.basis.recordedPosition),
              expected = oracle.entries[key];
            assert(expected, `Returned cut is outside the pinned planned-write catalog: ${key}`);
            const basis = basisFor(spec, receipt, task, answer.basis.recordedPosition),
              resultJson = canonical(answer.rows);
            const paramsSha256 = sha256(
              canonical({ entity: entity(spec, probeIndex(spec, probe)) }),
            );
            assert.equal(canonical(basis), canonical(expected.basis));
            assert.equal(paramsSha256, expected.paramsSha256);
            assert.equal(
              sha256(resultJson),
              expected.expectedSha256,
              "Independent load oracle mismatch",
            );
            return { key, basis, resultJson, paramsSha256 };
          };
          for (const task of classes) validate(await point(task, 0), task, 0);
          start = performance.now();
          report["clock"] = {
            source: "performance.now",
            monotonicOrigin: start,
            approximateWallOriginMs: Date.now(),
            meaning:
              "All offer/queue/dispatch/finish/ACK/visibility timestamps use one monotonic origin; wall time is context only",
          };
          const offerRead = async (clientId: number, sequence: number, scheduled: number) => {
            const task = classes[(clientId + sequence) % 2]!;
            const probe =
              spec.probeEntities === 10 || (clientId + Math.floor(sequence / 2)) % 2 === 0
                ? (clientId + sequence) % 10
                : 10 + ((clientId + sequence) % (spec.probeEntities - 10));
            const enqueuedMs = now();
            let dispatchedMs: number | undefined;
            try {
              await dispatch.use(
                async (remainingMs) => {
                  dispatchedMs = now();
                  const answer = await point(task, probe, remainingMs),
                    checked = validate(answer, task, probe);
                  let queryKey: string | undefined;
                  if (answer.trace) {
                    const query = {
                      language: answer.trace.language,
                      query: answer.trace.query,
                      mappingId: answer.trace.mappingId,
                      contractId: answer.trace.contractId,
                    };
                    queryKey = sha256(canonical(query));
                    if (!traceKeys.has(queryKey)) {
                      traceKeys.add(queryKey);
                      emit({ queryKey, ...query }, traceFd);
                    }
                  }
                  const finishedMs = now();
                  reads++;
                  seenClasses.add(task);
                  clientProgress.add(clientId);
                  emit({
                    type: "read",
                    taskClass: task,
                    logicalTaskId: `load/${task}`,
                    oracleKey: checked.key,
                    paramsSha256: checked.paramsSha256,
                    basis: checked.basis,
                    knownPosition: checked.basis.knownPosition,
                    clientId,
                    instance,
                    probe,
                    startedMs: scheduled,
                    enqueuedMs,
                    dispatchedMs,
                    finishedMs,
                    ok: true,
                    resultJson: checked.resultJson,
                    resultSha256: sha256(checked.resultJson),
                    queryKey,
                    ...(answer.trace
                      ? {
                          nativeParameters: answer.trace.parameters,
                          nativeElapsedMs: answer.trace.elapsedMs,
                        }
                      : {
                          datalog: {
                            find: ["?name"],
                            where: [[entity(spec, probeIndex(spec, probe)), NAME.key, "?name"]],
                          },
                        }),
                  });
                },
                start + scheduled + readTimeout,
              );
            } catch (cause) {
              const expectedOverload =
                String(cause).includes("BOUNDED_DISPATCH_REJECTION") && clients >= 512;
              if (expectedOverload) rejected++;
              else failures.push({ kind: "read", clientId, task, error: String(cause) });
              emit({
                type: "read",
                taskClass: task,
                logicalTaskId: `load/${task}`,
                clientId,
                instance,
                probe,
                startedMs: scheduled,
                enqueuedMs,
                dispatchedMs,
                deadlineMs: scheduled + readTimeout,
                finishedMs: now(),
                ok: false,
                expectedOverload,
                error: String(cause),
              });
            }
          };
          let offeredReads = 0;
          const readWork =
            mode === "closed-loop"
              ? Promise.all(
                  Array.from({ length: clients }, (_, clientId) =>
                    (async () => {
                      let sequence = 0;
                      while (now() < duration) {
                        if (++offeredReads > maximumReads) {
                          capped = true;
                          break;
                        }
                        await offerRead(clientId, sequence++, now());
                      }
                    })(),
                  ),
                )
              : (async () => {
                  const pending = new Set<Promise<void>>(),
                    count = Math.ceil((duration / 1000) * offeredReadRate);
                  assert(
                    count <= maximumReads,
                    "Open-loop offered schedule exceeds the frozen request budget",
                  );
                  for (let ordinal = 0; ordinal < count; ordinal++) {
                    const scheduled = (ordinal * 1000) / offeredReadRate;
                    await waitFor(scheduled);
                    const task = offerRead(
                      ordinal % clients,
                      Math.floor(ordinal / clients),
                      scheduled,
                    );
                    pending.add(task);
                    void task.then(
                      () => pending.delete(task),
                      (cause) => {
                        pending.delete(task);
                        failures.push({ kind: "raw-event-or-dispatch", error: String(cause) });
                      },
                    );
                    offeredReads++;
                  }
                  await Promise.all(pending);
                })();
          const writerWork = (async () => {
            for (let ordinal = 1; ordinal <= offeredWriters; ordinal++) {
              if (writerMode === "closed-loop-capacity" && now() >= duration) break;
              const offeredMs = writerMode === "rate" ? ((ordinal - 1) * 1000) / writerRate : now();
              await waitFor(offeredMs);
              const writeStartedMs = now();
              const commandId = `${spec.id}:${instance}:correction:${ordinal}`;
              let ackMs = 0;
              try {
                let committed: { position: number; ids: TripleId[] };
                try {
                  const tx = await Effect.runPromise(
                    writeTriples
                      .transact(
                        [
                          ...hotIds.map((id) => ({ op: "retract" as const, id })),
                          ...Array.from({ length: 10 }, (_, index) => ({
                            op: "assert" as const,
                            entityId: EntityId.make(entity(spec, index)),
                            attribute: NAME.key,
                            value: string(name(spec, index, ordinal)),
                            validFrom: 0,
                          })),
                        ],
                        { commandId },
                      )
                      .pipe(Effect.timeout(readTimeout)),
                  );
                  ackMs = now();
                  assert.equal(tx.triples.length, 10);
                  committed = { position: tx.position, ids: tx.triples.map((fact) => fact.id) };
                } catch (cause) {
                  // Resolve an uncertain ACK from the atomic command receipt. Never replay a write.
                  let durable: TransactionRecord | null = null;
                  const deadline = performance.now() + readTimeout;
                  while (performance.now() < deadline && !durable) {
                    durable = await Effect.runPromise(writeTriples.transactionByCommand(commandId));
                    if (!durable) await delay(50);
                  }
                  if (!durable) throw new Error(`UNRESOLVED_WRITE_ACK:${String(cause)}`);
                  ackMs = now();
                  const asserted = durable.changes.filter(
                    (change) => change.op === "assert" && change.attribute === NAME.key,
                  );
                  assert.equal(asserted.length, 10);
                  committed = {
                    position: durable.position,
                    ids: Array.from({ length: 10 }, (_, index) => {
                      const fact = asserted.find(
                        (change) =>
                          change.entityId === entity(spec, index) &&
                          change.value?.type === "string" &&
                          change.value.value === name(spec, index, ordinal),
                      );
                      assert(fact);
                      return fact.tripleId;
                    }),
                  };
                }
                assert.equal(committed.position, receipt.baselinePosition + ordinal);
                hotIds = committed.ids;
                const visibilityProbeStartedMs = now();
                const visible = await Effect.runPromise(
                  writeTriples
                    .queryAll(
                      { find: ["?name"], where: [[entity(spec, 0), NAME.key, "?name"]] },
                      { basis: { validAt: spec.validAt }, includeBasis: true },
                    )
                    .pipe(Effect.timeout(readTimeout)),
                );
                assert(visible.basis && visible.basis.recordedPosition >= committed.position);
                assert.deepEqual(visible.results, [{ "?name": name(spec, 0, ordinal) }]);
                writes++;
                writtenVersion = ordinal;
                emit({
                  type: "write",
                  commandId,
                  offeredMs,
                  ackMs,
                  writeStartedMs,
                  visibilityProbeStartedMs,
                  commitIndexPhase:
                    "Included inside public SDK ACK; no separate engine-index timestamp is inferred",
                  visibleMs: now(),
                  reconciled: true,
                  knownPosition: String(committed.position),
                  visibleBasis: visible.basis,
                  instance,
                  correctedEntities: 10,
                  assertions: 10,
                  retractions: 10,
                });
              } catch (cause) {
                failures.push({ kind: "write", commandId, error: String(cause) });
                emit({
                  type: "write",
                  commandId,
                  offeredMs,
                  reconciled: false,
                  error: String(cause),
                });
                break;
              }
            }
            if (
              writerMode === "closed-loop-capacity" &&
              writes === spec.maximumWriterCommands &&
              now() < duration
            )
              failures.push({
                kind: "writer-capacity",
                error: "Frozen writer command budget exhausted before the fixed window ended",
              });
          })();
          await Promise.allSettled([readWork, writerWork]).then((outcomes) => {
            for (const outcome of outcomes)
              if (outcome.status === "rejected")
                failures.push({ kind: "runner", error: String(outcome.reason) });
          });
          await waitFor(duration);
          assert.equal(
            await Effect.runPromise(writeTriples.currentPosition()),
            receipt.baselinePosition + writtenVersion,
            "Unexpected scope writer or unresolved commit",
          );
          assert.equal(dispatch.active, 0);
          assert.equal(seenClasses.size, classes.length);
          assert(reads > 0 && writes > 0);
          if (capped)
            failures.push({ kind: "read-budget", error: "Frozen offered-read budget exhausted" });
          if (clients <= 256 && clientProgress.size !== clients)
            failures.push({
              kind: "client-progress",
              expected: clients,
              actual: clientProgress.size,
            });
          report["observations"] = {
            offeredReads,
            correctReads: reads,
            expectedStressRejections: rejected,
            visiblyCommittedCommands: writes,
            clientsWithProgress: clientProgress.size,
            measuredWindowEndMs: duration,
            drainEndMs: now(),
            bytes,
            maximumActiveDispatch: dispatch.maximumActive,
            maximumQueuedDispatch: dispatch.maximumQueued,
            activeDomainFacts: spec.entities * spec.factsPerEntity,
            addedDomainHistoryAssertions: writes * 10,
            addedRetractions: writes * 10,
          };
        } finally {
          if (session) await session.close();
        }
      }),
    );
  } catch (cause) {
    failures.push({
      kind: "fatal",
      error: String(cause),
      stack: cause instanceof Error ? cause.stack : undefined,
    });
  } finally {
    closeSync(eventFd);
    closeSync(traceFd);
    report["failures"] = failures;
    report["status"] = failures.length ? "FAIL" : "PASS";
    report["sampleAdequacy"] = {
      minimumPerClassForPromotion: 10_000,
      independentRepeatsRequired: 3,
      claim: "Controller determines adequacy; diagnostic completion does not qualify performance",
    };
    const readErrors = failures.filter(
      (failure) => (failure as { kind?: string }).kind === "read",
    ).length;
    const visibleInside = writerEvidence.filter(
      (event) => event.reconciled && event.visibleMs !== undefined && event.visibleMs <= duration,
    ).length;
    const offeredWriterDenominator = writerMode === "rate" ? offeredWriters : writerEvidence.length;
    report["diagnosticGates"] = {
      correctCompleteReads: reads,
      emittedReadEvents,
      readErrors,
      explicitStressRejections: rejected,
      readAvailability: readErrors
        ? "FAILED"
        : rejected
          ? "DECLARED_STRESS_REJECTIONS_RETAINED"
          : "NO_READ_ERRORS_OR_REJECTIONS",
      writer: {
        offeredCommands: offeredWriterDenominator,
        visiblyCommittedInsideWindow: visibleInside,
        fractionVisibleInsideWindow: offeredWriterDenominator
          ? visibleInside / offeredWriterDenominator
          : 0,
        reconciledAfterDrain: writes,
        allOfferedReconciled: writes === offeredWriterDenominator,
      },
      interpretation:
        "Returned-result correctness, read availability, writer reconciliation and in-window liveness are separate. No calibrated acceptance is implied.",
    };
    writeJson(output, report);
    if (!failures.length)
      writeJson(path.join(artifacts, "results.json"), expectedChecks("load"), true);
    if (failures.length) process.exitCode = 1;
  }
}

if (option("--stage", "load") === "seed") await seed();
else await load();

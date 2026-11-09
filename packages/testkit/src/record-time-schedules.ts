import { Deferred, Effect, Fiber, Layer } from "effect";
import {
  EntityId,
  Triples,
  string,
  CommandAlreadyCommittedError,
  instantOf,
  nextStamp,
  stampOf,
} from "@triplex-build/triplex";
import {
  DeterministicIdGeneratorLive,
  TripleStoreRuntime,
  IdGenerator,
  TriplesLive,
  QueryExecutor,
  StorageAdapter,
  type StorageAdapterService,
  type QueryExecutorService,
} from "@triplex-build/triplex/internal";
import {
  makeControllableRecordClock,
  recordTimeConformanceCases,
} from "./record-time-conformance.js";

const require = (condition: boolean, message: string) =>
  condition ? Effect.void : Effect.fail(new Error(message));
/** Concrete A0 schedules. Each invocation owns a fresh scope and adapter. */
export const makeA0RecordTimeSuite = (
  adapter: StorageAdapterService,
  queries: QueryExecutorService,
  scope: string,
  faults: { readonly loseNextAck: () => void },
) => {
  const clock = makeControllableRecordClock(100000);
  let pause: { entered: Deferred.Deferred<void>; release: Deferred.Deferred<void> } | undefined;
  const wrapped: StorageAdapterService = {
    ...adapter,
    withTransaction: (effect, options) =>
      adapter.withTransaction(
        Effect.gen(function* () {
          const result = yield* effect;
          const latch = pause;
          if (latch) {
            pause = undefined;
            yield* Deferred.succeed(latch.entered, undefined);
            yield* Deferred.await(latch.release);
          }
          return result;
        }),
        options,
      ),
  };
  const runtime = Layer.effect(
    TripleStoreRuntime,
    Effect.gen(function* () {
      const ids = yield* IdGenerator;
      return {
        scope,
        now: Effect.sync(clock.get),
        nextTripleId: ids.nextTripleId,
        nextTxId: ids.nextTxId,
      };
    }),
  ).pipe(Layer.provide(DeterministicIdGeneratorLive({ idSeed: "rt01-fixed" })));
  const layer = TriplesLive.pipe(
    Layer.provide(
      Layer.mergeAll(
        runtime,
        Layer.succeed(StorageAdapter, wrapped),
        Layer.succeed(QueryExecutor, queries),
      ),
    ),
  );
  let sequence = 0;
  const write = (entity = `schedule:${++sequence}`) =>
    Effect.flatMap(Triples, (t) =>
      t.transact([
        {
          op: "assert",
          entityId: EntityId.make(entity),
          attribute: ":rt/value",
          value: string("value"),
          entityType: "RecordTime",
        },
      ]),
    );
  const cases = recordTimeConformanceCases({
    clock,
    delayedDecision: Effect.gen(function* () {
      const t = yield* Triples;
      clock.set(99999);
      yield* write("page:a");
      yield* write("page:b");
      clock.set(100000);
      const entered = yield* Deferred.make<void>(),
        release = yield* Deferred.make<void>();
      pause = { entered, release };
      const pending = yield* Effect.forkChild(write("schedule:X"));
      yield* Deferred.await(entered);
      clock.set(100001);
      const b = yield* write("schedule:Y");
      const basis = { recordedAt: b.instant, validAt: 100001 };
      const before = yield* t.entity(EntityId.make("schedule:X"), basis);
      const first = yield* t.entityPage({ entityType: "RecordTime", limit: 1, basis });
      yield* Deferred.succeed(release, undefined);
      const a = yield* Fiber.join(pending);
      yield* require(a.instant > b.instant, "late decision reused staged stamp");
      const after = yield* t.entity(EntityId.make("schedule:X"), basis);
      yield* require(JSON.stringify(before) === JSON.stringify(after), "D-C1 changed served bytes");
      if (first.nextCursor) {
        const next = yield* t.entityPage({
          entityType: "RecordTime",
          limit: 1,
          cursor: first.nextCursor,
        });
        yield* require(next.snapshot.recordedAt === b.instant &&
          !next.entities.some((entity) =>
            entity.some((triple) => triple.entityId === "schedule:X"),
          ), "cursor moved its cut");
      }
    }),
    lostAck: Effect.gen(function* () {
      const t = yield* Triples;
      faults.loseNextAck();
      const commandId = `rt:lost-ack:${++sequence}`;
      const r = yield* t.transact(
        [
          {
            op: "assert",
            entityId: EntityId.make(commandId),
            attribute: ":rt/value",
            value: string("once"),
          },
        ],
        { commandId },
      );
      const duplicate = yield* t.transact([], { commandId }).pipe(Effect.flip);
      yield* require(duplicate instanceof CommandAlreadyCommittedError &&
        duplicate.transactionId === r.txId, "duplicate lost identity");
      const replay = yield* t.transactionByCommand(commandId);
      yield* require(replay?.instant === r.instant &&
        replay.position === r.position, "replay lost original stamp");
    }),
    watermarkWait: Effect.gen(function* () {
      const t = yield* Triples;
      const r = yield* write();
      yield* t.entity(r.triples[0]!.entityId, { recordedAt: r.instant, validAt: r.stagedAt });
      const target = instantOf(stampOf(r.instant) + 1),
        start = performance.now();
      const error = yield* t
        .entity(EntityId.make("rt:idle"), { recordedAt: target, validAt: r.stagedAt })
        .pipe(Effect.flip);
      yield* require("axis" in error &&
        error.axis === "recordedAt" &&
        performance.now() - start >= 1900 &&
        performance.now() - start < 4000, "watermark deadline/refusal");
      const pending = yield* Effect.forkChild(
        t.entity(EntityId.make("rt:release"), { recordedAt: target, validAt: r.stagedAt }),
      );
      yield* Effect.sleep("50 millis");
      clock.set(r.stagedAt);
      const next = yield* write("rt:release");
      const rows = yield* Fiber.join(pending);
      yield* require(next.instant === target &&
        rows.length === 1, "publication did not release exact cut");
    }),
    // [EXP-RT01] Why: A0 has no deferred placeholders. Rejected: claiming the broker/P2X leak gate on a serialized arm.
    placeholderLeak: Effect.gen(function* () {
      yield* require(adapter.recordTime === "decided", "A0 declaration missing");
    }),
    deterministicReplay: Effect.gen(function* () {
      let previous = stampOf((yield* adapter.currentCut!()).recordedAt);
      for (const time of [200000, 200000, 199999, 200001]) {
        clock.set(time);
        const r = yield* write();
        previous = nextStamp(previous, time);
        yield* require(r.instant === instantOf(previous) &&
          r.stagedAt === time, "reference stamp mismatch");
      }
    }),
    // Legacy bytes are tested by the core decoder test; no legacy scope is opened in decided mode.
    legacyJournal: Effect.void,
  });
  return {
    clock,
    layer,
    cases,
    run: Effect.forEach(
      cases,
      (entry) =>
        Effect.gen(function* () {
          console.log(`RT01 start ${entry.name}`);
          yield* entry.run;
          console.log(`RT01 completed ${entry.name}`);
        }),
      { discard: true },
    ),
  };
};

import { Effect, Layer } from "effect";
import { Triples, EntityId, string } from "@triplex-build/triplex";
import { RuntimeClock } from "@triplex-build/triplex/runtime";
import type { ConformanceCase } from "./index.js";

export const makeControllableRecordClock = (initial = 1000) => {
  let time = initial;
  return {
    set: (next: number) => {
      time = next;
    },
    get: () => time,
    layer: Layer.succeed(RuntimeClock, { now: Effect.sync(() => time) }),
  };
};
const check = (value: boolean, message: string) =>
  value ? Effect.void : Effect.fail(new Error(message));
/** Hooks run a real adapter's decision/fault schedule; absence is a coverage gap, never a PASS. */
export interface RecordTimeConformanceHooks {
  readonly clock: ReturnType<typeof makeControllableRecordClock>;
  readonly delayedDecision: Effect.Effect<void, unknown, Triples>;
  readonly lostAck: Effect.Effect<void, unknown, Triples>;
  readonly watermarkWait: Effect.Effect<void, unknown, Triples>;
  readonly placeholderLeak: Effect.Effect<void, unknown, Triples>;
  readonly deterministicReplay: Effect.Effect<void, unknown, Triples>;
  readonly legacyJournal: Effect.Effect<void, unknown, Triples>;
}
export const recordTimeConformanceCases = (
  hooks: RecordTimeConformanceHooks,
): readonly ConformanceCase[] => {
  let sequence = 0;
  const write = () =>
    Effect.gen(function* () {
      const t = yield* Triples;
      return yield* t.transact([
        {
          op: "assert",
          entityId: EntityId.make(`rt:${++sequence}`),
          attribute: ":rt/value",
          value: string("value"),
          entityType: "RecordTime",
        },
      ]);
    });
  return [
    {
      name: "T1 delayed decision and pagination preserve a served cut",
      run: hooks.delayedDecision,
    },
    {
      name: "T2 same-millisecond commits are distinct and exclude later writes",
      run: Effect.gen(function* () {
        const t = yield* Triples;
        hooks.clock.set(1000);
        const a = yield* write();
        const before = yield* t.entity(a.triples[0]!.entityId, {
          recordedAt: a.instant,
          validAt: 1000,
        });
        const b = yield* write();
        yield* check(b.instant > a.instant, "tie did not advance");
        const after = yield* t.entity(a.triples[0]!.entityId, {
          recordedAt: a.instant,
          validAt: 1000,
        });
        yield* check(JSON.stringify(before) === JSON.stringify(after), "served cut changed");
        yield* check(
          (yield* t.entity(b.triples[0]!.entityId, { recordedAt: a.instant, validAt: 1000 }))
            .length === 0,
          "second commit entered first cut",
        );
      }),
    },
    {
      name: "T3 concurrent receipts and readback carry the exact decided instant",
      run: Effect.gen(function* () {
        const t = yield* Triples;
        const receipts = yield* Effect.all(Array.from({ length: 200 }, write), { concurrency: 16 });
        receipts.sort((a, b) => a.position - b.position);
        for (const [i, r] of receipts.entries()) {
          yield* check(i === 0 || r.instant > receipts[i - 1]!.instant, "stamp order");
          yield* check(
            r.triples.every((row) => row.recordedAt === r.instant),
            "assert stamp",
          );
          yield* check((yield* t.transaction(r.txId))?.instant === r.instant, "journal stamp");
          yield* check(
            (yield* t.history(r.triples[0]!.entityId)).every((row) => row.recordedAt === r.instant),
            "history stamp",
          );
        }
        for (let i = 0; i < 50; i++) {
          const r = yield* t.transact([{ op: "retract", id: receipts[i]!.triples[0]!.id }]);
          const record = yield* t.transaction(r.txId);
          yield* check(record?.changes[0]?.retractedAt === r.instant, "retraction stamp");
        }
      }),
    },
    { name: "T4 lost acknowledgement replays original receipt", run: hooks.lostAck },
    {
      name: "T5 watermark waits for publication or refuses with recordedAt axis",
      run: hooks.watermarkWait,
    },
    {
      name: "T6 far-future record cut refuses immediately",
      run: Effect.gen(function* () {
        const t = yield* Triples;
        const start = performance.now();
        const error = yield* t
          .entity(EntityId.make("rt:future"), { recordedAt: Date.now() + 60000 })
          .pipe(Effect.flip);
        yield* check("axis" in error && error.axis === "recordedAt", "untyped refusal");
        yield* check(performance.now() - start < 1000, "far future waited");
      }),
    },
    {
      name: "T7 backwards clock preserves monotonic record time",
      run: Effect.gen(function* () {
        const a = yield* write();
        hooks.clock.set(hooks.clock.get() - 10000);
        const b = yield* write();
        yield* check(b.instant > a.instant, "backwards clock lowered stamp");
      }),
    },
    { name: "T8 deferred placeholder leaks are refused atomically", run: hooks.placeholderLeak },
    {
      name: "T9 valid-time default is staging time",
      run: Effect.gen(function* () {
        const t = yield* Triples;
        hooks.clock.set(1000);
        const r = yield* write();
        yield* check(
          r.stagedAt === 1000 && r.triples[0]!.validFrom === r.stagedAt,
          "default borrowed record time",
        );
        yield* check(
          (yield* t.entity(r.triples[0]!.entityId, { validAt: r.stagedAt, recordedAt: r.instant }))
            .length === 1,
          "own write invisible",
        );
      }),
    },
    {
      name: "T10 deterministic fixtures reproduce reference stamps",
      run: hooks.deterministicReplay,
    },
    {
      name: "T11 pagination on idle scope pins head watermark",
      run: Effect.gen(function* () {
        const r = yield* write();
        const t = yield* Triples;
        const page = yield* t.entityPage({ entityType: "RecordTime", limit: 1 });
        yield* check(page.basis.recordedAt === r.instant, "page used wall clock");
        if (page.nextCursor)
          yield* t.entityPage({ entityType: "RecordTime", limit: 1, cursor: page.nextCursor });
      }),
    },
    {
      name: "T12 journal v2 and legacy records decode exact instants",
      run: Effect.gen(function* () {
        const t = yield* Triples;
        const r = yield* write();
        const record = yield* t.transaction(r.txId);
        yield* check(
          record?.instant === r.instant && record.changes[0]?.recordedAt === r.instant,
          "decoded stamp",
        );
        const facts = yield* t.match({ entityId: EntityId.make(r.txId) });
        yield* check(!facts.some((f) => f.attribute === ":_tx/instant"), "instant value written");
        yield* hooks.legacyJournal;
      }),
    },
  ];
};

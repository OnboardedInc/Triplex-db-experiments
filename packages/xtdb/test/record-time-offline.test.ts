import { it, expect } from "vitest";
import { Effect } from "effect";
import {
  makeA0RecordTimeSuite,
  recordTimeDeterministicFixture,
} from "@triplex-build/triplex-testkit";
import { makeXtdbStorageAdapter } from "../src/XtdbStorageAdapter.js";
import type { QueryExecutorService } from "@triplex-build/triplex/runtime";
import { makeRecordTimeClient } from "./fixtures/record-time-client.js";

for (const commitEncoding of ["a0", "compact"] as const)
  it(`offline actual XTDB A0 protocol T1-T12 (${commitEncoding}; deferred T8 N/A)`, async () => {
    const real = makeRecordTimeClient();
    let lose = false;
    const client = {
      ...real,
      submit: async (...args: Parameters<typeof real.submit>) => {
        const r = await real.submit(...args);
        if (lose) {
          lose = false;
          throw new Error("lost ACK");
        }
        return r;
      },
    };
    const suite = makeA0RecordTimeSuite(
      makeXtdbStorageAdapter(client, "offline", { maxRetries: 256, commitEncoding }),
      {} as QueryExecutorService,
      "offline",
      {
        loseNextAck: () => {
          lose = true;
        },
      },
    );
    await Effect.runPromise(suite.run.pipe(Effect.provide(suite.layer)));
  }, 30000);
it("fresh offline A0 receipts are byte-identical across runs and encodings", async () => {
  const runs = [];
  for (const commitEncoding of ["a0", "compact", "a0"] as const) {
    const client = makeRecordTimeClient();
    const suite = makeA0RecordTimeSuite(
      makeXtdbStorageAdapter(client, "determinism", { commitEncoding }),
      {} as QueryExecutorService,
      "determinism",
      { loseNextAck: () => {} },
    );
    runs.push(await Effect.runPromise(recordTimeDeterministicFixture(suite)));
  }
  expect(runs[1]).toEqual(runs[0]);
  expect(runs[2]).toEqual(runs[0]);
});

it("the decided stamp shares the existing A0/compact CAS statement", async () => {
  const { compactGuards } = await import("../src/XtdbStorageAdapter.js");
  for (const ids of [[], ["command"]]) {
    const guards = compactGuards("scope", 7, "op", ids, ["row"], 1000001);
    expect(guards).toHaveLength(2);
    expect(guards[0]!.sql).toContain("MAX(position)");
    expect(guards[0]!.sql).not.toContain("MAX(stamp)");
    expect(guards[0]!.sql).toContain("WHERE _id = $1 AND scope_key = $1 AND position = $2");
    expect(guards[0]!.params!.at(-1)).toBe(1000001);
  }
});

for (const commitEncoding of ["a0", "compact"] as const)
  it(`omits same-command and cross-ordinal own instants from raw journals (${commitEncoding})`, async () => {
    const { Triples, EntityId, string } = await import("@triplex-build/triplex");
    const adapter = makeXtdbStorageAdapter(makeRecordTimeClient(), "journal-r2", {
      commitEncoding,
    });
    const suite = makeA0RecordTimeSuite(adapter, {} as QueryExecutorService, "journal-r2", {
      loseNextAck: () => {},
    });
    await Effect.runPromise(
      Effect.gen(function* () {
        const t = yield* Triples;
        const assertion = {
          op: "assert" as const,
          entityId: EntityId.make("single"),
          attribute: ":value",
          value: string("one"),
        };
        const single = yield* t.transact([
          assertion,
          { op: "retract-pattern", pattern: { entityId: assertion.entityId } },
        ]);
        const nested = yield* adapter.withTransaction(
          Effect.gen(function* () {
            const a = yield* t.transact([{ ...assertion, entityId: EntityId.make("nested") }]);
            const r = yield* t.transact([{ op: "retract", id: a.triples[0]!.id }]);
            expect(a.instant).toBe(r.instant);
            return { a, r };
          }),
        );
        for (const receipt of [single, nested.a, nested.r]) {
          const raw = yield* adapter.query({ entityId: receipt.txId });
          const changes = raw
            .filter((row) => row.attribute === ":_tx/change")
            .map((row) => JSON.parse(row.value_json!));
          expect(changes.length).toBeGreaterThan(0);
          for (const change of changes) {
            expect(change).not.toHaveProperty("recordedAt");
            expect(change).not.toHaveProperty("retractedAt");
          }
          const hydrated = yield* t.transaction(receipt.txId);
          expect(hydrated!.changes.length).toBe(changes.length);
          for (const change of hydrated!.changes) {
            expect(change.recordedAt).toBe(receipt.instant);
            if (change.op === "retract") expect(change.retractedAt).toBe(receipt.instant);
          }
        }
      }).pipe(Effect.provide(suite.layer)),
    );
  });

for (const commitEncoding of ["a0", "compact"] as const)
  it(`named reads wait for publication and never expose provisional retirements (${commitEncoding})`, async () => {
    const { Triples, EntityId, string } = await import("@triplex-build/triplex");
    const { Fiber } = await import("effect");
    const adapter = makeXtdbStorageAdapter(makeRecordTimeClient(), "pending-r3", {
      commitEncoding,
    });
    const suite = makeA0RecordTimeSuite(adapter, {} as QueryExecutorService, "pending-r3", {
      loseNextAck: () => {},
    });
    await Effect.runPromise(
      Effect.gen(function* () {
        const t = yield* Triples;
        const entity = EntityId.make("stable");
        const seed = yield* t.transact([
          { op: "assert", entityId: entity, attribute: ":value", value: string("seed") },
        ]);
        const basis = { validAt: seed.stagedAt, recordedAt: seed.instant };
        const before = yield* t.entity(entity, basis);
        const abort = yield* adapter
          .withTransaction(
            Effect.gen(function* () {
              yield* t.transact([{ op: "retract", id: seed.triples[0]!.id }]);
              expect(yield* t.entity(entity)).toEqual([]);
              expect(yield* t.entity(entity, basis)).toEqual(before);
              return yield* Effect.fail("rollback-control");
            }),
          )
          .pipe(Effect.flip);
        expect(abort).toBe("rollback-control");
        expect(yield* t.entity(entity, basis)).toEqual(before);
        const publication = yield* adapter.withTransaction(
          Effect.gen(function* () {
            const receipt = yield* t.transact([
              {
                op: "assert",
                entityId: EntityId.make("published"),
                attribute: ":value",
                value: string("final"),
              },
            ]);
            let returned = false;
            const pending = yield* Effect.forkChild(
              t
                .entity(EntityId.make("published"), {
                  validAt: receipt.stagedAt,
                  recordedAt: receipt.instant,
                })
                .pipe(
                  Effect.tap(() =>
                    Effect.sync(() => {
                      returned = true;
                    }),
                  ),
                ),
            );
            yield* Effect.sleep(30);
            expect(returned).toBe(false);
            return { receipt, pending };
          }),
        );
        const served = yield* Fiber.join(publication.pending);
        expect(served).toHaveLength(1);
        expect(served[0]!.recordedAt).toBe(publication.receipt.instant);
        expect(
          yield* t.entity(EntityId.make("published"), {
            validAt: publication.receipt.stagedAt,
            recordedAt: publication.receipt.instant,
          }),
        ).toEqual(served);
      }).pipe(Effect.provide(suite.layer)),
    );
  });

import { it, expect } from "vitest";
import { Effect } from "effect";
import { Triples, EntityId, string } from "@triplex-build/triplex";
import { makeA0RecordTimeSuite } from "@triplex-build/triplex-testkit";
import { makeXtdbStorageAdapter, XtdbSerializationConflict } from "../src/XtdbStorageAdapter.js";
import { sqlTransport } from "./fixtures/journal-sql-transport.js";

// [EXP-RT01] Why: execute the complete emitted CAS in a relational interpreter and inject a stamp-only race. Rejected: checking SQL text or position alone (could silently accept a stale stamp).
for (const commitEncoding of ["a0", "compact"] as const) {
  for (const retry of [false, true]) {
    it(`${commitEncoding}: stale marker refuses atomically${retry ? " then recomputes the stamp on replay" : " without replay"}`, async () => {
      const transport = sqlTransport(),
        scope = "marker-race";
      let armed = false,
        rejected = 0;
      const client = {
        ...transport.client,
        submit: async (statements: any[]) => {
          if (armed && statements.some((s) => s.sql.includes("MAX(position)"))) {
            armed = false;
            transport.db.prepare("UPDATE tx_meta SET stamp = stamp + 10 WHERE _id = ?").run(scope);
          }
          try {
            return await transport.client.submit(statements);
          } catch (e) {
            rejected++;
            throw e;
          }
        },
      };
      const suite = makeA0RecordTimeSuite(
        makeXtdbStorageAdapter(client, scope, { commitEncoding, maxRetries: retry ? 2 : 0 }),
        {} as never,
        scope,
        { loseNextAck: () => {} },
      );
      try {
        await Effect.runPromise(
          Effect.gen(function* () {
            const t = yield* Triples;
            suite.clock.set(1000);
            const op = {
              op: "assert" as const,
              entityId: EntityId.make("subject"),
              attribute: ":value",
              value: string("seed"),
            };
            const seed = yield* t.transact([op]);
            const before = transport.db.prepare("SELECT * FROM tx_assertions ORDER BY _id").all();
            armed = true;
            const result = yield* Effect.exit(t.transact([{ ...op, value: string("after") }]));
            expect(rejected).toBe(1);
            if (retry) {
              expect(result._tag).toBe("Success");
              if (result._tag !== "Success") throw new Error("missing replay receipt");
              expect(result.value.position).toBe(2);
              expect(result.value.instant).toBe(1000.011);
              expect(result.value.stagedAt).toBe(1000);
              expect(result.value.triples.every((r) => r.recordedAt === result.value.instant)).toBe(
                true,
              );
              expect((yield* t.transaction(result.value.txId))?.instant).toBe(result.value.instant);
              expect(
                yield* t.entity(op.entityId, { validAt: 1000, recordedAt: seed.instant }),
              ).toEqual(seed.triples);
            } else {
              expect(result._tag).toBe("Failure");
              if (result._tag !== "Failure") throw new Error("stale stamp committed");
              expect(yield* Effect.failCause(result.cause).pipe(Effect.flip)).toBeInstanceOf(
                XtdbSerializationConflict,
              );
              expect(
                transport.db.prepare("SELECT * FROM tx_assertions ORDER BY _id").all(),
              ).toEqual(before);
              expect(
                transport.db.prepare("SELECT position,stamp FROM tx_meta").get(),
              ).toMatchObject({ position: 1, stamp: 1000010 });
              expect(
                transport.db.prepare("SELECT COUNT(*) AS n FROM tx_attempts").get(),
              ).toMatchObject({ n: 1 });
            }
          }).pipe(Effect.provide(suite.layer)),
        );
      } finally {
        transport.db.close();
      }
    });
  }
  it(`${commitEncoding}: matching scoped MAX cannot substitute for the exact marker key`, async () => {
    const transport = sqlTransport(),
      scope = "marker-identity";
    const adapter = makeXtdbStorageAdapter(transport.client, scope, {
      commitEncoding,
      maxRetries: 0,
    });
    const suite = makeA0RecordTimeSuite(adapter, {} as never, scope, { loseNextAck: () => {} });
    try {
      await Effect.runPromise(
        Effect.gen(function* () {
          const t = yield* Triples;
          const op = {
            op: "assert" as const,
            entityId: EntityId.make("subject"),
            attribute: ":value",
            value: string("v"),
          };
          yield* t.transact([op]);
          transport.db
            .prepare("UPDATE tx_meta SET _id = ? WHERE _id = ?")
            .run("wrong-marker", scope);
          const before = transport.db.prepare("SELECT COUNT(*) AS n FROM tx_assertions").get();
          const error = yield* t.transact([op]).pipe(Effect.flip);
          expect(error).toBeInstanceOf(XtdbSerializationConflict);
          expect(transport.db.prepare("SELECT COUNT(*) AS n FROM tx_assertions").get()).toEqual(
            before,
          );
        }).pipe(Effect.provide(suite.layer)),
      );
    } finally {
      transport.db.close();
    }
  });
}

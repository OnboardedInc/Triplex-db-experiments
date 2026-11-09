import { Effect } from "effect";
import { expect, it } from "vitest";
import { EntityId, Triples, string } from "@triplex-build/triplex";
import { makeA0RecordTimeSuite } from "@triplex-build/triplex-testkit";
import { makeXtdbStorageAdapter } from "../src/XtdbStorageAdapter.js";
import { makeXtdbQueryExecutor } from "../src/XtdbQueryExecutor.js";
import { sqlTransport } from "./fixtures/journal-sql-transport.js";

// [EXP-RT01] Why: execute the reviewer's emitted-SQL reproduction on both encodings. Rejected: a fixture that returns expected journal rows without interpreting the predicates.
for (const commitEncoding of ["a0", "compact"] as const) {
  it(`journal snapshots ignore backward and ahead-of-reader staged clocks (${commitEncoding})`, async () => {
    const transport = sqlTransport();
    const scope = "journal-clock";
    const suite = makeA0RecordTimeSuite(
      makeXtdbStorageAdapter(transport.client, scope, { commitEncoding }),
      makeXtdbQueryExecutor(transport.client, scope),
      scope,
      { loseNextAck: () => {} },
    );
    try {
      await Effect.runPromise(
        Effect.gen(function* () {
          const t = yield* Triples;
          const subject = EntityId.make("subject");
          suite.clock.set(1000);
          const receipt = yield* t.transact(
            [{ op: "assert", entityId: subject, attribute: ":value", value: string("first") }],
            { commandId: "first" },
          );
          const request = { snapshotPosition: receipt.position };
          const before = yield* t.transactionsForEntity(subject, request);
          expect(before.transactions).toHaveLength(1);
          expect(before.transactions[0]?.txId).toBe(receipt.txId);
          suite.clock.set(900);
          expect(yield* t.transactionsForEntity(subject, request)).toEqual(before);
          expect(yield* t.transaction(receipt.txId)).toEqual(before.transactions[0]);
          expect(yield* t.transactionByCommand("first")).toEqual(before.transactions[0]);
          expect((yield* t.transactions()).transactions).toEqual(before.transactions);
          // Ordinary business-time reads must still exclude the future-valid fact.
          expect(yield* t.entity(subject, { basis: { validAt: 900 } })).toEqual([]);
          suite.clock.set(5000);
          const ahead = yield* t.transact([
            { op: "assert", entityId: subject, attribute: ":value", value: string("ahead") },
          ]);
          const page = yield* t.transactionsForEntity(subject, {
            snapshotPosition: ahead.position,
            limit: 1,
          });
          suite.clock.set(800);
          expect(
            yield* t.transactionsForEntity(subject, { snapshotPosition: ahead.position, limit: 1 }),
          ).toEqual(page);
          expect(page.transactions[0]?.txId).toBe(ahead.txId);
          const next = yield* t.transactionsForEntity(subject, {
            snapshotPosition: ahead.position,
            beforePosition: page.nextBeforePosition,
            limit: 1,
          });
          expect(next.transactions).toEqual(before.transactions);
          expect(yield* t.transactionsForEntity(subject, request)).toEqual(before);
        }).pipe(Effect.provide(suite.layer)),
      );
    } finally {
      transport.db.close();
    }
  });
}

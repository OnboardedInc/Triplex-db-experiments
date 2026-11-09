import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { Effect } from "effect";
import { it, expect } from "vitest";
import { EntityId, Triples } from "@triplex-build/triplex";
import { Capabilities, DatabaseScope } from "@triplex-build/triplex/runtime";
import { makeXtdbRuntime } from "../../../../packages/xtdb/src/index.js";
// [CX-VGS12F-R2] Why: pure pack/unpack cannot establish public XTDB boundary storage.
// Rejected: treating the older builder live logs as fresh evidence for the new catalog.
it("XTDB A0: catalog endpoints survive actual writes, gets, receipts and historical reads", async () => {
  const observations: any[] = [];
  const scope = "review-r2-" + randomUUID();
  let nested: any = null;
  for (let i = 0; i < 128; i++) nested = [nested];
  const values: any[] = [
    { type: "string", value: "x".repeat(1048576) },
    { type: "ref", value: "é".repeat(524288) },
    {
      type: "blob",
      value: "x".repeat(1048576),
      mimeType: "x".repeat(1048576),
      size: 9007199254740991,
      filename: "x".repeat(1048576),
    },
    ...[-Number.MAX_VALUE, Number.MAX_VALUE, Number.MIN_VALUE].map((value) => ({
      type: "number",
      value,
    })),
    ...[-8640000000000000, 8640000000000000, -0.5, 0.5].map((value) => ({
      type: "datetime",
      value,
    })),
    ...["-9223372036854775808", "9007199254740993", "9223372036854775807"].map((value) => ({
      type: "integer",
      value,
    })),
    ...[false, true].map((value) => ({ type: "boolean", value })),
    { type: "json", value: nested },
  ];
  try {
    await Effect.runPromise(
      Effect.gen(function* () {
        const t = yield* Triples;
        for (const [i, value] of values.entries()) {
          const entityId = EntityId.make("bound:" + i),
            attribute = ":r2/bound",
            commandId = "bound:" + i;
          const r = yield* t.transact(
            [{ op: "assert", entityId, attribute, value, validFrom: 0 }],
            { commandId },
          );
          expect((yield* t.get(r.triples[0]!.id))?.value).toStrictEqual(value);
          const receipt = yield* t.transactionByCommand(commandId);
          expect(receipt?.txId).toBe(r.txId);
          expect(receipt?.changes[0]?.value).toStrictEqual(value);
          const historical = yield* t.entity(entityId, { recordedAt: r.instant, validAt: 0 });
          expect(historical[0]?.value).toStrictEqual(value);
          observations.push({
            index: i,
            kind: value.type,
            txId: r.txId,
            position: r.position,
            getReceiptAndHistoryExact: true,
          });
        }
      }).pipe(
        Effect.provide(
          makeXtdbRuntime({ url: "postgres://xtdb:xtdb@127.0.0.1:5470/xtdb" }).layer({
            scope: DatabaseScope.test(scope),
            capabilities: Capabilities.none,
          }),
        ),
        Effect.scoped,
      ),
    );
  } finally {
    writeFileSync(
      "lab/verify/GS12F/round3/evidence/current/xtdb-live-boundaries.json",
      JSON.stringify({ scope, observations }, null, 2) + "\n",
    );
  }
}, 120_000);

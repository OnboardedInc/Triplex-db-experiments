import { Effect } from "effect";
import { StorageAdapter, ValueDomains } from "@triplex-build/triplex/runtime";
import {
  Triples,
  EntityId,
  InvalidTripleError,
  integer,
  string,
  boolean,
  datetime,
  ref,
  json,
  type TripleValue,
} from "@triplex-build/triplex";

const verify = (condition: boolean, message: string) =>
  condition ? Effect.void : Effect.fail(new Error(message));

// [EXP-GS12F] Why: exercise public writes and their atomic boundary on every conformance adapter.
// Rejected: schema-only checks (cannot detect WriteError wrapping or consumed command IDs).
export const valueLimitCases = [
  {
    name: "GS12F invalid wire values fail typed before claims on every write entry point",
    run: Effect.gen(function* () {
      const triples = yield* Triples;
      const entityId = EntityId.make("gs12f:invalid");
      const values: unknown[] = [
        ...["9223372036854775808", "-9223372036854775809", "01", "-0", "+1", "1e3"].map(
          (value) => ({ type: "integer", value }),
        ),
        { type: "integer", value: 1 },
        { type: "string", value: 1 },
        { type: "boolean", value: "false" },
        { type: "ref", value: 1 },
        { type: "datetime", value: "yesterday" },
        { type: "number", value: "1" },
        { type: "blob", value: "hash" },
        { type: "unknown", value: "x" },
        ...[NaN, Infinity, -Infinity, -0].map((value) => ({ type: "number", value })),
        ...[NaN, Infinity, -0, -8640000000000001, 8640000000000001].map((value) => ({
          type: "datetime",
          value,
        })),
        ...["\ud800", "\0", "x".repeat(ValueDomains.memory.string.maxUtf8Bytes + 1)].map(
          (value) => ({ type: "string", value }),
        ),
        ...[undefined, { lost: undefined }, { lost: Infinity }, { lost: -0 }].map((value) => ({
          type: "json",
          value,
        })),
        { type: "blob", value: "h", mimeType: "text/plain", size: -1 },
        { type: "decimal", value: "16.50" },
        null,
      ];
      for (const [index, raw] of values.entries()) {
        const value = raw as TripleValue;
        const input = { entityId, attribute: ":gs12f/invalid", value };
        const good = { entityId, attribute: ":gs12f/good", value: string("atomic") };
        const before = yield* triples.currentPosition();
        const beforeRows = (yield* triples.entity(entityId)).length;
        const writes: readonly Effect.Effect<unknown, unknown>[] = [
          triples.assert(input),
          triples.assertBatch([good, input]),
          triples.transact(
            [
              { op: "assert", ...good },
              { op: "assert", ...input },
            ],
            { commandId: `gs12f:invalid:${index}` },
          ),
        ];
        for (const write of writes) {
          const error = yield* write.pipe(Effect.flip);
          yield* verify(
            error instanceof InvalidTripleError && error.field === "value" && error.value === raw,
            `invalid ${index}: expected InvalidTripleError, got ${String(error)}`,
          );
        }
        yield* verify(
          (yield* triples.currentPosition()) === before,
          "invalid command consumed position",
        );
        yield* verify(
          (yield* triples.entity(entityId)).length === beforeRows,
          "invalid batch leaked facts",
        );
        yield* verify(
          (yield* triples.transactionByCommand(`gs12f:invalid:${index}`)) === null,
          "invalid command persisted a receipt",
        );
        // The same command identity must still be available after correction.
        yield* triples.transact([{ op: "assert", ...good }], {
          commandId: `gs12f:invalid:${index}`,
        });
      }
    }),
  },
  {
    name: "GS12F W0 wire kinds retain exact boundary representations",
    run: Effect.gen(function* () {
      const triples = yield* Triples;
      const adapter = yield* Effect.serviceOption(StorageAdapter);
      const integerMilliseconds =
        adapter._tag === "Some" && adapter.value.valueDomain?.datetime.integerMilliseconds;
      const entityId = EntityId.make("gs12f:world");
      // W0/schema.json limits belong to domain validation. Values just outside those limits
      // remain representable storage values: preserve them instead of silently clamping.
      const values: TripleValue[] = [
        ...[-1, 0, 10080, 10081, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER + 1].map(
          (value) => ({ type: "number" as const, value }),
        ),
        ...[
          "1999-12-31",
          "2000-01-01",
          "2099-12-31",
          "2100-01-01",
          "1999-12-31T23:59:59.999999Z",
          "2000-01-01T00:00:00.000000Z",
          "2099-12-31T23:59:59.999999Z",
          "2100-01-01T00:00:00.000000Z",
          "",
          " ",
          "~".repeat(64),
          "x".repeat(65),
          "\u001f",
          "\u007f",
          "pending",
          "authorized",
          "unknown-enum",
        ].map(string),
        ...[
          Date.UTC(1999, 11, 31),
          Date.UTC(2000, 0, 1),
          Date.UTC(2099, 11, 31, 23, 59, 59, 999),
          Date.UTC(2100, 0, 1),
          ...(integerMilliseconds ? [] : [0.5]),
        ].map(datetime),
        boolean(false),
        boolean(true),
        ref(EntityId.make("loc:a")),
        json({ erasedAt: "2000-01-01T00:00:00.000000Z" }),
        json({ erasedAt: "2099-12-31T23:59:59.999999Z" }),
      ];
      for (const [index, value] of values.entries()) {
        const fact = yield* triples.assert({ entityId, attribute: `:gs12f/v${index}`, value });
        yield* verify(
          JSON.stringify((yield* triples.get(fact.id))?.value) === JSON.stringify(value),
          `W0 wire round trip changed value ${index}`,
        );
      }
    }),
  },
];

// Exact-integer capable lanes additionally exercise the native QLever 60-bit boundary and
// Datomic/XTDB signed long boundaries through the public storage path, not bare native queries.
export const exactIntegerLimitCase = {
  name: "GS12F exact integer boundaries round trip with receipt and historical binding",
  run: Effect.gen(function* () {
    const triples = yield* Triples;
    const adapter = yield* Effect.serviceOption(StorageAdapter);
    const bounds =
      adapter._tag === "Some" ? adapter.value.valueDomain?.integer : ValueDomains.memory.integer;
    const entityId = EntityId.make("gs12f:integer");
    const values = [
      -1n,
      0n,
      10080n,
      10081n,
      9007199254740991n,
      9007199254740992n,
      -9223372036854775808n,
      9223372036854775807n,
      -(1n << 59n) - 1n,
      -(1n << 59n),
      -(1n << 59n) + 1n,
      (1n << 59n) - 1n,
      1n << 59n,
      (1n << 59n) + 1n,
      -(1n << 53n) - 1n,
      -(1n << 53n),
      (1n << 53n) - 1n,
      1n << 53n,
      (1n << 53n) + 1n,
    ];
    for (const [index, raw] of values.entries()) {
      const value = integer(raw);
      if (bounds && (raw < BigInt(bounds.min) || raw > BigInt(bounds.max))) {
        const before = yield* triples.currentPosition();
        const error = yield* triples
          .transact([{ op: "assert", entityId, attribute: ":gs12f/outside", value }], {
            commandId: `gs12f:outside:${index}`,
          })
          .pipe(Effect.flip);
        yield* verify(
          error instanceof InvalidTripleError,
          "outside adapter range did not reject typed",
        );
        yield* verify(
          (yield* triples.currentPosition()) === before,
          "outside adapter range claimed a position",
        );
        yield* verify(
          (yield* triples.transactionByCommand(`gs12f:outside:${index}`)) === null,
          "outside adapter range claimed a receipt",
        );
        continue;
      }
      const commandId = `gs12f:exact:${index}`;
      const result = yield* triples.transact(
        [{ op: "assert", entityId, attribute: `:gs12f/i${index}`, value, validFrom: 0 }],
        { commandId },
      );
      yield* verify(
        JSON.stringify((yield* triples.get(result.triples[0]!.id))?.value) ===
          JSON.stringify(value),
        "integer get changed",
      );
      const receipt = yield* triples.transactionByCommand(commandId);
      yield* verify(
        receipt?.txId === result.txId &&
          JSON.stringify(receipt.changes[0]?.value) === JSON.stringify(value),
        "receipt changed integer",
      );
      const historical = yield* triples.entity(entityId, {
        recordedAt: result.instant,
        validAt: 0,
      });
      yield* verify(
        JSON.stringify(historical.find((row) => row.attribute === `:gs12f/i${index}`)?.value) ===
          JSON.stringify(value),
        "historical integer changed",
      );
    }
  }),
};

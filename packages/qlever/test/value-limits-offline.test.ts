import { Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";
import {
  EntityId,
  InvalidTripleError,
  Triples,
  integer,
  string,
  number,
  datetime,
  boolean,
  ref,
  json,
  blob,
  type TripleValue,
} from "@triplex-build/triplex";
import {
  Capabilities,
  DatabaseScope,
  QueryExecutor,
  Runtime,
  StorageAdapter,
  type TripleRow,
} from "@triplex-build/triplex/runtime";
import type { QleverClient } from "../src/QleverClient.js";
import { makeQleverStorageAdapter } from "../src/QleverStorageAdapter.js";
import { decodeRow, encodeRow, packValue } from "../src/rdf.js";

const invalidIntegers = [
  "-576460752303423489",
  "576460752303423488",
  "9223372036854775808",
  "-9223372036854775809",
  "01",
  "-0",
  "+1",
  "1e3",
];
const rowFor = (value: TripleValue): TripleRow => ({
  id: "offline:assertion",
  entity_id: "offline:entity",
  attribute: ":offline/value",
  ...packValue(value),
  recorded_at: 1,
  recorded_position: 1,
  valid_from: 0,
  valid_to: null,
  created_by: null,
  retracted_at: null,
  retracted_position: null,
  retract_tx_id: null,
  entity_type: null,
  schema_version: null,
  tx_id: "offline:transaction",
});

// [EXP-GS12F-R2] Why: isolate typed preflight and exact codec bytes from qlever-dev's update delta.
// Rejected: another resident timeout increase (Q91a/R35 makes that run diagnostic, not qualification).
describe("GS12F QLever offline value limits", () => {
  it("rejects all six invalid integers through the actual QLever adapter before any write request", async () => {
    let queries = 0;
    let mutations = 0;
    const client: QleverClient = {
      query: async () => {
        queries++;
        return [];
      },
      update: async () => {
        mutations++;
        throw new Error("Unexpected offline update");
      },
      command: async () => {
        mutations++;
        throw new Error("Unexpected offline command");
      },
      cancel: async () => {
        throw new Error("Unexpected offline cancellation");
      },
      close: async () => {},
    };
    const adapter = makeQleverStorageAdapter(client, "gs12f:offline");
    const runtime = Runtime.define({
      name: "gs12f-qlever-offline-preflight",
      storage: Layer.succeed(StorageAdapter, adapter),
      // This case only writes invalid commands; it never claims query-executor coverage.
      queries: Layer.succeed(QueryExecutor, {} as never),
    });
    await Effect.runPromise(
      Effect.gen(function* () {
        const triples = yield* Triples;
        expect(queries).toBe(1); // Actual adapter initialization was executed.
        const good = {
          entityId: EntityId.make("offline:entity"),
          attribute: ":offline/good",
          value: string("atomic"),
        };
        for (const value of invalidIntegers) {
          const bad = {
            ...good,
            attribute: ":offline/bad",
            value: { type: "integer" as const, value },
          };
          const writes: readonly Effect.Effect<unknown, unknown>[] = [
            triples.assert(bad),
            triples.assertBatch([good, bad]),
            triples.transact(
              [
                { op: "assert", ...good },
                { op: "assert", ...bad },
              ],
              { commandId: `offline:${value}` },
            ),
          ];
          for (const write of writes) {
            const error = yield* write.pipe(Effect.flip);
            expect(error).toBeInstanceOf(InvalidTripleError);
            expect(error).toMatchObject({ field: "value", value: bad.value });
            expect(queries).toBe(1);
            expect(mutations).toBe(0);
          }
        }
      }).pipe(
        Effect.provide(
          runtime.layer({
            scope: DatabaseScope.test("gs12f-offline"),
            capabilities: Capabilities.none,
          }),
        ),
        Effect.scoped,
      ),
    );
  });

  it("refuses invalid integer payloads directly at the codec boundary", () => {
    for (const value of invalidIntegers) {
      expect(() => packValue({ type: "integer", value })).toThrow(InvalidTripleError);
    }
    for (const value of invalidIntegers.slice(0, 2)) {
      const encoded = JSON.parse(encodeRow(rowFor(integer(0n))));
      encoded.value_string = value;
      expect(() => decodeRow(JSON.stringify(encoded))).toThrow(InvalidTripleError);
    }
  });

  it("round trips W0 wire kinds and integer boundaries through QLever pack/encode/decode", () => {
    const integers = [
      -(1n << 59n),
      -(1n << 59n) + 1n,
      (1n << 59n) - 1n,
      -(1n << 53n) - 1n,
      -(1n << 53n),
      -1n,
      0n,
      10080n,
      10081n,
      (1n << 53n) - 1n,
      1n << 53n,
      (1n << 53n) + 1n,
    ];
    const dates = ["1999-12-31", "2000-01-01", "2099-12-31", "2100-01-01"];
    const instants = [
      "1999-12-31T23:59:59.999999Z",
      "2000-01-01T00:00:00.000000Z",
      "2099-12-31T23:59:59.999999Z",
      "2100-01-01T00:00:00.000000Z",
    ];
    const values: TripleValue[] = [
      ...integers.map(integer),
      ...[-1, 0, 10080, 10081, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER + 1].map(number),
      ...[
        ...dates,
        ...instants,
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
        0.5,
      ].map(datetime),
      boolean(false),
      boolean(true),
      ref(EntityId.make("loc:a")),
      ...instants.map((erasedAt) => json({ erasedAt })),
      blob("hash", "text/plain", 0, ""),
    ];
    for (const value of values) {
      const row = rowFor(value);
      expect(decodeRow(encodeRow(row))).toStrictEqual(row);
      switch (value.type) {
        case "integer":
        case "string":
        case "ref":
          expect(row.value_string).toBe(value.value);
          break;
        case "number":
          expect(Object.is(row.value_number, value.value)).toBe(true);
          break;
        case "datetime":
          expect(Object.is(row.value_datetime, value.value)).toBe(true);
          break;
        case "boolean":
          expect(row.value_boolean).toBe(value.value ? 1 : 0);
          break;
        case "json":
          expect(JSON.parse(row.value_json!)).toStrictEqual(value.value);
          break;
        case "blob":
          expect(row.value_string).toBe(value.value);
          expect(JSON.parse(row.value_json!)).toStrictEqual({
            mimeType: value.mimeType,
            size: value.size,
            filename: value.filename,
          });
          break;
      }
    }
  });
});

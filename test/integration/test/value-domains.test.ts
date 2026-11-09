import { Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";
import {
  EntityId,
  InvalidTripleError,
  Triples,
  KvTriples,
  type TripleValue,
} from "@triplex-build/triplex";
import {
  storedValueDomain,
  ValueDomains,
  decodeValueColumns,
  StorageAdapter,
  QueryExecutor,
  Runtime,
  DatabaseScope,
  Capabilities,
  type ValueDomain,
} from "@triplex-build/triplex/runtime";
import {
  serializeDatom,
  deserializeDatom,
  type Datom,
} from "../../../packages/core/src/kv/hexastore/KvTripleStore.js";
import { valueToTuplePart } from "../../../packages/core/src/kv/hexastore/scan.js";
import { encodeTuple, decodeTuple } from "../../../packages/core/src/kv/hexastore/tuple.js";
import { packValue as xtdb, decodeAssertionRow } from "../../../packages/xtdb/src/codecs.js";
import { packValue as qlever, encodeRow, decodeRow } from "../../../packages/qlever/src/rdf.js";
import { packValue as sql } from "../../../packages/sql/src/queries.js";
import { packValue as cloudflare } from "../../../packages/cloudflare/src/adapter-support.js";
import { buildRow } from "../../../packages/duckdb/src/public-backend.mjs";

const datom = (value: TripleValue): Datom => ({
  tripleId: "bound:fact",
  entity: "bound:entity",
  attribute: ":bound/value",
  value,
  txId: "bound:tx",
  recordedAt: 1,
  recordedPosition: 1,
  validFrom: 0,
  validTo: null,
  createdBy: null,
  retractedAt: null,
  retractedPosition: null,
  retractTxId: null,
  entityType: null,
});
const row = (value: TripleValue, pack: (v: TripleValue) => object): any => ({
  id: "bound:fact",
  entity_id: "bound:entity",
  attribute: ":bound/value",
  ...pack(value),
  recorded_at: 1,
  recorded_position: 1,
  valid_from: 0,
  valid_to: null,
  created_by: null,
  retracted_at: null,
  retracted_position: null,
  retract_tx_id: null,
  entity_type: null,
  schema_version: 1,
  tx_id: "bound:tx",
});
const nested = (depth: number): unknown => {
  let v: unknown = null;
  for (let i = 0; i < depth; i++) v = { child: v };
  return v;
};
const valid = (d: ValueDomain): TripleValue[] => [
  ...["", "x".repeat(d.string.maxUtf8Bytes), "😀".repeat(d.string.maxUtf8Bytes / 4)].map(
    (value) => ({ type: "string" as const, value }),
  ),
  { type: "ref", value: EntityId.make("x".repeat(d.string.maxUtf8Bytes)) },
  ...[d.number.min, -Number.MIN_VALUE, 0, Number.MIN_VALUE, 0.1, d.number.max].map((value) => ({
    type: "number" as const,
    value,
  })),
  ...[d.datetime.min, d.datetime.max, 0, ...(d.datetime.integerMilliseconds ? [] : [0.5])].map(
    (value) => ({
      type: "datetime" as const,
      value,
    }),
  ),
  {
    type: "blob",
    value: "x".repeat(d.string.maxUtf8Bytes),
    mimeType: "x".repeat(d.string.maxUtf8Bytes),
    size: 0,
    filename: "x".repeat(d.string.maxUtf8Bytes),
  },
  { type: "boolean", value: false },
  { type: "boolean", value: true },
  { type: "json", value: nested(d.json.maxDepth) },
  { type: "json", value: { unicode: "😀", nested: [true, null, 0.1] } },
  ...[d.blob.minSize, d.blob.maxSize].map((size) => ({
    type: "blob" as const,
    value: "h",
    mimeType: "text/plain",
    size,
    filename: "",
  })),
  ...(d.integer
    ? [d.integer.min, "0", "9007199254740993", d.integer.max].map((value) => ({
        type: "integer" as const,
        value,
      }))
    : []),
];
const invalid = (d: ValueDomain): unknown[] => {
  const sparse: unknown[] = [];
  sparse.length = 1;
  const cycle: any = {};
  cycle.self = cycle;
  const getter = Object.defineProperty({}, "x", {
    enumerable: true,
    get() {
      throw new Error("getter must not run");
    },
  });
  return [
    ...[
      "x".repeat(d.string.maxUtf8Bytes + 1),
      "😀".repeat(d.string.maxUtf8Bytes / 4) + "x",
      "\ud800",
      "\0",
    ].flatMap((value) => [
      { type: "string", value },
      { type: "ref", value },
    ]),
    ...[Infinity, -Infinity, NaN, -0].map((value) => ({ type: "number", value })),
    ...[
      d.datetime.min - 1,
      d.datetime.max + 1,
      NaN,
      Infinity,
      -0,
      ...(d.datetime.integerMilliseconds ? [0.5, -0.5, Number.MIN_VALUE, 1.0000000000000002] : []),
    ].map((value) => ({
      type: "datetime",
      value,
    })),
    ...[-1, -0, d.blob.maxSize + 1, 0.5, Infinity].map((size) => ({
      type: "blob",
      value: "h",
      mimeType: "text/plain",
      size,
    })),
    ...[
      undefined,
      Infinity,
      -0,
      1n,
      cycle,
      sparse,
      { x: undefined },
      { x: NaN },
      { x: () => 0 },
      getter,
      new Date(0),
      {
        toJSON() {
          return 1;
        },
      },
      { "\ud800": 1 },
      Object.assign(Object.create({ a: 1 }), { b: 2 }),
      nested(d.json.maxDepth + 1),
    ].map((value) => ({ type: "json", value })),
    ...["value", "mimeType", "filename"].map((field) => ({
      type: "blob",
      value: "h",
      mimeType: "text/plain",
      size: 0,
      [field]: "x".repeat(d.string.maxUtf8Bytes + 1),
    })),
    { type: "string", value: "x", extra: true },
    ...["16.50", "16.501"].map((value) => ({ type: "decimal", value })),
    ...(d.integer
      ? [String(BigInt(d.integer.min) - 1n), String(BigInt(d.integer.max) + 1n)]
      : ["0", "9223372036854775807"]
    ).map((value) => ({ type: "integer", value })),
  ];
};
const codecs: Record<keyof typeof ValueDomains, (v: TripleValue) => TripleValue> = {
  memory: (v) => deserializeDatom(serializeDatom(datom(v))).value,
  foundationdb: (v) =>
    deserializeDatom(serializeDatom(datom(v), ValueDomains.foundationdb), ValueDomains.foundationdb)
      .value,
  xtdb: (v) => decodeValueColumns(decodeAssertionRow(row(v, xtdb)), ValueDomains.xtdb),
  qlever: (v) => decodeValueColumns(decodeRow(encodeRow(row(v, qlever))), ValueDomains.qlever),
  sqlite: (v) =>
    decodeValueColumns(
      row(v, (x) => sql(x, ValueDomains.sqlite)),
      ValueDomains.sqlite,
    ),
  postgres: (v) =>
    decodeValueColumns(
      row(v, (x) => sql(x, ValueDomains.postgres)),
      ValueDomains.postgres,
    ),
  cloudflare: (v) => decodeValueColumns(row(v, cloudflare), ValueDomains.cloudflare),
  duckdb: (v) =>
    decodeValueColumns(
      buildRow(
        { entityId: EntityId.make("bound:entity"), attribute: ":bound/value", value: v },
        "bound:tx",
        1,
        "bound:fact",
        1,
      ),
      ValueDomains.duckdb,
    ),
};
// [EXP-GS12F-R3] Why: compare the original input, not its already-normalized encoding, with real codecs.
// Rejected: a catalog-only predicate test (would reproduce the original false acceptance).
for (const key of Object.keys(ValueDomains) as (keyof typeof ValueDomains)[])
  describe(key, () => {
    const domain = ValueDomains[key];
    it("declared endpoints round trip exactly through the adapter codec", () => {
      expect(domain.decimal).toBeNull();
      for (const value of valid(domain)) expect(codecs[key](value)).toStrictEqual(value);
    });
    it("one past every bound and lossy representations reject typed at the codec", () => {
      for (const value of invalid(domain))
        expect(() => codecs[key](value as TripleValue)).toThrow(InvalidTripleError);
    });
    it("all write entry points reject outside the declared domain before transaction or claim", async () => {
      let callbacks = 0,
        claims = 0;
      const adapter: any = {
        valueDomain: domain,
        initialize: () => Effect.void,
        withTransaction: () => {
          callbacks++;
          return Effect.die("unexpected callback");
        },
        claimCommand: () => {
          claims++;
          return Effect.die("unexpected claim");
        },
      };
      const runtime = Runtime.define({
        name: `bounds:${key}`,
        storage: Layer.succeed(StorageAdapter, adapter),
        queries: Layer.succeed(QueryExecutor, {} as never),
      });
      await Effect.runPromise(
        Effect.gen(function* () {
          const triples = yield* Triples;
          for (const value of invalid(domain)) {
            const input = {
              entityId: EntityId.make("bound:entity"),
              attribute: ":bound/value",
              value: value as TripleValue,
            };
            const good = { ...input, value: { type: "string" as const, value: "good" } };
            const writes: readonly Effect.Effect<unknown, unknown>[] = [
              triples.assert(input),
              triples.assertBatch([good, input]),
              triples.transact(
                [
                  { op: "assert", ...good },
                  { op: "assert", ...input },
                ],
                { commandId: "bound:command" },
              ),
            ];
            for (const write of writes) {
              const error = yield* write.pipe(Effect.flip);
              expect(error).toBeInstanceOf(InvalidTripleError);
              expect((error as InvalidTripleError).value).toBe(value);
              expect(callbacks).toBe(0);
              expect(claims).toBe(0);
            }
          }
        }).pipe(
          Effect.provide(
            runtime.layer({
              scope: DatabaseScope.test(`bounds:${key}`),
              capabilities: Capabilities.none,
            }),
          ),
          Effect.scoped,
        ),
      );
    });
  });
it("KV integer tuple bytes retain signed ordering and distinguish adjacent unsafe integers", () => {
  const values = [
    "-9223372036854775808",
    "-1",
    "0",
    "9007199254740992",
    "9007199254740993",
    "9223372036854775807",
  ];
  const keys = values.map((value) => encodeTuple(valueToTuplePart({ type: "integer", value })));
  for (let i = 0; i < keys.length; i++) {
    expect(decodeTuple(keys[i]!)[0]).toEqual({ type: "integer", value: values[i] });
    if (i) expect(Buffer.compare(keys[i - 1]!, keys[i]!)).toBeLessThan(0);
  }
});

it("memory accepted endpoints survive journal, callback, get and receipt without conversion", async () => {
  await Effect.runPromise(
    Effect.gen(function* () {
      const triples = yield* Triples;
      for (const [index, value] of valid(ValueDomains.memory).entries()) {
        const commandId = `bound:accepted:${index}`;
        const result = yield* triples.transact(
          [
            {
              op: "assert",
              entityId: EntityId.make("bound:entity"),
              attribute: `:bound/${index}`,
              value,
              validFrom: 0,
            },
          ],
          { commandId },
        );
        expect((yield* triples.get(result.triples[0]!.id))?.value).toStrictEqual(value);
        const receipt = yield* triples.transactionByCommand(commandId);
        expect(receipt?.txId).toBe(result.txId);
        expect(receipt?.changes[0]?.value).toStrictEqual(value);
        const historical = yield* triples.entity(EntityId.make("bound:entity"), {
          recordedAt: result.instant,
          validAt: 0,
        });
        expect(historical.find((f) => f.attribute === `:bound/${index}`)?.value).toStrictEqual(
          value,
        );
      }
    }).pipe(Effect.provide(KvTriples.layer), Effect.scoped),
  );
});

it("read codecs reject nonfinite numeric payloads with the catalog error type", () => {
  const encoded = JSON.parse(encodeRow(row({ type: "number", value: 1 }, qlever)));
  encoded.value_number = "Infinity";
  expect(() => decodeRow(JSON.stringify(encoded))).toThrow(InvalidTripleError);
  const xtdbRow = row({ type: "datetime", value: 1 }, xtdb);
  xtdbRow.value_datetime = "NaN";
  expect(() => decodeAssertionRow(xtdbRow)).toThrow(InvalidTripleError);
  for (const domain of Object.values(ValueDomains)) {
    const invalidRow = row({ type: "number", value: 1 }, xtdb);
    invalidRow.value_number = Infinity;
    expect(() => decodeValueColumns(invalidRow, domain)).toThrow(InvalidTripleError);
  }
});

// [EXP-GS12F-R4] Why: generated journals have a separate, finite envelope allowance on every codec.
// Rejected: testing only public depth 128 (it missed XTDB's actual journal insertion path).
for (const key of Object.keys(ValueDomains) as (keyof typeof ValueDomains)[]) {
  it(`${key}: dense arrays and stored journal depth agree with the table`, () => {
    const d = ValueDomains[key];
    expect(d.json.maxArrayHoles).toBe(0);
    expect(d.json.journalDepthAllowance).toBe(16);
    const stored = storedValueDomain(d, ":_tx/change");
    const roundTrip = (v: TripleValue) => {
      if (key === "memory" || key === "foundationdb")
        return deserializeDatom(serializeDatom({ ...datom(v), attribute: ":_tx/change" }, d), d)
          .value;
      const pack =
        key === "xtdb" ? xtdb : key === "qlever" ? qlever : key === "cloudflare" ? cloudflare : sql;
      const r = { ...row(v, (x) => pack(x, stored)), attribute: ":_tx/change" };
      if (key === "xtdb") return decodeValueColumns(decodeAssertionRow(r), stored);
      if (key === "qlever") return decodeValueColumns(decodeRow(encodeRow(r)), stored);
      if (key === "duckdb")
        return decodeValueColumns(
          buildRow(
            { entityId: EntityId.make("bound:entity"), attribute: ":_tx/change", value: v },
            "t",
            1,
            "f",
            1,
          ),
          stored,
        );
      return decodeValueColumns(r, stored);
    };
    let at: unknown = null;
    for (let i = 0; i < stored.json.maxDepth; i++) at = [at];
    expect(roundTrip({ type: "json", value: at })).toStrictEqual({ type: "json", value: at });
    expect(() => roundTrip({ type: "json", value: [at] })).toThrow(InvalidTripleError);
    expect(codecs[key]({ type: "json", value: [null] })).toStrictEqual({
      type: "json",
      value: [null],
    });
    for (const property of ["4294967295", "9007199254740993", "01", "-0"]) {
      const hole: any[] = [];
      hole.length = 1;
      Object.defineProperty(hole, property, { value: 7, enumerable: true });
      expect(() => codecs[key]({ type: "json", value: hole })).toThrow(InvalidTripleError);
    }
  });
}

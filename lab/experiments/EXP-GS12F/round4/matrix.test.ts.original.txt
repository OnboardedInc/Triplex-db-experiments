import { writeFileSync } from "node:fs";
import { Effect, Layer, ManagedRuntime } from "effect";
import { expect, it } from "vitest";
import { EntityId, InvalidTripleError, Triples } from "@triplex-build/triplex";
import {
  Capabilities,
  DatabaseScope,
  Runtime,
  StorageAdapter,
  QueryExecutor,
  ValueDomains,
  decodeValueColumns,
} from "@triplex-build/triplex/runtime";
import {
  serializeDatom,
  deserializeDatom,
} from "../../../../packages/core/src/kv/hexastore/KvTripleStore.js";
import { packValue as xtdb, decodeAssertionRow } from "../../../../packages/xtdb/src/codecs.js";
import { packValue as qlever, encodeRow, decodeRow } from "../../../../packages/qlever/src/rdf.js";
import { packValue as sql } from "../../../../packages/sql/src/queries.js";
import { packValue as cloudflare } from "../../../../packages/cloudflare/src/adapter-support.js";
import { buildRow } from "../../../../packages/duckdb/src/public-backend.mjs";
const datum = (value: any): any => ({
  tripleId: "f",
  entity: "e",
  attribute: ":r2/bound",
  value,
  txId: "t",
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
const row = (v: any, pack: (v: any) => any): any => ({
  id: "f",
  entity_id: "e",
  attribute: ":r2/bound",
  ...pack(v),
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
  tx_id: "t",
});
const codecs: Record<string, (v: any) => any> = {
  memory: (v) => deserializeDatom(serializeDatom(datum(v))).value,
  foundationdb: (v) => deserializeDatom(serializeDatom(datum(v))).value,
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
      buildRow({ entityId: EntityId.make("e"), attribute: ":r2/bound", value: v }, "t", 1, "f", 1),
      ValueDomains.duckdb,
    ),
};
const nest = (count: number) => {
  let v: any = null;
  for (let i = 0; i < count; i++) v = [v];
  return v;
};
const caps: Record<string, [string, string] | null> = {
  memory: ["-9223372036854775808", "9223372036854775807"],
  foundationdb: ["-9223372036854775808", "9223372036854775807"],
  xtdb: ["-9223372036854775808", "9223372036854775807"],
  qlever: ["-576460752303423488", "576460752303423487"],
  sqlite: null,
  postgres: null,
  cloudflare: null,
  duckdb: ["-9223372036854775808", "9223372036854775807"],
};
// [CX-VGS12F-R2] Why: literal independent bounds and Unicode widths catch a self-consistent but incorrect table/test pair.
// Rejected: deriving expected limits from the table under review.
for (const [name, codec] of Object.entries(codecs))
  it(`${name}: independent literal endpoints and immediate outside values`, async () => {
    const domain = ValueDomains[name as keyof typeof ValueDomains];
    expect(domain.string).toEqual({ maxUtf8Bytes: 1048576, allowNul: false });
    expect(domain.number).toEqual({
      min: -Number.MAX_VALUE,
      max: Number.MAX_VALUE,
      negativeZero: false,
    });
    expect(domain.datetime).toEqual({ min: -8640000000000000, max: 8640000000000000 });
    expect(domain.json.maxDepth).toBe(128);
    expect(domain.blob).toEqual({ minSize: 0, maxSize: 9007199254740991 });
    expect(domain.decimal).toBeNull();
    expect(domain.integer).toEqual(
      caps[name] ? { min: caps[name]![0], max: caps[name]![1] } : null,
    );
    const at: any[] = [
      ...["x".repeat(1048576), "é".repeat(524288), "😀".repeat(262144)].map((value) => ({
        type: "string",
        value,
      })),
      { type: "ref", value: "é".repeat(524288) },
      ...[-Number.MAX_VALUE, Number.MAX_VALUE, -Number.MIN_VALUE, Number.MIN_VALUE, 0, 0.1].map(
        (value) => ({ type: "number", value }),
      ),
      ...[-8640000000000000, 8640000000000000, -0.5, 0.5, Number.MIN_VALUE].map((value) => ({
        type: "datetime",
        value,
      })),
      ...[false, true].map((value) => ({ type: "boolean", value })),
      { type: "json", value: nest(128) },
      { type: "json", value: { erasedAt: "2099-12-31T23:59:59.999999Z" } },
      { type: "json", value: { ["x".repeat(1048576)]: "é".repeat(524288) } },
      ...[0, 9007199254740991].map((size) => ({
        type: "blob",
        value: "h",
        mimeType: "text/plain",
        size,
        filename: "",
      })),
      {
        type: "blob",
        value: "é".repeat(524288),
        mimeType: "é".repeat(524288),
        size: 0,
        filename: "é".repeat(524288),
      },
      ...(caps[name]
        ? [caps[name]![0], "9007199254740993", caps[name]![1]].map((value) => ({
            type: "integer",
            value,
          }))
        : []),
    ];
    const outside: any[] = [
      ...[
        "x".repeat(1048577),
        "é".repeat(524288) + "x",
        "😀".repeat(262144) + "x",
        "\0",
        "\ud800",
      ].flatMap((value) => [
        { type: "string", value },
        { type: "ref", value },
      ]),
      ...[-Infinity, Infinity, NaN, -0].map((value) => ({ type: "number", value })),
      ...[-8640000000000001, 8640000000000001, -0, Infinity, NaN].map((value) => ({
        type: "datetime",
        value,
      })),
      { type: "json", value: nest(129) },
      { type: "json", value: { x: "x".repeat(1048577) } },
      ...[-1, 9007199254740992, -0].map((size) => ({
        type: "blob",
        value: "h",
        mimeType: "text/plain",
        size,
      })),
      ...["value", "mimeType", "filename"].map((field) => ({
        type: "blob",
        value: "h",
        mimeType: "text/plain",
        size: 0,
        [field]: "x".repeat(1048577),
      })),
      { type: "boolean", value: 1 },
      ...["16.50", "16.501"].map((value) => ({ type: "decimal", value })),
      ...(caps[name]
        ? [String(BigInt(caps[name]![0]) - 1n), String(BigInt(caps[name]![1]) + 1n)]
        : ["0"]
      ).map((value) => ({ type: "integer", value })),
    ];
    let accepted = 0,
      rejected = 0,
      publicRejected = 0,
      callbacks = 0,
      claims = 0;
    const runtime = ManagedRuntime.make(
      Runtime.define({
        name: "literal-matrix",
        storage: Layer.succeed(StorageAdapter, {
          valueDomain: domain,
          initialize: () => Effect.void,
          withTransaction: () => {
            callbacks++;
            return Effect.die("entered transaction");
          },
          claimCommand: () => {
            claims++;
            return Effect.die("entered claim");
          },
        } as any),
        queries: Layer.succeed(QueryExecutor, {} as never),
      }).layer({ scope: DatabaseScope.test("literal-" + name), capabilities: Capabilities.none }),
    );
    try {
      for (const value of at) {
        expect(codec(value)).toStrictEqual(value);
        accepted++;
      }
      const t = await runtime.runPromise(Triples);
      for (const value of outside) {
        expect(() => codec(value)).toThrow(InvalidTripleError);
        rejected++;
        const bad = { entityId: EntityId.make("e"), attribute: ":r2/bound", value };
        const good = { ...bad, value: { type: "string", value: "good" } };
        for (const effect of [
          t.assert(bad),
          t.assertBatch([good, bad]),
          t.transact(
            [
              { op: "assert", ...good },
              { op: "assert", ...bad },
            ],
            { commandId: "invalid" },
          ),
        ]) {
          const e = await runtime.runPromise(effect.pipe(Effect.flip));
          expect(e).toBeInstanceOf(InvalidTripleError);
          expect((e as InvalidTripleError).value).toBe(value);
          expect(callbacks).toBe(0);
          expect(claims).toBe(0);
          publicRejected++;
        }
      }
    } finally {
      await runtime.dispose();
      writeFileSync(
        `lab/verify/GS12F/round2/evidence/matrix-${name}.json`,
        JSON.stringify({ name, accepted, rejected, publicRejected, callbacks, claims }, null, 2) +
          "\n",
      );
    }
  });

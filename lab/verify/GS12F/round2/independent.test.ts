import { writeFileSync } from "node:fs";
import { inspect } from "node:util";
import { Cause, Effect, Layer, ManagedRuntime } from "effect";
import { expect, it } from "vitest";
import {
  EntityId,
  InvalidTripleError,
  Triples,
  KvTriples,
  type TripleValue,
} from "@triplex-build/triplex";
import {
  Capabilities,
  DatabaseScope,
  Runtime,
  StorageAdapter,
  QueryExecutor,
  ValueDomains,
  invalidValue,
  decodeValueColumns,
} from "@triplex-build/triplex/runtime";
import { SqliteTriples } from "@triplex-build/triplex-sqlite";
import { makeTestKvBackend } from "../../../../packages/core/src/kv/kv/InMemoryKvBackend.js";
import {
  serializeDatom,
  deserializeDatom,
} from "../../../../packages/core/src/kv/hexastore/KvTripleStore.js";
import { makeXtdbStorageAdapter } from "../../../../packages/xtdb/src/XtdbStorageAdapter.js";
import { makeQleverStorageAdapter } from "../../../../packages/qlever/src/QleverStorageAdapter.js";
import { packValue as xtdb, decodeAssertionRow } from "../../../../packages/xtdb/src/codecs.js";
import { packValue as qlever, encodeRow, decodeRow } from "../../../../packages/qlever/src/rdf.js";
import { packValue as sql } from "../../../../packages/sql/src/queries.js";
import { TRIPLES_TABLE_DDL } from "../../../../packages/sql/src/schema.js";
import { packValue as cloudflare } from "../../../../packages/cloudflare/src/adapter-support.js";
import { buildRow } from "../../../../packages/duckdb/src/public-backend.mjs";

const out = "lab/verify/GS12F/round2/evidence/";
const save = (name: string, rows: unknown) =>
  writeFileSync(out + name + ".json", JSON.stringify(rows, null, 2) + "\n");
const input = (value: any) => ({
  entityId: EntityId.make("review:r2"),
  attribute: ":review/r2",
  value,
});
const datom = (value: any): any => ({
  tripleId: "r2:f",
  entity: "r2:e",
  attribute: ":review/r2",
  value,
  txId: "r2:t",
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
const row = (value: any, pack: (v: any) => any): any => ({
  id: "r2:f",
  entity_id: "r2:e",
  attribute: ":review/r2",
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
  tx_id: "r2:t",
});
const codecs: Record<string, (v: any) => any> = {
  memory: (v) => deserializeDatom(serializeDatom(datom(v))).value,
  foundationdb: (v) => deserializeDatom(serializeDatom(datom(v))).value,
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
  duckdb: (v) => decodeValueColumns(buildRow(input(v), "r2:t", 1, "r2:f", 1), ValueDomains.duckdb),
};
const decoratedHole = (key = "4294967295") => {
  const a: any[] = new Array(1);
  Object.defineProperty(a, key, { value: 7, writable: true, enumerable: true, configurable: true });
  return { type: "json", value: a };
};

// [CX-VGS12F-R2] Why: integer-looking own properties need not be actual array elements.
// Rejected: testing a sparse array alone (the new cardinality check already rejects that input).
it("all codecs reject a sparse array whose hole is balanced by a non-index numeric property", () => {
  const rows: any[] = [];
  for (const [profile, codec] of Object.entries(codecs))
    for (const key of ["4294967295", "9007199254740993"]) {
      const value = decoratedHole(key);
      let error: unknown, decoded: unknown;
      try {
        decoded = codec(value);
      } catch (e) {
        error = e;
      }
      rows.push({
        profile,
        key,
        admittedByTable:
          invalidValue(value, ValueDomains[profile as keyof typeof ValueDomains]) === undefined,
        original: inspect(value),
        decoded: inspect(decoded),
        error: inspect(error),
        typed: error instanceof InvalidTripleError,
      });
    }
  save("decorated-array-codecs", rows);
  expect(rows.filter((r) => !r.typed)).toEqual([]);
});

for (const lane of ["xtdb", "qlever"] as const)
  it(`${lane}: decorated sparse JSON rejects before callback and claim`, async () => {
    let callbacks = 0,
      claims = 0;
    const client: any = {
      query: async () => [],
      submit: async () => {},
      update: async () => {
        throw Error("unexpected mutation");
      },
      command: async () => {
        throw Error("unexpected mutation");
      },
      close: async () => {},
    };
    const base =
      lane === "xtdb"
        ? makeXtdbStorageAdapter(client, "r2", { maxRetries: 0 })
        : makeQleverStorageAdapter(client, "r2");
    const adapter: any = {
      ...base,
      withTransaction: (...args: any[]) => {
        callbacks++;
        return (base.withTransaction as any)(...args);
      },
      claimCommand: (...args: any[]) => {
        claims++;
        return (base.claimCommand as any)(...args);
      },
    };
    const runtime = ManagedRuntime.make(
      Runtime.define({
        name: "r2-array",
        storage: Layer.succeed(StorageAdapter, adapter),
        queries: Layer.succeed(QueryExecutor, {} as never),
      }).layer({ scope: DatabaseScope.test("r2-array"), capabilities: Capabilities.none }),
    );
    const rows: any[] = [];
    try {
      const t = await runtime.runPromise(Triples);
      const value = decoratedHole();
      const bad = input(value),
        good = input({ type: "string", value: "good" });
      for (const api of ["assert", "assertBatch", "transact"] as const) {
        const before = { callbacks, claims };
        const write =
          api === "assert"
            ? t.assert(bad)
            : api === "assertBatch"
              ? t.assertBatch([good, bad])
              : t.transact(
                  [
                    { op: "assert", ...good },
                    { op: "assert", ...bad },
                  ],
                  { commandId: "array" },
                );
        const exit = await runtime.runPromiseExit(write);
        const e = exit._tag === "Failure" ? Cause.squash(exit.cause) : undefined;
        rows.push({
          api,
          before,
          after: { callbacks, claims },
          typed: e instanceof InvalidTripleError,
          exit: inspect(exit, { depth: 6 }),
        });
      }
    } finally {
      await runtime.dispose();
    }
    save(lane + "-decorated-array", rows);
    expect(
      rows.filter(
        (r) =>
          !r.typed ||
          r.before.callbacks !== r.after.callbacks ||
          r.before.claims !== r.after.claims,
      ),
    ).toEqual([]);
  });

for (const [name, layer] of [
  ["memory", KvTriples.layer],
  ["sqlite", SqliteTriples.layerMemory],
] as const)
  it(`${name}: decorated sparse JSON may not silently change`, async () => {
    const runtime = ManagedRuntime.make(layer);
    const rows: any[] = [];
    try {
      const t = await runtime.runPromise(Triples);
      const value = decoratedHole();
      const exit = await runtime.runPromiseExit(
        t.transact([{ op: "assert", ...input(value) }], { commandId: "array" }),
      );
      let stored: unknown, receipt: unknown;
      if (exit._tag === "Success") {
        stored = await runtime.runPromiseExit(t.get(exit.value.triples[0]!.id));
        receipt = await runtime.runPromiseExit(t.transactionByCommand("array"));
      }
      const error = exit._tag === "Failure" ? Cause.squash(exit.cause) : undefined;
      rows.push({
        original: inspect(value),
        exit: inspect(exit, { depth: 7 }),
        stored: inspect(stored, { depth: 7 }),
        receipt: inspect(receipt, { depth: 9 }),
        typed: error instanceof InvalidTripleError,
      });
    } finally {
      await runtime.dispose();
    }
    save(name + "-decorated-array", rows);
    expect(rows.every((r) => r.typed)).toBe(true);
  });

it("memory canonical integers now succeed through the real callback and exact get", async () => {
  const backend = makeTestKvBackend();
  let callbacks = 0;
  const runtime = ManagedRuntime.make(
    KvTriples.layerBackend.pipe(
      Layer.provide(
        Layer.succeed((await import("@triplex-build/triplex/runtime")).KvBackend, {
          ...backend,
          transact: (fn: any) =>
            backend.transact((tx) => {
              callbacks++;
              return fn(tx);
            }),
        }),
      ),
      Layer.provide(
        (await import("../../../../packages/core/src/store/TripleStoreRuntime.js"))
          .TripleStoreRuntimeLive,
      ),
    ),
  );
  const rows: any[] = [];
  try {
    const t = await runtime.runPromise(Triples);
    for (const v of [
      "-9223372036854775808",
      "0",
      "9007199254740992",
      "9007199254740993",
      "9223372036854775807",
    ]) {
      const value = { type: "integer" as const, value: v };
      const before = callbacks;
      const r = await runtime.runPromise(
        t.transact([{ op: "assert", ...input(value) }], { commandId: v }),
      );
      const stored = await runtime.runPromise(t.get(r.triples[0]!.id));
      rows.push({ v, before, after: callbacks, stored: stored?.value });
      expect(stored?.value).toStrictEqual(value);
      expect(callbacks).toBe(before + 1);
    }
  } finally {
    await runtime.dispose();
    save("memory-integer-success", rows);
  }
});

it("PostgreSQL admits fractional datetimes only if its physical value column can retain them", () => {
  const value: TripleValue = { type: "datetime", value: 0.5 };
  const column = TRIPLES_TABLE_DDL.match(/value_datetime\s+([^,\n]+)/)?.[1]?.trim();
  const observation = {
    value,
    admittedByTable: invalidValue(value, ValueDomains.postgres) === undefined,
    packed: sql(value, ValueDomains.postgres),
    physicalColumn: column,
  };
  save("postgres-datetime-schema", observation);
  expect(observation.admittedByTable && column === "BIGINT").toBe(false);
});

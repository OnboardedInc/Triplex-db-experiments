// [CX-A01-0314-R2] Why: broker mode must preserve the public domain before claims and through generated journal packing. Rejected: A0-only coverage or codec-only round trips (miss both integration defects).
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Effect, Layer, ManagedRuntime, Option } from "effect";
import { describe, expect, it } from "vitest";
import {
  EntityId,
  integer,
  json,
  InvalidTripleError,
  Triples,
  type TripleInput,
  type TriplesService,
  type Triple,
} from "@triplex-build/triplex";
import {
  Capabilities,
  DatabaseScope,
  QueryExecutor,
  Runtime,
  StorageAdapter,
  ValueDomains,
  invalidValue,
} from "@triplex-build/triplex/runtime";
import type { QleverClient } from "../src/QleverClient.js";
import { makeQleverStorageAdapter } from "../src/QleverStorageAdapter.js";
import { makeQleverQueryExecutor } from "../src/QleverQueryExecutor.js";
import { HostBroker } from "../src/broker/broker.js";

type Method = "assert" | "assertBatch" | "transact";
const methods: readonly Method[] = ["assert", "assertBatch", "transact"];
const root = path.resolve(import.meta.dirname, "../../../runs/broker/CX-A01-0314-R2");

async function withBroker(
  run: (context: {
    runtime: ManagedRuntime.ManagedRuntime<Triples, unknown>;
    triples: TriplesService;
    broker: HostBroker;
    adapter: ReturnType<typeof makeQleverStorageAdapter>;
  }) => Promise<void>,
) {
  const scope = `domain:${randomUUID()}`;
  const dir = path.join(root, randomUUID());
  const broker = await HostBroker.open({ dir, scopeKey: scope, minFreeBytes: 0 });
  // [CX-A01-0314-R2] Why: a transport-identified outage exercises real SQLite source reads offline. Rejected: mocked receipts or an invented in-memory commit path.
  const client: QleverClient = {
    query: async (sparql) => {
      if (sparql === "SELECT ?s WHERE { ?s ?p ?o } LIMIT 1") return [];
      throw new TypeError("offline replica fixture", {
        cause: Object.assign(new Error("offline replica"), { code: "ECONNREFUSED" }),
      });
    },
    update: async () => ({}),
    command: async () => ({}),
    cancel: async () => {},
    close: async () => {},
  };
  const adapter = makeQleverStorageAdapter(client, scope, { broker });
  const runtime = ManagedRuntime.make(
    Runtime.define({
      name: "broker-value-domain",
      storage: Layer.succeed(StorageAdapter, adapter),
      queries: Layer.succeed(QueryExecutor, makeQleverQueryExecutor(client, scope)),
    }).layer({ scope: DatabaseScope.test(scope), capabilities: Capabilities.none }),
  );
  let passed = false;
  try {
    const triples = await runtime.runPromise(Triples);
    expect(adapter.valueDomain).toBe(ValueDomains.qlever);
    await run({ runtime, triples, broker, adapter });
    passed = true;
  } finally {
    await runtime.dispose();
    await broker.close();
    if (passed) fs.rmSync(dir, { recursive: true, force: true });
    else console.warn(`Retained failed broker fixture: ${dir}`);
  }
}

const write = (
  triples: TriplesService,
  method: Method,
  input: TripleInput,
): Effect.Effect<readonly Triple[], unknown> => {
  if (method === "assert") return Effect.map(triples.assert(input), (value) => [value]);
  if (method === "assertBatch") return triples.assertBatch([input]);
  return Effect.map(
    triples.transact([{ op: "assert", ...input }], { commandId: "boundary" }),
    (result) => result.triples,
  );
};

const nested = (depth: number) => {
  let value: unknown = "leaf";
  for (let i = 0; i < depth; i++) value = { next: value };
  return json(value);
};

// Literal boundaries are independent of the domain under test so widening it cannot move the expectations.
const integers = [
  ["minimum", -576460752303423488n, true],
  ["maximum", 576460752303423487n, true],
  ["below minimum", -576460752303423489n, false],
  ["above maximum", 576460752303423488n, false],
] as const;

describe("broker public value domain", () => {
  for (const method of methods) {
    for (const [label, raw, accepted] of integers) {
      it(`${method}: exact integer ${label}`, () =>
        withBroker(async ({ runtime, triples, broker }) => {
          const input = {
            entityId: EntityId.make("subject"),
            attribute: ":probe/value",
            value: integer(raw),
          };
          const before = broker.head();
          if (accepted) {
            const rows = await runtime.runPromise(write(triples, method, input));
            expect(rows).toHaveLength(1);
            expect(rows[0]!.value).toEqual(input.value);
            expect((await runtime.runPromise(triples.get(rows[0]!.id)))?.value).toEqual(
              input.value,
            );
            const receipt = await runtime.runPromise(
              triples.transaction(Option.getOrThrow(rows[0]!.txId)),
            );
            expect(receipt?.changes).toEqual([
              expect.objectContaining({ op: "assert", value: input.value }),
            ]);
            if (method === "transact")
              expect(
                (await runtime.runPromise(triples.transactionByCommand("boundary")))?.txId,
              ).toBe(receipt?.txId);
            expect(broker.head()).toBeGreaterThan(before);
          } else {
            const result = await runtime.runPromise(
              write(triples, method, input).pipe(Effect.flip),
            );
            expect(result).toBeInstanceOf(InvalidTripleError);
            expect(broker.head()).toBe(before);
            expect((await runtime.runPromise(triples.transactions())).transactions).toEqual([]);
            expect(await runtime.runPromise(triples.transactionByCommand("boundary"))).toBeNull();
          }
        }));
    }
    for (const depth of [128, 129]) {
      it(`${method}: JSON depth ${depth} has typed admission and complete receipt/readback`, () =>
        withBroker(async ({ runtime, triples, broker }) => {
          expect(ValueDomains.qlever.json.maxDepth).toBe(128);
          const input = {
            entityId: EntityId.make("subject"),
            attribute: ":probe/json",
            value: nested(depth),
          };
          const before = broker.head();
          if (depth === 128) {
            expect(invalidValue(input.value, ValueDomains.qlever)).toBeUndefined();
            const rows = await runtime.runPromise(write(triples, method, input));
            expect(rows).toHaveLength(1);
            expect((await runtime.runPromise(triples.get(rows[0]!.id)))?.value).toEqual(
              input.value,
            );
            const txId = Option.getOrThrow(rows[0]!.txId);
            const receipt = await runtime.runPromise(triples.transaction(txId));
            expect(receipt?.txId).toBe(txId);
            expect(receipt?.changes).toEqual([
              expect.objectContaining({ op: "assert", value: input.value }),
            ]);
            if (method === "transact")
              expect(
                (await runtime.runPromise(triples.transactionByCommand("boundary")))?.txId,
              ).toBe(txId);
            expect(broker.head()).toBeGreaterThan(before);
          } else {
            expect(
              await runtime.runPromise(write(triples, method, input).pipe(Effect.flip)),
            ).toBeInstanceOf(InvalidTripleError);
            expect(broker.head()).toBe(before);
            expect((await runtime.runPromise(triples.transactions())).transactions).toEqual([]);
            expect(await runtime.runPromise(triples.transactionByCommand("boundary"))).toBeNull();
          }
        }));
    }
  }
  it("codec refusal stays typed inside a broker transaction", () =>
    withBroker(async ({ runtime, adapter, broker }) => {
      const before = broker.head();
      const error = await runtime.runPromise(
        adapter
          .withTransaction(
            adapter.insert(
              {
                entityId: EntityId.make("subject"),
                attribute: ":probe/value",
                value: integer(576460752303423488n),
              },
              null,
              100,
              randomUUID(),
              1,
            ),
          )
          .pipe(Effect.flip),
      );
      expect(error).toBeInstanceOf(InvalidTripleError);
      expect(broker.head()).toBe(before);
    }));
});

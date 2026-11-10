// [CX-A01-0314-R3] Why: Datomic must preserve its declared domain through public writes and generated journals. Rejected: preflight-only tests (miss codec and journal defects).
import http from "node:http";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
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
import { DatomicClient } from "../src/DatomicClient.js";
import { makeDatomicStorageAdapter } from "../src/DatomicStorageAdapter.js";
import { makeDatomicQueryExecutor } from "../src/DatomicQueryExecutor.js";
import { decodeRow, type WireRow } from "../src/protocol.js";
import { visibleAt } from "../src/rows.js";
type Method = "assert" | "assertBatch" | "transact";
const methods: readonly Method[] = ["assert", "assertBatch", "transact"];

// [CX-A01-0314-R3] Why: exercise the real Datomic client, staging, row protocol and public journal offline. Rejected: claiming this transport fixture qualifies the native engine.
async function withDatomicFixture(
  run: (context: {
    runtime: ManagedRuntime.ManagedRuntime<Triples, unknown>;
    triples: TriplesService;
    source: { head(): number };
    adapter: ReturnType<typeof makeDatomicStorageAdapter>;
  }) => Promise<void>,
) {
  let position = 0;
  const rows = new Map<string, WireRow>();
  const claims = new Map<string, string>();
  const operations = new Map<string, number>();
  const server = http.createServer(async (req, res) => {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    const input = raw ? JSON.parse(raw) : {};
    const route = req.url!.split("/").at(-1);
    let answer: unknown = {};
    if (route === "begin")
      answer = {
        handle: "fixture",
        position: { t: "long", v: String(position) },
        t: { t: "long", v: String(position) },
        claim: claims.get(input.commandId) ?? null,
        rows: (input.ids ?? []).flatMap((id: string) => (rows.has(id) ? [rows.get(id)!] : [])),
      };
    else if (route === "snapshot")
      answer = { handle: "fixture", position: { t: "long", v: String(position) } };
    else if (route === "basis")
      answer = {
        position: { t: "long", v: String(position) },
        t: { t: "long", v: String(position) },
      };
    else if (route === "claim") answer = { txId: claims.get(input.commandId) ?? null };
    else if (route === "transact") {
      for (const row of input.rows) rows.set(decodeRow(row).id, row);
      for (const claim of input.claims) claims.set(claim.commandId, claim.txId);
      position = input.position;
      operations.set(input.operationId, position);
      answer = {
        operationId: input.operationId,
        position: { t: "long", v: String(position) },
        t: { t: "long", v: String(position) },
        datoms: input.rows.length,
        delta: 0,
      };
    } else if (req.url!.includes("/operation/"))
      answer = operations.has(route!)
        ? {
            status: "committed",
            position: { t: "long", v: String(operations.get(route!)) },
            t: { t: "long", v: String(operations.get(route!)) },
          }
        : { status: "absent" };
    else if (route === "read") {
      const all = new Map(rows);
      for (const row of input.staged?.rows ?? []) all.set(decodeRow(row).id, row);
      answer = {
        rows: [...all.values()].filter((wire) => {
          const row = decodeRow(wire);
          return (
            (!input.id || row.id === input.id) &&
            (!input.entityIds || input.entityIds.includes(row.entity_id)) &&
            (input.history || visibleAt(row, input.basis))
          );
        }),
      };
    }
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(answer));
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address() as AddressInfo;
  const client = new DatomicClient(`http://127.0.0.1:${address.port}`, 5000);
  const scope = DatabaseScope.test(`datomic-domain-${randomUUID()}`);
  const adapter = makeDatomicStorageAdapter(client, scope);
  const runtime = ManagedRuntime.make(
    Runtime.define({
      name: "datomic-domain-fixture",
      storage: Layer.succeed(StorageAdapter, adapter),
      queries: Layer.succeed(QueryExecutor, makeDatomicQueryExecutor(client, scope)),
    }).layer({ scope, capabilities: Capabilities.none }),
  );
  try {
    await run({
      runtime,
      triples: await runtime.runPromise(Triples),
      source: { head: () => position },
      adapter,
    });
  } finally {
    await runtime.dispose();
    client.close();
    server.close();
    await once(server, "close");
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
  ["minimum", -9223372036854775808n, true],
  ["maximum", 9223372036854775807n, true],
  ["below minimum", -9223372036854775809n, false],
  ["above maximum", 9223372036854775808n, false],
] as const;

describe("Datomic public value domain through offline HTTP fixture", () => {
  for (const method of methods) {
    for (const [label, raw, accepted] of integers) {
      it(`${method}: exact integer ${label}`, () =>
        withDatomicFixture(async ({ runtime, triples, source }) => {
          const input = {
            entityId: EntityId.make("subject"),
            attribute: ":probe/value",
            value: accepted ? integer(raw) : { type: "integer" as const, value: String(raw) },
          };
          const before = source.head();
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
            expect(source.head()).toBeGreaterThan(before);
          } else {
            const result = await runtime.runPromise(
              write(triples, method, input).pipe(Effect.flip),
            );
            expect(result).toBeInstanceOf(InvalidTripleError);
            expect(source.head()).toBe(before);
            expect((await runtime.runPromise(triples.transactions())).transactions).toEqual([]);
            expect(await runtime.runPromise(triples.transactionByCommand("boundary"))).toBeNull();
          }
        }));
    }
    for (const depth of [128, 129]) {
      it(`${method}: JSON depth ${depth} has typed admission and complete receipt/readback`, () =>
        withDatomicFixture(async ({ runtime, triples, source }) => {
          expect(ValueDomains.datomic.json.maxDepth).toBe(128);
          const input = {
            entityId: EntityId.make("subject"),
            attribute: ":probe/json",
            value: nested(depth),
          };
          const before = source.head();
          if (depth === 128) {
            expect(invalidValue(input.value, ValueDomains.datomic)).toBeUndefined();
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
            expect(source.head()).toBeGreaterThan(before);
          } else {
            expect(
              await runtime.runPromise(write(triples, method, input).pipe(Effect.flip)),
            ).toBeInstanceOf(InvalidTripleError);
            expect(source.head()).toBe(before);
            expect((await runtime.runPromise(triples.transactions())).transactions).toEqual([]);
            expect(await runtime.runPromise(triples.transactionByCommand("boundary"))).toBeNull();
          }
        }));
    }
  }
  it("codec refusal stays typed inside a source transaction", () =>
    withDatomicFixture(async ({ runtime, adapter, source }) => {
      const before = source.head();
      const error = await runtime.runPromise(
        adapter
          .withTransaction(
            adapter.insert(
              {
                entityId: EntityId.make("subject"),
                attribute: ":probe/value",
                value: { type: "integer", value: "9223372036854775808" },
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
      expect(source.head()).toBe(before);
    }));
});

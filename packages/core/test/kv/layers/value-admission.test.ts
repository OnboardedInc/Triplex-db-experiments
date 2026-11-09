import { Effect, Stream } from "effect";
import { expect, it } from "vitest";
import { ValueDomains } from "../../../src/ValueDomain.js";
import { InvalidTripleError } from "../../../src/errors/index.js";
import { unsafe } from "../../../src/Branded.js";
import { makeTestKvBackend } from "../../../src/kv/kv/InMemoryKvBackend.js";
import { admitKvTransaction, bufferKvTransaction } from "../../../src/kv/layers/valueAdmission.js";
import type { KvBackendService } from "../../../src/kv/kv/KvBackend.js";
const bytes = (s: string) => new TextEncoder().encode(s);
const domain = {
  ...ValueDomains.foundationdb,
  storage: { ...ValueDomains.foundationdb.storage!, maxValueBytes: 8 },
};
const runtime = {
  scope: "test",
  now: Effect.succeed(1),
  nextTxId: Effect.succeed(unsafe.transactionId("_tx/00000000000000000000000000")),
  nextTripleId: Effect.succeed(unsafe.tripleId("00000000000000000000000000")),
};
it("a preflight byte failure never enters the write callback or flushes its claim", async () => {
  const base = makeTestKvBackend();
  let calls = 0;
  const backend: KvBackendService = {
    ...base,
    valueDomain: domain,
    transact: (fn) => {
      calls++;
      return base.transact(fn);
    },
  };
  const original = { type: "string", value: "x" };
  const error = await Effect.runPromise(
    admitKvTransaction(
      backend,
      runtime,
      (tx) =>
        Effect.gen(function* () {
          yield* tx.set(new Uint8Array([0x22]), bytes("claim"));
          yield* tx.set(bytes("x"), new Uint8Array(9));
        }),
      () => original,
    ).pipe(Effect.flip),
  );
  expect(error).toBeInstanceOf(InvalidTripleError);
  expect(error.value).toBe(original);
  expect(calls).toBe(0);
  expect(await Effect.runPromise(base.get(new Uint8Array([0x22])))).toBeNull();
});
it("changed actual data is rechecked before even an already-buffered claim is flushed", async () => {
  const base = makeTestKvBackend();
  let actual = false;
  const backend: KvBackendService = {
    ...base,
    valueDomain: domain,
    transact: (fn) => {
      actual = true;
      return base.transact(fn);
    },
  };
  const original = { type: "string", value: "x" };
  const error = await Effect.runPromise(
    admitKvTransaction(
      backend,
      runtime,
      (tx) =>
        Effect.gen(function* () {
          yield* tx.set(new Uint8Array([0x22]), bytes("claim"));
          yield* tx.set(bytes("x"), new Uint8Array(actual ? 9 : 8));
        }),
      () => original,
    ).pipe(Effect.flip),
  );
  expect(error).toBeInstanceOf(InvalidTripleError);
  expect(error.value).toBe(original);
  expect(await Effect.runPromise(base.get(new Uint8Array([0x22])))).toBeNull();
});
it("preflight and actual execution use identical identities and one sampled clock", async () => {
  const base = makeTestKvBackend();
  const observations: string[] = [];
  let ids = 0,
    times = 0,
    txs = 0;
  const service = {
    scope: "test",
    now: Effect.sync(() => ++times),
    nextTxId: Effect.sync(() => unsafe.transactionId("_tx/" + String(++txs).padStart(26, "0"))),
    nextTripleId: Effect.sync(() => unsafe.tripleId(String(++ids).padStart(26, "0"))),
  };
  const backend = { ...base, valueDomain: ValueDomains.foundationdb };
  await Effect.runPromise(
    admitKvTransaction(
      backend,
      service,
      (tx, r) =>
        Effect.gen(function* () {
          const id = yield* r.nextTripleId;
          const tid = yield* r.nextTxId;
          const time = yield* r.now;
          observations.push(`${id}:${tid}:${time}`);
          yield* tx.set(bytes("x"), bytes(id));
        }),
      () => "x",
    ),
  );
  expect(observations.length).toBe(2);
  expect(observations[0]).toBe(observations[1]);
  expect([ids, times, txs]).toEqual([1, 1, 1]);
  expect(await Effect.runPromise(base.get(bytes("x")))).toEqual(
    bytes("00000000000000000000000001"),
  );
});
it("buffered reads/ranges see writes and deletes without changing the source until flush", async () => {
  const base = makeTestKvBackend();
  await Effect.runPromise(base.set(bytes("a"), bytes("1")));
  await Effect.runPromise(base.set(bytes("c"), bytes("3")));
  const buffered = bufferKvTransaction(
    { ...base, getRange: base.getRange },
    ValueDomains.foundationdb,
    () => "x",
  );
  await Effect.runPromise(buffered.tx.set(bytes("b"), bytes("2")));
  await Effect.runPromise(buffered.tx.delete(bytes("a")));
  expect(await Effect.runPromise(buffered.tx.get(bytes("a")))).toBeNull();
  expect(await Effect.runPromise(base.get(bytes("a")))).toEqual(bytes("1"));
  const decode = (rows: readonly (readonly [Uint8Array, Uint8Array])[]) =>
    rows.map(([k, v]) => [new TextDecoder().decode(k), new TextDecoder().decode(v)]);
  expect(
    decode(
      await Effect.runPromise(
        Stream.runCollect(buffered.tx.getRange({ start: bytes("a"), end: bytes("z") })),
      ),
    ),
  ).toEqual([
    ["b", "2"],
    ["c", "3"],
  ]);
  expect(
    decode(
      await Effect.runPromise(
        Stream.runCollect(
          buffered.tx.getRange({ start: bytes("a"), end: bytes("z"), reverse: true, limit: 1 }),
        ),
      ),
    ),
  ).toEqual([["c", "3"]]);
  await Effect.runPromise(buffered.flush());
  expect(await Effect.runPromise(base.get(bytes("a")))).toBeNull();
});

import { Effect, Layer, ManagedRuntime } from "effect";
import { it, expect } from "vitest";
import { EntityId, InvalidTripleError, Triples, type TripleValue } from "@triplex-build/triplex";
import {
  Capabilities,
  DatabaseScope,
  Runtime,
  KvBackend,
  ValueDomains,
  type ValueDomain,
} from "@triplex-build/triplex/runtime";
import { makeFdbKvBackendService } from "../../../../packages/foundationdb/src/FdbKvBackend.js";
import { makeTestKvBackend } from "../../../../packages/core/src/kv/kv/InMemoryKvBackend.js";
import {
  serializeDatom,
  type Datom,
} from "../../../../packages/core/src/kv/hexastore/KvTripleStore.js";
import {
  bufferKvTransaction,
  invalidKvEntry,
} from "../../../../packages/core/src/kv/layers/valueAdmission.js";
import { observed } from "./foundationdb-stub.js";
const value: TripleValue = { type: "string", value: "exact" };
const input = { entityId: EntityId.make("fdb:bound"), attribute: ":bound/value", value };
const layer = (backend: any) =>
  Runtime.fromKv({ name: "fdb:bounds", backend: Layer.succeed(KvBackend, backend) }).layer({
    scope: DatabaseScope.test("fdb:bounds"),
    capabilities: Capabilities.none,
  });
it("FDB real wrapper commits admitted endpoints; oversized META/journal/index writes fail before its write callback", async () => {
  const backend = await Effect.runPromise(
    makeFdbKvBackendService({ subspace: new Uint8Array([0x70]) }),
  );
  let callbacks = 0;
  const instrumented = {
    ...backend,
    transact: (fn: any) => {
      callbacks++;
      return backend.transact(fn);
    },
  };
  const runtime = ManagedRuntime.make(layer(instrumented));
  try {
    const triples = await runtime.runPromise(Triples);
    const caps = backend.valueDomain!;
    let sample: any;
    const accepted: TripleValue[] = [
      { type: "string", value: "x".repeat(4096) },
      { type: "ref", value: EntityId.make("é".repeat(2048)) },
      { type: "json", value: { text: "x".repeat(4096) } },
      {
        type: "blob",
        value: "h",
        mimeType: "text/plain",
        size: 9007199254740991,
        filename: "x".repeat(4096),
      },
    ];
    for (const [i, v] of accepted.entries()) {
      const r = await runtime.runPromise(
        triples.transact([{ op: "assert", ...input, value: v }], { commandId: `accepted:${i}` }),
      );
      expect((await runtime.runPromise(triples.get(r.triples[0]!.id)))?.value).toStrictEqual(v);
      sample = { r, v };
      const receipt = await runtime.runPromise(triples.transactionByCommand(`accepted:${i}`));
      expect(receipt?.txId).toBe(r.txId);
      expect(receipt?.changes[0]?.value).toStrictEqual(v);
    }
    expect(observed.maxValue).toBeLessThanOrEqual(caps.storage!.maxValueBytes);
    const prototype: Datom = {
      tripleId: sample.r.triples[0].id,
      entity: input.entityId,
      attribute: input.attribute,
      value,
      txId: sample.r.txId,
      recordedAt: sample.r.instant,
      recordedPosition: sample.r.position,
      validFrom: sample.r.instant,
      validTo: null,
      createdBy: "",
      retractedAt: null,
      retractedPosition: null,
      retractTxId: null,
      entityType: null,
    };
    const headerBytes = serializeDatom(prototype).length;
    const endpoint = { ...input, createdBy: "x".repeat(100000 - headerBytes) };
    const boundary = await runtime.runPromise(triples.assert(endpoint));
    expect((await runtime.runPromise(triples.get(boundary.id)))?.createdBy).toMatchObject({
      _tag: "Some",
      value: endpoint.createdBy,
    });
    expect(observed.maxValue).toBe(100000);
    const beforeEndpoint = callbacks;
    const endpointError = await runtime.runPromise(
      triples.assert({ ...endpoint, createdBy: endpoint.createdBy + "x" }).pipe(Effect.flip),
    );
    expect(endpointError).toBeInstanceOf(InvalidTripleError);
    expect(callbacks).toBe(beforeEndpoint);

    observed.maxKey = 0;
    const keyInput = {
      ...input,
      entityId: EntityId.make("e".repeat(4096)),
      attribute: "a".repeat(4096),
      entityType: "E",
    };
    await runtime.runPromise(triples.assert(keyInput));
    const paddedType = "E" + "x".repeat(10000 - caps.storage!.subspaceBytes - observed.maxKey);
    observed.maxKey = 0;
    await runtime.runPromise(triples.assert({ ...keyInput, entityType: paddedType }));
    expect(observed.maxKey + caps.storage!.subspaceBytes).toBe(10000);
    const keyCallbacks = callbacks;
    const keyError = await runtime.runPromise(
      triples.assert({ ...keyInput, entityType: paddedType + "x" }).pipe(Effect.flip),
    );
    expect(keyError).toBeInstanceOf(InvalidTripleError);
    expect(callbacks).toBe(keyCallbacks);
    const bad = [
      { ...input, createdBy: "x".repeat(100000) },
      { ...input, attribute: "x".repeat(10000) },
      {
        ...input,
        value: {
          type: "json" as const,
          value: Array.from({ length: 100 }, () => "x".repeat(1024)),
        },
      },
      {
        ...input,
        value: {
          type: "blob" as const,
          value: "x".repeat(4096),
          mimeType: "x".repeat(4096),
          size: 0,
          filename: "x".repeat(4096),
        },
      },
    ];
    for (const candidate of bad) {
      const before = { callbacks, claims: observed.claimSets, sets: observed.sets };
      const error = await runtime.runPromise(
        triples.transact([{ op: "assert", ...candidate }], { commandId: "bad" }).pipe(Effect.flip),
      );
      expect(error).toBeInstanceOf(InvalidTripleError);
      expect((error as InvalidTripleError).value).toBe(candidate.value);
      expect({ callbacks, claims: observed.claimSets, sets: observed.sets }).toEqual(before);
    }
  } finally {
    await runtime.dispose();
  }
});
it("FDB encoded key, value, mutation and configured subspace limits include their exact endpoints", async () => {
  const original = { type: "string", value: "budget" };
  const base = ValueDomains.foundationdb;
  const storage = base.storage!;
  for (const subspaceBytes of [0, 23]) {
    const d: ValueDomain = { ...base, storage: { ...storage, subspaceBytes } };
    expect(
      invalidKvEntry(d, new Uint8Array(10000 - subspaceBytes), new Uint8Array(100000), original),
    ).toBeUndefined();
    for (const [key, bytes] of [
      [10001 - subspaceBytes, 0],
      [1, 100001],
    ]) {
      const e = invalidKvEntry(d, new Uint8Array(key!), new Uint8Array(bytes!), original);
      expect(e).toBeInstanceOf(InvalidTripleError);
      expect(e?.value).toBe(original);
    }
  }
  let writes = 0;
  const kv = makeTestKvBackend();
  const raw: any = {
    get: kv.get,
    getRange: kv.getRange,
    set: () => {
      writes++;
      return Effect.void;
    },
    delete: () => Effect.void,
  };
  const d: ValueDomain = {
    ...base,
    storage: { ...storage, maxMutationBytes: 100, subspaceBytes: 3 },
  };
  const buffer = bufferKvTransaction(raw, d, () => original);
  await Effect.runPromise(buffer.tx.set(new Uint8Array(1), new Uint8Array(32)));
  expect(writes).toBe(0);
  const error = await Effect.runPromise(
    (
      buffer.tx.set(new Uint8Array(1), new Uint8Array(0)) as Effect.Effect<void, InvalidTripleError>
    ).pipe(Effect.flip),
  );
  expect(error).toBeInstanceOf(InvalidTripleError);
  expect(error.value).toBe(original);
  expect(writes).toBe(0);
  const accepted = bufferKvTransaction(raw, d, () => original);
  await Effect.runPromise(accepted.tx.set(new Uint8Array(1), new Uint8Array(32)));
  await Effect.runPromise(accepted.flush());
  expect(writes).toBe(1);
});
it("META value-byte budget includes actual binary headers and configurable caps", () => {
  const datom: Datom = {
    tripleId: "f",
    entity: "e",
    attribute: ":v",
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
  };
  const overhead = serializeDatom({ ...datom, createdBy: "" }).length;
  for (const cap of [100000, 1000]) {
    const d: ValueDomain = {
      ...ValueDomains.foundationdb,
      storage: { ...ValueDomains.foundationdb.storage!, maxValueBytes: cap },
    };
    expect(serializeDatom({ ...datom, createdBy: "x".repeat(cap - overhead) }, d).length).toBe(cap);
    expect(() =>
      serializeDatom({ ...datom, createdBy: "x".repeat(cap - overhead + 1) }, d),
    ).toThrow(InvalidTripleError);
  }
});
it("the default 8 MB mutation budget admits its final byte and rejects exactly one past before flushing", async () => {
  const d = ValueDomains.foundationdb;
  const kv = makeTestKvBackend();
  const original = { type: "string", value: "budget" };
  for (const past of [0, 1]) {
    let writes = 0;
    const raw: any = {
      get: kv.get,
      getRange: kv.getRange,
      set: () => {
        writes++;
        return Effect.void;
      },
      delete: () => Effect.void,
    };
    const buffer = bufferKvTransaction(raw, d, () => original);
    let remaining = 8000000;
    while (remaining > 100065) {
      await Effect.runPromise(buffer.tx.set(new Uint8Array(1), new Uint8Array(100000)));
      remaining -= 100065;
    }
    const last = buffer.tx.set(
      new Uint8Array(1),
      new Uint8Array(remaining - 65 + past),
    ) as Effect.Effect<void, InvalidTripleError>;
    if (past) {
      const error = await Effect.runPromise(last.pipe(Effect.flip));
      expect(error).toBeInstanceOf(InvalidTripleError);
      expect(error.value).toBe(original);
    } else {
      await Effect.runPromise(last);
      await Effect.runPromise(buffer.flush());
      expect(writes).toBeGreaterThan(0);
    }
    if (past) expect(writes).toBe(0);
  }
});

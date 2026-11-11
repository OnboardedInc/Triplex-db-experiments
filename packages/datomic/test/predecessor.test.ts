import { Effect } from "effect";
import { expect, it, vi } from "vitest";
import { DatabaseScope, type TripleRow } from "@triplex-build/triplex/runtime";
import { DatomicClient, DatomicHttpError } from "../src/DatomicClient.js";
import {
  makeDatomicStorageAdapter,
  DatomicSerializationConflict,
} from "../src/DatomicStorageAdapter.js";
import { databaseName } from "../src/scopeName.js";
import { packValue } from "../src/rows.js";
import { PredecessorCache } from "../src/RowCache.js";
const row = (id = "old"): TripleRow => ({
  id,
  entity_id: "subject",
  attribute: ":stamp",
  ...packValue({ type: "number", value: 0 }),
  recorded_at: 10,
  recorded_position: 1,
  valid_from: -0,
  valid_to: null,
  created_by: "actor",
  retracted_at: null,
  retracted_position: null,
  retract_tx_id: null,
  entity_type: null,
  schema_version: 1,
  tx_id: `_tx/${"0".repeat(26)}`,
});
// [DX-H7] Why: exact retraction receipts need assertion values and provenance as well as a live ID.
// Rejected: a lossy ID-only cache that fabricates those receipt fields after eviction.
it("roundtrips exact predecessor columns with bounded bytes and attribute admission", () => {
  const c = new PredecessorCache(2048, [":stamp"]);
  const r = row();
  const disabled = new PredecessorCache(2048, []);
  disabled.remember("db\0old", r);
  expect(disabled.size).toBe(0);
  expect(disabled.namespaceBytes).toBe(0);
  c.remember("db\0old", r);
  expect(c.row("db\0old")).toEqual(r);
  expect(Object.is(c.row("db\0old")!.valid_from, -0)).toBe(true);
  c.remember("db\0wrong", r);
  expect(c.has("db\0wrong")).toBe(false);
  c.remember("db\0skip", { ...r, id: "skip", attribute: ":other" });
  expect(c.has("db\0skip")).toBe(false);
  for (let i = 0; i < 100; i++) c.remember(`db\0${i}`, row(String(i)));
  expect(c.bytes).toBeLessThanOrEqual(2048);
  expect(c.evictions).toBeGreaterThan(0);
  expect(c.has("db\0old")).toBe(false);
});
function setup(maxRetries = 0) {
  const client = new DatomicClient("http://localhost:1", 5000, 64 * 1024 ** 2, {
    rowCacheBytes: 1024,
  });
  const scope = DatabaseScope.test("DX-H7-predecessor"),
    db = databaseName(scope);
  const adapter = makeDatomicStorageAdapter(client, scope, { maxRetries });
  const publish = (r: TripleRow) => {
    for (const observe of client.rowObservers) observe(db, r);
  };
  const begin = vi.spyOn(client, "beginCommand").mockImplementation(async (_db, hint) => ({
    handle: "snapshot",
    position: 1,
    prefetch: { claim: null, rows: new Map((hint.tripleIds ?? []).map((id) => [id, row(id)])) },
  }));
  const request = vi
    .spyOn(client, "request")
    .mockImplementation(async (_method, path, body: any) => {
      if (!path.endsWith("/transact")) throw Error(`Unexpected HTTP: ${path}`);
      return {
        operationId: body.operationId,
        position: { t: "long", v: String(body.position) },
        t: { t: "long", v: "42" },
        delta: 0,
        datoms: 1,
      } as any;
    });
  const write = (id: string) =>
    adapter.withTransaction(
      Effect.gen(function* () {
        const current = yield* adapter.getById(id);
        expect(current).toEqual(row(id));
        const p = yield* adapter.nextCommitPosition();
        expect(yield* adapter.retract(id, 20, "retire", p)).toBe(true);
        yield* adapter.insert(
          { entityId: "subject", attribute: ":stamp", value: { type: "number", value: 1 } },
          "retire",
          20,
          `next-${id}`,
          p,
        );
      }),
      { replaySafe: true, hint: { tripleIds: [id] } },
    );
  return { client, adapter, db, publish, begin, request, write };
}
it("commits once with exact live preconditions after the row LRU evicts the predecessor", async () => {
  const s = setup();
  try {
    s.publish(row());
    for (let i = 0; i < 10; i++) s.client.rowCache.set(`noise-${i}`, row(`noise-${i}`));
    expect(s.client.rowCache.has(`${s.db}\0old`)).toBe(false);
    await Effect.runPromise(s.write("old"));
    expect(s.begin).not.toHaveBeenCalled();
    expect(s.request).toHaveBeenCalledTimes(1);
    expect(s.request.mock.calls[0]![2]).toMatchObject({
      sourceK: null,
      live: ["old"],
      entities: ["subject"],
    });
    expect(s.client.predecessorCache.has(`${s.db}\0old`)).toBe(false);
    expect(s.client.predecessorCache.row(`${s.db}\0next-old`)).toMatchObject({
      id: "next-old",
      recorded_position: 1,
    });
  } finally {
    s.client.close();
  }
});
it("keeps stale IDs subject to typed conflicts, then accepts a refreshed predecessor", async () => {
  const s = setup();
  try {
    s.publish(row());
    s.client.rowCache.clear();
    s.request.mockRejectedValueOnce(
      new DatomicHttpError(409, "CasConflict", "retired predecessor"),
    );
    const result = await Effect.runPromise(Effect.result(s.write("old")));
    expect(result._tag).toBe("Failure");
    if (result._tag === "Failure")
      expect(result.failure).toBeInstanceOf(DatomicSerializationConflict);
    s.publish(row("fresh"));
    s.client.rowCache.clear();
    await Effect.runPromise(s.write("fresh"));
    expect(s.request.mock.calls[1]![2]).toMatchObject({ live: ["fresh"] });
    expect(s.begin).not.toHaveBeenCalled();
  } finally {
    s.client.close();
  }
});
it("retries a serialization conflict through the existing snapshot fallback", async () => {
  const s = setup(1);
  try {
    s.publish(row());
    s.client.rowCache.clear();
    s.request.mockRejectedValueOnce(new DatomicHttpError(409, "CasConflict", "concurrent change"));
    await Effect.runPromise(s.write("old"));
    expect(s.begin).toHaveBeenCalledTimes(1);
    expect(s.request).toHaveBeenCalledTimes(2);
    expect(s.request.mock.calls[1]![2]).toMatchObject({
      sourceK: 1,
      live: ["old"],
      handle: "snapshot",
    });
    expect(s.client.commitDiagnostics.replays).toBe(1);
  } finally {
    s.client.close();
  }
});

// [DX-H7] Why: the real transactor must reject a cached ID retired by another client.
// Rejected: a mock-only conflict proof or retrying the same stale application precondition forever.
it.skipIf(process.env.DATOMIC_INTEGRATION !== "1")(
  "checks evicted and stale predecessors on the lean gateway",
  async () => {
    const { Layer, ManagedRuntime } = await import("effect");
    const { Triples } = await import("@triplex-build/triplex");
    const { Runtime, StorageAdapter, QueryExecutor, Capabilities } =
      await import("@triplex-build/triplex/runtime");
    const { makeDatomicQueryExecutor } = await import("../src/DatomicQueryExecutor.js");
    const scope = DatabaseScope.test(`DX-H7-stamps-${Date.now()}`);
    const handles = [];
    for (let i = 0; i < 2; i++) {
      const client = new DatomicClient(process.env.DATOMIC_GATEWAY_URL!, 30000, 64 * 1024 ** 2, {
        rowCacheBytes: 1024,
        predecessorAttributes: [":stamp"],
      });
      const adapter = makeDatomicStorageAdapter(client, scope, { layout: "lean", maxRetries: 0 });
      const runtime = ManagedRuntime.make(
        Runtime.define({
          name: "DX-H7",
          storage: Layer.succeed(StorageAdapter, adapter),
          queries: Layer.succeed(QueryExecutor, makeDatomicQueryExecutor(client, scope)),
        }).layer({ scope, capabilities: Capabilities.none }),
      );
      handles.push({ client, adapter, runtime, triples: await runtime.runPromise(Triples) });
    }
    const [a, b] = handles;
    const assertStamp = (value: string) => ({
      op: "assert" as const,
      entityId: "subject" as never,
      attribute: ":stamp" as never,
      value: { type: "integer" as const, value },
      validFrom: 0,
    });
    const replace = (h: typeof a, id: string, value: string) =>
      h.runtime.runPromise(
        h.triples.transact([{ op: "retract", id: id as never }, assertStamp(value)], {
          preconditions: [{ _tag: "TripleLive", id: id as never }],
        }),
      );
    try {
      const seeded = await a.runtime.runPromise(a.triples.transact([assertStamp("0")]));
      const old = seeded.triples[0]!.id;
      const db = databaseName(scope);
      for (let i = 0; i < 10; i++) a.client.rowCache.set(`noise-${i}`, row(`noise-${i}`));
      expect(a.client.rowCache.has(`${db}\0${old}`)).toBe(false);
      const requests = vi.spyOn(a.client, "request");
      const one = await replace(a, old, "1");
      expect(requests).toHaveBeenCalledTimes(1);
      expect(requests.mock.calls[0]![1].endsWith("/transact")).toBe(true);
      const observed = await Effect.runPromise(b.adapter.getByEntity("subject"));
      expect(observed.map((r) => r.id)).toEqual([one.triples[0]!.id]);
      const two = await replace(b, one.triples[0]!.id, "2");
      a.client.rowCache.clear();
      requests.mockClear();
      const stale = await a.runtime.runPromise(
        Effect.result(
          a.triples.transact([{ op: "retract", id: one.triples[0]!.id }, assertStamp("3")], {
            preconditions: [{ _tag: "TripleLive", id: one.triples[0]!.id }],
          }),
        ),
      );
      expect(stale._tag).toBe("Failure");
      if (stale._tag === "Failure")
        expect(stale.failure).toBeInstanceOf(DatomicSerializationConflict);
      expect(requests).toHaveBeenCalledTimes(1);
      if (stale._tag === "Failure")
        expect(stale.failure.cause).toMatchObject({ status: 409, code: "CasConflict" });
      const refreshed = await Effect.runPromise(a.adapter.getByEntity("subject"));
      expect(refreshed.map((r) => r.id)).toEqual([two.triples[0]!.id]);
      a.client.rowCache.clear();
      requests.mockClear();
      const three = await replace(a, refreshed[0]!.id, "3");
      expect(requests).toHaveBeenCalledTimes(1);
      expect(three.retracted).toBe(1);
      expect(three.triples[0]!.value).toEqual({ type: "integer", value: "3" });
      const final = await Effect.runPromise(a.adapter.getByEntity("subject"));
      expect(final.map((r) => r.id)).toEqual([three.triples[0]!.id]);
    } finally {
      for (const h of handles) await h.runtime.dispose();
      await a.client.delete(scope);
      for (const h of handles) h.client.close();
    }
  },
  30000,
);

// [DX-H7] Why: exercise the writer's entire 100k hot set rather than extrapolate from one evicted row.
// Rejected: retaining unrelated facts in the predecessor budget (recreates scope-size churn).
it("retains all four predecessor fields for 100000 subjects within its byte budget", () => {
  const c = new PredecessorCache(256 * 1024 ** 2, [
    ":placement/stamp",
    ":worker/address",
    ":placement/status",
    ":i9/status",
  ]);
  const db = databaseName(DatabaseScope.test("DX-H7-capacity-100000"));
  for (let i = 0; i < 100000; i++) {
    const id = String(i).padStart(26, "0");
    const base = {
      ...row(id),
      recorded_at: 1700000000000,
      recorded_position: i + 1,
      valid_from: 1700000000000,
      tx_id: "_tx/" + id,
    };
    c.remember(`${db}\0${id}`, {
      ...base,
      entity_id: `pl:${String(i).padStart(8, "0")}`,
      attribute: ":placement/stamp",
      ...packValue({ type: "integer", value: "0" }),
    });
    c.remember(`${db}\0a-${id}`, {
      ...base,
      id: `a-${id}`,
      entity_id: `wk:${String(i).padStart(8, "0")}`,
      attribute: ":worker/address",
      ...packValue({ type: "string", value: "1234 Corrected Ave" }),
    });
    for (const [tag, entity, attribute, value] of [
      ["p", "pl", ":placement/status", "active"],
      ["i", "i9", ":i9/status", "pending"],
    ]) {
      const statusId = `${tag}-${id}`;
      c.remember(`${db}\0${statusId}`, {
        ...base,
        id: statusId,
        entity_id: `${entity}:${String(i).padStart(8, "0")}`,
        attribute: attribute!,
        ...packValue({ type: "string", value: value! }),
      });
    }
    c.remember(`${db}\0noise-${id}`, { ...base, attribute: ":unrelated" });
  }
  expect(c.size).toBe(400000);
  expect(c.evictions).toBe(0);
  expect(c.bytes).toBeLessThanOrEqual(c.byteLimit);
  expect(c.row(`${db}\0${"0".repeat(26)}`)!.entity_id).toBe("pl:00000000");
  console.log(
    JSON.stringify({
      predecessorCapacitySubjects: 100000,
      entries: c.size,
      bytes: c.bytes,
      namespaceBytes: c.namespaceBytes,
      limit: c.byteLimit,
      evictions: c.evictions,
    }),
  );
  c.clear();
}, 30000);

it("keeps identical fact IDs isolated through scope removal and namespace reset", () => {
  const c = new PredecessorCache(1024 * 1024);
  c.remember("db-a\0old", { ...row(), entity_id: "a" });
  c.remember("db-b\0old", { ...row(), entity_id: "b" });
  expect(c.row("db-a\0old")!.entity_id).toBe("a");
  expect(c.row("db-b\0old")!.entity_id).toBe("b");
  c.clearScope("db-a");
  expect(c.row("db-a\0old")).toBeUndefined();
  c.remember("db-a\0old", { ...row(), entity_id: "new-a" });
  expect(c.row("db-a\0old")!.entity_id).toBe("new-a");
  expect(c.row("db-b\0old")!.entity_id).toBe("b");
  for (let i = 0; i < 300; i++) c.remember(`db-${i}\0old`, { ...row(), entity_id: String(i) });
  expect(c.namespaceBytes).toBeLessThanOrEqual(65536);
  expect(c.row("db-a\0old")).toBeUndefined();
  expect(c.row("db-299\0old")!.entity_id).toBe("299");
});

// [DX-H7] Why: budget pressure can arrive after admission but before the Effect starts staging.
// Rejected: treating a cache eviction as an application precondition conflict.
it("stages captured predecessors even if both caches are evicted before the first yield", async () => {
  const s = setup();
  try {
    s.publish(row());
    s.client.rowCache.clear();
    vi.spyOn(s.client, "observeRequests").mockImplementation((_observation, call) => {
      s.client.rowCache.clear();
      s.client.predecessorCache.clear();
      return call();
    });
    await Effect.runPromise(s.write("old"));
    expect(s.begin).not.toHaveBeenCalled();
    expect(s.request).toHaveBeenCalledTimes(1);
  } finally {
    s.client.close();
  }
});
it("falls back to begin when the bounded predecessor entry is missing", async () => {
  const s = setup();
  try {
    s.publish(row());
    s.client.rowCache.clear();
    s.client.predecessorCache.clear();
    await Effect.runPromise(s.write("old"));
    expect(s.begin).toHaveBeenCalledTimes(1);
    expect(s.request).toHaveBeenCalledTimes(1);
  } finally {
    s.client.close();
  }
});

// [DX-H7] Why: exercise public runtime assembly, not just the client constructor's cache options.
// Rejected: a configured benchmark whose runtime silently drops predecessor field selection.
it("forwards predecessor budgets and field selection through the public runtime", async () => {
  const { ManagedRuntime } = await import("effect");
  const { Triples } = await import("@triplex-build/triplex");
  const { Capabilities } = await import("@triplex-build/triplex/runtime");
  const { makeDatomicRuntime } = await import("../src/index.js");
  const scope = DatabaseScope.test("DX-H7-runtime-options"),
    db = databaseName(scope);
  let captured: DatomicClient | undefined;
  const request = vi
    .spyOn(DatomicClient.prototype, "request")
    .mockImplementation(async function (this: DatomicClient, _method, path) {
      captured = this;
      if (path !== "/v1/db/create") throw Error(`Unexpected HTTP: ${path}`);
      return { db, created: true, layout: "lean", schemaHash: "unit" } as any;
    });
  const options = {
    url: "http://localhost:1",
    layout: "lean" as const,
    predecessorCacheBytes: 4096,
    predecessorAttributes: [":stamp"],
  };
  const runtime = ManagedRuntime.make(
    makeDatomicRuntime(options).layer({ scope, capabilities: Capabilities.none }),
  );
  try {
    await runtime.runPromise(Triples);
    expect(captured!.predecessorCache.byteLimit).toBe(4096);
    for (const observe of captured!.rowObservers) {
      observe(db, row());
      observe(db, { ...row("skip"), attribute: ":other" });
    }
    expect(captured!.predecessorCache.size).toBe(1);
    expect(captured!.predecessorCache.row(`${db}\0old`)).toEqual(row());
  } finally {
    await runtime.dispose();
    request.mockRestore();
  }
});

it("restores predecessor stamps from a by-reference reach read without refilling the row LRU", async () => {
  const { encodeRowText } = await import("../src/rowText.js");
  const s = setup();
  const wire = { position: 1, t: "42", reset: false, closures: [["subject", ["subject"]]] };
  try {
    s.request
      .mockResolvedValueOnce({ ...wire, entities: [["subject", 1, [encodeRowText(row())]]] } as any)
      .mockResolvedValueOnce({ ...wire, entities: [["subject", 1]] } as any);
    const basis = { validAt: 100, recordedPosition: 1 };
    expect(await s.client.reachEntities(s.db, ["subject"], basis)).toBeDefined();
    s.client.rowCache.clear();
    s.client.predecessorCache.clear();
    expect(await s.client.reachEntities(s.db, ["subject"], basis)).toBeDefined();
    expect(s.client.reachDiagnostics.referenceHits).toBe(1);
    expect(s.client.rowCache.size).toBe(0);
    expect(s.client.predecessorCache.row(`${s.db}\0old`)).toEqual(row());
    s.request.mockClear();
    await Effect.runPromise(s.write("old"));
    expect(s.begin).not.toHaveBeenCalled();
    expect(s.request).toHaveBeenCalledTimes(1);
  } finally {
    s.client.close();
  }
});

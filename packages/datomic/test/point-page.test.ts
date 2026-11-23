import { Layer, ManagedRuntime } from "effect";
import { afterEach, expect, it, vi } from "vitest";
import { Triples } from "@triplex-build/triplex";
import {
  Capabilities,
  DatabaseScope,
  QueryExecutor,
  Runtime,
  StorageAdapter,
} from "@triplex-build/triplex/runtime";
import { DatomicClient } from "../src/DatomicClient.js";
import { makeDatomicQueryExecutor } from "../src/DatomicQueryExecutor.js";
import { makeDatomicStorageAdapter } from "../src/DatomicStorageAdapter.js";
import { databaseName } from "../src/scopeName.js";

afterEach(() => vi.unstubAllEnvs());

it("reads each point page in one request and keeps the first page's position after a new save", async () => {
  vi.stubEnv("TRIPLEX_DATOMIC_POINT_QUERY", "1");
  const scope = DatabaseScope.test("point-page-gate");
  const database = databaseName(scope);
  const client = new DatomicClient("http:" + database);
  let head = 4;
  const positions: Array<number | undefined> = [];
  client.request = async <T>(method: "POST" | "GET", path: string, body?: unknown) => {
    if (method === "POST" && path === "/v1/db/create")
      return { db: database, layout: "lean", created: true } as T;
    expect([method, path]).toEqual(["POST", `/v1/db/${database}/q`]);
    const input = body as {
      singleRequest?: boolean;
      basis: { recordedAt?: number; recordedPosition?: number };
    };
    expect(input.singleRequest).toBe(true);
    expect(input.basis.recordedAt).toBeUndefined();
    positions.push(input.basis.recordedPosition);
    const cut = input.basis.recordedPosition ?? head;
    const values = cut === 4 ? ["alpha", "bravo"] : ["alpha", "newer-value"];
    return { database, recordedPosition: cut, rows: values.map((v) => [{ t: "string", v }]) } as T;
  };
  const rt = ManagedRuntime.make(
    Runtime.define({
      name: "point-page-gate",
      storage: Layer.succeed(StorageAdapter, makeDatomicStorageAdapter(client, scope)),
      queries: Layer.succeed(QueryExecutor, makeDatomicQueryExecutor(client, scope)),
    }).layer({
      scope,
      capabilities: Capabilities.none,
      deterministic: { startTime: 100, seed: "point-page-gate" },
    }),
  );
  const query = { find: ["?v"], where: [["person:1", ":person/status", "?v"]] } as const;
  try {
    const t = await rt.runPromise(Triples);
    const first = await rt.runPromise(t.query(query, { pageSize: 1, includeBasis: true }));
    expect(first.basis).toMatchObject({ recordedPosition: 4, validAt: 100 });
    expect(first.results).toEqual([{ "?v": "alpha" }]);
    expect(first.nextCursor).toBeDefined();
    head = 5;
    const second = await rt.runPromise(t.query(query, { pageSize: 1, cursor: first.nextCursor! }));
    expect(second.results).toEqual([{ "?v": "bravo" }]);
    expect(second.nextCursor).toBeUndefined();
    expect(positions).toEqual([undefined, 4]);
  } finally {
    await rt.dispose();
    client.close();
  }
});

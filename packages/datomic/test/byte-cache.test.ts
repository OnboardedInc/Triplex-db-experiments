import { expect, it, vi } from "vitest";
import { ByteCache } from "../src/ByteCache.js";
import { DatomicClient } from "../src/DatomicClient.js";
import { encodeRowText } from "../src/rowText.js";
import { packValue } from "../src/rows.js";
import { decodeEntity } from "../src/reach.js";
import type { TripleRow } from "@triplex-build/triplex/runtime";
// [DX-B6-3] Why: variable sizes, updates, oversize entries and read promotion all affect byte eviction.
// Rejected: a fill-only count test.
it("enforces bytes on updates and oversize entries with LRU reads", () => {
  const c = new ByteCache<string>(1000, (s) => s.length);
  c.set("a", "x".repeat(250));
  c.set("b", "x".repeat(250));
  c.get("a");
  c.set("c", "x".repeat(250));
  expect(c.has("a")).toBe(true);
  expect(c.has("b")).toBe(false);
  c.set("a", "x".repeat(800));
  expect(c.has("c")).toBe(false);
  expect(c.bytes).toBeLessThanOrEqual(1000);
  c.set("a", "x".repeat(2000));
  expect(c.size).toBe(0);
  expect(c.bytes).toBe(0);
});
it("keeps a 1 MiB client budget exact over a larger world using only need repairs", async () => {
  const budget = 1024 ** 2,
    client = new DatomicClient("http://localhost:1", 5000, 64 * 1024 ** 2, {
      entityCacheBytes: budget,
      rowCacheBytes: budget,
    });
  const world = Array.from(
    { length: 128 },
    (_, i) =>
      ({
        id: `row-${i}`,
        entity_id: `entity-${i}`,
        attribute: ":value",
        ...packValue({ type: "string", value: "x".repeat(16384) + i }),
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
        tx_id: null,
      }) satisfies TripleRow,
  );
  const remembered = new Set<string>();
  vi.spyOn(client, "request").mockImplementation(async (_method, _path, body: any) => {
    const roots = body.need ?? body.roots ?? [body.root];
    return {
      position: 1,
      t: "42",
      reset: false,
      closures: roots.map((id: string) => [id, [id]]),
      entities: roots.map((id: string) => {
        const row = world[Number(id.slice(7))]!;
        const inline = body.need || body.full || !remembered.has(id);
        remembered.add(id);
        return inline ? [id, 1, [encodeRowText(row)]] : [id, 1];
      }),
    } as any;
  });
  try {
    for (let round = 0; round < 2; round++)
      for (const row of world) {
        const result = await client.reachEntities("db", [row.entity_id], {
          validAt: 1,
          recordedPosition: 1,
        });
        expect(result!.entities.get(row.entity_id)).toEqual(
          decodeEntity(row.entity_id, 1, [encodeRowText(row)]),
        );
        client.rowCache.set(row.id, row);
        expect(client.reachCache.bytes).toBeLessThanOrEqual(budget);
        expect(client.rowCache.bytes).toBeLessThanOrEqual(budget);
      }
    expect(client.reachCache.evictions).toBeGreaterThan(0);
    expect(client.rowCache.evictions).toBeGreaterThan(0);
    expect(client.reachDiagnostics.needRequests).toBeGreaterThan(0);
    expect(client.reachDiagnostics.fullRetries).toBe(0);
  } finally {
    client.close();
  }
});

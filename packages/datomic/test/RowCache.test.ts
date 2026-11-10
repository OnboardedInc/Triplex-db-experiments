import { expect, it } from "vitest";
import type { TripleRow } from "@triplex-build/triplex/runtime";
import { RowCache } from "../src/RowCache.js";

// [DX-B3-M4] Why: sustained eviction must remain bounded and honor actual reads, updates and deletions.
// Rejected: a single fill-only test (misses the measured deleted-slot workload).
it("keeps least recently used rows across updates, deletes and sustained turnover", () => {
  const cache = new RowCache(3);
  const row = (id: string) => ({ id }) as TripleRow;
  for (const id of ["a", "b", "c"]) cache.set(id, row(id));
  expect(cache.get("a")!.id).toBe("a");
  cache.set("d", row("d"));
  expect(cache.has("b")).toBe(false);
  cache.set("c", row("c"));
  cache.set("e", row("e"));
  expect(cache.has("a")).toBe(false);
  cache.delete("d");
  cache.set("f", row("f"));
  expect(cache.size).toBe(3);
  cache.clear();
  expect(cache.size).toBe(0);
  for (let i = 0; i < 10000; i++) cache.set(String(i), row(String(i)));
  expect(cache.size).toBe(3);
  expect([cache.get("9997")!.id, cache.get("9998")!.id, cache.get("9999")!.id]).toEqual([
    "9997",
    "9998",
    "9999",
  ]);
  expect(cache.has("9996")).toBe(false);
});

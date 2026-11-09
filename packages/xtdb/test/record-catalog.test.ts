import { describe, expect, it } from "vitest";
import { Effect } from "effect";
import { readXtdbCut } from "../src/RecordCut.js";
import { makeXtdbStorageAdapter } from "../src/XtdbStorageAdapter.js";
import type { XtdbClient } from "../src/XtdbClient.js";
import { recordCatalog } from "./fixtures/record-catalog.js";
import captured from "./fixtures/bootstrap-live-error.json";

// [EXP-RT01] Why: reproduce the observed fresh-engine planner error if the old probe returns. Rejected: a permissive mock that silently returns an empty metadata result.
function fixture(catalog: Record<string, unknown>[], data: Record<string, unknown>[] = [], n = 0) {
  const queries: string[] = [],
    writes: unknown[] = [];
  const state = { catalog, data, n };
  const client = {
    query: async (sql: string) => {
      queries.push(sql);
      if (sql.includes("information_schema")) return state.catalog;
      if (sql.includes("COUNT(*)")) return [{ n: state.n }];
      if (!state.catalog.some((r) => r.table_name === "tx_meta")) throw new Error(captured.error);
      return state.data;
    },
    submit: async (statements: unknown) => {
      writes.push(statements);
      return {};
    },
  } as unknown as XtdbClient;
  return { client, queries, writes, state };
}
const assertions = [{ table_name: "tx_assertions", column_name: "scope_key", xt_type: "utf8" }];
describe("physical record catalog bootstrap", () => {
  it("initializes a physically absent store without executing the captured invalid SQL", async () => {
    const f = fixture([]);
    await Effect.runPromise(makeXtdbStorageAdapter(f.client, "fresh").initialize());
    expect(f.queries.every((sql) => sql.includes("information_schema"))).toBe(true);
    expect(f.queries).not.toContain(captured.query);
    expect(f.writes).toHaveLength(1);
    expect(JSON.stringify(f.writes)).toContain("CREATE TABLE tx_meta");
  });
  it.each([
    [recordCatalog(false), [{ position: 1 }], 0],
    [[...recordCatalog(), ...assertions], [], 2],
    [assertions, [], 1],
    [recordCatalog(), [{ position: 0, stamp: null }], 0],
  ])("refuses nonempty unstamped scopes with no writes %#", async (catalog, data, n) => {
    const f = fixture(catalog, data, n);
    const error = await Effect.runPromise(
      makeXtdbStorageAdapter(f.client, "legacy").initialize().pipe(Effect.flip),
    );
    expect(error).toMatchObject({ _tag: "MigrationError", name: "record-stamp", version: 2 });
    expect(f.writes).toEqual([]);
  });
  it("does not cache absence or source data", async () => {
    const f = fixture([]);
    expect(await readXtdbCut(f.client, "s")).toEqual({ position: 0, recordedAt: 0 });
    f.state.catalog = recordCatalog();
    f.state.data = [{ position: 1, stamp: 1000000 }];
    expect(await readXtdbCut(f.client, "s")).toEqual({ position: 1, recordedAt: 1000 });
    f.state.data = [{ position: 2, stamp: 1001000 }];
    expect(await readXtdbCut(f.client, "s")).toEqual({ position: 2, recordedAt: 1001 });
    f.state.catalog = [...recordCatalog(), ...assertions];
    f.state.data = [];
    f.state.n = 1;
    await expect(readXtdbCut(f.client, "s")).rejects.toMatchObject({ _tag: "MigrationError" });
  });
  it("propagates planner errors rather than reclassifying them as absence", async () => {
    const f = fixture(recordCatalog());
    f.state.catalog = [];
    const broken = {
      ...f.client,
      query: async () => {
        throw new Error(captured.error);
      },
    } as XtdbClient;
    await expect(readXtdbCut(broken, "s")).rejects.toThrow(captured.error);
    expect(f.writes).toEqual([]);
  });
  it.each([
    [{ table_name: "tx_meta", column_name: "position", xt_type: null }],
    [...recordCatalog(), ...recordCatalog()],
    [{ table_name: "tx_meta", column_name: null, xt_type: null }],
  ])("rejects malformed catalogs %#", async (catalog) => {
    const f = fixture(catalog);
    await expect(readXtdbCut(f.client, "s")).rejects.toBeInstanceOf(TypeError);
    expect(f.writes).toEqual([]);
  });
});

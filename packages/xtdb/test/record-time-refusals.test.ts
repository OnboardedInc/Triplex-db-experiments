import { it, expect } from "vitest";
import { Effect } from "effect";
import { TypeExpr } from "@triplex-build/triplex/config";
import { DatabaseScope } from "@triplex-build/triplex/runtime";
import { makeXtdbStorageAdapter } from "../src/XtdbStorageAdapter.js";
import { makeXtdbNativeQueries } from "../src/native/NativeQueries.js";

const scope = DatabaseScope.test("rt01-refusals");
const contract = { name: "rt01/refusal", parameters: TypeExpr.any, row: TypeExpr.any };
// [EXP-RT01] Why: exercise public native and batch entry points, including empty batches. Rejected: accepting a nested cause tag or testing the gate helper alone.
for (const near of [false, true])
  it(`preserves top-level future-cut refusals (${near ? "wait" : "immediate"})`, async () => {
    let queries = 0;
    const client = {
      query: async (query: string) => {
        queries++;
        if (!query.includes("tx_meta") && !query.startsWith("SELECT ?position"))
          throw new Error("Answer query before availability");
        return [{ position: 1, stamp: 1000000 }];
      },
      submit: async () => {
        throw new Error("Read wrote");
      },
      update: async () => {
        throw new Error("Read wrote");
      },
      command: async () => {},
      cancel: async () => {},
      close: async () => {},
    };
    const adapter = makeXtdbStorageAdapter(client as never, scope);
    const native = makeXtdbNativeQueries(client as never, scope);
    const basis = { validAt: 1000, recordedAt: near ? 1000.001 : Date.now() + 60000 };
    const routes = [
      () => adapter.getByEntities([], basis),
      () => adapter.getByEntities(["subject"], basis),
      () => native.select(contract, {}, () => "SELECT ?x WHERE {}", { basis }),
      () => native.selectSql(contract, {}, () => "SELECT 1", { basis }),
    ];
    // Run independent read requests together; each retains its own deadline.
    await Promise.all(
      routes.map(async (route) => {
        const started = performance.now();
        const error = await Effect.runPromise(route().pipe(Effect.flip));
        expect(error).toMatchObject({
          _tag: "BasisNotAvailable",
          axis: "recordedAt",
          required: basis.recordedAt,
          observed: 1000,
        });
        if (near) expect(performance.now() - started).toBeGreaterThanOrEqual(1900);
        else expect(performance.now() - started).toBeLessThan(1000);
      }),
    );
    expect(queries).toBeGreaterThanOrEqual(routes.length);
    const before = queries;
    expect(
      await Effect.runPromise(adapter.getByEntities([], { validAt: 1000, recordedAt: 1000 })),
    ).toEqual(new Map());
    expect(queries).toBe(before + 1);
  }, 10000);

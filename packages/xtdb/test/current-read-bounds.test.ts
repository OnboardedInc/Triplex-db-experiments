// [EXP-P4 arm X1] Current reads with XTDB's default temporal bounds instead of `FOR ALL VALID_TIME`.
// Offline: the option changes only the FROM clause of current `tx_assertions` reads; history reads and every
// other table keep `FOR ALL VALID_TIME`, and the default (no option) is byte-identical to before.
// Integration (XTDB_INTEGRATION=1): both bounds return identical rows after inserts and retractions.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Effect } from "effect";
import type { StorageAdapterService } from "@triplex-build/triplex/runtime";
import { makeXtdbClient, type XtdbClient } from "../src/XtdbClient.js";
import { makeXtdbStorageAdapter } from "../src/XtdbStorageAdapter.js";

const recording = () => {
  const sql: string[] = [];
  const client: XtdbClient = {
    query: async (text) => {
      sql.push(text);
      return [];
    },
    submit: async () => ({}),
    close: async () => {},
  };
  return { client, sql };
};
const basis = { recordedAt: 1_000, validAt: 2_000 };
const reads = (adapter: StorageAdapterService) =>
  Effect.runPromise(
    Effect.all([
      adapter.getByEntity("e:1" as never, basis),
      adapter.getByEntities(["e:1" as never, "e:2" as never], basis),
      adapter.query({ attribute: ":a/b" }, basis),
      adapter.getById("t:1"),
      adapter.history("e:1" as never),
    ]),
  );

describe("XTDB current-read temporal bounds (EXP-P4 X1)", () => {
  it("keeps FOR ALL VALID_TIME on every read by default", async () => {
    const { client, sql } = recording();
    await reads(makeXtdbStorageAdapter(client, "scope:x1"));
    const assertions = sql.filter((text) => text.includes("FROM tx_assertions"));
    expect(assertions).toHaveLength(5);
    for (const text of assertions) expect(text).toContain("FROM tx_assertions FOR ALL VALID_TIME WHERE");
  });

  it("drops the clause only on current tx_assertions reads when asked", async () => {
    const { client, sql } = recording();
    await reads(makeXtdbStorageAdapter(client, "scope:x1", { currentReadTemporalBounds: "default" }));
    const assertions = sql.filter((text) => text.includes("FROM tx_assertions"));
    expect(assertions).toHaveLength(5);
    // getByEntity, getByEntities, query, getById are current reads; history keeps the clause.
    for (const text of assertions.slice(0, 4)) {
      expect(text).toContain("FROM tx_assertions WHERE");
      expect(text).not.toContain("FOR ALL VALID_TIME");
    }
    expect(assertions[4]).toContain("FROM tx_assertions FOR ALL VALID_TIME WHERE");
  });

  it("leaves the default SQL byte-identical to the explicit all-valid-time setting", async () => {
    const a = recording();
    const b = recording();
    await reads(makeXtdbStorageAdapter(a.client, "scope:x1"));
    await reads(makeXtdbStorageAdapter(b.client, "scope:x1", { currentReadTemporalBounds: "all-valid-time" }));
    expect(b.sql).toEqual(a.sql);
  });
});

const enabled = process.env["XTDB_INTEGRATION"] === "1";
const url = process.env["XTDB_URL"] ?? "postgres://xtdb:xtdb@localhost:5442/xtdb";

describe.skipIf(!enabled)("XTDB current-read temporal bounds against the engine", () => {
  let client: XtdbClient;
  beforeAll(async () => {
    client = makeXtdbClient(url);
    await Effect.runPromise(makeXtdbStorageAdapter(client, `x1:init:${randomUUID()}`).initialize());
  });
  afterAll(async () => {
    await client?.close();
  });

  it("returns identical rows to FOR ALL VALID_TIME after inserts and retractions", async () => {
    const scope = `x1:${randomUUID()}`;
    const a0 = makeXtdbStorageAdapter(client, scope);
    const x1 = makeXtdbStorageAdapter(client, scope, { currentReadTemporalBounds: "default" });
    const ids: string[] = [];
    for (let k = 0; k < 3; k++) {
      await Effect.runPromise(
        a0.withTransaction(
          Effect.gen(function* () {
            const position = yield* a0.nextCommitPosition();
            for (let j = 0; j < 4; j++) {
              const id = `x1:${k}:${j}:${randomUUID()}`;
              ids.push(id);
              yield* a0.insert(
                { entityId: `e:${j % 2}` as never, attribute: `:x1/a${j}`, value: { type: "string", value: `v${k}.${j}` } },
                `tx:${k}`,
                1_000 + k * 10,
                id,
                position,
              );
            }
            if (k > 0) yield* a0.retract(ids[(k - 1) * 4]!, 1_000 + k * 10, `tx:${k}`, position);
          }),
        ),
      );
    }
    for (const at of [{ recordedAt: 1_005, validAt: 1_500 }, { recordedAt: 1_015, validAt: 1_500 }, { recordedAt: 9_999, validAt: 9_999 }]) {
      const left = await Effect.runPromise(a0.getByEntities(["e:0" as never, "e:1" as never], at));
      const right = await Effect.runPromise(x1.getByEntities(["e:0" as never, "e:1" as never], at));
      expect([...right]).toEqual([...left]);
    }
    expect(await Effect.runPromise(x1.getByEntity("e:0" as never))).toEqual(await Effect.runPromise(a0.getByEntity("e:0" as never)));
  });
});

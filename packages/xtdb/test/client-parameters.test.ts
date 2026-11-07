import { beforeEach, describe, expect, it, vi } from "vitest";

const driver = vi.hoisted(() => {
  const unsafe = vi.fn(() => Object.assign(Promise.resolve([]), { cancel: vi.fn() }));
  const connection = { unsafe, release: vi.fn() };
  return {
    typed: vi.fn((value: unknown, oid: number) => ({ value, oid })),
    reserve: vi.fn(async () => connection),
    end: vi.fn(async () => {}),
    connection,
  };
});
vi.mock("postgres", () => ({ default: () => driver }));

import { makeXtdbClient } from "../src/XtdbClient.js";

describe("XTDB PostgreSQL parameter encoding", () => {
  beforeEach(() => vi.clearAllMocks());

  it("encodes negative zero as float8 text while keeping integer and exact int64 channels", async () => {
    const client = makeXtdbClient("postgresql://unused-unit-test");
    await client.query(
      "SELECT $1 AS value",
      [-0, 0, 1, 0.25, Number.MAX_SAFE_INTEGER, -Number.MAX_SAFE_INTEGER, 9223372036854775807n],
      undefined,
      { parameterSyntax: "postgresql" },
    );
    expect(driver.typed.mock.calls).toEqual([
      ["-0.0", 701],
      [0, 20],
      [1, 20],
      [0.25, 701],
      [Number.MAX_SAFE_INTEGER, 20],
      [-Number.MAX_SAFE_INTEGER, 20],
      ["9223372036854775807", 20],
    ]);
    expect(driver.connection.release).toHaveBeenCalledOnce();
    await client.close();
  });

  // [EXP-F02b] RULINGS Q30c / EXP-F02 finding 2: a list sent as one JSON parameter turned -0 into 0
  // (`projection-list/json-param/* number neg-zero`) and could not carry int64 at all.
  it("refuses a JSON parameter that would lose -0 or cannot carry a bigint, before any send", async () => {
    const client = makeXtdbClient("postgresql://unused-unit-test");
    for (const param of [[-0], [0, -0], { amount: -0 }, [{ nested: [1, -0] }]])
      await expect(client.query("SELECT $1", [param])).rejects.toThrow(
        /-0, which a JSON parameter/,
      );
    await expect(client.query("SELECT $1", [[1n, 2n]])).rejects.toThrow(/bigint/);
    await expect(
      client.submit([{ sql: "INSERT INTO unit VALUES ($1)", params: [[0, -0]] }]),
    ).rejects.toThrow(/-0/);
    // Only transaction control may have been sent; no statement carried the refused parameter.
    for (const call of driver.connection.unsafe.mock.calls as unknown as Array<[string]>)
      expect(call[0]).not.toMatch(/SELECT \$1|INSERT INTO unit/);
    await client.query("SELECT $1", [[0, 1.5, "x", { a: [true, null] }]]);
    expect(driver.typed.mock.calls).toEqual([[[0, 1.5, "x", { a: [true, null] }], 114]]);
    await client.close();
  });

  it("uses the same lossless parameter mapping in the transaction submission route", async () => {
    const client = makeXtdbClient("postgresql://unused-unit-test");
    await client.submit([
      {
        sql: "INSERT INTO unit VALUES ($1, $2, $3)",
        params: [-0, 0, -9223372036854775808n],
        parameterSyntax: "postgresql",
      },
    ]);
    expect(driver.typed.mock.calls).toEqual([
      ["-0.0", 701],
      [0, 20],
      ["-9223372036854775808", 20],
    ]);
    expect(driver.connection.release).toHaveBeenCalledOnce();
    await client.close();
  });
});

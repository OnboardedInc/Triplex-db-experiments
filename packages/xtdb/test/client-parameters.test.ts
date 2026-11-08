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

  it("binds a non-empty list of strings as text[] and rejects ill-formed members (EXP-J01)", async () => {
    const client = makeXtdbClient("postgresql://unused-unit-test");
    await client.query("SELECT 1 WHERE $1 = ANY($2)", ["a", ["a", "b,c", "it's"]], undefined, {
      parameterSyntax: "postgresql",
    });
    expect(driver.typed.mock.calls).toEqual([
      ["a", 25],
      [["a", "b,c", "it's"], 1009],
    ]);
    await expect(
      client.query("SELECT $1", [["ok", String.fromCharCode(0xd800)]], undefined, {
        parameterSyntax: "postgresql",
      }),
    ).rejects.toThrow(/well-formed Unicode/);
    await client.close();
  });
});

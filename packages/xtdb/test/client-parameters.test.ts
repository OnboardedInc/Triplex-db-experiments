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

import { compactTextArray, makeXtdbClient } from "../src/XtdbClient.js";

import { makeXtdbClient as makeBaselineClient } from "./fixtures/client-before-j01.js";
import { makeXtdbNativeQueries } from "../src/native/NativeQueries.js";
import { Effect } from "effect";
import { TypeExpr } from "@triplex-build/triplex/config";
import { DatabaseScope } from "@triplex-build/triplex/runtime";

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

  it("binds only explicit compact descriptors as text[] and rejects ill-formed members (EXP-J01)", async () => {
    const client = makeXtdbClient("postgresql://unused-unit-test");
    await client.query(
      "SELECT 1 WHERE $1 = ANY($2)",
      ["a", compactTextArray(["a", "b,c", "it's"])],
      undefined,
      {
        parameterSyntax: "postgresql",
      },
    );
    expect(driver.typed.mock.calls).toEqual([
      ["a", 25],
      [["a", "b,c", "it's"], 1009],
    ]);
    await expect(
      client.query(
        "SELECT $1",
        [compactTextArray(["ok", String.fromCharCode(0xd800)])],
        undefined,
        {
          parameterSyntax: "postgresql",
        },
      ),
    ).rejects.toThrow(/well-formed Unicode/);
    await client.close();
  });
  // [EXP-J01] Why: compare actual query/submit/native wire inputs against the pinned
  // pre-J01 client, including empty arrays. Rejected: testing only adapter SQL (F1).
  it("keeps compact-off public and native arrays byte-identical to the pre-J01 client", async () => {
    const saved = process.env["TRIPLEX_COMMIT_ENCODING"];
    const arrays = [
      [],
      ["a", "b"],
      [1, 2],
      ["a", 1, null],
      ["quote'", "\\", "𝄞"],
      ["ok", String.fromCharCode(0xd800)],
    ];
    const exercise = async (factory: typeof makeXtdbClient) => {
      vi.clearAllMocks();
      const client = factory("postgresql://unused-unit-test");
      for (const value of arrays) {
        await client.query("SELECT $1 AS value", [value], undefined, {
          parameterSyntax: "postgresql",
        });
        await client.submit([
          {
            sql: "INSERT INTO unit (_id, value) VALUES ($1, $2)",
            params: ["unit", value],
            parameterSyntax: "postgresql",
          },
        ]);
        for (const language of ["xtdb-sql", "xtql"] as const) {
          const native = makeXtdbNativeQueries(client, DatabaseScope.test("unit"));
          const contract = {
            name: "j01/arrays",
            parameters: TypeExpr.struct({}),
            row: TypeExpr.struct({}),
          };
          const build = (context: import("../src/native/Sources.js").XtdbNativeContext) => {
            const parameter = context.bind(value);
            return language === "xtql"
              ? `(rel [{:value ${parameter}}])`
              : `SELECT ${parameter} AS value`;
          };
          await Effect.runPromise(
            (language === "xtql" ? native.select : native.selectSql)(contract, {}, build, {
              basis: { validAt: 0, recordedPosition: 0 },
            }),
          );
        }
      }
      const calls = structuredClone(driver.connection.unsafe.mock.calls);
      const typed = structuredClone(driver.typed.mock.calls);
      await client.close();
      return { calls, typed };
    };
    try {
      for (const mode of [undefined, "a0"]) {
        if (mode === undefined) delete process.env["TRIPLEX_COMMIT_ENCODING"];
        else process.env["TRIPLEX_COMMIT_ENCODING"] = mode;
        const baseline = await exercise(makeBaselineClient);
        const candidate = await exercise(makeXtdbClient);
        expect(candidate).toEqual(baseline);
        expect(candidate.typed.filter(([, oid]) => oid === 114)).toHaveLength(arrays.length * 4);
        expect(candidate.typed.some(([, oid]) => oid === 1009)).toBe(false);
        // Compare the installed driver's JSON input bytes as well as OID/value pairs.
        expect(
          candidate.typed.map(([value, oid]) => (oid === 114 ? JSON.stringify(value) : value)),
        ).toEqual(
          baseline.typed.map(([value, oid]) => (oid === 114 ? JSON.stringify(value) : value)),
        );
      }
    } finally {
      if (saved === undefined) delete process.env["TRIPLEX_COMMIT_ENCODING"];
      else process.env["TRIPLEX_COMMIT_ENCODING"] = saved;
    }
  });
});

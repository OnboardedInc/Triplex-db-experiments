import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { integer } from "@triplex-build/triplex";
import { compile, compileWrapped, SqliteDialect } from "@triplex-build/triplex/internal";
import { makeSqlQueryExecutor, type SqlStatementRunner } from "../src/SqlQueryExecutor.js";

// The actual core compiler chooses the carrier columns. A minimal driver then
// supplies wire results so this gate isolates the shared public decoder without
// claiming any backend integer SQL semantics. See wiki/research.md.
const dialect = { ...SqliteDialect, exactIntegers: true };
const query = { find: ["?i"], where: [["?e", ":i", "?i"]] } as const;
const runner = (rows: readonly Record<string, unknown>[]): SqlStatementRunner => ({
  run: <Row extends Record<string, unknown>>() => Effect.succeed(rows as readonly Row[]),
});
const carrier = (type: string, value: unknown) => {
  const compiled = compile(query, dialect);
  const [column, columns] = [...compiled.valueColumnMap.entries()][0]!;
  expect(compiled.columnMap.get(column)).toBe("?i");
  expect(compiled.sql).toContain("value_type = 'integer'");
  return { [columns.type]: type, [columns.string]: value, [columns.number]: value };
};

describe("SQL exact integer result boundary", () => {
  it("forwards explicit adapter type evidence through ordinary and wrapped compilation", async () => {
    const aggregate = {
      find: ["?sum"],
      where: [["?e", ":i", "?i"]],
      aggregate: [["sum", "?i", "?sum"]],
    } as const;
    const statements: string[] = [];
    const adapter: SqlStatementRunner = {
      run: <Row extends Record<string, unknown>>(sql: string) => {
        statements.push(sql);
        return Effect.succeed([{ "?sum": "9223372036854775807" }] as unknown as readonly Row[]);
      },
    };
    const executor = makeSqlQueryExecutor(adapter, dialect, { integerVariables: ["?i"] });
    expect((await Effect.runPromise(executor.execute(aggregate))).results).toEqual([
      { "?sum": integer("9223372036854775807") },
    ]);
    expect(
      (await Effect.runPromise(executor.executePage({ inner: aggregate, limit: 10 }))).results,
    ).toEqual([{ "?sum": integer("9223372036854775807") }]);
    expect(statements.every((sql) => sql.includes("value_type = 'integer'"))).toBe(true);
  });
  it("keeps signed64 endpoints and adjacent values beyond binary64 distinct", async () => {
    const values = [
      "-9223372036854775808",
      "9007199254740992",
      "9007199254740993",
      "9223372036854775807",
    ];
    const actual = await Effect.runPromise(
      makeSqlQueryExecutor(runner(values.map((v) => carrier("integer", v))), dialect).execute(
        query,
      ),
    );
    expect(actual.results).toEqual(values.map((value) => ({ "?i": integer(value) })));
  });

  it("preserves legacy number values separately from integer values", async () => {
    const actual = await Effect.runPromise(
      makeSqlQueryExecutor(
        runner([carrier("number", 1.25), carrier("integer", "1")]),
        dialect,
      ).execute(query),
    );
    expect(actual.results).toEqual([{ "?i": 1.25 }, { "?i": integer("1") }]);
  });

  it("decodes computed BIGINT carriers and wrapped pages without Number conversion", async () => {
    const computed = {
      find: ["?next"],
      where: [["?e", ":i", "?i"]],
      compute: [["+", "?i", integer("1"), "?next"]],
    } as const;
    const compiled = compile(computed, dialect);
    const column = [...compiled.columnMap.entries()].find(
      ([, variable]) => variable === "?next",
    )![0];
    expect(compiled.integerColumns?.has(column)).toBe(true);
    expect(
      (
        await Effect.runPromise(
          makeSqlQueryExecutor(runner([{ [column]: 9007199254740993n }]), dialect).execute(
            computed,
          ),
        )
      ).results,
    ).toEqual([{ "?next": integer("9007199254740993") }]);
    const page = { inner: query, limit: 2 } as const;
    const wrapped = compileWrapped(page, dialect);
    const valueColumns = [...wrapped.valueColumnMap.values()][0]!;
    const result = await Effect.runPromise(
      makeSqlQueryExecutor(
        runner([{ [valueColumns.type]: "integer", [valueColumns.string]: "9223372036854775807" }]),
        dialect,
      ).executePage(page),
    );
    expect(result.results).toEqual([{ "?i": integer("9223372036854775807") }]);
  });

  it.each([9007199254740992, "01", "9223372036854775808"])(
    "rejects unsafe or malformed integer driver result %s",
    async (value) => {
      const failure = await Effect.runPromise(
        makeSqlQueryExecutor(runner([carrier("integer", value)]), dialect)
          .execute(query)
          .pipe(Effect.flip),
      );
      expect(failure._tag).toBe("ReadError");
    },
  );
});

import { recordCatalog } from "./fixtures/record-catalog.js";
import { describe, expect, it } from "vitest";
import { Cause, Effect, Exit } from "effect";
import { integer } from "@triplex-build/triplex";
import { TypeExpr } from "@triplex-build/triplex/config";
import { DatabaseScope } from "@triplex-build/triplex/runtime";
import type { XtdbBasis, XtdbClient, XtdbQueryOptions } from "../src/XtdbClient.js";
import { makeXtdbNativeQueries } from "../src/native/NativeQueries.js";
import {
  queryExpressionCorpus,
  lexicalQueryCorpus,
  lexicalUnsafeCorpus,
  lexicalRefusedCorpus,
} from "./query-expression-corpus.js";
import { readOnlyNativeSql } from "../src/native/ReadOnlySql.js";

const scope = DatabaseScope.test("native-unit");
const contract = {
  name: "native/unit",
  parameters: TypeExpr.struct({ owner: TypeExpr.required(TypeExpr.text) }),
  row: TypeExpr.struct({ count: TypeExpr.required(TypeExpr.int64) }),
};
const fixture = (rows: Record<string, unknown>[] = [{ count: "9223372036854775807" }]) => {
  const calls: { sql: string; params: readonly unknown[]; options?: XtdbQueryOptions }[] = [];
  const client: XtdbClient = {
    query: async <T extends Record<string, unknown>>(
      sql: string,
      params: readonly unknown[] = [],
      _basis?: XtdbBasis,
      options?: XtdbQueryOptions,
    ) => {
      if (sql.includes("information_schema")) return recordCatalog() as T[];
      calls.push({ sql, params, ...(options ? { options } : {}) });
      return (sql.includes("tx_meta")
        ? [{ position: "9", stamp: "100250" }]
        : rows) as unknown as T[];
    },
    submit: async () => {
      throw new Error("Native reads must not submit application mutations");
    },
    close: async () => {},
  };
  return { client, calls };
};

describe("XTDB native read provider", () => {
  it("rejects mutation/control statements and modifying CTEs while preserving quoted native text", () => {
    for (const query of [
      "UPDATE tx_assertions SET value_string = 'changed'",
      "WITH changed AS (DELETE FROM tx_assertions) SELECT 1",
      "SELECT 1; UPDATE tx_assertions SET value_string = 'changed'",
      "SELECT 1; SELECT 2",
      "SET AWAIT_TOKEN = 'other'",
      // [EXP-X02] R14 H05: a quantified comparison over a non-subquery swallows `AND p`.
      "SELECT 1 FROM t WHERE k = ANY($1) AND a = 'x'",
      "SELECT 1 FROM t WHERE k = some ( $1 )",
      "SELECT 1 FROM t WHERE k > ALL(ARRAY[1, 2])",
    ])
      expect(() => readOnlyNativeSql(query)).toThrow();
    for (const query of [
      "SELECT 1 FROM t WHERE k = ANY (SELECT x FROM UNNEST($1) AS u(x)) AND a = 'x'",
      "SELECT 1 FROM t WHERE k IN (SELECT x FROM UNNEST($1) AS u(x)) AND a = 'x'",
      "SELECT a FROM t UNION ALL SELECT b FROM u",
      "SELECT 'any(' AS literal",
    ])
      expect(() => readOnlyNativeSql(query)).not.toThrow();
    expect(
      readOnlyNativeSql("SELECT $native$UPDATE ?; DELETE$native$ AS message; -- retained\n"),
    ).toBe("SELECT $native$UPDATE ?; DELETE$native$ AS message -- retained\n");
    expect(
      readOnlyNativeSql("WITH x AS (SELECT 'can''t UPDATE' AS message) SELECT * FROM x"),
    ).toContain("can't".replace("'", "''"));
  });
  it.each([
    "ANY/**/(ARRAY[1,2])",
    "ANY ARRAY[1,2]",
    "SOME/**/(ARRAY[1,2])",
    "ALL--comment\r(ARRAY[1,2])",
    "ANY/**/ ARRAY[1,2]",
    "ANY/**/((ARRAY[1,2]))",
    "SOME /* subquery */ (((ARRAY[1,2])))",
    "ANY ((SELECT 1 WHERE 1 = SOME/**/ ARRAY[1,2]))",
    "ALL (((SELECT 1 WHERE 1 = ANY ((ARRAY[1,2])))))",
    "ANY ((SELECT 1)",
  ])("refuses quantified operand %s in the public error channel", async (operand) => {
    const { client, calls } = fixture();
    const exit = await Effect.runPromiseExit(
      makeXtdbNativeQueries(client, scope).selectSql(
        contract,
        { owner: "o" },
        () => `SELECT 'x' AS v FROM (VALUES (1)) t(k) WHERE k = ${operand} AND 1 = 1`,
      ),
    );
    expect(Exit.isFailure(exit)).toBe(true);
    if (Exit.isFailure(exit)) {
      expect(Cause.hasDies(exit.cause)).toBe(false);
      expect(String(exit.cause)).toContain("non-subquery operand");
    }
    expect(calls.some(({ sql }) => sql.includes("ARRAY[1,2]"))).toBe(false);
  });
  // [EXP-X02-R4] Why: require dispatch for every generated lexer/suffix form,
  // and typed pre-dispatch refusal for all boundary/mutation variations.
  // Rejected: mock success as engine evidence (real comparisons are retained separately).
  it("classifies pinned lexer and suffix productions", async () => {
    for (const { sql } of lexicalQueryCorpus()) {
      const { client, calls } = fixture();
      await Effect.runPromise(
        makeXtdbNativeQueries(client, scope).selectSql(contract, { owner: "o" }, () => sql),
      );
      expect(calls.some((call) => call.sql.includes(sql))).toBe(true);
    }
    for (const sql of [...lexicalUnsafeCorpus(), ...lexicalRefusedCorpus()]) {
      const { client, calls } = fixture();
      const exit = await Effect.runPromiseExit(
        makeXtdbNativeQueries(client, scope).selectSql(contract, { owner: "o" }, () => sql),
      );
      expect(Exit.isFailure(exit)).toBe(true);
      if (Exit.isFailure(exit)) expect(Cause.hasDies(exit.cause)).toBe(false);
      expect(calls.some((call) => call.sql.includes(sql))).toBe(false);
    }
  }, 60_000);
  // [EXP-X02-Q79e] Why: check every generated expression and invalid productions
  // through the provider. Rejected: six more hand-selected UNION spellings.
  it("classifies the generated query-expression grammar", async () => {
    for (const entry of queryExpressionCorpus()) {
      const { client, calls } = fixture();
      await Effect.runPromise(
        makeXtdbNativeQueries(client, scope).selectSql(contract, { owner: "o" }, () => entry.sql),
      );
      expect(calls.some((call) => call.sql.includes(entry.sql))).toBe(true);
    }
  });
  it.each([
    "ARRAY[1]",
    "(ARRAY[1])",
    "SELECT 1 UNION ARRAY[2]",
    "(SELECT 1) UNION (ARRAY[2])",
    "SELECT 1 UNION",
    "()",
  ])("refuses non-query production %s", (operand) => {
    expect(() => readOnlyNativeSql(`SELECT 1 WHERE 1 = ANY (${operand})`)).toThrow(
      "non-subquery operand",
    );
  });
  // [EXP-X02-R3] Why: retain all six F1-R2 public-provider forms and deeper
  // comment-aware layers. Rejected: lexical acceptance alone as provider coverage.
  it.each(
    ["ANY", "SOME", "ALL"].flatMap((quantifier) =>
      ["/**/", " /* subquery */ "].map((gap) => `${quantifier}${gap}`),
    ),
  )("admits balanced query layers after %s", async (prefix) => {
    for (const operand of ["((SELECT 1))", "(( /* layer */ (VALUES (1))))"]) {
      const { client, calls } = fixture();
      const sql = `SELECT 1 AS count WHERE 1 = ${prefix}${operand}`;
      const answer = await Effect.runPromise(
        makeXtdbNativeQueries(client, scope).selectSql(contract, { owner: "o" }, () => sql),
      );
      expect(answer.rows).toEqual([{ count: integer("9223372036854775807") }]);
      expect(calls.some((call) => call.sql.includes(sql))).toBe(true);
    }
  });
  it.each([
    "SELECT ALL 1",
    "SELECT 1 UNION/**/ALL SELECT 2",
    "SELECT 1 WHERE 1 = ANY/**/(/**/SELECT 1)",
    "SELECT 1 WHERE 1 = SOME--comment\r(VALUES (1))",
    "SELECT 'ANY ARRAY[1]' AS literal",
    'SELECT "ALL" FROM t',
  ])("preserves supported SQL tokens in %s", (sql) => {
    expect(readOnlyNativeSql(sql)).toBe(sql);
  });
  it("executes authored XTQL with typed safe binds and no Datalog request", async () => {
    const { client, calls } = fixture();
    const native = makeXtdbNativeQueries(client, scope);
    const answer = await Effect.runPromise(
      native.select(
        contract,
        { owner: "O'Reilly? $$" },
        (ctx, input) => {
          const owner = (input as { owner: string }).owner;
          const source = ctx.facts();
          return `(-> ${source} (where (= entity_id ${ctx.bind(owner)})) (return {:count ${ctx.bind(integer("9223372036854775807"))}}))`;
        },
        { basis: { validAt: 2.5, recordedAt: 100.25, recordedPosition: 4 }, includeRaw: true },
      ),
    );
    expect(answer.rows).toEqual([{ count: integer("9223372036854775807") }]);
    expect(answer.rawRows).toEqual([{ count: "9223372036854775807" }]);
    expect(answer.trace.language).toBe("xtql");
    const main = calls[1]!;
    expect(main.options?.parameterSyntax).toBe("postgresql");
    // [EXP-X02] The source cut and the answer are both whole XTQL statements; the row bound
    // is XTQL `limit`, with no SQL envelope.
    expect(calls[0]!.sql.startsWith("XTQL ('(fn [triplex_param_1] (-> (from :tx_meta")).toBe(true);
    expect(calls[0]!.params).toEqual([scope]);
    expect(answer.trace.steps?.map((step) => [step.phase, step.language])).toEqual([
      ["source-cut", "xtql"],
      ["answer", "xtql"],
    ]);
    expect(main.sql.startsWith("XTQL ('(fn [")).toBe(true);
    expect(main.sql).not.toContain("SELECT");
    expect(main.sql).toContain("(limit 1001)))'");
    expect(main.sql).toContain(":for-valid-time :all-time");
    expect(main.sql).toContain("(if (and");
    expect(main.sql).not.toContain("O'Reilly");
    expect(main.params).toContain("O'Reilly? $$");
    expect(main.params).toContain(9223372036854775807n);
    expect(main.params).toContain(2.5);
    expect(main.params).toContain(100.25);
    expect(answer.basis.recordedPosition).toBe(4);
  });

  it("keeps native SQL placeholders and dollar-quoted question marks untouched", async () => {
    const { client, calls } = fixture([{ message: "literal?" }]);
    const native = makeXtdbNativeQueries(client, scope);
    const result = await Effect.runPromise(
      native.selectSql(
        {
          ...contract,
          row: TypeExpr.struct({ message: TypeExpr.required(TypeExpr.text) }),
        },
        { owner: "alice" },
        (ctx) =>
          `SELECT $native$literal?$native$ AS message FROM ${ctx.facts()} f WHERE f.entity_id = ${ctx.bind("alice")} LIMIT 1`,
      ),
    );
    expect(result.rows).toEqual([{ message: "literal?" }]);
    expect(calls[0]!.sql).toBe(
      "SELECT position, stamp FROM tx_meta FOR ALL VALID_TIME WHERE scope_key = $1",
    );
    expect(result.trace.steps?.map((step) => step.language)).toEqual(["xtdb-sql", "xtdb-sql"]);
    expect(calls[1]!.sql).toContain("$native$literal?$native$");
    expect(calls[1]!.options?.parameterSyntax).toBe("postgresql");
    expect(calls[1]!.sql).toContain("CASE WHEN retracted_at IS NOT NULL");
    expect(calls[1]!.sql).toContain("ELSE NULL END AS retract_tx_id");
  });

  it("fails parameter validation and pre-cancelled requests before any source query", async () => {
    const { client, calls } = fixture();
    const native = makeXtdbNativeQueries(client, scope);
    await expect(
      Effect.runPromise(native.select(contract, { owner: 4 }, () => "(rel [] [])")),
    ).rejects.toThrow();
    const cancellation = new AbortController();
    cancellation.abort(new Error("stop native request"));
    await expect(
      Effect.runPromise(
        native.select(contract, { owner: "alice" }, () => "(rel [] [])", {
          signal: cancellation.signal,
        }),
      ),
    ).rejects.toThrow();
    expect(calls).toHaveLength(0);
  });

  it("fails over-limit results completely and can execute a healthy next read", async () => {
    const { client } = fixture([{ count: "1" }, { count: "2" }]);
    const native = makeXtdbNativeQueries(client, scope);
    const build = () => "SELECT 1 AS count";
    await expect(
      Effect.runPromise(native.selectSql(contract, { owner: "a" }, build, { maxRows: 1 })),
    ).rejects.toThrow();
    expect(
      (await Effect.runPromise(native.selectSql(contract, { owner: "a" }, build))).rows,
    ).toHaveLength(2);
  });
});

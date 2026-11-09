import type { TripleRow } from "@triplex-build/triplex/runtime";
import { assertionColumns } from "../codecs.js";
import { postgresPlaceholders, type XtdbClient } from "../XtdbClient.js";
import type { TransactionState } from "../TransactionContext.js";
import { rewriteSqlCode } from "./compiler.js";
import { randomUUID } from "node:crypto";

/** Ship only the bounded callback-local delta; XTDB evaluates the joined relation. */
export const clientWithOverlay = (
  client: XtdbClient,
  scopeKey: string,
  state: TransactionState,
): XtdbClient => {
  const rows = [...state.rows.values()].map((row) => ({ ...row }));
  const relation = `triplex_pending_${randomUUID().replaceAll("-", "")}`;
  const rewrite = (sql: string, input: readonly unknown[] = []) => {
    const params = [...input];
    const p = (value: unknown) => {
      params.push(value);
      return `$${params.length}`;
    };
    const source = () => {
      const stored = `SELECT scope_key, ${assertionColumns.join(", ")} FROM tx_assertions FOR ALL VALID_TIME WHERE scope_key = ${p(scopeKey)} AND recorded_position <= ${p(state.sourceK)}${rows.length ? ` AND id NOT IN (${rows.map((row) => p(row.id)).join(", ")})` : ""}`;
      const pending = rows.map(
        (row: TripleRow) =>
          `SELECT ${p(scopeKey)} AS scope_key, ${assertionColumns.map((column) => `${p(row[column])} AS ${column}`).join(", ")}`,
      );
      return [stored, ...pending].join(" UNION ALL ");
    };
    let used = false;
    let rewritten = rewriteSqlCode(postgresPlaceholders(sql), (code) =>
      code.replace(/\btx_assertions\s+FOR\s+ALL\s+VALID_TIME\b/g, () => {
        used = true;
        return relation;
      }),
    );
    if (!used) return { sql: rewritten, params };
    const definition = `${relation} AS (${source()})`;
    if (/^\s*INSERT\s+INTO\b/i.test(rewritten)) {
      rewritten = rewritten.replace(
        /^(\s*INSERT\s+INTO\s+[\s\S]*?\))\s*(SELECT|WITH)\b/i,
        (_match, prefix: string, keyword: string) =>
          `${prefix} WITH ${definition}${keyword.toUpperCase() === "WITH" ? "," : " SELECT"}`,
      );
    } else if (/^\s*WITH\b/i.test(rewritten))
      rewritten = rewritten.replace(/^\s*WITH\s+/i, `WITH ${definition}, `);
    else rewritten = `WITH ${definition} ${rewritten}`;
    return { sql: rewritten, params };
  };
  return {
    query: (sql, params, basis, options) => {
      const rewritten = rewrite(sql, params);
      return client.query(rewritten.sql, rewritten.params, basis, options);
    },
    submit: (statements) =>
      client.submit(statements.map(({ sql, params }) => rewrite(sql, params))),
    close: async () => {},
  };
};

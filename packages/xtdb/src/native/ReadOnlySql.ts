import { nativeSqlTokens } from "./SqlTokens.js";

/**
 * A lexical query-only envelope, not a SQL AST or a temporal query translator.
 * The pinned XTDB grammar separates queries from DML/transaction statements:
 * https://github.com/xtdb/xtdb/blob/v2.2.0/core/src/main/antlr/xtdb/antlr/Sql.g4
 * In particular, reject modifying CTEs and statement escapes before execution.
 */
export const readOnlyNativeSql = (sql: string): string => {
  const { tokens, words, end } = nativeSqlTokens(sql);
  // [EXP-X02-Q79e] Why: match groups once on comment/literal-aware tokens.
  // Rejected: character lookahead (comments and quoted parentheses change boundaries).
  const closingParentheses = new Map<number, number>();
  const openings: number[] = [];
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i] === "(") openings.push(i);
    else if (tokens[i] === ")") {
      const opening = openings.pop();
      if (opening !== undefined) closingParentheses.set(opening, i);
    }
  }
  // [EXP-X02-Q79e] Why: Sql.g4 queryExpression combines query primaries with
  // set operators; a parenthesized primary need not wrap the entire operand.
  // Grammar: query := primary (set-op [ALL | DISTINCT] primary)*;
  // primary := '(' query ')' | SELECT/VALUES/WITH/FROM body.
  // Bodies stay opaque SQL for XTDB to validate, but balanced groups cannot
  // conceal set operators at this level. Rejected: enumerating parenthesis shapes
  // (misses compound queries) or skipping arbitrary '(' (admits wrapped arrays).
  const setOperators = new Set(["UNION", "INTERSECT", "EXCEPT"]);
  const suffixStarts = new Set(["ORDER", "OFFSET", "FETCH", "LIMIT"]);
  // [EXP-X02-R4] Why: Sql.g4:693-733 attaches ORDER BY and offsetAndLimit
  // to the query expression, including a grouped body. Rejected: treating a
  // grouped primary as the entire expression or swallowing arbitrary suffix text.
  const isSuffix = (start: number, end: number): boolean => {
    let cursor = start;
    if (tokens[cursor] === "ORDER") {
      if (tokens[++cursor] !== "BY") return false;
      const body = ++cursor;
      while (cursor < end && !["OFFSET", "FETCH", "LIMIT"].includes(tokens[cursor]!)) {
        if (tokens[cursor] === "(") {
          const close = closingParentheses.get(cursor);
          if (close === undefined || close >= end) return false;
          cursor = close + 1;
        } else {
          if (tokens[cursor] === ")" || setOperators.has(tokens[cursor]!)) return false;
          cursor++;
        }
      }
      if (cursor === body) return false;
    }
    const count = () => {
      if (!/^(?:[0-9]+|\$[0-9]+|\?)$/.test(tokens[cursor] ?? "")) return false;
      cursor++;
      return true;
    };
    const offset = () => {
      if (tokens[cursor] !== "OFFSET") return false;
      cursor++;
      if (!count()) return false;
      if (["ROW", "ROWS"].includes(tokens[cursor] ?? "")) cursor++;
      return true;
    };
    const fetch = () => {
      if (tokens[cursor] === "LIMIT") {
        cursor++;
        return count();
      }
      if (tokens[cursor] !== "FETCH" || !["FIRST", "NEXT"].includes(tokens[++cursor] ?? ""))
        return false;
      cursor++;
      if (!["ROW", "ROWS"].includes(tokens[cursor] ?? "") && !count()) return false;
      if (!["ROW", "ROWS"].includes(tokens[cursor++] ?? "") || tokens[cursor++] !== "ONLY")
        return false;
      return true;
    };
    if (tokens[cursor] === "OFFSET") {
      if (!offset()) return false;
      if (cursor < end && !fetch()) return false;
    } else if (cursor < end) {
      if (!fetch()) return false;
      if (cursor < end && !offset()) return false;
    }
    return cursor === end;
  };
  const isQueryExpression = (start: number, end: number): boolean => {
    let cursor = start;
    while (cursor < end) {
      if (tokens[cursor] === "(") {
        const close = closingParentheses.get(cursor);
        if (close === undefined || close >= end || !isQueryExpression(cursor + 1, close))
          return false;
        cursor = close + 1;
      } else {
        if (!["SELECT", "VALUES", "WITH", "FROM"].includes(tokens[cursor] ?? "")) return false;
        const body = ++cursor;
        while (
          cursor < end &&
          !setOperators.has(tokens[cursor]!) &&
          !suffixStarts.has(tokens[cursor]!)
        ) {
          if (tokens[cursor] === "(") {
            const close = closingParentheses.get(cursor);
            if (close === undefined || close >= end) return false;
            cursor = close + 1;
          } else {
            if (tokens[cursor] === ")") return false;
            cursor++;
          }
        }
        if (cursor === body) return false;
      }
      if (cursor === end) return true;
      if (suffixStarts.has(tokens[cursor]!)) return isSuffix(cursor, end);
      if (!setOperators.has(tokens[cursor]!)) return false;
      cursor++;
      if (tokens[cursor] === "ALL" || tokens[cursor] === "DISTINCT") cursor++;
    }
    return false;
  };
  // [EXP-X02-R2] Why: Q79a requires comment-aware operands, including bare arrays.
  // Rejected: raw-character lookahead (ANY/**/(...) bypasses it). ALL after SELECT
  // or UNION is a set quantifier; other quantified operands must be subqueries.
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!;
    if (!["ANY", "SOME", "ALL"].includes(token)) continue;
    // [EXP-X02-R2] Why: quantified comparisons follow a comparison operator.
    // Rejected: rejecting every ALL (FOR ALL VALID_TIME and aggregate ALL are supported).
    if (!["=", "!=", "<>", ">", ">=", "<", "<="].includes(tokens[i - 1] ?? "")) continue;
    if (token === "ALL" && ["SELECT", "UNION", "INTERSECT", "EXCEPT"].includes(tokens[i - 1] ?? ""))
      continue;
    const opening = i + 1;
    const closing = closingParentheses.get(opening);
    // [EXP-X02-Q79e] Why: continue scanning every token after classification,
    // including each set arm. Rejected: jumping over a safe outer query (hides unsafe inner comparisons).
    if (
      tokens[opening] !== "(" ||
      closing === undefined ||
      !isQueryExpression(opening + 1, closing)
    )
      throw new TypeError(
        "Native SQL rejects ANY/SOME/ALL over a non-subquery operand (XTDB 2.2.0 parse hazard)",
      );
  }
  if (!["SELECT", "WITH", "FROM", "VALUES", "XTQL"].includes(words[0] ?? ""))
    throw new TypeError("Native reads require a query expression");
  const forbidden = new Set([
    "INSERT",
    "UPDATE",
    "DELETE",
    "ERASE",
    "PATCH",
    "CREATE",
    "ALTER",
    "DROP",
    "TRUNCATE",
    "GRANT",
    "REVOKE",
    "ATTACH",
    "DETACH",
    "COPY",
    "CALL",
    "DO",
    "BEGIN",
    "COMMIT",
    "ROLLBACK",
    "SET",
    "PREPARE",
    "EXECUTE",
    "DISCARD",
    "VACUUM",
  ]);
  if (words.some((word) => forbidden.has(word)))
    throw new TypeError("Native read queries cannot mutate data or connection state");
  return end === undefined ? sql : sql.slice(0, end) + sql.slice(end + 1);
};

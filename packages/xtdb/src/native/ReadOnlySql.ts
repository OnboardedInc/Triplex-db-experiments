/**
 * A lexical query-only envelope, not a SQL AST or a temporal query translator.
 * The pinned XTDB grammar separates queries from DML/transaction statements:
 * https://github.com/xtdb/xtdb/blob/v2.2.0/core/src/main/antlr/xtdb/antlr/Sql.g4
 * In particular, reject modifying CTEs and statement escapes before execution.
 */
export const readOnlyNativeSql = (sql: string): string => {
  const words: string[] = [];
  const tokens: string[] = [];
  let end: number | undefined;
  for (let index = 0; index < sql.length; ) {
    const char = sql[index]!,
      next = sql[index + 1];
    if (/\s/.test(char)) {
      index++;
      continue;
    }
    if (char === "-" && next === "-") {
      // Match the pinned lexer, not just common LF input. SqlLexer.g4:13
      // terminates comments at CR or LF; ignoring CR could conceal a second
      // statement from this local query-only envelope. Retained counterexample:
      // qualification/evidence/native-sql-cr-boundary-baseline-v1.json.
      // https://github.com/xtdb/xtdb/blob/v2.2.0/core/src/main/antlr/xtdb/antlr/SqlLexer.g4
      index += 2;
      while (index < sql.length && sql[index] !== "\r" && sql[index] !== "\n") index++;
      continue;
    }
    if (char === "/" && next === "*") {
      const close = sql.indexOf("*/", index + 2);
      if (close < 0 || sql.slice(index + 2, close).includes("/*"))
        throw new TypeError("Native SQL requires closed, non-nested block comments");
      index = close + 2;
      continue;
    }
    if (end !== undefined)
      throw new TypeError("Native reads accept one query, not multiple statements");
    if (char === ";") {
      end = index;
      index++;
      continue;
    }
    if (char === "'" || char === '"') {
      tokens.push("<quoted>");
      const quote = char;
      const escaped =
        quote === "'" &&
        index > 0 &&
        /[eE]/.test(sql[index - 1]!) &&
        (index < 2 || !/[A-Za-z0-9_]/.test(sql[index - 2]!));
      let closed = false;
      for (index++; index < sql.length; index++) {
        if (escaped && sql[index] === "\\") {
          index++;
          continue;
        }
        if (sql[index] === quote) {
          if (sql[index + 1] === quote) {
            index++;
            continue;
          }
          index++;
          closed = true;
          break;
        }
      }
      if (!closed) throw new TypeError("Unclosed native SQL literal or identifier");
      continue;
    }
    if (char === "$") {
      const delimiter = /^\$(?:[A-Za-z_][A-Za-z0-9_]*)?\$/.exec(sql.slice(index))?.[0];
      if (delimiter) {
        tokens.push("<quoted>");
        const close = sql.indexOf(delimiter, index + delimiter.length);
        if (close < 0) throw new TypeError("Unclosed native SQL dollar-quoted literal");
        index = close + delimiter.length;
        continue;
      }
    }
    const word = /^[A-Za-z_][A-Za-z0-9_]*/.exec(sql.slice(index))?.[0];
    if (word) {
      words.push(word.toUpperCase());
      tokens.push(word.toUpperCase());
      index += word.length;
    } else {
      tokens.push(char);
      index++;
    }
  }
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
        while (cursor < end && !setOperators.has(tokens[cursor]!)) {
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
    if (!["=", ">", "<"].includes(tokens[i - 1] ?? "")) continue;
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

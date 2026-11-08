// [EXP-X02-R4] Why: apply pinned lexer longest-match boundaries before interpreting
// SQL keywords. Rejected: starting a dollar string inside a regular/backtick identifier.
import { sqlLexerPatterns } from "./target/packages/xtdb/src/native/SqlLexerPatterns.ts";

const patterns = sqlLexerPatterns.map(({ name, source }) => ({
  name,
  pattern: new RegExp(source, "i"),
}));
export const nativeSqlTokens = (sql: string, trace: any[] = []) => {
  const tokens: string[] = [];
  const words: string[] = [];
  let end: number | undefined;
  for (let index = 0; index < sql.length; ) {
    const tokenStart = index;
    if (sql.startsWith("--", index)) {
      index += 2;
      while (index < sql.length && sql[index] !== "\r" && sql[index] !== "\n") index++;
      trace.push({name:"LINE_COMMENT",start:tokenStart,end:index,text:sql.slice(tokenStart,index)});
      continue;
    }
    if (sql.startsWith("/*", index)) {
      // [EXP-X02-R4] Why: BLOCK_COMMENT is recursive in SqlLexer.g4:12;
      // quotes and parentheses in comments have no lexical meaning.
      // Rejected: JS recursion (host stack bounds would limit valid nesting).
      let depth = 1;
      index += 2;
      while (index < sql.length && depth > 0) {
        if (sql.startsWith("/*", index)) {
          depth++;
          index += 2;
        } else if (sql.startsWith("*/", index)) {
          depth--;
          index += 2;
        } else index++;
      }
      if (depth) throw new TypeError("Unclosed native SQL block comment");
      trace.push({name:"BLOCK_COMMENT",start:tokenStart,end:index,text:sql.slice(tokenStart,index)});
      continue;
    }
    const rest = sql.slice(index);
    let match: { name: string; text: string } | undefined;
    for (const { name, pattern } of patterns) {
      const text = pattern.exec(rest)?.[0];
      if (text && (!match || text.length > match.text.length)) match = { name, text };
    }
    // [EXP-X02-R4] Why: fail closed on unsupported lexer characters, including
    // unquoted Unicode/non-SQL whitespace. Quoted Unicode follows the pinned rule.
    // Rejected: JS \s or Unicode normalization (different engine token boundaries).
    if (!match) throw new TypeError("Native SQL contains a token outside the pinned XTDB lexer");
    index += match.text.length;
    if (match.name === "WHITESPACE") {trace.push({name:match.name,start:tokenStart,end:index,text:sql.slice(tokenStart,index)});continue;}
    if (end !== undefined)
      throw new TypeError("Native reads accept one query, not multiple statements");
    if (match.name === "SEMI") {
      end = index - 1;
      trace.push({name:match.name,start:tokenStart,end:index,text:sql.slice(tokenStart,index)});
      continue;
    }
    if (match.name === "DOLLAR_TAG") {
      const close = sql.indexOf(match.text, index);
      if (close < 0) throw new TypeError("Unclosed native SQL dollar-quoted literal");
      index = close + match.text.length;
      tokens.push("<quoted>");
    } else if (
      ["CHARACTER_STRING", "C_ESCAPES_STRING", "BINARY_STRING", "DELIMITED_IDENTIFIER"].includes(
        match.name,
      )
    ) {
      tokens.push("<quoted>");
    } else {
      const token = match.text.toUpperCase();
      tokens.push(token);
      if (match.name === "REGULAR_IDENTIFIER") words.push(token);
    }
    trace.push({name:match.name,start:tokenStart,end:index,text:sql.slice(tokenStart,index)});
  }
  return { tokens, words, end };
};

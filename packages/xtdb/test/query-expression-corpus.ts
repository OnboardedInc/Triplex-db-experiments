// [EXP-X02-Q79e] Why: derive cases from query := primary (op [ALL] primary)*,
// primary := SELECT | VALUES | (query), rather than a list of known failures.
// Rejected: random sampling (cannot show coverage of every production/depth/comment combination).
type Query =
  | { kind: "SELECT" | "VALUES"; value: number }
  | { kind: "group"; child: Query }
  | { kind: "set"; left: Query; right: Query; op: string; all: boolean };
const group = (child: Query): Query => ({ kind: "group", child });
const render = (query: Query, gap: string): string => {
  switch (query.kind) {
    case "SELECT":
      return `SELECT${gap}${query.value}`;
    case "VALUES":
      return `VALUES${gap}(${gap}${query.value}${gap})`;
    case "group":
      return `(${gap}${render(query.child, gap)}${gap})`;
    case "set":
      return `${render(query.left, gap)}${gap}${query.op}${gap}${query.all ? `ALL${gap}` : ""}${render(query.right, gap)}`;
  }
};
export const queryExpressionCorpus = () => {
  const forms: Query[] = [
    { kind: "SELECT", value: 1 },
    { kind: "VALUES", value: 1 },
  ];
  for (const leftKind of ["SELECT", "VALUES"] as const)
    for (const rightKind of ["SELECT", "VALUES"] as const)
      for (const op of ["UNION", "INTERSECT", "EXCEPT"])
        for (const all of [false, true])
          for (const leftGrouped of [false, true])
            for (const rightGrouped of [false, true]) {
              const left: Query = { kind: leftKind, value: 1 };
              const right: Query = { kind: rightKind, value: 2 };
              forms.push({
                kind: "set",
                left: leftGrouped ? group(left) : left,
                right: rightGrouped ? group(right) : right,
                op,
                all,
              });
            }
  // [EXP-X02-Q79e] Why: exercise repeated operators and recursively compound arms.
  // Rejected: binary-only samples (do not cover the grammar's repetition).
  for (const op of ["UNION", "INTERSECT", "EXCEPT"])
    forms.push({
      kind: "set",
      op,
      all: true,
      left: group({ kind: "set", op: "UNION", all: false, left: forms[0]!, right: forms[1]! }),
      right: group({ kind: "set", op: "EXCEPT", all: true, left: forms[0]!, right: forms[1]! }),
    });
  return forms.flatMap((form, formIndex) =>
    [1, 2, 3].flatMap((depth) =>
      [false, true].flatMap((comments) =>
        ["ANY", "SOME", "ALL"].map((quantifier) => {
          let query = form;
          for (let i = 0; i < depth; i++) query = group(query);
          const gap = comments ? " /* (grammar) */ -- layer\r\n " : " ";
          const sql = `SELECT 'x' AS v WHERE 1 = ${quantifier}${gap}${render(query, gap)}`;
          return { formIndex, depth, comments, quantifier, sql };
        }),
      ),
    ),
  );
};

// [EXP-X02-R4] Why: generate from the pinned identifier productions, recursive
// BLOCK_COMMENT, and queryExpressionNoWith suffix productions. Rejected: another
// six-case allowlist that misses a delimiter, nesting level or suffix combination.
const identifierForms = [
  ["alpha", "beta"],
  ["_a1", "_b2"],
  ["a$tag$", "z$tag$b"],
  ["a$UNION", "b$EXCEPT"],
  ['"UNION"', '"INTERSECT"'],
  ['"a""UNION""b"', '"x""EXCEPT""y"'],
  ['"雪😀"', '"()"'],
  ["`UNION`", "`EXCEPT`"],
  ["`(`", "`)`"],
  ["`a``UNION``b`", "`b``INTERSECT``c`"],
  ["`雪😀`", "`()`"],
  ["`a$tag$`", "`$tag$b`"],
  ['"a$tag$"', '"$tag$b"'],
] as const;
const nestedComment = (depth: number, payload = "' \" ` $tag$ ( ) ; DELETE --\r\n") => {
  let result = payload;
  for (let i = 0; i < depth; i++) result = "/* " + result + " */";
  return depth ? result : "";
};
const wrapSql = (sql: string, depth: number, gap: string) => {
  for (let i = 0; i < depth; i++) sql = `(${gap}${sql}${gap})`;
  return sql;
};
export const lexicalQueryCorpus = () => {
  const cases: { family: string; sql: string }[] = [];
  for (const [left, right] of identifierForms)
    for (const depth of [1, 2, 3])
      for (const comments of [0, 3])
        for (const q of ["ANY", "SOME", "ALL"]) {
          const gap = " " + nestedComment(comments) + " ";
          cases.push({
            family: "identifier",
            sql: `WITH ${left} AS (SELECT 1) SELECT 'x' AS v WHERE 1 = ${q}${gap}${wrapSql("SELECT 1", depth, gap)} AND EXISTS (SELECT 1 AS ${right})`,
          });
        }
  for (const depth of [1, 2, 3, 8, 64])
    for (const payload of ["( )", "' \" ` ; --\r\n", "$a$ UNION SELECT ANY ARRAY[1] DELETE"])
      for (const q of ["ANY", "SOME", "ALL"]) {
        const comment = nestedComment(depth, payload);
        cases.push({
          family: "comment",
          sql: `SELECT ${comment} 'x' AS v WHERE 1 = ${q} ${comment} (SELECT ${comment} 1)`,
        });
      }
  const offsets = ["OFFSET 0", "OFFSET 0 ROW", "OFFSET 0 ROWS"];
  const fetches = ["LIMIT 1", "FETCH FIRST ROW ONLY", "FETCH NEXT 1 ROWS ONLY"];
  const windows = [
    "",
    ...offsets,
    ...fetches,
    ...offsets.flatMap((o) => fetches.flatMap((f) => [o + " " + f, f + " " + o])),
  ];
  for (const body of ["SELECT 1", "VALUES (1)", "(SELECT 1) UNION ALL SELECT 2"])
    for (const order of ["", "ORDER BY (1) DESC NULLS LAST"])
      for (const window of windows)
        for (const depth of [1, 2, 3])
          for (const comments of [0, 2])
            for (const q of ["ANY", "SOME", "ALL"]) {
              const gap = " " + nestedComment(comments) + " ";
              const suffix = (order + " " + window).trim().split(/ +/).join(gap);
              cases.push({
                family: "suffix",
                sql: `SELECT 'x' AS v WHERE 1 = ${q} (${gap}${wrapSql(body, depth, gap)}${gap}${suffix})`,
              });
            }
  return cases;
};
export const lexicalUnsafeCorpus = () =>
  identifierForms.flatMap(([left, right]) =>
    [0, 1, 4].flatMap((depth) =>
      ["ANY", "SOME", "ALL"].flatMap((q) => {
        const gap = " " + nestedComment(depth) + " ";
        return [
          `WITH ${left} AS (SELECT 1) SELECT 'x' AS v WHERE 1 = ${q}${gap}(ARRAY[1,2]) AND EXISTS(SELECT 1 AS ${right})`,
          `SELECT 1 AS ${left}; DELETE FROM tx_assertions; SELECT 2 AS ${right}`,
          `SELECT 'x' AS v WHERE 1 = ${q} ((SELECT 1) ORDER BY (SELECT 1 WHERE 1 = SOME${gap}ARRAY[1]))`,
        ];
      }),
    ),
  );
export const lexicalRefusedCorpus = () => [
  ...[1, 2, 3, 16].map((depth) => `SELECT 1 ${"/*".repeat(depth)} ' ) ; SELECT 2`),
  ...["\u00a0", "\v", "\f", "\ufeff", "\u2028", "\u202f", "ſ", "K", "雪"].map(
    (char) => `SELECT 1 AS a${char}$tag$; SELECT 2 AS z$tag$b`,
  ),
  'SELECT 1 AS "a/b"',
  "SELECT 1 AS `a/b`",
  "SELECT 1 WHERE 1 = ANY ((SELECT 1) LIMIT)",
  "SELECT 1 WHERE 1 = ANY ((SELECT 1) ORDER BY)",
  "SELECT 1 WHERE 1 = ANY ((SELECT 1) LIMIT 1 UNION SELECT 2)",
];

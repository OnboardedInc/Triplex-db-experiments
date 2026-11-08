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

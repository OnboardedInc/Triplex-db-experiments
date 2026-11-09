/** Split generated SQL expressions without splitting CASE/function arguments. */
const splitExpressions = (input: string): string[] => {
  let depth = 0;
  let quote: string | undefined;
  let start = 0;
  const result: string[] = [];
  for (let index = 0; index < input.length; index++) {
    const char = input[index]!;
    if (quote) {
      if (char === quote) {
        if (input[index + 1] === quote) index++;
        else quote = undefined;
      }
    } else if (char === "'" || char === '"') quote = char;
    else if (char === "(") depth++;
    else if (char === ")") depth--;
    else if (char === "," && depth === 0) {
      result.push(input.slice(start, index).trim());
      start = index + 1;
    }
  }
  result.push(input.slice(start).trim());
  return result;
};

const queryEnd = (sql: string, start: number): number => {
  let depth = 0;
  let quote: string | undefined;
  for (let index = start; index < sql.length; index++) {
    const char = sql[index]!;
    if (quote) {
      if (char === quote) {
        if (sql[index + 1] === quote) index++;
        else quote = undefined;
      }
    } else if (char === "'" || char === '"') quote = char;
    else if (char === "(") depth++;
    else if (char === ")") {
      if (depth === 0) return index;
      depth--;
    }
  }
  return sql.length;
};

/**
 * XTDB 2.2 rejects IN-backed CASE expressions in GROUP BY and can mis-resolve
 * repeated complex group expressions. Compute Triplex's canonical scalar-family
 * channels in a server subquery, then group plain columns. Raw rows stay bags:
 * this deliberately adds no DISTINCT before duplicate-sensitive SUM/AVG.
 */
export const lowerGrouping = (sql: string): string => {
  const groupIndex = sql.indexOf("\nGROUP BY ");
  if (groupIndex < 0) return sql;
  const start = sql.lastIndexOf("SELECT DISTINCT", groupIndex);
  if (start < 0) throw new Error("Unexpected shared compiler aggregate shape");
  const end = queryEnd(sql, start);
  const query = sql.slice(start, end);
  const from = query.indexOf("\nFROM ");
  const group = query.indexOf("\nGROUP BY ");
  const afterGroup = query.slice(group + 1).search(/\n(?:HAVING|ORDER BY|LIMIT|OFFSET)\b/);
  const suffix = afterGroup < 0 ? "" : query.slice(group + 1 + afterGroup);
  const selected = splitExpressions(query.slice("SELECT DISTINCT".length, from));
  const projections = selected.map((expression) => {
    const match = /^(.*)\s+AS\s+("[^"]+"|_constant_\d+)$/s.exec(expression);
    if (!match) throw new Error(`Unexpected shared compiler projection: ${expression}`);
    return {
      expression: match[1]!.trim(),
      alias: match[2]!,
      aggregate: /^(?:CAST\()?(?:COUNT|SUM|AVG|MIN|MAX)\(/.test(match[1]!.trim()),
    };
  });
  const groups = projections.filter(({ aggregate }) => !aggregate);
  const expressions = groups
    .filter(({ expression }) => expression !== "NULL" && !/^\$\d+$/.test(expression))
    .sort((a, b) => b.expression.length - a.expression.length);
  const groupedReferences = (input: string) => {
    let result = input;
    for (const { expression, alias } of expressions)
      result = result.replaceAll(expression, `xt_group.${alias}`);
    return result;
  };
  const outerExpressions = projections.map((projection) =>
    projection.aggregate
      ? groupedReferences(projection.expression)
      : `xt_group.${projection.alias}`,
  );
  let outerSuffix = groupedReferences(suffix);
  const refs = new Map<string, string>();
  const replaceRefs = (input: string) =>
    input.replace(/\b((?:t\d+|rule_ref_\d+)\.[A-Za-z_][A-Za-z_0-9]*)\b/g, (reference) => {
      if (!refs.has(reference)) refs.set(reference, `"_xt_group_ref_${refs.size}"`);
      return `xt_group.${refs.get(reference)}`;
    });
  const outer = outerExpressions.map(replaceRefs);
  outerSuffix = replaceRefs(outerSuffix);
  const rawSelect = [
    ...groups.map(({ expression, alias }) => `${expression} AS ${alias}`),
    ...[...refs].map(([reference, alias]) => `${reference} AS ${alias}`),
  ];
  const raw = `SELECT ${rawSelect.join(",\n")}\n${query.slice(from + 1, group)}`;
  const lowered = `SELECT DISTINCT ${outer.map((expression, index) => `${expression} AS ${projections[index]!.alias}`).join(",\n")}\nFROM (${raw}) xt_group\nGROUP BY ${groups.map(({ alias }) => `xt_group.${alias}`).join(", ")}${outerSuffix}`;
  return sql.slice(0, start) + lowered + sql.slice(end);
};

/** XTDB 2.2 pushes constant-false global HAVING below aggregation, yielding a NULL row. */
export const lowerFalseHaving = (sql: string): string => {
  const having = sql.search(/\nHAVING 1 = 0(?=\n|$)/);
  if (having < 0) return sql;
  const start = sql.lastIndexOf("SELECT DISTINCT", having);
  if (start < 0) throw new Error("Unexpected constant HAVING shape");
  const end = queryEnd(sql, start);
  const query = sql.slice(start, end).replace("\nHAVING 1 = 0", "");
  return (
    sql.slice(0, start) + `SELECT * FROM (${query}) xt_empty_having WHERE 1 = 0` + sql.slice(end)
  );
};

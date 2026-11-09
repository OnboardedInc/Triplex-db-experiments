import {
  isPredicateClause,
  isVariable,
  type DatalogQuery,
  type WrappedQuery,
} from "@triplex-build/triplex/datalog";
import type { QueryContext } from "@triplex-build/triplex/runtime";
import type { PaginationValue } from "@triplex-build/triplex/internal";
type Scalar = QueryContext[string];
type Row = Record<string, Scalar>;
const integer = (x: unknown): x is { type: "integer"; value: string } =>
  typeof x === "object" && x !== null && "type" in x && x.type === "integer";
export const flatten = (x: unknown): Scalar =>
  typeof x === "object" && x !== null && "type" in x && x.type === "ref" && "value" in x
    ? String(x.value)
    : (x as Scalar);
const resolve = (x: unknown, row: QueryContext): Scalar =>
  isVariable(x) ? (row[x] ?? null) : flatten(x);
const key = (v: unknown) => JSON.stringify(v);
const family = (x: Scalar) => (integer(x) ? "integer" : typeof x);
export function compare(a: Scalar, b: Scalar): number {
  if (a === b || key(a) === key(b)) return 0;
  const rank = (x: Scalar) =>
    x === null ? 4 : integer(x) ? 1 : typeof x === "number" ? 0 : typeof x === "boolean" ? 2 : 3;
  const delta = rank(a) - rank(b);
  if (delta) return delta;
  if (integer(a) && integer(b)) return BigInt(a.value) < BigInt(b.value) ? -1 : 1;
  if (typeof a === "number" && typeof b === "number") return a < b ? -1 : 1;
  return String(a) < String(b) ? -1 : 1;
}
function predicate(op: string, a: Scalar, b: Scalar, text = false): boolean {
  if (a === null || b === null) return false;
  if (family(a) !== family(b)) return op === "!=";
  const eq = compare(a, b) === 0;
  if (op === "=") return eq;
  if (op === "!=") return !eq;
  if (!(typeof a === "number" || integer(a) || (text && typeof a === "string"))) return false;
  const c = compare(a, b);
  return op === ">" ? c > 0 : op === ">=" ? c >= 0 : op === "<" ? c < 0 : c <= 0;
}
function exact(n: bigint): Scalar {
  if (n < -9223372036854775808n || n > 9223372036854775807n)
    throw new RangeError("Exact arithmetic overflow");
  return { type: "integer", value: String(n) };
}
// [EXP-DA01] Why: exact integer arithmetic stays in the TS kernel (R29 4.6). Rejected: double casts for business values.
export function finish(query: DatalogQuery, input: readonly QueryContext[]): Row[] {
  let rows: Row[] = input.map((row) => ({ ...row }));
  const pending = [...(query.compute ?? [])];
  const computed = new Set(pending.map(([, , , target]) => target));
  const available = new Set(Object.keys(rows[0] ?? {}));
  while (pending.length) {
    const index = pending.findIndex(([, a, b]) =>
      [a, b].every((t) => !isVariable(t) || available.has(t)),
    );
    if (index < 0) {
      if (!rows.length) break;
      throw new TypeError("Unbound arithmetic operand");
    }
    const [op, left, right, target] = pending.splice(index, 1)[0]!;
    available.add(target);
    rows = rows.map((row) => {
      const a = resolve(left, row),
        b = resolve(right, row);
      let value: Scalar;
      if (integer(a) && integer(b)) {
        const x = BigInt(a.value),
          y = BigInt(b.value);
        if ((op === "/" || op === "%") && y === 0n) throw new RangeError("Division by zero");
        value = exact(
          op === "+" ? x + y : op === "-" ? x - y : op === "*" ? x * y : op === "/" ? x / y : x % y,
        );
      } else if (typeof a === "number" && typeof b === "number") {
        value =
          op === "+" ? a + b : op === "-" ? a - b : op === "*" ? a * b : op === "/" ? a / b : a % b;
        if (!Number.isFinite(value)) throw new RangeError("Nonfinite arithmetic result");
      } else throw new TypeError("Incompatible arithmetic scalar families");
      return { ...row, [target]: value };
    });
  }
  rows = rows.filter((row) =>
    query.where.every(
      (clause) =>
        !isPredicateClause(clause) ||
        !clause.slice(1).some((t) => typeof t === "string" && computed.has(t)) ||
        predicate(clause[0], resolve(clause[1], row), resolve(clause[2], row)),
    ),
  );
  if (query.aggregate?.length) {
    const aggregates = query.aggregate;
    const excluded = new Set(aggregates.flatMap(([, source, target]) => [source, target]));
    const groupBy = query.find.filter((t) => isVariable(t) && !excluded.has(t)) as string[];
    const groups = new Map<string, Row[]>();
    for (const row of rows) {
      const k = key(groupBy.map((v) => row[v] ?? null));
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k)!.push(row);
    }
    if (!rows.length && !groupBy.length) groups.set("[]", []);
    rows = [...groups.values()].map((group) => {
      const row: Row = Object.fromEntries(groupBy.map((v) => [v, group[0]?.[v] ?? null]));
      for (const [op, source, target] of aggregates) {
        const values = group
          .map((r) => r[source])
          .filter((v): v is Exclude<Scalar, null> => v !== null && v !== undefined);
        if (op === "count") row[target] = new Set(values.map(key)).size;
        else {
          const numeric = values.filter((v) => typeof v === "number" || integer(v));
          if (!numeric.length) row[target] = null;
          else if (op === "min" || op === "max")
            row[target] = numeric.reduce((a, b) =>
              compare(a, b) * (op === "min" ? 1 : -1) <= 0 ? a : b,
            );
          else if (numeric.every(integer)) {
            const sum = numeric.reduce((n, v) => n + BigInt(v.value), 0n);
            if (op === "avg" && sum % BigInt(numeric.length))
              throw new RangeError("Exact integer average is not integral");
            row[target] = exact(op === "avg" ? sum / BigInt(numeric.length) : sum);
          } else if (numeric.every((v) => typeof v === "number")) {
            const sum = numeric.reduce((n, v) => n + v, 0);
            row[target] = op === "avg" ? sum / numeric.length : sum;
            if (!Number.isFinite(row[target])) throw new RangeError("Nonfinite aggregate result");
          } else throw new TypeError("Mixed exact and binary64 aggregate");
        }
      }
      return row;
    });
  }
  rows = rows.filter((row) =>
    (query.having ?? []).every(([op, a, b]) => predicate(op, resolve(a, row), resolve(b, row))),
  );
  // Result DISTINCT follows bag-sensitive aggregation, as in core's KV executor.
  rows = [
    ...new Map(
      rows.map((row) => {
        const result: Row = Object.fromEntries(query.find.map((t) => [String(t), resolve(t, row)]));
        return [key(result), result];
      }),
    ).values(),
  ];
  order(rows, query.orderBy);
  return rows.slice(
    query.offset ?? 0,
    query.limit === undefined ? undefined : (query.offset ?? 0) + query.limit,
  );
}
export function order(rows: Row[], orderBy: DatalogQuery["orderBy"]): void {
  rows.sort((a, b) => {
    for (const { variable, direction } of orderBy ?? []) {
      const x = a[variable] ?? null,
        y = b[variable] ?? null;
      const c = compare(x, y);
      if (c)
        return x === null || y === null || family(x) !== family(y)
          ? c
          : direction === "desc"
            ? -c
            : c;
    }
    return 0;
  });
}
export function page(query: WrappedQuery, input: Row[], cursor?: readonly PaginationValue[]) {
  let rows = input.filter((row) =>
    (query.filters ?? []).every((filter) => {
      const a = row[filter.column] ?? null,
        b = flatten(filter.value);
      if (filter.op === "is-null") return a === null;
      if (filter.op === "is-not-null") return a !== null;
      if (a === null || b === null || b === undefined) return false;
      if (filter.op.includes("like")) {
        if (typeof a !== "string" || typeof b !== "string") return false;
        const regex = new RegExp(
          "^" +
            [...b]
              .map((c) =>
                c === "%" ? ".*" : c === "_" ? "." : c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
              )
              .join("") +
            "$",
          filter.op.includes("ilike") ? "is" : "s",
        );
        return regex.test(a) !== filter.op.startsWith("not-");
      }
      return family(a) === family(b) && predicate(filter.op, a, b, true);
    }),
  );
  const totalCount = rows.length;
  order(rows, query.orderBy);
  if (cursor)
    rows = rows.filter((row) => {
      for (let i = 0; i < (query.orderBy?.length ?? 0); i++) {
        const { variable, direction } = query.orderBy![i]!;
        const a = row[variable] ?? null,
          b = cursor[i] ?? null;
        const c = compare(a, b);
        if (c)
          return (
            (a === null || b === null || family(a) !== family(b)
              ? c
              : direction === "desc"
                ? -c
                : c) > 0
          );
      }
      return false;
    });
  return {
    results: query.limit === undefined ? rows : rows.slice(0, query.limit),
    ...(query.includeCount ? { totalCount } : {}),
  };
}

import type { DatalogQuery, WrappedQuery, WrapperFilter } from "@triplex-build/triplex/datalog";
import type { PaginationValue } from "@triplex-build/triplex/internal";
import type { QueryContext } from "@triplex-build/triplex/runtime";
type OrderBySpec = NonNullable<DatalogQuery["orderBy"]>[number];

const integer = (value: unknown): value is { type: "integer"; value: string } =>
  typeof value === "object" && value !== null && "type" in value && value.type === "integer";
const family = (value: unknown) =>
  value == null
    ? 4
    : typeof value === "number"
      ? 0
      : integer(value)
        ? 1
        : typeof value === "boolean"
          ? 2
          : 3;
const flattened = (value: unknown): unknown =>
  typeof value === "object" && value !== null && "value" in value && !integer(value)
    ? value.value
    : value;
const compare = (left: unknown, right: unknown): number => {
  const a = flattened(left),
    b = flattened(right),
    category = family(a) - family(b);
  if (category) return category;
  if (a == null || b == null) return 0;
  if (integer(a) && integer(b))
    return BigInt(a.value) < BigInt(b.value) ? -1 : BigInt(a.value) > BigInt(b.value) ? 1 : 0;
  if (typeof a === "string" && typeof b === "string")
    return Buffer.compare(Buffer.from(a), Buffer.from(b));
  return a < b ? -1 : a > b ? 1 : 0;
};
const ordered = (left: QueryContext, right: QueryContext, order: readonly OrderBySpec[]) => {
  for (const spec of order) {
    const a = left[spec.variable] ?? null,
      b = right[spec.variable] ?? null;
    const category = family(a) - family(b);
    if (category) return category;
    const result = compare(a, b);
    if (result) return spec.direction === "desc" ? -result : result;
  }
  return 0;
};
const filter = (value: unknown, spec: WrapperFilter): boolean => {
  if (spec.op === "is-null") return value == null;
  if (spec.op === "is-not-null") return value != null;
  const target = flattened(spec.value);
  if (value == null || target == null) return false;
  if (spec.op.includes("like")) {
    if (typeof value !== "string" || typeof target !== "string") return false;
    // Match the owning KV wrapper's lowercasing and dotAll semantics, including
    // '%' and '_' across newlines (core/kv/datalog/executor.ts: likeMatch).
    const insensitive = spec.op.includes("ilike");
    const candidate = insensitive ? value.toLowerCase() : value;
    const pattern = (insensitive ? target.toLowerCase() : target)
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      .replaceAll("%", ".*")
      .replaceAll("_", ".");
    const matched = new RegExp(`^${pattern}$`, "s").test(candidate);
    return spec.op.startsWith("not-") ? !matched : matched;
  }
  if (family(value) !== family(target)) return false;
  const result = compare(value, target);
  if (spec.op === "=") return result === 0;
  if (spec.op === "!=") return result !== 0;
  if (![0, 1, 3].includes(family(value))) return false;
  return spec.op === ">"
    ? result > 0
    : spec.op === ">="
      ? result >= 0
      : spec.op === "<"
        ? result < 0
        : result <= 0;
};

/**
 * Final-answer pipeline inspired by core Pagination.ts and SQL wrapper.ts.
 * QLever still performs source joins, grouping, aggregation and HAVING. Only
 * the complete bounded decoded GROUP outputs are ordered/filtered/paged here.
 * This is an explicit charged alternative to a native exact result-order key;
 * it cannot accept a truncated group population or load ordinary fact rows.
 */
export const prepareAggregateAnswers = (
  input: DatalogQuery | WrappedQuery,
  cursor?: readonly PaginationValue[],
) => {
  const wrapped = "inner" in input,
    logical = wrapped ? input.inner : input;
  const { orderBy: _order, limit: _limit, offset: _offset, ...source } = logical;
  return {
    source: source as DatalogQuery,
    normalize: (answer: readonly QueryContext[]) => {
      let results = [...answer];
      if (logical.orderBy?.length) results.sort((a, b) => ordered(a, b, logical.orderBy!));
      if (logical.offset) results = results.slice(logical.offset);
      if (logical.limit !== undefined) results = results.slice(0, logical.limit);
      if (!wrapped) return { results };
      for (const spec of input.filters ?? [])
        results = results.filter((row) => filter(row[spec.column], spec));
      const totalCount = input.includeCount ? results.length : undefined;
      const order = input.orderBy?.length
        ? input.orderBy
        : logical.find
            .filter((value): value is string => typeof value === "string" && value.startsWith("?"))
            .map((variable) => ({ variable, direction: "asc" as const }));
      results.sort((a, b) => ordered(a, b, order));
      if (cursor) {
        if (cursor.length !== order.length)
          throw new TypeError("Aggregate answer cursor/order arity differs");
        const boundary = Object.fromEntries(
          order.map((spec, index) => [spec.variable, cursor[index]]),
        ) as QueryContext;
        results = results.filter((row) => ordered(row, boundary, order) > 0);
      }
      if (input.limit !== undefined) results = results.slice(0, input.limit);
      return { results, ...(totalCount === undefined ? {} : { totalCount }) };
    },
  };
};

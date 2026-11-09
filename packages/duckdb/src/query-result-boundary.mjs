// @ts-nocheck -- [EXP-CHECKJS-R2] runtime-populated records, option bags, or branch-specific union members. Binding errors remain checked by lab/bin/checkjs.mjs.
/** Owned finite query-result boundary. No Effect, Triplex, driver or filesystem imports. */
export class QueryResultBoundaryError extends Error {
  constructor(message) {
    super(message);
    this.name = "QueryResultBoundaryError";
    this.code = "QUERY_RESULT";
  }
}
const fail = (message) => {
  throw new QueryResultBoundaryError(message);
};
const own = (x, k) => Object.hasOwn(x, k);
function dataProperties(value) {
  if (
    value === null ||
    typeof value !== "object" ||
    ![Object.prototype, null].includes(Object.getPrototypeOf(value))
  )
    fail("Expected an ordinary query data record");
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const key of Reflect.ownKeys(descriptors))
    if (typeof key !== "string" || !descriptors[key].enumerable || !own(descriptors[key], "value"))
      fail("Expected enumerable own query data");
  return descriptors;
}
function elements(value) {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype)
    fail("Expected an ordinary query array");
  const descriptors = Object.getOwnPropertyDescriptors(value),
    length = descriptors.length.value;
  if (length > 65536 || Reflect.ownKeys(descriptors).length !== length + 1)
    fail("Query array profile exceeded or not dense");
  const result = [];
  for (let i = 0; i < length; i++) {
    const item = descriptors[i];
    if (!item || !item.enumerable || !own(item, "value")) fail("Expected own array data");
    result.push(item.value);
  }
  return result;
}
function text(value) {
  if (typeof value !== "string" || !value.isWellFormed() || value.length > 1048576)
    fail("Invalid query text");
  return value;
}
function scalar(value, allowInteger = false) {
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "string") return text(value);
  if (typeof value === "number" && Number.isFinite(value)) return value === 0 ? 0 : value;
  if (
    value &&
    typeof value === "object" &&
    Object.getPrototypeOf(value) === Object.prototype &&
    Object.keys(value).length === 2 &&
    value.type === "integer" &&
    typeof value.value === "string" &&
    /^(0|-[1-9]\d*|[1-9]\d*)$/.test(value.value)
  ) {
    const exact = BigInt(value.value);
    if (exact >= -9223372036854775808n && exact <= 9223372036854775807n)
      return Object.freeze({ type: "integer", value: value.value });
  }
  if (
    allowInteger &&
    typeof value === "bigint" &&
    value >= -9223372036854775808n &&
    value <= 9223372036854775807n
  )
    return value;
  fail("Unexpected public query scalar");
}
function cloneData(value, budget, ancestors = new Set(), depth = 0) {
  if (++budget.nodes > 1000000 || depth > 64) fail("Query metadata logical profile exceeded");
  if (value === undefined) return undefined;
  if (value === null || typeof value !== "object") return scalar(value, true);
  if (ancestors.has(value)) fail("Cyclic query metadata");
  ancestors.add(value);
  try {
    if (Array.isArray(value))
      return Object.freeze(
        elements(value).map((item) => cloneData(item, budget, ancestors, depth + 1)),
      );
    const descriptors = dataProperties(value);
    return Object.freeze(
      Object.fromEntries(
        Object.entries(descriptors)
          .filter(([, entry]) => entry.value !== undefined)
          .map(([key, entry]) => [text(key), cloneData(entry.value, budget, ancestors, depth + 1)]),
      ),
    );
  } finally {
    ancestors.delete(value);
  }
}
function contexts(value, budget) {
  return Object.freeze(
    elements(value).map((row) => {
      const descriptors = dataProperties(row);
      return Object.freeze(
        Object.fromEntries(
          Object.entries(descriptors).map(([key, entry]) => {
            if (++budget.nodes > 1000000) fail("Query result logical profile exceeded");
            return [text(key), scalar(entry.value)];
          }),
        ),
      );
    }),
  );
}
function exact(descriptors, required, optional = []) {
  if (
    required.some((k) => !own(descriptors, k)) ||
    Object.keys(descriptors).some((k) => !required.includes(k) && !optional.includes(k))
  )
    fail("Unexpected query result fields");
}
function plan(value, backend, budget) {
  const descriptors = dataProperties(value);
  exact(descriptors, ["backend", "steps"]);
  text(descriptors.backend.value);
  text(backend);
  const steps = Object.freeze(
    elements(descriptors.steps.value).map((step) => {
      if (++budget.nodes > 1000000) fail("Query plan logical profile exceeded");
      const data = dataProperties(step);
      exact(data, ["label", "query"], ["params"]);
      return Object.freeze({
        label: text(data.label.value),
        query: text(data.query.value),
        ...(own(data, "params") && data.params.value !== undefined
          ? {
              params: Object.freeze(
                elements(data.params.value).map((value) => {
                  if (++budget.nodes > 1000000) fail("Query parameter logical profile exceeded");
                  return scalar(value, true);
                }),
              ),
            }
          : {}),
      });
    }),
  );
  if (++budget.nodes > 1000000) fail("Query plan profile exceeded");
  return Object.freeze({ backend, steps });
}
function metrics(value, budget) {
  const data = dataProperties(value);
  for (const key of ["patternCount", "predicateCount", "notClauseCount", "orClauseCount"])
    if (!own(data, key) || !Number.isSafeInteger(data[key].value) || data[key].value < 0)
      fail("Invalid required query metric");
  for (const key of ["hasAggregation", "isRecursive"])
    if (!own(data, key) || typeof data[key].value !== "boolean") fail("Invalid query metric flag");
  if (
    !own(data, "compilationTimeMs") ||
    typeof data.compilationTimeMs.value !== "number" ||
    !Number.isFinite(data.compilationTimeMs.value) ||
    data.compilationTimeMs.value < 0
  )
    fail("Invalid compilation metric");
  if (!own(data, "aggregateOps")) fail("Missing aggregate operation metadata");
  elements(data.aggregateOps.value).forEach(text);
  for (const key of [
    "joinCount",
    "whereConditionCount",
    "subqueryCount",
    "cteCount",
    "sqlLength",
    "paramCount",
  ])
    if (
      own(data, key) &&
      data[key].value !== undefined &&
      (!Number.isSafeInteger(data[key].value) || data[key].value < 0)
    )
      fail("Invalid optional query metric");
  return cloneData(value, budget);
}
function debugInfo(value, backend, resultCount, budget) {
  const data = dataProperties(value);
  exact(
    data,
    ["metrics", "executionTimeMs", "resultCount"],
    ["countExecutionTimeMs", "queryPlan", "generatedSql", "params"],
  );
  if (
    typeof data.executionTimeMs.value !== "number" ||
    !Number.isFinite(data.executionTimeMs.value) ||
    data.executionTimeMs.value < 0 ||
    data.resultCount.value !== resultCount
  )
    fail("Invalid query debug counters");
  const result = { ...cloneData(value, budget), metrics: metrics(data.metrics.value, budget) };
  if (
    own(result, "countExecutionTimeMs") &&
    result.countExecutionTimeMs !== undefined &&
    (typeof result.countExecutionTimeMs !== "number" ||
      !Number.isFinite(result.countExecutionTimeMs) ||
      result.countExecutionTimeMs < 0)
  )
    fail("Invalid count-query timing");
  return Object.freeze({
    ...result,
    ...(own(result, "queryPlan") && result.queryPlan !== undefined
      ? { queryPlan: plan(result.queryPlan, backend, budget) }
      : {}),
  });
}
function executed(value, backend, wrapped) {
  const data = dataProperties(value);
  exact(data, ["results"], wrapped ? ["debug", "totalCount", "nextCursor"] : ["debug"]);
  const budget = { nodes: 0 },
    results = contexts(data.results.value, budget);
  const result = { results };
  if (own(data, "totalCount") && data.totalCount.value !== undefined) {
    const total = data.totalCount.value;
    if (!Number.isSafeInteger(total) || total < 0) fail("Invalid exact query count");
    result.totalCount = total;
  }
  if (own(data, "nextCursor") && data.nextCursor.value !== undefined)
    result.nextCursor = text(data.nextCursor.value);
  if (own(data, "debug") && data.debug.value !== undefined)
    result.debug = debugInfo(data.debug.value, backend, results.length, budget);
  return Object.freeze(result);
}
export const ownExecuteResult = (value, backend) => executed(value, backend, false);
export const ownWrappedResult = (value, backend) => executed(value, backend, true);
export function ownExplainResult(value, backend) {
  const data = dataProperties(value);
  exact(data, ["queryPlan"], ["metrics"]);
  const budget = { nodes: 0 };
  return Object.freeze({
    queryPlan: plan(data.queryPlan.value, backend, budget),
    ...(own(data, "metrics") && data.metrics.value !== undefined
      ? { metrics: metrics(data.metrics.value, budget) }
      : {}),
  });
}

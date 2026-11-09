import { DatalogValidationError } from "../../errors/index.js";
import { normalizeOrAlternatives } from "../../datalog/schema.js";
import { validateDatalogQuery, validateWrappedQuery } from "../../datalog/validation.js";
import { emptyContext, isNotClause, isOrClause, isPatternClause, isPredicateClause, isRuleApplication, isVariable } from "./types.js";
import { executePattern } from "./pattern.js";
import { evaluatePredicate } from "./predicate.js";
import { Effect, Stream } from "effect";
//#region src/kv/datalog/executor.ts
/**
* KV Datalog query executor.
*
* Executes DatalogQuery objects against a KvTripleStore, producing
* arrays of Context (variable binding) tuples as results.
*
* Supports the standard clause types:
* - Pattern: index scan + binding (via hexastore)
* - Predicate: comparison filter
* - Not: anti-semi-join (negation)
* - Or: union of alternatives
* - RuleApplication: recursive rules via fixpoint evaluation
*
* Plus aggregation (5 ops), HAVING, ORDER BY, LIMIT/OFFSET,
* and wrapper queries with cursor-based keyset pagination.
*/
const hasExactIntegerConstant = (value) => typeof value === "object" && value !== null && ("type" in value && value.type === "integer" || Object.values(value).some(hasExactIntegerConstant));
/**
* Check whether a sequence of not-inner clauses matches for one context.
* Pattern clauses may bind local variables for later inner clauses, but those
* bindings are discarded by the caller.
*/
const innerClausesMatchContext = (store, clauses, context, asOf) => {
	return Effect.gen(function* () {
		let current = [context];
		const patterns = clauses.filter((clause) => !isPredicateClause(clause));
		const predicates = clauses.filter((clause) => isPredicateClause(clause));
		for (const pattern of patterns) {
			current = yield* executePattern(store, pattern, current, asOf);
			if (current.length === 0) return false;
		}
		for (const predicate of predicates) {
			current = current.filter((ctx) => evaluatePredicate(predicate, ctx));
			if (current.length === 0) return false;
		}
		return true;
	});
};
const patternAlternativeMatchesContext = (store, pattern, context, asOf) => Effect.map(executePattern(store, pattern, [context], asOf), (matches) => matches.length > 0);
const notClauseInnerClauses = (clause) => clause.slice(1);
const notClauseMatchesContext = (store, clause, context, asOf) => innerClausesMatchContext(store, notClauseInnerClauses(clause), context, asOf);
const orAlternativeMatchesContext = (store, alternative, context, asOf) => {
	if (isPredicateClause(alternative)) return Effect.succeed(evaluatePredicate(alternative, context));
	if (isNotClause(alternative)) return Effect.map(notClauseMatchesContext(store, alternative, context, asOf), (matches) => !matches);
	return patternAlternativeMatchesContext(store, alternative, context, asOf);
};
/**
* Execute a NOT clause (anti-semi-join).
*
* ["not", clause1, clause2, ...] — filter out contexts where all inner clauses
* match together. Inner variables are local and do not leak outward.
*/
const executeNot = (store, clause, contexts, asOf) => {
	return Effect.gen(function* () {
		const results = [];
		for (const ctx of contexts) if (!(yield* notClauseMatchesContext(store, clause, ctx, asOf))) results.push(ctx);
		return results;
	});
};
/**
* Execute an OR clause as a filter.
*
* ["or", [alternative1, alternative2, ...]] — keep each incoming context if
* any alternative matches. Alternative-local variables do not leak outward.
*/
const executeOr = (store, clause, contexts, asOf) => {
	const alternatives = normalizeOrAlternatives(clause);
	return Effect.gen(function* () {
		const results = [];
		for (const ctx of contexts) for (const alt of alternatives) if (yield* orAlternativeMatchesContext(store, alt, ctx, asOf)) {
			results.push(ctx);
			break;
		}
		return results;
	});
};
const ruleHeadVariables = (rule) => {
	let arg1;
	let arg2;
	for (const clause of rule.body) if (isRuleApplication(clause)) {
		if (!arg1 && isVariable(clause[1])) arg1 = clause[1];
		if (isVariable(clause[2])) arg2 = clause[2];
	} else {
		if (!arg1 && isVariable(clause[0])) arg1 = clause[0];
		if (isVariable(clause[2])) arg2 = clause[2];
	}
	return arg1 && arg2 ? [arg1, arg2] : null;
};
const normalizedRuleConstant = (value) => typeof value === "object" && value !== null && "type" in value ? value.value : value;
const bindRuleTerm = (term, value, context) => {
	const normalized = normalizedRuleConstant(value);
	if (isVariable(term)) return term in context ? normalizedRuleConstant(context[term]) === normalized ? context : null : {
		...context,
		[term]: normalized
	};
	return normalizedRuleConstant(term) === normalized ? context : null;
};
const applyRulePairs = (contexts, application, pairs) => {
	const [, arg1, arg2] = application;
	const results = [];
	for (const context of contexts) for (const pair of pairs) {
		const withArg1 = bindRuleTerm(arg1, pair.arg1, context);
		if (withArg1 === null) continue;
		const withArg2 = bindRuleTerm(arg2, pair.arg2, withArg1);
		if (withArg2 !== null) results.push(withArg2);
	}
	return results;
};
const deriveRulePairs = (store, rules, ruleName, asOf) => Effect.gen(function* () {
	const definitions = rules.filter((rule) => rule.name === ruleName);
	if (definitions.length === 0) return [];
	const maxDepth = Math.max(...definitions.map((rule) => rule.maxDepth ?? 100));
	const pairs = [];
	const seen = /* @__PURE__ */ new Set();
	for (let depth = 0; depth <= maxDepth; depth++) {
		const discovered = [];
		for (const definition of definitions) {
			const head = ruleHeadVariables(definition);
			if (head === null) continue;
			let current = [emptyContext];
			for (const clause of definition.body) {
				current = isRuleApplication(clause) ? clause[0] === ruleName ? applyRulePairs(current, clause, pairs) : [] : yield* executePattern(store, clause, current, asOf);
				if (current.length === 0) break;
			}
			for (const context of current) {
				const arg1 = normalizedRuleConstant(context[head[0]]);
				const arg2 = normalizedRuleConstant(context[head[1]]);
				if (typeof arg1 !== "string" || typeof arg2 !== "string") continue;
				const pair = {
					arg1,
					arg2
				};
				const key = JSON.stringify([pair.arg1, pair.arg2]);
				if (!seen.has(key)) {
					seen.add(key);
					discovered.push(pair);
				}
			}
		}
		if (discovered.length === 0) break;
		pairs.push(...discovered);
	}
	return pairs;
});
const executeRules = (store, rules, contexts, ruleApplication, asOf) => deriveRulePairs(store, rules, ruleApplication[0], asOf).pipe(Effect.map((pairs) => applyRulePairs(contexts, ruleApplication, pairs)));
/**
* Execute a single clause against the current set of contexts.
*/
const executeClause = (store, clause, contexts, rules, asOf) => {
	if (isPredicateClause(clause)) return Effect.succeed(contexts.filter((ctx) => evaluatePredicate(clause, ctx)));
	if (isNotClause(clause)) return executeNot(store, clause, contexts, asOf);
	if (isOrClause(clause)) return executeOr(store, clause, contexts, asOf);
	if (isRuleApplication(clause)) return executeRules(store, rules, contexts, clause, asOf);
	if (isPatternClause(clause)) return executePattern(store, clause, contexts, asOf);
	return Effect.succeed([...contexts]);
};
/**
* Process all WHERE clauses sequentially (index nested loop join).
*
* Starting from a single empty context, progressively execute each clause.
* Shared variables between clauses create implicit joins.
*/
const executeWhere = (store, clauses, rules, asOf) => {
	return Effect.gen(function* () {
		let contexts = [emptyContext];
		const patterns = [];
		const ruleApplications = [];
		const predicates = [];
		const notClauses = [];
		const orClauses = [];
		for (const clause of clauses) if (isPredicateClause(clause)) predicates.push(clause);
		else if (isNotClause(clause)) notClauses.push(clause);
		else if (isOrClause(clause)) orClauses.push(clause);
		else if (isRuleApplication(clause)) ruleApplications.push(clause);
		else patterns.push(clause);
		const executionOrder = [
			...patterns,
			...ruleApplications,
			...predicates,
			...notClauses,
			...orClauses
		];
		for (const clause of executionOrder) {
			contexts = yield* executeClause(store, clause, contexts, rules, asOf);
			if (contexts.length === 0) break;
		}
		return contexts;
	});
};
/**
* Extract the find variables from contexts, producing the final result rows.
* Only variables listed in `find` are included in each result row.
* Deduplicates results.
*/
const actualize = (contexts, find) => {
	const results = [];
	const seen = /* @__PURE__ */ new Set();
	for (const ctx of contexts) {
		const row = {};
		for (const term of find) if (isVariable(term)) if (term in ctx) row[term] = ctx[term];
		else row[term] = null;
		else row[String(term)] = normalizedRuleConstant(term);
		const key = JSON.stringify(row);
		if (!seen.has(key)) {
			seen.add(key);
			results.push(row);
		}
	}
	return results;
};
/** Project intermediate aggregate inputs without applying result-level DISTINCT. */
const projectAggregateInputs = (contexts, find) => contexts.map((ctx) => {
	const row = {};
	for (const term of find) if (isVariable(term)) row[term] = term in ctx ? ctx[term] : null;
	else row[String(term)] = normalizedRuleConstant(term);
	return row;
});
const tripleValueToResultValue = (value) => {
	switch (value.type) {
		case "integer": throw new TypeError("KV Datalog does not support exact integer values");
		case "string":
		case "ref":
		case "blob": return value.value;
		case "number":
		case "datetime": return value.value;
		case "boolean": return value.value;
		case "json": return JSON.stringify(value.value);
	}
};
const hydrateOptionalProjection = (store, query, rows, asOf) => {
	const projection = query.optionalProjection;
	if (!projection || projection.fields.length === 0) return Effect.succeed([...rows]);
	return Effect.gen(function* () {
		const entityCache = /* @__PURE__ */ new Map();
		return yield* Effect.forEach(rows, (row) => Effect.gen(function* () {
			const hydrated = { ...row };
			const entityId = row[projection.rowBinding];
			if (typeof entityId !== "string") {
				for (const field of projection.fields) if (!(field.variable in hydrated)) hydrated[field.variable] = null;
				return hydrated;
			}
			let entityFields = entityCache.get(entityId);
			if (!entityFields) {
				entityFields = /* @__PURE__ */ new Map();
				const datoms = yield* asOf === void 0 ? store.getEntity(entityId).pipe(Stream.runCollect) : store.scanCollectTemporalAsync({ entity: entityId }, asOf);
				for (const datom of datoms) if (!entityFields.has(datom.attribute)) entityFields.set(datom.attribute, tripleValueToResultValue(datom.value));
				entityCache.set(entityId, entityFields);
			}
			for (const field of projection.fields) {
				if (hydrated[field.variable] !== null && hydrated[field.variable] !== void 0) continue;
				hydrated[field.variable] = entityFields.get(field.attribute) ?? null;
			}
			return hydrated;
		}));
	});
};
/**
* Apply aggregation to result rows.
*
* Groups by non-aggregated find variables, then computes each aggregate.
* Supports: count, sum, avg, min, max.
*/
const aggregate = (results, find, aggregates) => {
	const aggregateInputVars = new Set(aggregates.map((a) => a[1]));
	const aggregateOutputVars = new Set(aggregates.map((a) => a[2]));
	const groupByVars = find.filter((t) => isVariable(t) && !aggregateOutputVars.has(t) && !aggregateInputVars.has(t));
	const groups = /* @__PURE__ */ new Map();
	for (const row of results) {
		const groupKey = JSON.stringify(groupByVars.map((v) => row[v]));
		const group = groups.get(groupKey) ?? [];
		group.push(row);
		groups.set(groupKey, group);
	}
	if (results.length === 0 && groupByVars.length === 0) groups.set("[]", []);
	const aggregatedResults = [];
	for (const group of groups.values()) {
		const representative = group[0];
		const row = {};
		for (const v of groupByVars) if (representative !== void 0 && v in representative) row[v] = representative[v];
		for (const [op, inputVar, outputVar] of aggregates) row[outputVar] = computeAggregate(op, group.map((ctx) => ctx[inputVar]).filter((v) => v !== void 0));
		aggregatedResults.push(row);
	}
	return aggregatedResults;
};
const aggregateValueKey = (value) => `${typeof value}:${typeof value === "object" ? JSON.stringify(value) : String(value)}`;
const computeAggregate = (op, values) => {
	switch (op) {
		case "count": return new Set(values.map(aggregateValueKey)).size;
		case "sum": {
			const numeric = values.filter((value) => typeof value === "number");
			return numeric.length === 0 ? null : numeric.reduce((sum, value) => sum + value, 0);
		}
		case "avg": {
			const numeric = values.filter((value) => typeof value === "number");
			return numeric.length === 0 ? null : numeric.reduce((sum, value) => sum + value, 0) / numeric.length;
		}
		case "min": {
			const numeric = values.filter((value) => typeof value === "number");
			return numeric.length === 0 ? null : numeric.reduce((minimum, value) => value < minimum ? value : minimum);
		}
		case "max": {
			const numeric = values.filter((value) => typeof value === "number");
			return numeric.length === 0 ? null : numeric.reduce((maximum, value) => value > maximum ? value : maximum);
		}
		default: return null;
	}
};
/**
* Apply HAVING filters to aggregated results.
* HAVING is like WHERE but runs after aggregation.
*/
const applyHaving = (results, having) => {
	let filtered = [...results];
	for (const clause of having) filtered = filtered.filter((ctx) => evaluatePredicate(clause, ctx));
	return filtered;
};
/**
* Sort results by the specified order.
*/
const applyOrderBy = (results, orderBy) => {
	return results.sort((a, b) => {
		for (const { variable, direction } of orderBy) {
			const cmp = comparePaginationValues(a[variable] ?? null, b[variable] ?? null, direction ?? "asc");
			if (cmp !== 0) return cmp;
		}
		return 0;
	});
};
const paginationCategory = (value) => {
	if (value === null) return 3;
	if (typeof value === "number") return 0;
	if (typeof value === "boolean") return 1;
	return 2;
};
const comparePaginationValues = (left, right, direction) => {
	if (left === right) return 0;
	const leftCategory = paginationCategory(left);
	const rightCategory = paginationCategory(right);
	if (leftCategory !== rightCategory) return leftCategory - rightCategory;
	if (left === null) return 0;
	let comparison;
	if (typeof left === "number" && typeof right === "number") comparison = left - right;
	else if (typeof left === "boolean" && typeof right === "boolean") comparison = Number(left) - Number(right);
	else comparison = (typeof left === "object" ? JSON.stringify(left) : String(left)) < (typeof right === "object" ? JSON.stringify(right) : String(right)) ? -1 : 1;
	return direction === "desc" ? -comparison : comparison;
};
const applyLimitOffset = (results, limit, offset) => {
	const start = offset ?? 0;
	const end = limit !== void 0 ? start + limit : void 0;
	return results.slice(start, end);
};
/**
* Execute a Datalog query against the KvTripleStore.
*
* Processing pipeline:
* 1. WHERE → join contexts via pattern scans
* 2. Find/actualize → extract result columns
* 3. Aggregate → group + compute aggregates (if specified)
* 4. HAVING → filter aggregated results (if specified)
* 5. ORDER BY → sort results (if specified)
* 6. LIMIT/OFFSET → paginate results (if specified)
*/
const executeQuery = (store, input, rules = [], options = {}) => {
	return Effect.gen(function* () {
		const query = yield* validateDatalogQuery(input);
		if (query.compute?.length || hasExactIntegerConstant(query)) return yield* Effect.fail(new DatalogValidationError({
			query,
			message: "KV exact integer and computed Datalog bindings are not supported by this runtime"
		}));
		const contexts = yield* executeWhere(store, query.where, rules, options.basis);
		let results;
		if (query.aggregate && query.aggregate.length > 0) {
			const aggregateInputVars = query.aggregate.map((a) => a[1]);
			results = projectAggregateInputs(contexts, [...query.find, ...aggregateInputVars.filter((v) => !query.find.includes(v))]);
			results = aggregate(results, query.find, query.aggregate);
		} else results = actualize(contexts, query.find);
		results = yield* hydrateOptionalProjection(store, query, results, options.basis);
		if (query.having && query.having.length > 0) results = applyHaving(results, query.having);
		if (query.orderBy && query.orderBy.length > 0) results = applyOrderBy(results, query.orderBy);
		if (query.limit !== void 0 || query.offset !== void 0) results = applyLimitOffset(results, query.limit, query.offset);
		return { results };
	});
};
/**
* Execute a wrapped query with filtering, pagination, and optional count.
*
* Pipeline:
* 1. Execute inner query
* 2. Apply wrapper filters
* 3. Compute total count (if requested, before pagination)
* 4. Apply wrapper ORDER BY
* 5. Apply cursor-based keyset pagination
* 6. Apply wrapper LIMIT
*/
const executeWrappedQuery = (store, input, rules = [], options = {}) => {
	return Effect.gen(function* () {
		const query = yield* validateWrappedQuery(input);
		if (query.inner.compute?.length || hasExactIntegerConstant(query)) return yield* Effect.fail(new DatalogValidationError({
			query,
			message: "KV exact integer and computed Datalog bindings are not supported by this runtime"
		}));
		let results = [...(yield* executeQuery(store, query.inner, rules, options)).results];
		if (query.filters && query.filters.length > 0) results = applyWrapperFilters(results, query.filters);
		const totalCount = query.includeCount ? results.length : void 0;
		if (query.orderBy && query.orderBy.length > 0) results = applyOrderBy(results, query.orderBy);
		if (options.cursorValues) results = applyCursor(results, options.cursorValues, query.orderBy ?? []);
		const limit = query.limit;
		if (limit !== void 0) results = results.slice(0, limit);
		return {
			results,
			...totalCount !== void 0 ? { totalCount } : {}
		};
	});
};
const applyWrapperFilters = (results, filters) => {
	let filtered = results;
	for (const filter of filters) filtered = filtered.filter((ctx) => evaluateWrapperFilter(ctx, filter));
	return filtered;
};
const compareOrderedFilterValues = (left, right, op) => {
	if (typeof left === "number" && typeof right === "number") {
		if (op === ">") return left > right;
		if (op === ">=") return left >= right;
		if (op === "<") return left < right;
		return left <= right;
	}
	if (typeof left === "string" && typeof right === "string") {
		if (op === ">") return left > right;
		if (op === ">=") return left >= right;
		if (op === "<") return left < right;
		return left <= right;
	}
	return false;
};
const evaluateWrapperFilter = (ctx, filter) => {
	const value = ctx[filter.column];
	switch (filter.op) {
		case "is-null": return value === void 0 || value === null;
		case "is-not-null": return value !== void 0 && value !== null;
		default: break;
	}
	if (filter.value === void 0 || value === void 0 || value === null) return false;
	const filterVal = typeof filter.value === "object" && filter.value !== null && "type" in filter.value ? filter.value.value : filter.value;
	switch (filter.op) {
		case "=": return value === filterVal;
		case "!=": return typeof value === typeof filterVal && value !== filterVal;
		case ">": return compareOrderedFilterValues(value, filterVal, ">");
		case ">=": return compareOrderedFilterValues(value, filterVal, ">=");
		case "<": return compareOrderedFilterValues(value, filterVal, "<");
		case "<=": return compareOrderedFilterValues(value, filterVal, "<=");
		case "like": return typeof value === "string" && typeof filterVal === "string" ? likeMatch(value, filterVal, false) : false;
		case "not-like": return typeof value === "string" && typeof filterVal === "string" ? !likeMatch(value, filterVal, false) : false;
		case "ilike": return typeof value === "string" && typeof filterVal === "string" ? likeMatch(value, filterVal, true) : false;
		case "not-ilike": return typeof value === "string" && typeof filterVal === "string" ? !likeMatch(value, filterVal, true) : false;
		default: return true;
	}
};
/**
* SQL LIKE pattern matching.
* % matches any sequence of characters, _ matches any single character.
*/
const likeMatch = (value, pattern, caseInsensitive) => {
	const v = caseInsensitive ? value.toLowerCase() : value;
	const p = caseInsensitive ? pattern.toLowerCase() : pattern;
	let regex = "^";
	for (const char of p) if (char === "%") regex += ".*";
	else if (char === "_") regex += ".";
	else regex += char.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	regex += "$";
	return new RegExp(regex, "s").test(v);
};
/**
* Apply cursor-based keyset pagination.
* Filters results to only those "after" the cursor position.
*/
const applyCursor = (results, cursorValues, orderBy) => {
	if (cursorValues.length === 0 || orderBy.length === 0) return results;
	return results.filter((row) => {
		for (let i = 0; i < orderBy.length; i++) {
			const { variable, direction } = orderBy[i];
			const rowVal = row[variable];
			const curVal = cursorValues[i];
			const cmp = comparePaginationValues(rowVal ?? null, curVal ?? null, direction ?? "asc");
			if (cmp === 0) continue;
			return cmp > 0;
		}
		return false;
	});
};
//#endregion
export { executeQuery, executeWrappedQuery };

//# sourceMappingURL=executor.js.map
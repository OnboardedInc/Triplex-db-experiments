import { DatalogValidationError } from "../errors/index.js";
import { isTypedConstant } from "./schema.js";
import { assertWrappedQuery } from "./validation.js";
import { SqliteDialect } from "../dialects/sqlite.js";
import { createParamCollector } from "../params.js";
import { compile, compileWithRules } from "./compiler.js";
//#region src/datalog/wrapper.ts
/**
* Query Wrapper Compiler
*
* Wraps a Datalog query in a CTE to enable:
* - Additional filtering on result columns
* - Separate pagination from inner query
* - Total count retrieval for pagination UI
*/
/**
* Compile a wrapper filter operator to SQL
*/
const compileFilterOp = (colName, op, value, collector, dialect) => {
	switch (op) {
		case "=": return `${colName} = ${collector.add(value)}`;
		case "!=": return `${colName} <> ${collector.add(value)}`;
		case ">": return `${colName} > ${collector.add(value)}`;
		case ">=": return `${colName} >= ${collector.add(value)}`;
		case "<": return `${colName} < ${collector.add(value)}`;
		case "<=": return `${colName} <= ${collector.add(value)}`;
		case "like": return `${colName} LIKE ${collector.add(value)}`;
		case "not-like": return `${colName} NOT LIKE ${collector.add(value)}`;
		case "ilike":
			if (dialect.name === "postgresql") return `${colName} ILIKE ${collector.add(value)}`;
			return `${colName} LIKE ${collector.add(value)} COLLATE NOCASE`;
		case "not-ilike":
			if (dialect.name === "postgresql") return `${colName} NOT ILIKE ${collector.add(value)}`;
			return `${colName} NOT LIKE ${collector.add(value)} COLLATE NOCASE`;
		case "is-null": return `${colName} IS NULL`;
		case "is-not-null": return `${colName} IS NOT NULL`;
		default: throw new Error(`Unknown filter operator: ${op}`);
	}
};
/**
* Compile a wrapper filter to SQL condition
*/
const compileFilter = (filter, compiled, collector, dialect) => {
	const colName = `"${filter.column}"`;
	const value = isTypedConstant(filter.value) ? filter.value.value : filter.value;
	const columns = compiled.valueColumnMap.get(filter.column);
	if (columns === void 0) {
		if (filter.op === "is-null" || filter.op === "is-not-null") return compileFilterOp(colName, filter.op, value, collector, dialect);
		const integer = compiled.integerColumns?.has(filter.column) === true;
		const integerConstant = isTypedConstant(filter.value) && filter.value.type === "integer";
		if ((integer || compiled.numericColumns.has(filter.column)) && integer !== integerConstant) throw new DatalogValidationError({
			query: filter,
			message: "Mixed exact integer and number wrapper filters require an explicit cast"
		});
		if (integer) {
			if (![
				"=",
				"!=",
				">",
				">=",
				"<",
				"<="
			].includes(filter.op)) throw new DatalogValidationError({
				query: filter,
				message: "Exact integers support equality and ordered wrapper filters"
			});
			return `CAST(${colName} AS DECIMAL(32, 0)) ${filter.op === "!=" ? "<>" : filter.op} CAST(${collector.add(value)} AS DECIMAL(32, 0))`;
		}
		return compileFilterOp(colName, filter.op, value, collector, dialect);
	}
	const type = quoted(columns.type);
	if (isTypedConstant(filter.value) && filter.value.type === "integer") {
		if (!columns.orderInteger) throw new Error("Exact integer filters are unsupported by this backend");
		if (![
			"=",
			"!=",
			">",
			">=",
			"<",
			"<="
		].includes(filter.op)) throw new Error("Exact integers support equality and ordered wrapper filters");
		const operator = filter.op === "!=" ? "<>" : filter.op;
		return `(${type} = 'integer' AND ${quoted(columns.orderInteger)} ${operator} CAST(${collector.add(filter.value.value)} AS DECIMAL(32, 0)))`;
	}
	if (filter.op === "is-null" || filter.op === "is-not-null") return compileFilterOp(type, filter.op, value, collector, dialect);
	let scalar;
	let typeCondition;
	let storedValue = value;
	if (typeof value === "number") {
		scalar = quoted(columns.orderNumber);
		typeCondition = `${type} = 'number'`;
	} else if (typeof value === "boolean") {
		scalar = quoted(columns.boolean);
		typeCondition = `${type} = 'boolean'`;
		storedValue = dialect.name === "sqlite" ? value ? 1 : 0 : value;
	} else {
		scalar = quoted(columns.orderText);
		typeCondition = `${type} = 'string'`;
	}
	return `(${typeCondition} AND ${compileFilterOp(scalar, filter.op, storedValue, collector, dialect)})`;
};
/**
* Compile wrapper filters to WHERE clause
*/
const compileFilters = (filters, compiled, collector, dialect) => {
	if (!filters || filters.length === 0) return "";
	return `WHERE ${filters.map((f) => compileFilter(f, compiled, collector, dialect)).join(" AND ")}`;
};
const quoted = (name) => `"${name}"`;
const valueCategory = (value) => {
	if (value === null) return 3;
	if (typeof value === "number") return 0;
	if (typeof value === "boolean") return 1;
	if (typeof value === "object" && value.type === "integer") return .5;
	return 2;
};
const sortComponents = (orderBy, compiled, cursor) => orderBy.flatMap(({ variable, direction = "asc" }, index) => {
	const value = cursor?.[index];
	const columns = compiled.valueColumnMap.get(variable);
	if (!columns) {
		const integer = compiled.integerColumns?.has(variable) === true;
		return [{
			expression: `CASE WHEN ${quoted(variable)} IS NULL THEN 1 ELSE 0 END`,
			direction: "asc",
			value: cursor === void 0 ? void 0 : value === null ? 1 : 0
		}, {
			expression: integer ? `CAST(${quoted(variable)} AS DECIMAL(32, 0))` : quoted(variable),
			direction,
			value: integer && value !== null && typeof value === "object" ? value.value : value,
			...integer ? { integer: true } : {}
		}];
	}
	const numeric = quoted(columns.orderNumber);
	const boolean = quoted(columns.boolean);
	const text = quoted(columns.orderText);
	return [
		{
			expression: quoted(columns.category),
			direction: "asc",
			value: cursor === void 0 ? void 0 : valueCategory(value ?? null)
		},
		{
			expression: numeric,
			direction,
			value: cursor === void 0 ? void 0 : typeof value === "number" ? value : null
		},
		...columns.orderInteger ? [{
			expression: quoted(columns.orderInteger),
			direction,
			value: cursor === void 0 ? void 0 : typeof value === "object" && value !== null && value.type === "integer" ? value.value : null,
			integer: true
		}] : [],
		{
			expression: boolean,
			direction,
			value: cursor === void 0 ? void 0 : typeof value === "boolean" ? value ? 1 : 0 : null
		},
		{
			expression: text,
			direction,
			value: cursor === void 0 ? void 0 : typeof value === "string" ? value : null
		}
	];
});
const compileOrderBy = (orderBy, compiled) => {
	if (!orderBy || orderBy.length === 0) return "";
	return `ORDER BY ${sortComponents(orderBy, compiled).map(({ expression, direction }) => `${expression} ${direction.toUpperCase()}`).join(", ")}`;
};
/**
* Generate keyset WHERE clause for cursor pagination
*
* For single column orderBy (simple case):
*   WHERE "?name" > ?
*
* For multi-column orderBy with mixed directions:
*   orderBy: [{?dept, asc}, {?age, desc}]  cursor: {?dept: "Eng", ?age: 30}
*   WHERE (
*     "?dept" > ?                              -- dept after cursor
*     OR ("?dept" = ? AND "?age" < ?)          -- same dept, younger (desc)
*   )
*
* This generates a compound OR condition that correctly handles
* multi-column sort orders with mixed directions.
*/
const compileKeysetClause = (components, collector) => {
	if (components.length === 0) return "";
	const conditions = [];
	const parameter = (component, value) => component.integer ? `CAST(${collector.add(value)} AS DECIMAL(32, 0))` : collector.add(value);
	for (let i = 0; i < components.length; i++) {
		const current = components[i];
		const currentValue = current.value;
		if (currentValue === null || currentValue === void 0) continue;
		const parts = [];
		for (let j = 0; j < i; j++) {
			const prev = components[j];
			const previousValue = prev.value;
			parts.push(previousValue === null ? `${prev.expression} IS NULL` : `${prev.expression} = ${parameter(prev, previousValue)}`);
		}
		const { expression, direction } = current;
		const op = direction === "asc" ? ">" : "<";
		parts.push(`${expression} ${op} ${parameter(current, currentValue)}`);
		conditions.push(`(${parts.join(" AND ")})`);
	}
	return conditions.length === 0 ? "0 = 1" : `(${conditions.join(" OR ")})`;
};
/**
* Compile a wrapped query to SQL
*
* Strategy:
* 1. Compile inner query to SQL using existing compiler
* 2. Wrap in CTE: WITH inner_results AS (inner_sql)
* 3. Generate outer SELECT with filters and pagination
* 4. Generate count query if requested
*/
const compileWrapped = (input, dialect = SqliteDialect, options = {}) => {
	const started = performance.now();
	const { inner, filters, orderBy, limit, includeCount } = assertWrappedQuery(input);
	const { orderBy: _innerOrder, ...unordered } = inner;
	const logicalInner = inner.limit === void 0 && inner.offset === void 0 ? unordered : inner;
	const innerCompiled = (inner.rules?.length ? compileWithRules : compile)(logicalInner, dialect, true, options);
	const cteName = "inner_results";
	const cte = `WITH ${cteName} AS (\n${innerCompiled.sql}\n)`;
	const selectColumns = new Set([...innerCompiled.columnMap.keys()].map((column) => `"${column}"`));
	for (const columns of innerCompiled.valueColumnMap.values()) for (const column of [
		`"${columns.category}"`,
		`"${columns.orderNumber}"`,
		`"${columns.orderText}"`,
		`"${columns.type}"`,
		`"${columns.string}"`,
		`"${columns.number}"`,
		`"${columns.boolean}"`,
		...columns.orderInteger ? [`"${columns.orderInteger}"`] : []
	]) selectColumns.add(column);
	const mainCollector = createParamCollector(dialect);
	for (const p of innerCompiled.params) mainCollector.add(p);
	const whereConditions = [];
	if (filters && filters.length > 0) {
		const filterConditions = filters.map((f) => compileFilter(f, innerCompiled, mainCollector, dialect));
		whereConditions.push(...filterConditions);
	}
	if (options.cursorValues && orderBy && orderBy.length > 0) {
		const keysetCondition = compileKeysetClause(sortComponents(orderBy, innerCompiled, options.cursorValues), mainCollector);
		if (keysetCondition) whereConditions.push(keysetCondition);
	}
	const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";
	const orderByClause = compileOrderBy(orderBy, innerCompiled);
	const limitClause = limit ? dialect.limitOffset(limit, void 0) : "";
	const sql = [
		cte,
		`SELECT ${[...selectColumns].join(", ") || "*"}`,
		`FROM ${cteName}`,
		whereClause,
		orderByClause,
		limitClause
	].filter(Boolean).join("\n");
	let countSql = null;
	let countParams = [];
	if (includeCount) {
		const countCollector = createParamCollector(dialect);
		for (const p of innerCompiled.params) countCollector.add(p);
		const countWhereClause = compileFilters(filters, innerCompiled, countCollector, dialect);
		countSql = [
			cte,
			`SELECT COUNT(*) AS total`,
			`FROM ${cteName}`,
			countWhereClause
		].filter(Boolean).join("\n");
		countParams = countCollector.params;
	}
	return {
		metrics: {
			...innerCompiled.metrics,
			cteCount: (innerCompiled.metrics?.cteCount ?? 0) + 1,
			sqlLength: sql.length,
			paramCount: mainCollector.params.length,
			compilationTimeMs: performance.now() - started
		},
		sql,
		countSql,
		params: mainCollector.params,
		countParams,
		columnMap: innerCompiled.columnMap,
		valueColumnMap: innerCompiled.valueColumnMap,
		numericColumns: innerCompiled.numericColumns,
		constantColumns: innerCompiled.constantColumns,
		...innerCompiled.integerColumns ? { integerColumns: innerCompiled.integerColumns } : {}
	};
};
//#endregion
export { compileWrapped };

//# sourceMappingURL=wrapper.js.map
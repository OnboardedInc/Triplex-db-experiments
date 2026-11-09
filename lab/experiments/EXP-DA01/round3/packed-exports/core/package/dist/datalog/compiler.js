import { DatalogValidationError } from "../errors/index.js";
import { isNotClause, isPredicateClause, isRuleApplication, isTypedConstant, isVariable, normalizeOrAlternatives } from "./schema.js";
import { assertDatalogQuery } from "./validation.js";
import { SqliteDialect } from "../dialects/sqlite.js";
import { createParamCollector } from "../params.js";
import { Data } from "effect";
//#region src/datalog/compiler.ts
/**
* SQL Compiler for Datalog Queries
*
* Compiles Datalog queries directly to SQL for efficient execution.
* This replaces the in-memory engine for production use.
*/
const tripleBinding = (alias, position) => ({
	_tag: "Triple",
	alias,
	position
});
const ruleBinding = (alias, position) => ({
	_tag: "Rule",
	alias,
	position
});
const InternalClause = Data.taggedEnum();
const exactIntegers = (ctx) => ctx.collector.dialect.exactIntegers === true;
const integerBinding = (alias, ctx) => exactIntegers(ctx) && !ctx.nonIntegerAliases.has(alias);
const integerExpression = (alias) => `CAST(CASE WHEN ${alias}.value_type = 'integer' THEN ${alias}.value_string ELSE NULL END AS DECIMAL(32, 0))`;
const assertFeatures = (query, dialect) => {
	if (dialect.exactIntegers) return;
	const visit = (value) => typeof value === "object" && value !== null && ("type" in value && value.type === "integer" || Object.values(value).some(visit));
	if (visit(query) || query.compute?.length) throw new DatalogValidationError({
		query,
		message: `${dialect.name} does not support exact integer or computed Datalog extensions`
	});
};
const applyTemporalBasis = (sql, basis) => {
	if (basis === void 0) return sql;
	const validAt = String(basis.validAt);
	return sql.replace(/\b([A-Za-z_][A-Za-z0-9_]*)\.retracted_at IS NULL/g, (_condition, alias) => {
		return `${basis.recordedPosition !== void 0 ? `${alias}.recorded_position <= ${basis.recordedPosition}${basis.recordedAt === void 0 ? "" : ` AND ${alias}.recorded_at <= ${basis.recordedAt}`} AND (${alias}.retracted_position IS NULL OR ${alias}.retracted_position > ${basis.recordedPosition}${basis.recordedAt === void 0 ? "" : ` OR ${alias}.retracted_at > ${basis.recordedAt}`})` : basis.recordedAt === void 0 ? `${alias}.retracted_at IS NULL` : `${alias}.recorded_at <= ${basis.recordedAt} AND (${alias}.retracted_at IS NULL OR ${alias}.retracted_at > ${basis.recordedAt})`} AND ${alias}.valid_from <= ${validAt} AND (${alias}.valid_to IS NULL OR ${alias}.valid_to > ${validAt})`;
	});
};
const ruleNamePattern = /^[a-zA-Z_][a-zA-Z0-9_-]*$/;
/** Rule names are SQL identifiers, so validate and quote them rather than treating them as values. */
const ruleIdentifier = (name) => {
	if (!ruleNamePattern.test(name) || name === "not" || name === "or") throw new Error(`Invalid Datalog rule name: ${JSON.stringify(name)}`);
	return `"${name}"`;
};
/**
* Format a constant value for SQL using parameterized queries.
* Uses the ParamCollector to add the value and return a placeholder.
*/
const formatValue = (value, ctx) => {
	if (isTypedConstant(value)) return ctx.collector.add(value.value);
	return ctx.collector.add(value);
};
/** Format a constant for one of the physical value_* storage columns. */
const formatStoredValue = (value, ctx) => typeof value === "boolean" ? ctx.collector.add(value ? 1 : 0) : formatValue(value, ctx);
/**
* Get the column expression for a term in a given alias
*/
const getColumnForPosition = (alias, position, valueColumn) => {
	switch (position) {
		case "entity": return `${alias}.entity_id`;
		case "attribute": return `${alias}.attribute`;
		case "value": return valueColumn ? `${alias}.${valueColumn}` : `${alias}.value_string`;
		case "tx": return `${alias}.tx_id`;
	}
};
const resolveBinding = (binding, options = {}) => {
	const valueMode = options.valueMode ?? "raw";
	if (binding._tag === "Computed") return binding.expression;
	if (binding._tag === "Rule") {
		if (valueMode === "number") return `CAST(${binding.alias}.${binding.position} AS REAL)`;
		return `${binding.alias}.${binding.position}`;
	}
	if (binding.position === "value") {
		if (valueMode === "coalesce") return `COALESCE(${binding.alias}.value_string, CAST(${binding.alias}.value_number AS TEXT), CAST(${binding.alias}.value_boolean AS TEXT), CAST(${binding.alias}.value_datetime AS TEXT), ${binding.alias}.value_json)`;
		if (valueMode === "number") return `COALESCE(${binding.alias}.value_number, ${binding.alias}.value_datetime)`;
		if (valueMode === "boolean") return `${binding.alias}.value_boolean`;
		return `${binding.alias}.value_string`;
	}
	return getColumnForPosition(binding.alias, binding.position);
};
const isTripleValueBinding = (binding) => binding._tag === "Triple" && binding.position === "value";
const textScalarExpression = (alias) => `COALESCE(${alias}.value_string, ${alias}.value_json)`;
const numberScalarExpression = (alias) => `COALESCE(${alias}.value_number, ${alias}.value_datetime)`;
const textScalarTypeCondition = (alias) => `${alias}.value_type IN ('string', 'ref', 'blob', 'json')`;
const numberScalarTypeCondition = (alias) => `${alias}.value_type IN ('number', 'datetime')`;
/** Match a pattern constant using the flattened scalar identity exposed by Datalog. */
const compilePatternValueCondition = (alias, value, ctx) => {
	if (isTypedConstant(value)) return `(${alias}.value_type = ${ctx.collector.add(value.type)} AND ${alias}.value_string = ${ctx.collector.add(value.value)})`;
	if (typeof value === "number") return `((${numberScalarTypeCondition(alias)}) AND ${numberScalarExpression(alias)} = ${formatValue(value, ctx)})`;
	if (typeof value === "boolean") return `(${alias}.value_type = 'boolean' AND ${alias}.value_boolean = ${formatStoredValue(value, ctx)})`;
	return `((${textScalarTypeCondition(alias)}) AND ${textScalarExpression(alias)} = ${formatValue(value, ctx)})`;
};
/** Compare bindings using the flattened scalar semantics exposed by the KV executor. */
const compileBindingEquality = (left, right) => {
	if (left._tag === "Computed" || right._tag === "Computed") {
		const computed = left._tag === "Computed" ? left : right;
		const other = left._tag === "Computed" ? right : left;
		if (other._tag === "Computed") return computed.integer === other.integer ? `${computed.expression} = ${other.expression}` : "1 = 0";
		if (!isTripleValueBinding(other)) return "1 = 0";
		return `(${computed.integer ? `${other.alias}.value_type = 'integer'` : numberScalarTypeCondition(other.alias)} AND ${computed.expression} = ${computed.integer ? integerExpression(other.alias) : numberScalarExpression(other.alias)})`;
	}
	if (isTripleValueBinding(left) && isTripleValueBinding(right)) return `(((${textScalarTypeCondition(left.alias)}) AND (${textScalarTypeCondition(right.alias)}) AND ${textScalarExpression(left.alias)} = ${textScalarExpression(right.alias)}) OR ((${numberScalarTypeCondition(left.alias)}) AND (${numberScalarTypeCondition(right.alias)}) AND ${numberScalarExpression(left.alias)} = ${numberScalarExpression(right.alias)}) OR (${left.alias}.value_type = 'boolean' AND ${right.alias}.value_type = 'boolean' AND ${left.alias}.value_boolean = ${right.alias}.value_boolean) OR (${left.alias}.value_type = 'integer' AND ${right.alias}.value_type = 'integer' AND ${left.alias}.value_string = ${right.alias}.value_string))`;
	if (isTripleValueBinding(left)) return `((${textScalarTypeCondition(left.alias)}) AND ${textScalarExpression(left.alias)} = ${resolveBinding(right)})`;
	if (isTripleValueBinding(right)) return `((${textScalarTypeCondition(right.alias)}) AND ${resolveBinding(left)} = ${textScalarExpression(right.alias)})`;
	return `${resolveBinding(left)} = ${resolveBinding(right)}`;
};
const compileBindingConstantEquality = (binding, value, ctx) => {
	if (binding._tag === "Computed") {
		if (isTypedConstant(value) && value.type === "integer") return binding.integer ? `${binding.expression} = CAST(${formatValue(value, ctx)} AS DECIMAL(32, 0))` : "1 = 0";
		return typeof value === "number" && !binding.integer ? `${binding.expression} = ${formatValue(value, ctx)}` : "1 = 0";
	}
	if (!isTripleValueBinding(binding)) {
		const scalar = constantScalar(value);
		return typeof scalar === "string" ? `${resolveBinding(binding)} = ${formatValue(scalar, ctx)}` : "1 = 0";
	}
	if (isTypedConstant(value) && value.type === "integer") return `(${binding.alias}.value_type = 'integer' AND ${binding.alias}.value_string = ${formatValue(value, ctx)})`;
	if (typeof value === "number") return `((${numberScalarTypeCondition(binding.alias)}) AND ${numberScalarExpression(binding.alias)} = ${formatValue(value, ctx)})`;
	if (typeof value === "boolean") return `(${binding.alias}.value_type = 'boolean' AND ${binding.alias}.value_boolean = ${formatStoredValue(value, ctx)})`;
	const scalar = isTypedConstant(value) ? value.value : value;
	return `((${textScalarTypeCondition(binding.alias)}) AND ${textScalarExpression(binding.alias)} = ${formatValue(scalar, ctx)})`;
};
const constantScalar = (value) => isTypedConstant(value) ? value.type === "integer" ? value : value.value : value;
const constantsEqual = (left, right) => {
	const a = constantScalar(left);
	const b = constantScalar(right);
	return typeof a === "object" && typeof b === "object" ? a.type === b.type && a.value === b.value : a === b;
};
const compileEqualityCondition = (left, right, ctx) => {
	if (isVariable(left) && isVariable(right)) {
		const leftBinding = ctx.bindings.get(left);
		const rightBinding = ctx.bindings.get(right);
		if (!leftBinding) throw new Error(`Unbound variable in predicate: ${left}`);
		if (!rightBinding) throw new Error(`Unbound variable in predicate: ${right}`);
		return compileBindingEquality(leftBinding, rightBinding);
	}
	if (isVariable(left)) {
		const binding = ctx.bindings.get(left);
		if (!binding) throw new Error(`Unbound variable in predicate: ${left}`);
		return compileBindingConstantEquality(binding, right, ctx);
	}
	if (isVariable(right)) {
		const binding = ctx.bindings.get(right);
		if (!binding) throw new Error(`Unbound variable in predicate: ${right}`);
		return compileBindingConstantEquality(binding, left, ctx);
	}
	return constantsEqual(left, right) ? "1 = 1" : "1 = 0";
};
/** Resolve the numeric-only scalar contract used by ordered Datalog predicates. */
const orderedTermExpression = (term, ctx) => {
	if (!isVariable(term)) {
		if (isTypedConstant(term) && term.type === "integer") return {
			expression: `CAST(${formatValue(term, ctx)} AS DECIMAL(32, 0))`,
			integer: true
		};
		const value = constantScalar(term);
		return typeof value === "number" ? { expression: formatValue(value, ctx) } : null;
	}
	const aggregate = ctx.aggregateExpressions.get(term);
	if (aggregate !== void 0) return {
		expression: aggregate,
		...ctx.integerColumns.has(term) ? { integer: true } : {}
	};
	const binding = ctx.bindings.get(term);
	if (binding?._tag === "Computed") return {
		expression: binding.expression,
		...binding.integer ? { integer: true } : {}
	};
	if (!binding || !isTripleValueBinding(binding)) return null;
	return {
		expression: ctx.integerVariables.has(term) ? integerExpression(binding.alias) : numberScalarExpression(binding.alias),
		typeCondition: ctx.integerVariables.has(term) ? `${binding.alias}.value_type = 'integer'` : numberScalarTypeCondition(binding.alias),
		...ctx.integerVariables.has(term) ? { integer: true } : {}
	};
};
const compileOrderedPredicateCondition = (op, left, right, ctx) => {
	if (isTypedConstant(left) && left.type === "integer" && isVariable(right)) ctx.integerVariables.add(right);
	if (isTypedConstant(right) && right.type === "integer" && isVariable(left)) ctx.integerVariables.add(left);
	const leftTerm = orderedTermExpression(left, ctx);
	const rightTerm = orderedTermExpression(right, ctx);
	if (leftTerm === null || rightTerm === null) return "1 = 0";
	if (Boolean(leftTerm.integer) !== Boolean(rightTerm.integer)) throw new DatalogValidationError({
		query: [
			op,
			left,
			right
		],
		message: "Mixed exact integer and number comparisons require an explicit cast"
	});
	const conditions = [leftTerm.typeCondition, rightTerm.typeCondition].filter((condition) => condition !== void 0);
	conditions.push(`${leftTerm.expression} ${op} ${rightTerm.expression}`);
	return `(${conditions.join(" AND ")})`;
};
const isValueLikeBinding = (binding) => {
	return binding._tag === "Computed" || binding._tag === "Triple" && binding.position === "value" || binding._tag === "Rule" && binding.position === "arg2";
};
const compileComputations = (query, ctx) => {
	const pending = [...query.compute ?? []];
	while (pending.length) {
		const index = pending.findIndex(([, left, right]) => [left, right].every((term) => !isVariable(term) || ctx.bindings.has(term)));
		if (index < 0) throw new DatalogValidationError({
			query,
			message: "Computed binding dependency cycle"
		});
		const [operation, left, right, target] = pending.splice(index, 1)[0];
		if (isTypedConstant(left) && left.type === "integer" && isVariable(right)) ctx.integerVariables.add(right);
		if (isTypedConstant(right) && right.type === "integer" && isVariable(left)) ctx.integerVariables.add(left);
		const operand = (term) => {
			if (typeof term === "number") return {
				expression: `CAST(${formatValue(term, ctx)} AS DOUBLE)`,
				integer: false
			};
			if (isTypedConstant(term) && term.type === "integer") return {
				expression: `CAST(${formatValue(term, ctx)} AS DECIMAL(32, 0))`,
				integer: true
			};
			if (isVariable(term)) {
				const binding = ctx.bindings.get(term);
				if (binding._tag === "Computed") return binding;
				if (isTripleValueBinding(binding)) return ctx.integerVariables.has(term) ? {
					expression: integerExpression(binding.alias),
					integer: true
				} : {
					expression: `CAST(${numberScalarExpression(binding.alias)} AS DOUBLE)`,
					integer: false
				};
			}
			throw new DatalogValidationError({
				query,
				message: "Computed operands require numeric value bindings"
			});
		};
		const a = operand(left);
		const b = operand(right);
		if (a.integer !== b.integer) throw new DatalogValidationError({
			query,
			message: "Mixed exact integer and number arithmetic requires an explicit cast"
		});
		const quotient = `(${a.expression} / ${b.expression})`;
		const truncated = `CASE WHEN ${quotient} < 0 THEN CEIL(${quotient}) ELSE FLOOR(${quotient}) END`;
		let expression = operation === "%" ? a.integer ? `(${a.expression} - (${truncated}) * ${b.expression})` : `CASE WHEN ${a.expression} < 0 THEN -MOD(ABS(${a.expression}), ABS(${b.expression})) ELSE MOD(ABS(${a.expression}), ABS(${b.expression})) END` : `(${a.expression} ${operation} ${b.expression})`;
		if (a.integer) {
			if (operation === "/") expression = truncated;
			const raw = expression;
			expression = `CAST(CASE WHEN (${raw}) < CAST('-9223372036854775808' AS DECIMAL(32, 0)) OR (${raw}) > CAST('9223372036854775807' AS DECIMAL(32, 0)) THEN 'integer-overflow' ELSE CAST(CAST((${raw}) AS BIGINT) AS TEXT) END AS BIGINT)`;
			ctx.integerVariables.add(target);
		}
		if (expression.length > 64e3) throw new DatalogValidationError({
			query,
			message: "Computed expression exceeds the 64 KiB planning limit"
		});
		ctx.bindings.set(target, {
			_tag: "Computed",
			expression,
			integer: a.integer
		});
	}
};
const predicateOperators = new Set([
	">",
	">=",
	"<",
	"<=",
	"=",
	"!="
]);
const parseClause = (clause, options) => {
	const head = clause[0];
	if (typeof head === "string" && predicateOperators.has(head)) {
		if (clause.length !== 3) throw new Error(`Invalid predicate clause arity: ${JSON.stringify(clause)}`);
		return InternalClause.Predicate({ predicate: clause });
	}
	if (head === "not") {
		if (clause.length < 2) throw new Error(`Invalid not clause arity: ${JSON.stringify(clause)}`);
		return InternalClause.Not({ notClause: clause });
	}
	if (head === "or") {
		const alternatives = normalizeOrAlternatives(clause);
		return InternalClause.Or({ orClause: ["or", alternatives] });
	}
	if (clause.length < 3 || clause.length > 4) throw new Error(`Invalid clause arity: ${JSON.stringify(clause)}`);
	if (clause.length === 3 && isRuleApplication(clause)) {
		if (!options.allowRuleApplications) throw new Error(`Rule application "${clause[0]}" requires compileWithRules() and rule definitions`);
		return InternalClause.RuleCall({ ruleApplication: clause });
	}
	return InternalClause.Pattern({ pattern: clause });
};
const classifyClauses = (where, options) => {
	const classified = {
		patterns: [],
		predicates: [],
		notClauses: [],
		orClauses: [],
		ruleApplications: []
	};
	for (const clause of where) {
		const parsed = parseClause(clause, options);
		switch (parsed._tag) {
			case "Pattern":
				classified.patterns.push(parsed.pattern);
				break;
			case "Predicate":
				classified.predicates.push(parsed.predicate);
				break;
			case "Not":
				classified.notClauses.push(parsed.notClause);
				break;
			case "Or":
				classified.orClauses.push(parsed.orClause);
				break;
			case "RuleCall":
				classified.ruleApplications.push(parsed.ruleApplication);
				break;
		}
	}
	return classified;
};
/**
* Create a new compiler context
*/
const createContext = (dialect, options = {}) => ({
	temporalInWhere: options.temporalInWhere ?? false,
	recursiveExecution: options.recursiveExecution,
	integerVariables: new Set(options.integerVariables),
	nonIntegerProjectionVariables: new Set(options.nonIntegerProjectionVariables),
	nonIntegerAliases: /* @__PURE__ */ new Set(),
	integerColumns: /* @__PURE__ */ new Set(),
	bindings: /* @__PURE__ */ new Map(),
	aliasCounter: 0,
	joins: [],
	conditions: [],
	patternAliases: /* @__PURE__ */ new Map(),
	aggregateExpressions: /* @__PURE__ */ new Map(),
	collector: createParamCollector(dialect)
});
/**
* Get the next table alias
*/
const nextAlias = (ctx) => {
	const alias = `t${ctx.aliasCounter}`;
	ctx.aliasCounter++;
	return alias;
};
/**
* Compile a single pattern clause to SQL
* Returns the table alias used for this pattern
*
* Supports both 3-tuple [entity, attribute, value] and
* 4-tuple [entity, attribute, value, tx] patterns
*/
const compilePattern = (pattern, ctx, isFirstPattern) => {
	const [entity, attribute, value] = pattern;
	const tx = pattern.length === 4 ? pattern[3] : void 0;
	const alias = nextAlias(ctx);
	if (isVariable(value) && ctx.nonIntegerProjectionVariables.has(value)) ctx.nonIntegerAliases.add(alias);
	if (isFirstPattern) ctx.conditions.push(`${alias}.retracted_at IS NULL`);
	else {
		let joinCondition = ctx.temporalInWhere ? "1=1" : `${alias}.retracted_at IS NULL`;
		if (ctx.temporalInWhere) ctx.conditions.push(`${alias}.retracted_at IS NULL`);
		if (isVariable(entity) && ctx.bindings.has(entity)) {
			const binding = ctx.bindings.get(entity);
			joinCondition = `${compileBindingEquality(tripleBinding(alias, "entity"), binding)} AND ${joinCondition}`;
		}
		ctx.joins.push(`JOIN triples ${alias} ON ${joinCondition}`);
	}
	if (isVariable(entity)) if (!ctx.bindings.has(entity)) ctx.bindings.set(entity, tripleBinding(alias, "entity"));
	else {
		const binding = ctx.bindings.get(entity);
		ctx.conditions.push(compileBindingEquality(tripleBinding(alias, "entity"), binding));
	}
	else ctx.conditions.push(`${alias}.entity_id = ${formatValue(entity, ctx)}`);
	if (isVariable(attribute)) if (!ctx.bindings.has(attribute)) ctx.bindings.set(attribute, tripleBinding(alias, "attribute"));
	else {
		const binding = ctx.bindings.get(attribute);
		ctx.conditions.push(compileBindingEquality(tripleBinding(alias, "attribute"), binding));
	}
	else ctx.conditions.push(`${alias}.attribute = ${formatValue(attribute, ctx)}`);
	if (isVariable(value)) if (!ctx.bindings.has(value)) ctx.bindings.set(value, tripleBinding(alias, "value"));
	else {
		const binding = ctx.bindings.get(value);
		ctx.conditions.push(compileBindingEquality(tripleBinding(alias, "value"), binding));
	}
	else ctx.conditions.push(compilePatternValueCondition(alias, value, ctx));
	if (tx !== void 0) if (isVariable(tx)) if (!ctx.bindings.has(tx)) ctx.bindings.set(tx, tripleBinding(alias, "tx"));
	else {
		const binding = ctx.bindings.get(tx);
		ctx.conditions.push(compileBindingEquality(tripleBinding(alias, "tx"), binding));
	}
	else ctx.conditions.push(`${alias}.tx_id = ${formatValue(tx, ctx)}`);
	return alias;
};
/**
* Compile a predicate clause to SQL WHERE condition
*/
const compilePredicateCondition = (predicate, ctx) => {
	const [op, left, right] = predicate;
	if (op === "=" || op === "!=") {
		const equality = compileEqualityCondition(left, right, ctx);
		return op === "=" ? equality : `NOT (${equality})`;
	}
	return compileOrderedPredicateCondition(op, left, right, ctx);
};
const compilePredicate = (predicate, ctx) => {
	ctx.conditions.push(compilePredicateCondition(predicate, ctx));
};
/**
* Compile a NOT clause to SQL NOT EXISTS subquery
*/
/**
* Build conditions for a single pattern within a NOT EXISTS subquery.
* Returns conditions that constrain the given alias.
*/
const compileNotPattern = (pattern, alias, ctx, localBindings) => {
	const [entity, attribute, value] = pattern;
	if (isVariable(value) && ctx.nonIntegerProjectionVariables.has(value)) ctx.nonIntegerAliases.add(alias);
	const tx = pattern.length === 4 ? pattern[3] : void 0;
	const conditions = [`${alias}.retracted_at IS NULL`];
	if (isVariable(entity)) {
		const outerBinding = ctx.bindings.get(entity);
		const localBinding = localBindings.get(entity);
		if (localBinding) conditions.push(compileBindingEquality(tripleBinding(alias, "entity"), localBinding));
		else if (outerBinding) conditions.push(compileBindingEquality(tripleBinding(alias, "entity"), outerBinding));
		localBindings.set(entity, tripleBinding(alias, "entity"));
	} else conditions.push(`${alias}.entity_id = ${formatValue(entity, ctx)}`);
	if (isVariable(attribute)) {
		const outerBinding = ctx.bindings.get(attribute);
		const localBinding = localBindings.get(attribute);
		if (localBinding) conditions.push(compileBindingEquality(tripleBinding(alias, "attribute"), localBinding));
		else if (outerBinding) conditions.push(compileBindingEquality(tripleBinding(alias, "attribute"), outerBinding));
		localBindings.set(attribute, tripleBinding(alias, "attribute"));
	} else conditions.push(`${alias}.attribute = ${formatValue(attribute, ctx)}`);
	if (isVariable(value)) {
		const outerBinding = ctx.bindings.get(value);
		const localBinding = localBindings.get(value);
		if (localBinding) conditions.push(compileBindingEquality(tripleBinding(alias, "value"), localBinding));
		else if (outerBinding) conditions.push(compileBindingEquality(tripleBinding(alias, "value"), outerBinding));
		localBindings.set(value, tripleBinding(alias, "value"));
	} else conditions.push(compilePatternValueCondition(alias, value, ctx));
	if (tx !== void 0) if (isVariable(tx)) {
		const outerBinding = ctx.bindings.get(tx);
		const localBinding = localBindings.get(tx);
		if (localBinding) conditions.push(compileBindingEquality(tripleBinding(alias, "tx"), localBinding));
		else if (outerBinding) conditions.push(compileBindingEquality(tripleBinding(alias, "tx"), outerBinding));
		localBindings.set(tx, tripleBinding(alias, "tx"));
	} else conditions.push(`${alias}.tx_id = ${formatValue(tx, ctx)}`);
	return conditions;
};
/**
* Compile a predicate clause within a NOT EXISTS subquery.
* Predicates reference local bindings (from patterns within the same not).
*/
const compileNotPredicate = (clause, ctx, localBindings) => {
	const bindings = new Map(ctx.bindings);
	for (const [variable, binding] of localBindings) bindings.set(variable, binding);
	return compilePredicateCondition(clause, {
		...ctx,
		bindings
	});
};
const compileNotCondition = (notClause, ctx) => {
	const innerClauses = notClause.slice(1);
	const patterns = [];
	const predicates = [];
	for (const clause of innerClauses) if (isPredicateClause(clause)) predicates.push(clause);
	else patterns.push(clause);
	const localBindings = /* @__PURE__ */ new Map();
	const allConditions = [];
	const fromParts = [];
	for (const pattern of patterns) {
		const alias = nextAlias(ctx);
		fromParts.push(`triples ${alias}`);
		const conditions = compileNotPattern(pattern, alias, ctx, localBindings);
		allConditions.push(...conditions);
	}
	for (const pred of predicates) allConditions.push(compileNotPredicate(pred, ctx, localBindings));
	if (patterns.length === 0) {
		if (allConditions.length === 0) throw new Error(`Invalid not clause arity: ${JSON.stringify(notClause)}`);
		return `NOT (${allConditions.join(" AND ")})`;
	}
	return `NOT EXISTS (SELECT 1 FROM ${fromParts.join(", ")} WHERE ${allConditions.join(" AND ")})`;
};
const compileNot = (notClause, ctx) => {
	ctx.conditions.push(compileNotCondition(notClause, ctx));
};
/**
* Compile an OR clause to SQL OR conditions.
* Or alternatives are filter/existence checks and do not bind variables outward.
*/
const compileOr = (orClause, ctx) => {
	const alternatives = normalizeOrAlternatives(orClause);
	if (alternatives.length === 0) return;
	const orConditions = alternatives.map((alternative) => {
		if (isPredicateClause(alternative)) return `(${compilePredicateCondition(alternative, ctx)})`;
		if (isNotClause(alternative)) return `(${compileNotCondition(alternative, ctx)})`;
		const alias = nextAlias(ctx);
		return `(EXISTS (SELECT 1 FROM triples ${alias} WHERE ${compileNotPattern(alternative, alias, ctx, /* @__PURE__ */ new Map()).join(" AND ")}))`;
	});
	if (orConditions.length > 0) ctx.conditions.push(`(${orConditions.join(" OR ")})`);
};
/**
* Get a column expression for a variable binding (handles value coalesce and tx)
*/
const getColumnExpression = (binding) => {
	return resolveBinding(binding, { valueMode: "coalesce" });
};
/** Encode a flattened binding with its scalar family for portable COUNT DISTINCT semantics. */
const distinctCountExpression = (binding) => {
	if (!isTripleValueBinding(binding)) return resolveBinding(binding);
	const { alias } = binding;
	return `CASE
    WHEN ${numberScalarTypeCondition(alias)} THEN 'number:' || CAST(${numberScalarExpression(alias)} AS TEXT)
    WHEN ${alias}.value_type = 'boolean' THEN 'boolean:' || CAST(${alias}.value_boolean AS TEXT)
    WHEN ${alias}.value_type = 'integer' THEN 'integer:' || ${alias}.value_string
    WHEN ${textScalarTypeCondition(alias)} THEN 'text:' || ${textScalarExpression(alias)}
    ELSE NULL
  END`;
};
/**
* SQL projections use the same flattened scalar families as the public
* Datalog context. Canonicalizing here lets SELECT DISTINCT and GROUP BY
* collapse storage-level aliases such as number/datetime and string/ref.
*/
const valueProjectionExpressions = (alias, integers = false) => ({
	scalar: "NULL",
	category: `CASE WHEN ${numberScalarTypeCondition(alias)} THEN 0 ${integers ? `WHEN ${alias}.value_type = 'integer' THEN 0.5 ` : ""}WHEN ${alias}.value_type = 'boolean' THEN 1 ELSE 2 END`,
	orderNumber: numberScalarExpression(alias),
	orderText: integers ? `CASE WHEN ${textScalarTypeCondition(alias)} THEN ${textScalarExpression(alias)} ELSE NULL END` : textScalarExpression(alias),
	type: `CASE WHEN ${numberScalarTypeCondition(alias)} THEN 'number' ${integers ? `WHEN ${alias}.value_type = 'integer' THEN 'integer' ` : ""}WHEN ${alias}.value_type = 'boolean' THEN 'boolean' WHEN ${textScalarTypeCondition(alias)} THEN 'string' ELSE NULL END`,
	string: `CASE WHEN ${textScalarTypeCondition(alias)}${integers ? ` OR ${alias}.value_type = 'integer'` : ""} THEN ${textScalarExpression(alias)} ELSE NULL END`,
	number: `CASE WHEN ${numberScalarTypeCondition(alias)} THEN ${numberScalarExpression(alias)} ELSE NULL END`,
	boolean: `CASE WHEN ${alias}.value_type = 'boolean' THEN ${alias}.value_boolean ELSE NULL END`,
	...integers ? { orderInteger: `CASE WHEN ${alias}.value_type = 'integer' THEN ${integerExpression(alias)} ELSE NULL END` } : {}
});
const valueProjectionGroupExpressions = (projection) => [
	projection.category,
	projection.orderNumber,
	projection.orderText,
	projection.type,
	projection.string,
	projection.number,
	projection.boolean,
	...projection.orderInteger ? [projection.orderInteger] : []
];
const optionalProjectionExpressions = (variable, optionalProjection, ctx) => {
	if (!optionalProjection) return null;
	const projection = optionalProjection.fields.find((field) => field.variable === variable);
	if (!projection) return null;
	const rowBinding = ctx.bindings.get(optionalProjection.rowBinding);
	if (!rowBinding) return null;
	const entityExpr = resolveBinding(rowBinding, { valueMode: "string" });
	const attributeExpr = formatValue(projection.attribute, ctx);
	const select = (expression) => {
		return `(
    SELECT ${expression}
    FROM triples opt
    WHERE opt.entity_id = ${entityExpr}
      AND opt.attribute = ${attributeExpr}
      AND opt.retracted_at IS NULL
    LIMIT 1
  )`;
	};
	if (exactIntegers(ctx)) {
		const projection = valueProjectionExpressions("opt", !ctx.nonIntegerProjectionVariables.has(variable));
		return {
			scalar: "NULL",
			category: `COALESCE(${select(projection.category)}, 3)`,
			orderNumber: select(projection.orderNumber),
			orderText: select(projection.orderText),
			type: select(projection.type),
			string: select(projection.string),
			number: select(projection.number),
			boolean: select(projection.boolean),
			...projection.orderInteger ? { orderInteger: select(projection.orderInteger) } : {}
		};
	}
	return {
		scalar: "NULL",
		category: `COALESCE(${select("CASE WHEN opt.value_type IN ('number', 'datetime') THEN 0 WHEN opt.value_type = 'boolean' THEN 1 ELSE 2 END")}, 3)`,
		orderNumber: select("COALESCE(opt.value_number, opt.value_datetime)"),
		orderText: select("COALESCE(opt.value_string, opt.value_json)"),
		type: select("CASE WHEN opt.value_type IN ('number', 'datetime') THEN 'number' WHEN opt.value_type = 'boolean' THEN 'boolean' WHEN opt.value_type IN ('string', 'ref', 'blob', 'json') THEN 'string' ELSE NULL END"),
		string: select("CASE WHEN opt.value_type IN ('string', 'ref', 'blob', 'json') THEN COALESCE(opt.value_string, opt.value_json) ELSE NULL END"),
		number: select("CASE WHEN opt.value_type IN ('number', 'datetime') THEN COALESCE(opt.value_number, opt.value_datetime) ELSE NULL END"),
		boolean: select("CASE WHEN opt.value_type = 'boolean' THEN opt.value_boolean ELSE NULL END")
	};
};
/** Equality over a grouped binding must reference the exact canonical
* expressions present in GROUP BY so PostgreSQL accepts it. */
const compileGroupedBindingEquality = (left, right, ctx) => {
	if (left._tag === "Computed" || right._tag === "Computed") return compileBindingEquality(left, right);
	if (isTripleValueBinding(left) && isTripleValueBinding(right)) {
		const leftProjection = valueProjectionExpressions(left.alias, integerBinding(left.alias, ctx));
		const rightProjection = valueProjectionExpressions(right.alias, integerBinding(right.alias, ctx));
		return `((${leftProjection.type} = 'number' AND ${rightProjection.type} = 'number' AND ${leftProjection.number} = ${rightProjection.number}) OR (${leftProjection.type} = 'boolean' AND ${rightProjection.type} = 'boolean' AND ${leftProjection.boolean} = ${rightProjection.boolean}) OR (${leftProjection.type} = 'string' AND ${rightProjection.type} = 'string' AND ${leftProjection.string} = ${rightProjection.string}) OR (${leftProjection.type} = 'integer' AND ${rightProjection.type} = 'integer' AND ${leftProjection.string} = ${rightProjection.string}))`;
	}
	if (isTripleValueBinding(left)) {
		const projection = valueProjectionExpressions(left.alias, integerBinding(left.alias, ctx));
		return `(${projection.type} = 'string' AND ${projection.string} = ${resolveBinding(right)})`;
	}
	if (isTripleValueBinding(right)) {
		const projection = valueProjectionExpressions(right.alias, integerBinding(right.alias, ctx));
		return `(${projection.type} = 'string' AND ${resolveBinding(left)} = ${projection.string})`;
	}
	return `${resolveBinding(left)} = ${resolveBinding(right)}`;
};
const compileGroupedBindingConstantEquality = (binding, value, ctx) => {
	if (binding._tag === "Computed") return compileBindingConstantEquality(binding, value, ctx);
	if (!isTripleValueBinding(binding)) {
		const scalar = constantScalar(value);
		return typeof scalar === "string" ? `${resolveBinding(binding)} = ${formatValue(scalar, ctx)}` : "1 = 0";
	}
	const projection = valueProjectionExpressions(binding.alias, integerBinding(binding.alias, ctx));
	if (isTypedConstant(value) && value.type === "integer") return `(${projection.type} = 'integer' AND ${projection.string} = ${formatValue(value, ctx)})`;
	const scalar = constantScalar(value);
	if (typeof scalar === "number") return `(${projection.type} = 'number' AND ${projection.number} = ${formatValue(scalar, ctx)})`;
	if (typeof scalar === "boolean") return `(${projection.type} = 'boolean' AND ${projection.boolean} = ${formatStoredValue(scalar, ctx)})`;
	return `(${projection.type} = 'string' AND ${projection.string} = ${formatValue(scalar, ctx)})`;
};
const compileGroupedEqualityCondition = (left, right, ctx) => {
	if (isVariable(left) && isVariable(right)) {
		const leftBinding = ctx.bindings.get(left);
		const rightBinding = ctx.bindings.get(right);
		if (!leftBinding) throw new Error(`Unbound variable in HAVING: ${left}`);
		if (!rightBinding) throw new Error(`Unbound variable in HAVING: ${right}`);
		return compileGroupedBindingEquality(leftBinding, rightBinding, ctx);
	}
	if (isVariable(left)) {
		const binding = ctx.bindings.get(left);
		if (!binding) throw new Error(`Unbound variable in HAVING: ${left}`);
		return compileGroupedBindingConstantEquality(binding, right, ctx);
	}
	if (isVariable(right)) {
		const binding = ctx.bindings.get(right);
		if (!binding) throw new Error(`Unbound variable in HAVING: ${right}`);
		return compileGroupedBindingConstantEquality(binding, left, ctx);
	}
	return constantsEqual(left, right) ? "1 = 1" : "1 = 0";
};
const groupedNumericTermExpression = (term, ctx) => {
	if (!isVariable(term)) {
		if (isTypedConstant(term) && term.type === "integer") return {
			expression: `CAST(${formatValue(term, ctx)} AS DECIMAL(32, 0))`,
			integer: true
		};
		const value = constantScalar(term);
		return typeof value === "number" ? { expression: formatValue(value, ctx) } : null;
	}
	const aggregate = ctx.aggregateExpressions.get(term);
	if (aggregate !== void 0) return {
		expression: aggregate,
		...ctx.integerColumns.has(term) ? { integer: true } : {}
	};
	const binding = ctx.bindings.get(term);
	if (binding?._tag === "Computed") return {
		expression: binding.expression,
		...binding.integer ? { integer: true } : {}
	};
	if (!binding || !isTripleValueBinding(binding)) return null;
	const projection = valueProjectionExpressions(binding.alias, integerBinding(binding.alias, ctx));
	return ctx.integerVariables.has(term) && projection.orderInteger ? {
		expression: projection.orderInteger,
		typeCondition: `${projection.type} = 'integer'`,
		integer: true
	} : {
		expression: projection.number,
		typeCondition: `${projection.type} = 'number'`
	};
};
const compileGroupedOrderedCondition = (op, left, right, ctx) => {
	const leftTerm = groupedNumericTermExpression(left, ctx);
	const rightTerm = groupedNumericTermExpression(right, ctx);
	if (leftTerm === null || rightTerm === null) return "1 = 0";
	if (Boolean(leftTerm.integer) !== Boolean(rightTerm.integer)) throw new DatalogValidationError({
		query: [
			op,
			left,
			right
		],
		message: "Mixed exact integer and number comparisons require an explicit cast"
	});
	const conditions = [leftTerm.typeCondition, rightTerm.typeCondition].filter((condition) => condition !== void 0);
	conditions.push(`${leftTerm.expression} ${op} ${rightTerm.expression}`);
	return `(${conditions.join(" AND ")})`;
};
/**
* HAVING equality involving an aggregate is numeric: aggregate targets are
* numbers (or null for an empty input), and a grouped fact value must belong
* to the same numeric scalar family. Equality between group keys keeps the
* ordinary typed Datalog equality contract.
*/
const compileHavingEqualityCondition = (left, right, ctx) => {
	if (!(isVariable(left) && ctx.aggregateExpressions.has(left) || isVariable(right) && ctx.aggregateExpressions.has(right))) return compileGroupedEqualityCondition(left, right, ctx);
	const leftTerm = groupedNumericTermExpression(left, ctx);
	const rightTerm = groupedNumericTermExpression(right, ctx);
	if (leftTerm === null || rightTerm === null) return "1 = 0";
	if (Boolean(leftTerm.integer) !== Boolean(rightTerm.integer)) return "1 = 0";
	const conditions = [leftTerm.typeCondition, rightTerm.typeCondition].filter((condition) => condition !== void 0);
	conditions.push(`${leftTerm.expression} = ${rightTerm.expression}`);
	return `(${conditions.join(" AND ")})`;
};
/**
* Build the HAVING clause from having specs
*/
const buildHavingClause = (having, ctx) => {
	if (!having || having.length === 0) return "";
	return `HAVING ${having.map(([op, left, right]) => {
		if (op === ">" || op === ">=" || op === "<" || op === "<=") return compileGroupedOrderedCondition(op, left, right, ctx);
		const equality = compileHavingEqualityCondition(left, right, ctx);
		return op === "=" ? equality : `NOT (${equality})`;
	}).join(" AND ")}`;
};
/**
* Build the ORDER BY clause
*/
const buildOrderByClause = (orderBy, valueColumnMap, integerColumns = /* @__PURE__ */ new Set()) => {
	if (!orderBy || orderBy.length === 0) return "";
	return `ORDER BY ${orderBy.flatMap(({ variable, direction = "asc" }) => {
		const columns = valueColumnMap.get(variable);
		if (columns === void 0) return [`${integerColumns.has(variable) ? `CAST("${variable}" AS DECIMAL(32, 0))` : `"${variable}"`} ${direction.toUpperCase()}`];
		return [
			`"${columns.category}" ASC`,
			`"${columns.orderNumber}" ${direction.toUpperCase()}`,
			...columns.orderInteger ? [`"${columns.orderInteger}" ${direction.toUpperCase()}`] : [],
			`"${columns.boolean}" ${direction.toUpperCase()}`,
			`"${columns.orderText}" ${direction.toUpperCase()}`
		];
	}).join(", ")}`;
};
/**
* Build the LIMIT/OFFSET clause
*/
const buildLimitClause = (limit, offset, dialect = SqliteDialect) => {
	return dialect.limitOffset(limit, offset);
};
const buildSelectAndGroupBy = (find, aggregate, optionalProjection, ctx) => {
	const columnMap = /* @__PURE__ */ new Map();
	const valueColumnMap = /* @__PURE__ */ new Map();
	const numericColumns = /* @__PURE__ */ new Set();
	const constantColumns = /* @__PURE__ */ new Map();
	const selectParts = [];
	const hasAggregates = Boolean(aggregate && aggregate.length > 0);
	const aggregateTargets = /* @__PURE__ */ new Set();
	const aggregateOps = [];
	if (hasAggregates) for (const [op, sourceVar, targetVar] of aggregate) {
		aggregateTargets.add(targetVar);
		aggregateOps.push(op);
		const sourceBinding = ctx.bindings.get(sourceVar);
		if (!sourceBinding) throw new Error(`Unbound variable in aggregate: ${sourceVar}`);
		const colName = `"${targetVar}"`;
		const integerSource = ctx.integerVariables.has(sourceVar) && (isTripleValueBinding(sourceBinding) || sourceBinding._tag === "Computed");
		const numericCol = integerSource && isTripleValueBinding(sourceBinding) ? op === "min" || op === "max" ? `CAST(CASE WHEN ${sourceBinding.alias}.value_type = 'integer' THEN ${sourceBinding.alias}.value_string ELSE NULL END AS BIGINT)` : integerExpression(sourceBinding.alias) : integerSource && op === "sum" ? `CAST(${resolveBinding(sourceBinding, { valueMode: "number" })} AS DECIMAL(32, 0))` : resolveBinding(sourceBinding, { valueMode: "number" });
		if (integerSource && op === "avg") throw new DatalogValidationError({
			query: aggregate,
			message: "Exact integer AVG requires an explicit conversion to number"
		});
		if (integerSource && op !== "count") ctx.integerColumns.add(targetVar);
		let aggExpr;
		switch (op) {
			case "count":
				aggExpr = `COUNT(DISTINCT ${distinctCountExpression(sourceBinding)})`;
				break;
			case "sum":
				aggExpr = `SUM(${numericCol})`;
				break;
			case "avg":
				aggExpr = `AVG(${numericCol})`;
				break;
			case "min":
				aggExpr = `MIN(${numericCol})`;
				break;
			case "max":
				aggExpr = `MAX(${numericCol})`;
				break;
			default: throw new Error(`Unknown aggregate operator: ${op}`);
		}
		ctx.aggregateExpressions.set(targetVar, aggExpr);
		selectParts.push(`${ctx.integerColumns.has(targetVar) ? `CAST(${aggExpr} AS TEXT)` : aggExpr} AS ${colName}`);
		columnMap.set(targetVar, targetVar);
		numericColumns.add(targetVar);
	}
	for (const term of find) {
		if (isVariable(term)) {
			if (aggregateTargets.has(term)) continue;
			const binding = ctx.bindings.get(term);
			if (!binding) {
				const projection = optionalProjectionExpressions(term, optionalProjection, ctx);
				if (projection) {
					const colName = `"${term}"`;
					const index = valueColumnMap.size;
					const columns = {
						category: `_triplex_value_${index}_category`,
						orderNumber: `_triplex_value_${index}_order_number`,
						orderText: `_triplex_value_${index}_order_text`,
						type: `_triplex_value_${index}_type`,
						string: `_triplex_value_${index}_string`,
						number: `_triplex_value_${index}_number`,
						boolean: `_triplex_value_${index}_boolean`,
						...projection.orderInteger ? { orderInteger: `_triplex_value_${index}_order_integer` } : {}
					};
					selectParts.push(`${projection.scalar} AS ${colName}`);
					selectParts.push(`${projection.category} AS "${columns.category}"`);
					selectParts.push(`${projection.orderNumber} AS "${columns.orderNumber}"`);
					selectParts.push(`${projection.orderText} AS "${columns.orderText}"`);
					selectParts.push(`${projection.type} AS "${columns.type}"`);
					selectParts.push(`${projection.string} AS "${columns.string}"`);
					selectParts.push(`${projection.number} AS "${columns.number}"`);
					selectParts.push(`${projection.boolean} AS "${columns.boolean}"`);
					if (columns.orderInteger && projection.orderInteger) selectParts.push(`${projection.orderInteger} AS "${columns.orderInteger}"`);
					columnMap.set(term, term);
					valueColumnMap.set(term, columns);
				}
				continue;
			}
			const colName = `"${term}"`;
			if (isTripleValueBinding(binding)) {
				const projection = valueProjectionExpressions(binding.alias, integerBinding(binding.alias, ctx));
				const index = valueColumnMap.size;
				const columns = {
					category: `_triplex_value_${index}_category`,
					orderNumber: `_triplex_value_${index}_order_number`,
					orderText: `_triplex_value_${index}_order_text`,
					type: `_triplex_value_${index}_type`,
					string: `_triplex_value_${index}_string`,
					number: `_triplex_value_${index}_number`,
					boolean: `_triplex_value_${index}_boolean`,
					...projection.orderInteger ? { orderInteger: `_triplex_value_${index}_order_integer` } : {}
				};
				selectParts.push(`${projection.scalar} AS ${colName}`);
				selectParts.push(`${projection.category} AS "${columns.category}"`);
				selectParts.push(`${projection.orderNumber} AS "${columns.orderNumber}"`);
				selectParts.push(`${projection.orderText} AS "${columns.orderText}"`);
				selectParts.push(`${projection.type} AS "${columns.type}"`);
				selectParts.push(`${projection.string} AS "${columns.string}"`);
				selectParts.push(`${projection.number} AS "${columns.number}"`);
				selectParts.push(`${projection.boolean} AS "${columns.boolean}"`);
				if (columns.orderInteger && projection.orderInteger) selectParts.push(`${projection.orderInteger} AS "${columns.orderInteger}"`);
				valueColumnMap.set(term, columns);
			} else {
				selectParts.push(`${binding._tag === "Computed" && binding.integer ? `CAST(${getColumnExpression(binding)} AS TEXT)` : getColumnExpression(binding)} AS ${colName}`);
				if (binding._tag === "Computed") {
					numericColumns.add(term);
					if (binding.integer) ctx.integerColumns.add(term);
				}
			}
			columnMap.set(term, term);
			continue;
		}
		const colName = `_constant_${selectParts.length}`;
		selectParts.push(`${formatValue(term, ctx)} AS ${colName}`);
		columnMap.set(colName, String(term));
		constantColumns.set(colName, constantScalar(term));
	}
	let groupByClause = "";
	if (hasAggregates) {
		const groupByParts = [];
		for (const term of find) if (isVariable(term) && !aggregateTargets.has(term)) {
			const binding = ctx.bindings.get(term);
			if (binding) if (isTripleValueBinding(binding)) groupByParts.push(...valueProjectionGroupExpressions(valueProjectionExpressions(binding.alias, integerBinding(binding.alias, ctx))));
			else groupByParts.push(getColumnExpression(binding));
		}
		if (groupByParts.length > 0) groupByClause = `GROUP BY ${groupByParts.join(", ")}`;
	}
	if (selectParts.length === 0) selectParts.push(`1 AS "_dummy"`);
	return {
		columnMap,
		valueColumnMap,
		numericColumns,
		constantColumns,
		...ctx.integerColumns.size ? { integerColumns: ctx.integerColumns } : {},
		selectParts,
		groupByClause,
		hasAggregates,
		aggregateOps
	};
};
/**
* Compile a Datalog query to SQL
*
* @param query - The Datalog query to compile
* @param dialect - SQL dialect to use (defaults to SQLite)
* @param includeMetrics - Whether to include compilation metrics (for debugging)
*/
const compile = (input, dialect = SqliteDialect, includeMetrics = false, options = {}) => {
	const query = assertDatalogQuery(input);
	assertFeatures(query, dialect);
	const startTime = includeMetrics ? performance.now() : 0;
	const ctx = createContext(dialect, options);
	const { find, where, aggregate, having, orderBy, limit, offset, optionalProjection } = query;
	const { patterns, predicates, notClauses, orClauses } = classifyClauses(where, { allowRuleApplications: false });
	if (patterns.length === 0) throw new Error("Datalog query must have at least one pattern clause");
	patterns.forEach((pattern, idx) => {
		const alias = compilePattern(pattern, ctx, idx === 0);
		ctx.patternAliases.set(idx, alias);
	});
	compileComputations(query, ctx);
	for (const predicate of predicates) compilePredicate(predicate, ctx);
	for (const notClause of notClauses) compileNot(notClause, ctx);
	for (const orClause of orClauses) compileOr(orClause, ctx);
	const { columnMap, valueColumnMap, numericColumns, constantColumns, selectParts, groupByClause, hasAggregates, aggregateOps } = buildSelectAndGroupBy(find, aggregate, optionalProjection, ctx);
	const havingClause = buildHavingClause(having, ctx);
	const orderByClause = buildOrderByClause(orderBy, valueColumnMap, ctx.integerColumns);
	const limitClause = buildLimitClause(limit, offset, dialect);
	const fromTable = `triples t0`;
	const joinClause = ctx.joins.length > 0 ? ctx.joins.join("\n") : "";
	const whereClause = ctx.conditions.length > 0 ? `WHERE ${ctx.conditions.join(" AND ")}` : "";
	const sql = applyTemporalBasis([
		`SELECT DISTINCT`,
		`  ${selectParts.join(",\n  ")}`,
		`FROM ${fromTable}`,
		joinClause,
		whereClause,
		groupByClause,
		havingClause,
		orderByClause,
		limitClause
	].filter(Boolean).join("\n"), options.basis);
	const result = {
		sql,
		params: [...ctx.collector.params],
		columnMap,
		valueColumnMap,
		numericColumns,
		constantColumns,
		...ctx.integerColumns.size ? { integerColumns: ctx.integerColumns } : {}
	};
	if (includeMetrics) result.metrics = {
		joinCount: ctx.joins.length,
		whereConditionCount: ctx.conditions.length,
		subqueryCount: notClauses.length,
		cteCount: 0,
		sqlLength: sql.length,
		paramCount: ctx.collector.params.length,
		patternCount: patterns.length,
		predicateCount: predicates.length,
		notClauseCount: notClauses.length,
		orClauseCount: orClauses.length,
		hasAggregation: Boolean(hasAggregates),
		isRecursive: false,
		aggregateOps,
		compilationTimeMs: performance.now() - startTime
	};
	return result;
};
/**
* Compile and return just the SQL string (convenience function)
*/
const compileToSql = (query, dialect = SqliteDialect) => {
	return compile(query, dialect).sql;
};
/**
* Group rules by name for generating CTEs
* Multiple rules with the same name are combined with UNION (like OR semantics)
*/
const groupRulesByName = (rules) => {
	const grouped = /* @__PURE__ */ new Map();
	for (const rule of rules) {
		const existing = grouped.get(rule.name) ?? [];
		existing.push(rule);
		grouped.set(rule.name, existing);
	}
	return grouped;
};
/**
* Compile a single rule definition to SQL for a CTE
* Returns SQL that selects (arg1, arg2) based on the rule body
*/
const compileRuleDefinition = (rule, ctx) => {
	const { body } = rule;
	if (body.length === 0) throw new Error(`Rule "${rule.name}" has no body clauses`);
	let arg1Var = null;
	let arg2Var = null;
	for (const clause of body) if (!isRuleApplication(clause)) {
		const [entity, , value] = clause;
		if (isVariable(entity) && !arg1Var) arg1Var = entity;
		if (isVariable(value)) arg2Var = value;
	}
	if (!arg1Var || !arg2Var) throw new Error(`Rule "${rule.name}" must have variables for both arg1 and arg2`);
	const paramMap = /* @__PURE__ */ new Map();
	const aliasCounter = { value: 0 };
	const fromParts = [];
	const allConditions = [];
	const allJoins = [];
	const bindRuleVariable = (variable, expression, conditions) => {
		const existing = paramMap.get(variable);
		if (existing === void 0) paramMap.set(variable, expression);
		else conditions.push(`${expression} = ${existing}`);
	};
	for (let i = 0; i < body.length; i++) {
		const clause = body[i];
		const alias = `t${i}`;
		if (isRuleApplication(clause)) {
			const [ruleName, clauseArg1, clauseArg2] = clause;
			if (fromParts.length === 0) {
				fromParts.push(`${ruleReadRelation(ruleName, ctx)} r0`);
				aliasCounter.value++;
				if (isVariable(clauseArg1)) bindRuleVariable(clauseArg1, "r0.arg1", allConditions);
				if (isVariable(clauseArg2)) bindRuleVariable(clauseArg2, "r0.arg2", allConditions);
			} else {
				const joinConditions = [];
				if (isVariable(clauseArg1)) bindRuleVariable(clauseArg1, `r${aliasCounter.value}.arg1`, joinConditions);
				else joinConditions.push(`r${aliasCounter.value}.arg1 = ${formatValue(clauseArg1, ctx)}`);
				if (isVariable(clauseArg2)) bindRuleVariable(clauseArg2, `r${aliasCounter.value}.arg2`, joinConditions);
				else joinConditions.push(`r${aliasCounter.value}.arg2 = ${formatValue(clauseArg2, ctx)}`);
				allJoins.push(`JOIN ${ruleReadRelation(ruleName, ctx)} r${aliasCounter.value} ON ${joinConditions.join(" AND ")}`);
				aliasCounter.value++;
			}
		} else {
			const [entity, attribute, value] = clause;
			if (fromParts.length === 0) {
				fromParts.push(`triples ${alias}`);
				allConditions.push(`${alias}.retracted_at IS NULL`);
				if (isVariable(entity)) bindRuleVariable(entity, `${alias}.entity_id`, allConditions);
				else allConditions.push(`${alias}.entity_id = ${formatValue(entity, ctx)}`);
				if (isVariable(attribute)) bindRuleVariable(attribute, `${alias}.attribute`, allConditions);
				else allConditions.push(`${alias}.attribute = ${formatValue(attribute, ctx)}`);
				if (isVariable(value)) {
					allConditions.push(textScalarTypeCondition(alias));
					bindRuleVariable(value, textScalarExpression(alias), allConditions);
				} else allConditions.push(compilePatternValueCondition(alias, value, ctx));
			} else {
				const joinConditions = [`${alias}.retracted_at IS NULL`];
				if (isVariable(entity)) bindRuleVariable(entity, `${alias}.entity_id`, joinConditions);
				else joinConditions.push(`${alias}.entity_id = ${formatValue(entity, ctx)}`);
				if (isVariable(attribute)) bindRuleVariable(attribute, `${alias}.attribute`, joinConditions);
				else joinConditions.push(`${alias}.attribute = ${formatValue(attribute, ctx)}`);
				if (isVariable(value)) {
					joinConditions.push(textScalarTypeCondition(alias));
					bindRuleVariable(value, textScalarExpression(alias), joinConditions);
				} else joinConditions.push(compilePatternValueCondition(alias, value, ctx));
				allJoins.push(`JOIN triples ${alias} ON ${joinConditions.join(" AND ")}`);
			}
		}
	}
	return [
		`SELECT DISTINCT ${paramMap.get(arg1Var) ?? "NULL"} AS arg1, ${paramMap.get(arg2Var) ?? "NULL"} AS arg2`,
		`FROM ${fromParts[0]}`,
		allJoins.length > 0 ? allJoins.join("\n") : "",
		allConditions.length > 0 ? `WHERE ${allConditions.join(" AND ")}` : ""
	].filter(Boolean).join("\n");
};
/**
* Compile a recursive CTE for a rule
* Combines base case and recursive case with UNION
*
* For ancestor rules like:
*   ancestor(X, Y) :- X :parent Y.          (base case)
*   ancestor(X, Y) :- X :parent Z, ancestor(Z, Y).  (recursive case)
*
* The CTE structure is:
*   WITH RECURSIVE ancestor(arg1, arg2, depth) AS (
*     -- Base: direct parent relationship
*     SELECT entity_id, COALESCE(value_string, value_json), 0 FROM triples
*     WHERE attribute = ':parent' AND value_type IN ('string', 'ref', 'blob', 'json')
*     UNION ALL
*     -- Recursive: extend through another parent edge
*     SELECT t.entity_id, a.arg2, a.depth + 1
*     FROM triples t
*     JOIN ancestor a ON COALESCE(t.value_string, t.value_json) = a.arg1
*     WHERE t.attribute = ':parent' AND a.depth < maxDepth
*   )
*/
const ruleReadRelation = (name, ctx) => ctx.recursiveExecution === "depth-set" ? `(SELECT DISTINCT arg1, arg2 FROM ${ruleIdentifier(name)})` : ruleIdentifier(name);
const compileRecursiveCTE = (ruleName, rules, ctx) => {
	const keyed = ctx.recursiveExecution === "keyed-set";
	if (keyed && ctx.collector.dialect.keyedRecursion !== true) throw new Error("Keyed recursion requires an explicit native dialect capability");
	const union = ctx.recursiveExecution === void 0 ? "UNION ALL" : "UNION";
	const baseCases = [];
	const recursiveCases = [];
	for (const rule of rules) if (rule.body.some((clause) => isRuleApplication(clause) && clause[0] === ruleName)) recursiveCases.push(rule);
	else baseCases.push(rule);
	if (baseCases.length === 0) throw new Error(`Rule "${ruleName}" has no base case (non-recursive definition)`);
	for (const rule of rules) if (rule.maxDepth !== void 0 && (!Number.isSafeInteger(rule.maxDepth) || rule.maxDepth < 1)) throw new Error(`Rule "${ruleName}" maxDepth must be a positive safe integer`);
	const maxDepth = Math.max(...rules.map((r) => r.maxDepth ?? 100));
	const baseUnion = baseCases.map((rule) => compileRuleDefinition(rule, ctx)).join(`\n${union}\n`);
	if (recursiveCases.length === 0) return `${ruleIdentifier(ruleName)} AS (\n${baseUnion}\n)`;
	const recursiveMembers = [];
	for (const rule of recursiveCases) {
		const patternClauses = rule.body.filter((c) => !isRuleApplication(c));
		const ruleApps = rule.body.filter((c) => isRuleApplication(c));
		if (patternClauses.length === 0 || ruleApps.length === 0) throw new Error(`Recursive rule "${ruleName}" must have both pattern and recursive call`);
		const pattern = patternClauses[0];
		const [, ruleArg1] = ruleApps[0];
		const [entity, attribute, value] = pattern;
		const conditions = [
			`t.retracted_at IS NULL`,
			textScalarTypeCondition("t"),
			`r.depth < ${ctx.collector.add(maxDepth)}`
		];
		if (!isVariable(attribute)) conditions.push(`t.attribute = ${formatValue(attribute, ctx)}`);
		let joinCondition = "1=1";
		if (isVariable(value) && isVariable(ruleArg1) && value === ruleArg1) joinCondition = `${textScalarExpression("t")} = r.arg1`;
		else if (isVariable(entity) && isVariable(ruleArg1) && entity === ruleArg1) joinCondition = "t.entity_id = r.arg1";
		const selectArg1 = "t.entity_id";
		const selectArg2 = "r.arg2";
		const recursiveSql = `SELECT ${selectArg1} AS arg1, ${selectArg2} AS arg2, r.depth + 1 AS depth
FROM triples t
JOIN ${ruleIdentifier(ruleName)} r ON ${joinCondition}
WHERE ${conditions.join(" AND ")}${keyed ? ` AND NOT EXISTS (SELECT 1 FROM recurring.${ruleIdentifier(ruleName)} seen WHERE seen.arg1 IS NOT DISTINCT FROM ${selectArg1} AND seen.arg2 IS NOT DISTINCT FROM ${selectArg2})` : ""}`;
		recursiveMembers.push(recursiveSql);
	}
	return `${ruleIdentifier(ruleName)}(arg1, arg2, depth)${keyed ? " USING KEY (arg1, arg2)" : ""} AS (
  -- Base case
  SELECT arg1, arg2, 0 AS depth FROM (
    ${baseUnion.split("\n").join("\n    ")}
  )
  ${union}
  -- Recursive case
  ${recursiveMembers.join(`\n  ${union}\n  `)}
)`;
};
const resolveRuleIdentityBinding = (binding) => isTripleValueBinding(binding) ? {
	expression: textScalarExpression(binding.alias),
	condition: textScalarTypeCondition(binding.alias)
} : { expression: resolveBinding(binding) };
const compileRuleApplicationInWhere = (ruleApp, ctx) => {
	const [ruleName, arg1, arg2] = ruleApp;
	const ruleAlias = `rule_ref_${ctx.aliasCounter++}`;
	const joinConditions = [];
	if (isVariable(arg1)) {
		const binding = ctx.bindings.get(arg1);
		if (binding) {
			const resolved = resolveRuleIdentityBinding(binding);
			if (resolved.condition) joinConditions.push(resolved.condition);
			joinConditions.push(`${ruleAlias}.arg1 = ${resolved.expression}`);
		} else ctx.bindings.set(arg1, ruleBinding(ruleAlias, "arg1"));
	} else joinConditions.push(`${ruleAlias}.arg1 = ${formatValue(arg1, ctx)}`);
	if (isVariable(arg2)) {
		const binding = ctx.bindings.get(arg2);
		if (binding) {
			const resolved = resolveRuleIdentityBinding(binding);
			if (resolved.condition) joinConditions.push(resolved.condition);
			joinConditions.push(`${ruleAlias}.arg2 = ${resolved.expression}`);
		} else ctx.bindings.set(arg2, ruleBinding(ruleAlias, "arg2"));
	} else joinConditions.push(`${ruleAlias}.arg2 = ${formatValue(arg2, ctx)}`);
	const joinCondition = joinConditions.length > 0 ? joinConditions.join(" AND ") : "1=1";
	ctx.joins.push(`JOIN ${ruleReadRelation(ruleName, ctx)} ${ruleAlias} ON ${joinCondition}`);
	return {
		ruleName,
		alias: ruleAlias,
		joinCondition
	};
};
/**
* Compile a Datalog query with recursive rules to SQL using CTEs
*/
const compileWithRules = (input, dialect = SqliteDialect, includeMetrics = false, options = {}) => {
	const query = assertDatalogQuery(input);
	assertFeatures(query, dialect);
	const { rules } = query;
	if (!rules || rules.length === 0) return compile(query, dialect, includeMetrics, options);
	const startTime = includeMetrics ? performance.now() : 0;
	const ctx = createContext(dialect, options);
	const { find, where, aggregate, having, orderBy, limit, offset } = query;
	const groupedRules = groupRulesByName(rules);
	const ctes = [];
	for (const [ruleName, ruleList] of groupedRules) ctes.push(compileRecursiveCTE(ruleName, ruleList, ctx));
	const { patterns, predicates, notClauses, orClauses, ruleApplications } = classifyClauses(where, { allowRuleApplications: true });
	if (patterns.length === 0 && ruleApplications.length === 0) throw new Error("Datalog query must have at least one pattern clause or rule application");
	patterns.forEach((pattern, idx) => {
		const alias = compilePattern(pattern, ctx, idx === 0);
		ctx.patternAliases.set(idx, alias);
	});
	const compiledRuleApplications = ruleApplications.map((ruleApp) => compileRuleApplicationInWhere(ruleApp, ctx));
	compileComputations(query, ctx);
	for (const predicate of predicates) compilePredicate(predicate, ctx);
	for (const notClause of notClauses) compileNot(notClause, ctx);
	for (const orClause of orClauses) compileOr(orClause, ctx);
	const { columnMap, valueColumnMap, numericColumns, constantColumns, selectParts, groupByClause, hasAggregates, aggregateOps } = buildSelectAndGroupBy(find, aggregate, query.optionalProjection, ctx);
	const havingClause = buildHavingClause(having, ctx);
	const orderByClause = buildOrderByClause(orderBy, valueColumnMap, ctx.integerColumns);
	const limitClause = buildLimitClause(limit, offset, dialect);
	const cteClause = ctes.length > 0 ? `WITH RECURSIVE\n${ctes.join(",\n")}\n` : "";
	let fromTable;
	if (patterns.length === 0 && ruleApplications.length > 0) {
		const firstRule = compiledRuleApplications[0];
		fromTable = `${ruleReadRelation(firstRule.ruleName, ctx)} ${firstRule.alias}`;
		if (ctx.joins.length > 0) {
			ctx.joins.shift();
			if (firstRule.joinCondition !== "1=1") ctx.conditions.push(firstRule.joinCondition);
		}
	} else fromTable = `triples t0`;
	const joinClause = ctx.joins.length > 0 ? ctx.joins.join("\n") : "";
	const whereClause = ctx.conditions.length > 0 ? `WHERE ${ctx.conditions.join(" AND ")}` : "";
	const sql = applyTemporalBasis([
		cteClause + `SELECT DISTINCT`,
		`  ${selectParts.join(",\n  ")}`,
		`FROM ${fromTable}`,
		joinClause,
		whereClause,
		groupByClause,
		havingClause,
		orderByClause,
		limitClause
	].filter(Boolean).join("\n"), options.basis);
	const result = {
		sql,
		params: [...ctx.collector.params],
		columnMap,
		valueColumnMap,
		numericColumns,
		constantColumns,
		...ctx.integerColumns.size ? { integerColumns: ctx.integerColumns } : {}
	};
	if (includeMetrics) result.metrics = {
		joinCount: ctx.joins.length,
		whereConditionCount: ctx.conditions.length,
		subqueryCount: notClauses.length,
		cteCount: ctes.length,
		sqlLength: sql.length,
		paramCount: ctx.collector.params.length,
		patternCount: patterns.length,
		predicateCount: predicates.length,
		notClauseCount: notClauses.length,
		orClauseCount: orClauses.length,
		hasAggregation: Boolean(hasAggregates),
		isRecursive: true,
		aggregateOps,
		compilationTimeMs: performance.now() - startTime
	};
	return result;
};
/**
* Compile a query with rules and return just the SQL string
*/
const compileWithRulesToSql = (query, dialect = SqliteDialect) => {
	return compileWithRules(query, dialect).sql;
};
//#endregion
export { classifyClauses, compile, compileToSql, compileWithRules, compileWithRulesToSql, isValueLikeBinding, parseClause, resolveBinding, ruleBinding, tripleBinding };

//# sourceMappingURL=compiler.js.map
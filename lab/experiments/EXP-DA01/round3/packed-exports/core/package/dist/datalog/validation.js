import { DatalogValidationError, UnboundVariableError } from "../errors/index.js";
import { DatalogQuery, WrappedQuery, isNotClause, isOrClause, isPatternClause, isPredicateClause, isRuleApplication, isTypedConstant, isVariable, normalizeOrAlternatives } from "./schema.js";
import { Effect, Result, Schema } from "effect";
//#region src/datalog/validation.ts
const invalid = (query, message, cause) => {
	throw new DatalogValidationError({
		message,
		query,
		...cause === void 0 ? {} : { cause }
	});
};
const unbound = (variable, clause) => {
	throw new UnboundVariableError({
		variable,
		clause,
		message: `Datalog variable ${variable} is not bound by a positive relation`
	});
};
const decodeQuery = (input) => {
	const decoded = Schema.decodeUnknownResult(DatalogQuery)(input);
	if (Result.isFailure(decoded)) return invalid(input, `Invalid Datalog query shape: ${decoded.failure.message}`, decoded.failure);
	return decoded.success;
};
const variablesInPattern = (pattern) => pattern.filter(isVariable);
const requireBoundTerms = (clause, bindings) => {
	for (const term of clause.slice(1)) if (isVariable(term) && !bindings.has(term)) unbound(term, clause);
};
const orderedPredicateOps = new Set([
	">",
	">=",
	"<",
	"<="
]);
const validatePredicate = (clause, bindings, numericBindings, query) => {
	requireBoundTerms(clause, bindings);
	if (!orderedPredicateOps.has(clause[0])) return;
	for (const term of clause.slice(1)) {
		if (isVariable(term)) {
			if (!numericBindings.has(term)) invalid(query, `Ordered Datalog predicate variable ${term} must be bound from a value`);
			continue;
		}
		if (typeof (isTypedConstant(term) ? term.value : term) !== "number" && !(isTypedConstant(term) && term.type === "integer")) invalid(query, "Ordered Datalog predicate constants must be numeric");
	}
};
const validateAggregateEquality = (clause, aggregateTargets, numericBindings, query) => {
	if (orderedPredicateOps.has(clause[0])) return;
	const [, left, right] = clause;
	const leftIsAggregate = isVariable(left) && aggregateTargets.has(left);
	const rightIsAggregate = isVariable(right) && aggregateTargets.has(right);
	if (!leftIsAggregate && !rightIsAggregate) return;
	const requireNumeric = (term) => {
		if (isVariable(term)) {
			if (!numericBindings.has(term)) invalid(query, `Datalog aggregate equality operand ${term} must be numeric`);
			return;
		}
		if (typeof (isTypedConstant(term) ? term.value : term) !== "number" && !(isTypedConstant(term) && term.type === "integer")) invalid(query, "Datalog aggregate equality constants must be numeric");
	};
	if (leftIsAggregate) requireNumeric(right);
	if (rightIsAggregate) requireNumeric(left);
};
const validateNot = (clause, outerBindings, outerNumericBindings, query) => {
	const localBindings = new Set(outerBindings);
	const localNumericBindings = new Set(outerNumericBindings);
	const inner = clause.slice(1);
	for (const candidate of inner) if (isPatternClause(candidate)) {
		for (const variable of variablesInPattern(candidate)) localBindings.add(variable);
		const value = candidate[2];
		if (isVariable(value)) localNumericBindings.add(value);
	}
	for (const candidate of inner) if (isPredicateClause(candidate)) validatePredicate(candidate, localBindings, localNumericBindings, query);
};
const validateRules = (query) => {
	const definitions = /* @__PURE__ */ new Map();
	for (const rule of query.rules ?? []) {
		const group = definitions.get(rule.name) ?? [];
		group.push(rule);
		definitions.set(rule.name, group);
	}
	for (const [name, rules] of definitions) {
		if (rules.some((rule) => rule.body.length === 0)) invalid(query, `Datalog rule ${name} must have a non-empty body`);
		if (!rules.some((rule) => !rule.body.some(isRuleApplication))) invalid(query, `Datalog rule ${name} must have a non-recursive base definition`);
		for (const rule of rules) {
			const patterns = rule.body.filter((clause) => !isRuleApplication(clause));
			const applications = rule.body.filter(isRuleApplication);
			if (patterns.some((pattern) => pattern.length !== 3)) invalid(query, `Datalog rule ${name} cannot bind transaction ids in rule bodies`);
			const firstPattern = patterns[0];
			const lastPattern = patterns.at(-1);
			if (firstPattern === void 0 || lastPattern === void 0 || !isVariable(firstPattern[0]) || !isVariable(lastPattern[2])) invalid(query, `Datalog rule ${name} must derive its two outputs from the first entity and last value variables`);
			for (const clause of rule.body) if (isRuleApplication(clause) && clause[0] !== name) invalid(query, `Datalog rule ${name} calls ${clause[0]}; cross-rule composition is not supported`);
			if (applications.length > 0) {
				const pattern = patterns[0];
				const application = applications[0];
				if (rule.body.length !== 2 || patterns.length !== 1 || applications.length !== 1 || rule.body[0] !== pattern || rule.body[1] !== application || !isVariable(pattern[0]) || !isVariable(pattern[2]) || !isVariable(application[1]) || !isVariable(application[2]) || pattern[2] !== application[1]) invalid(query, `Recursive Datalog rule ${name} must be [head, attribute, next] followed by [${name}, next, tail]`);
			}
		}
	}
	return new Set(definitions.keys());
};
const validateSemantics = (query) => {
	const ruleNames = validateRules(query);
	const positiveBindings = /* @__PURE__ */ new Set();
	const numericBindings = /* @__PURE__ */ new Set();
	let hasPositiveRelation = false;
	for (const clause of query.where) if (isPatternClause(clause)) {
		hasPositiveRelation = true;
		for (const variable of variablesInPattern(clause)) positiveBindings.add(variable);
		if (isVariable(clause[2])) numericBindings.add(clause[2]);
	} else if (isRuleApplication(clause)) {
		hasPositiveRelation = true;
		if (!ruleNames.has(clause[0])) invalid(query, `Datalog rule application ${clause[0]} has no definition`);
		if (isVariable(clause[1])) positiveBindings.add(clause[1]);
		if (isVariable(clause[2])) positiveBindings.add(clause[2]);
	}
	const computedTargets = /* @__PURE__ */ new Set();
	if ((query.compute?.length ?? 0) > 8) invalid(query, "Datalog supports at most eight computed bindings per query");
	for (const computation of query.compute ?? []) {
		const target = computation[3];
		if (positiveBindings.has(target) || computedTargets.has(target)) invalid(query, `Computed target ${target} shadows another binding`);
		computedTargets.add(target);
	}
	const pendingComputations = [...query.compute ?? []];
	while (pendingComputations.length) {
		const index = pendingComputations.findIndex(([, left, right]) => [left, right].every((term) => !isVariable(term) || positiveBindings.has(term)));
		if (index < 0) invalid(query, "Computed bindings contain an unbound dependency or a dependency cycle");
		const [, left, right, target] = pendingComputations.splice(index, 1)[0];
		for (const term of [left, right]) if (isVariable(term)) {
			if (!numericBindings.has(term)) invalid(query, `Computed operand ${term} must be a numeric value binding`);
		} else if (typeof term !== "number" && !(isTypedConstant(term) && term.type === "integer")) invalid(query, "Computed operands must be numbers or exact integers");
		positiveBindings.add(target);
		numericBindings.add(target);
	}
	if (!hasPositiveRelation) invalid(query, "Datalog query must contain a positive pattern or rule application");
	for (const clause of query.where) if (isPredicateClause(clause)) validatePredicate(clause, positiveBindings, numericBindings, query);
	else if (isNotClause(clause)) validateNot(clause, positiveBindings, numericBindings, query);
	else if (isOrClause(clause)) {
		const alternatives = normalizeOrAlternatives(clause);
		if (alternatives.length === 0) invalid(query, "Datalog or clauses must contain at least one alternative");
		for (const alternative of alternatives) if (isPredicateClause(alternative)) validatePredicate(alternative, positiveBindings, numericBindings, query);
		else if (isNotClause(alternative)) validateNot(alternative, positiveBindings, numericBindings, query);
	}
	const aggregateSources = /* @__PURE__ */ new Set();
	const aggregateTargets = /* @__PURE__ */ new Set();
	for (const aggregate of query.aggregate ?? []) {
		const [, source, target] = aggregate;
		if (!positiveBindings.has(source)) unbound(source, aggregate);
		if (aggregateTargets.has(target)) invalid(query, `Datalog aggregate target ${target} is declared more than once`);
		if (positiveBindings.has(target)) invalid(query, `Datalog aggregate target ${target} shadows a positive binding`);
		if (!query.find.includes(target)) invalid(query, `Datalog aggregate target ${target} must appear in find`);
		aggregateSources.add(source);
		aggregateTargets.add(target);
	}
	const optionalTargets = /* @__PURE__ */ new Set();
	if (query.optionalProjection) {
		const { rowBinding, fields } = query.optionalProjection;
		if (!positiveBindings.has(rowBinding)) unbound(rowBinding, query.optionalProjection);
		for (const field of fields) {
			if (optionalTargets.has(field.variable)) invalid(query, `Optional projection target ${field.variable} is declared more than once`);
			if (positiveBindings.has(field.variable) || aggregateTargets.has(field.variable)) invalid(query, `Optional projection target ${field.variable} shadows another binding`);
			if (!query.find.includes(field.variable)) invalid(query, `Optional projection target ${field.variable} must appear in find`);
			optionalTargets.add(field.variable);
			numericBindings.add(field.variable);
		}
	}
	const resultBindings = /* @__PURE__ */ new Set();
	for (const term of query.find) {
		if (!isVariable(term)) continue;
		if (resultBindings.has(term)) invalid(query, `Datalog find variable ${term} is projected more than once`);
		if (aggregateSources.has(term)) invalid(query, `Datalog aggregate source ${term} cannot also appear in find`);
		if (!positiveBindings.has(term) && !aggregateTargets.has(term) && !optionalTargets.has(term)) unbound(term, { find: query.find });
		resultBindings.add(term);
	}
	if ((query.having?.length ?? 0) > 0 && aggregateTargets.size === 0) invalid(query, "Datalog having requires at least one aggregate");
	const numericResults = new Set([...resultBindings].filter((binding) => numericBindings.has(binding) || aggregateTargets.has(binding)));
	for (const clause of query.having ?? []) {
		for (const term of clause.slice(1)) if (isVariable(term) && optionalTargets.has(term)) invalid(query, `Datalog having cannot reference optional projection target ${term}`);
		validatePredicate(clause, resultBindings, numericResults, query);
		validateAggregateEquality(clause, aggregateTargets, numericResults, query);
	}
	for (const order of query.orderBy ?? []) if (!resultBindings.has(order.variable)) unbound(order.variable, order);
};
/** Decode and validate a query before selecting a backend execution strategy. */
const assertDatalogQuery = (input) => {
	const query = decodeQuery(input);
	validateSemantics(query);
	return query;
};
/** Effect form of {@link assertDatalogQuery} for public service boundaries. */
const validateDatalogQuery = (input) => Effect.try({
	try: () => assertDatalogQuery(input),
	catch: (cause) => cause instanceof DatalogValidationError || cause instanceof UnboundVariableError ? cause : new DatalogValidationError({
		message: `Datalog query validation failed: ${String(cause)}`,
		query: input,
		cause
	})
});
/** Validate wrapper shape and ensure filters/order reference projected inner columns. */
const assertWrappedQuery = (input) => {
	const decoded = Schema.decodeUnknownResult(WrappedQuery)(input);
	if (Result.isFailure(decoded)) return invalid(input, `Invalid wrapped Datalog query shape: ${decoded.failure.message}`, decoded.failure);
	const wrapped = decoded.success;
	const inner = assertDatalogQuery(wrapped.inner);
	const projected = new Set(inner.find.filter(isVariable));
	const numericResults = new Set([...inner.aggregate?.map(([, , target]) => target) ?? [], ...inner.compute?.map(([, , , target]) => target) ?? []]);
	for (const filter of wrapped.filters ?? []) {
		if (!projected.has(filter.column)) unbound(filter.column, filter);
		const isNullCheck = filter.op === "is-null" || filter.op === "is-not-null";
		const value = isTypedConstant(filter.value) ? filter.value.value : filter.value;
		if (isNullCheck && filter.value !== void 0) invalid(input, `Wrapper filter ${filter.op} must not include a value`);
		if (!isNullCheck && filter.value === void 0) invalid(input, `Wrapper filter ${filter.op} requires a value`);
		if ((filter.op === "like" || filter.op === "not-like" || filter.op === "ilike" || filter.op === "not-ilike") && typeof value !== "string") invalid(input, `Wrapper filter ${filter.op} requires a string value`);
		if ((filter.op === ">" || filter.op === ">=" || filter.op === "<" || filter.op === "<=") && typeof value !== "number" && typeof value !== "string") invalid(input, `Wrapper filter ${filter.op} requires a number or string value`);
		if (numericResults.has(filter.column) && !isNullCheck && typeof value !== "number" && !(isTypedConstant(filter.value) && filter.value.type === "integer")) invalid(input, `Wrapper filter on numeric result ${filter.column} requires a numeric value`);
	}
	for (const order of wrapped.orderBy ?? []) if (!projected.has(order.variable)) unbound(order.variable, order);
	return {
		...wrapped,
		inner
	};
};
const validateWrappedQuery = (input) => Effect.try({
	try: () => assertWrappedQuery(input),
	catch: (cause) => cause instanceof DatalogValidationError || cause instanceof UnboundVariableError ? cause : new DatalogValidationError({
		message: `Wrapped Datalog query validation failed: ${String(cause)}`,
		query: input,
		cause
	})
});
//#endregion
export { assertDatalogQuery, assertWrappedQuery, validateDatalogQuery, validateWrappedQuery };

//# sourceMappingURL=validation.js.map
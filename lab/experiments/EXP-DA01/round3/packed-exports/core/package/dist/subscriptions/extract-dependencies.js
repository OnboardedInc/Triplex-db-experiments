import { isNotClause, isOrClause, isPatternClause, isPredicateClause, isRuleApplication, isVariable, normalizeOrAlternatives } from "../datalog/schema.js";
//#region src/subscriptions/extract-dependencies.ts
/**
* Extract Dependencies from Datalog Queries
*
* Statically analyzes a Datalog query to extract what it reads,
* enabling efficient invalidation checks without re-running queries.
*/
/**
* Extract the entity type from an attribute.
*
* @example
* extractEntityType(":employee/name") // "employee"
* extractEntityType(":department/budget") // "department"
* extractEntityType(":_link/type") // "_link"
* extractEntityType("invalid") // null
*/
function extractEntityType(attribute) {
	if (!attribute.startsWith(":")) return null;
	const withoutColon = attribute.slice(1);
	const slashIndex = withoutColon.indexOf("/");
	if (slashIndex === -1) return null;
	return withoutColon.slice(0, slashIndex);
}
/**
* Check if a term is a constant string (not a variable, not a number/boolean/object).
*/
function isConstantString(term) {
	return typeof term === "string" && !isVariable(term);
}
/**
* Check if a term is an attribute (starts with :).
*/
function isAttribute(term) {
	return typeof term === "string" && term.startsWith(":");
}
/**
* Infer the entity type from an entity ID using common naming conventions.
* e.g., "emp:alice" → "employee" (prefix "emp"), "dept:eng" → "department" (prefix "dept")
*
* This uses heuristics and won't always be accurate, but provides a reasonable
* default for entity ID → type mapping.
*/
function inferEntityTypeFromId(entityId) {
	const colonIndex = entityId.indexOf(":");
	if (colonIndex > 0) return entityId.slice(0, colonIndex);
	return null;
}
/**
* Extract dependencies from a Datalog query.
*
* Processes all clause types:
* - Pattern clauses: extract attributes, entity types, bound entity IDs
* - Not clauses: recursively process inner pattern
* - Or clauses: process all patterns in the array
* - Rule applications: add the rule name and walk every matching rule body
* - Predicate clauses: ignored (they filter, don't add read dependencies)
*
* @param query The Datalog query to analyze
* @returns Dependencies describing what the query reads
*/
function extractDependencies(query) {
	const attributes = /* @__PURE__ */ new Set();
	const entityTypes = /* @__PURE__ */ new Set();
	const boundEntityIds = /* @__PURE__ */ new Set();
	const boundEntityTypes = /* @__PURE__ */ new Set();
	const unboundEntityTypes = /* @__PURE__ */ new Set();
	const ruleNames = /* @__PURE__ */ new Set();
	const expandedRules = /* @__PURE__ */ new Set();
	const rulesByName = /* @__PURE__ */ new Map();
	for (const rule of query.rules ?? []) {
		const definitions = rulesByName.get(rule.name) ?? [];
		rulesByName.set(rule.name, [...definitions, rule]);
	}
	let hasDynamicAttributes = false;
	function processClause(clause) {
		if (isPredicateClause(clause)) return;
		if (isPatternClause(clause)) processPatternClause(clause);
		else if (isNotClause(clause)) processNotClause(clause);
		else if (isOrClause(clause)) processOrClause(clause);
		else if (isRuleApplication(clause)) processRuleApplication(clause);
	}
	function processPatternClause(pattern) {
		const [entity, attr, _value] = pattern;
		if (isAttribute(attr)) {
			attributes.add(attr);
			const entityType = extractEntityType(attr);
			if (entityType) entityTypes.add(entityType);
			if (isConstantString(entity) && !isAttribute(entity)) {
				boundEntityIds.add(entity);
				if (entityType) boundEntityTypes.add(entityType);
			} else if (entityType) unboundEntityTypes.add(entityType);
		} else if (isVariable(attr)) {
			hasDynamicAttributes = true;
			if (isConstantString(entity) && !isAttribute(entity)) boundEntityIds.add(entity);
		}
	}
	function processNotClause(notClause) {
		for (const inner of notClause.slice(1)) processClause(inner);
	}
	function processOrClause(orClause) {
		for (const alternative of normalizeOrAlternatives(orClause)) processClause(alternative);
	}
	function processRuleApplication(rule) {
		const [ruleName, arg1, arg2] = rule;
		ruleNames.add(ruleName);
		if (isConstantString(arg1) && !isAttribute(arg1)) {
			boundEntityIds.add(arg1);
			const inferredType = inferEntityTypeFromId(arg1);
			if (inferredType) boundEntityTypes.add(inferredType);
		}
		if (isConstantString(arg2) && !isAttribute(arg2)) {
			boundEntityIds.add(arg2);
			const inferredType = inferEntityTypeFromId(arg2);
			if (inferredType) boundEntityTypes.add(inferredType);
		}
		if (expandedRules.has(ruleName)) return;
		expandedRules.add(ruleName);
		for (const definition of rulesByName.get(ruleName) ?? []) for (const bodyClause of definition.body) processClause(bodyClause);
	}
	for (const clause of query.where) processClause(clause);
	return {
		attributes,
		hasDynamicAttributes,
		entityTypes,
		boundEntityIds,
		boundEntityTypes,
		unboundEntityTypes,
		ruleNames
	};
}
//#endregion
export { extractDependencies, extractEntityType };

//# sourceMappingURL=extract-dependencies.js.map
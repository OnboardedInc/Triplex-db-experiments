import { isVariable } from "./types.js";
//#region src/kv/datalog/predicate.ts
/**
* Predicate clause evaluation for the KV Datalog executor.
*
* Predicates are filter operations: they don't produce new bindings,
* they just filter existing contexts based on comparison operators.
*/
/**
* Resolve a term to its concrete value in the given context.
* - Variables are looked up in the context
* - Constants are returned as-is
* Returns null if a variable is unbound.
*/
const resolveTerm = (term, context) => {
	if (isVariable(term)) return term in context ? context[term] : null;
	if (typeof term === "object" && term !== null && "type" in term) {
		const typed = term;
		if (typed.type === "ref") return typed.value;
	}
	return term;
};
/**
* Evaluate a predicate clause against a context.
*
* A PredicateClause is [op, left, right] where op is one of:
* ">", ">=", "<", "<=", "=", "!="
*
* Returns true if the predicate is satisfied, false otherwise.
* Unbound variables or type mismatches result in false (no match).
*/
const evaluatePredicate = (predicate, context) => {
	const [op, leftTerm, rightTerm] = predicate;
	const left = resolveTerm(leftTerm, context);
	const right = resolveTerm(rightTerm, context);
	if (left === null || right === null) return false;
	if (op === ">" || op === ">=" || op === "<" || op === "<=") {
		if (typeof left !== "number" || typeof right !== "number") return false;
	}
	switch (op) {
		case ">": return left > right;
		case ">=": return left >= right;
		case "<": return left < right;
		case "<=": return left <= right;
		case "=": return left === right;
		case "!=": return left !== right;
		default: return false;
	}
};
/**
* Filter a set of contexts by a predicate clause.
* Returns only contexts where the predicate is satisfied.
*/
const filterByPredicate = (predicate, contexts) => {
	return contexts.filter((ctx) => evaluatePredicate(predicate, ctx));
};
//#endregion
export { evaluatePredicate, filterByPredicate, resolveTerm };

//# sourceMappingURL=predicate.js.map
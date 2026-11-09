//#region src/kv/datalog/types.ts
/** An empty context with no bindings. */
const emptyContext = {};
/** Check if a term is a variable (string starting with ?) */
const isVariable = (term) => typeof term === "string" && term.startsWith("?");
/** Check if a term is an attribute (string starting with :) */
const isAttribute = (term) => typeof term === "string" && term.startsWith(":");
const PREDICATE_OPS = [
	">",
	">=",
	"<",
	"<=",
	"=",
	"!="
];
/** Check if a clause is a predicate clause (first element is an operator) */
const isPredicateClause = (clause) => Array.isArray(clause) && PREDICATE_OPS.includes(clause[0]);
/** Check if a clause is a not clause (first element is "not") */
const isNotClause = (clause) => Array.isArray(clause) && clause[0] === "not";
/** Check if a clause is an or clause (first element is "or") */
const isOrClause = (clause) => Array.isArray(clause) && clause[0] === "or";
/**
* Check if a clause is a rule application.
* First element is alphanumeric rule name (not "not"/"or"),
* second element is NOT an attribute (distinguishes from patterns).
*/
const isRuleApplication = (clause) => {
	if (!Array.isArray(clause) || clause.length !== 3) return false;
	const first = clause[0];
	const second = clause[1];
	if (!(typeof first === "string" && /^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(first) && !["not", "or"].includes(first))) return false;
	return !(typeof second === "string" && second.startsWith(":"));
};
/**
* Check if a clause is a pattern clause (3 or 4 tuple that isn't
* a predicate, not, or, or rule application).
*/
const isPatternClause = (clause) => {
	if (!Array.isArray(clause)) return false;
	if (clause.length < 3 || clause.length > 4) return false;
	return !isPredicateClause(clause) && !isNotClause(clause) && !isOrClause(clause) && !isRuleApplication(clause);
};
//#endregion
export { emptyContext, isAttribute, isNotClause, isOrClause, isPatternClause, isPredicateClause, isRuleApplication, isVariable };

//# sourceMappingURL=types.js.map
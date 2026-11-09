import { IntegerValue } from "../Value.js";
import { Schema } from "effect";
//#region src/datalog/schema.ts
/**
* Datalog Module
*
* Datalog is a declarative query language for graph traversal and pattern matching.
*/
/**
* Variable: a string starting with "?" followed by an identifier
* Examples: "?person", "?age", "?movieTitle"
*/
const Variable = Schema.String.pipe(Schema.check(Schema.isPattern(/^\?[a-zA-Z_][a-zA-Z0-9_]*$/)), Schema.annotate({
	identifier: "Variable",
	description: "A Datalog variable starting with ? (e.g., ?person, ?age)"
}));
/**
* DatalogAttribute: a string starting with ":" followed by an identifier
* Examples: ":name", ":age", ":movie/title"
*
* Note: Named DatalogAttribute to avoid conflict with shared/Branded.ts Attribute type.
*/
const DatalogAttribute = Schema.String.pipe(Schema.check(Schema.isPattern(/^:[a-zA-Z_][a-zA-Z0-9_/-]*$/)), Schema.annotate({
	identifier: "DatalogAttribute",
	description: "An attribute starting with : (e.g., :name, :movie/title)"
}));
/**
* TypedConstant: a constant with an explicit type (e.g. ref values)
* Matches the internal TripleValue representation { type, value }
*/
const TypedConstant = Schema.Union([Schema.Struct({
	type: Schema.Literal("ref"),
	value: Schema.String
}), IntegerValue]).annotate({
	identifier: "TypedConstant",
	description: "A typed constant value (e.g. { type: 'ref', value: 'entity:id' })"
});
/**
* Check if a value is a typed constant (object with type field)
*/
const isTypedConstant = (value) => typeof value === "object" && value !== null && "type" in value;
/**
* Constant: a literal value (string, number, boolean, or typed constant)
*/
const LiteralString = Schema.String.pipe(Schema.check(Schema.isPattern(/^(?!\?)[\s\S]*$/)), Schema.annotate({
	identifier: "DatalogLiteralString",
	description: "A string literal that does not use the reserved ? variable prefix"
}));
const Constant = Schema.Union([
	LiteralString,
	Schema.Number,
	Schema.Boolean,
	TypedConstant
]).annotate({
	identifier: "Constant",
	description: "A constant value (string, number, boolean, or typed constant like ref)"
});
/**
* Term: either a variable or a constant
*/
const Term = Schema.Union([Variable, Constant]).annotate({
	identifier: "Term",
	description: "A term that is either a variable (?x) or a constant value"
});
/**
* Entity, attribute, and transaction positions are identities. Triplex stores
* every identity as text, so these positions accept only a string literal or
* variable; typed refs belong in the value position.
*/
const IdentityTerm = Schema.Union([Variable, LiteralString]).annotate({
	identifier: "IdentityTerm",
	description: "A string identity literal or Datalog variable"
});
/**
* Predicate operators. Equality compares compatible flattened scalar families;
* ordered comparisons are numeric-only and accept number/datetime value bindings.
*/
const PredicateOp = Schema.Literals([
	">",
	">=",
	"<",
	"<=",
	"=",
	"!="
]).annotate({
	identifier: "PredicateOp",
	description: "Equality or numeric ordered-comparison operator for predicates"
});
/**
* Pattern clause: [entity, attribute, value] or [entity, attribute, value, tx]
* Used for matching triples in the database
* The optional 4th element binds to the transaction that created the triple.
*
* Examples:
* - ["?person", ":name", "Alice"]           // 3-tuple
* - ["?movie", ":director", "?director"]    // 3-tuple
* - ["?e", ":name", "?n", "?tx"]            // 4-tuple with tx binding
*/
const PatternClause3 = Schema.Tuple([
	IdentityTerm,
	IdentityTerm,
	Term
]);
const PatternClause4 = Schema.Tuple([
	IdentityTerm,
	IdentityTerm,
	Term,
	IdentityTerm
]);
const PatternClause = Schema.Union([PatternClause4, PatternClause3]).annotate({
	identifier: "PatternClause",
	description: "A pattern clause [entity, attribute, value, tx?] for matching triples"
});
/**
* Predicate clause: [operator, left, right]
* Used for filtering based on comparisons
*
* Examples:
* - [">=", "?age", 18]
* - ["!=", "?status", "inactive"]
*/
const PredicateClause = Schema.Tuple([
	PredicateOp,
	Term,
	Term
]).annotate({
	identifier: "PredicateClause",
	description: "A predicate clause [op, left, right] for filtering"
});
/**
* Inner clause within a `not` — patterns and predicates only (no nested not/or/link).
*/
const NotInnerClause = Schema.Union([PredicateClause, PatternClause]).annotate({
	identifier: "NotInnerClause",
	description: "A pattern or predicate clause inside a not"
});
/**
* Not clause: ["not", clause1] or ["not", clause1, clause2, ...]
* Used for negation - excludes results that match the clause(s).
*
* Single pattern: ["not", ["?person", ":banned", true]]
*   — excludes results where the pattern matches.
*
* Conjunctive negation: ["not", ["?task", ":task/employee", "?emp"], ["?task", ":task/type", "I-9"]]
*   — excludes results where ALL clauses match simultaneously (like NOT EXISTS with a JOIN).
*   — inner clauses can be patterns or predicates.
*/
const NotClause = Schema.Tuple([
	Schema.Literal("not"),
	NotInnerClause,
	Schema.optional(NotInnerClause),
	Schema.optional(NotInnerClause),
	Schema.optional(NotInnerClause),
	Schema.optional(NotInnerClause),
	Schema.optional(NotInnerClause),
	Schema.optional(NotInnerClause),
	Schema.optional(NotInnerClause)
]).annotate({
	identifier: "NotClause",
	description: "A negation clause [\"not\", clause, ...] to exclude matching results"
});
/**
* Alternative within an `or` — patterns, predicates, and negation only.
* `or` alternatives are filter/existence checks and do not bind variables outward.
*/
const OrAlternative = Schema.Union([
	PredicateClause,
	NotClause,
	PatternClause
]).annotate({
	identifier: "OrAlternative",
	description: "A pattern, predicate, or not clause inside an or"
});
/**
* Or clause: ["or", [alternative1, alternative2, ...]]
* Used for disjunction - matches if any alternative matches.
*
* Examples:
* - ["or", [["?person", ":name", "Alice"], ["?person", ":name", "Bob"]]]
* - ["or", [["=", "?status", "offline"], ["not", ["?step", ":output", "?out"]]]]
*/
const OrClause = Schema.Tuple([Schema.Literal("or"), Schema.Array(OrAlternative)]).annotate({
	identifier: "OrClause",
	description: "A disjunction clause [\"or\", [alternative1, alternative2, ...]]"
});
/**
* Rule application clause: [ruleName, arg1, arg2]
* Used to apply a recursive rule in the where clause
*
* The rule name must not start with ? or : to distinguish from patterns
*
* Examples:
* - ["ancestor", "alice", "?ancestor"]
* - ["connected", "?a", "?b"]
*/
const RuleApplication = Schema.Tuple([
	Schema.String.pipe(Schema.check(Schema.isPattern(/^[a-zA-Z_][a-zA-Z0-9_-]*$/)), Schema.annotate({ description: "Rule name (alphanumeric, no ? or : prefix)" })),
	IdentityTerm,
	IdentityTerm
]).annotate({
	identifier: "RuleApplication",
	description: "A rule application [ruleName, arg1, arg2] over string identities for recursive queries"
});
/**
* Clause: pattern, predicate, not, or, or rule application.
*
* We distinguish by checking the first element:
* - If it's an operator (>, >=, <, <=, =, !=), it's a predicate
* - If it's "not", it's a negation
* - If it's "or", it's a disjunction
* - If it's a plain identifier (no ? or :), it's a rule application
* - Otherwise, it's a pattern
*/
const Clause = Schema.Union([
	PredicateClause,
	NotClause,
	OrClause,
	RuleApplication,
	PatternClause
]).annotate({
	identifier: "Clause",
	description: "A clause that is a pattern, predicate, not, or, or rule application"
});
/**
* Rule body clause: can be a pattern or a rule application
*/
const RuleBodyClause = Schema.Union([PatternClause, RuleApplication]).annotate({
	identifier: "RuleBodyClause",
	description: "A clause in a rule body: pattern or rule application"
});
/**
* Rule definition for recursive queries
*
* A rule defines a derived relationship. Multiple rules with the same name
* are combined with UNION (like OR).
*
* Example - Ancestor rule (two definitions):
* ```typescript
* // Base case: direct parent
* { name: "ancestor", body: [["?x", ":parent", "?y"]] }
*
* // Recursive case: parent of ancestor
* { name: "ancestor", body: [["?x", ":parent", "?z"], ["ancestor", "?z", "?y"]] }
* ```
*/
const Rule = Schema.Struct({
	name: Schema.String.pipe(Schema.check(Schema.isPattern(/^[a-zA-Z_][a-zA-Z0-9_-]*$/), Schema.makeFilter((name) => name !== "not" && name !== "or", { expected: "a non-reserved rule name" })), Schema.annotate({ description: "Rule name" })),
	body: Schema.Array(RuleBodyClause),
	maxDepth: Schema.optional(Schema.Int.pipe(Schema.check(Schema.isGreaterThanOrEqualTo(1)), Schema.annotate({ description: "Positive safe-integer recursion depth" })))
}).annotate({
	identifier: "Rule",
	description: "A rule definition for recursive queries"
});
/**
* Aggregate operator
*/
const AggregateOp = Schema.Literals([
	"count",
	"sum",
	"avg",
	"min",
	"max"
]).annotate({
	identifier: "AggregateOp",
	description: "Aggregation operator: count, sum, avg, min, max"
});
/**
* Aggregate specification: [operator, sourceVariable, targetVariable]
*
* Examples:
* - ["count", "?person", "?count"]
*/
const AggregateSpec = Schema.Tuple([
	AggregateOp,
	Variable,
	Variable
]).annotate({
	identifier: "AggregateSpec",
	description: "An aggregation [op, source, target] like [\"count\", \"?person\", \"?count\"]"
});
/**
* Order direction for sorting results
*/
const OrderDirection = Schema.Literals(["asc", "desc"]).annotate({
	identifier: "OrderDirection",
	description: "Sort direction: ascending or descending"
});
/**
* Order by specification: { variable, direction? }
* Used for sorting query results
*
* Examples:
* - { variable: "?name" } - sort by name ascending (default)
* - { variable: "?age", direction: "desc" } - sort by age descending
*/
const OrderBySpec = Schema.Struct({
	variable: Variable,
	direction: Schema.optional(OrderDirection)
}).annotate({
	identifier: "OrderBySpec",
	description: "Sorting specification for query results"
});
/**
* Having clause: [operator, left, right]
* Used for filtering aggregated results (like SQL HAVING)
*
* Examples:
* - [">=", "?count", 5] - only include groups where count >= 5
*/
const HavingClause = Schema.Tuple([
	PredicateOp,
	Term,
	Term
]).annotate({
	identifier: "HavingClause",
	description: "A having clause for filtering aggregated results"
});
/** Computed numeric binding: [operation, left, right, target]. */
const ComputeOp = Schema.Literals([
	"+",
	"-",
	"*",
	"/",
	"%"
]);
const ComputeSpec = Schema.Tuple([
	ComputeOp,
	Term,
	Term,
	Variable
]);
/**
* DatalogQuery: the main query structure
*
* - find: array of terms to return (variables will be resolved)
* - where: array of clauses to match/filter
* - aggregate: optional array of aggregation specs
*
* Example:
* ```typescript
* {
*   find: ["?name", "?age"],
*   where: [
*     ["?person", ":name", "?name"],
*     ["?person", ":age", "?age"],
*     [">=", "?age", 18]
*   ]
* }
* ```
*
* With aggregation:
* ```typescript
* {
*   find: ["?dept", "?count"],
*   where: [
*     ["?person", ":department", "?dept"]
*   ],
*   aggregate: [
*     ["count", "?person", "?count"]
*   ]
* }
* ```
*/
const DatalogQuery = Schema.Struct({
	find: Schema.Array(Term),
	where: Schema.Array(Clause),
	compute: Schema.optional(Schema.Array(ComputeSpec)),
	aggregate: Schema.optional(Schema.Array(AggregateSpec)),
	having: Schema.optional(Schema.Array(HavingClause)),
	orderBy: Schema.optional(Schema.Array(OrderBySpec)),
	limit: Schema.optional(Schema.Number.pipe(Schema.check(Schema.isInt()), Schema.check(Schema.isGreaterThan(0)))),
	offset: Schema.optional(Schema.Number.pipe(Schema.check(Schema.isInt()), Schema.check(Schema.isGreaterThanOrEqualTo(0)))),
	rules: Schema.optional(Schema.Array(Rule)),
	optionalProjection: Schema.optional(Schema.Struct({
		rowBinding: Variable,
		fields: Schema.Array(Schema.Struct({
			attribute: DatalogAttribute,
			variable: Variable
		}))
	}))
}).annotate({
	identifier: "DatalogQuery",
	description: "A Datalog query with find, where, and optional modifiers"
});
/**
* Filter operators for wrapper filtering
* Supports text matching (LIKE), equality, and comparison
*/
const WrapperFilterOp = Schema.Literals([
	"=",
	"!=",
	">",
	">=",
	"<",
	"<=",
	"like",
	"not-like",
	"ilike",
	"not-ilike",
	"is-null",
	"is-not-null"
]).annotate({
	identifier: "WrapperFilterOp",
	description: "Filter operator for wrapper queries"
});
/**
* A filter condition applied to wrapper query results
*
* Examples:
* - { column: "?name", op: "like", value: "%Smith%" }
* - { column: "?age", op: ">=", value: 18 }
* - { column: "?status", op: "is-null" }
*/
const WrapperFilter = Schema.Struct({
	column: Variable,
	op: WrapperFilterOp,
	value: Schema.optional(Constant)
}).annotate({
	identifier: "WrapperFilter",
	description: "A filter condition applied to wrapper query results"
});
/**
* Wrapped query specification for subquery semantics
*
* Execution order:
* 1. Inner query runs with its own limit/offset
* 2. Wrapper filters are applied to inner results
* 3. Wrapper orderBy/limit/cursor paginate the filtered results
* 4. If includeCount=true, total filtered count is also returned
*
* Example with cursor pagination:
* ```typescript
* {
*   inner: {
*     find: ["?name", "?age"],
*     where: [["?p", ":name", "?name"], ["?p", ":age", "?age"]],
*     limit: 1000
*   },
*   orderBy: [{ variable: "?name", direction: "asc" }],
*   filters: [{ column: "?name", op: "ilike", value: "%smith%" }],
*   limit: 20,
*   cursor: firstPage.nextCursor, // Opaque cursor returned by queryPage
*   includeCount: true
* }
* ```
*/
const WrappedQuery = Schema.Struct({
	inner: DatalogQuery,
	filters: Schema.optional(Schema.Array(WrapperFilter)),
	orderBy: Schema.optional(Schema.Array(OrderBySpec)),
	limit: Schema.optional(Schema.Number.pipe(Schema.check(Schema.isInt()), Schema.check(Schema.isGreaterThan(0)))),
	cursor: Schema.optional(Schema.String),
	includeCount: Schema.optional(Schema.Boolean)
}).annotate({
	identifier: "WrappedQuery",
	description: "A wrapped query with subquery semantics for filtering and cursor-based pagination"
});
/**
* Response from a wrapped query execution
*/
const WrappedQueryResponse = Schema.Struct({
	results: Schema.Array(Schema.Record(Schema.String, Schema.Unknown)),
	totalCount: Schema.optional(Schema.Number),
	nextCursor: Schema.optional(Schema.String),
	decisionId: Schema.optional(Schema.String)
}).annotate({
	identifier: "WrappedQueryResponse",
	description: "Response from a wrapped query with pagination info"
});
/**
* Check if a term is a variable (starts with ?)
*/
const isVariable = (term) => typeof term === "string" && term.startsWith("?");
/**
* Check if a term is an attribute (starts with :)
*/
const isAttribute = (term) => typeof term === "string" && term.startsWith(":");
/**
* Check if a clause is a predicate clause (first element is an operator)
*/
const isPredicateClause = (clause) => {
	return Array.isArray(clause) && [
		">",
		">=",
		"<",
		"<=",
		"=",
		"!="
	].includes(clause[0]);
};
/**
* Check if a clause is a not clause (first element is "not")
*/
const isNotClause = (clause) => {
	return Array.isArray(clause) && clause[0] === "not";
};
/**
* Check if a clause is an or clause (first element is "or")
*/
const isOrClause = (clause) => {
	return Array.isArray(clause) && clause[0] === "or";
};
const normalizeOrAlternatives = (orClause) => {
	if (!Array.isArray(orClause) || orClause[0] !== "or") throw new Error(`Invalid or clause: ${JSON.stringify(orClause)}`);
	const assertAlternative = (clause) => {
		const candidate = clause;
		if (isOrClause(candidate)) throw new Error(`Nested or alternatives are not supported: ${JSON.stringify(clause)}`);
		if (!isPredicateClause(candidate) && !isNotClause(candidate) && !isPatternClause(candidate)) throw new Error(`Invalid or alternative: ${JSON.stringify(clause)}`);
		return candidate;
	};
	if (orClause.length === 2 && Array.isArray(orClause[1])) return orClause[1].map(assertAlternative);
	if (orClause.length > 2) return orClause.slice(1).map(assertAlternative);
	throw new Error(`Invalid or clause arity: ${JSON.stringify(orClause)}`);
};
/**
* Check if a clause is a rule application (first element is alphanumeric, no ? or :,
* and second element is NOT an attribute - this distinguishes from patterns)
*
* Pattern: ["p1", ":name", "Alice"] - second element is attribute (:name)
* Rule:    ["ancestor", "alice", "?x"] - second element is term (alice), not attribute
*/
const isRuleApplication = (clause) => {
	if (!Array.isArray(clause) || clause.length !== 3) return false;
	const first = clause[0];
	const second = clause[1];
	if (!(typeof first === "string" && /^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(first) && !["not", "or"].includes(first))) return false;
	return !(typeof second === "string" && second.startsWith(":"));
};
/**
* Check if a clause is a pattern clause (not a predicate, not, or, or rule application)
* Accepts both 3-tuple and 4-tuple patterns
*/
const isPatternClause = (clause) => {
	if (!Array.isArray(clause)) return false;
	if (clause.length < 3 || clause.length > 4) return false;
	return !isPredicateClause(clause) && !isNotClause(clause) && !isOrClause(clause) && !isRuleApplication(clause);
};
/**
* Check if a pattern clause is a 4-tuple (includes transaction binding)
*/
const isPattern4Tuple = (pattern) => {
	return pattern.length === 4;
};
/**
* Query compilation and execution metrics
*/
const QueryMetrics = Schema.Struct({
	joinCount: Schema.Number,
	whereConditionCount: Schema.Number,
	subqueryCount: Schema.Number,
	cteCount: Schema.Number,
	sqlLength: Schema.Number,
	paramCount: Schema.Number,
	patternCount: Schema.Number,
	predicateCount: Schema.Number,
	notClauseCount: Schema.Number,
	orClauseCount: Schema.Number,
	hasAggregation: Schema.Boolean,
	isRecursive: Schema.Boolean,
	aggregateOps: Schema.Array(Schema.String),
	compilationTimeMs: Schema.Number
});
/**
* A single step in a query plan.
* For SQL backends, this is a SQL statement.
* For DynamoDB, this might be a JSON-serialized scan/query operation.
* For any backend, it's an opaque string representation of what will execute.
*/
const QueryPlanStep = Schema.Struct({
	label: Schema.String,
	query: Schema.String,
	params: Schema.optional(Schema.Array(Schema.Unknown))
});
/**
* Backend-agnostic query plan: the compiled queries that would execute.
*/
const QueryPlan = Schema.Struct({
	backend: Schema.String,
	steps: Schema.Array(QueryPlanStep)
});
/**
* Debug information returned with query results when debug mode is enabled
*/
const QueryDebugInfo = Schema.Struct({
	metrics: QueryMetrics,
	executionTimeMs: Schema.Number,
	resultCount: Schema.Number,
	generatedSql: Schema.String,
	params: Schema.Array(Schema.Unknown),
	queryPlan: Schema.optional(QueryPlan)
});
/**
* Result of explaining a query (compile without execute).
*/
const ExplainResult = Schema.Struct({
	queryPlan: QueryPlan,
	metrics: Schema.optional(QueryMetrics)
});
/**
* Array of query result bindings (variable name -> value)
*/
const DatalogQueryResults = Schema.Array(Schema.Record(Schema.String, Schema.Unknown));
/**
* Complete Datalog query response with results and optional debug info
*/
const DatalogQueryResponse = Schema.Struct({
	results: DatalogQueryResults,
	debug: Schema.optional(QueryDebugInfo),
	decisionId: Schema.optional(Schema.String)
});
/**
* A single diagnostic from the type checker.
*/
const TypeCheckDiagnosticSchema = Schema.Struct({
	severity: Schema.Literals([
		"error",
		"warning",
		"info"
	]),
	message: Schema.String,
	clauseIndex: Schema.optional(Schema.Number),
	variable: Schema.optional(Schema.String),
	attribute: Schema.optional(Schema.String)
});
/**
* Response from the type-check endpoint.
*
* Contains inferred variable types, the computed result type,
* diagnostics (errors/warnings), and a convenience hasErrors flag.
*/
const TypeCheckResponse = Schema.Struct({
	variableTypes: Schema.Record(Schema.String, Schema.String),
	resultType: Schema.String,
	diagnostics: Schema.Array(TypeCheckDiagnosticSchema),
	hasErrors: Schema.Boolean
});
//#endregion
export { AggregateOp, AggregateSpec, Clause, ComputeOp, ComputeSpec, Constant, DatalogAttribute, DatalogQuery, DatalogQueryResponse, DatalogQueryResults, ExplainResult, HavingClause, NotClause, OrAlternative, OrClause, OrderBySpec, OrderDirection, PatternClause, PatternClause3, PatternClause4, PredicateClause, PredicateOp, QueryDebugInfo, QueryMetrics, QueryPlan, QueryPlanStep, Rule, RuleApplication, RuleBodyClause, Term, TypeCheckDiagnosticSchema, TypeCheckResponse, TypedConstant, Variable, WrappedQuery, WrappedQueryResponse, WrapperFilter, WrapperFilterOp, isAttribute, isNotClause, isOrClause, isPattern4Tuple, isPatternClause, isPredicateClause, isRuleApplication, isTypedConstant, isVariable, normalizeOrAlternatives };

//# sourceMappingURL=schema.js.map
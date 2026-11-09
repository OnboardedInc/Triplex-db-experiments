import { AggregateOp, AggregateSpec, Clause, Constant, DatalogQuery, HavingClause, NotClause, OrAlternative, OrClause, OrderBySpec, PatternClause, PredicateClause, Rule, RuleApplication, Term, Variable, WrappedQuery, WrapperFilter } from "../../datalog/schema.js";

//#region src/kv/datalog/types.d.ts
/**
 * A Context maps variable names to their bound values.
 * This is the fundamental unit of intermediate results in the executor.
 *
 * Example: { "?person": "emp:alice", "?name": "Alice", "?age": 30 }
 */
interface Context {
  readonly [variable: string]: Constant | null;
}
/** An empty context with no bindings. */
declare const emptyContext: Context;
/** An array of contexts representing a relation (like a table of rows). */
type Relation = readonly Context[];
/** Check if a term is a variable (string starting with ?) */
declare const isVariable: (term: unknown) => term is string;
/** Check if a term is an attribute (string starting with :) */
declare const isAttribute: (term: unknown) => term is string;
/** Check if a clause is a predicate clause (first element is an operator) */
declare const isPredicateClause: (clause: Clause) => clause is PredicateClause;
/** Check if a clause is a not clause (first element is "not") */
declare const isNotClause: (clause: Clause) => clause is NotClause;
/** Check if a clause is an or clause (first element is "or") */
declare const isOrClause: (clause: Clause) => clause is OrClause;
/**
 * Check if a clause is a rule application.
 * First element is alphanumeric rule name (not "not"/"or"),
 * second element is NOT an attribute (distinguishes from patterns).
 */
declare const isRuleApplication: (clause: Clause) => clause is RuleApplication;
/**
 * Check if a clause is a pattern clause (3 or 4 tuple that isn't
 * a predicate, not, or, or rule application).
 */
declare const isPatternClause: (clause: Clause) => clause is PatternClause;
//#endregion
export { type AggregateOp, type AggregateSpec, type Clause, type Constant, Context, type DatalogQuery, type HavingClause, type NotClause, type OrAlternative, type OrClause, type OrderBySpec, type PatternClause, type PredicateClause, Relation, type Rule, type RuleApplication, type Term, type Variable, type WrappedQuery, type WrapperFilter, emptyContext, isAttribute, isNotClause, isOrClause, isPatternClause, isPredicateClause, isRuleApplication, isVariable };
//# sourceMappingURL=types.d.ts.map
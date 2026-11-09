import { AggregateOp, AggregateSpec, Clause, ComputeOp, ComputeSpec, Constant, DatalogQuery, HavingClause, NotClause, OrAlternative, OrClause, OrderBySpec, OrderDirection, PatternClause, PredicateClause, Rule, RuleApplication, RuleBodyClause, Term, Variable, WrappedQuery, WrapperFilter, WrapperFilterOp } from "./schema.js";

//#region src/datalog/types.d.ts
/**
 * Context: a mapping from variable names to their bound values
 *
 * Example:
 * ```typescript
 * { "?person": "p1", "?name": "Alice", "?age": 30 }
 * ```
 */
interface Context {
  readonly [variable: string]: Constant | null;
}
/**
 * An empty context with no bindings
 */
declare const emptyContext: Context;
/**
 * Query result: an array of contexts (variable bindings)
 * Each context represents one result row
 */
type QueryResult = readonly Context[];
//#endregion
export { type AggregateOp, type AggregateSpec, type Clause, type ComputeOp, type ComputeSpec, type Constant, Context, type DatalogQuery, type HavingClause, type NotClause, type OrAlternative, type OrClause, type OrderBySpec, type OrderDirection, type PatternClause, type PredicateClause, QueryResult, type Rule, type RuleApplication, type RuleBodyClause, type Term, type Variable, type WrappedQuery, type WrapperFilter, type WrapperFilterOp, emptyContext };
//# sourceMappingURL=types.d.ts.map
import { Constant, PredicateClause, Term } from "../../datalog/schema.js";
import { Context } from "./types.js";

//#region src/kv/datalog/predicate.d.ts
/**
 * Resolve a term to its concrete value in the given context.
 * - Variables are looked up in the context
 * - Constants are returned as-is
 * Returns null if a variable is unbound.
 */
declare const resolveTerm: (term: Term, context: Context) => Constant | null;
/**
 * Evaluate a predicate clause against a context.
 *
 * A PredicateClause is [op, left, right] where op is one of:
 * ">", ">=", "<", "<=", "=", "!="
 *
 * Returns true if the predicate is satisfied, false otherwise.
 * Unbound variables or type mismatches result in false (no match).
 */
declare const evaluatePredicate: (predicate: PredicateClause, context: Context) => boolean;
/**
 * Filter a set of contexts by a predicate clause.
 * Returns only contexts where the predicate is satisfied.
 */
declare const filterByPredicate: (predicate: PredicateClause, contexts: readonly Context[]) => Context[];
//#endregion
export { evaluatePredicate, filterByPredicate, resolveTerm };
//# sourceMappingURL=predicate.d.ts.map
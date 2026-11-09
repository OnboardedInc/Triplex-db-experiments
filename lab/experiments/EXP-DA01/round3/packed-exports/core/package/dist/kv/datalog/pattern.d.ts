import { TripleValue } from "../../Value.js";
import { ResolvedTemporalBasis } from "../../Temporal.js";
import { Constant, PatternClause } from "../../datalog/schema.js";
import { ScanPattern } from "../hexastore/scan.js";
import { Datom, KvTripleStore } from "../hexastore/KvTripleStore.js";
import { Context as Context$1 } from "./types.js";
import { Effect } from "effect";

//#region src/kv/datalog/pattern.d.ts
/**
 * Flatten a TripleValue to a Constant for use in variable bindings.
 *
 * The domain uses typed discriminated unions for values (e.g., { type: "string", value: "Alice" }).
 * Datalog contexts use flat constants (e.g., "Alice" or 42).
 * Refs are kept as their entity ID strings.
 */
declare const tripleValueToConstant: (tv: TripleValue) => Constant;
/**
 * Convert a Constant back to a TripleValue for hexastore scans.
 * Since we lose type information when flattening, we use heuristics:
 * - strings starting with certain patterns could be refs, but we default to string
 * - numbers are numbers
 * - booleans are booleans
 *
 * For bound variables from previous patterns, we use the original TripleValue
 * stored alongside the binding when possible.
 */
declare const constantToTripleValue: (c: Constant) => TripleValue;
/**
 * Convert a PatternClause + current Context into a ScanPattern for the hexastore.
 *
 * A PatternClause is [entity, attribute, value] or [entity, attribute, value, tx].
 * Terms can be variables (?x) or constants.
 * Variables already bound in the context are treated as constants.
 */
declare const patternToScanPattern: (pattern: PatternClause, context: Context$1) => ScanPattern;
/**
 * Try to bind a Datom's components against a PatternClause, extending the given Context.
 *
 * For each position (entity, attribute, value, tx):
 * - If the term is a constant, verify the datom matches
 * - If the term is an unbound variable, bind it to the datom's value
 * - If the term is a bound variable, verify the binding matches
 *
 * Returns the extended context, or null if the datom doesn't match.
 */
declare const bindDatom: (pattern: PatternClause, datom: Datom, context: Context$1) => Context$1 | null;
/**
 * Execute a single pattern clause against the hexastore.
 *
 * For each input context:
 * 1. Convert the pattern + context to a ScanPattern (binding known variables)
 * 2. Scan the hexastore for matching datoms
 * 3. For each datom, try to extend the context with new bindings
 * 4. Yield all successful bindings
 *
 * This is the index nested loop join operation at the core of the executor.
 * Uses the synchronous scanCollect path when available (in-memory backend)
 * to avoid Effect/Stream overhead in the hot loop.
 */
declare const executePattern: (store: KvTripleStore, pattern: PatternClause, contexts: readonly Context$1[], basis?: ResolvedTemporalBasis) => Effect.Effect<Context$1[]>;
//#endregion
export { bindDatom, constantToTripleValue, executePattern, patternToScanPattern, tripleValueToConstant };
//# sourceMappingURL=pattern.d.ts.map
import { TripleChange } from "../store/ChangeEmitter.js";
import { InvalidationResult, QueryDependencies } from "./types.js";

//#region src/subscriptions/invalidation.d.ts
/**
 * Check if a subscription with given dependencies is affected by a batch of changes.
 *
 * Uses three-level filtering:
 * 1. Entity Type — Does the change affect an entity type the query reads?
 * 2. Attribute — Does the change affect an attribute the query reads?
 * 3. Entity ID — If the query is scoped to specific entities, is this one of them?
 *
 * This is a conservative check: it may return true when the subscription
 * wouldn't actually change (false positive), but should never return false
 * when the subscription would change (no false negatives).
 *
 * @param deps Dependencies extracted from a subscription's query
 * @param changes Batch of triple changes to check
 * @returns Result indicating if the subscription is affected and why
 */
declare function checkInvalidation(deps: QueryDependencies, changes: readonly TripleChange[]): InvalidationResult;
/**
 * Check if a single change affects a subscription's dependencies.
 *
 * Convenience wrapper around checkInvalidation for single-change scenarios.
 *
 * @param deps Dependencies extracted from a subscription's query
 * @param change Single triple change to check
 * @returns true if the subscription might be affected
 */
declare function isAffectedByChange(deps: QueryDependencies, change: TripleChange): boolean;
//#endregion
export { checkInvalidation, isAffectedByChange };
//# sourceMappingURL=invalidation.d.ts.map
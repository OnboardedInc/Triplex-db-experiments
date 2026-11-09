import { extractEntityType } from "./extract-dependencies.js";
//#region src/subscriptions/invalidation.ts
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
function checkInvalidation(deps, changes) {
	if (changes.length === 0) return {
		affected: false,
		matchingChanges: [],
		reason: "No changes provided"
	};
	if (deps.attributes.size === 0 && deps.entityTypes.size === 0) {
		if (deps.hasDynamicAttributes) return {
			affected: true,
			matchingChanges: [...changes],
			reason: "Query reads dynamic attributes and cannot be narrowed statically"
		};
		return {
			affected: false,
			matchingChanges: [],
			reason: "Query has no data dependencies"
		};
	}
	const matchingChanges = [];
	for (const change of changes) {
		const changeEntityType = extractEntityType(change.attribute);
		if (changeEntityType !== null && deps.entityTypes.size > 0) {
			if (!deps.entityTypes.has(changeEntityType)) continue;
		}
		if (!deps.hasDynamicAttributes && deps.attributes.size > 0 && !deps.attributes.has(change.attribute)) continue;
		if (deps.boundEntityIds.size > 0 && changeEntityType !== null) {
			if (deps.boundEntityTypes.has(changeEntityType) && !deps.unboundEntityTypes.has(changeEntityType)) {
				if (!deps.boundEntityIds.has(change.entityId)) continue;
			}
		}
		matchingChanges.push(change);
	}
	if (matchingChanges.length === 0) return {
		affected: false,
		matchingChanges: [],
		reason: "No changes overlap with query dependencies"
	};
	return {
		affected: true,
		matchingChanges,
		reason: `${matchingChanges.length} change(s) affect attributes read by this query`
	};
}
/**
* Check if a single change affects a subscription's dependencies.
*
* Convenience wrapper around checkInvalidation for single-change scenarios.
*
* @param deps Dependencies extracted from a subscription's query
* @param change Single triple change to check
* @returns true if the subscription might be affected
*/
function isAffectedByChange(deps, change) {
	return checkInvalidation(deps, [change]).affected;
}
//#endregion
export { checkInvalidation, isAffectedByChange };

//# sourceMappingURL=invalidation.js.map
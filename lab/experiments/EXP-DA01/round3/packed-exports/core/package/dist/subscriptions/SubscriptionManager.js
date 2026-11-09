import { extractDependencies } from "./extract-dependencies.js";
import { checkInvalidation } from "./invalidation.js";
import { hashQuery } from "./query-hash.js";
import { Context, Effect, HashMap, HashSet, Layer, Option, Ref } from "effect";
//#region src/subscriptions/SubscriptionManager.ts
/**
* SubscriptionManager Service
*
* Manages registered subscriptions and provides efficient invalidation checks.
* Pure in-memory implementation with no external dependencies.
*/
var SubscriptionManager = class extends Context.Service()("SubscriptionManager") {};
/**
* Create a SubscriptionManager service instance.
*
* This is a pure in-memory implementation using Effect's Ref for
* thread-safe state management. It has no external dependencies
* and can be used in any environment.
*/
const makeSubscriptionManager = Effect.gen(function* () {
	const subscriptionsRef = yield* Ref.make(HashMap.empty());
	const byQueryHashRef = yield* Ref.make(HashMap.empty());
	const register = (id, query, clientId) => Effect.gen(function* () {
		const dependencies = extractDependencies(query);
		const qHash = hashQuery(query);
		const existing = yield* Ref.get(subscriptionsRef).pipe(Effect.map((subs) => Option.getOrUndefined(HashMap.get(subs, id))));
		const subscription = {
			id,
			query,
			dependencies,
			queryHash: qHash,
			clientId
		};
		yield* Ref.update(subscriptionsRef, HashMap.set(id, subscription));
		yield* Ref.update(byQueryHashRef, (index) => {
			let updated = index;
			if (existing && existing.queryHash !== qHash) {
				const oldIds = Option.getOrElse(HashMap.get(index, existing.queryHash), () => HashSet.empty());
				const newOldIds = HashSet.remove(oldIds, id);
				updated = HashSet.size(newOldIds) === 0 ? HashMap.remove(updated, existing.queryHash) : HashMap.set(updated, existing.queryHash, newOldIds);
			}
			const ids = Option.getOrElse(HashMap.get(updated, qHash), () => HashSet.empty());
			return HashMap.set(updated, qHash, HashSet.add(ids, id));
		});
		return subscription;
	});
	const unregister = (id) => Effect.gen(function* () {
		const existing = yield* Ref.get(subscriptionsRef).pipe(Effect.map((subs) => Option.getOrUndefined(HashMap.get(subs, id))));
		yield* Ref.update(subscriptionsRef, HashMap.remove(id));
		if (existing) yield* Ref.update(byQueryHashRef, (index) => {
			const ids = Option.getOrElse(HashMap.get(index, existing.queryHash), () => HashSet.empty());
			const newIds = HashSet.remove(ids, id);
			return HashSet.size(newIds) === 0 ? HashMap.remove(index, existing.queryHash) : HashMap.set(index, existing.queryHash, newIds);
		});
	});
	const checkAffected = (changes) => Effect.gen(function* () {
		const subscriptions = yield* Ref.get(subscriptionsRef);
		const affected = [];
		const unaffected = [];
		const details = /* @__PURE__ */ new Map();
		for (const [_id, sub] of subscriptions) {
			const result = checkInvalidation(sub.dependencies, changes);
			details.set(sub.id, result);
			if (result.affected) affected.push(sub);
			else unaffected.push(sub);
		}
		return {
			affected,
			unaffected,
			details
		};
	});
	const list = () => Effect.gen(function* () {
		const subscriptions = yield* Ref.get(subscriptionsRef);
		return Array.from(HashMap.values(subscriptions));
	});
	const get = (id) => Effect.gen(function* () {
		const subscriptions = yield* Ref.get(subscriptionsRef);
		return Option.getOrUndefined(HashMap.get(subscriptions, id));
	});
	const count = () => Effect.gen(function* () {
		const subscriptions = yield* Ref.get(subscriptionsRef);
		return HashMap.size(subscriptions);
	});
	const clear = () => Effect.gen(function* () {
		yield* Ref.set(subscriptionsRef, HashMap.empty());
		yield* Ref.set(byQueryHashRef, HashMap.empty());
	});
	const findByQueryHash = (queryHash) => Effect.gen(function* () {
		const subscriptions = yield* Ref.get(subscriptionsRef);
		const index = yield* Ref.get(byQueryHashRef);
		const ids = Option.getOrElse(HashMap.get(index, queryHash), () => HashSet.empty());
		const result = [];
		for (const id of ids) {
			const sub = Option.getOrUndefined(HashMap.get(subscriptions, id));
			if (sub) result.push(sub);
		}
		return result;
	});
	const getQueryHash = (query) => hashQuery(query);
	return {
		register,
		unregister,
		checkAffected,
		list,
		get,
		count,
		clear,
		findByQueryHash,
		getQueryHash
	};
});
/**
* Layer that provides the SubscriptionManager service.
*/
const SubscriptionManagerLive = Layer.effect(SubscriptionManager, makeSubscriptionManager);
//#endregion
export { SubscriptionManager, SubscriptionManagerLive, makeSubscriptionManager };

//# sourceMappingURL=SubscriptionManager.js.map
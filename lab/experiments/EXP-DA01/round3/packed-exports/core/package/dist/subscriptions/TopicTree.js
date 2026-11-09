import { extractEntityType } from "./extract-dependencies.js";
import { checkInvalidation } from "./invalidation.js";
//#region src/subscriptions/TopicTree.ts
const WILDCARD_TOPIC = "*";
/**
* Topic-tree index for live-query subscriptions.
*
* The tree narrows candidate subscriptions by entity type and attribute before
* running the full invalidation check for exact matching.
*/
var TopicTree = class {
	tree = /* @__PURE__ */ new Map();
	connections = /* @__PURE__ */ new Map();
	queries = /* @__PURE__ */ new Map();
	register(connectionId, queryId, dependencies) {
		this.unregister(connectionId, queryId);
		const subscriptionId = this.subscriptionId(connectionId, queryId);
		this.queries.set(subscriptionId, {
			connectionId,
			dependencies
		});
		const connectionQueries = this.connections.get(connectionId) ?? /* @__PURE__ */ new Set();
		connectionQueries.add(queryId);
		this.connections.set(connectionId, connectionQueries);
		const topics = this.topicsFor(dependencies);
		for (const [entityType, attribute] of topics) {
			const byAttribute = this.tree.get(entityType) ?? /* @__PURE__ */ new Map();
			const queryIds = byAttribute.get(attribute) ?? /* @__PURE__ */ new Set();
			queryIds.add(subscriptionId);
			byAttribute.set(attribute, queryIds);
			this.tree.set(entityType, byAttribute);
		}
	}
	unregister(connectionId, queryId) {
		const subscriptionId = this.subscriptionId(connectionId, queryId);
		const existing = this.queries.get(subscriptionId);
		if (!existing) return;
		this.queries.delete(subscriptionId);
		const connectionQueries = this.connections.get(connectionId);
		if (connectionQueries) {
			connectionQueries.delete(queryId);
			if (connectionQueries.size === 0) this.connections.delete(connectionId);
		}
		const topics = this.topicsFor(existing.dependencies);
		for (const [entityType, attribute] of topics) {
			const byAttribute = this.tree.get(entityType);
			const queryIds = byAttribute?.get(attribute);
			if (!byAttribute || !queryIds) continue;
			queryIds.delete(subscriptionId);
			if (queryIds.size === 0) byAttribute.delete(attribute);
			if (byAttribute.size === 0) this.tree.delete(entityType);
		}
	}
	removeConnection(connectionId) {
		const queryIds = Array.from(this.connections.get(connectionId) ?? []);
		for (const queryId of queryIds) this.unregister(connectionId, queryId);
	}
	hasSubscriptions(connectionId) {
		return (this.connections.get(connectionId)?.size ?? 0) > 0;
	}
	findAffected(changes) {
		const byConnection = /* @__PURE__ */ new Map();
		const seenByConnection = /* @__PURE__ */ new Map();
		for (const change of changes) {
			const candidateIds = this.findCandidateSubscriptions(change);
			for (const subscriptionId of candidateIds) {
				const query = this.queries.get(subscriptionId);
				if (!query) continue;
				if (!checkInvalidation(query.dependencies, [change]).affected) continue;
				const changeKey = this.changeKey(change);
				const seenChanges = seenByConnection.get(query.connectionId) ?? /* @__PURE__ */ new Set();
				if (seenChanges.has(changeKey)) continue;
				seenChanges.add(changeKey);
				seenByConnection.set(query.connectionId, seenChanges);
				const connectionChanges = byConnection.get(query.connectionId) ?? [];
				connectionChanges.push(change);
				byConnection.set(query.connectionId, connectionChanges);
			}
		}
		return byConnection;
	}
	findCandidateSubscriptions(change) {
		const candidates = /* @__PURE__ */ new Set();
		const entityType = extractEntityType(change.attribute) ?? WILDCARD_TOPIC;
		this.collectCandidates(candidates, entityType, change.attribute);
		this.collectCandidates(candidates, entityType, WILDCARD_TOPIC);
		this.collectCandidates(candidates, WILDCARD_TOPIC, WILDCARD_TOPIC);
		return candidates;
	}
	collectCandidates(target, entityType, attribute) {
		const queryIds = this.tree.get(entityType)?.get(attribute);
		if (!queryIds) return;
		for (const queryId of queryIds) target.add(queryId);
	}
	topicsFor(dependencies) {
		const topics = /* @__PURE__ */ new Map();
		for (const attribute of dependencies.attributes) {
			const entityType = extractEntityType(attribute) ?? WILDCARD_TOPIC;
			const attributes = topics.get(entityType) ?? /* @__PURE__ */ new Set();
			attributes.add(attribute);
			topics.set(entityType, attributes);
		}
		if (dependencies.hasDynamicAttributes) {
			const entityTypes = dependencies.entityTypes.size > 0 ? dependencies.entityTypes : new Set([WILDCARD_TOPIC]);
			for (const entityType of entityTypes) {
				const attributes = topics.get(entityType) ?? /* @__PURE__ */ new Set();
				attributes.add(WILDCARD_TOPIC);
				topics.set(entityType, attributes);
			}
		}
		if (topics.size === 0) topics.set(WILDCARD_TOPIC, new Set([WILDCARD_TOPIC]));
		return Array.from(topics.entries()).flatMap(([entityType, attributes]) => Array.from(attributes, (attribute) => [entityType, attribute]));
	}
	subscriptionId(connectionId, queryId) {
		return `${connectionId}:${queryId}`;
	}
	changeKey(change) {
		return `${change.operation}:${change.entityId}:${change.attribute}`;
	}
};
//#endregion
export { TopicTree };

//# sourceMappingURL=TopicTree.js.map
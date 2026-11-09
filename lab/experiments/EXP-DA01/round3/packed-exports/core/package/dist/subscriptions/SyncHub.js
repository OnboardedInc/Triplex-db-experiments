import { extractDependencies } from "./extract-dependencies.js";
import { hashQuery } from "./query-hash.js";
import { TopicTree } from "./TopicTree.js";
import { ChangeEmitter } from "../store/ChangeEmitter.js";
import { Effect, Layer } from "effect";
//#region src/subscriptions/SyncHub.ts
const DEFAULT_DEBOUNCE_MS = 50;
var TopicFilteredSyncHub = class {
	databases = /* @__PURE__ */ new Map();
	nextConnectionIndex = 0;
	constructor(debounceMs = DEFAULT_DEBOUNCE_MS) {
		this.debounceMs = debounceMs;
	}
	connect(database, send, options) {
		const connectionId = options?.connectionId ?? this.nextConnectionId();
		const conn = this.getOrCreate(database);
		conn.topicTree.removeConnection(connectionId);
		conn.clientsById.set(connectionId, { send });
		for (const subscription of options?.subscriptions ?? []) this.registerSubscription(conn, connectionId, subscription.queryId, subscription.query);
		if (options?.sendConnected ?? true) this.send(database, conn, connectionId, {
			type: "connected",
			database
		});
		return {
			database,
			connectionId
		};
	}
	hasConnection(connection) {
		return this.databases.get(connection.database)?.clientsById.has(connection.connectionId) ?? false;
	}
	disconnect(connection) {
		const conn = this.databases.get(connection.database);
		if (!conn) return;
		conn.topicTree.removeConnection(connection.connectionId);
		conn.clientsById.delete(connection.connectionId);
		if (conn.clientsById.size === 0 && conn.timer === null) this.databases.delete(connection.database);
	}
	receive(connection, data, hooks = {}) {
		const conn = this.databases.get(connection.database);
		if (!conn?.clientsById.has(connection.connectionId)) return;
		try {
			const msg = JSON.parse(this.decodeMessage(data));
			switch (msg?.type) {
				case "subscribe":
					if (typeof msg.queryId !== "string" || !msg.query) {
						this.send(connection.database, conn, connection.connectionId, {
							type: "error",
							message: "Invalid subscribe message"
						});
						return;
					}
					this.registerSubscription(conn, connection.connectionId, msg.queryId, msg.query);
					this.send(connection.database, conn, connection.connectionId, {
						type: "subscribed",
						queryId: msg.queryId,
						queryHash: hashQuery(msg.query)
					});
					hooks.onSubscribe?.({
						queryId: msg.queryId,
						query: msg.query
					});
					return;
				case "unsubscribe":
					if (typeof msg.queryId !== "string") {
						this.send(connection.database, conn, connection.connectionId, {
							type: "error",
							message: "Invalid unsubscribe message"
						});
						return;
					}
					conn.topicTree.unregister(connection.connectionId, msg.queryId);
					hooks.onUnsubscribe?.(msg.queryId);
					return;
				case "ping":
					this.send(connection.database, conn, connection.connectionId, { type: "pong" });
					return;
				default:
					this.send(connection.database, conn, connection.connectionId, {
						type: "error",
						message: "Unknown message type"
					});
					return;
			}
		} catch {
			this.send(connection.database, conn, connection.connectionId, {
				type: "error",
				message: "Malformed message"
			});
		}
	}
	emitForDatabase(database, event) {
		const conn = this.databases.get(database);
		if (!conn || conn.clientsById.size === 0) return;
		conn.pendingChanges.push(event);
		if (!conn.timer) conn.timer = setTimeout(() => this.flush(database), this.debounceMs);
	}
	emitToAllDatabases(event) {
		for (const database of this.databases.keys()) this.emitForDatabase(database, event);
	}
	get service() {
		return { emit: (event) => Effect.sync(() => {
			this.emitToAllDatabases(event);
		}) };
	}
	get layer() {
		return Layer.succeed(ChangeEmitter, this.service);
	}
	dispose() {
		for (const [, conn] of this.databases) {
			if (conn.timer) clearTimeout(conn.timer);
			conn.clientsById.clear();
		}
		this.databases.clear();
	}
	getOrCreate(database) {
		let conn = this.databases.get(database);
		if (!conn) {
			conn = {
				clientsById: /* @__PURE__ */ new Map(),
				topicTree: new TopicTree(),
				pendingChanges: [],
				timer: null
			};
			this.databases.set(database, conn);
		}
		return conn;
	}
	nextConnectionId() {
		this.nextConnectionIndex += 1;
		return `ws:${this.nextConnectionIndex}`;
	}
	registerSubscription(conn, connectionId, queryId, query) {
		conn.topicTree.register(connectionId, queryId, extractDependencies(query));
	}
	flush(database) {
		const conn = this.databases.get(database);
		if (!conn || conn.pendingChanges.length === 0) return;
		const batch = conn.pendingChanges;
		conn.pendingChanges = [];
		conn.timer = null;
		const allChanges = batch.flatMap((event) => event.changes);
		const affectedConnections = conn.topicTree.findAffected(allChanges);
		for (const [connectionId, matchingChanges] of affectedConnections) {
			const filteredEvents = this.filterEventsToChanges(batch, matchingChanges);
			if (filteredEvents.length === 0) continue;
			this.send(database, conn, connectionId, {
				type: "changes",
				events: filteredEvents
			});
		}
		for (const [connectionId] of conn.clientsById) {
			if (affectedConnections.has(connectionId) || conn.topicTree.hasSubscriptions(connectionId)) continue;
			this.send(database, conn, connectionId, {
				type: "changes",
				events: batch
			});
		}
		if (conn.clientsById.size === 0) this.databases.delete(database);
	}
	filterEventsToChanges(events, matchingChanges) {
		const changeKeys = new Set(matchingChanges.map((change) => this.changeKey(change)));
		return events.flatMap((event) => {
			const filteredChanges = event.changes.filter((change) => changeKeys.has(this.changeKey(change)));
			return filteredChanges.length > 0 ? [{
				...event,
				changes: filteredChanges
			}] : [];
		});
	}
	changeKey(change) {
		return `${change.operation}:${change.entityId}:${change.attribute}`;
	}
	send(database, conn, connectionId, message) {
		const client = conn.clientsById.get(connectionId);
		if (!client) return;
		try {
			client.send(message);
		} catch {
			this.disconnect({
				database,
				connectionId
			});
		}
	}
	decodeMessage(data) {
		if (typeof data === "string") return data;
		if (data instanceof ArrayBuffer) return new TextDecoder().decode(data);
		if (ArrayBuffer.isView(data)) return new TextDecoder().decode(new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
		return String(data);
	}
};
//#endregion
export { TopicFilteredSyncHub };

//# sourceMappingURL=SyncHub.js.map
import { KvBackend } from "./KvBackend.js";
import { Effect, Layer, Semaphore, Stream } from "effect";
//#region src/kv/kv/InMemoryKvBackend.ts
/**
* In-memory ordered KV backend using a Map with lazily-sorted cache.
*
* Designed for development, testing, and single-node deployments.
* All data lives in memory -- no persistence across restarts.
*
* Performance characteristics:
* - get: O(1) via Map lookup
* - set: O(1) via Map insertion (invalidates sorted cache)
* - delete: O(1) via Map deletion (invalidates sorted cache)
* - getRange: O(n log n) on first call after mutation (sorts), then O(log n + k)
* - setAll: O(k) direct Map insertion (invalidates sorted cache once)
* - transact: buffered writes, committed on success, discarded on error
*
* Bulk insertion is extremely fast because it never sorts during writes.
* The sorted array is only rebuilt lazily when the first range scan is requested.
*
* Key insight: latin1 string encoding preserves byte order, so we store keys
* as latin1 strings and sort natively (faster than byte-by-byte comparison).
* Uint8Array keys are only reconstructed on-demand for getRange results.
*/
/**
* Convert a Uint8Array key to a latin1 string.
* Latin1 encoding maps each byte 1:1 to a char code, preserving lexicographic order.
*/
const keyToString = (k) => {
	let s = "";
	for (let i = 0; i < k.length; i++) s += String.fromCharCode(k[i]);
	return s;
};
/**
* Convert a latin1 string back to a Uint8Array.
*/
const stringToKey = (s) => {
	const k = new Uint8Array(s.length);
	for (let i = 0; i < s.length; i++) k[i] = s.charCodeAt(i);
	return k;
};
/**
* Binary search for the insertion index of a key (as string) in the sorted keys array.
* Uses native string comparison which preserves byte order for latin1 strings.
*/
const bisectStr = (keys, target) => {
	let lo = 0;
	let hi = keys.length;
	while (lo < hi) {
		const mid = lo + hi >>> 1;
		if (keys[mid] < target) lo = mid + 1;
		else hi = mid;
	}
	return lo;
};
var Partition = class {
	map = /* @__PURE__ */ new Map();
	sortedKeysCache = [];
	ensureSortedKeys() {
		if (this.sortedKeysCache === null) {
			const keys = Array.from(this.map.keys());
			keys.sort();
			this.sortedKeysCache = keys;
		}
		return this.sortedKeysCache;
	}
	invalidateCache() {
		this.sortedKeysCache = null;
	}
	clear() {
		this.map.clear();
		this.sortedKeysCache = [];
	}
};
var InMemoryStore = class {
	/** Partitions indexed by first byte of key string (charCode). */
	partitions = /* @__PURE__ */ new Map();
	/** Get or create the partition for a key string. */
	partitionFor(ks) {
		const prefix = ks.charCodeAt(0);
		let p = this.partitions.get(prefix);
		if (p === void 0) {
			p = new Partition();
			this.partitions.set(prefix, p);
		}
		return p;
	}
	get(key) {
		const ks = keyToString(key);
		return this.partitionFor(ks).map.get(ks) ?? null;
	}
	set(key, value) {
		const ks = keyToString(key);
		const p = this.partitionFor(ks);
		p.map.set(ks, value);
		p.invalidateCache();
	}
	delete(key) {
		const ks = keyToString(key);
		const p = this.partitionFor(ks);
		if (p.map.delete(ks)) p.invalidateCache();
	}
	getRange(options) {
		const startStr = keyToString(options.start);
		const endStr = keyToString(options.end);
		const { limit, reverse } = options;
		const startPrefix = startStr.charCodeAt(0);
		const endPrefix = endStr.charCodeAt(0);
		if (startPrefix === endPrefix) {
			const p = this.partitions.get(startPrefix);
			if (!p) return [];
			return this.scanPartition(p, startStr, endStr, limit, reverse);
		}
		const results = [];
		const sortedPrefixes = Array.from(this.partitions.keys()).sort((a, b) => a - b);
		if (reverse) for (let pi = sortedPrefixes.length - 1; pi >= 0; pi--) {
			const prefix = sortedPrefixes[pi];
			if (prefix < startPrefix || prefix > endPrefix) continue;
			const p = this.partitions.get(prefix);
			const partResults = this.scanPartition(p, startStr, endStr, limit !== void 0 ? limit - results.length : void 0, true);
			for (const entry of partResults) results.push(entry);
			if (limit !== void 0 && results.length >= limit) break;
		}
		else for (const prefix of sortedPrefixes) {
			if (prefix < startPrefix || prefix > endPrefix) continue;
			const p = this.partitions.get(prefix);
			const partResults = this.scanPartition(p, startStr, endStr, limit !== void 0 ? limit - results.length : void 0, false);
			for (const entry of partResults) results.push(entry);
			if (limit !== void 0 && results.length >= limit) break;
		}
		return results;
	}
	scanPartition(p, startStr, endStr, limit, reverse) {
		const sortedKeys = p.ensureSortedKeys();
		const results = [];
		if (reverse) {
			let idx = bisectStr(sortedKeys, endStr) - 1;
			while (idx >= 0) {
				const ks = sortedKeys[idx];
				if (ks < startStr) break;
				results.push([stringToKey(ks), p.map.get(ks)]);
				if (limit !== void 0 && results.length >= limit) break;
				idx--;
			}
		} else {
			let idx = bisectStr(sortedKeys, startStr);
			while (idx < sortedKeys.length) {
				const ks = sortedKeys[idx];
				if (ks >= endStr) break;
				results.push([stringToKey(ks), p.map.get(ks)]);
				if (limit !== void 0 && results.length >= limit) break;
				idx++;
			}
		}
		return results;
	}
	/**
	* Set a key-value pair using pre-computed string key.
	* Does NOT invalidate cache — caller must call invalidateCache() after batch.
	*/
	setDirect(ks, value) {
		this.partitionFor(ks).map.set(ks, value);
	}
	/** Invalidate all partition caches. */
	invalidateCache() {
		for (const p of this.partitions.values()) p.invalidateCache();
	}
	/**
	* Apply buffered writes directly from the transaction write buffer.
	*/
	applyWriteBuffer(buffer) {
		if (buffer.size === 0) return;
		const dirtyPartitions = /* @__PURE__ */ new Set();
		for (const [ks, value] of buffer) {
			const p = this.partitionFor(ks);
			if (value === null) {
				if (p.map.delete(ks)) dirtyPartitions.add(p);
			} else {
				p.map.set(ks, value);
				dirtyPartitions.add(p);
			}
		}
		for (const p of dirtyPartitions) p.invalidateCache();
	}
	clear() {
		for (const p of this.partitions.values()) p.clear();
		this.partitions.clear();
	}
	get size() {
		let total = 0;
		for (const p of this.partitions.values()) total += p.map.size;
		return total;
	}
};
const makeInMemoryKvBackend = () => {
	const store = new InMemoryStore();
	const transactionMutex = Semaphore.makeUnsafe(1);
	return {
		get: (key) => Effect.sync(() => store.get(key)),
		set: (key, value) => Effect.sync(() => store.set(key, value)),
		delete: (key) => Effect.sync(() => store.delete(key)),
		getRange: (options) => Stream.fromIterable(store.getRange(options)),
		transact: (fn) => {
			return transactionMutex.withPermit(Effect.gen(function* () {
				const writeBuffer = /* @__PURE__ */ new Map();
				const result = yield* fn({
					get: (key) => Effect.sync(() => {
						const ks = keyToString(key);
						if (writeBuffer.has(ks)) return writeBuffer.get(ks) ?? null;
						return store.get(key);
					}),
					set: (key, value) => Effect.sync(() => {
						writeBuffer.set(keyToString(key), value);
					}),
					delete: (key) => Effect.sync(() => {
						writeBuffer.set(keyToString(key), null);
					}),
					getRange: (options) => {
						const start = keyToString(options.start);
						const end = keyToString(options.end);
						const visible = new Map(store.getRange({
							start: options.start,
							end: options.end
						}).map(([key, value]) => [keyToString(key), value]));
						for (const [key, value] of writeBuffer) {
							if (key < start || key >= end) continue;
							if (value === null) visible.delete(key);
							else visible.set(key, value);
						}
						const keys = [...visible.keys()].sort();
						if (options.reverse) keys.reverse();
						const selected = options.limit === void 0 ? keys : keys.slice(0, options.limit);
						return Stream.fromIterable(selected.map((key) => [stringToKey(key), visible.get(key)]));
					}
				});
				store.applyWriteBuffer(writeBuffer);
				return result;
			}));
		},
		setAll: (entries) => Effect.sync(() => {
			if (entries.length === 0) return;
			for (const [key, value] of entries) store.setDirect(keyToString(key), value);
			store.invalidateCache();
		}),
		getMany: (keys) => Effect.sync(() => keys.map((key) => [key, store.get(key)])),
		clear: () => Effect.sync(() => store.clear()),
		getSync: (key) => store.get(key),
		getRangeSync: (options) => store.getRange(options),
		setAllStr: (entries) => {
			if (entries.length === 0) return;
			for (let i = 0; i < entries.length; i++) store.setDirect(entries[i][0], entries[i][1]);
			store.invalidateCache();
		}
	};
};
/** Layer that provides an in-memory KV backend. */
const InMemoryKvBackendLive = Layer.succeed(KvBackend, makeInMemoryKvBackend());
/** Create a fresh in-memory KV backend (useful for testing). */
const makeTestKvBackend = () => makeInMemoryKvBackend();
//#endregion
export { InMemoryKvBackendLive, makeTestKvBackend };

//# sourceMappingURL=InMemoryKvBackend.js.map
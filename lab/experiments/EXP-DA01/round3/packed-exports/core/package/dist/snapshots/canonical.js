import { encodeOrThrow } from "../content/CanonicalJson.js";
import { Domain, hash } from "../content/ContentId.js";
//#region src/snapshots/canonical.ts
/** Current canonical format version. Prefixed to hash input for future-proofing. */
const CANONICAL_VERSION = "v1";
/** Format version number for the greenfield entity_blobs representation. */
const FORMAT_VERSION = 1;
/**
* Convert a TripleValue to a SnapshotValue.
* Blob values are stored as their hash (a string ref to blob storage).
*/
const tripleValueToSnapshotValue = (tv) => {
	switch (tv.type) {
		case "string": return {
			type: "string",
			value: tv.value
		};
		case "number": return {
			type: "number",
			value: tv.value
		};
		case "integer": return {
			type: "integer",
			value: tv.value
		};
		case "boolean": return {
			type: "boolean",
			value: tv.value
		};
		case "datetime": return {
			type: "datetime",
			value: tv.value
		};
		case "ref": return {
			type: "ref",
			value: tv.value
		};
		case "json": return {
			type: "json",
			value: tv.value
		};
		case "blob": return {
			type: "string",
			value: tv.value
		};
	}
};
/**
* Convert active triples for an entity into a snapshot attribute map.
* Multi-valued attributes (same attribute, different values) become arrays.
*/
const triplesToAttributeMap = (triples) => {
	const map = {};
	for (const triple of triples) {
		const attr = triple.attribute;
		const sv = tripleValueToSnapshotValue(triple.value);
		if (!map[attr]) map[attr] = [];
		map[attr].push(sv);
	}
	const result = {};
	for (const [attr, values] of Object.entries(map)) result[attr] = values.length === 1 ? values[0] : values;
	return result;
};
/**
* Produce a stable string representation of a SnapshotValue for sorting.
* Used to establish deterministic ordering within multi-valued attributes.
*/
const canonicalValueSortKey = (sv) => {
	const valuePart = sv.type === "json" ? JSON.stringify(sv.value) : String(sv.value);
	return `${sv.type}:${valuePart}`;
};
/**
* Produce the canonical JSON string for an attribute map.
*
* The output is a JSON array of `[key, value]` pairs (sorted by key).
* Multi-valued attributes have their values sorted by canonicalValueSortKey.
*/
const canonicalize = (attributes) => {
	return encodeOrThrow(Object.keys(attributes).sort().map((key) => {
		const val = attributes[key];
		if (Array.isArray(val)) return [key, [...val].sort((a, b) => canonicalValueSortKey(a).localeCompare(canonicalValueSortKey(b)))];
		return [key, val];
	}));
};
/**
* Compute the content-address hash for a canonical JSON string.
* Uses the shared browser-safe, domain-separated SHA-256 foundation.
*/
const hashCanonical = (canonical) => {
	const input = `v1:${canonical}`;
	return hash(Domain.entitySnapshot, input);
};
/**
* Compute the empty-entity hash (tombstone for fully-retracted entities).
*/
const EMPTY_ENTITY_HASH = hashCanonical(canonicalize({}));
/**
* Compute a structured diff between two snapshot attribute maps.
*/
const diffAttributes = (oldAttrs, newAttrs) => {
	const added = {};
	const removed = {};
	const changed = {};
	const allKeys = new Set([...Object.keys(oldAttrs), ...Object.keys(newAttrs)]);
	for (const key of allKeys) {
		const oldVal = oldAttrs[key];
		const newVal = newAttrs[key];
		if (oldVal === void 0 && newVal !== void 0) added[key] = newVal;
		else if (oldVal !== void 0 && newVal === void 0) removed[key] = oldVal;
		else if (oldVal !== void 0 && newVal !== void 0) {
			if (JSON.stringify(Array.isArray(oldVal) ? [...oldVal].sort((a, b) => canonicalValueSortKey(a).localeCompare(canonicalValueSortKey(b))) : oldVal) !== JSON.stringify(Array.isArray(newVal) ? [...newVal].sort((a, b) => canonicalValueSortKey(a).localeCompare(canonicalValueSortKey(b))) : newVal)) changed[key] = {
				old: oldVal,
				new: newVal
			};
		}
	}
	return {
		added,
		removed,
		changed
	};
};
//#endregion
export { CANONICAL_VERSION, EMPTY_ENTITY_HASH, FORMAT_VERSION, canonicalize, diffAttributes, hashCanonical, tripleValueToSnapshotValue, triplesToAttributeMap };

//# sourceMappingURL=canonical.js.map
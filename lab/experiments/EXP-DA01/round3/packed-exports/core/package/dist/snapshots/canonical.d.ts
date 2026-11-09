import { Triple } from "../Triple.js";
import { TripleValue } from "../Value.js";
import { ContentId } from "../content/ContentId.js";

//#region src/snapshots/canonical.d.ts
type SnapshotValue = {
  type: "string";
  value: string;
} | {
  type: "number";
  value: number;
} | {
  type: "integer";
  value: string;
} | {
  type: "boolean";
  value: boolean;
} | {
  type: "datetime";
  value: number;
} | {
  type: "ref";
  value: string;
} | {
  type: "json";
  value: unknown;
};
type SnapshotAttributeMap = Record<string, SnapshotValue | SnapshotValue[]>;
interface EntitySnapshot {
  readonly entityId: string;
  readonly entityType: string | null;
  readonly attributes: SnapshotAttributeMap;
  readonly hash: ContentId;
  readonly txId: string;
  readonly txTime: number;
}
interface EntityDiff {
  readonly entityId: string;
  readonly fromTxId: string;
  readonly toTxId: string;
  readonly fromHash: ContentId;
  readonly toHash: ContentId;
  readonly added: Record<string, SnapshotValue | SnapshotValue[]>;
  readonly removed: Record<string, SnapshotValue | SnapshotValue[]>;
  readonly changed: Record<string, {
    old: SnapshotValue | SnapshotValue[];
    new: SnapshotValue | SnapshotValue[];
  }>;
}
/** Current canonical format version. Prefixed to hash input for future-proofing. */
declare const CANONICAL_VERSION = "v1";
/** Format version number for the greenfield entity_blobs representation. */
declare const FORMAT_VERSION = 1;
/**
 * Convert a TripleValue to a SnapshotValue.
 * Blob values are stored as their hash (a string ref to blob storage).
 */
declare const tripleValueToSnapshotValue: (tv: TripleValue) => SnapshotValue;
/**
 * Convert active triples for an entity into a snapshot attribute map.
 * Multi-valued attributes (same attribute, different values) become arrays.
 */
declare const triplesToAttributeMap: (triples: readonly Triple[]) => SnapshotAttributeMap;
/**
 * Produce the canonical JSON string for an attribute map.
 *
 * The output is a JSON array of `[key, value]` pairs (sorted by key).
 * Multi-valued attributes have their values sorted by canonicalValueSortKey.
 */
declare const canonicalize: (attributes: SnapshotAttributeMap) => string;
/**
 * Compute the content-address hash for a canonical JSON string.
 * Uses the shared browser-safe, domain-separated SHA-256 foundation.
 */
declare const hashCanonical: (canonical: string) => ContentId;
/**
 * Compute the empty-entity hash (tombstone for fully-retracted entities).
 */
declare const EMPTY_ENTITY_HASH: ContentId;
/**
 * Compute a structured diff between two snapshot attribute maps.
 */
declare const diffAttributes: (oldAttrs: SnapshotAttributeMap, newAttrs: SnapshotAttributeMap) => {
  added: Record<string, SnapshotValue | SnapshotValue[]>;
  removed: Record<string, SnapshotValue | SnapshotValue[]>;
  changed: Record<string, {
    old: SnapshotValue | SnapshotValue[];
    new: SnapshotValue | SnapshotValue[];
  }>;
};
//#endregion
export { CANONICAL_VERSION, EMPTY_ENTITY_HASH, EntityDiff, EntitySnapshot, FORMAT_VERSION, SnapshotAttributeMap, SnapshotValue, canonicalize, diffAttributes, hashCanonical, tripleValueToSnapshotValue, triplesToAttributeMap };
//# sourceMappingURL=canonical.d.ts.map
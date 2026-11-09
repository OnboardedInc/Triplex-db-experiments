import { TripleValue } from "../../Value.js";
import { ResolvedTemporalBasis } from "../../Temporal.js";
import { KvBackendService } from "../kv/KvBackend.js";
import { ScanPattern } from "./scan.js";
import { Effect, Stream } from "effect";

//#region src/kv/hexastore/KvTripleStore.d.ts
/**
 * A datom is a single fact: (entity, attribute, value, txId, tripleId).
 * This is what the hexastore stores and what the Datalog executor operates on.
 */
interface Datom {
  readonly tripleId: string;
  readonly entity: string;
  readonly attribute: string;
  readonly value: TripleValue;
  readonly txId: string;
  readonly recordedAt: number;
  readonly recordedPosition: number;
  readonly validFrom: number;
  readonly validTo: number | null;
  readonly createdBy: string | null;
  readonly retractedAt: number | null;
  readonly retractedPosition: number | null;
  readonly retractTxId: string | null;
  readonly entityType: string | null;
}
/**
 * Hexastore triple store backed by an ordered KV backend.
 *
 * Stores datoms across 4 index orderings (EAVT, AEVT, AVET, VAET) plus
 * a META index for full datom data. Index entries store the tripleId as
 * their value, enabling efficient META lookups during scans.
 */
declare class KvTripleStore {
  private readonly kv;
  /**
   * Datom cache: tripleId → Datom.
   * Populated on assert/assertBatch and on first scan-hit.
   * Avoids repeated JSON.parse of META records.
   * Entries are invalidated on retract (retractedAt changes).
   */
  private readonly datomCache;
  constructor(kv: KvBackendService);
  /** Drop decoded datoms after an external/backend transaction commits. */
  clearCache(): void;
  /**
   * Assert a new datom into the store.
   * Writes to all indexes + META, storing tripleId as the index entry value.
   */
  assert(datom: Datom): Effect.Effect<void>;
  /**
   * Assert multiple datoms in a single operation.
   * Builds all KV entries synchronously, then writes them via setAll.
   *
   * Uses a latin1 string fast path when the backend supports setAllStr
   * (InMemoryKvBackend). This bypasses ~90 Uint8Array allocations per triple
   * by encoding index keys directly as latin1 strings.
   */
  assertBatch(datoms: readonly Datom[]): Effect.Effect<void>;
  /**
   * Latin1 string fast path for assertBatch.
   * Encodes each tuple part once and reuses across index keys.
   * Uses direct encoders (encodeStringStr) to skip TuplePart object allocation.
   * Values are still Uint8Array (META serialization).
   */
  private assertBatchStr;
  /**
   * Retract a triple by ID.
   * Updates the META record with retractedAt -- does NOT remove index keys.
   */
  retract(tripleId: string, retractedAt: number, retractTxId: string, retractedPosition: number): Effect.Effect<boolean>;
  /**
   * Get a datom by triple ID from the META index.
   */
  getById(tripleId: string): Effect.Effect<Datom | null>;
  /**
   * Get a datom by triple ID synchronously (cache or sync KV lookup).
   * Returns null if not found.
   */
  getByIdSync(tripleId: string): Datom | null;
  /**
   * Scan for datoms matching a pattern.
   * Resolves full datoms via META lookups using tripleId stored in index values.
   * Filters out retracted triples by default.
   */
  scan(pattern: ScanPattern, options?: {
    includeRetracted?: boolean;
  }): Stream.Stream<Datom>;
  /**
   * Synchronous scan that returns Datom[] directly.
   * Bypasses Effect/Stream overhead entirely — critical for Datalog join performance.
   * Only works when the KV backend supports synchronous operations (InMemoryKvBackend).
   * Falls back to null if sync is not available.
   */
  scanCollect(pattern: ScanPattern, options?: {
    includeRetracted?: boolean;
  }): Datom[] | null;
  /**
   * Look up all active datoms with a given entityType.
   * Scans the TYPE index in the KV backend for O(k) performance.
   * Returns empty array if no entries exist for the type.
   * Returns null if sync KV operations are not available (caller should fall back).
   */
  getByEntityType(entityType: string): Datom[] | null;
  /**
   * Batch-fetch META records for a list of tripleIds.
   * Uses the datomCache for hits, then fetches all cache misses in a
   * single `getMany` call (1 network round trip for FDB).
   * Populates the cache for future lookups.
   */
  private batchFetchMeta;
  /**
   * Async scan that collects all results eagerly with batched META fetches.
   * Uses 1 getRange call + 1 getMany call = 2 network round trips total,
   * instead of 1 + N for the streaming scan path.
   */
  scanCollectAsync(pattern: ScanPattern, options?: {
    includeRetracted?: boolean;
  }): Effect.Effect<Datom[]>;
  /** Synchronous bitemporal scan, when the backend supports it. */
  scanCollectTemporal(pattern: ScanPattern, basis: ResolvedTemporalBasis): Datom[] | null;
  /** Batched asynchronous bitemporal scan. */
  scanCollectTemporalAsync(pattern: ScanPattern, basis: ResolvedTemporalBasis): Effect.Effect<Datom[]>;
  /**
   * Async version of getByEntityType using batched META fetches.
   * Scans the TYPE index, then batch-fetches all META records in one call.
   */
  getByEntityTypeAsync(entityType: string): Effect.Effect<Datom[]>;
  /** Stream facts visible at one bitemporal basis. */
  scanTemporal(pattern: ScanPattern, basis: ResolvedTemporalBasis): Stream.Stream<Datom>;
  /**
   * Get all active datoms for an entity.
   */
  getEntity(entityId: string): Stream.Stream<Datom>;
  /**
   * Get full history of an entity (including retracted).
   */
  entityHistory(entityId: string): Stream.Stream<Datom>;
}
/**
 * Create a KvTripleStore instance.
 */
declare const createKvTripleStore: (kv: KvBackendService) => KvTripleStore;
//#endregion
export { Datom, KvTripleStore, createKvTripleStore };
//# sourceMappingURL=KvTripleStore.d.ts.map
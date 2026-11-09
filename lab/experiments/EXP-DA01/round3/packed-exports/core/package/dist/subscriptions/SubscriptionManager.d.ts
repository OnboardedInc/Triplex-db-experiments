import { DatalogQuery } from "../datalog/schema.js";
import { TripleChange } from "../store/ChangeEmitter.js";
import { AffectedSubscriptions, Subscription } from "./types.js";
import { Context, Effect, Layer } from "effect";

//#region src/subscriptions/SubscriptionManager.d.ts
/**
 * SubscriptionManager service interface.
 *
 * Provides methods for registering subscriptions and checking which
 * subscriptions are affected by data changes.
 */
interface SubscriptionManagerService {
  /**
   * Register a new subscription.
   * Dependencies are automatically extracted from the query.
   *
   * @param id Unique identifier for the subscription
   * @param query The Datalog query to watch
   * @param clientId Optional client/connection identifier for routing updates
   * @returns The registered subscription with extracted dependencies
   */
  readonly register: (id: string, query: DatalogQuery, clientId?: string) => Effect.Effect<Subscription>;
  /**
   * Unregister a subscription.
   *
   * @param id Subscription ID to remove
   */
  readonly unregister: (id: string) => Effect.Effect<void>;
  /**
   * Check which subscriptions are affected by a batch of changes.
   * This is the core invalidation primitive.
   *
   * @param changes Batch of triple changes to check
   * @returns Object containing affected and unaffected subscriptions
   */
  readonly checkAffected: (changes: readonly TripleChange[]) => Effect.Effect<AffectedSubscriptions>;
  /**
   * Get all registered subscriptions (for debugging/admin).
   */
  readonly list: () => Effect.Effect<readonly Subscription[]>;
  /**
   * Get a specific subscription by ID.
   *
   * @param id Subscription ID to look up
   * @returns The subscription if found, undefined otherwise
   */
  readonly get: (id: string) => Effect.Effect<Subscription | undefined>;
  /**
   * Get the count of registered subscriptions.
   */
  readonly count: () => Effect.Effect<number>;
  /**
   * Clear all subscriptions (for testing).
   */
  readonly clear: () => Effect.Effect<void>;
  /**
   * Find all subscriptions with a given query hash.
   * Useful for deduplication and finding identical queries.
   *
   * @param queryHash The hash to look up
   * @returns Array of subscriptions with matching hash
   */
  readonly findByQueryHash: (queryHash: number) => Effect.Effect<readonly Subscription[]>;
  /**
   * Compute the hash for a Datalog query.
   * Exposed for external use (e.g., frontend reactivity keys).
   *
   * @param query The query to hash
   * @returns The query's hash value
   */
  readonly getQueryHash: (query: DatalogQuery) => number;
}
declare const SubscriptionManager_base: Context.ServiceClass<SubscriptionManager, "SubscriptionManager", SubscriptionManagerService>;
declare class SubscriptionManager extends SubscriptionManager_base {}
/**
 * Create a SubscriptionManager service instance.
 *
 * This is a pure in-memory implementation using Effect's Ref for
 * thread-safe state management. It has no external dependencies
 * and can be used in any environment.
 */
declare const makeSubscriptionManager: Effect.Effect<{
  register: (id: string, query: DatalogQuery, clientId?: string) => Effect.Effect<Subscription>;
  unregister: (id: string) => Effect.Effect<void>;
  checkAffected: (changes: readonly TripleChange[]) => Effect.Effect<AffectedSubscriptions>;
  list: () => Effect.Effect<readonly Subscription[]>;
  get: (id: string) => Effect.Effect<Subscription | undefined>;
  count: () => Effect.Effect<number>;
  clear: () => Effect.Effect<void>;
  findByQueryHash: (queryHash: number) => Effect.Effect<readonly Subscription[]>;
  getQueryHash: (query: DatalogQuery) => number;
}, never, never>;
/**
 * Layer that provides the SubscriptionManager service.
 */
declare const SubscriptionManagerLive: Layer.Layer<SubscriptionManager, never, never>;
//#endregion
export { SubscriptionManager, SubscriptionManagerLive, SubscriptionManagerService, makeSubscriptionManager };
//# sourceMappingURL=SubscriptionManager.d.ts.map
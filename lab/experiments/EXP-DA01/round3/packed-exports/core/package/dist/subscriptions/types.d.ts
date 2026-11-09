import { DatalogQuery } from "../datalog/schema.js";
import { ChangeEvent, TripleChange } from "../store/ChangeEmitter.js";

//#region src/subscriptions/types.d.ts
/**
 * Dependencies extracted from a Datalog query.
 * Used to determine if a change event might affect query results.
 */
interface QueryDependencies {
  /**
   * Attributes the query reads.
   * e.g., {":employee/name", ":employee/department"}
   */
  readonly attributes: ReadonlySet<string>;
  /**
   * Whether the query reads attributes through a variable slot such as
   * `[?e, ?attr, ?value]`. These queries cannot be narrowed to concrete
   * attributes and must register wildcard topics.
   */
  readonly hasDynamicAttributes: boolean;
  /**
   * Entity types derived from attributes.
   * e.g., {"employee", "department"}
   */
  readonly entityTypes: ReadonlySet<string>;
  /**
   * Specific entity IDs if the query has constant entity bindings.
   * Empty if query uses only variables for entities.
   * e.g., {"emp:alice"} if query has ["emp:alice", ":employee/name", "?name"]
   */
  readonly boundEntityIds: ReadonlySet<string>;
  /**
   * Entity types that have at least one bound entity ID.
   * Used for Level 3 filtering: only apply entity ID filtering for changes
   * to entity types that actually have bound IDs.
   * e.g., {"employee"} if query binds "emp:alice" but uses variable for department
   */
  readonly boundEntityTypes: ReadonlySet<string>;
  /**
   * Entity types that at least one pattern reads without a constant entity id.
   * Bound-id filtering is unsafe for these types because another pattern in
   * the same query may still read every entity of that type.
   */
  readonly unboundEntityTypes: ReadonlySet<string>;
  /**
   * Rule names the query invokes (for recursive queries).
   * e.g., {"ancestor", "connected"}
   */
  readonly ruleNames: ReadonlySet<string>;
}
/**
 * Result of checking if a subscription is affected by changes.
 */
interface InvalidationResult {
  /** Whether the subscription might be affected */
  readonly affected: boolean;
  /** Which specific changes caused the match (for debugging) */
  readonly matchingChanges: readonly TripleChange[];
  /** Reason for the decision (for debugging) */
  readonly reason: string;
}
/**
 * A registered subscription with its extracted dependencies.
 */
interface Subscription {
  /** Unique identifier for this subscription */
  readonly id: string;
  /** The Datalog query being watched */
  readonly query: DatalogQuery;
  /** Dependencies extracted from the query */
  readonly dependencies: QueryDependencies;
  /** Hash of the query for deduplication and fast lookup */
  readonly queryHash: number;
  /** Optional: client/connection identifier for routing updates */
  readonly clientId?: string | undefined;
  /** Optional: hash of last result for change detection */
  readonly lastResultHash?: string | undefined;
}
/**
 * Result of checking which subscriptions are affected by a batch of changes.
 */
interface AffectedSubscriptions {
  /** Subscriptions that need to refresh */
  readonly affected: readonly Subscription[];
  /** Subscriptions that are not affected */
  readonly unaffected: readonly Subscription[];
  /** Detailed results per subscription (for debugging) */
  readonly details: ReadonlyMap<string, InvalidationResult>;
}
interface SyncConnectedMessage {
  readonly type: "connected";
  readonly database: string;
}
interface SyncChangesMessage {
  readonly type: "changes";
  readonly events: readonly ChangeEvent[];
}
interface SyncSubscribedMessage {
  readonly type: "subscribed";
  readonly queryId: string;
  readonly queryHash: number;
}
interface SyncPongMessage {
  readonly type: "pong";
}
interface SyncErrorMessage {
  readonly type: "error";
  readonly message: string;
}
type SyncServerMessage = SyncConnectedMessage | SyncChangesMessage | SyncSubscribedMessage | SyncPongMessage | SyncErrorMessage;
interface SyncSubscribeMessage {
  readonly type: "subscribe";
  readonly queryId: string;
  readonly query: DatalogQuery;
}
interface SyncUnsubscribeMessage {
  readonly type: "unsubscribe";
  readonly queryId: string;
}
interface SyncPingMessage {
  readonly type: "ping";
}
type SyncClientMessage = SyncSubscribeMessage | SyncUnsubscribeMessage | SyncPingMessage;
//#endregion
export { AffectedSubscriptions, type ChangeEvent, InvalidationResult, QueryDependencies, Subscription, SyncChangesMessage, SyncClientMessage, SyncConnectedMessage, SyncErrorMessage, SyncPingMessage, SyncPongMessage, SyncServerMessage, SyncSubscribeMessage, SyncSubscribedMessage, SyncUnsubscribeMessage, type TripleChange };
//# sourceMappingURL=types.d.ts.map
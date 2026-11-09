import { TripleChange } from "../store/ChangeEmitter.js";
import { QueryDependencies } from "./types.js";

//#region src/subscriptions/TopicTree.d.ts
/**
 * Topic-tree index for live-query subscriptions.
 *
 * The tree narrows candidate subscriptions by entity type and attribute before
 * running the full invalidation check for exact matching.
 */
declare class TopicTree {
  private readonly tree;
  private readonly connections;
  private readonly queries;
  register(connectionId: string, queryId: string, dependencies: QueryDependencies): void;
  unregister(connectionId: string, queryId: string): void;
  removeConnection(connectionId: string): void;
  hasSubscriptions(connectionId: string): boolean;
  findAffected(changes: readonly TripleChange[]): Map<string, TripleChange[]>;
  private findCandidateSubscriptions;
  private collectCandidates;
  private topicsFor;
  private subscriptionId;
  private changeKey;
}
//#endregion
export { TopicTree };
//# sourceMappingURL=TopicTree.d.ts.map
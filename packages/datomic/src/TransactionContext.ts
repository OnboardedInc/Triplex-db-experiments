// [EXP-DA01] Why: fiber-local savepoints isolate staged callbacks. Rejected: global mutable transaction state (cross-fiber leaks).
import { ReadError } from "@triplex-build/triplex/runtime";
import { Context } from "effect";
import type { TripleRow } from "@triplex-build/triplex/runtime";
import type { DatomicClient } from "./DatomicClient.js";

export interface DatomicClaim {
  readonly commandId: string;
  readonly txId: string;
  readonly timestamp: number;
}
export interface TransactionState {
  readonly diagnostic?: import("./DatomicClient.js").DatomicCommitAttempt | undefined;
  readonly order?:
    | { ticket?: import("./CommitOrder.js").OrderedCommit; instant?: number }
    | undefined;
  readonly replaySafe?: boolean | undefined;
  readonly client: DatomicClient;
  readonly scopeKey: string;
  readonly sourceK: number;
  readonly handle: string;
  readonly prefetch?: {
    readonly commandId?: string;
    readonly claim: string | null;
    readonly rows: ReadonlyMap<string, TripleRow | null>;
  };
  readonly optimistic?: boolean;
  readonly restart: { needed: boolean };
  entities: Set<string>;
  live: Set<string>;
  scopeWide: boolean;
  submitted?: boolean;
  position: number;
  rows: Map<string, TripleRow>;
  claims: Map<string, DatomicClaim>;
  newIds: Set<string>;
}
export const CurrentTransactions = Context.Reference<ReadonlyMap<symbol, TransactionState>>(
  "triplex/datomic/transactions",
  { defaultValue: () => new Map() },
);

// [DX-B3-M3] Why: unsupported reads restart before submission under the replay-safe callback contract.
// Rejected: answering an entity or pattern read from an incomplete by-id cache.
export class DatomicOptimisticRestart extends ReadError {}

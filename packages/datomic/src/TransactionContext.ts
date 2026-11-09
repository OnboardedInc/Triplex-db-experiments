// [EXP-DA01] Why: fiber-local savepoints isolate staged callbacks. Rejected: global mutable transaction state (cross-fiber leaks).
import { Context } from "effect";
import type { TripleRow } from "@triplex-build/triplex/runtime";
import type { DatomicClient } from "./DatomicClient.js";

export interface DatomicClaim {
  readonly commandId: string;
  readonly txId: string;
  readonly timestamp: number;
}
export interface TransactionState {
  readonly client: DatomicClient;
  readonly scopeKey: string;
  readonly sourceK: number;
  readonly handle: string;
  position: number;
  rows: Map<string, TripleRow>;
  claims: Map<string, DatomicClaim>;
  newIds: Set<string>;
}
export const CurrentTransactions = Context.Reference<ReadonlyMap<symbol, TransactionState>>(
  "triplex/datomic/transactions",
  { defaultValue: () => new Map() },
);

import { Context } from "effect";
import type { TripleRow } from "@triplex-build/triplex/runtime";
import type { XtdbClient } from "./XtdbClient.js";

export interface XtdbClaim {
  readonly commandId: string;
  readonly txId: string;
  readonly timestamp: number;
}
export interface TransactionState {
  readonly client: XtdbClient;
  readonly scopeKey: string;
  readonly sourceK: number;
  position: number;
  rows: Map<string, TripleRow>;
  claims: Map<string, XtdbClaim>;
  newIds: Set<string>;
}
export const CurrentTransactions = Context.Reference<ReadonlyMap<symbol, TransactionState>>(
  "triplex/xtdb/transactions",
  { defaultValue: () => new Map() },
);

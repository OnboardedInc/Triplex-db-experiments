import { Context } from "effect";
import type { TripleRow } from "@triplex-build/triplex/runtime";
import type { XtdbClient } from "./XtdbClient.js";

export interface XtdbClaim {
  readonly commandId: string;
  readonly txId: string;
  readonly timestamp: number;
  /** `subject-stamp` only: ordinal of the Triplex transact that claimed it. */
  readonly ordinal?: number;
}
/**
 * What a `subject-stamp` transaction read at its source cut (EXP-P2X). One object is shared by a
 * transaction and all of its nested callbacks, so reads made by a callback that later rolls back
 * still guard the commit: the outer callback's decisions may depend on them.
 */
export interface XtdbReadSet {
  readonly entities: Set<string>;
  /** A read that is not confined to known entities (pattern or entity-type scans). */
  scopeWide: boolean;
}
export interface TransactionState {
  readonly client: XtdbClient;
  readonly scopeKey: string;
  readonly sourceK: number;
  position: number;
  rows: Map<string, TripleRow>;
  claims: Map<string, XtdbClaim>;
  newIds: Set<string>;
  /** `subject-stamp` only: entity read set guarding the per-subject compare-and-set. */
  readonly reads?: XtdbReadSet;
  /**
   * `subject-stamp` only: placeholder position -> ordinal, one entry per Triplex transact in this
   * engine transaction. The engine replaces each placeholder with its stamped position.
   */
  stamps?: Map<number, number>;
}
export const CurrentTransactions = Context.Reference<ReadonlyMap<symbol, TransactionState>>(
  "triplex/xtdb/transactions",
  { defaultValue: () => new Map() },
);

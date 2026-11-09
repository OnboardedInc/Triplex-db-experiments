import type { TriplesService } from "../../../../packages/core/src/store/Triples.js";
import type { TriplesConstructedReads } from "../../../../packages/core/src/store/TriplesLive.js";

// [EXP-P2Q] Why: keyof resolves heritage and declaration merging, independent of spelling or AST placement.
// Rejected: reading one declaration's members (the reviewer's two additions escaped it).
type NonReads =
  | "assert"
  | "assertBatch"
  | "retract"
  | "retractByPattern"
  | "transact"
  | "currentPosition"
  | "explain"
  | "explainPage";
type AssertNever<T extends never> = T;
export type NoReadOutsideTable = AssertNever<
  Exclude<keyof TriplesService, keyof TriplesConstructedReads | NonReads>
>;
export type NoTableOutsideInterface = AssertNever<
  Exclude<keyof TriplesConstructedReads, keyof TriplesService>
>;

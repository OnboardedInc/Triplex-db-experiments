import { TransactOp } from "../Triple.js";
import { WriteError } from "../errors/index.js";
import { TransactionMeta, TransactionResult, TriplesService } from "./Triples.js";
import { Effect } from "effect";

//#region src/store/systemNamespace.d.ts
declare const systemWriteAuthorization: unique symbol;
declare const journalSuppression: unique symbol;
type InternalTransactionMeta = TransactionMeta & {
  readonly [systemWriteAuthorization]?: true;
  readonly [journalSuppression]?: true;
};
declare const isSystemWriteAuthorized: (meta: TransactionMeta | undefined) => boolean;
declare const isJournalSuppressed: (meta: TransactionMeta | undefined) => boolean;
/** Internal-only entry point for core services that own reserved facts. */
declare const transactSystem: (triples: TriplesService, operations: readonly TransactOp[], meta?: TransactionMeta) => Effect.Effect<TransactionResult, ReturnType<TriplesService["transact"]> extends Effect.Effect<unknown, infer E> ? E : never>;
/**
 * Internal maintenance write that must not recursively appear in the ordered
 * application transaction feed. Used for the feed's own consumer cursors.
 */
declare const transactSystemUnjournaled: (triples: TriplesService, operations: readonly TransactOp[], meta?: TransactionMeta) => ReturnType<typeof transactSystem>;
declare const isReservedEntityId: (entityId: string) => boolean;
declare const isReservedAttribute: (attribute: string) => boolean;
declare const isReservedEntityType: (entityType: string | undefined) => boolean;
interface ReservedWriteTarget {
  readonly entityId: string;
  readonly attribute: string;
  readonly entityType?: string | undefined;
}
declare const reservedWriteReason: (input: ReservedWriteTarget) => string | undefined;
declare const reservedWriteError: (input: ReservedWriteTarget) => WriteError | undefined;
declare const reservedAssertError: (operations: readonly TransactOp[]) => WriteError | undefined;
//#endregion
export { InternalTransactionMeta, isJournalSuppressed, isReservedAttribute, isReservedEntityId, isReservedEntityType, isSystemWriteAuthorized, reservedAssertError, reservedWriteError, reservedWriteReason, transactSystem, transactSystemUnjournaled };
//# sourceMappingURL=systemNamespace.d.ts.map
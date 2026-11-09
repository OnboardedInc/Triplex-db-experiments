import { TransactionId, TripleId } from "../Branded.js";

//#region src/utils/id.d.ts
/**
 * Generate a new ULID (TripleId).
 */
declare const generateId: () => TripleId;
/**
 * Generate a transaction ID.
 */
declare const generateTransactionId: () => TransactionId;
/**
 * Transaction metadata attributes.
 */
declare const TxAttributes: {
  /** Backend-issued, monotonically increasing commit position. */readonly POSITION: ":_tx/position"; /** Timestamp when the transaction occurred (epoch millis) */
  readonly INSTANT: ":_tx/instant"; /** Actor (human, agent, or service) that issued the command. */
  readonly ACTOR: ":_tx/actor"; /** Idempotency key for the command represented by this transaction. */
  readonly COMMAND_ID: ":_tx/command-id"; /** Correlates transactions that belong to one operation or workflow. */
  readonly CORRELATION_ID: ":_tx/correlation-id"; /** Transaction or event that caused this transaction. */
  readonly CAUSATION_ID: ":_tx/causation-id"; /** Immutable configuration snapshot that governed the command. */
  readonly CONFIG_SNAPSHOT: ":_tx/config-snapshot"; /** Persisted description of an asserted or retracted fact. */
  readonly CHANGE: ":_tx/change"; /** Indexed reference from a transaction envelope to every changed entity. */
  readonly CHANGED_ENTITY: ":_tx/changed-entity";
};
/**
 * System entity prefixes used by the database layer.
 */
declare const SystemPrefixes: {
  readonly TRANSACTION: "_tx";
};
//#endregion
export { SystemPrefixes, TxAttributes, generateId, generateTransactionId };
//# sourceMappingURL=id.d.ts.map
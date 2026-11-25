/**
 * Minimal ID generation utilities for the database package.
 *
 * Only includes what the database layer needs directly.
 * Runtime-owned metadata and higher-level ID helpers live in the runtime layer.
 */

import { monotonicFactory } from "ulidx";
import { TransactionId, TripleId } from "../Branded.js";

/**
 * Generate a new ULID (TripleId).
 */
export const generateId = (): TripleId => TripleId.make(nextUlid());

/**
 * Generate a transaction ID.
 */
export const generateTransactionId = (): TransactionId =>
  TransactionId.make(`_tx/${nextUlid()}`);

/**
 * [DX-ACT8, third review U1] Reserve every 26-character ID that starts with the returned prefix of `length` characters
 * (a save's ordered identity block takes 24 characters and owns `<prefix>00` to `<prefix>FF`; a wide block 23). No ID
 * this module issued before the reservation starts with the prefix, and none it issues after does: the prefix is
 * greater than the same-length prefix of every ID issued or reserved so far, and the greatest value is then moved to the
 * end of the block. This holds within the module (one process) whatever the clock does, a step back included. Across
 * processes and restarts the IDs are independent ULIDs: another process's ID starts with a reserved 24-character prefix
 * only if its 10 time characters and its next 14 random characters are equal (70 random bits).
 */
export function reserveIdPrefix(length: number): string {
  if (!Number.isInteger(length) || length < 11 || length > 25) throw new RangeError("Reserved ID prefix length must be 11 to 25");
  const floor = greatest.slice(0, length);
  let prefix = monotonicUlid().slice(0, length);
  if (prefix <= floor) prefix = successor(floor);
  greatest = prefix + "Z".repeat(26 - length);
  return prefix;
}

/**
 * Transaction metadata attributes.
 */
export const TxAttributes = {
  /** Backend-issued, monotonically increasing commit position. */
  POSITION: ":_tx/position",
  /** Timestamp when the transaction occurred (epoch millis) */
  INSTANT: ":_tx/instant",
  /** Actor (human, agent, or service) that issued the command. */
  ACTOR: ":_tx/actor",
  /** Idempotency key for the command represented by this transaction. */
  COMMAND_ID: ":_tx/command-id",
  /** Correlates transactions that belong to one operation or workflow. */
  CORRELATION_ID: ":_tx/correlation-id",
  /** Transaction or event that caused this transaction. */
  CAUSATION_ID: ":_tx/causation-id",
  /** Immutable configuration snapshot that governed the command. */
  CONFIG_SNAPSHOT: ":_tx/config-snapshot",
  /** Persisted description of an asserted or retracted fact. */
  CHANGE: ":_tx/change",
  /** Indexed reference from a transaction envelope to every changed entity. */
  CHANGED_ENTITY: ":_tx/changed-entity",
} as const;

/**
 * System entity prefixes used by the database layer.
 */
export const SystemPrefixes = {
  TRANSACTION: "_tx",
} as const;
const monotonicUlid = monotonicFactory();

// [DX-ACT8, third review U1] One allocator for every ID this module hands out: the greatest ID issued, or the end of the
// last reserved block. The ULID factory alone increments only the last characters within a millisecond, so its next IDs
// shared the prefix of a block a save had just taken from it, and could equal one of the save's assertion IDs (the
// transactor then refuses whichever write commits second, "TRIPLEX_IDENTITY f/id").
const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
let greatest = "";
/** The next string of the same length in ULID (Crockford base-32) order; the first character stays within 0 to 7. */
function successor(value: string): string {
  const digits = value.split("");
  for (let i = digits.length - 1; i >= 0; i--) {
    const next = alphabet.indexOf(digits[i]!) + 1;
    if (next < (i === 0 ? 8 : alphabet.length)) {
      digits[i] = alphabet[next]!;
      return digits.join("");
    }
    digits[i] = "0";
  }
  throw new RangeError("ULID space exhausted");
}
function nextUlid(): string {
  let id = monotonicUlid();
  if (id <= greatest) id = successor(greatest);
  greatest = id;
  return id;
}

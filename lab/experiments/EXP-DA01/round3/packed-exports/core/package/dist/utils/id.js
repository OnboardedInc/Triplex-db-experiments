import { TransactionId, TripleId } from "../Branded.js";
import { monotonicFactory } from "ulidx";
//#region src/utils/id.ts
/**
* Minimal ID generation utilities for the database package.
*
* Only includes what the database layer needs directly.
* Runtime-owned metadata and higher-level ID helpers live in the runtime layer.
*/
/**
* Generate a new ULID (TripleId).
*/
const generateId = () => TripleId.make(monotonicUlid());
/**
* Generate a transaction ID.
*/
const generateTransactionId = () => TransactionId.make(`_tx/${monotonicUlid()}`);
/**
* Transaction metadata attributes.
*/
const TxAttributes = {
	POSITION: ":_tx/position",
	INSTANT: ":_tx/instant",
	ACTOR: ":_tx/actor",
	COMMAND_ID: ":_tx/command-id",
	CORRELATION_ID: ":_tx/correlation-id",
	CAUSATION_ID: ":_tx/causation-id",
	CONFIG_SNAPSHOT: ":_tx/config-snapshot",
	CHANGE: ":_tx/change",
	CHANGED_ENTITY: ":_tx/changed-entity"
};
/**
* System entity prefixes used by the database layer.
*/
const SystemPrefixes = { TRANSACTION: "_tx" };
const monotonicUlid = monotonicFactory();
//#endregion
export { SystemPrefixes, TxAttributes, generateId, generateTransactionId };

//# sourceMappingURL=id.js.map
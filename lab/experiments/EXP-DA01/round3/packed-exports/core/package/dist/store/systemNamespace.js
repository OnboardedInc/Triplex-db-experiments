import { WriteError } from "../errors/index.js";
//#region src/store/systemNamespace.ts
const systemWriteAuthorization = Symbol("triplex/SystemWriteAuthorization");
const journalSuppression = Symbol("triplex/JournalSuppression");
const isSystemWriteAuthorized = (meta) => meta?.[systemWriteAuthorization] === true;
const isJournalSuppressed = (meta) => meta?.[journalSuppression] === true;
/** Internal-only entry point for core services that own reserved facts. */
const transactSystem = (triples, operations, meta) => triples.transact(operations, {
	...meta,
	[systemWriteAuthorization]: true
});
/**
* Internal maintenance write that must not recursively appear in the ordered
* application transaction feed. Used for the feed's own consumer cursors.
*/
const transactSystemUnjournaled = (triples, operations, meta) => triples.transact(operations, {
	...meta,
	[systemWriteAuthorization]: true,
	[journalSuppression]: true
});
const isReservedEntityId = (entityId) => entityId.startsWith("_triplex/");
const isReservedAttribute = (attribute) => attribute.startsWith(":triplex/") || attribute.startsWith(":_tx/");
const isReservedEntityType = (entityType) => entityType === "_Transaction" || entityType?.startsWith("triplex.") === true;
const reservedWriteReason = (input) => {
	if (isReservedEntityId(input.entityId)) return `entity ${input.entityId}`;
	if (isReservedAttribute(input.attribute)) return `attribute ${input.attribute}`;
	if (isReservedEntityType(input.entityType)) return `entity type ${input.entityType}`;
};
const reservedWriteError = (input) => {
	const reason = reservedWriteReason(input);
	return reason ? new WriteError({ message: `Write targets reserved Triplex system namespace: ${reason}` }) : void 0;
};
const reservedAssertError = (operations) => {
	for (const operation of operations) {
		if (operation.op !== "assert") continue;
		const error = reservedWriteError(operation);
		if (error) return error;
	}
};
//#endregion
export { isJournalSuppressed, isReservedAttribute, isReservedEntityId, isReservedEntityType, isSystemWriteAuthorized, reservedAssertError, reservedWriteError, reservedWriteReason, transactSystem, transactSystemUnjournaled };

//# sourceMappingURL=systemNamespace.js.map
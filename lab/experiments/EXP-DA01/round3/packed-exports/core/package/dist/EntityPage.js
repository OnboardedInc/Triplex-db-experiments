import { resolveTemporalBasis } from "./Temporal.js";
import { PaginationCursorError } from "./errors/index.js";
import { Domain, hash } from "./content/ContentId.js";
import { Result } from "effect";
import { Base64Url } from "effect/encoding";
//#region src/EntityPage.ts
const decoder = new TextDecoder();
const encoder = new TextEncoder();
const cursorError = (message, cause) => new PaginationCursorError({
	reason: "malformed",
	message,
	...cause === void 0 ? {} : { cause }
});
const decode = (cursor) => {
	try {
		const bytes = Base64Url.decode(cursor);
		if (Result.isFailure(bytes)) throw bytes.failure;
		const value = JSON.parse(decoder.decode(bytes.success));
		if (typeof value !== "object" || value === null || !("version" in value) || value.version !== 1 || !("scope" in value) || typeof value.scope !== "string" || !("entityType" in value) || typeof value.entityType !== "string" || !("after" in value) || typeof value.after !== "string" || !("recordedAt" in value) || typeof value.recordedAt !== "number" || !("recordedPosition" in value) || typeof value.recordedPosition !== "number" || !("validAt" in value) || typeof value.validAt !== "number" || !Number.isFinite(value.recordedAt) || !Number.isSafeInteger(value.recordedPosition) || value.recordedPosition < 0 || !Number.isFinite(value.validAt)) throw cursorError("Entity page cursor has an invalid shape");
		return value;
	} catch (cause) {
		if (cause instanceof PaginationCursorError) throw cause;
		throw cursorError("Entity page cursor is not valid base64url JSON", cause);
	}
};
const scopeFingerprint = (scope) => hash(Domain.paginationScope, `entity-page\u0000${scope}`);
const prepareEntityPage = (input) => {
	const limit = input.request.limit ?? 50;
	if (!Number.isSafeInteger(limit) || limit < 1 || limit > 200) throw cursorError("Entity page limit must be between 1 and 200");
	if (input.request.entityType.length === 0) throw cursorError("Entity type must not be empty");
	const expectedScope = scopeFingerprint(input.scope);
	const envelope = input.request.cursor === void 0 ? void 0 : decode(input.request.cursor);
	if (envelope !== void 0) {
		if (envelope.scope !== expectedScope) throw new PaginationCursorError({
			reason: "scope_mismatch",
			message: "Entity page cursor belongs to a different database scope"
		});
		if (envelope.entityType !== input.request.entityType) throw new PaginationCursorError({
			reason: "query_mismatch",
			message: "Entity page cursor belongs to a different entity type"
		});
		if (input.request.basis !== void 0) {
			if (input.request.basis.recordedAt !== void 0 && input.request.basis.recordedAt !== envelope.recordedAt || input.request.basis.validAt !== void 0 && input.request.basis.validAt !== envelope.validAt) throw new PaginationCursorError({
				reason: "basis_mismatch",
				message: "Entity page cursor cannot be reused with a different temporal basis"
			});
		}
		return {
			entityType: input.request.entityType,
			limit,
			after: envelope.after,
			basis: {
				recordedAt: envelope.recordedAt,
				recordedPosition: envelope.recordedPosition,
				validAt: envelope.validAt
			},
			scope: expectedScope
		};
	}
	const requested = resolveTemporalBasis(input.request.basis, input.now);
	return {
		entityType: input.request.entityType,
		limit,
		basis: {
			recordedAt: requested.recordedAt ?? input.now,
			recordedPosition: input.recordedPosition,
			validAt: requested.validAt
		},
		scope: expectedScope
	};
};
const encodeEntityPageCursor = (prepared, after) => Base64Url.encode(encoder.encode(JSON.stringify({
	version: 1,
	scope: prepared.scope,
	entityType: prepared.entityType,
	after,
	recordedAt: prepared.basis.recordedAt,
	recordedPosition: prepared.basis.recordedPosition,
	validAt: prepared.basis.validAt
})));
//#endregion
export { encodeEntityPageCursor, prepareEntityPage };

//# sourceMappingURL=EntityPage.js.map
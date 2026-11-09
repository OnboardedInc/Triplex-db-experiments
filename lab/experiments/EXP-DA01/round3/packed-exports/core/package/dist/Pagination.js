import { encodeOrThrow } from "./content/CanonicalJson.js";
import { resolveTemporalBasis } from "./Temporal.js";
import { PaginationCursorError } from "./errors/index.js";
import { Domain, hash } from "./content/ContentId.js";
import { IntegerValue } from "./Value.js";
import { Result, Schema } from "effect";
import { Base64Url } from "effect/encoding";
//#region src/Pagination.ts
/** Public reads default to 100 rows and never exceed 1,000 rows per page. */
const DEFAULT_QUERY_PAGE_SIZE = 100;
const MAX_QUERY_PAGE_SIZE = 1e3;
/** Preserve the raw query's limit/offset as a logical subquery boundary. */
const wrapDatalogQuery = (query, options) => ({
	inner: query,
	...query.orderBy === void 0 ? {} : { orderBy: query.orderBy },
	...options?.pageSize === void 0 ? {} : { limit: options.pageSize },
	...options?.cursor === void 0 ? {} : { cursor: options.cursor }
});
const PaginationValueSchema = Schema.Union([
	Schema.String,
	Schema.Number,
	Schema.Boolean,
	Schema.Null,
	IntegerValue
]);
const PaginationCursorEnvelopeSchema = Schema.Struct({
	version: Schema.Number,
	queryFingerprint: Schema.String,
	scopeFingerprint: Schema.String,
	basis: Schema.Struct({
		recordedAt: Schema.Number,
		recordedPosition: Schema.Number,
		validAt: Schema.Number
	}),
	values: Schema.Array(PaginationValueSchema)
});
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
const withoutCursor = (query) => {
	const { cursor: _cursor, ...rest } = query;
	return rest;
};
const projectedVariables = (query) => {
	const variables = [];
	const add = (value) => {
		if (typeof value === "string" && value.startsWith("?") && !variables.includes(value)) variables.push(value);
	};
	query.inner.find.forEach(add);
	query.inner.aggregate?.forEach(([, , target]) => add(target));
	query.inner.optionalProjection?.fields.forEach(({ variable }) => add(variable));
	return variables;
};
/**
* Complete a caller's ordering with every projected variable. Datalog results
* are set-valued, so the complete projected row is a deterministic unique
* tie-breaker even when the caller's primary sort values are equal.
*/
const normalizePaginationOrder = (query) => {
	const projected = projectedVariables(query);
	const order = [];
	for (const item of query.orderBy ?? []) {
		if (!projected.includes(item.variable)) throw new PaginationCursorError({
			reason: "invalid_ordering",
			message: `Pagination order variable ${item.variable} is not projected by the query`
		});
		if (!order.some(({ variable }) => variable === item.variable)) order.push(item);
	}
	for (const variable of projected) if (!order.some((item) => item.variable === variable)) order.push({
		variable,
		direction: "asc"
	});
	return order;
};
const queryFingerprint = (query, basis) => hash(Domain.paginationCursor, encodeOrThrow({
	query,
	basis: {
		recordedAt: basis.recordedAt,
		recordedPosition: basis.recordedPosition,
		validAt: basis.validAt
	}
}));
const scopeFingerprint = (scope) => hash(Domain.paginationScope, scope);
const decodeEnvelope = (cursor) => {
	let unknown;
	try {
		const decoded = Base64Url.decode(cursor);
		if (Result.isFailure(decoded)) throw decoded.failure;
		unknown = JSON.parse(textDecoder.decode(decoded.success));
	} catch (cause) {
		throw new PaginationCursorError({
			reason: "malformed",
			message: "Pagination cursor is not valid base64url JSON",
			cause
		});
	}
	const result = Schema.decodeUnknownResult(PaginationCursorEnvelopeSchema)(unknown);
	if (Result.isFailure(result)) throw new PaginationCursorError({
		reason: "malformed",
		message: `Pagination cursor has an invalid shape: ${result.failure.message}`,
		cause: result.failure
	});
	if (result.success.version !== 1) throw new PaginationCursorError({
		reason: "unsupported_version",
		message: `Unsupported pagination cursor version ${result.success.version}`
	});
	const { basis, values } = result.success;
	if (!Number.isFinite(basis.recordedAt) || basis.recordedAt < 0 || !Number.isFinite(basis.validAt) || basis.validAt < 0 || !Number.isSafeInteger(basis.recordedPosition) || basis.recordedPosition < 0 || values.some((value) => typeof value === "number" && !Number.isFinite(value))) throw new PaginationCursorError({
		reason: "malformed",
		message: "Pagination cursor contains an invalid temporal basis or ordering value"
	});
	return result.success;
};
const preparePagination = (input) => {
	if (!Number.isSafeInteger(input.recordedPosition) || input.recordedPosition < 0) throw new PaginationCursorError({
		reason: "malformed",
		message: "Pagination requires a non-negative safe commit position"
	});
	const pageSize = input.query.limit ?? 100;
	if (!Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 1e3) throw new PaginationCursorError({
		reason: "malformed",
		message: `Query page size must be an integer between 1 and ${MAX_QUERY_PAGE_SIZE}`
	});
	const orderBy = normalizePaginationOrder(input.query);
	const inner = input.query.inner;
	const stableInner = inner.limit === void 0 && inner.offset === void 0 ? inner : {
		...inner,
		orderBy: normalizePaginationOrder({
			inner,
			...inner.orderBy === void 0 ? {} : { orderBy: inner.orderBy }
		})
	};
	const baseQuery = withoutCursor({
		...input.query,
		inner: stableInner,
		limit: pageSize,
		orderBy: [...orderBy]
	});
	const envelope = input.query.cursor === void 0 ? void 0 : decodeEnvelope(input.query.cursor);
	let basis;
	if (envelope !== void 0) {
		basis = envelope.basis;
		if (input.basis !== void 0) {
			const requested = input.basis;
			if (requested.recordedAt !== void 0 && requested.recordedAt !== basis.recordedAt || requested.validAt !== void 0 && requested.validAt !== basis.validAt) throw new PaginationCursorError({
				reason: "basis_mismatch",
				message: "Pagination cursor cannot be reused with a different temporal basis"
			});
		}
	} else {
		const resolved = resolveTemporalBasis(input.basis, input.now);
		basis = {
			recordedAt: resolved.recordedAt ?? input.now,
			recordedPosition: input.recordedPosition,
			validAt: resolved.validAt
		};
	}
	const expectedQueryFingerprint = queryFingerprint(baseQuery, basis);
	const expectedScopeFingerprint = scopeFingerprint(input.scope);
	if (envelope !== void 0 && envelope.scopeFingerprint !== expectedScopeFingerprint) throw new PaginationCursorError({
		reason: "scope_mismatch",
		message: "Pagination cursor belongs to a different database scope"
	});
	if (envelope !== void 0 && envelope.queryFingerprint !== expectedQueryFingerprint) throw new PaginationCursorError({
		reason: "query_mismatch",
		message: "Pagination cursor belongs to a different query"
	});
	if (envelope !== void 0 && envelope.values.length !== orderBy.length) throw new PaginationCursorError({
		reason: "malformed",
		message: "Pagination cursor does not contain the complete deterministic ordering key"
	});
	return {
		query: {
			...baseQuery,
			limit: pageSize + 1
		},
		logicalQuery: baseQuery,
		basis,
		orderBy,
		...envelope === void 0 ? {} : { cursorValues: envelope.values },
		queryFingerprint: expectedQueryFingerprint,
		scopeFingerprint: expectedScopeFingerprint,
		pageSize
	};
};
const encodeEnvelope = (envelope) => Base64Url.encode(textEncoder.encode(JSON.stringify(envelope)));
const finishPagination = (prepared, result) => {
	if (result.results.length <= prepared.pageSize) return result;
	const results = result.results.slice(0, prepared.pageSize);
	const last = results.at(-1);
	const values = prepared.orderBy.map(({ variable }) => last[variable] ?? null);
	const nextCursor = encodeEnvelope({
		version: 1,
		queryFingerprint: prepared.queryFingerprint,
		scopeFingerprint: prepared.scopeFingerprint,
		basis: prepared.basis,
		values
	});
	return {
		...result,
		results,
		nextCursor,
		...result.debug === void 0 ? {} : { debug: {
			...result.debug,
			resultCount: results.length
		} }
	};
};
//#endregion
export { DEFAULT_QUERY_PAGE_SIZE, MAX_QUERY_PAGE_SIZE, finishPagination, normalizePaginationOrder, preparePagination, wrapDatalogQuery };

//# sourceMappingURL=Pagination.js.map
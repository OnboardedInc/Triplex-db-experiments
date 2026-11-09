import { __exportAll } from "../_virtual/_rolldown/runtime.js";
import { unsafe } from "../Branded.js";
import { encode } from "../content/CanonicalJson.js";
import { Domain, hash } from "../content/ContentId.js";
import { isNotClause, isPatternClause } from "../datalog/schema.js";
import { Triples } from "../store/Triples.js";
import { KvTriples } from "../kv/layers/KvTriplesLive.js";
import { evaluate } from "./Derivation.js";
import { Context, Data, Effect, Layer, Option } from "effect";
//#region src/derivation/Overlay.ts
/** Read-only hypothetical facts evaluated through the normal KV Datalog engine. */
var Overlay_exports = /* @__PURE__ */ __exportAll({
	InvalidOverlayError: () => InvalidOverlayError,
	UnsupportedOverlayDefinitionError: () => UnsupportedOverlayDefinitionError,
	evaluateOverlay: () => evaluateOverlay
});
var InvalidOverlayError = class extends Data.TaggedError("InvalidDerivationOverlayError") {};
var UnsupportedOverlayDefinitionError = class extends Data.TaggedError("UnsupportedDerivationOverlayDefinitionError") {};
const patternsUseTransactions = (definition) => definition.query.where.some((clause) => {
	if (isPatternClause(clause)) return clause.length === 4;
	if (!isNotClause(clause)) return false;
	return clause.slice(1).some((inner) => Array.isArray(inner) && inner.length === 4);
});
const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const tripleIdFromContentId = (contentId) => {
	let value = BigInt(`0x${contentId.slice(7, 39)}`);
	let encoded = "";
	for (let index = 0; index < 26; index += 1) {
		encoded = CROCKFORD[Number(value & 31n)] + encoded;
		value >>= 5n;
	}
	return unsafe.tripleId(encoded);
};
const overlayFactIdentity = (input) => encode(input).pipe(Effect.map((encoded) => {
	const contentId = hash(Domain.derivationOverlayFact, encoded);
	return {
		contentId,
		id: tripleIdFromContentId(contentId)
	};
}));
const inputFrom = (triple) => ({
	entityId: triple.entityId,
	attribute: triple.attribute,
	value: triple.value,
	...Option.isSome(triple.entityType) ? { entityType: triple.entityType.value } : {},
	...Option.isSome(triple.createdBy) ? { createdBy: triple.createdBy.value } : {},
	validFrom: triple.validFrom,
	...Option.isSome(triple.validTo) ? { validTo: triple.validTo.value } : {}
});
/**
* Evaluate temporary assertions and retractions without writing to `triples`.
*
* The overlay copies only fixed attributes discovered from the definition into
* a fresh in-memory indexed store, applies the patch, and delegates query
* execution to the same KV Datalog evaluator used by the normal backend. Match
* reads are translated back to original or deterministic hypothetical triples
* so candidate provenance remains meaningful.
*/
const evaluateOverlay = (triples, definition, options) => Effect.gen(function* () {
	if (definition.dependencies.hasDynamicAttributes) return yield* new UnsupportedOverlayDefinitionError({
		definition: definition.id,
		message: "Hypothetical evaluation requires statically discoverable attributes"
	});
	if (patternsUseTransactions(definition)) return yield* new UnsupportedOverlayDefinitionError({
		definition: definition.id,
		message: "Hypothetical evaluation does not support transaction-binding clauses"
	});
	const attributes = new Set(definition.dependencies.attributes);
	const assertions = options.overlay.assertions ?? [];
	const resolvedAssertions = assertions.map((assertion) => ({
		...assertion,
		validFrom: assertion.validFrom ?? options.basis.validAt
	}));
	const retractionIds = new Set(options.overlay.retractions ?? []);
	for (const assertion of assertions) if (!attributes.has(assertion.attribute)) return yield* new InvalidOverlayError({ message: `Overlay assertion attribute ${assertion.attribute} is not read by ${definition.name}` });
	if (retractionIds.size !== (options.overlay.retractions ?? []).length) return yield* new InvalidOverlayError({ message: "Overlay retractions contain duplicate IDs" });
	const matched = yield* Effect.forEach([...attributes].sort(), (attribute) => triples.match({ attribute }, options.basis), { concurrency: 16 });
	const baseById = new Map(matched.flat().map((triple) => [String(triple.id), triple]));
	for (const id of retractionIds) if (!baseById.has(id)) return yield* new InvalidOverlayError({ message: `Overlay retraction ${id} is not visible at the requested basis` });
	const visibleBase = [...baseById.values()].filter((triple) => !retractionIds.has(String(triple.id)));
	const temporalBoundaries = [...visibleBase.flatMap((triple) => Option.isSome(triple.validTo) ? [triple.validTo.value] : []), ...resolvedAssertions.flatMap((assertion) => [assertion.validFrom, assertion.validTo])].filter((boundary) => boundary !== void 0 && boundary > options.basis.validAt);
	const nextTemporalBoundary = temporalBoundaries.length === 0 ? void 0 : Math.min(...temporalBoundaries);
	const hypotheticalIdentities = yield* Effect.forEach(resolvedAssertions, overlayFactIdentity);
	if (new Set(hypotheticalIdentities.map((identity) => identity.contentId)).size !== hypotheticalIdentities.length) return yield* new InvalidOverlayError({ message: "Overlay assertions contain duplicate canonical facts" });
	return yield* Effect.scoped(Effect.gen(function* () {
		const context = yield* Layer.build(Layer.fresh(KvTriples.layer));
		const memory = Context.get(context, Triples);
		const seeded = yield* memory.assertBatch([...visibleBase.map(inputFrom), ...resolvedAssertions]);
		const translated = /* @__PURE__ */ new Map();
		const hypotheticalContentIds = /* @__PURE__ */ new Map();
		for (const [index, original] of visibleBase.entries()) translated.set(String(seeded[index].id), original);
		for (const [index, identity] of hypotheticalIdentities.entries()) {
			const ephemeral = seeded[visibleBase.length + index];
			translated.set(String(ephemeral.id), {
				...ephemeral,
				id: identity.id,
				txId: Option.none(),
				createdBy: Option.none()
			});
			hypotheticalContentIds.set(String(identity.id), identity.contentId);
		}
		const viewBasis = { validAt: options.basis.validAt };
		return yield* evaluate({
			queryAll: (query, queryOptions) => memory.queryAll(query, {
				...queryOptions,
				basis: viewBasis
			}),
			match: (pattern) => memory.match(pattern, viewBasis).pipe(Effect.map((rows) => rows.map((row) => translated.get(String(row.id)) ?? row))),
			transaction: (txId) => triples.transaction(txId),
			temporalBoundary: () => Effect.succeed(nextTemporalBoundary),
			sourceMetadata: (triple) => {
				const hypotheticalContentId = hypotheticalContentIds.get(String(triple.id));
				return hypotheticalContentId === void 0 ? {} : {
					hypothetical: true,
					hypotheticalContentId
				};
			}
		}, definition, { basis: options.basis });
	}));
});
//#endregion
export { InvalidOverlayError, Overlay_exports, UnsupportedOverlayDefinitionError, evaluateOverlay };

//# sourceMappingURL=Overlay.js.map
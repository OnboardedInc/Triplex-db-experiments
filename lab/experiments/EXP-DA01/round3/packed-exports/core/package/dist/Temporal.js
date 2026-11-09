import { Schema } from "effect";
//#region src/Temporal.ts
/**
* The two independent axes used to read bitemporal facts.
*
* `recordedAt` asks what the database knew at an instant. When omitted, reads
* use the latest recorded state. `validAt` asks what was true in business
* time. Public read APIs resolve an omitted value to their clock's current
* instant before reaching a backend.
*/
const TemporalBasis = Schema.Struct({
	recordedAt: Schema.optional(Schema.Number),
	validAt: Schema.optional(Schema.Number)
});
const validateTemporalInstant = (name, value) => {
	if (!Number.isFinite(value) || value < 0) throw new Error(`${name} must be a non-negative finite epoch-millisecond instant`);
};
const resolveTemporalBasis = (basis, now) => {
	validateTemporalInstant("current time", now);
	if (basis?.recordedAt !== void 0) validateTemporalInstant("recordedAt", basis.recordedAt);
	if (basis?.validAt !== void 0) validateTemporalInstant("validAt", basis.validAt);
	return {
		...basis?.recordedAt !== void 0 ? { recordedAt: basis.recordedAt } : {},
		validAt: basis?.validAt ?? now
	};
};
//#endregion
export { TemporalBasis, resolveTemporalBasis, validateTemporalInstant };

//# sourceMappingURL=Temporal.js.map
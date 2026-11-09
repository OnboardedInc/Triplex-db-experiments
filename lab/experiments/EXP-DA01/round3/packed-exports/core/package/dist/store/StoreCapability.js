import { Data } from "effect";
//#region src/store/StoreCapability.ts
/**
* StoreCapability — composable triple store capability system.
*
* A capability is a function that takes a `TriplesService` and returns an
* enhanced `TriplesService`. Each capability:
*
* 1. Wraps the inner store's methods to add behavior (before/after hooks)
* 2. Preserves the `TriplesService` interface for the next capability
*
* Capabilities are composed by sorting by priority (higher = outermost) and
* folding over the base store. Dependencies are validated at composition time.
*
*/
var CapabilityError = class extends Data.TaggedError("CapabilityError") {};
/**
* Validate that all capability dependencies are satisfied.
* Throws CapabilityError if a required capability is missing.
*/
const validateDependencies = (capabilities) => {
	const provided = new Set(capabilities.map((c) => c.name));
	for (const cap of capabilities) for (const req of cap.requires) if (!provided.has(req)) throw new CapabilityError({ message: `Capability "${cap.name}" requires "${req}" but it is not in the composition` });
	const seen = /* @__PURE__ */ new Set();
	for (const cap of capabilities) {
		if (seen.has(cap.name)) throw new CapabilityError({ message: `Duplicate capability name: "${cap.name}"` });
		seen.add(cap.name);
	}
};
/**
* Compose capabilities over a base TriplesService.
*
* Capabilities are sorted by priority (lowest = closest to base, highest = outermost).
* This means capabilities with higher priority see the result of capabilities with
* lower priority, and are the first to intercept operations from callers.
*
* Current ordering (outermost → innermost):
*   EntitySnapshots (60) → ChangeEmission (50) → Base (0)
*
* @param base - The base TriplesService (raw service without decorators)
* @param capabilities - Capabilities to compose over the base
* @returns The fully-composed TriplesService
*/
const composeStore = (base, ...capabilities) => {
	validateDependencies(capabilities);
	return [...capabilities].sort((a, b) => a.priority - b.priority).reduce((inner, cap) => cap.wrap(inner), base);
};
/**
* Describe the active capability stack for diagnostics.
* Returns capabilities in execution order (outermost first).
*/
const describeCapabilities = (capabilities) => {
	return [...capabilities].sort((a, b) => b.priority - a.priority).map((c) => ({
		name: c.name,
		priority: c.priority,
		requires: c.requires
	}));
};
//#endregion
export { CapabilityError, composeStore, describeCapabilities, validateDependencies };

//# sourceMappingURL=StoreCapability.js.map
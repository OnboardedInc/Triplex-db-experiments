import { TriplesService } from "./Triples.js";
import * as _$effect_Types0 from "effect/Types";
import * as _$effect_Cause0 from "effect/Cause";

//#region src/store/StoreCapability.d.ts
declare const CapabilityError_base: new <A extends Record<string, any> = {}>(args: _$effect_Types0.VoidIfEmpty<{ readonly [P in keyof A as P extends "_tag" ? never : P]: A[P] }>) => _$effect_Cause0.YieldableError & {
  readonly _tag: "CapabilityError";
} & Readonly<A>;
declare class CapabilityError extends CapabilityError_base<{
  readonly message: string;
}> {}
/**
 * A composable capability that decorates a TriplesService.
 *
 * The `wrap` function receives the inner store and returns an enhanced store.
 * Capabilities declare:
 * - `name`: unique identifier
 * - `priority`: ordering hint (higher = outermost in the decoration stack)
 * - `requires`: names of capabilities that must also be present
 * - `wrap`: the decorator function
 */
interface StoreCapability {
  readonly name: string;
  readonly priority: number;
  readonly requires: ReadonlyArray<string>;
  readonly wrap: (inner: TriplesService) => TriplesService;
}
/**
 * Validate that all capability dependencies are satisfied.
 * Throws CapabilityError if a required capability is missing.
 */
declare const validateDependencies: (capabilities: readonly StoreCapability[]) => void;
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
declare const composeStore: (base: TriplesService, ...capabilities: StoreCapability[]) => TriplesService;
/**
 * Describe the active capability stack for diagnostics.
 * Returns capabilities in execution order (outermost first).
 */
declare const describeCapabilities: (capabilities: readonly StoreCapability[]) => ReadonlyArray<{
  name: string;
  priority: number;
  requires: ReadonlyArray<string>;
}>;
//#endregion
export { CapabilityError, StoreCapability, composeStore, describeCapabilities, validateDependencies };
//# sourceMappingURL=StoreCapability.d.ts.map
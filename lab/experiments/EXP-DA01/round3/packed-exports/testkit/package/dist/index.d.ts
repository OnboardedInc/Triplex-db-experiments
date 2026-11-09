import { RouteFixture, RouteRead, canonicalRouteValue, makeRouteEquivalenceCases } from "./routeEquivalence.js";
import { RouteHistoryCommand, RouteHistoryOperation, makeRouteEquivalenceScenario } from "./routeHistory.js";
import { Effect } from "effect";
import { Triples } from "@triplex-build/triplex";
import { CapabilitySet, ChangeEmitter, RuntimeDefinition, RuntimeOptions, SnapshotService, SnapshotWriter, TripleStoreRuntime } from "@triplex-build/triplex/runtime";

//#region src/index.d.ts
interface DatabaseBackendFixture {
  readonly name: string;
  readonly capabilities?: readonly string[];
}
declare const defineBackendFixture: (fixture: DatabaseBackendFixture) => DatabaseBackendFixture;
declare const expectBackendCapability: (fixture: DatabaseBackendFixture, capability: string) => boolean;
/**
 * A single conformance behavior: a label plus the `Triples`-requiring effect
 * that verifies it. Exposed individually so a test runner can turn each into
 * its own `it`/`test` case if desired.
 */
interface ConformanceCase {
  readonly name: string;
  readonly run: Effect.Effect<void, unknown, Triples>;
}
/**
 * The behavioral cases every `Triples` backend must pass.
 */
declare const triplesConformanceCases: readonly ConformanceCase[];
/**
 * Build the full conformance suite as one `Effect` requiring a `Triples`
 * service. Provide a backend's `Layer<Triples>` and run it:
 *
 * ```ts
 * await Effect.runPromise(
 *   makeTriplesConformanceSuite().pipe(Effect.provide(KvTriples.layer), Effect.scoped),
 * )
 * ```
 */
declare const makeTriplesConformanceSuite: () => Effect.Effect<void, unknown, Triples>;
/** Run against a fresh isolated runtime. Includes only the shared Triples contract. */
declare function runtimeConformance<E, R, Provided>(runtime: RuntimeDefinition<E, R, Provided>, options: RuntimeOptions & {
  readonly capabilities?: never;
}): Effect.Effect<void, unknown, R | SnapshotService | SnapshotWriter | ChangeEmitter>;
declare function runtimeConformance<E, R, Provided, O, CE, CR>(runtime: RuntimeDefinition<E, R, Provided>, options: RuntimeOptions & {
  readonly capabilities: CapabilitySet<O, CE, CR>;
}): Effect.Effect<void, unknown, R | Exclude<CR, Triples | TripleStoreRuntime | Provided>>;
//#endregion
export { ConformanceCase, DatabaseBackendFixture, type RouteFixture, type RouteHistoryCommand, type RouteHistoryOperation, type RouteRead, canonicalRouteValue, defineBackendFixture, expectBackendCapability, makeRouteEquivalenceCases, makeRouteEquivalenceScenario, makeTriplesConformanceSuite, runtimeConformance, triplesConformanceCases };
//# sourceMappingURL=index.d.ts.map
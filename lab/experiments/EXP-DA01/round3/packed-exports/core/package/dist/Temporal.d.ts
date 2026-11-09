import { Schema } from "effect";

//#region src/Temporal.d.ts
/**
 * The two independent axes used to read bitemporal facts.
 *
 * `recordedAt` asks what the database knew at an instant. When omitted, reads
 * use the latest recorded state. `validAt` asks what was true in business
 * time. Public read APIs resolve an omitted value to their clock's current
 * instant before reaching a backend.
 */
declare const TemporalBasis: Schema.Struct<{
  readonly recordedAt: Schema.optional<Schema.Number>;
  readonly validAt: Schema.optional<Schema.Number>;
}>;
type TemporalBasis = typeof TemporalBasis.Type;
/** A basis whose business-time instant has been resolved by the caller. */
interface ResolvedTemporalBasis {
  readonly recordedAt?: number;
  /** Internal exact commit cut used by snapshot-stable pagination. */
  readonly recordedPosition?: number;
  readonly validAt: number;
}
/** Effective read cut. Public runtimes supply their validated database scope;
 * legacy low-level layers retain their existing opaque string scope. A basis
 * is not a database selector and does not serialize a pending overlay.
 * See qualification/evidence/read-basis-scope-brand-noemit-failure-v1.json. */
interface ReadBasis extends ResolvedTemporalBasis {
  readonly scope: string;
  readonly recordedPosition: number;
}
declare const validateTemporalInstant: (name: string, value: number) => void;
declare const resolveTemporalBasis: (basis: TemporalBasis | undefined, now: number) => ResolvedTemporalBasis;
//#endregion
export { ReadBasis, ResolvedTemporalBasis, TemporalBasis, resolveTemporalBasis, validateTemporalInstant };
//# sourceMappingURL=Temporal.d.ts.map
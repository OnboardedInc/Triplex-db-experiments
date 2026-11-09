import { TripleId } from "../Branded.js";
import { Triple } from "../Triple.js";
import { TripleValue } from "../Value.js";
import { ContentId } from "../content/ContentId.js";
import { ProjectionSpec } from "./ProjectionSpec.js";

//#region src/entity/Plan.d.ts
declare namespace Plan_d_exports {
  export { AttributePlan, Completeness, Engine, EntityPlan, Incompleteness, Interval, InvalidAssertion, PerEngine, PlanInput, ProjectedValue, ProjectionPlan, Segment, TypeMembershipPlan, partialSet, planProjection, rowSegments };
}
/** The two projection engines. `rdf` is the QLever current graph. */
type Engine = "xtdb" | "rdf";
/** A half-open valid-time interval `[from, to)` in epoch milliseconds; no `to` means open-ended. */
interface Interval {
  readonly from: number;
  readonly to?: number;
}
/**
 * Why an attribute (or a whole entity) cannot be served from an engine's projection. Any reason
 * makes the pair partial for that engine: a query that references the attribute takes the exact
 * ledger path (C1 completeness is query-wide).
 * - `conflict`: card-one with two or more distinct live values in some segment (C5.2).
 * - `type-violation`: a live value does not satisfy the declared type; it is not projected.
 * - `inexact-value`: a valid value the engine's declared type cannot hold exactly (spec rules).
 * - `inexact-coordinate`: a valid-time boundary the engine cannot store exactly (XTDB sub-µs).
 * - `inexact-entity-id`: the entity id cannot be an `_id` / IRI exactly (not well-formed Unicode).
 * - `mixed-membership`: the entity is a member of more than one entity type (the codec rejects it).
 * - `stale`: lane-only; the planner never emits it. A lane adds it while its projection is behind
 *   (QLever: marker in MAINTAINING, or the read's valid instant past `nextBoundary`).
 */
type Incompleteness = "conflict" | "type-violation" | "inexact-value" | "inexact-coordinate" | "inexact-entity-id" | "mixed-membership" | "stale";
type Completeness = {
  readonly complete: true;
} | {
  readonly complete: false;
  readonly reasons: ReadonlyArray<Incompleteness>;
};
type PerEngine<A> = { readonly [E in Engine]: A };
/** One distinct value of an attribute inside a segment, with its supports. */
interface ProjectedValue {
  /**
   * Equality key: canonical JSON of the typed value, the rule `EntityCodec` dedupes with, so
   * equal duplicates are one value with several supports (C5.1).
   */
  readonly key: string;
  /** The exact typed value projected. When supports differ only in representation, EXP-R02 fixes the pick. */
  readonly value: TripleValue;
  /** Number of live assertions supporting this value during the segment (at least 1). */
  readonly supports: number;
  /** Supporting assertion ids, ascending. Retracting one of two keeps the value. */
  readonly assertionIds: ReadonlyArray<TripleId>;
  /** Spec exactness verdict per engine. */
  readonly exact: PerEngine<boolean>;
}
/**
 * A maximal piecewise-constant valid-time segment of one attribute. Adjacent segments with the
 * same value set (by key) are coalesced; segments with no value are omitted.
 */
interface Segment extends Interval {
  /** Distinct type-valid values, ascending by `key`. Card-one has one value unless conflicted. */
  readonly values: ReadonlyArray<ProjectedValue>;
  /** Card-one with two or more distinct values: the raw projection writes no scalar (C5.4). */
  readonly conflict: boolean;
}
/** A live assertion whose value violates the declared type; it is not projected. */
interface InvalidAssertion extends Interval {
  readonly assertionId: TripleId;
  readonly value: TripleValue;
  readonly reason: string;
}
interface AttributePlan {
  readonly key: string;
  readonly cardinality: "one" | "many";
  /** Segments clipped to the entity's membership intervals of this type. */
  readonly segments: ReadonlyArray<Segment>;
  readonly invalid: ReadonlyArray<InvalidAssertion>;
  readonly status: PerEngine<Completeness>;
}
interface TypeMembershipPlan {
  readonly entityType: string;
  /** Valid-time intervals during which a live fact tags the entity with this type. */
  readonly intervals: ReadonlyArray<Interval>;
  /** One plan per declared attribute of the type, sorted by key (also when it has no values). */
  readonly attributes: ReadonlyArray<AttributePlan>;
  /** Valid-time coordinate exactness of the membership and segment boundaries, per engine. */
  readonly coordinates: PerEngine<Completeness>;
}
interface EntityPlan {
  readonly entityId: string;
  /** Memberships in projected types, sorted by entity type. Empty: delete every projection row. */
  readonly memberships: ReadonlyArray<TypeMembershipPlan>;
  /** Entity types on live facts that the spec does not project (informational). */
  readonly unprojectedTypes: ReadonlyArray<string>;
  /** Entity-level status per engine (`inexact-entity-id`, `mixed-membership`). */
  readonly status: PerEngine<Completeness>;
  /** Every distinct finite segment and membership edge, ascending; lanes derive staleness from it. */
  readonly boundaries: ReadonlyArray<number>;
}
interface ProjectionPlan {
  readonly specId: ContentId;
  /** One plan per touched entity, sorted by entity id (UTF-16 code-unit order, as `entityPage`). */
  readonly entities: ReadonlyArray<EntityPlan>;
}
interface PlanInput {
  readonly spec: ProjectionSpec;
  /** Entities whose projection must be recomputed (touched by the transaction). */
  readonly touched: ReadonlyArray<string>;
  /**
   * The full live assertion set of every touched entity at the newest position: not retracted,
   * every valid-time interval (both clocks resolved at the newest position). Reserved entity
   * ids, reserved types and journal facts are ignored.
   */
  readonly facts: ReadonlyArray<Triple>;
}
/** Pure planner. Deferred to EXP-R02; the stub throws `NotImplementedError`. */
declare const planProjection: (_input: PlanInput) => ProjectionPlan;
/**
 * Per-type partial set for one engine: entity type to entity id to the attributes that are not
 * complete. C1 routes a query to the exact path when this set intersects the query's referenced
 * attributes. Deferred to EXP-R02.
 */
declare const partialSet: (_plan: ProjectionPlan, _engine: Engine) => ReadonlyMap<string, ReadonlyMap<string, ReadonlySet<string>>>;
/** Whole-row segments of one membership (all attribute edges merged), for timeline rewrites. Deferred to EXP-R02. */
declare const rowSegments: (_membership: TypeMembershipPlan) => ReadonlyArray<Interval & {
  readonly attributes: ReadonlyMap<string, Segment>;
}>;
//#endregion
export { AttributePlan, Completeness, Engine, EntityPlan, Incompleteness, Interval, InvalidAssertion, PerEngine, PlanInput, Plan_d_exports, ProjectedValue, ProjectionPlan, Segment, TypeMembershipPlan, partialSet, planProjection, rowSegments };
//# sourceMappingURL=Plan.d.ts.map
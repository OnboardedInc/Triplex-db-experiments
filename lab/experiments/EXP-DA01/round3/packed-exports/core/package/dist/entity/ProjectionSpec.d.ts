import { TripleValue } from "../Value.js";
import { ContentId } from "../content/ContentId.js";
import { TypeExpr } from "../config/TypeExpr.js";
import { ConfigSnapshot } from "../config/InMemoryConfigStore.js";
import { DescriptorCompileError, InexactValueError, ProjectionSpecError } from "./Errors.js";
import { StorageFamily } from "./Descriptors.js";
import { Effect } from "effect";

//#region src/entity/ProjectionSpec.d.ts
declare namespace ProjectionSpec_d_exports {
  export { AttributeSpec, AttributeUsageInput, CompileOptions, CoordinateSpec, Engine, EntityTypeInput, EntityTypeSpec, ExactnessRule, InexactPolicy, LAYOUT, NumericClass, Ordering, ProjectionSpec, RdfAttributeSpec, RdfObject, XtdbAttributeSpec, XtdbColumnType, attribute, compile, entityType, firstViolation, fromRelease, isExact, requireExact };
}
declare const LAYOUT: "triplex-projection/1";
type Engine = "xtdb" | "rdf";
/**
 * A condition a value must meet for an engine's declared type to store it and give it back
 * unchanged. An attribute's rule list is a conjunction; an empty list means every value of the
 * Triplex type is exact.
 */
type ExactnessRule = /** Strings (and entity ids) must be well-formed Unicode; UTF-8 engines cannot store lone surrogates. */{
  readonly _tag: "WellFormedUnicode";
} /** Entity ids must not be empty (an IRI segment cannot be empty). */ | {
  readonly _tag: "NonEmpty";
} /** Integers (JS number or int64 decimal) must lie in `[min, max]`, given as decimal text. */ | {
  readonly _tag: "IntegerRange";
  readonly min: string;
  readonly max: string;
} /** `-0` is not representable (integer columns). */ | {
  readonly _tag: "NoNegativeZero";
} /** NaN and ±Infinity are not representable (JSON wire for lists, integer and time columns). */ | {
  readonly _tag: "Finite";
}
/**
 * The engine stores binary64 with the low `droppedBits` mantissa bits cut off and exports
 * non-integral values with `significantDigits` significant digits. Exact only when both the
 * stored bits and the exported text give the same double back.
 */
| {
  readonly _tag: "DoubleRoundTrip";
  readonly droppedBits: number;
  readonly significantDigits: number;
} /** `YYYY-MM-DD` strings must be real calendar dates with a year in `[minYear, maxYear]`. */ | {
  readonly _tag: "CalendarDate";
  readonly minYear: number;
  readonly maxYear: number;
} /** Epoch-millisecond values must be integral and inside `[min, max]`. */ | {
  readonly _tag: "EpochMillis";
  readonly min: number;
  readonly max: number;
}
/**
 * Epoch-millisecond coordinates must be a whole number of microseconds: the shortest decimal
 * form of the double has at most three fractional digits. Lanes convert through that decimal
 * text (never `v * 1000` in floating point), so the round trip gives the same double back.
 */
| {
  readonly _tag: "MicrosecondGrid";
} /** Numbers (fractional allowed) must lie in `[min, max]`. */ | {
  readonly _tag: "NumberRange";
  readonly min: number;
  readonly max: number;
};
/** The first rule `value` fails, or `undefined` when the engine holds it exactly. */
declare const firstViolation: (rules: ReadonlyArray<ExactnessRule>, value: TripleValue | number | string) => ExactnessRule | undefined;
/**
 * Does `value` satisfy every rule? `value` is a typed fact value, a bare number (a valid-time
 * coordinate) or a bare string (an entity id). A rule that does not apply to the value's kind
 * holds vacuously; type violations are the codec's concern, not exactness.
 */
declare const isExact: (rules: ReadonlyArray<ExactnessRule>, value: TripleValue | number | string) => boolean;
/** Fail with a typed `InexactValueError` when `engine` cannot hold `value` exactly. */
declare const requireExact: (engine: Engine, rules: ReadonlyArray<ExactnessRule>, value: TripleValue | number | string) => Effect.Effect<void, InexactValueError>;
/** XTDB declared column type (SQL spelling). Card-many columns hold a list of this type. */
type XtdbColumnType = "VARCHAR" | "DATE" | "DOUBLE PRECISION" | "BIGINT" | "BOOLEAN" | "TIMESTAMP WITH TIME ZONE";
/** RDF object form: a typed literal, or an IRI (refs, encoded with the spec's entity rule). */
type RdfObject = {
  readonly kind: "literal";
  readonly datatype: string;
} | {
  readonly kind: "iri";
};
/**
 * How range comparisons and ordering on this attribute may run in the engine.
 * - `native`: the engine's comparison equals Triplex's on every exact value.
 * - `order-key`: the engine's comparison may differ (QLever ICU collation, R2 section 2; XTDB
 *   UTF-8 byte order versus JavaScript UTF-16 order above the BMP, R9 4.2, unprobed), so a range
 *   rule needs a maintained order key.
 * - `unordered`: no meaningful order (JSON).
 */
type Ordering = "native" | "order-key" | "unordered";
/**
 * Numeric class of an attribute (absent for non-numeric kinds). `approximate` is binary64: allowed
 * only for approximate values such as scores, never for business values (money is a scaled
 * integer, or later the decimal kind, EXP-R02). `exact-integer` is exact within the engine range.
 */
type NumericClass = "approximate" | "exact-integer";
interface XtdbAttributeSpec {
  readonly column: string;
  readonly type: XtdbColumnType;
  /** True for cardinality-many: the column is a list of `type`. */
  readonly list: boolean;
  /** How the value is carried: JSON values are canonical JSON text in a VARCHAR column. */
  readonly encoding: "native" | "canonical-json";
  readonly ordering: Ordering;
  readonly exactness: ReadonlyArray<ExactnessRule>;
}
interface RdfAttributeSpec {
  readonly predicate: string;
  readonly object: RdfObject;
  readonly encoding: "native" | "canonical-json";
  readonly ordering: Ordering;
  readonly exactness: ReadonlyArray<ExactnessRule>;
}
interface AttributeSpec {
  readonly key: string;
  readonly type: TypeExpr;
  readonly required: boolean;
  readonly cardinality: "one" | "many";
  readonly storage: StorageFamily;
  readonly numeric?: NumericClass;
  /** Target entity type of a ref attribute. */
  readonly refTarget?: string;
  readonly xtdb: XtdbAttributeSpec;
  readonly rdf: RdfAttributeSpec;
}
interface EntityTypeSpec {
  readonly entityType: string;
  readonly xtdb: {
    readonly table: string;
  };
  readonly rdf: {
    readonly class: string;
  };
  /** Sorted by key. */
  readonly attributes: ReadonlyArray<AttributeSpec>;
}
/** Exactness rules for coordinates that are not attribute values. */
interface CoordinateSpec {
  /** Rules for `validFrom` / `validTo` when the engine stores them natively. */
  readonly validTime: ReadonlyArray<ExactnessRule>;
  /** Rules for entity ids (`_id` in XTDB, the subject IRI in RDF). */
  readonly entityId: ReadonlyArray<ExactnessRule>;
}
/**
 * What a lane does with a value its engine cannot hold exactly. Both keep the ledger exact and
 * neither converts silently. `ledger-only` keeps the write and marks the entity partial (PLAN v1
 * C1); `reject` fails the write with `InexactValueError` (Sam's "error, don't convert").
 */
type InexactPolicy = "ledger-only" | "reject";
interface ProjectionSpec {
  readonly id: ContentId;
  readonly layout: typeof LAYOUT;
  readonly rdfBase: string;
  readonly inexactPolicy: InexactPolicy;
  /** Sorted by entity type name. */
  readonly entityTypes: ReadonlyArray<EntityTypeSpec>;
  readonly coordinates: {
    readonly xtdb: CoordinateSpec;
    readonly rdf: CoordinateSpec;
  };
}
/** One attribute usage: the global key and value type plus the entity-local flags. */
interface AttributeUsageInput {
  readonly key: string;
  readonly type: TypeExpr;
  readonly required: boolean;
  readonly cardinality: "one" | "many";
}
/**
 * An entity type as the compiler needs it. `EntityType.make(...)` objects (whose `attributes` is
 * a record of handles) and core `EntityDescriptor`s (an array) both satisfy this shape, so a spec
 * compiled from DSL handles and one compiled from a persisted release get the same id.
 * Aliases and `unique` are ignored on purpose (alias renames and constraint-only changes keep the
 * id; R9 decision D4).
 */
interface EntityTypeInput {
  readonly entityType: string;
  readonly attributes: ReadonlyArray<AttributeUsageInput> | Readonly<Record<string, AttributeUsageInput>>;
}
interface CompileOptions {
  /** Base for attribute, class and entity IRIs. Defaults to `urn:triplex:`. */
  readonly rdfBase?: string;
  /** Defaults to `ledger-only`. */
  readonly inexactPolicy?: InexactPolicy;
  /** `reject` fails the compile for any binary64 (`number`) attribute. Defaults to `allow`. */
  readonly approximateNumbers?: "allow" | "reject";
}
/**
 * Compile entity types into a projection spec. Fails, naming every offending input, on: XTDB
 * column collisions (`-` vs `_`), table collisions (case-folded names such as `ABTest`/`AbTest`),
 * reserved and SQL-keyword names, reserved namespaces, invalid names, duplicate types or usages,
 * one key used with two value types, refs to types not in the inputs, binary64 attributes when
 * `approximateNumbers` is `reject`, an invalid or ledger-overlapping `rdfBase`, and types with no
 * single physical type (`Any`, unions across storage families). The checks match the release path
 * (`fromRelease`), so both paths accept and reject the same inputs.
 */
declare const compile: (inputs: ReadonlyArray<EntityTypeInput>, options?: CompileOptions) => Effect.Effect<ProjectionSpec, ProjectionSpecError>;
/**
 * Compile the spec of a persisted release. Equal content gives the same id as compiling the
 * `EntityType` objects the release was built from (R9 section 3.2, option C).
 */
declare const fromRelease: (snapshot: ConfigSnapshot, options?: CompileOptions) => Effect.Effect<ProjectionSpec, ProjectionSpecError | DescriptorCompileError>;
/** The spec of one entity type, if projected. */
declare const entityType: (spec: ProjectionSpec, name: string) => EntityTypeSpec | undefined;
/** The spec of one attribute usage, if projected. */
declare const attribute: (spec: ProjectionSpec, entityTypeName: string, key: string) => AttributeSpec | undefined;
//#endregion
export { AttributeSpec, AttributeUsageInput, CompileOptions, CoordinateSpec, Engine, EntityTypeInput, EntityTypeSpec, ExactnessRule, InexactPolicy, LAYOUT, NumericClass, Ordering, ProjectionSpec, ProjectionSpec_d_exports, RdfAttributeSpec, RdfObject, XtdbAttributeSpec, XtdbColumnType, attribute, compile, entityType, firstViolation, fromRelease, isExact, requireExact };
//# sourceMappingURL=ProjectionSpec.d.ts.map
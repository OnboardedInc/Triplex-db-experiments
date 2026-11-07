/**
 * The projection spec: a content-addressed compile of entity types into physical names, one
 * declared physical type per attribute per engine, and the exactness rules each engine needs.
 *
 * [EXP-R01] Why: both lane projections (XTDB tables, QLever current graph) and the shared planner
 * read one spec, so names, types and exactness cannot drift between engines or deploys. The spec
 * id fences writers with a stale spec (R9 section 3.4). Sam's numeric rule (lab/SCOPE.md 2.4,
 * lab/research/SAM-pasted-numbers-2026-11-07.md): exact storage and round trip for every value
 * kind, order-preserving comparison for range rules, and a hard error, never silent conversion,
 * for any value an engine cannot hold. The exactness rules decide "can hold exactly, including
 * read-back"; `inexactPolicy` decides whether a lane rejects such a value (typed
 * `InexactValueError`) or keeps it ledger-only and marks the entity partial (PLAN v1 C1).
 * Inspired by: lab/research/R3-orm-prior-art.md sections 4.2-4.5; R1 Q3 (names, wire types, unions
 * lose precision); R2 section 4 (60-bit integers, 49-bit doubles exported with %.13g, millisecond
 * dateTime, invalid typed literals silently become strings); EXP-R01 VERIFY.md F1-F8.
 * Rejected: per-engine spec compilers (semantic drift); rounding to the nearest representable value.
 */
import { Effect } from "effect";

import * as CanonicalJson from "../content/CanonicalJson.js";
import * as ContentId from "../content/ContentId.js";
import type * as ConfigStore from "../config/ConfigStore.js";
import * as TypeExpr from "../config/TypeExpr.js";
import type { TripleValue } from "../Value.js";
import * as Descriptors from "./Descriptors.js";
import { referenceKinds, storageFamily, type StorageFamily } from "./Descriptors.js";
import { type DescriptorCompileError, InexactValueError, ProjectionSpecError } from "./Errors.js";
import * as Names from "./PhysicalNames.js";

export const LAYOUT = "triplex-projection/1" as const;

export type Engine = "xtdb" | "rdf";

// ---------------------------------------------------------------------------
// Exactness rules (data, evaluated by `isExact`)
// ---------------------------------------------------------------------------

/**
 * A condition a value must meet for an engine's declared type to store it and give it back
 * unchanged. An attribute's rule list is a conjunction; an empty list means every value of the
 * Triplex type is exact.
 */
export type ExactnessRule =
  /** Strings (and entity ids) must be well-formed Unicode; UTF-8 engines cannot store lone surrogates. */
  | { readonly _tag: "WellFormedUnicode" }
  /** Entity ids must not be empty (an IRI segment cannot be empty). */
  | { readonly _tag: "NonEmpty" }
  /** Integers (JS number or int64 decimal) must lie in `[min, max]`, given as decimal text. */
  | { readonly _tag: "IntegerRange"; readonly min: string; readonly max: string }
  /** `-0` is not representable (integer columns). */
  | { readonly _tag: "NoNegativeZero" }
  /** NaN and ±Infinity are not representable (JSON wire for lists, integer and time columns). */
  | { readonly _tag: "Finite" }
  /**
   * The engine stores binary64 with the low `droppedBits` mantissa bits cut off and exports
   * non-integral values with `significantDigits` significant digits. Exact only when both the
   * stored bits and the exported text give the same double back.
   */
  | {
      readonly _tag: "DoubleRoundTrip";
      readonly droppedBits: number;
      readonly significantDigits: number;
    }
  /** `YYYY-MM-DD` strings must be real calendar dates with a year in `[minYear, maxYear]`. */
  | { readonly _tag: "CalendarDate"; readonly minYear: number; readonly maxYear: number }
  /** Epoch-millisecond values must be integral and inside `[min, max]`. */
  | { readonly _tag: "EpochMillis"; readonly min: number; readonly max: number }
  /**
   * Epoch-millisecond coordinates must be a whole number of microseconds: the shortest decimal
   * form of the double has at most three fractional digits. Lanes convert through that decimal
   * text (never `v * 1000` in floating point), so the round trip gives the same double back.
   */
  | { readonly _tag: "MicrosecondGrid" }
  /** Numbers (fractional allowed) must lie in `[min, max]`. */
  | { readonly _tag: "NumberRange"; readonly min: number; readonly max: number };

const WELL_FORMED: ExactnessRule = { _tag: "WellFormedUnicode" };
const NON_EMPTY: ExactnessRule = { _tag: "NonEmpty" };
const NO_NEGATIVE_ZERO: ExactnessRule = { _tag: "NoNegativeZero" };
const FINITE: ExactnessRule = { _tag: "Finite" };
const INT64_RANGE: ExactnessRule = {
  _tag: "IntegerRange",
  min: "-9223372036854775808",
  max: "9223372036854775807",
};
/** QLever stores integers in 60 bits: `[-2^59, 2^59 - 1]`, wrapping silently outside (R2 4.1). */
const QLEVER_INTEGER_RANGE: ExactnessRule = {
  _tag: "IntegerRange",
  min: "-576460752303423488",
  max: "576460752303423487",
};
/**
 * QLever: `ValueId::makeFromDouble` shifts the bit pattern right by 4 (ValueId.h:263-270), and
 * `ExportIds.cpp:244-247` prints non-integral doubles with `%.13g` (VERIFY F1).
 */
const QLEVER_DOUBLE: ExactnessRule = {
  _tag: "DoubleRoundTrip",
  droppedBits: 4,
  significantDigits: 13,
};
/** Years 1..9999: XTDB DATE casts reject invalid dates; QLever turns them into plain strings (VERIFY F2). */
const CALENDAR_DATE: ExactnessRule = { _tag: "CalendarDate", minYear: 1, maxYear: 9999 };
/**
 * xsd:dateTime in QLever: millisecond precision, years 1 to 9999 kept exactly (R2 4.1 reports
 * month/day/time loss for 5-digit years). Year 0 and negative years are excluded conservatively.
 */
const QLEVER_DATETIME: ExactnessRule = {
  _tag: "EpochMillis",
  min: -62135596800000, // 0001-01-01T00:00:00.000Z
  max: 253402300799999, // 9999-12-31T23:59:59.999Z
};
/** XTDB TIMESTAMP WITH TIME ZONE is microseconds in int64; ECMAScript Date range bounds it first. */
const XTDB_DATETIME: ExactnessRule = { _tag: "EpochMillis", min: -8.64e15, max: 8.64e15 };
const MICROSECOND_GRID: ExactnessRule = { _tag: "MicrosecondGrid" };

const droppedBitsSet = (value: number, bits: number): boolean => {
  const view = new DataView(new ArrayBuffer(8));
  view.setFloat64(0, value);
  return (view.getUint32(4) & ((1 << bits) - 1)) !== 0;
};

const doubleRoundTrips = (value: number, bits: number, digits: number): boolean =>
  Number.isFinite(value) &&
  !droppedBitsSet(value, bits) &&
  (Number.isInteger(value) || Number(value.toPrecision(digits)) === value);

/** Number of fractional decimal digits in the shortest round-trip form of a finite double. */
const fractionalDigits = (value: number): number => {
  const text = String(Math.abs(value));
  const [mantissa = "", exponentText] = text.split("e");
  const exponent = exponentText === undefined ? 0 : Number(exponentText);
  const fraction = mantissa.split(".")[1]?.length ?? 0;
  return Math.max(0, fraction - exponent);
};

const onMicrosecondGrid = (value: number): boolean =>
  Number.isFinite(value) && (Number.isInteger(value) || fractionalDigits(value) <= 3);

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;
const isCalendarDate = (text: string, minYear: number, maxYear: number): boolean => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (match === null) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < minYear || year > maxYear || month < 1 || month > 12 || day < 1) return false;
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const days = month === 2 && leap ? 29 : DAYS_IN_MONTH[month - 1]!;
  return day <= days;
};

const integerText = (value: TripleValue | number | string): bigint | undefined => {
  if (typeof value === "number") return Number.isInteger(value) ? BigInt(value) : undefined;
  if (typeof value === "string") return undefined;
  if (value.type === "integer") return BigInt(value.value);
  if (value.type === "number" && Number.isInteger(value.value)) return BigInt(value.value);
  return undefined;
};

const numeric = (value: TripleValue | number | string): number | undefined =>
  typeof value === "number"
    ? value
    : typeof value === "string"
      ? undefined
      : value.type === "number" || value.type === "datetime"
        ? value.value
        : undefined;

const textOf = (value: TripleValue | number | string): string | undefined =>
  typeof value === "string"
    ? value
    : typeof value === "number"
      ? undefined
      : value.type === "string" || value.type === "ref"
        ? value.value
        : undefined;

const holds = (rule: ExactnessRule, value: TripleValue | number | string): boolean => {
  switch (rule._tag) {
    case "WellFormedUnicode": {
      const text = textOf(value);
      return text === undefined || text.isWellFormed();
    }
    case "NonEmpty": {
      const text = textOf(value);
      return text === undefined || text.length > 0;
    }
    case "IntegerRange": {
      const int = integerText(value);
      return int === undefined || (int >= BigInt(rule.min) && int <= BigInt(rule.max));
    }
    case "NoNegativeZero": {
      const n = numeric(value);
      return n === undefined || !Object.is(n, -0);
    }
    case "Finite": {
      const n = numeric(value);
      return n === undefined || Number.isFinite(n);
    }
    case "DoubleRoundTrip": {
      const n = numeric(value);
      return n === undefined || doubleRoundTrips(n, rule.droppedBits, rule.significantDigits);
    }
    case "CalendarDate": {
      const text = textOf(value);
      return text === undefined || isCalendarDate(text, rule.minYear, rule.maxYear);
    }
    case "EpochMillis": {
      const n = numeric(value);
      return n === undefined || (Number.isInteger(n) && n >= rule.min && n <= rule.max);
    }
    case "MicrosecondGrid": {
      const n = numeric(value);
      return n === undefined || onMicrosecondGrid(n);
    }
    case "NumberRange": {
      const n = numeric(value);
      return n === undefined || (n >= rule.min && n <= rule.max);
    }
  }
};

/** The first rule `value` fails, or `undefined` when the engine holds it exactly. */
export const firstViolation = (
  rules: ReadonlyArray<ExactnessRule>,
  value: TripleValue | number | string,
): ExactnessRule | undefined => rules.find((rule) => !holds(rule, value));

/**
 * Does `value` satisfy every rule? `value` is a typed fact value, a bare number (a valid-time
 * coordinate) or a bare string (an entity id). A rule that does not apply to the value's kind
 * holds vacuously; type violations are the codec's concern, not exactness.
 */
export const isExact = (
  rules: ReadonlyArray<ExactnessRule>,
  value: TripleValue | number | string,
): boolean => firstViolation(rules, value) === undefined;

const render = (value: TripleValue | number | string): string => {
  const n = numeric(value);
  if (n !== undefined) return Object.is(n, -0) ? "-0" : String(n);
  return JSON.stringify(value);
};

/** Fail with a typed `InexactValueError` when `engine` cannot hold `value` exactly. */
export const requireExact = (
  engine: Engine,
  rules: ReadonlyArray<ExactnessRule>,
  value: TripleValue | number | string,
): Effect.Effect<void, InexactValueError> => {
  const rule = firstViolation(rules, value);
  return rule === undefined
    ? Effect.void
    : Effect.fail(
        new InexactValueError({
          engine,
          rule: rule._tag,
          value: render(value),
          message: `${engine} cannot hold ${render(value)} exactly (${rule._tag})`,
        }),
      );
};

// ---------------------------------------------------------------------------
// Spec shape
// ---------------------------------------------------------------------------

/** XTDB declared column type (SQL spelling). Card-many columns hold a list of this type. */
export type XtdbColumnType =
  | "VARCHAR"
  | "DATE"
  | "DOUBLE PRECISION"
  | "BIGINT"
  | "BOOLEAN"
  | "TIMESTAMP WITH TIME ZONE";

/** RDF object form: a typed literal, or an IRI (refs, encoded with the spec's entity rule). */
export type RdfObject =
  | { readonly kind: "literal"; readonly datatype: string }
  | { readonly kind: "iri" };

/**
 * How range comparisons and ordering on this attribute may run in the engine.
 * - `native`: the engine's comparison equals Triplex's on every exact value.
 * - `order-key`: the engine's comparison may differ (QLever ICU collation, R2 section 2; XTDB
 *   UTF-8 byte order versus JavaScript UTF-16 order above the BMP, R9 4.2, unprobed), so a range
 *   rule needs a maintained order key.
 * - `unordered`: no meaningful order (JSON).
 */
export type Ordering = "native" | "order-key" | "unordered";

/**
 * Numeric class of an attribute (absent for non-numeric kinds). `approximate` is binary64: allowed
 * only for approximate values such as scores, never for business values (money is a scaled
 * integer, or later the decimal kind, EXP-R02). `exact-integer` is exact within the engine range.
 */
export type NumericClass = "approximate" | "exact-integer";

export interface XtdbAttributeSpec {
  readonly column: string;
  readonly type: XtdbColumnType;
  /** True for cardinality-many: the column is a list of `type`. */
  readonly list: boolean;
  /** How the value is carried: JSON values are canonical JSON text in a VARCHAR column. */
  readonly encoding: "native" | "canonical-json";
  readonly ordering: Ordering;
  readonly exactness: ReadonlyArray<ExactnessRule>;
}

export interface RdfAttributeSpec {
  readonly predicate: string;
  readonly object: RdfObject;
  readonly encoding: "native" | "canonical-json";
  readonly ordering: Ordering;
  readonly exactness: ReadonlyArray<ExactnessRule>;
}

export interface AttributeSpec {
  readonly key: string;
  readonly type: TypeExpr.TypeExpr;
  readonly required: boolean;
  readonly cardinality: "one" | "many";
  readonly storage: StorageFamily;
  readonly numeric?: NumericClass;
  /** Target entity type of a ref attribute. */
  readonly refTarget?: string;
  readonly xtdb: XtdbAttributeSpec;
  readonly rdf: RdfAttributeSpec;
}

export interface EntityTypeSpec {
  readonly entityType: string;
  readonly xtdb: { readonly table: string };
  readonly rdf: { readonly class: string };
  /** Sorted by key. */
  readonly attributes: ReadonlyArray<AttributeSpec>;
}

/** Exactness rules for coordinates that are not attribute values. */
export interface CoordinateSpec {
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
export type InexactPolicy = "ledger-only" | "reject";

export interface ProjectionSpec {
  readonly id: ContentId.ContentId;
  readonly layout: typeof LAYOUT;
  readonly rdfBase: string;
  readonly inexactPolicy: InexactPolicy;
  /** Sorted by entity type name. */
  readonly entityTypes: ReadonlyArray<EntityTypeSpec>;
  readonly coordinates: { readonly xtdb: CoordinateSpec; readonly rdf: CoordinateSpec };
}

// ---------------------------------------------------------------------------
// Compile inputs
// ---------------------------------------------------------------------------

/** One attribute usage: the global key and value type plus the entity-local flags. */
export interface AttributeUsageInput {
  readonly key: string;
  readonly type: TypeExpr.TypeExpr;
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
export interface EntityTypeInput {
  readonly entityType: string;
  readonly attributes:
    | ReadonlyArray<AttributeUsageInput>
    | Readonly<Record<string, AttributeUsageInput>>;
}

export interface CompileOptions {
  /** Base for attribute, class and entity IRIs. Defaults to `urn:triplex:`. */
  readonly rdfBase?: string;
  /** Defaults to `ledger-only`. */
  readonly inexactPolicy?: InexactPolicy;
  /** `reject` fails the compile for any binary64 (`number`) attribute. Defaults to `allow`. */
  readonly approximateNumbers?: "allow" | "reject";
}

// ---------------------------------------------------------------------------
// Physical type mapping
// ---------------------------------------------------------------------------

type Kind =
  | "text"
  | "date"
  | "number"
  | "integer"
  | "int64"
  | "boolean"
  | "instant"
  | "ref"
  | "json";

const XSD = "http://www.w3.org/2001/XMLSchema#";
const RDF_JSON = "http://www.w3.org/1999/02/22-rdf-syntax-ns#JSON";

const familyKind: Record<StorageFamily, Kind> = {
  string: "text",
  number: "number",
  integer: "int64",
  boolean: "boolean",
  datetime: "instant",
  ref: "ref",
  json: "json",
};

/** The most specific physical kind of a type; unions of different kinds fall back to the family. */
const kindOf = (expr: TypeExpr.TypeExpr, family: StorageFamily): Kind => {
  switch (expr._tag) {
    case "Prim":
      return expr.prim;
    case "Enum":
      return "text";
    case "Ref":
      return "ref";
    case "List":
    case "Struct":
      return "json";
    case "Constrained":
      return kindOf(expr.base, family);
    case "Union": {
      const kinds = new Set(expr.members.map((member) => kindOf(member, family)));
      return kinds.size === 1 ? [...kinds][0]! : familyKind[family];
    }
    case "Any":
      return familyKind[family];
  }
};

interface Physical {
  readonly numeric?: NumericClass;
  readonly xtdb: Omit<XtdbAttributeSpec, "column" | "list">;
  readonly rdf: Omit<RdfAttributeSpec, "predicate">;
}

const literal = (datatype: string): RdfObject => ({ kind: "literal", datatype });

/**
 * One declared physical type per kind per engine.
 * - XTDB: int64 and JS integers are BIGINT (never a union, R1 Q3: unions travel as JSON and lose
 *   precision); doubles are always DOUBLE PRECISION and must be finite (card-many lists travel as
 *   JSON, which has no NaN or Infinity); instants are TIMESTAMP WITH TIME ZONE (read as text so
 *   microseconds survive); JSON is canonical JSON text.
 * - RDF: native XSD literals, with the 60-bit integer, 49-bit-and-%.13g double, calendar-date and
 *   millisecond dateTime limits recorded as exactness rules instead of rounding (R2 4.2).
 */
const physicalFor = (kind: Kind): Physical => {
  switch (kind) {
    case "text":
      return {
        xtdb: {
          type: "VARCHAR",
          encoding: "native",
          ordering: "order-key",
          exactness: [WELL_FORMED],
        },
        rdf: {
          object: literal(`${XSD}string`),
          encoding: "native",
          ordering: "order-key",
          exactness: [WELL_FORMED],
        },
      };
    case "date":
      return {
        xtdb: { type: "DATE", encoding: "native", ordering: "native", exactness: [CALENDAR_DATE] },
        rdf: {
          object: literal(`${XSD}date`),
          encoding: "native",
          ordering: "native",
          exactness: [CALENDAR_DATE],
        },
      };
    case "number":
      return {
        numeric: "approximate",
        xtdb: {
          type: "DOUBLE PRECISION",
          encoding: "native",
          ordering: "native",
          exactness: [FINITE],
        },
        rdf: {
          object: literal(`${XSD}double`),
          encoding: "native",
          ordering: "native",
          exactness: [QLEVER_DOUBLE],
        },
      };
    case "integer":
      return {
        numeric: "exact-integer",
        xtdb: {
          type: "BIGINT",
          encoding: "native",
          ordering: "native",
          exactness: [FINITE, INT64_RANGE, NO_NEGATIVE_ZERO],
        },
        rdf: {
          object: literal(`${XSD}integer`),
          encoding: "native",
          ordering: "native",
          exactness: [FINITE, QLEVER_INTEGER_RANGE, NO_NEGATIVE_ZERO],
        },
      };
    case "int64":
      return {
        numeric: "exact-integer",
        xtdb: { type: "BIGINT", encoding: "native", ordering: "native", exactness: [] },
        rdf: {
          object: literal(`${XSD}integer`),
          encoding: "native",
          ordering: "native",
          exactness: [QLEVER_INTEGER_RANGE],
        },
      };
    case "boolean":
      return {
        xtdb: { type: "BOOLEAN", encoding: "native", ordering: "native", exactness: [] },
        rdf: {
          object: literal(`${XSD}boolean`),
          encoding: "native",
          ordering: "native",
          exactness: [],
        },
      };
    case "instant":
      return {
        xtdb: {
          type: "TIMESTAMP WITH TIME ZONE",
          encoding: "native",
          ordering: "native",
          exactness: [XTDB_DATETIME],
        },
        rdf: {
          object: literal(`${XSD}dateTime`),
          encoding: "native",
          ordering: "native",
          exactness: [QLEVER_DATETIME],
        },
      };
    case "ref":
      return {
        xtdb: {
          type: "VARCHAR",
          encoding: "native",
          ordering: "order-key",
          exactness: [WELL_FORMED],
        },
        rdf: {
          object: { kind: "iri" },
          encoding: "native",
          ordering: "order-key",
          exactness: [WELL_FORMED, NON_EMPTY],
        },
      };
    case "json":
      return {
        xtdb: { type: "VARCHAR", encoding: "canonical-json", ordering: "unordered", exactness: [] },
        rdf: {
          object: literal(RDF_JSON),
          encoding: "canonical-json",
          ordering: "unordered",
          exactness: [],
        },
      };
  }
};

const COORDINATES: ProjectionSpec["coordinates"] = {
  // XTDB valid time is microseconds; Triplex coordinates are (possibly fractional) epoch ms.
  xtdb: {
    validTime: [MICROSECOND_GRID, { _tag: "NumberRange", min: -8.64e15, max: 8.64e15 }],
    entityId: [WELL_FORMED],
  },
  // The QLever current graph has no native valid time; boundaries are compared in TypeScript.
  rdf: { validTime: [], entityId: [WELL_FORMED, NON_EMPTY] },
};

// ---------------------------------------------------------------------------
// Compile
// ---------------------------------------------------------------------------

const ENTITY_TYPE_NAME = /^[A-Z][A-Za-z0-9]*$/;
const ATTRIBUTE_KEY = /^:[a-z][a-z0-9_-]*\/[a-z][a-z0-9_-]*$/;

const fail = (
  reason: ProjectionSpecError["reason"],
  inputs: ReadonlyArray<string>,
  message: string,
) => new ProjectionSpecError({ reason, inputs, message });

const usagesOf = (input: EntityTypeInput): ReadonlyArray<AttributeUsageInput> =>
  Array.isArray(input.attributes)
    ? (input.attributes as ReadonlyArray<AttributeUsageInput>)
    : Object.values(input.attributes as Readonly<Record<string, AttributeUsageInput>>);

const refTargetOf = (expr: TypeExpr.TypeExpr): string | undefined => {
  switch (expr._tag) {
    case "Ref":
      return expr.kind;
    case "Constrained":
      return refTargetOf(expr.base);
    default:
      return undefined;
  }
};

/** The canonical body hashed for the id: everything except the id itself. */
const canonicalBody = (spec: Omit<ProjectionSpec, "id">): string =>
  CanonicalJson.encodeOrThrow({
    layout: spec.layout,
    rdfBase: spec.rdfBase,
    inexactPolicy: spec.inexactPolicy,
    coordinates: spec.coordinates,
    entityTypes: spec.entityTypes.map((entity) => ({
      ...entity,
      attributes: entity.attributes.map((attribute) => ({
        ...attribute,
        type: TypeExpr.canonical(attribute.type),
      })),
    })),
  } as unknown as CanonicalJson.CanonicalValue);

/**
 * Compile entity types into a projection spec. Fails, naming every offending input, on: XTDB
 * column collisions (`-` vs `_`), table collisions (case-folded names such as `ABTest`/`AbTest`),
 * reserved and SQL-keyword names, reserved namespaces, invalid names, duplicate types or usages,
 * one key used with two value types, refs to types not in the inputs, binary64 attributes when
 * `approximateNumbers` is `reject`, an invalid or ledger-overlapping `rdfBase`, and types with no
 * single physical type (`Any`, unions across storage families). The checks match the release path
 * (`fromRelease`), so both paths accept and reject the same inputs.
 */
export const compile = (
  inputs: ReadonlyArray<EntityTypeInput>,
  options: CompileOptions = {},
): Effect.Effect<ProjectionSpec, ProjectionSpecError> =>
  Effect.gen(function* () {
    const rdfBase = options.rdfBase ?? Names.DEFAULT_RDF_BASE;
    const baseProblem = Names.validateRdfBase(rdfBase);
    if (baseProblem !== undefined) {
      return yield* fail("invalid-option", [rdfBase], `rdfBase ${baseProblem}`);
    }
    const inexactPolicy = options.inexactPolicy ?? "ledger-only";
    if (inexactPolicy !== "ledger-only" && inexactPolicy !== "reject") {
      return yield* fail("invalid-option", [String(inexactPolicy)], "Unknown inexactPolicy");
    }

    const seenTypes = new Set<string>();
    const tables = new Map<string, string>();
    const columns = new Map<string, string>();
    const keyTypes = new Map<string, { readonly where: string; readonly canonical: string }>();
    const refTargets: Array<{ readonly where: string; readonly target: string }> = [];
    const entityTypes: EntityTypeSpec[] = [];

    for (const input of [...inputs].sort((a, b) => (a.entityType < b.entityType ? -1 : 1))) {
      const name = input.entityType;
      if (!ENTITY_TYPE_NAME.test(name)) {
        return yield* fail("invalid-name", [name], `Entity type ${name} must be PascalCase`);
      }
      if (seenTypes.has(name)) {
        return yield* fail("duplicate-entity-type", [name], `Entity type ${name} is listed twice`);
      }
      seenTypes.add(name);
      const table = Names.xtdbTable(name);
      if (Names.isReservedXtdbTable(table) || Names.isSqlKeyword(table)) {
        return yield* fail(
          "reserved-name",
          [name],
          `Entity type ${name} maps to reserved XTDB table name ${table}`,
        );
      }
      const tableOwner = tables.get(table);
      if (tableOwner !== undefined) {
        return yield* fail(
          "table-collision",
          [tableOwner, name],
          `Entity types ${tableOwner} and ${name} both map to XTDB table ${table}`,
        );
      }
      tables.set(table, name);

      const keys = new Set<string>();
      const attributes: AttributeSpec[] = [];
      for (const usage of [...usagesOf(input)].sort((a, b) => (a.key < b.key ? -1 : 1))) {
        const key = usage.key;
        const where = `${name}.${key}`;
        if (!ATTRIBUTE_KEY.test(key)) {
          return yield* fail(
            "invalid-name",
            [where],
            `Attribute key ${key} must be a lowercase namespaced keyword`,
          );
        }
        if (key.startsWith(":triplex/") || key.startsWith(":_tx/")) {
          return yield* fail("reserved-namespace", [where], `${key} is reserved by Triplex`);
        }
        if (keys.has(key)) {
          return yield* fail("duplicate-attribute", [where], `${name} uses ${key} twice`);
        }
        keys.add(key);
        const column = Names.xtdbColumn(key);
        if (Names.isReservedXtdbColumn(column)) {
          return yield* fail(
            "reserved-name",
            [key],
            `Attribute ${key} maps to reserved XTDB column name ${column}`,
          );
        }
        const columnOwner = columns.get(column);
        if (columnOwner !== undefined && columnOwner !== key) {
          return yield* fail(
            "column-collision",
            [columnOwner, key],
            `Attributes ${columnOwner} and ${key} both map to XTDB column ${column}`,
          );
        }
        columns.set(column, key);
        const canonical = TypeExpr.canonical(usage.type);
        const typeOwner = keyTypes.get(key);
        if (typeOwner !== undefined && typeOwner.canonical !== canonical) {
          return yield* fail(
            "attribute-type-conflict",
            [typeOwner.where, where],
            `Attribute ${key} has different value types on ${typeOwner.where} and ${where}; one key has one value type`,
          );
        }
        keyTypes.set(key, { where, canonical });
        for (const target of referenceKinds(usage.type)) refTargets.push({ where, target });

        let storage: StorageFamily;
        try {
          storage = storageFamily(usage.type, where);
        } catch (error) {
          return yield* fail(
            "unsupported-type",
            [where],
            `Attribute ${key} on ${name} has no single physical type: ${
              (error as { message?: string }).message ?? String(error)
            }`,
          );
        }
        const physical = physicalFor(kindOf(usage.type, storage));
        if (physical.numeric === "approximate" && options.approximateNumbers === "reject") {
          return yield* fail(
            "approximate-number",
            [where],
            `Attribute ${key} on ${name} is binary64; business values must be scaled integers`,
          );
        }
        const refTarget = refTargetOf(usage.type);
        attributes.push({
          key,
          type: usage.type,
          required: usage.required,
          cardinality: usage.cardinality,
          storage,
          ...(physical.numeric === undefined ? {} : { numeric: physical.numeric }),
          ...(refTarget === undefined ? {} : { refTarget }),
          xtdb: { column, list: usage.cardinality === "many", ...physical.xtdb },
          rdf: { predicate: Names.rdfAttribute(key, rdfBase), ...physical.rdf },
        });
      }
      entityTypes.push({
        entityType: name,
        xtdb: { table },
        rdf: { class: Names.rdfClass(name, rdfBase) },
        attributes,
      });
    }
    for (const { where, target } of refTargets) {
      if (!seenTypes.has(target)) {
        return yield* fail(
          "unknown-ref-target",
          [where, target],
          `${where} references entity type ${target}, which is not in this spec`,
        );
      }
    }

    const body = { layout: LAYOUT, rdfBase, inexactPolicy, entityTypes, coordinates: COORDINATES };
    return { id: ContentId.hash(ContentId.Domain.projectionSpec, canonicalBody(body)), ...body };
  });

/**
 * Compile the spec of a persisted release. Equal content gives the same id as compiling the
 * `EntityType` objects the release was built from (R9 section 3.2, option C).
 */
export const fromRelease = (
  snapshot: ConfigStore.ConfigSnapshot,
  options: CompileOptions = {},
): Effect.Effect<ProjectionSpec, ProjectionSpecError | DescriptorCompileError> =>
  Descriptors.compile(snapshot).pipe(
    Effect.flatMap((compiled) => compile(compiled.entities, options)),
  );

/** The spec of one entity type, if projected. */
export const entityType = (spec: ProjectionSpec, name: string): EntityTypeSpec | undefined =>
  spec.entityTypes.find((entity) => entity.entityType === name);

/** The spec of one attribute usage, if projected. */
export const attribute = (
  spec: ProjectionSpec,
  entityTypeName: string,
  key: string,
): AttributeSpec | undefined =>
  entityType(spec, entityTypeName)?.attributes.find((usage) => usage.key === key);

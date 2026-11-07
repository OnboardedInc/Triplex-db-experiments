/**
 * The projection spec: a content-addressed compile of entity types into physical names, one
 * declared physical type per attribute per engine, and the exactness rules each engine needs.
 *
 * [EXP-R01] Why: both lane projections (XTDB tables, QLever current graph) and the shared planner
 * read one spec, so names, types and exactness cannot drift between engines or deploys. The spec
 * id fences writers with a stale spec (R9 section 3.4). Values a declared type cannot hold exactly
 * are never rounded: the exactness rules let lanes keep them ledger-only and mark the entity
 * partial (PLAN v1 C1, section 3.2 item 4). Inspired by: lab/research/R3-orm-prior-art.md sections
 * 4.2-4.5; lab/research/R1-xtdb-capabilities.md Q3 (names, wire types, unions lose precision);
 * lab/research/R2-qlever-capabilities.md section 4 (60-bit integers, 49-bit doubles, millisecond
 * dateTime). Rejected: per-engine spec compilers (semantic drift); rejecting valid writes whose
 * values a column cannot hold (the ledger stays schema-less, D3 in R9).
 */
import { Effect } from "effect";

import * as CanonicalJson from "../content/CanonicalJson.js";
import * as ContentId from "../content/ContentId.js";
import * as TypeExpr from "../config/TypeExpr.js";
import type { TripleValue } from "../Value.js";
import type * as ConfigStore from "../config/ConfigStore.js";
import * as Descriptors from "./Descriptors.js";
import { storageFamily, type StorageFamily } from "./Descriptors.js";
import { type DescriptorCompileError, ProjectionSpecError } from "./Errors.js";
import * as Names from "./PhysicalNames.js";

export const LAYOUT = "triplex-projection/1" as const;

// ---------------------------------------------------------------------------
// Exactness rules (data, evaluated by `isExact`)
// ---------------------------------------------------------------------------

/**
 * A condition a value must meet for an engine's declared type to hold it exactly. An attribute's
 * rule list is a conjunction; an empty list means every value of the Triplex type is exact.
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
  /** Binary64 values whose low `droppedBits` mantissa bits are non-zero lose precision. */
  | { readonly _tag: "MantissaBits"; readonly droppedBits: number }
  /** Epoch-millisecond values must be integral and inside `[min, max]`. */
  | { readonly _tag: "EpochMillis"; readonly min: number; readonly max: number }
  /** Epoch-millisecond coordinates must lie on the engine's microsecond grid. */
  | { readonly _tag: "MicrosecondGrid" }
  /** Numbers (fractional allowed) must lie in `[min, max]`. */
  | { readonly _tag: "NumberRange"; readonly min: number; readonly max: number };

const WELL_FORMED: ExactnessRule = { _tag: "WellFormedUnicode" };
const NON_EMPTY: ExactnessRule = { _tag: "NonEmpty" };
const NO_NEGATIVE_ZERO: ExactnessRule = { _tag: "NoNegativeZero" };
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
/** QLever keeps doubles in 60 bits, dropping the low 4 mantissa bits (R2 4.1; rdf.ts numericShadowIsExact). */
const QLEVER_DOUBLE: ExactnessRule = { _tag: "MantissaBits", droppedBits: 4 };
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

const dropped = (value: number, bits: number): boolean => {
  const view = new DataView(new ArrayBuffer(8));
  view.setFloat64(0, value);
  return (view.getUint32(4) & ((1 << bits) - 1)) !== 0;
};

const onMicrosecondGrid = (value: number): boolean => {
  const micros = Math.round(value * 1000);
  return Number.isSafeInteger(micros) && micros / 1000 === value;
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

/**
 * Does `value` satisfy every rule? `value` is a typed fact value, a bare number (a valid-time
 * coordinate) or a bare string (an entity id). A rule that does not apply to the value's kind
 * holds vacuously; type violations are the codec's concern, not exactness.
 */
export const isExact = (
  rules: ReadonlyArray<ExactnessRule>,
  value: TripleValue | number | string,
): boolean =>
  rules.every((rule) => {
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
      case "MantissaBits": {
        const n = numeric(value);
        return n === undefined || !Number.isFinite(n) || !dropped(n, rule.droppedBits);
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
  });

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

export interface XtdbAttributeSpec {
  readonly column: string;
  readonly type: XtdbColumnType;
  /** True for cardinality-many: the column is a list of `type`. */
  readonly list: boolean;
  /** How the value is carried: JSON values are canonical JSON text in a VARCHAR column. */
  readonly encoding: "native" | "canonical-json";
  readonly exactness: ReadonlyArray<ExactnessRule>;
}

export interface RdfAttributeSpec {
  readonly predicate: string;
  readonly object: RdfObject;
  readonly encoding: "native" | "canonical-json";
  readonly exactness: ReadonlyArray<ExactnessRule>;
}

export interface AttributeSpec {
  readonly key: string;
  readonly type: TypeExpr.TypeExpr;
  readonly required: boolean;
  readonly cardinality: "one" | "many";
  readonly storage: StorageFamily;
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

export interface ProjectionSpec {
  readonly id: ContentId.ContentId;
  readonly layout: typeof LAYOUT;
  readonly rdfBase: string;
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
  readonly xtdb: Omit<XtdbAttributeSpec, "column" | "list">;
  readonly rdf: Omit<RdfAttributeSpec, "predicate">;
}

const literal = (datatype: string): RdfObject => ({ kind: "literal", datatype });

/**
 * One declared physical type per kind per engine.
 * - XTDB: int64 and JS integers are BIGINT (never a union, R1 Q3: unions travel as JSON and lose
 *   precision); doubles are always DOUBLE PRECISION; instants are TIMESTAMP WITH TIME ZONE (the
 *   lane reads them as text so microseconds survive); JSON is canonical JSON text.
 * - RDF: native XSD literals, with the 60-bit integer, 49-bit double and millisecond dateTime
 *   limits recorded as exactness rules instead of rounding (R2 4.2).
 */
const physicalFor = (kind: Kind): Physical => {
  switch (kind) {
    case "text":
      return {
        xtdb: { type: "VARCHAR", encoding: "native", exactness: [WELL_FORMED] },
        rdf: { object: literal(`${XSD}string`), encoding: "native", exactness: [WELL_FORMED] },
      };
    case "date":
      return {
        xtdb: { type: "DATE", encoding: "native", exactness: [] },
        rdf: { object: literal(`${XSD}date`), encoding: "native", exactness: [] },
      };
    case "number":
      return {
        xtdb: { type: "DOUBLE PRECISION", encoding: "native", exactness: [] },
        rdf: { object: literal(`${XSD}double`), encoding: "native", exactness: [QLEVER_DOUBLE] },
      };
    case "integer":
      return {
        xtdb: { type: "BIGINT", encoding: "native", exactness: [INT64_RANGE, NO_NEGATIVE_ZERO] },
        rdf: {
          object: literal(`${XSD}integer`),
          encoding: "native",
          exactness: [QLEVER_INTEGER_RANGE, NO_NEGATIVE_ZERO],
        },
      };
    case "int64":
      return {
        xtdb: { type: "BIGINT", encoding: "native", exactness: [] },
        rdf: {
          object: literal(`${XSD}integer`),
          encoding: "native",
          exactness: [QLEVER_INTEGER_RANGE],
        },
      };
    case "boolean":
      return {
        xtdb: { type: "BOOLEAN", encoding: "native", exactness: [] },
        rdf: { object: literal(`${XSD}boolean`), encoding: "native", exactness: [] },
      };
    case "instant":
      return {
        xtdb: { type: "TIMESTAMP WITH TIME ZONE", encoding: "native", exactness: [XTDB_DATETIME] },
        rdf: {
          object: literal(`${XSD}dateTime`),
          encoding: "native",
          exactness: [QLEVER_DATETIME],
        },
      };
    case "ref":
      return {
        xtdb: { type: "VARCHAR", encoding: "native", exactness: [WELL_FORMED] },
        rdf: { object: { kind: "iri" }, encoding: "native", exactness: [WELL_FORMED, NON_EMPTY] },
      };
    case "json":
      return {
        xtdb: { type: "VARCHAR", encoding: "canonical-json", exactness: [] },
        rdf: { object: literal(RDF_JSON), encoding: "canonical-json", exactness: [] },
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
 * Compile entity types into a projection spec. Fails, naming every colliding input, on: XTDB
 * column collisions (`-` vs `_`), table collisions (case-folded names such as `ABTest`/`AbTest`),
 * reserved names and namespaces, invalid names, duplicate types or usages, an unsupported option,
 * and types with no single physical type (`Any`, unions across storage families).
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

    const seenTypes = new Set<string>();
    const tables = new Map<string, string>();
    const columns = new Map<string, string>();
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
      if (Names.isReservedXtdbTable(table)) {
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
        const refTarget = refTargetOf(usage.type);
        attributes.push({
          key,
          type: usage.type,
          required: usage.required,
          cardinality: usage.cardinality,
          storage,
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

    const body = { layout: LAYOUT, rdfBase, entityTypes, coordinates: COORDINATES };
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

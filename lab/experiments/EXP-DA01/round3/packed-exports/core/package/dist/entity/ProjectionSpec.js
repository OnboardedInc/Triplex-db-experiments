import { __exportAll } from "../_virtual/_rolldown/runtime.js";
import { encodeOrThrow } from "../content/CanonicalJson.js";
import { Domain, hash } from "../content/ContentId.js";
import { canonical } from "../config/TypeExpr.js";
import { InexactValueError, ProjectionSpecError } from "./Errors.js";
import { compile as compile$1, referenceKinds, storageFamily } from "./Descriptors.js";
import { isReservedXtdbColumn, isReservedXtdbTable, isSqlKeyword, rdfAttribute, rdfClass, validateRdfBase, xtdbColumn, xtdbTable } from "./PhysicalNames.js";
import { Effect } from "effect";
//#region src/entity/ProjectionSpec.ts
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
var ProjectionSpec_exports = /* @__PURE__ */ __exportAll({
	LAYOUT: () => LAYOUT,
	attribute: () => attribute,
	compile: () => compile,
	entityType: () => entityType,
	firstViolation: () => firstViolation,
	fromRelease: () => fromRelease,
	isExact: () => isExact,
	requireExact: () => requireExact
});
const LAYOUT = "triplex-projection/1";
const WELL_FORMED = { _tag: "WellFormedUnicode" };
const NON_EMPTY = { _tag: "NonEmpty" };
const NO_NEGATIVE_ZERO = { _tag: "NoNegativeZero" };
const FINITE = { _tag: "Finite" };
const INT64_RANGE = {
	_tag: "IntegerRange",
	min: "-9223372036854775808",
	max: "9223372036854775807"
};
/** QLever stores integers in 60 bits: `[-2^59, 2^59 - 1]`, wrapping silently outside (R2 4.1). */
const QLEVER_INTEGER_RANGE = {
	_tag: "IntegerRange",
	min: "-576460752303423488",
	max: "576460752303423487"
};
/**
* QLever: `ValueId::makeFromDouble` shifts the bit pattern right by 4 (ValueId.h:263-270), and
* `ExportIds.cpp:244-247` prints non-integral doubles with `%.13g` (VERIFY F1).
*/
const QLEVER_DOUBLE = {
	_tag: "DoubleRoundTrip",
	droppedBits: 4,
	significantDigits: 13
};
/** Years 1..9999: XTDB DATE casts reject invalid dates; QLever turns them into plain strings (VERIFY F2). */
const CALENDAR_DATE = {
	_tag: "CalendarDate",
	minYear: 1,
	maxYear: 9999
};
/**
* xsd:dateTime in QLever: millisecond precision, years 1 to 9999 kept exactly (R2 4.1 reports
* month/day/time loss for 5-digit years). Year 0 and negative years are excluded conservatively.
*/
const QLEVER_DATETIME = {
	_tag: "EpochMillis",
	min: -621355968e5,
	max: 0xe677d21fdbff
};
/** XTDB TIMESTAMP WITH TIME ZONE is microseconds in int64; ECMAScript Date range bounds it first. */
const XTDB_DATETIME = {
	_tag: "EpochMillis",
	min: -864e13,
	max: 864e13
};
const MICROSECOND_GRID = { _tag: "MicrosecondGrid" };
const droppedBitsSet = (value, bits) => {
	const view = /* @__PURE__ */ new DataView(/* @__PURE__ */ new ArrayBuffer(8));
	view.setFloat64(0, value);
	return (view.getUint32(4) & (1 << bits) - 1) !== 0;
};
const doubleRoundTrips = (value, bits, digits) => Number.isFinite(value) && !droppedBitsSet(value, bits) && (Number.isInteger(value) || Number(value.toPrecision(digits)) === value);
/** Number of fractional decimal digits in the shortest round-trip form of a finite double. */
const fractionalDigits = (value) => {
	const [mantissa = "", exponentText] = String(Math.abs(value)).split("e");
	const exponent = exponentText === void 0 ? 0 : Number(exponentText);
	const fraction = mantissa.split(".")[1]?.length ?? 0;
	return Math.max(0, fraction - exponent);
};
const onMicrosecondGrid = (value) => Number.isFinite(value) && (Number.isInteger(value) || fractionalDigits(value) <= 3);
const DAYS_IN_MONTH = [
	31,
	28,
	31,
	30,
	31,
	30,
	31,
	31,
	30,
	31,
	30,
	31
];
const isCalendarDate = (text, minYear, maxYear) => {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
	if (match === null) return false;
	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	if (year < minYear || year > maxYear || month < 1 || month > 12 || day < 1) return false;
	const leap = year % 4 === 0 && year % 100 !== 0 || year % 400 === 0;
	return day <= (month === 2 && leap ? 29 : DAYS_IN_MONTH[month - 1]);
};
const integerText = (value) => {
	if (typeof value === "number") return Number.isInteger(value) ? BigInt(value) : void 0;
	if (typeof value === "string") return void 0;
	if (value.type === "integer") return BigInt(value.value);
	if (value.type === "number" && Number.isInteger(value.value)) return BigInt(value.value);
};
const numeric = (value) => typeof value === "number" ? value : typeof value === "string" ? void 0 : value.type === "number" || value.type === "datetime" ? value.value : void 0;
const textOf = (value) => typeof value === "string" ? value : typeof value === "number" ? void 0 : value.type === "string" || value.type === "ref" ? value.value : void 0;
const holds = (rule, value) => {
	switch (rule._tag) {
		case "WellFormedUnicode": {
			const text = textOf(value);
			return text === void 0 || text.isWellFormed();
		}
		case "NonEmpty": {
			const text = textOf(value);
			return text === void 0 || text.length > 0;
		}
		case "IntegerRange": {
			const int = integerText(value);
			return int === void 0 || int >= BigInt(rule.min) && int <= BigInt(rule.max);
		}
		case "NoNegativeZero": {
			const n = numeric(value);
			return n === void 0 || !Object.is(n, -0);
		}
		case "Finite": {
			const n = numeric(value);
			return n === void 0 || Number.isFinite(n);
		}
		case "DoubleRoundTrip": {
			const n = numeric(value);
			return n === void 0 || doubleRoundTrips(n, rule.droppedBits, rule.significantDigits);
		}
		case "CalendarDate": {
			const text = textOf(value);
			return text === void 0 || isCalendarDate(text, rule.minYear, rule.maxYear);
		}
		case "EpochMillis": {
			const n = numeric(value);
			return n === void 0 || Number.isInteger(n) && n >= rule.min && n <= rule.max;
		}
		case "MicrosecondGrid": {
			const n = numeric(value);
			return n === void 0 || onMicrosecondGrid(n);
		}
		case "NumberRange": {
			const n = numeric(value);
			return n === void 0 || n >= rule.min && n <= rule.max;
		}
	}
};
/** The first rule `value` fails, or `undefined` when the engine holds it exactly. */
const firstViolation = (rules, value) => rules.find((rule) => !holds(rule, value));
/**
* Does `value` satisfy every rule? `value` is a typed fact value, a bare number (a valid-time
* coordinate) or a bare string (an entity id). A rule that does not apply to the value's kind
* holds vacuously; type violations are the codec's concern, not exactness.
*/
const isExact = (rules, value) => firstViolation(rules, value) === void 0;
const render = (value) => {
	const n = numeric(value);
	if (n !== void 0) return Object.is(n, -0) ? "-0" : String(n);
	return JSON.stringify(value);
};
/** Fail with a typed `InexactValueError` when `engine` cannot hold `value` exactly. */
const requireExact = (engine, rules, value) => {
	const rule = firstViolation(rules, value);
	return rule === void 0 ? Effect.void : Effect.fail(new InexactValueError({
		engine,
		rule: rule._tag,
		value: render(value),
		message: `${engine} cannot hold ${render(value)} exactly (${rule._tag})`
	}));
};
const XSD = "http://www.w3.org/2001/XMLSchema#";
const RDF_JSON = "http://www.w3.org/1999/02/22-rdf-syntax-ns#JSON";
const familyKind = {
	string: "text",
	number: "number",
	integer: "int64",
	boolean: "boolean",
	datetime: "instant",
	ref: "ref",
	json: "json"
};
/** The most specific physical kind of a type; unions of different kinds fall back to the family. */
const kindOf = (expr, family) => {
	switch (expr._tag) {
		case "Prim": return expr.prim;
		case "Enum": return "text";
		case "Ref": return "ref";
		case "List":
		case "Struct": return "json";
		case "Constrained": return kindOf(expr.base, family);
		case "Union": {
			const kinds = new Set(expr.members.map((member) => kindOf(member, family)));
			return kinds.size === 1 ? [...kinds][0] : familyKind[family];
		}
		case "Any": return familyKind[family];
	}
};
const literal = (datatype) => ({
	kind: "literal",
	datatype
});
/**
* One declared physical type per kind per engine.
* - XTDB: int64 and JS integers are BIGINT (never a union, R1 Q3: unions travel as JSON and lose
*   precision); doubles are always DOUBLE PRECISION and must be finite (card-many lists travel as
*   JSON, which has no NaN or Infinity); instants are TIMESTAMP WITH TIME ZONE (read as text so
*   microseconds survive); JSON is canonical JSON text.
* - RDF: native XSD literals, with the 60-bit integer, 49-bit-and-%.13g double, calendar-date and
*   millisecond dateTime limits recorded as exactness rules instead of rounding (R2 4.2).
*/
const physicalFor = (kind) => {
	switch (kind) {
		case "text": return {
			xtdb: {
				type: "VARCHAR",
				encoding: "native",
				ordering: "order-key",
				exactness: [WELL_FORMED]
			},
			rdf: {
				object: literal(`${XSD}string`),
				encoding: "native",
				ordering: "order-key",
				exactness: [WELL_FORMED]
			}
		};
		case "date": return {
			xtdb: {
				type: "DATE",
				encoding: "native",
				ordering: "native",
				exactness: [CALENDAR_DATE]
			},
			rdf: {
				object: literal(`${XSD}date`),
				encoding: "native",
				ordering: "native",
				exactness: [CALENDAR_DATE]
			}
		};
		case "number": return {
			numeric: "approximate",
			xtdb: {
				type: "DOUBLE PRECISION",
				encoding: "native",
				ordering: "native",
				exactness: [FINITE]
			},
			rdf: {
				object: literal(`${XSD}double`),
				encoding: "native",
				ordering: "native",
				exactness: [QLEVER_DOUBLE]
			}
		};
		case "integer": return {
			numeric: "exact-integer",
			xtdb: {
				type: "BIGINT",
				encoding: "native",
				ordering: "native",
				exactness: [
					FINITE,
					INT64_RANGE,
					NO_NEGATIVE_ZERO
				]
			},
			rdf: {
				object: literal(`${XSD}integer`),
				encoding: "native",
				ordering: "native",
				exactness: [
					FINITE,
					QLEVER_INTEGER_RANGE,
					NO_NEGATIVE_ZERO
				]
			}
		};
		case "int64": return {
			numeric: "exact-integer",
			xtdb: {
				type: "BIGINT",
				encoding: "native",
				ordering: "native",
				exactness: []
			},
			rdf: {
				object: literal(`${XSD}integer`),
				encoding: "native",
				ordering: "native",
				exactness: [QLEVER_INTEGER_RANGE]
			}
		};
		case "boolean": return {
			xtdb: {
				type: "BOOLEAN",
				encoding: "native",
				ordering: "native",
				exactness: []
			},
			rdf: {
				object: literal(`${XSD}boolean`),
				encoding: "native",
				ordering: "native",
				exactness: []
			}
		};
		case "instant": return {
			xtdb: {
				type: "TIMESTAMP WITH TIME ZONE",
				encoding: "native",
				ordering: "native",
				exactness: [XTDB_DATETIME]
			},
			rdf: {
				object: literal(`${XSD}dateTime`),
				encoding: "native",
				ordering: "native",
				exactness: [QLEVER_DATETIME]
			}
		};
		case "ref": return {
			xtdb: {
				type: "VARCHAR",
				encoding: "native",
				ordering: "order-key",
				exactness: [WELL_FORMED]
			},
			rdf: {
				object: { kind: "iri" },
				encoding: "native",
				ordering: "order-key",
				exactness: [WELL_FORMED, NON_EMPTY]
			}
		};
		case "json": return {
			xtdb: {
				type: "VARCHAR",
				encoding: "canonical-json",
				ordering: "unordered",
				exactness: []
			},
			rdf: {
				object: literal(RDF_JSON),
				encoding: "canonical-json",
				ordering: "unordered",
				exactness: []
			}
		};
	}
};
const COORDINATES = {
	xtdb: {
		validTime: [MICROSECOND_GRID, {
			_tag: "NumberRange",
			min: -864e13,
			max: 864e13
		}],
		entityId: [WELL_FORMED]
	},
	rdf: {
		validTime: [],
		entityId: [WELL_FORMED, NON_EMPTY]
	}
};
const ENTITY_TYPE_NAME = /^[A-Z][A-Za-z0-9]*$/;
const ATTRIBUTE_KEY = /^:[a-z][a-z0-9_-]*\/[a-z][a-z0-9_-]*$/;
const fail = (reason, inputs, message) => new ProjectionSpecError({
	reason,
	inputs,
	message
});
const usagesOf = (input) => Array.isArray(input.attributes) ? input.attributes : Object.values(input.attributes);
const refTargetOf = (expr) => {
	switch (expr._tag) {
		case "Ref": return expr.kind;
		case "Constrained": return refTargetOf(expr.base);
		default: return;
	}
};
/** The canonical body hashed for the id: everything except the id itself. */
const canonicalBody = (spec) => encodeOrThrow({
	layout: spec.layout,
	rdfBase: spec.rdfBase,
	inexactPolicy: spec.inexactPolicy,
	coordinates: spec.coordinates,
	entityTypes: spec.entityTypes.map((entity) => ({
		...entity,
		attributes: entity.attributes.map((attribute) => ({
			...attribute,
			type: canonical(attribute.type)
		}))
	}))
});
/**
* Compile entity types into a projection spec. Fails, naming every offending input, on: XTDB
* column collisions (`-` vs `_`), table collisions (case-folded names such as `ABTest`/`AbTest`),
* reserved and SQL-keyword names, reserved namespaces, invalid names, duplicate types or usages,
* one key used with two value types, refs to types not in the inputs, binary64 attributes when
* `approximateNumbers` is `reject`, an invalid or ledger-overlapping `rdfBase`, and types with no
* single physical type (`Any`, unions across storage families). The checks match the release path
* (`fromRelease`), so both paths accept and reject the same inputs.
*/
const compile = (inputs, options = {}) => Effect.gen(function* () {
	const rdfBase = options.rdfBase ?? "urn:triplex:";
	const baseProblem = validateRdfBase(rdfBase);
	if (baseProblem !== void 0) return yield* fail("invalid-option", [rdfBase], `rdfBase ${baseProblem}`);
	const inexactPolicy = options.inexactPolicy ?? "ledger-only";
	if (inexactPolicy !== "ledger-only" && inexactPolicy !== "reject") return yield* fail("invalid-option", [String(inexactPolicy)], "Unknown inexactPolicy");
	const seenTypes = /* @__PURE__ */ new Set();
	const tables = /* @__PURE__ */ new Map();
	const columns = /* @__PURE__ */ new Map();
	const keyTypes = /* @__PURE__ */ new Map();
	const refTargets = [];
	const entityTypes = [];
	for (const input of [...inputs].sort((a, b) => a.entityType < b.entityType ? -1 : 1)) {
		const name = input.entityType;
		if (!ENTITY_TYPE_NAME.test(name)) return yield* fail("invalid-name", [name], `Entity type ${name} must be PascalCase`);
		if (seenTypes.has(name)) return yield* fail("duplicate-entity-type", [name], `Entity type ${name} is listed twice`);
		seenTypes.add(name);
		const table = xtdbTable(name);
		if (isReservedXtdbTable(table) || isSqlKeyword(table)) return yield* fail("reserved-name", [name], `Entity type ${name} maps to reserved XTDB table name ${table}`);
		const tableOwner = tables.get(table);
		if (tableOwner !== void 0) return yield* fail("table-collision", [tableOwner, name], `Entity types ${tableOwner} and ${name} both map to XTDB table ${table}`);
		tables.set(table, name);
		const keys = /* @__PURE__ */ new Set();
		const attributes = [];
		for (const usage of [...usagesOf(input)].sort((a, b) => a.key < b.key ? -1 : 1)) {
			const key = usage.key;
			const where = `${name}.${key}`;
			if (!ATTRIBUTE_KEY.test(key)) return yield* fail("invalid-name", [where], `Attribute key ${key} must be a lowercase namespaced keyword`);
			if (key.startsWith(":triplex/") || key.startsWith(":_tx/")) return yield* fail("reserved-namespace", [where], `${key} is reserved by Triplex`);
			if (keys.has(key)) return yield* fail("duplicate-attribute", [where], `${name} uses ${key} twice`);
			keys.add(key);
			const column = xtdbColumn(key);
			if (isReservedXtdbColumn(column)) return yield* fail("reserved-name", [key], `Attribute ${key} maps to reserved XTDB column name ${column}`);
			const columnOwner = columns.get(column);
			if (columnOwner !== void 0 && columnOwner !== key) return yield* fail("column-collision", [columnOwner, key], `Attributes ${columnOwner} and ${key} both map to XTDB column ${column}`);
			columns.set(column, key);
			const canonical$1 = canonical(usage.type);
			const typeOwner = keyTypes.get(key);
			if (typeOwner !== void 0 && typeOwner.canonical !== canonical$1) return yield* fail("attribute-type-conflict", [typeOwner.where, where], `Attribute ${key} has different value types on ${typeOwner.where} and ${where}; one key has one value type`);
			keyTypes.set(key, {
				where,
				canonical: canonical$1
			});
			for (const target of referenceKinds(usage.type)) refTargets.push({
				where,
				target
			});
			let storage;
			try {
				storage = storageFamily(usage.type, where);
			} catch (error) {
				return yield* fail("unsupported-type", [where], `Attribute ${key} on ${name} has no single physical type: ${error.message ?? String(error)}`);
			}
			const physical = physicalFor(kindOf(usage.type, storage));
			if (physical.numeric === "approximate" && options.approximateNumbers === "reject") return yield* fail("approximate-number", [where], `Attribute ${key} on ${name} is binary64; business values must be scaled integers`);
			const refTarget = refTargetOf(usage.type);
			attributes.push({
				key,
				type: usage.type,
				required: usage.required,
				cardinality: usage.cardinality,
				storage,
				...physical.numeric === void 0 ? {} : { numeric: physical.numeric },
				...refTarget === void 0 ? {} : { refTarget },
				xtdb: {
					column,
					list: usage.cardinality === "many",
					...physical.xtdb
				},
				rdf: {
					predicate: rdfAttribute(key, rdfBase),
					...physical.rdf
				}
			});
		}
		entityTypes.push({
			entityType: name,
			xtdb: { table },
			rdf: { class: rdfClass(name, rdfBase) },
			attributes
		});
	}
	for (const { where, target } of refTargets) if (!seenTypes.has(target)) return yield* fail("unknown-ref-target", [where, target], `${where} references entity type ${target}, which is not in this spec`);
	const body = {
		layout: LAYOUT,
		rdfBase,
		inexactPolicy,
		entityTypes,
		coordinates: COORDINATES
	};
	return {
		id: hash(Domain.projectionSpec, canonicalBody(body)),
		...body
	};
});
/**
* Compile the spec of a persisted release. Equal content gives the same id as compiling the
* `EntityType` objects the release was built from (R9 section 3.2, option C).
*/
const fromRelease = (snapshot, options = {}) => compile$1(snapshot).pipe(Effect.flatMap((compiled) => compile(compiled.entities, options)));
/** The spec of one entity type, if projected. */
const entityType = (spec, name) => spec.entityTypes.find((entity) => entity.entityType === name);
/** The spec of one attribute usage, if projected. */
const attribute = (spec, entityTypeName, key) => entityType(spec, entityTypeName)?.attributes.find((usage) => usage.key === key);
//#endregion
export { LAYOUT, ProjectionSpec_exports, attribute, compile, entityType, firstViolation, fromRelease, isExact, requireExact };

//# sourceMappingURL=ProjectionSpec.js.map
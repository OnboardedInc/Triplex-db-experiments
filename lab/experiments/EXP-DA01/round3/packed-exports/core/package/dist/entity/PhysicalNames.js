import { __exportAll } from "../_virtual/_rolldown/runtime.js";
//#region src/entity/PhysicalNames.ts
var PhysicalNames_exports = /* @__PURE__ */ __exportAll({
	DEFAULT_RDF_BASE: () => DEFAULT_RDF_BASE,
	LEDGER_IRI_NAMESPACES: () => LEDGER_IRI_NAMESPACES,
	decodeEntityId: () => decodeEntityId,
	encodeEntityId: () => encodeEntityId,
	isReservedXtdbColumn: () => isReservedXtdbColumn,
	isReservedXtdbTable: () => isReservedXtdbTable,
	isSqlKeyword: () => isSqlKeyword,
	rdfAttribute: () => rdfAttribute,
	rdfClass: () => rdfClass,
	rdfEntity: () => rdfEntity,
	validateRdfBase: () => validateRdfBase,
	xtdbColumn: () => xtdbColumn,
	xtdbNormalForm: () => xtdbNormalForm,
	xtdbTable: () => xtdbTable
});
/**
* Pure physical-name functions for the entity projection.
*
* [EXP-R01] Why: one function per engine computes every physical name from schema keys and entity
* type names, never from TypeScript aliases, so renaming an alias never renames stored data
* (decisions D1, D3). Inspired by: lab/research/R3-artifacts/physical-names.mjs (vectors and the
* 7,380-string injectivity check), references/xtdb/api/src/main/kotlin/xtdb/util/NormalForm.kt:8-14
* (XTDB normal form), lab/research/R3-orm-prior-art.md sections 4.2.3 and 4.3.1-4.3.3.
* Rejected: `encodeURIComponent` for entity ids (leaves `~ ! ' ( ) *` unencoded, which breaks the
* prefixed-name rule); banning `_` in attribute keys (D3 chose a compile-time collision check).
*/
const ATTRIBUTE_KEY = /^:[a-z][a-z0-9_-]*\/[a-z][a-z0-9_-]*$/;
const ENTITY_TYPE_NAME = /^[A-Z][A-Za-z0-9]*$/;
/** Port of XTDB `NormalForm.normalForm0`: `-` to `_`, leading `xt/` to `_`, `. / $` to `$`, lowercase. */
const xtdbNormalForm = (name) => name.replaceAll("-", "_").replace(/^xt\//, "_").split(/[./$]/).join("$").toLowerCase();
/** `:person/first-name` becomes `person$first_name`, the column XTQL reads as `person/first-name`. */
const xtdbColumn = (key) => {
	if (!ATTRIBUTE_KEY.test(key)) throw new TypeError(`Invalid attribute key ${key}`);
	return xtdbNormalForm(key.slice(1));
};
/** PascalCase entity type to snake_case, acronym aware: `HTTPRoute` becomes `http_route`. */
const xtdbTable = (entityType) => {
	if (!ENTITY_TYPE_NAME.test(entityType)) throw new TypeError(`Invalid entity type ${entityType}`);
	return entityType.replace(/([a-z0-9])([A-Z])/g, "$1_$2").replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2").toLowerCase();
};
/** Table names a projection must never produce (XTDB system tables, Triplex ledger tables). */
const isReservedXtdbTable = (table) => table.startsWith("_") || table.startsWith("xt") || table.startsWith("tx_") || table.startsWith("pg_") || table.startsWith("triplex_") || table === "information_schema";
/** Column names a projection must never produce (`_id`, `_valid_from`, projection system columns). */
const isReservedXtdbColumn = (column) => column.startsWith("_") || column.startsWith("xt$");
/** The default RDF base, matching the IRIs the QLever adapter already writes. */
const DEFAULT_RDF_BASE = "urn:triplex:";
/** Space, control characters and `<>"{}|\^` + backtick are not allowed in an IRI (RFC 3987). */
const IRI_FORBIDDEN = { test: (text) => [...text].some((ch) => ch.charCodeAt(0) <= 32 || "<>\"{}|\\^`".includes(ch)) };
/**
* SQL words a table name cannot be without quoting. The first five were rejected unquoted by
* XTDB 2.2 in R1 Q3's 41-word probe; the rest are core SQL keywords, rejected conservatively so
* raw SQL over the projection never needs quoted table names (VERIFY F6).
*/
const SQL_KEYWORDS = new Set([
	"order",
	"group",
	"default",
	"from",
	"to",
	"all",
	"and",
	"any",
	"as",
	"between",
	"by",
	"case",
	"create",
	"cross",
	"delete",
	"distinct",
	"drop",
	"else",
	"end",
	"exists",
	"false",
	"full",
	"having",
	"in",
	"inner",
	"insert",
	"intersect",
	"into",
	"is",
	"join",
	"left",
	"like",
	"limit",
	"natural",
	"not",
	"null",
	"offset",
	"on",
	"or",
	"outer",
	"right",
	"select",
	"set",
	"table",
	"then",
	"true",
	"union",
	"update",
	"using",
	"values",
	"when",
	"where",
	"with"
]);
const isSqlKeyword = (name) => SQL_KEYWORDS.has(name);
/**
* IRI namespaces the QLever ledger and engine metadata already use (packages/qlever/src). Domain
* IRIs must stay outside them so domain-pattern queries see only the current graph (C7.2).
*/
const LEDGER_IRI_NAMESPACES = [
	"urn:triplex:assertion",
	"urn:triplex:claim",
	"urn:triplex:derived",
	"urn:triplex:field",
	"urn:triplex:meta",
	"urn:triplex:native",
	"urn:triplex:operation",
	"urn:triplex:scope"
];
/**
* Validate a base IRI: absolute (`scheme:`), no IRI-forbidden characters, ends with `:`, `/` or
* `#`, and its attribute, type and entity namespaces do not overlap a ledger namespace.
*/
const validateRdfBase = (base) => {
	if (!/^[A-Za-z][A-Za-z0-9+.-]*:/.test(base)) return "must be an absolute IRI with a scheme";
	if (IRI_FORBIDDEN.test(base)) return "contains characters that are not allowed in an IRI";
	if (!/[:/#]$/.test(base)) return "must end with ':', '/' or '#'";
	const sep = separator(base);
	for (const domain of [
		"attr",
		"type",
		"entity"
	].map((kind) => `${base}${kind}${sep}`)) for (const ledger of LEDGER_IRI_NAMESPACES) if (domain.startsWith(ledger) || ledger.startsWith(domain)) return `puts domain IRIs ${domain}... inside the ledger namespace ${ledger}`;
};
/** `urn:` style bases join segments with `:`, hierarchical bases (`http.../`, `...#`) with `/`. */
function separator(base) {
	return base.endsWith(":") ? ":" : "/";
}
/** `:person/first-name` becomes `<base>attr:person:first-name` (or `<base>attr/person/first-name`). */
const rdfAttribute = (key, base = DEFAULT_RDF_BASE) => {
	if (!ATTRIBUTE_KEY.test(key)) throw new TypeError(`Invalid attribute key ${key}`);
	const [namespace, name] = key.slice(1).split("/");
	const sep = separator(base);
	return `${base}attr${sep}${namespace}${sep}${name}`;
};
/** `Person` becomes `<base>type:Person`. */
const rdfClass = (entityType, base = DEFAULT_RDF_BASE) => {
	if (!ENTITY_TYPE_NAME.test(entityType)) throw new TypeError(`Invalid entity type ${entityType}`);
	return `${base}type${separator(base)}${entityType}`;
};
/**
* Canonical, injective percent-encoding of an entity id as an IRI segment. Keeps `A-Z a-z 0-9 _ :`,
* `-` when not first and `.` when neither first nor last; every other UTF-8 byte becomes `%XX` in
* uppercase hex. The result is also a valid prefixed-name local part and never a dot segment.
* Throws on the empty id and on ids that are not well-formed Unicode.
*/
const encodeEntityId = (id) => {
	if (id.length === 0) throw new TypeError("Entity id must not be empty");
	if (!id.isWellFormed()) throw new TypeError("Entity id is not well-formed Unicode");
	const bytes = new TextEncoder().encode(id);
	const last = bytes.length - 1;
	let out = "";
	bytes.forEach((byte, index) => {
		const ascii = byte < 128;
		const ch = String.fromCharCode(byte);
		const safe = ascii && (/[A-Za-z0-9_:]/.test(ch) || ch === "-" && index !== 0 || ch === "." && index !== 0 && index !== last);
		out += safe ? ch : `%${byte.toString(16).toUpperCase().padStart(2, "0")}`;
	});
	return out;
};
/** Inverse of `encodeEntityId`; accepts only canonical encodings. */
const decodeEntityId = (segment) => {
	const bytes = [];
	for (let index = 0; index < segment.length; index++) if (segment[index] === "%") {
		const hex = segment.slice(index + 1, index + 3);
		if (!/^[0-9A-F]{2}$/.test(hex)) throw new TypeError("Non-canonical percent escape");
		bytes.push(Number.parseInt(hex, 16));
		index += 2;
	} else bytes.push(segment.charCodeAt(index));
	const id = new TextDecoder("utf-8", { fatal: true }).decode(new Uint8Array(bytes));
	if (encodeEntityId(id) !== segment) throw new TypeError("Non-canonical entity id encoding");
	return id;
};
/** `person:maria` becomes `<base>entity:person:maria`. */
const rdfEntity = (id, base = DEFAULT_RDF_BASE) => `${base}entity${separator(base)}${encodeEntityId(id)}`;
//#endregion
export { DEFAULT_RDF_BASE, LEDGER_IRI_NAMESPACES, PhysicalNames_exports, decodeEntityId, encodeEntityId, isReservedXtdbColumn, isReservedXtdbTable, isSqlKeyword, rdfAttribute, rdfClass, rdfEntity, validateRdfBase, xtdbColumn, xtdbNormalForm, xtdbTable };

//# sourceMappingURL=PhysicalNames.js.map
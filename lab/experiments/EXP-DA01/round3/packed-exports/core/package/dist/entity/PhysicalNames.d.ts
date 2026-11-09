declare namespace PhysicalNames_d_exports {
  export { DEFAULT_RDF_BASE, LEDGER_IRI_NAMESPACES, decodeEntityId, encodeEntityId, isReservedXtdbColumn, isReservedXtdbTable, isSqlKeyword, rdfAttribute, rdfClass, rdfEntity, validateRdfBase, xtdbColumn, xtdbNormalForm, xtdbTable };
}
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
/** Port of XTDB `NormalForm.normalForm0`: `-` to `_`, leading `xt/` to `_`, `. / $` to `$`, lowercase. */
declare const xtdbNormalForm: (name: string) => string;
/** `:person/first-name` becomes `person$first_name`, the column XTQL reads as `person/first-name`. */
declare const xtdbColumn: (key: string) => string;
/** PascalCase entity type to snake_case, acronym aware: `HTTPRoute` becomes `http_route`. */
declare const xtdbTable: (entityType: string) => string;
/** Table names a projection must never produce (XTDB system tables, Triplex ledger tables). */
declare const isReservedXtdbTable: (table: string) => boolean;
/** Column names a projection must never produce (`_id`, `_valid_from`, projection system columns). */
declare const isReservedXtdbColumn: (column: string) => boolean;
/** The default RDF base, matching the IRIs the QLever adapter already writes. */
declare const DEFAULT_RDF_BASE = "urn:triplex:";
declare const isSqlKeyword: (name: string) => boolean;
/**
 * IRI namespaces the QLever ledger and engine metadata already use (packages/qlever/src). Domain
 * IRIs must stay outside them so domain-pattern queries see only the current graph (C7.2).
 */
declare const LEDGER_IRI_NAMESPACES: readonly ["urn:triplex:assertion", "urn:triplex:claim", "urn:triplex:derived", "urn:triplex:field", "urn:triplex:meta", "urn:triplex:native", "urn:triplex:operation", "urn:triplex:scope"];
/**
 * Validate a base IRI: absolute (`scheme:`), no IRI-forbidden characters, ends with `:`, `/` or
 * `#`, and its attribute, type and entity namespaces do not overlap a ledger namespace.
 */
declare const validateRdfBase: (base: string) => string | undefined;
/** `:person/first-name` becomes `<base>attr:person:first-name` (or `<base>attr/person/first-name`). */
declare const rdfAttribute: (key: string, base?: string) => string;
/** `Person` becomes `<base>type:Person`. */
declare const rdfClass: (entityType: string, base?: string) => string;
/**
 * Canonical, injective percent-encoding of an entity id as an IRI segment. Keeps `A-Z a-z 0-9 _ :`,
 * `-` when not first and `.` when neither first nor last; every other UTF-8 byte becomes `%XX` in
 * uppercase hex. The result is also a valid prefixed-name local part and never a dot segment.
 * Throws on the empty id and on ids that are not well-formed Unicode.
 */
declare const encodeEntityId: (id: string) => string;
/** Inverse of `encodeEntityId`; accepts only canonical encodings. */
declare const decodeEntityId: (segment: string) => string;
/** `person:maria` becomes `<base>entity:person:maria`. */
declare const rdfEntity: (id: string, base?: string) => string;
//#endregion
export { DEFAULT_RDF_BASE, LEDGER_IRI_NAMESPACES, PhysicalNames_d_exports, decodeEntityId, encodeEntityId, isReservedXtdbColumn, isReservedXtdbTable, isSqlKeyword, rdfAttribute, rdfClass, rdfEntity, validateRdfBase, xtdbColumn, xtdbNormalForm, xtdbTable };
//# sourceMappingURL=PhysicalNames.d.ts.map
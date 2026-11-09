import { DatalogQuery } from "../datalog/schema.js";
import { QueryDependencies } from "./types.js";

//#region src/subscriptions/extract-dependencies.d.ts
/**
 * Extract the entity type from an attribute.
 *
 * @example
 * extractEntityType(":employee/name") // "employee"
 * extractEntityType(":department/budget") // "department"
 * extractEntityType(":_link/type") // "_link"
 * extractEntityType("invalid") // null
 */
declare function extractEntityType(attribute: string): string | null;
/**
 * Extract dependencies from a Datalog query.
 *
 * Processes all clause types:
 * - Pattern clauses: extract attributes, entity types, bound entity IDs
 * - Not clauses: recursively process inner pattern
 * - Or clauses: process all patterns in the array
 * - Rule applications: add the rule name and walk every matching rule body
 * - Predicate clauses: ignored (they filter, don't add read dependencies)
 *
 * @param query The Datalog query to analyze
 * @returns Dependencies describing what the query reads
 */
declare function extractDependencies(query: DatalogQuery): QueryDependencies;
//#endregion
export { extractDependencies, extractEntityType };
//# sourceMappingURL=extract-dependencies.d.ts.map
import { DatalogQuery } from "../datalog/schema.js";

//#region src/subscriptions/query-hash.d.ts
/**
 * Hash a Datalog query using Effect's Hash module.
 *
 * Two structurally identical queries will produce the same hash.
 * The hash is a 32-bit integer, so collisions are possible but rare.
 * Collisions are acceptable since they only result in extra invalidation
 * checks (conservative approach - no false negatives).
 *
 * @example
 * ```typescript
 * const query1: DatalogQuery = {
 *   find: ["?name"],
 *   where: [["?emp", ":employee/name", "?name"]],
 * };
 * const query2: DatalogQuery = {
 *   find: ["?name"],
 *   where: [["?emp", ":employee/name", "?name"]],
 * };
 *
 * hashQuery(query1) === hashQuery(query2) // true
 * ```
 *
 * @param query The Datalog query to hash
 * @returns A 32-bit integer hash
 */
declare function hashQuery(query: DatalogQuery): number;
//#endregion
export { hashQuery };
//# sourceMappingURL=query-hash.d.ts.map
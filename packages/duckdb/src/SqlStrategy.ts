import { SqliteDialect, type SqlDialect } from "@triplex-build/triplex-sql";
/** Existing compiler protocol with explicit exact int64 carriers. Physical
 * engine identity remains DuckDB; this does not claim SQLite storage semantics.
 */
export const DuckDBSqlStrategy: SqlDialect & {
  readonly exactIntegers: true;
  readonly keyedRecursion: true;
} = Object.freeze({
  ...SqliteDialect,
  exactIntegers: true,
  keyedRecursion: true,
  limitOffset: (limit: number | undefined, offset: number | undefined) =>
    `${limit === undefined ? "" : `LIMIT ${limit}`} ${offset === undefined ? "" : `OFFSET ${offset}`}`.trim(),
});

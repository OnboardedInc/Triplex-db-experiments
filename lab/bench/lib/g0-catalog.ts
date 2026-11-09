// [EXP-K01-R13] Why: information_schema.clj:569-585 derives tables/columns from the query Snapshot, not CREATE declarations. Rejected: catching planner errors as evidence of an empty table or NULL column.
export type Catalog = Record<string, Record<string, string>>;
export function typedCatalog(tables: unknown, columns: unknown): Catalog {
  if (!Array.isArray(tables) || !Array.isArray(columns)) throw Error("G0 incomplete catalog");
  const out: Catalog = Object.create(null);
  for (const t of tables) {
    if (!t || typeof t.table_name !== "string" || !t.table_name || Object.hasOwn(out, t.table_name))
      throw Error("G0 invalid catalog table");
    out[t.table_name] = Object.create(null);
  }
  for (const c of columns) {
    if (
      !c ||
      typeof c.table_name !== "string" ||
      !Object.hasOwn(out, c.table_name) ||
      typeof c.column_name !== "string" ||
      !c.column_name ||
      typeof c.xt_type !== "string" ||
      !c.xt_type ||
      Object.hasOwn(out[c.table_name], c.column_name)
    )
      throw Error("G0 invalid catalog column");
    out[c.table_name][c.column_name] = c.xt_type;
  }
  for (const cols of Object.values(out))
    if (!Object.keys(cols).length) throw Error("G0 catalog table without columns");
  return out;
}

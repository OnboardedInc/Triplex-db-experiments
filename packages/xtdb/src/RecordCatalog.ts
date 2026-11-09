import type { XtdbClient } from "./XtdbClient.js";

export type RecordCatalog = ReadonlyMap<string, ReadonlyMap<string, string>>;
export const recordCatalogSql = `SELECT t.table_name, c.column_name, c.xt_type
FROM information_schema.tables t LEFT JOIN information_schema.columns c
ON t.table_schema = c.table_schema AND t.table_name = c.table_name
WHERE t.table_schema = 'public' AND t.table_name IN ('tx_meta', 'tx_assertions')
ORDER BY t.table_name, c.column_name`;
const present = new WeakMap<XtdbClient, RecordCatalog>();

// [EXP-RT01] Why: K01 R13 certifies physical absence from typed current catalog rows, not failed SQL planning. Rejected: treating CREATE declarations or a caught missing-table error as an empty cut.
export const readRecordCatalog = async (
  client: XtdbClient,
  signal?: AbortSignal,
  refresh = false,
): Promise<RecordCatalog> => {
  const cached = refresh ? undefined : present.get(client);
  if (cached) return cached;
  const rows = await client.query(recordCatalogSql, [], undefined, {
    ...(signal ? { signal } : {}),
    timeoutMs: 30000,
  });
  const catalog = new Map<string, Map<string, string>>();
  for (const row of rows) {
    const table = row["table_name"],
      column = row["column_name"],
      type = row["xt_type"];
    if (
      (table !== "tx_meta" && table !== "tx_assertions") ||
      typeof column !== "string" ||
      !column ||
      typeof type !== "string" ||
      !type
    )
      throw new TypeError("Invalid record catalog row");
    const columns = catalog.get(table) ?? new Map<string, string>();
    if (columns.has(column)) throw new TypeError("Duplicate record catalog column");
    columns.set(column, type);
    catalog.set(table, columns);
  }
  // [EXP-RT01] Why: cache only a queryable positive schema, never absence or a source cut. Rejected: caching empty catalog rows (could conceal a later first insert). If schema disappears, its query fails rather than becoming an empty answer.
  const meta = catalog.get("tx_meta");
  if (["scope_key", "position", "stamp"].every((column) => meta?.has(column)))
    present.set(client, catalog);
  else present.delete(client);
  return catalog;
};

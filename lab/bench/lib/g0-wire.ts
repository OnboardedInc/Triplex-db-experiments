// [EXP-K01-R9] Why: Postgres.js .raw() retains field bytes and result.columns type OIDs (postgres/src/connection.js DataRow). Rejected: client.query's decoded JS numbers (int/float type and temporal precision may already be lost).
import { createRequire } from "node:module";
import { wireValue } from "./g0-values.ts";
export async function openWire(endpoint: string) {
  const require = createRequire(new URL("../../../packages/xtdb/package.json", import.meta.url));
  const postgres = require("postgres");
  const sql = postgres(endpoint, {
    max: 1,
    prepare: false,
    connect_timeout: 10,
    onnotice: () => {},
  });
  return {
    async scan(
      query: string,
      params: unknown[],
      signal: AbortSignal,
    ): Promise<Record<string, unknown>[]> {
      signal.throwIfAborted();
      const pending = sql.unsafe(query.replace("scope_key = ?", "scope_key = $1"), params).raw();
      const cancel = () => {
        void Promise.resolve(pending.cancel()).catch(() => {});
      };
      signal.addEventListener("abort", cancel, { once: true });
      try {
        const rows = await pending;
        signal.throwIfAborted();
        return wireRows(rows);
      } finally {
        signal.removeEventListener("abort", cancel);
      }
    },
    close: () => sql.end({ timeout: 5 }),
  };
}

// [EXP-K01-R9] Why: validate the complete pgwire column/row frame before constructing typed cells. Rejected: absent metadata or non-buffer fields standing in for stored NULLs.
export function wireRows(rows: any): Record<string, unknown>[] {
  const cols = rows.columns;
  if (
    !Array.isArray(rows) ||
    !Array.isArray(cols) ||
    cols.some((c: any) => typeof c.name !== "string" || !c.name) ||
    new Set(cols.map((c: any) => c.name)).size !== cols.length ||
    (rows.length && !cols.length)
  )
    throw Error("G0 incomplete wire columns");
  return rows.map((row: any[]) => {
    if (!Array.isArray(row) || row.length !== cols.length) throw Error("G0 partial wire row");
    return Object.fromEntries(
      cols.map((c: any, i: number) => {
        const v = row[i];
        if (v !== null && !(v instanceof Uint8Array)) throw Error("G0 missing wire bytes");
        return [c.name, v === null ? null : wireValue(c.type, v)];
      }),
    );
  });
}

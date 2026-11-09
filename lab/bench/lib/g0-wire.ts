// [EXP-K01-R9] Why: Postgres.js .raw() retains field bytes and result.columns type OIDs (postgres/src/connection.js DataRow). Rejected: client.query's decoded JS numbers (int/float type and temporal precision may already be lost).
import { createRequire } from "node:module";
import { nativeType, nativeCatalog } from "./g0-native.ts";
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
      const table = /FROM (tx_[a-z_]+)\b/.exec(query)?.[1];
      if (!table) throw Error("G0 unbound native scan");
      const catalog = async () => {
        signal.throwIfAborted();
        const p = sql.unsafe(
          "SELECT column_name, xt_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 ORDER BY column_name",
          [table],
        );
        const stop = () => {
          void Promise.resolve(p.cancel()).catch(() => {});
        };
        signal.addEventListener("abort", stop, { once: true });
        try {
          return nativeCatalog(await p);
        } finally {
          signal.removeEventListener("abort", stop);
        }
      };
      const before = await catalog();
      const pending = sql.unsafe(query.replace("scope_key = ?", "scope_key = $1"), params).raw();
      const cancel = () => {
        void Promise.resolve(pending.cancel()).catch(() => {});
      };
      signal.addEventListener("abort", cancel, { once: true });
      try {
        const rows = await pending;
        signal.throwIfAborted();
        const after = await catalog();
        if (JSON.stringify(before) !== JSON.stringify(after))
          throw Error("G0 native catalog changed during scan");
        return wireRows(rows, before);
      } finally {
        signal.removeEventListener("abort", cancel);
      }
    },
    close: () => sql.end({ timeout: 5 }),
  };
}

// [EXP-K01-R9] Why: validate the complete pgwire column/row frame before constructing typed cells. Rejected: absent metadata or non-buffer fields standing in for stored NULLs.
export function wireRows(rows: any, types?: Record<string, string>): Record<string, unknown>[] {
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
        if (v === null) return [c.name, null];
        wireValue(c.type, v);
        return [c.name, wireValue(c.type, v, nativeType(c.type, types?.[c.name] ?? c.nativeType))];
      }),
    );
  });
}

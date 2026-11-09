import { typedCatalog, type Catalog } from "./g0-catalog.ts";
import { openWire } from "./g0-wire.ts";
// [EXP-K01-R8] Why: read complete stored rows on the measured endpoint with deadlines. Rejected: omitting validation, receipt or side-table columns from the content gate.
import { pathToFileURL } from "node:url";
import path from "node:path";
import {
  admitG0,
  readG0,
  readE1G0,
  fields,
  bounded,
  hash,
  type Reader,
  type Table,
  type Expected,
  type Pin,
} from "./g0.ts";
import { n01SeedCounts } from "./n01-counts.ts";
export function expectedN01(m: any): Expected {
  const plan = n01SeedCounts(m.subjects, m.seedInputs?.options?.seedBatchFacts);
  const n = plan.business;
  if (
    m.accounts !== plan.accounts ||
    m.result?.commands !== plan.commands ||
    !m.result?.complete ||
    m.result.seededSubjects !== m.subjects ||
    m.result.assertions !== n ||
    m.result.expectedAssertions !== n ||
    m.result.commands !== m.result.lastPosition
  )
    throw Error("G0 manifest/closed form differs");
  return {
    scope: m.scope,
    position: m.result.lastPosition,
    world: "N01",
    // [EXP-K01-R13] Why: the N01 seed writes only core tables; valid-to/retraction cells stay NULL, and value channels follow generator kinds. Rejected: querying absent side tables or silently ignoring unexpected side rows/column values.
    tables: Object.fromEntries(
      Object.entries(fields).map(([t, cols]) => [
        t,
        {
          written: ["tx_assertions", "tx_claims", "tx_attempts", "tx_meta"].includes(t),
          columns: Object.fromEntries(
            cols.map((c) => [
              c,
              ["tx_assertions", "tx_claims", "tx_attempts", "tx_meta"].includes(t) &&
                !(
                  t === "tx_assertions" &&
                  ["valid_to", "retracted_at", "retracted_position", "retract_tx_id"].includes(c)
                ) &&
                (c !== "value_boolean" || plan.valueKinds.includes("boolean")),
            ]),
          ),
        },
      ]),
    ),
    counts: {
      ...Object.fromEntries(Object.keys(fields).map((t) => [t, 0])),
      tx_assertions: plan.storedAssertions,
      tx_claims: m.result.commands,
      tx_attempts: m.result.commands,
      tx_meta: 1,
    },
  };
}
export async function openG0(endpoint: string) {
  const root = path.resolve(import.meta.dirname, "../../..");
  const { makeXtdbClient }: any = await import(
    pathToFileURL(path.join(root, "packages/xtdb/dist/index.js")).href
  );
  const { DatabaseScope }: any = await import(
    pathToFileURL(path.join(root, "packages/core/dist/runtime/index.js")).href
  );
  const client = makeXtdbClient(endpoint, { maxConnections: 1 });
  const wire = await openWire(endpoint);
  const query = (sql: string, params: unknown[] = [], signal?: AbortSignal): Promise<any[]> =>
    bounded((s) =>
      client.query(sql, params, undefined, {
        signal: signal ? AbortSignal.any([signal, s]) : s,
        timeoutMs: 600_000,
      }),
    );
  const scopeKey = (scope: string) => DatabaseScope.test(scope);
  let currentCatalog: Catalog | undefined;
  const catalogValue = () => {
    if (!currentCatalog) throw Error("G0 catalog not read");
    return currentCatalog;
  };
  const reader: Reader = {
    endpoint,
    catalog: async (signal) => {
      currentCatalog = typedCatalog(
        await query(
          "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name",
          [],
          signal,
        ),
        await query(
          "SELECT table_name,column_name,xt_type FROM information_schema.columns WHERE table_schema = 'public' ORDER BY table_name,column_name",
          [],
          signal,
        ),
      );
      return currentCatalog;
    },
    count: async (table, scope, signal, allScopes = false) => {
      // [EXP-K01-R13] Why: this complete typed catalog proves absence; written-table policy refuses it before counting. Rejected: catching a failed COUNT and returning zero.
      if (!catalogValue()[table]) return 0;
      const r = await query(
        `SELECT COUNT(*) AS n FROM ${table} FOR ALL VALID_TIME${allScopes || !Object.hasOwn(catalogValue()[table], "scope_key") ? "" : " WHERE scope_key = ?"}`,
        allScopes || !Object.hasOwn(catalogValue()[table], "scope_key") ? [] : [scopeKey(scope)],
        signal,
      );
      if (r.length !== 1 || !Number.isSafeInteger(Number(r[0].n))) throw Error("G0 invalid count");
      return Number(r[0].n);
    },
    scopes: async (signal) => {
      if (
        !catalogValue().tx_meta ||
        !Object.hasOwn(catalogValue().tx_meta, "scope_key") ||
        !Object.hasOwn(catalogValue().tx_meta, "position")
      )
        throw Error("G0 missing scope catalog");
      return (
        await query(
          "SELECT scope_key, position FROM tx_meta FOR ALL VALID_TIME ORDER BY scope_key",
          [],
          signal,
        )
      ).map((r) => ({ scope_key: String(r.scope_key), position: Number(r.position) }));
    },
    async *scan(table: Table, scope: string, signal: AbortSignal) {
      const inventory = catalogValue()[table];
      // [EXP-K01-R13] Why: an absent table has no rows only when certified by this read's catalog. Rejected: a stale catalog or an ignored SQL error as an empty scan.
      if (!inventory) return;
      const cols = fields[table].filter((c) => Object.hasOwn(inventory, c));
      const scoped = Object.hasOwn(inventory, "scope_key");
      const pageSize = 4096;
      for (let offset = 0; ; offset += pageSize) {
        const rows = await bounded((s) =>
          wire.scan(
            `SELECT * FROM ${table} FOR ALL VALID_TIME${scoped ? " WHERE scope_key = ?" : ""}${cols.length ? ` ORDER BY ${cols.join(", ")}` : ""} LIMIT ${pageSize} OFFSET ${offset}`,
            scoped ? [scopeKey(scope)] : [],
            AbortSignal.any([signal, s]),
          ),
        );
        // [EXP-K01-R8] Why: XTDB sparse SELECT * omits never-stored NULL columns; fill only declared NULLs and retain every returned column. Rejected: a fixed projection that drops dynamic bindings.
        for (const row of rows)
          yield { ...Object.fromEntries(fields[table].map((c) => [c, null])), ...row };
        if (rows.length < pageSize) break;
      }
    },
  };
  return {
    reader,
    query,
    scopeKey,
    close: () =>
      bounded(async () => {
        await Promise.all([client.close(), wire.close()]);
      }, 30_000),
  };
}
export async function pinXtdb(endpoint: string, m: any) {
  const h = await openG0(endpoint);
  try {
    return await readE1G0(logicalReader(h.reader, h.scopeKey, m.scope), expectedN01(m));
  } finally {
    await h.close();
  }
}
function logicalReader(reader: Reader, key: (s: string) => string, scope: string): Reader {
  return {
    ...reader,
    scopes: async (signal) =>
      (await reader.scopes(signal)).map((r) => ({
        ...r,
        scope_key: r.scope_key === key(scope) ? scope : r.scope_key,
      })),
  };
}
export async function checkXtdb(endpoint: string, m: any, pin: Pin) {
  const h = await openG0(endpoint);
  try {
    return await admitG0(logicalReader(h.reader, h.scopeKey, m.scope), pin, expectedN01(m));
  } finally {
    await h.close();
  }
}
export async function quietXtdb(endpoint: string, expected?: { L: string; T: number }) {
  const h = await openG0(endpoint);
  try {
    if (Number((await h.query("SELECT 1 AS n"))[0]?.n) !== 1) throw Error("K2 query refusal");
    let L = "",
      T = -1;
    for (let i = 0; i < 3; i++) {
      if (i) await new Promise((r) => setTimeout(r, 5000));
      const rows = await h.query(
        "SELECT name, value FROM xt.metrics_gauges WHERE name IN ('compactor.jobs.available','node.tx.latestCompletedTxId','node.tx.lag.MsgId')",
      );
      const value = (name: string) => {
        const found = rows.filter((r) => r.name === name);
        if (!found.length) throw Error("K3 missing gauge");
        return found.reduce((n, r) => n + Number(r.value), 0);
      };
      T = value("node.tx.latestCompletedTxId");
      const live = await h.query("SELECT row_count FROM xt.live_tables");
      L = hash(
        await h.query(
          "SELECT table_name,trie_key,level,trie_state,data_file_size,row_count FROM xt.trie_stats ORDER BY table_name,trie_key",
        ),
      );
      if (
        value("compactor.jobs.available") !== 0 ||
        value("node.tx.lag.MsgId") !== 0 ||
        live.some((r) => Number(r.row_count) !== 0) ||
        !Number.isSafeInteger(T) ||
        T < 0 ||
        (expected && (L !== expected.L || T !== expected.T))
      )
        throw Error("K3 quiescence/layout refusal");
    }
    return { L, T };
  } finally {
    await h.close();
  }
}
export async function healthXtdb(endpoint: string, container: string) {
  const { spawnSync } = await import("node:child_process");
  await bounded(async (signal) => {
    for (;;) {
      signal.throwIfAborted();
      const ready = ["started", "alive"].every(
        (route) =>
          spawnSync(
            "docker",
            [
              "-H",
              "unix:///Users/sam/.colima/triplex2/docker.sock",
              "exec",
              container,
              "wget",
              "-q",
              "-O",
              "/dev/null",
              `http://127.0.0.1:8080/healthz/${route}`,
            ],
            { timeout: 10_000 },
          ).status === 0,
      );
      if (ready) break;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }, 300_000);
  const h = await openG0(endpoint);
  try {
    if (Number((await h.query("SELECT 1 AS n"))[0]?.n) !== 1) throw Error("K2 query refusal");
  } finally {
    await h.close();
  }
}

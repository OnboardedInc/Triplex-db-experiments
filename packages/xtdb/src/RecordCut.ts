import { readRecordCatalog } from "./RecordCatalog.js";
import { sourceCutQuery } from "./native/Sources.js";
import {
  gateRecordBasis,
  instantOf,
  MigrationError,
  type RecordCut,
  type ResolvedTemporalBasis,
} from "@triplex-build/triplex";
import type { XtdbClient } from "./XtdbClient.js";

export const readXtdbCut = async (
  client: XtdbClient,
  scope: string,
  signal?: AbortSignal,
  language?: "xtql" | "xtdb-sql",
  options: { readonly refreshCatalog?: boolean } = {},
): Promise<RecordCut> => {
  const catalog = await readRecordCatalog(client, signal, options.refreshCatalog);
  const meta = catalog.get("tx_meta");
  const migration = () =>
    new MigrationError({
      version: 2,
      name: "record-stamp",
      message: "Scope predates decided record stamps; re-seed",
    });
  const emptyCut = async (): Promise<RecordCut> => {
    // [EXP-RT01] Why: only a fresh inventory can certify physical absence; the positive schema cache is solely a query-shape optimization. Rejected: reusing cached absence after a later first insert.
    const assertions = (await readRecordCatalog(client, signal, true)).get("tx_assertions");
    if (assertions) {
      // [EXP-RT01] Why: missing metadata must not bless orphaned legacy assertions. Rejected: calling every missing-meta scope fresh without reading its existing data.
      const scoped = assertions.has("scope_key");
      const counts = await client.query(
        `SELECT COUNT(*) AS n FROM tx_assertions FOR ALL VALID_TIME${scoped ? " WHERE scope_key = ?" : ""}`,
        scoped ? [scope] : [],
        undefined,
        { ...(signal ? { signal } : {}), timeoutMs: 30000 },
      );
      const count = counts[0]?.["n"];
      if (
        counts.length !== 1 ||
        (typeof count !== "number" && typeof count !== "string") ||
        !Number.isSafeInteger(Number(count)) ||
        Number(count) < 0
      )
        throw new TypeError("Invalid legacy assertion count");
      if (Number(count) > 0) throw migration();
    }
    return { position: 0, recordedAt: 0 };
  };
  if (!meta) return emptyCut();
  if (!meta.has("scope_key") || !meta.has("position")) throw migration();
  const stamped = meta.has("stamp");
  const rows = await client.query(
    stamped && language
      ? sourceCutQuery(language).query
      : `SELECT position${stamped ? ", stamp" : ""} FROM tx_meta FOR ALL VALID_TIME WHERE scope_key = ?`,
    [scope],
    undefined,
    {
      ...(signal ? { signal } : {}),
      timeoutMs: 30000,
      ...(stamped && language ? { parameterSyntax: "postgresql" as const } : {}),
    },
  );
  if (!rows.length) return emptyCut();
  if (!stamped) throw migration();
  const position = Number(rows[0]?.["position"] ?? 0);
  if (!Number.isSafeInteger(position) || position < 0)
    throw new TypeError("Unsafe source position");
  if (rows[0]?.["stamp"] == null)
    throw new MigrationError({
      version: 2,
      name: "record-stamp",
      message: "Scope predates decided record stamps; re-seed",
    });
  return { position, recordedAt: instantOf(Number(rows[0]?.["stamp"] ?? 0)) };
};
export const resolveXtdbBasis = async (
  client: XtdbClient,
  scope: string,
  basis: ResolvedTemporalBasis,
  signal?: AbortSignal,
  waitMs = 2000,
  cutReader?: () => Promise<RecordCut>,
): Promise<ResolvedTemporalBasis & { recordedPosition: number }> => {
  const readCut = cutReader ?? (() => readXtdbCut(client, scope, signal));
  const cut = await gateRecordBasis({
    basis,
    readCut,
    deadlineMs: waitMs,
    surface: "xtdb",
    ...(signal ? { signal } : {}),
  });
  return { ...basis, recordedPosition: basis.recordedPosition ?? cut.position };
};

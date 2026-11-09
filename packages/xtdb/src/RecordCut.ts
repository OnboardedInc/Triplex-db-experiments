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
): Promise<RecordCut> => {
  // [EXP-RT01] Why: an older node may not have a stamp column even for a fresh scope. Rejected: creating schema before checking legacy data (would write before refusal).
  let rows: Record<string, unknown>[];
  try {
    rows = await client.query(
      language
        ? sourceCutQuery(language).query
        : "SELECT position, stamp FROM tx_meta FOR ALL VALID_TIME WHERE scope_key = ?",
      [scope],
      undefined,
      {
        ...(signal ? { signal } : {}),
        timeoutMs: 30000,
        ...(language ? { parameterSyntax: "postgresql" as const } : {}),
      },
    );
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("Column not found: stamp"))
      throw error;
    rows = await client.query(
      "SELECT position FROM tx_meta FOR ALL VALID_TIME WHERE scope_key = ?",
      [scope],
      undefined,
      { ...(signal ? { signal } : {}), timeoutMs: 30000 },
    );
  }
  const position = Number(rows[0]?.["position"] ?? 0);
  if (!Number.isSafeInteger(position) || position < 0)
    throw new TypeError("Unsafe source position");
  if (position && rows[0]?.["stamp"] == null)
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

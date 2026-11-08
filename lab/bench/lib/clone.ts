/**
 * Pure parts of the clone readiness checks (EXP-K01; R26 section 4): canonical digests, the probe-plan shape, and the
 * comparison of a clone's fingerprint with its golden's freeze record. Unit-tested in lab/bench/test/clone.test.ts;
 * the I/O lives in lab/bench/clone-check.ts.
 */
import { createHash } from "node:crypto";

export const sha256 = (text: string) => createHash("sha256").update(text).digest("hex");

/** Canonical JSON: sorted object keys at every level, Dates as ISO text, bigints as decimal text. */
export function canonical(value: unknown): string {
  return JSON.stringify(value, (_key, v) => {
    if (typeof v === "bigint") return v.toString();
    if (v && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date))
      return Object.fromEntries(Object.keys(v).sort().map((k) => [k, (v as any)[k]]));
    return v;
  });
}
export const digest = (value: unknown) => sha256(canonical(value));

/**
 * EXPLAIN ANALYZE rows reduced to what must not change between a golden and its clone (R26 C8, the R7 stale-plan
 * anomaly): operator tree and scan files/pages/rows. Times and time-to-first-page are dropped.
 */
export function planShape(rows: readonly any[]): any[] {
  return rows.map((r) => {
    const a = typeof r.attributes === "string" ? JSON.parse(r.attributes) : (r.attributes ?? null);
    return {
      depth: r.depth, op: r.op, pageCount: Number(r.page_count ?? 0), rowCount: Number(r.row_count ?? 0),
      scan: a ? { source: a.scan_source ?? null, filesPruned: Number(a.scan_files_pruned ?? 0), filesUsed: Number(a.scan_files_used ?? 0), pagesPruned: Number(a.scan_pages_pruned ?? 0), pagesUsed: Number(a.scan_pages_used ?? 0), rowsRead: Number(a.scan_rows_read ?? 0) } : null,
    };
  });
}

/** A pulled subject's triples in id order, as one digest (values compared by canonical JSON). */
export function pullDigest(triples: readonly any[]): string {
  const rows = [...triples].map((t) => [t.id, t.entityId, t.attribute, t.value, t.validFrom ?? null, t.validTo ?? null]).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  return digest(rows);
}

export interface Check { pass: boolean; expected?: unknown; observed?: unknown; note?: string; ms?: number }

/**
 * Compare a clone's fingerprint with the golden's freeze record (C3-C8). `obs` and `freeze` have the shape that
 * clone-check.ts `fingerprint()` returns. C1 (copy) and C2 (healthz) are decided outside, from their own evidence.
 */
export function compareFreeze(freeze: any, obs: any, manifest: { result: { lastPosition: number } }): Record<string, Check> {
  const eq = (a: unknown, b: unknown) => canonical(a) === canonical(b);
  const out: Record<string, Check> = {};
  out["C3"] = {
    pass: eq(freeze.c3, obs.c3),
    expected: freeze.c3, observed: obs.c3, note: "latest completed tx per partition (SHOW LATEST_COMPLETED_TXS) and xt.txs count, min and max system time",
  };
  const positionOk = obs.c4?.position === manifest.result.lastPosition && freeze.c4?.position === manifest.result.lastPosition;
  out["C4"] = {
    pass: positionOk && eq(freeze.c4, obs.c4),
    expected: { ...freeze.c4, manifestPosition: manifest.result.lastPosition }, observed: obs.c4,
    note: "Triplex position (equal to the manifest's last position) and current row counts of the scope",
  };
  out["C5"] = { pass: eq(freeze.c5, obs.c5), expected: freeze.c5, observed: obs.c5, note: "history row counts over all system and valid time, distinct tx system times" };
  out["C6"] = {
    pass: freeze.c6?.sha256 === obs.c6?.sha256 && eq(freeze.c6?.liveTables?.rows ?? [], obs.c6?.liveTables?.rows ?? []),
    expected: { sha256: freeze.c6?.sha256, trieStats: freeze.c6?.trieStats?.sha256, blockFiles: freeze.c6?.blockFiles?.sha256, liveTables: freeze.c6?.liveTables?.rows },
    observed: { sha256: obs.c6?.sha256, trieStats: obs.c6?.trieStats?.sha256, blockFiles: obs.c6?.blockFiles?.sha256, liveTables: obs.c6?.liveTables?.rows },
    note: "layout: xt.trie_stats, xt.block_files and xt.live_tables rows",
  };
  const polls: number[] = obs.c7?.polls ?? [obs.c7?.jobsAvailable];
  out["C7"] = { pass: polls.length >= 3 && polls.every((v) => v === 0), expected: [0, 0, 0], observed: polls, note: "compactor.jobs.available, three readings 5 s apart" };
  out["C8"] = {
    pass: freeze.c8?.resultSha256 === obs.c8?.resultSha256 && freeze.c8?.plan?.sha256 === obs.c8?.plan?.sha256,
    expected: { resultSha256: freeze.c8?.resultSha256, planSha256: freeze.c8?.plan?.sha256, subjects: freeze.c8?.subjects?.length },
    observed: { resultSha256: obs.c8?.resultSha256, planSha256: obs.c8?.plan?.sha256, subjects: obs.c8?.subjects?.length, plan: obs.c8?.plan?.sha256 === freeze.c8?.plan?.sha256 ? undefined : obs.c8?.plan?.rows },
    note: "fixed subjects' pull result digest at the manifest basis, and the probe query's EXPLAIN ANALYZE files, pages and rows",
  };
  return out;
}

/**
 * Pure parts of the clone readiness checks (EXP-K01; R26 section 4): canonical digests, the probe-plan shape, and the
 * comparison of a clone's fingerprint with its golden's freeze record. Unit-tested in lab/bench/test/clone.test.ts;
 * the I/O lives in lab/bench/clone-check.ts.
 */
import { complete, observe, digestBytes, sqlNumber } from "../../bin/observation.ts";

export const sha256 = (text: string) => complete(observe("canonical hash", { algorithm: "sha256" }, () => text, digestBytes));

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
  // [EXP-K01-R6] Why: operator-specific absent statistics are explicit null, not a fabricated zero; invalid present numbers fail. Rejected: collapsing absent and zero observations.
  return rows.map((r) => {
    const a = typeof r.attributes === "string" ? JSON.parse(r.attributes) : (r.attributes ?? null);
    return {
      depth: r.depth, op: r.op, pageCount: r.page_count == null ? null : sqlNumber(r.page_count), rowCount: r.row_count == null ? null : sqlNumber(r.row_count),
      scan: a ? { source: a.scan_source ?? null, filesPruned: a.scan_files_pruned == null ? null : sqlNumber(a.scan_files_pruned), filesUsed: a.scan_files_used == null ? null : sqlNumber(a.scan_files_used), pagesPruned: a.scan_pages_pruned == null ? null : sqlNumber(a.scan_pages_pruned), pagesUsed: a.scan_pages_used == null ? null : sqlNumber(a.scan_pages_used), rowsRead: a.scan_rows_read == null ? null : sqlNumber(a.scan_rows_read) } : null,
    };
  });
}

/** A pulled subject's triples in id order, as one digest (values compared by canonical JSON). */
// [EXP-K01-R6] Why: Nullable valid-time endpoints are legitimate unbounded values from completed pull results; defaults encode that schema state, not failed acquisition. Rejected: converting a failed observation into successful content.
export function pullDigest(triples: readonly any[]): string {
  const rows = [...triples].map((t) => [t.id, t.entityId, t.attribute, t.value, t.validFrom ?? null, t.validTo ?? null]).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  return digest(rows);
}

export interface Check { pass: boolean; expected?: unknown; observed?: unknown; note?: string; ms?: number }

/**
 * Compare a clone's fingerprint with the golden's freeze record (C3-C8). `obs` and `freeze` have the shape that
 * clone-check.ts `fingerprint()` returns. C1 (copy) and C2 (healthz) are decided outside, from their own evidence.
 */
// [EXP-K01-R6] Why: Optional chains below test presence and refuse missing evidence; no missing live rows or poll set is replaced by a success-shaped empty set. Rejected: converting a failed observation into successful content.
export function compareFreeze(freeze: any, obs: any, manifest: { result: { lastPosition: number } }): Record<string, Check> {
  // [EXP-K01] Why: missing observations must fail even when both sides are missing. Rejected: equality alone (undefined equals undefined).
  const eq = (a: unknown, b: unknown) => canonical(a) === canonical(b);
  const out: Record<string, Check> = {};
  out["C3"] = {
    pass: !!freeze.c3 && !!obs.c3 && eq(freeze.c3, obs.c3),
    expected: freeze.c3, observed: obs.c3, note: "latest completed tx per partition (SHOW LATEST_COMPLETED_TXS) and xt.txs count, min and max system time",
  };
  const positionOk = obs.c4?.position === manifest.result.lastPosition && freeze.c4?.position === manifest.result.lastPosition;
  out["C4"] = {
    pass: positionOk && eq(freeze.c4, obs.c4),
    expected: { ...freeze.c4, manifestPosition: manifest.result.lastPosition }, observed: obs.c4,
    note: "Triplex position (equal to the manifest's last position) and current row counts of the scope",
  };
  out["C5"] = { pass: !!freeze.c5 && !!obs.c5 && eq(freeze.c5, obs.c5), expected: freeze.c5, observed: obs.c5, note: "history row counts over all system and valid time, distinct tx system times" };
  out["C6"] = {
    pass: typeof freeze.c6?.sha256 === "string" && freeze.c6.sha256.length > 0 && freeze.c6.sha256 === obs.c6?.sha256 && Array.isArray(freeze.c6?.liveTables?.rows) && Array.isArray(obs.c6?.liveTables?.rows) && eq(freeze.c6.liveTables.rows, obs.c6.liveTables.rows),
    expected: { sha256: freeze.c6?.sha256, trieStats: freeze.c6?.trieStats?.sha256, blockFiles: freeze.c6?.blockFiles?.sha256, liveTables: freeze.c6?.liveTables?.rows },
    observed: { sha256: obs.c6?.sha256, trieStats: obs.c6?.trieStats?.sha256, blockFiles: obs.c6?.blockFiles?.sha256, liveTables: obs.c6?.liveTables?.rows },
    note: "layout: xt.trie_stats, xt.block_files and xt.live_tables rows",
  };
  const polls: number[] = obs.c7?.polls;
  out["C7"] = { pass: Array.isArray(polls) && polls.length >= 3 && polls.every((v) => v === 0), expected: [0, 0, 0], observed: polls, note: "compactor.jobs.available, three readings 5 s apart" };
  out["C8"] = {
    pass: typeof freeze.c8?.resultSha256 === "string" && freeze.c8.resultSha256.length > 0 && typeof freeze.c8?.plan?.sha256 === "string" && freeze.c8.plan.sha256.length > 0 && freeze.c8.resultSha256 === obs.c8?.resultSha256 && freeze.c8.plan.sha256 === obs.c8?.plan?.sha256,
    expected: { resultSha256: freeze.c8?.resultSha256, planSha256: freeze.c8?.plan?.sha256, subjects: freeze.c8?.subjects?.length },
    observed: { resultSha256: obs.c8?.resultSha256, planSha256: obs.c8?.plan?.sha256, subjects: obs.c8?.subjects?.length, plan: obs.c8?.plan?.sha256 === freeze.c8?.plan?.sha256 ? undefined : obs.c8?.plan?.rows },
    note: "fixed subjects' pull result digest at the manifest basis, and the probe query's EXPLAIN ANALYZE files, pages and rows",
  };
  return out;
}

/** [EXP-K01] Why: query only published block ids; a missing block can strand XTDB's cache loader. Rejected: sentinel missing-block queries (observed hang on a fresh seed). */
export function publishedBlockIndices(listing: string): string[] {
  return listing.split("\n").filter(Boolean).map((file) => {
    const match = /^\/var\/lib\/xtdb\/buffers\/v06\/blocks\/b([0-9a-f]+)\.binpb$/.exec(file);
    if (!match) throw new Error(`unexpected block file ${file}`);
    return match[1];
  }).sort();
}

// [EXP-K01-R2] Why: Q83d accepts an already compacted block at any trie level. Rejected: requiring transient L0 observations (fast compaction finishes before the first poll).
export function blockTrieCoverage(rows: readonly (readonly unknown[])[], blockIndex: string, requiredTables: readonly string[]) {
  const tables = [...new Set(rows.filter(r => typeof r[2] === "number" && Number.isInteger(r[2]) && r[2] >= 0 &&
    r[3] === "live" && typeof r[1] === "string" && r[1].endsWith(`-b${blockIndex}`) && Number(r[5]) > 0).map(r => String(r[0])))].sort();
  return { covered: requiredTables.every(table => tables.includes(table)), tables, missing: requiredTables.filter(table => !tables.includes(table)) };
}

// [EXP-K01-R4] Why: readiness certifies the complete immutable clone/copy binding. Rejected: comparing only tree hashes (misses a changed golden or failed C1 proof).
export function cloneCertificateHash(c: any): string {
  return digest([c.kind, c.containerId, c.key, c.manifestSha256, c.goldenVolume, c.goldenRecord, c.goldenRecordSha256, c.freezeSha256, c.clonedAt, c.copy]);
}

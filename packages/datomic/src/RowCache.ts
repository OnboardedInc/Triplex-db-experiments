import type { TripleRow } from "@triplex-build/triplex/runtime";
import { ByteCache } from "./ByteCache.js";
// [DX-B6-3] Why: account for retained row columns, UTF-16 text and object slots.
// Rejected: treating a 1 MB JSON row as one small cache entry.
export const estimateRowBytes = (row: TripleRow) =>
  256 +
  Object.values(row).reduce<number>(
    (n, value) => n + (typeof value === "string" ? value.length * 2 : 16),
    0,
  );
export class RowCache extends ByteCache<TripleRow> {
  constructor(limit = 100000, byteLimit = 32 * 1024 ** 2) {
    super(byteLimit, estimateRowBytes, limit);
  }
}

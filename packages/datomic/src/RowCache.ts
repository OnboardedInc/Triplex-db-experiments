import type { TripleRow } from "@triplex-build/triplex/runtime";
import { serialize, deserialize } from "node:v8";
import { rowTextColumns } from "./rowText.js";
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

// [DX-H7] Why: keep exact predecessor assertions independently of the row LRU; receipts need
// values and provenance too. Compact tuples preserve signed zero and lone UTF-16 surrogates.
// Rejected: ID-only stamps (cannot construct exact retraction changes), or unbounded row pinning.
export class PredecessorCache {
  private readonly entries: ByteCache<Buffer>;
  private readonly columns = rowTextColumns.filter((column) => column !== "id");
  readonly enabled: boolean;
  private readonly attributes: ReadonlySet<string> | undefined;
  private readonly scopes = new Map<string, string>();
  private nextScope = 0;
  namespaceBytes = 0;
  constructor(
    readonly byteLimit = 256 * 1024 ** 2,
    attributes?: readonly string[],
  ) {
    this.entries = new ByteCache<Buffer>(byteLimit, (value) => 64 + value.buffer.byteLength);
    this.attributes = attributes === undefined ? undefined : new Set(attributes);
    this.enabled = this.attributes === undefined || this.attributes.size > 0;
  }
  get bytes() {
    return this.entries.bytes;
  }
  get peakBytes() {
    return this.entries.peakBytes;
  }
  get evictions() {
    return this.entries.evictions;
  }
  get size() {
    return this.entries.size;
  }
  // [DX-H7] Why: intern exact scope names once, with unique prefixes until all entries are cleared.
  // Rejected: scope-free fact IDs (cross-database collisions), or repeated long prefixes per stamp.
  private scoped(key: string, create = false): string | undefined {
    const cut = key.indexOf("\0");
    if (cut < 0) return undefined;
    const db = key.slice(0, cut);
    let prefix = this.scopes.get(db);
    if (prefix === undefined && create) {
      const bytes = 64 + db.length * 2;
      if (bytes > 65536) return undefined;
      if (
        this.namespaceBytes + bytes > 65536 ||
        this.scopes.size >= 256 ||
        this.nextScope === Number.MAX_SAFE_INTEGER
      )
        this.clear();
      prefix = String(++this.nextScope) + "\0";
      this.scopes.set(db, prefix);
      this.namespaceBytes += bytes;
    }
    return prefix === undefined ? undefined : prefix + key.slice(cut + 1);
  }
  has(key: string) {
    const scoped = this.scoped(key);
    return scoped !== undefined && this.entries.has(scoped);
  }
  delete(key: string) {
    const scoped = this.scoped(key);
    if (scoped !== undefined) this.entries.delete(scoped);
  }
  remember(key: string, row: TripleRow) {
    if (
      !this.enabled ||
      row.entity_type === "_Transaction" ||
      (this.attributes && !this.attributes.has(row.attribute))
    )
      return;
    const cut = key.indexOf("\0");
    if (cut < 0 || key.slice(cut + 1) !== row.id) {
      this.delete(key);
      return;
    }
    if (row.retracted_at !== null) {
      this.delete(key);
      return;
    }
    const bytes = serialize(this.columns.map((column) => row[column]));
    if (bytes.byteLength > 4096) {
      this.delete(key);
      return;
    }
    const scoped = this.scoped(key, true);
    if (scoped !== undefined) this.entries.set(scoped, bytes);
  }
  // [DX-H7] Why: a referenced entity reuses already validated immutable assertion bytes.
  // Rejected: reserializing every cached assertion on every read, or failing to restore an evicted predecessor.
  retain(key: string, row: TripleRow) {
    if (
      !this.enabled ||
      row.entity_type === "_Transaction" ||
      (this.attributes && !this.attributes.has(row.attribute))
    )
      return;
    if (row.retracted_at !== null) {
      this.delete(key);
      return;
    }
    const scoped = this.scoped(key);
    if (scoped !== undefined && this.entries.get(scoped) !== undefined) return;
    this.remember(key, row);
  }
  row(key: string): TripleRow | undefined {
    if (!this.enabled) return undefined;
    const scoped = this.scoped(key);
    const bytes = scoped === undefined ? undefined : this.entries.get(scoped);
    if (!bytes) return undefined;
    const values = deserialize(bytes) as unknown[];
    return Object.fromEntries([
      ...this.columns.map((column, i) => [column, values[i]]),
      ["id", key.slice(key.indexOf("\0") + 1)],
      ["retracted_at", null],
      ["retracted_position", null],
      ["retract_tx_id", null],
    ]) as unknown as TripleRow;
  }
  clearScope(db: string) {
    const prefix = this.scopes.get(db);
    if (prefix === undefined) return;
    this.entries.deleteWhere((key) => key.startsWith(prefix));
    this.scopes.delete(db);
    this.namespaceBytes -= 64 + db.length * 2;
  }
  clear() {
    this.entries.clear();
    this.scopes.clear();
    this.namespaceBytes = 0;
    this.nextScope = 0;
  }
}

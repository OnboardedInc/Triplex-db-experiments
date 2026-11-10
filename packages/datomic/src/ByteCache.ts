// [DX-B6-3] Why: variable-sized rows require byte accounting and constant-time LRU eviction.
// Rejected: entity-count caps and Map.keys eviction under sustained deleted-slot churn.
type Entry<A> = {
  key: string;
  value: A;
  bytes: number;
  previous: Entry<A> | null;
  next: Entry<A> | null;
};
export class ByteCache<A> {
  private readonly entries = new Map<string, Entry<A>>();
  private oldest: Entry<A> | null = null;
  private newest: Entry<A> | null = null;
  bytes = 0;
  peakBytes = 0;
  evictions = 0;
  constructor(
    readonly byteLimit: number,
    private readonly estimate: (value: A) => number,
    readonly limit = Number.MAX_SAFE_INTEGER,
  ) {
    if (
      !Number.isSafeInteger(byteLimit) ||
      byteLimit < 1 ||
      !Number.isSafeInteger(limit) ||
      limit < 1
    )
      throw new RangeError("Invalid cache budget");
  }
  get size() {
    return this.entries.size;
  }
  has(key: string) {
    return this.entries.has(key);
  }
  private detach(entry: Entry<A>) {
    if (entry.previous) entry.previous.next = entry.next;
    else this.oldest = entry.next;
    if (entry.next) entry.next.previous = entry.previous;
    else this.newest = entry.previous;
  }
  private promote(entry: Entry<A>) {
    if (this.newest === entry) return;
    this.detach(entry);
    entry.previous = this.newest;
    entry.next = null;
    if (this.newest) this.newest.next = entry;
    else this.oldest = entry;
    this.newest = entry;
  }
  get(key: string): A | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    this.promote(entry);
    return entry.value;
  }
  set(key: string, value: A) {
    const bytes = 128 + key.length * 2 + this.estimate(value);
    if (!Number.isSafeInteger(bytes) || bytes < 0) throw new RangeError("Invalid cache entry size");
    this.delete(key);
    if (bytes > this.byteLimit) return;
    while (this.oldest && (this.bytes + bytes > this.byteLimit || this.size >= this.limit)) {
      this.evictions++;
      this.delete(this.oldest.key);
    }
    const entry: Entry<A> = { key, value, bytes, previous: this.newest, next: null };
    if (this.newest) this.newest.next = entry;
    else this.oldest = entry;
    this.newest = entry;
    this.entries.set(key, entry);
    this.bytes += bytes;
    this.peakBytes = Math.max(this.peakBytes, this.bytes);
  }
  delete(key: string) {
    const entry = this.entries.get(key);
    if (!entry) return;
    this.detach(entry);
    this.entries.delete(key);
    this.bytes -= entry.bytes;
  }
  deleteWhere(predicate: (key: string) => boolean) {
    for (const key of this.entries.keys()) if (predicate(key)) this.delete(key);
  }
  clear() {
    this.entries.clear();
    this.oldest = this.newest = null;
    this.bytes = 0;
  }
}

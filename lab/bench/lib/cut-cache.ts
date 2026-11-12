import type { PackedEntity } from "../../../packages/datomic/dist/index.js";
import type { PullResult } from "./composition.ts";
type Selected = readonly (string | PackedEntity)[];
type Reader = (selected: Selected, validAt: number) => PullResult["triples"];
type Metadata = Omit<PullResult, "triples">;
type Entry = { from: number; to: number; value: Metadata; selected: readonly (string | WeakRef<PackedEntity>)[]; bytes: number; read: Reader; promoted?: Selected };
const handles = new WeakMap<PackedEntity, WeakRef<PackedEntity>>();
// [DX-R3-P8] Why: exact-cut summaries can reuse immutable versions without retaining old backing slabs.
// Rejected: root-revision keys (miss changed children), time rounding, and strong manifests (thrash or pin whole slabs).
export class CutCache {
  private entries = new Map<string, Entry>();
  private promoted = new Set<Entry>();
  private release: ReturnType<typeof setImmediate> | undefined;
  // [DX-R3-P8] Why: WeakRef promotion is invariant within one synchronous turn, but must not pin evicted slabs across updates.
  // Rejected: dereferencing every member on every hit, or retaining strong version manifests across turns/commits.
  releasePromotions() {
    if (this.release) clearImmediate(this.release);
    this.release = undefined;
    for (const entry of this.promoted) entry.promoted = undefined;
    this.promoted.clear();
  }
  readonly diagnostics = { hits: 0, misses: 0, weakMisses: 0, evictions: 0, bytes: 0, entries: 0 };
  readonly maxBytes: number;
  constructor(maxBytes = 32 * 1024 ** 2) { this.maxBytes = maxBytes; }
  private key(root: string, position: number) { return `${root.length}:${root}@${position}`; }
  get(root: string, position: number, validAt: number, waitedMs: number): PullResult | undefined {
    const key = this.key(root, position), entry = this.entries.get(key);
    if (!entry || validAt < entry.from || validAt >= entry.to) { this.diagnostics.misses++; return; }
    let selected = entry.promoted;
    if (!selected) {
    const promoted: (string | PackedEntity)[] = [];
    for (let i = 0; i < entry.selected.length; i += 2) {
      const version = (entry.selected[i + 1] as WeakRef<PackedEntity>).deref();
      if (!version) { this.remove(key); this.diagnostics.weakMisses++; this.diagnostics.misses++; return; }
      promoted.push(entry.selected[i] as string, version);
    }
    selected = entry.promoted = Object.freeze(promoted);
    this.promoted.add(entry);
    this.release ??= setImmediate(() => this.releasePromotions());
    }
    this.entries.delete(key); this.entries.set(key, entry); this.diagnostics.hits++;
    return reply(entry.value, entry.read, selected, validAt, waitedMs);
  }
  put(root: string, position: number, from: number, to: number, value: PullResult, selected: Selected, read: Reader) {
    if (!this.maxBytes || !(from < to) || !value.observation) return;
    const key = this.key(root, position);
    if (this.entries.has(key)) this.remove(key);
    const weak: (string | WeakRef<PackedEntity>)[] = [];
    let bytes = 1024 + key.length * 2;
    for (let i = 0; i < selected.length; i += 2) {
      const id = selected[i] as string, packed = selected[i + 1] as PackedEntity;
      let ref = handles.get(packed);
      if (!ref) { ref = new WeakRef(packed); handles.set(packed, ref); }
      weak.push(id, ref); bytes += 128 + id.length * 2;
    }
    if (bytes > this.maxBytes) return;
    const metadata = { observation: Object.freeze({ ...value.observation }), entities: value.entities,
      depth: value.depth, roundTrips: value.roundTrips, route: value.route, language: value.language,
      waitedMs: 0, replicaFallbackReason: value.replicaFallbackReason };
    this.diagnostics.bytes += bytes;
    this.entries.set(key, { from, to, value: metadata, selected: weak, bytes, read });
    while (this.entries.size > 2048 || this.diagnostics.bytes > this.maxBytes) {
      this.remove(this.entries.keys().next().value!); this.diagnostics.evictions++;
    }
    this.diagnostics.entries = this.entries.size;
  }
  private remove(key: string) {
    const entry = this.entries.get(key)!;
    this.promoted.delete(entry); entry.promoted = undefined;
    this.diagnostics.bytes -= entry.bytes;
    this.entries.delete(key); this.diagnostics.entries = this.entries.size;
  }
  clear() { this.releasePromotions(); this.entries.clear(); this.diagnostics.bytes = 0; this.diagnostics.entries = 0; }
}
// [DX-R3-P8] Why: each answer pins promoted versions and materializes its own complete public rows on demand.
// Rejected: a shared memoizing getter (pins decoded worlds), or a lazy walk over an index that may later evict the cut.
function reply(value: Metadata, read: Reader, selected: Selected, validAt: number, waitedMs: number): PullResult {
  let rows: PullResult["triples"] | undefined;
  return { get triples() { return rows ??= read(selected, validAt); }, observation: value.observation,
    entities: value.entities, depth: value.depth, roundTrips: value.roundTrips,
    route: value.route, language: value.language, waitedMs, replicaFallbackReason: value.replicaFallbackReason };
}

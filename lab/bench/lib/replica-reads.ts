import { CutCache } from "./cut-cache.ts";
import { Option } from "effect";
import { pathToFileURL } from "node:url";
import { REPO, runtimeApi } from "./triplex.ts";
import { observe } from "./observe.ts";
import type { CompositionHandle, PullResult } from "./composition.ts";
import type {
  PackedEntity,
  ReadDelta,
  ReadImage,
  ReadBasis,
} from "../../../packages/datomic/dist/index.js";

const api = await import(pathToFileURL(`${REPO}/packages/datomic/dist/index.js`).href);
if (api.REPLICA_ROW_WIDTH !== 56) throw Error("Replica packed API/build layout mismatch");
type Prepared = PackedEntity & {
  stats: SharedArrayBuffer;
  refs: readonly { id: string; from: number; to: number }[];
  additionalBytes: number;
  publicComplete: boolean;
};
function freezePublic<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freezePublic(child);
    Object.freeze(value);
  }
  return value;
}
const STAT_WIDTH = 64;

// [DX-R3] Why: public callers see the gateway Triple contract, including actual Effect Options.
// Rejected: returning physical positions or numeric interval ends as a different public payload.
export function publicRow(row: any): PullResult["triples"][number] {
  const m = row.publicMetadata;
  if (!m) throw new Error("Replica row lacks public metadata");
  return freezePublic({ id: row.id, entityId: row.entityId, attribute: row.attribute, value: row.value,
    recordedAt: m.recordedAt, validFrom: row.validFrom,
    validTo: row.validTo === undefined ? Option.none() : Option.some(row.validTo),
    createdBy: m.createdBy ? Option.some(m.createdBy) : Option.none(),
    retractedAt: Option.none(), entityType: m.entityType ? Option.some(m.entityType) : Option.none(),
    schemaVersion: m.schemaVersion ? Option.some(m.schemaVersion) : Option.none(),
    txId: m.txId ? Option.some(m.txId) : Option.none(), retractTxId: Option.none() });
}

// [DX-R3] Why: reuse the exact value decoder once while retaining every row's own interval.
// Rejected: a second tagged-value codec, or decoding the entire entity once for each valid-time boundary.
// [DX-R3-P8] Why: growing event lists repeat old rows; bound content-addressed decoding rather than rehashing them.
// Rejected: ID-only memoization (cannot certify all public metadata), or an unbounded row cache.
class RowMemo extends Map<string, any> {
  bytes = 0;
  hits = 0;
  override get(key: string) {
    const value = super.get(key);
    if (value) { this.hits++; super.delete(key); super.set(key, value); }
    return value;
  }
  override set(key: string, value: any) {
    if (super.has(key)) { super.delete(key); this.bytes -= this.cost(key); }
    const cost = this.cost(key);
    if (cost > 32 * 1024 ** 2) return this;
    while (this.size && this.bytes + cost > 32 * 1024 ** 2) {
      const oldest = this.keys().next().value!;
      super.delete(oldest); this.bytes -= this.cost(oldest);
    }
    this.bytes += cost;
    return super.set(key, value);
  }
  private cost(key: string) { return key.length * 6 + 2048; }
}
const rowMemo = new RowMemo();
const rowParts = new WeakMap<object, { a: number; b: number; bytes: number; stamp: number; stamps: number }>();
function allRows(id: string, packed: PackedEntity) {
  return api.unpackEntity(id, packed, 0, true, true, rowMemo);
}
// [DX-R3] Why: shared numeric prefix contributions hash each fact once; references keep one interval each.
// Rejected: JS object summaries plus repeated reference strings for every boundary/version (D exhausted the 2 GiB heap).
export function prepareEntity(id: string, packed: PackedEntity): Prepared {
  type Part = { a: number; b: number; bytes: number; stamp: number; stamps: number };
  const events = new Map<number, { sign: number; part: Part }[]>();
  const refs: { id: string; from: number; to: number }[] = [];
  const event = (at: number, sign: number, part: Part) => {
    const list = events.get(at) ?? [];
    list.push({ sign, part });
    events.set(at, list);
  };
  let publicComplete = true;
  for (const row of allRows(id, packed)) {
    publicComplete &&= row.publicMetadata !== undefined;
    const from = row.validFrom,
      to = row.validTo ?? Infinity;
    if (!Number.isFinite(from) || (to !== Infinity && !Number.isFinite(to)))
      throw Error("Invalid contribution interval");
    if (from >= to) continue;
    let part = rowParts.get(row);
    if (!part) {
    const o = observe({
      triples: [row.publicMetadata ? publicRow(row) : row],
      entities: 1,
      depth: 0,
      roundTrips: 0,
      route: "replica",
      language: "packed",
      waitedMs: 0,
    });
    part = {
      a: parseInt(o.digest.slice(0, 8), 16),
      b: parseInt(o.digest.slice(8, 16), 16),
      bytes: o.bytes,
      stamp: o.stamp,
      stamps: o.stamps,
    };
    freezePublic(row);
    rowParts.set(row, part);
    }
    event(from, 1, part);
    event(to, -1, part);
    if (row.value.type === "ref") refs.push({ id: row.value.value, from, to });
  }
  const bounds = [...new Set([-Infinity, Infinity, ...events.keys()])].sort((a, b) => a - b);
  const stats = new SharedArrayBuffer((bounds.length - 1) * STAT_WIDTH),
    view = new DataView(stats);
  let a = 0,
    b = 0,
    facts = 0,
    bytes = 0,
    stamps = 0;
  const activeStamps = new Map<number, number>();
  for (let i = 0; i < bounds.length - 1; i++) {
    for (const { sign, part } of events.get(bounds[i]!) ?? []) {
      a = (a + sign * part.a) >>> 0;
      b = (b + sign * part.b) >>> 0;
      facts += sign;
      bytes += sign * part.bytes;
      stamps += sign * part.stamps;
      if (part.stamps) {
        const count = (activeStamps.get(part.stamp) ?? 0) + sign;
        if (count) activeStamps.set(part.stamp, count);
        else activeStamps.delete(part.stamp);
      }
    }
    const stamp = Math.max(-1, ...activeStamps.keys());
    [bounds[i]!, bounds[i + 1]!, a, b, facts, bytes, stamp, stamps].forEach((n, j) =>
      view.setFloat64(i * STAT_WIDTH + j * 8, n, true),
    );
  }
  return {
    ...packed,
    publicComplete,
    stats,
    refs,
    additionalBytes:
      256 + stats.byteLength + refs.reduce((n, ref) => n + 96 + ref.id.length * 2, 0),
  };
}
// [DX-R3-P8] Why: cached worlds retain packed versions, never materialized public rows from another read.
// Rejected: sharing a memoizing triples getter (would pin arbitrarily large decoded worlds outside the byte budget).
function materializeWorld(selected: readonly (string | PackedEntity)[], validAt: number): PullResult["triples"] {
  const rows: PullResult["triples"][number][] = [];
  for (let i = 0; i < selected.length; i += 2)
    for (const row of api.unpackEntity(selected[i] as string, selected[i + 1] as PackedEntity, validAt, true))
      rows.push(publicRow(row));
  return Object.freeze(rows);
}
const statViews = new WeakMap<object, DataView>();
export class ReplicaReader {
  readonly index: InstanceType<typeof api.RecentReads>;
  private worlds = new CutCache();
  // [DX-R3] Why: the host proxy already validates/applies each cut; RYOW can share that same immutable-version index.
  // Rejected: a second main-thread copy of every current/history entry and duplicate per-commit validation/allocation.
  constructor(historyBytes = 64 * 1024 ** 2, index?: InstanceType<typeof api.RecentReads>) { this.index = index ?? new api.RecentReads(20_000, historyBytes); }
  readonly diagnostics = { local: 0, fallback: 0, ahead: 0, caughtUp: 0, waitExpired: 0, ineligible: 0, worldCache: this.worlds.diagnostics };
  private waiters = new Set<{ p: number; done(): void }>();
  install(image: ReadImage) {
    this.worlds.clear();
    this.index.install(image);
  }
  apply(delta: ReadDelta) {
    if (delta.reset) this.worlds.clear();
    this.index.apply(delta);
    this.notify();
  }
  notify() {
    for (const waiter of this.waiters)
      if (this.index.position >= waiter.p || !this.index.valid) waiter.done();
  }
  async wait(p: number, ms: number) {
    if (this.index.position >= p || !this.index.valid) return;
    await new Promise<void>((resolve) => {
      const waiter = {
        p,
        done: () => {
          clearTimeout(timer);
          this.waiters.delete(waiter);
          resolve();
        },
      };
      const timer = setTimeout(waiter.done, ms);
      this.waiters.add(waiter);
    });
  }
  async pullAt(
    root: string,
    basis: ReadBasis,
    fallback: () => Promise<PullResult>,
    between?: () => Promise<void>,
    rows = false,
    receiptPosition?: number,
  ): Promise<PullResult> {
    if (between) {
      // [DX-R3] Why: the first complete read must happen before the real intervening ACK.
      // Rejected: waiting for the ACK before touching the index (would report a fictitious straddle).
      const before = await this.pullAt(root, basis, fallback, undefined, rows, receiptPosition);
      await between();
      const after = await this.pullAt(root, basis, fallback, undefined, rows, receiptPosition);
      if (JSON.stringify(observe(before)) !== JSON.stringify(observe(after)))
        throw Error("replica split snapshot violation");
      // [DX-R3] Why: preserve lazy world descriptors across split reads without decoding entity bodies.
      // Rejected: object spread (invokes the triples getter and materializes the world).
      return Object.assign(
        Object.create(Object.getPrototypeOf(after), Object.getOwnPropertyDescriptors(after)),
        {
          route: before.route === "replica" && after.route === "replica" ? "replica" : "fallback",
          roundTrips: before.roundTrips + after.roundTrips,
          replicaFallbackReason: before.replicaFallbackReason ?? after.replicaFallbackReason,
          waitedMs: before.waitedMs + after.waitedMs,
        },
      );
    }
    let waitedMs = 0;
    // [DX-R3] Why: a receipt position can guide catch-up without changing a time-only read into a position-capped read.
    // Rejected: inserting the hint into the basis (hides a later equal-clock position from the requested time cut).
    const waitPosition = basis.recordedPosition ?? receiptPosition;
    if (waitPosition !== undefined && waitPosition > this.index.position) {
      this.diagnostics.ahead++;
      const start = performance.now();
      await this.wait(waitPosition, 10);
      waitedMs = performance.now() - start;
      if (this.index.position >= waitPosition) this.diagnostics.caughtUp++;
      else this.diagnostics.waitExpired++;
    }
    if (!rows) {
      const cut = this.index.resolve(basis);
      const cached = cut === undefined ? undefined : this.worlds.get(root, cut, basis.validAt, waitedMs);
      if (cached) { this.diagnostics.local++; return cached; }
      let intervalFrom = -Infinity, intervalTo = Infinity;
      const total = { a: 0, b: 0, n: 0, bytes: 0, stamp: -1, stamps: 0 };
      const selected: (string | PackedEntity)[] = [];
      const selectedValidAt = basis.validAt;
      let complete = true;
      let materialized: PullResult["triples"] | undefined;
      const found = this.index.visit(
        root,
        basis,
        (id: string, packed: PackedEntity, validAt: number) => {
          selected.push(id, packed);
          const prepared = packed as Prepared;
          if (!prepared.stats || !prepared.publicComplete) { complete = false; return []; }
          let view = statViews.get(packed);
          if (!view) {
            view = new DataView(prepared.stats);
            statViews.set(packed, view);
          }
          let lo = 0,
            hi = view.byteLength / STAT_WIDTH;
          while (lo < hi) {
            const mid = (lo + hi) >>> 1;
            if (view.getFloat64(mid * STAT_WIDTH + 8, true) <= validAt) lo = mid + 1;
            else hi = mid;
          }
          const offset = lo * STAT_WIDTH;
          intervalFrom = Math.max(intervalFrom, view.getFloat64(offset, true));
          intervalTo = Math.min(intervalTo, view.getFloat64(offset + 8, true));
          total.a = (total.a + view.getFloat64(offset + 16, true)) >>> 0;
          total.b = (total.b + view.getFloat64(offset + 24, true)) >>> 0;
          total.n += view.getFloat64(offset + 32, true);
          total.bytes += view.getFloat64(offset + 40, true);
          total.stamp = Math.max(total.stamp, view.getFloat64(offset + 48, true));
          total.stamps += view.getFloat64(offset + 56, true);
          const refs: string[] = [];
          for (const ref of prepared.refs)
            if (ref.from <= validAt && validAt < ref.to) refs.push(ref.id);
          return refs;
        },
      );
      if (found && complete) {
        this.diagnostics.local++;
        const answer: PullResult = {
          // [DX-R3] Why: a pull returns its actual immutable world, not only a checksum; decoding is demand-driven.
          // Rejected: an empty triples array paired with a cached nonempty observation.
          get triples() {
            if (!materialized) {
              materialized = materializeWorld(selected, selectedValidAt);
            }
            return materialized;
          },
          ...found,
          roundTrips: 0,
          route: "replica",
          language: "packed",
          waitedMs,
          observation: {
            digest:
              total.a.toString(16).padStart(8, "0") +
              total.b.toString(16).padStart(8, "0") +
              `:${total.n}`,
            stamp: total.stamp,
            stamps: total.stamps,
            facts: total.n,
            bytes: total.bytes,
          },
        };
        if (cut !== undefined) this.worlds.put(root, cut, intervalFrom, intervalTo, answer, selected, materializeWorld);
        return answer;
      }
    } else {
      const found = this.index.pull(root, basis);
      if (found && found.rows.every((row: any) => "publicMetadata" in row)) {
        this.diagnostics.local++;
        return {
          triples: Object.freeze(found.rows.map(publicRow)),
          entities: found.entities,
          depth: found.depth,
          roundTrips: 0,
          route: "replica",
          language: "packed",
          waitedMs,
        };
      }
    }
    this.diagnostics.fallback++;
    if (!(basis.recordedPosition !== undefined && basis.recordedPosition > this.index.position)) this.diagnostics.ineligible++;
    const replicaFallbackReason = !this.index.valid ? "copy-unavailable" :
      basis.recordedPosition !== undefined && basis.recordedPosition < this.index.floor ? "outside-window" :
      basis.recordedPosition !== undefined && basis.recordedPosition > this.index.position ? "watermark-timeout" :
      basis.recordedPosition === undefined && basis.recordedAt !== undefined && !this.index.strictRecordClocks ? "non-strict-record-clock" :
      basis.recordedPosition === undefined && basis.recordedAt !== undefined && this.index.isOpenClock(basis.recordedAt) ? "open-record-clock" : "unmapped-clock-or-closure";
    const result = await fallback();
    return { ...result, route: "fallback", waitedMs, replicaFallbackReason };
  }
}
// [DX-R3] Why: report and control feed placement explicitly; the local host historically used the read URL already.
// Rejected: inferring its route from the unrelated W0 driver's feedPeer label.
export function replicaEndpoint(env: NodeJS.ProcessEnv, peer: "reader" | "writer") {
  return peer === "writer" ? env.DATOMIC_URL! : env.DATOMIC_READ_URLS?.split(",")[0] ?? env.DATOMIC_URL!;
}
export class ReplicaReadHost {
  readonly applied: { position: number; at: number; availableAt?: number; receivedAt?: number }[] = [];
  readonly index: InstanceType<typeof api.RecentReads>;
  readonly replica: InstanceType<typeof api.Replica>;
  private times: Map<number, number>;
  private clockEnds: Map<number, number>;
  readonly timings: Map<number, { availableAt?: number; receivedAt: number }>;
  private closeClient: (() => void) | undefined;
  private listeners = new Set<(delta: ReadDelta) => void>();
  private constructor(source: any, times: Map<number, number>, historyBytes: number, strictRecordClocks: boolean, clockEnds = new Map<number, number>(), timings = new Map<number, { availableAt?: number; receivedAt: number }>()) {
    this.index = new api.RecentReads(20_000, historyBytes, strictRecordClocks);
    this.times = times;
    this.clockEnds = clockEnds;
    this.timings = timings;
    this.replica = new api.Replica(source, Date.now());
    let initialized = false;
    this.replica.onUpdate = (update: any) => {
      // [DX-R3] Why: only open()'s initial cut has a gateway time/position proof; recovery images have none.
      // Rejected: treating a pending journal clock as a verified bootstrap clock after invalidation.
      const clock = update.reset && initialized ? NaN : times.get(update.position);
      if (update.reset) initialized = true;
      if (update.reset && !update.valid) times.clear();
      const delta: ReadDelta = {
        ...update,
        changes: update.changes.map(([id, previous, entity]: any) => [
          id,
          previous,
          prepareEntity(id, entity),
        ]),
        ...(clock !== undefined && (!update.reset || Number.isFinite(clock)) ? { recordTime: clock, clockEnd: clockEnds.get(update.position) } : {}),
      };
      this.index.apply(delta);
      if (delta.valid) this.applied.push({ position: delta.position, at: performance.timeOrigin + performance.now(), ...timings.get(delta.position) });
      timings.delete(delta.position);
      times.delete(update.position);
      clockEnds.delete(update.position);
      for (const listener of this.listeners) listener(delta);
    };
  }
  static async open(
    scope: string,
    roots: readonly string[],
    comp: Pick<CompositionHandle, "currentPosition">,
    initial: { position: number; instant: number },
    feed: "legacy" | "inline" = "inline",
    historyBytes = 64 * 1024 ** 2,
    peer: "reader" | "writer" = "reader",
    endpoint = replicaEndpoint(process.env, peer),
  ) {
    const client = new api.DatomicClient(
      endpoint,
    );
    const db = await client.create(
      runtimeApi.DatabaseScope.test(scope),
      process.env.TRIPLEX_DATOMIC_LAYOUT ?? "lean",
    );
    const timed = api.timedReplicaSource(client, db.db, () => comp.currentPosition(), feed === "inline" ? Date.now() : undefined);
    const { times, clockEnds, timings } = timed;
    const source = boundedReplicaFeed(timed.source);
    // [DX-R3] Why: the initial image has no earlier journal clock proof; compare the gateway's actual selected cuts.
    // Rejected: trusting a caller-supplied timestamp/position pair for imported or irregular scopes.
    await source.feed(Math.max(0, initial.position - 1), 1, 0);
    times.set(initial.position, await bootstrapClock(source, roots[0]!, initial));
    // [DX-R3] Why: admission follows the actual source capability, never the requested creation policy.
    // Rejected: treating old sealed seeds as strict when reopening them cannot change their contract.
    const capability = await client.request("POST", `/v2/db/${db.db}/reach-many`, {
      replicaCapability: true, basis: { recordedPosition: initial.position, validAt: Date.now() },
    });
    const host = new ReplicaReadHost(source, times, historyBytes, capability.supported === true && capability.strictRecordClocks === true, clockEnds, timings);
    await host.replica.bootstrap(roots, initial.position);
    host.closeClient = () => client.close();
    host.replica.start();
    return host;
  }
  subscribe(listener: (delta: ReadDelta) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  async close() {
    await this.replica.stop();
    this.closeClient?.();
    this.listeners.clear();
    this.times.clear();
  }
}

// [DX-R3] Why: the low-volume RYOW reply must carry its real world, even though hot readers use lazy immutable buffers.
// Rejected: a checksum-only reply that invents an empty triples array across the worker boundary.
export function replicaReply(result: PullResult): PullResult {
  return { ...result, triples: result.triples.map(row => mapOptions(row, value =>
    value._tag === "Some" ? { _tag: "Some", value: value.value } : { _tag: "None" })) };
}
export function restoreReplicaReply(result: PullResult): PullResult {
  return { ...result, triples: Object.freeze(result.triples.map(row => freezePublic(mapOptions(row, value =>
    value._tag === "Some" ? Option.some(value.value) : Option.none())))) };
}
// [DX-R3] Why: structured clone drops Effect Option prototype tags; carry them explicitly on the wire.
// Rejected: treating a cloned None as an arbitrary empty object or a cloned Some as its unwrapped value.
function mapOptions(row: PullResult["triples"][number], convert: (value: any) => any) {
  const copy: any = { ...row };
  for (const key of ["validTo", "createdBy", "entityType", "schemaVersion", "txId", "retractedAt", "retractTxId"])
    if (copy[key] && (copy[key]._tag === "Some" || copy[key]._tag === "None")) copy[key] = convert(copy[key]);
  return copy;
}

// [DX-R3] Why: a read peer may still be catching up at bootstrap; retry the same exact two-cut proof before declining.
// Rejected: nearest-time admission or accepting different native cuts (would weaken the original clock rule).
export async function bootstrapClock(source: { page(...args: any[]): Promise<any> }, root: string, initial: { position: number; instant: number }, budgetMs = 2000) {
  const deadline = performance.now() + budgetMs;
  for (;;) {
    const validAt = Date.now();
    const p = await source.page([root], { recordedPosition: initial.position, validAt }, true);
    const r = await source.page([root], { recordedAt: initial.instant, validAt }, true);
    if (!p.declined && !r.declined && typeof p.t === "string" && p.t.length > 0 && p.t === r.t) return initial.instant;
    if (performance.now() >= deadline) return NaN;
    await new Promise(resolve => setTimeout(resolve, 5));
  }
}

// [DX-R3-P8] Why: four journals bound CPU/packing bursts between long polls without changing ordered content.
// Rejected: waiting to pack sixteen growing hot worlds before requesting the next page.
export function boundedReplicaFeed<T extends { feed(after: number, limit: number, waitMs: number): Promise<any> }>(source: T): T {
  return { ...source, feed: (after: number, limit: number, waitMs: number) => source.feed(after, Math.min(limit, 4), waitMs) };
}

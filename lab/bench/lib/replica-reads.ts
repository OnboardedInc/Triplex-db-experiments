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
type Prepared = PackedEntity & {
  stats: SharedArrayBuffer;
  refs: readonly { id: string; from: number; to: number }[];
  additionalBytes: number;
};
const STAT_WIDTH = 64;
// [DX-R3] Why: reuse the exact value decoder once while retaining every row's own interval.
// Rejected: a second tagged-value codec, or decoding the entire entity once for each valid-time boundary.
function allRows(id: string, packed: PackedEntity) {
  const length = packed.byteLength ?? packed.buffer.byteLength - (packed.offset ?? 0);
  const original = new DataView(packed.buffer, packed.offset ?? 0, length);
  const start = Math.ceil((8 + original.getUint32(0, true)) / 8) * 8;
  const scratch = new SharedArrayBuffer(length);
  new Uint8Array(scratch).set(new Uint8Array(packed.buffer, packed.offset ?? 0, length));
  const view = new DataView(scratch);
  for (let i = 0; i < view.getUint32(4, true); i++) {
    view.setFloat64(start + i * 48 + 24, -Number.MAX_VALUE, true);
    view.setFloat64(start + i * 48 + 32, Number.MAX_VALUE, true);
  }
  return api
    .unpackEntity(id, { revision: packed.revision, buffer: scratch }, 0)
    .map((row: any, i: number) => {
      const from = original.getFloat64(start + i * 48 + 24, true),
        to = original.getFloat64(start + i * 48 + 32, true);
      return { ...row, validFrom: from, validTo: to === Infinity ? undefined : to };
    });
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
  for (const row of allRows(id, packed)) {
    const from = row.validFrom,
      to = row.validTo ?? Infinity;
    if (!Number.isFinite(from) || (to !== Infinity && !Number.isFinite(to)))
      throw Error("Invalid contribution interval");
    if (from >= to) continue;
    const o = observe({
      triples: [row],
      entities: 1,
      depth: 0,
      roundTrips: 0,
      route: "replica",
      language: "packed",
      waitedMs: 0,
    });
    const part = {
      a: parseInt(o.digest.slice(0, 8), 16),
      b: parseInt(o.digest.slice(8, 16), 16),
      bytes: o.bytes,
      stamp: o.stamp,
      stamps: o.stamps,
    };
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
    stats,
    refs,
    additionalBytes:
      256 + stats.byteLength + refs.reduce((n, ref) => n + 96 + ref.id.length * 2, 0),
  };
}
const statViews = new WeakMap<object, DataView>();
export class ReplicaReader {
  readonly index: InstanceType<typeof api.RecentReads>;
  // [DX-R3] Why: the host proxy already validates/applies each cut; RYOW can share that same immutable-version index.
  // Rejected: a second main-thread copy of every current/history entry and duplicate per-commit validation/allocation.
  constructor(historyBytes = 64 * 1024 ** 2, index?: InstanceType<typeof api.RecentReads>) { this.index = index ?? new api.RecentReads(20_000, historyBytes); }
  readonly diagnostics = { local: 0, fallback: 0, ahead: 0, caughtUp: 0, waitExpired: 0, ineligible: 0 };
  private waiters = new Set<{ p: number; done(): void }>();
  install(image: ReadImage) {
    this.index.install(image);
  }
  apply(delta: ReadDelta) {
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
  ): Promise<PullResult> {
    if (between) {
      // [DX-R3] Why: the first complete read must happen before the real intervening ACK.
      // Rejected: waiting for the ACK before touching the index (would report a fictitious straddle).
      const before = await this.pullAt(root, basis, fallback, undefined, rows);
      await between();
      const after = await this.pullAt(root, basis, fallback, undefined, rows);
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
    if (basis.recordedPosition !== undefined && basis.recordedPosition > this.index.position) {
      this.diagnostics.ahead++;
      const start = performance.now();
      await this.wait(basis.recordedPosition, 10);
      waitedMs = performance.now() - start;
      if (this.index.position >= basis.recordedPosition) this.diagnostics.caughtUp++;
      else this.diagnostics.waitExpired++;
    }
    if (!rows) {
      const total = { a: 0, b: 0, n: 0, bytes: 0, stamp: -1, stamps: 0 };
      const selected: (string | PackedEntity)[] = [];
      const selectedValidAt = basis.validAt;
      let materialized: PullResult["triples"] | undefined;
      const found = this.index.visit(
        root,
        basis,
        (id: string, packed: PackedEntity, validAt: number) => {
          selected.push(id, packed);
          const prepared = packed as Prepared;
          if (!prepared.stats) throw Error("Unprepared replica read buffer");
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
      if (found) {
        this.diagnostics.local++;
        return {
          // [DX-R3] Why: a pull returns its actual immutable world, not only a checksum; decoding is demand-driven.
          // Rejected: an empty triples array paired with a cached nonempty observation.
          get triples() {
            if (!materialized) {
              const rows: PullResult["triples"][number][] = [];
              for (let i = 0; i < selected.length; i += 2)
                for (const row of api.unpackEntity(
                  selected[i] as string,
                  selected[i + 1] as PackedEntity,
                  selectedValidAt,
                ))
                  rows.push(row);
              materialized = rows;
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
      }
    } else {
      const found = this.index.pull(root, basis);
      if (found) {
        this.diagnostics.local++;
        return {
          triples: found.rows,
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
      basis.recordedPosition !== undefined && basis.recordedPosition > this.index.position ? "watermark-timeout" : "unmapped-clock-or-closure";
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
  readonly index: InstanceType<typeof api.RecentReads>;
  readonly replica: InstanceType<typeof api.Replica>;
  private times: Map<number, number>;
  private closeClient: (() => void) | undefined;
  private listeners = new Set<(delta: ReadDelta) => void>();
  private constructor(source: any, times: Map<number, number>, historyBytes: number) {
    this.index = new api.RecentReads(20_000, historyBytes);
    this.times = times;
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
        ...(clock !== undefined ? { recordTime: clock } : {}),
      };
      this.index.apply(delta);
      times.delete(update.position);
      for (const listener of this.listeners) listener(delta);
    };
  }
  static async open(
    scope: string,
    roots: readonly string[],
    comp: CompositionHandle,
    initial: { position: number; instant: number },
    feed: "legacy" | "inline" = "inline",
    historyBytes = 64 * 1024 ** 2,
    peer: "reader" | "writer" = "reader",
  ) {
    const client = new api.DatomicClient(
      replicaEndpoint(process.env, peer),
    );
    const db = await client.create(
      runtimeApi.DatabaseScope.test(scope),
      process.env.TRIPLEX_DATOMIC_LAYOUT ?? "lean",
    );
    const { source, times } = api.timedReplicaSource(client, db.db, () => comp.currentPosition(), feed === "inline" ? Date.now() : undefined);
    // [DX-R3] Why: the initial image has no earlier journal clock proof; compare the gateway's actual selected cuts.
    // Rejected: trusting a caller-supplied timestamp/position pair for imported or irregular scopes.
    const positionPage = await source.page(
      [roots[0]!],
      { recordedPosition: initial.position, validAt: Date.now() },
      true,
    );
    const timePage = await source.page(
      [roots[0]!],
      { recordedAt: initial.instant, validAt: Date.now() },
      true,
    );
    times.set(
      initial.position,
      !positionPage.declined && !timePage.declined && positionPage.t === timePage.t
        ? initial.instant
        : NaN,
    );
    const host = new ReplicaReadHost(source, times, historyBytes);
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

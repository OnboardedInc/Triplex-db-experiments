import { pathToFileURL } from "node:url";
import { REPO, runtimeApi } from "./triplex.ts";
import { observe, type Observed } from "./observe.ts";
import type { CompositionHandle, PullResult } from "./composition.ts";
import type {
  PackedEntity,
  ReadDelta,
  ReadImage,
  ReadBasis,
} from "../../../packages/datomic/dist/index.js";

const api = await import(pathToFileURL(`${REPO}/packages/datomic/dist/index.js`).href);
type Segment = { from: number; to: number; refs: readonly string[]; observed: Observed };
type Prepared = PackedEntity & { segments: readonly Segment[] };
// [DX-R3] Why: hash every actual fact once per immutable entity version/valid-time segment in the follower.
// Rejected: each reader decoding JSON and hashing the same entity bodies on every pull.
export function prepareEntity(id: string, packed: PackedEntity): Prepared {
  const view = new DataView(packed.buffer, packed.offset ?? 0, packed.byteLength);
  const start = Math.ceil((8 + view.getUint32(0, true)) / 8) * 8;
  const boundaries = new Set<number>([-Infinity, Infinity]);
  for (let i = 0; i < view.getUint32(4, true); i++) {
    boundaries.add(view.getFloat64(start + i * 48 + 24, true));
    boundaries.add(view.getFloat64(start + i * 48 + 32, true));
  }
  const sorted = [...boundaries].sort((a, b) => a - b),
    segments: Segment[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const from = sorted[i]!,
      to = sorted[i + 1]!;
    const triples = api.unpackEntity(id, packed, from);
    segments.push({
      from,
      to,
      refs: triples
        .filter((row: any) => row.value.type === "ref")
        .map((row: any) => row.value.value),
      observed: observe({
        triples,
        entities: 1,
        depth: 0,
        roundTrips: 0,
        route: "replica",
        language: "packed",
        waitedMs: 0,
      }),
    });
  }
  return { ...packed, segments };
}
export class ReplicaReader {
  readonly index = new api.RecentReads();
  private waiters = new Set<{ p: number; done(): void }>();
  install(image: ReadImage) {
    this.index.install(image);
  }
  apply(delta: ReadDelta) {
    this.index.apply(delta);
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
      return {
        ...after,
        route: before.route === "replica" && after.route === "replica" ? "replica" : "fallback",
        roundTrips: before.roundTrips + after.roundTrips,
        waitedMs: before.waitedMs + after.waitedMs,
      };
    }
    let waitedMs = 0;
    if (basis.recordedPosition !== undefined && basis.recordedPosition > this.index.position) {
      const start = performance.now();
      await this.wait(basis.recordedPosition, 10);
      waitedMs = performance.now() - start;
    }
    if (!rows) {
      const total = { a: 0, b: 0, n: 0, bytes: 0, stamp: -1, stamps: 0 };
      const found = this.index.visit(
        root,
        basis,
        (_id: string, packed: PackedEntity, validAt: number) => {
          const segments = (packed as Prepared).segments;
          if (!segments) throw Error("Unprepared replica read buffer");
          let lo = 0,
            hi = segments.length;
          while (lo < hi) {
            const mid = (lo + hi) >>> 1;
            if (segments[mid]!.to <= validAt) lo = mid + 1;
            else hi = mid;
          }
          const segment = segments[lo]!;
          const o = segment.observed;
          total.a = (total.a + parseInt(o.digest.slice(0, 8), 16)) >>> 0;
          total.b = (total.b + parseInt(o.digest.slice(8, 16), 16)) >>> 0;
          total.n += o.facts;
          total.bytes += o.bytes;
          total.stamps += o.stamps;
          total.stamp = Math.max(total.stamp, o.stamp);
          return segment.refs;
        },
      );
      if (found)
        return {
          triples: [],
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
    } else {
      const found = this.index.pull(root, basis);
      if (found)
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
    const result = await fallback();
    return { ...result, route: "fallback", waitedMs };
  }
}
export class ReplicaReadHost {
  readonly index = new api.RecentReads();
  readonly replica: InstanceType<typeof api.Replica>;
  private times: Map<number, number>;
  private closeClient: (() => void) | undefined;
  private listeners = new Set<(delta: ReadDelta) => void>();
  private constructor(source: any, times: Map<number, number>) {
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
  ) {
    const client = new api.DatomicClient(
      process.env.DATOMIC_READ_URLS?.split(",")[0] ?? process.env.DATOMIC_URL!,
    );
    const db = await client.create(
      runtimeApi.DatabaseScope.test(scope),
      process.env.TRIPLEX_DATOMIC_LAYOUT ?? "lean",
    );
    const { source, times } = api.timedReplicaSource(client, db.db, () => comp.currentPosition());
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
    const host = new ReplicaReadHost(source, times);
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

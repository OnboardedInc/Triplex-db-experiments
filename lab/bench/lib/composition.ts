/**
 * Composition: the four ways the driver touches the store. Every number in an NS receipt is
 * produced through one named composition, so engine-specific fast paths can be swapped in later
 * behind the same interface and compared on matched runs.
 *
 *   writer       transact(operations, meta) -> receipt; transactionByCommand(id) for lost ACKs
 *   subject pull pull(rootEntityId, basis)    -> the subject's world (BFS over refs at one basis)
 *   feed reader  feedPage(after, limit)       -> ordered transaction envelopes
 *   sweep reader sweepPull(rootEntityId, basis) (P5; defaults to `pull`)
 *
 * [EXP-N01] The only composition today is `public`: Triplex's public `Triples` service (transact,
 * entities at a basis, transactions({ after }), transactionByCommand). Register a new one in
 * COMPOSITIONS; reader workers resolve the same name, so all threads use the same paths.
 */
import { Effect, core, openTriples, type Lane, type TriplesHandle } from "./triplex.ts";

export interface Basis {
  readonly recordedAt: number;
  readonly validAt: number;
}
export interface PulledTriple {
  readonly id: string;
  readonly entityId: string;
  readonly attribute: string;
  readonly value: any;
  readonly validFrom?: number;
  readonly validTo?: number;
}
export interface PullResult {
  readonly triples: readonly PulledTriple[];
  readonly entities: number;
  readonly roundTrips: number;
  readonly depth: number;
  /** TARGETS 4.1 item 5: which layer served the read, and in which surface language. */
  readonly route: string;
  readonly language: string;
  /** Time spent waiting for an eligible index before serving or falling back (at most WATERMARK_WAIT_MS). */
  readonly waitedMs: number;
}
/** TARGETS 4.1 item 5 / RULINGS Q31d: wait at most this long for an eligible index, then fall back. */
export const WATERMARK_WAIT_MS = 10;
/** TARGETS 4.1 item 3 / RULINGS Q31c: a position as (stream, epoch, offset, ordinal). */
export interface Coordinate {
  readonly stream: string;
  readonly epoch: number;
  readonly offset: number;
  readonly ordinal: number;
}
export interface Receipt {
  readonly txId: string;
  readonly position: number;
  readonly instant: number;
  readonly triples: readonly PulledTriple[];
}
/** A typed failure from the store, normalized: `_tag` plus the original error. */
export interface StoreFailure {
  readonly ok: false;
  readonly tag: string;
  readonly error: any;
}
export type Outcome<A> = { readonly ok: true; readonly value: A } | StoreFailure;

/** TARGETS 4.1: the four layer assignments of a composition. */
export interface Assignments {
  readonly source: { lane: Lane; role: string };
  readonly current: { lane: Lane; role: string };
  readonly history: { lane: Lane; role: string };
  readonly analytics: { lane: Lane; role: string };
  /** Replication edges between layers (feed consumer source hash, translation generation); none in one-engine compositions. */
  readonly replicationEdges: readonly { from: string; to: string; consumerSourceSha256: string | null; generation: string | null }[];
}

export interface CompositionHandle {
  readonly name: string;
  readonly assignments: Assignments;
  /** Each read index's watermark (a source position); one-engine compositions read the source directly. */
  watermarks(): Promise<Record<string, number>>;
  readonly backend: { name: string; url: string; queryPath: string };
  transact(operations: readonly any[], meta: Record<string, unknown>): Promise<Outcome<Receipt>>;
  transactionByCommand(commandId: string): Promise<Outcome<any | null>>;
  /**
   * Subject pull at one basis. With `between`, the pull is a split read (TARGETS 1.1 P1 item 2): after
   * the first query the driver runs `between` (a commit to the same subject) and the remaining queries
   * use the same basis.
   */
  pull(rootEntityId: string, basis: Basis, between?: () => Promise<void>): Promise<PullResult>;
  sweepPull(rootEntityId: string, basis: Basis): Promise<PullResult>;
  feedPage(after: number, limit: number): Promise<{ transactions: readonly any[]; next?: number }>;
  /** Map a Triplex commit position to the composition's coordinate (stream, epoch, offset, ordinal). */
  coordinate(position: number): Coordinate;
  currentPosition(): Promise<number>;
  close(): Promise<void>;
}

function failureOf(exit: any): StoreFailure {
  const failure = exit?.cause?.failures?.[0];
  const error = failure?.error ?? failure?.defect ?? exit?.cause;
  // A defect (Die) has no typed tag: name it by its constructor so receipts say what failed.
  const tag = error?._tag ?? (failure?._tag === "Die" ? `Defect:${error?.name ?? error?.constructor?.name ?? "Unknown"}` : failure?._tag);
  return { ok: false, tag: String(tag ?? "Unknown"), error };
}

async function publicComposition(lane: Lane, scope: string, variant: "public" | "public-queued" = "public"): Promise<CompositionHandle> {
  const h: TriplesHandle = await openTriples(lane, scope, variant === "public-queued" ? { admissionQueue: true } : undefined);
  const T = h.triples;
  const E = (id: string) => core.EntityId.make(id);
  const outcome = async <A>(effect: any): Promise<Outcome<A>> => {
    const exit = await h.runExit(effect);
    return exit._tag === "Success" ? { ok: true, value: exit.value as A } : failureOf(exit);
  };
  const pull = async (root: string, basis: Basis, between?: () => Promise<void>): Promise<PullResult> => {
    const seen = new Set<string>([root]);
    let frontier = [root];
    const triples: PulledTriple[] = [];
    let roundTrips = 0;
    while (frontier.length) {
      const bodies: any[][] = await h.run(T.entities(frontier.map(E), basis));
      roundTrips++;
      if (roundTrips === 1 && between) await between();
      const next: string[] = [];
      for (const body of bodies)
        for (const t of body) {
          triples.push(t);
          if (t.value?.type === "ref" && !seen.has(t.value.value)) {
            seen.add(t.value.value);
            next.push(t.value.value);
          }
        }
      frontier = next;
    }
    // One-engine composition: the source of truth's own query surface is the only index, eligible for
    // every basis it has published, so no wait and no fallback are possible here.
    return { triples, entities: seen.size, roundTrips, depth: roundTrips - 1, route: "source", language, waitedMs: 0 };
  };
  const one = { lane, role: `triplex public Triples service on one engine slot${variant === "public-queued" && lane === "xtdb" ? " (XTDB adapter admissionQueue: true)" : ""}` };
  const language = lane === "xtdb" ? "triplex-entities(xtdb-sql)" : "triplex-entities(sparql)";
  return {
    name: variant,
    assignments: { source: one, current: one, history: one, analytics: one, replicationEdges: [] },
    watermarks: async () => ({ source: await h.run(T.currentPosition()) }),
    // Triplex exposes one dense position per scope; every transact is its own engine transaction, so
    // offset = position and ordinal = 0. Epoch 0: the scope has had no epoch change.
    coordinate: (position) => ({ stream: `triplex-journal:${scope}`, epoch: 0, offset: position, ordinal: 0 }),
    backend: h.backend,
    transact: (operations, meta) => outcome<Receipt>(T.transact(operations, meta)),
    transactionByCommand: (id) => outcome(T.transactionByCommand(id)),
    pull,
    sweepPull: pull,
    feedPage: (after, limit) => h.run(T.transactions({ after, limit })),
    currentPosition: () => h.run(T.currentPosition()),
    close: () => h.close(),
  };
}

export const COMPOSITIONS: Record<string, (lane: Lane, scope: string) => Promise<CompositionHandle>> = {
  /** In-process reference store (lib/memory.ts): diagnostic only, readers run in-thread. */
  memory: async (lane, scope) => (await import("./memory.ts")).memoryComposition(lane, scope, Number(process.env["TX2_MEMORY_SERVICE_MS"] ?? "1")),
  public: (lane, scope) => publicComposition(lane, scope, "public"),
  /** Same surfaces; on XTDB the adapter queues writes in process (admissionQueue) instead of racing the scope position CAS. */
  "public-queued": (lane, scope) => publicComposition(lane, scope, "public-queued"),
};

export async function openComposition(name: string, lane: Lane, scope: string): Promise<CompositionHandle> {
  const factory = COMPOSITIONS[name];
  if (!factory) throw new Error(`unknown composition ${name}; known: ${Object.keys(COMPOSITIONS).join(", ")}`);
  return factory(lane, scope);
}

export { Effect };

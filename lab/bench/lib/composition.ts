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

export interface CompositionHandle {
  readonly name: string;
  readonly backend: { name: string; url: string; queryPath: string };
  transact(operations: readonly any[], meta: Record<string, unknown>): Promise<Outcome<Receipt>>;
  transactionByCommand(commandId: string): Promise<Outcome<any | null>>;
  pull(rootEntityId: string, basis: Basis): Promise<PullResult>;
  sweepPull(rootEntityId: string, basis: Basis): Promise<PullResult>;
  feedPage(after: number, limit: number): Promise<{ transactions: readonly any[]; next?: number }>;
  currentPosition(): Promise<number>;
  close(): Promise<void>;
}

function failureOf(exit: any): StoreFailure {
  const failure = exit?.cause?.failures?.[0];
  const error = failure?.error ?? failure?.defect ?? exit?.cause;
  return { ok: false, tag: String(error?._tag ?? failure?._tag ?? "Unknown"), error };
}

async function publicComposition(lane: Lane, scope: string): Promise<CompositionHandle> {
  const h: TriplesHandle = await openTriples(lane, scope);
  const T = h.triples;
  const E = (id: string) => core.EntityId.make(id);
  const outcome = async <A>(effect: any): Promise<Outcome<A>> => {
    const exit = await h.runExit(effect);
    return exit._tag === "Success" ? { ok: true, value: exit.value as A } : failureOf(exit);
  };
  const pull = async (root: string, basis: Basis): Promise<PullResult> => {
    const seen = new Set<string>([root]);
    let frontier = [root];
    const triples: PulledTriple[] = [];
    let roundTrips = 0;
    while (frontier.length) {
      const bodies: any[][] = await h.run(T.entities(frontier.map(E), basis));
      roundTrips++;
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
    return { triples, entities: seen.size, roundTrips, depth: roundTrips - 1 };
  };
  return {
    name: "public",
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
  public: publicComposition,
};

export async function openComposition(name: string, lane: Lane, scope: string): Promise<CompositionHandle> {
  const factory = COMPOSITIONS[name];
  if (!factory) throw new Error(`unknown composition ${name}; known: ${Object.keys(COMPOSITIONS).join(", ")}`);
  return factory(lane, scope);
}

export { Effect };

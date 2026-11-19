import {
  DatomicClient,
  DatomicHttpError,
  DatomicTransportError,
  Replica,
} from "../../../packages/datomic/dist/index.js";
import { isDeepStrictEqual } from "node:util";
import { runtimeApi } from "./triplex.ts";
import type { Basis, CompositionHandle, PullResult } from "./composition.ts";
import { ReplicaReader, ReplicaReadHost, replicaEndpoint } from "./replica-reads.ts";

function unavailable(error: unknown) {
  return (
    error instanceof DatomicTransportError ||
    (error instanceof DatomicHttpError && [404, 429, 502, 503, 504].includes(error.status))
  );
}

export function validatedSubjectReader(scope: string, fallback: CompositionHandle["pull"]) {
  const raw = Number(process.env.DX_TOUCHED_RETAIN_BYTES ?? 16 * 1024 ** 2);
  const limit = raw === Infinity ? Number.MAX_SAFE_INTEGER : raw;
  if (!Number.isSafeInteger(limit) || limit < 1) throw Error("Invalid demand reader budget");
  const keys = Math.min(4 * 1024 ** 2, Math.floor(limit / 8));
  const name = runtimeApi.DatabaseScope.test(scope);
  let client: DatomicClient | undefined;
  const read = async (root: string, basis: Basis): Promise<PullResult> => {
    if (basis.recordedPosition === undefined && basis.recordedAt === undefined)
      return fallback(root, basis);
    // [DX-THIN1] Why: allocate a client on the first real pull and validate its entire closure at the requested native cut. Rejected: replaying an idle account's import just to advance a reader watermark.
    client ??= new DatomicClient(replicaEndpoint(process.env, "reader"), 35_000, 64 * 1024 ** 2,
      { entityCacheBytes: limit - keys, reachKeyBytes: keys, predecessorAttributes: [] });
    try {
      const world = await client.readDemandWorld(name, root, basis);
      if (world) return { triples: world.triples, entities: world.entities, depth: world.hops - 1,
        roundTrips: world.requests, route: "source", language: "revision-validated", waitedMs: 0 };
    } catch (error) {
      if (!unavailable(error)) throw error;
    }
    return fallback(root, basis);
  };
  return {
    async pull(root: string, basis: Basis, between?: () => Promise<void>) {
      const first = await read(root, basis);
      if (!between) return first;
      await between();
      const next = await read(root, basis);
      if (!isDeepStrictEqual(first.triples, next.triples)) throw Error("Pinned demand read changed");
      return { ...next, roundTrips: first.roundTrips + next.roundTrips };
    },
    usage() {
      const stats = client?.cacheDiagnostics();
      return { bytes: (stats?.reach.bytes ?? 0) + (stats?.reachKeys.bytes ?? 0), limit, packed: 0, history: 0,
        entries: stats?.reach.entries ?? 0, evictions: stats?.reach.evictions ?? 0, admissions: client?.reachDiagnostics.inlineEntities ?? 0 };
    },
    close() { client?.close(); client = undefined; },
  };
}

export function touchedPull(
  reader: ReplicaReader,
  replica: Replica,
  root: string,
  basis: Basis,
  gateway: () => Promise<PullResult>,
  between?: () => Promise<void>,
) {
  return reader.pullAt(
    root,
    basis,
    async () => {
      // [DX-THIN1] Why: only the existing clock resolver can turn a time-only request into a proven position.
      // Rejected: a writer receipt hint or the position echoed alongside a time-selected gateway response.
      const cut = reader.index.resolve(basis);
      if (cut === undefined) return gateway();
      try {
        if (!(await replica.admit(root, cut, basis.validAt))) return gateway();
      } catch (error) {
        // [DX-THIN1] Why: the exact read path can still serve the request when the optional replica endpoint is unavailable.
        // Rejected: suppressing a malformed closure or different row bytes at the same proven cut.
        if (unavailable(error)) return gateway();
        throw error;
      }
      const result = await reader.pullAt(root, basis, gateway);
      return { ...result, roundTrips: result.roundTrips + 1 };
    },
    between,
  );
}

export function touchedComposition(base: CompositionHandle): CompositionHandle {
  const scope = base.scopeName;
  if (!scope) throw Error("A touched reader needs a named scope");
  if (process.env.DX_TOUCHED_READ_MODE === "validated") {
    const reader = validatedSubjectReader(scope, base.pull.bind(base));
    return { ...base, name: "reach-touched", pull: reader.pull, touchedUsage: reader.usage,
      async close() { reader.close(); await base.close(); } };
  }
  let live: ReplicaReadHost | undefined;
  const open = async (root: string) => {
    const position = await base.currentPosition();
    try {
      const host = await ReplicaReadHost.open(
        scope,
        [],
        base,
        { position, instant: NaN },
        "legacy",
        64 * 1024 ** 2,
        "reader",
        replicaEndpoint(process.env, "reader"),
        "touched",
        root,
      );
      const reader = new ReplicaReader(undefined, host.index);
      host.subscribe((delta) => reader.notify(delta.reset));
      live = host;
      return { host, reader };
    } catch (error) {
      if (error instanceof Replica.UnsupportedScope) return undefined;
      throw error;
    }
  };
  let opened: ReturnType<typeof open> | undefined;
  return {
    ...base,
    name: "reach-touched",
    assignments: {
      ...base.assignments,
      current: { lane: "datomic", role: "read-admitted subject replica" },
    },
    touchedUsage: () => live
      ? { ...live.replica.retention, packed: live.replica.bytes, position: live.replica.position, history: live.index.historyBytes }
      : { bytes: 0, limit: Number(process.env.DX_TOUCHED_RETAIN_BYTES ?? 16 * 1024 ** 2), evictions: 0, admissions: 0, entries: 0, packed: 0, history: 0 },
    async pull(root, basis, between) {
      if (basis.recordedPosition === undefined && basis.recordedAt === undefined)
        return base.pull(root, basis, between);
      opened ??= open(root).catch((error) => {
        opened = undefined;
        if (unavailable(error)) return undefined;
        throw error;
      });
      const copy = await opened;
      if (!copy) return base.pull(root, basis, between);
      return touchedPull(
        copy.reader,
        copy.host.replica,
        root,
        basis,
        () => base.pull(root, basis),
        between,
      );
    },
    async watermarks() {
      const watermarks = await base.watermarks(),
        copy = await opened;
      if (copy?.host.replica.isValid) watermarks.current = copy.host.replica.position;
      return watermarks;
    },
    async close() {
      try {
        await (await opened)?.host.close();
      } finally {
        await base.close();
      }
    },
  };
}

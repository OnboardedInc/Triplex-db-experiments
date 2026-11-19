import {
  DatomicHttpError,
  DatomicTransportError,
  Replica,
} from "../../../packages/datomic/dist/index.js";
import type { Basis, CompositionHandle, PullResult } from "./composition.ts";
import { ReplicaReader, ReplicaReadHost, replicaEndpoint } from "./replica-reads.ts";

function unavailable(error: unknown) {
  return (
    error instanceof DatomicTransportError ||
    (error instanceof DatomicHttpError && [404, 429, 502, 503, 504].includes(error.status))
  );
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
    touchedUsage: () => live ? { ...live.replica.retention, packed: live.replica.bytes, position: live.replica.position, history: live.index.historyBytes } : { bytes: 0, limit: Number(process.env.DX_TOUCHED_RETAIN_BYTES ?? 16 * 1024 ** 2), evictions: 0, entries: 0, packed: 0, history: 0 },
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

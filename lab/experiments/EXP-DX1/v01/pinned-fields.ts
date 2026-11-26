import assert from "node:assert/strict";
import type { DatomicClient } from "../../../../packages/datomic/dist/index.js";

type Row = Awaited<ReturnType<DatomicClient["rows"]>>[number];
type Pending = { entity: string; resolve: (rows: readonly Row[]) => void; reject: (error: unknown) => void };

// [DX-SRV2] The read-profile id of the exchange that answered a read, set by an exchange hook on the rows it returns and
// carried to each read of a batch, so a read can be classed by its exchange's io-stats. Reads are not changed.
export const exchangeTags = new WeakMap<object, string>();
/** Sends one exchange with a read-profile header and tags its rows with the profile id. */
export function profiledExchange<A>(client: DatomicClient, send: () => Promise<A>, observe?: (sample: { id: string }) => void): Promise<A> {
  let id: string | undefined;
  return client.withReadProfile((sample) => { id = sample.id; observe?.(sample); }, send).then((rows) => {
    if (id && rows && typeof rows === "object") exchangeTags.set(rows as object, id);
    return rows;
  });
}

// [DX-RD1] Why: a cohort shares a scope, attribute and immutable basis. Batch only calls already queued in this turn.
// Rejected: a timer to fill batches, mixing snapshots, or replacing a logical read with a sampled check.
export function pinnedFields(client: DatomicClient, db: string, attribute: string,
  basis: { recordedPosition: number; validAt: number }, size: number,
  exchange: <A>(send: () => Promise<A>, batchSize: number) => Promise<A>) {
  assert(Number.isInteger(size) && size >= 1 && size <= 16);
  const fetch = (entities: string[], logical: number) => exchange(() => client.rows(db, {
    entityIds: entities, pattern: { attribute }, basis,
  }), logical);
  let pending: Pending[] = [];
  const drain = () => {
    const queued = pending;
    pending = [];
    for (let at = 0; at < queued.length; at += size) {
      const group = queued.slice(at, at + size);
      const entities = new Set(group.map((item) => item.entity));
      void fetch([...entities], group.length).then((rows) => {
        const byEntity = new Map<string, Row>();
        for (const row of rows) {
          assert(entities.has(row.entity_id) && row.attribute === attribute && !byEntity.has(row.entity_id));
          byEntity.set(row.entity_id, row);
        }
        const tag = exchangeTags.get(rows);
        for (const item of group) {
          const row = byEntity.get(item.entity), answer = row ? [row] : [];
          if (tag) exchangeTags.set(answer, tag);
          item.resolve(answer);
        }
      }).catch((error: unknown) => { for (const item of group) item.reject(error); });
    }
  };
  return size === 1 ? (entity: string) => fetch([entity], 1) : (entity: string) => new Promise<readonly Row[]>((resolve, reject) => {
    if (!pending.length) queueMicrotask(drain);
    pending.push({ entity, resolve, reject });
  });
}

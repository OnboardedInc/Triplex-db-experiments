import assert from "node:assert/strict";
import type { DatomicClient } from "../../../../packages/datomic/dist/index.js";

type Row = Awaited<ReturnType<DatomicClient["rows"]>>[number];
type Pending = { entity: string; resolve: (rows: readonly Row[]) => void; reject: (error: unknown) => void };

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
        for (const item of group) {
          const row = byEntity.get(item.entity);
          item.resolve(row ? [row] : []);
        }
      }).catch((error: unknown) => { for (const item of group) item.reject(error); });
    }
  };
  return size === 1 ? (entity: string) => fetch([entity], 1) : (entity: string) => new Promise<readonly Row[]>((resolve, reject) => {
    if (!pending.length) queueMicrotask(drain);
    pending.push({ entity, resolve, reject });
  });
}

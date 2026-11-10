import { DatomicClient } from "../../../../packages/datomic/dist/index.js";
import { runtimeApi } from "../../../bench/lib/triplex.ts";
import type { CompositionHandle } from "../../../bench/lib/composition.ts";
// [DX-H8] Why: per-entity history HTTP overhead made the qualified 10k seed exceed its 45-minute lease projection.
// Rejected: journal-derived counts, live-only rows, sampling, or a larger deadline (weakens the full-history gate).
// Mechanism: the existing public rows API accepts history:true plus entityIds; every row still passes decodeRow.
export async function openBulkCounts(comp: CompositionHandle) {
  if (!comp.scopeName || comp.backend.name !== "datomic")
    throw Error("bulk counts require scoped Datomic");
  const client = new DatomicClient(comp.backend.url, 35000);
  try {
    const scope = String(runtimeApi.DatabaseScope.test(comp.scopeName));
    const created = await client.create(scope);
    if (created.db !== "s2-" + Buffer.from(scope).toString("base64url"))
      throw Error("bulk count database binding mismatch");
    const stats: any[] = [];
    const histories = (entities: readonly string[], position: number) =>
      client.rows(created.db, {
        entityIds: entities,
        history: true,
        basis: { recordedPosition: position },
      });
    return {
      histories,
      stats,
      count: async () => {
        const start = performance.now(),
          position = await comp.currentPosition();
        if (!Number.isSafeInteger(position) || position < 0) throw Error("invalid count basis");
        const entities = new Set<string>();
        let after = 0;
        while (after < position) {
          const page = await comp.feedPage(after, 1000);
          if (!page.transactions.length) throw Error("bulk count journal gap");
          for (const tx of page.transactions) {
            if (
              tx.position !== after + 1 ||
              tx.position > position ||
              !tx.txId ||
              !Array.isArray(tx.changes)
            )
              throw Error("bulk count journal identity/gap");
            after = tx.position;
            for (const change of tx.changes) {
              if (typeof change.entityId !== "string")
                throw Error("bulk count missing entity identity");
              entities.add(change.entityId);
            }
          }
        }
        const ids = [...entities];
        let assertions = 0,
          retired = 0,
          requests = 0;
        for (let offset = 0; offset < ids.length; offset += 256) {
          const chunk = ids.slice(offset, offset + 256),
            allowed = new Set(chunk),
            rows = await histories(chunk, position);
          requests++;
          for (const row of rows) {
            if (
              !allowed.has(row.entity_id) ||
              !Number.isSafeInteger(row.recorded_position) ||
              row.recorded_position > position
            )
              throw Error("bulk history escaped source cut/entities");
            assertions++;
            if (row.retracted_position != null) retired++;
          }
        }
        if ((await comp.currentPosition()) !== position)
          throw Error("store changed during bulk count");
        const result = { position, assertions, retired };
        stats.push({
          result,
          entities: ids.length,
          historyRequests: requests,
          wallMs: performance.now() - start,
        });
        return result;
      },
      close: () => client.close(),
    };
  } catch (error) {
    client.close();
    throw error;
  }
}

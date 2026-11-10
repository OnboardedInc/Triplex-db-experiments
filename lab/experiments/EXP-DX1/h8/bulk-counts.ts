import { prepareJournalReader } from "../../../bench/lib/w0-journal-pool.ts";
import { DatomicClient } from "../../../../packages/datomic/dist/index.js";
import { runtimeApi } from "../../../bench/lib/triplex.ts";
import type { CompositionHandle } from "../../../bench/lib/composition.ts";
// [DX-H8] Why: per-entity history HTTP overhead made the qualified 10k seed exceed its 45-minute lease projection.
// Rejected: journal-derived counts, live-only rows, sampling, or a larger deadline (weakens the full-history gate).
// Mechanism: the existing public rows API accepts history:true plus entityIds; every row still passes decodeRow.
export async function openBulkCounts(comp: CompositionHandle) {
  if (!comp.scopeName || comp.backend.name !== "datomic")
    throw Error("bulk counts require scoped Datomic");
  const endpoint = process.env.DATOMIC_READ_URLS?.split(",")[0]?.trim() || comp.backend.url;
  const batchSize = Number(process.env.DXH8_COUNT_BATCH ?? "1024");
  const concurrency = Number(process.env.DXH8_COUNT_READS ?? "4");
  if (
    ![256, 1024, 4096].includes(batchSize) ||
    !Number.isInteger(concurrency) ||
    concurrency < 1 ||
    concurrency > 4
  )
    throw Error("invalid bounded history count transport");
  // [DX-H8] Why: full fresh counts took 80–124 s/1k on the one-CPU write peer; the two-CPU read peer is idle here.
  // Rejected: caching old counts or deriving them from journal changes (would weaken the independent stored-history check).
  const client = new DatomicClient(endpoint, 35000);
  try {
    const scope = String(runtimeApi.DatabaseScope.test(comp.scopeName));
    const created = await client.create(scope);
    if (created.db !== "s2-" + Buffer.from(scope).toString("base64url"))
      throw Error("bulk count database binding mismatch");
    const stats: any[] = [];
    let journal: Awaited<ReturnType<typeof prepareJournalReader>> | undefined;
    const histories = (entities: readonly string[], position: number) =>
      client.rows(created.db, {
        entityIds: entities,
        history: true,
        basis: { recordedPosition: position },
      });
    return {
      histories,
      stats,
      mode: `full-history-public-batch-${batchSize}-concurrency-${concurrency}`,
      count: async () => {
        const start = performance.now(),
          position = await comp.currentPosition();
        if (!Number.isSafeInteger(position) || position < 0) throw Error("invalid count basis");
        journal ??= await prepareJournalReader({
          comp,
          composition: "reach",
          lane: "datomic",
          scope: comp.scopeName!,
        });
        const enumeration = await journal.scan({ position, entities: true });
        const enumerationWallMs = performance.now() - start;
        const historyStarted = performance.now();
        const ids: string[] = enumeration.entities;
        let assertions = 0,
          retired = 0,
          requests = 0;
        for (let offset = 0; offset < ids.length; offset += batchSize * concurrency) {
          const reads = [];
          for (
            let start = offset;
            start < Math.min(ids.length, offset + batchSize * concurrency);
            start += batchSize
          ) {
            const chunk = ids.slice(start, start + batchSize),
              allowed = new Set(chunk);
            requests++;
            reads.push(histories(chunk, position).then((rows) => ({ rows, allowed })));
          }
          for (const { rows, allowed } of await Promise.all(reads))
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
          endpoint,
          batchSize,
          concurrency,
          enumerationWallMs,
          historyWallMs: performance.now() - historyStarted,
          wallMs: performance.now() - start,
        });
        console.error("[H8 counts] " + JSON.stringify(stats.at(-1)));
        return result;
      },
      close: async () => {
        client.close();
        await journal?.close();
      },
    };
  } catch (error) {
    client.close();
    throw error;
  }
}

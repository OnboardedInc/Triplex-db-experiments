import { DatomicClient } from "../../../../packages/datomic/dist/index.js";
import { runtimeApi } from "../../../bench/lib/triplex.ts";
import type { CompositionHandle } from "../../../bench/lib/composition.ts";
import { orderedMap } from "../../../bench/lib/w0-parallel.ts";

// [DX-BM1] Why: closed logical positions make independent journal ranges safe to read concurrently.
// Rejected: skipping old ranges, or treating a page limit as proof that the requested positions arrived.
export async function foldJournalForCounts(
  source: Pick<CompositionHandle, "feedPage">,
  position: number,
  concurrency: number,
  progress?: (position: number) => void,
) {
  if (!Number.isSafeInteger(position) || position < 0) throw Error("invalid count basis");
  const stride = 1000;
  const ranges = Array.from({ length: Math.ceil(position / stride) }, (_, i) => {
    const start = i * stride;
    return { start, end: Math.min(position, start + stride) };
  });
  const entities = new Set<string>();
  let assertions = 0,
    retired = 0,
    pages = 0;
  for await (const result of orderedMap(ranges, concurrency, async ({ start, end }) => {
    const entities = new Set<string>();
    let after = start,
      assertions = 0,
      retired = 0;
    while (after < end) {
      const page = await source.feedPage(after, end - after);
      if (!page.transactions.length) throw Error("bulk count journal gap");
      for (const tx of page.transactions) {
        if (
          tx.position !== after + 1 ||
          tx.position > end ||
          !tx.txId ||
          !Array.isArray(tx.changes)
        )
          throw Error("bulk count journal identity/gap");
        after = tx.position;
        for (const change of tx.changes) {
          if (
            typeof change.entityId !== "string" ||
            (change.op !== "assert" && change.op !== "retract")
          )
            throw Error("bulk count invalid journal change");
          entities.add(change.entityId);
          if (change.op === "assert") assertions++;
          else retired++;
        }
      }
    }
    return { end, entities, assertions, retired };
  })) {
    for (const id of result.entities) entities.add(id);
    assertions += result.assertions;
    retired += result.retired;
    if (++pages % 250 === 0 || result.end === position) progress?.(result.end);
  }
  return { entities, assertions, retired };
}
// [DX-H6] Why: per-entity history HTTP overhead made the qualified 10k seed exceed its 45-minute lease projection.
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
    const countAt = async (
      position: number,
      entities: Set<string>,
      concurrency = 1,
      progress?: (entities: number) => void,
      start = performance.now(),
    ) => {
      if ((await comp.currentPosition()) !== position) throw Error("count history cut changed");
      const ids = [...entities],
        stride = 256;
      const offsets = Array.from({ length: Math.ceil(ids.length / stride) }, (_, i) => i * stride);
      let assertions = 0,
        retired = 0,
        requests = 0;
      for await (const counts of orderedMap(offsets, concurrency, async (offset) => {
        const chunk = ids.slice(offset, offset + stride);
        const allowed = new Set(chunk);
        const rows = await histories(chunk, position);
        let retired = 0;
        for (const row of rows) {
          if (
            !allowed.has(row.entity_id) ||
            !Number.isSafeInteger(row.recorded_position) ||
            row.recorded_position > position
          )
            throw Error("bulk history escaped source cut/entities");
          if (row.retracted_position != null) retired++;
        }
        return { assertions: rows.length, retired };
      })) {
        assertions += counts.assertions;
        retired += counts.retired;
        requests++;
        if (requests % 1000 === 0 || requests === offsets.length)
          progress?.(Math.min(requests * stride, ids.length));
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
    };
    return {
      histories,
      stats,
      countAt,
      count: async () => {
        const start = performance.now(),
          position = await comp.currentPosition();
        const journal = await foldJournalForCounts(comp, position, 1);
        return countAt(position, journal.entities, 1, undefined, start);
      },
      close: () => client.close(),
    };
  } catch (error) {
    client.close();
    throw error;
  }
}

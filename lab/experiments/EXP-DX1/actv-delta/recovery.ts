import assert from "node:assert/strict";
import type { CompositionHandle } from "../../../bench/lib/composition.ts";
import { hash, type Objects, type Cell } from "./store.ts";
export class MissingOriginal extends Error {}
export async function originalObject<T>(
  db: Objects,
  key: string,
  cut: number,
  matches: (v: T) => boolean,
): Promise<Cell<T>> {
  const comp = db.comp as Partial<CompositionHandle>,
    entity = db.entity(key);
  if (!comp.feedPage) throw new MissingOriginal("exact source journal unavailable");
  // [DX-ACT2] Why: a missing recipe or damaged derived page can be reopened from the original atomic command in the native journal. Rejected: rebuilding a guessed empty posting list or adopting a similarly named newer release.
  let cursor = 0;
  while (cursor < cut) {
    const batch = await comp.feedPage(cursor, 64);
    if (!batch.transactions.length) throw new MissingOriginal("missing native journal prefix");
    for (const tx of batch.transactions) {
      assert.equal(tx.position, cursor + 1, "gap in native journal");
      cursor = tx.position;
      if (cursor > cut) break;
      if (
        tx.actor !== "activation-delta" ||
        typeof tx.commandId !== "string" ||
        !tx.commandId.startsWith(db.entity("cmd:"))
      )
        continue;
      for (const row of tx.changes) {
        if (
          row.op !== "assert" ||
          row.entityId !== entity ||
          row.attribute !== "delta/object" ||
          row.value?.type !== "string"
        )
          continue;
        assert(typeof row.tripleId === "string" && row.validFrom === 0);
        const recovered = await db.decode<T>(key, row.tripleId, cursor, row.value.value);
        if (!matches(recovered.value)) continue;
        const claim = await db.comp.transactionByCommand(tx.commandId);
        assert(claim.ok && claim.value?.position === cursor && claim.value.txId === tx.txId);
        assert(typeof row.tripleId === "string" && row.validFrom === 0);
        return recovered;
      }
    }
  }
  throw new MissingOriginal("missing certified native source object " + key);
}

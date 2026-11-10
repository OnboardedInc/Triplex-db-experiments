import assert from "node:assert/strict";
import { test } from "node:test";
import { prepareJournalReader } from "../../../bench/lib/w0-journal-pool.ts";
// [DX-H8] Why: compare every dense stored position across concurrent page boundaries and reject missing content.
// Rejected: verifying just a total count (would miss duplicate or omitted pages).
test("parallel stored journal reads preserve order, complete coverage and entity enumeration", async () => {
  const transactions = Array.from({ length: 4050 }, (_, i) => ({
    position: i + 1,
    txId: "tx" + i,
    changes: [
      { op: "assert", entityId: "e" + i },
      ...(i % 7 === 0 ? [{ op: "retract", entityId: "e" + i }] : []),
    ],
  }));
  let empty = false,
    active = 0,
    peak = 0;
  const comp: any = {
    currentPosition: async () => transactions.length,
    feedPage: async (after: number, limit: number) => {
      active++;
      peak = Math.max(active, peak);
      await new Promise((r) => setTimeout(r, 2));
      active--;
      return { transactions: empty ? [] : transactions.slice(after, after + limit) };
    },
  };
  const reader = await prepareJournalReader({
    comp,
    composition: "memory",
    lane: "xtdb",
    scope: "journal-unit",
  });
  try {
    const r = await reader.scan({ position: transactions.length, entities: true });
    assert.equal(r.position, 4050);
    assert.equal(r.assertions, 4050);
    assert.equal(r.retired, 579);
    assert.equal(r.entities.length, 4050);
    assert.equal(r.requests, 5);
    assert.equal(peak, 4);
    empty = true;
    await assert.rejects(reader.scan({ position: 4050 }), /gap\/coverage/);
  } finally {
    await reader.close();
  }
});

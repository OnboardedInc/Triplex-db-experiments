import assert from "node:assert/strict";
import { test } from "node:test";
import { w0Journal } from "../../../bench/lib/w0-journal.ts";
// [DX-H5] Why: restored scopes have no ACK cache, but must still reject missing or misbound stored records.
// Rejected: trusting a prior seed receipt as journal content.
test("explicit restored journal reads stored bytes and refuses partial or mispositioned pages", async () => {
  process.env.TX2_W0_RESTORE_INDEXED_JOURNAL = "1";
  const transactions = [
    { position: 1, txId: "stored-a", changes: [{ op: "assert", entityId: "actual" }] },
    { position: 2, txId: "stored-b", changes: [] },
  ];
  let page = transactions;
  const journal = w0Journal({
    run: async (x: any) => x,
    triples: { currentPosition: () => 2, transactions: () => ({ transactions: page }) },
  } as any);
  try {
    assert.deepEqual((await journal.page(0, 2)).transactions, transactions);
    for (const invalid of [
      transactions.slice(0, 1),
      [{ ...transactions[0], position: 2 }, transactions[1]],
      [{ ...transactions[0], changes: null }, transactions[1]],
    ]) {
      page = invalid as any;
      await assert.rejects(journal.page(0, 2), /gap\/content/);
    }
  } finally {
    delete process.env.TX2_W0_RESTORE_INDEXED_JOURNAL;
  }
});

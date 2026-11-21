import assert from "node:assert/strict";
import type { Evidence } from "../ha1/common.ts";
import { immutable, type Account, type Receipt } from "../ha1/one-db.ts";

export type AckAudit = {
  nonce: string;
  slot: string;
  source: Evidence["source"];
  database: string;
  rows: { expected: Receipt; observed: Receipt | null }[];
};

export async function auditAcknowledged(e: Evidence, ac: Account, known: readonly Receipt[]) {
  const expected = [...new Map(known.map((receipt) => [receipt.operationId, receipt])).values()];
  const rows: AckAudit["rows"] = [];
  for (let i = 0; i < expected.length; i += 256) {
    const batch = expected.slice(i, i + 256);
    const result = await ac.r.request<{
      database: string;
      operations: { status: string; operationId?: string }[];
    }>("POST", "/ha1/" + ac.db + "/operations", { ids: batch.map((r) => r.operationId) }, 20000);
    assert.equal(result.database, ac.db);
    assert.equal(result.operations.length, batch.length);
    for (const [j, receipt] of batch.entries()) {
      const item = result.operations[j]!;
      assert(item.status === "absent" || item.status === "committed");
      if (item.status === "committed") assert.equal(item.operationId, receipt.operationId);
      rows.push({
        expected: receipt,
        observed: item.status === "committed" ? immutable(item) : null,
      });
    }
  }
  const audit: AckAudit = { nonce: e.nonce, slot: e.slot, source: e.source, database: ac.db, rows };
  // [DX-HASYNC1] Why: preserve the original acknowledged ledger and survivor answers even if a later check throws. Rejected: reporting zero loss from the final number of successful retries.
  e.write("ack-audit", audit);
  for (const row of rows) assert.deepEqual(row.observed, row.expected);
}

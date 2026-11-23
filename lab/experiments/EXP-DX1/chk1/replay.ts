import assert from "node:assert/strict";
import { DatomicClient } from "../../../../packages/datomic/dist/index.js";

export type Receipt = {
  id: string;
  p: number;
  t: string;
  clock: number;
  tx: string;
  command?: string;
};
type SaveAck = {
  operationId: string;
  position: { v: string };
  t: { v: string };
  recordedAt: { v: number };
  subjectAppendRetirement?: boolean;
};
export function saveAck(value: unknown): SaveAck {
  const ack = value as SaveAck;
  assert(
    ack &&
      typeof ack.operationId === "string" &&
      /^\d+$/.test(ack.position?.v) &&
      /^\d+$/.test(ack.t?.v) &&
      Number.isFinite(ack.recordedAt?.v),
  );
  return ack;
}
type Page = Awaited<ReturnType<DatomicClient["log"]>>;
type Commit = Extract<Page["rows"][number], { kind: "commit" }>;

// [DX-CHK1] Why: restart at native t=0 and join the replay to externally captured receipts and queryable journal rows.
// Rejected: using the running feed consumer's cursor or its receipt-derived journal as the recount.
export async function replay(endpoint: string, db: string, terminal: number, expected: Receipt[]) {
  const fresh = new DatomicClient(endpoint, 35_000);
  const pending = new Map(expected.map((r) => [r.p, r]));
  const commits: Commit[] = [];
  assert.equal(pending.size, expected.length);
  let next = "0";
  let position = 0;
  try {
    while (position < terminal) {
      const page = await fresh.log(db, next, 17);
      assert(BigInt(page.nextT) > BigInt(next), "Feed stopped before the terminal position");
      next = page.nextT;
      for (const row of page.rows) {
        if (row.kind !== "commit") continue;
        const tx = row.transaction;
        for (const p of tx.positions.map(Number)) {
          assert.equal(p, ++position, "Gap or repeated logical position in replay");
          assert(p <= terminal, "Durable feed extends beyond the settled head");
          const receipt = pending.get(p);
          if (!receipt) continue;
          assert.deepEqual(
            [row.t, tx.operationId, tx.stamp],
            [receipt.t, receipt.id, String(receipt.clock)],
          );
          assert(
            tx.txIds.includes(receipt.tx) && tx.commandIds.includes(receipt.command ?? receipt.id),
          );
          const [saved, journal] = await Promise.all([
            fresh.operation(db, receipt.id),
            fresh.rows(db, {
              entityIds: [receipt.tx],
              history: true,
              basis: { recordedPosition: p },
            }),
          ]);
          assert.deepEqual(
            [
              saved.status,
              saved.operationId,
              Number(saved.position?.v),
              saved.t?.v,
              saved.recordedAt?.v,
            ],
            ["committed", receipt.id, p, receipt.t, receipt.clock],
          );
          assert.deepEqual(
            journal.filter((f) => f.attribute === ":_tx/position").map((f) => f.value_number),
            [p],
          );
          assert.deepEqual(
            journal.filter((f) => f.attribute === ":_tx/command-id").map((f) => f.value_string),
            [receipt.command ?? receipt.id],
          );
          assert.deepEqual(
            journal.filter((f) => f.attribute === ":_tx/instant").map((f) => f.value_datetime),
            [receipt.clock],
          );
          assert(
            journal.some((f) => f.attribute === ":_tx/change"),
            "Stored journal had no changes",
          );
          pending.delete(p);
        }
        commits.push(row);
      }
    }
    assert.equal(pending.size, 0, "A captured receipt had no durable journal entry");
    assert.equal(Number((await fresh.basis(db)).position.v), terminal);
    return commits;
  } finally {
    fresh.close();
  }
}

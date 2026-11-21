import assert from "node:assert/strict";
import { DatomicClient } from "../../../../packages/datomic/dist/index.js";
import { creditModeSelection } from "../prep1/rolling-credits.ts";
import { now } from "../scale1/decision/observer.ts";
import { field, task, type Write } from "../scale1/decision/plan.ts";
import { play, resolveUncertain, type Sender } from "../scale1/decision/writes.ts";
import { replay } from "./replay.ts";

export const trafficPeople = [0, 1, 2, 3, 4, 5].map((account) => task(account, 0));
const attribute = field(1);
export const trafficSeed = trafficPeople.map((e) => ({
  e,
  a: attribute,
  v: { type: "string" as const, value: "rolling-seed" },
}));

type Erased = { t: string; position?: number; seq?: number; assertionId: string };

// [DX-CHK1] Why: invoke the actual removal while a rolling grant is in flight in the same scope and require durable traffic on both sides.
// Rejected: a timer-only overlap or checking only that the launch flag set.
export async function duringRemoval<T extends Erased>(
  endpoint: string,
  db: string,
  nonce: string,
  erase: () => Promise<T>,
  evidence: (name: string, value: unknown) => void,
) {
  const client = new DatomicClient(endpoint, 35_000);
  try {
    const start = Number((await client.basis(db)).position.v);
    const options = await client.request<{
      subjectAppendRetirement: boolean;
      subjectOrderedIds: boolean;
      database: string;
    }>("GET", "/v1/db/" + db + "/write-options");
    assert.deepEqual(
      [options.database, options.subjectOrderedIds, options.subjectAppendRetirement],
      [db, true, true],
    );
    const rows = await client.rows(db, {
      entityIds: trafficPeople,
      pattern: { attribute },
      basis: { recordedPosition: start, validAt: 1_800_000_000_000 },
    });
    assert.equal(rows.length, trafficPeople.length);
    const senders: Sender[] = trafficPeople.map((entity, account) => ({
      client,
      rows: new Map([[entity, rows.filter((r) => r.entity_id === entity)]]),
      scope: { name: nonce, db, cut: start, seedCut: start, accounts: [account] },
    }));
    const tape: Write[] = Array.from({ length: 24 }, (_, ordinal) => ({
      ordinal,
      account: ordinal % trafficPeople.length,
      subject: 0,
      ms: 70 * Math.floor(ordinal / trafficPeople.length),
      width: 1,
      version: "removal/" + ordinal,
    }));
    const transport = client.transact.bind(client);
    const proof = new Map<string, { id: string; prior: string; value: string }>();
    let removal: Promise<T> | undefined;
    client.transact = (...args) => {
      const input = args[1];
      assert(input.live?.length === 1);
      proof.set(input.operationId, {
        id: input.rows[0]!.id,
        prior: input.live[0]!,
        value: input.rows[0]!.value_string!,
      });
      const submitted = transport(...args);
      if (!removal) {
        removal = erase();
        void removal.catch(() => {});
      }
      return submitted;
    };
    const result = await play(
      senders,
      tape,
      now(),
      nonce + "-overlap",
      true,
      true,
      creditModeSelection("rolling6"),
      undefined,
      true,
    );
    assert(removal, "No rolling save raced the removal");
    const cut = await removal;
    await resolveUncertain(senders, result.unresolved);
    assert.equal(result.rows.length, tape.length);
    const receipts = [];
    const latest = new Map<number, number>();
    for (const row of result.rows) {
      assert(row.receipt && row.status === "acked", JSON.stringify(row));
      const { p } = row.receipt;
      assert(p > (latest.get(row.account) ?? start));
      latest.set(row.account, p);
      const dep = proof.get(row.id)!;
      const pinned = await client.rows(db, {
        entityIds: [trafficPeople[row.account]],
        pattern: { attribute },
        basis: { recordedPosition: p, validAt: 1 },
      });
      assert.deepEqual(
        pinned.map((r) => [r.id, r.value_string]),
        [[dep.id, dep.value]],
      );
      // [DX-CHK1] Why: protected scope retirement is a physical fallback even for ordinary fields.
      // Rejected: claiming that an enabled switch emitted a native marker behind an erasure fence.
      assert.equal(Boolean(row.stage?.subjectAppendRetirement), false);
      receipts.push({ ...row.receipt, id: row.id });
    }
    const terminal = Number((await client.basis(db)).position.v);
    assert.equal(terminal, start + tape.length + 1);
    const commits = await replay(endpoint, db, terminal, receipts);
    const event = commits.find((r) => r.t === cut.t);
    assert(event && cut.position && event.transaction.positions.includes(String(cut.position)));
    assert(
      event.transaction.changes.some(
        (c) =>
          c.op === "erase" && c.assertionId === cut.assertionId && c.erasureSeq === String(cut.seq),
      ),
    );
    assert(receipts.some((r) => r.p > cut.position!));
    for (const r of receipts) {
      const { id, prior } = proof.get(r.id)!;
      const tx = commits.find((x) => x.t === r.t)!.transaction;
      assert.deepEqual(tx.changes.map((c) => [c.op, c.assertionId]).sort(), [
        ["assert", id],
        ["retract", prior],
      ]);
    }
    evidence("combined-rolling-removal", {
      start,
      terminal,
      cut,
      receipts,
      replayCommits: commits.length,
    });
    return cut;
  } finally {
    client.close();
  }
}

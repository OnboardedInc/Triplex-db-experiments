import assert from "node:assert/strict";
import { test } from "node:test";
import { DatomicClient } from "../../../../packages/datomic/dist/index.js";
import { DatabaseScope } from "../../../../packages/core/dist/runtime/index.js";
// [DX-H6] Why: model delayed preparation and ACK independently, exercising the public onSent bridge.
// Rejected: an ACK-order mock that never checks when the next command can start preparing.
test("next reference command starts after public send boundary with earlier ACKs still in flight", async () => {
  const original = DatomicClient.prototype.transact;
  let active = 0,
    peak = 0,
    prior = 0,
    acks = 0;
  const starts: number[] = [],
    sent: number[] = [];
  (DatomicClient.prototype as any).transact = function (_db: any, input: any, onSent: any) {
    const n = Number(input.claims[0].commandId.split(":").at(-1));
    starts.push(n);
    active++;
    peak = Math.max(peak, active);
    setTimeout(() => {
      (onSent ?? input.onSent)?.();
      sent.push(n);
    }, 5);
    return new Promise((resolve) =>
      setTimeout(() => {
        active--;
        acks++;
        resolve({ position: n });
      }, 50),
    );
  };
  try {
    const { submitReferenceCommand } = await import("../../../bench/lib/w0-seed-order.ts");
    const scopeName = "send-test",
      db = "s2-" + Buffer.from(String(DatabaseScope.test(scopeName))).toString("base64url");
    const comp: any = {
      scopeName,
      backend: { name: "datomic" },
      transact: (_ops: any[], meta: any) =>
        (DatomicClient.prototype.transact as any)
          .call({}, db, { claims: [{ commandId: meta.commandId }] }, () => prior++)
          .then((value: any) => ({ ok: true, value })),
    };
    const pending = [];
    for (let n = 1; n <= 3; n++) {
      const p = await submitReferenceCommand(comp, [], { commandId: "p5:seed:" + n });
      assert.equal(sent.at(-1), n);
      assert.equal(acks, 0);
      pending.push(p.ack);
    }
    assert.deepEqual(starts, [1, 2, 3]);
    assert.equal(peak, 3);
    assert.equal(prior, 3);
    await Promise.all(pending);
    assert.equal(acks, 3);
    await assert.rejects(
      submitReferenceCommand(
        { ...comp, transact: async () => ({ ok: true, value: { position: 1 } }) },
        [],
        { commandId: "p5:seed:4" },
      ),
      /without its send boundary/,
    );
  } finally {
    DatomicClient.prototype.transact = original;
  }
});

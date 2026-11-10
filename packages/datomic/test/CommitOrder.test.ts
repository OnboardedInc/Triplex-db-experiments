import { expect, it } from "vitest";
import { registerCommit, endCommit, sendCommit } from "../src/CommitOrder.js";
// [DX-B5-L0] Why: exercise overtaking, equal clocks, cancellation and overlapping acknowledgements.
// Rejected: sequential callback fixtures (cannot expose send-order defects).
it("orders registered sends by clock and registration without waiting for ACKs", async () => {
  const first = registerCommit(10), second = registerCommit(10), last = registerCommit(20);
  const sent: number[] = [];
  let ack!: () => void;
  const pendingAck = new Promise<void>((r) => { ack = r; });
  const c = sendCommit(last, async (n) => { sent.push(n); });
  const b = sendCommit(second, async (n) => { sent.push(n); });
  expect(sent).toEqual([]);
  const a = sendCommit(first, async (n) => { sent.push(n); await pendingAck; });
  await Promise.all([b, c]);
  expect(sent).toHaveLength(3);
  expect(sent[1]).toBe(sent[0]! + 1);
  expect(sent[2]).toBe(sent[1]! + 1);
  ack(); await a;
});
it("unblocks a later ready request when an earlier callback ends", async () => {
  const first = registerCommit(1), second = registerCommit(2);
  let sent = false;
  const p = sendCommit(second, async () => { sent = true; });
  expect(sent).toBe(false);
  endCommit(first);
  await p;
  expect(sent).toBe(true);
});

import { expect, it } from "vitest";
import { registerCommit, endCommit, sendCommit } from "../src/CommitOrder.js";
// [DX-B5-L0] Why: exercise overtaking, equal clocks, cancellation and overlapping acknowledgements.
// Rejected: sequential callback fixtures (cannot expose send-order defects).
it("orders registered sends by clock and registration without waiting for ACKs", async () => {
  const first = registerCommit(10),
    second = registerCommit(10),
    last = registerCommit(20);
  const sent: number[] = [];
  let ack!: () => void;
  const pendingAck = new Promise<void>((r) => {
    ack = r;
  });
  const c = sendCommit(last, async (n, flushed) => {
    sent.push(n);
    flushed();
  });
  const b = sendCommit(second, async (n, flushed) => {
    sent.push(n);
    flushed();
  });
  expect(sent).toEqual([]);
  const a = sendCommit(first, async (n, flushed) => {
    sent.push(n);
    flushed();
    await pendingAck;
  });
  await Promise.all([b, c]);
  expect(sent).toHaveLength(3);
  expect(sent[1]).toBe(sent[0]! + 1);
  expect(sent[2]).toBe(sent[1]! + 1);
  ack();
  await a;
});
it("unblocks a later ready request when an earlier callback ends", async () => {
  const first = registerCommit(1),
    second = registerCommit(2);
  let sent = false;
  const p = sendCommit(second, async (_n, flushed) => {
    sent = true;
    flushed();
  });
  expect(sent).toBe(false);
  endCommit(first);
  await p;
  expect(sent).toBe(true);
});
it("waits for the actual socket send rather than request construction", async () => {
  const first = registerCommit(30),
    second = registerCommit(31),
    seen: number[] = [];
  let flush!: () => void;
  const a = sendCommit(first, async (n, sent) => {
    seen.push(n);
    flush = sent;
    await new Promise<void>((resolve) => {
      queueMicrotask(resolve);
    });
  });
  const b = sendCommit(second, async (n, sent) => {
    seen.push(n);
    sent();
  });
  expect(seen).toHaveLength(1);
  flush();
  await Promise.all([a, b]);
  expect(seen).toHaveLength(2);
});

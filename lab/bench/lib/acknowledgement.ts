// [DX-T1-12] Why: the final receipt, including lost-ACK reconciliation, reaches the caller before any benchmark bookkeeping.
// Rejected: stamp the first response before a retry/resolve, or put another store read between receipt delivery and the clock stop.
export async function acknowledgeReceipt<T>(receipt: T, actions: {
  reconcileLostAck?: (receipt: T) => Promise<void>;
  updateSubject: (receipt: T) => void;
  stamp: (receipt: T) => number;
}): Promise<{ receipt: T; ackAt: number }> {
  if (actions.reconcileLostAck) await actions.reconcileLostAck(receipt);
  actions.updateSubject(receipt);
  const ackAt = actions.stamp(receipt);
  if (!Number.isFinite(ackAt)) throw Error("Invalid final receipt stamp");
  return { receipt, ackAt };
}

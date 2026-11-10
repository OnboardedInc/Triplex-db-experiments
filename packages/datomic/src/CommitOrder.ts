// [DX-B5-L0] Why: register the clock before staging can yield; order sends across all clients in this process.
// Rejected: serializing acknowledgements (unrelated subjects must remain in flight).
import { randomUUID } from "node:crypto";
export interface OrderedCommit {
  timestamp: number;
  ready: boolean;
  send?: (sequence: number) => void;
}
const pending: OrderedCommit[] = [];
export const commitClientId = randomUUID();
let sequence = 0;
function drain() {
  pending.sort((a, b) => a.timestamp - b.timestamp);
  while (pending[0]?.ready) {
    const item = pending.shift()!;
    item.send?.(++sequence);
  }
}
export function registerCommit(timestamp: number): OrderedCommit {
  const item = { timestamp, ready: false };
  pending.push(item);
  return item;
}
export function endCommit(item: OrderedCommit | undefined) {
  if (!item) return;
  const index = pending.indexOf(item);
  if (index >= 0) pending.splice(index, 1);
  drain();
}
export function sendCommit<A>(item: OrderedCommit, send: (sequence: number) => Promise<A>): Promise<A> {
  return new Promise((resolve, reject) => {
    item.send = (number) => {
      try { resolve(send(number)); } catch (error) { reject(error); }
    };
    item.ready = true;
    drain();
  });
}

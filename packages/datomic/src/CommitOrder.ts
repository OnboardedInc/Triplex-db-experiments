// [DX-B5-L0] Why: register the clock before staging can yield; order sends across all clients in this process.
// Rejected: serializing acknowledgements (unrelated subjects must remain in flight).
import { randomUUID } from "node:crypto";
export interface OrderedCommit {
  timestamp: number;
  ready: boolean;
  sending?: boolean;
  send?: (sequence: number) => void;
}
const pending: OrderedCommit[] = [];
export const commitClientId = randomUUID();
let sequence = 0;
export const orderDiagnostics = { sent: 0, regressions: 0, maximum: -Infinity };
function drain() {
  if (pending.some((item) => item.sending)) return;
  pending.sort((a, b) => a.timestamp - b.timestamp);
  const item = pending[0];
  if (item?.ready && !item.sending) {
    item.sending = true;
    if (Number.isFinite(item.timestamp)) {
      orderDiagnostics.sent++;
      if (item.timestamp < orderDiagnostics.maximum) orderDiagnostics.regressions++;
      orderDiagnostics.maximum = Math.max(orderDiagnostics.maximum, item.timestamp);
    }
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
export function sendCommit<A>(
  item: OrderedCommit,
  send: (sequence: number, sent: () => void) => Promise<A>,
): Promise<A> {
  return new Promise((resolve, reject) => {
    item.send = (number) => {
      try {
        // [DX-B5-L0] Why: req.end may still be queued behind a TCP connect; finish is the actual send boundary.
        // Rejected: draining on request construction (different sockets can overtake by more than 20 ms).
        resolve(send(number, () => endCommit(item)).finally(() => endCommit(item)));
      } catch (error) {
        endCommit(item);
        reject(error);
      }
    };
    item.ready = true;
    drain();
  });
}

// [DX-B5-L0] Why: register the clock before staging can yield; order sends across all clients in this process.
// Rejected: serializing acknowledgements (unrelated subjects must remain in flight).
import { randomUUID } from "node:crypto";
export interface OrderedCommit {
  timestamp: number;
  lane: string;
  ready: boolean;
  sending?: boolean;
  send?: (sequence: number) => void;
}
const pending: OrderedCommit[] = [];
export const commitClientId = randomUUID();
interface Lane {
  id: string;
  sequence: number;
  inFlight: number;
}
const lanes = new Map<string, Lane>();
function laneFor(key: string): Lane {
  let lane = lanes.get(key);
  if (!lane) {
    lane = { id: key === "" ? commitClientId : randomUUID(), sequence: 0, inFlight: 0 };
    lanes.set(key, lane);
  }
  return lane;
}
// [DX-B9-B] Why: peers at different writer URLs cannot receive one another's missing sequences.
// Rejected: one process-global counter (cross-peer writes create permanent gaps).
export function commitClientIdFor(key: string) {
  return laneFor(key).id;
}
export function resumeCommitOrder(key: string, expectedSequence: number) {
  const lane = laneFor(key);
  if (lane.inFlight || pending.some((item) => item.lane === key))
    throw new Error("Settle the client suffix before resuming its sequence");
  if (
    !Number.isSafeInteger(expectedSequence) ||
    expectedSequence < 1 ||
    expectedSequence > lane.sequence + 1
  )
    throw new RangeError("Invalid expected commit sequence");
  lane.sequence = expectedSequence - 1;
}
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
    item.send?.(++laneFor(item.lane).sequence);
  }
}
export function registerCommit(timestamp: number, lane = ""): OrderedCommit {
  const item = { timestamp, ready: false, lane };
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
        const lane = laneFor(item.lane);
        lane.inFlight++;
        let request: Promise<A>;
        try {
          request = send(number, () => endCommit(item));
        } catch (error) {
          lane.inFlight--;
          throw error;
        }
        resolve(
          request.finally(() => {
            lane.inFlight--;
            endCommit(item);
          }),
        );
      } catch (error) {
        endCommit(item);
        reject(error);
      }
    };
    item.ready = true;
    drain();
  });
}

// [DX-B6-5] Why: all clients for one scope share timestamp issuance and ticket registration.
// Rejected: per-client clocks (cross-client ties survive).
const issued = new Map<string, number>();
export function observeInstant(scope: string, maximum: number) {
  issued.set(scope, Math.max(issued.get(scope) ?? -Infinity, maximum));
}
export function issueInstant(scope: string, now: number) {
  const instant = Math.max(now, (issued.get(scope) ?? -Infinity) + 1);
  observeInstant(scope, instant);
  return instant;
}

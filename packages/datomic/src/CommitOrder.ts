// [DX-B5-L0] Why: register the clock before staging can yield; order sends across all clients in this process.
// Rejected: serializing acknowledgements (unrelated subjects must remain in flight).
import { randomUUID } from "node:crypto";
import { beginSpan, endSpan, bindTraceCallback } from "./tracing.js";
export interface OrderedCommit {
  timestamp: number;
  lane: object;
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
const defaultLane = {};
const lanes = new WeakMap<object, Lane>();
function laneFor(key: object): Lane {
  let lane = lanes.get(key);
  if (!lane) {
    lane = { id: key === defaultLane ? commitClientId : randomUUID(), sequence: 0, inFlight: 0 };
    lanes.set(key, lane);
  }
  return lane;
}
// [DX-B10] Why: each client owns a sequence; distinct gateway clients cannot fill one another's gaps.
// Rejected: one process-global counter (cross-peer writes create permanent gaps).
export function commitClientIdFor(key: object) {
  return laneFor(key).id;
}
export function resumeCommitOrder(key: object, expectedSequence: number) {
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
export function registerCommit(timestamp: number, lane = defaultLane): OrderedCommit {
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
    const wait = beginSpan("client.commit-send-queue", "event-loop");
    // [DX-T1-2] Why: preserve this ticket's exact trace parent when a predecessor releases it.
    // Rejected: borrowing the predecessor's context, which falsely charges its HTTP work to that commit.
    item.send = bindTraceCallback((number) => {
      endSpan(wait);
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
    });
    item.ready = true;
    drain();
  });
}

// [DX-B6-5] Why: all clients for one scope share timestamp issuance and ticket registration.
// Rejected: per-client clocks (cross-client ties survive).
const issued = new Map<string, number>();
export function observeInstant(scope: string, maximum: number) {
  if (!Number.isFinite(maximum)) throw new RangeError("Expected a finite record clock maximum");
  issued.set(scope, Math.max(issued.get(scope) ?? -Infinity, maximum));
}
export function issueInstant(scope: string, now: number) {
  if (!Number.isFinite(now)) throw new RangeError("Expected a finite record clock");
  const maximum = issued.get(scope) ?? -Infinity;
  let instant = Math.max(now, maximum + 1);
  // [DX-R3-P7] Why: supported imported clocks can exceed the integer-millisecond precision range.
  // Rejected: maximum + 1 alone (can round back to maximum and make every replay fail).
  if (instant <= maximum) {
    const bits = new DataView(new ArrayBuffer(8));
    bits.setFloat64(0, maximum);
    bits.setBigUint64(0, bits.getBigUint64(0) + (maximum >= 0 ? 1n : -1n));
    instant = bits.getFloat64(0);
  }
  if (!Number.isFinite(instant))
    throw new RangeError("Finite record clock exhausted; use a fresh scope");
  observeInstant(scope, instant);
  return instant;
}

// [DX-R3-P7] Why: strict scopes order physical commits, including nested public journals.
// Rejected: issuing a fresh instant per logical command (one physical commit then has mixed clocks).
export function physicalInstant(
  scope: string,
  now: number,
  order: { instant?: number },
  strict: boolean,
) {
  if (strict && order.instant !== undefined) return order.instant;
  const instant = issueInstant(scope, now);
  if (strict) order.instant = instant;
  return instant;
}

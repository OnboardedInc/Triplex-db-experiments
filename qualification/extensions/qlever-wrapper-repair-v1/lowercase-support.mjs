/** Independent bounded inventory for the NEW lowercase probe; no service API.
 * Reuses the reviewed string extension's response/basis/phase primitives. Array
 * order remains evidence; this helper never sorts or repairs a backend answer.
 */
import assert from 'node:assert/strict';
export {
  basisMatches, canonical, exact, membership, phases, rowsOf, safeError, sha,
} from '../string-order-v1/probe-support.mjs';
export const LOWERCASE_SDK_CALLS = Object.freeze([
  'fresh-lowercase', 'seed-lowercase', 'ack-seed-lowercase',
  'native-lowercase-membership', 'native-gt-b', 'native-ge-c', 'native-lt-e', 'native-le-e',
  'datalog-lowercase-membership', 'datalog-gt-b', 'datalog-ge-c', 'datalog-lt-e', 'datalog-le-e',
  'datalog-reopen-gt-b', 'datalog-reopen-ge-c', 'datalog-reopen-lt-e', 'datalog-reopen-le-e',
]);
export class LowercaseInventory {
  constructor(deadline, now = () => Date.now()) { this.deadline = deadline; this.now = now; this.seen = new Set(); }
  take(id) {
    assert(LOWERCASE_SDK_CALLS.includes(id) && !this.seen.has(id), 'LOWERCASE_CALL_NOT_DECLARED_OR_REPEATED');
    const remaining = this.deadline - this.now(); assert(remaining > 0, 'LOWERCASE_DISPATCH_WINDOW_EXPIRED');
    this.seen.add(id); return Math.min(5000, remaining);
  }
}

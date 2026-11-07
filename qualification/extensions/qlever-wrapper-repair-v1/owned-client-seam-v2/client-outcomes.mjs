/** Private application observer, SOURCE ONLY. Never sends HTTP or cancels work.
 * Admitted methods retain the original receiver/arguments/Promise/value/cause.
 * A later request is refused after uncertainty or the active absolute deadline.
 */
import assert from 'node:assert/strict';

const requests = new Set(['query', 'update', 'command']);
const classes = new Set(['Error', 'TypeError', 'RangeError', 'AbortError', 'QleverHttpError']);
const errorClass = error => {
  try { return classes.has(error?.name) ? error.name : 'OtherError'; }
  catch { return 'OtherError'; }
};

export function observeOwnedQleverClient(original, {
  dispatchUntil, now = () => Date.now(), assertAdmission = () => {},
  onUncertainty = () => {}, emit = () => {},
}) {
  assert(Number.isSafeInteger(dispatchUntil));
  for (const name of ['query', 'update', 'command', 'cancel', 'close'])
    assert.equal(typeof original[name], 'function', 'COMPLETE_EXPLICIT_CLIENT_REQUIRED');
  let sequence = 0, unknown = false, observerFailures = 0, admissionRefusals = 0;
  const pending = new Set(), reasons = new Set();
  const notify = (name, callback, event) => {
    const fail = () => {
      unknown = true; reasons.add('OBSERVER_FAILURE'); observerFailures++;
      if (name !== 'uncertainty') notify('uncertainty', onUncertainty,
        Object.freeze({ reason: 'OBSERVER_FAILURE' }));
    };
    try {
      const result = callback(Object.freeze(event));
      if (result && typeof result.then === 'function') {
        // Notification must be synchronous. Consume an invalid async callback's
        // rejection without manufacturing an unhandled observer Promise.
        fail(); Promise.resolve(result).catch(() => {});
      }
    } catch { fail(); }
  };
  const uncertain = (reason, event = {}) => {
    unknown = true; reasons.add(reason);
    notify('uncertainty', onUncertainty, { ...event, reason });
  };
  const admit = () => {
    try {
      const result = assertAdmission();
      if (result && typeof result.then === 'function') {
        Promise.resolve(result).catch(() => {});
        throw new Error('SYNCHRONOUS_ADMISSION_CHECK_REQUIRED');
      }
    }
    catch (error) { uncertain('COORDINATOR_ADMISSION_REFUSED'); admissionRefusals++; throw error; }
    let at;
    try { at = now(); assert(Number.isSafeInteger(at), 'FINITE_ABSOLUTE_CLOCK_REQUIRED'); }
    catch (error) { uncertain('OBSERVER_CLOCK_UNPROVEN'); admissionRefusals++; throw error; }
    if (at >= dispatchUntil) uncertain('ACTIVE_DISPATCH_DEADLINE');
    if (unknown) { admissionRefusals++; throw new Error('Q_CLIENT_ADMISSION_UNRESOLVED'); }
  };
  const method = kind => function (...args) {
    if (requests.has(kind)) admit();
    const id = ++sequence; pending.add(id);
    const signal = requests.has(kind) ? args[1]?.signal : undefined;
    const onAbort = () => uncertain('CLIENT_SIGNAL_ABORT', { id, kind });
    let listening = false;
    const removeSignal = () => {
      if (listening) { signal.removeEventListener('abort', onAbort); listening = false; }
    };
    const finish = (ok, value) => {
      pending.delete(id); removeSignal();
      if (!ok) uncertain('CLIENT_PROMISE_REJECTED', { id, kind, errorClass: errorClass(value) });
      notify('emit', emit, { id, kind, phase: 'settled', ok,
        ...(ok ? {} : { errorClass: errorClass(value) }) });
    };
    if (signal instanceof AbortSignal) {
      signal.addEventListener('abort', onAbort, { once: true }); listening = true;
      if (signal.aborted) onAbort();
    }
    if (kind === 'cancel') uncertain('EXPLICIT_CANCEL_REQUEST', { id, kind });
    notify('emit', emit, { id, kind, phase: 'before-original' });
    let actual, delegated = false;
    try {
      // Final synchronous admission check after observation callbacks. Unknown
      // work cannot be followed by another request inside a caught outer Effect.
      if (requests.has(kind)) admit();
      delegated = true;
      actual = Reflect.apply(original[kind], original, args);
    } catch (error) {
      pending.delete(id); removeSignal();
      uncertain(delegated ? 'CLIENT_SYNCHRONOUS_THROW' : 'CLIENT_ADMISSION_REFUSED',
        { id, kind, errorClass: errorClass(error) });
      notify('emit', emit, { id, kind, phase: delegated ? 'original-threw' : 'refused-before-original',
        errorClass: errorClass(error) });
      throw error;
    }
    try {
      const observation = Promise.prototype.then.call(actual,
        value => { finish(true, value); }, error => { finish(false, error); });
      observation.catch(() => { uncertain('OBSERVER_FAILURE', { id, kind }); });
    } catch {
      // An invalid/non-Promise implementation cannot establish settlement.
      // Do not substitute a Promise or alter the original returned value.
      uncertain('CLIENT_PROMISE_OBSERVATION_UNPROVEN', { id, kind });
    }
    return actual;
  };
  return Object.freeze({
    client: Object.freeze({ query: method('query'), update: method('update'), command: method('command'),
      cancel: method('cancel'), close: method('close') }),
    snapshot: () => Object.freeze({ unknownClientWork: unknown, pendingMethodPromises: pending.size,
      methodAttempts: sequence, observerFailures, admissionRefusals, reasons: Object.freeze([...reasons]) }),
  });
}

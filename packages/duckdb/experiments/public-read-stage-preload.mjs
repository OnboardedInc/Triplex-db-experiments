/** Isolated diagnostic observers. Original owners, checks and native calls are
 * preserved. Dispatch-to-settlement spans include driver/scheduler overhead;
 * only existing C++ writer metrics are labelled native measurements.
 * Inspiration: wiki/problems/duckdb-recursion.md and the retained rate16 failure.
 */
import { AsyncLocalStorage } from 'node:async_hooks';
import { createHash } from 'node:crypto';
import { openSync, writeSync, closeSync } from 'node:fs';
// These are the exact JS modules imported by dist/DuckDBClient.js. The copied
// .mjs assets are different module identities and must not be instrumented.
import { NativeDuckDBPort } from '../dist/native-duckdb-port.js';
import { PublicDuckDBBackend } from '../dist/public-backend.js';

export function observePublicReadStages(file, { maximumBytes = 16 * 1024 ** 2, onQueue } = {}) {
  const fd = openSync(file, 'wx', 0o600), local = new AsyncLocalStorage(), began = performance.now();
  const restores = [], backendIds = new WeakMap(), portIds = new WeakMap(), backends = [], ports = [];
  let bytes = 0, dropped = 0, sequence = 0;
  const emit = value => {
    const text = JSON.stringify({ atMs: performance.now() - began, ...value }, (_key, item) => typeof item === 'bigint' ? item.toString() : item) + '\n';
    if (bytes + Buffer.byteLength(text) > maximumBytes) { dropped++; return; }
    writeSync(fd, text); bytes += Buffer.byteLength(text);
  };
  const backend = object => {
    if (!backendIds.has(object)) { const state = { id: backends.length + 1, pending: new Set() }; backends.push(state); backendIds.set(object, state); }
    return backendIds.get(object);
  };
  const port = object => {
    if (!portIds.has(object)) { const state = { id: ports.length + 1, object }; ports.push(state); portIds.set(object, state); }
    return portIds.get(object);
  };
  const patch = (prototype, name, wrapper) => { const original = prototype[name]; prototype[name] = wrapper(original); restores.push(() => { prototype[name] = original; }); };
  patch(PublicDuckDBBackend.prototype, 'withTransaction', original => function (work, ...admissionArgs) {
    const state = backend(this), inherited = local.getStore() ?? {}, transactionId = ++sequence;
    const priorPending = state.pending.size;
    state.pending.add(transactionId);
    const context = { ...inherited, backendId: state.id, transactionId };
    emit({ event: 'backend-queue-submit', ...context, priorPending });
    let result;
    try {
      result = local.run(context, () => original.call(this, async session => {
        emit({ event: 'transaction-work-enter', ...context });
        try { return await work(session); }
        finally { emit({ event: 'transaction-work-exit', ...context }); }
      }, ...admissionArgs));
    } catch (error) { state.pending.delete(transactionId); throw error; }
    // The original call has registered its actual FIFO continuation before
    // this notification. No artificial barrier holds another owner active.
    onQueue?.({ ...context, priorPending, queuedBehindAcceptedWork: priorPending > 0 });
    return result.then(value => { state.pending.delete(transactionId); emit({ event: 'backend-queue-settle', ...context, ok: true }); return value; }, error => { state.pending.delete(transactionId); emit({ event: 'backend-queue-settle', ...context, ok: false, error: error?.code ?? error?.name }); throw error; });
  });
  for (const name of ['assertResourceProfile', 'activateOwnership', 'begin', 'run', 'runNative', 'runWriter', 'commit', 'rollback', 'interrupt']) {
    patch(NativeDuckDBPort.prototype, name, original => function (...args) {
      const inherited = local.getStore() ?? {}, id = ++sequence, state = port(this), plan = args[0];
      const context = { ...inherited, spanId: id, portId: state.id, method: name };
      const sql = typeof plan?.sql === 'string' ? plan.sql : undefined;
      const details = sql ? { planName: plan.name, sqlSha256: createHash('sha256').update(sql).digest('hex'), parameters: plan.params?.length ?? 0 } : {};
      emit({ event: 'port-dispatch', ...context, ...details, timingMeaning: 'wrapper-dispatch-to-settlement-not-engine-sql-time' });
      if (name === 'assertResourceProfile') emit({ event: 'physical-acquisition-observed', ...context });
      const finish = (ok, error) => {
        emit({ event: 'port-settle', ...context, ...details, ok, ...(error ? { error: error?.code ?? error?.name } : {}) });
        if (ok && name === 'runWriter') emit({ event: 'direct-native-writer-metrics', ...context, metrics: this.writerMetrics().at(-1), timingMeaning: 'existing-cpp-worker-metrics-plus-separately-named-port-spans' });
      };
      let value;
      try { value = Reflect.apply(original, this, args); }
      catch (error) { finish(false, error); throw error; }
      if (value && typeof value.then === 'function') return value.then(result => { finish(true); return result; }, error => { finish(false, error); throw error; });
      finish(true); return value;
    });
  }
  return {
    withRequest: (requestId, work) => local.run({ requestId }, work),
    mark: (event, fields = {}) => emit({ event, ...fields }),
    snapshot: () => ({ bytes, maximumBytes, dropped, backends: backends.map(state => ({ id: state.id, pendingTransactions: state.pending.size })), ports: ports.map(state => ({ id: state.id, resourceProfile: state.object.resourceProfile() })) }),
    close: () => { for (const restore of restores.reverse()) restore(); closeSync(fd); },
  };
}

// lab/scenarios/lib/composition.mjs: the adapter seam between the GS scenarios and the NS driver (EXP-N01).
//
// [EXP-W01] Why: EXP-N01 (another agent, in parallel) owns lab/bench/ and its `Composition` object (writer,
// subject-pull reader, feed reader, sweep reader; N01 BRIEF "Point of view"). It had not landed when W01 was
// written, so this file implements that interface over Triplex's public API (`Triples.transact`,
// `entities` at a basis, `transactions({ after })`, `transactionByCommand`) and nothing else. When
// lab/bench/ lands, `openComposition` should return its composition instead; scenarios only call the methods
// below. Rejected: calling engine clients directly (the numbers must describe what an application gets).
import { loadTriplex } from './triplex.mjs';

const TAG_CATEGORY = {
  CommandAlreadyCommittedError: 'command-already-committed',
  TransactionConflictError: 'transaction-conflict',
  ConstraintViolationError: 'constraint-violation',
  InvalidTripleError: 'invalid-value',
  ValidationError: 'invalid-value',
  ParseError: 'invalid-value',
  SchemaError: 'invalid-value',
};

/** Classify a transact failure: typed rejection, unknown outcome, retryable serialization conflict or defect. */
export function classify(error) {
  const tag = error?._tag ?? error?.name ?? null;
  if (error?.reason === 'serialization-conflict') return { status: 'retry', tag };
  if (error?.reason === 'outcome-unknown') return { status: 'unknown', tag, commandId: error.commandId };
  if (error?.reason === 'unsupported-value-type') return { status: 'rejected', tag: 'UnsupportedValueTypeError', category: 'invalid-value', typed: true, message: error.message };
  const category = TAG_CATEGORY[tag];
  if (category) return { status: 'rejected', tag, category, typed: true, transactionId: error.transactionId, message: String(error.message).slice(0, 500) };
  if (tag === 'WriteError') return { status: 'rejected', tag, category: 'write-error', typed: true, reason: error.reason ?? null, message: String(error.message).slice(0, 500) };
  return { status: 'error', tag, typed: false, message: String(error?.message ?? error).slice(0, 1000) };
}

/**
 * Open the default composition ("triplex-public"): one Triplex runtime for one database scope.
 * Every method returns a Promise and never throws for a typed Triplex failure (it is classified instead).
 */
export async function openComposition({ lane, scope: scopeName, tenant = 'test', writerConcurrency = 1 }) {
  let active = 0; const waiting = [];
  const writerSlot = () => new Promise(resolve => {
    const grant = () => { active++; resolve(() => { active--; waiting.shift()?.(); }); };
    if (active < writerConcurrency) grant(); else waiting.push(grant);
  });
  const T = await loadTriplex();
  const backend = await T.qualification.loadQualificationBackend(lane);
  const scope = tenant === 'test' ? T.runtime.DatabaseScope.test(scopeName)
    : T.runtime.DatabaseScope.make({ env: 'lab', tenant, database: scopeName, generation: 0 });
  let rt, triples;
  const open = async () => {
    rt = T.ManagedRuntime.make(backend.makeRuntime().layer({ scope, capabilities: T.runtime.Capabilities.none }));
    triples = await rt.runPromise(T.core.Triples);
  };
  await open();
  const run = effect => rt.runPromise(effect);
  // A call in flight on a runtime that is being restarted may never settle; it is released as an unknown
  // outcome (resolved later by commandId) so the single-flight writer slot cannot leak.
  let restarted; const arm = () => { restarted = new Promise(resolve => { arm.fire = resolve; }); }; arm();
  const settle = async effect => {
    const exit = await Promise.race([rt.runPromiseExit(effect), restarted.then(() => 'RESTARTED')]);
    if (exit === 'RESTARTED') return { ok: false, error: { _tag: 'RuntimeRestarted', reason: 'outcome-unknown', message: 'Triplex runtime restarted while the call was in flight' } };
    if (T.Exit.isSuccess(exit)) return { ok: true, value: exit.value };
    const failure = T.Cause.findErrorOption ? T.Cause.findErrorOption(exit.cause) : null;
    const error = failure && failure._tag === 'Some' ? failure.value : (T.Cause.squash ? T.Cause.squash(exit.cause) : exit.cause);
    return { ok: false, error };
  };
  return {
    name: 'triplex-public', lane, backend: backend.name, endpoint: backend.url, queryPath: backend.queryPath, scope,
    /**
     * One command. Triplex allocates positions with a scope-wide compare-and-set (XTDB: ASSERT on
     * MAX(position) of tx_meta; QLever: source-changed check), so two commands on different subjects of one
     * scope conflict. Measured 2026-11-07 on the dev slots: 4 to 16 concurrent writers gave no throughput gain
     * and a retry storm (about 1 commit per 5 s). The composition therefore runs commits single-flight
     * (`writerConcurrency`, default 1) and still retries serialization conflicts from other processes.
     */
    async transact(operations, meta) {
      const release = await writerSlot();
      try {
        let conflicts = 0;
        for (;;) {
          const r = await settle(triples.transact(operations, meta));
          if (r.ok) {
            const v = r.value;
            return { status: 'committed', conflicts, receipt: { txId: v.txId, position: v.position, instant: v.instant, assertionIds: v.triples.map(t => t.id), triples: v.triples } };
          }
          const c = classify(r.error);
          if (c.status === 'retry' && conflicts < 200) { conflicts++; continue; }
          return { ...c, conflicts };
        }
      } finally { release(); }
    },
    writerConcurrency,
    /** Subject pull: the subject's entities at one basis (TemporalBasis: recordedAt, validAt). */
    async pull(entityIds, basis) {
      const r = await settle(triples.entities(entityIds, basis));
      return r.ok ? { ok: true, rows: r.value.flat() } : { ok: false, error: classify(r.error) };
    },
    async feed(after, limit = 1000) {
      const r = await settle(triples.transactions({ after, limit }));
      return r.ok ? { ok: true, ...r.value } : { ok: false, error: classify(r.error) };
    },
    async byCommand(commandId) {
      const r = await settle(triples.transactionByCommand(commandId));
      return r.ok ? { ok: true, record: r.value } : { ok: false, error: classify(r.error) };
    },
    async currentPosition() { return run(triples.currentPosition()); },
    /** Restart the Triplex runtime (client process restart); in-flight calls fail and must be resolved. */
    async restart() {
      const old = rt; const fire = arm.fire; arm(); fire();
      await Promise.race([old.dispose().catch(() => {}), new Promise(r => setTimeout(r, 10_000))]);
      await open();
    },
    async close() { await rt.dispose(); },
  };
}

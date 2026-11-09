// @ts-nocheck -- [EXP-CHECKJS-R2] unannotated local values; unannotated dynamic parameters; unannotated destructured parameters; initially empty collections. Binding errors remain checked by lab/bin/checkjs.mjs.
// [EXP-W01b] Why: a failed comparison is not proof of an engine defect. Rejected: relabeling
// timeouts as PASS or blaming every WriteError on overload without a timeout in its evidence.
export function failureKind(value) {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  if (/no (assertion )?id for (precondition )?ref|predecessor-not-committed|blocked-by-uncommitted/.test(text)) return 'harness-blocked-predecessor';
  if (/ManagedRuntime disposed|All fibers interrupted|RuntimeRestarted/.test(text)) return 'harness-runtime-restart';
  if (/deadline|timeout|timed out|cannot acquire.*source cut/i.test(text)) return 'engine-timeout';
  if (/ReadError|WriteError|XTDB read failed|Cannot read retraction target/.test(text)) return 'engine-io-unresolved';
  if (/harnessError/.test(text)) return 'harness-error';
  return 'comparison-failure';
}

export function diagnostics({ attempts = [], readFailures = [], feedErrors = [], failedChecks = [], failedBars = [] }) {
  const observations = [];
  const add = (source, evidence) => observations.push({ source, kind: failureKind(evidence), evidence });
  for (const a of attempts) {
    if (a.unknown) add(`command:${a.index}:initial`, a.unknown);
    if (a.status !== 'committed' && (a.status !== 'rejected' || a.category === 'write-error'))
      add(`command:${a.index}:terminal`, { status: a.status, category: a.category, tag: a.tag, message: a.message, causes: a.causes });
  }
  readFailures.forEach((r, i) => add(`read:${i}`, r));
  feedErrors.forEach((e, i) => add(`feed:${i}`, e));
  failedChecks.forEach(c => add(`check:${c.id}`, c.detail));
  return {
    format: 'tx2-gs-diagnostics/1',
    note: 'Observed symptoms only; generic I/O failures do not establish overload or a semantic defect. Verdicts are unchanged.',
    counts: Object.fromEntries([...new Set(observations.map(o => o.kind))].map(k => [k, observations.filter(o => o.kind === k).length])),
    observations, missedBars: failedBars.map(b => b.id ?? b.metric),
  };
}

// Pure receipt logic shared by gate.mjs, scorecard.mjs and status.mjs, unit-tested in lab/bin/test (EXP-000).
import { createHash } from 'node:crypto';
import fs from 'node:fs';

// ACCEPTANCE.md section 3 lists acceptance, calibration, diagnostic, mutation, verifier; the
// orchestrator's EXP-000 addition lists calibration, candidate, control, verifier, mutation, smoke.
// The union is accepted; only `acceptance` can close an obligation (V12).
export const RUN_KINDS = ['acceptance', 'calibration', 'candidate', 'control', 'diagnostic', 'mutation', 'smoke', 'verifier'];

/** Per-case language record: every native read substep in order, plus the answer-query set. */
export function caseLanguages(trace) {
  const queries = (trace ?? []).filter(item => item && item.operation === 'public-native-query');
  const languages = [];
  for (const q of queries) {
    const steps = q.steps ?? [];
    if (steps.length) for (const s of steps) languages.push(s.language ?? 'UNRECORDED');
    else languages.push(q.language ?? 'UNRECORDED');
  }
  const k = classifyLanguages(trace);
  return { languages, answerLanguages: k.answerLanguages, languageClass: { answer: k.answer, strict: k.strict } };
}

/** Obligations a gate run claims, with the contract's definition hashes (V14). */
export const GATE_OBLIGATIONS = { G1: 'G1.found.unchanged44', G2: 'PKT.full142' };
export function contractClaims({ gate, lane, scope, contractFile }) {
  if (!fs.existsSync(contractFile)) return { contract: null, obligations: [], reasons: gate === 'G0' ? [] : ['acceptance contract lab/acceptance/obligations.json is missing'] };
  const bytes = fs.readFileSync(contractFile);
  const doc = JSON.parse(bytes);
  const contract = { format: doc.format, version: doc.version, status: doc.status, sha256: createHash('sha256').update(bytes).digest('hex') };
  const id = GATE_OBLIGATIONS[gate];
  if (!id || scope !== 'full') return { contract, obligations: [], reasons: [] };
  const o = doc.obligations.find(item => item.id === id);
  if (!o) return { contract, obligations: [], reasons: [`obligation ${id} not in contract ${doc.version}`] };
  const lanes = o.lanes.filter(l => doc.engineOfLane[l] === lane);
  return { contract, obligations: [{ id, definitionSha256: o.definitionSha256, receiptScope: o.receiptScope, lanes }], reasons: [] };
}

/**
 * Per-execution query-language classification from native traces (unit-tested).
 * answer: languages of the task's own native queries (trace entries' top-level `language`).
 * strict: also every substep (source-cut position lookups, reachability working relations).
 */
export function classifyLanguages(trace) {
  const queries = (trace ?? []).filter(item => item && item.operation === 'public-native-query');
  const answer = new Set(queries.map(q => q.language).filter(Boolean));
  const strict = new Set(answer);
  for (const q of queries) for (const s of q.steps ?? []) if (s.language) strict.add(s.language);
  const label = set => set.size === 0 ? 'none' : set.size > 1 ? 'hybrid' : [...set][0];
  return { answer: label(answer), strict: label(strict), queries: queries.length, answerLanguages: [...answer].sort(), strictLanguages: [...strict].sort() };
}

export function tallyLanguages(cases) {
  const tally = { answer: {}, strict: {}, passByAnswer: {} };
  for (const c of cases) {
    const k = classifyLanguages(c.queryTrace);
    tally.answer[k.answer] = (tally.answer[k.answer] ?? 0) + 1;
    tally.strict[k.strict] = (tally.strict[k.strict] ?? 0) + 1;
    if (c.status === 'PASS') tally.passByAnswer[k.answer] = (tally.passByAnswer[k.answer] ?? 0) + 1;
  }
  return tally;
}

const REQUIRED = {
  common: ['contractVersion', 'runKind', 'git.head', 'git.headTree', 'git.branch', 'git.sourceTreeId', 'git.diffSha256', 'lockfileSha256', 'toolchain.node', 'toolchain.pnpm', 'build.manifestSha256', 'gateScripts', 'counts'],
  G0: ['packet.sha256'],
  G1: ['engine.imageId', 'engine.configSha256', 'engine.endpoint', 'contactedEndpoint'],
  G2: ['engine.imageId', 'engine.configSha256', 'engine.endpoint', 'contactedEndpoint', 'packet.sha256'],
  G4: ['engine.imageId', 'engine.configSha256', 'engine.endpoint', 'contactedEndpoint'],
  // [EXP-N01] NS binds the generator source hash and seed (TARGETS 2.1 item 5) and the composition identity (4.1).
  NS: ['engine.imageId', 'engine.configSha256', 'engine.endpoint', 'contactedEndpoint', 'ns.generator.traceSha256', 'ns.trace.digest', 'ns.trace.seed', 'compositionIdentity.assignments.source.imageId', 'oracle.commit'],
  // [EXP-M01] PAIR (R22 section 6.2): both arms' identity and effective cgroup values, the round plan and noise rules
  // by hash, the A/A noise, exclusions, calibration reference, window grade, both quantile ratios, and the analysis
  // input (histograms and round signals) a reader needs to recompute every number (`lab/bench/duet.ts recompute`).
  // stats.p50 / stats.p99 and noise.aa are objects whose numbers may be null with a `why` (censored, too few rounds):
  // "not estimable" is a measurement outcome, not a missing field.
  // Q67g: the workload is bound once; each arm is its system plus its placement. Q67f: every evidence item is retained
  // with its sha256, and the gate's own checks (rounds a registered look, accounting) are in the receipt to be re-run.
  PAIR: ['pair.mode', 'pair.rounds', 'pair.series', 'pair.planSha256', 'pair.noiseConfigSha256',
    'pair.workload.trace.digest', 'pair.workload.trace.seed', 'pair.workload.trace.generatorSha256', 'pair.workload.schedule', 'pair.workload.offered',
    ...['A', 'B'].flatMap(arm => [...['imageId', 'configSha256'].map(f => `system.${f}`), ...['slot', 'containerId', 'regime', 'cpuset', 'cpuMax', 'cpuWeight', 'memCapBytes', 'cores'].map(f => `placement.${f}`), 'contactedEndpoint'].map(f => `pair.arms.${arm}.${f}`)),
    ...['analysis', 'rounds', 'histograms', 'signals', 'calibration', 'accounting', 'placement', 'noiseConfig'].flatMap(k => [`pair.evidence.${k}.sha256`, `pair.evidence.${k}.json`]),
    'noise.aa', 'noise.exclusions', 'noise.calibration.ref', 'noise.windowGrade.grade', 'stats.p50', 'stats.p99', 'checks.rounds', 'checks.accounting'],
};
const cpuSet = text => {
  const out = new Set();
  for (const part of String(text ?? '').split(',').map(x => x.trim()).filter(Boolean)) { const [a, b] = part.split('-').map(Number); for (let c = a; c <= (b ?? a); c++) out.add(c); }
  return out;
};
/**
 * RULINGS Q67g: the arms of a duet share one workload and differ only in placement. Placement must have equal
 * capacity (memory cap and cores), the same regime, per-arm slots, and in the cpuset regime disjoint cpusets of equal
 * size with no CFS quota. `cores` is the per-core denominator: the cpuset size under cpusets, the quota otherwise.
 */
export function placementProblems(A, B) {
  if (!A || !B) return ['placement missing for an arm'];
  const problems = [];
  if (!A.slot || !B.slot) problems.push('an arm has no slot');
  else if (A.slot === B.slot) problems.push(`both arms on slot ${A.slot}`);
  if (A.regime !== B.regime) problems.push(`regimes differ (${A.regime} vs ${B.regime})`);
  if (A.memCapBytes !== B.memCapBytes) problems.push(`memory caps differ (${A.memCapBytes} vs ${B.memCapBytes})`);
  if (!(A.cores > 0) || A.cores !== B.cores) problems.push(`capacity differs or is unknown (${A.cores} vs ${B.cores} cores)`);
  if (A.regime === 'cpuset' && B.regime === 'cpuset') {
    const a = cpuSet(A.cpuset), b = cpuSet(B.cpuset);
    if ([...a].some(c => b.has(c))) problems.push(`cpusets ${A.cpuset} and ${B.cpuset} overlap`);
    if (a.size !== A.cores || b.size !== B.cores) problems.push(`cpuset sizes ${a.size}/${b.size} differ from cores ${A.cores}/${B.cores}`);
    for (const [arm, x] of [['A', A], ['B', B]]) if (!String(x.cpuMax ?? '').startsWith('max')) problems.push(`arm ${arm} has a CFS quota (cpu.max ${x.cpuMax}) in the cpuset regime`);
  } else if (A.regime !== 'cpuset' || B.regime !== 'cpuset') problems.push(`arms are in the ${A.regime}/${B.regime} regime, not cpuset (Q60c)`);
  return problems;
}
/** RULINGS Q67f: a paired run's round count must be a registered look. */
export const PAIR_LOOKS = [8, 12, 18, 24];
/** Mirrors lab/bench/lib/paired.ts DECISIVE (checked by lab/bin/test). */
export const PAIR_DECISIVE = ['FASTER_BY_TARGET', 'FASTER', 'SLOWER', 'EQUIVALENT_WITHIN_TARGET', 'HOLDS_WITHIN_MARGIN'];
/**
 * PAIR verdict for a run whose identity and correctness already passed (R22 section 7; Q60a, Q60e):
 * INVALID when the run departed from the protocol (development overrides, a non-cpuset regime, no lease);
 * INVALID_NOISE when the window is RED or more than a third of its rounds were excluded by pre-registered rules;
 * PAIRED_DECIDED when the primary claim reached a decisive verdict; PAIRED_INCONCLUSIVE otherwise.
 */
export function pairVerdictOf({ grade, decision, departures = [] }) {
  if (departures.length) return { verdict: 'INVALID', reasons: departures };
  if (grade === 'RED' || grade === 'INVALID') return { verdict: 'INVALID_NOISE', reasons: [`window ${grade}`] };
  if (PAIR_DECISIVE.includes(decision)) return { verdict: 'PAIRED_DECIDED', reasons: [] };
  return { verdict: 'PAIRED_INCONCLUSIVE', reasons: [`primary decision ${decision}${grade === 'UNGRADED' ? ' (window ungraded)' : ''}`] };
}
const pick = (object, key) => key.split('.').reduce((value, part) => value?.[part], object);

export function verdictOf(receipt) {
  const missing = [...REQUIRED.common, ...(REQUIRED[receipt.gate] ?? [])].filter(key => {
    const value = pick(receipt, key);
    return value === undefined || value === null || value === '';
  });
  const reasons = [...receipt.reasons, ...missing.map(key => `missing identity field ${key}`)];
  if (!(receipt.counts?.executed > 0) && !reasons.includes('zero executed cases')) reasons.push('zero executed cases');
  if ((receipt.counts?.skip ?? 0) > 0 && receipt.gate !== 'G0') reasons.push(`${receipt.counts.skip} skipped executions`);
  if (reasons.length) return { verdict: 'FAIL', reasons };
  if (receipt.scope !== 'full') return { verdict: 'PASS_SUBSET', reasons };
  return { verdict: 'PASS', reasons };
}


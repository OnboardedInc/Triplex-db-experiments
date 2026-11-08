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
};
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


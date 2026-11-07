// Pure receipt logic shared by gate.mjs and scorecard.mjs, unit-tested in lab/bin/test (EXP-000).

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
  common: ['git.head', 'git.headTree', 'git.branch', 'git.sourceTreeId', 'git.diffSha256', 'lockfileSha256', 'toolchain.node', 'toolchain.pnpm', 'build.manifestSha256', 'gateScripts', 'counts'],
  G0: ['packet.sha256'],
  G1: ['engine.imageId', 'engine.configSha256', 'engine.endpoint', 'contactedEndpoint'],
  G2: ['engine.imageId', 'engine.configSha256', 'engine.endpoint', 'contactedEndpoint', 'packet.sha256'],
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


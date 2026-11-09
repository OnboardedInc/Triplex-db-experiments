// @ts-nocheck -- [EXP-CHECKJS-R2] dynamic collections, runtime Buffer-to-JSON coercion, or validated values without static narrowing. Binding errors remain checked by lab/bin/checkjs.mjs.
// [EXP-W02] Why: an exact inventory preserves every contract case, including blocked schedules.
// Rejected: dropping unsupported cases from the denominator or hand-editing the contract pin.
import fs from 'node:fs';
import path from 'node:path';
import { REPO } from '../lib/triplex.mjs';
export function caseManifest() {
  const contract = JSON.parse(fs.readFileSync(path.join(REPO, 'lab/acceptance/obligations.json')));
  const find = obj => {
    if (!obj || typeof obj !== 'object') return null;
    if (obj['CS-GS']?.requiredCases) return obj['CS-GS'];
    for (const v of Object.values(obj)) { const x = find(v); if (x) return x; }
    return null;
  };
  const set = find(contract);
  if (!set) throw Error('contract has no CS-GS');
  const cases = set.requiredTags.map(id => {
    const n = Number(id.slice(-2));
    const dir = fs.readdirSync(path.join(REPO, 'lab/scenarios')).find(d => d.startsWith(`${String(n).padStart(2, '0')}-`));
    const spec = JSON.parse(fs.readFileSync(path.join(REPO, 'lab/scenarios', dir, 'scenario.json')));
    return { id, scenario: n, kind: 'scenario', story: spec.story, checked: spec.checked,
      domainClaims: spec.domain ?? [], generator: 'lab/scenarios/v2/generate.ts#generateScenario',
      requiredEvidence: ['fresh-G0', 'start-and-end-counts', 'full-burst', 'maintenance', 'case-result', 'positive-witness', 'negative-witness'] };
  });
  const schedules = {
    'GS-NUM-RANGE-1650': 'payRateCents 1649,1650,1651 against independently derived wage floor',
    'GS-NUM-HOURS-40': 'weeklyMinutes 2399,2400,2401; overtime only above 2400',
    'GS-NUM-UNHOLDABLE': 'typed rejection of 2^63; lane-Q inline bounds separately',
    'GS-10-11-COMMON-BASIS': 'preview and activation same ordered subject list, recordedPosition and validAt',
    'GS-03-SUPERSEDED-REVISION': 'older revision acknowledged superseded, journaled, current unchanged; W0-1.2 signal-ack required',
    'GS-04B-INDEX-PARTITION': '60s outage; conditional on separate current store; <=10ms wait, fallback share and catch-up measured',
    'GS-06B-SHARED-REFERENCE': 'exact O-DOMAIN affected set across placement -> location -> jurisdiction',
    'GS-15-STORAGE-ACCESS': 'tenant-A direct read of tenant-B storage fails at storage layer',
    'GS-15-SLOW-TENANT': 'one consumer slowed 10x; other tenants hold lag and p99 bars',
    'GS-19B-OUTBOX-CRASH': 'product atomic outbox crash after delivery before completion; exactly one visible effect per delivery key',
  };
  for (const id of set.requiredCases) {
    if (id.includes('-WITNESS-')) {
      const polarity = id.endsWith('POS') ? 'positive' : 'negative';
      cases.push({ id, scenario: Number(id.split('-')[1]), kind: 'witness', polarity,
        selector: `generateScenario(spec,N).witnesses.${polarity}`,
        expected: 'independent state/domain comparison at named bases; background accounted separately' });
    } else {
      if (!schedules[id]) throw Error(`missing schedule definition: ${id}`);
      cases.push({ id, kind: 'required-schedule', expected: schedules[id] });
    }
  }
  return { format: 'tx2-cases/1', id: 'CS-GS', version: 'W02/1', status: 'AUTHORED-NOT-PINNED', lanes: ['xtdb', 'qlever', 'datomic'],
    source: 'lab/TARGETS.md 6,6.1; Q94b-i; R37 sections 1-4',
    cases: cases.map(c => ({ ...c, status: 'AUTHORED-OFFLINE-EXECUTABLE',
      execution: { entry: 'lab/scenarios/v2/case-driver.ts', argv: ['--case', c.id, '--lane', '{lane}', '--output', '{output}'] },
      fixture: { format: 'W02-offline-fixture/2', source: 'authored W0 fixture; not the population or a load measurement',
        validAt: 1793793600000, positiveSubject: 'pl:p', negativeSubject: 'pl:n',
        initialFacts: ['p', 'n'].flatMap(s => {
          const S = 'pl:' + s, L = s === 'p' ? 'loc:a' : 'loc:b', J = s === 'p' ? 'jur:a' : 'jur:b';
          return [[S, 'startDate', '2026-11-02'], [S, 'location', L], [S, 'payRateCents', 1650], [S, 'weeklyMinutes', 2400], [S, 'bgcStatus', 'consider'], [L, 'jurisdiction', J], [J, 'stateMinWageCents', 1500]].map(([e, a, v]) => ({ e, a, v }));
        }),
        parameters: { wageFloor: 1650, wageSamples: [1649, 1650, 1651], minutesSamples: [2399, 2400, 2401], invalidInt64: '9223372036854775808', slowConsumerEveryTicks: 10, crash: 'after-effect-before-checkpoint' },
      },
      expectedObservation: c.kind === 'witness' ? { subject: c.polarity === 'positive' ? 'pl:p' : 'pl:n', polarity: c.polarity, oracle: 'O-REPLAY plus scenario-specific O-DOMAIN or fault schedule', liveQualification: false } : { oracle: 'O-REPLAY plus O-DOMAIN where applicable', liveQualification: false },
    })),
    note: 'All 70 members have offline authored fixtures and a case-driver entry. Explicit BLOCKED cases remain in the denominator. Q94a, contract 0.4.0, independent pinning and live engine/fault/expected-load qualification remain open.' };
}
export const manifestBytes = () => JSON.stringify(caseManifest(), null, 2) + '\n';
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const file = path.join(REPO, 'lab/acceptance/cases/CS-GS.json');
  const bytes = manifestBytes();
  if (process.argv.includes('--check')) {
    if (fs.readFileSync(file, 'utf8') !== bytes) throw Error('CS-GS manifest differs');
    console.log('CS-GS byte-identical');
  } else fs.writeFileSync(file, bytes);
}

// [EXP-W02] Why: bind deterministic streams and independent domain bytes before a live freeze.
// Rejected: labeling offline kernel agreement as live database or product-fault qualification.
import fs from 'node:fs';
import path from 'node:path';
import { W0, canonical, V_W0, many } from '../../bench/lib/w0-world.ts';
import { generateScenario, hash } from './generate.ts';
// @ts-ignore -- the GS adapter is ESM JavaScript.
import { runDomain } from '../lib/domain.mjs';
const root = new URL('../../../', import.meta.url);
export function specs(): any[] {
  const dir = new URL('../../scenarios/', import.meta.url);
  return fs.readdirSync(dir).filter(d => /^\d\d-/.test(d)).sort().map(d => JSON.parse(fs.readFileSync(new URL(d + '/scenario.json', dir), 'utf8')));
}
export function applyWorld(world: W0.World, events: readonly any[], seedTx: number) {
  let facts = world.facts.map(f => ({ ...f }));
  let tx = seedTx;
  const seen = new Set<string>();
  for (const ev of events) {
    if (seen.has(ev.id) || !ev.rows.length) continue;
    seen.add(ev.id); tx++;
    if (ev.validFrom > V_W0 + 240_000) continue;
    for (const [e, a, v] of ev.rows) {
      // Shared reference facts in this world's closure are updated even when the event subject differs.
      if (e !== world.subject && !e.startsWith(world.subject + '/') && !facts.some(f => f.e === e)) continue;
      if (!many.has(a)) facts = facts.filter(f => f.e !== e || f.a !== a);
      if (many.has(a) && facts.some(f => f.e === e && f.a === a && f.v === v)) continue;
      facts.push({ e, a, v, tx });
    }
  }
  return { world: { subject: world.subject, facts }, tx };
}
export function expectation(spec: any, N: number, population: Map<string, W0.World>, seedTx: number) {
  const gen = generateScenario(spec, N);
  const witnesses: any[] = [];
  for (const polarity of ['positive', 'negative'] as const) {
    const subject = gen.witnesses[polarity][0];
    const world = population.get(subject);
    if (!world) throw Error('missing population witness: ' + subject);
    const final = applyWorld(world, gen.events, seedTx);
    for (const [phase, W, tx] of [['initial', world, seedTx], ['final', final.world, final.tx]] as const) {
      const input = { activations: [{ from: W0.POPULATION_VALID_TIME, release: W0.R1.hash, tx: 1 }],
        basis: { tx, validTime: phase === 'initial' ? W0.POPULATION_VALID_TIME : '2026-11-04T12:04:00.000000Z' }, world: W };
      const bytes = canonical(input);
      const oracle = runDomain('reconcile', bytes);
      const observed = W0.runOpBytes('reconcile', Buffer.from(bytes));
      if (observed !== oracle.outputBytes) throw Error(`GS.${spec.id} ${polarity}/${phase}: kernel differs from O-DOMAIN`);
      witnesses.push({ polarity, phase, subject, inputSha256: hash(bytes), outputBytes: oracle.outputBytes,
        outputSha256: oracle.outputSha256, oracleIdentity: oracle.identity });
    }
  }
  return { scenario: spec.id, rung: N, generator: gen.version, seed: gen.seed, sourceSha256: gen.sourceSha256,
    streamSha256: gen.streamSha256, durationS: gen.durationS, background: gen.background, overlay: gen.overlay,
    probes: gen.probes, witnessSubjects: gen.witnesses, witnesses,
    status: 'OFFLINE-ONLY', missing: ['live O-REPLAY state comparison', 'product/fault case witnesses', 'maintenance observation', 'live gates'] };
}
export function populationWitnesses(N: number) {
  const R = W0.rung(N), basis = W0.populationBasis(R), map = new Map<string, W0.World>();
  for (const p of W0.population(R)) if (p.plan.i === 0 || p.plan.i === N - 1) map.set(p.world.subject, p.world);
  return { map, seedTx: basis.tx };
}
async function main() {
  const args = process.argv.slice(2), check = args.includes('--check');
  const index = args.indexOf('--N'), N = index < 0 ? 500 : Number(args[index + 1]);
  const { map, seedTx } = populationWitnesses(N);
  const results = specs().map(s => expectation(s, N, map, seedTx));
  const bytes = JSON.stringify({ format: 'tx2-gs-v2-offline/1', N, results }, null, 1) + '\n';
  const file = new URL(`expected-${N}.json`, import.meta.url);
  if (check) { if (fs.readFileSync(file, 'utf8') !== bytes) throw Error('GS v2 golden differs'); }
  else fs.writeFileSync(file, bytes);
  console.log(JSON.stringify({ status: check ? 'BYTE-IDENTICAL' : 'GENERATED', scenarios: results.length, witnessEvaluations: results.reduce((n, r) => n + r.witnesses.length, 0), sha256: hash(bytes), file: path.relative(root.pathname, file.pathname) }));
}
if (process.argv[1] === new URL(import.meta.url).pathname) await main();

#!/usr/bin/env node
// node lab/scenarios/expect.mjs [--scenarios all|2,3] [--rungs 10k[,smoke]] [--world] [--check]
//
// Writes the golden expectations: lab/scenarios/<NN-slug>/expected-<rung>.json per scenario and
// lab/scenarios/world/expected-<rung>.json for the rung's background world. Every digest comes from
// O-REPLAY (lab/oracles/replay) fed with the generated stream; hand-derived expectations (where O-REPLAY has
// no rule) come from the scenario's generate() with a citation. --check regenerates in memory and fails if
// any committed byte differs (TARGETS section 6 rule 1: same seed, same bytes).
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { BT, GEN_VERSION, RUNGS, sha256, worldSid } from './lib/gen.mjs';
import { ORACLE_FILES, goldenStates } from './lib/oracle.mjs';
import { resolveParams, streamBytes, worldBatchId, worldBatches } from './lib/runner.mjs';
import { REPO } from './lib/triplex.mjs';

const SCEN = path.join(REPO, 'lab/scenarios');
export const WORLD = JSON.parse(fs.readFileSync(path.join(SCEN, 'world/world.json'), 'utf8'));

export function scenarioDirs() {
  return fs.readdirSync(SCEN).filter(d => /^\d\d-/.test(d)).sort().map(d => path.join(SCEN, d));
}
export async function loadScenario(dir) {
  const spec = JSON.parse(fs.readFileSync(path.join(dir, 'scenario.json'), 'utf8'));
  const hooks = await import(path.join(dir, 'run.mjs'));
  return { dir, spec, hooks };
}
// The oracle identity bound into every golden: version, the last commit that touched lab/oracles/replay, the
// branch it came from, and every source file's sha256, so regenerating against a pinned oracle is mechanical.
export const ORACLE_SOURCE_BRANCH = 'exp/O02-oracle-conformance';
const oracleIdentity = () => ({
  id: 'O-REPLAY',
  version: (/ORACLE_VERSION = "([^"]+)"/.exec(fs.readFileSync(path.join(REPO, 'lab/oracles/replay/run.py'), 'utf8')) ?? [])[1] ?? null,
  commit: execFileSync('git', ['-C', REPO, 'log', '-1', '--format=%H', '--', 'lab/oracles/replay'], { encoding: 'utf8' }).trim(),
  sourceBranch: ORACLE_SOURCE_BRANCH,
  files: Object.fromEntries(ORACLE_FILES.map(f => [f, sha256(fs.readFileSync(path.join(REPO, f)))])),
});

export async function scenarioExpected({ spec, hooks }, rung, workDir) {
  const params = resolveParams(spec, rung);
  const gen = hooks.generate(spec, params);
  const commands = gen.stream.commands;
  const golden = await goldenStates({ caseIdPrefix: `GS/${spec.id}/${rung}`, commands, subjects: gen.digestSubjects, validAts: gen.validAts ?? [BT.NOW], workDir });
  return {
    format: 'tx2-gs-expected/1', scenario: spec.id, slug: spec.slug, rung, seed: spec.seed, genVersion: GEN_VERSION,
    streamSha256: sha256(streamBytes(commands)), commands: commands.length,
    setupCommands: commands.filter(c => c.tags?.phase === 'setup').length,
    facts: commands.reduce((s, c) => s + c.operations.filter(o => o.op === 'assert').length, 0),
    oracle: oracleIdentity(), oracleCases: golden.cases, validAts: gen.validAts ?? [BT.NOW],
    digestSubjects: gen.digestSubjects.length, noDigestSubjects: gen.noDigestSubjects ?? [],
    outcomes: golden.outcomes, hand: gen.hand ?? null, gaps: spec.oracle?.gaps ?? [], digests: golden.digests,
  };
}

export async function worldExpected(rung, workDir) {
  const size = RUNGS[rung] ?? WORLD.rungs[rung];
  const batches = worldBatches(WORLD.seed, size);
  const commands = batches.map(b => ({ index: b.k, subject: null, meta: { actor: 'bulk:hris', commandId: worldBatchId(rung, WORLD.seed, b.k) },
    operations: b.operations.map((op, k) => ({ ...op, ref: `w:${b.k}:${k}` })), tags: { phase: 'world' } }));
  const subjects = Array.from({ length: Math.min(size, WORLD.goldenSubjects) }, (_, n) => worldSid(n));
  const golden = await goldenStates({ caseIdPrefix: `GS/world/${rung}`, commands, subjects, validAts: [BT.NOW], workDir, chunkSize: 50 });
  // World subjects are read after the preload, so their "base" is the state after their batch.
  const digests = Object.fromEntries(Object.entries(golden.digests).map(([sid, d]) => [sid, { base: Object.values(d.after)[0] }]));
  return { format: 'tx2-gs-world-expected/1', rung, seed: WORLD.seed, size, genVersion: GEN_VERSION, batches: batches.length, goldenSubjects: subjects.length,
    oracle: oracleIdentity(), oracleCaseCount: golden.cases.length, oracleCasesSha256: sha256(JSON.stringify(golden.cases)), outcomes: golden.outcomes, digests };
}

const bytesOf = obj => JSON.stringify(obj, null, 1) + '\n';

async function cli() {
  const args = process.argv.slice(2);
  const opt = name => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
  const check = args.includes('--check');
  const rungs = (opt('--rungs') ?? '10k').split(',');
  const which = opt('--scenarios') ?? 'all';
  const workDir = path.join(REPO, 'runs/gs-expect');
  let failures = 0;
  const emit = (file, obj) => {
    const bytes = bytesOf(obj);
    if (check) {
      const same = fs.existsSync(file) && fs.readFileSync(file, 'utf8') === bytes;
      console.log(`${same ? 'SAME' : 'DIFF'} ${path.relative(REPO, file)} sha256=${sha256(bytes).slice(0, 16)}`);
      if (!same) failures++;
    } else { fs.writeFileSync(file, bytes); console.log(`wrote ${path.relative(REPO, file)} sha256=${sha256(bytes).slice(0, 16)} (${bytes.length} bytes)`); }
  };
  if (args.includes('--world')) for (const rung of rungs) emit(path.join(SCEN, `world/expected-${rung}.json`), await worldExpected(rung, path.join(workDir, 'world')));
  if (which !== 'none') {
    for (const dir of scenarioDirs()) {
      const s = await loadScenario(dir);
      if (which !== 'all' && !which.split(',').map(Number).includes(s.spec.id)) continue;
      for (const rung of rungs) {
        if (!s.spec.rungs?.[rung]) continue;
        const t = performance.now();
        const e = await scenarioExpected(s, rung, path.join(workDir, String(s.spec.id)));
        emit(path.join(dir, `expected-${rung}.json`), e);
        console.log(`  scenario ${s.spec.id} ${rung}: ${e.commands} commands, ${e.facts} facts, ${e.oracleCases.length} O-REPLAY cases (${e.oracleCases.filter(c => c.verdict !== 'EXPECTED-ONLY').length} not EXPECTED-ONLY), ${Object.keys(e.outcomes).length} expected rejections, ${Math.round(performance.now() - t)} ms`);
      }
    }
  }
  if (failures) { console.error(`${failures} golden files differ`); process.exitCode = 1; }
}

if (import.meta.url === `file://${process.argv[1]}`) await cli();

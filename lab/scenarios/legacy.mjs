#!/usr/bin/env node
// node lab/scenarios/run.mjs --lane xtdb|qlever --rung 10k|smoke --scenarios 2,3|all --output runs/.../gs-report.json
//   [--raw-dir DIR] [--readers 16] [--run-tag TAG] [--fresh-world] [--sweep-cap N] [--drain-timeout-ms N]
//
// The GS entry the gate (`lab/bin/gate.mjs GS`) runs. Opens one Triplex composition on the rung's world scope,
// loads the world idempotently through the bulk lane, then runs each selected scenario in turn and writes
// one report. The engine endpoint comes from XTDB_URL / QLEVER_URL and the held slot (TRIPLEX_LAB_SLOT_OWNER).
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { GS_LANES, brokerEnv } from './lib/policy.mjs';
import { RUNGS } from './lib/gen.mjs';
import { openComposition } from './lib/composition.mjs';
import { ensureWorld, runScenario, worldScopeName } from './lib/runner.mjs';
import { REPO } from './lib/triplex.mjs';
import { WORLD, loadScenario, scenarioDirs } from './expect.mjs';
import { diagnostics } from './lib/diagnostics.mjs';

const args = process.argv.slice(2);
const opt = (name, fallback) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback);
const lane = opt('--lane');
const rung = opt('--rung', '10k');
const output = path.resolve(opt('--output', ''));
if (!GS_LANES.includes(lane)) throw new Error('--lane xtdb|qlever|datomic is required');
if (!output.startsWith(path.join(REPO, 'runs') + path.sep)) throw new Error('--output must be under runs/');
const rawDir = path.resolve(opt('--raw-dir', path.dirname(output)));
const runTag = opt('--run-tag', 'gs') + '-' + randomBytes(8).toString('hex');
Object.assign(process.env, brokerEnv(lane, opt('--broker-dir'), path.join(REPO, 'runs')));
const readers = Number(opt('--readers', '16'));
const which = opt('--scenarios', 'all');
const size = RUNGS[rung];
const log = line => process.stderr.write(`[gs ${lane} ${new Date().toISOString().slice(11, 19)}] ${line}\n`);

const ownerFile = process.env.TRIPLEX_LAB_SLOT_OWNER;
const owner = ownerFile ? JSON.parse(fs.readFileSync(ownerFile, 'utf8')) : null;
const report = {
  format: 'tx2-gs-run/1', generator: 'W01-RETIRED', classification: 'DIAGNOSTIC', lane, rung, worldSize: size, runTag, readers, startedAt: new Date().toISOString(),
  slotOwner: owner ? { lane: owner.lane, slot: owner.slot, mode: owner.mode, endpoint: owner.endpoint, holder: owner.holder } : null,
  profile: { readers, readersTarget: 256, slotMode: owner?.mode ?? null, reduced: readers < 256 || owner?.mode !== 'exclusive' },
  qlever: lane === 'qlever' ? { commitPath: process.env.QLEVER_COMMIT_PATH, brokerDirectory: process.env.QLEVER_BROKER_DIR, baseTriples: null, deltaTriples: null, touchedBlockDelta: null, rebuildThreshold: null } : null,
  world: null, scenarios: [], status: 'RUNNING',
};
fs.mkdirSync(path.dirname(output), { recursive: true });
const save = () => fs.writeFileSync(output, JSON.stringify(report, null, 1) + '\n');
save();

const worldExpected = JSON.parse(fs.readFileSync(path.join(REPO, `lab/scenarios/world/expected-${rung}.json`), 'utf8'));
const world = { digests: worldExpected.digests, sample: Object.keys(worldExpected.digests) };
const scope = worldScopeName(rung, WORLD.seed, runTag);
const comp = await openComposition({ lane, scope });
report.endpoint = comp.endpoint; report.queryPath = comp.queryPath; report.scope = scope; report.composition = comp.name;
if (owner && owner.endpoint !== comp.endpoint) throw new Error(`runtime endpoint ${comp.endpoint} differs from the held slot ${owner.endpoint}`);
try {
  report.world = { scope, ...(await ensureWorld(comp, { rung, seed: WORLD.seed, size, log })), positionAfter: await comp.currentPosition(), expectedSha256: worldExpected.oracleCasesSha256 };
  save();
  for (const dir of scenarioDirs()) {
    const s = await loadScenario(dir);
    if (which !== 'all' && !which.split(',').map(Number).includes(s.spec.id)) continue;
    if (s.spec.status !== 'runnable') { report.scenarios.push({ scenario: s.spec.id, slug: s.spec.slug, verdict: 'NOT_RUN', reason: s.spec.blockedReason ?? `status ${s.spec.status}` }); continue; }
    const expectedFile = path.join(dir, `expected-${rung}.json`);
    const expected = JSON.parse(fs.readFileSync(expectedFile, 'utf8'));
    log(`scenario ${s.spec.id} ${s.spec.slug}: start`);
    const t = performance.now();
    let result;
    try {
      result = await runScenario({ spec: s.spec, expected, hooks: s.hooks, comp, world, log,
        opts: { lane, rung, runTag, scope, readers, rawDir, sweepCap: Number(opt('--sweep-cap', 'Infinity')), sweepConcurrency: Number(opt('--sweep-concurrency', '8')), drainTimeoutMs: Number(opt('--drain-timeout-ms', String(15 * 60_000))), faults: (opt('--faults', '') || '').split(',').filter(Boolean) } });
    } catch (error) {
      const failure = { harnessError: String(error.stack ?? error).slice(0, 3000) };
      result = { scenario: s.spec.id, slug: s.spec.slug, verdict: 'FAIL', firstFailures: [failure],
        diagnostics: diagnostics({ failedChecks: [{ id: 'runner-exception', detail: failure }] }) };
    }
    result.expectedFile = path.relative(REPO, expectedFile);
    result.wallMs = Math.round(performance.now() - t);
    report.scenarios.push(result);
    save();
    log(`scenario ${s.spec.id}: ${result.verdict} in ${result.wallMs} ms; first failures: ${JSON.stringify(result.firstFailures ?? []).slice(0, 600)}`);
  }
  report.status = 'DONE';
} catch (error) {
  report.status = 'ERROR'; report.error = String(error.stack ?? error).slice(0, 4000);
} finally {
  report.endedAt = new Date().toISOString();
  save();
  await comp.close().catch(() => {});
}
console.log(JSON.stringify({ status: report.status, scenarios: report.scenarios.map(s => `${s.scenario}:${s.verdict}`), output: path.relative(REPO, output) }));

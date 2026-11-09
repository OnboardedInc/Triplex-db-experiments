import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { GS_LANES } from '../../../scenarios/lib/policy.mjs';
const root = new URL('../../../../', import.meta.url);
const source = fs.readFileSync(new URL('lab/bin/gate.mjs', root), 'utf8');
const baseline = rev => execFileSync('git', ['show', `${rev}:lab/bin/gate.mjs`], { cwd: root, encoding: 'utf8' });
const laneText = source.match(/^const gateLanes = .*;$/m)[0];
const lanes = vm.runInNewContext(`${laneText}\ngateLanes`, { GS_LANES });
test('both admission paths use the merged lane matrix', () => {
  for (const gate of ['G0','G1']) assert.deepEqual([...lanes(gate)], ['xtdb','qlever','datomic']);
  assert.deepEqual([...lanes('GS')], GS_LANES);
  for (const gate of ['G2','G4','NS','OBL']) assert.deepEqual([...lanes(gate)], ['xtdb','qlever']);
  assert.equal((source.match(/!gateLanes\(gate\)\.includes\(options\.lane\)/g) ?? []).length, 2);
});
test('cleanEnv clears both parents live, broker, admission and planner overrides', () => {
  const text = source.slice(source.indexOf('const LIVE_FLAGS'), source.indexOf('\nclass Run'));
  const env = { DATOMIC_INTEGRATION:'1', DATOMIC_URL:'bad', DATOMIC_GATEWAY_URL:'bad', XTDB_INTEGRATION:'1', QLEVER_INTEGRATION:'1', QLEVER_URL:'bad', QLEVER_COMMIT_PATH:'bad', QLEVER_BROKER_DIR:'bad', QLEVER_SOURCE_PLAN:'bad', TRIPLEX_RESOURCE_ADMISSION:'bad', KEEP:'yes' };
  const clean = vm.runInNewContext(`${text}\ncleanEnv`, { process: { env } });
  assert.deepEqual(Object.keys(clean()).sort(), ['KEEP']);
  assert.equal(clean({ DATOMIC_GATEWAY_URL:'owned' }).DATOMIC_GATEWAY_URL, 'owned');
});
test('dry-run admits Datomic G0/G1/GS without an engine, rejects unsupported routes', () => {
  for (const [gate,lane,code] of [['G0','datomic',0],['G1','datomic',0],['GS','datomic',0],['GS','xtdb',0],['GS','qlever',0],['G2','datomic',1],['NS','datomic',1],['GS','unknown',1]]) {
    const r = spawnSync(process.execPath, ['lab/bin/gate.mjs',gate,'--lane',lane,'--dry-run'], { cwd: root, encoding:'utf8', env: { ...process.env, TX2_CONFIG_DIR: fileURLToPath(root) } });
    assert.equal(r.status,code,`${gate}/${lane}: ${r.stderr}`);
    if (!code) { const x=JSON.parse(r.stdout); assert.equal(x.dryRun,true);assert.equal(x.lane,lane);assert.equal(x.gate,gate); }
  }
});
test('automatic and manual merge retain W02 GS and DA01 parent-grant bodies', () => {
  const main=baseline('9a7996e2a242690edbc86417283d8c7348950adb');
  const prior=baseline('6b8d2182d78e567cf8e385622c9a259e8892687a');
  const body=(s,start,end)=>s.slice(s.indexOf(start),s.indexOf(end,s.indexOf(start)));
  assert.equal(body(source,'async function gateGS','async function gateG4'),body(main,'async function gateGS','async function gateG4'));
  assert.equal(body(source,'  async step(','\nasync function build'),body(prior,'  async step(','\nasync function build'));
  assert.ok(source.includes('REPO, MAIN, LOCKS,'));
  assert.equal((source.match(/datomic: \{ filter:/g)??[]).length,1);
});

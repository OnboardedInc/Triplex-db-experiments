import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

// [CX-VDA00] Why: invoke the reviewed CLI with isolated locks and Docker state. Rejected: interpreting a mock as live persistence proof.
const here = import.meta.dirname;
const repo = path.resolve(here, '../../..');
const fixture = path.join(here, 'evidence/lifecycle-fixture');
fs.mkdirSync(fixture);
const tools = path.join(here, 'lifecycle-tools');
fs.mkdirSync(tools, { recursive: true });
fs.symlinkSync('../lifecycle-docker.mjs', path.join(tools, 'docker'));
fs.chmodSync(path.join(here, 'lifecycle-docker.mjs'), 0o755);
const config = JSON.parse(fs.readFileSync(path.join(repo, 'lab/config/slots.json')));
const receipt = JSON.parse(fs.readFileSync(path.join(repo, 'lab/experiments/EXP-DA00-datomic-bringup/receipts/build-5.json')));
const stateFile = path.join(fixture, 'docker.json');
const state = { imageId: config.lanes.datomic.imageId, buildInputsSha256: config.lanes.datomic.buildInputsSha256, containers: {}, volumes: {}, calls: [] };
const reservations = [];
for (const lane of ['xtdb', 'qlever']) {
  const name = `tx2-${lane}-dev`, slot = config.slots[lane].dev;
  state.containers[name] = { Config: { Image: config.lanes[lane].image, Labels: {} }, Image: config.lanes[lane].imageId,
    HostConfig: { Memory: slot.memBytes }, State: { Running: true, Status: 'running', Health: { Status: 'healthy' } } };
  reservations.push({ container: name, memBytes: slot.memBytes, diskForecastBytes: slot.diskForecastBytes, holder: 'fixture' });
}
fs.writeFileSync(stateFile, JSON.stringify(state));
const locks = path.join(fixture, 'locks');
fs.mkdirSync(locks);
const ledgerFile = path.join(locks, 'pool.json');
fs.writeFileSync(ledgerFile, JSON.stringify({ reservations }));
const env = { ...process.env, TX2_CONFIG_DIR: repo, TX2_ENGINE_DIR: path.join(fixture, 'engines'), TX2_LOCKS_DIR: locks,
  PATH: `${tools}:${process.env.PATH}`, NODE_OPTIONS: `--import=${path.join(here, 'health-fixture.mjs')}`,
  CX_VDA00_DOCKER_STATE: stateFile, CX_VDA00_GATEWAY_HASH: createHash('sha256').update(JSON.stringify(receipt.sources.gateway)).digest('hex') };
const runs = [];
const cli = (command, extra = []) => {
  const args = ['lab/bin/engine.mjs', command, '--lane', 'datomic', '--slot', 'dev', '--holder', 'CX-VDA00', ...extra];
  const result = spawnSync('node', args, { cwd: repo, env, encoding: 'utf8' });
  runs.push({ args, code: result.status, stdout: result.stdout, stderr: result.stderr });
  return result;
};
const read = () => JSON.parse(fs.readFileSync(stateFile));
assert.equal(cli('up').status, 0);
assert.equal(read().containers['tx2-datomic-dev'].HostConfig.Memory, 2.75 * 1024 ** 3);
assert.equal(JSON.parse(fs.readFileSync(ledgerFile)).reservations.reduce((n, r) => n + r.memBytes, 0), 9.25 * 1024 ** 3);
const firstRuns = read().calls.filter(a => a[0] === 'run' && a.includes('-d')).length;
assert.equal(cli('up').status, 0);
assert.equal(read().calls.filter(a => a[0] === 'run' && a.includes('-d')).length, firstRuns);
assert.equal(cli('down', ['--holder', 'unowned']).status, 3);
assert(read().containers['tx2-datomic-dev']);
assert.equal(cli('down').status, 0);
assert(!read().containers['tx2-datomic-dev']);
assert(read().volumes['tx2-datomic-dev-data']);
assert.equal(JSON.parse(fs.readFileSync(ledgerFile)).reservations.length, 2);
assert.equal(cli('up').status, 0);
assert.equal(read().volumes['tx2-datomic-dev-data'].marker, 'retained-volume-fixture');
assert(!read().calls.some(a => a[0] === 'volume' && a[1] === 'rm'));
const drift = read(); drift.overrideImageId = 'sha256:wrong'; fs.writeFileSync(stateFile, JSON.stringify(drift));
const count = read().calls.length;
assert.equal(cli('up').status, 3);
assert.equal(read().calls.length, count + 1);
fs.writeFileSync(path.join(here, 'evidence/lifecycle-cli.json'), JSON.stringify({ passed: true, live: false, runs, calls: read().calls }, null, 2) + '\n');
console.log('PASS: isolated CLI up, repeated up, ownership, retained-volume down/up, 2.75/9.25 GiB accounting, image-id refusal');

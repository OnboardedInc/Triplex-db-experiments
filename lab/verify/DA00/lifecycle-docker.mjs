#!/usr/bin/env node
import fs from 'node:fs';

// [CX-VDA00] Why: exercise lifecycle control flow without changing the shared resident. Rejected: live park/recreate during DA01.
const file = process.env.CX_VDA00_DOCKER_STATE;
if (!file) throw new Error('Fixture state required');
const state = JSON.parse(fs.readFileSync(file));
const args = process.argv.slice(2);
if (args.shift() !== '-H' || args.shift() !== 'unix:///Users/sam/.colima/triplex2/docker.sock') throw new Error('Wrong endpoint');
state.calls.push(args);
const persist = () => fs.writeFileSync(file, JSON.stringify(state, null, 2) + '\n');
const reply = value => { persist(); console.log(typeof value === 'string' ? value : JSON.stringify(value)); };
const absent = () => { persist(); process.exit(1); };
const option = key => args[args.indexOf(key) + 1];
if (args[0] === 'image' && args[1] === 'inspect') reply([{ Id: state.overrideImageId ?? state.imageId, Config: { Labels: { 'tx2.build-inputs-sha256': state.buildInputsSha256 } } }]);
else if (args[0] === 'inspect') {
  const container = state.containers[args.at(-1)];
  if (!container) absent();
  reply([container]);
} else if (args[0] === 'ps') reply(Object.keys(state.containers).filter(n => args.includes('-a') || state.containers[n].State.Running).join('\n'));
else if (args[0] === 'stats') reply('');
else if (args[0] === 'volume' && args[1] === 'inspect') {
  if (!state.volumes[args.at(-1)]) absent();
  reply([{ Name: args.at(-1) }]);
} else if (args[0] === 'volume' && args[1] === 'rm') {
  delete state.volumes[args.at(-1)]; reply(args.at(-1));
} else if (args[0] === 'run' && option('--entrypoint') === 'df') reply('Filesystem 1-blocks Used Available Capacity Mounted\nfixture 63088406528 10000000000 53088406528 16% /');
else if (args[0] === 'run' && option('--entrypoint') === 'du') reply('1024 /v');
else if (args[0] === 'run' && args.includes('-d')) {
  const name = option('--name');
  const labels = Object.fromEntries(args.flatMap((v, i) => v === '--label' ? [args[i + 1].split(/=(.*)/s).slice(0, 2)] : []));
  const volume = option('-v').split(':')[0];
  state.volumes[volume] ??= { marker: 'retained-volume-fixture' };
  state.containers[name] = { Image: args.at(-1), Config: { Image: args.at(-1), Labels: labels },
    HostConfig: { Memory: Number(option('--memory')), NanoCpus: Number(option('--cpus')) * 1e9, CpusetCpus: option('--cpuset-cpus') },
    State: { Running: true, Status: 'running', Health: { Status: 'healthy' }, StartedAt: new Date().toISOString() } };
  reply('fixture-container-id');
} else if (args[0] === 'stop') {
  state.containers[args.at(-1)].State.Running = false; reply(args.at(-1));
} else if (args[0] === 'rm') {
  delete state.containers[args.at(-1)]; reply(args.at(-1));
} else throw new Error('Unexpected Docker fixture command: ' + JSON.stringify(args));

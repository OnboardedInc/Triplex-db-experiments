// [EXP-G03] Why: candidate lifecycle must use the same atomic pool admission as engines.
// Rejected: a second ledger (concurrent starts would over-admit the VM).
import { cgroupProofScript } from './box-policy.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { REPO, admission, atomicJson, defaultHolder, docker, inspect, listTx2Containers, now, reconcile, sha256, slotInfo, readOwner, vmDisk, withPool, fail } from './lib.mjs';

export async function reserveBox(config, name, options, fn, { memory = 268435456, disk = 0 } = {}) {
  const diskStat = fs.statfsSync(REPO);
  if (diskStat.bavail * diskStat.bsize < 5 * 1024 ** 3) fail('REFUSED', 'host free disk below 5 GiB');
  await withPool(async ledger => {
    const running = listTx2Containers({ all: true });
    reconcile(ledger, running);
    if (ledger.reservations.some(r => r.container === name)) fail('REFUSED', `${name} already reserved`);
    const v = admission({ config, reservations: ledger.reservations, running, request: { container: name, memBytes: memory, diskForecastBytes: disk }, diskUsedBytes: vmDisk(config).usedBytes });
    if (!v.ok) fail('REFUSED', `box pool: ${v.reasons.join('; ')}; holders: ${v.holders.join(', ')}`);
    ledger.reservations.push({ container: name, memBytes: memory, cpus: 1, diskForecastBytes: disk, holder: defaultHolder(options), state: 'starting', pid: process.pid, reservedAt: now() });
  });
  try { return await fn(); }
  finally {
    if (!inspect(name)) await withPool(async ledger => { ledger.reservations = ledger.reservations.filter(r => r.container !== name); });
  }
}

export const boxLabels = (run, holder) => ['--label', 'tx2.managed-by=lab/bin/engine.mjs', '--label', `tx2.run=${run}`, '--label', `tx2.holder=${holder}`];
const safeId = s => typeof s === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,90}$/.test(s);
function owned(name, holder, type = 'container') {
  const doc = JSON.parse(docker([type === 'container' ? 'inspect' : type, ...(type === 'container' ? ['--type', 'container'] : ['inspect']), name]))[0];
  if (doc.Config?.Labels?.['tx2.holder'] !== holder && doc.Labels?.['tx2.holder'] !== holder) fail('REFUSED', `${name} is not held by ${holder}`);
  return doc;
}

export async function boxCommand(config, action, opts, { policy, authorityGit } = {}) {
  const holder = defaultHolder(opts), run = opts.run;
  if (!safeId(run)) fail('USAGE', 'box needs --run (safe id)');
  const prefix = `tx2-g03-${run}-`;
  const name = opts.name;
  if (name && (!safeId(name) || !name.startsWith(prefix))) fail('REFUSED', `name must begin ${prefix}`);
  const labels = boxLabels(run, holder);
  if (action === 'inventory') return Object.fromEntries([['containers', ['ps', '-a']], ['volumes', ['volume', 'ls']], ['networks', ['network', 'ls']]].map(([kind, cmd]) => [kind, docker([...cmd, '--filter', `label=tx2.holder=${holder}`, '--format', '{{json .}}'])]));
  if (action === 'image') return JSON.parse(docker(['image', 'inspect', opts.image]))[0];
  if (action === 'base') {
    docker(['pull', 'node:22.23.2-bookworm-slim']);
    return JSON.parse(docker(['image', 'inspect', 'node:22.23.2-bookworm-slim']))[0];
  }
  if (action === 'volume') return docker(['volume', 'create', ...labels, name]);
  if (action === 'remove-volume') { owned(name, holder, 'volume'); return docker(['volume', 'rm', name]); }
  if (action === 'connect') { owned(name, holder); owned(opts.network, holder, 'network'); return docker(['network', 'connect', '--alias', 'engine', opts.network, name]); }
  if (action === 'network') return docker(['network', 'create', '--internal', '--driver', 'bridge', '-o', 'com.docker.network.bridge.inhibit_ipv4=true', ...labels, name]);
  if (action === 'remove-network') { owned(name, holder, 'network'); return docker(['network', 'rm', name]); }
  if (action === 'remove') {
    const existing = inspect(name);
    let id;
    if (existing) { owned(name, holder); id = existing.Id; }
    else await withPool(async ledger => {
      const entry = ledger.reservations.find(r => r.container === name && r.holder === holder && r.cleanupFailed);
      if (!entry) fail('REFUSED', `${name} absent without an owned failed cleanup reservation`);
      id = entry.candidateId;
    });
    const image = opts['proof-image'];
    if (image && !/^sha256:[0-9a-f]{64}$/.test(image)) fail('USAGE', 'proof image must be an immutable id');
    if (image) await withPool(async ledger => {
      const entry = ledger.reservations.find(r => r.container === name && r.holder === holder);
      if (!entry || entry.memBytes < 67108864) fail('REFUSED', 'kill proof needs the candidate reservation retained');
      Object.assign(entry, { cleanupFailed: true, candidateId: id, state: 'proving-kill' });
    });
    if (existing) docker(['rm', '-f', name]);
    if (inspect(name)) fail('ISOLATION-NOT-IN-FORCE', `${name} still exists`);
    if (image) {
      const proof = `${name}-proof`;
      // [EXP-G03] Why: the removed candidate's reservation covers this smaller trusted reader until proof succeeds.
      // Rejected: releasing first (a failed proof could free capacity still consumed by survivors).
      try {
        const proofId = docker(['create', '--name', proof, ...labels, '--network', 'none', '--cgroupns', 'host', '--read-only', '--user', '10001:10001', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges=true', '--memory', '67108864', '--memory-swap', '67108864', '--cpus', '0.25', '--pids-limit', '64', '-v', '/sys/fs/cgroup:/sys/fs/cgroup:ro', image, 'sleep', 'infinity']);
        docker(['start', proof]);
        const script = cgroupProofScript(id, proofId);
        const output = docker(['exec', proof, 'node', '-e', script]);
        if (output !== 'gone') fail('ISOLATION-NOT-IN-FORCE', 'cgroup kill proof failed');
      } finally { if (inspect(proof)) docker(['rm', '-f', proof]); }
    }
    await withPool(async ledger => { ledger.reservations = ledger.reservations.filter(r => r.container !== name); });
    return { removed: name, id, cgroupGone: Boolean(image) };
  }
  if (action === 'create') {
    const request = JSON.parse(fs.readFileSync(opts.request));
    const { args, memory, disk = 0 } = request;
    if (!Array.isArray(args) || args.some(x => typeof x !== 'string') || !Number.isSafeInteger(memory) || memory < 16777216) fail('USAGE', 'invalid box request');
    return reserveBox(config, name, opts, () => docker(['create', '--name', name, ...labels, '--memory', String(memory), '--memory-swap', String(memory), ...args]), { memory, disk });
  }
  if (action === 'prepare') {
    // [EXP-G03] Why: only authority lock bytes enter the networked fetch; never run candidate scripts here.
    // Rejected: fetching during a claim (makes network and dependency mutation part of candidate execution).
    const commit = policy?.commit ?? opts['lockfile-commit'];
    if (!/^[0-9a-f]{40}$/.test(commit ?? '')) fail('USAGE', 'prepare requires --lockfile-commit SHA');
    const { execFileSync } = await import('node:child_process');
    const lock = authorityGit ? authorityGit.blob(commit, 'pnpm-lock.yaml') : execFileSync('git', ['show', `${commit}:pnpm-lock.yaml`], { cwd: REPO, env: { ...process.env, GIT_NO_REPLACE_OBJECTS: '1' } });
    const base = policy?.box.base ?? opts.base;
    if (!/^node:[^@]+@sha256:[0-9a-f]{64}$/.test(base ?? '')) fail('USAGE', '--base must be digest-pinned node image');
    const dockerfile = fs.readFileSync(path.join(REPO, 'lab/config/box/Dockerfile'));
    const inputs = sha256(Buffer.concat([Buffer.from(base), dockerfile]));
    const tag = `tx2-box:${inputs.slice(0, 12)}`;
    return reserveBox(config, name, opts, async () => {
      // [EXP-G03] Why: buildx writes activity files under ~/.docker even with -H; keep its state in this worktree. Rejected: using the shared builder cache.
      process.env.BUILDX_CONFIG = path.join(REPO, 'runs/g03-buildx');
      process.env.DOCKER_HOST = 'unix:///Users/sam/.colima/triplex2/docker.sock';
      fs.mkdirSync(process.env.BUILDX_CONFIG, { recursive: true });
      docker(['build', '--label', `tx2.box-build-inputs-sha256=${inputs}`, '--build-arg', `BASE=${base}`, '-t', tag, '-f', 'lab/config/box/Dockerfile', 'lab/config/box']);
      const image = JSON.parse(docker(['image', 'inspect', tag]))[0];
      const store = `${prefix}store-${sha256(lock).slice(0, 12)}`;
      docker(['volume', 'create', ...labels, store]);
      let fetch, prepared = false;
      try {
        fetch = docker(['create', '--name', name, ...labels, '--network', 'bridge', '--memory', '1610612736', '--memory-swap', '1610612736', '--cpus', '1', '--pids-limit', '128', '-v', `${store}:/store`, '-w', '/tmp', image.Id, 'sh', '-c', 'pnpm fetch --frozen-lockfile --store-dir /store --ignore-scripts']);
        const { tarFiles, WALKER } = await import('./box.mjs');
        docker(['cp', '-', `${name}:/tmp`], { input: tarFiles(new Map([['pnpm-lock.yaml', { bytes: lock, mode: '100644' }]])) });
        docker(['start', '-a', name]);
        const result = inspect(name);
        if (result.State.ExitCode !== 0) fail('BUILD-FAILED', `store fetch exited ${result.State.ExitCode}`);
        docker(['rm', '-f', name]);
        docker(['create', '--name', name, ...labels, '--network', 'none', '--memory', '536870912', '--memory-swap', '536870912', '--cpus', '1', '--pids-limit', '128', '--read-only', '-v', `${store}:/work:ro`, '-i', image.Id, 'node', '--input-type=module', '-', '[]']);
        const listing = JSON.parse(docker(['start', '-a', '-i', name], { input: WALKER }));
        if (inspect(name).State.ExitCode !== 0) fail('BUILD-FAILED', 'store walker failed');
        const record = { storeListingSha256: sha256(Buffer.from(JSON.stringify(listing.entries))), format: 'tx2-box/1', image: tag, imageId: image.Id, buildInputsSha256: inputs, base, lockfileSha256: sha256(lock), store, authority: commit, fetchedContainer: fetch, at: now() };
        if (policy && (record.imageId !== policy.box.imageId || record.storeListingSha256 !== policy.box.storeListingSha256 || record.buildInputsSha256 !== policy.box.buildInputsSha256)) fail('ISOLATION-NOT-IN-FORCE', 'prepared image/store differs from authority pins');
        atomicJson(path.resolve(opts.output ?? 'lab/experiments/EXP-G03/box.json'), record);
        prepared = true; return record;
      } finally { if (inspect(name)) docker(['rm', '-f', name]); if (!prepared) docker(['volume', 'rm', store]); }
    }, { memory: 1610612736, disk: 3221225472 });
  }
  if (action === 'slot') {
    const info = slotInfo(config, opts.lane, opts.slot);
    const owner = readOwner(info), c = inspect(info.container);
    if (info.mode !== 'exclusive' || owner?.holder !== holder || !c?.State.Running) fail('REFUSED', 'OBL needs a running exclusive slot owned by this holder');
    return { info, owner, container: c };
  }
  fail('USAGE', `unknown box action ${action}`);
}

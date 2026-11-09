// [EXP-G03] Why: candidate lifecycle must use the same atomic pool admission as engines.
// Rejected: a second ledger (concurrent starts would over-admit the VM).
import { cgroupProofScript } from './box-policy.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { REPO, admission, appendEvent, atomicJson, defaultHolder, docker, inspect, listTx2Containers, now, reconcile, sha256, slotInfo, readOwner, vmDisk, withPool, fail } from './lib.mjs';

export async function reserveBox(config, name, options, fn, { memory = 268435456, disk = 0 } = {}) {
  const controller = options['controller-pid'] === undefined ? process.pid : Number(options['controller-pid']);
  if (!Number.isSafeInteger(controller) || controller < 1 || (options['controller-pid'] !== undefined && controller !== process.ppid)) fail('REFUSED', 'controller pid must be the actual Mac parent process');
  const diskStat = fs.statfsSync(REPO);
  if (diskStat.bavail * diskStat.bsize < 5 * 1024 ** 3) fail('REFUSED', 'host free disk below 5 GiB');
  await withPool(async ledger => {
    const running = listTx2Containers({ all: true });
    reconcile(ledger, running);
    if (ledger.reservations.some(r => r.container === name)) fail('REFUSED', `${name} already reserved`);
    const v = admission({ config, reservations: ledger.reservations, running, request: { container: name, memBytes: memory, diskForecastBytes: disk }, diskUsedBytes: vmDisk(config).usedBytes });
    if (!v.ok) fail('REFUSED', `box pool: ${v.reasons.join('; ')}; holders: ${v.holders.join(', ')}`);
    // [EXP-G03] Why: the controller lives through cleanup, unlike this short-lived creator; the marker also survives controller death and incomplete Docker snapshots.
    // Rejected: creator-pid liveness alone (parallel creation lost a live box's reservation before its kill proof).
    ledger.reservations.push({ container: name, memBytes: memory, cpus: 1, diskForecastBytes: disk, holder: defaultHolder(options), state: 'starting', pid: controller, cleanupRequired: true, reservedAt: now() });
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
  if (action === 'retain-volume') { owned(name,holder,'volume'); if (!opts.note) fail('USAGE','retention requires --note'); await withPool(async ledger => { ledger.retainedVolumes=(ledger.retainedVolumes??[]).filter(r=>r.volume!==name); ledger.retainedVolumes.push({volume:name,holder,note:opts.note,at:now(),bytes:null}); }); return {retained:name,note:opts.note}; }
  if (action === 'remove-volume') { owned(name, holder, 'volume'); const result=docker(['volume', 'rm', name]); await withPool(async ledger => { ledger.retainedVolumes=(ledger.retainedVolumes??[]).filter(r=>r.volume!==name); }); return result; }
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
    if (opts['recover-reservation'] && (!image || typeof opts.note !== 'string' || !opts.note.trim())) fail('REFUSED', 'cleanup recovery needs a proof image and a note');
    if (image) await withPool(async ledger => {
      let entry = ledger.reservations.find(r => r.container === name && r.holder === holder);
      if (!entry && ledger.reservations.some(r => r.container === name)) fail('REFUSED', 'reservation belongs to another holder');
      // [EXP-G03] Why: an operator can recover a pre-fix lost reservation only from an owned existing container's actual cap, before kill/proof, with ordinary admission.
      // Rejected: hand-editing the ledger or deleting an orphan without the kernel proof.
      if (!entry && opts['recover-reservation']) {
        if (!existing || !opts.note || !Number.isSafeInteger(existing.HostConfig.Memory) || existing.HostConfig.Memory < 67108864) fail('REFUSED', 'recovery needs an owned existing capped container and a note');
        entry = {container:name,holder,memBytes:existing.HostConfig.Memory,cpus:1,diskForecastBytes:0,pid:process.pid,cleanupRequired:true,cleanupFailed:true,candidateId:id,state:'recovering-kill',reservedAt:now(),recoveryNote:opts.note};
        const reservations = [...ledger.reservations,entry];
        const v = admission({config,reservations,running:listTx2Containers({all:true}),request:{container:name,memBytes:entry.memBytes,diskForecastBytes:0},diskUsedBytes:vmDisk(config).usedBytes});
        if (!v.ok) fail('REFUSED', `cleanup recovery admission: ${v.reasons.join('; ')}`);
        ledger.reservations.push(entry);appendEvent({event:'box-cleanup-reservation-recovered',entry});
      }
      if (!entry || entry.memBytes < 67108864) fail('REFUSED', 'kill proof needs the candidate reservation retained');
      if (opts['recover-reservation']) { if (!opts.note) fail('REFUSED', 'cleanup recovery needs a note'); entry.pid = process.pid; entry.cleanupRequired = true; }
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
  if (action === 'prepare-v-probes') {
    // [EXP-G03] Why: trusted probe tooling has a separate image and pool admission. Rejected: Python in tx2-box (breaks the candidate/oracle boundary).
    const base = opts.base;
    if (!/^node:[^@]+@sha256:[0-9a-f]{64}$/.test(base ?? '')) fail('USAGE', 'probe base must be digest-pinned Node');
    const context = path.join(REPO, 'lab/experiments/EXP-G03/v-probes');
    const inputs = () => sha256(Buffer.concat([Buffer.from(base), ...['Dockerfile','sync-hook.c','probe.py','relay.mjs'].flatMap(p => [Buffer.from(p), fs.readFileSync(path.join(context,p))])]));
    const digest = inputs();
    return reserveBox(config, name, opts, async () => {
      process.env.BUILDX_CONFIG = path.join(REPO, 'runs/g03-probe-buildx');
      process.env.DOCKER_HOST = 'unix:///Users/sam/.colima/triplex2/docker.sock';
      fs.mkdirSync(process.env.BUILDX_CONFIG, {recursive:true});
      const tag = `tx2-v-probes:${digest.slice(0,12)}`;
      docker(['build', '--label', `tx2.box-build-inputs-sha256=${digest}`, '--build-arg', `BASE=${base}`, '-t', tag, context]);
      const image = JSON.parse(docker(['image','inspect',tag]))[0];
      if (inputs() !== digest || image.Config.Labels?.['tx2.box-build-inputs-sha256'] !== digest) fail('ISOLATION-NOT-IN-FORCE', 'probe build inputs changed');
      return {format:'tx2-v-probe-image/1',imageId:image.Id,buildInputsSha256:digest,base,at:now()};
    }, {memory:1073741824,disk:1073741824});
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

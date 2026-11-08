// [EXP-G03] Why: no candidate byte is ever evaluated or extracted on the Mac.
// Rejected: sandbox-exec fallback (same-user reads, setsid survivors, no cgroup caps).
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { gatewayPlan, preflightScript, checkPreflight } from './box-policy.mjs';
import { docker, dockerArgs, inspect, REPO, sha256 } from './lib.mjs';

export const BOX_ENV = ['HOME=/tmp/home', 'TMPDIR=/tmp', 'LANG=C.UTF-8', 'TZ=UTC', 'SOURCE_DATE_EPOCH=0', 'CI=1', 'NODE_OPTIONS=', 'npm_config_store_dir=/store', 'npm_config_offline=true'];
export const HARDEN = ['--user', '10001:10001', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges=true', '--read-only', '--tmpfs', '/tmp:rw,nosuid,nodev,size=1g,mode=1777', '--ipc', 'private', '--ulimit', 'core=0', '--ulimit', 'nofile=8192:8192', '--oom-score-adj', '500', '--hostname', 'tx2-box', '--restart', 'no', '--stop-timeout', '1', '--log-driver', 'json-file', '--log-opt', 'max-size=1m', '--log-opt', 'max-file=1'];
export const ISOLATION_PROFILE = { hardening: HARDEN, env: BOX_ENV, build: { memory: 2147483648, cpus: 2, pids: 1024, network: 'none', mounts: [['instance','/work','rw'],['store','/store','ro']] }, case: { memory: 805306368, cpus: 1, pids: 256, network: 'internal-no-gateway-per-arm', mounts: [['instance','/work','ro'],['inputs','/in','ro']] } };
export const safeBoxPath = p => typeof p === 'string' && p.length > 0 && !p.startsWith('/') && !p.includes('\\') && !p.split('/').some(x => x === '..' || x === '.' || !x) && !p.includes('\0');
export function selectBoxInputs(snapshot, selectors) {
  if (!Array.isArray(selectors) || !selectors.length || selectors.some(p => !safeBoxPath(p.replace(/\/$/, '')) || p === 'lab' || p.startsWith('lab/'))) throw new Error('contract boxInputs missing or unsafe');
  const selected = new Map();
  for (const [p, f] of snapshot.files) {
    if (p === 'lab' || p.startsWith('lab/')) continue;
    if (!selectors.some(s => s.endsWith('/') ? p.startsWith(s) : p === s)) continue;
    if (!safeBoxPath(p) || !['100644', '100755'].includes(f.mode) || !Buffer.isBuffer(f.bytes)) throw new Error(`box input is not a regular git blob: ${p}`);
    selected.set(p, f);
  }
  if (!selected.has('pnpm-lock.yaml') || !selected.has('package.json') || !selected.has('pnpm-workspace.yaml')) throw new Error('boxInputs must include root dependency manifests');
  return selected;
}

// [EXP-G03] Why: tar is written from verified blobs, uid fixed; no candidate archive is extracted here.
// Rejected: git archive with export filters (not necessarily the verified bytes).
export function tarFiles(files) {
  const blocks = [], entries = new Map(files);
  for (const p of files.keys()) { let parent = path.posix.dirname(p); while (parent !== '.') { if (!entries.has(parent)) entries.set(parent, { bytes: Buffer.alloc(0), mode: '100755', directory: true }); parent = path.posix.dirname(parent); } }
  for (const [p, f] of [...entries].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) {
    if (!safeBoxPath(p) || Buffer.byteLength(p) > 255) throw new Error(`unsupported tar path: ${p}`);
    const b = Buffer.alloc(512), data = f.bytes;
    const str = (at, len, value) => b.write(value, at, len, 'utf8');
    const oct = (at, len, n) => str(at, len, n.toString(8).padStart(len - 1, '0') + '\0');
    if (Buffer.byteLength(p) <= 100) str(0, 100, p);
    else { const slash = p.lastIndexOf('/'); const prefix = p.slice(0, slash), leaf = p.slice(slash + 1); if (Buffer.byteLength(prefix) > 155 || Buffer.byteLength(leaf) > 100) throw Error('unsupported tar prefix'); str(0, 100, leaf); str(345, 155, prefix); }
    oct(100, 8, f.mode === '100755' ? 0o755 : 0o644); oct(108, 8, 10001); oct(116, 8, 10001);
    oct(124, 12, data.length); oct(136, 12, 0); b.fill(32, 148, 156); b[156] = f.directory ? 53 : 48; str(257, 6, 'ustar\0'); str(263, 2, '00');
    const sum = b.reduce((a, x) => a + x, 0); str(148, 8, sum.toString(8).padStart(6, '0') + '\0 ');
    blocks.push(b, data, Buffer.alloc((512 - data.length % 512) % 512));
  }
  return Buffer.concat([...blocks, Buffer.alloc(1024)]);
}

export function profileProblems(c, expected) {
  const h = c?.HostConfig, problems = [];
  if (!h || c.Image !== expected.image || c.Config.User !== '10001:10001') problems.push('image/user');
  if (!h) return problems;
  if (h.Privileged || h.ReadonlyRootfs !== true || h.PidMode || h.IpcMode !== 'private' || h.NetworkMode !== expected.network) problems.push('namespaces/rootfs');
  if (JSON.stringify(h.CapDrop) !== '["ALL"]' || h.CapAdd?.length || !h.SecurityOpt?.includes('no-new-privileges=true') || h.Devices?.length || h.DeviceRequests?.length) problems.push('privileges');
  if (expected.cpuset && h.CpusetCpus !== expected.cpuset) problems.push('cpuset');
  if (h.Memory !== expected.memory || h.MemorySwap !== expected.memory || h.PidsLimit !== expected.pids || h.OomScoreAdj !== 500 || h.NanoCpus !== (expected.cpus ?? 1) * 1e9) problems.push('limits');
  if (!h.Tmpfs?.['/tmp']?.includes('nosuid') || !h.Tmpfs['/tmp'].includes('nodev') || !h.Tmpfs['/tmp'].includes('size=1g')) problems.push('tmpfs');
  if (c.Config.Hostname !== 'tx2-box' || h.RestartPolicy?.Name !== 'no' || h.LogConfig?.Config?.['max-size'] !== '1m' || h.LogConfig?.Config?.['max-file'] !== '1') problems.push('hostname/restart/logs');
  const actual = (c.Mounts ?? []).map(m => [m.Type, m.Name, m.Destination, m.RW]).sort();
  const wanted = expected.mounts.map(m => ['volume', m.name, m.target, m.rw]).sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) problems.push('mounts');
  for (const entry of [...BOX_ENV, ...(expected.env ?? [])]) if (!c.Config.Env.includes(entry)) problems.push(`env ${entry.split('=')[0]}`);
  return problems;
}

export const WALKER = `import fs from 'node:fs'; import path from 'node:path'; import {createHash} from 'node:crypto';
const hash=b=>createHash('sha256').update(b).digest('hex'); const entries=[], modules=[]; let total=0;
const outputs=JSON.parse(process.argv[2]);
function visit(root,rel='') { for(const name of fs.readdirSync(path.join(root,rel)).sort()) {
 const p=rel?rel+'/'+name:name, abs=path.join(root,p), st=fs.lstatSync(abs), mode=(st.mode&4095).toString(8);
 if(st.isSymbolicLink()) { const text=fs.readlinkSync(abs); const target=path.resolve(path.dirname(abs),text); let real=target; try { real=fs.realpathSync(abs); } catch {}
 if(!target.startsWith(root+'/')||!real.startsWith(root+'/')) throw Error('outside link '+p); entries.push([p,'l',hash(text),mode]); }
 else if(st.isDirectory()) { entries.push([p,'d',hash(''),mode]); visit(root,p); }
 else if(st.isFile()) { const data=fs.readFileSync(abs); entries.push([p,'f',hash(data),mode]);
 if(outputs.some(o=>p===o.replace(/\\/$/,'')||p.startsWith(o.replace(/\\/$/,'')+'/'))) { total+=data.length; if(total>67108864) throw Error('output cap'); modules.push({path:p,sha256:hash(data),base64:data.toString('base64')}); } }
 else throw Error('special file '+p);
}} visit('/work'); console.log(JSON.stringify({entries,modules}));`;

export class BoxExecutor {
  constructor({ config, workDir, holder = 'CX-G03', put, why, authority, placement }) {
    if (process.env.TX2_DOCKER_HOST && process.env.TX2_DOCKER_HOST !== 'unix:///Users/sam/.colima/triplex2/docker.sock') throw Error('wrong Docker daemon');
    this.authority = authority; this.placement = placement;
    this.config = config; this.workDir = workDir; this.holder = holder; this.put = put; this.why = why;
    this.run = randomBytes(8).toString('hex'); this.prefix = `tx2-g03-${this.run}-`; this.resources = []; this.records = []; this.arms = new Map();
    if (!/^sha256:[0-9a-f]{64}$/.test(config?.imageId ?? '') || !/^[0-9a-f]{64}$/.test(config?.buildInputsSha256 ?? '') || !/^[0-9a-f]{64}$/.test(config?.storeListingSha256 ?? '')) throw Error('contract boxSpec image/build/store pins missing');
    if (!/^tx2-g03-[a-zA-Z0-9_.-]+$/.test(config.store ?? '')) throw Error('invalid Linux store volume');
    const image = JSON.parse(docker(['image', 'inspect', config.imageId]))[0];
    if (image.Id !== config.imageId || image.Config.Labels?.['tx2.box-build-inputs-sha256'] !== config.buildInputsSha256) throw Error('image/build-input label mismatch');
    this.runtime = JSON.parse(docker(['version', '--format', '{{json .Server}}']));
    this.kernel = docker(['info', '--format', '{{.KernelVersion}}']);
    const storeLabel = JSON.parse(docker(['volume', 'inspect', config.store]))[0];
    if (storeLabel.Labels?.['tx2.managed-by'] !== 'lab/bin/engine.mjs') throw Error('unmanaged Linux store');
  }
  engine(action, extra = []) {
    const r = spawnSync(process.execPath, [path.join(REPO, 'lab/bin/engine.mjs'), 'box', action, '--run', this.run, '--holder', this.holder, ...(this.authority ? ['--authority', this.authority.commit, '--authority-repo', this.authority.repo] : []), ...extra], { encoding: 'utf8', timeout: 180000, maxBuffer: 4 * 1024 * 1024 });
    if (r.status !== 0) throw Error(`engine box ${action}: ${r.stderr || r.error || r.stdout}`);
    return JSON.parse(r.stdout);
  }
  volume(suffix) { const name = this.prefix + suffix; this.engine('volume', ['--name', name]); this.resources.push(['volume', name]); return name; }
  create(suffix, { argv, mounts = [], network = 'none', memory = 268435456, cpus = 1, pids = 128, env = [], input, trusted = false, extra = [], image = this.config.imageId, cpuset, unlimitedCpu = false }) {
    const name = this.prefix + suffix;
    const args = [...HARDEN, ...(unlimitedCpu ? [] : ['--cpus', String(cpus)]), ...(cpuset ? ['--cpuset-cpus',cpuset] : []), '--pids-limit', String(pids), '--network', network, ...BOX_ENV.flatMap(e => ['--env', e]), ...env.flatMap(e => ['--env', e]), ...mounts.flatMap(m => ['-v', `${m.name}:${m.target}:${m.rw ? 'rw' : 'ro'}`]), ...extra, '-w', '/work', ...(input ? ['-i'] : []), image, ...argv];
    const request = path.join(this.workDir, `request-${suffix}.json`);
    fs.writeFileSync(request, JSON.stringify({ args, memory, disk: mounts.some(m => m.rw) ? 1073741824 : 0 }));
    this.engine('create', ['--name', name, '--request', request]);
    this.resources.push(['container', name]);
    const actual = inspect(name), expected = { image, network, memory, cpus:unlimitedCpu ? 0 : cpus, cpuset, pids, mounts, env };
    const problems = trusted ? [] : profileProblems(actual, expected);
    this.records.push({ name, inspectSha256: this.put(Buffer.from(JSON.stringify(actual))), trusted, profile: expected });
    if (problems.length) throw Error(`container profile mismatch: ${problems.join(', ')}`);
    return name;
  }
  start(name, { input, timeout = 120000, max = 16 * 1024 * 1024 } = {}) {
    const r = spawnSync('docker', dockerArgs(['start', '-a', ...(input ? ['-i'] : []), name]), { input, timeout, maxBuffer: max });
    const status = inspect(name)?.State?.ExitCode;
    if (r.error || r.signal || status !== 0) return { status: r.error || r.signal ? -1 : status ?? -1, stdout: r.stdout ?? Buffer.alloc(0), stderr: Buffer.from(String(r.error ?? r.stderr ?? r.signal)) };
    return { status: 0, stdout: r.stdout, stderr: r.stderr };
  }
  remove(name) {
    const id = inspect(name)?.Id;
    const proof = this.engine('remove', ['--name', name, '--proof-image', this.config.imageId]);
    this.resources = this.resources.filter(([, n]) => n !== name);
    if (!proof.cgroupGone || (id && proof.id !== id)) throw Error('kill proof mismatch');
    this.records.push(proof);
  }
  seed(volume, files) {
    const name = this.create(`seed-${randomBytes(3).toString('hex')}`, { argv: ['true'], mounts: [{ name: volume, target: '/work', rw: true }], memory: 67108864 });
    docker(['cp', '-', `${name}:/work`], { input: tarFiles(files) });
    this.engine('remove', ['--name', name]); this.resources = this.resources.filter(([, n]) => n !== name);
  }
  walk(volume, outputs = []) {
    const name = this.create(`walk-${randomBytes(3).toString('hex')}`, { argv: ['node', '--input-type=module', '-', JSON.stringify(outputs)], mounts: [{ name: volume, target: '/work', rw: false }], memory: 536870912, input: true, trusted: true });
    const r = this.start(name, { input: Buffer.from(WALKER), max: 96 * 1024 * 1024 });
    this.engine('remove', ['--name', name]); this.resources = this.resources.filter(([, n]) => n !== name);
    if (r.status !== 0) throw Error(`walker failed ${r.stderr}`);
    return JSON.parse(r.stdout);
  }
  attestStore() {
    const listing = this.walk(this.config.store).entries;
    const digest = sha256(Buffer.from(JSON.stringify(listing)));
    if (digest !== this.config.storeListingSha256) throw Error('Linux store listing changed');
    const script = "const fs=require('node:fs'),cp=require('node:child_process'),crypto=require('node:crypto');const tools={};for(const n of ['node','pnpm']){const p=cp.execFileSync('sh',['-c','command -v '+n],{encoding:'utf8'}).trim();const real=fs.realpathSync(p);tools[n]={path:real,sha256:crypto.createHash('sha256').update(fs.readFileSync(real)).digest('hex'),version:cp.execFileSync(n,['--version'],{encoding:'utf8'}).trim()}}if(cp.spawnSync('sh',['-c','command -v python3']).status===0)throw Error('python3 present');console.log(JSON.stringify(tools));";
    const name = this.create('toolchain', { argv: ['node', '-e', script], trusted: true, memory: 134217728 });
    const result = this.start(name); this.engine('remove', ['--name', name]); this.resources = this.resources.filter(([, n]) => n !== name);
    if (result.status !== 0) throw Error('toolchain probe failed ' + result.stderr);
    this.toolchain = JSON.parse(result.stdout);
    if (this.toolchain.node.version !== 'v22.23.2' || this.toolchain.pnpm.version !== '10.11.0') throw Error('unexpected image toolchain'); this.storeListingSha256 = digest;
  }
  auxiliaryPlacement(slot) {
    if (!this.placement) return {};
    const arm = [this.placement.candidate,this.placement.A0].find(a => a.slot === slot);
    if (!arm) throw Error('slot absent from validated PAIR-0 layout');
    return {cpuset:arm.sut.join(','),unlimitedCpu:true};
  }
  arm(comp, canaryPort) {
    if (!Number.isInteger(canaryPort) || canaryPort < 1024 || [15442,17019].includes(canaryPort)) throw Error('missing Mac canary listener');
    const armId = sha256(Buffer.from(JSON.stringify(comp))).slice(0, 8);
    if (this.arms.has(armId)) return this.arms.get(armId);
    if ([...this.arms.values()].some(a => a.slot.lane === comp.source.engine && a.slot.slot === comp.source.slot)) throw Error('arms must use distinct slots');
    const slot = this.engine('slot', ['--lane', comp.source.engine, '--slot', comp.source.slot]);
    if (slot.container.Image !== comp.source.imageDigest || slot.container.Config.Labels?.['tx2.config-sha256'] !== comp.source.configSha256) throw Error('slot image/config differs from claimed composition');
    // Only a single physical foundation is supported in this round; mixed compositions fail closed.
    if (Object.values(comp).some(a => a && typeof a === 'object' && a.engine && (a.engine !== comp.source.engine || a.slot !== comp.source.slot || a.configSha256 !== comp.source.configSha256 || a.imageDigest !== comp.source.imageDigest))) throw Error('mixed-slot composition unsupported');
    const network = this.prefix + 'arm-' + armId; this.engine('network', ['--name', network]); this.resources.push(['network', network]);
    const auxiliary = this.auxiliaryPlacement(comp.source.slot);
    const datomic = comp.source.engine === 'datomic';
    if (datomic && (slot.container.Config.Labels?.['tx2.mode'] !== 'transactor-only' || slot.container.Config.Labels?.['tx2.advertised-host'] !== 'engine')) throw Error('Datomic slot must advertise engine in transactor-only mode');
    const upstream = Object.values(slot.container.NetworkSettings.Networks).map(n => n.IPAddress).find(Boolean), port = datomic ? 4334 : slot.info.laneConf.containerPort;
    if (!upstream) throw Error('slot has no upstream IP');
    const ports = datomic ? [4334,4335] : [port];
    const relayScript = ports.map(p => `const net=require('node:net');net.createServer(s=>{const u=net.connect({host:${JSON.stringify(upstream)},port:${p}});s.pipe(u);u.pipe(s);s.on('error',()=>u.destroy());u.on('error',()=>s.destroy());s.on('close',()=>u.destroy());u.on('close',()=>s.destroy())}).listen(${p},'0.0.0.0')`).map(s => '{'+s+'}').join(';');
    const relay = this.create('relay-' + armId, { argv: ['node', '-e', relayScript], network: 'bridge', memory: 67108864, trusted: true, ...auxiliary });
    docker(['start', relay]); this.engine('connect', ['--name', relay, '--network', network]);
    const all = JSON.parse(docker(['ps', '-q', '--filter', 'name=^tx2-']) ? docker(['inspect', ...docker(['ps', '-q', '--filter', 'name=^tx2-']).split('\n')]) : '[]');
    const blocked = all.filter(c => c.Name !== '/'+relay).flatMap(c => Object.values(c.NetworkSettings.Networks).map(n => [n.IPAddress, c.Name.includes('qlever') ? 7019 : 5432])).filter(([ip]) => ip);
    blocked.push(['192.168.5.2',canaryPort], ['192.168.5.1',canaryPort], ['1.1.1.1',443]);
    const script = preflightScript(blocked, port);
    const probe = this.create('preflight-' + armId, { argv: ['node', '-e', script], network, memory: 67108864, trusted: true });
    const result = this.start(probe); this.remove(probe);
    this.records.push({ preflight: this.put(result.stdout), slot: slot.info.container });
    checkPreflight(result, blocked);
    const env = datomic ? ['DATOMIC_GATEWAY_URL=http://gateway:8080','DATOMIC_INTEGRATION=1'] : comp.source.engine === 'xtdb' ? ['XTDB_URL=postgres://xtdb:xtdb@engine:5432/xtdb','XTDB_INTEGRATION=1'] : ['QLEVER_URL=http://engine:7019','QLEVER_INTEGRATION=1'];
    const arm = { network, env, transactorOnly:datomic, slot: slot.info, configSha256: comp.source.configSha256 }; this.arms.set(armId, arm); return arm;
  }
  gateway(instance, arm, spec, cpuset) {
    if (arm.slot.lane !== 'datomic' || !arm.transactorOnly) throw Error('Datomic qualification needs a transactor-only slot');
    const plan = gatewayPlan(spec, { network:arm.network, volume:instance.volume, cpuset, sourcePath:'packages/datomic/gateway/src' });
    const actual = JSON.parse(docker(['image','inspect',plan.image]))[0];
    if (actual.Config.Labels?.['tx2.build-inputs-sha256'] !== spec.buildInputsSha256) throw Error('Datomic gateway image/build pin mismatch');
    const name = this.create('gateway-'+instance.n, plan);
    docker(['start',name]);
    this.records.push({ gateway:name, durableReadbackAllowed:plan.durableReadbackAllowed });
    return {name,env:['DATOMIC_GATEWAY_URL=http://gateway:8080'],durableReadbackAllowed:plan.durableReadbackAllowed};
  }
  build(snapshot, spec) {
    const files = selectBoxInputs(snapshot, spec.boxInputs);
    const volume = this.volume(`inst-${randomBytes(3).toString('hex')}`); this.seed(volume, files);
    const name = this.create(`build-${randomBytes(3).toString('hex')}`, { argv: spec.argv, mounts: [{ name: volume, target: '/work', rw: true }, { name: this.config.store, target: '/store', rw: false }], memory: 2147483648, cpus: 2, pids: 1024 });
    const r = this.start(name, { timeout: this.config.buildTimeoutMs ?? 1800000 });
    this.remove(name);
    if (r.status !== 0) throw Error(`BUILD-FAILED ${r.stderr.toString().slice(-1000)}`);
    if (docker(['ps', '-aq', '--filter', `volume=${volume}`])) throw Error('instance volume still mounted before walker');
    const walk = this.walk(volume, spec.outputs);
    if (!walk.modules.length) throw Error('no build outputs');
    return { volume, walk, files };
  }
  case(instance, raw, mode, argv, network = 'none', env = []) {
    const inputs = this.volume(`in-${randomBytes(3).toString('hex')}`), hash = sha256(raw);
    this.seed(inputs, new Map([[`${hash}.json`, { bytes: raw, mode: '100644' }]]));
    const name = this.create(`case-${randomBytes(3).toString('hex')}`, { argv: ['sleep', 'infinity'], mounts: [{ name: instance.volume, target: '/work', rw: false }, { name: inputs, target: '/in', rw: false }], network, memory: 805306368, pids: 256, env, extra: ['--init'], ...this.auxiliaryPlacement([...this.arms.values()].find(a=>a.network===network)?.slot.slot) });
    let answer;
    try {
      docker(['start', name]);
      const before = docker(['top', name, '-eo', 'pid,comm']);
      const filled = argv.map(a => a.replaceAll('{case}', `/in/${hash}.json`).replaceAll('{mode}', mode));
      const r = spawnSync('docker', dockerArgs(['exec', '-w', '/work', name, ...filled]), { timeout: this.config.caseTimeoutMs ?? 120000, maxBuffer: this.config.stdoutMaxBytes ?? 16777216 });
      const after = docker(['top', name, '-eo', 'pid,comm']);
      if (before !== after || !inspect(name)?.State.Running) throw Error('CASE-SURVIVOR or runner terminated');
      if (r.error || r.signal) throw Error(`case output cap/timeout: ${r.error ?? r.signal}`);
      answer = { exit: r.status, stdout: r.stdout, stderr: r.stderr };
    } finally { this.remove(name); }
    return answer;
  }
  close() {
    const errors = [];
    for (const [kind, name] of [...this.resources].reverse()) try {
      if (kind === 'container') this.remove(name);
      else { this.engine(`remove-${kind}`, ['--name', name]); this.resources = this.resources.filter(([, n]) => n !== name); }
    } catch (e) { errors.push(String(e)); }
    if (errors.length) throw Error(errors.join('; '));
  }
}

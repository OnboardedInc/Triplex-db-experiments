// [EXP-G03] Why: authority bytes, not a moving ref or local receipt, choose qualification policy.
// Rejected: reading slots.json from main by name (Q86e makes the authority an explicit commit).
import { createHash } from 'node:crypto';
const hash = b => createHash('sha256').update(b).digest('hex');
const hex = s => typeof s === 'string' && /^[0-9a-f]{64}$/.test(s);
export function authorityPolicy(git, commit) {
  if (!/^[0-9a-f]{40}$/.test(commit ?? '') || git.resolve(commit) !== commit) throw Error('authority must be an existing full commit id');
  const read = p => { const bytes = git.blob(commit, p); if (!bytes) throw Error(`authority file missing: ${p}`); return { bytes, doc: JSON.parse(bytes) }; };
  const contract = read('lab/acceptance/obligations.json'), slots = read('lab/config/slots.json'), load = read('lab/acceptance/load-contract.json');
  if (contract.doc.loadContractRef?.sha256 !== hash(load.bytes)) throw Error('authority load-contract hash mismatch');
  const box = contract.doc.buildSpec?.boxSpec;
  if (!box || !/^sha256:[0-9a-f]{64}$/.test(box.imageId ?? '') || !hex(box.buildInputsSha256) || !hex(box.storeListingSha256) || !hex(box.storeLockfileSha256)) throw Error('authority box pins incomplete');
  if (slots.doc.box?.imageId !== box.imageId || slots.doc.box?.buildInputsSha256 !== box.buildInputsSha256) throw Error('authority slots/contract box pins disagree');
  if (hash(git.blob(commit, 'pnpm-lock.yaml') ?? Buffer.alloc(0)) !== box.storeLockfileSha256) throw Error('authority lockfile/store pin mismatch');
  for (const [k, max] of Object.entries({stdoutMaxBytes:67108864,caseTimeoutMs:1800000,buildTimeoutMs:3600000})) if (!Number.isSafeInteger(box[k]) || box[k] <= 0 || box[k] > max) throw Error(`invalid authority limit ${k}`);
  return { commit, contract: contract.doc, slots: slots.doc, load: load.doc, box, hashes: {contract:hash(contract.bytes),slots:hash(slots.bytes),load:hash(load.bytes)} };
}
export function bindStore(policy, receipt) {
  const box = policy.box;
  if (!receipt || receipt.format !== 'tx2-box/1' || receipt.imageId !== box.imageId || receipt.buildInputsSha256 !== box.buildInputsSha256 || receipt.lockfileSha256 !== box.storeLockfileSha256 || receipt.storeListingSha256 !== box.storeListingSha256 || !/^tx2-g03-[a-zA-Z0-9_.-]+$/.test(receipt.store ?? '')) throw Error('store receipt differs from authority pins');
  return { ...box, store: receipt.store };
}

// [EXP-G03] Why: six VM cores fit two equal engine pairs plus one shared auxiliary core per arm (Q86f).
// Rejected: sharing a core across arms or giving observers a seventh core that the VM does not have.
export function pairLayout(policy, slots) {
  const p = policy.load.measurementProtocol?.isolationLayout;
  if (!p || p.format !== 'pair-layout/1' || p.vmCpus !== policy.slots.vm.cpus || !Array.isArray(slots) || slots.length !== 2 || slots[0] === slots[1]) throw Error('PAIR-0 layout/slots missing');
  const seen = new Set();
  for (const arm of ['candidate','A0']) {
    const a = p[arm];
    if (!a || !Array.isArray(a.engine) || a.engine.length !== 2 || !Array.isArray(a.sut) || a.sut.length !== 1 || JSON.stringify(a.sut) !== JSON.stringify(a.relay) || JSON.stringify(a.sut) !== JSON.stringify(a.observer)) throw Error('PAIR-0 auxiliary placement mismatch');
    for (const core of [...a.engine,...a.sut]) { if (!Number.isInteger(core) || core < 0 || core >= p.vmCpus || seen.has(core)) throw Error('PAIR-0 core overlap/out of range'); seen.add(core); }
  }
  return { format:'pair-placement/1', design:'duet', candidate:{slot:slots[0],...p.candidate}, A0:{slot:slots[1],...p.A0}, cpuMax:'max', cpuWeight:p.cpuWeight };
}
// [EXP-G03] Why: DA01 1f09771 hardcodes loopback in base-uri; retarget the loaded candidate var before -main without editing its read-only source.
// Rejected: the resident entrypoint (also starts a transactor) or an ignored DATOMIC_URI export.
export function gatewayPlan(spec, { network, volume, cpuset, sourcePath }) {
  if (!spec || !/^sha256:[0-9a-f]{64}$/.test(spec.imageId ?? '') || !hex(spec.buildInputsSha256)) throw Error('Datomic gateway image is not authority-pinned');
  if (spec.storage !== 'dev') throw Error('SQL read-only peer storage is not implemented; durable readback stays refused');
  if (!/^tx2-g03-[a-zA-Z0-9_.-]+$/.test(network ?? '') || !/^tx2-g03-[a-zA-Z0-9_.-]+$/.test(volume ?? '') || !/^\d+$/.test(cpuset ?? '') || sourcePath !== 'packages/datomic/gateway/src') throw Error('unsafe gateway placement/source');
  return { image:spec.imageId, memory:1610612736, cpus:1, pids:256, network, cpuset, unlimitedCpu:true,
    mounts:[{name:volume,target:'/work',rw:false}],
    extra:['--entrypoint','/bin/bash','--network-alias','gateway'],
    env:['DATOMIC_EXT_CLASSPATH=/work/'+sourcePath,'DATOMIC_JAVA_OPTS=-Xms256m -Xmx1g -XX:+ExitOnOutOfMemoryError','DATOMIC_URI=datomic:dev://engine:4334/'],
    argv:['-c','cd /opt/datomic && exec bin/run "$@"','gateway','-e',"(require 'triplex.gateway.main) (alter-var-root (var triplex.gateway.main/base-uri) (constantly (System/getenv \"DATOMIC_URI\"))) (triplex.gateway.main/-main)"], durableReadbackAllowed:false };
}

export function cgroupProofScript(candidateId, selfId) {
  if (![candidateId,selfId].every(x=>/^[0-9a-f]{64}$/.test(x ?? '')) || candidateId === selfId) throw Error('invalid cgroup proof identities');
  return `const fs=require('node:fs');const id=${JSON.stringify(candidateId)},self=${JSON.stringify(selfId)};let visible=false;function walk(p){for(const d of fs.readdirSync(p,{withFileTypes:true})){if(!d.isDirectory())continue;if(d.name.includes(id))throw Error('cgroup survives');if(d.name.includes(self))visible=true;walk(p+'/'+d.name)}}walk('/sys/fs/cgroup');if(!visible)throw Error('host cgroup visibility not proven');console.log('gone')`;
}
export function preflightScript(blocked, port) {
  if (!Array.isArray(blocked) || !blocked.length || !Number.isInteger(port) || port<1 || port>65535) throw Error('invalid preflight targets');
  return `const net=require('node:net'),dns=require('node:dns').promises;function connect(host,port){return new Promise(r=>{let done=false;const s=net.connect({host,port});const end=v=>{if(done)return;done=true;s.destroy();r(v)};s.setTimeout(1000,()=>end(false));s.on('error',()=>end(false));s.on('connect',()=>end(true))})};(async()=>{let positive=false;for(let i=0;i<10&&!positive;i++){positive=await connect('engine',${port});if(!positive)await new Promise(r=>setTimeout(r,100))}const checks=await Promise.all(${JSON.stringify(blocked)}.map(async([h,p])=>[h,p,await connect(h,p)]));let publicDns=false;try{await Promise.race([dns.lookup('example.com'),new Promise((_,r)=>setTimeout(()=>r(Error('timeout')),1000))]);publicDns=true}catch{}console.log(JSON.stringify({positive,checks,publicDns}));process.exit(positive&&!publicDns&&checks.every(x=>!x[2])?0:2)})()`;
}
export function checkPreflight(result, targets) {
  let doc;try { doc=JSON.parse(result.stdout); }catch { throw Error('ISOLATION-NOT-IN-FORCE: unreadable preflight'); }
  if (result.status !== 0 || doc.positive !== true || doc.publicDns !== false || !Array.isArray(doc.checks) || doc.checks.length !== targets.length || doc.checks.some((c,i)=>JSON.stringify(c)!==JSON.stringify([...targets[i],false]))) throw Error('ISOLATION-NOT-IN-FORCE: preflight evidence mismatch/failure');
  return doc;
}

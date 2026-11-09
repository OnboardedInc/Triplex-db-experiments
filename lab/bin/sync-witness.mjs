// [EXP-OBS01-R9] Why: the trusted sync-witness container, its profile check, the VM probe windows W0..W3 and the observer hooks live
// behind engine.mjs (`witness-vm-*`), never in candidate-started code (R48 4.4, Q108a).
// Rejected: starting bpftrace from the observer (the observer parses candidate bytes; CAP_BPF+CAP_PERFMON read kernel memory).
import fs from 'node:fs';
import path from 'node:path';
import {spawn,spawnSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {REPO,ENGINE_DIR,LOCKS,atomicJson,defaultHolder,docker,dockerStats,inspect,listTx2Containers,readJson,sha256,fail,sleep,POOL_FILE} from './lib.mjs';
import {harden,pinImage,remove,reserve,vmAvailable,waitFile} from './vm-observer.mjs';
import {BPFTRACE_VERSION,COMPILE_FLAGS,COMPILE_PLACEHOLDER_ARGS,REQUIRED_HELPER_NAMES,clockPrimitiveVerdict,sha256Hex} from './clock-proof.mjs';
import {deriveHelperIds as deriveBtfHelperIds,parseBtfEnums} from './btf-helpers.mjs';
export {BPFTRACE_VERSION,COMPILE_FLAGS,FORBIDDEN_CLOCK_TOKENS,HELPER_ALLOW_LIST,clockPrimitiveVerdict,forbiddenClockTokens,extractSections,parseCallLine,parseCompiledHelpers,sourceHelperNeeds,sourceProbes,sourceTimeSites} from './clock-proof.mjs';
export {deriveBtfHelperIds,parseBtfEnums};

export const PROGRAM=path.join(REPO,'lab/observer/vm_syncwitness.bt');
export const CLOCK_PROBE=path.join(REPO,'lab/observer/vm_clockprobe.bt');
export const CLOCK_HELPER=path.join(REPO,'lab/observer/vm_clockcheck.py');
export const WITNESS_MEMORY=268435456;
// [EXP-OBS01-R10] Why (R49 section 3): bpftrace 0.20.2 keeps BPFTRACE_MAX_MAP_KEYS=4096 by default and a full map silently drops inserts, so the
// witness sets it explicitly, the profile check refuses anything below the floor, and the value is recorded in the witness meta and W0.json.
// The maps are @dir/@dev (a few keys), @ino (every inode written in the store directory), the tid-keyed in-flight sync maps and @n[cpu];
// 65536 keys of eight small maps cost a few MiB of the 256 MiB cap. Rejected: the 4096 default.
export const MAP_KEYS=65536,MAP_KEYS_FLOOR=16384,MAP_KEYS_CEILING=4194304,PERF_RB_PAGES=1024;
// W0 thresholds, all stated here so a refusal can be read against them. [EXP-OBS01-R11] The clock tolerance is the stated upper bound on one transport
// hop (probe line to its receipt) and the slack the allowed read skew; they are used only by the transport sanity check (clockVerdict). The clock PRIMITIVE
// is proven from the compiled program (clock-proof.mjs), never from these.
export const CLOCK_TOLERANCE_NS=100_000_000,CLOCK_SLACK_NS=1_000_000,CLOCK_MIN_SAMPLES=20,MEMORY_HEADROOM=0.8;
const SRC=path.join(REPO,'lab/observer');
const safe=value=>typeof value==='string'&&/^[a-zA-Z0-9_-]{1,80}$/.test(value);

/** glibc st_dev -> kernel dev_t (major<<20|minor), the encoding of tracepoint dev fields and super_block.s_dev. */
export function kernelDev(stDev){
 const d=BigInt(stDev),major=((d>>8n)&0xfffn)|((d>>32n)&~0xfffn),minor=(d&0xffn)|((d>>12n)&~0xffn);
 return Number((major<<20n)|minor);
}

/** Value of an environment variable in a `docker inspect` document (Config.Env is a list of KEY=VALUE). */
export const envValue=(doc,key)=>{const hit=(doc?.Config?.Env??[]).find(e=>e.startsWith(key+'='));return hit===undefined?undefined:hit.slice(key.length+1);};
const capName=name=>String(name).toUpperCase().replace(/^CAP_/,'');
/** Q108a/R48 4.4: the witness holds only CAP_BPF and CAP_PERFMON and mounts nothing of the candidates'. Returns violations. */
export function verifyWitnessProfile(doc,{volume}={}){
 const bad=[],host=doc?.HostConfig??{},add=(host.CapAdd??[]).map(capName).sort(),drop=(host.CapDrop??[]).map(capName);
 if(JSON.stringify(add)!==JSON.stringify(['BPF','PERFMON']))bad.push('capabilities added must be exactly BPF and PERFMON: '+JSON.stringify(add));
 if(!drop.includes('ALL'))bad.push('CapDrop must include ALL');
 if(host.Privileged)bad.push('privileged');
 if(!host.ReadonlyRootfs)bad.push('root filesystem must be read-only');
 if(host.NetworkMode!=='none')bad.push('network must be none');
 if(host.PidMode)bad.push('pid namespace must be private');
 if(host.IpcMode&&!['private','none',''].includes(host.IpcMode))bad.push('ipc namespace must be private');
 const opts=host.SecurityOpt??[];
 if(!opts.some(o=>o.startsWith('no-new-privileges')))bad.push('no-new-privileges required');
 if(opts.some(o=>/unconfined/.test(o)))bad.push('seccomp/apparmor must not be unconfined (a pinned custom seccomp file is the only allowed change)');
 if((host.Devices??[]).length)bad.push('no devices');
 if(host.Memory!==WITNESS_MEMORY)bad.push('memory cap must be 256 MiB');
 if(host.UsernsMode&&host.UsernsMode!=='')bad.push('user namespace remap changes capability meaning');
 const allowed=new Map([['/sys/kernel/btf','bind'],['/sys/kernel/tracing','bind'],['/program/vm_syncwitness.bt','bind'],['/witness','volume']]);
 for(const mount of doc?.Mounts??[]){
  if(allowed.get(mount.Destination)!==mount.Type)bad.push('unexpected mount '+mount.Destination);
  else if(mount.Destination==='/witness'&&(!volume||mount.Name!==volume))bad.push('witness volume is not the run volume');
  else if(mount.Destination!=='/witness'&&mount.RW)bad.push('mount must be read-only '+mount.Destination);
 }
 if(!/@sha256:[a-f0-9]{64}$|^sha256:[a-f0-9]{64}$/.test(doc?.Config?.Image??''))bad.push('image must be pinned by digest');
 if(doc?.Config?.User&&doc.Config.User!=='0'&&doc.Config.User!=='root')bad.push('witness runs as root inside its container; no other user');
 const keys=envValue(doc,'BPFTRACE_MAX_MAP_KEYS');
 if(!/^[0-9]+$/.test(keys??'')||Number(keys)<MAP_KEYS_FLOOR||Number(keys)>MAP_KEYS_CEILING)bad.push('BPFTRACE_MAX_MAP_KEYS must be set between '+MAP_KEYS_FLOOR+' and '+MAP_KEYS_CEILING+' (default 4096 silently drops map inserts): '+keys);
 if(!/^[0-9]+$/.test(envValue(doc,'BPFTRACE_PERF_RB_PAGES')??''))bad.push('BPFTRACE_PERF_RB_PAGES must be set');
 return bad;
}

/** Create arguments for the witness (pure). `dirs` are [kernelDev, dirInode] pairs; one pair is repeated when only one directory is witnessed. */
export function witnessCreateArgs({name,holder,image,cpu,volume,dirs,perfPages=PERF_RB_PAGES,mapKeys=MAP_KEYS}){
 if(!Array.isArray(dirs)||!dirs.length||dirs.length>2||dirs.some(d=>d.length!==2||d.some(v=>!Number.isSafeInteger(v)||v<0)))fail('USAGE','one or two [kernel dev, directory inode] pairs required');
 if(!Number.isSafeInteger(mapKeys)||mapKeys<MAP_KEYS_FLOOR||mapKeys>MAP_KEYS_CEILING)fail('USAGE','BPFTRACE_MAX_MAP_KEYS must be between '+MAP_KEYS_FLOOR+' and '+MAP_KEYS_CEILING);
 const pair=[dirs[0],dirs[1]??dirs[0]];
 return harden(name,holder,image,cpu,['--cap-add','BPF','--cap-add','PERFMON','--entrypoint','bpftrace','-e','BPFTRACE_PERF_RB_PAGES='+perfPages,'-e','BPFTRACE_MAX_MAP_KEYS='+mapKeys,
  '-v',volume+':/witness','-v','/sys/kernel/btf:/sys/kernel/btf:ro','-v','/sys/kernel/tracing:/sys/kernel/tracing:ro','-v',PROGRAM+':/program/vm_syncwitness.bt:ro'],
  // [EXP-OBS01-R15] Why (harness bug, found in the first live W0): bpftrace 0.20.2 fully buffers `-o FILE` output, so the BEGIN record `SW1|B|` stayed in the stdio buffer and the
  // session's attach wait (20 s polling that record) refused although the program had attached (verified by hand: SIGINT flushed `SW1|B|` and `SW1|Z|`). `-B none` writes each record as it is
  // produced, which also leaves a readable trace if the witness is killed. Rejected: waiting for the END flush (the attach check would then run after the writer); a longer wait (the buffer is
  // 4 KiB or more, no deadline is right).
  ['-q','-B','none','-o','/witness/trace.txt','/program/vm_syncwitness.bt',...pair.flat().map(String)]);
}

/** Q108a start condition: no exclusive slot is held and the pool/disk guard of vmAvailable holds. Pure over a ledger and the running list. */
export function exclusiveHeld(ledger,running){
 const slot=/^tx2-(xtdb|qlever|datomic)-s[0-9]+$/;
 return [...(ledger?.reservations??[]).filter(r=>slot.test(r.container)).map(r=>r.container),...running.filter(c=>c.running&&slot.test(c.name)).map(c=>c.name)];
}
export function witnessPreflight(config){
 const base=vmAvailable(config),held=exclusiveHeld(readJson(POOL_FILE(),{reservations:[]}),listTx2Containers());
 return {...base,exclusiveHeld:held,available:base.available&&!held.length};
}

/** Nearest-rank percentile (no interpolation), as the round-6 probe computes p99. */
export const nearestRank=(values,q)=>{const sorted=[...values].sort((a,b)=>a-b);return sorted[Math.max(0,Math.ceil(sorted.length*q)-1)];};
/** Added kernel time per commit from cumulative BPF run-time samples [{t,runTimeNs,runCnt}] and commit instants (same clock). */
export function perCommitCost(samples,commitNs){
 const rows=[];
 for(let i=1;i<samples.length;i++){
  const a=samples[i-1],b=samples[i],commits=commitNs.filter(t=>t>a.t&&t<=b.t).length;
  if(b.runTimeNs<a.runTimeNs||b.runCnt<a.runCnt)fail('REFUSED','BPF run-time counters went backwards');
  if(commits>0)rows.push({from:a.t,to:b.t,commits,deltaNs:b.runTimeNs-a.runTimeNs,deltaCalls:b.runCnt-a.runCnt,perCommitNs:(b.runTimeNs-a.runTimeNs)/commits});
 }
 if(!rows.length)fail('REFUSED','no commit fell inside a counter interval');
 return {intervals:rows,p99PerCommitNs:nearestRank(rows.map(r=>r.perCommitNs),.99),maxPerCommitNs:Math.max(...rows.map(r=>r.perCommitNs)),meanPerCommitNs:rows.reduce((s,r)=>s+r.deltaNs,0)/rows.reduce((s,r)=>s+r.commits,0)};
}


// ------------------------------------------------------------------ W0 verdicts (R49 section 6 and 7; pure, unit-tested, not yet run in a VM)
/**
 * TRANSPORT SANITY CHECK of the probe's `nsecs(monotonic)` against independent local references. It does NOT prove which clock the probe read, and W0
 * does not pass its clock step on it (that is clockPrimitiveVerdict, from the compiled program). samples: [{monotonicNs,bootNs,receivedNs,
 * receivedBootNs,receivedAfterNs}] from vm_clockcheck.py, where receivedNs/receivedAfterNs are the local CLOCK_MONOTONIC reads before/after the local
 * CLOCK_BOOTTIME read receivedBootNs. Writing hop = receivedNs - monotonicNs (transport delay L >= 0 when the value is monotonic):
 *  - INCONSISTENT: the value cannot be a CLOCK_MONOTONIC reading taken before its receipt (it runs ahead of the receipt by more than the slack, goes
 *    backwards, lags by more than the tolerance) or the record is malformed/missing.
 *  - CONSISTENT: the data fit monotonic AND exclude a CLOCK_BOOTTIME reading: a boot-valued sample would have hop = L - separation <= tolerance -
 *    separation, so the measured minimum hop plus the lower bound of the local separation must exceed tolerance + slack. Needs independent references.
 *  - INCONCLUSIVE: anything else, in particular a separation (boot minus monotonic, the guest's suspended time, often zero) not larger than the
 *    uncertainty (the transport tolerance plus the slack, less the measured minimum hop). Never a pass.
 */
export function clockVerdict(samples,{toleranceNs=CLOCK_TOLERANCE_NS,slackNs=CLOCK_SLACK_NS,minSamples=CLOCK_MIN_SAMPLES}={}){
 const out=(status,reasons,extra={})=>({status,pass:status==='CONSISTENT',reasons,toleranceNs,slackNs,...extra});
 if(!Array.isArray(samples)||samples.length<minSamples)return out('INCONSISTENT',['need at least '+minSamples+' clock samples, got '+(samples?.length??0)]);
 const integer=v=>Number.isSafeInteger(v)&&v>=0,optional=v=>v===undefined||v===null||integer(v);
 if(samples.some(r=>![r?.monotonicNs,r?.bootNs,r?.receivedNs].every(integer)||!optional(r?.receivedBootNs)||!optional(r?.receivedAfterNs)))return out('INCONSISTENT',['clock sample with a non-integer or negative field']);
 const withRefs=samples.every(r=>integer(r.receivedBootNs)&&integer(r.receivedAfterNs)),partialRefs=!withRefs&&samples.some(r=>r.receivedBootNs!=null||r.receivedAfterNs!=null);
 if(partialRefs||(withRefs&&samples.some(r=>r.receivedAfterNs<r.receivedNs)))return out('INCONSISTENT',['independent clock references are partial or out of order']);
 const bad=[],hops=samples.map(r=>r.receivedNs-r.monotonicNs),minHop=Math.min(...hops),maxHop=Math.max(...hops),mono=samples.map(r=>r.monotonicNs);
 if(mono.some((v,i)=>i>0&&v<mono[i-1]))bad.push('nsecs(monotonic) went backwards between samples');
 if(minHop<-slackNs)bad.push('nsecs(monotonic) runs ahead of the independent CLOCK_MONOTONIC reference by '+(-minHop)+' ns (slack '+slackNs+' ns)');
 if(minHop>toleranceNs)bad.push('nsecs(monotonic) lags the independent CLOCK_MONOTONIC reference by at least '+minHop+' ns, beyond the '+toleranceNs+' ns tolerance');
 const probeOffsets=samples.map(r=>r.bootNs-r.monotonicNs).sort((a,b)=>a-b),base={samples:samples.length,minHopNs:minHop,maxHopNs:maxHop,probeBootMinusMonotonicNs:probeOffsets[Math.floor(probeOffsets.length/2)]};
 if(bad.length)return out('INCONSISTENT',bad,base);
 if(!withRefs)return out('INCONCLUSIVE',['no independent local CLOCK_BOOTTIME reference was recorded; the observation cannot separate the two clocks'],base);
 const separationNs=Math.min(...samples.map(r=>r.receivedBootNs-r.receivedAfterNs)),uncertaintyNs=toleranceNs+slackNs-minHop,readBracketNs=Math.max(...samples.map(r=>r.receivedAfterNs-r.receivedNs));
 const facts={...base,separationNs,uncertaintyNs,readBracketNs};
 if(separationNs>uncertaintyNs)return out('CONSISTENT',[],facts);
 return out('INCONCLUSIVE',['clock identity not established by observation: separation of CLOCK_BOOTTIME from CLOCK_MONOTONIC ('+separationNs+' ns) is not larger than the measured uncertainty ('+uncertaintyNs+' ns)'],facts);
}

/** perf_event_paranoid and the attach it governs. tracepointAttach is the result of attaching a tracepoint with ONLY the witness capabilities
 * (CAP_BPF + CAP_PERFMON): tracepoints go through perf_event_open, where Ubuntu's paranoid level 4 can demand CAP_SYS_ADMIN (R49 section 6 item 5, [E]).
 * The witness must never be given more capabilities to get around it: a failure is a refusal that names the level. */
export function perfParanoidVerdict({paranoid,tracepointAttach}){
 const recorded=Number.isInteger(paranoid)?paranoid:null;
 if(recorded===null)return {pass:false,paranoid:recorded,reasons:['kernel.perf_event_paranoid not recorded']};
 if(!tracepointAttach||tracepointAttach.ok!==true)return {pass:false,paranoid:recorded,reasons:['CAP_PERFMON alone is not enough to attach a tracepoint at kernel.perf_event_paranoid='+recorded+' ('+(tracepointAttach?.detail??'no attach result')+'); the witness may not hold CAP_SYS_ADMIN']};
 return {pass:true,paranoid:recorded,reasons:[]};
}

/** Peak witness memory (cgroup memory.peak) against the 256 MiB cap: refuse above MEMORY_HEADROOM of the cap or on any OOM kill. */
export function memoryVerdict({peakBytes,oomKills},capBytes=WITNESS_MEMORY){
 const bad=[];
 if(!Number.isSafeInteger(peakBytes)||peakBytes<0)return {pass:false,reasons:['witness memory.peak not recorded'],capBytes};
 if(!Number.isSafeInteger(oomKills)||oomKills<0)bad.push('witness oom_kill count not recorded');
 else if(oomKills>0)bad.push('witness container was OOM-killed '+oomKills+' time(s)');
 if(peakBytes>capBytes*MEMORY_HEADROOM)bad.push('peak '+peakBytes+' B exceeds '+MEMORY_HEADROOM*100+'% of the '+capBytes+' B cap');
 return {pass:bad.length===0,reasons:bad,peakBytes,oomKills,capBytes,headroomFraction:MEMORY_HEADROOM};
}

/** ext4 must be built in: a module has its own BTF file (/sys/kernel/btf/ext4) and `vmlinux:` would not resolve; every probe must list by its exact name. */
export function ext4BuiltinVerdict({ext4BtfPresent,listing}){
 const bad=[];
 if(ext4BtfPresent!==false)bad.push('/sys/kernel/btf/ext4 must be absent (ext4 built in), got '+ext4BtfPresent);
 for(const [probe,out] of Object.entries(listing??{}))if(!String(out??'').split('\n').some(l=>l.trim()===probe))bad.push('bpftrace -l did not resolve '+probe);
 if(!Object.keys(listing??{}).length)bad.push('no probe listing recorded');
 return {pass:bad.length===0,reasons:bad};
}

/** BPFTRACE_MAX_MAP_KEYS the witness actually ran with, recorded and checked against the floor. */
export function mapKeysVerdict({configured}){
 const ok=Number.isSafeInteger(configured)&&configured>=MAP_KEYS_FLOOR&&configured<=MAP_KEYS_CEILING;
 return {pass:ok,configured:configured??null,floor:MAP_KEYS_FLOOR,reasons:ok?[]:['BPFTRACE_MAX_MAP_KEYS '+configured+' outside '+MAP_KEYS_FLOOR+'..'+MAP_KEYS_CEILING]};
}

/** W0 as a whole: every item recorded and every check passing. facts come from windowW0. [EXP-OBS01-R11] The clock step passes on the program proof
 * (clockPrimitiveVerdict) only, and since R13 (Q109a) that proof gates on the static source check, the pinned hash and version, clean process statuses and the forbidden-token
 * scan of the dump (the structured parse is `diagnostic`, not gating); the observational transport check is recorded and blocks W0 only when it is INCONSISTENT (a contradiction), never when
 * INCONCLUSIVE, and never substitutes for the proof. */
export function judgeW0(facts){
 const transport=clockVerdict(facts.clockSamples),checks={clock:clockPrimitiveVerdict(facts.clockProgram),
  clockTransport:{pass:transport.status!=='INCONSISTENT',status:transport.status,reasons:transport.status==='INCONSISTENT'?transport.reasons:[],detail:transport},
  perf:perfParanoidVerdict({paranoid:facts.paranoid,tracepointAttach:facts.tracepointAttach}),
  memory:memoryVerdict({peakBytes:facts.attach?.witnessCgroup?.memoryPeakBytes,oomKills:facts.attach?.witnessCgroup?.oomKills}),
  ext4:ext4BuiltinVerdict({ext4BtfPresent:facts.ext4BtfPresent,listing:facts.listing}),mapKeys:mapKeysVerdict({configured:facts.attach?.witnessCgroup?.maxMapKeys}),
  attach:{pass:Boolean(facts.attach?.pass),reasons:facts.attach?.pass?[]:['witness attach session did not pass']}};
 const reasons=Object.entries(checks).flatMap(([name,c])=>c.pass?[]:c.reasons.map(r=>name+': '+r));
 return {pass:reasons.length===0,reasons,checks,clockIdentity:{provenBy:'compiled program',program:checks.clock.pass,observational:transport.status}};
}

const vm=(args,opts={})=>spawnSync('colima',['ssh','-p','triplex2','--',...args],{encoding:'utf8',maxBuffer:64*1024**2,...opts});
/** Cgroup id (directory inode) of a container in the triplex2 VM; equals bpf_get_current_cgroup_id() for its tasks (cgroup v2). */
export function vmCgroupId(containerId){
 if(!/^[0-9a-f]{64}$/.test(containerId))fail('USAGE','full container id required');
 const out=vm(['find','/sys/fs/cgroup','-maxdepth','5','-name','docker-'+containerId+'.scope','-printf','%i\\n']);
 const ids=out.stdout.split('\n').filter(Boolean);
 if(out.status!==0||ids.length!==1||!/^[0-9]+$/.test(ids[0]))fail('REFUSED','container cgroup id not unique/visible: '+out.stderr);
 return Number(ids[0]);
}

/** Cgroup directory of a container in the triplex2 VM (unique docker-<id>.scope). */
export function vmCgroupDir(containerId){
 if(!/^[0-9a-f]{64}$/.test(containerId))fail('USAGE','full container id required');
 const out=vm(['find','/sys/fs/cgroup','-maxdepth','5','-name','docker-'+containerId+'.scope','-print']);
 const dirs=out.stdout.split('\n').filter(Boolean);
 if(out.status!==0||dirs.length!==1)fail('REFUSED','container cgroup directory not unique/visible: '+out.stderr);
 return dirs[0];
}
/** Parse `memory.events` ("oom_kill 0" lines) into a count; null when the line is absent. */
export const oomKillsOf=text=>{const m=/^oom_kill\s+([0-9]+)$/m.exec(text??'');return m?Number(m[1]):null;};
/** R49 W0: peak memory and OOM kills of the running witness (cgroup v2 memory.peak / memory.events) and the map-key setting it was created with. */
export function witnessCgroupFacts(name){
 const doc=inspect(name),dir=vmCgroupDir(doc.Id),peak=vm(['cat',dir+'/memory.peak']),events=vm(['cat',dir+'/memory.events']);
 return {cgroupDir:dir,memoryPeakBytes:peak.status===0&&/^[0-9]+$/.test(peak.stdout.trim())?Number(peak.stdout.trim()):null,oomKills:events.status===0?oomKillsOf(events.stdout):null,
  maxMapKeys:Number(envValue(doc,'BPFTRACE_MAX_MAP_KEYS')),perfRbPages:Number(envValue(doc,'BPFTRACE_PERF_RB_PAGES')),memoryCapBytes:doc.HostConfig?.Memory??null};
}

async function helper(config,holder,image,cpu,extra,argv){
 const name='tx2-sw-helper-'+randomBytes(6).toString('hex');await reserve(config,name,holder,cpu);
 try{docker(harden(name,holder,image,cpu,extra,argv));const out=docker(['start','-a',name]);const end=inspect(name);if(end.State.ExitCode!==0)fail('REFUSED','helper failed');return out;}
 finally{await remove(name,holder);}
}
const KERNEL_FACTS="import json,pathlib,os;print(json.dumps({'kernelRelease':os.uname().release,'bootId':pathlib.Path('/proc/sys/kernel/random/boot_id').read_text().strip()}))";
/** Trusted store directory on a fresh volume: creates it (sticky 1777, owned by root so the candidate cannot replace it) and returns [kernel dev, inode]. */
async function makeStoreDir(config,holder,image,volume){
 const out=await helper(config,holder,image,5,['-v',volume+':/data'],['python3','-B','-c',"import os,json;os.mkdir('/data/store');os.chmod('/data/store',0o1777);s=os.stat('/data/store');print(json.dumps([s.st_dev,s.st_ino]))"]);
 const [dev,ino]=JSON.parse(out);return [kernelDev(dev),ino];
}

/** Observer hook: profile-check the running witness and bind it into the case (called by observer-vm-up). */
export async function witnessUp(config,holder,spec,mounts){
 const w=spec.witness,doc=inspect(w.container);
 if(!doc?.State.Running||doc.Config.Labels?.['tx2.holder']!==holder)fail('REFUSED','witness container identity/holder');
 const bad=verifyWitnessProfile(doc,{volume:w.volume});if(bad.length)fail('REFUSED','witness profile: '+bad.join('; '));
 if(typeof w.firstCandidateStartNs!=='number'||!w.stores)fail('REFUSED','witness firstCandidateStartNs and stores required');
 const stores={};
 for(const source of spec.sources){const c=inspect(source.container),bind=w.stores[source.id];
  if(!bind||!Array.isArray(bind.dir))fail('REFUSED','witness store binding missing for '+source.id);
  stores[source.id]={dir:bind.dir,cgroupId:bind.cgroupId??vmCgroupId(c.Id)};}
 mounts.push('-v',w.volume+':/witness:ro');
 spec.witness={containerId:doc.Id,pid:doc.State.Pid,programSha256:sha256(fs.readFileSync(PROGRAM)),kernelRelease:w.kernelRelease??null,firstCandidateStartNs:w.firstCandidateStartNs,
  stores,metaPath:'/witness/meta.json',tracePath:'/witness/trace.txt',stderrPath:'/witness/stderr.txt'};
 return {container:w.container,volume:w.volume};
}

/** Observer-stop hook: after the observer's final readbacks, detach the witness (END probe), add its meta/stderr and release the observer. */
export async function witnessStop(config,holder,saved,dir,options){
 const finals=path.join(dir,'control/finals-done');for(let i=0;i<900&&!fs.existsSync(finals);i++)await sleep(100);
 if(!fs.existsSync(finals))fail('REFUSED','observer did not finish the final readbacks');
 const name=saved.witness.container,doc=inspect(name);if(doc?.Config.Labels?.['tx2.holder']!==holder)fail('REFUSED','foreign witness');
 if(doc.State.Running)docker(['kill','--signal','INT',name]);
 for(let i=0;i<600&&inspect(name)?.State.Running;i++)await sleep(100);
 if(inspect(name)?.State.Running)fail('REFUSED','witness did not detach after SIGINT');
 const facts=JSON.parse(await helper(config,holder,pinImage(options.image??saved.image),5,[],['python3','-B','-c',KERNEL_FACTS]));
 const meta={programSha256:sha256(fs.readFileSync(PROGRAM)),bootId:facts.bootId,kernelRelease:facts.kernelRelease,containerId:doc.Id,imageDigest:doc.Image,maxMapKeys:Number(envValue(doc,'BPFTRACE_MAX_MAP_KEYS')),perfRbPages:Number(envValue(doc,'BPFTRACE_PERF_RB_PAGES'))};
 const tmp=fs.mkdtempSync(path.join(dir,'witness-files-'));fs.writeFileSync(path.join(tmp,'meta.json'),JSON.stringify(meta));
 const logs=spawnSync('docker',['-H',process.env.TX2_DOCKER_HOST??'unix:///Users/sam/.colima/triplex2/docker.sock','logs',name],{encoding:'utf8'});fs.writeFileSync(path.join(tmp,'stderr.txt'),logs.stderr??'');
 for(const file of ['meta.json','stderr.txt'])docker(['cp',path.join(tmp,file),name+':/witness/'+file]);
 fs.writeFileSync(path.join(dir,'control/witness-done'),'done');
}

// ------------------------------------------------------------------ probe windows W0..W3 (R48 9.1)
const SOCK='unix:///Users/sam/.colima/triplex2/docker.sock';
const run=(args,opts={})=>spawnSync(args[0],args.slice(1),{encoding:'utf8',maxBuffer:256*1024**2,...opts});
const judgeScript=path.join(SRC,'vm_syncwitness.py');
// [EXP-OBS01-R9] Why: -B -E -s keeps the environment isolated but, unlike -I (which implies -P from Python 3.11), still finds sibling modules.
const py=(script,...args)=>run(['python3','-B','-E','-s',script,...args]);

/**
 * One witnessed session: fresh data and witness volumes, a trusted store directory, the witness attached first, then the writer.
 * plan: {mode, count, withNeighbor, sample, writerArgv, ready, done, copy, judge, readers:{containers,threads}, sampleStats}
 */
async function witnessSession(ctx,plan){
 const {config,holder,python,bpftrace,out,nonce}=ctx,{mode}=plan,tag=`${nonce}-${mode}`,volume=`tx2-sw-${tag}-data`,witnessVolume=`tx2-sw-${tag}-witness`,dir=path.join(out,plan.dirName??mode);fs.mkdirSync(dir,{recursive:true});
 const control=path.join(dir,'writer');fs.mkdirSync(control);const names={witness:`tx2-sw-witness-${tag}`,writer:`tx2-sw-writer-${tag}`,neighbor:`tx2-sw-neighbor-${tag}`};const made=[],volumes=[],result={mode};
 try{
  for(const v of [volume,witnessVolume]){docker(['volume','create','--label',`tx2.holder=${holder}`,'--label',`tx2.run=${tag}`,v]);volumes.push(v);}
  const store=await makeStoreDir(config,holder,python,volume);result.dir=store;
  await reserve(config,names.witness,holder,5);made.push(names.witness);
  docker(witnessCreateArgs({name:names.witness,holder,image:bpftrace,cpu:5,volume:witnessVolume,dirs:[store]}));
  const profile=verifyWitnessProfile(inspect(names.witness),{volume:witnessVolume});result.profileViolations=profile;if(profile.length)fail('REFUSED','witness profile: '+profile.join('; '));
  docker(['start',names.witness]);
  for(let i=0;i<200;i++){const first=docker(['cp',names.witness+':/witness/trace.txt','-'],{allowFail:true});if(first&&first.includes('SW1|B|'))break;if(i===199||!inspect(names.witness)?.State.Running)fail('REFUSED','witness did not attach (TRACE-INCOMPLETE): '+(run(['docker','-H',SOCK,'logs',names.witness]).stderr??''));await sleep(100);}
  result.attachedWallMs=Date.now();
  if(plan.withNeighbor){await reserve(config,names.neighbor,holder,3);made.push(names.neighbor);docker(harden(names.neighbor,holder,python,3,['--cgroupns','host'],['python3','-B','-c','import os,time\nwhile True:\n os.sync();time.sleep(.01)']));docker(['start',names.neighbor]);}
  const mounts=['--cgroupns','host','--user','10001:10001','-v',volume+':/data','-v',SRC+':/code:ro','-v',control+':/control'];
  await reserve(config,names.writer,holder,4);made.push(names.writer);
  docker(harden(names.writer,holder,python,4,mounts,plan.writerArgv??['python3','-B','/code/vm_planted_writer.py','--mode',mode,'--dir','/data/store','--control','/control','--count',String(plan.count??1000)]));
  docker(['start',names.writer]);await waitFile(path.join(control,'ready'),names.writer);
  const writerDoc=inspect(names.writer);result.writerId=writerDoc.Id;result.writerCgroupId=vmCgroupId(writerDoc.Id);
  const readers=[];
  for(let i=0;i<(plan.readers?.containers??0);i++){const name=`tx2-sw-reader-${tag}-${i}`;await reserve(config,name,holder,'2,3');made.push(name);readers.push(name);
   docker(harden(name,holder,python,'2,3',mounts,['python3','-B','/code/vm_w3_load.py','reader','--dir','/data/store','--control','/control','--seconds',String(plan.seconds),'--threads',String(plan.readers.threads),'--tag',String(i)]));docker(['start',name]);}
  for(let i=0;i<readers.length;i++)await waitFile(path.join(control,'reader-ready-'+i),readers[i]);
  const sampler=plan.sample?await plan.sample(ctx,names.witness,dir):null;
  const stats=[];let polling=null;if(plan.sampleStats)polling=setInterval(()=>{const row=dockerStats().find(r=>r.name===names.witness);if(row)stats.push(row.cpuPercent);},15000);
  fs.writeFileSync(path.join(control,'go'),'go');await waitFile(path.join(control,plan.done??'ops.json'),names.writer,(plan.seconds??180)*1000+180000);
  if(polling)clearInterval(polling);result.witnessCpuPercent=stats.length?{samples:stats.length,mean:stats.reduce((a,b)=>a+b,0)/stats.length,max:Math.max(...stats)}:null;
  if(sampler)result.cost=await sampler.finish();
  for(const n of [names.writer,...(plan.withNeighbor?[names.neighbor]:[]),...readers])docker(['kill','--signal','KILL',n]);
  if(plan.captureWitness)result.witnessCgroup=witnessCgroupFacts(names.witness);      // while the witness still runs: memory.peak dies with the cgroup
  docker(['kill','--signal','INT',names.witness]);for(let i=0;i<1200&&inspect(names.witness)?.State.Running;i++)await sleep(100);
  if(inspect(names.witness)?.State.Running)fail('REFUSED','witness did not detach');
  docker(['cp',names.witness+':/witness/trace.txt',path.join(dir,'trace.txt')]);fs.writeFileSync(path.join(dir,'stderr.txt'),run(['docker','-H',SOCK,'logs',names.witness]).stderr??'');
  for(const f of plan.copy??['ops.json','wal.bin','main.bin'])fs.copyFileSync(path.join(control,f),path.join(dir,f));
  if(plan.judge!==false){const judged=py(judgeScript,dir,String(result.writerCgroupId));result.judge={status:judged.status,stdout:judged.stdout.trim(),stderr:judged.stderr.trim()};result.pass=judged.status===0;}
  else{const checked=py(judgeScript,'stream-check',path.join(dir,'trace.txt'),path.join(dir,'stderr.txt'));result.streamCheck={status:checked.status,stdout:checked.stdout.trim(),stderr:checked.stderr.trim()};result.pass=checked.status===0;}
 }finally{
  for(const name of made.reverse())await remove(name,holder);
  for(const v of volumes)if(docker(['volume','inspect',v],{allowFail:true}))docker(['volume','rm',v]);
  atomicJson(path.join(dir,'RESULT.json'),result);
 }
 return result;
}

/** W2 sampler: sums run_time_ns/run_cnt from the witness process's BPF program fdinfo every 20 ms, as VM root, until stopped. */
async function bpfSampler(ctx,witnessName,dir){
 const pid=inspect(witnessName).State.Pid,stop=path.join(dir,'sampler-stop'),file=path.join(dir,'bpf-samples.jsonl');
 const code=["import json,os,sys,time",`pid=${pid};stop=${JSON.stringify(stop)}`,"while not os.path.exists(stop):","    rt=rc=0","    for fd in os.listdir('/proc/%d/fdinfo'%pid):","        t=open('/proc/%d/fdinfo/%s'%(pid,fd)).read()","        if 'prog_id:' in t:","            for l in t.splitlines():","                if l.startswith('run_time_ns:'):rt+=int(l.split()[1])","                if l.startswith('run_cnt:'):rc+=int(l.split()[1])","    print(json.dumps({'t':time.monotonic_ns(),'runTimeNs':rt,'runCnt':rc}),flush=True)","    time.sleep(.02)"].join('\n');
 const child=spawn('colima',['ssh','-p','triplex2','--','sudo','python3','-c',code],{stdio:['ignore',fs.openSync(file,'w'),'inherit']});
 return {async finish(){
  fs.writeFileSync(stop,'stop');await new Promise(done=>child.on('exit',done));
  const samples=fs.readFileSync(file,'utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l));
  const ops=JSON.parse(fs.readFileSync(path.join(dir,'writer/ops.json')));
  const cost=perCommitCost(samples,ops.acks.map(a=>a.atNs));return {...cost,samples:samples.length,intervalCount:cost.intervals.length,gateNs:100000,pass:cost.p99PerCommitNs<=100000};
 }};
}

/** One short bpftrace container under the witness profile (or a stated variant); returns stdout, stderr and the exit code. Never pulls.
 * entrypoint overrides the entrypoint (the same image's sha256sum); timeoutMs kills a container that does not finish (reported as timedOut). */
async function bpftraceOnce(ctx,tag,argv,{mounts=[],caps=['BPF','PERFMON'],entrypoint='bpftrace',timeoutMs=null}={}){
 const name='tx2-sw-w0-'+tag+'-'+randomBytes(4).toString('hex');await reserve(ctx.config,name,ctx.holder,5);
 try{
  docker(harden(name,ctx.holder,ctx.bpftrace,5,[...caps.flatMap(c=>['--cap-add',c]),'--entrypoint',entrypoint,'-e','BPFTRACE_MAX_MAP_KEYS='+MAP_KEYS,'-e','BPFTRACE_PERF_RB_PAGES='+PERF_RB_PAGES,
   '-v','/sys/kernel/btf:/sys/kernel/btf:ro','-v','/sys/kernel/tracing:/sys/kernel/tracing:ro',...mounts],argv));
  if(timeoutMs===null){
   const stdout=docker(['start','-a',name],{allowFail:true})??'',doc=inspect(name),logs=run(['docker','-H',SOCK,'logs',name]);
   return {stdout,stderr:logs.stderr??'',exitCode:doc?.State.ExitCode??null,signal:null,timedOut:false,error:null};
  }
  const done=run(['docker','-H',SOCK,'start','-a',name],{timeout:timeoutMs,killSignal:'SIGKILL'}),timedOut=done.error?.code==='ETIMEDOUT';
  // [EXP-OBS01-R12] Why (A1): the signal and any spawn error are recorded next to the exit status so the clock proof can require a clean completion. Rejected: exit code alone.
  return {stdout:done.stdout??'',stderr:done.stderr??'',exitCode:timedOut?null:done.status,signal:done.signal??null,timedOut,error:done.error&&!timedOut?String(done.error.code??done.error.message):null};
 }finally{await remove(name,ctx.holder);}
}

/**
 * R49/R10-F3 W0 clock primitive step (a): bind the pinned program and the bpftrace version, ask that same bpftrace image for its compiled program, record
 * it. The sha256 is computed by the same image on the mounted file (not by the harness on its own copy), and compared with the harness's hash of the
 * pinned file read before and after. The dump uses placeholder positional arguments (only constants differ). Output goes to <out>/w0-compiled-program.txt
 * (can exceed 1 MB: durable evidence, not git, rule 9c).
 * [EXP-OBS01-R12] Every container's exit status, signal, timeout and spawn error are passed to the verdict (A1), and the helper ids come from the running kernel's
 * BTF read by the same image (`base64 -w0 /sys/kernel/btf/vmlinux`, decoded here; a truncated or corrupt transfer fails the strict BTF parser). The derived enum is
 * written to <out>/w0-bpf-func-id-enum.json; the 5 MB BTF itself is identified by its sha256 and size, not copied.
 */
async function clockProgramStep(ctx){
 const bind=['-v',PROGRAM+':/program/vm_syncwitness.bt:ro'],before=fs.readFileSync(PROGRAM),expected=sha256Hex(before);
 const version=await bpftraceOnce(ctx,'version',['--version'],{timeoutMs:60000});
 const hashed=await bpftraceOnce(ctx,'sha',['/program/vm_syncwitness.bt'],{mounts:bind,entrypoint:'sha256sum',timeoutMs:60000});
 const btfRun=await bpftraceOnce(ctx,'btf',['-w0','/sys/kernel/btf/vmlinux'],{entrypoint:'base64',timeoutMs:120000});
 const btfBytes=Buffer.from(btfRun.stdout.replace(/\s+/g,''),'base64');
 const compiled=await bpftraceOnce(ctx,'compile',[...COMPILE_FLAGS,'/program/vm_syncwitness.bt',...COMPILE_PLACEHOLDER_ARGS],{mounts:bind,timeoutMs:120000});
 const after=fs.readFileSync(PROGRAM);
 const dumpPath=path.join(ctx.out,'w0-compiled-program.txt'),dumpFile='--- stdout ---\n'+compiled.stdout+'\n--- stderr ---\n'+compiled.stderr+'\n';fs.writeFileSync(dumpPath,dumpFile);
 const dumpFileSha256=sha256Hex(Buffer.from(dumpFile));   // [EXP-OBS01-R13] Why (Q109a gate 3): the full dump is recorded with its hash; the verdict carries the hash of the exact text it scanned (compiledSha256), this is the hash of the file. Rejected: embedding the dump in the verdict (may exceed 1 MB, rule 9c).
 const status=r=>({exitCode:r.exitCode,signal:r.signal,timedOut:r.timedOut,error:r.error});
 const facts={expectedSourceSha256:sha256Hex(after)===expected?expected:null,mountedSourceSha256:(/^([0-9a-f]{64})\s/.exec(hashed.stdout)??[])[1]??null,sourceText:before.toString('utf8'),versionOutput:version.stdout,
  versionRun:status(version),hashRun:status(hashed),btf:{...status(btfRun),bytes:btfBytes},compiled};
 const derived=deriveBtfHelperIds(btfBytes,REQUIRED_HELPER_NAMES),enumPath=path.join(ctx.out,'w0-bpf-func-id-enum.json');
 fs.writeFileSync(enumPath,JSON.stringify({btfSha256:derived.btfSha256,btfBytes:derived.btfBytes,typeCount:derived.typeCount,enumKind:derived.enumKind,ok:derived.ok,reasons:derived.reasons,ids:derived.ids},null,1)+'\n');
 return {facts,image:ctx.bpftrace,dumpPath,dumpFileSha256,enumPath,exitCodes:{version:version.exitCode,sha:hashed.exitCode,btf:btfRun.exitCode,compile:compiled.exitCode},versionStderr:version.stderr};
}

/** R49 W0 clock step: the clock probe container streams CK lines through vm_clockcheck.py running in the VM, which stamps its own CLOCK_MONOTONIC on receipt. */
async function clockStep(ctx){
 const name='tx2-sw-w0-clock-'+randomBytes(4).toString('hex');await reserve(ctx.config,name,ctx.holder,5);
 try{
  docker(harden(name,ctx.holder,ctx.bpftrace,5,['--cap-add','BPF','--cap-add','PERFMON','--entrypoint','bpftrace','-e','BPFTRACE_MAX_MAP_KEYS='+MAP_KEYS,
   '-v','/sys/kernel/btf:/sys/kernel/btf:ro','-v','/sys/kernel/tracing:/sys/kernel/tracing:ro','-v',CLOCK_PROBE+':/program/vm_clockprobe.bt:ro'],['-q','/program/vm_clockprobe.bt']));
  const out=vm(['python3','-c',fs.readFileSync(CLOCK_HELPER,'utf8'),'--','docker','start','-a',name]);
  const samples=out.stdout.split('\n').filter(Boolean).map(l=>{try{return JSON.parse(l);}catch{return null;}});
  return {status:out.status,stderr:out.stderr,samples:samples.filter(Boolean),unparsed:samples.filter(r=>r===null).length};
 }finally{await remove(name,ctx.holder);}
}

async function windowW0(ctx){
 const facts={uname:vm(['uname','-a']).stdout.trim(),btf:vm(['ls','-l','/sys/kernel/btf/vmlinux']).stdout.trim(),lockdown:vm(['cat','/sys/kernel/security/lockdown']).stdout.trim(),
  unprivilegedBpf:vm(['cat','/proc/sys/kernel/unprivileged_bpf_disabled']).stdout.trim(),bpfStats:vm(['cat','/proc/sys/kernel/bpf_stats_enabled']).stdout.trim(),
  perfEventParanoid:vm(['cat','/proc/sys/kernel/perf_event_paranoid']).stdout.trim(),
  ext4BtfPresent:vm(['test','-e','/sys/kernel/btf/ext4']).status===0,         // present only when ext4 is a module (then `vmlinux:` would not resolve)
  cgroupFs:vm(['stat','-fc','%T','/sys/fs/cgroup']).stdout.trim(),maxMapKeys:MAP_KEYS,perfRbPages:PERF_RB_PAGES,
  ext4Tracepoints:['ext4_sync_file_enter','ext4_sync_file_exit','ext4_sync_fs','ext4_truncate_enter','ext4_punch_hole','ext4_zero_range'].map(t=>[t,vm(['test','-d','/sys/kernel/tracing/events/ext4/'+t]).status===0])};
 const listing={};
 for(const probe of ['fexit:vmlinux:ext4_file_write_iter','fentry:vmlinux:ext4_page_mkwrite','fentry:vmlinux:ext4_sync_fs','fexit:vmlinux:ext4_sync_fs','tracepoint:syscalls:sys_enter_syncfs','tracepoint:syscalls:sys_exit_sync']){
  listing[probe]=(await bpftraceOnce(ctx,'list',['-l',probe])).stdout;
 }
 // R49: CAP_PERFMON alone must be enough to attach a tracepoint (perf_event_open); never widen the capabilities to get around a refusal
 const attachTry=await bpftraceOnce(ctx,'perf',['-q','-e','tracepoint:ext4:ext4_sync_file_exit { @x = 1; } interval:ms:100 { exit(); }']);
 const tracepointAttach={ok:attachTry.exitCode===0,detail:(attachTry.stderr||attachTry.stdout).trim().slice(0,300),exitCode:attachTry.exitCode};
 const clock=await clockStep(ctx);
 const program=await clockProgramStep(ctx);
 // the real program, real caps, default seccomp; its D<ack checks over 200 FULL commits are also the CLOCK_MONOTONIC bracket against the writer's own clock
 // [EXP-OBS01-R15] Why (harness bug): a refusal here threw away every fact gathered above (the first live W0 lost its kernel facts, the tracepoint attach and the clock step). They are written to
 // W0-partial.json before the refusal propagates. Rejected: swallowing the refusal (the attach is a gate).
 let attach;
 try{attach=await witnessSession(ctx,{mode:'full',count:200,dirName:'w0-attach',captureWitness:true});}
 catch(error){atomicJson(path.join(ctx.out,'W0-partial.json'),{refused:String(error),facts,listing,tracepointAttach,clock:{status:clock.status,stderr:clock.stderr,unparsed:clock.unparsed,samples:clock.samples},clockProgram:{image:program.image,dumpPath:program.dumpPath,dumpFileSha256:program.dumpFileSha256,enumPath:program.enumPath,exitCodes:program.exitCodes,versionStderr:program.versionStderr,facts:{...program.facts,btf:{...program.facts.btf,bytes:program.facts.btf.bytes.length},compiled:{exitCode:program.facts.compiled.exitCode,signal:program.facts.compiled.signal,timedOut:program.facts.compiled.timedOut,stdoutBytes:program.facts.compiled.stdout.length,stderr:program.facts.compiled.stderr}}}});throw error;}
 const all={facts,listing,tracepointAttach,clock:{status:clock.status,stderr:clock.stderr,unparsed:clock.unparsed},clockProgram:program.facts,attach,
  paranoid:Number.parseInt(facts.perfEventParanoid,10),ext4BtfPresent:facts.ext4BtfPresent,clockSamples:clock.status===0&&!clock.unparsed?clock.samples:null};
 const verdict=judgeW0(all);
 return {window:'W0',facts,listing,tracepointAttach,clock,clockProgram:{image:program.image,dumpPath:program.dumpPath,dumpFileSha256:program.dumpFileSha256,enumPath:program.enumPath,exitCodes:program.exitCodes,versionStderr:program.versionStderr,verdict:verdict.checks.clock},attach,verdict,pass:verdict.pass,
  claim:'kernel and capability facts; attach under default seccomp with only CAP_BPF and CAP_PERFMON; clock primitive proven from the pinned program hash, bpftrace version and compiled helper calls (nsecs(monotonic) only), with an observational transport check against local CLOCK_MONOTONIC/CLOCK_BOOTTIME references recorded as consistent, inconclusive or inconsistent; perf_event_paranoid, peak memory, ext4 built in and map keys recorded; D<ack bracket for 200 FULL commits'};
}
async function windowW1(ctx){
 const modes=['full','off','normal','full-then-off','ack-early','sync-before-write','sync-other-file','range-only','syncfs','mmap','neighbor-sync'],rows=[];
 // [EXP-OBS01-R15] Why: one refused mode must not hide the other ten; a refusal is recorded as a failing row with the exact message. Rejected: stopping at the first refusal.
 for(const mode of modes){try{rows.push(await witnessSession(ctx,{mode,withNeighbor:mode==='neighbor-sync',dirName:'w1-'+mode}));}catch(error){rows.push({mode,pass:false,refused:String(error)});}}
 return {window:'W1',modes:rows.map(r=>({mode:r.mode,pass:r.pass,judge:r.judge,refused:r.refused})),pass:rows.every(r=>r.pass),
  note:'sync-before-write expects ACK-BEFORE-DURABLE for commits 1..n-1 and SYNC-MISSING for the last (vm_planted_writer.expected); R48 4.3 lists SYNC-MISSING'};
}
async function windowW2(ctx){
 const prior=vm(['cat','/proc/sys/kernel/bpf_stats_enabled']).stdout.trim();
 try{
  if(vm(['sudo','sysctl','-w','kernel.bpf_stats_enabled=1']).status!==0)fail('REFUSED','cannot enable kernel.bpf_stats_enabled');
  const session=await witnessSession(ctx,{mode:'full',count:1000,sample:bpfSampler,dirName:'w2-cost'});
  return {window:'W2',cost:session.cost,judge:session.judge,pass:Boolean(session.cost?.pass&&session.pass),claim:'added kernel time per commit from BPF run-time counters (gate p99 <= 100 us); the writer p99 ABBA report is separate and not gated'};
 }finally{vm(['sudo','sysctl','-w','kernel.bpf_stats_enabled='+(prior||'0')]);}
}
async function windowW3(ctx,options){
 const minutes=Number(options.minutes??20),readers=Number(options.readers??256),rate=Number(options.rate??100),perContainer=32;
 if(!(minutes>0)||!Number.isInteger(readers)||readers<1||!(rate>0))fail('USAGE','--minutes, --readers and --rate must be positive numbers');
 const seconds=Math.round(minutes*60),containers=Math.ceil(readers/perContainer);
 const session=await witnessSession(ctx,{mode:'w3',dirName:'w3-load',judge:false,seconds,sampleStats:true,done:'writer-done.json',copy:['writer-done.json'],
  writerArgv:['python3','-B','/code/vm_w3_load.py','writer','--dir','/data/store','--control','/control','--rate',String(rate),'--seconds',String(seconds)],readers:{containers,threads:perContainer}});
 const cpu=session.witnessCpuPercent;
 return {window:'W3',minutes,readers:containers*perContainer,rate,session,pass:Boolean(session.pass&&cpu&&cpu.mean<10),
  claim:'zero lost events over the load (per-CPU sequence check, not bpftrace stderr); witness container mean CPU under 0.1 core'};
}

/** engine.mjs witness-vm-status | witness-vm-probe --out DIR --image PYTHON_DIGEST --bpftrace-image BPFTRACE_DIGEST [--windows W0,W1,W2,W3] */
export async function witnessCommand(config,command,options){
 if(command==='witness-vm-status'){console.log(JSON.stringify(witnessPreflight(config)));return;}
 if(command!=='witness-vm-probe')fail('USAGE','unknown witness command');
 const out=path.resolve(options.out??''),holder=defaultHolder(options),check=witnessPreflight(config);
 fs.mkdirSync(out,{recursive:false});atomicJson(path.join(out,'preflight.json'),check);
 if(!check.available){atomicJson(path.join(out,'RESULT.json'),{status:'NOT-RUN',reason:'free disk <=10 GiB, G03/NSR/P-TINY busy, or an exclusive slot is held',check});console.log(JSON.stringify({out,status:'NOT-RUN',check}));return;}
 // [EXP-OBS01-R9] Why: the bpftrace image is not in the VM and a pull is a download that needs orchestrator approval; record NOT-RUN, never pull here.
 // Rejected: pulling a mutable tag or installing packages into a probe container from inside the harness.
 let python,bpftrace;
 try{python=pinImage(options.image);bpftrace=pinImage(options['bpftrace-image']);}
 catch(error){atomicJson(path.join(out,'RESULT.json'),{status:'NOT-RUN',reason:'a required digest-pinned image is not present in the triplex2 VM (pulls need approval): '+error.message,check});console.log(JSON.stringify({out,status:'NOT-RUN',reason:error.message}));return;}
 const nonce=randomBytes(4).toString('hex'),windows=String(options.windows??'W0,W1,W2').split(',');
 const table={W0:windowW0,W1:windowW1,W2:windowW2,W3:windowW3};if(windows.some(w=>!table[w]))fail('USAGE','windows are W0, W1, W2, W3');
 const ctx={config,holder,python,bpftrace,out,nonce},results=[];let failure;
 try{
  for(const w of windows){
   if(!vmAvailable(config).available)throw Error('disk fell below 10 GiB or G03 began VM work; stop');
   // [EXP-OBS01-R15] Why: a refused window is recorded and the next window still runs (each window has its own fresh containers and volumes); the run status stays REFUSED. Rejected: aborting all windows on the first refusal.
   try{results.push(await table[w](ctx,options));}catch(error){results.push({window:w,pass:false,refused:String(error)});failure??=w+': '+String(error);}
  }
 }catch(error){failure=String(error);}
 finally{
  for(const [argv,file] of [[['colima','ssh','-p','triplex2','--','sudo','fstrim','-av'],'fstrim.json'],[['docker','context','use','default'],'context.json']]){
   const p=spawnSync(argv[0],argv.slice(1),{encoding:'utf8'});atomicJson(path.join(out,file),{status:p.status,stdout:p.stdout,stderr:p.stderr});if(p.status!==0)failure??='cleanup command failed: '+file;}
  const status=failure?'REFUSED':results.every(r=>r.pass)?'PASS':'FAIL';
  atomicJson(path.join(out,'RESULT.json'),{status,failure,windows:results.map(r=>({window:r.window,pass:r.pass,refused:r.refused})),python,bpftrace,nonce,claim:'probe windows only; no NS acceptance and no host power-loss durability'});
  for(const r of results)atomicJson(path.join(out,r.window+'.json'),r);
  console.log(JSON.stringify({out,status,failure}));if(status!=='PASS')process.exitCode=2;
 }
}

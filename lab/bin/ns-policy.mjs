// [EXP-G03-R5] Why: private role mounts and clock facts are refusal checks before any NS workload. Rejected: trusting candidate role labels or equal time-namespace inodes.
export const VM_DURABILITY = 'guest-durable, host-fsync, drive cache not flushed';
export const NS_LAYOUT = Object.freeze({broker:{memory:1073741824,cpuset:'2'},readers:{memory:805306368,cpuset:'4'},consumer:{memory:536870912,cpuset:'3'},driver:{memory:1073741824,cpuset:'5'},observer:{memory:268435456,cpuset:'5'}});
export function clockFacts(bootId, offsets, timeNs) {
  const rows=String(offsets).trim().split('\n').map(l=>l.trim().split(/\s+/));
  if(!/^[0-9a-f-]{36}$/.test(bootId)||rows.length!==2||rows.some(r=>r.length!==3)||new Set(rows.map(r=>r[0])).size!==2||rows.some(r=>!['monotonic','boottime'].includes(r[0])||!/^[-]?\d+$/.test(r[1])||!/^\d+$/.test(r[2])||BigInt(r[1])!==0n||BigInt(r[2])!==0n))throw Error('ISOLATION-NOT-IN-FORCE: nonzero/missing clock offsets');
  return {bootId,primitive:'CLOCK_MONOTONIC',offsets:{monotonic:['0','0'],boottime:['0','0']},timeNs:String(timeNs)};
}
export function sameClock(facts){if(!facts.length)throw Error('clock facts missing');const checked=facts.map(x=>clockFacts(x.bootId,`monotonic ${x.offsets?.monotonic?.join(' ')}\nboottime ${x.offsets?.boottime?.join(' ')}`,x.timeNs));if(checked.some(x=>x.bootId!==checked[0].bootId))throw Error('ISOLATION-NOT-IN-FORCE: foreign boot');return {bootId:checked[0].bootId,primitive:'CLOCK_MONOTONIC',offsets:checked[0].offsets}}
export const CLOCK_SCRIPT="const fs=require('fs');console.log(JSON.stringify({bootId:fs.readFileSync('/proc/sys/kernel/random/boot_id','utf8').trim(),offsetText:fs.readFileSync('/proc/self/timens_offsets','utf8'),timeNs:String(fs.statSync('/proc/self/ns/time',{bigint:true}).ino)}))";
// [EXP-G03-R5] Why: diagnostic sizing cannot smuggle image/trust/mount overrides into hardened role creation. Rejected: spreading an unrestricted placement object into Box.create.
function placementPlan(role,placement){
 if(!placement||Object.keys(placement).some(k=>!['memory','cpuset'].includes(k))||!Number.isSafeInteger(placement.memory)||placement.memory<67108864||placement.memory>NS_LAYOUT[role].memory||placement.cpuset!==NS_LAYOUT[role].cpuset)throw Error('invalid NS placement');return {memory:placement.memory,cpuset:placement.cpuset};
}
export function servicePlan({role,instance,inputs,state,network,argv,placement=NS_LAYOUT[role]}){
 if(!['broker','readers','consumer'].includes(role)||!instance||!inputs||!network||network==='bridge'||network==='none'||!Array.isArray(argv)||!argv.length)throw Error('invalid NS service');
 if((role==='readers'&&state)||(role!=='readers'&&!state))throw Error('NS state ownership');
 const names=[instance,inputs,...(state?[state]:[])];if(new Set(names).size!==names.length)throw Error('overlapping NS mounts');
 return {...placementPlan(role,placement),argv,network,mounts:[{name:instance,target:'/work',rw:false},{name:inputs,target:'/in',rw:false},...(state?[{name:state,target:'/state',rw:true}]:[])],pids:256,extra:['--init']};
}
export function driverPlan({bundle,inputs,key,output,network,placement=NS_LAYOUT.driver}){
 if(new Set([bundle,inputs,key,output]).size!==4||[bundle,inputs,key,output].some(x=>!x)||!network||['none','bridge'].includes(network))throw Error('driver private mounts required');
 return {...placementPlan('driver',placement),argv:['node','/driver/launch-artifact.mjs','/driver','/driver-in/config.json'],network,pids:128,mounts:[{name:bundle,target:'/driver',rw:false},{name:inputs,target:'/driver-in',rw:false},{name:key,target:'/key',rw:false},{name:output,target:'/out',rw:true}]};
}
export function layoutProblems(roles,privateVolumes){
 const problems=[];const candidate=roles.filter(x=>['broker','readers','consumer'].includes(x.role));
 for(const r of candidate){const mounts=r.inspect.Mounts??[];const own=privateVolumes[r.role];
  if(mounts.some(m=>[privateVolumes.output,privateVolumes.observer,privateVolumes.trace,privateVolumes.key,privateVolumes.bundle,...candidate.filter(x=>x.role!==r.role).map(x=>privateVolumes[x.role])].filter(Boolean).includes(m.Name)))problems.push(r.role+': foreign private volume');
  if(mounts.some(m=>m.RW&&m.Name!==own))problems.push(r.role+': unexpected writable mount');
 }
 const memberships=roles.filter(r=>r.role!=='observer').map(r=>Object.keys(r.inspect.NetworkSettings.Networks));
 if(memberships.some(ns=>ns.length!==1||ns[0]!==privateVolumes.network))problems.push('arm membership');
 const drv=roles.find(x=>x.role==='driver'),obs=roles.find(x=>x.role==='observer');
 if(!drv||!obs||Object.keys(obs.inspect.NetworkSettings.Networks).length!==1||Object.keys(obs.inspect.NetworkSettings.Networks)[0]!=='none'||(obs.inspect.Mounts??[]).some(m=>[privateVolumes.broker,privateVolumes.consumer].includes(m.Name)&&m.RW))problems.push('trusted placement');
 if(drv&&(drv.inspect.Mounts??[]).some(m=>m.RW&&m.Name!==privateVolumes.output))problems.push('driver writable mount');
 return problems;
}
// [EXP-G03-R5] Why: omissions or a stale preflight row cannot stand in for observed denials. Rejected: a successful probe exit without exact target coverage.
export function checkNsPreflight(doc,{runId,role,denied,blocked}){
 if(doc?.runId!==runId||doc.role!==role||doc.positive!==true||doc.publicDns!==false||JSON.stringify(doc.denied)!==JSON.stringify(denied)||JSON.stringify(doc.blocked)!==JSON.stringify(blocked.map(p=>({...p,reachable:false}))))throw Error('ISOLATION-NOT-IN-FORCE: incomplete/stale NS preflight');return doc;
}

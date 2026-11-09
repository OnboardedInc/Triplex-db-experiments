// [EXP-G03-R7c] Why: regressions for round 7a's F3 (a rejected control session skipped terminal, stop and export) and F4 (a null first clock domain bypassed the constancy check). The F3 controls run the exact committed runBoxedNS and Box.execControl through round7c-harness.mjs against a trusted Box model; they assert raw exports with independently recomputed digests, or explicit retained-volume ownership, before any cleanup. Rejected: testing trustedTerminal alone (it never reaches the coordinator's await) and weakening any round 7a assertion.
import test from 'node:test';import assert from 'node:assert/strict';import {createHmac,createHash} from 'node:crypto';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {spawnSync} from 'node:child_process';
import {verifyObserver,trustedTerminal,requireCleanTerminal} from '../../../bin/ns-run.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const harness=new URL('./round7c-harness.mjs',import.meta.url).pathname;
function runHarness(mode,t){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'r7c-'+mode+'-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const r=spawnSync(process.execPath,['--experimental-vm-modules','--no-warnings',harness,mode,dir],{encoding:'utf8',maxBuffer:32*1024*1024});
 assert.equal(r.status,0,r.stderr);const observed=JSON.parse(r.stdout);
 const stageName=fs.readdirSync(dir).find(n=>n.endsWith('-stages.ndjson')),runId=stageName.slice(3,-'-stages.ndjson'.length);
 return {dir,runId,...observed};
}
const idx=(ops,re)=>ops.findIndex(o=>re.test(o));
// Reads the exported run directory and recomputes every digest from the bytes on disk.
function exported(o){
 const root=path.join(o.dir,'raw-'+o.runId),record=JSON.parse(fs.readFileSync(path.join(root,'terminal.json')));
 const onDisk=[];const walk=d=>{for(const n of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,n.name);if(n.isDirectory())walk(p);else onDisk.push(path.relative(root,p))}};walk(root);
 for(const [name,digest]of Object.entries(record.capture))assert.equal(sha(fs.readFileSync(path.join(root,name))),digest,'capture digest '+name);
 assert.deepEqual(onDisk.filter(n=>n!=='key'&&n!=='binding.json'&&n!=='terminal.json').sort(),Object.keys(record.capture).sort(),'every exported byte is digested');
 assert.ok(fs.existsSync(path.join(root,'key'))&&fs.existsSync(path.join(root,'binding.json')));
 return {root,record};
}
const CONTROL_CASES=[
 ['reject-hook',/FAULT-POINT-DR-CONTRADICTION/,null],
 ['control-timeout',/FAULT-CONTROL-TIMEOUT/,'{"schema":"ns-control/1","partial-line-without-newline'],
 ['control-truncated',/FAULT-CONTROL-TRUNCATED/,'{"schema":"ns-control/1","binding":'],
 ['control-json',/FAULT-CONTROL-JSON/,'not json at all\n'],
 ['control-cap',/FAULT-CONTROL-CAP/,''],
];
for(const [mode,cause,partial] of CONTROL_CASES)test('F3: rejected control session ('+mode+') becomes a failed terminal, stops safely, exports and digests raw bytes, then refuses',t=>{
 const o=runHarness(mode,t);
 assert.equal(o.returned,false,'no result, so no semantic grant, follows');
 assert.match(o.error,/^DRIVER-CONTROL-FAILURE /);assert.match(o.error,cause);
 const {root,record}=exported(o);
 assert.equal(record.terminal.source,'coordinator-exec');assert.equal(record.terminal.schema,'ns-terminal/1');assert.equal(record.terminal.runId,o.runId);
 assert.equal(record.terminal.driverExit,null);assert.equal(record.terminal.controlFailure.ok,false);assert.match(record.terminal.controlFailure.error,cause);
 // The partial streams are exported and bound to the terminal by digest.
 const out=fs.readFileSync(path.join(root,'control/stdout')),err=fs.readFileSync(path.join(root,'control/stderr'));
 assert.equal(record.terminal.controlFailure.partial.stdoutSha256,sha(out));assert.equal(record.terminal.controlFailure.partial.stderrSha256,sha(err));
 assert.equal(record.terminal.controlFailure.partial.stdoutBytes,out.length);assert.equal(record.terminal.controlFailure.partial.stderrBytes,err.length);
 if(partial!==null){assert.equal(out.toString(),partial);if(mode!=='control-cap')assert.equal(err.toString(),'model-stderr-partial')}
 assert.equal(Object.keys(record.capture).length,8,'six role files plus control/stdout and control/stderr');
 // Ordering: driver removed (kill proof) before the observer is sealed, every walk after both, all exports before any cleanup, and no volume deleted before export.
 const driverRemoved=idx(o.operations,/^remove:.*ns-driver-/),sealed=idx(o.operations,/^remove:.*stop-observer-/),firstWalk=idx(o.operations,/^walk:/),lastWalk=o.operations.map((x,i)=>x.startsWith('walk:')?i:-1).reduce((a,b)=>Math.max(a,b)),firstClose=idx(o.operations,/^close-remove:/);
 assert.ok(driverRemoved>=0&&driverRemoved<sealed&&sealed<firstWalk,'driver removed, then observer sealed, then walks');
 assert.ok(firstClose>lastWalk,'close() only after the last export walk');
 assert.equal(o.stages.at(-1).step,12);assert.ok(!o.stages.some(s=>s.step===13||s.step===14));
 assert.deepEqual(o.volumesAfterClose,[],'volumes may be deleted only because the raw export exists');
 // The invalid role bytes in the model were exported but never parsed (no JSON parse error replaced the cause).
 assert.equal(fs.readFileSync(path.join(root,'driver/events/00000000.json'),'utf8'),'INVALID-HR-MUST-NOT-BE-PARSED');
 assert.equal(o.rawDirOnError,root);assert.equal(o.terminalOnError.controlFailure.ok,false);
});
for(const [mode,status,cause] of [['nonzero',7,/DRIVER-EXIT-NONZERO status=7/],['null-exit',null,/DRIVER-EXIT-NONZERO status=null/],['finish-failure',0,/DRIVER-HOOK-FAILURE/]])test('F3 baseline preserved: resolved exec result ('+mode+') still exports six digested files before refusing',t=>{
 const o=runHarness(mode,t);assert.equal(o.returned,false);assert.match(o.error,cause);
 const {record}=exported(o);assert.equal(Object.keys(record.capture).length,6);assert.equal(record.terminal.driverExit,status);assert.equal('controlFailure'in record.terminal,false);
 assert.ok(idx(o.operations,/^close-remove:/)>o.operations.map((x,i)=>x.startsWith('walk:')?i:-1).reduce((a,b)=>Math.max(a,b)));assert.deepEqual(o.volumesAfterClose,[]);
});
const forensic=['broker','consumer','output','observer','trace','key','bundle','observerCode','control'];
for(const [mode,reason,walks] of [['retain-walk-failure',/walker failed \(model\)/,true],['retain-remove-failure',/kill proof mismatch \(model\)/,false]])test('F3: when stop or export cannot be proven ('+mode+'), the run volumes stay owned and the gap is recorded',t=>{
 const o=runHarness(mode,t);assert.equal(o.returned,false);assert.match(o.error,reason);
 const names=forensic.map(s=>'offline-ns-'+o.runId.slice(0,6)+'-'+s);
 assert.deepEqual([...o.retainedOnError].sort(),[...names].sort());assert.deepEqual(o.boxRetained.map(r=>r.name).sort(),[...names].sort());
 for(const n of names)assert.ok(o.volumesAfterClose.includes(n),'close() must not delete '+n);
 assert.ok(!o.operations.some(x=>x.startsWith('close-remove:volume:')&&names.some(n=>x.endsWith(n))));
 const gap=JSON.parse(fs.readFileSync(path.join(o.dir,'ns-'+o.runId+'-retained.json'),'utf8'));
 assert.equal(gap.schema,'ns-retained/1');assert.equal(gap.runId,o.runId);assert.equal(gap.export,'NOT-PROVEN-SAFE');assert.match(gap.reason,reason);assert.deepEqual([...gap.volumes].sort(),[...names].sort());assert.equal(gap.qualification,false);
 assert.equal(gap.terminal.source,'coordinator-exec');assert.equal(gap.terminal.runId,o.runId);
 if(mode==='retain-walk-failure'){assert.equal(gap.terminal.controlFailure.ok,false);assert.match(gap.terminal.controlFailure.error,/FAULT-POINT-DR-CONTRADICTION/);assert.equal(gap.terminal.driverExit,null)}else assert.equal(gap.terminal.driverExit,7);
 assert.equal(fs.readdirSync(o.dir).filter(n=>n.startsWith('raw-')).length,0,'nothing was presented as an export');
 assert.equal(o.stages.at(-1).step,14);
 assert.equal(o.operations.some(x=>x.startsWith('walk:')),walks,walks?'export walks started':'export not attempted after unproven teardown');
});
test('F3: a failed terminal is never clean: requireCleanTerminal refuses controlFailure whatever else it says',()=>{
 const binding={runId:'r'};const t=trustedTerminal({runId:'r',exec:{status:null,stdout:Buffer.from('a'),stderr:Buffer.alloc(0)},controlError:Error('FAULT-CONTROL-TIMEOUT')});
 assert.equal(t.controlFailure.error,'FAULT-CONTROL-TIMEOUT');assert.throws(()=>requireCleanTerminal(t,binding),/DRIVER-CONTROL-FAILURE FAULT-CONTROL-TIMEOUT/);
 assert.throws(()=>requireCleanTerminal({...t,driverExit:0},binding),/DRIVER-CONTROL-FAILURE/,'a forged exit 0 cannot hide the failure');
 assert.throws(()=>requireCleanTerminal({...trustedTerminal({runId:'r',exec:{status:0}}),controlFailure:undefined},binding),/DRIVER-CONTROL-FAILURE/,'presence of the key refuses even when empty');
 assert.equal(requireCleanTerminal(trustedTerminal({runId:'r',exec:{status:0}}),binding).driverExit,0);
});
// F4: clock-domain validation. Fixtures are signed with the fixture key, so each refusal is the domain check itself, not a signature failure.
const key=Buffer.alloc(32,5),run='fresh-7c',domain={bootId:'7a064e31-8ca0-47a5-926f-d2de8d786302',primitive:'CLOCK_MONOTONIC',offsets:{monotonic:['0','0'],boottime:['0','0']}};
const store=e=>({marker:e.length,subjects:[],entries:e}),final={source:store([]),consumer:store([])},periodNs=[250000,260000];
function signed(domains){let head='0'.repeat(64);const rows=domains.map((d,sequence)=>{const last=sequence===domains.length-1,raw=JSON.stringify({schema:'ns-observer/1',runId:run,sequence,previous:head,domain:d,polls:[],...(last?{final,periodNs}:{})});head=createHmac('sha256',key).update(raw).digest('hex');return {raw,hmac:head}});
 const sealDomain=domains.at(-1);return new Map([['polls.ndjson',Buffer.from(rows.map(r=>JSON.stringify(r)).join('\n')+'\n')],['seal.json',Buffer.from(JSON.stringify({schema:'ns-observer-seal/1',runId:run,chunks:rows.length,head,domain:sealDomain,periodNs,final}))]])}
const other={...domain,bootId:'bbbbbbbb-8ca0-47a5-926f-d2de8d786302'};
test('F4 control: constant valid domain is accepted and returned',()=>{assert.deepEqual(verifyObserver(signed([domain,domain,domain]),key,run).seal.domain,domain)});
test('F4: null first domain followed by a valid domain is refused (the reviewer reproduction)',()=>{assert.throws(()=>verifyObserver(signed([null,domain,domain]),key,run),/observer domain invalid/)});
test('F4: null in every record is refused, including with a null seal domain',()=>{assert.throws(()=>verifyObserver(signed([null,null,null]),key,run),/observer domain invalid/)});
test('F4: null only in the middle or final record is refused',()=>{for(const ds of [[domain,null,domain],[domain,domain,null]])assert.throws(()=>verifyObserver(signed(ds),key,run),/observer domain invalid/)});
test('F4: change between two non-null domains is still refused',()=>{assert.throws(()=>verifyObserver(signed([domain,other,other]),key,run),/observer domain changed/);assert.throws(()=>verifyObserver(signed([other,domain,domain]),key,run),/observer domain changed/)});
test('F4: a constant but malformed domain is refused (not the boot/zero-offset clock object)',()=>{
 for(const bad of [{},{...domain,primitive:'CLOCK_REALTIME'},{...domain,bootId:'short'},{...domain,offsets:{monotonic:['0','1'],boottime:['0','0']}},{...domain,offsets:{monotonic:['0','0']}},{...domain,extra:1},'domain',[],7])assert.throws(()=>verifyObserver(signed([bad,bad,bad]),key,run),/observer domain invalid/,JSON.stringify(bad));
});

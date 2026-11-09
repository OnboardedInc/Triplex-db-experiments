// [EXP-G03-R7a] Why: regressions for the round 5-6 review's two High findings (F1 unauthenticated final observer readbacks, F2 failed driver completion reaching replay). Rejected: asserting only the happy path or testing against a hand-built observer shape that the real observer.py never emits.
import test from 'node:test';import assert from 'node:assert/strict';import {createHmac} from 'node:crypto';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {spawn,execFileSync} from 'node:child_process';
import {verifyObserver,checkSmoke,trustedTerminal,requireCleanTerminal} from '../../../bin/ns-run.mjs';
const key=Buffer.alloc(32,9),run='fresh-7a',domain={bootId:'7a064e31-8ca0-47a5-926f-d2de8d786302',primitive:'CLOCK_MONOTONIC',offsets:{monotonic:['0','0'],boottime:['0','0']}};
const store=e=>({marker:e.length,subjects:[],entries:e});
const hm=raw=>createHmac('sha256',key).update(raw).digest('hex');
function build({final={source:store([]),consumer:store([])},periodNs=[250000,260000],polls=1,runId=run}={}){let head='0'.repeat(64);const rows=[];let seq=0;
 for(let i=0;i<polls;i++){const raw=JSON.stringify({schema:'ns-observer/1',runId,sequence:seq++,previous:head,domain,polls:[]});head=hm(raw);rows.push({raw,hmac:head})}
 const raw=JSON.stringify({schema:'ns-observer/1',runId,sequence:seq++,previous:head,domain,polls:[],final,periodNs});head=hm(raw);rows.push({raw,hmac:head});
 return {rows,head,seal:{schema:'ns-observer-seal/1',runId,chunks:seq,head,domain,periodNs,final}}}
const files=({rows,seal})=>new Map([['polls.ndjson',Buffer.from(rows.map(r=>JSON.stringify(r)).join('\n')+'\n')],['seal.json',Buffer.from(JSON.stringify(seal))]]);
test('authentic observer record verifies and the returned seal comes from the chain',()=>{const o=verifyObserver(files(build()),key,run);assert.deepEqual(o.seal.periodNs,[250000,260000]);assert.equal(o.seal.chunks,2)});
const edits={
 'final consumer effects':s=>{s.final.consumer=store([[1,'fabricated',9]])},
 'final consumer marker':s=>{s.final.consumer.marker=99},
 'final source subjects':s=>{s.final.source.subjects=[['subject-0',5]]},
 'final source entries':s=>{s.final.source.entries=[[1,'subject-0',5]]},
 'periodNs value':s=>{s.periodNs=[1,1]},
 'periodNs dropped':s=>{s.periodNs=[]},
 'domain boot id':s=>{s.domain={...s.domain,bootId:'aaaaaaaa-8ca0-47a5-926f-d2de8d786302'}},
 'head':s=>{s.head='f'.repeat(64)},
 'chunk count':s=>{s.chunks=1},
 'run id':s=>{s.runId='old'},
 'extra field':s=>{s.extra=1},
 'removed final':s=>{delete s.final},
};
for(const [name,edit] of Object.entries(edits))test('F1: seal-only edit refused: '+name,()=>{const b=build(),seal=structuredClone(b.seal);edit(seal);assert.throws(()=>verifyObserver(files({rows:b.rows,seal}),key,run),/observer/)});
test('F1: reviewer case, fabricated final consumer and periodNs=[1] on a one-chunk poll stream, refused',()=>{const raw=JSON.stringify({schema:'ns-observer/1',runId:run,sequence:0,previous:'0'.repeat(64),polls:[]}),hmac=hm(raw);
 const seal={schema:'ns-observer-seal/1',runId:run,chunks:1,head:hmac,final:{consumer:{marker:123,entries:[[123,'fabricated-final-effect',999]]}},periodNs:[1]};
 assert.throws(()=>verifyObserver(new Map([['polls.ndjson',Buffer.from(JSON.stringify({raw,hmac})+'\n')],['seal.json',Buffer.from(JSON.stringify(seal))]]),key,run),/observer/)});
test('F1: editing the final record inside polls.ndjson without the key is refused',()=>{const b=build(),rows=structuredClone(b.rows),body=JSON.parse(rows.at(-1).raw);body.final.consumer=store([[1,'x',1]]);rows.at(-1).raw=JSON.stringify(body);const seal=structuredClone(b.seal);seal.final=body.final;assert.throws(()=>verifyObserver(files({rows,seal}),key,run),/observer content/)});
test('F1: re-signing with another key is refused',()=>{const b=build(),other=Buffer.alloc(32,1),rows=b.rows.map(r=>({...r,hmac:createHmac('sha256',other).update(r.raw).digest('hex')}));assert.throws(()=>verifyObserver(files({rows,seal:{...b.seal,head:rows.at(-1).hmac}}),key,run),/observer content/)});
test('F1: dropping the final record (truncation) is refused even with a matching head',()=>{const b=build({polls:3}),rows=b.rows.slice(0,-1),seal={...b.seal,chunks:rows.length,head:rows.at(-1).hmac};delete seal.final;assert.throws(()=>verifyObserver(files({rows,seal}),key,run),/observer/);const full={...b.seal,chunks:rows.length,head:rows.at(-1).hmac};assert.throws(()=>verifyObserver(files({rows,seal:full}),key,run),/observer final record missing/)});
test('F1: poll rows after the final record are refused',()=>{const b=build(),extra=JSON.parse(b.rows.at(-1).raw),raw=JSON.stringify({...extra,sequence:extra.sequence+1,previous:b.head,final:undefined,periodNs:undefined,polls:[]}),hmac=hm(raw),rows=[...b.rows,{raw,hmac}];assert.throws(()=>verifyObserver(files({rows,seal:{...b.seal,chunks:rows.length,head:hmac}}),key,run),/observer records after final/)});
test('F1: a second final record or periodNs outside the final record is refused',()=>{const b=build(),f=JSON.parse(b.rows.at(-1).raw),raw=JSON.stringify({...f,sequence:f.sequence+1,previous:b.head}),hmac=hm(raw);assert.throws(()=>verifyObserver(files({rows:[...b.rows,{raw,hmac}],seal:{...b.seal,chunks:b.rows.length+1,head:hmac}}),key,run),/observer records after final/)});
test('F1: wrong run and key refused',()=>{assert.throws(()=>verifyObserver(files(build()),key,'old'));assert.throws(()=>verifyObserver(files(build()),Buffer.alloc(32),run))});
test('F1: domain changing between chunks is refused',()=>{const b=build(),f=JSON.parse(b.rows.at(-1).raw);f.domain={...domain,bootId:'bbbbbbbb-8ca0-47a5-926f-d2de8d786302'};const raw=JSON.stringify(f),hmac=hm(raw),rows=[...b.rows.slice(0,-1),{raw,hmac}];assert.throws(()=>verifyObserver(files({rows,seal:{...b.seal,head:hmac,domain:f.domain}}),key,run),/observer domain changed/)});
// End to end: the real observer.py, with only its absolute /observer /source /consumer /out /control /proc paths redirected into a temp directory (it needs Linux procfs and the VM mounts otherwise).
test('F1: the real observer.py emits a final record that verifyObserver accepts, and any edit afterwards is refused',async t=>{
 const py=execFileSync('python3',['-c','import sqlite3;print(1)'],{encoding:'utf8'}).trim();if(py!=='1')return t.skip('python3 sqlite3 unavailable');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'obs7a-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 for(const d of ['observer','source','consumer','out','control','proc'])fs.mkdirSync(path.join(dir,d));
 fs.writeFileSync(path.join(dir,'observer/config.json'),JSON.stringify({runId:run,active:true}));fs.writeFileSync(path.join(dir,'observer/key'),key);
 fs.writeFileSync(path.join(dir,'proc/boot_id'),domain.bootId+'\n');fs.writeFileSync(path.join(dir,'proc/timens'),'monotonic 0 0\nboottime 0 0\n');
 for(const [file,entries] of [['source/broker.db',[[1,'subject-0',7]]],['consumer/consumer.db',[[1,'subject-0',7]]]])execFileSync('python3',['-c',`import sqlite3,sys;c=sqlite3.connect(sys.argv[1]);c.executescript("CREATE TABLE marker(id INTEGER PRIMARY KEY,lsn INTEGER);INSERT INTO marker VALUES(1,1);CREATE TABLE subjects(subject TEXT PRIMARY KEY,value INTEGER);INSERT INTO subjects VALUES('subject-0',7);CREATE TABLE entries(position INTEGER,subject TEXT,value INTEGER);INSERT INTO entries VALUES(1,'subject-0',7);");c.commit()`,path.join(dir,file)]);
 let source=fs.readFileSync(new URL('./observer.py',import.meta.url),'utf8');
 for(const [from,to] of [['/observer/','observer/'],['/source/','source/'],['/consumer/','consumer/'],['/out/','out/'],['/control/','control/']])source=source.split("'"+from).join("'"+dir+'/'+to);
 source=source.replace("'/proc/sys/kernel/random/boot_id'","'"+dir+"/proc/boot_id'").replace("'/proc/self/timens_offsets'","'"+dir+"/proc/timens'");

 // macOS has no os.fdatasync (the VM is Linux); fsync is the portable stand-in for this harness only.
 source=source.split('os.fdatasync(').join('os.fsync(');
 assert.ok(!/'\/(observer|source|consumer|out|control|proc)/.test(source),'unredirected path');
 fs.writeFileSync(path.join(dir,'observer.py'),source);
 const child=spawn('python3',[path.join(dir,'observer.py')],{stdio:['ignore','pipe','pipe']});let stderr='';child.stderr.on('data',b=>stderr+=b);const exited=new Promise(r=>child.on('close',r));
 for(let i=0;i<200&&!fs.existsSync(path.join(dir,'out/ready.json'));i++)await new Promise(r=>setTimeout(r,50));
 await new Promise(r=>setTimeout(r,300));fs.writeFileSync(path.join(dir,'control/stop'),'stop');
 assert.equal(await exited,0,stderr);
 const out=name=>fs.readFileSync(path.join(dir,'out',name));const set=()=>new Map([['polls.ndjson',out('polls.ndjson')],['seal.json',out('seal.json')]]);
 const o=verifyObserver(set(),key,run);assert.ok(o.polls.length>0);assert.equal(o.seal.final.source.marker,1);assert.deepEqual(o.seal.final.consumer.entries,[[1,'subject-0',7]]);assert.ok(o.seal.periodNs.length>0);
 const seal=JSON.parse(out('seal.json'));seal.final.consumer.entries=[[1,'subject-0',8]];assert.throws(()=>verifyObserver(new Map([['polls.ndjson',out('polls.ndjson')],['seal.json',Buffer.from(JSON.stringify(seal))]]),key,run),/observer seal/);
 const seal2=JSON.parse(out('seal.json'));seal2.periodNs=[1];assert.throws(()=>verifyObserver(new Map([['polls.ndjson',out('polls.ndjson')],['seal.json',Buffer.from(JSON.stringify(seal2))]]),key,run),/observer seal/);
});
// F2: replay requires a clean trusted-side terminal before it touches any event.
const binding={runId:run,driverBundleSha256:'e'.repeat(64)};
test('F2: checkSmoke refuses a missing, foreign, nonzero, signalled or hook-failed terminal before reading events',()=>{
 const cases=[[undefined,/DRIVER-TERMINAL-MISSING/],[trustedTerminal({runId:'other',exec:{status:0}}),/DRIVER-TERMINAL-MISSING/],[trustedTerminal({runId:run,exec:{status:1}}),/DRIVER-EXIT-NONZERO status=1/],[trustedTerminal({runId:run,exec:{status:null}}),/DRIVER-EXIT-NONZERO status=null/],[trustedTerminal({runId:run,exec:{status:0},faultError:Error('FAULT-NOT-EXERCISED')}),/DRIVER-HOOK-FAILURE FAULT-NOT-EXERCISED/],[{...trustedTerminal({runId:run,exec:{status:0}}),source:'driver-events'},/DRIVER-TERMINAL-MISSING/],[{schema:'ns-terminal/1',source:'coordinator-exec',runId:run,driverExit:0},/DRIVER-HOOK-FAILURE/]];
 // events/observer are null: any attempt to replay first would raise a TypeError, not the DRIVER error.
 for(const [terminal,pattern] of cases)assert.throws(()=>checkSmoke(null,null,[],0,binding,terminal),pattern);
 assert.equal(requireCleanTerminal(trustedTerminal({runId:run,exec:{status:0}}),binding).driverExit,0)});
test('F2: the terminal records the coordinator exec status, not any event content',()=>{const t=trustedTerminal({runId:run,exec:{status:3,stdout:Buffer.from('{"end":{"error":null}}')}});assert.equal(t.driverExit,3);assert.equal(t.source,'coordinator-exec');assert.deepEqual(Object.keys(t).sort(),['driverExit','faultFinish','runId','schema','source'])});
test('F2: the reviewer reproduction of the real driver source (hook failure after three handshakes) now records the error and refuses replay',()=>{
 execFileSync(process.execPath,['--experimental-vm-modules','--no-warnings',path.join(import.meta.dirname,'../../../verify/G03/review-round6.mjs')],{stdio:'pipe',maxBuffer:8*1024*1024})});

// [CX-VQNODELAY-R4] Why: exercise a reader found from raw-event filenames/percentiles, then audit exact source/evidence bytes.
// Rejected: treating a reviewed import count as all paths using the parser, or creating a fake verified production attempt.
import fs from 'node:fs';
import path from 'node:path';
import { createHash,randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { parseLatencyReceipt,parseLatencyReceipts } from '../../../receipts/parse.ts';
const disk=fs.statfsSync(process.cwd());if(disk.bavail*disk.bsize<5*1024**3)throw Error('disk below 5 GiB; no new heavy QA work');
const own='lab/verify/QNODELAY/round4',sha=x=>createHash('sha256').update(x).digest('hex');
const reader='qualification/reviews/load-observations-independent.mjs',source=fs.readFileSync(reader,'utf8');
const report={id:randomUUID(),startedAt:new Date().toISOString(),classification:'OFFLINE SOURCE-EXACT READER UNIT WITH MOCKED CONTROLLER/IO; not a verified real attempt',reader,readerSha256:sha(source),observations:[],audit:{}};
const root=process.cwd(),canonical=value=>JSON.stringify(value,(_key,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.keys(item).sort().map(key=>[key,item[key]])):item);
const name='fixture:name:0:v0',rows=[[name]],basis={scope:'fixture',knownPosition:'1',validAt:1},paramsSha256=sha(canonical({entity:'fixture:entity:0'}));
const spec={id:'fixture',entities:1,factsPerEntity:1,probeEntities:11,maximumWriterCommands:0,validAt:1};
const bundle={instances:[{index:0,baselinePosition:1,scope:'fixture',recordedAt:1}]};
const catalog={entries:{fixture:{expectedSha256:sha(canonical(rows)),paramsSha256,basis}}};
const baseEvent={type:'read',ok:true,startedMs:0,finishedMs:10,probe:0,knownPosition:'1',taskClass:'point-current',paramsSha256,basis,resultJson:JSON.stringify(rows),resultSha256:sha(JSON.stringify(rows)),oracleKey:'fixture'};
// Execute the full actual reader body, keeping all its content/oracle/percentile assertions.
// Imports and import.meta.dirname are supplied as fixture dependencies only; controller proof is explicitly synthetic.
const body=source.replace(/^import .*;\s*$/gm,'').replaceAll('import.meta.dirname',JSON.stringify(path.dirname(path.resolve(reader))));
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
const execute=new AsyncFunction('assert','createHash','readFile','writeFile','resolve','loadJobManifest','openContext','readState','verifyAttempt','process','console','parseLatencyReceipt','parseLatencyReceipts',body);
for(const [label,events]of [
  ['modeless-qlever',[baseEvent]],
  ['mixed-qlever',[{...baseEvent,qleverConnectionMode:'keep-alive'},{...baseEvent,finishedMs:2,qleverConnectionMode:'per-request'}]],
]){
  const virtual=new Map(Object.entries({'spec.json':spec,'fixture.json':bundle,'oracle.json':catalog}).map(([p,v])=>[path.resolve(root,p),Buffer.from(JSON.stringify(v))]));
  const manifest={queryPath:'qlever-native',command:{argv:['node','fixture','--spec','spec.json','--fixture','fixture.json','--oracle','oracle.json','--instance','0']},inputs:[...virtual].map(([p,b])=>({path:path.relative(root,p),sha256:sha(b)})),evidence:{events:'events.ndjson'},profile:{startMilliseconds:0,endMilliseconds:1000,requiredClasses:['point-current'],clients:1}};
  virtual.set(path.join(root,'.devloop/jobs','fixture','attempts','0001','events.ndjson'),Buffer.from(events.map(e=>JSON.stringify(e)).join('\n')+'\n'));
  let output;const calls=[];
  await execute(assert,createHash,async p=>{const b=virtual.get(p);assert(b,`unmapped fixture input: ${p}`);return b;},async(p,b,opts)=>{assert.equal(opts.flag,'wx');output={path:p,bytes:b};},path.resolve,async()=>manifest,async()=>({root}),async()=>({jobs:{fixture:{}}}),async()=>({terminal:{status:'SYNTHETIC-FIXTURE-NOT-VERIFIED'},terminalSha256:sha('fixture-only')}),{argv:['node',reader,'fixture/0001','qualification/reviews/fixture-only.json']},{log:(...a)=>calls.push(a)},parseLatencyReceipt,parseLatencyReceipts);
  const result=JSON.parse(output.bytes);assert.equal(result.terminalStatus,'SYNTHETIC-FIXTURE-NOT-VERIFIED');
  assert.equal(result.timedMetrics.classes['point-current'].correctThroughDrain,events.length);
  report.observations.push({label,manifest,events,result,stdout:calls,sharedParserImported:/parseLatencyReceipt|receipts\/parse/.test(source)});
}
let checksums=0;
for(const line of fs.readFileSync('lab/experiments/EXP-QNODELAY/round4/SHA256SUMS','utf8').trim().split('\n')){const [,h,p]=/^(\w{64})\s+(.+)$/.exec(line);assert.equal(sha(fs.readFileSync(p)),h,p);checksums++;}
const inventory=JSON.parse(fs.readFileSync('lab/receipts/reader-inventory.json'));for(const s of inventory.sources)assert.equal(sha(fs.readFileSync(s.path)),s.sha256,s.path);
const changed=JSON.parse(fs.readFileSync('lab/experiments/EXP-QNODELAY/round4/changed-source-hashes.json')),map=new Map(changed.map(c=>[c.path,c]));
const pins=[];
function walk(v,trail,file){if(v&&typeof v==='object'){if(map.has(v.path)&&typeof v.sha256==='string')pins.push({file,trail,...map.get(v.path),pinnedSha256:v.sha256});for(const[k,x]of Object.entries(v))walk(x,`${trail}/${k}`,file);}}
for(const f of execFileSync('git',['ls-files','lab/acceptance'],{encoding:'utf8'}).trim().split('\n').filter(p=>p.endsWith('.json')))walk(JSON.parse(fs.readFileSync(f)),'',f);
report.audit={checksums,reviewedSourceHashes:inventory.sources.length,declaredReaders:inventory.sources.filter(s=>s.role==='reader').length,omittedReaderInInventory:inventory.sources.some(s=>s.path===reader),pins,acceptanceDiff:execFileSync('git',['diff','4e235a1^','4e235a1','--','lab/acceptance'],{encoding:'utf8'}),transportDiff:execFileSync('git',['diff','80d16039','4e235a1','--','packages/qlever/src/QleverClient.ts','pnpm-lock.yaml'],{encoding:'utf8'})};
assert.equal(report.audit.acceptanceDiff,'');assert.equal(report.audit.transportDiff,'');assert.equal(sha(fs.readFileSync(reader)),report.readerSha256);
report.runnerSha256=sha(fs.readFileSync(`${own}/extra.mjs`));report.endedAt=new Date().toISOString();
fs.writeFileSync(`${own}/extra-result.json`,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({...report,observations:report.observations.map(o=>({label:o.label,parsed:o.sharedParserImported,metrics:o.result.timedMetrics,terminal:o.result.terminalStatus}))},null,2));

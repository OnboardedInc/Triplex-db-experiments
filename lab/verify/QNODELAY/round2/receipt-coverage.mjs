// [CX-VQNODELAY-R2] Why: execute remaining timing serializers with mode-bearing inputs and no engines.
// Rejected: equating constructor-count coverage with all output paths or relabeling historical receipts.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { qleverLatencyReceipt } from '../../../receipts/latency.mjs';
import { summarizeGridCell } from '../../../experiments/EXP-QG1-qlever-generations/summary-cell.mjs';
import { start,finish,sha } from './common.mjs';
const c8='lab/experiments/EXP-C8-read-only-frontier/summarize-timing.mjs';
const checker='lab/receipts/check-writers.mjs';
const inventoryPath='lab/experiments/EXP-QNODELAY/round2/receipt-writers.json';
const report={...start(['lab/verify/QNODELAY/round2/receipt-coverage.mjs',c8,checker,inventoryPath,'lab/receipts/latency.mjs','lab/receipts/latency.d.mts','lab/experiments/EXP-QG1-qlever-generations/grid.mjs','lab/experiments/EXP-QG1-qlever-generations/summary-cell.mjs']),classification:'OFFLINE SERIALIZATION QA; synthetic fixture timings, no engine or performance acceptance',c8:[],grid:[]};
for(const mode of ['keep-alive','per-request']) {
  const input={qleverConnectionMode:mode,lane:'qlever',label:report.id,graphs:{fixture:{edges:1,reach:1,native:[{totalMs:7,steps:[['read',7]]}],datalog:[9]}}};
  const file=`lab/verify/QNODELAY/round2/c8-${mode}-input.json`;
  fs.writeFileSync(file,JSON.stringify(input)+'\n',{flag:'wx'});
  const raw=execFileSync('node',[c8,file],{encoding:'utf8'}),output=JSON.parse(raw);
  assert.equal(output.lane,'qlever');assert.equal(output.nativeTotalMs,'7-7');assert.deepEqual(output.datalogMs,[9]);
  report.c8.push({mode,inputPath:file,inputSha256:sha(fs.readFileSync(file)),output,missingMode:!Object.hasOwn(output,'qleverConnectionMode')});
}
const inventory=JSON.parse(fs.readFileSync(inventoryPath));
assert(!inventory.some(x=>x.path===c8));
assert(report.c8.every(x=>x.missingMode));
report.c8Uninventoried=true;
const grid='lab/experiments/EXP-QG1-qlever-generations/grid.mjs',text=fs.readFileSync(grid,'utf8');
const fragment=text.slice(text.indexOf('async function req('),text.indexOf('\nconst seed ='));
const emitted=[];
const req=new Function('fetch','fs','path','out','hash','save','qleverLatencyReceipt',`let serial=0;${fragment};return req;`)(async()=>({status:200,text:async()=>JSON.stringify({nonce:report.id})}),{writeFileSync:(file,bytes)=>emitted.push({file,bytes})},path,'fixture-only',sha,(file,value)=>emitted.push({file,value}),qleverLatencyReceipt);
const returned=await req({query:'SELECT ?x WHERE {}'});
const receipt=emitted.find(x=>x.file==='1.request.json').value;
assert.equal(receipt.sha256,sha(JSON.stringify({nonce:report.id})));
assert.equal(receipt.qleverConnectionMode,'keep-alive');assert.equal(returned.qleverConnectionMode,'keep-alive');
report.grid.push({receipt,returned,sourceFragmentSha256:sha(fragment)});
const cell={qleverConnectionMode:'keep-alive',label:'N0',before:{baseTriples:1,deltaTriples:{total:0},rss:1},c8:{status:0},p4:{status:0,qleverConnectionMode:'per-request'},results:{base:[{qleverConnectionMode:'keep-alive',ms:2,rows:1},{qleverConnectionMode:'keep-alive',ms:1,rows:1}]}};
const child={qleverConnectionMode:'per-request',sample:[{contentEqual:true}],summary:{p50:1,p99:2}};
report.gridSummary=summarizeGridCell('M',cell,child);
assert.equal(report.gridSummary.p4QleverConnectionMode,'per-request');
assert.throws(()=>summarizeGridCell('M',{...cell,qleverConnectionMode:undefined},child),TypeError);
assert.throws(()=>summarizeGridCell('M',cell,{...child,qleverConnectionMode:undefined}),TypeError);
finish('lab/verify/QNODELAY/round2/receipt-coverage.json',report);
console.log(JSON.stringify(report,null,2));

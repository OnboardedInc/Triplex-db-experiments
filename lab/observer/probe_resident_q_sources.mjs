// [EXP-OBS01] Why: confirm the alternative resident's source availability without changing its flags or issuing writes.
// Rejected: assuming a missing metrics/event source is enabled, or presenting host reachability as an authenticated bundle.
import fs from 'node:fs';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';import {inspect} from '../bin/lib.mjs';
const before=inspect('tx2-qlever-dev'),reads=[];
for(const endpoint of ['/?cmd=stats','/?cmd=dump-active-queries','/metrics']){
 const tStart=performance.now();const response=await fetch('http://127.0.0.1:7070'+endpoint,{headers:{'User-Agent':'lab-observer-source-probe'},signal:AbortSignal.timeout(5000)});const body=Buffer.from(await response.arrayBuffer());
 assert(body.length<2*1024*1024);reads.push({endpoint,status:response.status,tStart,tEnd:performance.now(),sha256:createHash('sha256').update(body).digest('hex'),body:body.toString()});
}
const after=inspect('tx2-qlever-dev');assert.equal(before.Id,after.Id);assert.equal(before.State.StartedAt,after.State.StartedAt);
const stats=reads.find(r=>r.endpoint==='/?cmd=stats'),metrics=reads.find(r=>r.endpoint==='/metrics');const base=stats.status===200?JSON.parse(stats.body)['num-triples-normal']:null;
const delta=metrics.status===200?metrics.body.match(/^qlever_delta_triples\s+(\d+)\s*$/m)?.[1]??null:null;
const output={claim:'diagnostic host source reachability only; no semantic or timing qualification; not an obs-bundle',engineContainerId:before.Id,baseTripleCount:base,deltaTripleCount:delta,touchedBlockDelta:null,timingQualification:'DIAGNOSTIC',reads};
fs.writeFileSync('lab/experiments/EXP-OBS01/round5/qlever-source-probe.json',JSON.stringify(output,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({baseTripleCount:base,deltaTripleCount:delta,statuses:reads.map(r=>[r.endpoint,r.status])}));

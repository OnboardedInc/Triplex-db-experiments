// [CX-VG03-56-R7A] Why: fresh adversarial variants and old-source controls establish that refusals are live and source-bound. Rejected: treating builder TAP counts or modified implementation as independent verification.
import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';import {createHash,createHmac,randomUUID} from 'node:crypto';import {execFileSync,spawnSync} from 'node:child_process';
import {verifyObserver,checkSmoke,trustedTerminal} from '../../../bin/ns-run.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex'),key=Buffer.alloc(32,17),runId=randomUUID(),domain={bootId:'7a064e31-8ca0-47a5-926f-d2de8d786302',primitive:'CLOCK_MONOTONIC',offsets:{monotonic:['0','0'],boottime:['0','0']}};
const final={source:{marker:1,subjects:[['s',7]],entries:[[1,'s',7]]},consumer:{marker:1,subjects:[['s',7]],entries:[[1,'s',7]]}},periodNs=[300000,450000],results=[];
const bodies=()=>[{polls:[{store:'source',lsn:0}]},{polls:[{store:'source',lsn:1}]},{polls:[],final:structuredClone(final),periodNs:[...periodNs]}].map(b=>({schema:'ns-observer/1',runId,domain:structuredClone(domain),...b}));
function sign(bs,k=key){let head='0'.repeat(64);const rows=bs.map((b,sequence)=>{const raw=JSON.stringify({...b,sequence,previous:head});head=createHmac('sha256',k).update(raw).digest('hex');return {raw,hmac:head}});return {rows,seal:{schema:'ns-observer-seal/1',runId,chunks:rows.length,head,domain:structuredClone(domain),final:structuredClone(final),periodNs:[...periodNs]}}}
const files=({rows,seal})=>new Map([['polls.ndjson',Buffer.from(rows.map(JSON.stringify).join('\n')+'\n')],['seal.json',Buffer.from(JSON.stringify(seal))]]);
assert.deepEqual(verifyObserver(files(sign(bodies())),key,runId).seal.final,final);results.push({name:'fresh authentic three-record control',accepted:true});
function refuses(name,mutate,expected=/observer/){const fixture=sign(bodies());mutate(fixture);assert.throws(()=>verifyObserver(files(fixture),key,runId),expected);results.push({name,refused:true})}
for(const field of ['schema','runId','chunks','head','domain','final','periodNs']){
 refuses('seal field removed: '+field,f=>delete f.seal[field]);
 refuses('seal field changed: '+field,f=>{f.seal[field]=field==='schema'?'other':field==='runId'?'stale':field==='chunks'?2:field==='head'?'f'.repeat(64):field==='domain'?{...domain,bootId:'f'.repeat(36)}:field==='final'?{...final,consumer:{...final.consumer,marker:99}}:[1]});
}
refuses('unkeyed digest cannot replace final HMAC',f=>{const b=JSON.parse(f.rows[2].raw);b.final.consumer.marker=9;f.rows[2].raw=JSON.stringify(b);f.rows[2].hmac=hash(f.rows[2].raw);f.seal.head=f.rows[2].hmac;f.seal.final=b.final});
refuses('entire chain re-signed with foreign key',f=>Object.assign(f,sign(bodies(),Buffer.alloc(32,18))));
refuses('unsigned final edit with matching seal copy',f=>{const b=JSON.parse(f.rows[2].raw);b.periodNs=[1];f.rows[2].raw=JSON.stringify(b);f.seal.periodNs=[1]});
refuses('reordered captured records and adjusted convenience head',f=>{[f.rows[0],f.rows[1]]=[f.rows[1],f.rows[0]];f.seal.head=f.rows.at(-1).hmac});
refuses('truncated final with matching head/count',f=>{f.rows.pop();f.seal.chunks=f.rows.length;f.seal.head=f.rows.at(-1).hmac},/final record missing/);
refuses('validly signed second final',f=>{const bs=bodies();bs.push(structuredClone(bs.at(-1)));Object.assign(f,sign(bs))},/records after final/);
refuses('validly signed poll after final',f=>{const bs=bodies();bs.push(structuredClone(bs[0]));Object.assign(f,sign(bs))},/records after final/);
refuses('validly signed final before polls',f=>{const bs=bodies();Object.assign(f,sign([bs[2],bs[0],bs[1]]))},/records after final/);
refuses('validly signed clock-domain change',f=>{const bs=bodies();bs[1].domain.bootId='a'.repeat(36);Object.assign(f,sign(bs))},/domain changed/);
// [CX-VG03-56-R7A] Why: null is malformed producer data, and must not double as an uninitialized-domain sentinel. Rejected: treating an authenticated signature as a clock-domain schema check.
const nullDomainBodies=bodies();nullDomainBodies[0].domain=null;
const nullDomainAccepted=verifyObserver(files(sign(nullDomainBodies)),key,runId);assert.deepEqual(nullDomainAccepted.seal.domain,domain);
results.push({name:'F4 initial null clock domain followed by a valid different domain is accepted',accepted:true,firstRecordDomain:null,returnedDomain:nullDomainAccepted.seal.domain,authenticatedMalformedProducerFixture:true});
assert.throws(()=>verifyObserver(files(sign(bodies())),key,'other-attempt'),/content\/binding/);results.push({name:'freshness rejects other attempt',refused:true});
const poison=new Proxy([],{get(){throw Error('UNEXPECTED-EVENT-ACCESS')}});
for(const terminal of [undefined,trustedTerminal({runId,exec:{status:7}}),trustedTerminal({runId,exec:{status:null}}),trustedTerminal({runId,exec:{status:0},faultError:Error('stream-failure')})]){assert.throws(()=>checkSmoke(poison,null,null,0,{runId},terminal),/DRIVER-/);results.push({name:'terminal rejects before event access '+JSON.stringify(terminal),refused:true})}

const original=new URL('../review-round6-original.mjs',import.meta.url),builder=new URL('../review-round6.mjs',import.meta.url);
const oldOriginal=execFileSync('git',['show','d31569ec:lab/verify/G03/review-round6.mjs']);assert.deepEqual(fs.readFileSync(original),oldOriginal);
const child=spawnSync(process.execPath,['--experimental-vm-modules',original.pathname],{encoding:'utf8'});assert.equal(child.status,1);assert.match(child.stderr,/observer final record missing/);
fs.writeFileSync(new URL('./original-refusal.stderr.txt',import.meta.url),child.stderr);results.push({name:'byte-identical original reproduction refuses',exit:child.status,sourceSha256:hash(oldOriginal),reason:'observer final record missing'});
const fixed=spawnSync(process.execPath,['--experimental-vm-modules',builder.pathname],{encoding:'utf8'});assert.equal(fixed.status,0,fixed.stderr);fs.writeFileSync(new URL('./builder-inverted.json',import.meta.url),fixed.stdout);results.push({name:'builder inverted control accepts only refusals',exit:fixed.status});

// [CX-VG03-56-R7A] Why: substitute old driver bytes only at the test reader, leaving the implementation untouched. Rejected: restoring the old driver on disk during concurrent checks.
const oldDriver=execFileSync('git',['show','95b0593c:lab/bench/ns-driver/driver.mjs'],{encoding:'utf8'}),builderBytes=fs.readFileSync(builder,'utf8');let substituted=false;
const fsProxy={...fs,readFileSync(file,...args){if(String(file).endsWith('/lab/bench/ns-driver/driver.mjs')){substituted=true;return oldDriver}return fs.readFileSync(file,...args)}};
const imported={
 'node:assert/strict':{default:assert},'node:fs':{default:fsProxy},'node:vm':{default:vm},'node:crypto':await import('node:crypto'),
 '../../bin/ns-run.mjs':await import('../../../bin/ns-run.mjs'),'../../bench/ns-driver/answer.mjs':await import('../../../bench/ns-driver/answer.mjs'),
 '../../bench/ns-driver/fault.mjs':await import('../../../bench/ns-driver/fault.mjs'),'../../bin/ns-fault.mjs':await import('../../../bin/ns-fault.mjs'),
 '../../bin/box.mjs':await import('../../../bin/box.mjs'),'../../bin/ns-policy.mjs':await import('../../../bin/ns-policy.mjs'),
};
const ctx=vm.createContext({Buffer,URL,process,console,setTimeout,clearTimeout});const control=new vm.SourceTextModule(builderBytes,{context:ctx,identifier:builder.href,initializeImportMeta:m=>m.url=builder.href});
await control.link(async spec=>{const values=imported[spec];assert.ok(values,spec);return new vm.SyntheticModule(Object.keys(values),function(){for(const [k,v]of Object.entries(values))this.setExport(k,v)},{context:ctx})});
let oldFailure;try{await control.evaluate()}catch(e){oldFailure=e}assert.ok(substituted);assert.ok(oldFailure);assert.match(oldFailure.message,/null[\s\S]*OFFLINE-PLANTED-HOOK-FAILURE/);
results.push({name:'inverted control fails with exact old driver bytes',failedAsExpected:true,oldDriverSha256:hash(oldDriver),error:oldFailure.message,implementationChanged:false});
console.log(JSON.stringify({review:'CX-VG03-56-R7A',reviewedCode:'ef1a9216',runId,scope:'offline integrity controls; no semantic qualification',results},null,2));

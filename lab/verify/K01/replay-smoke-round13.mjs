// [EXP-K01-VK01-R13] Why: rehash the retained smoke bytes and replay its complete captured wire rows through current G0 without an endpoint. Rejected: treating equal printed digest strings or a diagnostic ledger as qualified clone admission.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {spawnSync}from'node:child_process';
import {readG0,readE1G0,fields}from'../../bench/lib/g0.ts';import{wireValue}from'../../bench/lib/g0-values.ts';import{expectedN01}from'../../bench/lib/g0-xtdb.ts';
const out=path.join(import.meta.dirname,'evidence/review-round13/smoke-replay.json');if(fs.existsSync(out))throw Error('preserve replay attempt');
const disk=fs.statfsSync('.');if(disk.bavail*disk.bsize<5*1024**3)throw Error('disk floor');
const sha=b=>createHash('sha256').update(b).digest('hex');
const fixture=JSON.parse(fs.readFileSync('lab/bench/test/fixtures/g0-smoke13.json','utf8')),raw=path.dirname(fixture.provenance.ledger),base=path.dirname(raw);
const sums='lab/experiments/EXP-K01-seed-clone/evidence/round13/RAW-SHA256SUMS',hashes={},sources={};let bytes=0;
for(const line of fs.readFileSync(sums,'utf8').trim().split('\n')){const[h,p]=line.split('  '),b=fs.readFileSync(p);assert.equal(sha(b),h,p);hashes[p]=h;bytes+=b.length;}
const ledger=JSON.parse(fs.readFileSync(fixture.provenance.ledger,'utf8'));assert(ledger.diagnosticOnly);assert.equal(ledger.grantsAdmission,false);assert.equal(ledger.failures.length,2);assert.deepEqual(ledger.sourceHashes,ledger.finalSourceHashes);
for(const[p,h]of Object.entries(ledger.sourceHashes))assert.equal(sha(fs.readFileSync(path.join(base,'preimages',p))),h,p);
for(const p of ['lab/verify/K01/replay-smoke-round13.mjs','lab/bench/lib/g0.ts','lab/bench/lib/g0-xtdb.ts','lab/bench/lib/g0-values.ts','lab/bench/lib/g0-normalize.ts','lab/bench/lib/g0-catalog.ts','lab/bench/lib/n01-counts.ts'])sources[p]=sha(fs.readFileSync(p));
const manifests={source:JSON.parse(fs.readFileSync(path.join(base,'source-manifest.json'),'utf8')),fresh:JSON.parse(fs.readFileSync(path.join(base,'fresh-manifest.json'),'utf8'))};
const results=[];
for(const [capture,arm,observation,e1]of [['source-capture','source','source-Dprime',true],['restart-1-capture','source','restart-1-D',false],['restart-2-capture','source','restart-2-D',false],['fresh-capture','fresh','fresh-Dprime',true],['fresh-final-capture','fresh',null,false]]){
 const c=JSON.parse(fs.readFileSync(path.join(raw,capture+'.json'),'utf8')),m=manifests[arm],expected=expectedN01(m);
 const reader={endpoint:'offline-captured-wire:'+capture,catalog:async()=>structuredClone(c.catalog),scopes:async()=>[{scope_key:m.scope,position:m.result.lastPosition}],count:async t=>c.counts[t].absent?0:c.counts[t].count,async *scan(t){if(c.counts[t].absent)return;const record=c.rows[t];assert(record.complete);const b=fs.readFileSync(record.path);assert.equal(sha(b),record.sha256);let n=0;for(const line of b.toString().trim().split('\n')){if(!line)continue;n++;const row=JSON.parse(line);yield Object.fromEntries(Object.entries(row).map(([k,v])=>[k,v===null?null:wireValue(v.oid,Buffer.from(v.hex,'hex'),v.nativeType)]));}assert.equal(n,record.n);}};
 const pin=await(e1?readE1G0:readG0)(reader,expected);assert.equal(pin.D,m.g0.D);
 const obs=observation?JSON.parse(fs.readFileSync(path.join(raw,observation+'.json'),'utf8')):m.g0;assert.equal(pin.D,obs.D);if(e1)assert.equal(pin.Dprime,obs.Dprime);
 results.push({capture,arm,D:pin.D,...(e1?{Dprime:pin.Dprime}:{}),rows:expected.counts.tx_assertions,diagnosticOnly:true,grantsAdmission:false});
}
assert.equal(results[0].Dprime,results[3].Dprime);assert.notEqual(results[0].D,results[3].D);
const layouts=[1,2].map(n=>JSON.parse(fs.readFileSync(path.join(raw,'restart-'+n+'-layout.json'),'utf8')));assert.deepEqual(layouts[0],layouts[1]);
for(const[p,h]of Object.entries(sources))assert.equal(sha(fs.readFileSync(p)),h);
fs.writeFileSync(out,JSON.stringify({at:new Date().toISOString(),head:spawnSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).stdout.trim(),sources,rawManifest:sums,rawManifestSha256:sha(fs.readFileSync(sums)),verifiedFiles:Object.keys(hashes).length,verifiedBytes:bytes,ledgerSha256:sha(fs.readFileSync(fixture.provenance.ledger)),results,layouts,diagnosticOnly:true,grantsAdmission:false,inputsUnchanged:true},null,2)+'\n');
process.stdout.write('Verified '+Object.keys(hashes).length+' raw files; replayed all five captures, D/Dprime and source layouts match. Diagnostic only.\n');

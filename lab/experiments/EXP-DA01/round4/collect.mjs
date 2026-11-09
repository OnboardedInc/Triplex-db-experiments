import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
// [EXP-DA01] Why: bind this round's exact source, fresh gate bytes, full matrix outcomes and preserved resident proofs before reporting PASS. Rejected: selecting an earlier green receipt by date or trusting a summary count alone.
const dir=import.meta.dirname,root=process.cwd(),head=process.argv[2];
assert.match(head??'',/^[a-f0-9]{40}$/);
const read=p=>JSON.parse(fs.readFileSync(p)),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const events=p=>fs.readFileSync(p,'utf8').split('\n').filter(l=>l.startsWith('{')).flatMap(l=>{try{return [JSON.parse(l)]}catch{return []}});
assert.equal(execFileSync('git',['diff',head,'--','packages','lab/bin','lab/config','pnpm-lock.yaml'],{encoding:'utf8'}),'');
const runs=['G0','G1'].flatMap(g=>fs.readdirSync(`lab/runs/${g}`).filter(n=>n.startsWith(g+'-datomic-')&&n.endsWith('.json')).map(n=>({file:`lab/runs/${g}/${n}`,receipt:read(`lab/runs/${g}/${n}`)}))).filter(x=>x.receipt.git.head===head&&x.receipt.experiment==='EXP-DA01');
assert.equal(runs.filter(x=>x.receipt.gate==='G0'&&x.receipt.verdict==='PASS').length,1);
const g1=runs.filter(x=>x.receipt.gate==='G1'&&x.receipt.verdict==='PASS');assert.equal(g1.length,2);assert(g1.some(x=>g1.some(y=>y.receipt.runId===x.receipt.previous)));
const summaries=[];
function matrix(file){
  const summary=read(file),m=summary.queryMatrix;assert.equal(m.bases,12);assert.equal(m.paths.length,39);assert.equal(m.observations,936);assert.equal(m.refusals,404);
  const journal=fs.readFileSync(path.join(path.dirname(file),'reads.jsonl'),'utf8').trim().split('\n').map(l=>JSON.parse(l));
  const observations=journal.filter(x=>x.kind==='query-route-matrix');assert.equal(observations.length,936);
  const keys=new Set();let refused=0;
  for(const o of observations){const key=`${o.phase}/${o.path}/${o.cut}`;assert(!keys.has(key));keys.add(key);
    assert(m.paths.includes(o.path));assert(['before','after'].includes(o.phase));
    if(o.eligible){assert(Array.isArray(o.outcome.rows));const expected=o.path==='live-pull-id'?o.expected.filter(id=>id==='matrix-0'):o.expected;assert.deepEqual(o.outcome.rows,expected);}
    else{assert.equal(o.outcome.code,'BasisNotAvailable');refused++;}
  }
  assert.equal(refused,404);return m;
}
for(const {file,receipt:r} of runs){
  assert.equal(r.verdict,'PASS');assert(Date.parse(r.startedAt)>=Date.parse('2026-11-09T00:50:00Z'));assert.equal(r.git.diffBytes,0);assert.deepEqual(r.git.modifiedFiles,[]);assert.deepEqual(r.git.untrackedFiles,[]);
  const raw=path.resolve(r.rawDir);assert(raw.startsWith(path.join(root,'runs')+path.sep));
  let queryMatrix;
  if(r.gate==='G1'){
    assert.equal(r.counts.pass,88);assert.equal(r.counts.executed,88);assert.equal(r.counts.fail,0);assert.equal(read(path.join(raw,'g1-report.json')).suite.status,'PASS');
    const cleanup=read(path.join(raw,'datomic-cleanup.json'));assert.equal(cleanup.length,89);for(const c of cleanup){assert.equal(c.status,200);assert.equal(c.body.deleted,true);}
    const e=events(path.join(raw,'route-equivalence.stdout.txt')),created=e.filter(x=>x.kind==='datomic-test-db-created'),deleted=e.filter(x=>x.kind==='datomic-test-db-deleted');assert.equal(created.length,1);assert.equal(deleted.length,1);assert.equal(deleted[0].scope,created[0].scope);assert.equal(deleted[0].db,created[0].db);assert.equal(deleted[0].deleted,true);
    assert.equal(r.routeEquivalence.passed,1);assert.equal(Object.keys(r.routeEquivalence.evidence).length,6);
    assert.equal(r.fixtures['packages/datomic/test/query-route-matrix.ts'],hash(fs.readFileSync('packages/datomic/test/query-route-matrix.ts')));
    for(const [file,digest] of Object.entries(r.routeEquivalence.evidence)){
      assert.equal(hash(fs.readFileSync(file)),digest);
      if(file.endsWith('.expected.json')){const expected=read(file);assert.equal(expected.verdict,'PASS');for(const [f,sha]of Object.entries(expected.oracle.sourceSha256))assert.equal(hash(fs.readFileSync(path.join('lab/oracles/replay',f))),sha);}
      if(file.endsWith('/routes.json'))queryMatrix=matrix(file);
    }
    assert(queryMatrix);
  }else{assert.equal(r.counts.fail,0);assert.equal(r.counts.unexpectedSkip,0);assert.equal(r.counts.pass,1095);}
  const dest=path.join(dir,'gates',r.runId);assert(!fs.existsSync(dest));fs.mkdirSync(dest,{recursive:true});fs.copyFileSync(file,path.join(dest,'receipt.json'));fs.cpSync(raw,path.join(dest,'raw'),{recursive:true});
  summaries.push({runId:r.runId,previous:r.previous,verdict:r.verdict,counts:r.counts,queryMatrix});
}
for(const [original,copy] of [["native-repro.mjs","native-repro.mjs"],["review.test.ts","review.test.ts.txt"]])assert.deepEqual(fs.readFileSync(path.join(dir,'reviewer',copy)),execFileSync('git',['show',`807c46e:lab/verify/DA01/${original}`]));
const reproFiles=fs.readdirSync(path.join(dir,'reviewer')).filter(f=>/^CX-VDA01-native-.*\.json$/.test(f));assert.equal(reproFiles.length,1);
const repro=read(path.join(dir,'reviewer',reproFiles[0]));assert.equal(repro.scriptSha256,hash(fs.readFileSync(path.join(dir,'reviewer/native-repro-local.mjs'))));assert.equal(repro.findingReproduced,true);assert.equal(repro.cleanup.deleted,true);assert.equal(repro.cleanup.db,repro.created.db);
assert.equal(repro.health.gatewaySourceHash,'92c14a52764a4933376e8efbf4b7164a4d8f0318fe7996d6ac3ac8242e62386f');
for(const item of repro.requests){if(item.label==='before-ground-T'){assert.equal(item.status,200);assert.equal(item.parsed.rows.length,40);}else if(item.label.includes('source'))assert.equal(item.count,40);else if(item.label.includes('literal')){assert.equal(item.status,409);assert.equal(item.parsed.code,'BasisNotAvailable');}else{assert.equal(item.status,200);assert.equal(item.parsed.rows.length,30);}}
const builds=[];
for(const n of [1,2]){
  const log=fs.readFileSync(path.join(dir,`build-${n}.log`),'utf8'),receipt=[...log.matchAll(/"receipt": "([^"]+)"/g)].at(-1)?.[1];assert(receipt);const b=read(receipt);fs.copyFileSync(receipt,path.join(dir,`build-${n}-receipt.json`));
  for(const f of b.staged){const input=path.join(b.context,f.path);assert.equal(fs.statSync(input).size,f.bytes);assert.equal(hash(fs.readFileSync(input)),f.sha256);}
  if(n===2)for(const [kind,base]of [['gateway','packages/datomic/gateway'],['config','lab/config/datomic']])for(const f of b.sources[kind]){const bytes=fs.readFileSync(path.join(base,f.path));assert.equal(bytes.length,f.bytes);assert.equal(hash(bytes),f.sha256);}
  builds.push({imageId:b.imageId,buildInputsSha256:b.buildInputsSha256,sourceInputsSha256:b.sourceInputsSha256,gatewaySourceHash:hash(JSON.stringify(b.sources.gateway)),context:b.context,stagedFiles:b.staged.length});
  assert.equal(read(path.join(dir,`deploy-${n}.json`)).restored,true);
  assert.match(fs.readFileSync(path.join(dir,`selftest-window-${n}.log`),'utf8'),/Ran 8 tests containing 171 assertions\./);
}
const final=builds.at(-1),container=JSON.parse(execFileSync('docker',['-H','unix:///Users/sam/.colima/triplex2/docker.sock','inspect','tx2-datomic-dev'],{encoding:'utf8'}))[0];
assert.equal(container.Image,final.imageId);assert.equal(container.State.Running,true);const pinned=read('lab/config/slots.json').lanes.datomic;assert.equal(pinned.imageId,final.imageId);assert.equal(pinned.buildInputsSha256,final.buildInputsSha256);assert.equal(pinned.sourceInputsSha256,final.sourceInputsSha256);
assert(container.Mounts.some(m=>m.Type==='volume'&&m.Name==='tx2-datomic-dev-data'));
fs.writeFileSync(path.join(dir,'resident-image.json'),JSON.stringify({id:container.Id,image:container.Image,running:container.State.Running,startedAt:container.State.StartedAt,memory:container.HostConfig.Memory,mounts:container.Mounts.map(m=>({type:m.Type,name:m.Name,destination:m.Destination}))},null,2)+'\n');
const health=await(await fetch('http://127.0.0.1:8470/health')).json();assert.equal(health.gatewaySourceHash,final.gatewaySourceHash);
const owner=read('/Users/sam/projects/triplex-db-2/lab/locks/datomic-dev/owner.json');assert.equal(owner.holder,'EXP-DA01');
const preservation=[];for(const proof of read(path.join(dir,'../round3/resident-proof.json')).proofs){const response=await fetch(`http://127.0.0.1:8470/v1/db/${proof.db}/basis`);assert.equal(response.status,200);const basis=await response.json();assert.deepEqual(basis,proof.basis);preservation.push({db:proof.db,status:response.status,basis,checkedAt:new Date().toISOString()});}
const live=read(path.join(dir,'live-receipt.json'));assert.equal(live.head,head);assert.equal(live.status,0);assert.equal(live.passed,118);assert.equal(live.failures,0);assert.equal(live.image,final.imageId);assert.deepEqual(live.health,health);assert.equal(live.containerId,container.Id);
// [EXP-DA01] Why: later gate builds may re-emit declarations; functional live execution binds source and runtime bytes, while each gate binds its own fresh declarations. Rejected: silently allowing runtime drift or claiming declaration byte identity across builds.
const declarationRebuilds=[];
for(const [file,digest]of Object.entries(live.source)){
  const bytes=fs.readFileSync(file),actual=hash(bytes);
  if(actual!==digest){assert.match(file,/^packages\/(core|testkit)\/dist\/.*\.d\.ts(?:\.map)?$/);declarationRebuilds.push({file,liveSha256:digest,gateSha256:actual});const copy=path.join(dir,'rebuilt-declarations',file);fs.mkdirSync(path.dirname(copy),{recursive:true});fs.writeFileSync(copy,bytes);}
}
assert.equal(hash(fs.readFileSync(path.join(dir,'live-final.json'))),live.outputSha256);assert.equal(hash(fs.readFileSync(path.join(dir,'live-final.log'))),live.logSha256);assert(events(path.join(dir,'live-validation.log')).some(e=>e.validated===true&&e.passed===118));
assert.equal(live.created.length,18);assert.equal(live.deleted.length,18);for(const c of live.created)assert.equal(live.deleted.filter(d=>d.scope===c.scope&&d.db===c.db&&d.deleted===true).length,1);
const disk=fs.statfsSync(root);
fs.writeFileSync(path.join(dir,'SUMMARY.json'),JSON.stringify({format:'tx2-da01-round4/1',at:new Date().toISOString(),implementationHead:head,gates:summaries,builds,health,owner,preservation,live:{passed:118,created:18,deleted:18,declarationRebuilds},jvm:{tests:8,assertions:171},hostFreeBytes:disk.bavail*disk.bsize},null,2)+'\n',{flag:'wx'});
fs.writeFileSync(path.join(dir,'engine-status-final.txt'),execFileSync(process.execPath,['lab/bin/engine.mjs','status'],{env:{...process.env,TX2_CONFIG_DIR:root},encoding:'utf8'}));
console.log(JSON.stringify({validated:true,head,image:final.imageId,gates:summaries.map(r=>r.runId)}));

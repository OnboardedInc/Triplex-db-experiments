// @ts-nocheck -- [EXP-CHECKJS-R2] dynamic collections, runtime Buffer-to-JSON coercion, or validated values without static narrowing. Binding errors remain checked by lab/bin/checkjs.mjs.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
// [EXP-DA01] Why: bind final-source gates, independent oracle bytes, real cleanup and resident preservation. Rejected: a PASS-only narrative without retained failures or actual route receipts.
const dir=import.meta.dirname,root=path.resolve(dir,'../../../..');
const read=p=>JSON.parse(fs.readFileSync(p));
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const head=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
const events=file=>fs.readFileSync(file,'utf8').split('\n').filter(l=>l.startsWith('{')).flatMap(l=>{try{return [JSON.parse(l)]}catch{return []}});
const runs=['G0','G1'].flatMap(gate=>fs.readdirSync(path.join(root,'lab/runs',gate)).filter(n=>n.startsWith(gate+'-datomic-')&&n.endsWith('.json')).map(n=>read(path.join(root,'lab/runs',gate,n)))).filter(r=>r.experiment==='EXP-DA01'&&Date.parse(r.startedAt)>=Date.parse('2026-11-09T00:00:00Z'));
const fresh=runs.filter(r=>r.git.head===head&&r.verdict==='PASS');
const g1=fresh.filter(r=>r.gate==='G1');
if(!fresh.some(r=>r.gate==='G0')||!g1.some(r=>g1.some(p=>p.runId===r.previous)))throw new Error('Missing final-source G0 and linked G1 rerun');
const summaries=[];
for(const r of runs){
  if(r.verdict==='PASS'&&(r.git.diffBytes!==0||r.git.modifiedFiles.length||r.git.untrackedFiles.length))throw new Error('Modified executed source');
  const raw=path.resolve(root,r.rawDir);if(!raw.startsWith(path.join(root,'runs')+path.sep))throw new Error('Unexpected raw path');
  let cleanup=[],routeCleanup=[],routeSummary;
  if(r.gate==='G1'){
    const report=read(path.join(raw,'g1-report.json'));
    cleanup=read(path.join(raw,'datomic-cleanup.json'));
    if(cleanup.length!==89||cleanup.some(c=>c.status!==200||c.body.deleted!==true))throw new Error('Conformance cleanup incomplete');
    const logs=events(path.join(raw,'route-equivalence.stdout.txt'));
    const created=logs.filter(x=>x.kind==='datomic-test-db-created');routeCleanup=logs.filter(x=>x.kind==='datomic-test-db-deleted');
    routeSummary=logs.find(x=>x.kind==='datomic-route-equivalence');
    if(r.verdict==='PASS'){
      if(r.counts.pass!==88||r.counts.executed!==88||r.counts.fail!==0||report.suite.status!=='PASS'||r.routeEquivalence?.passed!==1)throw new Error('Incomplete G1 acceptance');
      if(created.length!==1||routeCleanup.length!==1||!routeCleanup[0].deleted||created[0].scope!==routeCleanup[0].scope||routeSummary?.observations!==88)throw new Error('Route fixture cleanup/coverage incomplete');
      for(const [file,digest]of Object.entries(r.routeEquivalence.evidence)){
        const absolute=path.resolve(root,file);if(hash(fs.readFileSync(absolute))!==digest)throw new Error('Oracle evidence bytes changed');
        if(file.endsWith('.expected.json')){
          const expected=read(absolute);if(expected.verdict!=='PASS')throw new Error('Oracle receipt consistency failed');
          for(const [name,sha]of Object.entries(expected.oracle.sourceSha256))if(hash(fs.readFileSync(path.join(root,'lab/oracles/replay',name)))!==sha)throw new Error('Oracle source identity differs');
        }
      }
    }
  }
  const dest=path.join(dir,'gates',r.runId);fs.mkdirSync(dest,{recursive:true});
  fs.copyFileSync(path.join(root,'lab/runs',r.gate,r.runId+'.json'),path.join(dest,'receipt.json'));fs.cpSync(raw,path.join(dest,'raw'),{recursive:true});
  summaries.push({runId:r.runId,head:r.git.head,previous:r.previous,verdict:r.verdict,counts:r.counts,deletedDatabases:cleanup.length,routeDeletedDatabases:routeCleanup.length,routeSummary});
}
const builds=[];
for(const name of ['build-1.log','build-2.log']){
  const log=fs.readFileSync(path.join(dir,name),'utf8');const file=[...log.matchAll(/"receipt": "([^"]+)"/g)].at(-1)?.[1];if(!file)throw new Error('Build receipt absent');
  const build=read(file);fs.copyFileSync(file,path.join(dir,name.replace('.log','-receipt.json')));builds.push({imageId:build.imageId,buildInputsSha256:build.buildInputsSha256,sourceInputsSha256:build.sourceInputsSha256,gatewaySourceSha256:hash(JSON.stringify(build.sources.gateway)),context:build.context,stagedFiles:build.staged.length});
}
const final=builds.at(-1);
const container=JSON.parse(execFileSync('docker',['-H','unix:///Users/sam/.colima/triplex2/docker.sock','inspect','tx2-datomic-dev'],{encoding:'utf8'}))[0];
if(container.Image!==final.imageId||!container.State.Running)throw new Error('Resident differs from final image');
const health=await(await fetch('http://127.0.0.1:8470/health')).json();if(health.gatewaySourceHash!==final.gatewaySourceSha256)throw new Error('Resident source differs');
const owner=read('/Users/sam/projects/triplex-db-2/lab/locks/datomic-dev/owner.json');if(owner.holder!=='EXP-DA01')throw new Error('Resident owner changed');
const preservation=read(path.join(dir,'resident-proof.json')).proofs;
for(const proof of preservation){const response=await fetch(`http://127.0.0.1:8470/v1/db/${proof.db}/basis`);if(response.status!==200||JSON.stringify(await response.json())!==JSON.stringify(proof.basis))throw new Error('DA00 proof changed');}
fs.writeFileSync(path.join(dir,'resident-image.json'),JSON.stringify({id:container.Id,image:container.Image,running:container.State.Running,memory:container.HostConfig.Memory,mounts:container.Mounts.map(m=>({type:m.Type,name:m.Name,destination:m.Destination}))},null,2)+'\n');
fs.writeFileSync(path.join(dir,'engine-status-final.txt'),execFileSync(process.execPath,['lab/bin/engine.mjs','status'],{cwd:root,env:{...process.env,TX2_CONFIG_DIR:root},encoding:'utf8'}));
const liveLog=path.join(dir,'live-final.log'),liveEvents=events(liveLog),created=liveEvents.filter(x=>x.kind==='datomic-test-db-created'),deleted=liveEvents.filter(x=>x.kind==='datomic-test-db-deleted');
if(!/118 passed/.test(fs.readFileSync(liveLog,'utf8'))||created.length!==18||deleted.length!==18||deleted.some(r=>!r.deleted)||created.some(c=>!deleted.some(d=>d.scope===c.scope)))throw new Error('Live validation/cleanup incomplete');
const packed=read(path.join(dir,'packed-exports/receipt.json'));if(packed.results.some(r=>r.status!==0))throw new Error('Packed export smoke failed');
for(const input of packed.inputs)if(hash(fs.readFileSync(input.path))!==input.sha256)throw new Error('Packed input changed');
const pack=read(path.join(dir,'pack-check.json'));
if(pack.status!==1||!/triplex-cli-.*missing package\/dist\/index\.js/.test(fs.readFileSync(path.join(dir,'pack-check.log'),'utf8')))throw new Error('Unexpected root package check outcome');
const disk=fs.statfsSync(root);
fs.writeFileSync(path.join(dir,'SUMMARY.json'),JSON.stringify({format:'tx2-da01-round3/1',at:new Date().toISOString(),implementationHead:head,gates:summaries,builds,health,owner,preservation,live:{passed:118,created:created.length,deleted:deleted.length},jvm:{tests:7,assertions:157},packCheck:pack,packedExports:packed,hostFreeBytes:disk.bavail*disk.bsize},null,2)+'\n');
console.log(JSON.stringify({head,gates:summaries.map(r=>({id:r.runId,counts:r.counts,route:r.routeSummary?.observations})),image:final.imageId,health},null,2));

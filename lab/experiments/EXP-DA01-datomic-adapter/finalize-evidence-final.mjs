// @ts-nocheck -- [EXP-CHECKJS-R2] generated/optional runtime modules unavailable in standalone source checking; dynamic collections, runtime Buffer-to-JSON coercion, or validated values without static narrowing. Binding errors remain checked by lab/bin/checkjs.mjs.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { DatomicClient } from '../../../packages/datomic/dist/index.js';
// [EXP-DA01] Why: bind copied original receipts, cleanup, image inputs and live preservation proof. Rejected: rewriting terminal receipts or adopting the cancelled attempt.
const root=path.resolve(import.meta.dirname,'../../..');
const inputDir=path.join(import.meta.dirname,'receipts/continued');
const dir=path.join(inputDir,'final');fs.mkdirSync(dir,{recursive:false});
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const read=file=>JSON.parse(fs.readFileSync(file));
const head=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
const runs=['G0','G1'].flatMap(gate=>fs.readdirSync(path.join(root,'lab/runs',gate)).filter(name=>name.startsWith(gate+'-datomic-')&&name.endsWith('.json')).map(name=>name.slice(0,-5))).filter(id=>read(path.join(root,'lab/runs',id.split('-')[0],id+'.json')).experiment==='EXP-DA01').sort();
const fresh=runs.map(id=>read(path.join(root,'lab/runs',id.split('-')[0],id+'.json'))).filter(r=>r.git.head===head&&r.verdict==='PASS');
const g1=fresh.filter(r=>r.gate==='G1');
if(!fresh.some(r=>r.gate==='G0')||g1.length<2||!g1.some(r=>g1.some(prior=>prior.runId===r.previous)))throw new Error('Missing final-source G0/two linked G1 passes');

const summaries=[];
for(const id of runs){
  const gate=id.split('-')[0],src=path.join(root,'lab/runs',gate,id+'.json'),r=read(src);
  const dest=path.join(dir,'gates',id);fs.mkdirSync(dest,{recursive:true});
  fs.copyFileSync(src,path.join(dest,'receipt.json'));
  const raw=path.resolve(root,r.rawDir);if(!raw.startsWith(path.join(root,'runs')+path.sep))throw new Error('Raw directory escaped');
  for(const name of fs.readdirSync(raw))if(/^(g1-report|datomic-cleanup|build-manifest(?:-after)?)\.json$|^lab-conformance\.(stdout|stderr)\.txt$/.test(name))fs.copyFileSync(path.join(raw,name),path.join(dest,name));
  const cleanup=fs.existsSync(path.join(dest,'datomic-cleanup.json'))?read(path.join(dest,'datomic-cleanup.json')):[];
  if(cleanup.some(e=>e.status!==200||e.body.deleted!==true))throw new Error('A gate cleanup failed');
  summaries.push({runId:id,verdict:r.verdict,head:r.git.head,counts:r.counts,previous:r.previous,deletedDatabases:cleanup.length,receiptSha256:hash(fs.readFileSync(src))});
}
const builds=[];
fs.mkdirSync(path.join(dir,'image-builds'),{recursive:true});
for(let n=1;n<=7;n++){
  const log=fs.readFileSync(path.join(inputDir,`build-${n}.log`),'utf8');
  const file=[...log.matchAll(/"receipt": "([^"]+)"/g)].at(-1)?.[1];if(!file)throw new Error('Build receipt missing');
  const bytes=fs.readFileSync(file),r=JSON.parse(bytes);
  fs.writeFileSync(path.join(dir,'image-builds',`build-${n}.json`),bytes,{flag:'wx'});
  builds.push({attempt:n,imageId:r.imageId,imageSize:r.imageSize,sourceInputsSha256:r.sourceInputsSha256,buildInputsSha256:r.buildInputsSha256,gatewaySourceSha256:hash(JSON.stringify(r.sources.gateway)),receipt:file,receiptSha256:hash(bytes)});
}
const client=new DatomicClient('http://127.0.0.1:8470');
const health=await client.health();if(health.gatewaySourceHash!==builds.at(-1).gatewaySourceSha256)throw new Error('Live gateway differs from final image source');
const old=read(path.join(root,'lab/experiments/EXP-DA00-datomic-bringup/receipts/summary.json'));
const preservation=[];
try{
  for(const known of [old.retention.initialKept,old.retention.final.kept]){
    const basis=await client.basis(known.db);
    if(basis.schemaHash!==known.schemaHash)throw new Error('DA00 retained schema proof changed');
    if(known.db===old.retention.final.kept.db && (basis.position.v!==old.persistence.basisAfter.position.v||basis.t.v!==old.persistence.basisAfter.t.v))throw new Error('DA00 final persistence proof changed');
    preservation.push({db:known.db,basis});
  }
}finally{client.close();}
const owner=read('/Users/sam/projects/triplex-db-2/lab/locks/datomic-dev/owner.json');
if(owner.holder!=='EXP-DA01')throw new Error('Resident ownership differs');
const status=execFileSync(process.execPath,['lab/bin/engine.mjs','status'],{cwd:root,env:{...process.env,TX2_CONFIG_DIR:root},encoding:'utf8'});
fs.writeFileSync(path.join(dir,'engine-status-final.txt'),status,{flag:'wx'});
const stat=fs.statfsSync(root);
const paired=read(path.join(inputDir,'consumer-3/inputs.json'));
fs.copyFileSync(paired.core.path,path.join(dir,'triplex-core.tgz'));
fs.copyFileSync(paired.datomic.path,path.join(dir,'triplex-datomic.tgz'));
const result={format:'tx2-da01-builder-evidence/1',at:new Date().toISOString(),implementationHead:head,scriptSha256:hash(fs.readFileSync(import.meta.filename)),gates:summaries,builds,health,owner,da00Preservation:preservation,hostDiskFreeBytes:stat.bavail*stat.bsize,datoms:read(path.join(inputDir,'datoms-image7.json')),packedConsumer:{...read(path.join(inputDir,'consumer-3/inputs.json')),recheck:read(path.join(inputDir,'consumer-3/smoke-image7.json'))}};
fs.writeFileSync(path.join(dir,'SUMMARY.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({head,gates:summaries.map(r=>[r.runId,r.verdict]),image:builds.at(-1).imageId,health,preservation},null,2));

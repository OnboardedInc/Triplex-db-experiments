// [CX-VP2B-R2] Why: freeze evidence only after completed, source-bound gates and keep each source version identifiable. Rejected: reclassifying historical observations or moving active SQLite stores for convenience.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const local='lab/verify/P2B/round2',root='/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VP2B/round2';
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const gates=['gate-9899538e-0699-44de-98cb-bce6cfd0261c','gate-30470d1b-b4e5-48fb-b242-1d80ce537b2a'];
for(const [i,name] of gates.entries()){
 const result=JSON.parse(fs.readFileSync(path.join(root,name,'result.json'),'utf8'));
 if(result.status!==0||!result.unchanged||JSON.stringify(result.counts)!==JSON.stringify([i?1:38])||sha(path.join(root,name,'tests.log'))!==result.logSha256)throw Error('Gate binding mismatch');
 if(i)for(const [p,identity] of Object.entries(result.after))if(sha(p)!==identity.sha256)throw Error('Final source changed: '+p);
}
const product=spawnSync('git',['diff','e9f0014b','--','packages/broker/src','lab/acceptance'],{encoding:'utf8'});
if(product.status||product.stdout)throw Error('Candidate product/acceptance bytes changed');
const audit=JSON.parse(fs.readFileSync(path.join(local,'long-audit-attempt1.json'),'utf8'));
if(audit.samples!==2827||audit.sourceDifferencesFromCandidate.length||audit.peakWal!==2027072)throw Error('Historical audit mismatch');
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):e.isFile()?[path.join(dir,e.name)]:[]);
const start=fs.statSync(path.join(root,gates[0],'before.json')).mtimeMs,end=fs.statSync(path.join(root,gates[0],'tests.log')).mtimeMs;
const upstream='/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VP2B/upstream';
const fixtureDirs=fs.readdirSync(upstream,{withFileTypes:true}).filter(e=>e.isDirectory()).map(e=>path.join(upstream,e.name)).filter(p=>{const t=fs.statSync(p).birthtimeMs;return t>=start&&t<=end;});
const unitFiles=fixtureDirs.flatMap(walk);
fs.writeFileSync(path.join(root,'unit-files.json'),JSON.stringify({gate:gates[0],startMs:start,endMs:end,fixtureDirs,files:unitFiles},null,2)+'\n');
for(const name of ['tools-final','terminal-logs'])fs.mkdirSync(path.join(root,name),{recursive:true});
for(const name of fs.readdirSync(local)){
 const p=path.join(local,name);if(!fs.statSync(p).isFile())continue;
 if(/\.(?:mjs|ts|cjs|py)$/.test(name))fs.copyFileSync(p,path.join(root,'tools-final',name));
 if(/\.(?:log|stderr)$/.test(name)&&name!=='manifest.log'){
  fs.copyFileSync(p,path.join(root,'terminal-logs',name));
  fs.writeFileSync(p,fs.readFileSync(p,'utf8').trimEnd()+'\n');
 }
}
const files=[...walk(root),...unitFiles].sort(),lines=files.map(p=>sha(p)+'  '+p);
fs.writeFileSync(path.join(local,'SHA256SUMS'),lines.join('\n')+'\n');
console.log(JSON.stringify({files:files.length,bytes:files.reduce((n,p)=>n+fs.statSync(p).size,0),newUpstreamFixtures:fixtureDirs.length,newUpstreamFiles:unitFiles.length,gates,verdictScope:'Offline F1 and F2 only'}));

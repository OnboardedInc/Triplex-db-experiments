// [EXP-G03] Why: measure the reduced input build twice; never infer Linux install behavior from the Mac store.
// Rejected: full repository copying (would expose oracle bytes).
import fs from 'node:fs';import path from 'node:path';
import { BoxExecutor, selectBoxInputs } from '../../bin/box.mjs';
import { gitSource } from '../../bin/claim.mjs';
import { REPO, sha256, docker } from '../../bin/lib.mjs';
const stamp=Date.now(),dir=path.join(REPO,'runs/g03-build-probes',String(stamp));fs.mkdirSync(dir,{recursive:true});
const config=JSON.parse(fs.readFileSync('lab/experiments/EXP-G03/box.json')),spec=JSON.parse(fs.readFileSync('lab/config/box/build-proposal.json'));
const git=gitSource(REPO),tree=git.tree(config.authority),blobs=git.objects(tree.filter(e=>e.type==='blob').map(e=>e.oid));
const snapshot={commit:config.authority,files:new Map(tree.filter(e=>e.type==='blob').map(e=>[e.path,{mode:e.mode,bytes:blobs.get(e.oid),sha256:sha256(blobs.get(e.oid))}]))};
const put=b=>sha256(Buffer.isBuffer(b)?b:Buffer.from(JSON.stringify(b))),results=[],listings=[];let box;
try {
 box=new BoxExecutor({config,workDir:dir,put,holder:'CX-G03'});box.attestStore();
 for(let n=0;n<2;n++){
 const volume=box.volume('instance-'+n),files=selectBoxInputs(snapshot,spec.boxInputs);box.seed(volume,files);
 const name=box.create('build-'+n,{argv:spec.argv,mounts:[{name:volume,target:'/work',rw:true},{name:config.store,target:'/store',rw:false}],memory:1610612736,pids:1024});
 const begin=Date.now(),r=box.start(name,{timeout:1800000});
 fs.writeFileSync(path.join(dir,`build-${n}.stdout`),r.stdout);fs.writeFileSync(path.join(dir,`build-${n}.stderr`),r.stderr);
 const state=docker(['inspect',name]);box.remove(name);
 const record={id:'P4-P6',instance:n,status:r.status===0?'PASS':'FAIL',seconds:(Date.now()-begin)/1000,memoryCapBytes:1610612736,productionBuildCapBytes:2147483648,inspect:JSON.parse(state)[0],stderr:r.stderr.toString().slice(-3000)};results.push(record);
 if(r.status!==0)break;
 const walk=box.walk(volume,spec.outputs);listings.push(walk.entries);record.modules=walk.modules.length;record.inputFiles=files.size;record.runnerEntries=walk.entries.length;
 }
 box.attestStore();
 if(listings.length===2){const a=new Map(listings[0].map(e=>[e[0],JSON.stringify(e)])),b=new Map(listings[1].map(e=>[e[0],JSON.stringify(e)]));const differs=[...new Set([...a.keys(),...b.keys()])].filter(p=>a.get(p)!==b.get(p));results.push({id:'P7',status:'MEASURED',differingPaths:differs});}
} catch(e){results.push({id:'setup-or-build',status:'FAIL',error:String(e)})}
finally{if(box)try{box.close()}catch(e){results.push({id:'cleanup',status:'FAIL',error:String(e)})}fs.writeFileSync(`lab/experiments/EXP-G03/build-probes-${stamp}.json`,JSON.stringify({stamp,config,results,remaining:box?.resources,rawDir:dir},null,2)+'\n');process.exitCode=results.some(r=>r.status==='FAIL')?2:0;}

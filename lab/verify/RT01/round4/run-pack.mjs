// [CX-VRT01-R4] Why: run the actual clean-consumer pack gate under a bounded owned-artifact budget, retaining every phase. Rejected: skipping undeclared builds or claiming a custom smoke is the upstream pack gate.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import {spawn,spawnSync} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
const root=process.cwd(),out=path.resolve('lab/verify/RT01/round4/pack');fs.mkdirSync(out,{recursive:true});
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const sourceNames=spawnSync('git',['ls-files','-z','packages','pnpm-lock.yaml','scripts/check-packages.mjs'],{encoding:'utf8'}).stdout.split('\0').filter(Boolean);
const snapshot=()=>Object.fromEntries(sourceNames.map(p=>[p,sha(p)]));
const distNames=()=>fs.readdirSync('packages').flatMap(pkg=>{const d='packages/'+pkg+'/dist';return fs.existsSync(d)?fs.readdirSync(d,{recursive:true}).filter(p=>fs.statSync(d+'/'+p).isFile()).map(p=>d+'/'+p):[];});
const buildSnapshot=()=>Object.fromEntries(distNames().map(p=>[p,sha(p)]));
const kb=p=>Number(spawnSync('du',['-sk',p],{encoding:'utf8'}).stdout.trim().split(/\s/)[0]||0);
const baselineDistKB=distNames().reduce((n,p)=>n+Math.ceil(fs.statSync(p).size/1024),0);
const tools=out+'/tools';fs.mkdirSync(tools,{recursive:true});
fs.writeFileSync(tools+'/pnpm','#!/bin/sh\nexec /Users/sam/.hermes/node/bin/node /Users/sam/.cache/node/corepack/v1/pnpm/10.11.0/bin/pnpm.cjs --config.store-dir=/Users/sam/projects/triplex-db-2/.pnpm-store "$@"\n',{mode:0o755});
const env={...process.env,PATH:tools+':'+process.env.PATH,TRIPLEX_PACK_ARTIFACT_ROOT:out+'/artifacts',TRIPLEX_PACK_NATIVE_SMOKE:'0',npm_config_cache:out+'/npm-cache'};
const before=snapshot(),runnerBefore=sha(import.meta.filename),phases=[],samples=[];let stopReason=null,peakOwnedBytes=0,peakGrowthBytes=0;
async function run(name,args){
 const output=fs.openSync(out+'/'+name+'.stdout','w'),error=fs.openSync(out+'/'+name+'.stderr','w');const started=new Date().toISOString();
 const child=spawn(name==='pack-check'?process.execPath:tools+'/pnpm',name==='pack-check'?['scripts/check-packages.mjs']:args,{cwd:root,env,detached:true,stdio:['ignore',output,error]});
 const sample=()=>{const bytes=kb(out)*1024,free=Number(fs.statfsSync(root).bavail)*Number(fs.statfsSync(root).bsize);const distBytes=distNames().reduce((n,p)=>n+Math.ceil(fs.statSync(p).size/1024)*1024,0);const growth=bytes+Math.max(0,distBytes-baselineDistKB*1024);peakOwnedBytes=Math.max(peakOwnedBytes,bytes);peakGrowthBytes=Math.max(peakGrowthBytes,growth);samples.push({at:new Date().toISOString(),ownedBytes:bytes,distBytes,growthBytes:growth,free});if(growth>=2.75*1024**3||free<5*1024**3){stopReason='budget guard';try{process.kill(-child.pid,'SIGTERM');}catch{}}};
 sample();const timer=setInterval(sample,1000),timeout=setTimeout(()=>{stopReason='phase timeout';try{process.kill(-child.pid,'SIGTERM');}catch{}},300000);
 const result=await new Promise(resolve=>child.on('close',(exit,signal)=>resolve({exit,signal})));clearInterval(timer);clearTimeout(timeout);fs.closeSync(output);fs.closeSync(error);sample();
 phases.push({name,args,started,ended:new Date().toISOString(),...result,stdoutSha256:sha(out+'/'+name+'.stdout'),stderrSha256:sha(out+'/'+name+'.stderr')});console.log(name,result.exit);return result.exit===0&&!stopReason;
}
let ok=true;
// [CX-VRT01-R4] Why: finish the remaining export builds and run the requested gate despite the separately retained DuckDB declaration failure. Rejected: treating a passing pack gate as a successful fresh DuckDB build.
for(const pkg of ['cli','http']){
 if(!await run('build-'+pkg,['--filter',JSON.parse(fs.readFileSync('packages/'+pkg+'/package.json')).name,'run','build'])){ok=false;break;}
 const missing=['index.js','index.d.ts'].filter(p=>!fs.existsSync('packages/'+pkg+'/dist/'+p));if(missing.length){phases.push({name:'build-content-'+pkg,missing});ok=false;break;}
}

const buildsBefore=buildSnapshot();if(ok)ok=await run('pack-check',['pack:check']);const buildsAfter=buildSnapshot(),after=snapshot();
const sourceStable=JSON.stringify(before)===JSON.stringify(after)&&runnerBefore===sha(import.meta.filename),buildStable=JSON.stringify(buildsBefore)===JSON.stringify(buildsAfter);
const content=ok&&/Verified 13 package tarballs and a clean consumer install\./.test(fs.readFileSync(out+'/pack-check.stdout','utf8'));
fs.writeFileSync(out+'/execution.json',JSON.stringify({attempt:randomUUID(),head:spawnSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).stdout.trim(),product:'472c2c2439922b52e33206510b6cecb0812206ed',slot:'offline-pack-no-native-smoke',fullBuildSucceeded:false,priorBuildReceiptSha256:sha('lab/verify/RT01/round4/pack-attempt5/execution.json'),pnpmToolSha256:sha('/Users/sam/.cache/node/corepack/v1/pnpm/10.11.0/bin/pnpm.cjs'),before,after,runnerBefore,runnerAfter:sha(import.meta.filename),sourceStable,buildsBefore,buildsAfter,buildStable,phases,stopReason,peakOwnedBytes,peakGrowthBytes,budgetBytes:3*1024**3,content,passed:content&&sourceStable&&buildStable&&peakGrowthBytes<3*1024**3,samples},null,2)+'\n');
process.exitCode=content&&sourceStable&&buildStable?0:1;

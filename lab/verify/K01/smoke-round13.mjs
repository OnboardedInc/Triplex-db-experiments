// [EXP-K01-R13] Why: one small diagnostic attempt exposes sequential failures without promoting any receipt. Rejected: retrying until green, rewriting failures, or calling the full LIVE runbook.
import fs from 'node:fs';import path from 'node:path';import {spawnSync} from 'node:child_process';import {createHash}from'node:crypto';
import{fields,readG0,readE1G0,canonical}from'../../bench/lib/g0.ts';
import{openG0,expectedN01,quietXtdb}from'../../bench/lib/g0-xtdb.ts';
const root=path.resolve(import.meta.dirname,'../../..'), holder='CX-K01-R13-smoke';
const tag=new Date().toISOString().replace(/[-:]/g,'').replace(/\..*/,''), run=path.join(root,'runs/xtdb-seed/k01-r13-'+tag);
const raw=path.join('/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-K01-R2/round13',tag);
fs.mkdirSync(run,{recursive:true});fs.mkdirSync(raw,{recursive:true});
const ledger={diagnosticOnly:true,grantsAdmission:false,holder,run,raw,steps:[],failures:[],sourceHashes:{}};
const save=()=>fs.writeFileSync(path.join(run,'ledger.json'),JSON.stringify(ledger,null,2)+'\n');
const sha=b=>createHash('sha256').update(b).digest('hex');
for(const p of ['lab/bin/engine.mjs','lab/bench/xtdb-seed.ts','lab/bench/clone-check.ts',...fs.readdirSync(path.join(root,'lab/bench/lib')).filter(f=>f.startsWith('g0')&&f.endsWith('.ts')).map(f=>'lab/bench/lib/'+f),'lab/bench/lib/n01-counts.ts','lab/verify/K01/smoke-round13.mjs']){ledger.sourceHashes[p]=sha(fs.readFileSync(path.join(root,p)));fs.mkdirSync(path.dirname(path.join(raw,'preimages',p)),{recursive:true});fs.copyFileSync(path.join(root,p),path.join(raw,'preimages',p));}
ledger.head=spawnSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).stdout.trim();save();
let owned=false;const goldens=new Set();
function fail(step,error){ledger.failures.push({ordinal:ledger.failures.length+1,step,error:String(error.stack||error),at:new Date().toISOString()});save();}
function disk(step){const s=fs.statfsSync(root),free=s.bavail*s.bsize;ledger.steps.push({step:'disk:'+step,freeBytes:free,at:new Date().toISOString()});save();if(free<5*1024**3)throw Error('host disk floor');}
function command(step,args){
 const at=new Date().toISOString();const r=spawnSync(process.execPath,args,{cwd:root,env:{...process.env,DOCKER_HOST:'unix:///Users/sam/.colima/triplex2/docker.sock'},encoding:'utf8',maxBuffer:16<<20});
 fs.writeFileSync(path.join(run,step+'.log'),(r.stdout||'')+(r.stderr||''));ledger.steps.push({step,args,at,endedAt:new Date().toISOString(),exit:r.status,signal:r.signal,error:r.error?.message});save();
 if(r.status!==0||r.signal||r.error)fail(step,`${r.error?.message||''}\n${r.stdout||''}${r.stderr||''}`);
 return r;
}
function engine(step,action,...args){return command(step,['lab/bin/engine.mjs',action,'--lane','xtdb','--slot','s1','--holder',holder,...args]);}
function up(step,fresh){disk(step);const r=engine(step,'up','--exp','EXP-K01',...(fresh?['--fresh']:[]));if(r.status===0){owned=true;for(const line of r.stdout.split('\n')){const m=/^export (XTDB_URL|TRIPLEX_LAB_SLOT_OWNER)='([^']+)'/.exec(line);if(m)process.env[m[1]]=m[2];}fs.copyFileSync(process.env.TRIPLEX_LAB_SLOT_OWNER,path.join(run,step+'-owner.json'));}return r.status===0;}
function down(step){if(!owned)return true;const r=engine(step,'down','--remove-volume');if(r.status===0)owned=false;return r.status===0;}
async function observation(step,fn){try{const result=await fn();fs.writeFileSync(path.join(run,step+'.json'),JSON.stringify(result,null,2)+'\n');ledger.steps.push({step,diagnosticOnly:true,completed:true,at:new Date().toISOString()});save();return result;}catch(e){fail(step,e);return null;}}
function manifest(phase){for(const name of ['manifest.json','unqualified-manifest.json']){const p=path.join(run,phase,name);if(fs.existsSync(p))return JSON.parse(fs.readFileSync(p,'utf8'));}return null;}
async function capture(step,phase){return observation(step,async()=>{
 const h=await openG0(process.env.XTDB_URL),m=manifest(phase);const result={diagnosticOnly:true,catalog:null,counts:{},rows:{},manifestFiles:[]};
 try{
  result.catalog=await h.reader.catalog(AbortSignal.timeout(60000));
  for(const name of ['manifest.json','unqualified-manifest.json']){const p=path.join(run,phase,name);if(fs.existsSync(p)){const dst=path.join(raw,phase+'-'+name);fs.copyFileSync(p,dst);result.manifestFiles.push({name,path:dst,sha256:sha(fs.readFileSync(dst)),bytes:fs.statSync(dst).size});}}
  for(const t of Object.keys(fields)){
   if(!Object.hasOwn(result.catalog,t)){result.counts[t]={absent:true,catalogCertified:true};continue;}
   result.counts[t]={count:await h.reader.count(t,m?.scope||'diagnostic',AbortSignal.timeout(60000),true)};
   const target=path.join(raw,step+'-'+t+'.jsonl');fs.writeFileSync(target,'');let n=0;
   try{for await(const row of h.reader.scan(t,m?.scope||'diagnostic',AbortSignal.timeout(60000))){fs.appendFileSync(target,JSON.stringify(row)+'\n');n++;}result.rows[t]={path:target,n,complete:true,sha256:sha(fs.readFileSync(target))};}catch(e){result.rows[t]={path:target,n,complete:false,error:String(e.stack||e)};fail(step+':scan:'+t,e);}
  }
  return result;
 }finally{await h.close();}
});}
async function content(step,phase,e1=false){return observation(step,async()=>{
 const m=manifest(phase);if(!m)throw Error('diagnostic source manifest unavailable');
 const h=await openG0(process.env.XTDB_URL);try{const r={...h.reader,scopes:async signal=>(await h.reader.scopes(signal)).map(x=>({...x,scope_key:x.scope_key===h.scopeKey(m.scope)?m.scope:x.scope_key}))};return await(e1?readE1G0:readG0)(r,expectedN01(m));}finally{await h.close();}
});}
function seed(phase){disk(phase);return command(phase+'-seed',['lab/bench/xtdb-seed.ts','--subjects','20','--seed','ns-v2','--seed-batch-facts','400','--diagnostic','--out',path.join(run,phase)]);}
try{
 if(!up('source-up',true))throw Error('exclusive source admission failed');
 seed('source');await capture('source-capture','source');const source=await content('source-D','source');const sourceE1=await content('source-Dprime','source',true);
 const completed=path.join(run,'source/manifest.json');
 if(fs.existsSync(completed)){
  disk('golden');const r=engine('golden','golden','--manifest',completed);
  for(const m of ((r.stdout||'')+(r.stderr||'')).matchAll(/\[K01\] created (tx2-golden-xtdb-[0-9a-f]{8})/g))goldens.add(m[1]);
 }else{
  fail('golden','completed source pin unavailable; running freeze recipe independently for diagnostics');
  command('freeze-recipe',['lab/bench/clone-check.ts','recipe','--url',process.env.XTDB_URL,'--container','tx2-xtdb-s1']);
 }
 // [EXP-K01-R13] Why: even a failed combined golden step must expose both actual restart observations. Rejected: synthesizing a missing reference or qualifying the diagnostic continuation.
 for(let i=1;i<=2;i++){
  engine('restart-'+i+'-stop','stop');if(!up('restart-'+i+'-up',false))break;
  const current=await content('restart-'+i+'-D','source');if(source&&current&&source.D!==current.D)fail('restart-'+i+'-D-compare','source/started D differs');
  await observation('restart-'+i+'-layout',()=>quietXtdb(process.env.XTDB_URL));
  await capture('restart-'+i+'-capture','source');
 }
 // Preserve records before any source/clone volume is removed.
 for(const name of ['golden.json','fresh-state.json']){const p=path.join(run,'source',name);if(fs.existsSync(p))fs.copyFileSync(p,path.join(raw,'source-'+name));}
 if(!down('source-cleanup'))throw Error('source cleanup failed; no fresh admission');
 if(!up('fresh-up',true))throw Error('fresh exclusive admission failed');
 seed('fresh');await capture('fresh-capture','fresh');const fresh=await content('fresh-Dprime','fresh',true);
 if(!sourceE1||!fresh)fail('E1-comparison','Dprime unavailable on one or both arms');else if(sourceE1.Dprime!==fresh.Dprime)fail('E1-comparison','fresh and source Dprime differ');else{ledger.steps.push({step:'E1-comparison',diagnosticOnly:true,equal:true,Dprime:fresh.Dprime});save();}
 // Exercise the fresh-arm recipe as well, regardless of E1 comparison outcome.
 const fm=path.join(run,'fresh/manifest.json');if(fs.existsSync(fm))engine('fresh-freeze','fresh','--manifest',fm);else command('fresh-freeze-recipe',['lab/bench/clone-check.ts','recipe','--url',process.env.XTDB_URL,'--container','tx2-xtdb-s1']);
 await capture('fresh-final-capture','fresh');
}catch(e){fail('diagnostic-driver',e);}
finally{
 if(owned){engine('final-engine-logs','logs','--tail','300');down('final-cleanup');}
 for(const v of goldens)command('remove-'+v,['lab/bin/engine.mjs','golden-rm','--volume',v]);
 ledger.finishedAt=new Date().toISOString();ledger.ownedSlotRemaining=owned;
 ledger.finalSourceHashes=Object.fromEntries(Object.keys(ledger.sourceHashes).map(p=>[p,sha(fs.readFileSync(path.join(root,p)))]));save();
 console.log(JSON.stringify({run,raw,failures:ledger.failures.length,ownedSlotRemaining:owned,diagnosticOnly:true}));
}

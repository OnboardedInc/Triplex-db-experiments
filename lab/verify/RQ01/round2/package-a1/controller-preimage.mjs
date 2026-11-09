// [EXP-RQ01-QA2] Why: reproduce the root package blocker and independently test fresh packed code beyond it.
// Rejected: accepting builder dist, linking project source into the consumer, or installing online.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync, execFileSync } from 'node:child_process';
const root=process.cwd();
const out=path.join(root,'lab/verify/RQ01/round2/package-a1');
fs.mkdirSync(out,{recursive:false});
const hash=f=>createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const sourceFiles=execFileSync('git',['ls-files','packages/core','packages/sql','packages/testkit','pnpm-workspace.yaml','pnpm-lock.yaml','tsconfig.base.json','tsconfig.node.json','scripts/check-packages.mjs'],{encoding:'utf8'}).trim().split('\n');
sourceFiles.push('lab/verify/RQ01/round2/package.mjs','lab/verify/RQ01/round2/bin/pnpm');
const hashes=()=>Object.fromEntries(sourceFiles.map(f=>[f,hash(f)]));
const before=hashes();
const results=[];
const env={...process.env,PATH:path.join(root,'lab/verify/RQ01/round2/bin')+':'+process.env.PATH,NPM_CONFIG_OFFLINE:'true',TRIPLEX_PACK_ARTIFACT_ROOT:path.join(out,'root-artifacts')};
const run=(label,command,cwd=root)=>{
  const started=Date.now();
  const r=spawnSync(command[0],command.slice(1),{cwd,env,encoding:'utf8',maxBuffer:8*1024*1024});
  fs.writeFileSync(path.join(out,`${label}.log`),`${r.stdout??''}${r.stderr??''}${r.error??''}`);
  results.push({label,command,cwd,started,status:r.status,signal:r.signal});
  return r;
};
const rootResult=run('root-package-check',['node','scripts/check-packages.mjs']);
const rootBlocked=rootResult.status!==0 && `${rootResult.stdout}${rootResult.stderr}`.includes('ERR_PNPM_CANNOT_RESOLVE_WORKSPACE_PROTOCOL');
const workspace=path.join(out,'workspace');
fs.mkdirSync(workspace);
fs.writeFileSync(path.join(workspace,'package.json'),JSON.stringify({name:'route-gate-review',private:true,type:'module',packageManager:'pnpm@10.11.0'}));
for(const f of ['pnpm-workspace.yaml','tsconfig.base.json','tsconfig.node.json'])fs.copyFileSync(f,path.join(workspace,f));
const link=(from,to)=>{fs.mkdirSync(path.dirname(to),{recursive:true});fs.symlinkSync(fs.realpathSync(from),to);};
for(const dep of ['effect','tsdown','typescript','@types/node'])link(`/Users/sam/projects/triplex-db-2/node_modules/${dep}`,path.join(workspace,'node_modules',dep));
link('/Users/sam/projects/triplex-db-2/packages/core/node_modules/ulidx',path.join(workspace,'node_modules/ulidx'));
const copyBindings={};
for(const name of ['core','sql','testkit']) {
  const from=path.join(root,'packages',name),to=path.join(workspace,'packages',name);
  fs.mkdirSync(to,{recursive:true});
  fs.cpSync(path.join(from,'src'),path.join(to,'src'),{recursive:true});
  for(const f of ['package.json','README.md','LICENSE','tsconfig.json','tsdown.config.ts'])if(fs.existsSync(path.join(from,f)))fs.copyFileSync(path.join(from,f),path.join(to,f));
  for(const f of sourceFiles.filter(f=>f.startsWith(`packages/${name}/src/`))) {
    const copied=path.join(to,path.relative(`packages/${name}`,f));
    assert.equal(hash(f),hash(copied));copyBindings[f]=hash(copied);
  }
}
for(const name of ['sql','testkit'])link(path.join(workspace,'packages/core'),path.join(workspace,`packages/${name}/node_modules/@triplex-build/triplex`));
const tool='/Users/sam/projects/triplex-db-2/node_modules/tsdown/dist/run.mjs';
let complete=false,error=null,tarballs={},checks={rootBlocked};
try {
  for(const name of ['core','sql','testkit']){
    const r=run(`build-${name}`,['node',tool],path.join(workspace,'packages',name));
    assert.equal(r.status,0,`${name} fresh build`);
  }
  const tarDir=path.join(out,'tarballs');fs.mkdirSync(tarDir);
  for(const name of ['core','sql','testkit']){
    const pkg=JSON.parse(fs.readFileSync(path.join(workspace,'packages',name,'package.json'),'utf8'));
    const r=run(`pack-${name}`,['/opt/homebrew/bin/pnpm','--config.store-dir=/Users/sam/projects/triplex-db-2/.pnpm-store','--offline','--filter',pkg.name,'pack','--pack-destination',tarDir],workspace);
    assert.equal(r.status,0,`${name} pack`);
    const f=fs.readdirSync(tarDir).find(f=>f===`${pkg.name.replace(/^@/,'').replace('/','-')}-${pkg.version}.tgz`);
    assert(f);tarballs[name]=path.join(tarDir,f);
  }
  const consumer=path.join(out,'consumer');fs.mkdirSync(consumer);
  fs.writeFileSync(path.join(consumer,'package.json'),'{"private":true,"type":"module"}');
  const entries={};
  for(const name of ['core','sql','testkit']){
    const tar=tarballs[name];
    const listing=run(`list-${name}`,['tar','-tzf',tar]);assert.equal(listing.status,0);
    entries[name]=listing.stdout.trim().split('\n');
    for(const required of ['package/package.json','package/dist/index.js','package/dist/index.d.ts','package/README.md','package/LICENSE'])assert(entries[name].includes(required));
    assert(!entries[name].some(f=>f.includes('/src/')||f.includes('/test/')||f.includes('/node_modules/')));
    const unpack=run(`unpack-${name}`,['tar','-xzf',tar,'-C',consumer]);assert.equal(unpack.status,0);
    const manifest=JSON.parse(fs.readFileSync(path.join(consumer,'package/package.json'),'utf8'));
    assert(!JSON.stringify(manifest.dependencies??{}).includes('workspace:'));
    assert(!JSON.stringify(manifest.peerDependencies??{}).includes('catalog:'));
    assert(manifest.exports['.'].import.startsWith('./dist/'));
    const dest=path.join(consumer,'node_modules',manifest.name);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.renameSync(path.join(consumer,'package'),dest);
  }
  for(const suffix of ['js','d.ts'])assert(entries.testkit.includes(`package/dist/route-coverage.${suffix}`));
  for(const dep of ['effect','@types/node'])link(`/Users/sam/projects/triplex-db-2/node_modules/${dep}`,path.join(consumer,'node_modules',dep));
  link('/Users/sam/projects/triplex-db-2/packages/core/node_modules/ulidx',path.join(consumer,'node_modules/ulidx'));
  fs.writeFileSync(path.join(consumer,'consumer.ts'),`import { generateRouteHistory, generateRouteBases, makeOfflineRouteFixture, runRouteEquivalence, requireRouteCoverage, type RouteFixture, type RouteResultContract } from '@triplex-build/triplex-testkit';
const history = generateRouteHistory(42);
const fixture: RouteFixture = makeOfflineRouteFixture('xtdb');
const contract: RouteResultContract = fixture.routes[0]!.contract;
void contract;
requireRouteCoverage(history, generateRouteBases(history));
await runRouteEquivalence({ history, fixture });
`);
  const typecheck=run('consumer-types',['node','/Users/sam/projects/triplex-db-2/node_modules/typescript/bin/tsc','--noEmit','--strict','--skipLibCheck','--module','NodeNext','--moduleResolution','NodeNext','--target','ESNext','consumer.ts'],consumer);assert.equal(typecheck.status,0);
  fs.writeFileSync(path.join(consumer,'smoke.mjs'),`import fs from 'node:fs';
import {generateRouteHistory,makeOfflineRouteFixture,makeRouteEquivalenceCases,requireRouteCoverage} from '@triplex-build/triplex-testkit';
const history=generateRouteHistory(42); const structural=requireRouteCoverage(history);
const result=await makeRouteEquivalenceCases({history,fixture:makeOfflineRouteFixture('xtdb')})[0].run();
if(result.violations.length || !result.observations.length || !structural.complete) throw Error('Packed gate failed');
fs.writeFileSync('observations.json',JSON.stringify(result));
`);
  const smoke=run('consumer-runtime',['node','smoke.mjs'],consumer);assert.equal(smoke.status,0);
  const observed=JSON.parse(fs.readFileSync(path.join(consumer,'observations.json'),'utf8'));
  assert(observed.violations.length===0&&observed.observations.length>0&&observed.observations.every(o=>o.contract==='snapshot'));
  checks={rootBlocked,tarballContents:true,publicExports:true,consumerTypes:true,consumerRuntime:true,observations:observed.observations.length,outputHash:hash(path.join(consumer,'observations.json'))};
  fs.writeFileSync(path.join(out,'entries.json'),JSON.stringify(entries,null,2)+'\n');
  complete=true;
}catch(e){error=String(e);}
const after=hashes();
const stable=JSON.stringify(before)===JSON.stringify(after);
const receipt={at:new Date().toISOString(),head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),slot:'offline/no engine; CX-VRQ01-round2-package-a1',before,after,sourceStillMatches:stable,copyBindings,results,checks,tarballs:Object.fromEntries(Object.entries(tarballs).map(([k,f])=>[k,{file:f,sha256:hash(f)}])),error,changedPackageVerified:complete&&stable,fullRootPassed:rootResult.status===0};
fs.writeFileSync(path.join(out,'receipt.json'),JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify({changedPackageVerified:receipt.changedPackageVerified,rootBlocked,error,checks}));
process.exitCode=receipt.changedPackageVerified?0:1;

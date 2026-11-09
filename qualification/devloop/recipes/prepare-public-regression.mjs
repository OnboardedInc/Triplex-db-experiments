// @ts-nocheck -- [EXP-CHECKJS] unannotated dynamic parameters; runtime error inspection. Binding errors remain checked by lab/bin/checkjs.mjs.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire, isBuiltin } from 'node:module';
import { lstat, mkdir, readFile, readdir, realpath, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';

// Capture current built public packages and their real installed dependency
// closure before the required check. Archived import receipts are not fresh tests.
// Inspiration/rationale: prepare-native-job.mjs and CONTRIBUTING.md.
const root=resolve(import.meta.dirname,'../../..'),requestedMode=process.argv[2],mode=requestedMode==='native-consumer'?'pack':requestedMode,id=process.argv[3],nativeConsumer=requestedMode==='native-consumer';
assert(['pack','postgres'].includes(mode)&&/^[a-z0-9][a-z0-9-]*$/.test(id??''));
const pins=new Map(),visitedPackages=new Set();
async function collect(path,role){
  const absolute=resolve(root,path);assert(absolute.startsWith(root+'/'));
  const info=await lstat(absolute);assert(!info.isSymbolicLink(),'Choose the real owned input: '+path);
  if(info.isDirectory()){for(const file of (await readdir(absolute)).sort())await collect(join(path,file),role);return;}
  assert(info.isFile());pins.set(path,{path,role,sha256:createHash('sha256').update(await readFile(absolute)).digest('hex')});
}
async function dependency(name,from){
  if(isBuiltin(name))return;
  let location;
  try{location=dirname(createRequire(join(from,'package.json')).resolve(name));}
  catch(error){if(['MODULE_NOT_FOUND','ERR_PACKAGE_PATH_NOT_EXPORTED'].includes(error.code))return;throw error;}
  while(!JSON.parse(await readFile(join(location,'package.json'),'utf8').catch(()=>'{}')).name){const parent=dirname(location);assert.notEqual(parent,location,`No owning package for ${name}`);location=parent;}
  location=await realpath(location);assert(location.startsWith(root+'/'));
  if(visitedPackages.has(location))return;visitedPackages.add(location);
  const metadata=JSON.parse(await readFile(join(location,'package.json'),'utf8'));
  if(!location.startsWith(join(root,'packages')+'/'))await collect(relative(root,location),'dependency');
  for(const child of Object.keys({...metadata.dependencies,...metadata.optionalDependencies,...metadata.peerDependencies}))await dependency(child,location);
}
const packages=['core','sql','sqlite','postgres','cloudflare','host','foundationdb','testkit','cli','http','xtdb','qlever','duckdb'];
for(const name of packages){
  for(const [file,role] of [['src','source'],['dist','build'],['package.json','dependency'],['README.md','package-input'],['LICENSE','package-input'],['tsconfig.json','source'],['tsdown.config.ts','source']])await collect(`packages/${name}/${file}`,role);
  const location=join(root,'packages',name),metadata=JSON.parse(await readFile(join(location,'package.json'),'utf8'));
  for(const dependencyName of Object.keys({...metadata.dependencies,...metadata.peerDependencies}))await dependency(dependencyName,location);
}
for(const [file,role] of [['package.json','dependency'],['pnpm-lock.yaml','dependency'],['pnpm-workspace.yaml','dependency'],['tsconfig.base.json','source'],['scripts/check-packages.mjs','runner'],['tools/bootstrap/pnpm','runner'],['tools/bootstrap/with-env.sh','runner'],['tools/bootstrap/check-storage.py','runner'],['qualification/devloop/recipes/public-regressions.mjs','runner'],['qualification/devloop/recipes/prepare-public-regression.mjs','runner'],[`qualification/devloop/recipes/public-${mode}.expected.json`,'oracle']])await collect(file,role);
await collect('.local/tools/pnpm-10.11.0/package','dependency');
if(mode==='pack')await collect('.local/tools/node-v24.13.0-darwin-arm64/lib/node_modules/npm','dependency');
else{
  await collect('packages/postgres/test','source');await collect('test/fixtures','source');await collect('packages/postgres/vitest.config.ts','runner');await collect('vitest.workspace-aliases.ts','runner');
  for(const name of ['vitest','typescript','testcontainers'])await dependency(name,join(root,'packages/postgres'));
  await collect('.runtime/engines/aux-postgres-compiler-tests-v3/url','credential-file');
}
if(nativeConsumer){
  await collect('qualification/devloop/fixtures/native-package-consumer.mjs','runner');
  await collect('qualification/devloop/recipes/public-native-consumer.expected.json','oracle');
  await collect('.runtime/engines/qlever-main/access-token','credential-file');
  await collect('vendor/duckdb-temporal/runtime/native/src','source');
  for(const file of ['artifact.json','temporal_datalog.duckdb_extension','temporal_control.node','owner_probe/artifact.json','owner_probe/temporal_owner_probe.duckdb_extension','owner_probe/temporal_writer.node'])await collect('vendor/duckdb-temporal/runtime/build/'+file,'build');
}
const manifest={format:'triplex-devloop-job/1',id,kind:'verification',queryPath:'duckdb-datalog',backend:'duckdb',author:'duckdb-public-regression-owner',problemId:'mandatory-public-package-and-postgres-regression',logicalTaskId:`public/${requestedMode}`,hypothesis:'The changed core compiler, SQL bridge and additive read metadata retain existing packed public consumers and PostgreSQL integration; no publishing or backend promotion',goals:[1,2,3,5,6,7,9,10],dependsOn:[],requiredOwners:nativeConsumer?['dependency-zip-registry','foundation-xtdb','foundation-qlever']:[mode==='pack'?'dependency-zip-registry':'aux-postgres-compiler-tests'],inspiration:[{reference:'CONTRIBUTING.md',mechanism:'Run mandatory real package and SQL integration checks',adaptation:'Current pinned sources/builds, owned captured tools and independently inspected complete results'}],command:{argv:[process.execPath,'qualification/devloop/recipes/public-regressions.mjs',mode],cwd:'.',env:{NODE_OPTIONS:'--max-old-space-size=768',...(nativeConsumer?{TRIPLEX_PACK_NATIVE_SMOKE:'1',TRIPLEX_PACK_NATIVE_ARTIFACTS_DIRECTORY:join(root,'vendor/duckdb-temporal/runtime/build'),XTDB_URL:'postgresql://xtdb:xtdb@127.0.0.1:15442/xtdb',QLEVER_URL:'http://127.0.0.1:17019',QLEVER_ACCESS_TOKEN_FILE:join(root,'.runtime/engines/qlever-main/access-token')}:{})}},resources:{heavy:true,memoryBytes:(mode==='pack'?2048:1536)*1024**2,cpuUnits:mode==='pack'?2:1,diskBytes:(mode==='pack'?2048:256)*1024**2,timeoutMilliseconds:900000,maximumLogBytes:16*1024**2},inputs:[...pins.values()].sort((a,b)=>a.path.localeCompare(b.path)),evidence:{checks:[{key:`public-${mode}`,expectedInput:`qualification/devloop/recipes/public-${mode}.expected.json`,actual:'artifacts/result.json'},...(nativeConsumer?[{key:'native-package-consumer',expectedInput:'qualification/devloop/recipes/public-native-consumer.expected.json',actual:'artifacts/native-consumer-result.json'}]:[])],requiredCheckKeys:[`public-${mode}`,...(nativeConsumer?['native-package-consumer']:[])]},retention:{scratch:'forensic-backend-state',meaning:'Retain real consumer install or SQL integration diagnostics; no automatic cleanup'}};
await mkdir(join(root,'.runtime/duckdb'),{recursive:true});const file=join(root,'.runtime/duckdb',id+'.json');await writeFile(file,JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({manifest:relative(root,file),mode,inputs:pins.size,state:'PREPARED_NOT_EXECUTED'}));

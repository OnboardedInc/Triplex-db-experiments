// Diagnostic only: one unchanged public patch, actual native profiler stderr.
import assert from 'node:assert/strict';
import {spawn,execFileSync} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
import {createWriteStream,writeSync} from 'node:fs';
import {lstat,mkdir,readFile,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {dirname,join,resolve} from 'node:path';
import {finished} from 'node:stream/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {profileOperators} from './patch-profile-sql.mjs';

const script=fileURLToPath(import.meta.url),root=resolve(dirname(script),'..');
const COST_SOURCE='cf7f0d86645383944cac77c2f49e331428c75a33';
const SOURCE={baseline:'4674135bafce0cb5d50e3773c1391848974e9079',candidate:'229121424e63729867b2c71c9b1eacb0ba35a4e8'};
const allowed="['enable_profiling','profiling_coverage','profiling_output']";
const sha=b=>createHash('sha256').update(b).digest('hex');
const json=v=>JSON.stringify(v,(_,x)=>typeof x==='bigint'?String(x):x,2)+'\n';
const save=(p,v)=>writeFile(p,json(v),{flag:'wx'});
const quote=s=>"'"+s.replaceAll("'","''")+"'";
const error=e=>({name:e?.name??typeof e,message:String(e?.message??e),stack:e?.stack??null});
const options={};for(let i=2;i<process.argv.length;i+=2){const k=process.argv[i]?.slice(2);assert.ok(['runtime','role','scenario','cost-root','output','child'].includes(k)&&process.argv[i+1]);assert.equal(options[k],undefined);options[k]=process.argv[i+1];}
async function fixtureModule(costRoot){
  const pins={};for(const name of ['adapter/reference-coverage-cost-fixture.mjs','adapter/benchmark-reference-coverage-cost.mjs','adapter/test-reference-coverage-cost-fixture.mjs','NATIVE-REFERENCE-COVERAGE-COST.md']){
    const bytes=await readFile(join(costRoot,name)),git=execFileSync('git',['show',COST_SOURCE+':projects/temporal-datalog/runtime/'+name],{cwd:costRoot,maxBuffer:8388608});
    assert.equal(sha(bytes),sha(git));pins[name]=sha(bytes);
  }
  return {module:await import(pathToFileURL(join(costRoot,'adapter/reference-coverage-cost-fixture.mjs')).href),pins};
}
async function identity(config,fixture){
  const {BASELINE_CORE,CANDIDATE_CORE,ENTITY_JS,ENGINE,NATIVE_PINS}=fixture;
  const runtime=config.runtime,core=JSON.parse(await readFile(join(runtime,'build/artifact.json'))),owner=JSON.parse(await readFile(join(runtime,'build/owner_probe/artifact.json')));
  const selected=NATIVE_PINS[config.role],expectedCore=config.role==='baseline'?BASELINE_CORE:CANDIDATE_CORE;
  assert.equal(core.extension_sha256,expectedCore);assert.equal(owner.core_extension_sha256,expectedCore);assert.equal(owner.extension_sha256,selected.owner);assert.equal(owner.engine_library_sha256,ENGINE);
  const require=createRequire(join(runtime,'build/adapter/native-duckdb-port.mjs')),api=require.resolve('@duckdb/node-api');
  const bindings=createRequire(api).resolve('@duckdb/node-bindings'),platform=createRequire(bindings).resolve('@duckdb/node-bindings-darwin-arm64/duckdb.node'),engine=join(dirname(platform),'libduckdb.dylib');
  const expected={'build/temporal_datalog.duckdb_extension':expectedCore,'build/temporal_datalog.so':selected.plain,
    'build/owner_probe/temporal_owner_probe.duckdb_extension':selected.owner,'build/owner_probe/temporal_writer.node':selected.addon,
    'build/temporal_control.node':selected.control,'build/adapter/native-entity.js':ENTITY_JS};
  const hashes={};for(const [name,want]of Object.entries(expected)){hashes[name]=sha(await readFile(join(runtime,name)));assert.equal(hashes[name],want,name);}
  for(const path of [engine,api,bindings,platform])hashes[path]=sha(await readFile(path));assert.equal(hashes[engine],ENGINE);
  const sources={...core.source_sha256,...owner.integrity_sources_sha256,...owner.native_writer.sources_sha256,
    ...owner.compat_mutation_sources_sha256,'native/owner_probe/owner_probe.cpp':owner.probe_source_sha256};
  // Generated catalog is separately pinned, not represented as a Git source.
  for(const [name,want]of Object.entries(sources)){
    assert.equal(sha(await readFile(join(runtime,name))),want,name);
    if(!name.startsWith('build/'))assert.equal(sha(execFileSync('git',['show',SOURCE[config.role]+':projects/temporal-datalog/runtime/'+name],{cwd:runtime,maxBuffer:8388608})),want,name);
  }
  return {runtime,sourceCommit:SOURCE[config.role],api,bindings,platform,engine,hashes,sources,
    coreManifest:sha(await readFile(join(runtime,'build/artifact.json'))),ownerManifest:sha(await readFile(join(runtime,'build/owner_probe/artifact.json'))),
    driver:sha(await readFile(script)),operatorHelper:sha(await readFile(join(root,'adapter/patch-profile-sql.mjs')))};
}
async function child(config){
  assert.equal(process.version,'v24.13.0');assert.equal(process.env.UV_THREADPOOL_SIZE,'4');assert.equal(process.env.NODE_OPTIONS??'','');
  const report={schema:'td.coverage-command-profile-child/1',status:'running',pid:process.pid,parentPid:process.ppid,argv:process.argv,config,costSource:COST_SOURCE,
    scopes:{profile:'Real expanded statements inside one original public patch PRAGMA. Native JSON renderer prints at EndStatementInternal; no SQL splitting/insertion or new native binary.',
      timings:'Profiler query/planner/operator timers and public/native spans overlap. Final receipt profile may include commit because EndQueryInternal commits before profiler.EndQuery. Storage metrics are retained when emitted; no independent commit timer or exclusive phase subtraction is claimed.',
      configuration:'Diagnostic-only allowed_configs adds only three profiling settings before the existing configuration lock; memory, temp, threads and public scheduling unchanged.'}};
  let store,Port,original,instanceClass,createDescriptor,port,observe=false,createCalls=0;
  const calls=[];let fixture;let position=1n;
  try{
    const dependency=await fixtureModule(config.costRoot);fixture=dependency.module;report.costPins=dependency.pins;
    const oracle=new fixture.EventOracle();
    const recipe=fixture.fixtureRecipe({scenario:config.scenario,noiseEntities:0,noiseRevisions:1,warmup:4,samples:16});
    report.before=await identity(config,fixture);
    const api=await import(pathToFileURL(report.before.api).href);instanceClass=api.DuckDBInstance;
    createDescriptor=Object.getOwnPropertyDescriptor(instanceClass,'create');assert.ok(createDescriptor?.configurable&&typeof createDescriptor.value==='function');
    Object.defineProperty(instanceClass,'create',{...createDescriptor,value:async function(database,configuration){
      createCalls++;assert.equal(createCalls,1);assert.equal(configuration.allowed_configs,undefined);
      report.createConfiguration={...configuration,allowed_configs:allowed};
      return Reflect.apply(createDescriptor.value,this,[database,{...configuration,allowed_configs:allowed}]);
    }});
    const portModule=await import(pathToFileURL(join(config.runtime,'build/adapter/native-duckdb-port.mjs')).href);
    Port=portModule.NativeDuckDBPort;original=Port.prototype.runWriter;
    Port.prototype.runWriter=async function(plan){const response=await original.call(this,plan);port=this;
      if(observe)calls.push({sql:plan.sql,params:plan.params,metrics:this.writerMetrics().at(-1)});return response;};
    const {NativeEntityStore}=await import(pathToFileURL(join(config.runtime,'build/adapter/native-entity.js')).href);
    store=await NativeEntityStore.open({database:config.database,readers:1,threads:4,memoryLimit:'128MB',maxTempDirectorySize:'64MB'});
    Object.defineProperty(instanceClass,'create',createDescriptor);createDescriptor=undefined;assert.equal(createCalls,1);
    await store.defineSchema(recipe.schema);report.seed=[];
    for(const seed of recipe.seed){const receipt=await store.batch({schema:'coverage_cost',version:1,...seed});assert.equal(receipt.position,++position);oracle.append(position,seed.commandId,seed.members);report.seed.push(receipt);}
    report.warmup=[];for(const request of recipe.writes.slice(0,4)){
      const receipt=await store.patch(request);assert.equal(receipt.position,++position);oracle.append(position,request.commandId,[request]);report.warmup.push(receipt);
    }
    assert.equal(position,7n);assert.ok(port);report.request=recipe.writes[4];
    const {encodeSchemaRecord}=await import(pathToFileURL(join(config.runtime,'build/adapter/native-schema.js')).href);
    const request=report.request,record=encodeSchemaRecord(request.fields);
    report.expectedCall='PRAGMA td_patch_entity_v2('+[quote(request.schema),request.version,quote(request.type),quote(request.entityId),quote(request.commandId),quote(record),request.validFrom,request.validTo].join(',')+')';
    const run=sql=>original.call(port,{name:'diagnostic_profile_settings',sql,params:[]});
    await run("SET profiling_coverage='ALL'");await run("SET enable_profiling='json'");await run("SET profiling_output=''");
    report.settings=await run("SELECT current_setting('lock_configuration'),current_setting('enable_profiling'),current_setting('profiling_coverage'),current_setting('profiling_output')");
    assert.deepEqual(report.settings,[[true,'json','ALL','']]);
    writeSync(2,config.begin+'\n');observe=true;const begin=performance.now();
    try{report.receipt=await store.patch(request);report.publicWithProfilingMs=performance.now()-begin;}
    finally{observe=false;writeSync(2,config.end+'\n');}
    await run('PRAGMA disable_profiling');assert.equal(calls.length,1);assert.equal(calls[0].sql,report.expectedCall);assert.deepEqual(calls[0].params,[]);report.actualCall=calls[0];
    assert.equal(report.receipt.position,++position);assert.equal(position,8n);oracle.append(position,request.commandId,[request]);
    for(const knownAt of [7n,8n])for(const entityId of [fixture.TARGET,'target-B',...Array.from({length:8},(_,i)=>'source-'+i)])
      for(const validAt of [-1n,0n,19n,20n,50n,79n,80n,99n,100n]){
        const actual=(await store.at(entityId,{knownAt,validAt})).map(({attribute,value})=>({attribute,value}));
        assert.deepEqual(actual,oracle.at(entityId,knownAt,validAt));assert.equal(await store.presenceAt(entityId,{knownAt,validAt}),oracle.presence(entityId,knownAt,validAt));
      }
    report.history=await store.history(fixture.TARGET);assert.deepEqual(fixture.historyMeaning(report.history),fixture.historyMeaning(oracle.history(fixture.TARGET)));
    assert.deepEqual(await store.patch(request),report.receipt);assert.deepEqual(await store.history(fixture.TARGET),report.history);report.exactReplayAndOldCuts=true;
    await store.close();store=undefined;
    await assert.rejects(lstat(config.database+'.wal'),{code:'ENOENT'});report.closedWithoutWal=true;
    const require=createRequire(join(config.runtime,'build/adapter/native-duckdb-port.mjs'));
    report.cleanup=require(join(config.runtime,'build/owner_probe/temporal_writer.node')).snapshot();
    assert.deepEqual(report.cleanup,{liveHandles:0,pendingCompletions:0,asyncContexts:0,asyncResources:0,lifecycleOwners:0});
    report.loadedImages=process.report.getReport().sharedObjects.filter(p=>/duckdb|temporal_(?:datalog|owner_probe|control|writer)/.test(p));
    assert.deepEqual(report.loadedImages.toSorted(),[report.before.platform,report.before.engine,...[
      'build/temporal_datalog.duckdb_extension','build/temporal_control.node','build/owner_probe/temporal_owner_probe.duckdb_extension','build/owner_probe/temporal_writer.node',
    ].map(p=>join(config.runtime,p))].toSorted());
    report.after=await identity(config,fixture);assert.deepEqual(report.after,report.before);
    report.costPinsAfter=(await fixtureModule(config.costRoot)).pins;assert.deepEqual(report.costPinsAfter,report.costPins);
    report.status='passed_public_semantics_profile_parse_pending';
  }catch(e){report.status='failed';report.error=error(e);process.exitCode=1;}
  finally{
    if(createDescriptor)Object.defineProperty(instanceClass,'create',createDescriptor);
    if(store)try{await store.close();}catch(e){report.cleanupError=error(e);report.status='failed';process.exitCode=1;}
    if(Port&&original)Port.prototype.runWriter=original;
    if(report.before&&!report.after)try{report.after=await identity(config,fixture);assert.deepEqual(report.after,report.before);}
      catch(e){report.postIdentityError=error(e);report.status='failed';process.exitCode=1;}
    await save(join(config.output,'child-first.json'),report);
  }
}
function jsonObjects(text){
  const values=[];let start=-1,depth=0,string=false,escape=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];if(start<0){if(/\s/.test(c))continue;assert.equal(c,'{','Non-JSON bytes in profiled marker interval');start=i;depth=1;continue;}
    if(string){if(escape)escape=false;else if(c==='\\')escape=true;else if(c==='"')string=false;continue;}
    if(c==='"')string=true;else if(c==='{')depth++;else if(c==='}'&&--depth===0){values.push({text:text.slice(start,i+1),value:JSON.parse(text.slice(start,i+1))});start=-1;}
  }
  assert.equal(start,-1,'Truncated native JSON');assert.ok(values.length);return values;
}
if(options.child){await child(JSON.parse(await readFile(options.child,'utf8')));}else{
  assert.ok(['baseline','candidate'].includes(options.role)&&['zero','unrelated','incoming'].includes(options.scenario));
  assert.ok(options.role==='candidate'||options.scenario==='zero');
  const output=resolve(options.output),runtime=resolve(options.runtime),costRoot=resolve(options['cost-root']);
  assert.ok(output.startsWith(join(root,'build')+'/'));await mkdir(output);
  const token=randomUUID(),config={role:options.role,scenario:options.scenario,runtime,costRoot,output,database:join(output,'facts.duckdb'),begin:'TD_COVERAGE_PROFILE_BEGIN '+token,end:'TD_COVERAGE_PROFILE_END '+token};
  await save(join(output,'config-first.json'),config);
  const stdout=createWriteStream(join(output,'stdout-first.log'),{flags:'wx'}),stderr=createWriteStream(join(output,'stderr-first.log'),{flags:'wx'});
  const environment={...process.env,UV_THREADPOOL_SIZE:'4'};delete environment.NODE_OPTIONS;
  for(const key of Object.keys(environment))if(key.startsWith('TD_NATIVE_WRITER_LAB_'))delete environment[key];
  const argv=[script,'--child',join(output,'config-first.json')],startedAtUtc=new Date().toISOString();
  const processChild=spawn(process.execPath,argv,{env:environment,stdio:['ignore','pipe','pipe']});processChild.stdout.pipe(stdout);processChild.stderr.pipe(stderr);
  await save(join(output,'started-first.json'),{pid:processChild.pid,parentPid:process.pid,argv:[process.execPath,...argv],startedAtUtc});
  const terminal=await new Promise((yes,no)=>{processChild.once('error',no);processChild.once('exit',(code,signal)=>yes({pid:processChild.pid,code,signal,endedAtUtc:new Date().toISOString()}));});
  await Promise.all([finished(stdout),finished(stderr)]);await save(join(output,'terminal-first.json'),terminal);
  const report={schema:'td.coverage-command-profile/1',status:'failed',config,terminal};
  try{
    const result=JSON.parse(await readFile(join(output,'child-first.json'),'utf8'));report.child=result;assert.equal(terminal.code,0);assert.equal(terminal.signal,null);
    const raw=await readFile(join(output,'stderr-first.log'),'utf8'),begin=raw.indexOf(config.begin),end=raw.indexOf(config.end);
    assert.ok(begin>=0&&end>begin);assert.equal(raw.lastIndexOf(config.begin),begin);assert.equal(raw.lastIndexOf(config.end),end);
    const objects=jsonObjects(raw.slice(begin+config.begin.length,end));assert.ok(objects.length>20,'Expected actual expanded patch statement profiles');
    report.profiles=[];for(const [index,item]of objects.entries()){
      const query=item.value.query?.sql;assert.equal(typeof query,'string');assert.ok(!/^\s*(?:SET|PRAGMA\s+(?:enable|disable)_profiling)\b/i.test(query));
      const operators=profileOperators(item.value);const path=join(output,'statement-'+String(index).padStart(3,'0')+'.json');await writeFile(path,item.text,{flag:'wx'});
      report.profiles.push({index,path,sha256:sha(item.text),query,metrics:{query:item.value.query,parser:item.value.parser,planner:item.value.planner,physicalPlanner:item.value.physical_planner,optimizer:item.value.optimizer,system:item.value.system,io:item.value.io??null,storage:item.value.storage??null},operators});
    }
    assert.match(report.profiles[0].query,/^\s*CREATE TEMP TABLE __td_native_owner_guard\b/i);
    report.ctas=report.profiles.filter(p=>/^\s*CREATE TEMP TABLE\b/i.test(p.query)&&/\bAS\b/i.test(p.query));assert.ok(report.ctas.length);
    assert.ok(report.ctas.some(p=>p.operators.some(o=>o.type==='CREATE_TABLE_AS')),'No observed CTAS physical operator');
    assert.ok(report.profiles.some(p=>/^\s*UPDATE\s+main\.clock\b/i.test(p.query)));
    assert.ok(/^\s*WITH owner_guard\b/i.test(report.profiles.at(-1).query)&&report.profiles.at(-1).query.includes("'measure-4'"));
    report.status='passed_diagnostic_only';
  }catch(e){report.error=error(e);process.exitCode=1;}
  await save(join(output,'result-first.json'),report);console.log(join(output,'result-first.json'));
}

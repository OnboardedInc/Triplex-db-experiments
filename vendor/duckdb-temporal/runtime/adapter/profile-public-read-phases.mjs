// SPDX-License-Identifier: MIT
// One warmed reader on an audited, closed million-fact fixture clone.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {lstat,mkdtemp,open,readFile,stat} from 'node:fs/promises';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

const options=new Map();
for(let i=2;i<process.argv.length;i+=2){
  const [key,value]=process.argv.slice(i,i+2);
  assert.ok(['--runtime','--fixture','--output'].includes(key)&&value&&!options.has(key),
    'Usage: --runtime <built runtime> --fixture <closed 1m fixture> --output <fresh receipt>');
  options.set(key,resolve(value));
}
assert.equal(options.size,3);
const runtime=options.get('--runtime'), fixture=options.get('--fixture'), output=options.get('--output');
const receipt=await open(output,'wx');
const report={schema:'temporal-datalog/public-read-phase-screen/1',result:'FAIL',cells:[]};
const sha=async path=>createHash('sha256').update(await readFile(path)).digest('hex');
const load=path=>import(pathToFileURL(path).href);
const json=async path=>JSON.parse(await readFile(path,'utf8'));
const settings={readers:1,threads:1,memoryLimit:'1GiB',maxTempDirectorySize:'1GiB'};
const cuts={validAt:0n,knownAt:253n};
const projectedRows=40000;
const sampleCount=9;
const now=()=>performance.now();
const typed=value=>[{tag:'i64',value}];
const summarize=values=>{
  const sorted=[...values].sort((a,b)=>a-b);
  return {min:sorted[0],median:sorted[Math.floor(sorted.length/2)],max:sorted.at(-1)};
};

async function fileIdentity(path){
  const file=await stat(path);
  return {bytes:file.size,inode:file.ino,mtime_ms:file.mtimeMs};
}

function unionDuration(spans){
  let sum=0,start=0,end=0;
  for(const {start:from,end:to} of [...spans].sort((a,b)=>a.start-b.start)){
    if(from>end){sum+=end-start;start=from;end=to;}
    else end=Math.max(end,to);
  }
  return sum+end-start;
}

let active;
const restore=[];
function instrument(target,name,kind){
  const original=target[name];
  assert.equal(typeof original,'function',name);
  target[name]=async function(...args){
    if(!active)return original.apply(this,args);
    const sample=active, start=now();
    try{return await original.apply(this,args);}
    finally{
      if(kind==='port')sample.port.push({start,end:now()});
      else sample.sdk.push({kind,start,end:now()});
    }
  };
  restore.push(()=>{target[name]=original;});
}

async function measure(work,verify){
  const sample={port:[],sdk:[]};
  active=sample;
  const start=now();
  let result,end;
  try{result=await work();end=now();}
  finally{active=undefined;}
  verify(result);
  assert.equal(sample.port.length,1,'Expected one public native transport invocation');
  const port=sample.port[0],sdk=unionDuration(sample.sdk);
  const totals={};
  for(const kind of ['prepare','stream','fetch']){
    const matching=sample.sdk.filter(span=>span.kind===kind);
    totals[kind]={calls:matching.length,ms:unionDuration(matching)};
  }
  return {public_ms:end-start,sdk_await_ms:sdk,transport_outside_sdk_await_ms:port.end-port.start-sdk,
    pre_port_ms:port.start-start,post_port_ms:end-port.end,sdk:totals};
}

try{
  const build=join(runtime,'build');
  const core=await json(join(build,'artifact.json'));
  const owner=await json(join(build,'owner_probe/artifact.json'));
  assert.equal(core.extension_version,'0.25.0');
  const storePath=join(build,'adapter/native-entity.js'), portPath=join(build,'adapter/native-duckdb-port.mjs');
  const require=createRequire(portPath);
  const sdkPath=require.resolve('@duckdb/node-api');
  const sdkRequire=createRequire(sdkPath);
  const bindingsRequire=createRequire(sdkRequire.resolve('@duckdb/node-bindings'));
  const engine=join(dirname(bindingsRequire.resolve('@duckdb/node-bindings-darwin-arm64/duckdb.node')),'libduckdb.dylib');
  const sdk=await load(sdkPath);
  assert.equal(sdk.version(),'v2.0.0');
  assert.equal(await sha(engine),owner.engine_library_sha256);
  assert.equal(await sha(join(build,'temporal_datalog.duckdb_extension')),core.extension_sha256);
  assert.equal(await sha(join(build,'owner_probe/temporal_owner_probe.duckdb_extension')),owner.extension_sha256);
  assert.equal(owner.core_extension_sha256,core.extension_sha256);
  report.artifacts={core_sha256:core.extension_sha256,owner_sha256:owner.extension_sha256,
    sdk_engine_sha256:owner.engine_library_sha256,entity_js_sha256:await sha(storePath),port_mjs_sha256:await sha(portPath),
    profiler_source_sha256:await sha(fileURLToPath(import.meta.url))};
  const {NativeEntityStore}=await load(storePath);
  const {NativeDuckDBPort}=await load(portPath);
  const {cloneBenchmarkFixture}=await load(join(runtime,'adapter/clone-benchmark-fixture.mjs'));
  await assert.rejects(lstat(fixture+'.wal'),{code:'ENOENT'});
  const original=await fileIdentity(fixture);
  const directory=await mkdtemp(join(dirname(output),'phase-screen-'));
  const database=join(directory,'closed-fixture.clone.duckdb');
  report.fixture={clone:await cloneBenchmarkFixture(fixture,database),retained_facts:1000008,
    valid_at:String(cuts.validAt),known_at:String(cuts.knownAt),bytes:original.bytes};
  report.configuration={...settings,samples_per_cell:sampleCount,controlled:false,parallel_calls:1};
  report.phase_scope={
    sdk_await:'Awaited SDK prepare, stream and fetch wall intervals including native work, SDK work and async scheduling.',
    transport_outside_sdk_await:'Remaining native port wall time, including synchronous SDK row extraction, result admission, copies, binding and cleanup.',
    pre_port:'Public admission, query construction and reader acquisition before transport starts.',
    post_port:'Public result decoding, reader release and promise completion after transport returns.',
    limitations:'Instrumented single-reader wall time on a warm clone. Startup audit excluded from query intervals. Exact-answer checks follow timing.',
  };
  const opening=now();
  const store=await NativeEntityStore.open({...settings,database});
  report.startup_ms=now()-opening;
  try{
    const cases=[
      {name:'tiny_constant',route:'native',program:'answer(7).',rows:[typed(7n)]},
      {name:'empty_scan',route:'sql',program:"answer(?v) :- triple(?e,'absent-phase-screen',?v).",rows:[]},
      {name:'broad_count',route:'sql',
        program:"source(?e,?v) :- triple(?e,'i',?v). answer(count()) :- source(?e,?v).",rows:[typed(1000008n)]},
      {name:'projection_40000',route:'sql',
        program:"answer(?v) :- triple(?e,'i',?v),[?v < "+projectedRows+"].",
        rows:Array.from({length:projectedRows},(_,i)=>typed(BigInt(i)))},
    ];
    instrument(NativeDuckDBPort.prototype,'runNative','port');
    instrument(sdk.DuckDBConnection.prototype,'prepare','prepare');
    instrument(sdk.DuckDBConnection.prototype,'stream','stream');
    instrument(sdk.DuckDBPreparedStatement.prototype,'stream','stream');
    instrument(sdk.DuckDBResult.prototype,'fetchChunk','fetch');
    for(const entry of cases){
      const work=()=>entry.route==='sql'?store.queryScalable(entry.program,cuts):
        store.query(entry.program,{...cuts,forceNative:true});
      let reason;
      const verify=result=>{
        assert.equal(result.position,cuts.knownAt);
        assert.equal(result.route,entry.route);
        assert.deepEqual(result.rows,entry.rows);
        reason=result.reason;
      };
      const first=await measure(work,verify);
      assert.ok(first.sdk.prepare.calls>0,'Cold statement preparation was not observed');
      const warm=[];
      for(let i=0;i<sampleCount;i++)warm.push(await measure(work,verify));
      assert.ok(warm.every(sample=>sample.sdk.prepare.calls===0),'Warm prepared statement was unexpectedly rebuilt');
      const summary=Object.fromEntries(Object.keys(first).filter(key=>key.endsWith('_ms'))
        .map(key=>[key,summarize(warm.map(sample=>sample[key]))]));
      report.cells.push({name:entry.name,program:entry.program,route:entry.route,reason,rows:entry.rows.length,
        exact_checks:sampleCount+1,first,warm,summary});
      process.stdout.write(JSON.stringify({name:entry.name,rows:entry.rows.length,summary})+'\n');
    }
  }finally{
    for(const reset of restore.reverse())reset();
    await store.close();
  }
  await assert.rejects(lstat(fixture+'.wal'),{code:'ENOENT'});
  assert.deepEqual(await fileIdentity(fixture),original);
  report.fixture.source_metadata_unchanged=true;
  report.result='PASS';
}catch(error){
  report.error={name:error.name,message:error.message};
  throw error;
}finally{
  try{await receipt.writeFile(JSON.stringify(report,null,2)+'\n');}
  finally{await receipt.close();}
}

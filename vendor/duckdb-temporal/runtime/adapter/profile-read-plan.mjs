// Isolated engine diagnostics on a closed fixture clone. Public-call timing is separate.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {lstat,mkdir,mkdtemp,open,readFile,realpath,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {benchmarkProvenance} from './benchmark-identity-count.mjs';
import {cloneBenchmarkFixture} from './clone-benchmark-fixture.mjs';
import {evaluatorCase,evaluatorFixtureSpec,evaluatorKinds,seedEvaluatorFixture,wideEvaluatorFixtureSpec,wideEvaluatorKinds} from './evaluator-profile-fixture.mjs';
import {baselineFromEvidence,errorRecord,fixtureExpected,scaleQueries} from './scale-fixture.mjs';

const script=fileURLToPath(import.meta.url);
const root=resolve(dirname(script),'..');
const aggregateCases=scaleQueries();
const kinds=[...aggregateCases.map(query=>query.kind),'tiny_constant','empty_scan','projection_40000'];
const allEvaluatorKinds=[...evaluatorKinds,...wideEvaluatorKinds];
const paths=['runtime','database','sourceEvidence','output'];
const options={fixtureMode:'scale',samples:7,threads:4,memoryLimit:'2GB',maxTempDirectorySize:'4GB',maxIntermediateBytes:4294967296};
for(let index=2;index<process.argv.length;index+=2){
  const arg=process.argv[index],name=arg?.slice(2),value=process.argv[index+1];
  assert.ok(arg?.startsWith('--')&&value&&!value.startsWith('--'),'Options require a name and value');
  if(paths.includes(name))options[name]=resolve(value);
  else if(name==='kinds')options.kinds=value.split(',');
  else if(['samples','threads','maxIntermediateBytes'].includes(name))options[name]=Number(value);
  else if(['fixtureMode','memoryLimit','maxTempDirectorySize'].includes(name))options[name]=value;
  else throw new Error('Unknown option '+name);
}
assert.ok(['scale','evaluator'].includes(options.fixtureMode),'Select a scale or evaluator fixture');
const instrumented=options.fixtureMode==='evaluator';
for(const name of instrumented?['runtime','output']:paths)assert.ok(options[name],name+' is required');
if(instrumented)assert.ok(!options.database&&!options.sourceEvidence,'Evaluator mode generates its own fixture');
options.kinds??=instrumented?[...evaluatorKinds]:['sum'];
assert.ok(Number.isSafeInteger(options.threads)&&options.threads>=1&&options.threads<=64);
assert.ok(Number.isSafeInteger(options.samples)&&options.samples>=5&&options.samples<=10);
assert.ok(Number.isSafeInteger(options.maxIntermediateBytes)&&options.maxIntermediateBytes>=1&&options.maxIntermediateBytes<=1099511627776);
assert.ok(options.kinds.length&&new Set(options.kinds).size===options.kinds.length&&
  options.kinds.every(kind=>(instrumented?allEvaluatorKinds:kinds).includes(kind)));
const wide=options.kinds.some(kind=>wideEvaluatorKinds.includes(kind));

const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const quote=value=>"'"+value.replaceAll("'","''")+"'";
const sql=async(connection,statement)=>(await connection.runAndReadAll(statement)).getRows();
const memorySettings={threads:String(options.threads),memory_limit:options.memoryLimit,max_temp_directory_size:options.maxTempDirectorySize};
const deadlineMs=60000;
const validAt=0n;
const templateSamples=5;
const boundedOptions={maxFacts:100000,maxRounds:1000,maxWork:5000000,deadlineMs:1000,forceNative:true};
if(wide)assert.ok(wideEvaluatorFixtureSpec.activeFacts+wideEvaluatorFixtureSpec.answerRows<=boundedOptions.maxFacts);
const queryOptions={maxInputFacts:10000000,maxIntermediateRows:10000000,maxIntermediateBytes:options.maxIntermediateBytes,
  maxOutputRows:100000,maxOutputBytes:16777216};

async function closedIdentity(path){
  await assert.rejects(lstat(path+'.wal'),{code:'ENOENT'},'Use a closed fixture without a WAL');
  const file=await lstat(path);
  assert.ok(file.isFile(),'Use a regular source database');
  return {bytes:file.size,inode:file.ino,mtimeMs:file.mtimeMs,ctimeMs:file.ctimeMs};
}

function queryCase(kind,fixture){
  if(allEvaluatorKinds.includes(kind))return evaluatorCase(kind);
  const aggregate=aggregateCases.find(query=>query.kind===kind);
  if(aggregate)return {program:aggregate.program,expected:fixtureExpected(fixture,kind),route:'sql'};
  if(kind==='empty_scan')return {program:"answer(?v) :- triple(?e,'absent-phase-screen',?v).",expected:[],route:'sql'};
  assert.equal(kind,'projection_40000');
  assert.ok(fixture.size>=40000,'The projection diagnostic needs at least 40000 consecutive fixture values');
  return {program:"answer(?v) :- triple(?e,'i',?v),[?v < 40000].",route:'sql',
    expected:Array.from({length:40000},(_,index)=>[{tag:'i64',value:BigInt(index)}])};
}

function verifyAnswer(rows,fixture,query){
  assert.equal(rows.length,Math.max(query.expected.length,1));
  const metadata=rows[0].slice(0,6);
  assert.equal(metadata[0],fixture.position);
  assert.equal(metadata[1],query.route);
  assert.equal(typeof metadata[2],'string');
  if(query.route==='sql')assert.deepEqual(metadata.slice(3),[null,null,null]);
  const wire=createHash('sha256');
  for(const [index,row] of rows.entries()){
    assert.equal(row.length,7);
    assert.deepEqual(row.slice(0,6),metadata);
    if(!query.expected.length){assert.equal(row[6],null);continue;}
    const expected=query.expected[index].map(cell=>({tag:cell.tag==='i64'?3:1,
      s:cell.tag==='str'?cell.value:null,b:null,i:cell.tag==='i64'?String(cell.value):null,f:null}));
    assert.equal(typeof row[6],'string');
    assert.deepEqual(JSON.parse(row[6]),expected,`Typed row ${index}`);
    wire.update(row[6]+'\n');
  }
  return {route:metadata[1],reason:metadata[2],position:metadata[0],answerRows:query.expected.length,
    answerWireSha256:wire.digest('hex'),...(query.route==='native'?
      {counters:{rounds:metadata[3],derivedFacts:metadata[4],work:metadata[5]}}:{})};
}

async function generateTemplate(connection,query,fixture){
  const scalable=query.route==='sql';
  const entry=scalable?'td_query_store_scalable_sql_v2':'td_query_store_values_sql_v2';
  const {maxFacts,maxRounds,maxWork,deadlineMs}=boundedOptions;
  const numeric=scalable?Object.values(queryOptions):[maxFacts,maxRounds,maxWork,deadlineMs,1];
  const integers=Array(numeric.length+2).fill('?::BIGINT').join(',');
  const started=performance.now();
  const prepared=await connection.prepare(`SELECT system.main.${entry}(?,${integers})`);
  const prepareWallMs=performance.now()-started;
  try{
    prepared.bind([query.program,validAt,fixture.position,...numeric.map(BigInt)]);
    const generationCallWallMs=[];
    let template;
    for(let index=0;index<templateSamples;index++){
      const call=performance.now();
      const rows=(await prepared.runAndReadAll()).getRows();
      generationCallWallMs.push(performance.now()-call);
      assert.equal(rows.length,1);
      assert.equal(rows[0].length,1);
      assert.equal(typeof rows[0][0],'string','Expected a generated SQL template');
      if(index===0)template=rows[0][0];
      else assert.equal(rows[0][0],template,'The same inputs generated different SQL');
    }
    return {template,metrics:{entry,prepareWallMs,generationCallWallMs,sqlSha256:digest(template),sqlBytes:Buffer.byteLength(template)}};
  }finally{prepared.destroySync();}
}

async function executePrepared(prepared,bridge,profiled=false){
  const token=profiled?bridge.createProfiled(deadlineMs):bridge.create(deadlineMs);
  try{
    prepared.bindBigInt(1,token);
    const executing=performance.now();
    const rows=(await prepared.runAndReadAll()).getRows();
    const executeAndExtractWallMs=performance.now()-executing;
    return {rows,executeAndExtractWallMs,...(profiled?{cppEvaluator:bridge.readEvaluatorProfile(token)}:{})};
  }finally{bridge.release(token);}
}

async function runPrepared(connection,statement,bridge,profiled=false){
  const start=performance.now();
  const prepared=await connection.prepare(statement);
  const prepareWallMs=performance.now()-start;
  try{return {prepareWallMs,...await executePrepared(prepared,bridge,profiled)};}
  finally{prepared.destroySync();}
}

function verifyEvaluator(sample,query){
  assert.ok(sample,'Expected one completed native evaluator timing sample');
  assert.equal(sample.inputRows,query.inputRows);
  assert.equal(sample.answerRows,BigInt(query.expected.length));
  for(const key of ['buildAndLoadNs','fixedPointNs','materializeAnswerNs','encodeResultVectorNs']){
    assert.equal(typeof sample[key],'bigint');
    assert.ok(sample[key]>=0n);
  }
}

async function repeatExecution(connection,template,bridge,fixture,query,ordinary,result,profiled){
  const start=performance.now();
  const prepared=await connection.prepare(template);
  result.prepareWallMs=performance.now()-start;
  try{
    for(let index=0;index<options.samples;index++){
      const {rows,...sample}=await executePrepared(prepared,bridge,profiled);
      if(profiled)verifyEvaluator(sample.cppEvaluator,query);
      assert.deepEqual(verifyAnswer(rows,fixture,query),ordinary);
      result.samples.push(sample);
    }
  }finally{prepared.destroySync();}
}

function operatorRows(profile){
  assert.ok(Array.isArray(profile.operator)&&profile.operator.length,'Expected the DuckDB 2.0 operator profile');
  const operators=[];
  function visit(node,path){
    assert.equal(typeof node.type,'string');
    assert.ok(Number.isFinite(node.timing)&&node.timing>=0,`Missing timing at ${path}`);
    assert.ok(Number.isSafeInteger(node.intermediate_rows)&&node.intermediate_rows>=0,`Missing cardinality at ${path}`);
    operators.push({path,type:node.type,timingMs:1000*node.timing,rowsProduced:node.intermediate_rows,
      rowsScanned:node.rows_scanned??null,outputBytes:node.intermediate_size_bytes??null,
      detail:node.extra_info??{}});
    for(const [index,child] of (node.children??[]).entries())visit(child,`${path}.${index}`);
  }
  for(const [index,node] of profile.operator.entries())visit(node,String(index));
  return operators;
}

async function measurePublic(NativeEntityStore,database,fixture,report){
  const started=performance.now();
  const store=await NativeEntityStore.open({database,readers:1,threads:options.threads,memoryLimit:options.memoryLimit,
    maxTempDirectorySize:options.maxTempDirectorySize});
  report.publicOpenAuditWallMs=performance.now()-started;
  try{
    for(const cell of report.cells){
      const query=queryCase(cell.kind,fixture);
      const cut={validAt,knownAt:fixture.position,timeoutMs:deadlineMs};
      const run=async()=>{
        const start=performance.now();
        const answer=query.route==='native'?await store.query(query.program,{...boundedOptions,...cut}):
          await store.queryScalable(query.program,{...queryOptions,...cut});
        const wallMs=performance.now()-start;
        assert.equal(answer.position,fixture.position);
        assert.equal(answer.route,query.route);
        assert.equal(answer.reason,cell.ordinaryExecution.reason);
        assert.deepEqual(answer.rows,query.expected);
        assert.deepEqual(answer.counters,cell.ordinaryExecution.counters??null);
        return wallMs;
      };
      cell.publicPath={firstCallWallMs:await run(),warmCallWallMs:[]};
      for(let index=0;index<options.samples;index++)cell.publicPath.warmCallWallMs.push(await run());
    }
  }finally{await store.close();}
}

await mkdir(dirname(options.output),{recursive:true});
const receipt=await open(options.output,'wx');
const report={schema:'native-read-plan-profile/2',status:'running',timestampUtc:new Date().toISOString(),cells:[],
  configuration:{...memorySettings,queryOptions,kinds:options.kinds,validAt,deadlineMs,templateSamples,parallelCalls:1,
    fixtureMode:options.fixtureMode,...(instrumented?{repeats:options.samples,boundedOptions}: {})},
  timingScope:{
    templateGeneration:'Wall around the prepared C++ template scalar call and result extraction. Includes DuckDB dispatch, SDK and async scheduling. First and repeated calls are separate samples.',
    directExecution:'A separate ordinary prepared execution checks every typed answer at the fixed cut. Prepare and execute-and-extract wall are separate. Public store queue, routing, and JS value decoding are outside this call.',
    operatorProfile:'EXPLAIN ANALYZE executes the same generated SQL again with a fresh token and profiling overhead. It returns the profile rather than the answer. Operator timings can overlap across threads and include callbacks executed inside those operators.',
    boundary:'The measurements cover overlapping scopes or separate runs. Each wall interval includes any scheduling within that scope.',
    ...(instrumented?{
      cppEvaluator:'Four steady-clock nanosecond scopes cover engine construction and C++ import from a borrowed DuckDB list, fixed-point strata, native answer construction and sort, and result-vector encoding. DuckDB list construction, outer SQL JSON, and SDK decoding are separate work.',
      publicPath:'Independent public query calls on the same fixture and cut, including SDK row extraction and typed decoding. First and warm calls are separate. No evaluator profile token is used.',
    }:{}),
  },documentation:'https://duckdb.org/docs/2.0/dev/profiling'};
let instance,connection,sourceIdentity,phase='provenance';
try{
  const directory=await mkdtemp(join(dirname(options.output),'read-plan-'));
  const database=join(directory,'fixture.duckdb');
  const sourceInput=instrumented?join(directory,'evaluator-fixture.json'):options.sourceEvidence;
  if(instrumented){
    const recipe={...evaluatorFixtureSpec,...(wide?{wideProjection:wideEvaluatorFixtureSpec}:{})};
    await writeFile(sourceInput,JSON.stringify(recipe)+'\n',{flag:'wx'});
  }
  const {sourceEvidence,...provenance}=await benchmarkProvenance({...options,sourceEvidence:sourceInput,benchmarkRuntime:root});
  report.provenance=provenance;
  report.harnessSha256=digest(await readFile(script));
  report.evaluatorFixtureSourceSha256=digest(await readFile(join(root,'adapter/evaluator-profile-fixture.mjs')));
  let fixture;
  if(instrumented){
    assert.equal(provenance.coreManifest.diagnostic_evaluator_profile,true,'Build the diagnostic evaluator artifact');
    report.fixture={recipe:sourceEvidence};
  }else{
    fixture=baselineFromEvidence(sourceEvidence);
    phase='fixture_clone';
    sourceIdentity=await closedIdentity(options.database);
    const clone=await cloneBenchmarkFixture(options.database,database);
    assert.deepEqual(await closedIdentity(options.database),sourceIdentity);
    report.fixture={clone,sourceBytes:sourceIdentity.bytes,retainedFacts:fixture.size+fixture.initialAdded,knownAt:fixture.position};
  }

  phase='startup_audit';
  const build=join(options.runtime,'build');
  const portPath=await realpath(join(build,'adapter/native-duckdb-port.mjs'));
  const require=createRequire(portPath);
  const sdkPath=require.resolve('@duckdb/node-api');
  const {DuckDBInstance,version}=await import(pathToFileURL(sdkPath));
  assert.equal(version(),'v2.0.0');
  report.sdkEntrySha256=digest(await readFile(sdkPath));
  // The bridge pins the exact loader path string for both connections.
  const loaderRoot=fileURLToPath(new URL('../..',pathToFileURL(portPath)));
  const core=loaderRoot+'/build/temporal_datalog.duckdb_extension';
  const bridge=require(join(build,'temporal_control.node'));
  bridge.initialize(core,provenance.hashes.core_extension);
  const opened=performance.now();
  instance=await DuckDBInstance.create(database,{...memorySettings,allow_unsigned_extensions:'true'});
  connection=await instance.connect();
  await sql(connection,'LOAD '+quote(core));
  await sql(connection,'BEGIN');
  try{
    await sql(connection,'PRAGMA td_initialize');
    const revision=await sql(connection,'SELECT revision FROM td_catalog_v1.catalog_revision WHERE singleton');
    if(!revision.length)await sql(connection,'PRAGMA td_migrate_native_catalog_v2');
    assert.deepEqual(await sql(connection,'SELECT ok FROM td_catalog_v1.native_catalog_integrity'),[[true]]);
    await sql(connection,'COMMIT');
  }catch(error){await sql(connection,'ROLLBACK');throw error;}
  await sql(connection,'LOAD '+quote(join(build,'owner_probe/temporal_owner_probe.duckdb_extension')));
  assert.deepEqual(await sql(connection,'SELECT system.main.td_owner_probe_enroll()'),[[true]]);
  assert.deepEqual(await sql(connection,'SELECT system.main.td_owner_probe_activate(0)'),[[true]]);
  report.openAuditMs=performance.now()-opened;
  if(instrumented){
    phase='fixture_seed';
    const seedStarted=performance.now();
    fixture=await seedEvaluatorFixture(statement=>sql(connection,statement),{wide});
    Object.assign(report.fixture,{retainedFacts:fixture.retainedFacts,knownAt:fixture.position,seedWallMs:performance.now()-seedStarted});
  }
  assert.deepEqual(await sql(connection,'SELECT position,retained_count FROM main.clock,main.storage_usage'),
    [[fixture.position,BigInt(report.fixture.retainedFacts)]]);

  for(const kind of options.kinds){
    const query=queryCase(kind,fixture);
    const cell={kind,program:query.program};report.cells.push(cell);
    phase='template_generation';
    const {template,metrics}=await generateTemplate(connection,query,fixture);
    cell.cppTemplateGenerationCall=metrics;
    phase='ordinary_execution';
    const {rows,...timings}=await runPrepared(connection,template,bridge);
    const exact=verifyAnswer(rows,fixture,query);
    cell.ordinaryExecution={...timings,...exact};
    const profiled=instrumented&&query.route==='native';
    if(instrumented){
      phase='repeat_execution';
      const repeats={samples:[]};
      cell[profiled?'profiledExecutions':'unprofiledExecutions']=repeats;
      await repeatExecution(connection,template,bridge,fixture,query,exact,repeats,profiled);
    }
    phase='explain_analyze';
    const {rows:analysis,...profileTimings}=await runPrepared(connection,'EXPLAIN (ANALYZE, FORMAT JSON) '+template,bridge,profiled);
    assert.equal(analysis.length,1);
    assert.equal(analysis[0][0],'analyzed_plan');
    assert.equal(typeof analysis[0][1],'string');
    const raw=JSON.parse(analysis[0][1]);
    const operators=operatorRows(raw);
    cell.explainAnalyze={...profileTimings,operators,raw};
    if(profiled){
      verifyEvaluator(profileTimings.cppEvaluator,query);
      cell.explainAnalyze.callbackOperatorCandidates=operators.filter(operator=>{
        const projection=operator.detail.Projections;
        return operator.type==='PROJECTION'&&((Array.isArray(projection)&&projection.join(',')==='known,answer')||
          String(projection).includes('td_query_stratified_values_v2'));
      });
    }
  }
  if(instrumented){
    phase='public_path';
    connection.closeSync();connection=undefined;
    instance.closeSync();instance=undefined;
    await closedIdentity(database);
    const {NativeEntityStore}=await import(pathToFileURL(join(build,'adapter/native-entity.js')).href);
    await measurePublic(NativeEntityStore,database,fixture,report);
  }
  report.status='passed';
}catch(error){report.status='failed';report.error={phase,...errorRecord(error)};}
finally{
  for(const close of [()=>connection?.closeSync(),()=>instance?.closeSync()]){
    try{close();}catch(error){(report.cleanupErrors??=[]).push(errorRecord(error));report.status='failed';}
  }
  if(sourceIdentity){
    try{assert.deepEqual(await closedIdentity(options.database),sourceIdentity);report.fixtureSourceMetadataUnchanged=true;}
    catch(error){report.fixtureError=errorRecord(error);report.status='failed';}
  }
  try{await receipt.writeFile(JSON.stringify(report,(_,value)=>typeof value==='bigint'?String(value):value,2)+'\n');}
  finally{await receipt.close();}
}
console.log(options.output);
if(report.status!=='passed')process.exitCode=1;

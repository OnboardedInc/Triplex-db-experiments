import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,readFile,stat,writeFile} from 'node:fs/promises';
import {basename,dirname,relative,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {setImmediate as yieldTurn} from 'node:timers/promises';
import {baselineFromEvidence,countWriteOverlaps,createScaleFixture,errorRecord,fixtureExpected,quantiles,scaleExpected,scaleQueries,SCALE_INFINITY} from './scale-fixture.mjs';
import {benchmarkCloneHelperPath,benchmarkCloneModulePath,cloneBenchmarkFixture} from './clone-benchmark-fixture.mjs';
import {createMixedScaleFixture,mixedBaselineFromEvidence,mixedScaleWorkload} from './mixed-scale-fixture.mjs';

const sourceParent = dirname(dirname(fileURLToPath(import.meta.url)));
const sourceRoot = basename(sourceParent)==='build' ? dirname(sourceParent) : sourceParent;
// Capture before importing the selected SDK. UV_THREADPOOL_SIZE must be set by
// the launching process; changing it after bindings load is not a valid sweep.
const startupUvThreadpoolSize = process.env.UV_THREADPOOL_SIZE ?? null;
const defaults = {sizes:[100000,1000000,10000000],readers:[1,4,16],samples:20,warmup:2,writes:8,
  groupSize:4096,fixtureMode:'native',runtime:sourceRoot,threads:4,memoryLimit:'1GB',maxTempDirectorySize:'2GB',
  maxIntermediateBytes:4294967296,durationSeconds:0,readOnlyDurationSeconds:0,maxWrites:100000,
  resumeDatabase:null,resumeCommands:0,resumeEvidence:null,resumeRecovery:null,probeOnly:null,
  cloneDatabase:null,cloneEvidence:null};
const help = `Usage: node adapter/benchmark-scale.mjs [options]
  --runtime DIR                  Built runtime to import, kept read-only
  --sizes 100000,1000000,10000000 Retained facts, one fresh database per size
  --readers 1,4,16               Independent-reader pool capacities
  --samples 20 --warmup 2        Per reader, per query; raw samples are retained
  --writes 8                    Native inserts during a separate mixed-read cell
  --duration-seconds 60          Opt-in sustained mixed reads; default zero keeps burst mode
  --read-duration-seconds 60     Per-kind read-only window; default zero uses sample count
  --max-writes 100000            Finite native write limit in sustained mode
  --group-size 4096              Facts per fixture entity, maximum 4096
  --fixture-mode native|expanded|mixed
                                Native int64, setup-only expansion, or eight-type native history
                                Use --group-size 256 or smaller with mixed
  --threads 4 --memory-limit 1GB --max-temp-directory-size 2GB
                                Set UV_THREADPOOL_SIZE in the parent environment
                                before launching each independent process
  --max-intermediate-bytes 4294967296 Logical SQL intermediate admission
  --resume-database FILE --resume-commands N --resume-evidence FILE --resume-recovery FILE
                                Explicitly continue a verified, owned native fixture
  --probe-only count            One controlled read against a fully recovered fixture
  --clone-database FILE --clone-evidence FILE
                                Copy a closed fixture to a fresh owned run before new writes
  --output FILE                 Fresh evidence file, never overwritten
Fixtures and failed-run data remain under this worktree's build/scale-runs.
Small sample counts are smoke measurements and cannot establish a latency SLO.`;

function positive(value,name,allowZero=false) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n<(allowZero?0:1)) throw new Error('Invalid '+name);
  return n;
}

export function parseScaleOptions(argv) {
  const result = {...defaults};
  const names = {'group-size':'groupSize','fixture-mode':'fixtureMode','memory-limit':'memoryLimit',
    'max-temp-directory-size':'maxTempDirectorySize','max-intermediate-bytes':'maxIntermediateBytes',
    'duration-seconds':'durationSeconds','read-duration-seconds':'readOnlyDurationSeconds','max-writes':'maxWrites',
    'resume-database':'resumeDatabase','resume-commands':'resumeCommands','resume-evidence':'resumeEvidence',
    'resume-recovery':'resumeRecovery','probe-only':'probeOnly',
    'clone-database':'cloneDatabase','clone-evidence':'cloneEvidence'};
  for (let index=0; index<argv.length; index++) {
    if (argv[index]==='--help') return {...result,help:true};
    const key = names[argv[index]?.slice(2)]??argv[index]?.slice(2);
    if (!argv[index]?.startsWith('--') || !Object.hasOwn(defaults,key) && key!=='output') throw new Error('Unknown option '+argv[index]);
    const value = argv[++index];
    if (value===undefined || value.startsWith('--')) throw new Error('Missing option value');
    if (key==='sizes'||key==='readers') result[key]=value.split(',').map(v=>positive(v,key));
    else if (['samples','warmup','writes','groupSize','threads','maxIntermediateBytes','durationSeconds','readOnlyDurationSeconds','maxWrites','resumeCommands'].includes(key))
      result[key]=positive(value,key,['warmup','writes','durationSeconds','readOnlyDurationSeconds','resumeCommands'].includes(key));
    else result[key]=value;
  }
  if (result.groupSize>4096 || !['expanded','native','mixed'].includes(result.fixtureMode)) throw new Error('Invalid fixture configuration');
  if (result.fixtureMode==='mixed'&&(result.groupSize<8||result.groupSize>256||result.sizes.some(size=>size<12)))
    throw new Error('Mixed fixtures require 8..256 facts per entity and at least 12 retained facts');
  if (result.resumeDatabase && (!result.resumeEvidence || !result.resumeRecovery || !result.resumeCommands || result.sizes.length!==1 || result.fixtureMode!=='native'))
    throw new Error('Resume requires failure and recovery evidence, a positive verified command count, one size and native mode');
  if (!result.resumeDatabase && (result.resumeEvidence || result.resumeRecovery || result.resumeCommands)) throw new Error('Resume inputs require an explicit database');
  if (result.probeOnly && (result.probeOnly!=='count' || !result.resumeDatabase || result.resumeCommands!==Math.ceil(result.sizes[0]/result.groupSize)))
    throw new Error('Count probe requires a complete recovered native fixture');
  if (result.cloneDatabase || result.cloneEvidence) {
    assert.ok(result.cloneDatabase && result.cloneEvidence && !result.resumeDatabase && result.sizes.length===1,
      'Cloning requires source database and evidence, one size, and no resume');
  }
  return result;
}

async function resources(store) {
  const memory = process.memoryUsage();
  let duckdb = {available:false,reason:'public_resource_stats_unavailable'};
  if (typeof store.resourceStats==='function') {
    try { duckdb = {available:true,...await store.resourceStats()}; }
    catch (error) { duckdb = {available:false,error:errorRecord(error)}; }
  }
  return {processBytes:memory,duckdb};
}

const scalarScaleWorkload = {
  queries:scaleQueries(),
  expected:fixtureExpected,
  write(fixture,index) {
    const value=fixture.size+(fixture.initialAdded??0)+index;
    return {request:{schema:'scale',version:1,type:'Row',
      entityId:(fixture.writePrefix??'write-e-')+String(index).padStart(8,'0'),
      commandId:(fixture.commandPrefix??'write-c-')+String(index).padStart(8,'0'),
      record:'{i='+value+';}',validFrom:0n,validTo:SCALE_INFINITY},value};
  },
};

export async function readCell({store,fixture,query,options,scalable,concurrent=false,workload=scalarScaleWorkload}) {
  const samples = [],errors = [],writes = [],writeAcknowledgementErrors = [];
  const requestedDurationMs = 1000*(concurrent ? (options.durationSeconds??0) : (options.readOnlyDurationSeconds??0));
  const timed = requestedDurationMs>0;
  const sustained = concurrent && timed;
  const writeLimit = sustained ? options.maxWrites : options.writes;
  const initialAdded = fixture.initialAdded??0;
  const queries = sustained ? workload.queries : [query];
  const initialPosition = fixture.position;
  const execute = scalable ? store.queryScalable.bind(store) : store.query.bind(store);
  const queryOptions = {validAt:0n,timeoutMs:60000,
    ...(scalable?{maxInputFacts:Math.max(10000000,fixture.size+initialAdded+writeLimit),
      maxIntermediateRows:Math.max(10000000,fixture.size+initialAdded+writeLimit),
      maxIntermediateBytes:options.maxIntermediateBytes}:{forceNative:false,deadlineMs:60000})};
  const before = await resources(store);
  const poolBefore = typeof store.readerStats==='function' ? store.readerStats() : null;
  if (poolBefore) assert.equal(poolBefore.capacity,options.readerCount,'Reader pool capacity differs from the requested configuration');
  let started = 0;
  async function read(reader,round,phase) {
    const start = performance.now();
    const selectedQuery = queries[(round+reader)%queries.length];
    const fixedCut = !concurrent || sustained && round%5===0;
    const bindKnownCut = fixedCut && (concurrent || !fixture.latestCut);
    try {
      const result = await execute(selectedQuery.program,{...queryOptions,...(bindKnownCut?{knownAt:initialPosition}:{})});
      const elapsedMs = performance.now()-start;
      const added = fixedCut ? 0 : Number(result.position-initialPosition);
      if (fixedCut) assert.equal(result.position,initialPosition);
      assert.ok(added>=0 && added<=writeLimit,'Observed position outside the writer sequence');
      assert.deepEqual(result.rows,workload.expected(fixture,selectedQuery.kind,added));
      const sample = {reader,round,elapsedMs,position:result.position,
        kind:selectedQuery.kind,cut:bindKnownCut?'fixed':'latest',route:result.route,reason:result.reason,rows:result.rows.length};
      if (phase==='measured') samples.push({...sample,startOffsetMs:start-started});
      return sample;
    } catch (error) {
      errors.push({reader,round,phase,startOffsetMs:start-started,error:errorRecord(error)});
      return null;
    }
  }
  const firstReadAfterOpen = await read(0,0,'first_after_open');
  if (firstReadAfterOpen) await Promise.all(Array.from({length:options.readerCount},async(_,reader)=>{
    for (let round=0; round<options.warmup; round++) if (!await read(reader,round,'warmup')) break;
  }));
  const beforeMeasured = await resources(store);
  let maxObservedActive = 0;
  let maxObservedWaiting = 0;
  let maxSampledRssBytes = beforeMeasured.processBytes.rss;
  const resourceWindows = new Map();
  let wallMs = 0;
  let cpuUsage = null;
  let writeLimitReached = false;
  if (!errors.length) {
    const sampler = setInterval(()=>{
      const stats = poolBefore ? store.readerStats() : {active:0,waiting:0};
      const rss = process.memoryUsage.rss();
      maxObservedActive=Math.max(maxObservedActive,stats.active);
      maxObservedWaiting=Math.max(maxObservedWaiting,stats.waiting);
      maxSampledRssBytes=Math.max(maxSampledRssBytes,rss);
      const index=Math.floor((performance.now()-started)/10000);
      const prior=resourceWindows.get(index)??{maxRssBytes:0,maxActiveReaders:0,maxWaitingReaders:0,samples:0};
      prior.maxRssBytes=Math.max(prior.maxRssBytes,rss);
      prior.maxActiveReaders=Math.max(prior.maxActiveReaders,stats.active);
      prior.maxWaitingReaders=Math.max(prior.maxWaitingReaders,stats.waiting);
      prior.samples++;
      resourceWindows.set(index,prior);
    },25);
    let release;
    const barrier = new Promise(resolve=>{release=resolve;});
    const workers = Array.from({length:options.readerCount},async(_,reader)=>{
      await barrier;
      let round=0;
      while (timed ? performance.now()<started+requestedDurationMs : round<options.samples) {
        if (!await read(reader,round++,'measured')) break;
      }
    });
    const writer = concurrent ? (async()=>{
      await barrier;
      for (let index=0; index<writeLimit; index++) {
        if (sustained && performance.now()>=started+options.durationSeconds*1000) break;
        const start = performance.now();
        let receipt;
        let reconciled = false;
        try {
          const {request,value} = workload.write(fixture,index);
          try {receipt = await store.putRecord(request);}
          catch (error) {
            const acknowledgement = {index,error:errorRecord(error)};
            writeAcknowledgementErrors.push(acknowledgement);
            try {receipt = await store.receipt(request.commandId);}
            catch (recovery) {
              acknowledgement.recoveryError=errorRecord(recovery);
              throw new AggregateError([error,recovery],'Native write acknowledgement could not be reconciled');
            }
            if (!receipt) {acknowledgement.recovery='absent';throw error;}
            acknowledgement.recovery='durable_receipt';
            reconciled = true;
          }
          assert.equal(receipt.position,initialPosition+BigInt(index+1));
          assert.equal(receipt.commandId,request.commandId);
          assert.equal(receipt.entityId,request.entityId);
          assert.equal(receipt.asserted.length,workload.assertedPerWrite??1);
          writes.push({index,entityId:request.entityId,commandId:request.commandId,value,
            position:receipt.position,reconciled,startOffsetMs:start-started,elapsedMs:performance.now()-start});
        } catch (error) {errors.push({writer:index,startOffsetMs:start-started,error:errorRecord(error)});break;}
        if (sustained) await yieldTurn();
      }
      writeLimitReached = sustained && writes.length===writeLimit && performance.now()<started+options.durationSeconds*1000;
    })() : Promise.resolve();
    const cpuBefore = process.cpuUsage();
    started = performance.now();
    release();
    try {await Promise.all([...workers,writer]);}
    finally {clearInterval(sampler);}
    wallMs = performance.now()-started;
    const cpuAfter = process.cpuUsage();
    const userMicroseconds = cpuAfter.user-cpuBefore.user;
    const systemMicroseconds = cpuAfter.system-cpuBefore.system;
    cpuUsage = {userMicroseconds,systemMicroseconds,
      totalMicroseconds:userMicroseconds+systemMicroseconds,
      averageCores:wallMs>0?(userMicroseconds+systemMicroseconds)/(wallMs*1000):null,
      scope:'all_process_threads_during_measured_phase_including_oracle_sampling_and_drain; not_engine_only'};
  }
  let finalReadVerified = null;
  if (concurrent && started) {
    try {
      for (const selectedQuery of queries) {
        const final = await execute(selectedQuery.program,queryOptions);
        assert.equal(final.position,initialPosition+BigInt(writes.length));
        assert.deepEqual(final.rows,workload.expected(fixture,selectedQuery.kind,writes.length));
      }
      finalReadVerified = true;
    } catch (error) {finalReadVerified=false;errors.push({finalRead:true,error:errorRecord(error)});}
  }
  const after = await resources(store);
  const poolAfter = typeof store.readerStats==='function' ? store.readerStats() : null;
  const overlappingQueryWrites = countWriteOverlaps(samples,writes);
  if (concurrent && !errors.length && !overlappingQueryWrites) errors.push({
    error:{code:'BENCHMARK_NO_MEASURED_WRITE_OVERLAP',message:'The bounded native write burst did not overlap a measured read'}});
  const capacityError = error=>/TD_E_(?:QUERY_(?:SCALE_)?LIMIT|COMMAND_LIMIT)|RESULT_LIMIT/.test(error.code??error.message);
  const unsupportedError = error=>/TD_E_QUERY_SCALE_UNSUPPORTED/.test(error.code??error.message);
  const limit = writeLimitReached || errors.some(item=>capacityError(item.error));
  const unsupported = errors.some(item=>unsupportedError(item.error));
  const failure = errors.some(item=>!capacityError(item.error) && !unsupportedError(item.error));
  const windows = Array.from({length:Math.ceil(wallMs/10000)},(_,index)=>{
    const completed = samples.filter(sample=>Math.floor((sample.startOffsetMs+sample.elapsedMs)/10000)===index);
    return {startMs:index*10000,endMs:Math.min(wallMs,(index+1)*10000),completedReads:completed.length,
      latencyMs:quantiles(completed.map(sample=>sample.elapsedMs)),
      completedWrites:writes.filter(write=>Math.floor((write.startOffsetMs+write.elapsedMs)/10000)===index).length,
      errors:errors.filter(error=>Math.floor((error.startOffsetMs??-1)/10000)===index).length,
      resources:resourceWindows.get(index)??null};
  });
  return {kind:query.kind,mixedIngestion:concurrent,readerCount:options.readerCount,
    status:failure?'failed':limit?'capacity_limit':unsupported?'unsupported':'passed',
    samples,errors,writes,writeAcknowledgementErrors,queryOptions,wallMs,throughputQueriesPerSecond:wallMs?samples.length/(wallMs/1000):null,
    latencyMs:quantiles(samples.map(sample=>sample.elapsedMs)),
    resources:{before,beforeMeasured,after,maxSampledRssBytes},cpuUsage,
    pool:{before:poolBefore,after:poolAfter,maxObservedActive,maxObservedWaiting,sampleIntervalMs:25},
    firstReadAfterOpen,finalReadVerified,overlappingQueryWrites,
    overlapScope:'public_call_intervals_including_queue_wait; not_native_execution_phase_proof',
    writeMode:sustained?'sustained':concurrent?'bounded_burst':null,writeLimit,writeLimitReached,
    measurementMode:timed?(concurrent?'mixed_duration':'read_only_duration'):'sample_count',
    requestedDurationMs:timed?requestedDurationMs:null,
    drainMs:timed?Math.max(0,wallMs-requestedDurationMs):null,windows,
    writeBurstDurationMs:writes.length?writes.at(-1).startOffsetMs+writes.at(-1).elapsedMs-writes[0].startOffsetMs:null,
    timingScope:'public_call_through_complete_typed_decoding; exact_oracle_check_excluded',
    throughputScope:'measured_phase_only; oracle_overhead_included; warmup_excluded',
    tailEvidence:samples.length>=10000?'at_least_10000_samples':'smoke_only'};
}

async function verifyReopened({store,fixture,cell,scalable,workload}) {
  const execute = scalable ? store.queryScalable.bind(store) : store.query.bind(store);
  for (const query of workload.queries) {
    for (const added of new Set([0,cell.writes.length])) {
      const result = await execute(query.program,{...cell.queryOptions,knownAt:fixture.position+BigInt(added)});
      assert.equal(result.position,fixture.position+BigInt(added));
      assert.deepEqual(result.rows,workload.expected(fixture,query.kind,added));
    }
  }
}

async function cloneClosedFixture(source,destination) {
  const files=[];
  const started=performance.now();
  for (const suffix of ['', '.wal']) {
    let before;
    try {before=await stat(source+suffix);}
    catch (error) {if (suffix && error.code==='ENOENT') continue;throw error;}
    assert.ok(before.isFile(),'Clone source must be a regular file');
    await cloneBenchmarkFixture(source+suffix,destination+suffix);
    const after=await stat(source+suffix);
    assert.equal(after.size,before.size,'Source changed during closed-fixture copy');
    assert.equal(after.mtimeMs,before.mtimeMs,'Source changed during closed-fixture copy');
    assert.equal((await stat(destination+suffix)).size,before.size);
    files.push({file:basename(destination+suffix),bytes:before.size});
  }
  return {route:'closed_file_required_darwin_clonefile',elapsedMs:performance.now()-started,files};
}

async function main() {
  const options = parseScaleOptions(process.argv.slice(2));
  if (options.help) {console.log(help);return;}
  const runtime = resolve(options.runtime);
  const runId = new Date().toISOString().replaceAll(/[-:.]/g,'')+'-'+Math.random().toString(16).slice(2,10);
  const output = resolve(options.output??resolve(sourceRoot,'evidence','scale-'+runId+'.json'));
  const resumeDatabase = options.resumeDatabase ? resolve(options.resumeDatabase) : null;
  if (resumeDatabase && relative(resolve(sourceRoot,'build','scale-runs'),resumeDatabase).startsWith('..'))
    throw new Error('Resume database must be inside this worktree owned scale-runs directory');
  const runDirectory = resumeDatabase ? dirname(resumeDatabase) : resolve(sourceRoot,'build','scale-runs',runId);
  await mkdir(dirname(output),{recursive:true});
  await writeFile(output,'',{flag:'wx'});
  if (!resumeDatabase) await mkdir(runDirectory,{recursive:true});
  const report = {schema:'temporal-scale-benchmark/1',timestampUtc:new Date().toISOString(),
    configuration:{...options,runtime:undefined,output:undefined,resumeDatabase:undefined,resumeEvidence:undefined,resumeRecovery:undefined,
      cloneDatabase:undefined,cloneEvidence:undefined},
    threadBudget:{duckdbThreads:options.threads,
      uvThreadpoolSizeEnvironmentAtHarnessImport:startupUvThreadpoolSize,
      nodeUvThreadpoolDefaultWhenUnset:4,
      scope:'one_shared_DuckDB_instance; Node_UV_pool_is_process_global_and_configured_before_startup'},
    fixtureDirectory:relative(sourceRoot,runDirectory),
    limitations:['SQL-expanded setup is not native ingestion throughput evidence',
      'Process memory before/after is not a peak or hard memory bound',
      'Empirical quantiles from small sample counts are smoke measurements'],
    stages:[],status:'running'};
  const save = () => writeFile(output,JSON.stringify(report,(_,value)=>typeof value==='bigint'?value.toString():value,2)+'\n');
  try {
    const workload = options.fixtureMode==='mixed' ? mixedScaleWorkload : scalarScaleWorkload;
    let cloneBaseline;
    if (options.cloneDatabase) {
      const sourceBytes=await readFile(resolve(options.cloneEvidence));
      const source=JSON.parse(sourceBytes.toString());
      if (options.fixtureMode==='mixed') {
        await assert.rejects(stat(resolve(options.cloneDatabase)+'.wal'),{code:'ENOENT'},
          'A mixed fixture clone requires a closed database without a WAL');
        cloneBaseline=mixedBaselineFromEvidence(source);
      } else {
        assert.notEqual(source.configuration.fixtureMode,'mixed','Use --fixture-mode mixed for a mixed clone');
        cloneBaseline=baselineFromEvidence(source);
      }
      assert.equal(cloneBaseline.size,options.sizes[0],'Clone scale differs from source receipt');
      assert.equal(cloneBaseline.groupSize,options.groupSize,'Clone group size differs from source receipt');
      report.clonedFrom={database:basename(options.cloneDatabase),evidence:basename(options.cloneEvidence),
        evidenceSha256:createHash('sha256').update(sourceBytes).digest('hex')};
    }
    if (resumeDatabase) {
      assert.ok((await stat(resumeDatabase)).isFile(),'Resume database does not exist');
      const priorBytes = await readFile(resolve(options.resumeEvidence));
      const prior = JSON.parse(priorBytes.toString());
      const priorStage = prior.stages.find(stage=>stage.size===options.sizes[0]);
      assert.ok(priorStage,'Resume evidence has no matching scale stage');
      assert.equal(prior.configuration.groupSize,options.groupSize,'Resume group size differs from original fixture');
      assert.equal(resolve(sourceRoot,prior.fixtureDirectory,priorStage.database),resumeDatabase,'Resume evidence identifies another database');
      const recoveryBytes = await readFile(resolve(options.resumeRecovery));
      const recovery = JSON.parse(recoveryBytes.toString());
      assert.equal(recovery.schema,'temporal-scale-recovery/1');
      assert.equal(recovery.sourceFailure,basename(options.resumeEvidence));
      if (options.resumeCommands<Math.ceil(options.sizes[0]/options.groupSize)) {
        assert.equal(recovery.failedCommand.index,options.resumeCommands);
        assert.equal(recovery.failedCommand.receiptPresent,false);
        for (const field of ['assertionRows','ownerRows','headerRows']) assert.equal(recovery.failedCommand[field],0);
      }
      assert.equal(BigInt(recovery.observations.position),BigInt(options.resumeCommands));
      assert.equal(BigInt(recovery.observations.commands),BigInt(options.resumeCommands));
      assert.equal(BigInt(recovery.observations.retainedAssertions),BigInt(Math.min(options.sizes[0],options.resumeCommands*options.groupSize)));
      assert.equal(BigInt(recovery.observations.invalidCarriers),0n);
      assert.equal(recovery.observations.validatedNativeHistoryRows,recovery.observations.retainedAssertions);
      assert.equal(recovery.observations.storageUsageBytesMatch,true);
      report.resumeFrom = {evidence:basename(options.resumeEvidence),evidenceSha256:createHash('sha256').update(priorBytes).digest('hex'),
        completedCommands:options.resumeCommands,position:options.resumeCommands,priorStatus:prior.status,
        priorOpenConfiguration:priorStage.openConfiguration,
        recoveryEvidence:basename(options.resumeRecovery),recoverySha256:createHash('sha256').update(recoveryBytes).digest('hex'),
        recoveryNativeBuild:recovery.nativeBuild};
    }
    const [{NativeEntityStore},{NativeDuckDBPort},manifestText,retainedValidity] = await Promise.all([
      import(pathToFileURL(resolve(runtime,'build/adapter/native-entity.js'))),
      import(pathToFileURL(resolve(runtime,'build/adapter/native-duckdb-port.mjs'))),
      readFile(resolve(runtime,'build/artifact.json'),'utf8'),
      readFile(resolve(runtime,'native/retained_validity.sql'),'utf8'),
    ]);
    report.nativeBuild = JSON.parse(manifestText);
    if (report.resumeFrom) assert.equal(report.nativeBuild.extension_sha256,report.resumeFrom.recoveryNativeBuild.extension_sha256,
      'Resume native binary differs from the recovery audit');
    {
      const manifest=await readFile(resolve(runtime,'build/owner_probe/artifact.json'));
      const companion=JSON.parse(manifest.toString());
      const extension=await readFile(resolve(runtime,'build/owner_probe/temporal_owner_probe.duckdb_extension'));
      const actualExtensionSha256=createHash('sha256').update(extension).digest('hex');
      assert.equal(actualExtensionSha256,companion.extension_sha256);
      report.companion={engine:companion.engine,abi:companion.abi,extensionSha256:companion.extension_sha256,
        coreExtensionSha256:companion.core_extension_sha256,engineLibrarySha256:companion.engine_library_sha256,
        manifestSha256:createHash('sha256').update(manifest).digest('hex'),actualExtensionSha256};
    }
    report.runtimeArtifactSha256 = {};
    report.runtimeSourceSha256 = {};
    for (const path of ['build/adapter/native-entity.js','build/adapter/native-duckdb-port.mjs']) {
      report.runtimeArtifactSha256[path]=createHash('sha256').update(await readFile(resolve(runtime,path))).digest('hex');
    }
    for (const path of ['adapter/native-entity.ts','adapter/native-duckdb-port.mjs']) {
      try {report.runtimeSourceSha256[path]=createHash('sha256').update(await readFile(resolve(runtime,path))).digest('hex');}
      catch (error) {if (error.code!=='ENOENT') throw error;}
    }
    report.harnessSha256 = createHash('sha256').update(await readFile(fileURLToPath(import.meta.url))).digest('hex');
    report.fixtureSha256 = createHash('sha256').update(await readFile(new URL('./scale-fixture.mjs',import.meta.url))).digest('hex');
    if (options.fixtureMode==='mixed')
      report.mixedFixtureSha256 = createHash('sha256').update(await readFile(new URL('./mixed-scale-fixture.mjs',import.meta.url))).digest('hex');
    report.cloneSetupSha256 = {
      module:createHash('sha256').update(await readFile(benchmarkCloneModulePath)).digest('hex'),
      python:createHash('sha256').update(await readFile(benchmarkCloneHelperPath)).digest('hex')};
    const scalable = typeof NativeEntityStore.prototype.queryScalable==='function';
    report.capabilities = {scalableQuery:scalable};
    for (const size of options.sizes) {
      const database = resumeDatabase??resolve(runDirectory,'facts-'+size+'.duckdb');
      const stage = {size,database:basename(database),status:'setup',setupEvents:[],cells:[]};report.stages.push(stage);await save();
      const writeReserve = options.durationSeconds>0 ? options.maxWrites : options.writes;
      const openOptions = {threads:options.threads,memoryLimit:options.memoryLimit,maxTempDirectorySize:options.maxTempDirectorySize,
        retainedLimits:{maxFacts:size+(cloneBaseline?.initialAdded??0)+Math.max(100000,writeReserve),maxBytes:4*1024*1024*1024}};
      stage.openConfiguration = openOptions;
      const setupStarted = performance.now();
      try {
        if (options.probeOnly) {
          const store = await NativeEntityStore.open({...openOptions,database,readers:1});
          try {
            const queryOptions = {validAt:0n,knownAt:BigInt(options.resumeCommands),timeoutMs:60000,
              maxInputFacts:Math.max(10000000,size),maxIntermediateRows:Math.max(10000000,size),
              maxIntermediateBytes:options.maxIntermediateBytes};
            const started = performance.now();
            const result = await store.queryScalable(scaleQueries()[0].program,queryOptions);
            const elapsedMs = performance.now()-started;
            stage.probe = {kind:'count',status:'checking',elapsedMs,queryOptions,result,
              scope:'one_controlled_public_call_through_complete_typed_decode'};
            assert.equal(result.position,BigInt(options.resumeCommands));
            assert.deepEqual(result.rows,scaleExpected(size,options.groupSize,'count'));
            stage.probe.status='passed';
            stage.status='passed';
          } finally {await store.close();}
          await save();
          console.log(JSON.stringify({size,status:stage.status,elapsedMs:stage.probe.elapsedMs,
            route:stage.probe.result.route,position:String(stage.probe.result.position)}));
          continue;
        }
        let fixture;
        if (cloneBaseline) {
          stage.clone=await cloneClosedFixture(resolve(options.cloneDatabase),database);
          fixture={...cloneBaseline,setupRoute:'closed_fixture_clone',
            writePrefix:'campaign-e-'+runId+'-',commandPrefix:'campaign-c-'+runId+'-'};
        } else {
          const createFixture = options.fixtureMode==='mixed' ? createMixedScaleFixture : createScaleFixture;
          fixture=await createFixture({NativeEntityStore,NativeDuckDBPort,database,size,
            groupSize:options.groupSize,mode:options.fixtureMode,openOptions,retainedValidity,
            resumeCommands:options.resumeCommands,
            onProgress:async progress=>{
              stage.setupProgress=progress;
              stage.setupEvents.push(progress);
              await save();
              console.log(JSON.stringify({size,setup:progress}));
            }});
        }
        stage.fixture = {...fixture,setupMs:performance.now()-setupStarted,databaseBytes:(await stat(database)).size};
        stage.status = 'measuring';
        for (const readerCount of options.readers) {
          for (const query of workload.queries) {
            const store = await NativeEntityStore.open({...openOptions,database,readers:readerCount});
            try {
              if (readerCount>1 && typeof store.readerStats!=='function') {
                stage.cells.push({readerCount,kind:query.kind,status:'unsupported',reason:'independent_reader_ownership_unavailable'});
                continue;
              }
              stage.cells.push(await readCell({store,fixture,query,options:{...options,readerCount},scalable,workload}));
              await save();
            } finally {await store.close();}
          }
        }
        // Run ingestion once per fixture, after fixed-cut comparisons, so every reader sweep shares identical facts.
        if (options.writes>0 || options.durationSeconds>0) {
          const readerCount = Math.max(...options.readers);
          const store = await NativeEntityStore.open({...openOptions,database,readers:readerCount});
          let cell;
          try {
            if (readerCount===1 || typeof store.readerStats==='function') {
              cell = await readCell({store,fixture,query:workload.queries[0],options:{...options,readerCount},scalable,concurrent:true,workload});
              stage.cells.push(cell);
            }
          } finally {await store.close();}
          if (options.durationSeconds>0 && cell) {
            const reopened = await NativeEntityStore.open({...openOptions,database,readers:readerCount});
            try {await verifyReopened({store:reopened,fixture,cell,scalable,workload});cell.reopenVerified=true;}
            catch (error) {cell.reopenVerified=false;cell.status='failed';cell.errors.push({reopen:true,error:errorRecord(error)});}
            finally {await reopened.close();}
          }
        }
        stage.status = stage.cells.some(cell=>cell.status==='failed')?'failed':
          stage.cells.some(cell=>cell.status!=='passed')?'incomplete':'passed';
      } catch (error) {
        stage.status='failed';stage.error=errorRecord(error);
        if (!stage.fixture) stage.setupElapsedMs=performance.now()-setupStarted;
      }
      await save();
      console.log(JSON.stringify({size,status:stage.status,cells:stage.cells.length}));
    }
    report.status = report.stages.some(stage=>stage.status==='failed')?'failed':
      report.stages.every(stage=>stage.status==='passed')?'passed':'incomplete';
  } catch (error) {report.status='failed';report.error=errorRecord(error);process.exitCode=1;}
  await save();
  if (report.status!=='passed') process.exitCode=report.status==='failed'?1:2;
  console.log(JSON.stringify({status:report.status,evidence:basename(output)}));
}

if (process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) await main();

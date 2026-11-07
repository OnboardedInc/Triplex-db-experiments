// Isolated compile-time A/B. Every cell runs the public owned store in a fresh process.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {mkdir,readFile,stat,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {benchmarkCloneHelperPath,benchmarkCloneModulePath,cloneBenchmarkFixture} from './clone-benchmark-fixture.mjs';

const json = value => JSON.stringify(value, (_, cell) => typeof cell === 'bigint' ? cell.toString() : cell, 2);
const script = fileURLToPath(import.meta.url);

export async function benchmarkProvenance(config) {
  const hashes={};
  const read=async(name,path)=>{
    const bytes=await readFile(path);
    hashes[name]=createHash('sha256').update(bytes).digest('hex');
    return bytes;
  };
  const core=JSON.parse(await read('core_manifest',join(config.runtime,'build/artifact.json')));
  const companion=JSON.parse(await read('companion_manifest',join(config.runtime,'build/owner_probe/artifact.json')));
  await read('core_extension',join(config.runtime,'build/temporal_datalog.duckdb_extension'));
  await read('control_bridge',join(config.runtime,'build/temporal_control.node'));
  await read('companion_extension',join(config.runtime,'build/owner_probe/temporal_owner_probe.duckdb_extension'));
  const runtimeRequire=createRequire(join(config.runtime,'build/adapter/native-duckdb-port.mjs'));
  const apiRequire=createRequire(runtimeRequire.resolve('@duckdb/node-api'));
  const bindingsRequire=createRequire(apiRequire.resolve('@duckdb/node-bindings'));
  const engine=join(dirname(bindingsRequire.resolve('@duckdb/node-bindings-darwin-arm64/duckdb.node')),'libduckdb.dylib');
  await read('engine_library',engine);
  assert.equal(hashes.core_extension,core.extension_sha256,'Core artifact differs from its manifest');
  assert.equal(hashes.control_bridge,core.control_bridge_sha256,'Control bridge differs from its manifest');
  assert.equal(hashes.companion_extension,companion.extension_sha256,'Companion differs from its manifest');
  assert.equal(companion.core_extension_sha256,hashes.core_extension,'Companion and core identities differ');
  assert.equal(companion.engine_library_sha256,hashes.engine_library,'Companion and engine identities differ');
  assert.equal(companion.engine,'2.0.0');
  assert.equal(companion.abi,'CPP');
  for(const name of ['native-entity.js','native-schema.js','native-duckdb-port.mjs'])
    await read('adapter/'+name,join(config.runtime,'build/adapter',name));
  await read('benchmark_driver',script);
  await read('benchmark_clone_helper',benchmarkCloneHelperPath);
  await read('benchmark_clone_module',benchmarkCloneModulePath);
  for(const name of ['benchmark-scale.mjs','scale-fixture.mjs'])
    await read('benchmark/'+name,join(config.benchmarkRuntime,'adapter',name));
  const sourceEvidence=JSON.parse(await read('source_evidence',resolve(config.sourceEvidence)));
  return {hashes,coreManifest:core,companionManifest:companion,sourceEvidence,
    node:{version:process.version,platform:process.platform,architecture:process.arch}};
}

async function cell(config) {
  const {sourceEvidence,...provenance}=await benchmarkProvenance(config);
  const {NativeEntityStore} = await import(pathToFileURL(join(config.runtime,'build/adapter/native-entity.js')).href);
  const {readCell} = await import(pathToFileURL(join(config.benchmarkRuntime,'adapter/benchmark-scale.mjs')).href);
  const {baselineFromEvidence,errorRecord,scaleQueries} = await import(pathToFileURL(join(config.benchmarkRuntime,'adapter/scale-fixture.mjs')).href);
  const fixture = {...baselineFromEvidence(sourceEvidence)};
  if(config.cut==='fixed')fixture.latestCut=false;
  const manifest = provenance.coreManifest;
  const expectedReasonPrefix=manifest.experimental_all_cut_unique_fast_path===true?
    'owned_allcut_unique_scalable_':manifest.experimental_current_unique_fast_path===true&&config.cut!=='fixed'?
    'owned_unique_scalable_':'owned_scalable_';
  const started = performance.now();
  const openResources={beforeRssBytes:process.memoryUsage.rss(),maxSampledRssBytes:0,afterRssBytes:0,sampleIntervalMs:25};
  openResources.maxSampledRssBytes=openResources.beforeRssBytes;
  const openSampler=setInterval(()=>{
    openResources.maxSampledRssBytes=Math.max(openResources.maxSampledRssBytes,process.memoryUsage.rss());
  },openResources.sampleIntervalMs);
  let store;
  try {
    store = await NativeEntityStore.open({database:config.database,readers:config.readers,
      threads:config.threads,memoryLimit:config.memoryLimit,maxTempDirectorySize:config.maxTempDirectorySize});
  } finally {
    clearInterval(openSampler);
    openResources.afterRssBytes=process.memoryUsage.rss();
    openResources.maxSampledRssBytes=Math.max(openResources.maxSampledRssBytes,openResources.afterRssBytes);
  }
  const openMs = performance.now()-started;
  const results = [];
  let closeError;
  try {
    for (const query of scaleQueries().filter(query=>!config.kinds||config.kinds.includes(query.kind))) {
      let result;
      try {
        result = await readCell({store,query,scalable:true,fixture,
          options:{readerCount:config.readers,samples:config.samples,warmup:config.warmup,writes:0,
            durationSeconds:0,readOnlyDurationSeconds:config.readOnlyDurationSeconds,maxIntermediateBytes:config.maxIntermediateBytes}});
        results.push(result);
        if(config.readOnlyDurationSeconds>0)assert.equal(result.measurementMode,'read_only_duration');
        for (const sample of [result.firstReadAfterOpen,...result.samples].filter(Boolean)) {
          assert.equal(sample.route,'sql');
          assert.ok(sample.reason.startsWith(expectedReasonPrefix));
        }
      } catch(error) {
        if(!result){result={kind:query.kind,status:'failed',samples:[],errors:[]};results.push(result);}
        result.status='failed';
        result.errors.push({harness:true,error:errorRecord(error)});
      }
      if(result.status!=='passed')break;
    }
  } finally {
    try {await store.close();}catch(error){closeError=errorRecord(error);}
  }
  return {variant:config.variant,executionStrategy:'audited_native_ownership',repeat:config.repeat,readers:config.readers,
    status:!closeError&&results.every(result=>result.status==='passed')?'passed':'failed',closeError,
    openMs,openResources,totalElapsedMs:performance.now()-started,
    identityCountEnabled:manifest.experimental_identity_count_fast_path,
    currentUniqueEnabled:manifest.experimental_current_unique_fast_path,
    allCutUniqueEnabled:manifest.experimental_all_cut_unique_fast_path,
    streamingSourceEnabled:manifest.experimental_streaming_source_fast_path,cut:config.cut??'latest',
    injectiveProjectionEnabled:manifest.experimental_injective_projection_fast_path,
    coreExtensionSha256:manifest.extension_sha256,provenance,results};
}

function child(config) {
  return new Promise((resolve,reject) => {
    const process = spawn(globalThis.process.execPath,[script,'--cell',JSON.stringify(config)],{stdio:['ignore','pipe','pipe']});
    let stdout='',stderr='';
    process.stdout.on('data',chunk=>{stdout+=chunk;});
    process.stderr.on('data',chunk=>{stderr+=chunk;});
    process.on('error',reject);
    process.on('close',code=>{
      if(code!==0)reject(new Error('Identity-count cell failed with code '+code+'\n'+stderr));
      else {try{resolve(JSON.parse(stdout));}catch(error){reject(error);}}
    });
  });
}

async function main() {
  if (process.argv[2]==='--cell') {console.log(json(await cell(JSON.parse(process.argv[3]))));return;}
  const options = {readers:[1,4,16],samples:8,warmup:2,repeats:3,threads:4,readOnlyDurationSeconds:0,cut:'latest',
    memoryLimit:'2GB',maxTempDirectorySize:'4GB',maxIntermediateBytes:4294967296};
  for (let index=2;index<process.argv.length;index+=2) {
    const name=process.argv[index]==='--read-duration-seconds'?'readOnlyDurationSeconds':process.argv[index]?.slice(2),value=process.argv[index+1];
    assert.ok(process.argv[index]?.startsWith('--')&&value,'Options require names and values');
    if(name==='readers')options.readers=value.split(',').map(Number);
    else if(name==='kinds')options.kinds=value.split(',');
    else if(['samples','warmup','repeats','threads','maxIntermediateBytes','readOnlyDurationSeconds'].includes(name))options[name]=Number(value);
    else if(['variants','database','sourceEvidence','benchmarkRuntime','memoryLimit','maxTempDirectorySize','output','cut'].includes(name))options[name]=value;
    else throw new Error('Unknown option '+name);
  }
  for(const name of ['samples','repeats','threads','maxIntermediateBytes'])
    assert.ok(Number.isSafeInteger(options[name])&&options[name]>0,'Invalid '+name);
  assert.ok(Number.isSafeInteger(options.warmup)&&options.warmup>=0);
  assert.ok(Number.isSafeInteger(options.readOnlyDurationSeconds)&&options.readOnlyDurationSeconds>=0);
  assert.ok(['latest','fixed'].includes(options.cut),'Select latest or fixed cut');
  assert.ok(options.readers.every(n=>Number.isSafeInteger(n)&&n>=1&&n<=32));
  for(const name of ['database','sourceEvidence','benchmarkRuntime','output'])assert.equal(typeof options[name],'string',name+' is required');
  assert.equal(typeof options.variants,'string','A variants file is required');
  const {scaleQueries}=await import(pathToFileURL(join(resolve(options.benchmarkRuntime),'adapter/scale-fixture.mjs')).href);
  const availableKinds=scaleQueries().map(query=>query.kind);
  options.kinds??=availableKinds;
  assert.ok(options.kinds.length>0&&new Set(options.kinds).size===options.kinds.length&&
    options.kinds.every(kind=>availableKinds.includes(kind)),'Select distinct known query kinds');
  const variants=JSON.parse(await readFile(resolve(options.variants),'utf8')).variants;
  assert.deepEqual(variants.map(value=>value.enabled),[false,true]);
  const database=resolve(options.database),output=resolve(options.output);
  const wal=await stat(database+'.wal').catch(error=>{if(error.code==='ENOENT')return null;throw error;});
  assert.ok(!wal||wal.size===0,'Use a closed checkpointed fixture without a nonempty WAL');
  const sourceHash=createHash('sha256');
  for await(const chunk of createReadStream(database))sourceHash.update(chunk);
  const scratch=join(dirname(output),'identity-count-'+randomUUID());
  await mkdir(scratch,{recursive:true});
  const receipt={schema:'identity-count-ab/1',status:'running',sourceSha256:sourceHash.digest('hex'),options,variants,cells:[],
    cloneMode:'required_darwin_clonefile',
    comparison:'experimental_variants',
    scope:'Identical closed fixture copies, audited native ownership for all variants, initial full audit charged as openMs, selected scale query kinds.'};
  await writeFile(output,json(receipt)+'\n',{flag:'wx'});
  for(let repeat=0;repeat<options.repeats;repeat++) {
    const order=repeat%2?[...variants].reverse():variants;
    for(const readers of options.readers)for(const variant of order) {
      const copy=join(scratch,`${repeat}-${readers}-${variant.name}.duckdb`);
      let phase='copy_on_write';
      try {
        await cloneBenchmarkFixture(database,copy);
        phase='query';
        receipt.cells.push(await child({...options,database:copy,variant:variant.name,runtime:variant.runtime,readers,repeat,
          benchmarkRuntime:resolve(options.benchmarkRuntime)}));
      } catch(error) {
        receipt.cells.push({variant:variant.name,repeat,readers,status:'failed',phase,code:error.code,errno:error.errno,error:error.message});
      }
      await writeFile(output,json(receipt)+'\n');
    }
  }
  receipt.status=receipt.cells.every(cell=>cell.status==='passed')?'passed':'failed';
  await writeFile(output,json(receipt)+'\n');
  if(receipt.status!=='passed')process.exitCode=1;
  console.log(output);
}

if(process.argv[1]&&resolve(process.argv[1])===script)await main();

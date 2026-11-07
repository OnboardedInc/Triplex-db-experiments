import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
import {mkdtemp,mkdir,readFile,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';
import {benchmarkProvenance} from './benchmark-identity-count.mjs';
import {cloneBenchmarkFixture} from './clone-benchmark-fixture.mjs';

const hash=value=>createHash('sha256').update(value).digest('hex');
const root=fileURLToPath(new URL('..',import.meta.url));
const driver=join(root,'adapter/benchmark-identity-count.mjs');

async function fixture(work) {
  const directory=await mkdtemp(join(tmpdir(),'read-provenance-'));
  const files={
    'build/temporal_datalog.duckdb_extension':'core',
    'build/temporal_control.node':'control',
    'build/owner_probe/temporal_owner_probe.duckdb_extension':'owner',
    'build/adapter/native-entity.js':'entity',
    'build/adapter/native-schema.js':'schema',
    'build/adapter/native-duckdb-port.mjs':'port',
    'adapter/benchmark-scale.mjs':'benchmark',
    'adapter/scale-fixture.mjs':'fixture',
    'source.json':'{"fixture":1}',
    'node_modules/@duckdb/node-api/package.json':'{"main":"index.js"}',
    'node_modules/@duckdb/node-api/index.js':'',
    'node_modules/@duckdb/node-bindings/package.json':'{"main":"index.js"}',
    'node_modules/@duckdb/node-bindings/index.js':'',
    'node_modules/@duckdb/node-bindings-darwin-arm64/package.json':'{"exports":{"./duckdb.node":"./duckdb.node"}}',
    'node_modules/@duckdb/node-bindings-darwin-arm64/duckdb.node':'binding',
    'node_modules/@duckdb/node-bindings-darwin-arm64/libduckdb.dylib':'engine',
  };
  const core={extension_sha256:hash('core'),control_bridge_sha256:hash('control')};
  const companion={engine:'2.0.0',abi:'CPP',extension_sha256:hash('owner'),
    core_extension_sha256:hash('core'),engine_library_sha256:hash('engine')};
  files['build/artifact.json']=JSON.stringify(core);
  files['build/owner_probe/artifact.json']=JSON.stringify(companion);
  try {
    for(const [name,contents] of Object.entries(files)){
      await mkdir(dirname(join(directory,name)),{recursive:true});
      await writeFile(join(directory,name),contents);
    }
    await work({directory,config:{runtime:directory,benchmarkRuntime:directory,sourceEvidence:join(directory,'source.json')}});
  }finally{await rm(directory,{recursive:true,force:true});}
}

test('provenance pins actual artifacts manifests imported code and source evidence without loading an engine',async()=>{
  await fixture(async({directory,config})=>{
    const result=await benchmarkProvenance(config);
    assert.equal(result.hashes.core_extension,hash('core'));
    assert.equal(result.hashes.companion_extension,hash('owner'));
    assert.equal(result.hashes.engine_library,hash('engine'));
    assert.equal(result.hashes.core_manifest,hash(await readFile(join(directory,'build/artifact.json'))));
    assert.equal(result.hashes['adapter/native-schema.js'],hash('schema'));
    assert.equal(result.hashes['benchmark/benchmark-scale.mjs'],hash('benchmark'));
    assert.equal(result.hashes.benchmark_driver,hash(await readFile(driver)));
    assert.equal(result.hashes.benchmark_clone_helper,hash(await readFile(join(root,'adapter/clone-benchmark-fixture.py'))));
    assert.equal(result.hashes.benchmark_clone_module,hash(await readFile(join(root,'adapter/clone-benchmark-fixture.mjs'))));
    assert.equal(result.hashes.source_evidence,hash('{"fixture":1}'));
    assert.deepEqual(result.sourceEvidence,{fixture:1});
  });
});

test('provenance follows the SDK dependency chain through nested bindings',async()=>{
  await fixture(async({directory,config})=>{
    const nested=join(directory,'node_modules/@duckdb/node-api/node_modules/@duckdb');
    const files={
      'node-bindings/package.json':'{"main":"index.js"}',
      'node-bindings/index.js':'',
      'node-bindings-darwin-arm64/package.json':'{"exports":{"./duckdb.node":"./duckdb.node"}}',
      'node-bindings-darwin-arm64/duckdb.node':'actual binding',
      'node-bindings-darwin-arm64/libduckdb.dylib':'engine',
    };
    for(const [name,contents] of Object.entries(files)){
      await mkdir(dirname(join(nested,name)),{recursive:true});
      await writeFile(join(nested,name),contents);
    }
    await writeFile(join(directory,'node_modules/@duckdb/node-bindings-darwin-arm64/libduckdb.dylib'),'shadow engine');
    assert.equal((await benchmarkProvenance(config)).hashes.engine_library,hash('engine'));
  });
});

test('benchmark clones require native Darwin CoW and leave unsupported sources unchanged',async()=>{
  const directory=join(root,'build','clone-probes',randomUUID());
  await mkdir(directory,{recursive:true});
  const source=join(directory,'source.bin'),destination=join(directory,'clone.bin');
  await writeFile(source,'original benchmark fixture');
  if(process.platform!=='darwin'){
    await assert.rejects(cloneBenchmarkFixture(source,destination),error=>error.code==='ENOTSUP');
    assert.equal(await readFile(source,'utf8'),'original benchmark fixture');
    await assert.rejects(readFile(destination),error=>error.code==='ENOENT');
    return;
  }
  assert.deepEqual(await cloneBenchmarkFixture(source,destination),{mode:'darwin_clonefile',status:'cloned'});
  assert.equal(await readFile(destination,'utf8'),'original benchmark fixture');
  await writeFile(destination,'independent clone mutation');
  assert.equal(await readFile(source,'utf8'),'original benchmark fixture');
  await assert.rejects(cloneBenchmarkFixture(source,destination),error=>error.code==='EEXIST');
  await assert.rejects(cloneBenchmarkFixture(directory,join(directory,'invalid.bin')),error=>error.code==='EINVAL');
  // Retain the small source and clone as evidence of the setup-only native probe.
});

test('provenance rejects changed core control and companion artifact bytes',async()=>{
  for(const [name,message] of [
    ['build/temporal_datalog.duckdb_extension',/Core artifact/],
    ['build/temporal_control.node',/Control bridge/],
    ['build/owner_probe/temporal_owner_probe.duckdb_extension',/Companion differs/],
  ])await fixture(async({directory,config})=>{
    await writeFile(join(directory,name),'changed');
    await assert.rejects(benchmarkProvenance(config),message);
  });
});

test('provenance rejects stale core pairing and a changed selected engine',async()=>{
  await fixture(async({directory,config})=>{
    const path=join(directory,'build/owner_probe/artifact.json');
    const companion=JSON.parse(await readFile(path));
    companion.core_extension_sha256=hash('stale-core');
    await writeFile(path,JSON.stringify(companion));
    await assert.rejects(benchmarkProvenance(config),/Companion and core identities differ/);
  });
  await fixture(async({directory,config})=>{
    await writeFile(join(directory,'node_modules/@duckdb/node-bindings-darwin-arm64/libduckdb.dylib'),'changed');
    await assert.rejects(benchmarkProvenance(config),/Companion and engine identities differ/);
  });
});

test('provenance changes when the imported adapter helper or fixture evidence changes',async()=>{
  await fixture(async({directory,config})=>{
    const before=await benchmarkProvenance(config);
    await writeFile(join(directory,'build/adapter/native-entity.js'),'new entity');
    await writeFile(join(directory,'adapter/scale-fixture.mjs'),'new fixture helper');
    await writeFile(join(directory,'source.json'),'{"fixture":2}');
    const after=await benchmarkProvenance(config);
    for(const key of ['adapter/native-entity.js','benchmark/scale-fixture.mjs','source_evidence'])
      assert.notEqual(after.hashes[key],before.hashes[key]);
    assert.deepEqual(after.sourceEvidence,{fixture:2});
  });
});

test('query selection rejects unknown duplicate and empty kinds before opening a runtime',()=>{
  assert.throws(()=>execFileSync(process.execPath,[driver,'--variants','unused',
    '--database','unused','--sourceEvidence','unused','--benchmarkRuntime',root,'--output','unused',
    '--cut','unknown'],{stdio:'pipe'}),/Select latest or fixed cut/);
  for(const kinds of ['other','sum,sum','']){
    assert.throws(()=>execFileSync(process.execPath,[driver,'--variants','unused',
      '--database','unused','--sourceEvidence','unused','--benchmarkRuntime',root,'--output','unused',
      '--kinds',kinds],{stdio:'pipe'}),/Select distinct known query kinds|Options require names and values/);
  }
});

test('failed cells retain detailed errors partial results and cleanup failures',async()=>{
  await fixture(async({directory,config})=>{
    await writeFile(join(directory,'package.json'),'{"type":"module"}');
    await writeFile(join(directory,'build/adapter/native-entity.js'),
      'export class NativeEntityStore {static async open(){return {async close(){throw Error("close failed")}}}}');
    await writeFile(join(directory,'adapter/scale-fixture.mjs'),
      'export const baselineFromEvidence=x=>x; export const scaleQueries=()=>[{kind:"sum"}]; '+
      'export const errorRecord=e=>({message:e.message});');
    await writeFile(join(directory,'adapter/benchmark-scale.mjs'),
      'export const readCell=async()=>({kind:"sum",status:"failed",samples:[],errors:[{error:{code:"TD_E_DEADLINE"}}]});');
    const output=execFileSync(process.execPath,[driver,'--cell',JSON.stringify({...config,
      readers:16,readOnlyDurationSeconds:0,kinds:['sum']})],{encoding:'utf8'});
    const cell=JSON.parse(output);
    assert.equal(cell.status,'failed');
    assert.equal(cell.results[0].errors[0].error.code,'TD_E_DEADLINE');
    assert.equal(cell.closeError.message,'close failed');
    assert.equal(cell.provenance.hashes.core_extension,hash('core'));
  });
});

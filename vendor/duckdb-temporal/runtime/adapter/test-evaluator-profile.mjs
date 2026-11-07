// Run explicitly against a matched --with-evaluator-profile artifact pair.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {test} from 'node:test';
import {NativeDuckDBPort} from '../build/adapter/native-duckdb-port.mjs';
import {evaluatorCase,seedEvaluatorFixture} from './evaluator-profile-fixture.mjs';

const require=createRequire(import.meta.url);
const bridge=require('../build/temporal_control.node');
const manifest=JSON.parse(await readFile(new URL('../build/artifact.json',import.meta.url),'utf8'));
assert.equal(manifest.diagnostic_evaluator_profile,true,'Build the dedicated evaluator profiling artifact first');
assert.equal(typeof bridge.createProfiled,'function');
assert.equal(typeof bridge.readEvaluatorProfile,'function');

const timingFields=['buildAndLoadNs','fixedPointNs','materializeAnswerNs','encodeResultVectorNs'];
const deadline=60000;
const tiny=evaluatorCase('tiny_constant');
const closure=evaluatorCase('recursive_chain');
const run=(port,sql,params=[])=>port.runNative({name:'native_evaluator_profile',sql,params});
const stringify=value=>JSON.stringify(value,(_,cell)=>typeof cell==='bigint'?String(cell):cell);

async function fixture(work){
  const port=await NativeDuckDBPort.openWithOwner({threads:1});
  try{await port.activateOwnership();return await work(port);}
  finally{await port.close();}
}

async function compile(port,program,knownAt,maxRounds=1000n){
  const rows=await run(port,'SELECT system.main.td_query_store_values_sql_v2(?,?,?,?,?,?,?,?)',
    [program,0n,knownAt,100000n,maxRounds,5000000n,10000n,1n]);
  assert.equal(rows.length,1);
  const sql=rows[0][0];
  assert.ok(typeof sql==='string'&&sql.includes('$1'));
  return sql;
}

async function withToken(create,work){
  const token=create(deadline);
  try{return await work(token);}
  finally{bridge.release(token);assert.equal(bridge.status(token),3);assert.equal(bridge.readEvaluatorProfile(token),null);}
}

function checkSample(token,inputRows,answerRows){
  const sample=bridge.readEvaluatorProfile(token);
  assert.ok(sample);
  for(const field of timingFields){assert.equal(typeof sample[field],'bigint');assert.ok(sample[field]>=0n);}
  assert.equal(sample.inputRows,inputRows);
  assert.equal(sample.answerRows,answerRows);
  return sample;
}

function verifyRows(rows,knownAt,expected){
  assert.equal(rows.length,expected.length);
  for(const [index,row] of rows.entries()){
    assert.equal(row.length,7);
    assert.deepEqual(row.slice(0,3),[knownAt,'native','forced_native']);
    assert.deepEqual(JSON.parse(row[6]),expected[index].map(cell=>({tag:cell.tag==='i64'?3:1,
      s:cell.tag==='str'?cell.value:null,b:null,i:cell.tag==='i64'?String(cell.value):null,f:null})));
  }
}

test('one-shot native evaluator timers preserve the ordinary bounded answer wire',async t=>fixture(async port=>{
  const sql=await compile(port,tiny.program,0n);
  const ordinary=await withToken(bridge.create,async token=>{
    const rows=await run(port,sql,[token]);
    verifyRows(rows,0n,tiny.expected);
    assert.equal(bridge.readEvaluatorProfile(token),null);
    return rows;
  });
  const samples=[];
  for(let index=0;index<5;index++)await withToken(bridge.createProfiled,async token=>{
    assert.equal(bridge.readEvaluatorProfile(token),null);
    assert.deepEqual(await run(port,sql,[token]),ordinary);
    const sample=checkSample(token,0n,1n);
    samples.push(sample);
    assert.deepEqual(bridge.readEvaluatorProfile(token),sample);
    if(index===0){
      assert.deepEqual(await run(port,sql,[token]),ordinary);
      assert.equal(bridge.readEvaluatorProfile(token),null,'A second evaluator row invalidates diagnostic attribution');
    }
  });
  t.diagnostic(stringify({case:'tiny_constant',coreSha256:manifest.extension_sha256,controlSha256:manifest.control_bridge_sha256,samples}));
}));

test('native timings isolate a nontrivial recursive fixed point and answer encoding',async t=>fixture(async port=>{
  const {position:knownAt}=await seedEvaluatorFixture(statement=>run(port,statement));
  const sql=await compile(port,closure.program,knownAt);
  const answerRows=BigInt(closure.expected.length);
  const ordinary=await withToken(bridge.create,token=>run(port,sql,[token]));
  verifyRows(ordinary,knownAt,closure.expected);
  assert.ok(ordinary[0][3]>=answerRows,'The recursive component must reach the chain endpoint');
  const samples=[];
  for(let index=0;index<5;index++)await withToken(bridge.createProfiled,async token=>{
    assert.deepEqual(await run(port,sql,[token]),ordinary);
    samples.push(checkSample(token,closure.inputRows,answerRows));
  });
  const limited=await compile(port,closure.program,knownAt,1n);
  await withToken(bridge.createProfiled,async token=>{
    await assert.rejects(run(port,limited,[token]),/max_rounds exceeded/);
    assert.equal(bridge.readEvaluatorProfile(token),null,'Failed fixed point exposes no partial phase sample');
  });
  await withToken(bridge.createProfiled,async token=>{
    assert.deepEqual(await run(port,sql,[token]),ordinary);
    checkSample(token,closure.inputRows,answerRows);
  });
  t.diagnostic(stringify({case:'recursive_chain',coreSha256:manifest.extension_sha256,controlSha256:manifest.control_bridge_sha256,
    knownAt,rounds:ordinary[0][3],derivedFacts:ordinary[0][4],work:ordinary[0][5],samples}));
}));

test('canceled, expired and retired profile tokens expose no sample',async()=>fixture(async port=>{
  const sql=await compile(port,tiny.program,0n);
  await withToken(bridge.createProfiled,async token=>{
    bridge.cancel(token);
    await assert.rejects(run(port,sql,[token]),/TD_E_CANCELED/);
    assert.equal(bridge.readEvaluatorProfile(token),null);
  });
  await withToken(bridge.createProfiled,async token=>{
    await run(port,sql,[token]);
    checkSample(token,0n,1n);
    bridge.cancel(token);
    assert.equal(bridge.readEvaluatorProfile(token),null);
  });
  await withToken(()=>bridge.createProfiled(1),async token=>{
    const waitUntil=performance.now()+100;
    while(bridge.status(token)===0&&performance.now()<waitUntil)await new Promise(resolve=>setImmediate(resolve));
    assert.equal(bridge.status(token),2);
    await assert.rejects(run(port,sql,[token]),/TD_E_DEADLINE/);
    assert.equal(bridge.readEvaluatorProfile(token),null);
  });
}));

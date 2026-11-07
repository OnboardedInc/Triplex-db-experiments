import {openAuditedPort} from './native-test-fixture.js';
import assert from 'node:assert/strict';
import {getEventListeners} from 'node:events';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';
import {NativeDuckDBPort,NativePortError} from './native-duckdb-port.mjs';
import {NativeEntityStore,NativeCommandError} from './native-entity.js';
const root=fileURLToPath(new URL('../..',import.meta.url));
const bridge=createRequire(import.meta.url)(root+'/build/temporal_control.node') as {
  initialize(path:string,hash:string):void;create(millis:number|undefined):bigint;cancel(token:bigint):void;status(token:bigint):number;release(token:bigint):void;
};
const scan="answer(?v) :- triple('e','n',?v).";
const cross="answer('yes') :- triple('e','n',?a),triple('e','n',?b).";
const put=(id:string,record:string)=>({schema:'control',version:1,type:'Row',entityId:'e',commandId:id,record,validFrom:0n,validTo:9223372036854775807n});
async function fixture(count=4){
  const store=await NativeEntityStore.open();await store.defineSchema('schema control version 1 {entity Row {n:int64 many;text:text;flag:boolean;real:float64;}}');
  await store.putRecord(put('seed','{'+Array.from({length:count},(_,n)=>'n='+n+';').join('')+'}'));return store;
}
const code=(expected:string)=>(error:unknown)=>error instanceof NativeCommandError&&error.code===expected;

test('Node bridge shares the extension invocation registry, pins identity and bounds/retires controls',async()=>{
  const port=await NativeDuckDBPort.open();const run=(sql:string)=>port.run({name:'control_abi',sql,params:[]});
  const active:bigint[]=[];
  try{
    const manifest=JSON.parse(await readFile(root+'/build/artifact.json','utf8'));
    bridge.initialize(root+'/build/temporal_datalog.duckdb_extension',manifest.extension_sha256);
    assert.throws(()=>bridge.initialize(root+'/build/temporal_datalog.duckdb_extension','0'.repeat(64)),/already pinned/);
    const token=bridge.create(undefined);active.push(token);assert.equal(bridge.status(token),0);
    assert.deepEqual(await run('SELECT td_control_check_v1('+token+')'),[[true]]);
    bridge.cancel(token);assert.equal(bridge.status(token),1);
    await assert.rejects(run('SELECT td_control_check_v1('+token+')'),/TD_E_CANCELED/);
    bridge.release(token);active.pop();assert.equal(bridge.status(token),3);
    await assert.rejects(run('SELECT td_control_check_v1('+token+')'),/TD_E_CONTROL/);
    const short=bridge.create(1);active.push(short);await new Promise(resolve=>setTimeout(resolve,5));
    assert.equal(bridge.status(short),2);await assert.rejects(run('SELECT td_control_check_v1('+short+')'),/TD_E_DEADLINE/);
    bridge.release(short);active.pop();
    for(let i=0;i<1024;i++)active.push(bridge.create(undefined));
    assert.throws(()=>bridge.create(undefined),/admission/);
    for(const item of active)bridge.release(item);active.length=0;
    const healthy=bridge.create(undefined);assert.equal(bridge.status(healthy),0);bridge.release(healthy);
  }finally{for(const token of active)bridge.release(token);await port.close();}
});

test('controlled queries preserve native/SQL routes, fresh data and transport validation without listener leaks',async()=>{
  const store=await fixture();const controller=new AbortController();
  try{
    const expected=(await store.query(scan,{validAt:0n})).rows;
    for(const forceNative of [false,true]){
      const result=await store.query(scan,{validAt:0n,forceNative,signal:controller.signal,timeoutMs:5000});
      assert.equal(result.route,forceNative?'native':'sql');assert.deepEqual(result.rows,expected);
    }
    for(let i=0;i<12;i++)assert.equal((await store.query(scan,{validAt:0n,signal:controller.signal})).reason,'preferred_native');
    assert.equal(getEventListeners(controller.signal,'abort').length,0);
    await store.putRecord(put('fresh','{n=7;}'));
    assert.deepEqual((await store.query(scan,{validAt:0n,timeoutMs:5000,forceNative:false})).rows,[[{tag:'i64',value:7n}]]);
    for(const timeoutMs of [0,60001,NaN,1.5])await assert.rejects(store.query(scan,{validAt:0n,timeoutMs}),TypeError);
    await assert.rejects(store.query(scan,{validAt:0n,signal:{}as AbortSignal}),TypeError);
    controller.abort();await assert.rejects(store.query(scan,{validAt:0n,signal:controller.signal}),code('TD_E_CANCELED'));
    assert.deepEqual((await store.query(scan,{validAt:0n})).rows,[[{tag:'i64',value:7n}]]);
    await store.putRecord(put('typed','{n=-9223372036854775808;text="é🙂";flag=false;real=f64("0000000000000001");}'));
    const typed="answer(?attribute,?value) :- triple('e',?attribute,?value).";
    const exact=(await store.query(typed,{validAt:0n,forceNative:true})).rows;
    assert.equal(exact.length,4);
    for(const forceNative of [false,true])assert.deepEqual((await store.query(typed,{validAt:0n,forceNative,timeoutMs:5000})).rows,exact);
  }finally{await store.close();}
});

test('whole-query SQL timeout/cancel awaits cleanup, retires tokens and releases connection ownership',{timeout:5000},async()=>{
  const port=await NativeDuckDBPort.open();
  const sql='SELECT sum(sin(a.range*b.range)) FROM range(100000) a,range(100000) b';
  try{
    for(const mode of ['timeout','cancel']){
      const controller=new AbortController();let token=0n;
      const start=performance.now();
      const pending=port.withQueryControl(mode==='timeout'?{timeoutMs:20}:{signal:controller.signal},async control=>{
        token=control.token;
        await assert.rejects(port.run({name:'wrong_owner',sql:'SELECT 1',params:[]}),/owns this connection/);
        return control.run({name:'controlled_sql',sql,params:[]});
      });
      const timer=mode==='cancel'?setTimeout(()=>controller.abort(),20):undefined;
      try{await assert.rejects(pending,error=>error instanceof NativePortError&&error.code===(mode==='timeout'?'DEADLINE':'CANCELED'));}
      finally{clearTimeout(timer);}
      assert.ok(performance.now()-start<2000);assert.equal(bridge.status(token),3);assert.equal(port.status(),'ready');
      assert.equal(getEventListeners(controller.signal,'abort').length,0);
      assert.deepEqual(await port.run({name:'healthy_sql',sql:'SELECT 42',params:[]}),[[42n]]);
    }
  }finally{await port.close();}
});

test('native polling observes Node cancellation and independent evaluator/whole-query deadlines publish no partial output',{timeout:7000},async()=>{
  const store=await fixture(4096);
  try{
    const controller=new AbortController();const start=performance.now();
    const pending=store.query(cross,{validAt:0n,forceNative:true,maxWork:50000000,deadlineMs:60000,signal:controller.signal});
    const timer=setTimeout(()=>controller.abort(),100);
    try{await assert.rejects(pending,code('TD_E_CANCELED'));}finally{clearTimeout(timer);}
    assert.ok(performance.now()-start<2000);
    await assert.rejects(store.query(cross,{validAt:0n,forceNative:true,maxWork:50000000,deadlineMs:1,timeoutMs:5000}),code('TD_E_DEADLINE'));
    await assert.rejects(store.query(scan,{validAt:0n,forceNative:false,timeoutMs:1}),code('TD_E_DEADLINE'));
    await assert.rejects(store.query(cross,{validAt:0n,forceNative:true,maxWork:1,timeoutMs:5000}),/max_work/);
    assert.equal((await store.query(scan,{validAt:0n,timeoutMs:5000})).rows.length,4096);
  }finally{await store.close();}
});

test('aborting a queued request cannot interrupt the previous invocation',async()=>{
  const store=await fixture(4096);
  try{
    const controller=new AbortController();
    const first=store.query(cross,{validAt:0n,forceNative:true,maxWork:50000000,deadlineMs:100});
    const second=store.query(scan,{validAt:0n,signal:controller.signal});controller.abort();
    await Promise.all([assert.rejects(first,code('TD_E_DEADLINE')),assert.rejects(second,code('TD_E_CANCELED'))]);
    assert.equal((await store.query(scan,{validAt:0n,timeoutMs:5000})).rows.length,4096);
    assert.equal(getEventListeners(controller.signal,'abort').length,0);
  }finally{await store.close();}
});

test('C++ parameterized templates reuse structural SQL with fresh tokens, data, rollback and schema meaning',async()=>{
  const port=await openAuditedPort();const run=(sql:string,params:readonly unknown[]=[])=>port.runNative({name:'template_fixture',sql,params});
  const compile=(program:string)=>run('SELECT td_query_store_sql_v1(?,?,?,?,?,?,?,?)',[program,0n,-1n,100000n,1000n,5000000n,1000n,0n]);
  try{
    await run("PRAGMA td_define_schema('schema control version 1 {entity Row {n:int64 many;}}')");
    await run("PRAGMA td_put_entity('control',1,'Row','e','one','{n=1;n=2;}',0,9223372036854775807)");
    const sql=(await compile(scan))[0]?.[0];assert.ok(typeof sql==='string');assert.ok(sql.includes('$1'));
    let retired=0n;
    const execute=()=>port.withNativeQueryControl({timeoutMs:5000},async control=>{
      retired=control.token;return control.run({name:'compiled_read',sql,params:[control.token],reuse:true});
    });
    const first=await execute();assert.equal(first.length,2);assert.equal(first[0]?.[0],1n);
    const old=retired;assert.equal(bridge.status(old),3);const hits=port.cacheStats().hits;
    await run("PRAGMA td_put_entity('control',1,'Row','e','two','{n=7;}',0,9223372036854775807)");
    const second=await execute();assert.equal(second[0]?.[0],2n);assert.ok(port.cacheStats().hits>hits);
    assert.equal(JSON.parse(String(second[0]?.[6]))[0].i,'7');
    await assert.rejects(port.withNativeQueryControl({timeoutMs:5000},control=>control.run({name:'retired_binding',sql,params:[old],reuse:true})),/TD_E_CONTROL/);
    await run("PRAGMA td_define_schema('schema control version 2 {entity Row {n:text;}}')");
    await run('PRAGMA td_put_entity(\'control\',2,\'Row\',\'e\',\'three\',\'{n="new";}\',0,9223372036854775807)');
    assert.equal(JSON.parse(String((await execute())[0]?.[6]))[0].s,'new');
    await run('BEGIN');
    await run('PRAGMA td_put_entity(\'control\',2,\'Row\',\'e\',\'temporary\',\'{n="temp";}\',0,9223372036854775807)');
    assert.equal(JSON.parse(String((await execute())[0]?.[6]))[0].s,'temp');await run('ROLLBACK');
    assert.equal(JSON.parse(String((await execute())[0]?.[6]))[0].s,'new');
    const literal="answer('DROP TABLE main.assertions;').";
    const literalSql=(await compile(literal))[0]?.[0];assert.ok(typeof literalSql==='string');
    const answer=await port.withNativeQueryControl({timeoutMs:5000},control=>control.run({name:'quoted_template',sql:literalSql,params:[control.token],reuse:true}));
    assert.equal(JSON.parse(String(answer[0]?.[6]))[0].s,'DROP TABLE main.assertions;');
    assert.deepEqual(await run('SELECT count(*) FROM main.assertions'),[[4n]]);
    assert.ok(port.cacheStats().entries<=32);assert.ok(port.cacheStats().sqlBytes<=262144);
    await assert.rejects(run('SELECT td_query_store_sql_v1(?,?,?,?,?,?,?,?)',[scan,0n,-1n,100000n,1000n,5000000n,1000n,3n]),/TD_E_QUERY_INPUT/);
  }finally{await port.close();}
});

test('expanded SQL above the wire limit falls back to the pragma without rejecting the valid program',async()=>{
  const attributes=['a','b','c','d'].map(c=>c.repeat(16250));
  const program="answer('yes') :- "+attributes.map((a,i)=>"triple(?e,'"+a+"',?v"+i+')').join(',')+'.';
  assert.ok(Buffer.byteLength(program)<=65536);
  const port=await NativeDuckDBPort.open();
  try{
    assert.deepEqual(await port.run({name:'oversized_template',sql:'SELECT td_query_store_sql_v1(?,?,?,?,?,?,?,?)',
      params:[program,0n,-1n,100000n,1000n,5000000n,1000n,0n]}),[[null]]);
  }finally{await port.close();}
  const store=await fixture(0);
  try{
    const plain=await store.query(program,{validAt:0n,forceNative:false});
    const controlled=await store.query(program,{validAt:0n,forceNative:false,timeoutMs:5000});
    assert.deepEqual(controlled,plain);assert.equal(controlled.route,'sql');assert.deepEqual(controlled.rows,[]);
  }finally{await store.close();}
});

import assert from 'node:assert/strict';
import {getEventListeners} from 'node:events';
import {test} from 'node:test';
import {DuckDBConnection,DuckDBPreparedStatement} from '@duckdb/node-api';
import {NativeEntityStore} from './native-entity.js';
import type {NativeScalableQueryOptions} from './native-entity.js';
import type {SchemaValue} from './native-schema.js';

const SCHEMA='schema comparisons version 1 {entity Row {i:int64 many;s:text many;b:boolean many;f:float64 many;}}';
const MIN=-9223372036854775808n,MAX=9223372036854775807n;
const LIMIT=/TD_E_QUERY_SCALE_LIMIT/;
const UNSUPPORTED=/TD_E_QUERY_SCALE_UNSUPPORTED/;
const TYPE=/TD_E_EXPR_TYPE/;
const string=(value:string):SchemaValue=>({tag:'str',value});
const integer=(value:bigint):SchemaValue=>({tag:'i64',value});
const floating=(value:number):SchemaValue=>({tag:'f64',value});
const boolean=(value:boolean):SchemaValue=>({tag:'bool',value});
const record=(commandId:string,contents:string,entityId='e')=>({
  schema:'comparisons',version:1,type:'Row',entityId,commandId,record:contents,validFrom:0n,validTo:10n,
});
const scan=(attribute:string,filters:string)=>`answer(?v) :- triple(?e,'${attribute}',?v),${filters}.`;

async function fixture(contents:string,work:(store:NativeEntityStore)=>Promise<void>):Promise<void>{
  const store=await NativeEntityStore.open({readers:1});
  try{
    await store.defineSchema(SCHEMA);
    await store.putRecord(record('seed',contents));
    await work(store);
  }finally{await store.close();}
}

async function parity(store:NativeEntityStore,program:string,expected:readonly (readonly SchemaValue[])[],
  options:NativeScalableQueryOptions={validAt:0n}):Promise<void>{
  const result=await store.queryScalable(program,options);
  const native=await store.query(program,{...options,forceNative:true});
  assert.equal(result.route,'sql',program);
  assert.match(result.reason,/^owned_(?:unique_|allcut_unique_)?scalable_single_atom$/);
  assert.equal(result.counters,null);
  assert.equal(result.position,native.position);
  assert.deepEqual(result.rows,expected,program);
  assert.deepEqual(native.rows,expected,program);
}

test('scalable comparisons preserve exact tagged equality and bound variable origins',async()=>{
  await fixture('{i=1;i=-1;s="1";s="e";s="s";b=true;b=false;'+
    'f=f64("3ff0000000000000");f=f64("0000000000000001");f=f64("8000000000000000");}',async store=>{
    const all="answer(?a,?v) :- triple(?e,?a,?v),";
    for(const [filter,expected] of [
      ['[?v=1]',[string('i'),integer(1n)]],
      ['[?v=1.0]',[string('f'),floating(1)]],
      ['[?v=true]',[string('b'),boolean(true)]],
      ["[?v='1']",[string('s'),string('1')]],
      ['[?v=5e-324]',[string('f'),floating(Number.MIN_VALUE)]],
      ['[?v=-0.0]',[string('f'),floating(0)]],
      ['[?e=?v]',[string('s'),string('e')]],
      ['[?a=?v]',[string('s'),string('s')]],
    ] as const)await parity(store,all+filter+'.',[expected]);
    await parity(store,all+'[?v!=1].',[
      [string('b'),boolean(false)],[string('b'),boolean(true)],
      [string('f'),floating(0)],[string('f'),floating(Number.MIN_VALUE)],[string('f'),floating(1)],
      [string('i'),integer(-1n)],[string('s'),string('1')],[string('s'),string('e')],[string('s'),string('s')],
    ]);
  });
});

test('ordered scalar scans compare exact signed int64 and UTF-8 bytes',async()=>{
  const privateUse='\ue000',supplementary='\u{10000}';
  await fixture(`{i=${MIN};i=${MIN+1n};i=-1;i=${MAX-1n};i=${MAX};s="a";s="a'";s="aé";s="${privateUse}";s="${supplementary}";}`,async store=>{
    await parity(store,scan('i',`[?v>=${MAX-1n}]`),[[integer(MAX-1n)],[integer(MAX)]]);
    await parity(store,`answer(?v) :- [?v=${MAX}],triple(?e,'i',?v).`,[[integer(MAX)]]);
    await parity(store,scan('i',`[${MIN}<?v],[?v<=${MIN+1n}]`),[[integer(MIN+1n)]]);
    await parity(store,scan('i',`[${MAX}>?v],[?v>${MAX-2n}]`),[[integer(MAX-1n)]]);
    await parity(store,scan('i',`[?v<${MIN}]`),[]);
    await parity(store,scan('s',`[?v>='${privateUse}']`),[[string(privateUse)],[string(supplementary)]]);
    await parity(store,scan('s',`[?v>"a'"],[?v<'${privateUse}']`),[[string('aé')]]);
  });
});

test('ordered comparison type faults are eager on complete relational matches',async()=>{
  await fixture('{i=1;i=2;b=true;}',async store=>{
    await store.defineSchema('schema comparisons version 2 {entity Row {i:text many;}}');
    await store.putRecord({...record('wrong-tag','{i="text";}','other'),version:2});
    const errors=[
      "answer('same') :- triple(?e,'i',?v),[false=true],[?v>0].",
      "answer('same') :- triple(?e,'i',?v),[?v>0].",
      scan('b','[?v>0]'),
    ];
    for(const program of errors){
      await assert.rejects(store.queryScalable(program,{validAt:0n,timeoutMs:5000}),TYPE);
      await assert.rejects(store.query(program,{validAt:0n,forceNative:true}),TYPE);
    }
    await parity(store,"answer(?v) :- triple('e','i',?v),[?v>0].",[[integer(1n)],[integer(2n)]]);
    await parity(store,"answer(?v) :- triple('missing','i',?v),[?v>0].",[]);
    await parity(store,scan('i','[?v>0]'),[[integer(1n)],[integer(2n)]],{validAt:0n,knownAt:1n});
  });
});

test('scalable comparison scans admit full inputs and bound typed output after filtering',async()=>{
  await fixture('{i=1;i=2;i=3;}',async store=>{
    const selected="answer(?e,?v) :- triple(?e,'i',?v),[?v>=3].";
    const exact={validAt:0n,maxInputFacts:3,maxIntermediateRows:3,maxIntermediateBytes:366,
      maxOutputRows:1,maxOutputBytes:646};
    await parity(store,selected,[[string('e'),integer(3n)]],exact);
    for(const [key,value] of [
      ['maxInputFacts',2],['maxIntermediateRows',2],['maxIntermediateBytes',365],['maxOutputBytes',645],
    ] as const)await assert.rejects(store.queryScalable(selected,{...exact,[key]:value}),LIMIT);
    await assert.rejects(store.queryScalable(selected.replace('>=3','>=2'),exact),LIMIT);
    const impossible=selected.replace('>=3','>3');
    await assert.rejects(store.queryScalable(impossible,{...exact,maxInputFacts:2}),LIMIT);
    await parity(store,impossible,[],exact);
  });
  await fixture('{i=1;s="'+ 'x'.repeat(513)+'";}',async store=>{
    await assert.rejects(store.queryScalable("answer(?v) :- triple(?e,?a,?v),[?a='i'].",
      {validAt:0n}),/TD_E_QUERY_PROFILE/);
    await parity(store,scan('i','[?v>=0]'),[[integer(1n)]]);
  });
});

test('opaque or out-of-slice filters retain their bounded native semantics',async()=>{
  await fixture('{i=1;i=2;s="text";f=f64("3ff0000000000000");}',async store=>{
    const programs=[
      scan('i','[?v>=0],[?v+1>2]'),
      scan('i','[1<2]'),
      "answer(?e) :- triple(?e,?a,?v),[?e<?a].",
      "answer(?v) :- triple(?e,'i',?v),triple(?e,'s',?s),[?s!='absent'].",
      "source(?e,?v) :- triple(?e,'i',?v),[?v>=0]. answer(count()) :- source(?e,?v).",
    ];
    for(const program of programs){
      await assert.rejects(store.queryScalable(program,{validAt:0n}),UNSUPPORTED);
      assert.equal((await store.query(program,{validAt:0n,forceNative:false})).route,'native');
    }
    assert.equal((await store.query(scan('i','[?v>0]'),{validAt:0n,forceNative:false})).route,'native');
    await assert.rejects(store.queryScalable(scan('i','[?v>?unbound]'),{validAt:0n}),/TD_E_EXPR_UNBOUND/);
    await assert.rejects(store.query(scan('i','[false=true],[1/0=0]'),{validAt:0n}),/TD_E_EXPR_DIV_ZERO/);
  });
});

test('cached audited comparison scans refresh cuts and retire an active abort',async t=>{
  await fixture('{i=1;i=3;}',async store=>{
    const program=scan('i','[?v>=3]'),options={validAt:3n,timeoutMs:5000};
    const owners=new Map<DuckDBPreparedStatement,DuckDBConnection>();
    const interrupts:DuckDBConnection[]=[];
    const prepare=DuckDBConnection.prototype.prepare,stream=DuckDBPreparedStatement.prototype.stream;
    const interrupt=DuckDBConnection.prototype.interrupt;
    let holdNext=false,heldOwner:DuckDBConnection|undefined;
    let markStarted!:()=>void,release!:()=>void;
    const started=new Promise<void>(resolve=>{markStarted=resolve;});
    const released=new Promise<void>(resolve=>{release=resolve;});
    t.mock.method(DuckDBConnection.prototype,'prepare',async function(this:DuckDBConnection,sql:string){
      const prepared=await prepare.call(this,sql);
      if(sql.includes('comparison_matches')&&sql.includes('td_control_check_v1('))owners.set(prepared,this);
      return prepared;
    });
    t.mock.method(DuckDBPreparedStatement.prototype,'stream',async function(this:DuckDBPreparedStatement){
      const result=await stream.call(this),owner=owners.get(this);
      if(holdNext&&owner){
        holdNext=false;heldOwner=owner;markStarted();await released;
      }
      return result;
    });
    t.mock.method(DuckDBConnection.prototype,'interrupt',function(this:DuckDBConnection){
      interrupts.push(this);return interrupt.call(this);
    });
    const controller=new AbortController();
    let canceled:Promise<void>|undefined,timer:ReturnType<typeof setTimeout>|undefined;
    try{
      await parity(store,program,[[integer(3n)]],options);
      await store.patchRecord({...record('good','{i=9;}'),validFrom:2n,validTo:8n});
      await parity(store,program,[[integer(9n)]],options);
      assert.equal(owners.size,1,'latest controlled plan should be reused after a write');
      await parity(store,program,[[integer(3n)]],{...options,knownAt:1n});
      await parity(store,program,[[integer(3n)]],{...options,validAt:8n});
      await store.defineSchema('schema comparisons version 2 {entity Row {i:text many;}}');
      await store.patchRecord({...record('bad-tag','{i="text";}'),version:2,validFrom:2n,validTo:8n});
      await assert.rejects(store.queryScalable(program,options),TYPE);
      await parity(store,program,[[integer(9n)]],{...options,knownAt:2n});
      await store.patchRecord({...record('good-again','{i=11;}'),validFrom:2n,validTo:8n});
      await parity(store,program,[[integer(11n)]],options);
      holdNext=true;
      canceled=assert.rejects(store.queryScalable(program,{...options,signal:controller.signal}),/TD_E_CANCELED/);
      canceled.catch(()=>{});
      await Promise.race([started,new Promise<never>((_,reject)=>{
        timer=setTimeout(()=>reject(new Error('Controlled comparison result did not reach the held reader')),5000);
      })]);
      clearTimeout(timer);
      controller.abort();release();await canceled;
      assert.ok(heldOwner);
      assert.deepEqual(interrupts,[heldOwner]);
      assert.equal(getEventListeners(controller.signal,'abort').length,0);
      assert.equal(store.readerStats().active,0);
      await parity(store,program,[[integer(11n)]],options);
    }finally{
      clearTimeout(timer);release();await canceled?.catch(()=>{});
    }
  });
});

test('pushable entity scopes preserve binary case and Unicode identity before admission',async()=>{
  const store=await NativeEntityStore.open({readers:1});
  const composed="L'été",decomposed="L'e\u0301te\u0301",folded="l'été";
  try{
    await store.defineSchema(SCHEMA);
    for(const [index,entity] of [composed,decomposed,folded].entries())
      await store.putRecord(record('binary-'+index,`{i=${index+1};}`,entity));
    for(const [index,entity] of [composed,decomposed,folded].entries()){
      const program=`answer(?v) :- triple(${JSON.stringify(entity)},'i',?v).`;
      await parity(store,program,[[integer(BigInt(index+1))]],{validAt:0n,maxInputFacts:1});
    }
    const union=`answer(?v) :- triple(${JSON.stringify(composed)},'i',?v).
      answer(?v) :- triple(${JSON.stringify(folded)},'i',?v).`;
    const result=await store.queryScalable(union,{validAt:0n,maxInputFacts:2});
    assert.deepEqual(result.rows,[[integer(1n)],[integer(3n)]]);
    assert.deepEqual(result.rows,(await store.query(union,{validAt:0n,forceNative:true})).rows);
  }finally{await store.close();}
});

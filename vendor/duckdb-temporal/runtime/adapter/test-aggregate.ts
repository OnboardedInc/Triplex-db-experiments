import assert from 'node:assert/strict';
import {test} from 'node:test';
import {NativeEntityStore} from './native-entity.js';
import type {NativeQueryOptions,NativeQueryResult} from './native-entity.js';

const INF=9223372036854775807n,MIN=-9223372036854775808n;
const schema='schema aggregates version 1 {entity Row {i:int64 many;s:text many;f:float64 many;b:boolean;}}';
const put=(commandId:string,record:string,entityId='a')=>({schema:'aggregates',version:1,type:'Row',entityId,commandId,record,validFrom:0n,validTo:INF});
const program=(op:string,attribute='i',grouped=false)=>"source(?e,?v) :- triple(?e,'"+attribute+"',?v). answer("+(grouped?'?e,':'')+op+") :- source(?e,?v).";
async function same(store:NativeEntityStore,p:string,options:Omit<NativeQueryOptions,'validAt'|'forceNative'>={},requireSQL=true){
  const native=await store.query(p,{validAt:0n,...options,forceNative:true});
  const selected=await store.query(p,{validAt:0n,...options,forceNative:false});
  assert.deepEqual(selected.rows,native.rows,p);assert.equal(selected.position,native.position);
  if(requireSQL){assert.equal(selected.route,'sql',p);assert.equal(selected.reason,'proved_aggregate');assert.equal(selected.counters,null);}
  return selected;
}
const int=(value:bigint)=>({tag:'i64' as const,value});
const text=(value:string)=>({tag:'str' as const,value});
async function joinedAnswers(store:NativeEntityStore,program:string,expected:NativeQueryResult['rows'],knownAt:bigint,validAt=0n){
  const cut={knownAt,validAt};
  const result=await store.queryScalable(program,cut);
  assert.equal(result.route,'sql',program);
  assert.match(result.reason,/owned_.*scalable_(aggregate|count)$/);
  assert.equal(result.position,knownAt);
  assert.deepEqual(result.rows,expected,program);
  const native=await store.query(program,{...cut,forceNative:true});
  assert.equal(native.position,knownAt);
  assert.deepEqual(native.rows,expected,program);
}

test('SQL extrema and integer sums preserve complete source sets, exact endpoints and grouped answers',async()=>{
  const store=await NativeEntityStore.open();
  try{
    await store.defineSchema(schema);
    await store.putRecord(put('a','{i=-9223372036854775808;i=9223372036854775807;i=1;i=2;}'));
    await store.putRecord(put('b','{i=2;i=3;}','b'));
    assert.deepEqual((await same(store,program('min(?v)'))).rows,[[{tag:'i64',value:MIN}]]);
    assert.deepEqual((await same(store,program('max(?v)'))).rows,[[{tag:'i64',value:INF}]]);
    // Final range is valid even though some mathematical prefixes overflow i64.
    assert.deepEqual((await same(store,program('sum_i64(?v)'),{},false)).rows,[[{tag:'i64',value:7n}]]);
    assert.deepEqual((await same(store,program('sum_i64(?v)','i',true),{},false)).rows,
      [[{tag:'str',value:'a'},{tag:'i64',value:2n}],[{tag:'str',value:'b'},{tag:'i64',value:5n}]]);
    const projected="source(?e,5) :- triple(?e,'i',?v). answer(sum_i64(?v)) :- source(?e,?v).";
    assert.deepEqual((await same(store,projected)).rows,[[{tag:'i64',value:10n}]]);
    const distinct="source(?v) :- triple(?e,'i',?v). answer(sum_i64(?v)) :- source(?v).";
    assert.deepEqual((await same(store,distinct,{},false)).rows,[[{tag:'i64',value:5n}]]);
  }finally{await store.close();}
});

test('SQL extrema keep binary Unicode ordering, finite float endpoints and subnormal bits',async()=>{
  const store=await NativeEntityStore.open();
  try{
    await store.defineSchema(schema);
    await store.putRecord(put('typed','{s="";s="a";s="é";s="😀";s="🙂";f=f64("ffefffffffffffff");f=f64("8000000000000001");f=f64("0000000000000000");f=f64("0000000000000001");f=f64("7fefffffffffffff");}'));
    assert.deepEqual((await same(store,program('min(?v)','s'))).rows,[[{tag:'str',value:''}]]);
    assert.deepEqual((await same(store,program('max(?v)','s'))).rows,[[{tag:'str',value:'🙂'}]]);
    assert.deepEqual((await same(store,program('min(?v)','f'))).rows,[[{tag:'f64',value:-Number.MAX_VALUE}]]);
    assert.deepEqual((await same(store,program('max(?v)','f'))).rows,[[{tag:'f64',value:Number.MAX_VALUE}]]);
    await store.putRecord(put('subnormal','{f=f64("8000000000000001");f=f64("0000000000000001");}'));
    assert.deepEqual((await same(store,program('min(?v)','f'))).rows,[[{tag:'f64',value:-Number.MIN_VALUE}]]);
    assert.deepEqual((await same(store,program('max(?v)','f'))).rows,[[{tag:'f64',value:Number.MIN_VALUE}]]);
  }finally{await store.close();}
});

test('empty global/grouped aggregates and original schema meaning remain fresh through corrections',async()=>{
  const store=await NativeEntityStore.open();
  try{
    await store.defineSchema(schema);
    for(const op of ['min(?v)','max(?v)','sum_i64(?v)']){
      assert.deepEqual((await same(store,program(op))).rows,op.startsWith('sum')?[[{tag:'i64',value:0n}]]:[]);
      assert.deepEqual((await same(store,program(op,'i',true))).rows,[]);
    }
    await store.putRecord(put('before','{i=1;i=9;}'));
    await same(store,program('max(?v)'));
    await store.defineSchema('schema aggregates version 2 {entity Row {i:text many;}}');
    await store.putRecord({...put('after','{i="new";}'),version:2});
    assert.deepEqual((await same(store,program('max(?v)'))).rows,[[{tag:'str',value:'new'}]]);
    assert.deepEqual((await same(store,program('max(?v)'),{knownAt:1n})).rows,[[{tag:'i64',value:9n}]]);
    for(const forceNative of [true,false])await assert.rejects(store.query(program('sum_i64(?v)'),{validAt:0n,forceNative}),/TD_E_AGG_MEASURE_TAG/);
  }finally{await store.close();}
});

test('SQL admission preserves native measure errors, final overflow and canonical tag-before-range priority',async()=>{
  const store=await NativeEntityStore.open();
  const reject=async(p:string,code:RegExp)=>{for(const forceNative of [true,false])await assert.rejects(store.query(p,{validAt:0n,forceNative}),code);};
  try{
    await store.defineSchema(schema);
    await store.putRecord(put('a','{i=9223372036854775807;s="x";b=true;}'));
    await store.putRecord(put('b','{i=1;}','b'));
    await reject(program('sum_i64(?v)'),/TD_E_AGG_SUM_RANGE/);
    await reject(program('min(?v)','b'),/TD_E_AGG_MEASURE_TAG/);
    await reject(program('max(?v)','b'),/TD_E_AGG_MEASURE_TAG/);
    const mixed="source(?e,?a,?v) :- triple(?e,?a,?v). answer(min(?v)) :- source(?e,?a,?v).";
    // Boolean rejection takes precedence over the same group's mixed tags.
    await reject(mixed,/TD_E_AGG_MEASURE_TAG/);
    await store.putRecord(put('mixed-no-bool','{i=9223372036854775807;s="x";}'));
    await reject(mixed,/TD_E_AGG_MIXED_TAGS/);
    await reject(mixed.replace('min(?v)','max(?v)'),/TD_E_AGG_MIXED_TAGS/);
    await store.putRecord(put('clean','{i=9223372036854775807;i=1;}'));
    await store.putRecord(put('late-type','{s="bad";}','z'));
    const grouped="source(?e,?a,?v) :- triple(?e,?a,?v). answer(?e,sum_i64(?v)) :- source(?e,?a,?v).";
    // Group 'a' overflows; group 'z' has an invalid tag. All tags are checked first.
    await reject(grouped,/TD_E_AGG_MEASURE_TAG/);
    await store.putRecord(put('healthy','{i=4;}'));
    assert.deepEqual((await same(store,program('min(?v)'))).rows,[[{tag:'i64',value:1n}]]);
  }finally{await store.close();}
});

test('non-count aggregate proofs retain native work/fact/round failures including empty-global work',async()=>{
  const store=await NativeEntityStore.open();
  try{
    await store.defineSchema(schema);await store.putRecord(put('one','{i=1;i=2;i=3;}'));
    for(const op of ['min(?v)','max(?v)','sum_i64(?v)'])for(const limits of [{maxFacts:6},{maxFacts:7},{maxWork:10},{maxWork:11},{maxRounds:1},{maxRounds:2}]){
      const attempt=async(forceNative:boolean)=>{try{return {value:await store.query(program(op),{validAt:0n,...limits,forceNative})};}
        catch(error){assert.match(String(error),/max_(facts|work|rounds)/);return {failed:true};}};
      const native=await attempt(true),selected=await attempt(false);
      assert.equal('failed'in selected,'failed'in native,op+JSON.stringify(limits));
      if('value'in native&&'value'in selected){
        assert.deepEqual(selected.value!.rows,native.value!.rows);
        if(limits.maxFacts===7||limits.maxWork===11||limits.maxRounds===2)assert.equal(selected.value!.route,'sql');
      }
    }
    const absent="source(?e,?v) :- triple(?e,'missing',?v). answer(min(?v)) :- source(?e,?v).";
    for(const forceNative of [true,false])await assert.rejects(store.query(absent,{validAt:0n,forceNative,maxWork:1}),/max_work/);
    assert.deepEqual((await same(store,absent,{maxWork:2})).rows,[]);
    await same(store,program('sum_i64(?v)'));
  }finally{await store.close();}
});

test('direct and projected measures, conservative mixed-group fallback and wide-source gating remain exact',async()=>{
  const store=await NativeEntityStore.open();
  try{
    await store.defineSchema(schema);await store.putRecord(put('direct','{i=1;i=4;i=9;}'));
    const direct='answer(max(?v)) :- triple(?e,?a,?v).';
    assert.deepEqual((await same(store,direct)).rows,[[{tag:'i64',value:9n}]]);
    const fallback=await same(store,direct,{maxRounds:1},false);
    assert.equal(fallback.route,'native');assert.equal(fallback.reason,'aggregate_budget_unproved');
    assert.deepEqual((await same(store,'answer(min(?e)) :- triple(?e,?a,?v).')).rows,[[{tag:'str',value:'a'}]]);
    assert.deepEqual((await same(store,"source('fixed',?v) :- triple(?e,'i',?v). answer(min(?e)) :- source(?e,?v).")).rows,[[{tag:'str',value:'fixed'}]]);
    await store.putRecord(put('other-tag','{s="z";}','z'));
    const mixed="source(?e,?a,?v) :- triple(?e,?a,?v). answer(?e,min(?v)) :- source(?e,?a,?v).";
    const groups=await same(store,mixed,{},false);
    assert.equal(groups.route,'native');
    assert.deepEqual(groups.rows,[[{tag:'str',value:'a'},{tag:'i64',value:1n}],[{tag:'str',value:'z'},{tag:'str',value:'z'}]]);
    await store.putRecord(put('many','{'+Array.from({length:4096},(_,i)=>'i='+i+';').join('')+'}'));
    const wide="source(?v,'"+'x'.repeat(16384)+"') :- triple(?e,'i',?v). answer(min(?v)) :- source(?v,?text).";
    const gated=await same(store,wide,{timeoutMs:5000},false);
    assert.equal(gated.route,'native');assert.equal(gated.reason,'aggregate_budget_unproved');
    assert.deepEqual(gated.rows,[[{tag:'i64',value:0n}]]);
  }finally{await store.close();}
});

test('scalable joins feed complete ledger and inventory aggregates at historical and corrected cuts',async()=>{
  const store=await NativeEntityStore.open();
  const event=(entityId:string,record:string)=>({schema:'ledger',version:1,type:'Event',entityId,
    commandId:entityId,record,validFrom:0n,validTo:10n});
  const ledger="source(?event,?amount) :- triple(?event,'account',\"a\"),triple(?event,'currency',\"USD\"),triple(?event,'amount',?amount). answer(sum_i64(?amount)) :- source(?event,?amount).";
  const inventory="source(?event,?ledger,?delta) :- triple(?event,'sku',\"x\"),triple(?event,'ledger',?ledger),triple(?event,'delta',?delta). answer(?ledger,sum_i64(?delta)) :- source(?event,?ledger,?delta).";
  try {
    await store.defineSchema('schema ledger version 1 {entity Event {account:text;currency:text;amount:int64;sku:text;ledger:text;delta:int64;}}');
    const first=event('one','{account="a";currency="USD";amount=9;sku="x";ledger="physical";delta=11;}');
    await store.putRecord(first);
    await store.putRecord(event('two','{account="a";currency="USD";amount=9;sku="x";ledger="reservation";delta=3;}'));
    await store.putRecord(event('other','{account="a";currency="EUR";amount=100;sku="y";ledger="physical";delta=100;}'));
    const correction=await store.patchRecord({...first,commandId:'correction',validFrom:4n,validTo:6n,
      record:'{account="a";currency="USD";amount=-2;sku="x";ledger="physical";delta=4;}'});
    assert.equal(correction.position,4n);
    await joinedAnswers(store,ledger,[[int(0n)]],0n);
    await joinedAnswers(store,inventory,[],0n);
    for(const [known,valid,amount,physical] of [[3n,4n,18n,11n],[4n,4n,7n,4n],[4n,6n,18n,11n]] as const){
      await joinedAnswers(store,ledger,[[int(amount)]],known,valid);
      await joinedAnswers(store,inventory,[[text('physical'),int(physical)],[text('reservation'),int(3n)]],known,valid);
    }
    const projected=ledger.replace('source(?event,?amount)','source(?amount)')
      .replace('source(?event,?amount).','source(?amount).');
    await joinedAnswers(store,projected,[[int(9n)]],3n,4n);
    const reordered="answer(sum_i64(?amount)) :- source(?event,?amount). source(?event,?amount) :- triple(?event,'amount',?amount),triple(?event,'currency',\"USD\"),triple(?event,'account',\"a\").";
    await joinedAnswers(store,reordered,[[int(18n)]],3n,4n);
    const bounded=await store.query(ledger,{validAt:4n,knownAt:3n,forceNative:false});
    assert.equal(bounded.route,'native');
    assert.deepEqual(bounded.rows,[[int(18n)]]);
  }finally{await store.close();}
});

test('join producer DISTINCT collapses fanout while preserving exact typed extrema and count keys',async()=>{
  const store=await NativeEntityStore.open();
  const when={tag:'datetime' as const,value:-0.25};
  const prefix="source(?e,?v) :- triple(?e,'value',?v),triple(?e,'token',?match). ";
  try {
    await store.defineSchema('schema measurements version 1 {entity Score {value:int64;token:text many;} entity Deadline {value:datetime;token:text many;}}');
    const base={schema:'measurements',version:1,validFrom:0n,validTo:10n};
    for(const [entityId,type,value] of [['a','Score',int(2n)],['b','Deadline',when]] as const)
      await store.put({...base,type,entityId,commandId:entityId,fields:[
        {attribute:'value',value},{attribute:'token',value:text('a')},{attribute:'token',value:text('b')},
      ]});
    await store.put({...base,type:'Score',entityId:'ignored',commandId:'ignored',fields:[{attribute:'value',value:int(3n)}]});
    await joinedAnswers(store,prefix+'answer(count()) :- source(?e,?v).',[[int(2n)]],3n);
    const four="source(?e,?v) :- triple(?e,'token',?a),triple(?e,'token',?b),triple(?e,'value',?v),triple(?e,'token',?c). answer(count()) :- source(?e,?v).";
    await joinedAnswers(store,four,[[int(2n)]],3n);
    await joinedAnswers(store,prefix+'answer(?v,count()) :- source(?e,?v).',[[int(2n),int(1n)],[when,int(1n)]],3n);
    for(const op of ['min','max'])
      await joinedAnswers(store,prefix+`answer(?e,${op}(?v)) :- source(?e,?v).`,[[text('a'),int(2n)],[text('b'),when]],3n);
    await joinedAnswers(store,prefix+'answer(min(?v)) :- source(?e,?v).',[],0n);
  }finally{await store.close();}
});

test('joined aggregate faults preserve joined membership and tag-before-overflow precedence',async()=>{
  const store=await NativeEntityStore.open();
  const base={schema:'join_fault',version:1,validFrom:0n,validTo:10n};
  const source="source(?e,?g,?v) :- triple(?e,'g',?g),triple(?e,'v',?v),triple(?e,'enabled',true). ";
  const sum=source+'answer(?g,sum_i64(?v)) :- source(?e,?g,?v).';
  const reject=async(program:string,code:RegExp)=>{
    await assert.rejects(store.query(program,{validAt:0n,forceNative:true}),code);
    await assert.rejects(store.queryScalable(program,{validAt:0n}),code);
  };
  try {
    await store.defineSchema('schema join_fault version 1 {entity Numeric {g:text;v:int64 many;enabled:boolean;} entity Other {g:text;v:text;enabled:boolean;}}');
    await store.putRecord({...base,type:'Numeric',entityId:'one',commandId:'one',record:'{g="a";v=9223372036854775807;v=1;enabled=true;}'});
    await store.putRecord({...base,type:'Other',entityId:'two',commandId:'two',record:'{g="z";v="text";enabled=false;}'});
    await reject(sum,/TD_E_AGG_SUM_RANGE/);
    await store.putRecord({...base,type:'Other',entityId:'two',commandId:'enable',record:'{g="z";v="text";enabled=true;}'});
    await reject(sum,/TD_E_AGG_MEASURE_TAG/);
    await joinedAnswers(store,source+'answer(?g,min(?v)) :- source(?e,?g,?v).',
      [[text('a'),int(1n)],[text('z'),text('text')]],3n);
    await reject(source+'answer(max(?v)) :- source(?e,?g,?v).',/TD_E_AGG_MIXED_TAGS/);
  }finally{await store.close();}
});

test('join-source proof rejects Cartesian and wide projections before construction and still gates output',async()=>{
  const store=await NativeEntityStore.open();
  const aggregate="source(?v) :- triple(?e,'i',?v),triple(?e,'s',\"match\"). answer(?v,count()) :- source(?v).";
  try {
    await store.defineSchema(schema);
    await store.putRecord(put('many','{s="match";'+Array.from({length:256},(_,i)=>`i=${i};`).join('')+'}'));
    const product="source(?v) :- triple(?a,'i',?v),triple(?b,'i',?w),triple(?c,'i',?x),triple(?d,'i',?y). answer(count()) :- source(?v).";
    await assert.rejects(store.queryScalable(product,{validAt:0n,maxIntermediateRows:512,timeoutMs:5000}),
      /TD_E_QUERY_SCALE_LIMIT: scalable SQL intermediate exceeds logical budget/);
    const wide="source(?v,'"+'x'.repeat(8192)+"') :- triple(?e,'i',?v),triple(?e,'s',\"match\"). answer(count()) :- source(?v,?w).";
    await assert.rejects(store.queryScalable(wide,{validAt:0n,maxIntermediateBytes:131072}),
      /TD_E_QUERY_SCALE_LIMIT: scalable SQL intermediate exceeds logical budget/);
    await assert.rejects(store.queryScalable(aggregate,{validAt:0n,maxOutputRows:255}),
      /TD_E_QUERY_SCALE_LIMIT: scalable SQL output exceeds logical budget/);
    await assert.rejects(store.queryScalable(aggregate.replace('match\").','match\"),[?v>0].'),{validAt:0n}),
      /TD_E_QUERY_SCALE_UNSUPPORTED/);
    await joinedAnswers(store,aggregate,Array.from({length:256},(_,i)=>[int(BigInt(i)),int(1n)]),1n);
  }finally{await store.close();}
});

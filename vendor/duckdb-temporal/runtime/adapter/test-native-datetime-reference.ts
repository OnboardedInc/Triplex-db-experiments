import assert from 'node:assert/strict';
import {mkdtemp,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {test} from 'node:test';
import {fileURLToPath} from 'node:url';
import {EntityId} from '@triplex-build/triplex';
import type {TripleInput} from '@triplex-build/triplex/runtime';
import {NativeDuckDBPort} from './native-duckdb-port.mjs';
import {NativeEntityStore} from './native-entity.js';
import type {EntityPut,EntityReceipt} from './native-entity.js';
import type {SchemaValue} from './native-schema.js';
import {openAuditedPort} from './native-test-fixture.js';
import {PublicDuckDBBackend} from './public-backend.mjs';

const str=(value:string):SchemaValue=>({tag:'str',value});
const ref=(value:string):SchemaValue=>({tag:'ref',value});
const f64=(value:number):SchemaValue=>({tag:'f64',value});
const datetime=(value:number):SchemaValue=>({tag:'datetime',value});
const i64=(value:bigint):SchemaValue=>({tag:'i64',value});
const quote=(text:string)=>"'"+text.replaceAll("'","''")+"'";

async function assertAnswers(store:NativeEntityStore,program:string,expected:readonly (readonly SchemaValue[])[],
  knownAt:bigint,validAt=0n){
  const cut={knownAt,validAt};
  const controlled={...cut,timeoutMs:10000};
  const native=await store.query(program,{...controlled,forceNative:true});
  const automatic=await store.query(program,cut);
  const scalable=await store.queryScalable(program,controlled);
  assert.equal(native.route,'native',program);
  assert.equal(scalable.route,'sql',program);
  for(const result of [native,automatic,scalable]){
    assert.equal(result.position,knownAt,program);
    assert.deepEqual(result.rows,expected,`${result.route} K=${knownAt} V=${validAt} ${program}`);
  }
}

test('datetime preserves finite epoch-millisecond bits, canonical zero, ordering and tag identity',async()=>{
  const store=await NativeEntityStore.open({readers:2});
  try{
    await store.defineSchema('schema date_values version 1 {entity Event {stamp:datetime many;number:float64;}}');
    const values=[1.25,-1.25,Number.MIN_VALUE,-Number.MIN_VALUE,-0,0,Number.MAX_VALUE,-Number.MAX_VALUE];
    const request:EntityPut={schema:'date_values',version:1,type:'Event',entityId:'event',commandId:'dates',
      validFrom:0n,validTo:10n,fields:[{attribute:'number',value:f64(1.25)},
        ...values.map(value=>({attribute:'stamp',value:datetime(value)}))]};
    const written=await store.put(request);
    assert.equal(written.position,1n);
    assert.equal(written.asserted.length,8);

    const ordered=[-Number.MAX_VALUE,-1.25,-Number.MIN_VALUE,0,Number.MIN_VALUE,1.25,Number.MAX_VALUE];
    const scan="answer(?v) :- triple(?e,'stamp',?v).";
    await assertAnswers(store,scan,ordered.map(value=>[datetime(value)]),1n);
    const point=await store.at('event',{knownAt:1n,validAt:0n});
    const stamps=point.filter(fact=>fact.attribute==='stamp').map(fact=>fact.value)
      .sort((a,b)=>Number(a.value)-Number(b.value));
    assert.deepEqual(stamps,ordered.map(datetime));
    assert.deepEqual(point.find(fact=>fact.attribute==='number')?.value,f64(1.25));

    await assertAnswers(store,"answer(?e) :- triple(?e,'stamp',datetime(\"3ff4000000000000\")).",[[str('event')]],1n);
    await assertAnswers(store,"answer(?v) :- triple(?e,'stamp',?v),[?v<datetime(\"0000000000000000\")].",
      [[datetime(-Number.MAX_VALUE)],[datetime(-1.25)],[datetime(-Number.MIN_VALUE)]],1n);
    await assertAnswers(store,"answer(?v) :- triple(?e,'stamp',?v),triple(?e,'number',?v).",[],1n);
    const measure="source(?e,?v) :- triple(?e,'stamp',?v). ";
    await assertAnswers(store,measure+'answer(min(?v)) :- source(?e,?v).',[[datetime(-Number.MAX_VALUE)]],1n);
    await assertAnswers(store,measure+'answer(max(?v)) :- source(?e,?v).',[[datetime(Number.MAX_VALUE)]],1n);
    await assertAnswers(store,measure+'answer(count()) :- source(?e,?v).',[[i64(7n)]],1n);
    await assertAnswers(store,measure+'answer(min(?v)) :- source(?e,?v).',[],0n);

    const mixed='source(?a,?v) :- triple(?e,?a,?v). answer(min(?v)) :- source(?a,?v).';
    const orderedCrossTag="answer(?v) :- triple(?e,'stamp',?v),[?v<1].";
    for(const [program,error] of [[mixed,/TD_E_AGG_MIXED_TAGS/],[orderedCrossTag,/TD_E_EXPR_TYPE/]] as const){
      await assert.rejects(store.query(program,{validAt:0n,forceNative:true}),error);
      await assert.rejects(store.queryScalable(program,{validAt:0n}),error);
    }
    for(const [index,bits] of ['7ff0000000000000','fff0000000000000','7ff8000000000000'].entries()){
      const commandId='invalid-date-'+index;
      await assert.rejects(store.putRecord({...request,commandId,record:`{stamp=datetime("${bits}");}`}),/TD_E_SCHEMA_VALUE/);
      assert.equal(await store.receipt(commandId),null);
    }
    assert.deepEqual(await store.put({...request,fields:[...request.fields].reverse()}),written);
    assert.equal((await store.queryScalable(scan,{validAt:0n})).position,1n);
    await store.revalidate();
    await assertAnswers(store,scan,ordered.map(value=>[datetime(value)]),1n);
  }finally{await store.close();}
});

const original='schema value_history version 1 {entity Event {stamp:float64;note:text;number:int64;flag:boolean;}}';
const expanded='schema value_history version 2 {entity Event {stamp:datetime;note:text;number:int64;flag:boolean;}}';
const stampScan="answer(?v) :- triple('event','stamp',?v).";
const eventScan="answer(?v) :- triple('event',?a,?v).";
const legacyRead=(program:string,knownAt:bigint)=>
  'PRAGMA td_query_store_native('+quote(program)+',2,'+knownAt+',100,100,10000,1000)';

for(const priorFormat of [5n,6n]){
  test(`datetime correction upgrades format ${priorFormat} and preserves four-tag history and replay`,async()=>{
    const directory=await mkdtemp(fileURLToPath(new URL('../datetime-reference-',import.meta.url)));
    const database=resolve(directory,'history.duckdb');
    const options={database,readers:2};
    const originalWrite:EntityPut={schema:'value_history',version:1,type:'Event',entityId:'event',commandId:'before',
      validFrom:-2n,validTo:8n,fields:[{attribute:'stamp',value:f64(-1.25)},{attribute:'note',value:str('é🙂')},
        {attribute:'number',value:i64(9223372036854775807n)},{attribute:'flag',value:{tag:'bool',value:false}}]};
    const oldPatch={...originalWrite,commandId:'old-patch',validFrom:0n,validTo:1n};
    const correction:EntityPut={...originalWrite,version:2,commandId:'correction',validFrom:1n,validTo:4n,
      fields:[{attribute:'stamp',value:datetime(-1.25)}]};
    const narrow:EntityPut={...correction,commandId:'narrow',validFrom:2n,validTo:3n,
      fields:[{attribute:'stamp',value:datetime(0.5)}]};
    let before!:EntityReceipt;
    let previousPatch:EntityReceipt|undefined;
    let originalPoint!:Awaited<ReturnType<NativeEntityStore['at']>>;
    let originalHistory!:Awaited<ReturnType<NativeEntityStore['history']>>;
    let after!:EntityReceipt;
    let narrowed!:EntityReceipt;
    let upgradedSchemaHash!:string;
    let knownBefore!:bigint;
    let oldRawAnswer:unknown;
    let oldIR:unknown;

    // Create the old assertions through the retained v1 entry points. Replaying
    // them through the latest Node API tests both command encoding boundaries.
    const seed=await openAuditedPort({database});
    try{
      const sql=(sql:string)=>seed.runNative({name:'legacy_seed',sql,params:[]});
      const record=quote('{stamp=f64("bff4000000000000");note="é🙂";number=9223372036854775807;flag=false;}');
      await sql('PRAGMA td_define_schema('+quote(original)+')');
      await sql("PRAGMA td_put_entity('value_history',1,'Event','event','before',"+record+',-2,8)');
      if(priorFormat===6n)
        await sql("PRAGMA td_patch_entity('value_history',1,'Event','event','old-patch',"+record+',0,1)');
    }finally{await seed.close();}

    const first=await NativeEntityStore.open(options);
    try{
      const receipt=await first.receipt('before');
      assert.ok(receipt);
      before=receipt;
      assert.equal(before.position,1n);
      if(priorFormat===6n){
        const patchReceipt=await first.receipt('old-patch');
        assert.ok(patchReceipt);
        previousPatch=patchReceipt;
      }
      knownBefore=previousPatch?.position??before.position;
      assert.equal(knownBefore,priorFormat===5n?1n:2n);
      originalPoint=await first.at('event',{knownAt:knownBefore,validAt:2n});
      originalHistory=await first.history('event');
      assert.deepEqual(originalPoint.map(fact=>[fact.attribute,fact.value]).sort(),
        originalWrite.fields.map(field=>[field.attribute,field.value]).sort());
      await assertAnswers(first,stampScan,[[f64(-1.25)]],knownBefore,2n);
    }finally{await first.close();}

    const port=await openAuditedPort({database});
    const sql=(sql:string)=>port.runNative({name:'expanded_schema_atomicity',sql,params:[]});
    try{
      const version='SELECT version::BIGINT FROM main.store_meta';
      const definitions="SELECT version::BIGINT FROM td_catalog_v1.schemas WHERE name='value_history' ORDER BY version";
      assert.deepEqual(await sql(version),[[priorFormat]]);
      const raw=await sql(legacyRead(eventScan,knownBefore));
      oldRawAnswer=raw.map(row=>row[6]);
      assert.deepEqual(raw.map(row=>JSON.parse(String(row[6]))),[
        [{tag:1,s:'é🙂',b:null,i:null,f:null}],
        [{tag:2,s:null,b:false,i:null,f:null}],
        [{tag:3,s:null,b:null,i:'9223372036854775807',f:null}],
        [{tag:4,s:null,b:null,i:null,f:'bff4000000000000'}],
      ]);
      oldIR=await sql('SELECT system.main.td_schema_ir_v1('+quote(original)+')');
      assert.deepEqual(await sql('SELECT system.main.td_schema_ir_v2('+quote(original)+')'),oldIR);
      await assert.rejects(sql('SELECT system.main.td_schema_ir_v1('+quote(expanded)+')'),/TD_E_SCHEMA_TYPE/);
      await assert.rejects(sql('PRAGMA td_define_schema_v2('+quote(expanded.replace('version 2','version 1'))+')'),/TD_E_SCHEMA_VERSION/);
      assert.deepEqual(await sql(version),[[priorFormat]]);
      assert.deepEqual(await sql(definitions),[[1n]]);
      await sql('BEGIN');
      try{
        await sql('PRAGMA td_define_schema_v2('+quote(expanded)+')');
        assert.deepEqual(await sql(version),[[8n]]);
        assert.deepEqual(await sql(definitions),[[1n],[2n]]);
      }finally{await sql('ROLLBACK');}
      assert.deepEqual(await sql(version),[[priorFormat]]);
      assert.deepEqual(await sql(definitions),[[1n]]);
    }finally{await port.close();}

    const upgrade=await NativeEntityStore.open(options);
    try{
      const schema=await upgrade.defineSchema(expanded);
      upgradedSchemaHash=schema.hash;
      assert.deepEqual(await upgrade.history('event'),originalHistory);
      assert.deepEqual(await upgrade.at('event',{knownAt:knownBefore,validAt:2n}),originalPoint);
      after=await upgrade.patch(correction);
      assert.equal(after.position,knownBefore+1n);
      assert.equal(after.schemaHash,schema.hash);
      assert.deepEqual([...after.retracted].sort(),originalPoint.map(fact=>fact.assertionId).sort());
      for(const [validAt,expected] of [[0n,[[f64(-1.25)]]],[1n,[[datetime(-1.25)]]],
        [3n,[[datetime(-1.25)]]],[4n,[[f64(-1.25)]]],[8n,[]]] as const){
        await assertAnswers(upgrade,stampScan,expected,after.position,validAt);
      }
      await assertAnswers(upgrade,stampScan,[[f64(-1.25)]],knownBefore,2n);
      const at=await upgrade.at('event',{knownAt:after.position,validAt:2n});
      assert.deepEqual(at.map(fact=>[fact.attribute,fact.value,fact.version,fact.schemaHash]),
        [['stamp',datetime(-1.25),2,schema.hash]]);
      const [date]=at;
      assert.ok(date);
      narrowed=await upgrade.patch(narrow);
      assert.equal(narrowed.position,after.position+1n);
      assert.deepEqual(narrowed.retracted,[date.assertionId]);
      assert.deepEqual(await upgrade.put({...originalWrite,fields:[...originalWrite.fields].reverse()}),before);
      if(previousPatch) assert.deepEqual(await upgrade.patch(oldPatch),previousPatch);
      assert.deepEqual(await upgrade.patch(correction),after);
      assert.deepEqual(await upgrade.patch(narrow),narrowed);
      assert.equal((await upgrade.queryScalable(stampScan,{validAt:2n})).position,narrowed.position);
      await upgrade.revalidate();
    }finally{await upgrade.close();}

    const reopened=await NativeEntityStore.open(options);
    try{
      assert.deepEqual(await reopened.receipt('before'),before);
      assert.deepEqual(await reopened.receipt('correction'),after);
      assert.deepEqual(await reopened.receipt('narrow'),narrowed);
      assert.deepEqual(await reopened.at('event',{knownAt:knownBefore,validAt:2n}),originalPoint.map(fact=>
        ({...fact,txTo:after.position,correctedBy:'correction'})));
      await assertAnswers(reopened,stampScan,[[f64(-1.25)]],knownBefore,2n);
      await assertAnswers(reopened,stampScan,[[datetime(-1.25)]],after.position,2n);
      await assertAnswers(reopened,stampScan,[[datetime(0.5)]],narrowed.position,2n);
      for(const [validFrom,validTo] of [[1n,2n],[3n,4n]] as const){
        const rows=await reopened.at('event',{knownAt:narrowed.position,validAt:validFrom});
        assert.deepEqual(rows.map(fact=>[fact.value,fact.version,fact.schemaHash,fact.validFrom,fact.validTo,fact.txFrom]),
          [[datetime(-1.25),2,upgradedSchemaHash,validFrom,validTo,narrowed.position]]);
      }
    }finally{await reopened.close();}

    const legacy=await openAuditedPort({database});
    try{
      const sql=(sql:string)=>legacy.runNative({name:'expanded_legacy_reader',sql,params:[]});
      assert.deepEqual(await sql('SELECT version::BIGINT FROM main.store_meta'),[[8n]]);
      const raw=await sql(legacyRead(eventScan,knownBefore));
      assert.deepEqual(raw.map(row=>row[6]),oldRawAnswer);
      assert.deepEqual(await sql("SELECT ir FROM td_catalog_v1.schemas WHERE name='value_history' AND version=1"),oldIR);
      await assert.rejects(sql(legacyRead(stampScan,-1n)),/TD_E_QUERY_PROFILE/);
    }finally{await legacy.close();}
  });
}

const TARGET='target-é🙂';
const bridge=(left:string,right:string)=>`answer(?e,?target,?name) :- triple(?e,'${left}',?r),`+
  `triple(?target,'${right}',?name),[ref_id(?r)=?target].`;

test('native distinct references validate stable identity and join explicitly across temporal cuts',async()=>{
  const store=await NativeEntityStore.open({readers:2});
  const person:EntityPut={schema:'typed_refs',version:1,type:'Person',entityId:'owner',commandId:'owner',
    validFrom:0n,validTo:10n,fields:[{attribute:'name',value:str('Owner')},{attribute:'current',value:ref(TARGET)},
      {attribute:'legacy',value:str(TARGET)}]};
  try{
    await store.defineSchema('schema typed_refs version 1 {entity Person {name:text required;current:ref_value(Person);'+
      'legacy:ref(Person);} entity Room {title:text required;}}');
    await store.defineSchema('schema foreign_refs version 1 {entity Person {name:text required;}}');
    assert.equal((await store.put({...person,entityId:TARGET,commandId:'target',validTo:4n,
      fields:[{attribute:'name',value:str('Target')},{attribute:'current',value:ref(TARGET)}]})).position,1n);
    assert.equal((await store.put({...person,type:'Room',entityId:'room',commandId:'room',
      fields:[{attribute:'title',value:str('Room')}]})).position,2n);
    assert.equal((await store.put({...person,schema:'foreign_refs',entityId:'foreign',commandId:'foreign',
      fields:[{attribute:'name',value:str('Foreign')}]})).position,3n);
    for(const target of ['absent','room','foreign']){
      const commandId='reject-'+target;
      await assert.rejects(store.put({...person,commandId,fields:[{attribute:'name',value:str('Owner')},
        {attribute:'current',value:ref(target)}]}),/TD_E_COMMAND_REFERENCE/);
      assert.equal(await store.receipt(commandId),null);
    }
    await assert.rejects(store.put({...person,commandId:'plain-text-ref',fields:[{attribute:'name',value:str('Owner')},
      {attribute:'current',value:str(TARGET)}]}),/TD_E_SCHEMA_TYPE/);
    assert.equal(await store.receipt('plain-text-ref'),null);
    assert.equal((await store.put(person)).position,4n);

    const join=bridge('current','name');
    const targetRow=[str(TARGET),str(TARGET),str('Target')];
    await assertAnswers(store,join,[[str('owner'),str(TARGET),str('Target')],targetRow],4n);
    await assertAnswers(store,join,[],4n,4n);
    await assertAnswers(store,"answer(?r) :- triple('owner','current',?r).",[[ref(TARGET)]],4n,4n);
    await assertAnswers(store,`answer(?e) :- triple(?e,'current',ref("${TARGET}")).`,[[str('owner')],[str(TARGET)]],4n);
    await assertAnswers(store,"answer(?v) :- triple(?e,'current',?v),triple(?e,'legacy',?v).",[],4n);
    await assertAnswers(store,"answer(?target) :- triple('owner','legacy',?target),triple(?target,'name',?name).",[[str(TARGET)]],4n);
    await assertAnswers(store,bridge('legacy','missing-attr'),[],4n);
    const wrong=bridge('legacy','title');
    await assert.rejects(store.query(wrong,{validAt:0n,forceNative:true}),/TD_E_EXPR_TYPE/);
    await assert.rejects(store.queryScalable(wrong,{validAt:0n}),/TD_E_EXPR_TYPE/);
    await assert.rejects(store.query(wrong.replace('[ref_id','[0=1],[ref_id'),{validAt:0n,forceNative:true}),/TD_E_EXPR_TYPE/);
    const refExtrema="source(?e,?r) :- triple(?e,'current',?r). answer(min(?r)) :- source(?e,?r).";
    await assert.rejects(store.query(refExtrema,{validAt:0n,forceNative:true}),/TD_E_AGG_MEASURE_TAG/);
    await assert.rejects(store.queryScalable(refExtrema,{validAt:0n}),/TD_E_AGG_MEASURE_TAG/);

    const patched=await store.patch({...person,commandId:'new-ref',validFrom:1n,validTo:3n,
      fields:[{attribute:'name',value:str('Owner')},{attribute:'current',value:ref('owner')}]});
    assert.equal(patched.position,5n);
    await assertAnswers(store,join,[[str('owner'),str('owner'),str('Owner')],targetRow],5n,1n);
    await assertAnswers(store,join,[[str('owner'),str(TARGET),str('Target')],targetRow],4n,1n);
    await store.revalidate();
    await assertAnswers(store,join,[[str('owner'),str(TARGET),str('Target')],targetRow],5n,3n);
  }finally{await store.close();}
});

test('latest native methods read actual format-five Triplex datetime and reference carriers',async()=>{
  const directory=await mkdtemp(fileURLToPath(new URL('../datetime-compat-',import.meta.url)));
  const database=resolve(directory,'compat.duckdb');
  const schema=await readFile(new URL('./public-schema.sql',import.meta.url),'utf8');
  const port=await NativeDuckDBPort.open({database});
  const backend=new PublicDuckDBBackend(port,'typed-compat-fixture');
  try{
    await backend.initialize(schema);
    const fields:TripleInput[]=[
      {entityId:EntityId.make('legacy'),attribute:'current',value:{type:'ref',value:EntityId.make(TARGET)}},
      {entityId:EntityId.make('legacy'),attribute:'stamp',value:{type:'datetime',value:-0.25}},
      {entityId:EntityId.make(TARGET),attribute:'name',value:{type:'string',value:'Triplex Target'}},
    ];
    await backend.withTransaction(async session=>{
      const position=await session.nextCommitPosition();
      assert.equal(position,1);
      await session.claimCommand('triplex-values','triplex-tx',2.5);
      await session.batchInsert(fields.map(field=>({...field,validFrom:0,validTo:10})),
        'triplex-tx',2.5,['triplex-ref','triplex-stamp','triplex-target'],position);
    });
  }finally{await backend.close();}
  const store=await NativeEntityStore.open({database,readers:2});
  try{
    await assertAnswers(store,bridge('current','name'),[[str('legacy'),str(TARGET),str('Triplex Target')]],1n);
    await assertAnswers(store,"answer(?r) :- triple('legacy','current',?r).",[[ref(TARGET)]],1n);
    await assertAnswers(store,"answer(?v) :- triple('legacy','stamp',?v).",[[datetime(-0.25)]],1n);
  }finally{await store.close();}
  const check=await openAuditedPort({database});
  try{
    const sql=(sql:string)=>check.runNative({name:'legacy_format_preserved',sql,params:[]});
    const refScan=quote("answer(?r) :- triple('legacy','current',?r).");
    const dateScan=quote("answer(?v) :- triple('legacy','stamp',?v).");
    const scalable=(entry:string,program:string)=>
      'PRAGMA '+entry+'('+program+',0,-1,100,100,1048576,100,1048576,0)';
    const refRead=scalable('td_query_store_scalable_v2',refScan);
    const dateRead=scalable('td_query_store_scalable_v2',dateScan);
    const wire=async(statement:string)=>JSON.parse(String((await sql(statement))[0]?.[6]));
    assert.deepEqual(await sql('SELECT version::BIGINT FROM main.store_meta'),[[5n]]);
    assert.deepEqual(await wire(refRead),[{tag:5,s:TARGET,b:null,i:null,f:null}]);
    assert.deepEqual(await wire(dateRead),[{tag:6,s:null,b:null,i:null,f:'bfd0000000000000'}]);
    for(const program of [refScan,dateScan])
      await assert.rejects(sql(scalable('td_query_store_scalable',program)),/TD_E_QUERY_PROFILE/);
    await check.run({name:'invalidate_typed_owner',sql:'SELECT 1',params:[]});
    await assert.rejects(sql(refRead),/TD_E_OWNER_PROBE_INVALID/);
    await assert.rejects(sql(dateRead),/TD_E_OWNER_PROBE_INVALID/);
    await check.activateOwnership();
    assert.deepEqual(await wire(refRead),[{tag:5,s:TARGET,b:null,i:null,f:null}]);
  }finally{await check.close();}
});

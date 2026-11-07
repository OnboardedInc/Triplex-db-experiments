import assert from 'node:assert/strict';
import {mkdtemp,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {test} from 'node:test';
import {fileURLToPath} from 'node:url';
import {EntityId} from '@triplex-build/triplex';
import type {TripleInput} from '@triplex-build/triplex/runtime';
import {NativeDuckDBPort} from './native-duckdb-port.mjs';
import {NativeEntityStore} from './native-entity.js';
import type {EntityPut,EntityReceipt,NativeQueryResult} from './native-entity.js';
import type {SchemaValue} from './native-schema.js';
import {openAuditedPort} from './native-test-fixture.js';
import type {SqlRows} from './owned-duckdb-port.mjs';
import {PublicDuckDBBackend} from './public-backend.mjs';

const quoted=(value:string)=>"'"+value.replaceAll("'","''")+"'";
const json=(value:string)=>({tag:'json' as const,value});
const id=(value:string)=>({tag:'blob' as const,value});
const str=(value:string)=>({tag:'str' as const,value});
const i64=(value:bigint)=>({tag:'i64' as const,value});
const BLOB='opaque:é🙂';
const BLOB_DECOMPOSED='opaque:e\u0301🙂';
const DOC='doc-é🙂';
const SCHEMA='schema documents version 1 {entity Document {source:json many;asset:blob many;label:text;}}';
const original={...id(BLOB),mimeType:'text/plain',size:0,filename:'é🙂\'".txt'};
const revised={...id(BLOB),mimeType:'application/octet-stream',size:Number.MAX_SAFE_INTEGER};
const JSON_COMPACT='{"a":1,"b":"é"}';
const JSON_ESCAPED='{"a":1,"b":"\\u00e9"}';
const JSON_ORDER='{"b":"é","a":1}';
const JSON_SPACE=' {"a":1,"b":"é"} ';
const JSON_VARIANTS=[JSON_SPACE,JSON_ESCAPED,JSON_COMPACT,JSON_ORDER];

const put=(commandId:string,fields:readonly {attribute:string;value:SchemaValue}[],entityId=DOC):EntityPut=>
  ({schema:'documents',version:1,type:'Document',entityId,commandId,validFrom:0n,validTo:10n,fields});
const scan=(attribute:string)=>`answer(?v) :- triple(?e,'${attribute}',?v).`;
const aggregate=(attribute:string,head:string)=>
  `source(?e,?v) :- triple(?e,'${attribute}',?v). answer(${head}) :- source(?e,?v).`;
const directory=()=>mkdtemp(fileURLToPath(new URL('../json-blob-tests-',import.meta.url)));

async function answers(store:NativeEntityStore,program:string,expected:NativeQueryResult['rows'],knownAt:bigint,validAt=0n){
  const cut={knownAt,validAt};
  const native=await store.query(program,{...cut,forceNative:true,timeoutMs:10000});
  const sql=await store.queryScalable(program,{...cut,timeoutMs:10000});
  const normal=await store.query(program,cut);
  assert.equal(native.route,'native',program);
  assert.equal(sql.route,'sql',program);
  for(const result of [native,sql,normal]){
    assert.equal(result.position,knownAt,program);
    assert.deepEqual(result.rows,expected,`${result.route} K=${knownAt} V=${validAt} ${program}`);
  }
}

const nativeSQL=(port:NativeDuckDBPort,sql:string)=>port.runNative({name:'verify_persisted_json_blob',sql,params:[]});
const wire=(tag:number,s:string)=>({tag,s,b:null,i:null,f:null});
const tuples=(rows:SqlRows,position:bigint,route:'sql'|'native')=>rows.flatMap(row=>{
  assert.equal(row.length,7);
  assert.equal(row[0],position);
  assert.equal(row[1],route);
  if(row[6]===null)return [];
  assert.ok(typeof row[6]==='string');
  return [JSON.parse(row[6])];
});
const bounded=(program:string,known=-1n)=>
  `PRAGMA td_query_store_values_v2(${quoted(program)},0,${known},100,100,100000,1000,0,1)`;
const scalable=(program:string,known=-1n,entry='td_query_store_scalable_v2')=>
  `PRAGMA ${entry}(${quoted(program)},0,${known},100,100,1048576,100,1048576,0)`;

test('JSON compares exact UTF-8 source bytes and blob grouping uses typed IDs',async()=>{
  const store=await NativeEntityStore.open({readers:2});
  try{
    await store.defineSchema(SCHEMA);
    const request=put('source',[
      ...[JSON_ORDER,JSON_COMPACT,JSON_SPACE,JSON_ESCAPED,JSON_COMPACT].map(value=>({attribute:'source',value:json(value)})),
      {attribute:'asset',value:original},{attribute:'asset',value:original},
      {attribute:'label',value:str(BLOB)},
    ]);
    const first=await store.put(request);
    assert.equal(first.position,1n);
    assert.equal(first.asserted.length,6);
    assert.deepEqual(await store.put({...request,fields:[...request.fields].reverse()}),first);
    const second=await store.put(put('second',[{attribute:'asset',value:revised},
      {attribute:'asset',value:{...revised,value:BLOB_DECOMPOSED}},
      {attribute:'source',value:json(JSON_COMPACT)},{attribute:'label',value:str(JSON_COMPACT)}],'other'));
    assert.equal(second.position,2n);
    assert.deepEqual(JSON_VARIANTS.map(source=>JSON.parse(source)),Array(4).fill({a:1,b:'é'}));
    await answers(store,scan('source'),JSON_VARIANTS.map(value=>[json(value)]),2n);
    await answers(store,scan('asset'),[[id(BLOB_DECOMPOSED)],[id(BLOB)]],2n);
    await answers(store,aggregate('asset','?v,count()'),[[id(BLOB_DECOMPOSED),i64(1n)],[id(BLOB),i64(2n)]],2n);
    await answers(store,aggregate('source','?v,count()'),JSON_VARIANTS.map(value=>[json(value),i64(value===JSON_COMPACT?2n:1n)]),2n);
    await answers(store,"answer(?v) :- triple(?e,'asset',?v),triple(?e,'label',?v).",[],2n);
    await answers(store,"answer(?v) :- triple(?e,'source',?v),triple(?e,'label',?v).",[],2n);
    await answers(store,`answer(?e) :- triple(?e,'asset',blob(${JSON.stringify(BLOB)})).`,[[str(DOC)],[str('other')]],2n);
    await answers(store,`answer(?e) :- triple(?e,'source',json(${JSON.stringify(JSON_ESCAPED)})).`,[[str(DOC)]],2n);
    const equal=`answer(?v) :- triple(?e,'source',?v),[?v=json(${JSON.stringify(JSON_ORDER)})].`;
    await answers(store,equal,[[json(JSON_ORDER)]],2n);
    for(const [attribute,literal] of [['asset',`blob(${JSON.stringify(BLOB)})`],['source',`json(${JSON.stringify(JSON_COMPACT)})`]] as const){
      const order=`answer(?v) :- triple(?e,'${attribute}',?v),[?v<${literal}].`;
      for(const [program,error] of [[order,/TD_E_EXPR_TYPE/],[aggregate(attribute,'min(?v)'),/TD_E_AGG_MEASURE_TAG/],
        [aggregate(attribute,'sum_i64(?v)'),/TD_E_AGG_MEASURE_TAG/]] as const){
        await assert.rejects(store.query(program,{validAt:0n,forceNative:true}),error);
        await assert.rejects(store.queryScalable(program,{validAt:0n}),error);
      }
      await answers(store,order,[],0n);
      await answers(store,aggregate(attribute,'min(?v)'),[],0n);
    }
    await assert.rejects(store.queryScalable(scan('source'),{validAt:0n,maxOutputRows:3}),/TD_E_QUERY_SCALE_LIMIT/);
    await answers(store,scan('source'),JSON_VARIANTS.map(value=>[json(value)]),2n);
  }finally{await store.close();}
});

test('blob descriptor corrections preserve identity, full history and original schema binding',async()=>{
  const database=join(await directory(),'descriptor.duckdb');
  const request=put('before',[{attribute:'asset',value:original},{attribute:'source',value:json(JSON_COMPACT)}]);
  const patch={...request,version:2,commandId:'correction',validFrom:2n,validTo:4n,
    fields:[{attribute:'source',value:json(JSON_SPACE)},{attribute:'asset',value:revised}]};
  const options={database,readers:2};
  let first!:EntityReceipt,correction!:EntityReceipt;
  let history!:Awaited<ReturnType<NativeEntityStore['history']>>;
  const store=await NativeEntityStore.open(options);
  try{
    const beforeSchema=await store.defineSchema(SCHEMA);
    first=await store.put(request);
    const afterSchema=await store.defineSchema('schema documents version 2 {entity Document {source:json;asset:blob;}}');
    correction=await store.patch(patch);
    assert.equal(first.position,1n);
    assert.equal(correction.position,2n);
    assert.deepEqual([...correction.retracted].sort(),[...first.asserted].sort());
    assert.equal(correction.asserted.length,6);
    for(const [knownAt,validAt,from,to,txFrom,descriptor,source,schema] of [
      [1n,2n,0n,10n,1n,original,JSON_COMPACT,beforeSchema],
      [2n,0n,0n,2n,2n,original,JSON_COMPACT,beforeSchema],
      [2n,2n,2n,4n,2n,revised,JSON_SPACE,afterSchema],
      [2n,4n,4n,10n,2n,original,JSON_COMPACT,beforeSchema],
    ] as const){
      const point=await store.at(DOC,{knownAt,validAt});
      assert.deepEqual(point.map(fact=>[fact.attribute,fact.value,fact.validFrom,fact.validTo,fact.txFrom,fact.version,fact.schemaHash]),
        [['asset',descriptor,from,to,txFrom,schema.version,schema.hash],['source',json(source),from,to,txFrom,schema.version,schema.hash]]);
      await answers(store,scan('asset'),[[id(BLOB)]],knownAt,validAt);
      await answers(store,scan('source'),[[json(source)]],knownAt,validAt);
    }
    assert.deepEqual(await store.at(DOC,{knownAt:2n,validAt:10n}),[]);
    assert.deepEqual(await store.patch({...patch,fields:[...patch.fields].reverse()}),correction);
    assert.deepEqual(await store.put(request),first);
    await store.revalidate();
    history=await store.history(DOC);
    assert.equal(history.length,8);
    assert.deepEqual(history.filter(fact=>fact.txTo===2n).map(fact=>fact.assertionId).sort(),[...first.asserted].sort());
  }finally{await store.close();}
  const reopened=await NativeEntityStore.open(options);
  try{
    assert.deepEqual(await reopened.history(DOC),history);
    assert.deepEqual(await reopened.receipt('before'),first);
    assert.deepEqual(await reopened.receipt('correction'),correction);
    await answers(reopened,scan('source'),[[json(JSON_COMPACT)]],1n,2n);
    await answers(reopened,scan('source'),[[json(JSON_SPACE)]],2n,2n);
  }finally{await reopened.close();}
});

test('a JSON value beyond the query byte limit remains readable at its exact temporal cut',async()=>{
  const store=await NativeEntityStore.open({readers:2});
  const source='["'+'é'.repeat(2046)+'"]';
  const wide=source.replace('"]','x"]');
  assert.deepEqual([source,wide].map(value=>Buffer.byteLength(value)),[4096,4097]);
  try{
    await store.defineSchema(SCHEMA);
    await store.put(put('at-limit',[{attribute:'source',value:json(source)}]));
    const program=scan('source');
    await answers(store,program,[[json(source)]],1n);
    await assert.rejects(store.queryScalable(program,{validAt:0n,maxIntermediateBytes:4096}),/TD_E_QUERY_SCALE_LIMIT/);
    await assert.rejects(store.queryScalable(program,{validAt:0n,maxOutputBytes:4096}),/TD_E_QUERY_SCALE_LIMIT/);
    await store.patch({...put('over-limit',[{attribute:'source',value:json(wide)}]),validFrom:2n,validTo:4n});
    assert.deepEqual((await store.at(DOC,{knownAt:2n,validAt:2n})).map(fact=>fact.value),[json(wide)]);
    await assert.rejects(store.query(program,{validAt:2n,forceNative:true}),/TD_E_QUERY_PROFILE/);
    await assert.rejects(store.queryScalable(program,{validAt:2n}),/TD_E_QUERY_PROFILE/);
    await answers(store,program,[[json(source)]],1n,2n);
    await answers(store,program,[[json(source)]],2n,4n);
    await store.revalidate();
    assert.deepEqual((await store.history(DOC)).filter(fact=>fact.validFrom===2n).map(fact=>fact.value),[json(wide)]);
  }finally{await store.close();}
});

test('literal entity scope bounds both query routes without pruning negated or unbound atoms',async()=>{
  const store=await NativeEntityStore.open({readers:2});
  try{
    await store.defineSchema(SCHEMA);
    const narrow=json('{"ok":true}');
    const wide=json('["'+'x'.repeat(4093)+'"]');
    await store.put(put('narrow',[{attribute:'source',value:narrow}]));
    await store.put(put('wide-other',[{attribute:'source',value:wide}],'other'));
    const program=`answer(?v) :- triple(${JSON.stringify(DOC)},'source',?v).`;
    const projected=await store.queryScalable(program,{validAt:0n,maxInputFacts:1,maxIntermediateRows:1});
    assert.deepEqual(projected.rows,[[narrow]]);
    assert.deepEqual((await store.query(program,{validAt:0n,forceNative:true})).rows,projected.rows);
    const unbound=scan('source');
    for(const query of [store.queryScalable.bind(store),store.query.bind(store)]){
      await assert.rejects(query(unbound,{validAt:0n}),/TD_E_QUERY_PROFILE/);
    }
    const blocked=`answer(?v) :- triple(${JSON.stringify(DOC)},'source',?v),!triple('other','label','stop').`;
    assert.deepEqual((await store.query(blocked,{validAt:0n,knownAt:1n,forceNative:true})).rows,[[narrow]]);
    await store.put(put('block-other',[{attribute:'label',value:str('stop')}],'other'));
    assert.deepEqual((await store.query(blocked,{validAt:0n,forceNative:true})).rows,[]);
  }finally{await store.close();}
});

test('injective scalable aggregates charge actual active bytes with one 4KiB JSON carrier',async()=>{
  const store=await NativeEntityStore.open();
  const wide='["'+'é'.repeat(2046)+'"]';
  const sourceValues=[...Array.from({length:31},(_,i)=>String(i)),wide];
  const fields=[{attribute:'label',value:str('small-é')},
    ...sourceValues.map(value=>({attribute:'source',value:json(value)}))];
  const inputBytes=fields.reduce((bytes,{attribute,value})=>
    bytes+120+Buffer.byteLength(DOC)+Buffer.byteLength(attribute)+Buffer.byteLength(value.value),0);
  const options={validAt:0n,knownAt:1n,maxIntermediateBytes:inputBytes};
  const direct='answer(count()) :- triple(?e,?a,?v).';
  const grouped='source(?v,?a,?e) :- triple(?e,?a,?v). answer(?a,count()) :- source(?v,?a,?e).';
  const repeated="source(?e,?v,?v) :- triple(?e,'source',?v). answer(count()) :- source(?e,?a,?b).";
  const wideGroup='answer(?v,count()) :- triple(?e,?a,?v).';
  try {
    assert.equal(Buffer.byteLength(wide),4096);
    await store.defineSchema(SCHEMA);
    assert.equal((await store.put(put('sparse-wide',fields))).asserted.length,fields.length);
    const cases=[
      [direct,[[i64(33n)]]],
      [grouped,[[str('label'),i64(1n)],[str('source'),i64(32n)]]],
      [aggregate('source','count()'),[[i64(32n)]]],
    ] as const;
    for(const [program,expected] of cases){
      const result=await store.queryScalable(program,options);
      assert.equal(result.route,'sql');
      assert.deepEqual(result.rows,expected);
      assert.deepEqual((await store.query(program,{validAt:0n,knownAt:1n,forceNative:true})).rows,expected);
    }
    await assert.rejects(store.queryScalable(direct,{...options,maxIntermediateBytes:inputBytes-1}),
      /TD_E_QUERY_SCALE_LIMIT: scalable SQL input exceeds logical budget/);
    for(const program of [repeated,wideGroup])
      await assert.rejects(store.queryScalable(program,options),
        /TD_E_QUERY_SCALE_LIMIT: scalable SQL intermediate exceeds logical budget/);
    await assert.rejects(store.queryScalable(grouped,{...options,maxOutputBytes:1}),
      /TD_E_QUERY_SCALE_LIMIT: scalable SQL output exceeds logical budget/);
  }finally{await store.close();}
});

test('bad JSON and blob records are rejected atomically before advancing knowledge',async()=>{
  const store=await NativeEntityStore.open();
  const request=put('healthy',[{attribute:'asset',value:original},{attribute:'source',value:json(JSON_COMPACT)}]);
  try{
    await store.defineSchema(SCHEMA);
    const first=await store.put(request);
    const cases=[
      ['syntax',`source=json(${JSON.stringify('{"bad":}')})`,/TD_E_SCHEMA_VALUE/],
      ['trailing',`source=json(${JSON.stringify('true false')})`,/TD_E_SCHEMA_VALUE/],
      ['control',`source=json(${JSON.stringify('"\u0000"')})`,/TD_E_SCHEMA_VALUE|TD_E_VALUE_TEXT/],
      ['depth',`source=json(${JSON.stringify('['.repeat(1024)+'0'+']'.repeat(1024))})`,/TD_E_SCHEMA_VALUE/],
      ['too-wide',`source=json(${JSON.stringify('"'+'é'.repeat(8192)+'"')})`,/TD_E_SCHEMA_LIMIT/],
      ['empty-id','asset=blob("","text/plain",0)',/TD_E_SCHEMA_BLOB/],
      ['wide-id',`asset=blob(${JSON.stringify('é'.repeat(257))},"text/plain",0)`,/TD_E_SCHEMA_BLOB/],
      ['empty-mime','asset=blob("id","",0)',/TD_E_SCHEMA_BLOB/],
      ['negative-size','asset=blob("id","text/plain",-1)',/TD_E_SCHEMA_BLOB/],
      ['unsafe-size','asset=blob("id","text/plain",9007199254740992)',/TD_E_SCHEMA_BLOB/],
      ['wrong-tag','source="{\\"a\\":1}"',/TD_E_SCHEMA_TYPE/],
      ['metadata-conflict','asset=blob("id","text/plain",0);asset=blob("id","text/plain",1)',/TD_E_SCHEMA_BLOB/],
    ] as const;
    const oldPoint=await store.at(DOC,{knownAt:1n,validAt:0n});
    for(const [commandId,field,error] of cases){
      const failed={...request,commandId,record:`{label="would replace current fields";${field};}`};
      await assert.rejects(store.putRecord(failed),error,commandId);
      assert.equal(await store.receipt(commandId),null,commandId);
      assert.deepEqual(await store.at(DOC,{knownAt:1n,validAt:0n}),oldPoint,commandId);
    }
    await assert.rejects(store.put(put('unsafe-host',[{attribute:'asset',value:{...original,size:2**53}}])),TypeError);
    assert.equal(await store.receipt('unsafe-host'),null);
    const changed=put('healthy',[{attribute:'asset',value:revised},{attribute:'source',value:json(JSON_COMPACT)}]);
    await assert.rejects(store.put(changed),/TD_E_COMMAND_IDEMPOTENCY/);
    assert.deepEqual(await store.receipt('healthy'),first);
    const maxId='é'.repeat(256);
    assert.equal(Buffer.byteLength(maxId),512);
    const healthy=await store.patch({...put('healthy-next',[{attribute:'asset',value:{...original,value:maxId}}]),
      validFrom:2n,validTo:4n});
    assert.equal(healthy.position,2n);
    await answers(store,scan('asset'),[[id(maxId)]],2n,2n);
  }finally{await store.close();}
});

test('owner audit rejects same-width descriptor tampering on an inactive native blob',async()=>{
  const database=join(await directory(),'corruption.duckdb');
  const store=await NativeEntityStore.open({database});
  let before!:EntityReceipt;
  try{
    await store.defineSchema(SCHEMA);
    before=await store.put(put('before',[{attribute:'asset',value:original}]));
    await store.put(put('after',[{attribute:'asset',value:revised}]));
  }finally{await store.close();}
  const port=await openAuditedPort({database});
  try{
    const sql=(statement:string)=>nativeSQL(port,statement);
    const payload=(value:typeof original|typeof revised)=>{
      const {value:id,tag:_,...extra}=value;
      return [JSON.stringify({id,...extra}),JSON.stringify(extra)];
    };
    const old=payload(original),current=payload(revised);
    assert.deepEqual(await sql('SELECT payload,extra_json FROM main.assertions ORDER BY tx_from'),[old,current]);
    const charged=[DOC,'asset',...old,DOC,'asset',...current].reduce((total,value)=>total+BigInt(Buffer.byteLength(value)),0n);
    assert.deepEqual(await sql('SELECT retained_count,retained_bytes FROM main.storage_usage'),[[2n,charged]]);
    const inactive=before.asserted[0];
    const metadata=old[1];
    assert.ok(inactive&&metadata);
    const tampered=metadata.replace('text/plain','text/plAin');
    assert.equal(Buffer.byteLength(tampered),Buffer.byteLength(metadata));
    const overwrite=(value:string)=>port.run({name:'descriptor_fault_fixture',
      sql:'UPDATE main.assertions SET extra_json=? WHERE assertion_id=?',params:[value,inactive]});
    await overwrite(tampered);
    await assert.rejects(port.activateOwnership(),/TD_E_QUERY_CARRIER|TD_E_COMMAND_HISTORY/);
    await assert.rejects(sql(scalable(scan('asset'))),/TD_E_OWNER_PROBE_INVALID/);
    await overwrite(metadata);
    await port.activateOwnership();
    assert.deepEqual(tuples(await sql(scalable(scan('asset'),1n)),1n,'sql'),[[wire(8,BLOB)]]);
  }finally{await port.close();}
});

test('legacy Triplex JSON and blob carriers are queryable without changing format five',async()=>{
  const database=join(await directory(),'triplex.duckdb');
  const publicSchema=await readFile(new URL('./public-schema.sql',import.meta.url),'utf8');
  const raw=await NativeDuckDBPort.open({database});
  const backend=new PublicDuckDBBackend(raw,'typed-json-blob-compat');
  try{
    await backend.initialize(publicSchema);
    const entityId=EntityId.make('legacy');
    const inputs:TripleInput[]=[
      {entityId,attribute:'source',value:{type:'json',value:{a:1,b:'é'}}},
      {entityId,attribute:'asset',value:{type:'blob',value:BLOB,mimeType:'text/plain',size:0,filename:'é🙂.txt'}},
    ];
    await backend.withTransaction(async session=>{
      const position=await session.nextCommitPosition();
      assert.equal(position,1);
      await session.claimCommand('legacy','legacy-tx',1);
      await session.batchInsert(inputs.map(input=>({...input,validFrom:0,validTo:10})),
        'legacy-tx',1,['legacy-json','legacy-blob'],position);
    });
  }finally{await backend.close();}

  const store=await NativeEntityStore.open({database,readers:2});
  try{
    await answers(store,scan('source'),[[json(JSON_COMPACT)]],1n);
    await answers(store,scan('asset'),[[id(BLOB)]],1n);
  }finally{await store.close();}
  const port=await openAuditedPort({database});
  try{
    const sql=(statement:string)=>nativeSQL(port,statement);
    assert.deepEqual(await sql('SELECT version::BIGINT FROM main.store_meta'),[[5n]]);
    assert.deepEqual(await sql('SELECT tag,payload,extra_json FROM main.assertions ORDER BY tag'),[
      ['blob',JSON.stringify(BLOB),'{"mimeType":"text/plain","size":0,"filename":"é🙂.txt"}'],
      ['json',JSON.stringify(JSON_COMPACT),null],
    ]);
    for(const [attribute,value] of [['source',wire(7,JSON_COMPACT)],['asset',wire(8,BLOB)]] as const){
      const program=scan(attribute);
      assert.deepEqual(tuples(await sql(bounded(program)),1n,'native'),[[value]]);
      assert.deepEqual(tuples(await sql(scalable(program)),1n,'sql'),[[value]]);
      await assert.rejects(sql(scalable(program,-1n,'td_query_store_scalable')),/TD_E_QUERY_PROFILE/);
    }
  }finally{await port.close();}
});

for(const format of [5n,6n,8n]){
  test(`native JSON/blob registration atomically upgrades format ${format} and preserves legacy replay`,async()=>{
    const database=join(await directory(),'migration.duckdb');
    const legacySchema=format===8n
      ?'schema documents version 1 {entity Document {previous:int64;when:datetime;}}'
      :'schema documents version 1 {entity Document {previous:int64;}}';
    const legacyRecord=format===8n?'{previous=5;when=datetime("bff4000000000000");}':'{previous=5;}';
    const nextSchema=SCHEMA.replace('version 1','version 2');
    const base={schema:'documents',version:1,type:'Document',entityId:DOC,validFrom:0n,validTo:10n,record:legacyRecord};
    const prior=await NativeEntityStore.open({database});
    let originalReceipt!:EntityReceipt;
    let patchReceipt:EntityReceipt|undefined;
    let legacyHistory!:Awaited<ReturnType<NativeEntityStore['history']>>;
    try{
      await prior.defineSchema(legacySchema);
      originalReceipt=await prior.putRecord({...base,commandId:'original'});
      if(format===6n)patchReceipt=await prior.patchRecord({...base,commandId:'old-patch',validFrom:2n,validTo:3n});
      legacyHistory=await prior.history(DOC);
    }finally{await prior.close();}

    const port=await openAuditedPort({database});
    try{
      const sql=(statement:string)=>nativeSQL(port,statement);
      const marker='SELECT version::BIGINT FROM main.store_meta';
      const schemas="SELECT version::BIGINT,ir,content_hash FROM td_catalog_v1.schemas WHERE name='documents' ORDER BY version";
      const before=await sql(schemas);
      const define=(dsl:string)=>sql('PRAGMA td_define_schema_v2('+quoted(dsl)+')');
      assert.deepEqual(await sql(marker),[[format]]);
      await assert.rejects(define(SCHEMA),/TD_E_SCHEMA_VERSION/);
      assert.deepEqual(await sql(marker),[[format]]);
      assert.deepEqual(await sql(schemas),before);
      await sql('BEGIN');
      try{
        await define(nextSchema);
        assert.deepEqual(await sql(marker),[[9n]]);
        assert.equal((await sql(schemas)).length,2);
      }finally{await sql('ROLLBACK');}
      assert.deepEqual(await sql(marker),[[format]]);
      assert.deepEqual(await sql(schemas),before);
      await define(nextSchema);
      assert.deepEqual(await sql(marker),[[9n]]);
      assert.deepEqual((await sql(schemas)).slice(0,1),before);
    }finally{await port.close();}

    const current=await NativeEntityStore.open({database,readers:2});
    try{
      assert.deepEqual(await current.history(DOC),legacyHistory);
      assert.deepEqual(await current.putRecord({...base,commandId:'original'}),originalReceipt);
      if(patchReceipt)assert.deepEqual(await current.patchRecord({...base,commandId:'old-patch',validFrom:2n,validTo:3n}),patchReceipt);
      const added=await current.put({...put('expanded',[{attribute:'asset',value:revised},{attribute:'source',value:json(JSON_COMPACT)}],'expanded'),version:2});
      assert.equal(added.position,format===6n?3n:2n);
      await answers(current,scan('previous'),[[i64(5n)]],added.position);
      await answers(current,scan('asset'),[[id(BLOB)]],added.position);
      await current.revalidate();
    }finally{await current.close();}
  });
}

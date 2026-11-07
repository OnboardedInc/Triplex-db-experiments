import assert from 'node:assert/strict';
import {mkdtemp} from 'node:fs/promises';
import {join} from 'node:path';
import {test} from 'node:test';
import type {TestContext} from 'node:test';
import {fileURLToPath} from 'node:url';
import {NativeCommandError,NativeEntityStore} from './native-entity.js';
import type {EntityAssertion,EntityBatch,EntityPut} from './native-entity.js';
import type {NativeQueryValue,SchemaField,SchemaValue} from './native-schema.js';

// Independent authored values and cuts. Only actual public engine APIs produce
// results/receipts; no SQL result substitution, private dispatch hook or DB mock.
const root=fileURLToPath(new URL('../..',import.meta.url));
const primary="alpha-'é🙂",other='beta-e\u0301🙂',target='target-é🙂';
const minimum=-9223372036854775808n,maximum=9223372036854775807n;
const documentA=' {"n":1,"s":"é"} ';
const documentB='{"s":"é","n":1}';
const blobId='object://é🙂/one';
const originalBlob={tag:'blob' as const,value:blobId,mimeType:'application/x-fixture',
  size:Number.MAX_SAFE_INTEGER,filename:"quote-'\"-é.bin"};
const correctedBlob={tag:'blob' as const,value:blobId,mimeType:'text/plain',size:0};
const legacySchema='schema writer_values version 1 {entity Target {} entity Record {'+
  'flag:boolean required;label:text required;legacy:ref(Target) required;number:int64 required;real:float64 required;}}';
const expandedSchema='schema writer_values version 2 {entity Target {} entity Record {'+
  'asset:blob required;document:json required;flag:boolean required;label:text required;'+
  'legacy:ref(Target) required;link:ref_value(Target) required;number:int64 required;'+
  'real:float64 required;stamp:datetime required;}}';
const legacyRecord=`{real=f64("8000000000000000");number=-9223372036854775808;`+
  `legacy="target-é🙂";label="original 'e\\u0301 / 世界";flag=false;}`;

const legacyInput:readonly SchemaField[]=[
  {attribute:'flag',value:{tag:'bool',value:false}},
  {attribute:'label',value:{tag:'str',value:"original 'e\u0301 / 世界"}},
  {attribute:'legacy',value:{tag:'str',value:target}},
  {attribute:'number',value:{tag:'i64',value:minimum}},
  {attribute:'real',value:{tag:'f64',value:-0}},
];
const legacyExpected:readonly SchemaField[]=[
  {attribute:'flag',value:{tag:'bool',value:false}},
  {attribute:'label',value:{tag:'str',value:"original 'e\u0301 / 世界"}},
  {attribute:'legacy',value:{tag:'str',value:target}},
  {attribute:'number',value:{tag:'i64',value:minimum}},
  {attribute:'real',value:{tag:'f64',value:0}},
];
const middle:readonly SchemaField[]=[
  {attribute:'asset',value:originalBlob},
  {attribute:'document',value:{tag:'json',value:documentA}},
  {attribute:'flag',value:{tag:'bool',value:false}},
  {attribute:'label',value:{tag:'str',value:'middle-é🙂'}},
  {attribute:'legacy',value:{tag:'str',value:target}},
  {attribute:'link',value:{tag:'ref',value:target}},
  {attribute:'number',value:{tag:'i64',value:maximum}},
  {attribute:'real',value:{tag:'f64',value:Number.MAX_VALUE}},
  {attribute:'stamp',value:{tag:'datetime',value:-10.25}},
];
const corrected:readonly SchemaField[]=[
  {attribute:'asset',value:correctedBlob},
  {attribute:'document',value:{tag:'json',value:documentB}},
  {attribute:'flag',value:{tag:'bool',value:true}},
  {attribute:'label',value:{tag:'str',value:'corrected-e\u0301🙂'}},
  {attribute:'legacy',value:{tag:'str',value:target}},
  {attribute:'link',value:{tag:'ref',value:target}},
  {attribute:'number',value:{tag:'i64',value:-7n}},
  {attribute:'real',value:{tag:'f64',value:Number.MIN_VALUE}},
  {attribute:'stamp',value:{tag:'datetime',value:-Number.MIN_VALUE}},
];
const code=(expected:string)=>(error:unknown)=>error instanceof NativeCommandError&&error.code===expected;
const queryValue=(value:SchemaValue):NativeQueryValue=>value.tag==='blob'?{tag:'blob',value:value.value}:value;
const fieldsAt=(rows:readonly EntityAssertion[])=>rows.map(row=>({attribute:row.attribute,value:row.value}));
const stableAssertion=(row:EntityAssertion)=>({assertionId:row.assertionId,entityId:row.entityId,
  attribute:row.attribute,value:row.value,validFrom:row.validFrom,validTo:row.validTo,txFrom:row.txFrom,
  commandId:row.commandId,schema:row.schema,version:row.version,type:row.type,schemaHash:row.schemaHash});
const write=(entityId:string,commandId:string,fields:readonly SchemaField[],validFrom=0n,validTo=10n,version=2):EntityPut=>
  ({schema:'writer_values',version,type:'Record',entityId,commandId,fields,validFrom,validTo});
async function database(t:TestContext){
  const path=join(await mkdtemp(join(root,'build/native-writer-values-')),'facts.duckdb');
  t.diagnostic('Preserved owned fixture: '+path);return path;
}
async function declareTarget(store:NativeEntityStore,version:number){
  const receipt=await store.put({schema:'writer_values',version,type:'Target',entityId:target,
    commandId:'declare-empty-target',fields:[],validFrom:-10n,validTo:20n});
  assert.equal(receipt.position,1n);assert.deepEqual(receipt.asserted,[]);
  return receipt;
}
async function queryAnswers(store:NativeEntityStore,program:string,expected:readonly (readonly NativeQueryValue[])[],
  position:bigint,validAt:bigint,latest=false){
  const cut={validAt,...(latest?{}:{knownAt:position}),timeoutMs:10000};
  const forced=await store.query(program,{...cut,forceNative:true});
  const scalable=await store.queryScalable(program,cut);
  const automatic=await store.query(program,cut);
  assert.equal(forced.route,'native');assert.equal(scalable.route,'sql');
  for(const answer of [forced,scalable,automatic]){
    assert.equal(answer.position,position,program);assert.deepEqual(answer.rows,expected,program);
  }
}
async function cut(store:NativeEntityStore,entityId:string,position:bigint,validAt:bigint,
  expected:readonly SchemaField[],latest=false){
  assert.deepEqual(fieldsAt(await store.at(entityId,{knownAt:position,validAt})),expected);
  await queryAnswers(store,`answer(?a,?v) :- triple(${JSON.stringify(entityId)},?a,?v).`,
    expected.map(field=>[{tag:'str' as const,value:field.attribute},queryValue(field.value)]),position,validAt,latest);
}
const drained=(store:NativeEntityStore,readers:number)=>assert.deepEqual(store.readerStats(),
  {capacity:readers,available:readers,active:0,waiting:0});

test('native writer eight-tag schema evolution patch batch and replay preserve exact public cuts and history',
  {timeout:60000},async t=>{
  const path=await database(t),options={database:path,readers:4,threads:1};
  let store:NativeEntityStore|undefined=await NativeEntityStore.open(options);
  try{
    const oldDefinition=await store.defineSchema(legacySchema);await declareTarget(store,1);
    const oldRequest=write(primary,'original-four-tag',legacyInput,0n,10n,1);
    const original=await store.put(oldRequest);assert.equal(original.position,2n);assert.equal(original.asserted.length,5);
    const oldRecordRequest={schema:'writer_values',version:1,type:'Record',entityId:primary,
      commandId:'original-four-tag',validFrom:0n,validTo:10n,record:legacyRecord};
    assert.deepEqual(await store.putRecord(oldRecordRequest),original);
    const originalPoint=await store.at(primary,{knownAt:2n,validAt:3n});
    assert.deepEqual(fieldsAt(originalPoint),legacyExpected);
    assert.deepEqual([...original.asserted].sort(),originalPoint.map(row=>row.assertionId).sort());
    assert.ok(Object.is(originalPoint.find(row=>row.attribute==='real')?.value.value,0));
    assert.equal(Object.is(originalPoint.find(row=>row.attribute==='real')?.value.value,-0),false);
    const oldHash=original.schemaHash;assert.equal(oldHash,oldDefinition.hash);

    const expanded=await store.defineSchema(expandedSchema);assert.notEqual(expanded.hash,oldHash);
    const patchRequest=write(primary,'expanded-middle',middle,2n,8n);
    const patched=await store.patch(patchRequest);assert.equal(patched.position,3n);
    assert.equal(patched.schemaHash,expanded.hash);assert.equal(patched.asserted.length,19);
    assert.deepEqual([...patched.retracted].sort(),[...original.asserted].sort());
    const batchRequest:EntityBatch={schema:'writer_values',version:2,commandId:'one-k-eight-types',members:[
      {operation:'put',type:'Record',entityId:other,validFrom:0n,validTo:10n,fields:corrected},
      {operation:'patch',type:'Record',entityId:primary,validFrom:4n,validTo:6n,fields:corrected},
    ]};
    const batched=await store.batch(batchRequest);assert.equal(batched.position,4n);
    assert.deepEqual(batched.members.map(member=>member.entityId),[primary,other]);
    assert.equal(batched.members[0]?.asserted.length,27);assert.equal(batched.members[0]?.retracted.length,9);
    assert.equal(batched.members[1]?.asserted.length,9);assert.deepEqual(batched.members[1]?.retracted,[]);

    for(const [k,v,expected] of [
      [0n,3n,[]],[1n,3n,[]],[2n,3n,legacyExpected],
      [3n,1n,legacyExpected],[3n,2n,middle],[3n,7n,middle],[3n,8n,legacyExpected],
      [4n,-1n,[]],[4n,2n,middle],[4n,3n,middle],[4n,4n,corrected],[4n,5n,corrected],
      [4n,6n,middle],[4n,8n,legacyExpected],[4n,10n,[]],
    ] as const)await cut(store,primary,k,v,expected);
    await cut(store,other,3n,4n,[]);await cut(store,other,4n,4n,corrected);
    await cut(store,primary,4n,4n,corrected,true);
    await queryAnswers(store,`answer(?v) :- triple(${JSON.stringify(primary)},'legacy',?v),`+
      `triple(${JSON.stringify(primary)},'link',?v).`,[],4n,4n);
    await queryAnswers(store,`answer(?a) :- triple(${JSON.stringify(primary)},?a,ref(${JSON.stringify(target)})).`,
      [[{tag:'str',value:'link'}]],4n,4n);
    await queryAnswers(store,`answer(?a) :- triple(${JSON.stringify(primary)},?a,json(${JSON.stringify(documentA)})).`,
      [],4n,4n);
    assert.notEqual(documentA,documentB);assert.deepEqual(JSON.parse(documentA),JSON.parse(documentB));

    const oldPointNow=await store.at(primary,{knownAt:2n,validAt:3n});
    assert.deepEqual(oldPointNow.map(stableAssertion),originalPoint.map(stableAssertion));
    assert.ok(oldPointNow.every(row=>row.txTo===3n&&row.correctedBy==='expanded-middle'));
    assert.deepEqual(await store.defineSchema(legacySchema),oldDefinition);
    assert.deepEqual(await store.putRecord(oldRecordRequest),original);
    assert.deepEqual(await store.put({...oldRequest,fields:[...legacyInput].reverse().concat(legacyInput[1]!)}),original);
    assert.deepEqual(await store.patch({...patchRequest,fields:[...middle].reverse()}),patched);
    assert.deepEqual(await store.batch({...batchRequest,members:[...batchRequest.members].reverse()}),batched);
    assert.deepEqual(await store.receipt('original-four-tag'),original);
    assert.deepEqual(await store.batchReceipt('one-k-eight-types'),batched);
    const history=await store.history(primary);assert.equal(history.length,51);
    assert.equal(history.filter(row=>row.value.tag==='blob'&&row.value.size===Number.MAX_SAFE_INTEGER).length,3);
    assert.ok(history.some(row=>row.value.tag==='blob'&&row.value.size===0));
    await store.revalidate();await cut(store,primary,4n,4n,corrected,true);drained(store,4);
    await store.close();store=undefined;

    store=await NativeEntityStore.open(options);
    assert.deepEqual(await store.history(primary),history);
    assert.deepEqual(await store.receipt('original-four-tag'),original);
    assert.deepEqual(await store.receipt('expanded-middle'),patched);
    assert.deepEqual(await store.batchReceipt('one-k-eight-types'),batched);
    await cut(store,primary,2n,3n,legacyExpected);await cut(store,primary,3n,4n,middle);
    await cut(store,primary,4n,4n,corrected,true);await cut(store,primary,4n,6n,middle);
    assert.deepEqual(await store.put(oldRequest),original);assert.deepEqual(await store.batch(batchRequest),batched);
    assert.deepEqual(await store.putRecord(oldRecordRequest),original);
    await cut(store,primary,4n,4n,corrected,true);drained(store,4);
  }finally{await store?.close();}
});

test('native writer invalid eight-tag values and failed batch leave receipts history and knowledge unchanged',
  {timeout:60000},async t=>{
  const path=await database(t),options={database:path,readers:2,threads:1};
  let store:NativeEntityStore|undefined=await NativeEntityStore.open(options);
  try{
    await store.defineSchema(expandedSchema);await declareTarget(store,2);
    const request=write(primary,'valid-original',middle),original=await store.put(request);
    assert.equal(original.position,2n);const before=await store.history(primary);
    await assert.rejects(store.defineSchema(expandedSchema.replace('number:int64 required','number:float64 required')),
      code('TD_E_SCHEMA_VERSION'));
    assert.deepEqual(await store.history(primary),before);await cut(store,primary,2n,4n,middle,true);
    const cases:readonly Readonly<{id:string;attribute:string;value:SchemaValue;code:string}>[]=[
      {id:'nonfinite-time',attribute:'stamp',value:{tag:'datetime',value:Infinity},code:'TD_E_SCHEMA_VALUE'},
      {id:'nonfinite-real',attribute:'real',value:{tag:'f64',value:NaN},code:'TD_E_VALUE_PAYLOAD'},
      {id:'json-syntax',attribute:'document',value:{tag:'json',value:'true false'},code:'TD_E_SCHEMA_VALUE'},
      {id:'empty-blob-id',attribute:'asset',value:{...originalBlob,value:''},code:'TD_E_SCHEMA_BLOB'},
      {id:'ref-tag',attribute:'link',value:{tag:'str',value:target},code:'TD_E_SCHEMA_TYPE'},
      {id:'missing-target',attribute:'link',value:{tag:'ref',value:'never-declared'},code:'TD_E_COMMAND_REFERENCE'},
      {id:'i64-overflow',attribute:'number',value:{tag:'i64',value:maximum+1n},code:'TD_E_SCHEMA_VALUE'},
    ];
    for(const invalid of cases){
      const fields=middle.map(field=>field.attribute===invalid.attribute?{attribute:field.attribute,value:invalid.value}:field);
      await assert.rejects(store.put(write(primary,invalid.id,fields)),code(invalid.code));
      assert.equal(await store.receipt(invalid.id),null);assert.deepEqual(await store.history(primary),before);
      await cut(store,primary,2n,4n,middle,true);
    }
    await assert.rejects(store.patch(write(primary,'conflicting-blob',[
      ...middle,{attribute:'asset',value:{...originalBlob,size:0}},
    ],2n,8n)),code('TD_E_SCHEMA_BLOB'));
    assert.equal(await store.receipt('conflicting-blob'),null);
    const badBatch:EntityBatch={schema:'writer_values',version:2,commandId:'invalid-batch',members:[
      {operation:'put',type:'Record',entityId:other,validFrom:0n,validTo:10n,fields:corrected},
      {operation:'patch',type:'Record',entityId:primary,validFrom:2n,validTo:8n,
        fields:middle.map(field=>field.attribute==='document'?{attribute:'document',value:{tag:'json' as const,value:'{"bad":}'}}:field)},
    ]};
    await assert.rejects(store.batch(badBatch),code('TD_E_SCHEMA_VALUE'));
    assert.equal(await store.batchReceipt('invalid-batch'),null);
    assert.deepEqual(await store.history(primary),before);assert.deepEqual(await store.history(other),[]);
    await cut(store,other,2n,4n,[]);await cut(store,primary,2n,4n,middle,true);
    await assert.rejects(store.put({...request,fields:corrected}),code('TD_E_COMMAND_IDEMPOTENCY'));
    assert.deepEqual(await store.receipt('valid-original'),original);
    const healthy=await store.patch(write(primary,'healthy-after-rejection',corrected,2n,8n));
    assert.equal(healthy.position,3n);await cut(store,primary,3n,4n,corrected,true);
    await cut(store,primary,2n,4n,middle);const history=await store.history(primary);
    await store.revalidate();drained(store,2);await store.close();store=undefined;
    store=await NativeEntityStore.open(options);
    assert.deepEqual(await store.history(primary),history);assert.deepEqual(await store.receipt('valid-original'),original);
    assert.equal(await store.batchReceipt('invalid-batch'),null);
    await cut(store,primary,3n,4n,corrected,true);drained(store,2);
  }finally{await store?.close();}
});

test('native writer public uniqueness rollback and one-K interval swap preserve valid-time boundaries',
  {timeout:60000},async t=>{
  const path=await database(t),options={database:path,readers:2,threads:1};
  let store:NativeEntityStore|undefined=await NativeEntityStore.open(options);
  const fields=(key:string):readonly SchemaField[]=>[
    {attribute:'asset',value:correctedBlob},{attribute:'document',value:{tag:'json',value:documentA}},
    {attribute:'key',value:{tag:'str',value:key}},{attribute:'stamp',value:{tag:'datetime',value:-0.5}},
  ];
  const command=(entityId:string,commandId:string,key:string,validFrom=0n,validTo=10n):EntityPut=>
    ({schema:'writer_constraints',version:1,type:'Member',entityId,commandId,fields:fields(key),validFrom,validTo});
  try{
    await store.defineSchema('schema writer_constraints version 1 {entity Member {'+
      'asset:blob required;document:json required;key:text required unique;stamp:datetime required;}}');
    const first=await store.put(command('owner-a','owner-a-first','one'));
    const second=await store.put(command('owner-b','owner-b-first','two'));
    assert.equal(second.position,first.position+1n);const k=second.position;
    const a=await store.history('owner-a'),b=await store.history('owner-b');
    await assert.rejects(store.patch(command('owner-b','overlap-rejected','one',3n,7n)),code('TD_E_COMMAND_UNIQUE'));
    assert.equal(await store.receipt('overlap-rejected'),null);
    assert.deepEqual(await store.history('owner-a'),a);assert.deepEqual(await store.history('owner-b'),b);
    await cut(store,'owner-a',k,5n,fields('one'),true);await cut(store,'owner-b',k,5n,fields('two'),true);
    const swap:EntityBatch={schema:'writer_constraints',version:1,commandId:'atomic-swap',members:[
      {operation:'patch',type:'Member',entityId:'owner-b',fields:fields('one'),validFrom:3n,validTo:7n},
      {operation:'patch',type:'Member',entityId:'owner-a',fields:fields('two'),validFrom:3n,validTo:7n},
    ]};
    const receipt=await store.batch(swap);assert.equal(receipt.position,k+1n);
    assert.deepEqual(receipt.members.map(member=>member.entityId),['owner-a','owner-b']);
    for(const member of receipt.members){assert.equal(member.asserted.length,12);assert.equal(member.retracted.length,4);}
    for(const [validAt,keyA,keyB] of [[2n,'one','two'],[3n,'two','one'],[6n,'two','one'],[7n,'one','two']] as const){
      await cut(store,'owner-a',receipt.position,validAt,fields(keyA));
      await cut(store,'owner-b',receipt.position,validAt,fields(keyB));
    }
    await cut(store,'owner-a',k,5n,fields('one'));await cut(store,'owner-b',k,5n,fields('two'));
    assert.deepEqual(await store.batch({...swap,members:[...swap.members].reverse()}),receipt);
    assert.deepEqual(await store.receipt('owner-a-first'),first);assert.deepEqual(await store.receipt('owner-b-first'),second);
    const historyA=await store.history('owner-a'),historyB=await store.history('owner-b');
    await store.revalidate();drained(store,2);await store.close();store=undefined;
    store=await NativeEntityStore.open(options);
    assert.deepEqual(await store.history('owner-a'),historyA);assert.deepEqual(await store.history('owner-b'),historyB);
    assert.deepEqual(await store.batchReceipt('atomic-swap'),receipt);
    assert.equal(await store.receipt('overlap-rejected'),null);
    await cut(store,'owner-a',receipt.position,3n,fields('two'),true);
    await cut(store,'owner-b',receipt.position,7n,fields('two'));
    assert.deepEqual(await store.batch(swap),receipt);drained(store,2);
  }finally{await store?.close();}
});

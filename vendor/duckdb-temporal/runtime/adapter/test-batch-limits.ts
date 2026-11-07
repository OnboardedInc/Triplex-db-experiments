import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {test} from 'node:test';
import {NativeEntityStore} from './native-entity.js';
import type {EntityBatchRecords,EntityReceipt} from './native-entity.js';

const schema='schema batch_limits version 1 {entity Row {n:int64 many;}}';
const member=(entityId:string,record:string,operation:'put'|'patch'='put',validFrom=0n,validTo=10n)=>
  ({entityId,record,operation,type:'Row',validFrom,validTo});
const batch=(commandId:string,members:EntityBatchRecords['members']):EntityBatchRecords=>
  ({schema:'batch_limits',version:1,commandId,members});
const payloadBytes=(members:EntityBatchRecords['members'])=>
  Buffer.byteLength(JSON.stringify(members.map(value=>({
    ...value,validFrom:String(value.validFrom),validTo:String(value.validTo),
  }))));
const intRecord=(count:number)=>'{'+Array.from({length:count},(_,value)=>'n='+value+';').join('')+'}';
const count='source(?e,?v) :- triple(?e,\'n\',?v). answer(count()) :- source(?e,?v).';

async function clockAndFacts(store:NativeEntityStore,position:bigint,facts:bigint){
  const result=await store.queryScalable(count,{validAt:4n});
  assert.equal(result.position,position);
  assert.deepEqual(result.rows,[[{tag:'i64',value:facts}]]);
}

test('batch accepts 32 members and the exact UTF-8 envelope and per-record limits',async()=>{
  const store=await NativeEntityStore.open();
  try{
    await store.defineSchema(schema);
    const members=Array.from({length:32},(_,index)=>member('e'+String(index).padStart(2,'0'),'{n=1;}'));
    await assert.rejects(store.batchRecords(batch('invalid-members',[])),/TD_E_COMMAND_LIMIT/);
    await assert.rejects(store.batchRecords(batch('invalid-members',[...members,member('extra','{n=1;}')])),
      /TD_E_COMMAND_LIMIT/);
    assert.equal(await store.batchReceipt('invalid-members'),null);
    const accepted=await store.batchRecords(batch('member-cap',[...members].reverse()));
    assert.equal(accepted.position,1n);
    assert.deepEqual(accepted.members.map(({entityId,asserted})=>[entityId,asserted.length]),
      members.map(({entityId})=>[entityId,1]));

    const first=member('é🙂',' '.repeat(65534)+'{}');
    assert.equal(Buffer.byteLength(first.record),65536);
    const second=member('z','{}');
    second.record=' '.repeat(98304-payloadBytes([first,second]))+'{}';
    assert.equal(payloadBytes([first,second]),98304);
    await assert.rejects(store.batchRecords(batch('wide-member',[{...first,record:' '+first.record}])),
      /TD_E_COMMAND_LIMIT/);
    await assert.rejects(store.batchRecords(batch('wide-envelope',[first,{...second,record:' '+second.record}])),
      /TD_E_COMMAND_LIMIT/);
    for(const commandId of ['wide-member','wide-envelope'])assert.equal(await store.batchReceipt(commandId),null);

    const atLimit=batch('byte-cap',[first,second]);
    const receipt=await store.batchRecords(atLimit);
    assert.equal(receipt.position,2n);
    assert.deepEqual(receipt.members.map(({entityId,asserted})=>[entityId,asserted.length]),[['z',0],['é🙂',0]]);
    assert.deepEqual(await store.batchRecords({...atLimit,members:[second,first]}),receipt);
    await clockAndFacts(store,2n,32n);
  }finally{await store.close();}
});

test('one command accepts 4096 submitted assertions across two members at default memory',async()=>{
  const store=await NativeEntityStore.open();
  try{
    await store.defineSchema(schema);
    const record=intRecord(2048);
    const request=batch('submit-at-limit',[member('a',record),member('b',record)]);
    await assert.rejects(store.batchRecords({...request,members:[member('a',intRecord(2049)),member('b',record)]}),
      /batch submitted fact admission exceeded/);
    assert.equal(await store.batchReceipt(request.commandId),null);
    await clockAndFacts(store,0n,0n);
    const receipt=await store.batchRecords(request);
    assert.equal(receipt.position,1n);
    assert.deepEqual(receipt.members.map(item=>item.asserted.length),[2048,2048]);
    for(const [member,part] of receipt.members.entries()){
      const expected=Array.from({length:2048},(_,ordinal)=>
        createHash('sha256').update(JSON.stringify({kind:'td.entity.batch.value/1',
          command_id:request.commandId,member,ordinal})).digest('hex'));
      assert.deepEqual(part.asserted,expected);
    }
    await clockAndFacts(store,1n,4096n);
    assert.deepEqual(await store.batchReceipt(request.commandId),receipt);
    assert.deepEqual(await store.batchRecords({...request,members:[...request.members].reverse()}),receipt);
  }finally{await store.close();}
});

test('4096 affected assertions and 8192 generated carries fit one batch receipt at default memory',async()=>{
  const store=await NativeEntityStore.open();
  const records=intRecord(2048);
  try{
    await store.defineSchema(schema);
    const seed:EntityReceipt[]=[];
    for(const entityId of ['a','b']){
      seed.push(await store.putRecord({schema:'batch_limits',version:1,type:'Row',entityId,
        commandId:'seed-'+entityId,record:records,validFrom:0n,validTo:10n}));
    }
    await store.putRecord({schema:'batch_limits',version:1,type:'Row',entityId:'c',
      commandId:'extra-old',record:'{n=1;}',validFrom:0n,validTo:10n});
    const splitRequest=batch('carry-at-limit',[member('a','{}','patch',2n,8n),member('b','{}','patch',2n,8n)]);
    await assert.rejects(store.batchRecords({...splitRequest,members:[...splitRequest.members,member('c','{}')]}),
      /batch affected or generated assertion admission exceeded/);
    await assert.rejects(store.batchRecords({...splitRequest,members:[
      member('a','{n=9000;}','patch',2n,8n),splitRequest.members[1]!,
    ]}),/batch affected or generated assertion admission exceeded/);
    await assert.rejects(store.batchRecords({...splitRequest,members:[member('a','{n=9000;}','patch',2n,8n)]}),
      /resulting entity assertion admission exceeded/);
    assert.equal(await store.batchReceipt(splitRequest.commandId),null);
    await clockAndFacts(store,3n,4097n);

    const receipt=await store.batchRecords(splitRequest);
    assert.equal(receipt.position,4n);
    assert.deepEqual(receipt.members.map(item=>[item.asserted.length,item.retracted.length]),[[4096,2048],[4096,2048]]);
    for(const [index,part] of receipt.members.entries()){
      const old=seed[index]!;
      assert.deepEqual(part.retracted,[...old.asserted].sort());
      const expected=part.retracted.flatMap(source_assertion_id=>['left','right'].map(side=>
        createHash('sha256').update(JSON.stringify({kind:'td.entity.batch.fragment/1',command_id:splitRequest.commandId,
          entity_id:part.entityId,source_assertion_id,side})).digest('hex')));
      assert.deepEqual(part.asserted,expected);
    }
    assert.equal((await store.at('a',{knownAt:4n,validAt:0n})).length,2048);
    assert.deepEqual(await store.at('b',{knownAt:4n,validAt:4n}),[]);
    assert.equal((await store.at('b',{knownAt:3n,validAt:4n})).length,2048);
    await clockAndFacts(store,4n,1n);
    assert.deepEqual(await store.batchReceipt(splitRequest.commandId),receipt);
    assert.deepEqual(await store.batchRecords({...splitRequest,members:[...splitRequest.members].reverse()}),receipt);
  }finally{await store.close();}
});

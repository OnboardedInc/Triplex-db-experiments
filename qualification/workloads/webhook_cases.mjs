import assert from 'node:assert/strict';

const infinity=9223372036854775807n;
const text=cell=>{assert.equal(cell.tag,'str');assert.equal(typeof cell.value,'string');return cell.value;};
const integer=cell=>{assert.equal(cell.tag,'i64');return BigInt(cell.value);};
const field=(attribute,tag,value)=>({attribute,value:{tag,value}});
const quote=JSON.stringify;

export function webhookDeliveries(workload) {
  const events=new Map(),revisions=new Set();
  for(const event of workload.events){
    assert.equal(event.kind,'object_revision');
    assert.equal(event.semantics,'business_event');
    assert.ok(event.corrects==null);
    assert.ok(!events.has(event.id),'Source event IDs must be unique');
    assert.ok(BigInt(event.occurred_at)<infinity);
    const revision=integer(event.payload.revision);
    const key=JSON.stringify([event.subject,String(revision)]);
    assert.ok(!revisions.has(key),'Webhook fixture requires one source event per object revision');
    text(event.payload.status);revisions.add(key);events.set(event.id,event);
  }
  const deliveries=[...workload.deliveries].sort((a,b)=>{
    const left=BigInt(a.received_order),right=BigInt(b.received_order);return left<right?-1:left>right?1:0;
  });
  const ids=new Set(),orders=new Set(),accepted=new Set();
  let latest=0n;
  for(const delivery of deliveries){
    const order=BigInt(delivery.received_order);
    assert.ok(!ids.has(delivery.id)&&!orders.has(order),'Delivery IDs and order must be unique');
    ids.add(delivery.id);orders.add(order);
    assert.ok(order>0n);
    const event=events.get(delivery.event);
    assert.ok(event,'Delivery must identify an immutable source event');
    const position=BigInt(event.recorded_at);
    assert.equal(BigInt(delivery.receipt_position),position,'Repeated delivery must retain the accepted receipt');
    if(!accepted.has(event.id)){
      assert.ok(position>=latest&&position>0n,'First deliveries must follow the declared knowledge groups');
      latest=position;accepted.add(event.id);
    }
  }
  assert.equal(accepted.size,events.size,'Every source event must have a delivery');
  return deliveries.map(delivery=>({delivery,event:events.get(delivery.event)}));
}

export function nativeWebhookWrite(event,schema) {
  return {method:'put',request:{schema,version:1,type:'Row',entityId:event.id,commandId:'event-'+event.id,
    validFrom:BigInt(event.occurred_at),validTo:infinity,fields:[
      field('webhook_object','str',event.subject),field('revision','i64',integer(event.payload.revision)),
      field('status','str',text(event.payload.status)),
    ]}};
}

export async function initializeWebhookProjection(engine,profile) {
  if(profile==='direct_duckdb')await engine.run(`CREATE TABLE webhook_event(source_event_id VARCHAR PRIMARY KEY,
    object_id VARCHAR,revision BIGINT,status VARCHAR,valid_from BIGINT,known_from BIGINT)`);
  await engine.run(`CREATE TABLE webhook_delivery(delivery_id VARCHAR PRIMARY KEY,source_event_id VARCHAR,
    received_order BIGINT UNIQUE,receipt_position BIGINT)`);
}

async function acceptSQL(engine,profile,event,delivery) {
  const position=BigInt(event.recorded_at);
  if(profile==='naive_sql'){
    const values=[event.id,event.subject,event.kind,BigInt(event.occurred_at),position,event.semantics,null,JSON.stringify(event.payload)];
    await engine.run('INSERT INTO source_event VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(event_id) DO NOTHING',values);
    assert.deepEqual(await engine.run('SELECT event_id,subject,kind,occurred_at,recorded_at,semantics,corrects,payload::VARCHAR FROM source_event WHERE event_id=?',
      [event.id]),[values]);
  }else{
    const values=[event.id,event.subject,integer(event.payload.revision),text(event.payload.status),BigInt(event.occurred_at),position];
    await engine.run('INSERT INTO webhook_event VALUES (?,?,?,?,?,?) ON CONFLICT(source_event_id) DO NOTHING',values);
    assert.deepEqual(await engine.run('SELECT * FROM webhook_event WHERE source_event_id=?',[event.id]),[values]);
  }
  await engine.run('INSERT INTO webhook_delivery VALUES (?,?,?,?)',
    [delivery.id,event.id,BigInt(delivery.received_order),position]);
}

export async function ingestWebhookDeliveries(engine,profile,workload,progress,schema) {
  const accepted=new Map();
  progress.deliveries=[];
  let currentPosition=0n;
  for(const {delivery,event} of webhookDeliveries(workload)){
    const start=performance.now(),previous=accepted.get(event.id),logicalPosition=BigInt(event.recorded_at);
    let receipt;
    if(profile==='temporal_store'){
      const command=nativeWebhookWrite(event,schema);
      receipt=await engine.put(command.request); // Repeated deliveries reach native replay admission.
      if(previous)assert.deepEqual(receipt,previous.receipt);
      else{
        assert.equal(receipt.position,++currentPosition);
        assert.equal(receipt.commandId,command.request.commandId);
        assert.equal(receipt.entityId,event.id);
      }
    }else{
      await engine.run('BEGIN');
      try{await acceptSQL(engine,profile,event,delivery);await engine.run('COMMIT');}
      catch(error){await engine.run('ROLLBACK');throw error;}
    }
    const elapsedMs=performance.now()-start;
    progress.deliveries.push({deliveryId:delivery.id,eventId:event.id,receivedOrder:BigInt(delivery.received_order),
      logicalReceiptPosition:logicalPosition,nativeReceiptPosition:profile==='temporal_store'?receipt.position:null,
      replay:!!previous,elapsedMs});
    if(!previous){
      const command={eventId:event.id,logicalPosition,nativePosition:profile==='temporal_store'?receipt.position:null,
        method:profile==='temporal_store'?'put':'insert',elapsedMs,...(receipt?{
          asserted:receipt.asserted.length,retracted:receipt.retracted.length,requestHash:receipt.requestHash,receipt,
        }: {})};
      accepted.set(event.id,command);progress.commands.push(command);
      const last=progress.groups.at(-1);
      if(last?.logicalPosition===logicalPosition){
        last.nativePosition=command.nativePosition;last.events++;last.elapsedMs+=elapsedMs;
      }else progress.groups.push({logicalPosition,nativePosition:command.nativePosition,events:1,elapsedMs});
    }
  }
  assert.equal(accepted.size,workload.events.length);
}

export async function verifyWebhookReopen(engine,profile,workload,progress,schema) {
  if(profile==='temporal_store'){
    for(const command of progress.commands){
      const event=workload.events.find(event=>event.id===command.eventId);
      assert.deepEqual(await engine.receipt('event-'+event.id),command.receipt);
      assert.deepEqual(await engine.put(nativeWebhookWrite(event,schema).request),command.receipt);
    }
    const latest=await engine.query("accepted(?event,?object) :- triple(?event,'webhook_object',?object). answer(count()) :- accepted(?event,?object).",
      {validAt:infinity-1n,timeoutMs:60000});
    assert.equal(latest.position,progress.groups.at(-1).nativePosition);
    assert.deepEqual(latest.rows,[[{tag:'i64',value:BigInt(workload.events.length)}]]);
  }else{
    const table=profile==='naive_sql'?'source_event':'webhook_event';
    assert.deepEqual(await engine.run('SELECT count(*) FROM '+table),[[BigInt(workload.events.length)]]);
    assert.deepEqual(await engine.run('SELECT delivery_id,source_event_id,received_order,receipt_position FROM webhook_delivery ORDER BY received_order'),
      webhookDeliveries(workload).map(({delivery,event})=>[
        delivery.id,event.id,BigInt(delivery.received_order),BigInt(event.recorded_at),
      ]));
  }
}

export function webhookCasePlan(entry) {
  const known=BigInt(entry.cut.known_at),valid=BigInt(entry.cut.valid_at);
  if(entry.operation==='accepted_event_count'){
    const object=text(entry.parameters.subject);
    return {naive:{sql:`SELECT count(*) FROM source_event WHERE kind='object_revision' AND subject=?
        AND recorded_at<=? AND occurred_at<=?`,params:[object,known,valid]},
      direct:{sql:'SELECT count(*) FROM webhook_event WHERE object_id=? AND known_from<=? AND valid_from<=?',
        params:[object,known,valid]},
      program:`accepted(?event) :- triple(?event,'webhook_object',${quote(object)}).
        answer(count()) :- accepted(?event).`,rowTags:['i64']};
  }
  assert.equal(entry.operation,'state_at');assert.equal(text(entry.parameters.attribute),'status');
  const object=text(entry.parameters.entity);
  return {naive:{sql:`WITH visible AS (
      SELECT CAST(json_extract_string(payload,'$.revision.value') AS BIGINT) revision,
        json_extract_string(payload,'$.status.value') status FROM source_event
      WHERE kind='object_revision' AND subject=? AND recorded_at<=? AND occurred_at<=?
    ) SELECT DISTINCT status FROM visible WHERE revision=(SELECT max(revision) FROM visible)`,params:[object,known,valid]},
    direct:{sql:`WITH visible AS (SELECT revision,status FROM webhook_event
      WHERE object_id=? AND known_from<=? AND valid_from<=?)
      SELECT DISTINCT status FROM visible WHERE revision=(SELECT max(revision) FROM visible)`,params:[object,known,valid]},
    program:`version(?event,?revision) :- triple(?event,'webhook_object',${quote(object)}),triple(?event,'revision',?revision).
      newest(max(?revision)) :- version(?event,?revision).
      answer(?status) :- newest(?revision),version(?event,?revision),triple(?event,'status',?status).`,
    rowTags:['str']};
}

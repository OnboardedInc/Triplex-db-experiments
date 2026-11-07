import assert from 'node:assert/strict';

const end=9223372036854775807n;
const text=cell=>{assert.equal(cell.tag,'str');return cell.value;};
const integer=cell=>{assert.equal(cell.tag,'i64');return BigInt(cell.value);};
const field=(attribute,tag,value)=>({attribute,value:{tag,value}});
const quoted=JSON.stringify;
const interval=event=>[integer(event.payload.valid_from),event.payload.valid_to===null?end:integer(event.payload.valid_to)];
const coverageAttribute=policy=>'covers/'+policy;
const coverageKey=customer=>JSON.stringify(['coverage',customer]);
const claimKey=claim=>JSON.stringify(['claim',claim]);

export function coverageFields(workload){
  const seeds=workload.events.filter(event=>event.kind==='coverage_asserted');
  assert.equal(seeds.length,1,'Coverage fixture has one policy/customer relation');
  return 'coverage_customer:text;claim_at:int64;'+quoted(coverageAttribute(seeds[0].subject))+':boolean;';
}

export function nativeIntervalJoinWrite(workload,event,schema){
  const request={schema,version:1,type:'Row',entityId:event.subject,commandId:'event-'+event.id,
    validFrom:BigInt(event.occurred_at),validTo:end};
  if(workload.id==='03'){
    if(event.kind==='price_interval'){
      const [validFrom,validTo]=interval(event);
      // Local patches retain disjoint earlier prices under the same product key.
      return {method:'patch',request:{...request,validFrom,validTo,fields:[field('price','i64',integer(event.payload.price))]}};
    }
    assert.equal(event.kind,'purchase');
    return {method:'put',request:{...request,fields:[field('product','str',text(event.payload.product)),
      field('purchased_at','i64',integer(event.payload.purchased_at))]}};
  }
  assert.equal(workload.id,'04');
  const customer=text(event.payload.customer);
  if(event.kind==='claim')return {method:'put',request:{...request,entityId:claimKey(event.subject),fields:[
    field('coverage_customer','str',coverageKey(customer)),field('claim_at','i64',integer(event.payload.claim_at))]}};
  if(event.kind==='coverage_corrected'){
    const original=workload.events.find(candidate=>candidate.id===event.corrects);
    assert.ok(original?.kind==='coverage_asserted','Correction must identify the original coverage');
    assert.equal(original.subject,event.subject);
    assert.equal(text(original.payload.customer),customer);
  }else assert.equal(event.kind,'coverage_asserted');
  const [validFrom,validTo]=interval(event);
  // This entity holds one policy edge. Replacing its full interval retires the
  // prior knowledge version and keeps the claim records immutable.
  return {method:'put',request:{...request,entityId:coverageKey(customer),validFrom,validTo,
    fields:[field(coverageAttribute(event.subject),'bool',true)]}};
}

export async function initializeIntervalJoinProjection(engine,workload){
  if(workload.id==='03'){
    await engine.run(`CREATE TABLE price_state(event_id VARCHAR PRIMARY KEY,product VARCHAR,price BIGINT,
      valid_from BIGINT,valid_to BIGINT,known_from BIGINT)`);
    await engine.run(`CREATE TABLE purchase(purchase_id VARCHAR PRIMARY KEY,product VARCHAR,purchased_at BIGINT,
      occurred_at BIGINT,known_from BIGINT)`);
  }else{
    assert.equal(workload.id,'04');
    await engine.run(`CREATE TABLE coverage_state(event_id VARCHAR PRIMARY KEY,policy VARCHAR,customer VARCHAR,
      valid_from BIGINT,valid_to BIGINT,known_from BIGINT,known_to BIGINT)`);
    await engine.run(`CREATE TABLE claim(claim_id VARCHAR PRIMARY KEY,customer VARCHAR,claim_at BIGINT,
      occurred_at BIGINT,known_from BIGINT)`);
  }
}

export async function appendIntervalJoinProjection(engine,workload,event){
  const valid=BigInt(event.occurred_at),known=BigInt(event.recorded_at),p=event.payload;
  if(workload.id==='03'){
    if(event.kind==='price_interval')await engine.run('INSERT INTO price_state VALUES (?,?,?,?,?,?)',
      [event.id,event.subject,integer(p.price),...interval(event),known]);
    else{
      assert.equal(event.kind,'purchase');
      await engine.run('INSERT INTO purchase VALUES (?,?,?,?,?)',[event.subject,text(p.product),integer(p.purchased_at),valid,known]);
    }
  }else if(event.kind==='claim'){
    await engine.run('INSERT INTO claim VALUES (?,?,?,?,?)',[event.subject,text(p.customer),integer(p.claim_at),valid,known]);
  }else{
    const customer=text(p.customer);
    if(event.kind==='coverage_corrected'){
      const closed=await engine.run('UPDATE coverage_state SET known_to=? WHERE event_id=? AND known_to=? RETURNING policy,customer',
        [known,event.corrects,end]);
      assert.deepEqual(closed,[[event.subject,customer]]);
    }else assert.equal(event.kind,'coverage_asserted');
    await engine.run('INSERT INTO coverage_state VALUES (?,?,?,?,?,?,?)',
      [event.id,event.subject,customer,...interval(event),known,end]);
  }
}

const visible=(alias,at)=>`${alias}.valid_from<=${at} AND ${at}<${alias}.valid_to`;
const rawPrice=`price_state AS (
  SELECT subject product,CAST(json_extract_string(payload,'$.price.value') AS BIGINT) price,
    CAST(json_extract_string(payload,'$.valid_from.value') AS BIGINT) valid_from,
    coalesce(CAST(json_extract_string(payload,'$.valid_to.value') AS BIGINT),9223372036854775807::BIGINT) valid_to,
    recorded_at known_from FROM source_event WHERE kind='price_interval'
)`;
const rawPurchases=`purchase AS (
  SELECT subject purchase_id,json_extract_string(payload,'$.product.value') product,
    CAST(json_extract_string(payload,'$.purchased_at.value') AS BIGINT) purchased_at,occurred_at,recorded_at known_from
  FROM source_event WHERE kind='purchase'
)`;

function priceCasePlan(workload,entry,known,valid,nativeKnown){
  const p=entry.parameters;
  const request='WITH request AS (SELECT ?::BIGINT k,?::BIGINT v,?::VARCHAR product)';
  if(entry.operation==='state_at'){
    assert.equal(text(p.attribute),'price');
    const product=text(p.entity),params=[known,valid,product];
    const answer=` SELECT DISTINCT s.price FROM request r JOIN price_state s ON s.product=r.product
      WHERE s.known_from<=r.k AND ${visible('s','r.v')}`;
    return {naive:{sql:request+','+rawPrice+answer,params},direct:{sql:request+answer,params},
      program:`answer(?price) :- triple(${quoted(product)},'price',?price).`,rowTags:['i64']};
  }
  assert.equal(entry.operation,'price_at_purchase');
  const product=text(p.product),ids=[...new Set(p.purchase_ids.map(text))];
  assert.ok(ids.length>0);
  // The immutable packet requests all purchases for this product. Keep the
  // single positive EAV driver exact without a host-side answer filter.
  const productPurchases=workload.events.filter(event=>event.kind==='purchase'&&text(event.payload.product)===product);
  assert.deepEqual([...new Set(productPurchases.map(event=>event.subject))].sort(),[...ids].sort());
  const params=[known,valid,product,...ids];
  const answer=` SELECT DISTINCT p.purchase_id,s.price FROM request r
    JOIN purchase p ON p.product=r.product AND p.known_from<=r.k AND p.occurred_at<=r.v
    JOIN price_state s ON s.product=p.product AND s.known_from<=r.k AND ${visible('s','p.purchased_at')}
    WHERE p.purchase_id IN (${ids.map(()=>'?').join(',')})`;
  return {naive:{sql:request+','+rawPrice+','+rawPurchases+answer,params},direct:{sql:request+answer,params},
    program:`answer(${quoted(product)},?at,${nativeKnown},?purchase) :-
      triple(?purchase,'product',${quoted(product)}),triple(?purchase,'purchased_at',?at).`,
    lookup:{attribute:'price'},rowTags:['str','i64']};
}

const rawCoverage=`coverage_state AS (
  SELECT c.subject policy,json_extract_string(c.payload,'$.customer.value') customer,
    CAST(json_extract_string(c.payload,'$.valid_from.value') AS BIGINT) valid_from,
    coalesce(CAST(json_extract_string(c.payload,'$.valid_to.value') AS BIGINT),9223372036854775807::BIGINT) valid_to,
    c.recorded_at known_from,
    coalesce((SELECT min(x.recorded_at) FROM source_event x WHERE x.semantics='correction' AND x.corrects=c.event_id),
      9223372036854775807::BIGINT) known_to
  FROM source_event c WHERE c.kind IN ('coverage_asserted','coverage_corrected')
)`;
const rawClaims=`claim AS (
  SELECT subject claim_id,json_extract_string(payload,'$.customer.value') customer,
    CAST(json_extract_string(payload,'$.claim_at.value') AS BIGINT) claim_at,occurred_at,recorded_at known_from
  FROM source_event WHERE kind='claim'
)`;
const knownCoverage='s.known_from<=r.k AND r.k<s.known_to';

function coverageCasePlan(entry,known,valid,nativeKnown){
  const p=entry.parameters;
  const request='WITH request AS (SELECT ?::BIGINT k,?::BIGINT v,?::VARCHAR policy,';
  if(entry.operation==='relation_exists'){
    assert.equal(text(p.attribute),'covers');
    const policy=text(p.entity),customer=text(p.target),params=[known,valid,policy,customer];
    const cut=request+'?::VARCHAR customer)';
    const answer=` SELECT EXISTS (SELECT 1 FROM coverage_state s
      WHERE s.policy=r.policy AND s.customer=r.customer AND ${knownCoverage} AND ${visible('s','r.v')}) FROM request r`;
    const edge=`triple(${quoted(coverageKey(customer))},${quoted(coverageAttribute(policy))},true)`;
    return {naive:{sql:cut+','+rawCoverage+answer,params},direct:{sql:cut+answer,params},
      program:`answer(true) :- ${edge}. answer(false) :- !${edge}.`,rowTags:['bool']};
  }
  assert.equal(entry.operation,'coverage_at_claim');
  const policy=text(p.policy),claim=text(p.claim),params=[known,valid,policy,claim];
  const cut=request+'?::VARCHAR claim_id)';
  const answer=` SELECT EXISTS (SELECT 1 FROM claim c JOIN coverage_state s ON s.customer=c.customer
    WHERE c.claim_id=r.claim_id AND c.known_from<=r.k AND c.occurred_at<=r.v
      AND s.policy=r.policy AND ${knownCoverage} AND ${visible('s','c.claim_at')}) FROM request r`;
  const id=quoted(claimKey(claim));
  return {naive:{sql:cut+','+rawCoverage+','+rawClaims+answer,params},direct:{sql:cut+answer,params},
    program:`answer(?customer,?at,${nativeKnown}) :- triple(${id},'coverage_customer',?customer),triple(${id},'claim_at',?at).`,
    lookup:{attribute:coverageAttribute(policy),exists:true},rowTags:['bool']};
}

export function intervalJoinCasePlan(workload,entry,nativeKnown=0n){
  const known=BigInt(entry.cut.known_at),valid=BigInt(entry.cut.valid_at);
  return workload.id==='03'?priceCasePlan(workload,entry,known,valid,nativeKnown):
    coverageCasePlan(entry,known,valid,nativeKnown);
}

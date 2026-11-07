import assert from 'node:assert/strict';

const end=9223372036854775807n;
const text=cell=>{assert.equal(cell.tag,'str');return cell.value;};
const int=cell=>{assert.equal(cell.tag,'i64');return BigInt(cell.value);};
const bool=cell=>{assert.equal(cell.tag,'bool');assert.equal(typeof cell.value,'boolean');return cell.value;};
const field=(attribute,tag,value)=>({attribute,value:{tag,value}});
const featureKind=kind=>kind==='feature_interval'||kind==='feature_corrected';

function feature(event){
  return [event.subject,BigInt(event.occurred_at),event.payload.valid_to?int(event.payload.valid_to):end,int(event.payload.balance)];
}
function prediction(event){
  const p=event.payload;
  return [event.subject,text(p.customer),int(p.predicted_at),int(p.feature_known_at)];
}

export function nativeTrainingWrite(workload,event,schema,position){
  const validFrom=BigInt(event.occurred_at);
  const request={schema,version:1,type:'Row',entityId:event.subject,commandId:'event-'+event.id,validFrom,validTo:end};
  if(featureKind(event.kind)){
    const [entity,from,to,balance]=feature(event);
    if(event.kind==='feature_corrected'){
      const original=workload.events.find(item=>item.id===event.corrects);
      assert.ok(original&&featureKind(original.kind));
      assert.deepEqual(feature(original).slice(0,3),[entity,from,to]);
    }
    const first=workload.events.find(item=>featureKind(item.kind)&&item.subject===event.subject);
    return {method:first.id===event.id?'put':'patch',
      request:{...request,validFrom:from,validTo:to,fields:[field('balance','i64',balance)]}};
  }
  const capture=event.kind==='prediction'?event:
    workload.events.find(item=>item.kind==='prediction'&&item.subject===event.subject);
  assert.ok(capture,'Label requires its immutable prediction event');
  const [,customer,predictedAt,logicalFeatureCut]=prediction(capture);
  const featureKnown=position(logicalFeatureCut);
  const fields=[field('customer','str',customer),field('predicted_at','i64',predictedAt),
    field('feature_known_at','i64',featureKnown)];
  if(event.kind==='prediction')return {method:'put',request:{...request,fields}};
  assert.equal(event.kind,'outcome_label');
  assert.ok(validFrom>=BigInt(capture.occurred_at));
  fields.push(field('fraud','bool',bool(event.payload.fraud)));
  return {method:'patch',request:{...request,fields}};
}

export async function initializeTrainingProjection(engine){
  await engine.run('CREATE TABLE feature_state(source_event VARCHAR PRIMARY KEY,entity VARCHAR,valid_from BIGINT,valid_to BIGINT,balance BIGINT,known_from BIGINT,known_to BIGINT)');
  await engine.run('CREATE TABLE prediction(prediction_id VARCHAR PRIMARY KEY,customer VARCHAR,predicted_at BIGINT,feature_known_at BIGINT,valid_from BIGINT,known_from BIGINT)');
  await engine.run('CREATE TABLE outcome_label(event_id VARCHAR PRIMARY KEY,prediction_id VARCHAR,label BOOLEAN,valid_from BIGINT,known_from BIGINT)');
}

export async function appendTrainingProjection(engine,event){
  const known=BigInt(event.recorded_at),valid=BigInt(event.occurred_at);
  if(featureKind(event.kind)){
    if(event.kind==='feature_corrected'){
      const closed=await engine.run('UPDATE feature_state SET known_to=? WHERE source_event=? AND known_to=? RETURNING source_event,entity,valid_from,valid_to',
        [known,event.corrects,end]);
      assert.deepEqual(closed,[[event.corrects,...feature(event).slice(0,3)]]);
    }
    await engine.run('INSERT INTO feature_state VALUES (?,?,?,?,?,?,?)',[event.id,...feature(event),known,end]);
  }else if(event.kind==='prediction'){
    await engine.run('INSERT INTO prediction VALUES (?,?,?,?,?,?)',[...prediction(event),valid,known]);
  }else{
    assert.equal(event.kind,'outcome_label');
    await engine.run('INSERT INTO outcome_label VALUES (?,?,?,?,?)',[event.id,event.subject,bool(event.payload.fraud),valid,known]);
  }
}

const naiveFeatures=`raw_features AS (
  SELECT event_id,subject entity,occurred_at valid_from,recorded_at known_from,
    coalesce(CAST(json_extract_string(payload,'$.valid_to.value') AS BIGINT),9223372036854775807) valid_to,
    CAST(json_extract_string(payload,'$.balance.value') AS BIGINT) balance
  FROM source_event WHERE kind IN('feature_interval','feature_corrected')
)`;
const atFeatureCut=(known,valid,alias='f')=>
  `${alias}.valid_from<=${valid} AND ${valid}<${alias}.valid_to AND ${alias}.known_from<=${known}`;
const naiveCurrent=known=>
  `NOT EXISTS (SELECT 1 FROM source_event c WHERE c.semantics='correction'
      AND c.corrects=f.event_id AND c.recorded_at<=${known})`;

export function trainingCasePlan(entry){
  const known=BigInt(entry.cut.known_at),valid=BigInt(entry.cut.valid_at);
  if(entry.operation==='state_at'){
    const entity=text(entry.parameters.entity);
    assert.equal(text(entry.parameters.attribute),'balance');
    const request='WITH request AS (SELECT ?::BIGINT k,?::BIGINT v,?::VARCHAR entity)';
    const params=[known,valid,entity];
    return {naive:{sql:`${request},${naiveFeatures} SELECT DISTINCT f.balance FROM raw_features f,request r
      WHERE f.entity=r.entity AND ${atFeatureCut('r.k','r.v')} AND ${naiveCurrent('r.k')}`,params},
    direct:{sql:`${request} SELECT DISTINCT f.balance FROM feature_state f,request r
      WHERE f.entity=r.entity AND ${atFeatureCut('r.k','r.v')} AND r.k<f.known_to`,params},
    program:`answer(?balance) :- triple(${JSON.stringify(entity)},'balance',?balance).`,rowTags:['i64']};
  }
  assert.equal(entry.operation,'training_example');
  const id=text(entry.parameters.prediction),attribute=text(entry.parameters.feature);
  assert.equal(attribute,'balance');
  const request='WITH request AS (SELECT ?::BIGINT k,?::BIGINT v,?::VARCHAR id)';
  const params=[known,valid,id];
  const join=featureTable=>`l.prediction_id=p.prediction_id AND l.valid_from<=r.v AND l.known_from<=r.k
    JOIN ${featureTable} f ON f.entity=p.customer AND ${atFeatureCut('p.feature_known_at','p.predicted_at')}`;
  const where='p.prediction_id=r.id AND p.valid_from<=r.v AND p.known_from<=r.k';
  const projection='SELECT DISTINCT p.prediction_id,f.balance,l.label FROM request r CROSS JOIN prediction p JOIN outcome_label l ON ';
  return {naive:{sql:`${request},${naiveFeatures},prediction AS (
      SELECT subject prediction_id,json_extract_string(payload,'$.customer.value') customer,
        CAST(json_extract_string(payload,'$.predicted_at.value') AS BIGINT) predicted_at,
        CAST(json_extract_string(payload,'$.feature_known_at.value') AS BIGINT) feature_known_at,
        occurred_at valid_from,recorded_at known_from FROM source_event WHERE kind='prediction'
    ),outcome_label AS (
      SELECT subject prediction_id,CAST(json_extract_string(payload,'$.fraud.value') AS BOOLEAN) label,
        occurred_at valid_from,recorded_at known_from FROM source_event WHERE kind='outcome_label'
    ) ${projection}${join('raw_features')}
    WHERE ${where} AND ${naiveCurrent('p.feature_known_at')}`,params},
    direct:{sql:`${request} ${projection}${join('feature_state')}
    WHERE ${where} AND p.feature_known_at<f.known_to`,params},
    program:`answer(?customer,?valid,?known,${JSON.stringify(id)},?label) :-
      triple(${JSON.stringify(id)},'customer',?customer),
      triple(${JSON.stringify(id)},'predicted_at',?valid),
      triple(${JSON.stringify(id)},'feature_known_at',?known),
      triple(${JSON.stringify(id)},'fraud',?label).`,
    lookup:{attribute,columnOrder:[0,2,1]},rowTags:['str','i64','bool']};
}

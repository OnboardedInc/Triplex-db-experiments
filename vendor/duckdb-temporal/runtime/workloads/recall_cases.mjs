import assert from 'node:assert/strict';

const infinity=9223372036854775807n;
const text=cell=>{assert.equal(cell.tag,'str');return cell.value;};
const field=(attribute,value)=>({attribute,value:{tag:'str',value}});
const edgeFields=(input,output)=>[field('input_lot',input),field('output_lot',output)];
const productionId=event=>JSON.stringify(['production',event]);

export function nativeRecallWrite(workload,event,schema){
  const request={schema,version:1,type:'Row',commandId:'event-'+event.id,
    validFrom:BigInt(event.occurred_at),validTo:infinity};
  if(event.kind==='shipment')return {method:'put',request:{...request,entityId:event.id,
    fields:[field('shipped_lot',event.subject),field('customer',text(event.payload.customer))]}};
  if(event.kind==='production_record'){
    const input=text(event.payload.input),output=text(event.payload.output);
    assert.equal(event.payload.contaminated_input.tag,'bool');
    assert.equal(typeof event.payload.contaminated_input.value,'boolean');
    const members=[{operation:'put',type:'Row',entityId:productionId(event.id),
      validFrom:request.validFrom,validTo:infinity,fields:edgeFields(input,output)}];
    // The contamination declaration has an independent canonical identity.
    // Correcting production genealogy preserves this declaration.
    if(event.payload.contaminated_input.value)members.push({operation:'put',type:'Row',
      entityId:JSON.stringify(['contamination',event.id]),validFrom:request.validFrom,validTo:infinity,
      fields:[field('contaminated_lot',input)]});
    return {method:'batch',request:{schema,version:1,commandId:request.commandId,members}};
  }
  assert.equal(event.kind,'input_corrected');
  const original=workload.events.find(candidate=>candidate.id===event.corrects);
  assert.equal(original?.kind,'production_record','Recall baseline corrects one original production edge');
  assert.equal(text(original.payload.input),text(event.payload.old_input));
  assert.equal(text(original.payload.output),event.subject);
  assert.ok(request.validFrom>=BigInt(original.occurred_at));
  return {method:'patch',request:{...request,entityId:productionId(original.id),
    fields:edgeFields(text(event.payload.new_input),event.subject)}};
}

export async function initializeRecallProjection(engine){
  await engine.run(`CREATE TABLE production_edge(source_event VARCHAR,src VARCHAR,dst VARCHAR,valid_from BIGINT,
    valid_to BIGINT,known_from BIGINT,known_to BIGINT,PRIMARY KEY(source_event,valid_from,known_from))`);
  await engine.run('CREATE TABLE contamination(event_id VARCHAR PRIMARY KEY,lot VARCHAR,valid_from BIGINT,known_from BIGINT)');
  await engine.run('CREATE TABLE shipment(event_id VARCHAR PRIMARY KEY,lot VARCHAR,customer VARCHAR,valid_from BIGINT,known_from BIGINT)');
}

export async function appendRecallProjection(engine,event){
  const valid=BigInt(event.occurred_at),known=BigInt(event.recorded_at),p=event.payload;
  if(event.kind==='shipment'){
    await engine.run('INSERT INTO shipment VALUES (?,?,?,?,?)',[event.id,event.subject,text(p.customer),valid,known]);
    return;
  }
  const insert='INSERT INTO production_edge VALUES (?,?,?,?,?,?,?)';
  if(event.kind==='production_record'){
    const input=text(p.input);
    await engine.run(insert,[event.id,input,text(p.output),valid,infinity,known,infinity]);
    if(p.contaminated_input.value)await engine.run('INSERT INTO contamination VALUES (?,?,?,?)',[event.id,input,valid,known]);
  }else{
    assert.equal(event.kind,'input_corrected');
    const old=await engine.run(`UPDATE production_edge SET known_to=? WHERE source_event=? AND known_to=?
      RETURNING src,dst,valid_from,valid_to`,[known,event.corrects,infinity]);
    assert.equal(old.length,1);
    const [src,dst,start,stop]=old[0];
    assert.deepEqual([src,dst],[text(p.old_input),event.subject]);
    assert.ok(start<=valid && valid<stop);
    if(start<valid)await engine.run(insert,[event.corrects,src,dst,start,valid,known,infinity]);
    await engine.run(insert,[event.id,text(p.new_input),event.subject,valid,stop,known,infinity]);
  }
}

const request='WITH RECURSIVE requested AS (SELECT ?::BIGINT known_at,?::BIGINT valid_at,?::VARCHAR lot)';
const replay=`, edge_version AS (
  SELECT event_id,json_extract_string(payload,'$.input.value') src,json_extract_string(payload,'$.output.value') dst,
    occurred_at valid_from,recorded_at known_from FROM source_event WHERE kind='production_record'
  UNION ALL SELECT event_id,json_extract_string(payload,'$.new_input.value'),subject,occurred_at,recorded_at
    FROM source_event WHERE kind='input_corrected'
), edge AS (
  SELECT DISTINCT e.src,e.dst FROM edge_version e CROSS JOIN requested cut
  WHERE e.known_from<=cut.known_at AND e.valid_from<=cut.valid_at
    AND NOT EXISTS (SELECT 1 FROM source_event c WHERE c.kind='input_corrected' AND c.corrects=e.event_id
      AND c.recorded_at<=cut.known_at AND c.occurred_at<=cut.valid_at)
), contaminated AS (
  SELECT json_extract_string(payload,'$.input.value') lot FROM source_event CROSS JOIN requested cut
  WHERE kind='production_record' AND json_extract_string(payload,'$.contaminated_input.value')='true'
    AND recorded_at<=cut.known_at AND occurred_at<=cut.valid_at
), shipped AS (
  SELECT subject lot,json_extract_string(payload,'$.customer.value') customer FROM source_event CROSS JOIN requested cut
  WHERE kind='shipment' AND recorded_at<=cut.known_at AND occurred_at<=cut.valid_at
)`;
const direct=`, edge AS (
  SELECT DISTINCT src,dst FROM production_edge CROSS JOIN requested cut
  WHERE known_from<=cut.known_at AND cut.known_at<known_to AND valid_from<=cut.valid_at AND cut.valid_at<valid_to
), contaminated AS (
  SELECT c.lot FROM contamination c CROSS JOIN requested cut
  WHERE c.known_from<=cut.known_at AND c.valid_from<=cut.valid_at
), shipped AS (
  SELECT s.lot,s.customer FROM shipment s CROSS JOIN requested cut
  WHERE s.known_from<=cut.known_at AND s.valid_from<=cut.valid_at
)`;
const answer=`, affected(lot) AS (
  SELECT cut.lot FROM requested cut JOIN contaminated c ON c.lot=cut.lot
  UNION SELECT e.dst FROM affected a JOIN edge e ON e.src=a.lot
) SELECT DISTINCT s.customer FROM affected a JOIN shipped s ON s.lot=a.lot`;

export function recallCasePlan(entry){
  assert.equal(entry.operation,'recalled_customers');
  const origin=text(entry.parameters.contaminated_lot);
  const params=[BigInt(entry.cut.known_at),BigInt(entry.cut.valid_at),origin];
  return {naive:{sql:request+replay+answer,params},direct:{sql:request+direct+answer,params},
    program:`edge(?input,?output) :- triple(?e,'input_lot',?input),triple(?e,'output_lot',?output).
      affected(${JSON.stringify(origin)}) :- triple(?declaration,'contaminated_lot',${JSON.stringify(origin)}).
      affected(?output) :- affected(?input),edge(?input,?output).
      answer(?customer) :- affected(?lot),triple(?shipment,'shipped_lot',?lot),triple(?shipment,'customer',?customer).`,
    rowTags:['str']};
}

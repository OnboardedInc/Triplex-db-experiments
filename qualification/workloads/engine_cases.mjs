// @ts-nocheck -- [EXP-CHECKJS] unannotated dynamic parameters; dynamic record keys. Binding errors remain checked by lab/bin/checkjs.mjs.
import assert from 'node:assert/strict';
import {nativeWebhookWrite,webhookCasePlan} from './webhook_cases.mjs';
import {dependencyCasePlan,nativeDependencyWrite} from './dependency_cases.mjs';
import {nativeTrainingWrite,trainingCasePlan} from './training_cases.mjs';
import {nativeUptimeWrite,uptimeCasePlan} from './uptime_cases.mjs';
import {containmentCasePlan,nativeContainmentWrite} from './containment_cases.mjs';
import {nativeSupportWrite,supportCasePlan} from './support_cases.mjs';
import {coverageFields,intervalJoinCasePlan,nativeIntervalJoinWrite} from './interval_join_cases.mjs';
import {nativeRecallWrite,recallCasePlan} from './recall_cases.mjs';
import {funnelCasePlan} from './funnel_cases.mjs';
import {accessCasePlan,accessFields,accessWorkloads,nativeAccessWrite} from './access_cases.mjs';

export const supportedWorkloads = Object.freeze(['01','02','03','04','05','06','07','08','09','10',...accessWorkloads,'13','14','15','16','17','18','19','20']);
export const infinity = 9223372036854775807n;
export const beginning = -9223372036854775808n;
const text = cell => {assert.equal(cell.tag,'str');return cell.value;};
const integer = cell => {assert.equal(cell.tag,'i64');return BigInt(cell.value);};
const boolean = cell => {assert.equal(cell.tag,'bool');assert.equal(typeof cell.value,'boolean');return cell.value;};
const literal = value => JSON.stringify(value);
const schemaFields = Object.freeze({
  '01':'status:text;',
  '02':'address:text;',
  '03':'price:int64;product:text;purchased_at:int64;',
  '05':'webhook_object:text;revision:int64;status:text;',
  '06':'account:text;amount:int64;currency:text;reverses:text;',
  '07':'sku:text;ledger:text;delta:int64;',
  '08':'customer:text;capture:text;amount:int64 required;currency:text required;',
  '09':'subject:text;subscription:text;paid:boolean;entitled:boolean;',
  '10':'subject:text;started_at:int64;deadline:int64;source:text;through:int64;completed_at:int64;',
  '13':'parent:text;child:text;',
  '14':'input_lot:text;output_lot:text;contaminated_lot:text;shipped_lot:text;customer:text;',
  '15':'dependency_source:text;dependency_target:text;application:text;environment:text;vulnerable_subject:text;vulnerable:boolean;',
  '16':'subject:text;output:text;input_a:text;input_b:text;input:text;code_version:int64;',
  '17':'session:text;step:text;at:int64;',
  '18':'machine:text required;',
  '19':'balance:int64;customer:text;predicted_at:int64;feature_known_at:int64;fraud:boolean;',
  '20':'edge_source:text;edge_target:text;',
});

export function eventGroups(workload) {
  const groups = new Map();
  for (const event of workload.events) {
    const position=BigInt(event.recorded_at);
    if (!groups.has(position)) groups.set(position,[]);
    groups.get(position).push(event);
  }
  return [...groups].sort(([left],[right])=>left<right?-1:left>right?1:0);
}

export function positionAt(groups,knownAt) {
  let position=0n;
  for (const group of groups) if (group.logicalPosition<=knownAt) position=group.nativePosition;
  return position;
}

export function schemaFor(workload) {
  assert.ok(supportedWorkloads.includes(workload.id),'Unimplemented workload');
  const fields=workload.id==='04'?coverageFields(workload):accessWorkloads.includes(workload.id)?accessFields:schemaFields[workload.id];
  return {name:'workload_'+workload.id,dsl:`schema workload_${workload.id} version 1 {entity Row {${fields}}}`};
}

export function nativeWrite(workload,event,position) {
  if(workload.id==='14')return nativeRecallWrite(workload,event,schemaFor(workload).name);
  if(workload.id==='05')return nativeWebhookWrite(event,schemaFor(workload).name);
  if(workload.id==='15')return nativeDependencyWrite(event,schemaFor(workload).name);
  if(workload.id==='03'||workload.id==='04')return nativeIntervalJoinWrite(workload,event,schemaFor(workload).name);
  if(workload.id==='20')return nativeSupportWrite(workload,event,schemaFor(workload).name);
  if(workload.id==='19')return nativeTrainingWrite(workload,event,schemaFor(workload).name,position);
  if(workload.id==='18')return nativeUptimeWrite(event,schemaFor(workload).name);
  if(workload.id==='13')return nativeContainmentWrite(event,schemaFor(workload).name);
  if(accessWorkloads.includes(workload.id))return nativeAccessWrite(workload,event,schemaFor(workload).name);
  const state=workload.id==='01'||workload.id==='02';
  const fields=Object.entries(event.payload).map(([attribute,cell])=>({
    attribute,value:{tag:cell.tag,value:cell.tag==='i64'?integer(cell):cell.tag==='bool'?boolean(cell):text(cell)},
  }));
  if(['09','10','16'].includes(workload.id))fields.push({attribute:'subject',value:{tag:'str',value:event.subject}});
  const first=state?eventGroups(workload).flatMap(([,events])=>events).find(candidate=>candidate.subject===event.subject):null;
  return {method:state&&first.id!==event.id?'patch':'put',request:{schema:schemaFor(workload).name,version:1,type:'Row',
    entityId:state?event.subject:event.id,commandId:'event-'+event.id,fields,
    validFrom:event.kind==='watermark'?beginning:BigInt(event.occurred_at),validTo:infinity}};
}

const paidWithoutEntitlement=(known,valid)=>({
  naive:{sql:`SELECT DISTINCT json_extract_string(p.payload,'$.subscription.value') AS subscription FROM source_event p
    WHERE p.kind='payment' AND p.recorded_at<=? AND p.occurred_at<=?
      AND json_extract_string(p.payload,'$.paid.value')='true'
      AND NOT EXISTS (SELECT 1 FROM source_event e WHERE e.kind='entitlement'
        AND e.subject=json_extract_string(p.payload,'$.subscription.value')
        AND e.recorded_at<=? AND e.occurred_at<=? AND json_extract_string(e.payload,'$.entitled.value')='true')`,
    params:[known,valid,known,valid]},
  direct:{sql:`SELECT DISTINCT p.subscription FROM payment p
    WHERE p.known_from<=? AND p.valid_from<=? AND p.paid
      AND NOT EXISTS (SELECT 1 FROM entitlement e WHERE e.subscription=p.subscription
        AND e.known_from<=? AND e.valid_from<=? AND e.entitled)`,params:[known,valid,known,valid]},
  program:`paid(?subscription) :- triple(?payment,'subscription',?subscription),triple(?payment,'paid',true).
    entitled(?subscription) :- triple(?entitlement,'subject',?subscription),triple(?entitlement,'entitled',true).
    answer(?subscription) :- paid(?subscription), !entitled(?subscription).`,
  rowTags:['str'],
});

const workflowStatusSQL=`SELECT CASE WHEN terminal.first_completion>s.deadline THEN 'completed_late'
    WHEN terminal.first_completion IS NOT NULL THEN 'completed'
    WHEN requested.valid_at<s.deadline THEN 'in_progress'
    WHEN completeness.certified_through>=s.deadline THEN 'overdue'
    ELSE 'pending_knowledge' END status
  FROM workflow_start s CROSS JOIN requested
  LEFT JOIN LATERAL (SELECT min(c.completed_at) first_completion FROM terminal_completion c
    WHERE c.workflow=s.workflow AND c.feed=s.feed AND c.known_from<=requested.known_at
      AND c.valid_from<=requested.valid_at) terminal ON TRUE
  LEFT JOIN LATERAL (SELECT max(w.through_at) certified_through FROM terminal_watermark w
    WHERE w.feed=s.feed AND w.known_from<=requested.known_at) completeness ON TRUE
  WHERE s.workflow=requested.workflow AND s.known_from<=requested.known_at AND s.valid_from<=requested.valid_at`;

function workflowStatus(workflow,known,valid) {
  const requested='WITH requested AS (SELECT ?::BIGINT known_at,?::BIGINT valid_at,?::VARCHAR workflow)';
  const params=[known,valid,workflow];
  return {
    naive:{sql:requested+`,workflow_start AS (
      SELECT subject workflow,recorded_at known_from,occurred_at valid_from,json_extract_string(payload,'$.source.value') feed,
        CAST(json_extract_string(payload,'$.deadline.value') AS BIGINT) deadline FROM source_event WHERE kind='workflow_started'
    ),terminal_completion AS (
      SELECT subject workflow,recorded_at known_from,occurred_at valid_from,json_extract_string(payload,'$.source.value') feed,
        CAST(json_extract_string(payload,'$.completed_at.value') AS BIGINT) completed_at FROM source_event WHERE kind='workflow_completed'
    ),terminal_watermark AS (
      SELECT subject feed,recorded_at known_from,CAST(json_extract_string(payload,'$.through.value') AS BIGINT) through_at
      FROM source_event WHERE kind='watermark'
    ) `+workflowStatusSQL,params},
    direct:{sql:requested+' '+workflowStatusSQL,params},
    program:`start(?feed,?deadline) :- triple(?s,'subject',${literal(workflow)}),triple(?s,'source',?feed),triple(?s,'deadline',?deadline).
      terminal(?feed,?deadline,?at) :- start(?feed,?deadline),triple(?c,'subject',${literal(workflow)}),
        triple(?c,'source',?feed),triple(?c,'completed_at',?at).
      first_completion(?feed,?deadline,min(?at)) :- terminal(?feed,?deadline,?at).
      terminal_seen(?feed,?deadline) :- first_completion(?feed,?deadline,?at).
      source_complete(?feed,?deadline) :- start(?feed,?deadline),triple(?w,'subject',?feed),
        triple(?w,'through',?through),[?through>=?deadline].
      answer('completed_late') :- first_completion(?feed,?deadline,?at),[?at>?deadline].
      answer('completed') :- first_completion(?feed,?deadline,?at),[?at<=?deadline].
      answer('in_progress') :- start(?feed,?deadline),!terminal_seen(?feed,?deadline),[${valid}<?deadline].
      answer('overdue') :- source_complete(?feed,?deadline),!terminal_seen(?feed,?deadline),[${valid}>=?deadline].
      answer('pending_knowledge') :- start(?feed,?deadline),!terminal_seen(?feed,?deadline),!source_complete(?feed,?deadline),[${valid}>=?deadline].`,
    rowTags:['str'],
  };
}

function customerRevenue(customer,currency,known,valid) {
  const requested='WITH requested AS (SELECT ?::BIGINT known_at,?::BIGINT valid_at,?::VARCHAR customer,?::VARCHAR currency)';
  const answer=`, visible_captures AS (SELECT capture.* FROM capture CROSS JOIN requested cut
    WHERE capture.customer=cut.customer AND capture.currency=cut.currency AND known_from<=cut.known_at AND valid_from<=cut.valid_at)
  SELECT (coalesce((SELECT sum(amount) FROM visible_captures),0)
    -coalesce((SELECT sum(refund.amount) FROM refund JOIN visible_captures ON visible_captures.event_id=refund.capture_id
      CROSS JOIN requested cut WHERE refund.currency=cut.currency AND refund.known_from<=cut.known_at AND refund.valid_from<=cut.valid_at),0))::BIGINT`;
  const raw=`, capture AS (SELECT event_id,recorded_at known_from,occurred_at valid_from,
    json_extract_string(payload,'$.customer.value') customer,json_extract_string(payload,'$.currency.value') currency,
    CAST(json_extract_string(payload,'$.amount.value') AS BIGINT) amount FROM source_event WHERE kind='capture'
  ), refund AS (SELECT event_id,recorded_at known_from,occurred_at valid_from,json_extract_string(payload,'$.capture.value') capture_id,
    json_extract_string(payload,'$.currency.value') currency,CAST(json_extract_string(payload,'$.amount.value') AS BIGINT) amount
    FROM source_event WHERE kind='refund')`;
  const params=[known,valid,customer,currency];
  return {naive:{sql:requested+raw+answer,params},direct:{sql:requested+answer,params},
    program:`gross(?capture,?amount) :- triple(?capture,'customer',${literal(customer)}),triple(?capture,'currency',${literal(currency)}),
      triple(?capture,'amount',?amount).
      net(?capture,?amount) :- gross(?capture,?amount).
      net(?refund,[0-?amount]) :- gross(?capture,?gross),triple(?refund,'capture',?capture),triple(?refund,'currency',${literal(currency)}),
        triple(?refund,'amount',?amount).
      answer(sum_i64(?amount)) :- net(?event,?amount).`,
    rowTags:['i64']};
}

function outputLineage(output,known,valid) {
  const requested='WITH requested AS (SELECT ?::BIGINT known_at,?::BIGINT valid_at,?::VARCHAR dataset)';
  const raw=`, run_version AS (
    SELECT subject run_id,recorded_at known_from,occurred_at valid_from,json_extract_string(payload,'$.output.value') dataset,
      CAST(json_extract_string(payload,'$.code_version.value') AS BIGINT) version FROM source_event WHERE kind='run_completed'
  ), run_input AS (
    SELECT subject run_id,recorded_at known_from,occurred_at valid_from,inputs.input
    FROM source_event CROSS JOIN LATERAL (VALUES (json_extract_string(payload,'$.input_a.value')),
      (json_extract_string(payload,'$.input_b.value'))) inputs(input) WHERE kind='run_completed'
    UNION ALL SELECT subject,recorded_at,occurred_at,json_extract_string(payload,'$.input.value')
    FROM source_event WHERE kind='lineage_metadata_added'
  )`;
  const answer=` SELECT DISTINCT i.input,v.version FROM run_version v JOIN run_input i USING(run_id) CROSS JOIN requested cut
    WHERE v.dataset=cut.dataset AND v.known_from<=cut.known_at AND v.valid_from<=cut.valid_at
      AND i.known_from<=cut.known_at AND i.valid_from<=cut.valid_at`;
  const params=[known,valid,output];
  const sources=['input_a','input_b','input'].map(field=>
    `lineage(?run,?input) :- triple(?event,'subject',?run),triple(?event,${literal(field)},?input).`).join(' ');
  return {naive:{sql:requested+raw+answer,params},direct:{sql:requested+answer,params},
    program:`${sources} answer(?input,?version) :- triple(?event,'output',${literal(output)}),triple(?event,'subject',?run),
      triple(?event,'code_version',?version),lineage(?run,?input).`,rowTags:['str','i64']};
}

export function casePlan(workload,entry,nativeKnown) {
  if(workload.id==='14')return recallCasePlan(entry);
  if(workload.id==='17')return funnelCasePlan(entry);
  if(workload.id==='05')return webhookCasePlan(entry);
  if(workload.id==='15')return dependencyCasePlan(entry);
  if(workload.id==='03'||workload.id==='04')return intervalJoinCasePlan(workload,entry,nativeKnown);
  if(workload.id==='20')return supportCasePlan(workload,entry);
  if(workload.id==='19')return trainingCasePlan(entry);
  if(workload.id==='18')return uptimeCasePlan(entry);
  if(workload.id==='13')return containmentCasePlan(entry);
  if(accessWorkloads.includes(workload.id))return accessCasePlan(workload,entry);
  const params=entry.parameters,known=BigInt(entry.cut.known_at),valid=BigInt(entry.cut.valid_at);
  if(workload.id==='09')return paidWithoutEntitlement(known,valid);
  if(workload.id==='10')return workflowStatus(text(params.workflow),known,valid);
  if(workload.id==='08')return customerRevenue(text(params.customer),text(params.currency),known,valid);
  if(workload.id==='16')return outputLineage(text(params.output),known,valid);
  if (workload.id==='01'||workload.id==='02') {
    const attribute=text(params.attribute),entity=text(params.entity);
    const naive=`SELECT json_extract_string(payload,'$.${attribute}.value') FROM source_event
      WHERE subject=? AND recorded_at<=? AND occurred_at<=?
      ORDER BY occurred_at DESC,recorded_at DESC LIMIT 1`;
    const direct=`SELECT value FROM state_history WHERE entity=? AND known_from<=? AND ?<known_to
      AND valid_from<=? AND ?<valid_to`;
    return {naive:{sql:naive,params:[entity,known,valid]},direct:{sql:direct,params:[entity,known,known,valid,valid]},
      program:`answer(?value) :- triple(${literal(entity)},${literal(attribute)},?value).`,rowTags:['str']};
  }
  if (workload.id==='06') {
    const account=text(params.account),currency=text(params.currency);
    return {naive:{sql:`SELECT coalesce(sum(CAST(json_extract_string(payload,'$.amount.value') AS BIGINT)),0)::BIGINT
      FROM source_event WHERE recorded_at<=? AND occurred_at<=?
      AND json_extract_string(payload,'$.account.value')=? AND json_extract_string(payload,'$.currency.value')=?`,
      params:[known,valid,account,currency]},
    direct:{sql:'SELECT coalesce(sum(amount),0)::BIGINT FROM posting WHERE known_from<=? AND valid_from<=? AND account=? AND currency=?',
      params:[known,valid,account,currency]},
    program:`source(?event,?amount) :- triple(?event,'account',${literal(account)}),triple(?event,'currency',${literal(currency)}),triple(?event,'amount',?amount). answer(sum_i64(?amount)) :- source(?event,?amount).`,
    rowTags:['i64']};
  }
  assert.equal(workload.id,'07','Unimplemented workload');
  const sku=text(params.sku);
  return {naive:{sql:`SELECT json_extract_string(payload,'$.ledger.value') ledger,
    sum(CAST(json_extract_string(payload,'$.delta.value') AS BIGINT))::BIGINT FROM source_event
    WHERE recorded_at<=? AND occurred_at<=? AND json_extract_string(payload,'$.sku.value')=? GROUP BY ledger`,params:[known,valid,sku]},
  direct:{sql:'SELECT ledger,sum(delta)::BIGINT FROM movement WHERE known_from<=? AND valid_from<=? AND sku=? GROUP BY ledger',params:[known,valid,sku]},
  program:`source(?event,?ledger,?delta) :- triple(?event,'sku',${literal(sku)}),triple(?event,'ledger',?ledger),triple(?event,'delta',?delta). answer(?ledger,sum_i64(?delta)) :- source(?event,?ledger,?delta).`,
  rowTags:['str','i64'],projection:'inventory_balance'};
}

export function wireRows(rows,tags) {
  return rows.map(row=>row.map((value,index)=>{
    const tag=tags[index];
    if (tag==='i64') {assert.equal(typeof value,'bigint');return {tag,value:String(value)};}
    if (tag==='bool') {assert.equal(typeof value,'boolean');return {tag,value};}
    assert.equal(typeof value,'string');return {tag,value};
  }));
}

export function completeRows(rows,plan) {
  if (plan.projection!=='inventory_balance') return rows;
  const values=new Map(rows.map(row=>[row[0].value,BigInt(row[1].value)]));
  const physical=values.get('physical')??0n,reserved=values.get('reservation')??0n;
  return [[physical,reserved,physical-reserved].map(value=>({tag:'i64',value:String(value)}))];
}

export function assertAnswer(actual,expected) {
  const keys=rows=>rows.map(row=>JSON.stringify(row)).sort();
  assert.deepEqual(keys(actual),keys(expected));
}

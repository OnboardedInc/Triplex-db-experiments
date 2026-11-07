import assert from 'node:assert/strict';

export const accessWorkloads=['11','12'];
export const accessFields='kind:text;subject:text;target:text;principal:text many;';
const infinity=9223372036854775807n;
const text=(cell)=>{
  assert.equal(cell.tag,'str');
  return cell.value;
};
const attr=(attribute,value)=>({attribute,value:{tag:'str',value}});
const quote=JSON.stringify;

export function accessProjection(event) {
  const p=event.payload;
  switch(event.kind) {
    case 'membership':return ['membership',event.subject,text(p.member_of),[]];
    case 'resource_parent':return ['resource_parent',event.subject,text(p.parent),[]];
    case 'grant':return ['grant',event.subject,text(p.can_read),[]];
    case 'access_edges':return ['support',event.subject,text(p.resource),[text(p.team_a),text(p.team_b)]];
    case 'access_block':return ['block',event.subject,text(p.blocked_resource),[]];
    case 'grant_retracted':return ['revoke',event.subject,text(p.resource),[]];
    default:throw new Error('Unknown access projection '+event.kind);
  }
}

function validTo(event) {
  return event.payload.valid_to ? BigInt(event.payload.valid_to.value) : infinity;
}

export function nativeAccessWrite(workload,event,schema) {
  const base={schema,version:1,type:'Row',commandId:'event-'+event.id};
  if(event.kind==='block_corrected'){
    const original=workload.events.find(candidate=>candidate.id===event.corrects);
    assert.equal(original?.kind,'access_block');
    return {method:'patch',request:{...base,entityId:original.id,fields:[],
      validFrom:BigInt(original.occurred_at),validTo:validTo(original)}};
  }
  const [kind,subject,target,principals]=accessProjection(event);
  return {method:'put',request:{...base,entityId:event.id,validFrom:BigInt(event.occurred_at),validTo:validTo(event),
    fields:[attr('kind',kind),attr('subject',subject),attr('target',target),...principals.map(value=>attr('principal',value))]}};
}

export async function appendAccessProjection(engine,event) {
  const known=BigInt(event.recorded_at);
  if(event.kind==='block_corrected'){
    const closed=await engine.run("UPDATE access_edge SET known_to=? WHERE event_id=? AND kind='block' AND known_to=? RETURNING event_id",
      [known,event.corrects,infinity]);
    assert.deepEqual(closed,[[event.corrects]]);
    return;
  }
  const [kind,subject,target,principals]=accessProjection(event);
  for(const [ordinal,principal] of (principals.length?principals:[null]).entries()){
    await engine.run('INSERT INTO access_edge VALUES (?,?,?,?,?,?,?,?,?,?)',
      [event.id,ordinal,kind,subject,target,principal,BigInt(event.occurred_at),validTo(event),known,infinity]);
  }
}

const requested='WITH RECURSIVE requested AS (SELECT ?::BIGINT known_at,?::BIGINT valid_at,?::VARCHAR actor,?::VARCHAR resource,?::VARCHAR action)';
const rawAccess=`, input AS (
  SELECT src.* FROM source_event src CROSS JOIN requested cut
  WHERE src.recorded_at<=cut.known_at AND src.occurred_at<=cut.valid_at
    AND cut.valid_at<coalesce(CAST(json_extract_string(src.payload,'$.valid_to.value') AS BIGINT),9223372036854775807)
    AND NOT EXISTS (SELECT 1 FROM source_event correction
      WHERE correction.corrects=src.event_id AND correction.recorded_at<=cut.known_at)
), edge AS (
  SELECT CASE kind WHEN 'access_block' THEN 'block' WHEN 'grant_retracted' THEN 'revoke' ELSE kind END kind,
    subject,CASE kind WHEN 'membership' THEN json_extract_string(payload,'$.member_of.value')
      WHEN 'resource_parent' THEN json_extract_string(payload,'$.parent.value')
      WHEN 'grant' THEN json_extract_string(payload,'$.can_read.value')
      WHEN 'access_block' THEN json_extract_string(payload,'$.blocked_resource.value')
      ELSE json_extract_string(payload,'$.resource.value') END target,NULL::VARCHAR principal
    FROM input WHERE kind IN ('membership','resource_parent','grant','access_block','grant_retracted')
  UNION ALL
  SELECT 'support',subject,json_extract_string(payload,'$.resource.value'),team.principal
    FROM input CROSS JOIN LATERAL (VALUES(json_extract_string(payload,'$.team_a.value')),
      (json_extract_string(payload,'$.team_b.value'))) team(principal) WHERE kind='access_edges'
)`;
const directAccess=`, edge AS (SELECT kind,subject,target,principal FROM access_edge CROSS JOIN requested cut
 WHERE known_from<=cut.known_at AND cut.known_at<known_to AND valid_from<=cut.valid_at AND cut.valid_at<valid_to)`;
const inheritedAnswer=`, principals(id) AS (
 SELECT actor FROM requested UNION SELECT edge.target FROM principals JOIN edge ON edge.subject=principals.id WHERE edge.kind='membership'
), resources(id) AS (
 SELECT resource FROM requested UNION SELECT edge.target FROM resources JOIN edge ON edge.subject=resources.id WHERE edge.kind='resource_parent'
)
SELECT action='read' AND EXISTS (SELECT 1 FROM edge JOIN principals ON principals.id=edge.subject
 JOIN resources ON resources.id=edge.target WHERE edge.kind='grant') FROM requested`;
const overrideAnswer=` SELECT action='read' AND NOT EXISTS (
  SELECT 1 FROM edge WHERE kind='block' AND subject=actor AND target=resource
) AND EXISTS (
  SELECT 1 FROM edge support WHERE support.kind='support' AND support.subject=actor AND support.target=resource
  AND NOT EXISTS (SELECT 1 FROM edge revoke WHERE revoke.kind='revoke' AND revoke.subject=support.principal AND revoke.target=resource)
) FROM requested`;

const match=(kind,subject,target)=>`triple(?e,'kind',${quote(kind)}),triple(?e,'subject',${subject}),triple(?e,'target',${target})`;
const truthRules=`answer(true) :- requested(?action),allowed(?action).
answer(false) :- requested(?action),!allowed(?action).`;

export function accessCasePlan(workload,entry) {
  const params=entry.parameters,known=BigInt(entry.cut.known_at),valid=BigInt(entry.cut.valid_at);
  const user=text(params.user),resource=text(params.resource),action=params.action?text(params.action):'read';
  const actor=quote(user),target=quote(resource),verb=quote(action);
  const inherited=workload.id==='11';
  const answer=inherited?inheritedAnswer:overrideAnswer;
  const queryParams=[known,valid,user,resource,action];
  const program=inherited?`requested(${verb}). principal(${actor}). resource(${target}).
    member(?u,?team) :- ${match('membership','?u','?team')}.
    parent(?child,?parent) :- ${match('resource_parent','?child','?parent')}.
    grant(?p,?r) :- ${match('grant','?p','?r')}.
    principal(?next) :- principal(?known),member(?known,?next).
    resource(?next) :- resource(?known),parent(?known,?next).
    allowed('read') :- principal(?p),resource(?r),grant(?p,?r). ${truthRules}`:
    `requested(${verb}).
    support(?p) :- ${match('support',actor,target)},triple(?e,'principal',?p).
    revoked(?p) :- ${match('revoke','?p',target)}.
    blocked('read') :- ${match('block',actor,target)}.
    allowed('read') :- support(?p),!revoked(?p),!blocked('read'). ${truthRules}`;
  return {naive:{sql:requested+rawAccess+answer,params:queryParams},
    direct:{sql:requested+directAccess+answer,params:queryParams},program,rowTags:['bool']};
}

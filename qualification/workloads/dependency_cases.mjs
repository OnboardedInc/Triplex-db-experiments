// @ts-nocheck -- [EXP-CHECKJS] unannotated dynamic parameters. Binding errors remain checked by lab/bin/checkjs.mjs.
import assert from 'node:assert/strict';

const infinity=9223372036854775807n;
const text=cell=>{assert.equal(cell.tag,'str');assert.equal(typeof cell.value,'string');return cell.value;};
const boolean=cell=>{assert.equal(cell.tag,'bool');assert.equal(typeof cell.value,'boolean');return cell.value;};
const field=(attribute,tag,value)=>({attribute,value:{tag,value}});
const quote=JSON.stringify;

function edges(event) {
  assert.equal(event.kind,'dependency_snapshot');
  assert.ok(event.payload.edges.length>0&&event.payload.edges.length<=32,'Dependency snapshot must fit one native batch');
  return event.payload.edges.map((edge,index)=>({id:JSON.stringify(['dependency',event.id,index]),
    from:text(edge.from),to:text(edge.to)}));
}
const until=event=>event.payload.valid_to?BigInt(event.payload.valid_to.value):infinity;

export function nativeDependencyWrite(event,schema) {
  const request={schema,version:1,type:'Row',commandId:'event-'+event.id,validFrom:BigInt(event.occurred_at),validTo:until(event)};
  assert.ok(request.validFrom<request.validTo);
  if(event.kind==='dependency_snapshot'){
    return {method:'batch',request:{schema,version:1,commandId:request.commandId,
      members:edges(event).map(edge=>({operation:'put',type:'Row',entityId:edge.id,validFrom:request.validFrom,validTo:request.validTo,
        fields:[field('dependency_source','str',edge.from),field('dependency_target','str',edge.to)]}))}};
  }
  if(event.kind==='deployment')return {method:'put',request:{...request,entityId:JSON.stringify(['deployment',event.id]),
    fields:[field('application','str',event.subject),field('environment','str',text(event.payload.environment))]}};
  assert.equal(event.kind,'vulnerability_interval');
  return {method:'put',request:{...request,entityId:JSON.stringify(['vulnerability',event.id]),
    fields:[field('vulnerable_subject','str',event.subject),field('vulnerable','bool',boolean(event.payload.vulnerable))]}};
}

export async function initializeDependencyProjection(engine) {
  await engine.run(`CREATE TABLE dependency_edge(support_id VARCHAR PRIMARY KEY,src VARCHAR,dst VARCHAR,
    valid_from BIGINT,valid_to BIGINT,known_from BIGINT)`);
  await engine.run(`CREATE TABLE deployment(event_id VARCHAR PRIMARY KEY,application VARCHAR,environment VARCHAR,
    valid_from BIGINT,valid_to BIGINT,known_from BIGINT)`);
  await engine.run(`CREATE TABLE vulnerability(event_id VARCHAR PRIMARY KEY,subject VARCHAR,vulnerable BOOLEAN,
    valid_from BIGINT,valid_to BIGINT,known_from BIGINT)`);
}

export async function appendDependencyProjection(engine,event) {
  const valid=BigInt(event.occurred_at),known=BigInt(event.recorded_at),end=until(event);
  if(event.kind==='dependency_snapshot'){
    for(const edge of edges(event))
      await engine.run('INSERT INTO dependency_edge VALUES (?,?,?,?,?,?)',[edge.id,edge.from,edge.to,valid,end,known]);
  }else if(event.kind==='deployment'){
    await engine.run('INSERT INTO deployment VALUES (?,?,?,?,?,?)',
      [event.id,event.subject,text(event.payload.environment),valid,end,known]);
  }else{
    assert.equal(event.kind,'vulnerability_interval');
    await engine.run('INSERT INTO vulnerability VALUES (?,?,?,?,?,?)',
      [event.id,event.subject,boolean(event.payload.vulnerable),valid,end,known]);
  }
}

const raw=`, visible AS (
 SELECT src.* FROM source_event src CROSS JOIN requested cut WHERE src.recorded_at<=cut.known_at
   AND src.occurred_at<=cut.valid_at AND cut.valid_at<coalesce(CAST(json_extract_string(src.payload,'$.valid_to.value') AS BIGINT),9223372036854775807)
), edge AS (
 SELECT DISTINCT json_extract_string(item.value,'$.from.value') src,json_extract_string(item.value,'$.to.value') dst
 FROM visible CROSS JOIN LATERAL json_each(payload,'$.edges') item WHERE kind='dependency_snapshot'
), deployed AS (
 SELECT DISTINCT subject application,json_extract_string(payload,'$.environment.value') environment
 FROM visible WHERE kind='deployment'
), vulnerable AS (
 SELECT DISTINCT subject FROM visible WHERE kind='vulnerability_interval' AND CAST(json_extract_string(payload,'$.vulnerable.value') AS BOOLEAN)
)`;
const direct=`, edge AS (
 SELECT DISTINCT src,dst FROM dependency_edge CROSS JOIN requested cut
 WHERE known_from<=cut.known_at AND valid_from<=cut.valid_at AND cut.valid_at<valid_to
), deployed AS (
 SELECT DISTINCT application,environment FROM deployment CROSS JOIN requested cut
 WHERE known_from<=cut.known_at AND valid_from<=cut.valid_at AND cut.valid_at<valid_to
), vulnerable AS (
 SELECT DISTINCT subject FROM vulnerability CROSS JOIN requested cut
 WHERE vulnerable AND known_from<=cut.known_at AND valid_from<=cut.valid_at AND cut.valid_at<valid_to
)`;
const nativeEdges="edge(?src,?dst) :- triple(?edge,'dependency_source',?src),triple(?edge,'dependency_target',?dst).";

export function dependencyCasePlan(entry) {
  const closure=entry.operation==='dependency_closure';
  assert.ok(closure||entry.operation==='vulnerable_deployments');
  const parameter=text(closure?entry.parameters.application:entry.parameters.environment);
  const requested='WITH RECURSIVE requested AS (SELECT ?::BIGINT known_at,?::BIGINT valid_at,?::VARCHAR target)';
  const params=[BigInt(entry.cut.known_at),BigInt(entry.cut.valid_at),parameter];
  const walk=closure?`, walk(node) AS (
 SELECT e.dst FROM edge e JOIN requested cut ON e.src=cut.target
 UNION SELECT e.dst FROM walk w JOIN edge e ON e.src=w.node
) SELECT node FROM walk`:`, walk(application,node) AS (
 SELECT d.application,d.application FROM deployed d JOIN requested cut ON d.environment=cut.target
 UNION SELECT w.application,e.dst FROM walk w JOIN edge e ON e.src=w.node
) SELECT DISTINCT w.application FROM walk w JOIN vulnerable v ON v.subject=w.node`;
  const program=closure?`${nativeEdges}
    walk(?dst) :- edge(${quote(parameter)},?dst).
    walk(?dst) :- walk(?src),edge(?src,?dst).
    answer(?dst) :- walk(?dst).`:`${nativeEdges}
    deployed(?app) :- triple(?d,'application',?app),triple(?d,'environment',${quote(parameter)}).
    vulnerable(?node) :- triple(?v,'vulnerable_subject',?node),triple(?v,'vulnerable',true).
    walk(?app,?app) :- deployed(?app).
    walk(?app,?dst) :- walk(?app,?src),edge(?src,?dst).
    answer(?app) :- walk(?app,?node),vulnerable(?node).`;
  return {naive:{sql:requested+raw+walk,params},direct:{sql:requested+direct+walk,params},program,rowTags:['str']};
}

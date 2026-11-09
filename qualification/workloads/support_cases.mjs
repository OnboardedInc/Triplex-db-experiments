// @ts-nocheck -- [EXP-CHECKJS] unannotated dynamic parameters; unannotated destructured parameters. Binding errors remain checked by lab/bin/checkjs.mjs.
import assert from 'node:assert/strict';

const infinity=9223372036854775807n;
const str=value=>({tag:'str',value});
function text(cell) {
  assert.equal(cell.tag,'str');
  assert.equal(typeof cell.value,'string');
  return cell.value;
}

function physicalSupports(event) {
  return event.payload.edges.map((edge,ordinal)=>({id:JSON.stringify([event.id,ordinal]),
    from:text(edge.from),to:text(edge.to)}));
}

function retracts(support,event) {
  return support.from===event.subject && support.to===text(event.payload.target);
}

// The workload contract supplies one seed DAG and endpoint retractions.
// At most four nodes means a path witness needs at most two interior nodes.
function checkFixture(workload) {
  const seeds=workload.events.filter(event=>event.kind==='edges_asserted');
  assert.equal(seeds.length,1,'Support baseline requires one seed graph');
  const [seed]=seeds,supports=physicalSupports(seed);
  assert.ok(supports.length>0 && supports.length<=32,'Seed must fit one native batch');
  const seedValid=BigInt(seed.occurred_at),seedKnown=BigInt(seed.recorded_at);
  const nodes=new Set(supports.flatMap(({from,to})=>[from,to]));
  assert.ok(nodes.size<=4,'Support baseline admits at most four nodes');
  function checkAcyclic(node,ancestors) {
    assert.ok(!ancestors.has(node),'Support baseline requires an acyclic graph');
    const next=new Set([...ancestors,node]);
    for(const {from,to} of supports) if(from===node) checkAcyclic(to,next);
  }
  for(const node of nodes) checkAcyclic(node,new Set());
  const removed=new Set();
  for(const event of workload.events) {
    assert.equal(event.semantics,'assertion_change');
    assert.ok(event.corrects==null,'Support baseline requires explicit edge retractions');
    const valid=BigInt(event.occurred_at);
    assert.ok(valid<infinity,'An edge change must precede the open-ended interval sentinel');
    if(event===seed) continue;
    assert.equal(event.kind,'edge_retracted');
    assert.ok(BigInt(event.recorded_at)>seedKnown);
    assert.ok(valid>=seedValid);
    assert.ok(supports.some(support=>retracts(support,event)));
    const key=JSON.stringify([event.subject,text(event.payload.target)]);
    assert.ok(!removed.has(key),'Support baseline admits one retraction per logical edge');
    removed.add(key);
  }
  return supports;
}

export function nativeSupportWrite(workload,event,schema) {
  const supports=checkFixture(workload);
  const insert=event.kind==='edges_asserted';
  const selected=insert?supports:supports.filter(support=>retracts(support,event));
  const members=selected.map(({id,from,to})=>({operation:insert?'put':'patch',type:'Row',entityId:id,
    validFrom:BigInt(event.occurred_at),validTo:infinity,
    fields:insert?[{attribute:'edge_source',value:str(from)},{attribute:'edge_target',value:str(to)}]:[],
  }));
  return {method:'batch',request:{schema,version:1,commandId:'event-'+event.id,members}};
}

export async function initializeSupportProjection(engine,workload) {
  checkFixture(workload);
  await engine.run(`CREATE TABLE edge_support(support_id VARCHAR,src VARCHAR,dst VARCHAR,
    valid_from BIGINT,valid_to BIGINT,known_from BIGINT,known_to BIGINT,
    PRIMARY KEY(support_id,known_from,valid_from))`);
}

export async function appendSupportProjection(engine,event) {
  const valid=BigInt(event.occurred_at),known=BigInt(event.recorded_at);
  const insert='INSERT INTO edge_support VALUES (?,?,?,?,?,?,?)';
  if(event.kind==='edges_asserted') {
    for(const {id,from,to} of physicalSupports(event))
      await engine.run(insert,[id,from,to,valid,infinity,known,infinity]);
  } else {
    assert.equal(event.kind,'edge_retracted');
    const from=event.subject,to=text(event.payload.target);
    const removed=await engine.run(`UPDATE edge_support SET known_to=?
      WHERE src=? AND dst=? AND known_to=? AND valid_from<=? AND ?<valid_to
      RETURNING support_id,valid_from`,[known,from,to,infinity,valid,valid]);
    assert.ok(removed.length>0,'Retraction must close at least one physical support');
    for(const [id,start] of removed) if(start<valid)
      await engine.run(insert,[id,from,to,start,valid,known,infinity]);
  }
}

const replay=`, edge AS (
  SELECT DISTINCT json_extract_string(item.value,'$.from.value') src,
    json_extract_string(item.value,'$.to.value') dst
  FROM source_event seed CROSS JOIN requested cut CROSS JOIN LATERAL json_each(seed.payload,'$.edges') item
  WHERE seed.kind='edges_asserted' AND seed.recorded_at<=cut.known_at AND seed.occurred_at<=cut.valid_at
    AND NOT EXISTS (SELECT 1 FROM source_event removal WHERE removal.kind='edge_retracted'
      AND removal.subject=json_extract_string(item.value,'$.from.value')
      AND json_extract_string(removal.payload,'$.target.value')=json_extract_string(item.value,'$.to.value')
      AND removal.recorded_at<=cut.known_at AND removal.occurred_at<=cut.valid_at)
)`;
const direct=`, edge AS (
  SELECT DISTINCT src,dst FROM edge_support CROSS JOIN requested cut
  WHERE known_from<=cut.known_at AND cut.known_at<known_to AND valid_from<=cut.valid_at AND cut.valid_at<valid_to
)`;

export function supportCasePlan(workload,entry) {
  checkFixture(workload);
  const supports=entry.operation==='reachability_supports';
  assert.ok(supports || entry.operation==='reachability_closure');
  const origin=text(entry.parameters.from);
  const valid=BigInt(entry.cut.valid_at);
  assert.ok(valid<infinity,'The requested valid cut must precede the interval sentinel');
  const target=supports?text(entry.parameters.to):null;
  const requested=`WITH RECURSIVE requested AS (SELECT ?::BIGINT known_at,?::BIGINT valid_at,?::VARCHAR origin${
    supports?',?::VARCHAR target':''})`;
  const params=[BigInt(entry.cut.known_at),valid,origin];
  if(supports)params.push(target);
  // Bag recursion preserves one occurrence per node sequence. Closure can
  // deduplicate earlier because it only needs the reachable-node set.
  const walk=`, walk(node) AS (
    SELECT e.dst FROM edge e JOIN requested cut ON e.src=cut.origin
    UNION ${supports?'ALL':''} SELECT e.dst FROM walk w JOIN edge e ON e.src=w.node
  )`;
  const answer=supports?' SELECT count(*)>0,count(*) FROM walk w JOIN requested cut ON w.node=cut.target':
    ' SELECT node FROM walk';
  const edge="edge(?src,?dst) :- triple(?id,'edge_source',?src),triple(?id,'edge_target',?dst).";
  const root=JSON.stringify(origin);
  // For support counts, preserve the ordered interior nodes and the length in
  // the set-valued recursive relation. Different physical records of one edge
  // collapse at edge/2. The recursive evaluator produces every path witness.
  const program=supports?`${edge}
    walk(?dst,'unused','unused',1) :- edge(${root},?dst).
    walk(?dst,?first,'unused',2) :- walk(?first,'unused','unused',1),edge(?first,?dst).
    walk(?dst,?first,?second,3) :- walk(?second,?first,'unused',2),edge(?second,?dst).
    witness(?first,?second,?length) :- walk(${JSON.stringify(target)},?first,?second,?length).
    path_count(count()) :- witness(?first,?second,?length).
    answer(true,?n) :- path_count(?n),[?n>0].
    answer(false,?n) :- path_count(?n),[?n=0].`:`${edge}
    walk(?dst) :- edge(${root},?dst).
    walk(?dst) :- walk(?src),edge(?src,?dst).
    answer(?dst) :- walk(?dst).`;
  return {naive:{sql:requested+replay+walk+answer,params},direct:{sql:requested+direct+walk+answer,params},
    program,rowTags:supports?['bool','i64']:['str']};
}

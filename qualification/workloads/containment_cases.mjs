import assert from 'node:assert/strict';

const infinity=9223372036854775807n;
const str=value=>({tag:'str',value});
function text(cell){
  assert.equal(cell.tag,'str');
  return cell.value;
}

function changes(event) {
  if(event.kind==='containment_asserted')
    return event.payload.edges.map(edge=>({parent:text(edge.from),child:text(edge.to),live:true}));
  assert.equal(event.kind,'item_moved');
  return [{parent:text(event.payload.from),child:event.subject,live:false},
    {parent:text(event.payload.to),child:event.subject,live:true}];
}

export function nativeContainmentWrite(event,schema) {
  const members=changes(event).map(({parent,child,live})=>({
    operation:live?'put':'patch',type:'Row',entityId:JSON.stringify([parent,child]),
    validFrom:BigInt(event.occurred_at),validTo:infinity,
    fields:live?[{attribute:'parent',value:str(parent)},{attribute:'child',value:str(child)}]:[],
  }));
  return {method:'batch',request:{schema,version:1,commandId:'event-'+event.id,members}};
}

export async function appendContainmentProjection(engine,event) {
  const valid=BigInt(event.occurred_at),known=BigInt(event.recorded_at);
  for(const {parent,child,live} of changes(event)) {
    if(live)await engine.run('INSERT INTO containment_edge VALUES (?,?,?,?,?,?)',[parent,child,valid,infinity,known,infinity]);
    else {
      const removed=await engine.run('UPDATE containment_edge SET known_to=? WHERE parent=? AND child=? AND known_to=? '+
        'AND valid_from<=? AND ?<valid_to RETURNING valid_from',[known,parent,child,infinity,valid,valid]);
      assert.equal(removed.length,1);
      const [from]=removed[0];
      if(from<valid)await engine.run('INSERT INTO containment_edge VALUES (?,?,?,?,?,?)',[parent,child,from,valid,known,infinity]);
    }
  }
}

const requested='WITH RECURSIVE requested AS (SELECT ?::BIGINT known_at,?::BIGINT valid_at,?::VARCHAR container)';
const replay=`, visible AS (
  SELECT event_id,kind,subject,occurred_at,recorded_at,payload FROM source_event CROSS JOIN requested
  WHERE recorded_at<=known_at AND occurred_at<=valid_at
), edge_change AS (
  SELECT json_extract_string(item.value,'$.from.value') parent,json_extract_string(item.value,'$.to.value') child,
    TRUE live,occurred_at,recorded_at,event_id
  FROM visible CROSS JOIN LATERAL json_each(payload,'$.edges') item WHERE kind='containment_asserted'
  UNION ALL SELECT json_extract_string(payload,'$.from.value'),subject,FALSE,occurred_at,recorded_at,event_id
  FROM visible WHERE kind='item_moved'
  UNION ALL SELECT json_extract_string(payload,'$.to.value'),subject,TRUE,occurred_at,recorded_at,event_id
  FROM visible WHERE kind='item_moved'
), edge AS (
  SELECT parent,child FROM (SELECT *,row_number() OVER (
    PARTITION BY parent,child ORDER BY occurred_at DESC,recorded_at DESC,event_id DESC
  ) latest FROM edge_change) WHERE latest=1 AND live
)`;
const direct=`, edge AS (
  SELECT parent,child FROM containment_edge CROSS JOIN requested cut
  WHERE known_from<=cut.known_at AND cut.known_at<known_to AND valid_from<=cut.valid_at AND cut.valid_at<valid_to
)`;
const answer=`, walk(node) AS (
  SELECT child FROM edge JOIN requested ON parent=container
  UNION SELECT child FROM walk JOIN edge ON parent=node
)
SELECT node FROM walk WHERE NOT EXISTS (SELECT 1 FROM edge WHERE parent=node)`;

export function containmentCasePlan(entry) {
  const container=text(entry.parameters.container);
  const params=[BigInt(entry.cut.known_at),BigInt(entry.cut.valid_at),container];
  return {naive:{sql:requested+replay+answer,params},direct:{sql:requested+direct+answer,params},
    program:`edge(?p,?c) :- triple(?e,'parent',?p),triple(?e,'child',?c).
      nonleaf(?p) :- edge(?p,?c).
      walk(?c) :- edge(${JSON.stringify(container)},?c).
      walk(?c) :- walk(?p),edge(?p,?c).
      answer(?item) :- walk(?item),not nonleaf(?item).`,rowTags:['str']};
}

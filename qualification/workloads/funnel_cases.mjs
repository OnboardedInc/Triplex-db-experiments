// @ts-nocheck -- [EXP-CHECKJS] unannotated dynamic parameters. Binding errors remain checked by lab/bin/checkjs.mjs.
import assert from 'node:assert/strict';

const text=cell=>{assert.equal(cell.tag,'str');return cell.value;};
const integer=cell=>{assert.equal(cell.tag,'i64');return BigInt(cell.value);};

export async function initializeFunnelProjection(engine){
  await engine.run(`CREATE TABLE session_event(event_id VARCHAR PRIMARY KEY,session VARCHAR,step VARCHAR,
    event_at BIGINT,valid_from BIGINT,known_from BIGINT)`);
}

export async function appendFunnelProjection(engine,event){
  assert.ok(['view','checkout','payment'].includes(event.kind));
  assert.equal(event.semantics,'business_event');
  await engine.run('INSERT INTO session_event VALUES (?,?,?,?,?,?)',[event.id,text(event.payload.session),
    text(event.payload.step),integer(event.payload.at),BigInt(event.occurred_at),BigInt(event.recorded_at)]);
}

const raw=`, session_event AS (
  SELECT event_id,json_extract_string(payload,'$.session.value') session,
    json_extract_string(payload,'$.step.value') step,CAST(json_extract_string(payload,'$.at.value') AS BIGINT) event_at,
    occurred_at valid_from,recorded_at known_from FROM source_event
  WHERE kind IN ('view','checkout','payment')
)`;
const qualification=`, visible AS (
  SELECT e.session,e.step,e.event_at FROM session_event e CROSS JOIN requested cut
  WHERE e.known_from<=cut.known_at AND e.valid_from<=cut.valid_at
    AND e.event_at>=cut.start_at AND e.event_at<cut.stop_at
), qualified AS (
  SELECT DISTINCT v.session FROM visible v JOIN visible c ON c.session=v.session
    JOIN visible p ON p.session=v.session
  WHERE v.step='view' AND c.step='checkout' AND p.step='payment'
    AND v.event_at<c.event_at AND c.event_at<p.event_at
)`;

export function funnelCasePlan(entry){
  const start=integer(entry.parameters.from),stop=integer(entry.parameters.to);
  assert.ok(start<stop);
  const one=entry.operation==='session_conversion';
  assert.ok(one || entry.operation==='conversion_funnel');
  const session=one?text(entry.parameters.session):null;
  const params=[BigInt(entry.cut.known_at),BigInt(entry.cut.valid_at),start,stop];
  if(one)params.push(session);
  const request=`WITH requested AS (SELECT ?::BIGINT known_at,?::BIGINT valid_at,?::BIGINT start_at,?::BIGINT stop_at${
    one?',?::VARCHAR session':''})`;
  const answer=one?' SELECT EXISTS(SELECT 1 FROM qualified q WHERE q.session=cut.session) FROM requested cut':
    ' SELECT session FROM qualified';
  const program=`event(?session,?step,?at) :- triple(?e,'session',?session),triple(?e,'step',?step),triple(?e,'at',?at).
    viewed(?session,?at) :- event(?session,'view',?at),[?at>=${start}],[?at<${stop}].
    checked_out(?session,?at) :- event(?session,'checkout',?at),[?at>=${start}],[?at<${stop}].
    paid(?session,?at) :- event(?session,'payment',?at),[?at>=${start}],[?at<${stop}].
    qualified(?session) :- viewed(?session,?view),checked_out(?session,?checkout),paid(?session,?payment),
      [?view<?checkout],[?checkout<?payment].
    ${one?`answer(true) :- qualified(${JSON.stringify(session)}).
      answer(false) :- !qualified(${JSON.stringify(session)}).`:'answer(?session) :- qualified(?session).'}`;
  return {naive:{sql:request+raw+qualification+answer,params},direct:{sql:request+qualification+answer,params},
    program,rowTags:one?['bool']:['str']};
}

// @ts-nocheck -- [EXP-CHECKJS] interval endpoints are runtime bigint values; unannotated subtraction inferred as number. Binding errors remain checked by lab/bin/checkjs.mjs.
import assert from 'node:assert/strict';

function int(cell){
  assert.equal(cell.tag,'i64');
  return BigInt(cell.value);
}
function text(cell){
  assert.equal(cell.tag,'str');
  return cell.value;
}
function observation(event){
  assert.equal(event.kind,'uptime_observed');
  const lo=int(event.payload.from),hi=int(event.payload.to);
  assert.ok(lo<hi);
  return [event.subject,lo,hi];
}

export function nativeUptimeWrite(event,schema){
  const [machine,validFrom,validTo]=observation(event);
  return {method:'put',request:{schema,version:1,type:'Row',entityId:event.id,commandId:'event-'+event.id,
    fields:[{attribute:'machine',value:{tag:'str',value:machine}}],validFrom,validTo}};
}

export async function appendUptimeProjection(engine,event){
  await engine.run('INSERT INTO uptime_observation VALUES (?,?,?,?,?)',
    [event.id,...observation(event),BigInt(event.recorded_at)]);
}

const request='WITH request AS (SELECT ?::BIGINT known_at,?::VARCHAR machine,?::BIGINT start_at,?::BIGINT end_at)';
const replay=`, candidates AS (
  SELECT CAST(json_extract_string(payload,'$.from.value') AS BIGINT) valid_from,
    CAST(json_extract_string(payload,'$.to.value') AS BIGINT) valid_to,start_at,end_at
  FROM source_event CROSS JOIN request
  WHERE recorded_at<=known_at AND kind='uptime_observed' AND subject=machine
), clipped AS (
  SELECT greatest(valid_from,start_at) lo,least(valid_to,end_at) hi
  FROM candidates WHERE valid_from<end_at AND start_at<valid_to
), endpoints AS (SELECT lo edge FROM clipped UNION SELECT hi FROM clipped),
spans AS (SELECT edge lo,lead(edge) OVER(ORDER BY edge) hi FROM endpoints)
SELECT coalesce(sum(hi::HUGEINT-lo) FILTER (
  WHERE hi IS NOT NULL AND EXISTS(SELECT 1 FROM clipped c WHERE c.lo<=spans.lo AND spans.lo<c.hi)),0)::BIGINT
FROM spans`;
const direct=`, clipped AS (
  SELECT greatest(valid_from,start_at) lo,least(valid_to,end_at) hi
  FROM uptime_observation JOIN request ON uptime_observation.machine=request.machine
  WHERE known_from<=known_at AND valid_from<end_at AND start_at<valid_to
), ordered AS (
  SELECT lo,hi,max(hi) OVER(ORDER BY lo,hi ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING) prior_end
  FROM clipped
), islands AS (
  SELECT lo,hi,sum(CASE WHEN prior_end IS NULL OR prior_end<lo THEN 1 ELSE 0 END)
    OVER(ORDER BY lo,hi ROWS UNBOUNDED PRECEDING) island
  FROM ordered
), coverage AS (
  SELECT max(hi)::HUGEINT-min(lo) duration FROM islands GROUP BY island
)
SELECT coalesce(sum(duration),0)::BIGINT FROM coverage`;

export function uptimeCasePlan(entry){
  const machine=text(entry.parameters.machine),validFrom=int(entry.parameters.from),validTo=int(entry.parameters.to);
  assert.ok(validFrom<validTo);
  const params=[BigInt(entry.cut.known_at),machine,validFrom,validTo];
  const value=JSON.stringify(machine);
  return {naive:{sql:request+replay,params},direct:{sql:request+direct,params},
    program:`answer(${value}) :- triple(?observation,'machine',${value}).`,
    interval:{machine,validFrom,validTo},rowTags:['i64']};
}

export function uptimeDuration(intervals,machine){
  let duration=0n,previousEnd;
  for(const interval of intervals){
    assert.deepEqual(interval.values,[{tag:'str',value:machine}]);
    assert.ok(previousEnd===undefined||previousEnd<interval.validFrom);
    duration+=interval.validTo-interval.validFrom;
    previousEnd=interval.validTo;
  }
  assert.ok(duration<=9223372036854775807n,'Uptime duration exceeds int64');
  return [[{tag:'i64',value:String(duration)}]];
}

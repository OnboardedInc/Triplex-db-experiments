import assert from 'node:assert/strict';
import {SCALE_SCHEMA,scaleCommand,scaleEntity,scaleRecord} from './scale-fixture.mjs';

export const evaluatorFixtureSpec=Object.freeze({chain:64,disconnected:2048,validAt:0});
export const evaluatorKinds=Object.freeze(['tiny_constant','recursive_chain']);
export const wideEvaluatorFixtureSpec=Object.freeze({activeFacts:45000,answerRows:40000,groupSize:4096});
export const wideEvaluatorKinds=Object.freeze(['native_projection_40000','sql_projection_40000']);
const node=index=>'node-'+String(index).padStart(3,'0');

export function evaluatorCase(kind){
  if(kind==='tiny_constant')return {program:'answer(7).',route:'native',inputRows:0n,expected:[[{tag:'i64',value:7n}]]};
  if(wideEvaluatorKinds.includes(kind)){
    const {activeFacts,answerRows}=wideEvaluatorFixtureSpec;
    return {program:`answer(?v) :- triple(?e,'i',?v),[?v < ${answerRows}].`,
      route:kind==='native_projection_40000'?'native':'sql',inputRows:BigInt(activeFacts),
      expected:Array.from({length:answerRows},(_,index)=>[{tag:'i64',value:BigInt(index)}])};
  }
  assert.equal(kind,'recursive_chain');
  const {chain,disconnected}=evaluatorFixtureSpec;
  return {
    program:`reach(?n) :- triple('node-000','next',?n).
      reach(?next) :- reach(?node),triple(?node,'next',?next).
      answer(?n) :- reach(?n).`,
    route:'native',inputRows:BigInt(chain+disconnected),
    expected:Array.from({length:chain},(_,index)=>[{tag:'str',value:node(index+1)}]),
  };
}

export async function seedEvaluatorFixture(run,{wide=false}={}){
  const {chain,disconnected}=evaluatorFixtureSpec;
  await run("PRAGMA td_define_schema_v2('schema evaluator_profile version 1 {entity Row {next:text many;}}')");
  for(let index=0;index<chain;index++){
    const rows=await run(`PRAGMA td_put_entity_v2('evaluator_profile',1,'Row','${node(index)}','edge-${index}','{next="${node(index+1)}";}',0,10)`);
    assert.equal(rows[0]?.[1],BigInt(index+1));
  }
  const record='{'+Array.from({length:disconnected},(_,index)=>`next="noise-${String(index).padStart(4,'0')}";`).join('')+'}';
  const rows=await run(`PRAGMA td_put_entity_v2('evaluator_profile',1,'Row','noise','noise','${record}',0,10)`);
  let position=BigInt(chain+1),retainedFacts=chain+disconnected;
  assert.equal(rows[0]?.[1],position);
  if(wide){
    const {activeFacts,groupSize}=wideEvaluatorFixtureSpec;
    await run(`PRAGMA td_define_schema_v2('${SCALE_SCHEMA}')`);
    for(let start=0;start<activeFacts;start+=groupSize){
      const index=start/groupSize,end=Math.min(start+groupSize,activeFacts);
      const rows=await run(`PRAGMA td_put_entity_v2('scale',1,'Row','${scaleEntity(index)}','${scaleCommand(index)}','${scaleRecord(start,end)}',0,10)`);
      assert.equal(rows[0]?.[1],++position);
    }
    retainedFacts+=activeFacts;
  }
  return {position,retainedFacts};
}

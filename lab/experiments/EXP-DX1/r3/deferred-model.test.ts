import test from "node:test";
import assert from "node:assert/strict";
import { Option } from "effect";
import { FullRowModel } from "../../../bench/lib/full-row-model.ts";
import { ids } from "../../../bench/lib/world.ts";
import { observe } from "../../../bench/lib/observe.ts";
const root=ids.placement(0);
function receipt(operations: any[],position: number) {
  const instant=99+position, txId=`tx${position}`;
  return {position,instant,txId,triples:operations.filter(o=>o.op==="assert").map((o,i)=>({id:`${position}:${i}`,entityId:o.entityId,attribute:o.attribute,value:o.value,
    recordedAt:instant,validFrom:o.validFrom,validTo:o.validTo===undefined?Option.none():Option.some(o.validTo),createdBy:Option.some("actor"),
    entityType:Option.none(),schemaVersion:Option.some(1),txId:Option.some(txId),retractedAt:Option.none(),retractTxId:Option.none()}))};
}
test("deferred contribution hashing equals eager complete rows at every record/valid boundary and snapshots JSON intent",()=>{
  const value={type:"json",value:{nested:[-0,0,"boundaries"]}};
  const ops=[{op:"assert",entityId:root,attribute:":placement/stamp",value:{type:"number",value:0},validFrom:0},
    {op:"assert",entityId:root,attribute:":json",value,validFrom:2,validTo:10}];
  const r1=receipt(ops,1),eager=new FullRowModel(),after=new FullRowModel(true);
  eager.add(ops,r1,"actor");after.add(ops,r1,"actor");
  const ops2=[{op:"retract",id:r1.triples[0]!.id},{op:"assert",entityId:root,attribute:":placement/stamp",value:{type:"number",value:1},validFrom:5}],r2=receipt(ops2,2);
  eager.add(ops2,r2,"actor");after.add(ops2,r2,"actor");
  for(const at of [99,100,101,102]) for(const valid of [0,2,5,9,10,20]) assert.deepEqual(after.summary(0,at,valid),eager.summary(0,at,valid));
  const expected=eager.summary(0,100,5);
  value.value.nested[0]=123;
  assert.deepEqual(after.summary(0,100,5),expected);
  const rows=r1.triples.map(t=>({...t,value:t.attribute===":json"?{type:"json",value:{nested:[-0,0,"boundaries"]}}:t.value}));
  const observation=observe({triples:rows,entities:1,depth:0,roundTrips:1,route:"source",language:"test",waitedMs:0});
  assert.equal(expected.digest,observation.digest);assert.equal(expected.facts,observation.facts);
});
test("deferring a hash never coerces unsupported value-domain input",()=>{
  for(const deferred of [false,true]) {
    const ops=[{op:"assert",entityId:root,attribute:":bad",value:{type:"json",value:new Date(0)},validFrom:0}];
    assert.throws(()=>new FullRowModel(deferred).add(ops,receipt(ops,1),"actor"),/prototype/);
  }
});

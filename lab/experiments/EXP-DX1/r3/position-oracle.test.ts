import { test } from "node:test";
import assert from "node:assert/strict";
import { Effect, Option } from "effect";
import { reachPull } from "../../../bench/lib/composition.ts";
// [DX-R3-P7] Why: an internal floor position must survive the benchmark-to-adapter boundary.
// Rejected: testing only time-pinned reads (the public resolver retains time and hides this bug).
test("position-only oracle forwards the exact cut instead of reading latest", async()=>{
 const basis:any={recordedPosition:59,validAt:100};
 let calls=0;
 const h:any={backend:{name:"datomic"},run:Effect.runPromise,triples:{reach(){throw Error("latest must not run");}},
 storage:{getReachTriples(root:string,b:any){assert.equal(root,"root");assert.deepEqual(b,basis);calls++;return Effect.succeed({triples:[{id:"old",entityId:"root"}],hops:1});}}};
 const value=await reachPull(h,"root",basis,undefined,"gateway");
 assert.equal(calls,1);assert.equal(value.triples[0]!.id,"old");assert.equal(value.roundTrips,1);
});
test("a declined exact reach cannot fall through to latest", async()=>{
 const h:any={backend:{name:"datomic"},run:Effect.runPromise,triples:{reach(){throw Error("latest must not run");}},
 storage:{getReachTriples(){return Effect.succeed(undefined);}}};
 await assert.rejects(reachPull(h,"root",{recordedPosition:59,validAt:100} as any,undefined,"gateway"),/Exact Datomic position read unavailable/);
});
test("generic gateway traversal keeps the same cut and complete metadata on every level", async()=>{
 const seen:string[][]=[];const basis:any={recordedPosition:59,validAt:100};
 const {runtimeApi}=await import("../../../bench/lib/triplex.ts");
 const row=(e:string,type:string,value:string)=>({id:e,entity_id:e,attribute:":value",value_type:type,value_string:value,value_number:null,value_boolean:null,value_datetime:null,value_json:null,recorded_at:1,valid_from:0,valid_to:null,created_by:"seed",retracted_at:null,entity_type:null,schema_version:1,tx_id:"old",retract_tx_id:null});
 const h:any={backend:{name:"datomic"},run:Effect.runPromise,triples:{reach(){throw Error("latest must not run");}},storage:{valueDomain:runtimeApi.ValueDomains.datomic,
 getReachTriples(){return Effect.succeed(undefined);},getByEntities(ids:string[],b:any){assert.deepEqual(b,basis);seen.push(ids);return Effect.succeed(new Map(ids.map(id=>[id,[row(id,id==="root"?"ref":"string",id==="root"?"child":"floor")]])));}}};
 const value=await reachPull(h,"root",basis,undefined,"gateway");
 assert.deepEqual(seen,[["root"],["child"]]);assert.equal(value.roundTrips,2);assert.equal(value.triples.length,2);
 assert.equal(value.triples[1]!.recordedAt,1);assert.deepEqual(value.triples[1]!.txId,Option.some("old"));
});

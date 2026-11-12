import assert from "node:assert/strict";
import test from "node:test";
import { Option } from "effect";
import { DatomicClient } from "../../../../packages/datomic/dist/index.js";
import { openPositionGateway } from "../../../bench/lib/position-gateway.ts";
import { canonicalWorld } from "../../../bench/lib/canonical.ts";

test("read-only receipt fallback preserves complete rows and exact position without initializing a writer", async () => {
  const client=new DatomicClient("http://127.0.0.1:1"), calls: any[]=[];
  const row={id:"assertion",entityId:"root",attribute:":x",value:{type:"number",value:-0},
    recordedAt:10,validFrom:2,validTo:Option.some(20),createdBy:Option.some("writer"),
    entityType:Option.some("thing"),schemaVersion:Option.some(1),txId:Option.some("tx"),
    retractedAt:Option.none(),retractTxId:Option.none()};
  client.create=async (_scope: string) => ({db:"existing",created:false,layout:"lean"} as any);
  client.begin=async () => { throw Error("must not begin a writer transaction"); };
  client.transact=async () => { throw Error("must not write"); };
  client.reachEntities=async (db,roots,basis) => {
    calls.push({db,roots,basis});
    return { entities:new Map([["root",{rev:1,rows:[row],storedRows:[]}]]),position:7 } as any;
  };
  const reader=await openPositionGateway("receipt-test","http://127.0.0.1:1",client);
  try {
    const basis={recordedPosition:7,recordedAt:10,validAt:11};
    const result=await reader.pull("root",basis);
    assert.equal(canonicalWorld(result.triples),canonicalWorld([row]));
    assert.equal(Object.is(result.triples[0]!.value.value,-0),true);
    assert.deepEqual(calls.map(c=>[c.roots,c.basis]),[[["root"],basis]]);
    assert.equal(result.roundTrips,1);
    await assert.rejects(reader.pull("root",{recordedAt:10,validAt:11}),/exact position/);
    assert.equal(calls.length,1);
  } finally { reader.close(); }
});

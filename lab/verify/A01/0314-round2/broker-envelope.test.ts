// [CX-VA01-0314] Why: a valid boundary JSON must survive the generated journal envelope. Rejected: checking only preflight or A0's corrected codec.
import fs from "node:fs";
import path from "node:path";
import { randomUUID, createHash } from "node:crypto";
import { Effect, Layer, ManagedRuntime } from "effect";
import { expect, it } from "vitest";
import { Triples, EntityId, json } from "@triplex-build/triplex";
import { Capabilities, DatabaseScope, QueryExecutor, Runtime, StorageAdapter, ValueDomains, invalidValue } from "@triplex-build/triplex/runtime";
import { makeQleverStorageAdapter } from "../../../../packages/qlever/src/QleverStorageAdapter.ts";
import { makeQleverQueryExecutor } from "../../../../packages/qlever/src/QleverQueryExecutor.ts";
import { HostBroker } from "../../../../packages/qlever/src/broker/broker.ts";
import type { QleverClient } from "../../../../packages/qlever/src/QleverClient.ts";

it("a QLever-valid JSON at the declared depth limit commits with its generated journal envelope", async () => {
  const out = process.env.V_P2Q_OUT!; fs.mkdirSync(out,{recursive:true});
  const source=fs.readFileSync(import.meta.filename);
  fs.writeFileSync(path.join(out,"probe-source.ts"),source);
  const scope="review-envelope:"+randomUUID();
  const broker=await HostBroker.open({dir:path.join(out,"envelope-broker"),scopeKey:scope,minFreeBytes:0});
  const client: QleverClient={query:async q=>{
    if(q==="SELECT ?s WHERE { ?s ?p ?o } LIMIT 1")return [];
    throw new TypeError("offline fixture",{cause:Object.assign(new Error("fixture"),{code:"ECONNREFUSED"})});
  },update:async()=>({}),command:async()=>({}),cancel:async()=>{},close:async()=>{}};
  const adapter=makeQleverStorageAdapter(client,scope,{broker});
  const rt=ManagedRuntime.make(Runtime.define({name:"review-envelope",storage:Layer.succeed(StorageAdapter,adapter),queries:Layer.succeed(QueryExecutor,makeQleverQueryExecutor(client,scope))}).layer({scope:DatabaseScope.test(scope),capabilities:Capabilities.none}));
  const observations:any[]=[];
  try {
    const triples=await rt.runPromise(Triples);
    for(const depth of [120,ValueDomains.qlever.json.maxDepth]) {
      let nested:unknown="leaf";
      for(let i=0;i<depth;i++)nested={next:nested};
      const value=json(nested); expect(invalidValue(value,ValueDomains.qlever)).toBeUndefined();
      const before=broker.head();
      const result=await rt.runPromise(triples.transact([{op:"assert",entityId:EntityId.make("review-subject"),attribute:":review/json",value}],{commandId:"depth-"+depth}).pipe(Effect.match({onFailure:error=>({ok:false as const,error}),onSuccess:value=>({ok:true as const,value})})));
      const receipt=await rt.runPromise(triples.transactionByCommand("depth-"+depth));
      observations.push({depth,before,after:broker.head(),result,receiptFound:receipt!==null});
    }
    fs.writeFileSync(path.join(out,"envelope-observations.json"),JSON.stringify({sourceSha256:createHash("sha256").update(source).digest("hex"),domain:ValueDomains.qlever.json,observations},null,2));
    expect(observations[0].result.ok).toBe(true); expect(observations[0].receiptFound).toBe(true);
    expect(observations[1].result.ok).toBe(true); expect(observations[1].receiptFound).toBe(true);
  }finally{await rt.dispose();await broker.close();}
});

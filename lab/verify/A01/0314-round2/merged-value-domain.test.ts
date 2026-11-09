// [CX-VA01-0314] Why: the merged opt-in broker must retain GS12F's typed value boundary. Rejected: testing only A0 or skipping all broker value checks offline.
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Effect, Layer, ManagedRuntime } from "effect";
import { expect, it } from "vitest";
import { Triples, EntityId, integer, InvalidTripleError } from "@triplex-build/triplex";
import { Capabilities, DatabaseScope, QueryExecutor, Runtime, StorageAdapter } from "@triplex-build/triplex/runtime";
import { makeQleverStorageAdapter } from "../../../../packages/qlever/src/QleverStorageAdapter.ts";
import { makeQleverQueryExecutor } from "../../../../packages/qlever/src/QleverQueryExecutor.ts";
import { HostBroker } from "../../../../packages/qlever/src/broker/broker.ts";
import type { QleverClient } from "../../../../packages/qlever/src/QleverClient.ts";

it("broker public transact rejects +/-2^59 outside the QLever domain as InvalidTripleError", async () => {
  const root = process.env.V_P2Q_OUT!;
  fs.mkdirSync(root, { recursive: true });
  const scope = "review-0314:"+randomUUID();
  const broker = await HostBroker.open({ dir: path.join(root,"broker"), scopeKey: scope, minFreeBytes: 0 });
  const client: QleverClient = {
    query: async (sparql) => {
      if (sparql === "SELECT ?s WHERE { ?s ?p ?o } LIMIT 1") return [];
      throw new TypeError("offline fixture", {cause: Object.assign(new Error("fixture"), { code: "ECONNREFUSED" })});
    },
    update: async () => ({}), command: async () => ({}), cancel: async () => {}, close: async () => {},
  };
  const adapter = makeQleverStorageAdapter(client,scope,{broker});
  const a0 = makeQleverStorageAdapter(client,scope);
  const runtime = ManagedRuntime.make(Runtime.define({
    name: "review-0314",
    storage: Layer.succeed(StorageAdapter,adapter),
    queries: Layer.succeed(QueryExecutor,makeQleverQueryExecutor(client,scope)),
  }).layer({ scope: DatabaseScope.test(scope), capabilities: Capabilities.none }));
  const observations: unknown[] = [];
  try {
    const triples = await runtime.runPromise(Triples);
    const entityId = EntityId.make("review-subject");
    // A real durable boundary write proves the offline fixture can commit, resolve and read.
    const positive = await runtime.runPromise(triples.transact([{op:"assert",entityId,attribute:":review/valid",value:integer((1n<<59n)-1n)}],{commandId:"valid"}));
    expect(positive.position).toBeGreaterThan(0);
    expect((await runtime.runPromise(triples.transactionByCommand("valid")))?.txId).toBe(positive.txId);
    for (const [i,raw] of [1n<<59n, -(1n<<59n)-1n].entries()) {
      const before = broker.head();
      const result = await runtime.runPromise(triples.transact([{op:"assert",entityId,attribute:":review/invalid",value:integer(raw)}],{commandId:"outside-"+i}).pipe(Effect.match({onFailure:error=>({ok:false as const,error}),onSuccess:value=>({ok:true as const,value})})));
      const receipt = await runtime.runPromise(triples.transactionByCommand("outside-"+i));
      observations.push({raw:String(raw),before,after:broker.head(),receipt,result});
    }
    fs.writeFileSync(path.join(root,"observations.json"),JSON.stringify({a0Domain:a0.valueDomain?.id,brokerDomain:adapter.valueDomain?.id??null,observations},null,2));
    for (const observation of observations as any[]) {
      expect(observation.after).toBe(observation.before);
      expect(observation.receipt).toBeNull();
      expect(observation.result.ok).toBe(false);
      expect(observation.result.error).toBeInstanceOf(InvalidTripleError);
    }
  } finally {
    await runtime.dispose();
    await broker.close();
  }
});

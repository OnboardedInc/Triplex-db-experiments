// [EXP-QH1] Why: measure the built public Triples service on detached H1, not bare worker SQL.
// Rejected: lab source imports and a raw-byte client surface (R46 3.4/Q99c).
import { Effect, Layer, ManagedRuntime } from "effect";
import * as core from "../../../packages/core/dist/index.js";
import * as rt from "../../../packages/core/dist/runtime/index.js";
import * as q from "../../../packages/qlever/dist/index.js";
import type { TriplesHandle } from "./triplex.ts";
export async function openBrokerH1(scope: string): Promise<TriplesHandle> {
  const dir = process.env.TX2_QH1_DIR;
  if (!dir) throw Error("broker-h1 requires an owned TX2_QH1_DIR");
  const broker = await q.HostBroker.open({
    dir,
    scopeKey: scope,
    minFreeBytes: 5 * 1024 ** 3,
    frameRetention: { tailFrames: 1024 },
  });
  const client: any = {
    query: async () => {
      throw new TypeError("detached", {
        cause: Object.assign(new Error("offline"), { code: "ECONNREFUSED" }),
      });
    },
    update: async () => {
      throw Error("detached");
    },
    command: async () => {
      throw Error("detached");
    },
    cancel: async () => {},
    close: async () => {},
  };
  const adapter = q.makeQleverBrokerStorageAdapter(client, scope, broker, { currentRoute: "h1" });
  const runtime = ManagedRuntime.make(
    rt.Runtime.define({
      name: "broker-h1",
      storage: Layer.succeed(rt.StorageAdapter, adapter),
      queries: Layer.succeed(
        rt.QueryExecutor,
        q.makeQleverQueryExecutor(client, scope, { sourceView: adapter.sourceView }),
      ),
    }).layer({ scope: rt.DatabaseScope.test(scope), capabilities: rt.Capabilities.none }),
  );
  const triples = await runtime.runPromise(Effect.service(core.Triples));
  return {
    backend: { name: "qlever", url: "detached-host-store", queryPath: "h1" },
    scope,
    triples,
    storage: adapter,
    run: (effect) => runtime.runPromise(effect),
    runExit: (effect) => runtime.runPromiseExit(effect),
    close: async () => {
      await runtime.dispose();
      await broker.close();
    },
  };
}

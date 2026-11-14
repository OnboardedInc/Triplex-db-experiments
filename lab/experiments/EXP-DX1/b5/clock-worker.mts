// [DX-B5-L0] Why: independent processes have independent clocks and HTTP submission sequences.
// Rejected: worker threads alone (share a process and do not exercise distributed clock replay).
import { Effect, Layer, ManagedRuntime } from "effect";
import { Triples } from "../../../../packages/core/dist/index.js";
import {
  Runtime,
  StorageAdapter,
  QueryExecutor,
  Capabilities,
} from "../../../../packages/core/dist/runtime/index.js";
import {
  DatomicClient,
  makeDatomicStorageAdapter,
  makeDatomicQueryExecutor,
} from "../../../../packages/datomic/dist/index.js";
const [scope, worker] = process.argv.slice(2);
const client = new DatomicClient(process.env.DATOMIC_GATEWAY_URL ?? "http://127.0.0.1:8505", 30000);
const adapter = makeDatomicStorageAdapter(client, scope!, { maxRetries: 30 });
const runtime = ManagedRuntime.make(
  Runtime.define({
    name: "b5-clock",
    storage: Layer.succeed(StorageAdapter, adapter),
    queries: Layer.succeed(QueryExecutor, makeDatomicQueryExecutor(client, scope!)),
  }).layer({ scope: scope! as never, capabilities: Capabilities.none }),
);
try {
  const triples = await runtime.runPromise(Triples),
    receipts = [];
  for (let i = 0; i < 500; i++) {
    const receipt = await runtime.runPromise(
      triples.transact(
        [
          {
            op: "assert",
            entityId: `worker-${worker}` as never,
            attribute: ":clock/value" as never,
            value: { type: "string", value: String(i) },
            validFrom: 0,
          },
        ],
        { commandId: `w${worker}-${i}` },
      ),
    );
    receipts.push({
      position: receipt.position,
      instant: receipt.instant,
      ids: receipt.triples.map((t) => t.id),
    });
  }
  process.stdout.write(JSON.stringify({ worker, receipts, diagnostics: client.commitDiagnostics }));
} finally {
  await runtime.dispose();
  client.close();
}

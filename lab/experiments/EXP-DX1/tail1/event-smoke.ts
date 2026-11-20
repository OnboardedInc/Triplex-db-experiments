import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { Effect, Layer, ManagedRuntime } from "effect";
import { Triples } from "../../../../packages/core/dist/index.js";
import {
  Capabilities,
  DatabaseScope,
  QueryExecutor,
  Runtime,
  StorageAdapter,
} from "../../../../packages/core/dist/runtime/index.js";
import {
  DatomicClient,
  makeDatomicStorageAdapter,
  makeDatomicQueryExecutor,
  beginTrace,
  currentTrace,
  finishTrace,
  flushTracing,
  traceNow,
  withTrace,
} from "../../../../packages/datomic/dist/index.js";

const [output, nonce] = process.argv.slice(2);
const { DATOMIC_GATEWAY_URL, TRIPLEX_TRACE_RUN: slot, TRIPLEX_TRACE_SOURCE: source } = process.env;
assert(DATOMIC_GATEWAY_URL);
assert(
  output &&
    nonce &&
    slot?.endsWith(nonce) &&
    source?.match(/^[0-9a-f]{40}$/),
);
const scope = DatabaseScope.test(`DX-TAIL1-events-${nonce}`);
const native = new Map<string, string>();
let database: string | undefined;
class ObservedClient extends DatomicClient {
  override async request<T>(...args: Parameters<DatomicClient["request"]>): Promise<T> {
    const response = await super.request<T>(...args);
    if (args[1] === "/v1/db/create") {
      const observed = (response as { db?: string }).db;
      assert(observed && (!database || database === observed));
      database = observed;
    }
    const trace = currentTrace();
    if (trace?.name === "tail1.event-smoke" && args[1].endsWith("/transact")) {
      const t = (response as { t?: { v?: string } }).t?.v;
      assert(typeof t === "string" && /^\d+$/.test(t) && !native.has(trace.traceId));
      native.set(trace.traceId, t);
    }
    return response;
  }
}
const client = new ObservedClient(DATOMIC_GATEWAY_URL, 30_000);
const adapter = makeDatomicStorageAdapter(client, scope, { layout: "lean" });
const runtime = ManagedRuntime.make(
  Runtime.define({
    name: "DX-TAIL1-events",
    storage: Layer.succeed(StorageAdapter, adapter),
    queries: Layer.succeed(QueryExecutor, makeDatomicQueryExecutor(client, scope)),
  }).layer({ scope, capabilities: Capabilities.none }),
);
const assertion = (subject: number, field: number) => ({
  op: "assert" as const,
  entityId: `event-${subject}` as never,
  attribute: `:event-${field}` as never,
  value: { type: "integer" as const, value: String(subject * 10 + field) },
  validFrom: 0,
});
try {
  const triples = await runtime.runPromise(Triples);
  // [DX-TAIL1] Why: create the scope once and measure the save of each new subject with the same five-field command.
  // Rejected: speculative keep-warm saves or a timing comparison between predecessor and snapshot modes.
  assert.deepEqual(await Effect.runPromise(adapter.getByEntity("event-0")), []);
  const rows = [];
  for (let subject = 0; subject < 192; subject++) {
    const operations = Array.from({ length: 5 }, (_, field) => assertion(subject, field));
    const trace = beginTrace("commit", "tail1.event-smoke", { subject });
    assert(trace);
    const ack = await withTrace(trace, () => runtime.runPromise(triples.transact(operations)));
    const ackAt = traceNow();
    finishTrace(trace, { position: ack.position }, ackAt);
    const t = native.get(trace.traceId);
    assert(t && ack.position > 0);
    assert.deepEqual(
      ack.triples.map((triple) => triple.value),
      operations.map((operation) => operation.value),
    );
    rows.push({
      subject,
      traceId: trace.traceId,
      t,
      position: ack.position,
      start: trace.start,
      ackAt,
      assertions: ack.triples.map((triple) => triple.id),
    });
  }
  assert.equal(new Set(rows.map((r) => r.t)).size, rows.length);
  for (const row of rows) {
    const observed = await Effect.runPromise(adapter.getByEntity(`event-${row.subject}`));
    assert.deepEqual(observed.map((field) => field.id).sort(), [...row.assertions].sort());
  }
  await flushTracing();
  assert(database);
  const databaseHash = createHash("sha256").update(database).digest("hex");
  writeFileSync(output, JSON.stringify({ source, slot, nonce, databaseHash, rows }) + "\n", {
    flag: "wx",
  });
} finally {
  await runtime.dispose();
  client.close();
}

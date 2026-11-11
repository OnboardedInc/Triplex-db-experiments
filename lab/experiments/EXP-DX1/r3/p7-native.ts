import assert from "node:assert/strict";
import { DatomicClient } from "../../../../packages/datomic/dist/index.js";
import { openComposition } from "../../../bench/lib/composition.ts";
import { seedRung } from "../../../bench/lib/seed.ts";
import { Effect, openTriples, runtimeApi } from "../../../bench/lib/triplex.ts";

// [DX-R3-P7] Why: run the public seed and pipelined writer against the same immutable clock policy.
// Rejected: low-level rows only (do not exercise runtime clock selection or its replay path).
const endpoint = process.env.DATOMIC_URL!;
let collect: number[] | undefined;
const request = DatomicClient.prototype.request;
DatomicClient.prototype.request = async function (method, path, body, timeout, sent) {
  try {
    const out: any = await request.call(this, method, path, body, timeout, sent);
    if (path.endsWith("/transact") && collect) collect.push(out.transactMicros / 1000);
    return out;
  } catch (e: any) {
    if (path.endsWith("/transact"))
      console.log(
        JSON.stringify({
          kind: "source-rejection",
          code: e.code,
          status: e.status,
          message: e.message,
          maximum: e.maximum,
          sequence: (body as any)?.sendSequence,
          operationId: (body as any)?.operationId,
          claims: (body as any)?.claims,
        }),
      );
    throw e;
  }
};
const client = new DatomicClient(endpoint, 30000);
const summary = (values: number[]) => {
  values.sort((a, b) => a - b);
  return {
    count: values.length,
    p50: values[Math.floor(values.length * 0.5)],
    p99: values[Math.floor(values.length * 0.99)],
  };
};
try {
  for (const [arm, strict] of [true, false, false, true].entries()) {
    const scope = `dxr3-p7-${Date.now()}-${arm}`;
    const stored = await client.create(runtimeApi.DatabaseScope.test(scope), "lean", strict);
    assert.equal(stored.created, true);
    assert.equal(stored.strictRecordClocks, strict);
    const comp = await openComposition("reach", "datomic", scope);
    try {
      if (arm === 0) {
        const seed = await seedRung({
          comp,
          subjects: 2000,
          runTag: scope,
          batchFacts: 2000,
          budgetMs: 600000,
          recordSubjects: new Set(),
          recordAccounts: new Set(),
          historySubjects: new Set(),
          log: console.log,
        });
        assert(seed.complete && seed.failures.length === 0);
        console.log(
          JSON.stringify({
            kind: "strict-public-seed",
            subjects: seed.seededSubjects,
            commands: seed.commands,
            failures: seed.failures,
            wallMs: seed.wallMs,
          }),
        );
      }
      if (strict) {
        const h = await openTriples("datomic", scope);
        try {
          const batched: any[] = await h.run(
            h.storage.withTransaction(
              Effect.gen(function* () {
                const out = [];
                for (let i = 0; i < 8; i++)
                  out.push(
                    yield* h.triples.transact(
                      [
                        {
                          op: "assert",
                          entityId: `nested-${i}`,
                          attribute: ":p7/value",
                          value: { type: "string", value: String(i) },
                        },
                      ],
                      { commandId: `${scope}:nested:${i}` },
                    ),
                  );
                return out;
              }),
              { replaySafe: true },
            ),
          );
          assert.equal(new Set(batched.map((r) => r.instant)).size, 1);
          assert.equal(batched.length, 8);
          console.log(
            JSON.stringify({
              kind: "strict-public-physical-batch",
              journals: 8,
              instant: batched[0].instant,
            }),
          );
        } finally {
          await h.close();
        }
        const p = Number((await client.basis(stored.db)).position.v);
        await client.transact(stored.db, {
          sourceK: p,
          position: p + 1,
          span: 1,
          operationId: `${scope}:advance`,
          attemptId: "advance",
          rows: [],
          newIds: [],
          claims: [
            { commandId: `${scope}:advance`, txId: "advance", timestamp: Date.now() + 1000000 },
          ],
        });
      }
      // [DX-R3-P7] Why: resolve the deliberately injected maximum before the matched timed trace.
      // Rejected: charging only strict arms for injected ClockConflict retries.
      const warmup = await comp.transact(
        [
          {
            op: "assert",
            entityId: "warmup",
            attribute: ":p7/value",
            value: { type: "string", value: "warmup" },
          },
        ],
        { commandId: `${scope}:warmup` },
      );
      assert(warmup.ok, JSON.stringify(warmup));
      const latencies: number[] = [],
        receipts: any[] = [],
        gateway: number[] = [];
      collect = gateway;
      let next = 0,
        active = 0,
        peak = 0;
      await Promise.all(
        Array.from({ length: 32 }, async () => {
          while (next < 256) {
            const n = next++,
              start = performance.now();
            active++;
            peak = Math.max(peak, active);
            try {
              const result = await comp.transact(
                Array.from({ length: 8 }, (_, k) => ({
                  op: "assert",
                  entityId: `p7-${n}`,
                  attribute: `:p7/value${k}`,
                  value: { type: "string", value: `${n}:${k}` },
                })),
                { commandId: `${scope}:${n}` },
              );
              assert(result.ok, JSON.stringify(result));
              receipts.push(result.value);
              latencies.push(performance.now() - start);
            } finally {
              active--;
            }
          }
        }),
      );
      collect = undefined;
      assert.equal(gateway.length, 256);
      assert(gateway.every(Number.isFinite));
      assert.equal(peak, 32);
      assert.equal(receipts.length, 256);
      assert.equal(new Set(receipts.map((r) => r.position)).size, 256);
      const sorted = receipts.sort((a, b) => a.position - b.position);
      if (strict)
        for (let i = 1; i < sorted.length; i++) assert(sorted[i].instant > sorted[i - 1].instant);
      for (let n = 0; n < 256; n++) {
        const record = await comp.transactionByCommand(`${scope}:${n}`);
        assert(record.ok && record.value, `durable command ${n}`);
        assert.deepEqual(
          record.value.changes
            .map((r: any) => ({
              op: r.op,
              entityId: r.entityId,
              attribute: r.attribute,
              value: r.value,
            }))
            .sort((a: any, b: any) => a.attribute.localeCompare(b.attribute)),
          Array.from({ length: 8 }, (_, k) => ({
            op: "assert",
            entityId: `p7-${n}`,
            attribute: `:p7/value${k}`,
            value: { type: "string", value: `${n}:${k}` },
          })),
        );
      }
      console.log(
        JSON.stringify({
          kind: "zero-reader-pipeline",
          arm,
          strict,
          inFlight: peak,
          factsPerCommand: 8,
          commitMs: summary(latencies),
          gatewayTransactMs: summary(gateway),
          verified: 256,
        }),
      );
    } finally {
      await comp.close();
      await client.delete(runtimeApi.DatabaseScope.test(scope));
    }
  }
} finally {
  client.close();
}

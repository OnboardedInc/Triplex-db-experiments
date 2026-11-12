import assert from "node:assert/strict";
import test from "node:test";
import { datomicWriterDiagnostics, installDatomicPublication } from "../../../bench/lib/datomic-publication.ts";

test("writer counters retain internal refusals and replays without retrying or changing responses", async () => {
  class Client {
    commitDiagnostics = { replays: 0, clockReplays: 0 };
    calls = 0;
    async request(_method: string, _path: string, input: any) {
      this.calls++;
      if (input.refuse) throw Object.assign(new Error("source clock"), { status: 409, code: "ClockConflict" });
      return { operationId: input.operationId, position: { t: "long", v: "7" }, delta: 0 };
    }
    async transact(db: string, input: any) { return this.request("POST", `/v1/db/${db}/transact`, input); }
  }
  const previous = process.env.DX_R3_SOURCE_DIAGNOSTICS;
  process.env.DX_R3_SOURCE_DIAGNOSTICS = "1";
  installDatomicPublication({ DatomicClient: Client });
  if (previous === undefined) delete process.env.DX_R3_SOURCE_DIAGNOSTICS; else process.env.DX_R3_SOURCE_DIAGNOSTICS = previous;
  const client = new Client(), before = datomicWriterDiagnostics();
  await assert.rejects(client.transact("db", { refuse: true }), /source clock/);
  client.commitDiagnostics.replays++; client.commitDiagnostics.clockReplays++;
  const result = await client.transact("db", { position: 7, operationId: "op" });
  assert.equal(result.operationId, "op"); assert.equal(client.calls, 2);
  const after = datomicWriterDiagnostics();
  assert.equal(after.requests-before.requests, 2);
  assert.equal(after.errors.ClockConflict-(before.errors.ClockConflict ?? 0), 1);
  assert.equal(after.statuses['409']-(before.statuses['409'] ?? 0), 1);
  assert.equal(after.statuses['2xx']-(before.statuses['2xx'] ?? 0), 1);
  assert.equal(after.counters.replays-(before.counters.replays ?? 0), 1);
});

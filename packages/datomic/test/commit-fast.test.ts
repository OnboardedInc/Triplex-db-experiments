import { randomUUID } from "node:crypto";
import { Effect, Layer, ManagedRuntime } from "effect";
import { describe, expect, it, vi } from "vitest";
import { Triples, EntityId, Attribute } from "@triplex-build/triplex";
import {
  Runtime,
  StorageAdapter,
  QueryExecutor,
  DatabaseScope,
  Capabilities,
} from "@triplex-build/triplex/runtime";
import { DatomicClient } from "../src/DatomicClient.js";
import { makeDatomicStorageAdapter } from "../src/DatomicStorageAdapter.js";
import { makeDatomicQueryExecutor } from "../src/DatomicQueryExecutor.js";

// [EXP-DX1] Why: count the complete public command, including TripleLive and journal writes.
// Rejected: timing/counting only a direct adapter transaction with no precondition or command id.
describe.skipIf(process.env["DATOMIC_INTEGRATION"] !== "1")("two-call commits", () => {
  it("prefetches once, preserves duplicates/stale conditions/lost ACK, releases failed handles", async () => {
    const scope = DatabaseScope.test(`dx1-commit-${randomUUID()}`);
    const client = new DatomicClient(
      process.env["DATOMIC_GATEWAY_URL"] ?? "http://127.0.0.1:8490",
      5000,
    );
    const a = makeDatomicStorageAdapter(client, scope);
    const runtime = ManagedRuntime.make(
      Runtime.define({
        name: "dx1-commit",
        storage: Layer.succeed(StorageAdapter, a),
        queries: Layer.succeed(QueryExecutor, makeDatomicQueryExecutor(client, scope)),
      }).layer({ scope, capabilities: Capabilities.none }),
    );
    try {
      const triples = await runtime.runPromise(Triples);
      const first = await runtime.runPromise(
        triples.assert({
          entityId: EntityId.make("root"),
          attribute: Attribute.make(":dx/stamp"),
          value: { type: "integer", value: "0" },
        }),
      );
      const ops = [
        { op: "retract" as const, id: first.id },
        ...Array.from({ length: 9 }, (_, i) => ({
          op: "assert" as const,
          entityId: EntityId.make("root"),
          attribute: Attribute.make(":dx/stamp"),
          value: { type: "integer" as const, value: String(i + 1) },
        })),
      ];
      const meta = {
        commandId: "dx1-command",
        preconditions: [{ _tag: "TripleLive" as const, id: first.id }],
      };
      const spy = vi.spyOn(client, "request");
      const result = await runtime.runPromise(triples.transact(ops, meta));
      expect(spy).toHaveBeenCalledTimes(2);
      expect(spy.mock.calls.map((c) => c[1].split("/").at(-1))).toEqual(["begin", "transact"]);
      const submit = spy.mock.calls[1]![2] as { handle: string; release: boolean };
      expect(submit.release).toBe(true);
      spy.mockRestore();
      const db = (await client.create(scope)).db;
      await expect(client.rows(db, { handle: submit.handle })).rejects.toMatchObject({ code: "SnapshotExpired" });
      await expect(runtime.runPromise(triples.transact(ops, meta))).rejects.toMatchObject({
        _tag: "CommandAlreadyCommittedError", commandId: meta.commandId, transactionId: result.txId,
      });
      await expect(
        runtime.runPromise(triples.transact(ops, { ...meta, commandId: "stale" })),
      ).rejects.toMatchObject({ _tag: "TransactionConflictError" });
      // Lose the actual post-commit ACK, then resolve the original operation without replaying it.
      const transact = client.transact.bind(client);
      client.transact = async (...args) => {
        await transact(...args);
        throw Error("diagnostic lost ACK");
      };
      const lost = await runtime.runPromise(
        triples.transact(
          [
            {
              op: "assert",
              entityId: EntityId.make("root"),
              attribute: Attribute.make(":dx/ack"),
              value: { type: "string", value: "resolved-once" },
            },
          ],
          { commandId: "lost" },
        ),
      );
      expect(lost.position).toBe(result.position + 1);
      client.transact = transact;
      expect(
        (await runtime.runPromise(triples.entity(EntityId.make("root")))).filter(
          (t) => t.attribute === ":dx/ack",
        ),
      ).toHaveLength(1);
      const begin = await client.request<{ handle: string; position: { v: string } }>(
        "POST",
        `/v2/db/${db}/begin`,
        {},
      );
      await expect(
        client.request("POST", `/v1/db/${db}/transact`, {
          handle: begin.handle,
          release: true,
          sourceK: 0,
          position: 1,
          operationId: randomUUID(),
          rows: [],
          newIds: [],
          claims: [],
        }),
      ).rejects.toThrow();
      await expect(client.rows(db, { handle: begin.handle })).rejects.toMatchObject({ code: "SnapshotExpired" });
    } finally {
      await runtime.dispose();
      await client.delete(scope);
      client.close();
    }
  }, 30000);
});

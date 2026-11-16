import { Effect } from "effect";
import { expect, it } from "vitest";
import { DatomicClient } from "../src/DatomicClient.js";
import { makeDatomicStorageAdapter } from "../src/DatomicStorageAdapter.js";
import { encodeRowText } from "../src/rowText.js";

// [DX-T1-12] Why: the normal suite runs this same fake transport under baseline and opt-in staging paths, including rollback.
// Rejected: a throughput-only assertion or an engine PASS inferred from a mocked commit.
it("stages a batch in order with exact values, one physical submission and consuming clocks", async () => {
  const client = new DatomicClient("http://127.0.0.1:1");
  const sent: any[] = [];
  client.create = async () => ({
    db: "scope",
    created: false,
    schemaHash: "",
    strictRecordClocks: true,
  });
  client.begin = async () => ({ handle: "held", position: 0 });
  client.release = async () => ({});
  client.transact = async (_db, input) => {
    sent.push(input);
    return {
      operationId: input.operationId,
      position: { t: "long", v: String(input.position) },
      t: { t: "long", v: "1" },
      datoms: input.rows.length,
      delta: 0,
      recordedAt: { t: "double", v: 101 },
    };
  };
  const adapter = makeDatomicStorageAdapter(client, "staging-batch", { resolutionTimeoutMs: 100 });
  try {
    await Effect.runPromise(adapter.initialize());
    const rows = await Effect.runPromise(
      adapter.withTransaction(
        Effect.gen(function* () {
          const p = yield* adapter.nextCommitPosition();
          return yield* adapter.batchInsert(
            [
              {
                entityId: "root",
                attribute: ":n",
                value: { type: "number", value: 0 },
                validFrom: 7,
              },
              {
                entityId: "root",
                attribute: ":j",
                value: { type: "json", value: { z: [1, "😀"], a: true } },
                validTo: 200,
              },
            ] as any,
            "tx",
            100,
            ["one", "two"],
            p,
          );
        }),
        { replaySafe: true },
      ),
    );
    expect(sent).toHaveLength(1);
    expect(sent[0].newIds).toEqual(["one", "two"]);
    expect(rows.map((r) => r.id)).toEqual(["one", "two"]);
    expect(Object.is(rows[0]!.value_number, -0)).toBe(false);
    expect(rows[1]!.value_json).toBe('{"a":true,"z":[1,"😀"]}');
    expect(encodeRowText(rows[0]!)).toContain('"one"');
    expect(adapter.committedInstant!("tx")).toBe(101);
    expect(adapter.committedInstant!("tx")).toBeUndefined();
    await expect(
      Effect.runPromise(
        adapter.withTransaction(
          adapter.batchInsert(
            [
              { entityId: "root", attribute: ":v", value: { type: "string", value: "a" } },
              { entityId: "root", attribute: ":v", value: { type: "string", value: "b" } },
            ] as any,
            "bad",
            200,
            ["same", "same"],
            2,
          ),
        ),
      ),
    ).rejects.toThrow("Invalid Datomic assertion");
    expect(sent).toHaveLength(1);
    await expect(
      Effect.runPromise(adapter.withTransaction(adapter.batchInsert([], "bad", 200, ["extra"], 2))),
    ).rejects.toThrow("count mismatch");
    expect(sent).toHaveLength(1);
  } finally {
    await Effect.runPromise(adapter.close());
    client.close();
  }
});

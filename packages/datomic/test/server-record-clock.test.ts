import { expect, it } from "vitest";
import { Effect } from "effect";
import { randomUUID } from "node:crypto";
import { DatomicClient } from "../src/DatomicClient.js";
import { makeDatomicStorageAdapter } from "../src/DatomicStorageAdapter.js";
import { registerCommit, endCommit } from "../src/CommitOrder.js";
import { assignRecordTime } from "../src/recordClock.js";

// [DX-T1-5] Why: strict assignment bypasses tickets and resolves the durable clock on the same operation after an ACK loss.
// Rejected: accepting a fabricated local clock or replaying a command that already applied.
it("uses server clocks without ticket order or clock replay, including outcome resolution", async () => {
  for (const lost of [false, true]) {
    const client = new DatomicClient("http://127.0.0.1:1"),
      scope = randomUUID();
    client.create = async () => ({
      db: "scope",
      created: false,
      schemaHash: "",
      strictRecordClocks: true,
    });
    client.begin = async () => ({ handle: "held", position: 0 });
    client.release = async () => ({});
    let submissions = 0;
    client.transact = async (_db, input) => {
      submissions++;
      expect(input.sendSequence).toBeUndefined();
      expect(input.clientId).toBeUndefined();
      expect(input.assignRecordTime).toBe(true);
      expect(input.rows[0]!.recorded_at).toBe(100);
      if (lost) throw Error("lost applied ACK");
      return {
        operationId: input.operationId,
        position: { t: "long", v: "1" },
        t: { t: "long", v: "1" },
        datoms: 1,
        recordedAt: { t: "double", v: 1001 },
      };
    };
    client.operation = async (_db, operationId) => ({
      status: "committed",
      operationId,
      position: { t: "long", v: "1" },
      t: { t: "long", v: "1" },
      recordedAt: { t: "double", v: 1001 },
    });
    const blocked = registerCommit(-10000, {});
    const a = makeDatomicStorageAdapter(client, scope);
    try {
      await Effect.runPromise(a.initialize());
      await Effect.runPromise(
        a.withTransaction(
          Effect.gen(function* () {
            const t = yield* a.transactionInstant!(100),
              p = yield* a.nextCommitPosition();
            expect(yield* a.withTransaction(a.transactionInstant!(500))).toBe(100);
            yield* a.insert(
              {
                entityId: "root",
                attribute: ":v",
                value: { type: "string", value: "v" },
                validFrom: 7,
              } as any,
              "tx",
              t,
              "row",
              p,
            );
          }),
          { replaySafe: true },
        ),
      );
      expect(a.committedInstant!("tx")).toBe(1001);
      expect(submissions).toBe(1);
      expect(client.commitDiagnostics.clockReplays).toBe(0);
      expect(client.commitDiagnostics.ticketWaitMicros).toBe(0);
      expect(client.commitDiagnostics.serverAssignedSubmissions).toBe(1);
    } finally {
      endCommit(blocked);
      client.close();
    }
  }
});
it("retimes only this physical commit's record metadata, not validity or old assertion clocks", () => {
  const row: any = {
    id: "a",
    recorded_at: 50,
    retracted_at: 100,
    valid_from: 7,
    valid_to: 90,
    attribute: ":_tx/change",
    value_json: JSON.stringify({ tripleId: "old", recordedAt: 50, retractedAt: 100, validFrom: 7 }),
  };
  expect(assignRecordTime(row, false, 101, new Set(["a"]))).toMatchObject({
    recorded_at: 50,
    retracted_at: 101,
    valid_from: 7,
    valid_to: 90,
  });
  const r = assignRecordTime(row, true, 101, new Set(["a"]));
  expect(JSON.parse(r.value_json!)).toEqual({
    tripleId: "old",
    recordedAt: 50,
    retractedAt: 101,
    validFrom: 7,
  });
  expect(
    JSON.parse(assignRecordTime(row, true, 101, new Set(["old"])).value_json!).recordedAt,
  ).toBe(101);
});

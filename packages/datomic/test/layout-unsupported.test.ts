import { randomUUID } from "node:crypto";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { DatabaseScope } from "@triplex-build/triplex/runtime";
import { DatomicClient } from "../src/DatomicClient.js";
import { makeDatomicStorageAdapter } from "../src/DatomicStorageAdapter.js";
import { makeDatomicQueryExecutor } from "../src/DatomicQueryExecutor.js";
import { DatomicLayoutUnsupported } from "../src/readErrors.js";
// [DX-B5-L2] Why: absence of native lean query support must remain a typed error, never an empty answer.
// Rejected: transport-only fixtures as proof of native dispatch.
describe.skipIf(process.env.DATOMIC_INTEGRATION !== "1")("lean unsupported routes", () => {
  it("returns explicit q/log conflicts and preserves born-retired history", async () => {
    const c = new DatomicClient(process.env.DATOMIC_GATEWAY_URL ?? "http://127.0.0.1:8505", 30000);
    const scope = DatabaseScope.test(`b5-unsupported-${randomUUID()}`),
      a = makeDatomicStorageAdapter(c, scope, { layout: "lean" });
    try {
      await Effect.runPromise(a.initialize());
      const { db } = await c.create(scope);
      const q = makeDatomicQueryExecutor(c, scope);
      await expect(
        Effect.runPromise(
          q.execute({ find: ["?e"], where: [["?e", ":a", "?v"]] }, false, { validAt: 0 }),
        ),
      ).rejects.toBeInstanceOf(DatomicLayoutUnsupported);
      await expect(c.log(db, "0")).rejects.toMatchObject({
        status: 409,
        code: "LayoutUnsupported",
        route: "log",
      });
      await Effect.runPromise(
        a.withTransaction(
          Effect.gen(function* () {
            const p = yield* a.nextCommitPosition();
            yield* a.insert(
              { entityId: "e", attribute: ":a", value: { type: "string", value: "value" } },
              "tx",
              1,
              "born-dead",
              p,
            );
            expect(yield* a.getByEntity("e")).toHaveLength(1);
            yield* a.retract("born-dead", 2, "retire", p);
            expect(yield* a.getByEntity("e")).toHaveLength(0);
          }),
        ),
      );
      expect(await Effect.runPromise(a.getByEntity("e"))).toEqual([]);
      expect(await Effect.runPromise(a.history("e"))).toMatchObject([
        {
          id: "born-dead",
          recorded_at: 1,
          retracted_at: 2,
          retracted_position: 1,
          retract_tx_id: "retire",
        },
      ]);
      await Effect.runPromise(
        a.withTransaction(
          Effect.gen(function* () {
            const p = yield* a.nextCommitPosition();
            yield* a.insert(
              { entityId: "empty", attribute: ":a", value: { type: "string", value: "v" } },
              "tx",
              3,
              "empty-id",
              p,
            );
          }),
        ),
      );
      await Effect.runPromise(
        a.withTransaction(
          Effect.gen(function* () {
            const p = yield* a.nextCommitPosition();
            yield* a.retract("empty-id", 4, "", p);
          }),
        ),
      );
      expect((await Effect.runPromise(a.history("empty")))[0]!.retract_tx_id).toBe("");
      await expect(
        Effect.runPromise(
          a.withTransaction(
            Effect.gen(function* () {
              const p = yield* a.nextCommitPosition();
              yield* a.insert(
                { entityId: "other", attribute: ":a", value: { type: "string", value: "changed" } },
                "tx",
                5,
                "empty-id",
                p,
              );
            }),
          ),
        ),
      ).rejects.toBeDefined();
      expect((await Effect.runPromise(a.getReachRows!("e", { validAt: 10 })))!).toEqual([]);
    } finally {
      await c.delete(scope);
      c.close();
    }
  });
});

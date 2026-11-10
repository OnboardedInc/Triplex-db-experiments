import { randomUUID } from "node:crypto";
import { Effect, Layer, ManagedRuntime } from "effect";
import { describe, expect, it, vi } from "vitest";
import { Attribute, EntityId, Triples } from "@triplex-build/triplex";
import {
  Capabilities,
  DatabaseScope,
  QueryExecutor,
  Runtime,
  StorageAdapter,
} from "@triplex-build/triplex/runtime";
import { DatomicClient } from "../src/DatomicClient.js";
import { makeDatomicStorageAdapter } from "../src/DatomicStorageAdapter.js";
import { makeDatomicQueryExecutor } from "../src/DatomicQueryExecutor.js";

// [DX-B4-T1] Why: compare public ordered pages with the original implementation at the same quiescent head.
// Rejected: comparing unordered IDs or counting declines as exercised fast answers.
describe.skipIf(process.env["DATOMIC_INTEGRATION"] !== "1")("indexed journals", () => {
  const client = () =>
    new DatomicClient(process.env["DATOMIC_GATEWAY_URL"] ?? "http://127.0.0.1:8501", 30000);
  const setup = async (c: DatomicClient) => {
    const scope = DatabaseScope.test(`dxb4-${randomUUID()}`),
      a = makeDatomicStorageAdapter(c, scope);
    const {
      getTransactionsAfter: _feed,
      getTransactionIdByCommand: _command,
      ...slow
    } = makeDatomicStorageAdapter(c, scope, { indexedJournalReads: false });
    const make = (storage: typeof slow) =>
      ManagedRuntime.make(
        Runtime.define({
          name: "dxb4",
          storage: Layer.succeed(StorageAdapter, storage),
          queries: Layer.succeed(QueryExecutor, makeDatomicQueryExecutor(c, scope)),
        }).layer({
          scope,
          capabilities: Capabilities.none,
          deterministic: { startTime: 1000, seed: "dxb4" },
        }),
      );
    const fast = make(a),
      fallback = make(slow);
    const t = await fast.runPromise(Triples),
      oracle = await fallback.runPromise(Triples);
    return {
      a,
      t,
      oracle,
      fast,
      fallback,
      scope,
      close: async () => {
        await fast.dispose();
        await fallback.dispose();
        await c.delete(scope);
      },
    };
  };
  const op = (n: number) => ({
    op: "assert" as const,
    entityId: EntityId.make(`e${n % 3}`),
    attribute: Attribute.make(":test/value"),
    value: { type: "string" as const, value: `v${n}` },
  });
  it("deep-equals random feed pages and every command over 100 scopes including nested commits and retractions", async () => {
    const c = client();
    let seed = 0x51b4,
      fastAnswers = 0;
    const rand = () => {
      seed ^= seed << 13;
      seed ^= seed >>> 17;
      seed ^= seed << 5;
      return seed >>> 0;
    };
    try {
      for (let scenario = 0; scenario < 100; scenario++) {
        const s = await setup(c);
        try {
          let previous: any;
          const commands: string[] = [];
          for (let n = 0; n < 5; n++) {
            const commandId = `cmd-${n}`;
            commands.push(commandId);
            const operations: any[] = [op(rand())];
            if (previous && n % 2)
              operations.unshift({ op: "retract", id: previous.triples[0].id });
            if (n === 3) {
              await s.fast.runPromise(
                s.a.withTransaction(
                  Effect.gen(function* () {
                    previous = yield* s.t.transact(operations, { commandId });
                    yield* s.t.transact([op(rand())]);
                  }),
                ),
              );
            } else
              previous = await s.fast.runPromise(
                s.t.transact(operations, n % 2 ? undefined : { commandId }),
              );
          }
          // [DX-B4-T1] Why: maintenance/SPI writes can consume a physical position without a journal.
          // Rejected: counting each physical commit as one public transaction record.
          await Effect.runPromise(
            s.a.withTransaction(
              Effect.gen(function* () {
                const p = yield* s.a.nextCommitPosition();
                yield* s.a.insert(
                  {
                    entityId: "maintenance",
                    attribute: ":test/value",
                    value: { type: "string", value: "unjournaled" },
                  },
                  "maintenance",
                  1000,
                  "maintenance-row",
                  p,
                );
              }),
            ),
          );
          const head = await s.fast.runPromise(s.t.currentPosition());
          for (const after of [0, 1, 2, 3, head, head + 3, rand() % (head + 1)]) {
            const limit = 1 + (rand() % 4);
            const direct = await Effect.runPromise(s.a.getTransactionsAfter!(after, limit));
            if (direct !== undefined) fastAnswers++;
            expect(await s.fast.runPromise(s.t.transactions({ after, limit }))).toEqual(
              await s.fallback.runPromise(s.oracle.transactions({ after, limit })),
            );
          }
          for (const id of [...commands, "unknown"])
            expect(await s.fast.runPromise(s.t.transactionByCommand(id))).toEqual(
              await s.fallback.runPromise(s.oracle.transactionByCommand(id)),
            );
        } finally {
          await s.close();
        }
      }
      expect(fastAnswers).toBe(700);
      console.log(
        JSON.stringify({ scopes: 100, acceptedFeedPages: fastAnswers, commandComparisons: 600 }),
      );
    } finally {
      c.close();
    }
  }, 300000);
  it("declines modified journals and preserves the fallback record", async () => {
    const c = client(),
      s = await setup(c);
    try {
      const receipt = await s.fast.runPromise(s.t.transact([op(1)], { commandId: "retired" }));
      const rows = await Effect.runPromise(
        s.a.query({ entityId: receipt.txId, entityType: "_Transaction" }),
      );
      const instant = rows.find((r) => r.attribute === ":_tx/instant")!;
      await Effect.runPromise(
        s.a.withTransaction(
          Effect.gen(function* () {
            const p = yield* s.a.nextCommitPosition();
            yield* s.a.retract(instant.id, 1000, "retirement", p);
          }),
        ),
      );
      expect(await Effect.runPromise(s.a.getTransactionsAfter!(0, 100))).toBeUndefined();
      expect(await s.fast.runPromise(s.t.transactions())).toEqual(
        await s.fallback.runPromise(s.oracle.transactions()),
      );
      expect(await s.fast.runPromise(s.t.transactionByCommand("retired"))).toEqual(
        await s.fallback.runPromise(s.oracle.transactionByCommand("retired")),
      );
    } finally {
      await s.close();
      c.close();
    }
  });
  it("keeps command lookups indexed after timestamp regression while the feed declines", async () => {
    const c = client(),
      s = await setup(c);
    try {
      const receipt = await s.fast.runPromise(s.t.transact([op(1)], { commandId: "known" }));
      for (const [id, time] of [
        ["later", 2000],
        ["earlier", 1000],
      ] as const) {
        await Effect.runPromise(
          s.a.withTransaction(
            Effect.gen(function* () {
              const p = yield* s.a.nextCommitPosition();
              yield* s.a.insert(
                {
                  entityId: "clock",
                  attribute: ":test/clock",
                  value: { type: "string", value: id },
                },
                id,
                time,
                id,
                p,
              );
            }),
          ),
        );
      }
      expect(await Effect.runPromise(s.a.getTransactionsAfter!(0, 100))).toBeUndefined();
      expect(await Effect.runPromise(s.a.getTransactionIdByCommand!("known"))).toBe(receipt.txId);
      const spy = vi.spyOn(c, "request");
      const actual = await s.fast.runPromise(s.t.transactionByCommand("known"));
      expect(spy.mock.calls.map((call) => call[1].split("/").at(-1))).toEqual([
        "command",
        "journal",
      ]);
      spy.mockRestore();
      expect(actual).toEqual(await s.fallback.runPromise(s.oracle.transactionByCommand("known")));
      expect(await s.fast.runPromise(s.t.transactionByCommand("unknown"))).toBeNull();
    } finally {
      await s.close();
      c.close();
    }
  });
  it("filters untyped rows sharing a journal entity exactly like the portable feed", async () => {
    const c = client(),
      s = await setup(c);
    try {
      const receipt = await s.fast.runPromise(s.t.transact([op(1)]));
      await Effect.runPromise(
        s.a.withTransaction(
          Effect.gen(function* () {
            const p = yield* s.a.nextCommitPosition();
            yield* s.a.insert(
              {
                entityId: receipt.txId,
                attribute: ":_tx/actor",
                value: { type: "string", value: "not-journal-typed" },
              },
              "spi",
              1000,
              "untyped-actor",
              p,
            );
          }),
        ),
      );
      expect(await Effect.runPromise(s.a.getTransactionsAfter!(0, 100))).toBeDefined();
      expect(await s.fast.runPromise(s.t.transactions())).toEqual(
        await s.fallback.runPromise(s.oracle.transactions()),
      );
    } finally {
      await s.close();
      c.close();
    }
  });
  it("declines unindexed command metadata written through the SPI", async () => {
    const c = client(),
      s = await setup(c);
    try {
      const receipt = await s.fast.runPromise(s.t.transact([op(1)]));
      await Effect.runPromise(
        s.a.withTransaction(
          Effect.gen(function* () {
            const p = yield* s.a.nextCommitPosition();
            yield* s.a.insert(
              {
                entityId: receipt.txId,
                attribute: ":_tx/command-id",
                value: { type: "string", value: "spi-command" },
              },
              "spi",
              1000,
              "untyped-command",
              p,
            );
          }),
        ),
      );
      expect(
        await Effect.runPromise(s.a.getTransactionIdByCommand!("spi-command")),
      ).toBeUndefined();
      const actual = await s.fast.runPromise(s.t.transactionByCommand("spi-command"));
      expect(actual).not.toBeNull();
      expect(actual).toEqual(
        await s.fallback.runPromise(s.oracle.transactionByCommand("spi-command")),
      );
    } finally {
      await s.close();
      c.close();
    }
  });
  it("long polls wake promptly on publication and time out empty", async () => {
    const c = client(),
      s = await setup(c);
    try {
      let committed = 0;
      const waiting = s.fast
        .runPromise(s.t.transactions({ after: 0, waitMs: 1000 }))
        .then((page) => ({ page, at: performance.now() }));
      await new Promise((r) => setTimeout(r, 200));
      await s.fast.runPromise(s.t.transact([op(1)]));
      committed = performance.now();
      const result = await waiting;
      expect(result.page.transactions).toHaveLength(1);
      expect(result.at - committed).toBeLessThan(20);
      const head = await s.fast.runPromise(s.t.currentPosition()),
        start = performance.now();
      expect(await s.fast.runPromise(s.t.transactions({ after: head, waitMs: 100 }))).toEqual({
        transactions: [],
      });
      expect(performance.now() - start).toBeGreaterThanOrEqual(95);
    } finally {
      await s.close();
      c.close();
    }
  });
  it("does not publish an open transaction's claim", async () => {
    const c = client(),
      s = await setup(c);
    try {
      let ready!: () => void, release!: () => void;
      const begun = new Promise<void>((r) => (ready = r)),
        released = new Promise<void>((r) => (release = r));
      const writer = s.fast.runPromise(
        s.a.withTransaction(
          Effect.gen(function* () {
            yield* s.t.transact([op(1)], { commandId: "open" });
            ready();
            yield* Effect.promise(() => released);
          }),
        ),
      );
      await begun;
      try {
        expect(await s.fallback.runPromise(s.oracle.transactionByCommand("open"))).toBeNull();
        expect(await s.fast.runPromise(s.t.transactionByCommand("open"))).toBeNull();
      } finally {
        release();
        await writer;
      }
      expect(await s.fast.runPromise(s.t.transactionByCommand("open"))).toEqual(
        await s.fallback.runPromise(s.oracle.transactionByCommand("open")),
      );
    } finally {
      await s.close();
      c.close();
    }
  });
});

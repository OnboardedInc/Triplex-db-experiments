import { randomUUID } from "node:crypto";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import {
  DatabaseScope,
  TransactionOutcomeUnknown,
  WriteError,
} from "@triplex-build/triplex/runtime";
import { makeDatomicQueryExecutor } from "../src/DatomicQueryExecutor.js";
import { DatomicClient } from "../src/DatomicClient.js";
import { makeDatomicStorageAdapter } from "../src/DatomicStorageAdapter.js";

// [EXP-DA01] Why: exercise real gateway atomic boundaries with isolated databases. Rejected: mocked semantic acceptance.
describe.skipIf(process.env["DATOMIC_INTEGRATION"] !== "1")(
  "Datomic storage transaction boundary",
  () => {
    const url = process.env["DATOMIC_GATEWAY_URL"] ?? "http://127.0.0.1:8470";
    async function withStore(
      run: (
        adapter: ReturnType<typeof makeDatomicStorageAdapter>,
        client: DatomicClient,
        scope: string,
      ) => Promise<void>,
      timeout = 1000,
    ) {
      const client = new DatomicClient(url, 5000);
      const scope = DatabaseScope.test(`da01-${randomUUID()}`);
      const adapter = makeDatomicStorageAdapter(client, scope, { resolutionTimeoutMs: timeout });
      const create = client.create.bind(client);
      client.create = async (scope) => {
        const created = await create(scope);
        console.log(JSON.stringify({ kind: "datomic-test-db-created", scope, ...created }));
        return created;
      };
      try {
        await Effect.runPromise(adapter.initialize());
        await run(adapter, client, scope);
      } finally {
        const deleted = await client.delete(scope);
        console.log(JSON.stringify({ kind: "datomic-test-db-deleted", scope, ...deleted }));
        expect(deleted.deleted).toBe(true);
        client.close();
      }
    }
    // [EXP-DA01] Why: use the public constructor's actual canonical bytes, including non-test environments and escaped UTF-16. Rejected: hand-written five-string scopes (V-DA00 F2).
    it("accepts exactly public constructor scopes with reversible database names", async () => {
      const client = new DatomicClient(url, 10000);
      const scopes = [
        DatabaseScope.test(`public-${randomUUID()}`),
        DatabaseScope.make({
          env: "prod",
          tenant: "租户/😀",
          database: `quote\" slash/\\ lone\ud800-${randomUUID()}`,
          generation: Number.MAX_SAFE_INTEGER,
        }),
        DatabaseScope.make({
          env: " staging ",
          tenant: "\ufeffx",
          database: `\n${randomUUID()}`,
          generation: -0,
        }),
      ];
      try {
        for (const scope of scopes) {
          const created = await client.create(scope);
          console.log(JSON.stringify({ kind: "datomic-test-db-created", scope, ...created }));
          try {
            expect(Buffer.from(created.db.slice(3), "base64url").toString("utf8")).toBe(scope);
            expect((await client.create(scope)).created).toBe(false);
            const snapshot = await client.begin(created.db);
            try {
              expect(snapshot.position).toBe(0);
            } finally {
              await client.release(created.db, snapshot.handle);
            }
          } finally {
            const deleted = await client.delete(scope);
            console.log(JSON.stringify({ kind: "datomic-test-db-deleted", scope, ...deleted }));
            expect(deleted.deleted).toBe(true);
          }
        }
        for (const scope of [
          '["triplex-scope-v1","test","test","x","1"]',
          '["triplex-scope-v1","test","test","x",-1]',
          '["triplex-scope-v1","test","test","x",9007199254740992]',
          '["triplex-scope-v1","test","test","x",0.0]',
          '["triplex-scope-v1", "test","test","x",0]',
          '["triplex-scope-v1","test"," ","x",0]',
          '["triplex-scope-v1","test","test","x",-0]',
          '["triplex-scope-v2","test","test","x",0]',
        ])
          await expect(client.create(scope)).rejects.toThrow();
      } finally {
        client.close();
      }
    }, 30000);
    const insert = (
      a: ReturnType<typeof makeDatomicStorageAdapter>,
      id: string,
      value: number = 1,
    ) =>
      Effect.gen(function* () {
        const p = yield* a.nextCommitPosition();
        return yield* a.insert(
          { entityId: "subject", attribute: ":value", value: { type: "number", value } },
          "tx",
          1.5,
          id,
          p,
        );
      });
    it("reads speculative inserts and retractions without publishing them", async () =>
      withStore(async (a) => {
        await Effect.runPromise(
          a.withTransaction(
            Effect.gen(function* () {
              yield* insert(a, "one");
              expect((yield* a.getByEntity("subject")).length).toBe(1);
              expect(yield* a.retract("one", 2, "retract", yield* a.currentCommitPosition())).toBe(
                true,
              );
              expect(yield* a.getByEntity("subject")).toHaveLength(0);
            }),
          ),
        );
        expect(await Effect.runPromise(a.history("subject"))).toHaveLength(1);
      }));
    it("rolls back nested failures while preserving the parent", async () =>
      withStore(async (a) => {
        await Effect.runPromise(
          a.withTransaction(
            Effect.gen(function* () {
              yield* insert(a, "parent");
              yield* a
                .withTransaction(Effect.andThen(insert(a, "child"), Effect.fail("rollback")))
                .pipe(Effect.ignore);
              expect((yield* a.getByEntity("subject")).map((r) => r.id)).toEqual(["parent"]);
            }),
          ),
        );
        expect((await Effect.runPromise(a.history("subject"))).map((r) => r.id)).toEqual([
          "parent",
        ]);
      }));
    it("rejects identity reuse without replacing the original", async () =>
      withStore(async (a) => {
        await Effect.runPromise(a.withTransaction(insert(a, "same")));
        await expect(
          Effect.runPromise(a.withTransaction(insert(a, "same", 2))),
        ).rejects.toBeDefined();
        expect((await Effect.runPromise(a.getById("same")))?.value_number).toBe(1);
      }));
    it("resolves an acknowledgement lost after durable submission", async () =>
      withStore(async (a, client) => {
        const transact = client.transact.bind(client);
        client.transact = async (...args) => {
          await transact(...args);
          throw new Error("lost ACK");
        };
        await Effect.runPromise(a.withTransaction(insert(a, "lost-ack")));
        expect(await Effect.runPromise(a.getById("lost-ack"))).not.toBeNull();
      }));
    it("returns an identifiable unknown outcome within the resolution budget", async () =>
      withStore(async (a, client) => {
        client.transact = () => new Promise(() => {});
        const started = Date.now();
        const error = await Effect.runPromise(
          a.withTransaction(insert(a, "hang")).pipe(Effect.flip),
        );
        expect(error).toBeInstanceOf(TransactionOutcomeUnknown);
        if (error instanceof TransactionOutcomeUnknown) {
          expect(error.operationId).toBeTruthy();
          expect(error.attemptId).toBeTruthy();
        }
        expect(Date.now() - started).toBeLessThan(2000);
      }, 200));
    it("returns the original transaction id for a duplicate command", async () =>
      withStore(async (a) => {
        await Effect.runPromise(
          a.withTransaction(
            Effect.gen(function* () {
              yield* a.nextCommitPosition();
              expect(yield* a.claimCommand("cmd", "tx-original", 1)).toBeNull();
            }),
          ),
        );
        expect(await Effect.runPromise(a.withTransaction(a.claimCommand("cmd", "tx-new", 2)))).toBe(
          "tx-original",
        );
      }));
    it("preserves signed zero and int64 bounds and rejects noncanonical integers", async () =>
      withStore(async (a, client, scope) => {
        await Effect.runPromise(a.withTransaction(insert(a, "negative-zero", -0)));
        expect(
          Object.is((await Effect.runPromise(a.getById("negative-zero")))?.value_number, -0),
        ).toBe(true);
        const q = makeDatomicQueryExecutor(client, scope);
        const projected = await Effect.runPromise(
          q.execute({ find: ["?v"], where: [["subject", ":value", "?v"]] }, false, { validAt: 2 }),
        );
        expect(Object.is(projected.results[0]?.["?v"], -0)).toBe(true);
        for (const value of ["-9223372036854775808", "9223372036854775807"]) {
          await Effect.runPromise(
            a.withTransaction(
              Effect.gen(function* () {
                const p = yield* a.nextCommitPosition();
                yield* a.insert(
                  { entityId: "subject", attribute: ":integer", value: { type: "integer", value } },
                  "ints",
                  3,
                  value,
                  p,
                );
              }),
            ),
          );
          expect((await Effect.runPromise(a.getById(value)))?.value_string).toBe(value);
        }
        for (const value of ["-0", "01", "9223372036854775808"]) {
          const error = await Effect.runPromise(
            a
              .withTransaction(
                Effect.gen(function* () {
                  const p = yield* a.nextCommitPosition();
                  return yield* a.insert(
                    {
                      entityId: "subject",
                      attribute: ":integer",
                      value: { type: "integer", value },
                    },
                    "bad",
                    4,
                    "bad-" + value,
                    p,
                  );
                }),
              )
              .pipe(Effect.flip),
          );
          expect(error).toBeInstanceOf(WriteError);
        }
      }));
    it("replays one safe callback after a concurrent scope conflict", async () =>
      withStore(async (a, client, scope) => {
        const other = makeDatomicStorageAdapter(client, scope);
        let entered = 0;
        let release!: () => void;
        const barrier = new Promise<void>((resolve) => {
          release = resolve;
        });
        const callback = (store: typeof a, id: string) =>
          store.withTransaction(
            Effect.gen(function* () {
              if (++entered <= 2) {
                if (entered === 2) release();
                yield* Effect.promise(() => barrier);
              }
              yield* insert(store, id);
            }),
            { replaySafe: true },
          );
        await Promise.all([
          Effect.runPromise(callback(a, "a")),
          Effect.runPromise(callback(other, "b")),
        ]);
        expect(await Effect.runPromise(a.getByEntity("subject"))).toHaveLength(2);
        expect(entered).toBeGreaterThan(2);
      }));
    it("queries the speculative delta through native Datalog", async () =>
      withStore(async (a, client, scope) => {
        const q = makeDatomicQueryExecutor(client, scope);
        await Effect.runPromise(
          a.withTransaction(
            Effect.gen(function* () {
              yield* insert(a, "native-stage", 7);
              expect(
                (yield* q.execute({ find: ["?v"], where: [["subject", ":value", "?v"]] }, false, {
                  validAt: 2,
                })).results,
              ).toEqual([{ "?v": 7 }]);
              yield* a.retract("native-stage", 2, "rtx", yield* a.currentCommitPosition());
              expect(
                (yield* q.execute({ find: ["?v"], where: [["subject", ":value", "?v"]] }, false, {
                  validAt: 2,
                })).results,
              ).toEqual([]);
            }),
          ),
        );
      }));
    it("reconstructs intermediate logical cuts and mixed timestamps in one physical commit", async () =>
      withStore(async (a) => {
        await Effect.runPromise(
          a.withTransaction(
            Effect.gen(function* () {
              const p1 = yield* a.nextCommitPosition();
              yield* a.insert(
                {
                  entityId: "subject",
                  attribute: ":first",
                  value: { type: "string", value: "one" },
                },
                "one",
                1.25,
                "one",
                p1,
              );
              const p2 = yield* a.nextCommitPosition();
              yield* a.insert(
                {
                  entityId: "subject",
                  attribute: ":second",
                  value: { type: "string", value: "two" },
                },
                "two",
                2.5,
                "two",
                p2,
              );
            }),
          ),
        );
        expect(
          (await Effect.runPromise(a.query({}, { validAt: 3, recordedPosition: 1 }))).map(
            (r) => r.id,
          ),
        ).toEqual(["one"]);
        expect(
          (await Effect.runPromise(a.query({}, { validAt: 3, recordedAt: 2 }))).map((r) => r.id),
        ).toEqual(["one"]);
        expect(
          (await Effect.runPromise(a.query({}, { validAt: 3 }))).map((r) => [
            r.id,
            r.tx_id,
            r.recorded_at,
            r.recorded_position,
          ]),
        ).toEqual([
          ["one", "one", 1.25, 1],
          ["two", "two", 2.5, 2],
        ]);
      }));
  },
);

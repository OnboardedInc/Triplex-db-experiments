import { orderDiagnostics } from "../src/CommitOrder.js";
import { randomUUID } from "node:crypto";
import { Effect, Layer, ManagedRuntime } from "effect";
import { describe, expect, it } from "vitest";
import { Triples, EntityId } from "@triplex-build/triplex";
import {
  Runtime,
  StorageAdapter,
  QueryExecutor,
  DatabaseScope,
  Capabilities,
} from "@triplex-build/triplex/runtime";
import { DatomicClient, DatomicHttpError } from "../src/DatomicClient.js";
import {
  makeDatomicStorageAdapter,
  DatomicSerializationConflict,
} from "../src/DatomicStorageAdapter.js";
import { makeDatomicQueryExecutor } from "../src/DatomicQueryExecutor.js";
import { buildTraceCommand } from "../../../lab/bench/lib/commands.js";
import { ids } from "../../../lab/bench/lib/world.js";

// [DX-B3-M2] Why: compare fresh public receipts, stored positions and every named historical reach cut.
// Rejected: exit-zero alone or a test which serializes unrelated subjects through admission.
describe.skipIf(process.env["DATOMIC_INTEGRATION"] !== "1")(
  "transactor position allocation",
  () => {
    const url = process.env["DATOMIC_GATEWAY_URL"] ?? "http://127.0.0.1:8499";
    async function setup(count: number) {
      const scope = DatabaseScope.test(`DX-B3-concurrent-${randomUUID()}`);
      const handles = [];
      for (let i = 0; i < count; i++) {
        const client = new DatomicClient(url, 30000);
        const adapter = makeDatomicStorageAdapter(client, scope, {
          maxRetries: 2,
          optimisticCommits: false,
        });
        const pin: { position?: number } = {};
        const view = {
          ...adapter,
          getReachTriples: (root: string, basis: any) =>
            adapter.getReachTriples!(root, {
              ...basis,
              ...(pin.position === undefined ? {} : { recordedPosition: pin.position }),
            }),
          getByEntities: (entities: readonly string[], basis?: any) =>
            adapter.getByEntities(
              entities,
              pin.position === undefined ? basis : { ...basis, recordedPosition: pin.position },
            ),
        };
        const runtime = ManagedRuntime.make(
          Runtime.define({
            name: "DX-B3",
            storage: Layer.succeed(StorageAdapter, view),
            queries: Layer.succeed(QueryExecutor, makeDatomicQueryExecutor(client, scope)),
          }).layer({ scope, capabilities: Capabilities.none }),
        );
        handles.push({ client, adapter, runtime, pin, triples: await runtime.runPromise(Triples) });
      }
      const db = (await handles[0]!.client.create(scope)).db;
      return {
        handles,
        db,
        close: async () => {
          for (const h of handles) await h.runtime.dispose();
          await handles[0]!.client.delete(scope);
          for (const h of handles) h.client.close();
        },
      };
    }
    it("pipelines 16 clients x 200 commands with no conflicts/replays, exact positions, rows and reach cuts", async () => {
      const s = await setup(16);
      try {
        const h = s.handles[0]!;
        const seeded = await h.runtime.runPromise(
          h.triples.transact(
            Array.from({ length: 16 }, (_, i) => ({
              op: "assert" as const,
              entityId: EntityId.make(ids.placement(i)),
              attribute: ":placement/stamp" as any,
              value: { type: "integer" as const, value: "0" },
              validFrom: 0,
            })),
          ),
        );
        const seen: {
          position: number;
          instant: number;
          txId: string;
          subject: number;
          step: number;
          stampId: string;
          rowIds: string[];
        }[] = [];
        let conflicts = 0,
          begins = 0,
          resolutions = 0;
        for (const h of s.handles) {
          const request = h.client.request.bind(h.client);
          h.client.request = async (...args: Parameters<typeof request>) => {
            if (args[1].endsWith("/begin")) begins++;
            if (args[1].includes("/operation/")) resolutions++;
            try {
              return await request(...args);
            } catch (e) {
              if (
                e instanceof DatomicHttpError &&
                ["CasConflict", "CommandConflict"].includes(e.code)
              )
                conflicts++;
              throw e;
            }
          };
        }
        await Promise.all(
          s.handles.map(async (h, subject) => {
            let stampId = seeded.triples[subject]!.id,
              stamp = 0;
            for (let step = 0; step < 200; step++) {
              const command = buildTraceCommand({
                runTag: "DX-B3",
                event: {
                  subject,
                  seq: subject * 200 + step,
                  facts: 5,
                  kind: "system",
                  correction: false,
                  stream: "background",
                } as any,
                state: {
                  stamp,
                  stampId,
                  stampValidFrom: 0,
                  address: "",
                  addressId: "",
                  addressValidFrom: 0,
                },
                scheduledAbsMs: 1000 + step,
              });
              const result = await h.runtime.runPromise(
                h.triples.transact(command.operations, {
                  commandId: command.commandId,
                  preconditions: command.preconditions,
                }),
              );
              stampId = result.triples.find((t) => t.attribute === ":placement/stamp")!.id;
              stamp++;
              seen.push({
                position: result.position,
                instant: result.instant,
                txId: result.txId,
                subject,
                step,
                stampId,
                rowIds: result.triples.map((t) => t.id),
              });
            }
          }),
        );
        expect(conflicts).toBe(0);
        // Clock retries are reported separately from subject serialization conflicts.
        expect(begins).toBe(
          3200 + s.handles.reduce((n, h) => n + h.client.commitDiagnostics.clockReplays, 0),
        );
        expect(resolutions).toBe(0);
        seen.sort((a, b) => a.position - b.position);
        expect(seen.map((x) => x.position)).toEqual(
          Array.from({ length: 3200 }, (_, i) => seeded.position + i + 1),
        );
        for (let subject = 0; subject < 16; subject++) {
          const commits = seen.filter((x) => x.subject === subject).sort((a, b) => a.step - b.step);
          const expected = new Map(commits.flatMap((x) => x.rowIds.map((id) => [id, x] as const)));
          const rows = await h.client.rows(s.db, {
            history: true,
            entityIds: [
              ids.placement(subject),
              ...commits.map((x) => ids.event(subject, subject * 200 + x.step)),
            ],
          });
          const observed = rows.filter((row) => expected.has(row.id));
          expect(observed).toHaveLength(1000);
          for (const row of observed) {
            const commit = expected.get(row.id)!;
            expect(row.recorded_position).toBe(commit.position);
            expect(row.tx_id).toBe(commit.txId);
            if (row.id === commit.stampId && commit.step < 199)
              expect(row.retracted_position).toBe(commits[commit.step + 1]!.position);
          }
        }
        let priorT = -1n;
        for (const x of seen) {
          const rows = await h.client.rows(s.db, { entityIds: [x.txId], history: true });
          expect(rows.find((r) => r.attribute === ":_tx/position")!.value_number).toBe(x.position);
          const stamp = (await h.client.rows(s.db, { id: x.stampId, history: true }))[0]!;
          expect(stamp.recorded_position).toBe(x.position);
          h.pin.position = x.position;
          const reach = await h.runtime.runPromise(
            h.triples.reach(EntityId.make(ids.placement(x.subject)), { validAt: 100000 }),
          );
          expect(reach!.triples.filter((t) => t.attribute === ":placement/event")).toHaveLength(
            x.step + 1,
          );
          expect(reach!.triples.find((t) => t.attribute === ":placement/stamp")!.id).toBe(
            x.stampId,
          );
        }
        // [DX-B5-L0] Why: every public receipt instant must retain the exact fast record-time cut.
        // Rejected: checking only position cuts (which still work on an irregular scope).
        for (const x of seen) {
          const basis = { validAt: 100000, recordedAt: x.instant },
            root = ids.placement(x.subject);
          const fastRows = await Effect.runPromise(h.adapter.getReachRows!(root, basis));
          expect(fastRows).toBeDefined();
          const slowRows = [],
            visited = new Set([root]);
          let todo = [root];
          while (todo.length) {
            const map = await Effect.runPromise(h.adapter.getByEntities(todo, basis)),
              next: string[] = [];
            for (const entity of todo)
              for (const row of map.get(entity) ?? []) {
                slowRows.push(row);
                if (row.value_type === "ref" && !visited.has(row.value_string!)) {
                  visited.add(row.value_string!);
                  next.push(row.value_string!);
                }
              }
            todo = next;
          }
          expect(fastRows).toEqual(slowRows);
        }
        const clockReplays = s.handles.reduce(
          (n, h) => n + h.client.commitDiagnostics.clockReplays,
          0,
        );
        console.log(
          JSON.stringify({
            clients: 16,
            commands: seen.length,
            clockReplays,
            declines: h.client.reachDiagnostics.declines,
          }),
        );

        expect(h.client.reachDiagnostics.declines).toEqual({});
        if (process.env.DATOMIC_TEST_LAYOUT === "lean") {
          await expect(
            h.client.request("POST", `/v1/db/${s.db}/q`, {
              edn: "[:find ?e :where [?e :triplex.tx/position _]]",
              relations: [],
            }),
          ).rejects.toMatchObject({ code: "LayoutUnsupported", route: "q" });
        } else {
          const order = await h.client.request<{ rows: { v: number | string }[][] }>(
            "POST",
            `/v1/db/${s.db}/q`,
            {
              edn: "[:find ?p ?tx :in $ $rules :where [?tx :triplex.tx/position ?p]]",
              relations: [],
            },
          );
          expect(order.rows).toHaveLength(3201);
          for (const row of order.rows.sort((a, b) => Number(a[0]!.v) - Number(b[0]!.v))) {
            expect(BigInt(row[1]!.v)).toBeGreaterThan(priorT);
            priorT = BigInt(row[1]!.v);
          }
        }
      } finally {
        console.log(
          JSON.stringify({
            orderDiagnostics,
            clocks: s.handles.map((h) => h.client.commitDiagnostics),
          }),
        );
        await s.close();
      }
    }, 900000);
    it("500 races on the same live row have one typed loser and no partial rows", async () => {
      const s = await setup(2);
      try {
        for (let i = 0; i < 500; i++) {
          const a = s.handles[0]!,
            b = s.handles[1]!;
          const seed = await a.runtime.runPromise(
            a.triples.transact([
              {
                op: "assert",
                entityId: EntityId.make(`race${i}`),
                attribute: ":race/stamp" as any,
                value: { type: "string", value: "old" },
              },
            ]),
          );
          let ready = 0;
          let release!: () => void;
          const barrier = new Promise<void>((r) => {
            release = r;
          });
          const results = await Promise.allSettled(
            [a, b].map((h, j) =>
              Effect.runPromise(
                h.adapter.withTransaction(
                  Effect.gen(function* () {
                    const p = yield* h.adapter.nextCommitPosition();
                    yield* h.adapter.getById(seed.triples[0]!.id);
                    ready++;
                    if (ready === 2) release();
                    yield* Effect.promise(() => barrier);
                    yield* h.adapter.retract(seed.triples[0]!.id, 1000, `winner${i}-${j}`, p);
                    yield* h.adapter.insert(
                      {
                        entityId: `race${i}`,
                        attribute: ":race/winner",
                        value: { type: "string", value: String(j) },
                      },
                      `winner${i}-${j}`,
                      1000,
                      `win${i}-${j}`,
                      p,
                    );
                  }),
                ),
              ),
            ),
          );
          expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
          const loser = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
          expect(loser.reason).toBeInstanceOf(DatomicSerializationConflict);
          expect(
            (await Effect.runPromise(a.adapter.getByEntity(`race${i}`))).filter(
              (r) => r.attribute === ":race/winner",
            ),
          ).toHaveLength(1);
        }
      } finally {
        await s.close();
      }
    }, 900000);
    it("shifts nested positions together and conservatively conflicts/replays pattern reads", async () => {
      const s = await setup(2);
      const [a, b] = s.handles;
      try {
        let staged!: () => void, release!: () => void;
        const stagedP = new Promise<void>((r) => {
          staged = r;
        });
        const wait = new Promise<void>((r) => {
          release = r;
        });
        const nested = Effect.runPromise(
          a!.adapter.withTransaction(
            Effect.gen(function* () {
              const p1 = yield* a!.adapter.nextCommitPosition();
              yield* a!.adapter.insert(
                {
                  entityId: "nested",
                  attribute: ":nested/one",
                  value: { type: "string", value: "one" },
                },
                "nested-one",
                100,
                "nested-row-one",
                p1,
              );
              yield* a!.adapter.withTransaction(
                Effect.gen(function* () {
                  const p2 = yield* a!.adapter.nextCommitPosition();
                  yield* a!.adapter.insert(
                    {
                      entityId: "nested",
                      attribute: ":nested/two",
                      value: { type: "string", value: "two" },
                    },
                    "nested-two",
                    100,
                    "nested-row-two",
                    p2,
                  );
                }),
              );
              staged();
              yield* Effect.promise(() => wait);
            }),
          ),
        );
        await stagedP;
        const other = await b!.runtime.runPromise(
          b!.triples.transact([
            {
              op: "assert",
              entityId: EntityId.make("other"),
              attribute: ":other/value" as any,
              value: { type: "string", value: "other" },
            },
          ]),
        );
        release();
        await nested;
        const rows = await Effect.runPromise(a!.adapter.getByEntity("nested"));
        expect(rows.find((r) => r.id === "nested-row-one")!.recorded_position).toBe(
          other.position + 1,
        );
        expect(rows.find((r) => r.id === "nested-row-two")!.recorded_position).toBe(
          other.position + 2,
        );
        expect(a!.adapter.committedPosition!("nested-one")).toBe(other.position + 1);
        expect(a!.adapter.committedPosition!("nested-two")).toBe(other.position + 2);
        let callbacks = 0;
        await Effect.runPromise(
          a!.adapter.withTransaction(
            Effect.gen(function* () {
              callbacks++;
              yield* a!.adapter.query({ attribute: ":other/value" });
              if (callbacks === 1)
                yield* Effect.promise(() =>
                  b!.runtime.runPromise(
                    b!.triples.transact([
                      {
                        op: "assert",
                        entityId: EntityId.make("interloper"),
                        attribute: ":other/value" as any,
                        value: { type: "string", value: "new" },
                      },
                    ]),
                  ),
                );
              const p = yield* a!.adapter.nextCommitPosition();
              yield* a!.adapter.insert(
                {
                  entityId: "pattern",
                  attribute: ":pattern/value",
                  value: { type: "string", value: "written" },
                },
                "pattern-tx",
                200,
                "pattern-row",
                p,
              );
            }),
            { replaySafe: true },
          ),
        );
        expect(callbacks).toBe(2);
        let absenceCallbacks = 0;
        await Effect.runPromise(
          a!.adapter.withTransaction(
            Effect.gen(function* () {
              absenceCallbacks++;
              expect(yield* a!.adapter.getById("missing-prefetched-row")).toBeNull();
              if (absenceCallbacks === 1)
                yield* Effect.promise(() =>
                  b!.runtime.runPromise(
                    b!.triples.transact([
                      {
                        op: "assert",
                        entityId: EntityId.make("absence-interloper"),
                        attribute: ":other/value" as any,
                        value: { type: "string", value: "new" },
                      },
                    ]),
                  ),
                );
              const p = yield* a!.adapter.nextCommitPosition();
              yield* a!.adapter.insert(
                {
                  entityId: "absence",
                  attribute: ":pattern/value",
                  value: { type: "string", value: "written" },
                },
                "absence-tx",
                300,
                "absence-row",
                p,
              );
            }),
            { replaySafe: true, hint: { tripleIds: ["missing-prefetched-row"] } },
          ),
        );
        expect(absenceCallbacks).toBe(2);
      } finally {
        await s.close();
      }
    }, 60000);
    it("returns final public nested receipt positions after an unrelated concurrent commit", async () => {
      const s = await setup(2),
        [a, b] = s.handles;
      try {
        let between = 0;
        const receipts = await Effect.runPromise(
          a!.adapter.withTransaction(
            Effect.gen(function* () {
              const first = yield* a!.triples.transact(
                [
                  {
                    op: "assert",
                    entityId: EntityId.make("nested-public"),
                    attribute: ":nested/one" as any,
                    value: { type: "string", value: "one" },
                  },
                ],
                { commandId: "nested-public-one" },
              );
              const second = yield* a!.triples.transact(
                [
                  {
                    op: "assert",
                    entityId: EntityId.make("nested-public"),
                    attribute: ":nested/two" as any,
                    value: { type: "string", value: "two" },
                  },
                ],
                { commandId: "nested-public-two" },
              );
              between = (yield* Effect.promise(() =>
                b!.runtime.runPromise(
                  b!.triples.transact([
                    {
                      op: "assert",
                      entityId: EntityId.make("unrelated-public"),
                      attribute: ":nested/other" as any,
                      value: { type: "string", value: "other" },
                    },
                  ]),
                ),
              )).position;
              return [first, second];
            }),
          ),
        );
        expect(receipts.map((r) => r.position)).toEqual([between + 1, between + 2]);
        for (const receipt of receipts) {
          const stored = await a!.runtime.runPromise(a!.triples.transaction(receipt.txId));
          expect(stored!.position).toBe(receipt.position);
          expect(receipt.position).toBe(stored!.position);
        }
      } finally {
        await s.close();
      }
    }, 30000);
  },
);

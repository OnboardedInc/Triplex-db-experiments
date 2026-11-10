import { randomUUID } from "node:crypto";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { DatabaseScope, type TripleInput } from "@triplex-build/triplex/runtime";
import { DatomicClient } from "../src/DatomicClient.js";
import { DatomicBasisNotAvailable } from "../src/readErrors.js";
import { makeDatomicStorageAdapter } from "../src/DatomicStorageAdapter.js";
import { makeDatomicQueryExecutor } from "../src/DatomicQueryExecutor.js";

// [EXP-DA01] Why: deterministic commits between real gateway requests expose mixed cuts (R31 D-D1). Rejected: timing-only writer races.
describe.skipIf(process.env["DATOMIC_INTEGRATION"] !== "1")("Datomic read pins", () => {
  async function fixture(
    run: (f: {
      client: DatomicClient;
      a: ReturnType<typeof makeDatomicStorageAdapter>;
      q: ReturnType<typeof makeDatomicQueryExecutor>;
      scope: string;
      db: string;
      write: (
        inputs: readonly { id: string; input: TripleInput }[],
        retract?: readonly string[],
        time?: number,
      ) => Promise<void>;
    }) => Promise<void>,
  ) {
    const scope = DatabaseScope.test(`read-pin-${randomUUID()}`);
    const client = new DatomicClient(
      process.env["DATOMIC_GATEWAY_URL"] ?? "http://127.0.0.1:8470",
      35000,
    );
    const a = makeDatomicStorageAdapter(client, scope),
      q = makeDatomicQueryExecutor(client, scope);
    const created = await client.create(scope);
    console.log(JSON.stringify({ kind: "datomic-test-db-created", scope, ...created }));
    const write = async (
      inputs: readonly { id: string; input: TripleInput }[],
      retract: readonly string[] = [],
      time = 10,
    ) => {
      await Effect.runPromise(
        a.withTransaction(
          Effect.gen(function* () {
            const p = yield* a.nextCommitPosition();
            for (const id of retract) yield* a.retract(id, time, `tx-${p}`, p);
            for (const { id, input } of inputs) yield* a.insert(input, `tx-${p}`, time, id, p);
          }),
        ),
      );
    };
    try {
      await run({ client, a, q, scope, db: created.db, write });
    } finally {
      const deleted = await client.delete(scope);
      console.log(JSON.stringify({ kind: "datomic-test-db-deleted", scope, ...deleted }));
      client.close();
      expect(deleted.deleted).toBe(true);
    }
  }
  const fact = (id: string, entityId: string, attribute: string, value: TripleInput["value"]) => ({
    id,
    input: { entityId, attribute, value, validFrom: 0 },
  });
  it.skipIf(process.env.DATOMIC_TEST_LAYOUT === "lean")(
    "pins optional pulls across a commit between query requests",
    async () =>
      fixture(async ({ client, q, write, db }) => {
        await write([
          fact("type", "e", ":type", { type: "string", value: "T" }),
          fact("old", "e", ":status", { type: "string", value: "a" }),
        ]);
        const request = client.request.bind(client);
        let injected = false;
        const handles: string[] = [];
        let queryHandle: string | undefined;
        let released = 0;
        client.request = async <A>(
          method: "GET" | "POST",
          path: string,
          input?: unknown,
          timeout?: number,
        ): Promise<A> => {
          const value = await request<A>(method, path, input, timeout);
          const handle = (input as { handle?: string } | undefined)?.handle;
          if (path.endsWith("/q")) queryHandle ??= handle;
          if (path.endsWith("/q") || (path.endsWith("/read") && handle === queryHandle))
            handles.push(handle!);
          if (path.endsWith("/release") && handle === queryHandle) released++;
          if (path.endsWith("/q") && !injected) {
            injected = true;
            await write(
              [fact("new", "e", ":status", { type: "string", value: "b" })],
              ["type", "old"],
              20,
            );
          }
          return value;
        };
        expect(
          (
            await Effect.runPromise(
              q.execute(
                {
                  find: ["?e", "?status"],
                  where: [["?e", ":type", "T"]],
                  optionalProjection: {
                    rowBinding: "?e",
                    fields: [{ attribute: ":status", variable: "?status" }],
                  },
                },
                false,
                { validAt: 30 },
              ),
            )
          ).results,
        ).toEqual([{ "?e": "e", "?status": "a" }]);
        expect(injected).toBe(true);
        expect(handles.length).toBeGreaterThan(1);
        expect(new Set(handles).size).toBe(1);
        expect(handles[0]).toBeTypeOf("string");
        expect(released).toBe(1);
        expect(
          (await client.rows(db, { pattern: { entityId: "e" }, basis: { validAt: 30 } })).map(
            (r) => r.id,
          ),
        ).toEqual(["new"]);
        let failedHandle: string | undefined,
          releasedFailure = false;
        client.request = async <A>(
          method: "GET" | "POST",
          path: string,
          input?: unknown,
          timeout?: number,
        ): Promise<A> => {
          if (path.endsWith("/q")) {
            failedHandle = (input as { handle: string }).handle;
            throw new Error("injected query failure");
          }
          if (path.endsWith("/release"))
            releasedFailure = (input as { handle: string }).handle === failedHandle;
          return request<A>(method, path, input, timeout);
        };
        await Effect.runPromise(
          q
            .execute({ find: ["?e"], where: [["?e", ":type", "T"]] }, false, { validAt: 30 })
            .pipe(Effect.flip),
        );
        expect(failedHandle).toBeTypeOf("string");
        expect(releasedFailure).toBe(true);
      }),
    30000,
  );
  it.skipIf(process.env.DATOMIC_TEST_LAYOUT === "lean")(
    "pins rule rounds and the final query across an edge replacement",
    async () =>
      fixture(async ({ client, q, write }) => {
        await write([fact("ab", "a", ":edge", { type: "ref", value: "b" })]);
        const request = client.request.bind(client);
        let injected = false;
        const pins: unknown[] = [];
        client.request = async <A>(
          method: "GET" | "POST",
          path: string,
          input?: unknown,
          timeout?: number,
        ): Promise<A> => {
          const value = await request<A>(method, path, input, timeout);
          if (path.endsWith("/q")) {
            const body = input as { handle: string; basis: unknown };
            pins.push([body.handle, body.basis]);
            if (!injected) {
              injected = true;
              await write([fact("bc", "b", ":edge", { type: "ref", value: "c" })], ["ab"], 20);
            }
          }
          return value;
        };
        const result = await Effect.runPromise(
          q.execute(
            {
              find: ["?x"],
              where: [["reach", "a", "?x"]],
              rules: [
                { name: "reach", body: [["?s", ":edge", "?t"]] },
                {
                  name: "reach",
                  body: [
                    ["?s", ":edge", "?m"],
                    ["reach", "?m", "?t"],
                  ],
                },
              ],
            },
            false,
            { validAt: 30 },
          ),
        );
        expect(result.results).toEqual([{ "?x": "b" }]);
        expect(pins.length).toBeGreaterThan(2);
        expect(new Set(pins.map((x) => JSON.stringify(x))).size).toBe(1);
      }),
    30000,
  );
  it(
    "waits then refuses future positions on pulls, batches, dependencies, queries and held reads",
    async () =>
      fixture(async ({ a, q, write, client, db }) => {
        await write([fact("one", "e", ":value", { type: "number", value: 1 })]);
        const basis = { validAt: 30, recordedPosition: 2 };
        const attempts = [
          a.query({}, basis),
          a.getByEntities(["e"], basis),
          a.getByEntities([], basis),
          a.dependencyState([":value"], basis),
          q.execute({ find: ["?e"], where: [["?e", ":value", "?v"]] }, false, basis),
          a.withTransaction(a.query({}, basis)),
        ];
        for (const attempt of attempts) {
          const start = Date.now();
          const error = await Effect.runPromise(attempt.pipe(Effect.flip));
          expect(error).toBeInstanceOf(DatomicBasisNotAvailable);
          expect(error).toMatchObject({ code: "BasisNotAvailable" });
          expect(Date.now() - start).toBeGreaterThanOrEqual(450);
        }
        const pending = client.request<{ rows: unknown[] }>("POST", `/v1/db/${db}/read`, {
          pattern: { entityId: "e" },
          basis,
          basisWaitMs: 1500,
        });
        await new Promise((resolve) => setTimeout(resolve, 50));
        await write([fact("two", "e", ":value", { type: "number", value: 2 })], [], 20);
        expect((await pending).rows).toHaveLength(2);
      }),
    30000,
  );
  it(
    "keeps T and TP on full history while guarded position retirement refuses them",
    async () =>
      fixture(async ({ a, q, write, client, db }) => {
        await write(
          Array.from({ length: 40 }, (_, n) =>
            fact(`f${n}`, "e", ":value", { type: "number", value: n }),
          ),
        );
        const p1 = { validAt: 30, recordedPosition: 1 };
        const before = await Effect.runPromise(a.getByEntities(["e"], p1));
        await write(
          [],
          Array.from({ length: 10 }, (_, n) => `f${n}`),
          20,
        );
        expect(await Effect.runPromise(a.getByEntities(["e"], p1))).toEqual(before);
        for (const basis of [
          { validAt: 30, recordedAt: 10 },
          { validAt: 30, recordedAt: 10, recordedPosition: 2 },
        ]) {
          const rows = await Effect.runPromise(a.getByEntities(["e", "missing", "e"], basis));
          expect(rows.get("e")).toHaveLength(40);
          expect(rows.get("missing")).toEqual([]);
          expect(rows.get("e")!.every((r) => r.retracted_at === null)).toBe(true);
          if (process.env.DATOMIC_TEST_LAYOUT === "lean")
            await expect(
              Effect.runPromise(
                q.execute({ find: ["?v"], where: [["e", ":value", "?v"]] }, false, basis),
              ),
            ).rejects.toMatchObject({ code: "LayoutUnsupported", route: "q" });
          else
            expect(
              (
                await Effect.runPromise(
                  q.execute({ find: ["?v"], where: [["e", ":value", "?v"]] }, false, basis),
                )
              ).results,
            ).toHaveLength(40);
          await expect(
            client.request("POST", `/v1/db/${db}/read`, { entityIds: ["e"], route: "live", basis }),
          ).rejects.toMatchObject({ code: "BasisNotAvailable" });
          await expect(
            client.request("POST", `/v1/db/${db}/q`, {
              edn: "[:find ?f :in $ $rules :where [?f :f/live _]]",
              relations: [],
              basis,
              timeoutMs: 1000,
            }),
          ).rejects.toMatchObject({
            code:
              process.env.DATOMIC_TEST_LAYOUT === "lean"
                ? "LayoutUnsupported"
                : "BasisNotAvailable",
          });
        }
        const live = await client.request<{ rows: unknown[]; route: string }>(
          "POST",
          `/v1/db/${db}/read`,
          { entityIds: ["e"], route: "live", basis: { validAt: 30, recordedPosition: 2 } },
        );
        expect(live.route).toBe("live");
        expect(live.rows).toHaveLength(30);
      }),
    30000,
  );
});

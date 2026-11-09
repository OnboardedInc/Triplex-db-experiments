// [EXP-P2Q] Why: the journal must bind the requested cut and retain typed basis failures, not only echo it.
// Rejected: checking a future snapshot label without observing the query's actual basis or error identity.
import { Effect } from "effect";
import { describe, expect, it, vi } from "vitest";
import { transactionsForEntity } from "../../../../packages/core/src/store/entityTransactionHistory.js";
import { BasisNotAvailable } from "../../../../packages/qlever/src/broker/errors.js";
import { randomUUID } from "node:crypto";
import { DatabaseScope } from "@triplex-build/triplex/runtime";
import { makeQleverClient } from "../../../../packages/qlever/src/QleverClient.js";
import { makeFreshConnectionClient } from "../../../../packages/qlever/src/broker/http.js";
import { graphIri } from "../../../../packages/qlever/src/rdf.js";
import { writeJson, openRt, freshDir, ops } from "./harness.js";

it("round8 journal query receives the exact snapshot and preserves the refusal instance", async () => {
  const error = new BasisNotAvailable({
    required: 6144,
    observed: 2048,
    replica: "test pin",
    surface: "datalog",
    waitedMs: 40,
  });
  const query = vi.fn(() => Effect.succeed({ results: [] }));
  const queryAtPosition = vi.fn((_q: any, _position: number) => Effect.fail(error));
  const reader = {
    currentPosition: () => Effect.succeed(2048),
    query,
    queryAtPosition,
    transaction: () => Effect.succeed(null),
  };
  const observed = await Effect.runPromise(
    Effect.flip(transactionsForEntity(reader, "s:present" as any, { snapshotPosition: 6144 })),
  );
  expect(observed).toBe(error);
  expect(query).not.toHaveBeenCalled();
  expect(queryAtPosition).toHaveBeenCalledExactlyOnceWith(expect.anything(), 6144);
  writeJson("round8-journal-cut-binding.json", {
    calledPosition: queryAtPosition.mock.calls[0]![1],
    error: observed,
  });
});

it("round8 journal responses at the same snapshot exclude later indexed transactions", async () => {
  const positions: number[] = [];
  const queried: number[] = [];
  const loaded: number[] = [];
  const reader = {
    currentPosition: () => Effect.succeed(2048),
    query: () => Effect.die("unbound query must not run"),
    queryAtPosition: (_q: any, position: number) => {
      queried.push(position);
      return Effect.succeed({
        results: positions
          .filter((p) => p <= position)
          .map((p) => ({ "?transaction": `_tx/${String(p).padStart(26, "0")}`, "?position": p })),
      });
    },
    transaction: () => Effect.die("unbound envelope must not run"),
    transactionAtPosition: (id: any, position: number) => {
      loaded.push(position);
      return Effect.succeed({ txId: id, position: Number(id.slice(4)), instant: 1, changes: [] });
    },
  };
  positions.push(2048);
  const read = () =>
    Effect.runPromise(
      transactionsForEntity(reader, "s:present" as any, { snapshotPosition: 2048 }),
    );
  const before = JSON.stringify(await read());
  positions.push(3072);
  const after = JSON.stringify(await read());
  expect(queried).toEqual([2048, 2048]);
  expect(loaded).toEqual([2048, 2048]);
  expect(after).toBe(before);
  writeJson("round8-journal-stable-page.json", { before, after, queried, loaded });
});

describe.skipIf(process.env["V_P2Q_LIVE"] !== "1")("round8 live journal snapshot payload", () => {
  it.each(["standard", "fresh"])(
    "%s journal at an old cut has identical full bytes after later commits",
    async (kind) => {
      const scope = DatabaseScope.test(`round8-journal-live:${randomUUID()}`);
      const client = (kind === "standard" ? makeQleverClient : makeFreshConnectionClient)(
        "http://127.0.0.1:7070",
      );
      const rt = await openRt(
        freshDir("round8-journal-live"),
        scope,
        client,
        {},
        { basisWaitMs: 2000 },
      );
      try {
        const first = await rt.run(rt.triples.transact(ops("s:policy", 1, "first")));
        expect(await rt.broker.drain(60_000)).toBe(true);
        const read = () =>
          rt.triples.transactionsForEntity("s:policy", {
            snapshotPosition: first.position,
            limit: 10,
          });
        const before = JSON.stringify(await rt.run(read()));
        expect(JSON.parse(before).transactions.map((tx: any) => tx.position)).toEqual([
          first.position,
        ]);
        const row = (await rt.run(rt.adapter.getByEntity("s:policy")))[0]!;
        await rt.run(rt.triples.retract(row.id));
        await rt.run(rt.triples.transact(ops("s:policy", 1, "replacement")));
        expect(await rt.broker.drain(60_000)).toBe(true);
        const after = JSON.stringify(await rt.run(read()));
        const transaction = JSON.stringify(await rt.run(rt.adapter.withTransaction(read())));
        // [EXP-P2Q] Why: a journal envelope must also mask retirement after its named cut.
        // Rejected: relying only on normal journal immutability (misses internal metadata retirement).
        const positionRow = (await rt.run(rt.adapter.getByEntity(first.txId))).find(
          (row) => row.attribute === ":_tx/position",
        )!;
        expect(positionRow).toBeDefined();
        await rt.run(
          rt.adapter.withTransaction(
            Effect.gen(function* () {
              const position = yield* rt.adapter.nextCommitPosition();
              expect(
                yield* rt.adapter.retract(
                  positionRow.id,
                  Date.now(),
                  "internal-fixture-retirement",
                  position,
                ),
              ).toBe(true);
            }),
          ),
        );
        expect(await rt.broker.drain(60_000)).toBe(true);
        const afterMetadata = JSON.stringify(await rt.run(read()));
        const transactionAfterMetadata = JSON.stringify(
          await rt.run(rt.adapter.withTransaction(read())),
        );
        writeJson(`round8-${kind}-journal-immutable.json`, {
          scope,
          first: first.position,
          before,
          after,
          transaction,
          afterMetadata,
          transactionAfterMetadata,
        });
        expect(after).toBe(before);
        expect(transaction).toBe(before);
        expect(afterMetadata).toBe(before);
        expect(transactionAfterMetadata).toBe(before);
      } finally {
        await rt.dispose();
        await rt.broker.close();
        await client.update(`DROP SILENT GRAPH ${graphIri(scope)}`);
        await client.close();
      }
    },
  );
});

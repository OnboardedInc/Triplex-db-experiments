import assert from "node:assert/strict";
import { Effect } from "effect";
import {
  decodeValueColumns,
  storedValueDomain,
  ValueDomains,
} from "../../../../packages/core/dist/runtime/index.js";
import { Replica, datomicReplicaSource } from "../../../../packages/datomic/dist/index.js";
import { makeDatomicStorageAdapter as original } from "../../../../packages/datomic/dist/DatomicStorageAdapter.js";

export const corpusStats = { physicalCommits: 0, worlds: 0, rebuilds: 0 };
const roots = [...Array.from({ length: 8 }, (_, i) => "e" + i), "root", "public"];
const times = [0, 100, 200, 299, 300];
// [DX-R1] Why: keep the original corpus and portable adapter as the expected side, comparing complete current row projections.
// Rejected: answering historical cuts from the replica, or accepting a declined rebuild as equality.
export const makeDatomicStorageAdapter: typeof original = (...args) => {
  const adapter = original(...args),
    [client, scope] = args;
  const db = "s2-" + Buffer.from(String(scope)).toString("base64url");
  const base = datomicReplicaSource(client, db, () =>
    Effect.runPromise(adapter.currentCommitPosition()),
  );
  const source = {
    ...base,
    async page(...request: Parameters<typeof base.page>) {
      const response = await base.page(...request);
      if (response.declined !== undefined)
        console.log(
          JSON.stringify({
            kind: "corpus-decline",
            scope,
            position: request[1].recordedPosition,
            validAt: request[1].validAt,
            response,
          }),
        );
      return response;
    },
  };
  const replicas = times.map((time) => new Replica(source, time));
  let initialized = false,
    depth = 0;
  const sync = async () => {
    const p = await Effect.runPromise(adapter.currentCommitPosition());
    for (const replica of replicas) {
      if (!initialized) await replica.bootstrap(roots, 0);
      while (replica.position < p) {
        try {
          await replica.followOnce(0, p);
        } catch {
          corpusStats.rebuilds++;
          await replica.bootstrap(roots, p);
        }
      }
      assert(replica.isValid && replica.position === p);
      const rows = await Effect.runPromise(
        adapter.getByEntities(roots, { validAt: replica.validAt }),
      );
      const expected = new Map(
        [...rows].map(([id, values]) => [
          id,
          values.map((row) => ({
            id: row.id,
            entityId: row.entity_id,
            attribute: row.attribute,
            value: decodeValueColumns(row, storedValueDomain(ValueDomains.datomic, row.attribute)),
            position: row.recorded_position,
            validFrom: row.valid_from,
            ...(row.valid_to === null ? {} : { validTo: row.valid_to }),
          })),
        ]),
      );
      for (const root of roots) {
        const seen = new Set([root]),
          world: ReturnType<Replica["world"]> = [];
        for (const id of seen)
          for (const row of expected.get(id) ?? []) {
            world.push(row);
            if (row.value.type === "ref") seen.add(row.value.value);
          }
        const sorted = (rows: typeof world) => rows.sort((a, b) => a.id.localeCompare(b.id));
        assert.deepStrictEqual(sorted(replica.world(root)), sorted(world));
        corpusStats.worlds++;
      }
    }
    initialized = true;
    corpusStats.physicalCommits++;
    if (corpusStats.physicalCommits % 100 === 0)
      console.log(JSON.stringify({ kind: "corpus-progress", ...corpusStats }));
  };
  return {
    ...adapter,
    withTransaction: ((effect: any) =>
      Effect.suspend(() => {
        depth++;
        return (adapter.withTransaction as (input: any) => Effect.Effect<any, any, any>)(
          effect,
        ).pipe(
          Effect.ensuring(
            Effect.sync(() => {
              depth--;
            }),
          ),
          Effect.tap(() => (depth === 0 ? Effect.tryPromise(sync) : Effect.void)),
        );
      })) as typeof adapter.withTransaction,
  };
};

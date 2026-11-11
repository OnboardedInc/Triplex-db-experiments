import assert from "node:assert/strict";
import { Effect } from "effect";
import {
  decodeValueColumns,
  storedValueDomain,
  ValueDomains,
  MigrationError,
} from "../../../../packages/core/dist/runtime/index.js";
import { Replica } from "../../../../packages/datomic/dist/index.js";
import { makeDatomicStorageAdapter as original } from "../../../../packages/datomic/dist/DatomicStorageAdapter.js";

export const corpusStats = {
  transactionCompletions: 0,
  worlds: 0,
  rebuilds: 0,
  unsupportedLegacy: 0,
  unsupportedPositions: 0,
  supportedScopes: 0,
  completedScopes: 0,
};
const roots = [...Array.from({ length: 8 }, (_, i) => "e" + i), "root", "public"];
const times = [0, 100, 200, 299, 300];
// [DX-R1] Why: keep the original corpus and portable adapter as the expected side, comparing complete current row projections.
// Rejected: answering historical cuts from the replica, or accepting a declined rebuild as equality.
export const makeDatomicStorageAdapter: typeof original = (...args) => {
  const adapter = original(...args),
    [client, scope] = args;
  const db = "s2-" + Buffer.from(String(scope)).toString("base64url");
  const source = Replica.source(
    client,
    db,
    () => Effect.runPromise(adapter.currentCommitPosition()),
    0,
  );
  const replicas = times.map(
    (time) => new Replica(Replica.source(client, db, source.head, time), time),
  );
  let disabled = false;
  let initialized = false,
    depth = 0;
  const sync = async () => {
    const p = await Effect.runPromise(adapter.currentCommitPosition());
    if (disabled) return;
    const reason = await source.capability!({ recordedPosition: p, validAt: 0 });
    if (reason) {
      disabled = true;
      corpusStats.unsupportedPositions++;
      console.log(JSON.stringify({ kind: "unsupported-prefix", reason, position: p }));
      return;
    }
    assert(initialized, "Replica must bootstrap before corpus writes");
    for (const replica of replicas) {
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
    corpusStats.transactionCompletions++;
    if (corpusStats.transactionCompletions % 100 === 0)
      console.log(JSON.stringify({ kind: "corpus-progress", ...corpusStats }));
  };
  return {
    ...adapter,
    // [DX-R1] Why: position zero is the current empty cut during initialize, not a past cut after the first physical frame.
    // Rejected: bootstrapping retroactively after the first commit, which the gateway declines as interior-position.
    initialize: () =>
      adapter.initialize().pipe(
        Effect.tap(() =>
          Effect.tryPromise({
            try: async () => {
              const p = await Effect.runPromise(adapter.currentCommitPosition());
              assert.equal(p, 0, "Corpus scope must start empty");
              const reason = await source.capability!({ recordedPosition: p, validAt: 0 });
              if (reason) {
                assert.equal(reason, "replica-layout");
                corpusStats.unsupportedLegacy++;
                disabled = true;
                return;
              }
              corpusStats.supportedScopes++;
              for (const replica of replicas) await replica.bootstrap(roots, p);
              initialized = true;
            },
            catch: (cause) =>
              new MigrationError({
                version: 1,
                name: "replica-corpus-bootstrap",
                message: "Cannot bootstrap corpus replica",
                cause,
              }),
          }),
        ),
      ),
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
